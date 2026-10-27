"use server";
import { exigirAcceso, exigirOrigenAccion } from "@/lib/seguridad/acceso";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { guardarPlanTrabajo, iniciarTrabajo } from "@/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "@/lib/consultas/ordenes-trabajo";
import { completarReservasTrabajo, liberarReservaTrabajo } from "@/lib/servicios/reservas-stock";
const refrescar=()=>{for(const path of ["/trabajos/ordenes","/ventas/ordenes","/inventario/stock","/inventario/productos-terminados"])revalidatePath(path);};
export async function guardar(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await guardarPlanTrabajo(datos,clave);if(r.ok)refrescar();return r;}
export async function consultar(id:number){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.leer", true);
try{return {ok:true as const,documento:await consultarTrabajo(id)};}catch{return {ok:false as const,mensaje:"No se pudo consultar la OT. Actualiza el listado."};}}
export async function preparar(id:number){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
try{return {ok:true as const,documento:await prepararTrabajoComercial(id)};}catch{return {ok:false as const,mensaje:"La orden no está disponible o ya tiene su único trabajo."};}}
export async function completar(datos:{workOrderId:number;version:number;idempotencyKey:string}){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);

  try {const r=await completarReservasTrabajo(datos);refrescar();return {ok:true as const,id:r.workOrderId,version:r.version,mensaje:"Reservas completadas con el stock disponible."};}
  catch(e){return {ok:false as const,incierto:!(e instanceof ZodError || e instanceof Error&&e.name==="ReglaReserva"),mensaje:e instanceof ZodError?e.issues[0].message:e instanceof Error&&e.name==="ReglaReserva"?e.message:"No se pudo comprobar el resultado. Reintenta sin cambiar la solicitud."};}
}
export async function liberar(datos:{workOrderId:number;version:number;allocationId:number;quantity:string;reason:string;idempotencyKey:string}){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);

  try{const r=await liberarReservaTrabajo(datos);refrescar();return {ok:true as const,id:r.workOrderId,version:r.version,mensaje:"Reserva liberada con historial; el stock físico se conserva."};}
  catch(e){return {ok:false as const,incierto:!(e instanceof ZodError || e instanceof Error&&e.name==="ReglaReserva"),mensaje:e instanceof ZodError?e.issues[0].message:e instanceof Error&&e.name==="ReglaReserva"?e.message:"No se pudo comprobar el resultado. Reintenta sin cambiar la solicitud."};}
}

export async function iniciar(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await iniciarTrabajo(datos,clave);if(r.ok)refrescar();return r;}


export async function prepararLote(datos:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
return (await import("@/lib/servicios/produccion")).prepararLoteProduccion(datos);}
export async function previsualizarLote(datos:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
return (await import("@/lib/servicios/produccion")).previsualizarProduccion(datos);}
export async function registrarLote(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await (await import("@/lib/servicios/produccion")).registrarProduccion(datos,clave);if(r.ok){refrescar();revalidatePath("/inventario/movimientos");}return r;}

export async function previsualizarReversion(datos:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
return (await import("@/lib/servicios/reversiones-produccion")).previsualizarReversionProduccion(datos);}
export async function revertir(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await (await import("@/lib/servicios/reversiones-produccion")).revertirProduccion(datos,clave);if(r.ok){refrescar();revalidatePath("/inventario/movimientos");}return r;}
export async function anularPropia(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await (await import("@/lib/servicios/reversiones-produccion")).anularTrabajoPropio(datos,clave);if(r.ok)refrescar();return r;}

export async function previsualizarCierre(datos:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
return (await import("@/lib/servicios/cierre-trabajo")).previsualizarCierreTrabajo(datos);}
export async function finalizar(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
const r=await (await import("@/lib/servicios/cierre-trabajo")).finalizarTrabajo(datos,clave);if(r.ok)refrescar();return r;}
export async function facturar(datos:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("facturas.operar", true);
const r=await (await import("@/lib/servicios/cierre-trabajo")).registrarFacturaTrabajo(datos,clave);if(r.ok){refrescar();revalidatePath("/ventas/cobranza");}return r;}

export async function emitirPdfTrabajo(referencia:unknown,clave:unknown){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.operar", true);
return (await import("@/lib/servicios/pdfs-trabajo")).emitirPdfTrabajo(referencia,clave);}
export async function consultarPdfsTrabajo(id:number){
  await exigirOrigenAccion();
  await exigirAcceso("trabajos.leer", true);
try{return {ok:true as const,filas:await (await import("@/lib/servicios/pdfs-trabajo")).historialPdfTrabajo(id)};}catch{return {ok:false as const,mensaje:"No se pudo consultar el historial de PDF de OT."};}}
