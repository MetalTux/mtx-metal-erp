"use server";
import { revalidatePath } from "next/cache";
import {
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
  return consultarCompra(id);
}
export async function calcularDatosCompra(datos: unknown) {
  return previsualizarCompra(datos);
}
export async function guardarDatosCompra(
  datos: unknown,
  clave: unknown,
  referencia?: unknown,
) {
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
  const r = await eliminarCompra(referencia, clave);
  if (r.ok) revalidatePath("/compras");
  return r;
}

export async function registrarRecepcionCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
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
  return previsualizarRecepcionCompra(datos, referencia);
}

export async function cerrarDatosPendienteCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
  const r = await cerrarPendienteCompra(datos, referencia, clave);
  if (r.ok) revalidatePath("/compras");
  return r;
}
export async function anularDatosCompra(
  datos: unknown,
  referencia: unknown,
  clave: unknown,
) {
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
  return previsualizarEquivalenciaCompra(datos);
}
