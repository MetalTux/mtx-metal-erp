"use server";
import { revalidatePath } from "next/cache";
import { consultarCondicion, guardarCondicion, eliminarCondicion } from "@/lib/servicios/condiciones-pago";
export async function obtenerCondicion(id: unknown) { return consultarCondicion(id); }
export async function guardarCondicionPago(datos: unknown, referencia?: unknown) {
  const resultado = await guardarCondicion(datos, referencia);
  if (resultado.ok) revalidatePath("/mantenedores/condiciones-pago");
  return resultado;
}
export async function eliminarCondicionPago(referencia: unknown) {
  const resultado = await eliminarCondicion(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/condiciones-pago");
  return resultado;
}
