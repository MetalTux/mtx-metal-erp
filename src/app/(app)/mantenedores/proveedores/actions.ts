"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";


import { revalidatePath } from "next/cache";
import { consultarProveedor, eliminarProveedor, guardarProveedor } from "@/lib/servicios/proveedores";

export async function obtenerProveedor(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("proveedores.leer", true);

  return consultarProveedor(id);
}

export async function guardarDatosProveedor(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("proveedores.operar", true);

  const resultado = await guardarProveedor(datos, referencia);
  if (resultado.ok) {
    revalidatePath("/mantenedores/proveedores");
    revalidatePath("/compras");
  }
  return resultado;
}

export async function eliminarDatosProveedor(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("proveedores.operar", true);

  const resultado = await eliminarProveedor(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/proveedores");
  return resultado;
}
