"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { guardarPeriodoIva, eliminarPeriodoIva } from "@/lib/servicios/iva";
export async function guardarIva(datos: unknown, referencia?: unknown, abierta?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);

  const r = await guardarPeriodoIva(datos, referencia, abierta);
  if (r.ok) revalidatePath("/configuracion/iva");
  return r;
}
export async function eliminarIva(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("configuracion.operar", true);

  const r = await eliminarPeriodoIva(referencia);
  if (r.ok) revalidatePath("/configuracion/iva");
  return r;
}
