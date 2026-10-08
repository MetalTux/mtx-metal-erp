import { z } from "zod";
import { ajusteSchema, filtrosAjustesSchema } from "@/lib/validaciones/ajuste";
export const combinacionTrasladoSchema = z.object({
  rawMaterialId: z.number().int().positive(),
  unitMeasureId: z.number().int().positive(),
  sourceWarehouseId: z.number().int().positive(),
  destinationWarehouseId: z.number().int().positive(),
});
export const trasladoSchema = combinacionTrasladoSchema
  .extend({
    quantity: ajusteSchema.shape.finalQuantity,
    date: ajusteSchema.shape.date,
    note: ajusteSchema.shape.note,
    correctedTransferId: z.number().int().positive().nullable(),
    idempotencyKey: z.uuid(),
    sourceReference: ajusteSchema.shape.reference,
    destinationReference: ajusteSchema.shape.reference,
  })
  .refine((d) => d.sourceWarehouseId !== d.destinationWarehouseId);
export const filtrosTrasladosSchema = z
  .object({
    texto: filtrosAjustesSchema.shape.texto,
    rawMaterialId: filtrosAjustesSchema.shape.rawMaterialId,
    sourceWarehouseId: z.coerce.number().int().positive().optional(),
    destinationWarehouseId: z.coerce.number().int().positive().optional(),
    desde: filtrosAjustesSchema.shape.desde,
    hasta: filtrosAjustesSchema.shape.hasta,
    pagina: filtrosAjustesSchema.shape.pagina,
    tamano: filtrosAjustesSchema.shape.tamano,
    orden: filtrosAjustesSchema.shape.orden,
    sentido: filtrosAjustesSchema.shape.sentido,
  })
  .refine((d) => !d.desde || !d.hasta || d.desde <= d.hasta);
