"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { lineaCompraSchema } from "@/lib/validaciones/compra";
import { revalidatePath } from "next/cache";
import {
  calcularCompra,
  consultarCompra,
  recibirCompra,
  cerrarPendienteCompra,
  anularCompra,
  previsualizarRecepcionCompra,
  guardarCompra,
  previsualizarCompra,
  previsualizarEquivalenciaCompra,
  eliminarCompra,
} from "@/lib/servicios/compras";
export async function obtenerCompra(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.leer", true);

  return consultarCompra(id);
}
export async function calcularDatosCompra(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  return previsualizarCompra(datos);
}
export async function guardarDatosCompra(
  datos: unknown,
  clave: unknown,
  referencia?: unknown,
) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  const r = await guardarCompra(datos, clave, referencia);
  if (r.ok) {
    revalidatePath("/compras");
    revalidatePath("/mantenedores/bodegas");
    revalidatePath("/mantenedores/proveedores");
    revalidatePath("/mantenedores/materiales");
  }
  return r;
}
export async function eliminarDatosCompra(referencia: unknown, clave: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  const r = await eliminarCompra(referencia, clave);
  if (r.ok) revalidatePath("/compras");
  return r;
}

export async function registrarRecepcionCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  const r = await recibirCompra(datos, referencia, clave);
  if (r.ok) {
    for (const ruta of [
      "/compras",
      "/inventario/stock",
      "/inventario/movimientos",
      "/mantenedores/bodegas",
      "/mantenedores/materiales",
    ])
      revalidatePath(ruta);
  }
  return r;
}

export async function calcularRecepcionCompra(
  datos: unknown,
  referencia: unknown,
) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  return previsualizarRecepcionCompra(datos, referencia);
}

export async function cerrarDatosPendienteCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  const r = await cerrarPendienteCompra(datos, referencia, clave);
  if (r.ok) revalidatePath("/compras");
  return r;
}
export async function anularDatosCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  const r = await anularCompra(datos, referencia, clave);
  if (r.ok)
    for (const ruta of [
      "/compras",
      "/inventario/stock",
      "/inventario/movimientos",
      "/mantenedores/materiales",
      "/mantenedores/bodegas",
    ])
      revalidatePath(ruta);
  return r;
}

export async function calcularEquivalenciaCompra(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);

  return previsualizarEquivalenciaCompra(datos);
}

/** Previsualiza un detalle sin exigir que la cabecera del documento esté completa. */
export async function calcularDetalleCompra(datos: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("compras.operar", true);
  const validacion = lineaCompraSchema.safeParse(datos);
  if (!validacion.success) return { ok: false as const, mensaje: "Completa materia prima, presentación, cantidad, contenido y precio válidos." };
  try {
    return { ok: true as const, linea: validacion.data, ...calcularCompra({ lines: [validacion.data] }).lineas[0] };
  } catch (error) {
    return { ok: false as const, mensaje: error instanceof Error ? error.message : "No se pudo verificar el detalle." };
  }
}
