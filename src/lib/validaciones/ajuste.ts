import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
export const combinacionAjusteSchema = z.object({
  rawMaterialId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  unitMeasureId: z.number().int().positive(),
});
const cantidad = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine(
    (v) => /^\d{1,11}(\.\d{1,3})?$/.test(v),
    "Indica una cantidad no negativa con hasta tres decimales.",
  );
export const ajusteSchema = combinacionAjusteSchema.extend({
  finalQuantity: cantidad,
  reason: z.enum([
    "CONTEO_FISICO",
    "MERMA_PERDIDA",
    "DETERIORO_DANO",
    "CORRECCION_REGISTRO",
    "OTRO",
    "INVENTARIO_INICIAL",
  ]),
  note: z.string().trim().min(1).max(2000),
  date: z.string().refine(fechaCalendarioValida),
  correctedAdjustmentId: z.number().int().positive().nullable(),
  idempotencyKey: z.uuid(),
  reference: z.object({
    stockId: z.number().int().positive().nullable(),
    updatedAt: z.iso.datetime().nullable(),
    quantity: z.string().regex(/^-?\d+(\.\d{1,3})?$/),
    lastMovementId: z.number().int().positive().nullable(),
  }),
});
export const filtrosAjustesSchema = z
  .object({
    texto: z.string().trim().max(150).default(""),
    warehouseId: z.coerce.number().int().positive().optional(),
    rawMaterialId: z.coerce.number().int().positive().optional(),
    reason: ajusteSchema.shape.reason.optional(),
    desde: z.string().refine(fechaCalendarioValida).optional(),
    hasta: z.string().refine(fechaCalendarioValida).optional(),
    pagina: z.coerce.number().int().positive().max(1000000).default(1),
    tamano: z.coerce
      .number()
      .refine((n) => [10, 20, 50].includes(n))
      .default(20),
    orden: z.enum(["id", "date", "createdAt"]).default("id"),
    sentido: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((d) => !d.desde || !d.hasta || d.desde <= d.hasta);
