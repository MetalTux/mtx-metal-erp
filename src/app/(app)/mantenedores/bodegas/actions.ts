"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";


import { revalidatePath } from "next/cache";
import { consultarBodega, eliminarBodega, guardarBodega } from "@/lib/servicios/bodegas";

export async function obtenerBodega(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.leer", true);

  return consultarBodega(id);
}

export async function guardarDatosBodega(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await guardarBodega(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/bodegas");
  return resultado;
}

export async function eliminarDatosBodega(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await eliminarBodega(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/bodegas");
  return resultado;
}
