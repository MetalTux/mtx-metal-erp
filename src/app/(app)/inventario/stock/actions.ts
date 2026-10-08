"use server";
import { revalidatePath } from "next/cache";
import {
  consultarConfiguracionMinimo,
  guardarMinimoInventario,
} from "@/lib/servicios/minimos-inventario";
export async function obtenerConfiguracionMinimo(datos: unknown) {
  return consultarConfiguracionMinimo(datos);
}
export async function guardarDatosMinimo(datos: unknown, referencia: unknown) {
  const r = await guardarMinimoInventario(datos, referencia);
  if (r.ok) {
    revalidatePath("/inventario/stock");
    revalidatePath("/mantenedores/materiales");
    revalidatePath("/mantenedores/bodegas");
  }
  return r;
}
