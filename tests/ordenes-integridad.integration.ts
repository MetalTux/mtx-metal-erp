import { crearTrabajoComercialDePrueba } from "./fixtures/trabajo-comercial";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden, leerCompromisoParaTrabajo, previsualizarOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { obtenerOfertaParaOrden } from "../src/lib/consultas/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_occ_"));
async function main() {
  const base = await prisma.quote.findFirstOrThrow(), unidad = await prisma.unitMeasure.findFirstOrThrow();
  const nueva = async () => {
    const q = await guardarCotizacion({ date: hoyOrden(), validUntil: null, clientId: base.clientId, clientBranchId: base.clientBranchId, paymentConditionId: base.paymentConditionId, bankAccountId: null,
      discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion, commercialTerms: null,
      lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Integridad documental", quantity: "1", unitPrice: "100" }] }, randomUUID());
    assert(q.ok); const o = await obtenerOfertaParaOrden(q.id);
    return { quoteId: q.id, quoteVersion: q.version, date: hoyOrden(), customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null,
      lines: [{ quoteDetailId: o.lines[0].id, quantity: "1" }], technicalDescription: o.technicalDescription, scopeReviewed: true as const };
  };
  // La copia completa auténtica debe aceptar Decimal/fechas serializados por Prisma.
  const d = await nueva(), correcta = await registrarOrdenCompraCliente(d, randomUUID()); assert(correcta.ok, JSON.stringify(correcta));
  const contrato = await prisma.$transaction(tx => leerCompromisoParaTrabajo(tx, { id: correcta.id, version: correcta.version }));
  assert.equal(contrato.totalAmount, "100"); assert.equal(contrato.lines.length, 1); assert.equal(await prisma.workOrder.count({ where: { salesOrderId: correcta.id } }), 0);
  const paraCantidad = await nueva(), exceso = await previsualizarOrdenCompraCliente(paraCantidad.quoteId, paraCantidad.quoteVersion, [{ ...paraCantidad.lines[0], quantity: "2" }]);
  assert(!exceso.ok && exceso.erroresLineas); assert.equal(exceso.erroresLineas[0].id, paraCantidad.lines[0].quoteDetailId);
  const referencia = { ...await nueva(), customerOrderNumber: `  oc\u00a0\u2007\u202f ${randomUUID()}  ` };
  const textoOriginal = referencia.customerOrderNumber;
  const literal = await registrarOrdenCompraCliente(referencia, randomUUID()); assert(literal.ok);
  const almacenada = await prisma.salesOrder.findUniqueOrThrow({ where: { id: literal.id } }); assert.equal(almacenada.customerOrderNumber, textoOriginal);
  const duplicada = { ...await nueva(), customerOrderNumber: textoOriginal.replace(/[ \u00a0\u2007\u202f]/g, "").toUpperCase() };
  assert.equal((await registrarOrdenCompraCliente(duplicada, randomUUID())).ok, false);
  const perdida = await nueva(), clavePerdida = randomUUID(), transaccionReal = prisma.$transaction.bind(prisma);
  // Representar commit confirmado cuya respuesta falla, sin deshacer su operación.
  prisma.$transaction = (async (...args: Parameters<typeof prisma.$transaction>) => {
    await transaccionReal(...args); throw new Error("Respuesta perdida después de confirmar la orden");
  }) as unknown as typeof prisma.$transaction;
  try { assert.equal((await registrarOrdenCompraCliente(perdida, clavePerdida)).ok, false); }
  finally { prisma.$transaction = transaccionReal; }
  const recuperada = await registrarOrdenCompraCliente(perdida, clavePerdida); assert(recuperada.ok);
  assert.equal(await prisma.salesOrder.count({ where: { quoteId: perdida.quoteId } }), 1);
  const empresa = await prisma.companyProfile.findUniqueOrThrow({ where: { id: 1 } });
  let incompleta;
  await prisma.companyProfile.update({ where: { id: 1 }, data: { legalName: null } });
  try { incompleta = await guardarCotizacion({ date: hoyOrden(), validUntil: null, clientId: base.clientId, clientBranchId: base.clientBranchId, paymentConditionId: base.paymentConditionId, bankAccountId: null,
    discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion,
    lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Emisor histórico incompleto", quantity: "1", unitPrice: "100" }] }, randomUUID()); }
  finally { await prisma.companyProfile.update({ where: { id: 1 }, data: { legalName: empresa.legalName } }); }
  assert(incompleta?.ok);
  const detalleIncompleto = await prisma.quoteDetail.findFirstOrThrow({ where: { quoteId: incompleta.id } });
  assert.equal((await registrarOrdenCompraCliente({ ...d, quoteId: incompleta.id, quoteVersion: incompleta.version, lines: [{ quoteDetailId: detalleIncompleto.id, quantity: "1" }] }, randomUUID())).ok, false);
  assert.equal(await prisma.salesOrder.count({ where: { quoteId: incompleta.id } }), 0);
  for (const campo of ["cabecera", "detalle", "folio"] as const) {
    const intento = await nueva();
    const expresion = campo === "cabecera" ? `NEW."quoteSnapshot" := jsonb_set(NEW."quoteSnapshot", '{quote,clientPhone}', '"Contacto adulterado"'::jsonb);`
      : campo === "detalle" ? `NEW."quoteSnapshot" := jsonb_set(NEW."quoteSnapshot", '{details,0,description}', '"Detalle adulterado"'::jsonb);`
      : `NEW."quoteSnapshot" := jsonb_set(NEW."quoteSnapshot", '{folio,folio}', '"Folio adulterado"'::jsonb);`;
    await prisma.$executeRawUnsafe(`CREATE FUNCTION prueba_occ_copia() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${expresion} RETURN NEW; END $$`);
    // Orden alfabético anterior a SalesOrder_snapshot_source, manteniendo activo su control.
    await prisma.$executeRawUnsafe('CREATE TRIGGER "AA_prueba_occ_copia" BEFORE INSERT ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION prueba_occ_copia()');
    try {
      assert.equal((await registrarOrdenCompraCliente(intento, randomUUID())).ok, false);
      assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: intento.quoteId } })).status, "PENDIENTE");
      assert.equal(await prisma.salesOrder.count({ where: { quoteId: intento.quoteId } }), 0);
    } finally { await prisma.$executeRawUnsafe('DROP TRIGGER "AA_prueba_occ_copia" ON "SalesOrder"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_occ_copia()'); }
  }
  const intento = await nueva();
  await prisma.$executeRawUnsafe(`CREATE FUNCTION prueba_occ_cuenta() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW."dueDate" := CURRENT_DATE; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER "AA_prueba_occ_cuenta" BEFORE INSERT ON "AccountReceivable" FOR EACH ROW EXECUTE FUNCTION prueba_occ_cuenta()');
  try { assert.equal((await registrarOrdenCompraCliente(intento, randomUUID())).ok, false); assert.equal(await prisma.salesOrder.count({ where: { quoteId: intento.quoteId } }), 0); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER "AA_prueba_occ_cuenta" ON "AccountReceivable"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_occ_cuenta()'); }
  const cuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: correcta.id } });
  const pago = await prisma.payment.create({ data: { accountReceivableId: cuenta.id, amount: "1", method: "Transferencia de prueba", idempotencyKey: randomUUID() } });
  const otraCuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: recuperada.id } });
  await assert.rejects(prisma.payment.update({ where: { id: pago.id }, data: { accountReceivableId: otraCuenta.id } }));
  await assert.rejects(prisma.payment.update({ where: { id: pago.id }, data: { idempotencyKey: randomUUID() } }));
  await assert.rejects(prisma.$transaction(async tx => {
    await tx.accountReceivable.delete({ where: { id: otraCuenta.id } });
    await tx.accountReceivable.update({ where: { id: cuenta.id }, data: { salesOrderId: recuperada.id } });
  }));
  await assert.rejects(prisma.payment.delete({ where: { id: pago.id } }));
  const trabajo = await crearTrabajoComercialDePrueba(correcta.id, "Trabajo vinculado de prueba");
  await assert.rejects(prisma.$transaction(tx => leerCompromisoParaTrabajo(tx, { id: correcta.id, version: correcta.version })));
  await assert.rejects(prisma.workOrder.update({ where: { id: trabajo.id }, data: { salesOrderId: null } }));
  await assert.rejects(prisma.workOrder.delete({ where: { id: trabajo.id } }));
  console.log("OK: copia auténtica, snapshots adulterados y vencimiento inicial rechazados atómicamente; trabajo/abonos conservados.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
