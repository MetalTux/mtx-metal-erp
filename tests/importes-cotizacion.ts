// Prueba pura: no conecta a PostgreSQL, no necesita copia ni genera documentos.
import assert from "node:assert/strict";
import { calcularImportesCotizacion } from "../src/lib/servicios/importes-cotizacion";

const calcular = (lineas: { quantity: string; unitPrice: string }[], descuento: unknown = { modo: "SIN_DESCUENTO" }, tasaIva = "19") =>
  calcularImportesCotizacion({ lineas, descuento, tasaIva });
const linea = (quantity: string, unitPrice: string) => ({ quantity, unitPrice });

// Ejemplo aprobado de la cotización real: los precios ya incluyen IVA.
const ejemplo = calcular([linea("1", "2500000"), linea("1", "2300000")]);
assert.equal(ejemplo.totalAmount.toString(), "4800000");
assert.equal(ejemplo.netAmount.toString(), "4033613");
assert.equal(ejemplo.vatAmount.toString(), "766387");

// Redondear antes de sumar: dos medios pesos producen dos pesos, no uno.
const empates = calcular([linea("0,5", "1"), linea("0.5", "1")]);
assert.deepEqual(empates.lineAmounts.map((v) => v.toString()), ["1", "1"]);
assert.equal(empates.subtotal.toString(), "2");
assert.equal(calcular([linea("0.499", "1")]).totalAmount.toString(), "0");
assert.equal(calcular([linea("1", "100")], { modo: "PORCENTAJE", valor: "1,50" }).discountAmount.toString(), "2");
const monto = calcular([linea("2", "1000.00")], { modo: "MONTO", valor: "150" });
assert.equal(monto.totalAmount.toString(), "1850");
assert(monto.netAmount.plus(monto.vatAmount).equals(monto.totalAmount));
assert.equal(calcular([linea("1", "1000")], { modo: "PORCENTAJE", valor: "100" }).totalAmount.toString(), "0");
const sinIva = calcular([linea("1", "1000")], { modo: "SIN_DESCUENTO" }, "0");
assert.equal(sinIva.netAmount.toString(), "1000"); assert(sinIva.vatAmount.isZero());
assert.equal(calcular([linea("1", "1200")], undefined, "20").netAmount.toString(), "1000");
assert.equal(calcular([linea("1", "10000")], undefined, "19.1234").totalAmount.toString(), "10000");
assert.equal(calcular([linea("1", "999999999999")]).totalAmount.toString(), "999999999999");

for (const cantidad of ["0", "-1", "NaN", "Infinity", "1e3", "0.0001", "100000000000"]) {
  assert.throws(() => calcular([linea(cantidad, "1")]));
}
for (const precio of ["-1", "NaN", "1.01", "1000000000000"]) assert.throws(() => calcular([linea("1", precio)]));
assert.throws(() => calcular([]));
assert.throws(() => calcular([linea("1", "999999999999"), linea("1", "1")]));
assert.throws(() => calcular([linea("99999999999.999", "999999999999")]));
for (const descuento of [
  { modo: "MONTO", valor: "101" }, { modo: "MONTO", valor: "1.5" },
  { modo: "PORCENTAJE", valor: "100.01" }, { modo: "PORCENTAJE", valor: "1.005" },
  { modo: "PORCENTAJE", valor: "10", monto: "5" }, { modo: "SIN_DESCUENTO", valor: "5" },
]) assert.throws(() => calcular([linea("1", "100")], descuento));
for (const tasa of ["-1", "101", "19.00001", "NaN"]) assert.throws(() => calcular([linea("1", "100")], undefined, tasa));

// Conservación y ausencia de decimales para varios valores/porcentajes de IVA.
for (const tasa of ["0", "19", "19.1234", "100"]) {
  for (const total of ["0", "1", "2", "999", "4800000", "999999999999"]) {
    const r = calcular([linea("1", total)], undefined, tasa);
    assert(r.netAmount.plus(r.vatAmount).equals(r.totalAmount));
    for (const v of [r.subtotal, r.discountAmount, r.netAmount, r.vatAmount, r.totalAmount]) assert(v.isInteger() && !v.isNegative());
  }
}
console.log("OK: ejemplo PDF, redondeos por línea/empates, descuento global, IVA variable, límites y conservación neto + IVA = total; sin conexión a la BD.");
