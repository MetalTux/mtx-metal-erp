import assert from "node:assert/strict";
import { calcularImportesCotizacion } from "../src/lib/servicios/importes-cotizacion";
import { calcularImportesOrden, type OfertaParaOrden } from "../src/lib/servicios/importes-orden-compra-cliente";
import type { DescuentoCotizacion } from "../src/lib/validaciones/importes-cotizacion";
function oferta(discount: DescuentoCotizacion, lines = [{ id: 1, quantity: "10", unitPrice: "100000" }, { id: 2, quantity: "1", unitPrice: "200000" }], vatRate = "19"): OfertaParaOrden {
  const i = calcularImportesCotizacion({ lineas: lines.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), descuento: discount, tasaIva: vatRate });
  return { lines: lines.map((l, n) => ({ ...l, lineAmount: i.lineAmounts[n].toString() })), discount, vatRate, subtotal: i.subtotal.toString(), discountAmount: i.discountAmount.toString(), netAmount: i.netAmount.toString(), vatAmount: i.vatAmount.toString(), totalAmount: i.totalAmount.toString() };
}
for (const descuento of [{ modo: "SIN_DESCUENTO" }, { modo: "PORCENTAJE", valor: "10" }, { modo: "MONTO", valor: "120000" }] as DescuentoCotizacion[]) {
  const o = oferta(descuento), completa = calcularImportesOrden(o, o.lines.map(l => ({ quoteDetailId: l.id, quantity: l.quantity })));
  assert(completa.completa); assert.equal(completa.totalAmount.toString(), o.totalAmount);
  const parcial = calcularImportesOrden(o, [{ quoteDetailId: 1, quantity: "4" }]);
  assert(!parcial.completa); assert.equal(parcial.subtotal.toString(), "400000");
  assert.equal(parcial.totalAmount.toString(), descuento.modo === "SIN_DESCUENTO" ? "400000" : "360000");
  assert(parcial.netAmount.plus(parcial.vatAmount).eq(parcial.totalAmount));
}
const o = oferta({ modo: "MONTO", valor: "1" }, [{ id: 1, quantity: "3", unitPrice: "1" }], "0");
assert.equal(calcularImportesOrden(o, [{ quoteDetailId: 1, quantity: "1.5" }]).discountAmount.toString(), "1");
assert.equal(calcularImportesOrden(o, [{ quoteDetailId: 1, quantity: "1.5" }]).subtotal.toString(), "2");
const cero = oferta({ modo: "MONTO", valor: "0" }, [{ id: 1, quantity: "2", unitPrice: "0" }]);
assert.equal(calcularImportesOrden(cero, [{ quoteDetailId: 1, quantity: "1" }]).totalAmount.toString(), "0");
for (const lines of [[], [{ quoteDetailId: 1, quantity: "0" }], [{ quoteDetailId: 1, quantity: "-1" }], [{ quoteDetailId: 1, quantity: "NaN" }], [{ quoteDetailId: 1, quantity: "Infinity" }], [{ quoteDetailId: 1, quantity: "3.001" }], [{ quoteDetailId: 5, quantity: "1" }], [{ quoteDetailId: 1, quantity: "1" }, { quoteDetailId: 1, quantity: "1" }]]) assert.throws(() => calcularImportesOrden(o, lines));
assert.throws(() => calcularImportesOrden({ ...o, totalAmount: "3" }, [{ quoteDetailId: 1, quantity: "1" }]));
assert.throws(() => calcularImportesOrden({ ...o, lines: [{ ...o.lines[0], lineAmount: "4" }] }, [{ quoteDetailId: 1, quantity: "1" }]));
assert.throws(() => oferta({ modo: "SIN_DESCUENTO" }, [{ id: 1, quantity: "99999999999.999", unitPrice: "999999999999" }]));
console.log("OK: aceptación completa/parcial, tres descuentos, prorrateo, redondeos, IVA, cero, límites y rechazo de origen inconsistente.");
