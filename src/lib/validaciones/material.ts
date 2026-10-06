import { z } from "zod";

export const materialSchema = z.object({
  code: z.string().trim().min(1, "Ingresa el código del material.").max(50, "Usa hasta 50 caracteres."),
  name: z.string().trim().min(1, "Ingresa el nombre del material.").max(150, "Usa hasta 150 caracteres."),
  description: z.string().trim().max(2000, "Usa hasta 2000 caracteres.").optional(),
  unitMeasureId: z.number().int().positive("Selecciona una unidad de medida."),
});
export const referenciaMaterialSchema = z.object({ id: z.number().int().positive(), updatedAt: z.iso.datetime() });
export type DatosMaterial = z.infer<typeof materialSchema>;
