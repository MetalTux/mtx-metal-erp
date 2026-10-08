import { z } from "zod";
import { rutSchema } from "@/lib/validaciones/rut";

export const sucursalClienteSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Ingresa el nombre de la sucursal.").max(150),
  isHeadOffice: z.boolean(),
  address: z.string().trim().min(1, "Ingresa la dirección.").max(250),
  city: z.string().trim().min(1, "Ingresa la ciudad.").max(100),
  contact: z.string().trim().min(1, "Ingresa el nombre del contacto.").max(150),
  phone: z.string().trim().min(1, "Ingresa el teléfono de contacto.").max(40),
  email: z.string().trim().max(254).refine(v => v === "" || z.email().safeParse(v).success, "Ingresa un correo válido."),
});
export const clienteSchema = z.object({
  rut: rutSchema,
  name: z.string().trim().min(1, "Ingresa el nombre del cliente.").max(150, "Usa hasta 150 caracteres."),
  contact: z.string().trim().min(1, "Ingresa el contacto general.").max(150, "Usa hasta 150 caracteres."),
  email: z.string().trim().max(254, "Usa hasta 254 caracteres.").refine((valor) => valor === "" || z.email().safeParse(valor).success, "Ingresa un correo válido.").optional(),
  phone: z.string().trim().min(1, "Ingresa el teléfono general.").max(40, "Usa hasta 40 caracteres."),
  branches: z.array(sucursalClienteSchema).min(1, "El cliente necesita al menos Casa Central.").max(100).refine(v => v.filter(b => b.isHeadOffice && b.name === "Casa Central").length === 1 && v.filter(b => b.isHeadOffice).length === 1, "Debe existir una única Casa Central.").refine(v => new Set(v.map(b => b.name.toLocaleLowerCase("es-CL"))).size === v.length, "Los nombres de sucursal no pueden repetirse."),
});
export const referenciaClienteSchema = z.object({ id: z.number().int().positive(), updatedAt: z.iso.datetime() });
export type DatosCliente = z.infer<typeof clienteSchema>;

export type DatosSucursalCliente = z.infer<typeof sucursalClienteSchema>;
