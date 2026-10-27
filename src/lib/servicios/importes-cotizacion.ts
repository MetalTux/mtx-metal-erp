import { Prisma } from "@/generated/prisma/client";
import { importesCotizacionSchema } from "@/lib/validaciones/importes-cotizacion";

// Precisión propia: multiplicar cantidad por precio puede superar los 20 dígitos
// de la configuración predeterminada. No alteramos el Decimal global del ERP.
const Decimal = Prisma.Decimal.clone({ precision: 40, rounding: Prisma.Decimal.ROUND_HALF_UP });
const maximoPesos = new Decimal("999999999999");
const peso = (v: Prisma.Decimal) => v.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
function importeValido(v: Prisma.Decimal) {
  if (!v.isFinite() || v.isNegative() || v.gt(maximoPesos)) {
    throw new Error("El importe excede el límite permitido para una cotización.");
  }
  // Devolver el tipo compartido de Prisma, sin números de punto flotante.
  return new Prisma.Decimal(v.toFixed(0));
}

/** Calcula con la modalidad histórica explícita; los documentos nuevos usan precios netos. */
export function calcularImportesCotizacion(entrada: unknown) {
  const datos = importesCotizacionSchema.parse(entrada);
  const lineAmounts = datos.lineas.map((l) => importeValido(peso(new Decimal(l.quantity).times(l.unitPrice))));
  const subtotal = importeValido(lineAmounts.reduce((suma, v) => suma.plus(v), new Decimal(0)));
  let discount = new Decimal(0);
  if (datos.descuento.modo === "PORCENTAJE") {
    discount = peso(new Decimal(subtotal).times(datos.descuento.valor).dividedBy(100));
  } else if (datos.descuento.modo === "MONTO") {
    discount = new Decimal(datos.descuento.valor);
  }
  if (discount.gt(subtotal)) throw new Error("El descuento no puede superar el subtotal.");
  const discountAmount = importeValido(discount);
  const base = importeValido(new Decimal(subtotal).minus(discountAmount));
  const netAmount = datos.pricesIncludeVat
    ? importeValido(peso(new Decimal(base).dividedBy(new Decimal(1).plus(new Decimal(datos.tasaIva).dividedBy(100)))))
    : base;
  const vatAmount = datos.pricesIncludeVat
    ? importeValido(new Decimal(base).minus(netAmount))
    : importeValido(peso(new Decimal(netAmount).times(datos.tasaIva).dividedBy(100)));
  const totalAmount = importeValido(new Decimal(netAmount).plus(vatAmount));
  return { lineAmounts, subtotal, discountAmount, netAmount, vatAmount, totalAmount };
}
