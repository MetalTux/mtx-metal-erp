import assert from "node:assert/strict";
import { Prisma } from "../src/generated/prisma/client";
import { calcularCoberturaReserva, calcularRequerimientosProduccion } from "../src/lib/servicios/requerimientos-produccion";

const receta = [{ rawMaterialId: 1, unitMeasureId: 1, quantityPerUnit: "2.500" },
  { rawMaterialId: 2, unitMeasureId: 2, quantityPerUnit: "0.750" }];
const cinco = calcularRequerimientosProduccion("5", receta);
assert.deepEqual(cinco.materials.map(material => material.expectedQuantity), ["12.500", "3.750"]);
assert.equal(cinco.requiresReview, false);
assert.equal(receta[0].quantityPerUnit, "2.500");
assert.deepEqual(calcularRequerimientosProduccion("2", receta).materials.map(material => material.expectedQuantity), ["5.000", "1.500"]);

const redondeo = calcularRequerimientosProduccion("0.333", [{ ...receta[0], quantityPerUnit: "0.333" }]).materials[0];
assert.equal(redondeo.expectedExactQuantity, "0.110889");
assert.equal(redondeo.expectedQuantity, "0.111");
assert.equal(redondeo.roundingDifference, "0.000111");
assert.equal(calcularRequerimientosProduccion("0.001", [{ ...receta[0], quantityPerUnit: "0.500" }]).materials[0].expectedQuantity, "0.001");
const ceroPositivo = calcularRequerimientosProduccion("0.001", [{ ...receta[0], quantityPerUnit: "0.001" }]);
assert.equal(ceroPositivo.materials[0].expectedExactQuantity, "0.000001");
assert.equal(ceroPositivo.materials[0].expectedQuantity, "0.000");
assert.equal(ceroPositivo.requiresReview, true);
assert.equal(calcularRequerimientosProduccion(" 1,5 ", receta).quantity, "1.500");
assert.equal(calcularRequerimientosProduccion("99999999999.999", [{ ...receta[0], quantityPerUnit: "1" }]).materials[0].expectedQuantity, "99999999999.999");
assert.throws(() => calcularRequerimientosProduccion("99999999999.999", [{ ...receta[0], quantityPerUnit: "1.001" }]));
for (const cantidad of ["0", "-1", "NaN", "Infinity", "1e3", "1.0001", "100000000000", "1,000.000", ""]) {
  assert.throws(() => calcularRequerimientosProduccion(cantidad, receta));
}
assert.throws(() => calcularRequerimientosProduccion("1", []));
assert.throws(() => calcularRequerimientosProduccion("1", [receta[0], { ...receta[0], unitMeasureId: 2 }]));
assert.throws(() => calcularRequerimientosProduccion("1", [{ ...receta[0], rawMaterialId: 0 }]));
assert.throws(() => calcularRequerimientosProduccion("1", [{ ...receta[0], unitMeasureId: 1.5 }]));
assert.throws(() => calcularRequerimientosProduccion("1", [{ ...receta[0], quantityPerUnit: "0" }]));
assert.throws(() => calcularRequerimientosProduccion("1", [{ ...receta[0], quantityPerUnit: "NaN" }]));

// La configuración global no debe degradar la precisión del cálculo industrial.
const precisionAnterior = Prisma.Decimal.precision;
try {
  Prisma.Decimal.set({ precision: 5 });
  assert.equal(calcularRequerimientosProduccion("12345678.123", [{ ...receta[0], quantityPerUnit: "1.001" }]).materials[0].expectedExactQuantity,
    "12358023.801123");
  assert.equal(Prisma.Decimal.precision, 5);
} finally { Prisma.Decimal.set({ precision: precisionAnterior }); }

const base = { requestedQuantity: "10", stockQuantity: "10", totalReservedQuantity: "4", ownReservedQuantity: "0" };
const parcial = calcularCoberturaReserva(base);
assert.deepEqual(parcial, { requestedQuantity: "10.000", ownReservedQuantity: "0.000", freeQuantity: "6.000",
  newReservationQuantity: "6.000", coveredQuantity: "6.000", missingQuantity: "4.000", remainingFreeQuantity: "0.000" });
const propia = calcularCoberturaReserva({ ...base, ownReservedQuantity: "2", requestedQuantity: "5" });
assert.equal(propia.newReservationQuantity, "3.000");
assert.equal(propia.coveredQuantity, "5.000");
assert.equal(propia.remainingFreeQuantity, "3.000");
assert.equal(calcularCoberturaReserva({ ...base, stockQuantity: "4" }).newReservationQuantity, "0.000");
assert.equal(calcularCoberturaReserva({ ...base, stockQuantity: "0", totalReservedQuantity: "0" }).missingQuantity, "10.000");
assert.equal(calcularCoberturaReserva({ ...base, requestedQuantity: "0" }).newReservationQuantity, "0.000");
assert.equal(calcularCoberturaReserva({ ...base, ownReservedQuantity: "4", requestedQuantity: "4" }).newReservationQuantity, "0.000");

// Dos líneas se calculan secuencialmente contra el libre remanente, no dos veces contra el saldo inicial.
const primera = calcularCoberturaReserva({ ...base, totalReservedQuantity: "0", requestedQuantity: "7" });
const segunda = calcularCoberturaReserva({ ...base, totalReservedQuantity: primera.newReservationQuantity, requestedQuantity: "7" });
assert.equal(primera.newReservationQuantity, "7.000");
assert.equal(segunda.newReservationQuantity, "3.000");
assert.equal(segunda.missingQuantity, "4.000");

assert.throws(() => calcularCoberturaReserva({ ...base, ownReservedQuantity: "5" }));
assert.throws(() => calcularCoberturaReserva({ ...base, stockQuantity: "3" }));
assert.throws(() => calcularCoberturaReserva({ ...base, requestedQuantity: "1", ownReservedQuantity: "2" }));
assert.throws(() => calcularCoberturaReserva({ ...base, stockQuantity: "-1" }));
assert.throws(() => calcularCoberturaReserva({ ...base, totalReservedQuantity: "NaN" }));
console.log("OK: requerimientos exactos, HALF_UP a tres decimales, revisión de cero, unidades separadas, límites y reservas parciales sin usar cobertura ajena.");
