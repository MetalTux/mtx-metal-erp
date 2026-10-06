"use server";

import { revalidatePath } from "next/cache";
import { consultarProveedor, eliminarProveedor, guardarProveedor } from "@/lib/servicios/proveedores";

export async function obtenerProveedor(id: unknown) {
  return consultarProveedor(id);
}

export async function guardarDatosProveedor(datos: unknown, referencia?: unknown) {
  const resultado = await guardarProveedor(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/proveedores");
  return resultado;
}

export async function eliminarDatosProveedor(referencia: unknown) {
  const resultado = await eliminarProveedor(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/proveedores");
  return resultado;
}
