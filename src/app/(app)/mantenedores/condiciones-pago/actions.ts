"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { consultarCondicion, guardarCondicion, eliminarCondicion } from "@/lib/servicios/condiciones-pago";
export async function obtenerCondicion(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.leer", true);
 return consultarCondicion(id); }
export async function guardarCondicionPago(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);

  const resultado = await guardarCondicion(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/condiciones-pago");
  return resultado;
}
export async function eliminarCondicionPago(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);

  const resultado = await eliminarCondicion(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/condiciones-pago");
  return resultado;
}
