import type { ResultadoCobro } from "./cobranza";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { anotarMutacion } from "@/lib/seguridad/autoria";
import { almacenComprobantes } from "@/lib/almacenamiento/comprobantes-cobranza";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { hoyOrden } from "./ordenes-compra-cliente";
const id=z.number().int().positive().safe(), clave=z.string().uuid().transform(s=>s.toLowerCase());
class Rechazo extends Error{}
function exigir(v:unknown,mensaje:string):asserts v{if(!v)throw new Rechazo(mensaje);}
function fallo(e:unknown){if(e instanceof Error&&e.message.includes("NEXT_REDIRECT"))throw e;return {ok:false as const,incierto:!(e instanceof Rechazo),mensaje:e instanceof Rechazo?e.message:"No se pudo confirmar. Conserva los datos y reintenta con la misma clave."};}
export async function adjuntarComprobante(form:FormData):Promise<ResultadoCobro>{
 await exigirAcceso("cobranza.operar");
 const p=z.object({pagoId:id,clave}).safeParse({pagoId:Number(form.get("pagoId")),clave:form.get("clave")});if(!p.success)return {ok:false as const,mensaje:"Referencia de comprobante inválida."};
 let preparado;try{preparado=await almacenComprobantes.preparar(form.get("archivo") as File);}catch(e){return {ok:false as const,mensaje:e instanceof Error?e.message:"Archivo inválido."};}
 let nuevo:string|undefined;
 try{return await prisma.$transaction(async tx=>{
  await exigirAccesoEnTransaccion(tx,"cobranza.operar");
  const pago=await tx.payment.findUnique({where:{id:p.data.pagoId},select:{accountReceivableId:true}});exigir(pago,"No existe el abono.");
  await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE id=${pago.accountReceivableId} FOR UPDATE`;
  const previo=await tx.paymentAttachment.findUnique({where:{id:p.data.clave}});
  if(previo){exigir(previo.paymentId===p.data.pagoId&&previo.fingerprint===preparado.fingerprint&&previo.originalName===preparado.originalName&&previo.mimeType===preparado.mimeType,"La clave ya identifica otro comprobante. Conserva el archivo original.");return {ok:true as const,mensaje:"El comprobante ya estaba adjunto."};}
  nuevo=await almacenComprobantes.guardar(preparado.bytes);
  await anotarMutacion(tx,"paymentAttachment","create",await tx.paymentAttachment.create({data:{id:p.data.clave,paymentId:p.data.pagoId,fileKey:nuevo,fingerprint:preparado.fingerprint,originalName:preparado.originalName,mimeType:preparado.mimeType,size:preparado.size}}));
  return {ok:true as const,mensaje:"Comprobante adjunto. Los archivos anteriores se conservan."};
 },{timeout:30000});}catch(e){if(nuevo){try{if(!await prisma.paymentAttachment.findUnique({where:{fileKey:nuevo},select:{id:true}}))await almacenComprobantes.eliminar(nuevo);}catch{/* Ante resultado incierto conservar hasta poder verificar la referencia. */}}return fallo(e);}
}
const promesa=z.object({cuentaId:id,clave,fecha:z.string().refine(fechaCalendarioValida).nullable(),motivo:z.string().trim().min(1).max(1000),version:z.string().max(100).refine(v=>{const [ts,n]=v.split("|");return z.string().datetime().safeParse(ts).success&&/^\d+$/.test(n??"");})}).strict();
export async function cambiarPromesa(entrada:unknown):Promise<ResultadoCobro>{
 await exigirAcceso("cobranza.operar");const p=promesa.safeParse(entrada);if(!p.success)return {ok:false as const,mensaje:"Revisa la fecha, motivo y versión de la cuenta."};
 const d=p.data,fingerprint=createHash("sha256").update(JSON.stringify(d)).digest("hex");
 try{return await prisma.$transaction(async tx=>{
  await exigirAccesoEnTransaccion(tx,"cobranza.operar");await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE id=${d.cuentaId} FOR UPDATE`;
  const previo=await tx.paymentPromiseChange.findUnique({where:{id:d.clave}});if(previo){exigir(previo.fingerprint===fingerprint,"La clave de promesa ya se usó con otros datos.");return {ok:true as const,mensaje:"El cambio de promesa ya estaba registrado."};}
  const cuenta=await tx.accountReceivable.findUnique({where:{id:d.cuentaId}});exigir(cuenta&&!cuenta.voidedAt,"La cuenta no existe o está anulada.");const revisiones=await tx.paymentPromiseChange.count({where:{accountReceivableId:cuenta.id}});exigir(`${cuenta.updatedAt.toISOString()}|${revisiones}`===d.version,"La cuenta cambió. Actualiza el detalle antes de modificar la promesa.");
  exigir(!d.fecha||d.fecha>=hoyOrden(),"La nueva promesa debe ser hoy o futura según Santiago.");
  exigir((cuenta.paymentPromiseDate?.toISOString().slice(0,10)??null)!==d.fecha,"La promesa ya tiene esa fecha; no se registraron cambios.");
  const nueva=d.fecha?new Date(d.fecha+"T00:00:00Z"):null;
  await tx.accountReceivable.update({where:{id:cuenta.id},data:{paymentPromiseDate:nueva}});
  await anotarMutacion(tx,"paymentPromiseChange","create",await tx.paymentPromiseChange.create({data:{id:d.clave,accountReceivableId:cuenta.id,fingerprint,previousDate:cuenta.paymentPromiseDate,newDate:nueva,reason:d.motivo}}));
  return {ok:true as const,mensaje:"Promesa actualizada; el vencimiento contractual se conserva."};
 },{timeout:30000});}catch(e){return fallo(e);}
}
