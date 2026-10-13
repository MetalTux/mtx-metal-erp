import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { textoCotizacionSchema } from "./texto-cotizacion";
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const fecha = z.string().refine(fechaCalendarioValida, "Indica una fecha válida.");
export const cantidadAceptadaSchema = z.string().trim().transform(v => v.replace(",", "."))
  .refine(v => /^\d{1,11}(?:\.\d{1,3})?$/.test(v) && /[1-9]/.test(v), "Indica una cantidad positiva con hasta tres decimales.")
  .transform(v => v.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""));
export const seleccionOrdenSchema = z.array(z.object({ quoteDetailId: id, quantity: cantidadAceptadaSchema }).strict())
  .min(1, "Selecciona al menos una línea.").max(100)
  .refine(v => new Set(v.map(l => l.quoteDetailId)).size === v.length, "No repitas líneas de la cotización.")
  .transform(v => [...v].sort((a, b) => a.quoteDetailId - b.quoteDetailId));
export const referenciaOrdenSchema = z.object({ id, version: id }).strict();
export const claveOrdenSchema = z.string().uuid().transform(v => v.toLowerCase());
export const registrarOrdenSchema = z.object({
  quoteId: id, quoteVersion: id, date: fecha,
  customerOrderNumber: z.string().max(150, "El número del cliente admite hasta 150 caracteres.")
    .refine(v => !/[\u0000-\u001f\u007f]/.test(v), "El número del cliente no admite caracteres de control.")
    .nullable().transform(v => v?.trim() ? v : null),
  customerOrderDate: fecha.nullable(), pdfEmissionId: z.string().uuid().nullable(),
  lines: seleccionOrdenSchema, technicalDescription: textoCotizacionSchema,
  scopeReviewed: z.literal(true, { error: "Revisa y confirma el alcance técnico contratado." }),
}).strict();
export const anularOrdenSchema = z.object({
  referencia: referenciaOrdenSchema, motivo: z.string().trim().min(1, "Indica el motivo de anulación.").max(1000),
}).strict();
export type DatosOrdenCompraCliente = z.infer<typeof registrarOrdenSchema>;
