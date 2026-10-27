"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { emitirPdfGuia, historialPdfGuia } from "@/lib/servicios/pdfs-guia";
import { revalidatePath } from "next/cache";
import { corregirGuiaDespacho, previsualizarCorreccionGuia, previsualizarGuiaDespacho, registrarGuiaDespacho } from "@/lib/servicios/guias-despacho";

export async function previsualizarSalida(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.operar", true);
 return previsualizarGuiaDespacho(datos); }
export async function confirmarSalida(datos: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.operar", true);

  const r = await registrarGuiaDespacho(datos, clave);
  if (r.ok) for (const path of ["/trabajos/despachos", "/trabajos/ordenes", "/inventario/stock", "/inventario/productos-terminados", "/inventario/movimientos"]) revalidatePath(path);
  return r;
}

export async function previsualizarCorreccion(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.operar", true);

  return previsualizarCorreccionGuia(datos);
}
export async function confirmarCorreccion(datos: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.operar", true);

  const r = await corregirGuiaDespacho(datos, clave);
  if (r.ok) for (const path of ["/trabajos/despachos", "/trabajos/ordenes", "/inventario/stock", "/inventario/productos-terminados", "/inventario/movimientos"]) revalidatePath(path);
  return r;
}

export async function emitirDocumentoGuia(referencia: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.operar", true);

  const r = await emitirPdfGuia(referencia, clave);
  if (r.ok) revalidatePath("/trabajos/despachos");
  return r;
}
export async function consultarDocumentosGuia(id: number) {
  await exigirOrigenAccion();
  await exigirAcceso("guias.leer", true);

  try { return { ok: true as const, filas: await historialPdfGuia(id) }; }
  catch { return { ok: false as const, mensaje: "No se pudo consultar el historial PDF de la guía." }; }
}
