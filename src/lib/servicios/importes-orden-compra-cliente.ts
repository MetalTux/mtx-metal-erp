import { Prisma } from "@/generated/prisma/client";
import { calcularImportesCotizacion } from "./importes-cotizacion";
import { seleccionOrdenSchema } from "@/lib/validaciones/orden-compra-cliente";
import type { DescuentoCotizacion } from "@/lib/validaciones/importes-cotizacion";
const Decimal = Prisma.Decimal.clone({ precision: 40, rounding: Prisma.Decimal.ROUND_HALF_UP });
export type OfertaParaOrden = {
  lines: { id: number; quantity: string; unitPrice: string; lineAmount: string }[];
  discount: DescuentoCotizacion; vatRate: string;
  subtotal: string; discountAmount: string; netAmount: string; vatAmount: string; totalAmount: string;
};
/** Reproduce primero la oferta; no repara silenciosamente datos históricos. */
export function calcularImportesOrden(oferta: OfertaParaOrden, entrada: unknown) {
  const seleccion = seleccionOrdenSchema.parse(entrada);
  if (new Set(oferta.lines.map(l => l.id)).size !== oferta.lines.length) throw new Error("La oferta tiene líneas repetidas.");
  const original = calcularImportesCotizacion({ lineas: oferta.lines.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), descuento: oferta.discount, tasaIva: oferta.vatRate });
  for (const campo of ["subtotal", "discountAmount", "netAmount", "vatAmount", "totalAmount"] as const) {
    if (!new Decimal(oferta[campo]).eq(original[campo])) throw new Error("Los importes históricos de la oferta no coinciden. Utiliza una nueva cotización corregida.");
  }
  oferta.lines.forEach((l, i) => { if (!new Decimal(l.lineAmount).eq(original.lineAmounts[i])) throw new Error("Una línea de origen no coincide con el importe ofrecido."); });
  const aceptadas = seleccion.map(l => {
    const origen = oferta.lines.find(o => o.id === l.quoteDetailId);
    if (!origen) throw new Error("Una línea no pertenece a la cotización.");
    if (new Decimal(l.quantity).gt(origen.quantity)) throw new Error("La cantidad aceptada no puede superar la cotizada.");
    return { ...l, unitPrice: origen.unitPrice };
  });
  const sinDescuento = calcularImportesCotizacion({ lineas: aceptadas.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), descuento: { modo: "SIN_DESCUENTO" }, tasaIva: oferta.vatRate });
  const descuento: DescuentoCotizacion = oferta.discount.modo === "MONTO"
    ? { modo: "MONTO", valor: new Decimal(oferta.subtotal).isZero() ? "0"
      : new Decimal(oferta.discount.valor).times(sinDescuento.subtotal).dividedBy(oferta.subtotal).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0) }
    : oferta.discount;
  const importes = calcularImportesCotizacion({ lineas: aceptadas.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), descuento, tasaIva: oferta.vatRate });
  const completa = aceptadas.length === oferta.lines.length && aceptadas.every(l => new Decimal(l.quantity).eq(oferta.lines.find(o => o.id === l.quoteDetailId)!.quantity));
  if (completa && !importes.totalAmount.eq(original.totalAmount)) throw new Error("La aceptación completa debe reproducir la oferta.");
  return { ...importes, descuento, completa, aceptadas: aceptadas.map((l, i) => ({ ...l, lineAmount: importes.lineAmounts[i] })) };
}
