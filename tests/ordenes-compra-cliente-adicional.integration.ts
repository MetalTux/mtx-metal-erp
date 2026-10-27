import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion, resolverCotizacion } from "../src/lib/servicios/cotizaciones";
import { hoyOrden, registrarOrdenCompraCliente, anularOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { obtenerOfertaParaOrden, obtenerOrdenCompraCliente } from "../src/lib/consultas/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { DatosCotizacion } from "../src/lib/validaciones/cotizacion";
import type { DatosOrdenCompraCliente } from "../src/lib/validaciones/orden-compra-cliente";
const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_occ_"));
function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> { assert(r.ok, JSON.stringify(r)); return r as Extract<T, { ok: true }>; }
async function main() {
  const q0 = await prisma.quote.findFirstOrThrow(), unidad = await prisma.unitMeasure.findFirstOrThrow();
  const datos: DatosCotizacion = { date: hoyOrden(), validUntil: null, clientId: q0.clientId, clientBranchId: q0.clientBranchId!, paymentConditionId: q0.paymentConditionId!, bankAccountId: null,
    discount: { modo: "PORCENTAJE", valor: "10" }, commercialTerms: null, technicalDescription: documentoVacioCotizacion,
    lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Trabajo adicional", quantity: "10", unitPrice: "100" }] };
  const nueva = async (cambio: Partial<DatosCotizacion> = {}) => ok(await guardarCotizacion({ ...datos, ...cambio }, randomUUID()));
  const entrada = async (id: number, numero: string | null = null): Promise<DatosOrdenCompraCliente> => {
    const o = await obtenerOfertaParaOrden(id);
    return { quoteId: id, quoteVersion: o.version, date: hoyOrden(), customerOrderNumber: numero, customerOrderDate: null, pdfEmissionId: null,
      lines: o.lines.map(l => ({ quoteDetailId: l.id, quantity: l.quantity })), technicalDescription: o.technicalDescription, scopeReviewed: true };
  };
  const material = await prisma.rawMaterial.findFirstOrThrow(), producto = await prisma.product.findFirstOrThrow({ where: { deletedAt: null } });
  const mixtaQ = await nueva({ lines: [datos.lines[0], { kind: "MATERIA_PRIMA", rawMaterialId: material.id, productId: null, unitMeasureId: material.unitMeasureId, description: material.name, quantity: "0.5", unitPrice: "101" }, { kind: "PRODUCTO", rawMaterialId: null, productId: producto.id, unitMeasureId: producto.unitMeasureId, description: producto.name, quantity: "2", unitPrice: "1000" }] });
  const mixta = ok(await registrarOrdenCompraCliente(await entrada(mixtaQ.id), randomUUID()));
  const m = await obtenerOrdenCompraCliente(mixta.id); assert.equal(m.totalAmount, (await prisma.quote.findUniqueOrThrow({ where: { id: mixtaQ.id } })).totalAmount.toFixed(0));
  assert.deepEqual((await prisma.salesOrderDetail.findMany({ where: { salesOrderId: mixta.id }, orderBy: { position: "asc" } })).map(l => l.kind), ["SERVICIO", "MATERIA_PRIMA", "PRODUCTO"]);
  const pasada = new Date(`${hoyOrden()}T12:00:00Z`); pasada.setUTCDate(pasada.getUTCDate() - 1); const ayer = pasada.toISOString().slice(0, 10);
  const vencida = await nueva({ date: ayer, validUntil: ayer }); await assert.rejects(obtenerOfertaParaOrden(vencida.id));
  // Representar aprobación histórica en la copia sin cambiar relojes de producción.
  await prisma.$transaction(async tx => {
    // Sólo este fixture histórico requiere omitir la comprobación de vigencia
    // actual. DDL transaccional: cualquier fallo restaura el trigger al revertir.
    await tx.$executeRawUnsafe('ALTER TABLE "Quote" DISABLE TRIGGER "Quote_document_protect"');
    await tx.quote.update({ where: { id: vencida.id }, data: { status: "APROBADA", version: { increment: 1 } } });
    await tx.quoteOperation.create({ data: { quoteId: vencida.id, version: 2, type: "APROBAR", idempotencyKey: randomUUID(), fingerprint: "a".repeat(64) } });
    await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE');
    await tx.$executeRawUnsafe('ALTER TABLE "Quote" ENABLE TRIGGER "Quote_document_protect"');
  });
  const anterior = ok(await registrarOrdenCompraCliente(await entrada(vencida.id), randomUUID())); assert.equal((await obtenerOrdenCompraCliente(anterior.id)).approvedQuoteVersion, 2);
  for (const estado of ["RECHAZAR", "ELIMINAR"] as const) {
    const q = await nueva(); ok(await resolverCotizacion({ id: q.id, version: q.version }, randomUUID(), estado)); await assert.rejects(obtenerOfertaParaOrden(q.id));
  }
  const sufijo = randomUUID().slice(0, 8);
  const q1 = await nueva(), q2 = await nueva(), d1 = await entrada(q1.id, `oc ${sufijo}0099`), d2 = await entrada(q2.id, `OC${sufijo.toUpperCase()}0099`);
  const carrera = await Promise.all([registrarOrdenCompraCliente(d1, randomUUID()), registrarOrdenCompraCliente(d2, randomUUID())]); assert.equal(carrera.filter(r => r.ok).length, 1);
  const ganadora = ok(carrera.find(r => r.ok)!); const k = randomUUID(), anulacion = { referencia: { id: ganadora.id, version: ganadora.version }, motivo: "Cancelación de prueba" };
  ok(await anularOrdenCompraCliente(anulacion, k)); ok(await anularOrdenCompraCliente(anulacion, k));
  assert.equal((await anularOrdenCompraCliente({ ...anulacion, motivo: "Otro motivo" }, k)).ok, false);
  assert.equal((await obtenerOrdenCompraCliente(ganadora.id)).cuenta!.saldo, "0.00");
  const qPago = await nueva(), oPago = ok(await registrarOrdenCompraCliente(await entrada(qPago.id), randomUUID()));
  const cuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: oPago.id } });
  const pago = await prisma.payment.create({ data: { accountReceivableId: cuenta.id, amount: "1", method: "Transferencia", idempotencyKey: randomUUID(), voidedAt: new Date(), voidReason: "Abono anulado de prueba" } });
  assert(pago.id); assert.equal((await anularOrdenCompraCliente({ referencia: { id: oPago.id, version: oPago.version }, motivo: "Tiene historial de pago" }, randomUUID())).ok, false);
  const qHito = await nueva(), oHito = ok(await registrarOrdenCompraCliente(await entrada(qHito.id), randomUUID()));
  await prisma.accountReceivable.update({ where: { salesOrderId: oHito.id }, data: { paymentPromiseDate: new Date(`${hoyOrden()}T00:00:00Z`) } });
  assert.equal((await anularOrdenCompraCliente({ referencia: { id: oHito.id, version: oHito.version }, motivo: "Cuenta con promesa" }, randomUUID())).ok, false);
  const qAnular = await nueva(), oAnular = ok(await registrarOrdenCompraCliente(await entrada(qAnular.id), randomUUID()));
  const cuentaA = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: oAnular.id } });
  const pagoEnCarrera = await Promise.allSettled([
    anularOrdenCompraCliente({ referencia: { id: oAnular.id, version: oAnular.version }, motivo: "Carrera pago/anulación" }, randomUUID()),
    prisma.payment.create({ data: { accountReceivableId: cuentaA.id, amount: "1", method: "Transferencia", idempotencyKey: randomUUID() } }),
  ]);
  const estado = await prisma.salesOrder.findUniqueOrThrow({ where: { id: oAnular.id } }), pagos = await prisma.payment.count({ where: { accountReceivableId: cuentaA.id } });
  assert(estado.status === "ANULADA" ? pagos === 0 : pagos === 1); assert.equal(pagoEnCarrera.length, 2);
  const qTecnica = await nueva(), tecnica = await entrada(qTecnica.id);
  assert.equal((await registrarOrdenCompraCliente({ ...tecnica, technicalDescription: { type: "doc", content: [{ type: "image", attrs: { src: `/api/cotizaciones/imagenes/${randomUUID()}.png` } }] } }, randomUUID())).ok, false);
  const qP = await nueva();
  await assert.rejects(prisma.salesOrder.create({ data: { quoteId: qP.id } }), /completo|folio/i);
  for (const accion of ["EDITAR", "RECHAZAR"] as const) {
    const q = await nueva(), d = await entrada(q.id);
    const carrera = await Promise.all([
      registrarOrdenCompraCliente(d, randomUUID()),
      accion === "EDITAR" ? guardarCotizacion({ ...datos, lines: [{ ...datos.lines[0], quantity: "2" }] }, randomUUID(), { id: q.id, version: q.version })
        : resolverCotizacion({ id: q.id, version: q.version }, randomUUID(), "RECHAZAR"),
    ]);
    assert.equal(carrera.filter(r => r.ok).length, 1);
    const estado = await prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
    assert.equal(await prisma.salesOrder.count({ where: { quoteId: q.id } }), estado.status === "APROBADA" ? 1 : 0);
  }
  console.log("OK: líneas mixtas/completa, aprobada vencida, estados protegidos, identidad concurrente, anulación idempotente, pagos anulados/hitos, carrera pago/anulación, imágenes ajenas y nuevas órdenes incompletas rechazadas.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
