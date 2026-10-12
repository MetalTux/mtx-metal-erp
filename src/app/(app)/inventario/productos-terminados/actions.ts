"use server";
import { revalidatePath } from "next/cache";
import { consultarSaldoTerminado, registrarInicialTerminado, registrarAjusteTerminado } from "@/lib/servicios/stock-terminado";
export async function revisarSaldoTerminado(datos: unknown) { return consultarSaldoTerminado(datos); }
export async function ingresarInicialTerminado(datos: unknown) {
  const r = await registrarInicialTerminado(datos);
  if (r.ok) { revalidatePath("/inventario/productos-terminados"); revalidatePath("/mantenedores/productos"); revalidatePath("/mantenedores/bodegas"); }
  return r;
}

export async function ajustarTerminado(datos: unknown) {
  const r = await registrarAjusteTerminado(datos);
  if (r.ok) {
    revalidatePath("/inventario/productos-terminados");
    revalidatePath("/mantenedores/productos");
    revalidatePath("/mantenedores/bodegas");
  }
  return r;
}
export async function prepararConfirmacionTerminado(datos: unknown) {
  const { prepararAjusteTerminado } = await import("@/lib/servicios/stock-terminado");
  return prepararAjusteTerminado(datos);
}
