"use server";

import { revalidatePath } from "next/cache";
import { consultarCliente, eliminarCliente, guardarCliente } from "@/lib/servicios/clientes";

export async function obtenerCliente(id: unknown) {
  return consultarCliente(id);
}

export async function guardarDatosCliente(datos: unknown, referencia?: unknown) {
  const resultado = await guardarCliente(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/clientes");
  return resultado;
}

export async function eliminarDatosCliente(referencia: unknown) {
  const resultado = await eliminarCliente(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/clientes");
  return resultado;
}
