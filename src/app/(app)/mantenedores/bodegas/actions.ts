"use server";

import { revalidatePath } from "next/cache";
import { consultarBodega, eliminarBodega, guardarBodega } from "@/lib/servicios/bodegas";

export async function obtenerBodega(id: unknown) {
  return consultarBodega(id);
}

export async function guardarDatosBodega(datos: unknown, referencia?: unknown) {
  const resultado = await guardarBodega(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/bodegas");
  return resultado;
}

export async function eliminarDatosBodega(referencia: unknown) {
  const resultado = await eliminarBodega(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/bodegas");
  return resultado;
}
