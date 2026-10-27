"use server";
import { adjuntarComprobante, cambiarPromesa } from "@/lib/servicios/cobranza-c3";
import { revalidatePath } from "next/cache";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";
import { registrarAbono, anularAbono } from "@/lib/servicios/cobranza";
export async function registrar(datos: unknown) {
  await exigirOrigenAccion();await exigirAcceso("cobranza.operar", true);
  const r=await registrarAbono(datos);if(r.ok){revalidatePath("/ventas/cobranza");revalidatePath("/trabajos/ordenes");}return r;
}
export async function anular(datos: unknown) {
  await exigirOrigenAccion();await exigirAcceso("cobranza.operar", true);
  const r=await anularAbono(datos);if(r.ok){revalidatePath("/ventas/cobranza");revalidatePath("/trabajos/ordenes");}return r;
}

export async function adjuntar(form:FormData){
 await exigirOrigenAccion();await exigirAcceso("cobranza.operar", true);
 const r=await adjuntarComprobante(form);if(r.ok)revalidatePath("/ventas/cobranza");return r;
}
export async function prometer(datos:unknown){
 await exigirOrigenAccion();await exigirAcceso("cobranza.operar", true);
 const r=await cambiarPromesa(datos);if(r.ok){revalidatePath("/ventas/cobranza");revalidatePath("/trabajos/ordenes");}return r;
}
