"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import {
  consultarConfiguracionMinimo,
  guardarMinimoInventario,
} from "@/lib/servicios/minimos-inventario";
export async function obtenerConfiguracionMinimo(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("inventario.leer", true);

  return consultarConfiguracionMinimo(datos);
}
export async function guardarDatosMinimo(datos: unknown, referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("inventario.operar", true);

  const r = await guardarMinimoInventario(datos, referencia);
  if (r.ok) {
    revalidatePath("/inventario/stock");
    revalidatePath("/mantenedores/materiales");
    revalidatePath("/mantenedores/bodegas");
  }
  return r;
}
