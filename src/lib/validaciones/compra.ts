import { z } from "zod";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
// Decimales como texto: la coma es admitida como separador, nunca como agrupador.
const decimal = (escala: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine(
      (v) => new RegExp(`^\\d{1,12}(?:\\.\\d{1,${escala}})?$`).test(v),
      "Revisa el valor decimal y su precisión.",
    );
export const lineaCompraSchema = z.object({
  id: z.number().int().positive().optional(),
  rawMaterialId: z.number().int().positive(),
  presentation: z.string().trim().min(1).max(100),
  purchasedQuantity: decimal(3),
  unitFactor: decimal(3),
  unitPrice: decimal(2),
});
export const compraSchema = z.object({
  date: z.string().refine(fechaCalendarioValida, "Fecha inválida."),
  supplierId: z.number().int().positive(),
  documentTypeId: z.number().int().positive(),
  documentNumber: z.string().trim().min(1).max(100),
  warehouseId: z.number().int().positive(),
  lines: z.array(lineaCompraSchema).min(1).max(50),
});
export const referenciaCompraSchema = z.object({
  id: z.number().int().positive(),
  version: z.number().int().positive(),
});
export const claveCompraSchema = z.string().uuid();
export const filtrosCompraSchema = z.object({
  q: z.string().trim().max(150).default(""),
  pagina: z.coerce.number().int().positive().default(1),
  tamano: z.coerce
    .number()
    .refine((v) => [10, 20, 50].includes(v))
    .default(10),
  orden: z.enum(["fecha", "documento", "total"]).default("fecha"),
  sentido: z.enum(["asc", "desc"]).default("desc"),
});
export type DatosCompra = z.infer<typeof compraSchema>;
export type FiltrosCompra = z.infer<typeof filtrosCompraSchema>;

/** Sólo se envían líneas que realmente se reciben; las otras mantienen su pendiente. */
export const recepcionCompraSchema = z.object({
  date: z.string().refine(fechaCalendarioValida, "Fecha inválida."),
  note: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        purchaseDetailId: z.number().int().positive(),
        receivedQuantity: decimal(3),
      }),
    )
    .min(1)
    .max(50),
});
export type DatosRecepcionCompra = z.infer<typeof recepcionCompraSchema>;

export const motivoCompraSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});
export const cierreCompraSchema = motivoCompraSchema.extend({
  purchaseDetailId: z.number().int().positive(),
});
