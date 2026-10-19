import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cierreTrabajoSchema, facturaTrabajoSchema } from "@/lib/validaciones/cierre-trabajo";
import { hoyOrden } from "./ordenes-compra-cliente";
import { normalizarRut, rutValido } from "@/lib/validaciones/rut";
class ReglaCierre extends Error {}
function exigir(v:unknown,m:string):asserts v {if(!v)throw new ReglaCierre(m);}
const fecha=(v:string)=>new Date(`${v}T00:00:00Z`);
/** Días de calendario UTC: no se suman instantes de Santiago ni horas de DST. */
export function vencimientoFactura(date:string,days:number){const d=fecha(date);d.setUTCDate(d.getUTCDate()+days);return d;}
function fallo(e:unknown){
 if(e instanceof ReglaCierre)return {ok:false as const,mensaje:e.message};
 if(e instanceof Prisma.PrismaClientKnownRequestError){
  if(e.code==="P2002")return {ok:false as const,mensaje:"El folio ya está vinculado a otra OT de este emisor. Actualiza y revisa la factura."};
  const cause=(e.meta?.driverAdapterError as {cause?:{originalCode?:string;originalMessage?:string}}|undefined)?.cause;
  if(cause?.originalCode==="P0001")return {ok:false as const,mensaje:(cause.originalMessage??"No se pudo validar el cierre o factura.").split("\n")[0]};
 }
 return null;
}
async function bloquear(tx:Prisma.TransactionClient,id:number){
 // Los vínculos comerciales son inmutables. Descubrirlos no toma locks de OT antes de Quote/orden.
 const w=await tx.workOrder.findUnique({where:{id}});exigir(w?.schemaVersion===1,"La OT no está disponible o es legada y requiere conciliación.");
 if(w.salesOrderId){const s=await tx.salesOrder.findUniqueOrThrow({where:{id:w.salesOrderId}});await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${s.quoteId} FOR UPDATE`;await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id=${s.id} FOR UPDATE`;}
 await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${id} FOR UPDATE`;
 const current=await tx.workOrder.findUniqueOrThrow({where:{id}});
 if(current.salesOrderId)await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE "salesOrderId"=${current.salesOrderId} FOR UPDATE`;
 return current;
}
async function snapshot(tx:Prisma.TransactionClient,id:number){const [v]=await tx.$queryRaw<{progress:Prisma.InputJsonValue}[]>`SELECT public.snapshot_preparacion_trabajo(${id}) AS progress`;return v.progress;}
async function operacion(tx:Prisma.TransactionClient,w:{id:number;version:number},key:string,fingerprint:string,type:"FINALIZAR"|"REGISTRAR_FACTURA"|"CORREGIR_FACTURA",links:{completionId?:number;invoiceReferenceId?:number;reason?:string}){
 const prev=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:w.id,version:w.version}}});
 const [s]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${w.id}) AS plan,public.snapshot_reservas_trabajo(${w.id}) AS reservations`;
 await tx.workOrderOperation.create({data:{workOrderId:w.id,version:w.version+1,idempotencyKey:key,fingerprint,type,...links,beforeSnapshot:prev.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}});
}
export async function previsualizarCierreTrabajo(input:unknown){const p=cierreTrabajoSchema.safeParse(input);if(!p.success)return {ok:false as const,mensaje:p.error.issues[0].message};try{return await prisma.$transaction(async tx=>{
 const w=await tx.workOrder.findUnique({where:{id:p.data.workOrderId}});exigir(w?.schemaVersion===1&&w.status==="EN_PROCESO"&&w.version===p.data.version,"Actualiza la OT; el cierre requiere su versión vigente en proceso.");
 await tx.$queryRaw`SELECT public.validar_cierre_trabajo(${w.id},${fecha(p.data.date)}::date)`;
 return {ok:true as const,preview:await snapshot(tx,w.id)};
 },{isolationLevel:"RepeatableRead",timeout:30000});}catch(e){return fallo(e)??{ok:false as const,mensaje:"No se pudo consultar la preparación del cierre."};}}
export async function finalizarTrabajo(input:unknown,clave:unknown){
 const p=cierreTrabajoSchema.safeParse(input),k=z.uuid().safeParse(clave);if(!p.success||!k.success)return {ok:false as const,mensaje:!p.success?p.error.issues[0].message:"UUID inválido."};
 const d=p.data,key=k.data.toLowerCase(),fingerprint=createHash("sha256").update(JSON.stringify({type:"FINALIZAR",...d})).digest("hex");
 try{return await prisma.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
 const prev=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});if(prev){exigir(prev.type==="FINALIZAR"&&prev.workOrderId===d.workOrderId&&prev.fingerprint===fingerprint,"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:prev.workOrderId,version:prev.version};}
 exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave pertenece a otro documento.");
 const w=await bloquear(tx,d.workOrderId);exigir(w.status==="EN_PROCESO"&&w.version===d.version,"La OT cambió o ya está cerrada. Actualiza antes de finalizar.");
 // Serializar con todos los escritores de inventario, incluso cuando el cierre no escribe saldos.
 const a=await tx.stockReservationAllocation.findMany({where:{workOrderId:w.id},orderBy:{id:"asc"}});
 for(const id of [...new Set(a.flatMap(x=>x.rawMaterialId?[x.rawMaterialId]:[]))].sort((a,b)=>a-b))await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
 for(const id of [...new Set(a.flatMap(x=>x.productId?[x.productId]:[]))].sort((a,b)=>a-b))await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
 for(const id of [...new Set(a.map(x=>x.warehouseId))].sort((a,b)=>a-b))await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
 await tx.$queryRaw`SELECT public.validar_cierre_trabajo(${w.id},${fecha(d.date)}::date)`;
 const completion=await tx.workOrderCompletion.create({data:{workOrderId:w.id,date:fecha(d.date),note:d.note,preparationConfirmed:true,progressSnapshot:await snapshot(tx,w.id)}});
 await tx.workOrder.update({where:{id:w.id},data:{status:"FINALIZADO",version:{increment:1}}});
 await operacion(tx,w,key,fingerprint,"FINALIZAR",{completionId:completion.id});
 return {ok:true as const,id:w.id,version:w.version+1};
 },{maxWait:10000,timeout:60000});}catch(e){const known=fallo(e);if(known)return known;console.error("Error al finalizar OT:",e);return {ok:false as const,mensaje:"No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.",incierto:true};}
}
export async function registrarFacturaTrabajo(input:unknown,clave:unknown){
 const p=facturaTrabajoSchema.safeParse(input),k=z.uuid().safeParse(clave);if(!p.success||!k.success)return {ok:false as const,mensaje:!p.success?p.error.issues[0].message:"UUID inválido."};
 const d=p.data,key=k.data.toLowerCase(),fingerprint=createHash("sha256").update(JSON.stringify({type:"FACTURA",...d})).digest("hex");
 try{return await prisma.$transaction(async tx=>{
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
 const prev=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});if(prev){exigir(["REGISTRAR_FACTURA","CORREGIR_FACTURA"].includes(prev.type)&&prev.workOrderId===d.workOrderId&&prev.fingerprint===fingerprint,"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:prev.workOrderId,version:prev.version};}
 exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave pertenece a otro documento.");
 const w=await bloquear(tx,d.workOrderId);exigir(w.status==="FINALIZADO"&&w.salesOrderId!==null,"Sólo una OT comercial finalizada admite factura externa.");exigir(w.version===d.version,"La OT cambió. Actualiza antes de registrar la factura.");
 const s=await tx.salesOrder.findUniqueOrThrow({where:{id:w.salesOrderId}}),account=await tx.accountReceivable.findUnique({where:{salesOrderId:w.salesOrderId}});
 exigir(s.status==="CONFIRMADA"&&account&&!account.voidedAt,"La orden y su cuenta deben estar vigentes.");exigir(s.paymentTermDays!==null,"La orden no tiene plazo histórico. Requiere conciliación; no se usa el mantenedor actual.");
 exigir(d.invoiceDate<=hoyOrden(),"La fecha de factura no puede ser futura en Santiago.");
 const old=w.currentInvoiceReferenceId?await tx.workOrderInvoiceReference.findUniqueOrThrow({where:{id:w.currentInvoiceReferenceId}}):null;
 exigir(old?Boolean(d.correctionReason):!d.correctionReason,old?"Indica el motivo de corrección de factura.":"El primer registro no es una corrección.");
 const company=s.companySnapshot as {rut?:unknown}|null,rut=old?.issuerRut??(typeof company?.rut==="string"?normalizarRut(company.rut):"");exigir(rutValido(rut),"El RUT histórico del emisor está incompleto. Requiere conciliación.");
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([rut,d.invoiceNumber])},91358))`;
 let identity=await tx.workOrderInvoiceIdentity.findUnique({where:{issuerRut_invoiceNumber:{issuerRut:rut,invoiceNumber:d.invoiceNumber}}});exigir(!identity||identity.workOrderId===w.id,"Este RUT emisor y folio ya pertenecen a otra OT, incluso si la factura es de otro año.");
 if(!identity)identity=await tx.workOrderInvoiceIdentity.create({data:{workOrderId:w.id,issuerRut:rut,invoiceNumber:d.invoiceNumber}});
 const dueDate=vencimientoFactura(d.invoiceDate,s.paymentTermDays);
 exigir(Number.isFinite(dueDate.getTime())&&dueDate.getUTCFullYear()<=9999,"El vencimiento supera el rango de fechas admitido. Revisa el plazo histórico.");
 const ref=await tx.workOrderInvoiceReference.create({data:{workOrderId:w.id,identityId:identity.id,revision:(old?.revision??0)+1,issuerRut:rut,invoiceNumber:d.invoiceNumber,invoiceDate:fecha(d.invoiceDate),paymentTermDays:s.paymentTermDays,dueDate,replacesInvoiceReferenceId:old?.id??null,correctionReason:old?d.correctionReason:null}});
 await tx.workOrder.update({where:{id:w.id},data:{currentInvoiceReferenceId:ref.id,version:{increment:1}}});
 await tx.accountReceivable.update({where:{id:account.id},data:{dueDate}});
 await operacion(tx,w,key,fingerprint,old?"CORREGIR_FACTURA":"REGISTRAR_FACTURA",{invoiceReferenceId:ref.id,...(old?{reason:d.correctionReason}:{})});
 return {ok:true as const,id:w.id,version:w.version+1};
 },{maxWait:10000,timeout:30000});}catch(e){const known=fallo(e);if(known)return known;console.error("Error al registrar factura de OT:",e);return {ok:false as const,mensaje:"No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.",incierto:true};}
}
