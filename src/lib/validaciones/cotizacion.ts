import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { descuentoCotizacionSchema } from "./importes-cotizacion";
import { textoCotizacionSchema } from "./texto-cotizacion";
const id = z.number().int().positive("Selecciona un registro válido.");
const fecha = z.string().refine(fechaCalendarioValida, "Indica una fecha válida.");
export const lineaCotizacionSchema = z.object({
  kind: z.enum(["MATERIA_PRIMA", "PRODUCTO", "SERVICIO"]),
  rawMaterialId: id.nullable(), productId: id.nullable(), unitMeasureId: id,
  description: z.string().trim().min(1, "Indica la descripción.").max(1000),
  quantity: z.string(), unitPrice: z.string(),
}).strict().refine(l => l.kind === "MATERIA_PRIMA" ? l.rawMaterialId !== null && l.productId === null : l.kind === "PRODUCTO" ? l.productId !== null && l.rawMaterialId === null : l.rawMaterialId === null && l.productId === null, "Revisa el tipo y el origen de la línea.");
export const cotizacionSchema = z.object({
  date: fecha, validUntil: fecha.nullable(), clientId: id, clientBranchId: id,
  paymentConditionId: id, bankAccountId: id.nullable(),
  lines: z.array(lineaCotizacionSchema).min(1).max(100),
  discount: descuentoCotizacionSchema,
  technicalDescription: textoCotizacionSchema,
  commercialTerms: z.string().trim().max(5000, "Las condiciones comerciales admiten hasta 5000 caracteres.").nullable().optional().transform(v => v || null),
}).strict().refine(d => d.validUntil === null || d.validUntil >= d.date, "La vigencia debe ser igual o posterior a la fecha de cotización.");
export const referenciaCotizacionSchema = z.object({ id, version: id }).strict();
export const claveCotizacionSchema = z.string().uuid().transform(v => v.toLowerCase());
export type DatosCotizacion = z.infer<typeof cotizacionSchema>;
export type LineaCotizacion = z.infer<typeof lineaCotizacionSchema>;
