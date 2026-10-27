import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion, resolverCotizacion } from "../src/lib/servicios/cotizaciones";
import { emitirPdfCotizacion } from "../src/lib/servicios/pdfs-cotizacion";
import { obtenerCotizacion } from "../src/lib/consultas/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden, cargarOfertaOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import { obtenerOrdenCompraCliente } from "../src/lib/consultas/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { DatosCotizacion } from "../src/lib/validaciones/cotizacion";
async function main() {
 const url = new URL(process.env.DATABASE_URL!);
 assert(["localhost", "127.0.0.1"].includes(url.hostname) && /^\/mtx_validacion_netos_\d+$/.test(url.pathname));
 const viejas = await prisma.quote.findMany({ where: { pricesIncludeVat: true } }); const ordenes = await prisma.salesOrder.findMany({ where: { pricesIncludeVat: true } });
 assert(viejas.every(q => q.pricesIncludeVat)); assert(ordenes.every(o => o.pricesIncludeVat));
 const pedidosPdf = await prisma.quotePdfRequest.findMany();
 for (const pedido of pedidosPdf) {
  const emision = await prisma.quotePdfEmission.findUniqueOrThrow({ where: { id: pedido.emissionId } });
  const repetida = await emitirPdfCotizacion({ id: emision.quoteId, version: emision.quoteVersion }, pedido.idempotencyKey);
  assert(repetida.ok && repetida.id === emision.id, "El reintento conserva PDF anterior a la plantilla neta");
 }
 // Las ofertas históricas siguen reproduciendo sus cálculos y las correcciones proponen netos.
 for (const q of viejas.filter(q => q.folioId && !q.deletedAt)) {
  const dto = await obtenerCotizacion(q.id); assert(dto.pricesIncludeVat);
  assert.equal(dto.historico.totalAmount, q.totalAmount.toFixed(0));
  if (q.vatRate?.eq(19)) {
   const precio = dto.datos.lines[0].unitPrice;
   assert.equal(dto.datosCorreccion.lines[0].unitPrice, new (await import("../src/generated/prisma/client")).Prisma.Decimal(precio).dividedBy("1.19").toDecimalPlaces(0).toFixed(0));
  }
  if (q.companySnapshot && q.subtotal) await prisma.$transaction(tx => cargarOfertaOrden(tx, q.id, q.version));
 }
 const sucursal = await prisma.clientBranch.findFirstOrThrow({ where: { legacyIncomplete: false, address: { not: null }, city: { not: null }, contact: { not: null }, phone: { not: null } } });
 const unidad = await prisma.unitMeasure.findFirstOrThrow(), condicion = await prisma.paymentCondition.findFirstOrThrow();
 const datos: DatosCotizacion = { date: hoyOrden(), validUntil: null, clientId: sucursal.clientId, clientBranchId: sucursal.id, paymentConditionId: condicion.id, bankAccountId: null, commercialTerms: null, technicalDescription: documentoVacioCotizacion, discount: { modo: "PORCENTAJE", valor: "10" }, lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidad.id, description: "Servicio prueba precios netos", quantity: "2", unitPrice: "100000" }] };
 for (const cantidad of ["1", "2"]) {
  const clave = randomUUID(); const creada = await guardarCotizacion(datos, clave); assert(creada.ok, JSON.stringify(creada));
  assert.deepEqual((await guardarCotizacion(datos, clave)).ok, true);
  let q = await prisma.quote.findUniqueOrThrow({ where: { id: creada.id } });
  assert.equal(q.pricesIncludeVat, false); assert.equal(q.netAmount!.toFixed(0), "180000"); assert.equal(q.vatAmount!.toFixed(0), "34200"); assert.equal(q.totalAmount.toFixed(0), "214200");
  const editada = await guardarCotizacion(datos, randomUUID(), { id: q.id, version: q.version }); assert(editada.ok);
  q = await prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { totalAmount: 180000, version: q.version + 1 } }));
  await assert.rejects(prisma.quote.update({ where: { id: q.id }, data: { pricesIncludeVat: true, version: q.version + 1 } }));
  const linea = await prisma.quoteDetail.findFirstOrThrow({ where: { quoteId: q.id } });
  const orden = await registrarOrdenCompraCliente({ quoteId: q.id, quoteVersion: q.version, date: datos.date, customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null, lines: [{ quoteDetailId: linea.id, quantity: cantidad }], technicalDescription: documentoVacioCotizacion, scopeReviewed: true }, randomUUID());
  assert(orden.ok, JSON.stringify(orden));
  const o = await prisma.salesOrder.findUniqueOrThrow({ where: { quoteId: q.id } });
  assert.equal(o.pricesIncludeVat, false); assert.equal(o.totalAmount!.toFixed(0), cantidad === "1" ? "107100" : "214200");
  const cuenta = await prisma.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: o.id } }); assert(cuenta.amount.eq(o.totalAmount!));
  assert.equal((await obtenerOrdenCompraCliente(o.id)).pricesIncludeVat, false);
 }
 // Las correcciones de ofertas históricas también crean un documento neto nuevo.
 const historica = viejas.find(q => q.folioId && !q.deletedAt && q.status !== "PENDIENTE");
 if (historica) {
  const dto = await obtenerCotizacion(historica.id);
  const corregida = await guardarCotizacion({ ...dto.datosCorreccion, date: datos.date, validUntil: null }, randomUUID(), undefined, { id: historica.id, version: historica.version });
  assert(corregida.ok, JSON.stringify(corregida));
  const nueva = await obtenerCotizacion(corregida.id); assert.equal(nueva.pricesIncludeVat, false); assert.deepEqual(nueva.datos.lines, dto.datosCorreccion.lines);
 }
 // Nueva corrección desde un documento neto mantiene la modalidad y el original intacto.
 const q = await guardarCotizacion(datos, randomUUID()); assert(q.ok);
 const rechazada = await resolverCotizacion({ id: q.id, version: q.version }, randomUUID(), "RECHAZAR"); assert(rechazada.ok);
 const correccion = await guardarCotizacion(datos, randomUUID(), undefined, { id: q.id, version: rechazada.version }); assert(correccion.ok);
 assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: correccion.id } })).pricesIncludeVat, false);
 for (const vieja of viejas) assert.deepEqual(await prisma.quote.findUniqueOrThrow({ where: { id: vieja.id } }), vieja);
 for (const vieja of ordenes) assert.deepEqual(await prisma.salesOrder.findUniqueOrThrow({ where: { id: vieja.id } }), vieja);
 console.log("OK BD: legado intacto, precios netos nuevos/editados, SQL protege modalidad/totales, OCC parcial/completa y deuda con IVA, corrección e idempotencia.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
