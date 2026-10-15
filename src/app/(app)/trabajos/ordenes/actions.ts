"use server";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { guardarPlanTrabajo } from "@/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "@/lib/consultas/ordenes-trabajo";
import { completarReservasTrabajo, liberarReservaTrabajo } from "@/lib/servicios/reservas-stock";
const refrescar=()=>{for(const path of ["/trabajos/ordenes","/ventas/ordenes","/inventario/stock","/inventario/productos-terminados"])revalidatePath(path);};
export async function guardar(datos:unknown,clave:unknown){const r=await guardarPlanTrabajo(datos,clave);if(r.ok)refrescar();return r;}
export async function consultar(id:number){try{return {ok:true as const,documento:await consultarTrabajo(id)};}catch{return {ok:false as const,mensaje:"No se pudo consultar la OT. Actualiza el listado."};}}
export async function preparar(id:number){try{return {ok:true as const,documento:await prepararTrabajoComercial(id)};}catch{return {ok:false as const,mensaje:"La orden no está disponible o ya tiene su único trabajo."};}}
export async function completar(datos:{workOrderId:number;version:number;idempotencyKey:string}){
  try {const r=await completarReservasTrabajo(datos);refrescar();return {ok:true as const,id:r.workOrderId,version:r.version,mensaje:"Reservas completadas con el stock disponible."};}
  catch(e){return {ok:false as const,incierto:!(e instanceof ZodError || e instanceof Error&&e.name==="ReglaReserva"),mensaje:e instanceof ZodError?e.issues[0].message:e instanceof Error&&e.name==="ReglaReserva"?e.message:"No se pudo comprobar el resultado. Reintenta sin cambiar la solicitud."};}
}
export async function liberar(datos:{workOrderId:number;version:number;allocationId:number;quantity:string;reason:string;idempotencyKey:string}){
  try{const r=await liberarReservaTrabajo(datos);refrescar();return {ok:true as const,id:r.workOrderId,version:r.version,mensaje:"Reserva liberada con historial; el stock físico se conserva."};}
  catch(e){return {ok:false as const,incierto:!(e instanceof ZodError || e instanceof Error&&e.name==="ReglaReserva"),mensaje:e instanceof ZodError?e.issues[0].message:e instanceof Error&&e.name==="ReglaReserva"?e.message:"No se pudo comprobar el resultado. Reintenta sin cambiar la solicitud."};}
}
