"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";


import { revalidatePath } from "next/cache";
import { consultarUnidad, guardarUnidad, eliminarUnidad } from "@/lib/servicios/unidades-medida";

export async function obtenerUnidad(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.leer", true);

  return consultarUnidad(id);
}

export async function guardarUnidadMedida(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await guardarUnidad(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/unidades");
  return resultado;
}

export async function eliminarUnidadMedida(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await eliminarUnidad(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/unidades");
  return resultado;
}
