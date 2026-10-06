"use server";

import { revalidatePath } from "next/cache";
import { consultarUnidad, guardarUnidad, eliminarUnidad } from "@/lib/servicios/unidades-medida";

export async function obtenerUnidad(id: unknown) {
  return consultarUnidad(id);
}

export async function guardarUnidadMedida(datos: unknown, referencia?: unknown) {
  const resultado = await guardarUnidad(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/unidades");
  return resultado;
}

export async function eliminarUnidadMedida(referencia: unknown) {
  const resultado = await eliminarUnidad(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/unidades");
  return resultado;
}
