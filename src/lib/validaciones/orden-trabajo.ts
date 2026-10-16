import { z } from "zod";
import { Prisma } from "@/generated/prisma/browser";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const id = z.number({ error: "Selecciona una referencia válida." }).int("La referencia debe ser entera.").positive("Selecciona una referencia válida.").max(2147483647, "Referencia fuera de rango.");
const cantidad = z.string().trim().transform(v => v.replace(",", ".")).refine(v => /^\d{1,11}(?:\.\d{1,3})?$/.test(v), "Indica una cantidad con hasta tres decimales, sin separadores de miles.").transform(v => new Prisma.Decimal(v).toFixed(3));
const positiva = cantidad.refine(v => new Prisma.Decimal(v).gt(0), "La cantidad debe ser positiva.");
export const lineaPlanTrabajoSchema = z.object({
  id: id.nullable(), sourceDetailId: id.nullable(), kind: z.enum(["PRODUCTO", "MATERIA_PRIMA", "SERVICIO"]),
  executionMode: z.enum(["CATALOGO", "VENTA_DIRECTA_MP", "SERVICIO", "A_MEDIDA"]),
  productId: id.nullable(), rawMaterialId: id.nullable(), unitMeasureId: id,
  description: z.string().trim().min(1, "Indica la descripción de la línea.").max(2000), quantity: positiva, quantityToProduce: cantidad,
  productVersion: id.nullable(), refreshRecipe: z.boolean(),
  supplies: z.array(z.object({ warehouseId: id, quantity: positiva }).strict()).max(100),
  materials: z.array(z.object({ rawMaterialId: id, warehouseId: id, quantity: positiva }).strict()).max(300),
  roundingReviews: z.array(z.object({ rawMaterialId: id, quantity: positiva, reason: z.string().trim().min(1).max(1000) }).strict()).max(100),
}).strict();
export const planTrabajoSchema = z.object({
  id: id.nullable(), version: id.nullable(), salesOrderId: id.nullable(), salesOrderVersion: id.nullable(),
  date: z.string().refine(fechaCalendarioValida, "La fecha de trabajo no es válida."),
  productName: z.string().trim().min(1, "Indica el título de la OT.").max(150), ownPurpose: z.string().trim().max(1000).nullable(),
  internalInstructions: z.string().trim().max(5000), targetDate: z.string().refine(fechaCalendarioValida).nullable(),
  confirmPlan: z.boolean(), reason: z.string().trim().max(1000), lines: z.array(lineaPlanTrabajoSchema).min(1, "Agrega al menos una línea.").max(100),
}).strict();
export type PlanTrabajo = z.infer<typeof planTrabajoSchema>;
export type LineaPlanTrabajo = z.infer<typeof lineaPlanTrabajoSchema>;

export const inicioTrabajoSchema = z.object({
  workOrderId: id,
  version: id,
  startedDate: z.string().refine(fechaCalendarioValida, "Indica una fecha de inicio válida."),
}).strict();
