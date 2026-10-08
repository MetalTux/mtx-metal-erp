import { z } from "zod";
import { rutValido } from "@/lib/validaciones/rut";

const texto = (limite: number) => z.string().trim().max(limite, `Usa hasta ${limite} caracteres.`).optional();
export const empresaSchema = z.object({
  legalName: texto(150), tradeName: texto(150),
  rut: z.string().trim().max(20, "Usa hasta 20 caracteres.").refine(valor => !valor || rutValido(valor), "Ingresa un RUT con dígito verificador válido.").optional(),
  businessActivity: texto(200), address: texto(250), commune: texto(100), city: texto(100),
  email: z.string().trim().max(254, "Usa hasta 254 caracteres.").refine(valor => !valor || z.email().safeParse(valor).success, "Ingresa un correo válido.").optional(),
  phone: texto(40),
});
export const referenciaEmpresaSchema = z.object({ updatedAt: z.iso.datetime() });
export type DatosEmpresa = z.infer<typeof empresaSchema>;
