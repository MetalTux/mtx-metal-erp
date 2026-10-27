import { z } from "zod";
import { Prisma } from "@/generated/prisma/browser";
import { fechaCalendarioValida } from "@/lib/fechas-chile";

const id = z.number().int().positive().max(2147483647);
const cantidad = z.string().trim().transform(v => v.replace(",", "."))
  .refine(v => /^\d{1,11}(?:\.\d{1,3})?$/.test(v), "Indica una cantidad con hasta tres decimales.")
  .transform(v => new Prisma.Decimal(v).toFixed(3))
  .refine(v => new Prisma.Decimal(v).gt(0), "La cantidad debe ser positiva.");
export const guiaDespachoSchema = z.object({
  workOrderId: id,
  version: id,
  date: z.string().refine(fechaCalendarioValida, "Fecha de despacho inválida."),
  note: z.string().trim().max(2000),
  lines: z.array(z.object({
    workOrderLineId: id,
    warehouseId: id.nullable(),
    quantity: cantidad,
    conformityName: z.string().trim().max(150).nullable(),
    conformityDate: z.string().refine(fechaCalendarioValida).nullable(),
  }).strict()).min(1, "Incluye al menos una partida.").max(100),
}).strict();
export type DatosGuiaDespacho = z.input<typeof guiaDespachoSchema>;

export const correccionGuiaSchema = z.object({
  deliveryNoteId: id,
  version: id,
  date: z.string().refine(fechaCalendarioValida, "Fecha de devolución inválida."),
  reason: z.string().trim().min(1, "Indica el motivo de la corrección.").max(1000),
  physicalRestitutionConfirmed: z.boolean(),
  lines: z.array(z.object({ deliveryNoteLineId: id, quantity: cantidad }).strict()).min(1).max(100),
}).strict();
export type DatosCorreccionGuia = z.input<typeof correccionGuiaSchema>;
