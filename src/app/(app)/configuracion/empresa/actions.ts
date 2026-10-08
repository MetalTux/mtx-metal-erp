"use server";

import { revalidatePath } from "next/cache";
import { guardarEmpresaConLogo, obtenerEmpresa } from "@/lib/servicios/empresa";
import type { ResultadoEmpresa } from "@/lib/tipos/empresa";
export async function consultarPerfilEmpresa() { return obtenerEmpresa(); }
export async function guardarPerfilEmpresa(formulario: FormData): Promise<ResultadoEmpresa> {
  if (!(formulario instanceof FormData)) return { ok: false, mensaje: "El formulario recibido no es válido." };
  let datos: unknown;
  let referencia: unknown;
  try {
    datos = JSON.parse(String(formulario.get("datos")));
    const version = formulario.get("referencia");
    if (version !== null) referencia = JSON.parse(String(version));
  } catch { return { ok: false, mensaje: "El formulario recibido no es válido. Actualiza los datos." }; }
  const archivo = formulario.get("logo");
  if (archivo !== null && !(archivo instanceof File)) return { ok: false, mensaje: "Selecciona un archivo de logo válido." };
  const resultado = await guardarEmpresaConLogo(datos, referencia, archivo ?? undefined, formulario.get("quitarLogo") === "true");
  if (resultado.ok) revalidatePath("/configuracion/empresa");
  return resultado;
}
