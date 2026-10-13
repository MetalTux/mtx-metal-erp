import { z } from "zod";

// Recibimos textos decimales: no convertir a number antes de calcular en servidor.
const textoDecimal = (enteros: number, decimales: number) =>
  z.string().trim().transform((v) => v.replace(",", ".")).refine(
    (v) => new RegExp(`^\\d{1,${enteros}}(?:\\.\\d{1,${decimales}})?$`).test(v),
    "Revisa el valor y la cantidad de decimales.",
  );

// Decimal(14,3) admite once dígitos enteros. Una cantidad cero no cotiza nada.
const cantidad = textoDecimal(11, 3).refine(
  (v) => /[1-9]/.test(v), "La cantidad debe ser mayor que cero.",
);
const pesos = textoDecimal(12, 2).refine(
  (v) => !v.includes(".") || /^0+$/.test(v.split(".")[1]),
  "El importe debe expresarse en pesos enteros.",
);
const porcentaje = (decimales: number) => textoDecimal(3, decimales).refine(
  (v) => new RegExp(`^\\d{1,3}(?:\\.\\d{1,${decimales}})?$`).test(v) &&
    BigInt(v.split(".")[0] + (v.split(".")[1] ?? "").padEnd(decimales, "0")) <= BigInt("100" + "0".repeat(decimales)),
  "El porcentaje debe estar entre 0 y 100.",
);

export const descuentoCotizacionSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("SIN_DESCUENTO") }).strict(),
  z.object({ modo: z.literal("PORCENTAJE"), valor: porcentaje(2) }).strict(),
  z.object({ modo: z.literal("MONTO"), valor: pesos }).strict(),
]);

/** La tasa proviene del período seleccionado por el servidor, nunca del formulario. */
export const importesCotizacionSchema = z.object({
  lineas: z.array(z.object({ quantity: cantidad, unitPrice: pesos }).strict()).min(1, "Agrega al menos una línea."),
  descuento: descuentoCotizacionSchema,
  tasaIva: porcentaje(4),
}).strict();

export type DescuentoCotizacion = z.infer<typeof descuentoCotizacionSchema>;
