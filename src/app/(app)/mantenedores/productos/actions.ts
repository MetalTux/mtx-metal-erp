"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { consultarProducto, eliminarProducto, guardarProducto } from "@/lib/servicios/productos";
export async function obtenerProducto(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.leer", true);
 return consultarProducto(id); }
export async function guardarDatosProducto(form: FormData) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  if (!(form instanceof FormData)) return { ok: false, mensaje: "Formulario inválido." };
  let datos: unknown, ref: unknown, clave: unknown;
  try { datos = JSON.parse(String(form.get("datos"))); const r = form.get("referencia"); if (r) ref = JSON.parse(String(r)); clave = form.get("clave"); }
  catch { return { ok: false, mensaje: "Formulario inválido. Actualiza el listado." }; }
  const archivos = form.getAll("imagenes");
  if (archivos.some(f => !(f instanceof File))) return { ok: false, mensaje: "Selecciona archivos de imagen válidos." };
  const resultado = await guardarProducto(datos, ref, archivos as File[], clave);
  if (resultado.ok) revalidatePath("/mantenedores/productos");
  return resultado;
}
export async function eliminarDatosProducto(ref: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("catalogos.operar", true);

  const resultado = await eliminarProducto(ref);
  if (resultado.ok) revalidatePath("/mantenedores/productos");
  return resultado;
}
