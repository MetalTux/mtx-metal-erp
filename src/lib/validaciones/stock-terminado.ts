import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const id = z.number().int().positive();
export const combinacionTerminadoSchema = z.object({ productId: id, warehouseId: id, unitMeasureId: id, productVersion: id });
export const inicialTerminadoSchema = combinacionTerminadoSchema.extend({
  quantity: z.string().trim().transform(v => v.replace(",", ".")).refine(v => /^\d{1,11}(?:\.\d{1,3})?$/.test(v), "Indica una cantidad no negativa con hasta tres decimales."),
  date: z.string().refine(fechaCalendarioValida, "Indica una fecha válida."),
  note: z.string().trim().min(1, "Indica una observación para el ingreso.").max(2000),
  idempotencyKey: z.uuid(),
  reference: z.object({ stockId: id.nullable(), version: id.nullable(), quantity: z.string().regex(/^\d+(?:\.\d{1,3})?$/), lastMovementId: id.nullable() }),
});
export const filtrosTerminadoSchema = z.object({
  vista: z.enum(["stock", "ingresos", "ajustes", "movimientos"]).default("stock"),
  texto: z.string().trim().max(150).default(""),
  productId: z.coerce.number().int().positive().optional(), warehouseId: z.coerce.number().int().positive().optional(),
  pagina: z.coerce.number().int().positive().max(1000000).default(1),
  tamano: z.coerce.number().refine(n => [10, 20, 50].includes(n)).default(20),
  orden: z.enum(["id", "quantity"]).default("id"), sentido: z.enum(["asc", "desc"]).default("desc"),
});
export function hoyChile() {
  const partes = new Intl.DateTimeFormat("en", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(v => v.type === tipo)!.value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
export type DatosInicialTerminado = z.infer<typeof inicialTerminadoSchema>;

// Los ajustes son conteos finales. La diferencia se calcula exclusivamente en servidor con Decimal.
export const ajusteTerminadoSchema = combinacionTerminadoSchema.extend({
  finalQuantity: inicialTerminadoSchema.shape.quantity,
  date: inicialTerminadoSchema.shape.date,
  note: z.string().trim().min(1, "Indica una observación para el ajuste.").max(2000),
  reason: z.enum(["CONTEO_FISICO", "MERMA_PERDIDA", "DETERIORO_DANO", "CORRECCION_REGISTRO", "OTRO"]),
  correctedInitialStockId: id.nullable(),
  correctedAdjustmentId: id.nullable(),
  idempotencyKey: z.uuid(),
  reference: inicialTerminadoSchema.shape.reference,
}).refine(d => d.reason === "CORRECCION_REGISTRO"
  ? Number(d.correctedInitialStockId !== null) + Number(d.correctedAdjustmentId !== null) === 1
  : d.correctedInitialStockId === null && d.correctedAdjustmentId === null,
{ message: "Una corrección requiere un único documento de origen; los otros motivos no admiten ese vínculo." });
export type DatosAjusteTerminado = z.infer<typeof ajusteTerminadoSchema>;
