"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";


import { revalidatePath } from "next/cache";
import { consultarCliente, eliminarCliente, guardarCliente } from "@/lib/servicios/clientes";

export async function obtenerCliente(id: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("clientes.leer", true);

  return consultarCliente(id);
}

export async function guardarDatosCliente(datos: unknown, referencia?: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("clientes.operar", true);

  const resultado = await guardarCliente(datos, referencia);
  if (resultado.ok) {
    revalidatePath("/mantenedores/clientes");
    revalidatePath("/ventas/cotizaciones");
  }
  return resultado;
}

export async function eliminarDatosCliente(referencia: unknown) {
  await exigirOrigenAccion();
  await exigirAcceso("clientes.operar", true);

  const resultado = await eliminarCliente(referencia);
  if (resultado.ok) revalidatePath("/mantenedores/clientes");
  return resultado;
}
