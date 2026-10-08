import { z } from "zod";

export const condicionPagoSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre de la condición.").max(100, "Usa hasta 100 caracteres."),
  days: z.number().int("Usa días enteros.").min(0, "El plazo no puede ser negativo.").max(2147483647, "El plazo supera el límite permitido."),
});
export const referenciaCondicionSchema = z.object({
  id: z.number().int().positive(),
  version: z.number().int().positive(),
});
export type DatosCondicionPago = z.infer<typeof condicionPagoSchema>;
