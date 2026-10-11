import { z } from "zod";
import { MAX_NUMERO_DOCUMENTAL } from "@/config/numeracion-documental";
export const numeracionSchema = z.object({
  id: z.number().int().positive(), version: z.number().int().positive(),
  prefix: z.string().max(20).regex(/^[A-Za-z0-9._/-]*$/, "Usa letras, números, punto, guion, barra o guion bajo, sin espacios."),
  padding: z.number().int().min(1).max(18),
  nextNumber: z.string().regex(/^[0-9]{1,18}$/, "Indica un entero positivo de hasta 18 dígitos.").refine(v => /^[0-9]{1,18}$/.test(v) && BigInt(v) > BigInt(0) && BigInt(v) <= MAX_NUMERO_DOCUMENTAL, "Número fuera de rango."),
});
