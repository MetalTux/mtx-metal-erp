import assert from "node:assert/strict";
import { calcularImportesCotizacion } from "../src/lib/servicios/importes-cotizacion";
import { calcularImportesOrden } from "../src/lib/servicios/importes-orden-compra-cliente";
import { htmlCotizacionPdf } from "../src/lib/pdf/plantilla-cotizacion";
const calcular = (precio: string, descuento: unknown = { modo: "SIN_DESCUENTO" }, tasaIva = "19", quantity = "1") => calcularImportesCotizacion({ pricesIncludeVat: false, lineas: [{ quantity, unitPrice: precio }], descuento, tasaIva });
const r = calcular("100000");
assert.equal(r.netAmount.toFixed(0), "100000"); assert.equal(r.vatAmount.toFixed(0), "19000"); assert.equal(r.totalAmount.toFixed(0), "119000");
for (const descuento of [{ modo: "PORCENTAJE", valor: "10" }, { modo: "MONTO", valor: "10000" }]) {
 const d = calcular("100000", descuento); assert.equal(d.netAmount.toFixed(0), "90000"); assert.equal(d.vatAmount.toFixed(0), "17100"); assert.equal(d.totalAmount.toFixed(0), "107100");
}
assert.equal(calcular("1", undefined, "19", "0.5").subtotal.toFixed(0), "1");
assert.equal(calcular("1", undefined, "50").vatAmount.toFixed(0), "1");
assert.equal(calcular("100000", { modo: "PORCENTAJE", valor: "100" }).totalAmount.toFixed(0), "0");
for (const tasa of ["0", "19", "19.1234", "100"]) {
 for (const precio of ["0", "1", "999", "4800000", "499999999999"]) {
  const d = calcular(precio, undefined, tasa); assert(d.netAmount.plus(d.vatAmount).eq(d.totalAmount)); assert(d.netAmount.eq(d.subtotal.minus(d.discountAmount)));
 }
}
assert.throws(() => calcular("999999999999")); // IVA también debe caber en Decimal(14,2).
assert.throws(() => calcular("100", { modo: "MONTO", valor: "101" }));
const i = calcular("100000", { modo: "MONTO", valor: "20000" }, "19", "2");
const oferta = { pricesIncludeVat: false, lines: [{ id: 1, quantity: "2", unitPrice: "100000", lineAmount: "200000" }], discount: { modo: "MONTO" as const, valor: "20000" }, vatRate: "19", subtotal: i.subtotal.toString(), discountAmount: i.discountAmount.toString(), netAmount: i.netAmount.toString(), vatAmount: i.vatAmount.toString(), totalAmount: i.totalAmount.toString() };
const parcial = calcularImportesOrden(oferta, [{ quoteDetailId: 1, quantity: "1" }]);
assert.equal(parcial.discountAmount.toFixed(0), "10000"); assert.equal(parcial.totalAmount.toFixed(0), "107100");
assert.equal(calcularImportesOrden(oferta, [{ quoteDetailId: 1, quantity: "2" }]).totalAmount.toFixed(0), "214200");
const legacy = calcularImportesCotizacion({ lineas: [{ quantity: "1", unitPrice: "119000" }], descuento: { modo: "SIN_DESCUENTO" }, tasaIva: "19" });
assert.equal(legacy.totalAmount.toFixed(0), "119000"); assert.equal(legacy.netAmount.toFixed(0), "100000");
// Plantilla: nuevas emisiones indican neto; snapshots previos sin marca mantienen IVA incluido.
const documento = { folio: "PRUEBA", version: 1, status: "PENDIENTE", date: "2026-10-26", validUntil: null, company: { rut: "12345678-5" }, client: {}, bank: {}, paymentCondition: "", paymentDays: 0, commercialTerms: null, technicalDescription: { type: "doc", content: [{ type: "paragraph" }] }, subtotal: "100000", discountAmount: "0", netAmount: "100000", vatAmount: "19000", vatRate: "19", totalAmount: "119000", lines: [] };
assert(htmlCotizacionPdf({ ...documento, pricesIncludeVat: false }, {}).includes("Precio neto"));
assert(htmlCotizacionPdf(documento, {}).includes("Subtotal con IVA"));
console.log("OK: neto/IVA/total, descuentos, redondeos, tasas, límites, OCC parcial/completa y compatibilidad histórica/PDF.");
