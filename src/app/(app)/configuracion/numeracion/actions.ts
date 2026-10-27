"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { configurarNumeracion } from "@/lib/servicios/numeracion";
export async function guardarNumeracion(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);

  const resultado = await configurarNumeracion(datos);
  if (resultado.ok) revalidatePath("/configuracion/numeracion");
  return resultado;
}
