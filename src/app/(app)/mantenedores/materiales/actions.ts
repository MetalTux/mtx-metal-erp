"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";


import { revalidatePath } from "next/cache";
import { consultarMaterial, eliminarMaterial, guardarMaterial } from "@/lib/servicios/materiales";

export async function obtenerMaterial(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.leer", true);

  return consultarMaterial(id);
}

export async function guardarDatosMaterial(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await guardarMaterial(datos, referencia);
  if (resultado.ok) {
    revalidatePath("/mantenedores/materiales");
    revalidatePath("/compras");
  }
  return resultado;
}

export async function eliminarDatosMaterial(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await eliminarMaterial(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/materiales");
  return resultado;
}
