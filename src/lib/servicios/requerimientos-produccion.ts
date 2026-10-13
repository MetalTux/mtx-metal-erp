import { Prisma } from "@/generated/prisma/client";

// Dos cantidades Decimal(14,3) pueden producir 28 dígitos significativos.
// Conservar el cálculo intermedio sin cambiar la precisión global del ERP.
const Decimal = Prisma.Decimal.clone({ precision: 40, rounding: Prisma.Decimal.ROUND_HALF_UP });
const maxQuantity = new Decimal("99999999999.999");

function cantidad(valor: string, etiqueta: string, permitirCero = true) {
  if (typeof valor !== "string" || !/^\d{1,11}(?:[.,]\d{1,3})?$/.test(valor.trim())) {
    throw new Error(`${etiqueta}: indica una cantidad con hasta tres decimales, sin separadores de miles.`);
  }
  const resultado = new Decimal(valor.trim().replace(",", "."));
  if (!resultado.isFinite() || resultado.isNegative() || resultado.gt(maxQuantity)
    || (!permitirCero && resultado.isZero())) {
    throw new Error(`${etiqueta}: la cantidad debe ${permitirCero ? "ser no negativa" : "ser positiva"} y estar dentro del límite permitido.`);
  }
  return resultado;
}

function referencia(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("La receta contiene una referencia inválida.");
}

export type MaterialRecetaProduccion = {
  rawMaterialId: number;
  unitMeasureId: number;
  quantityPerUnit: string;
};

/** Calcula desde la receta histórica; no consulta catálogo, reserva ni consume stock. */
export function calcularRequerimientosProduccion(quantity: string, recipe: readonly MaterialRecetaProduccion[]) {
  const lote = cantidad(quantity, "Cantidad a fabricar", false);
  if (!recipe.length) throw new Error("La fabricación de catálogo requiere una receta con materiales.");
  const ids = new Set<number>();
  const materials = recipe.map(material => {
    referencia(material.rawMaterialId);
    referencia(material.unitMeasureId);
    if (ids.has(material.rawMaterialId)) throw new Error("La receta repite una materia prima.");
    ids.add(material.rawMaterialId);
    const porUnidad = cantidad(material.quantityPerUnit, "Cantidad por unidad", false);
    const exacta = lote.times(porUnidad);
    const redondeada = exacta.toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
    if (redondeada.gt(maxQuantity)) {
      throw new Error("Un requerimiento excede el límite de cantidad permitido. Divide la fabricación en lotes menores.");
    }
    return {
      rawMaterialId: material.rawMaterialId,
      unitMeasureId: material.unitMeasureId,
      expectedExactQuantity: exacta.toFixed(6),
      expectedQuantity: redondeada.toFixed(3),
      roundingDifference: redondeada.minus(exacta).toFixed(6),
      requiresReview: exacta.gt(0) && redondeada.isZero(),
    };
  });
  return { quantity: lote.toFixed(3), materials, requiresReview: materials.some(material => material.requiresReview) };
}

export type DatosCoberturaReserva = {
  requestedQuantity: string;
  stockQuantity: string;
  totalReservedQuantity: string;
  ownReservedQuantity: string;
};

/**
 * Cobertura de una línea/finalidad/recurso/bodega desde una instantánea coherente.
 * El futuro servicio debe obtenerla bajo bloqueo y descontar cada asignación del
 * libre antes de calcular la siguiente; la función no crea reservas efectivas.
 */
export function calcularCoberturaReserva(datos: DatosCoberturaReserva) {
  const solicitada = cantidad(datos.requestedQuantity, "Cantidad solicitada");
  const fisica = cantidad(datos.stockQuantity, "Stock físico");
  const total = cantidad(datos.totalReservedQuantity, "Reserva total");
  const propia = cantidad(datos.ownReservedQuantity, "Reserva propia");
  if (propia.gt(total)) throw new Error("La reserva propia no puede superar la reserva total del recurso.");
  if (total.gt(fisica)) throw new Error("Las reservas superan el stock físico. Revisa la incidencia antes de continuar.");
  if (propia.gt(solicitada)) throw new Error("El nuevo plan exige liberar primero su exceso de reserva con motivo e historial.");
  const libre = fisica.minus(total);
  const pendiente = solicitada.minus(propia);
  const nueva = Decimal.min(libre, pendiente);
  const cubierta = propia.plus(nueva);
  return {
    requestedQuantity: solicitada.toFixed(3),
    ownReservedQuantity: propia.toFixed(3),
    freeQuantity: libre.toFixed(3),
    newReservationQuantity: nueva.toFixed(3),
    coveredQuantity: cubierta.toFixed(3),
    missingQuantity: solicitada.minus(cubierta).toFixed(3),
    remainingFreeQuantity: libre.minus(nueva).toFixed(3),
  };
}
