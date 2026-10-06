import { z } from "zod";

export const unidadMedidaSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre de la unidad.").max(100, "Usa hasta 100 caracteres."),
  abbreviation: z.string().trim().min(1, "Ingresa la abreviatura.").max(20, "Usa hasta 20 caracteres."),
});

export const referenciaUnidadSchema = z.object({
  id: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export type DatosUnidadMedida = z.infer<typeof unidadMedidaSchema>;
