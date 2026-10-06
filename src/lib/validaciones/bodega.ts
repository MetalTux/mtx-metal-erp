import { z } from "zod";

export const bodegaSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre de la bodega.").max(100, "Usa hasta 100 caracteres."),
  location: z.string().trim().max(200, "Usa hasta 200 caracteres.").optional(),
});

export const referenciaBodegaSchema = z.object({
  id: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export type DatosBodega = z.infer<typeof bodegaSchema>;
