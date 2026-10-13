"use server";
import { revalidatePath } from "next/cache";
import { guardarPeriodoIva, eliminarPeriodoIva } from "@/lib/servicios/iva";
export async function guardarIva(datos: unknown, referencia?: unknown, abierta?: unknown) {
  const r = await guardarPeriodoIva(datos, referencia, abierta);
  if (r.ok) revalidatePath("/configuracion/iva");
  return r;
}
export async function eliminarIva(referencia: unknown) {
  const r = await eliminarPeriodoIva(referencia);
  if (r.ok) revalidatePath("/configuracion/iva");
  return r;
}
