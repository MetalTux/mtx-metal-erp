import { z } from "zod";
import { rutSchema } from "@/lib/validaciones/rut";

export const proveedorSchema = z.object({
  rut: rutSchema,
  name: z.string().trim().min(1, "Ingresa el nombre del proveedor.").max(150, "Usa hasta 150 caracteres."),
  email: z.string().trim().max(254, "Usa hasta 254 caracteres.").refine((valor) => valor === "" || z.email().safeParse(valor).success, "Ingresa un correo válido.").optional(),
  phone: z.string().trim().max(40, "Usa hasta 40 caracteres.").optional(),
});
export const referenciaProveedorSchema = z.object({ id: z.number().int().positive(), updatedAt: z.iso.datetime() });
export type DatosProveedor = z.infer<typeof proveedorSchema>;
