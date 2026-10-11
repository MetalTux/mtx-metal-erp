import { z } from "zod";
import { rutSchema } from "@/lib/validaciones/rut";
const texto = (nombre: string, max: number) => z.string().trim().min(1, `Ingresa ${nombre}.`).max(max, `Usa hasta ${max} caracteres.`).refine(v => !/[\u0000-\u001f\u007f]/.test(v), "No se permiten saltos de línea ni caracteres de control.");
export const cuentaBancariaSchema = z.object({
  bankName: texto("el banco", 100), accountType: texto("el tipo de cuenta", 100),
  accountNumber: texto("el número de cuenta", 60), holderName: texto("el nombre del titular", 150),
  holderRut: rutSchema,
  email: z.string().trim().max(254).refine(v => !v || z.email().safeParse(v).success, "Ingresa un correo válido.").default(""),
});
export const referenciaCuentaSchema = z.object({ id: z.number().int().positive().max(2147483647), version: z.number().int().positive().max(2147483647) });
export const referenciaPrincipalSchema = referenciaCuentaSchema.extend({ principalId: z.number().int().positive().max(2147483647).nullable() });
export type DatosCuentaBancaria = z.infer<typeof cuentaBancariaSchema>;
