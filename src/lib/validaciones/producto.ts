import { z } from "zod";
const id = z.number().int().positive().max(2147483647);
export const productoSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre.").max(150),
  description: z.string().trim().max(4000), unitMeasureId: id,
  suggestedPrice: z.string().trim().refine(v => !v || /^\d{1,12}$/.test(v), "Indica un precio entero en pesos, sin decimales ni separadores de miles."),
  recipes: z.array(z.object({ rawMaterialId: id, unitMeasureId: id, quantity: z.string().trim().refine(v => /^\d{1,11}(?:[.,]\d{1,3})?$/.test(v) && /[1-9]/.test(v), "Cantidad positiva, con hasta tres decimales.") })).max(100).refine(v => new Set(v.map(r => r.rawMaterialId)).size === v.length, "No repitas un material en la receta."),
  images: z.array(z.union([z.object({ id }), z.object({ fileIndex: z.number().int().min(0).max(9) })])).max(10).refine(v => new Set(v.map(i => "id" in i ? `id:${i.id}` : `file:${i.fileIndex}`)).size === v.length, "No repitas imágenes."),
});
export const referenciaProductoSchema = z.object({ id, version: id });
export type DatosProducto = z.infer<typeof productoSchema>;
