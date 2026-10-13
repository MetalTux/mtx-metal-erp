import { crearTrabajoComercialDePrueba } from "./fixtures/trabajo-comercial";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion, resolverCotizacion } from "../src/lib/servicios/cotizaciones";
import { configurarNumeracion } from "../src/lib/servicios/numeracion";
import { registrarOrdenCompraCliente, anularOrdenCompraCliente, previsualizarOrdenCompraCliente, hoyOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import { obtenerOrdenCompraCliente, obtenerOfertaParaOrden, consultarOrdenesCompraCliente } from "../src/lib/consultas/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { DatosCotizacion } from "../src/lib/validaciones/cotizacion";
import type { DatosOrdenCompraCliente } from "../src/lib/validaciones/orden-compra-cliente";
const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_occ_"), "Usar exclusivamente copia local descartable OCC.");
function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> { assert(r.ok, JSON.stringify(r)); return r as Extract<T, { ok: true }>; }
async function inventario() { return prisma.$queryRaw`SELECT
 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "WarehouseStock" s) a,
 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "StockMovement" s) b,
 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "ProductWarehouseStock" s) c,
 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "ProductStockMovement" s) d,
 (SELECT md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY id),'')) FROM "QuotePdfEmission" s) e`; }
async function main() {
  const original = await inventario();
  const cliente = await prisma.client.findFirstOrThrow(), sucursal = await prisma.clientBranch.findFirstOrThrow({ where: { clientId: cliente.id, legacyIncomplete: false } });
  const condicion = await prisma.paymentCondition.findFirstOrThrow(), unidad = await prisma.unitMeasure.findFirstOrThrow();
  const datos: DatosCotizacion = { date: hoyOrden(), validUntil: null, clientId: cliente.id, clientBranchId: sucursal.id, paymentConditionId: condicion.id, bankAccountId: null,
    discount: { modo: "MONTO", valor: "120000" }, commercialTerms: "Condiciones históricas de prueba", technicalDescription: documentoVacioCotizacion,
    lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Fabricación de diez unidades", quantity: "10", unitPrice: "100000" },
      { kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Instalación", quantity: "1", unitPrice: "200000" }] };
  const nueva = async (cambio: Partial<DatosCotizacion> = {}) => ok(await guardarCotizacion({ ...datos, ...cambio }, randomUUID()));
  const entrada = async (q: { id: number; version: number }, numero: string | null = null): Promise<DatosOrdenCompraCliente> => {
    const oferta = await obtenerOfertaParaOrden(q.id);
    return { quoteId: q.id, quoteVersion: q.version, date: hoyOrden(), customerOrderNumber: numero, customerOrderDate: null, pdfEmissionId: null,
      lines: [{ quoteDetailId: oferta.lines[0].id, quantity: "4" }], technicalDescription: documentoVacioCotizacion, scopeReviewed: true };
  };
  const sufijo = randomUUID().slice(0, 8);
  const q = await nueva(), d = await entrada(q, `  oc ${sufijo}0001  `), clave = randomUUID();
  const numeracion = await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_COMPRA_CLIENTE" } });
  if (numeracion.nextNumber === null) {
    assert.equal((await registrarOrdenCompraCliente(d, clave)).ok, false);
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: q.id } })).status, "PENDIENTE");
    ok(await configurarNumeracion({ ...numeracion, prefix: "OCC-", padding: 4, nextNumber: "1" }));
  }
  const antes = await prisma.documentFolio.count();
  const p = ok(await previsualizarOrdenCompraCliente(q.id, q.version, d.lines));
  assert.equal(p.totalAmount, "360000"); assert.equal(await prisma.documentFolio.count(), antes);
  assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: q.id } })).status, "PENDIENTE");
  const resultados = await Promise.all([registrarOrdenCompraCliente(d, clave), registrarOrdenCompraCliente({ ...d, lines: [{ ...d.lines[0], quantity: "04.000" }] }, clave)]);
  const alta = ok(resultados[0]); assert.equal(ok(resultados[1]).id, alta.id);
  const vista = await obtenerOrdenCompraCliente(alta.id);
  assert.equal(vista.totalAmount, "360000"); assert.equal(vista.cuenta.amount, "360000"); assert.equal(vista.cuenta.dueDate, null);
  assert.equal(vista.customerOrderNumber, d.customerOrderNumber); assert.equal(vista.workOrderId, null);
  assert.deepEqual(vista.lines.map(l => l.acceptedQuantity), ["4", "0"]); assert.deepEqual(vista.lines.map(l => l.excludedQuantity), ["6", "1"]);
  assert.equal(vista.quoteVersion, q.version); assert.equal(vista.approvedQuoteVersion, q.version + 1);
  assert.equal((await registrarOrdenCompraCliente({ ...d, customerOrderNumber: "otro" }, clave)).ok, false);
  assert.equal((await registrarOrdenCompraCliente(d, randomUUID())).ok, false);
  assert.equal((await guardarCotizacion(datos, randomUUID(), { id: q.id, version: q.version + 1 })).ok, false);
  await assert.rejects(prisma.salesOrder.update({ where: { id: alta.id }, data: { totalAmount: "1" } }));
  await assert.rejects(prisma.salesOrder.delete({ where: { id: alta.id } }));
  const linea = await prisma.salesOrderDetail.findFirstOrThrow({ where: { salesOrderId: alta.id } });
  await assert.rejects(prisma.salesOrderDetail.update({ where: { id: linea.id }, data: { quantity: "2" } }));
  await assert.rejects(prisma.salesOrderDetail.delete({ where: { id: linea.id } }));
  await assert.rejects(prisma.salesOrderOperation.delete({ where: { idempotencyKey: clave } }));
  await assert.rejects(prisma.accountReceivable.delete({ where: { id: vista.cuenta.id } }));
  const otra = await nueva(), equivalente = await entrada(otra, `OC${sufijo.toUpperCase()}0001`);
  assert.equal((await registrarOrdenCompraCliente(equivalente, randomUUID())).ok, false);
  assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: otra.id } })).status, "PENDIENTE");
  for (const invalido of [{ ...equivalente, lines: [] }, { ...equivalente, lines: [{ quoteDetailId: d.lines[0].quoteDetailId, quantity: "1" }] }, { ...equivalente, lines: [{ ...equivalente.lines[0], quantity: "11" }] }, { ...equivalente, date: "9999-12-29" }, { ...equivalente, date: "1900-01-01" }, { ...equivalente, scopeReviewed: false }, { ...equivalente, totalAmount: "1" }]) assert.equal((await registrarOrdenCompraCliente(invalido, randomUUID())).ok, false);
  const cancelar = await anularOrdenCompraCliente({ referencia: { id: alta.id, version: alta.version }, motivo: "Cancelación por el cliente" }, randomUUID());
  ok(cancelar); assert.equal((await obtenerOrdenCompraCliente(alta.id)).cuenta.anulada, true);
  assert.equal((await registrarOrdenCompraCliente(equivalente, randomUUID())).ok, false);
  assert.equal(ok(await registrarOrdenCompraCliente(d, clave)).id, alta.id);
  const carreraQ = await nueva(), carreraD = await entrada(carreraQ);
  const carrera = await Promise.all([registrarOrdenCompraCliente(carreraD, randomUUID()), registrarOrdenCompraCliente(carreraD, randomUUID())]);
  assert.equal(carrera.filter(r => r.ok).length, 1);
  for (const tabla of ["QuoteOperation", "DocumentFolio", "SalesOrderDetail", "AccountReceivable", "SalesOrderOperation"] as const) {
    const falloQ = await nueva(), falloD = await entrada(falloQ);
    const contador = await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_COMPRA_CLIENTE" } });
    const totales = [await prisma.salesOrder.count(), await prisma.accountReceivable.count(), await prisma.documentFolio.count()];
    await prisma.$executeRawUnsafe(`CREATE FUNCTION prueba_occ_fallo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo OCC deliberado'; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER prueba_occ_fallo BEFORE INSERT ON "${tabla}" FOR EACH ROW EXECUTE FUNCTION prueba_occ_fallo()`);
    try {
      assert.equal((await registrarOrdenCompraCliente(falloD, randomUUID())).ok, false);
      const intacta = await prisma.quote.findUniqueOrThrow({ where: { id: falloQ.id } }); assert.equal(intacta.status, "PENDIENTE"); assert.equal(intacta.version, falloQ.version);
      assert.deepEqual([await prisma.salesOrder.count(), await prisma.accountReceivable.count(), await prisma.documentFolio.count()], totales);
      assert.equal((await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_COMPRA_CLIENTE" } })).nextNumber, contador.nextNumber);
    } finally { await prisma.$executeRawUnsafe(`DROP TRIGGER prueba_occ_fallo ON "${tabla}"`); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_occ_fallo()'); }
  }
  const ceroQ = await nueva({ discount: { modo: "SIN_DESCUENTO" }, lines: [{ ...datos.lines[0], unitPrice: "0" }] });
  const cero = ok(await registrarOrdenCompraCliente(await entrada(ceroQ), randomUUID())); assert.equal((await obtenerOrdenCompraCliente(cero.id)).cuenta.amount, "0");
  const previaQ = await nueva(); const aprobada = ok(await resolverCotizacion({ id: previaQ.id, version: previaQ.version }, randomUUID(), "APROBAR"));
  const previa = ok(await registrarOrdenCompraCliente(await entrada(aprobada), randomUUID())); assert.equal((await obtenerOrdenCompraCliente(previa.id)).approvedQuoteVersion, aprobada.version);
  const trabajo = await crearTrabajoComercialDePrueba(previa.id, "Trabajo de prueba");
  assert.equal((await anularOrdenCompraCliente({ referencia: { id: previa.id, version: previa.version }, motivo: "Con trabajo" }, randomUUID())).ok, false); assert(trabajo.id);
  const pagoQ = await nueva(), conPago = ok(await registrarOrdenCompraCliente(await entrada(pagoQ), randomUUID())), cuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: conPago.id } });
  await prisma.payment.create({ data: { accountReceivableId: cuenta.id, amount: "1", method: "Transferencia de prueba", idempotencyKey: randomUUID() } });
  assert.equal((await anularOrdenCompraCliente({ referencia: { id: conPago.id, version: conPago.version }, motivo: "Con pago" }, randomUUID())).ok, false);
  await assert.rejects(prisma.payment.create({ data: { accountReceivableId: vista.cuenta.id, amount: "1", method: "Transferencia", idempotencyKey: randomUUID() } }));
  await assert.rejects(prisma.workOrder.create({ data: { salesOrderId: alta.id, productName: "Orden anulada" } }));
  const filtrada = await consultarOrdenesCompraCliente({ q: vista.folio, estado: "ANULADA", orden: "total", sentido: "asc" }); assert.equal(filtrada.total, 1); assert.equal(filtrada.filas[0].id, alta.id);
  // Cambios de mantenedores no reescriben la identidad ni los importes registrados.
  await prisma.client.update({ where: { id: cliente.id }, data: { name: "Nombre posterior en copia" } });
  assert.equal((await obtenerOrdenCompraCliente(conPago.id)).clientName, datos.clientId === cliente.id ? vista.clientName : "");
  assert.deepEqual(await inventario(), original);
  console.log("OK: parcial/cero, aprobación/cuenta/folio atómicos, previas, UUID/carreras, identidad literal/duplicados, SQL/inmutabilidad, rollback en cinco etapas, anulación protegida e inventario/PDF intactos.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
