"use server";

import { revalidatePath } from "next/cache";
import { consultarMaterial, eliminarMaterial, guardarMaterial } from "@/lib/servicios/materiales";

export async function obtenerMaterial(id: unknown) {
  return consultarMaterial(id);
}

export async function guardarDatosMaterial(datos: unknown, referencia?: unknown) {
  const resultado = await guardarMaterial(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/materiales");
  return resultado;
}

export async function eliminarDatosMaterial(referencia: unknown) {
  const resultado = await eliminarMaterial(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/materiales");
  return resultado;
}
