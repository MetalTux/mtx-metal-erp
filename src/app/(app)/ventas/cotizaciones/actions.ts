"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { revalidatePath } from "next/cache";
import { guardarCotizacion, resolverCotizacion, actualizarEmisorCotizacion } from "@/lib/servicios/cotizaciones";
import { cargarImagenCotizacion } from "@/lib/servicios/imagenes-cotizacion";
import { obtenerCotizacion } from "@/lib/consultas/cotizaciones";
import { prisma } from "@/lib/prisma";
import { ivaParaDocumento } from "@/lib/servicios/iva";
import { calcularImportesCotizacion } from "@/lib/servicios/importes-cotizacion";
export async function guardar(datos: unknown, clave: unknown, referencia?: unknown, original?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);

  const r = await guardarCotizacion(datos, clave, referencia, original);
  if (r.ok) revalidatePath("/ventas/cotizaciones"); return r;
}
export async function resolver(referencia: unknown, clave: unknown, accion: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);

  if (accion === "APROBAR") return { ok: false as const, mensaje: "Utiliza Aceptar y registrar orden para confirmar juntos la aprobación y el compromiso del cliente." };
  const r = await resolverCotizacion(referencia, clave, accion);
  if (r.ok) revalidatePath("/ventas/cotizaciones"); return r;
}
export async function consultar(id: number) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.leer", true);

  try { return { ok: true as const, documento: await obtenerCotizacion(id) }; }
  catch { return { ok: false as const, mensaje: "No se pudo consultar la cotización. Actualiza el listado." }; }
}
export async function subirImagen(form: FormData) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);
 return cargarImagenCotizacion(form); }
/** Vista previa de sólo lectura; jamás asignar folio ni confiar en totales del cliente. */
export async function previsualizar(fecha: string, lineas: unknown, descuento: unknown, pricesIncludeVat = false) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);

  try {
    return await prisma.$transaction(async tx => {
      const iva = await ivaParaDocumento(tx, fecha);
      const { lineAmounts, ...totales } = calcularImportesCotizacion({ pricesIncludeVat, lineas, descuento, tasaIva: iva.vatRate.toString() });
      return { ok: true as const, tasa: iva.vatRate.toString(), lineAmounts: lineAmounts.map(v => v.toFixed(0)), subtotal: totales.subtotal.toFixed(0), discountAmount: totales.discountAmount.toFixed(0), netAmount: totales.netAmount.toFixed(0), vatAmount: totales.vatAmount.toFixed(0), totalAmount: totales.totalAmount.toFixed(0) };
    });
  } catch { return { ok: false as const, mensaje: "Revisa cantidades, precios, descuento y cobertura del IVA para la fecha elegida." }; }
}

export async function emitirPdf(referencia: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);

  const { emitirPdfCotizacion } = await import("@/lib/servicios/pdfs-cotizacion");
  return emitirPdfCotizacion(referencia, clave);
}
export async function consultarPdfs(id: number) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.leer", true);

  try { const { historialPdfCotizacion } = await import("@/lib/servicios/pdfs-cotizacion"); const filas = await historialPdfCotizacion(id);
    const q = await prisma.quote.findUniqueOrThrow({ where: { id }, select: { status: true, deletedAt: true } });
    return { ok: true as const, filas, emisorEditable: q.status === "PENDIENTE" && !q.deletedAt }; }
  catch { return { ok: false as const, mensaje: "No se pudo consultar el historial de PDF." }; }
}

export async function actualizarEmisor(referencia: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("cotizaciones.operar", true);

  const r = await actualizarEmisorCotizacion(referencia, clave);
  if (r.ok) revalidatePath("/ventas/cotizaciones");
  return r;
}
