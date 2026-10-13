import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const fecha = z.string().refine(fechaCalendarioValida, "Indica una fecha válida.");
export const periodoIvaSchema = z.object({
  rate: z.string().trim().transform(v => v.replace(",", ".")).refine(v => /^\d{1,3}(?:\.\d{1,4})?$/.test(v) && BigInt(v.split(".")[0] + (v.split(".")[1] ?? "").padEnd(4, "0")) <= BigInt("1000000"), "Indica un porcentaje entre 0 y 100, con hasta cuatro decimales."),
  validFrom: fecha,
  validTo: fecha.nullable(),
}).refine(d => d.validTo === null || d.validTo >= d.validFrom, "La fecha hasta debe ser igual o posterior a desde.");
export const referenciaIvaSchema = z.object({ id: z.number().int().positive(), version: z.number().int().positive() });
export type DatosPeriodoIva = z.infer<typeof periodoIvaSchema>;
