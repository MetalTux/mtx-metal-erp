"use server";
import { revalidatePath } from "next/cache";
import { configurarNumeracion } from "@/lib/servicios/numeracion";
export async function guardarNumeracion(datos: unknown) {
  const resultado = await configurarNumeracion(datos);
  if (resultado.ok) revalidatePath("/configuracion/numeracion");
  return resultado;
}
