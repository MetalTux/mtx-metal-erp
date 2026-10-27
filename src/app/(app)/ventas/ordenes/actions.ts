"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { obtenerOfertaParaOrden, obtenerOrdenCompraCliente } from "@/lib/consultas/ordenes-compra-cliente";
import { registrarOrdenCompraCliente, previsualizarOrdenCompraCliente, anularOrdenCompraCliente } from "@/lib/servicios/ordenes-compra-cliente";
export async function consultarOferta(id: number) {
  await exigirOrigenAccion();
  await exigirAcceso("ordenes_cliente.leer", true);

  try { return { ok: true as const, documento: await obtenerOfertaParaOrden(id) }; }
  catch (e) { return { ok: false as const, mensaje: e instanceof Error && e.name === "ReglaOrden" ? e.message : "No se pudo abrir la oferta. Revisa su vigencia, datos históricos y si ya tiene una orden." }; }
}
export async function consultarOrden(id: number) {
  await exigirOrigenAccion();
  await exigirAcceso("ordenes_cliente.leer", true);

  try { return { ok: true as const, documento: await obtenerOrdenCompraCliente(id) }; }
  catch { return { ok: false as const, mensaje: "No se pudo consultar la orden. Actualiza el listado; las órdenes legadas requieren conciliación." }; }
}
export async function registrar(datos: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ordenes_cliente.operar", true);

  const r = await registrarOrdenCompraCliente(datos, clave);
  if (r.ok) { revalidatePath("/ventas/ordenes"); revalidatePath("/ventas/cotizaciones"); revalidatePath("/ventas/cobranza"); }
  return r;
}
export async function anular(datos: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ordenes_cliente.operar", true);

  const r = await anularOrdenCompraCliente(datos, clave);
  if (r.ok) { revalidatePath("/ventas/ordenes"); revalidatePath("/ventas/cotizaciones"); revalidatePath("/ventas/cobranza"); }
  return r;
}
export async function previsualizar(quoteId: number, version: number, seleccion: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("ordenes_cliente.operar", true);
 return previsualizarOrdenCompraCliente(quoteId, version, seleccion); }
