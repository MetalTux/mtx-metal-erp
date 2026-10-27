import { recursosAutoria } from "@/config/recursos-autoria";
import { inicioDiaChile, finExclusivoDiaChile } from "@/lib/fechas-chile";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAcceso, exigirAccesoEnTransaccion, credencialServidor, metadatosPeticion } from "./acceso";
import { exigirReautenticacionEnTransaccion } from "./servicio";
import { tipoNavegador } from "./metadatos";

const filtros = z.object({vista:z.enum(["eventos","autoria"]).default("eventos"),pagina:z.coerce.number().int().positive().max(1000000).default(1),tipo:z.string().trim().max(80).default(""),recurso:z.string().trim().max(100).default(""),accion:z.string().trim().max(100).default(""),resultado:z.enum(["TODOS","CORRECTO","RECHAZADO","ERROR"]).default("TODOS"),desde:z.iso.date().optional(),hasta:z.iso.date().optional()}).refine(v=>!v.desde||!v.hasta||v.desde<=v.hasta);
export async function consultarAuditoria(entrada:unknown){
 await exigirAcceso("auditoria.leer");
 const raw = entrada && typeof entrada === "object" ? {...entrada} as Record<string,unknown> : {};
 if(raw.desde==="")delete raw.desde;if(raw.hasta==="")delete raw.hasta;
 const parsed=filtros.safeParse(raw),f=parsed.success?parsed.data:filtros.parse({});
 const createdAt=f.desde||f.hasta?{...(f.desde?{gte:inicioDiaChile(f.desde)}:{ }),...(f.hasta?{lt:finExclusivoDiaChile(f.hasta)}:{})}:undefined;
 return prisma.$transaction(async tx=>{
  if(f.vista==="autoria"){
   const where={...(f.tipo?{resourceType:f.tipo}:{}),...(f.recurso?{resourceId:f.recurso}:{}),...(f.accion?{action:f.accion}:{}),createdAt};
   const total=await tx.securityOperationAuthor.count({where}),paginas=Math.max(1,Math.ceil(total/25)),pagina=Math.min(f.pagina,paginas);
   const filas=await tx.securityOperationAuthor.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(pagina-1)*25,take:25,select:{id:true,actorUserId:true,resourceType:true,resourceId:true,action:true,createdAt:true}});
   const usuarios=await tx.user.findMany({where:{id:{in:filas.map(v=>v.actorUserId)}},select:{id:true,name:true}});
   return {filtros:{...f,pagina},total,paginas,filas:filas.map(v=>({id:String(v.id),fecha:v.createdAt.toISOString(),actor:`${usuarios.find(u=>u.id===v.actorUserId)?.name??"Usuario"} (#${v.actorUserId})`,afectado:"—",accion:v.action,resultado:"CORRECTO",ip:null as string|null,navegador:null as string|null,referencia:`${recursosAutoria[v.resourceType]??v.resourceType} #${v.resourceId}`}))};
  }
  const where={...(f.accion?{action:f.accion}:{}),...(f.resultado!=="TODOS"?{result:f.resultado}:{}),createdAt};
  const total=await tx.securityAuditEvent.count({where}),paginas=Math.max(1,Math.ceil(total/25)),pagina=Math.min(f.pagina,paginas);
  const filas=await tx.securityAuditEvent.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(pagina-1)*25,take:25,select:{id:true,actorUserId:true,targetUserId:true,action:true,result:true,ipAddress:true,browserType:true,reference:true,createdAt:true}});
  const usuarios=await tx.user.findMany({where:{id:{in:filas.flatMap(v=>[v.actorUserId,v.targetUserId].filter((n):n is number=>n!==null))}},select:{id:true,name:true}});
  const nombre=(id:number|null)=>id===null?"No identificado":`${usuarios.find(u=>u.id===id)?.name??"Usuario"} (#${id})`;
  return {filtros:{...f,pagina},total,paginas,filas:filas.map(v=>({id:String(v.id),fecha:v.createdAt.toISOString(),actor:v.actorUserId===null&&["EVENTOS_DEPURADOS","ACCESOS_REVOCADOS_RESTAURACION"].includes(v.action)?"Proceso del sistema":nombre(v.actorUserId),afectado:nombre(v.targetUserId),accion:v.action,resultado:v.result,ip:v.ipAddress,navegador:v.browserType,referencia:v.reference??"—"}))};
 },{isolationLevel:"RepeatableRead"});
}

/** La fecha de corte la decide PostgreSQL, igual que el trigger de conservación S1. */
export async function depurarEventosSeguridad(){
 await exigirAcceso("auditoria.leer");
 const token=await credencialServidor(),meta=await metadatosPeticion();
 return prisma.$transaction(async tx=>{
  const actor=await exigirAccesoEnTransaccion(tx,"auditoria.leer");
  await exigirReautenticacionEnTransaccion(tx,token);
  const cantidad=await tx.$executeRaw`DELETE FROM "SecurityAuditEvent" WHERE "createdAt" <= CURRENT_TIMESTAMP - interval '12 months'`;
  await tx.securityAuditEvent.create({data:{actorUserId:actor.id,action:"EVENTOS_DEPURADOS",result:"CORRECTO",reference:`Eventos retirados: ${cantidad}`,ipAddress:meta.ip,browserType:tipoNavegador(meta.browser)}});
  return cantidad;
 });
}

/** Sólo proceso local/planificador del servidor; no existe acción HTTP para este acceso. */
export async function depurarEventosSistema(aplicar=false){
 if(!aplicar){const [r]=await prisma.$queryRaw<{cantidad:bigint}[]>`SELECT count(*) AS cantidad FROM "SecurityAuditEvent" WHERE "createdAt" <= CURRENT_TIMESTAMP - interval '12 months'`;return Number(r.cantidad);}
 return prisma.$transaction(async tx=>{
  const cantidad=await tx.$executeRaw`DELETE FROM "SecurityAuditEvent" WHERE "createdAt" <= CURRENT_TIMESTAMP - interval '12 months'`;
  await tx.securityAuditEvent.create({data:{action:"EVENTOS_DEPURADOS",result:"CORRECTO",reference:`Proceso del sistema. Eventos retirados: ${cantidad}`}});
  return cantidad;
 });
}
