import "dotenv/config";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { hash } from "@node-rs/argon2";
import { prisma } from "../src/lib/prisma";
import { conCredencialSeguridad, exigirAcceso } from "../src/lib/seguridad/acceso";
import { operarSeguridad, consultarSesionSeguridad } from "../src/lib/seguridad/servicio";
import { consultarAuditoria, depurarEventosSeguridad } from "../src/lib/seguridad/auditoria";
import { configurarNumeracion } from "../src/lib/servicios/numeracion";
import { guardarUnidad } from "../src/lib/servicios/unidades-medida";
import { guardarProducto } from "../src/lib/servicios/productos";
import { registrarGuiaDespacho, corregirGuiaDespacho } from "../src/lib/servicios/guias-despacho";
import { consultarTrabajo } from "../src/lib/consultas/ordenes-trabajo";
import { emitirPdfGuia } from "../src/lib/servicios/pdfs-guia";
import { emitirPdfCotizacion } from "../src/lib/servicios/pdfs-cotizacion";
import { emitirPdfTrabajo } from "../src/lib/servicios/pdfs-trabajo";
import { huellaToken } from "../src/lib/seguridad/configuracion";
import { tipoNavegador } from "../src/lib/seguridad/metadatos";
import { crearEntornoGuiasG6, ok, uuid } from "./fixtures/guias-despacho";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s5_\d{8}$/.test(u.pathname),"Sólo copia S5 local descartable");
async function main(){
 const password=`Privada S5 ${uuid()}`,secreto=`NO_REGISTRAR_${uuid()}`,passwordHash=await hash(password,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1});
 const actores:{id:number;email:string;token:string;role:string}[]=[];
 for(const role of ['ADMINISTRADOR','ADMINISTRADOR','VENTAS','CONSULTA_GERENCIA'] as const){const email=`s5-${uuid()}@ejemplo.invalid`,r=await prisma.role.upsert({where:{name:role},update:{},create:{name:role}}),user=await prisma.user.create({data:{name:`Prueba S5 ${role}`,email,password:'!INUTILIZABLE',roleId:r.id}});await prisma.userSecurity.create({data:{userId:user.id,normalizedEmail:email,status:'ACTIVO',passwordHash,passwordChangedAt:new Date()}});await prisma.userSecurityRole.create({data:{userId:user.id,role}});const login=await operarSeguridad({ip:'192.0.2.99',browser:`Chrome/123 ${secreto}`},{action:'login',email,password});assert(login.client.ok&&login.sessionToken);actores.push({id:user.id,email,token:login.sessionToken,role});}
 const [admin,otro,ventas,consulta]=actores;
 for(const a of [ventas,consulta]){await assert.rejects(()=>conCredencialSeguridad(a.token,()=>consultarAuditoria({})),/NEXT_REDIRECT/);await assert.rejects(()=>conCredencialSeguridad(a.token,()=>depurarEventosSeguridad()),/NEXT_REDIRECT/);}
 const denied=await prisma.securityAuditEvent.count({where:{actorUserId:ventas.id,action:'ACCESO_DENEGADO'}});assert.equal(denied,1,'Denegaciones repetidas limitadas sin secretos');
 const antiguo=await prisma.salesOrder.findFirstOrThrow({where:{folioId:{not:null}}});assert.equal(await prisma.securityOperationAuthor.count({where:{resourceType:'SalesOrder',resourceId:String(antiguo.id)}}),0);
 await conCredencialSeguridad(admin.token,async()=>{
  const unidad=await guardarUnidad({name:`Unidad S5 ${uuid()}`,abbreviation:'s5',actorUserId:otro.id});assert(unidad.ok&&unidad.unidad);
  const autor=await prisma.securityOperationAuthor.findFirstOrThrow({where:{resourceType:'UnitMeasure',resourceId:String(unidad.unidad.id)}});assert.equal(autor.actorUserId,admin.id,'Actor del formulario ignorado');
  // Fallo inducido de autoría: el hecho no se confirma sin ella.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION public.s5_fallo_autoria() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo inducido S5'; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER s5_fallo_autoria BEFORE INSERT ON "SecurityOperationAuthor" FOR EACH ROW EXECUTE FUNCTION public.s5_fallo_autoria()`);
  const name=`Rollback S5 ${uuid()}`,antes=await prisma.securityOperationAuthor.count();try{const r=await guardarUnidad({name,abbreviation:'rb'});assert(!r.ok);assert.equal(await prisma.unitMeasure.count({where:{name}}),0);assert.equal(await prisma.securityOperationAuthor.count(),antes);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER s5_fallo_autoria ON "SecurityOperationAuthor"');await prisma.$executeRawUnsafe('DROP FUNCTION public.s5_fallo_autoria()');}
  const producto={name:`Idempotencia S5 ${uuid()}`,description:'',unitMeasureId:unidad.unidad.id,suggestedPrice:'100',recipes:[],images:[]},key=uuid();
  const first=await guardarProducto(producto,undefined,[],key);assert(first.ok&&first.producto);
  const n=await prisma.securityOperationAuthor.count();const second=await conCredencialSeguridad(otro.token,()=>guardarProducto(producto,undefined,[],key));assert(second.ok);assert.equal(await prisma.securityOperationAuthor.count(),n);assert.equal((await prisma.securityOperationAuthor.findUniqueOrThrow({where:{resourceType_operationKey:{resourceType:'Product',operationKey:key}}})).actorUserId,admin.id);
  const numeracion=await prisma.documentNumbering.findUniqueOrThrow({where:{type:'COTIZACION'}}),numAntes=await prisma.securityOperationAuthor.count({where:{resourceType:'DocumentNumbering',resourceId:String(numeracion.id)}});
  assert((await configurarNumeracion({id:numeracion.id,version:numeracion.version,prefix:numeracion.prefix,padding:numeracion.padding??5,nextNumber:(numeracion.nextNumber??BigInt(1)).toString()})).ok);
  assert.equal((await prisma.securityOperationAuthor.findFirstOrThrow({where:{resourceType:'DocumentNumbering',resourceId:String(numeracion.id)},orderBy:{id:'desc'}})).action,'MODIFICAR');
  // Ciclo comercial y productivo con los cuatro modos y efectos de inventario.
  const e=await crearEntornoGuiasG6();let w=await e.crear(['PRODUCTO','MATERIA_PRIMA','SERVICIO','A_MEDIDA']);w=await e.producir(w);
  const datos=e.salida(w,'1'),gkey=uuid(),guia=ok(await registrarGuiaDespacho(datos,gkey));
  const count=await prisma.securityOperationAuthor.count();const replay=await conCredencialSeguridad(otro.token,()=>registrarGuiaDespacho(datos,gkey));assert(replay.ok);assert.equal(await prisma.securityOperationAuthor.count(),count);
  const lines=await prisma.deliveryNoteLine.findMany({where:{deliveryNoteId:guia.id}});w=await consultarTrabajo(w.id);
  const correccion=ok(await corregirGuiaDespacho({deliveryNoteId:guia.id,version:w.version,date:datos.date,reason:'Devolución de validación S5',physicalRestitutionConfirmed:true,lines:lines.map(l=>({deliveryNoteLineId:l.id,quantity:'0.500'}))},uuid()));
  for(const id of [guia.id,correccion.id])assert.equal((await prisma.securityOperationAuthor.findFirstOrThrow({where:{resourceType:'DeliveryNote',resourceId:String(id)}})).actorUserId,admin.id);
  await e.invariantes();assert.equal(await prisma.securityOperationAuthor.count({where:{resourceType:"DocumentNumbering",resourceId:String(numeracion.id)}}),numAntes+1,"Los folios automáticos no se atribuyen como cambios manuales");
  const occ=await prisma.salesOrder.findUniqueOrThrow({where:{id:w.plan!.salesOrderId!}}),q=await prisma.quote.findUniqueOrThrow({where:{id:occ.quoteId}});w=await consultarTrabajo(w.id);
  const pdfs=[['QuotePdfEmission',ok(await emitirPdfCotizacion({id:q.id,version:q.version},uuid()))],['WorkOrderPdfEmission',ok(await emitirPdfTrabajo({id:w.id,version:w.version},uuid()))],['DeliveryNotePdfEmission',ok(await emitirPdfGuia({id:guia.id},uuid()))]] as const;
  for(const [tipo,pdf]of pdfs)assert.equal((await prisma.securityOperationAuthor.findFirstOrThrow({where:{resourceType:tipo,resourceId:String(pdf.id)}})).actorUserId,admin.id);
  for(const tipo of ['Quote','SalesOrder','WorkOrder','ProductionRecord','InventoryAdjustment','ProductInitialStock'])assert(await prisma.securityOperationAuthor.count({where:{resourceType:tipo,actorUserId:admin.id}}),tipo);
  assert.equal(await prisma.securityOperationAuthor.count({where:{resourceType:'SalesOrder',resourceId:String(antiguo.id)}}),0,'No se inventa autoría histórica');
  const historico=await consultarAuditoria({vista:'autoria',tipo:'SalesOrder',recurso:String(antiguo.id)});assert.equal(historico.total,0);
  const [corte]=await prisma.$queryRaw<{viejo:Date;reciente:Date}[]>`SELECT CURRENT_TIMESTAMP-interval '13 months' AS viejo,CURRENT_TIMESTAMP-interval '11 months' AS reciente`;
  const old=await prisma.securityAuditEvent.create({data:{action:'PRUEBA_RETENCION_ANTIGUA',result:'CORRECTO',createdAt:corte.viejo}}),recent=await prisma.securityAuditEvent.create({data:{action:'PRUEBA_RETENCION_RECIENTE',result:'CORRECTO',createdAt:corte.reciente}});
  const dryrun=spawnSync(process.execPath,['--import','tsx','scripts/depurar-auditoria.ts'],{env:process.env,encoding:'utf8'});assert.equal(dryrun.status,0);assert(dryrun.stdout.includes('Simulación:'));assert(await prisma.securityAuditEvent.findUnique({where:{id:old.id}}));
  const permanente=await prisma.securityOperationAuthor.create({data:{actorUserId:admin.id,operationKey:uuid(),resourceType:'PruebaRetencion',resourceId:uuid(),action:'PRUEBA',createdAt:corte.viejo}});
  await assert.rejects(()=>prisma.securityAuditEvent.delete({where:{id:recent.id}}));await assert.rejects(()=>prisma.securityOperationAuthor.delete({where:{id:permanente.id}}));
  await prisma.securitySession.update({where:{tokenHash:huellaToken(admin.token)},data:{authenticatedAt:new Date(Date.now()-600000),reauthenticatedAt:new Date(Date.now()-360001),expiresAt:new Date(Date.now()+7*3600000)}});
  await assert.rejects(depurarEventosSeguridad,/Confirma tu identidad/);assert(await prisma.securityAuditEvent.findUnique({where:{id:old.id}}));
  assert((await operarSeguridad({session:admin.token},{action:'reauth',password})).client.ok);
  assert(await depurarEventosSeguridad()>=1);assert.equal(await prisma.securityAuditEvent.findUnique({where:{id:old.id}}),null);assert(await prisma.securityAuditEvent.findUnique({where:{id:recent.id}}));assert(await prisma.securityOperationAuthor.findUnique({where:{id:permanente.id}}));
  await prisma.securityAuditEvent.create({data:{action:'PRUEBA_RETENCION_CLI',result:'CORRECTO',createdAt:corte.viejo}});
  const cli=spawnSync(process.execPath,['--import','tsx','scripts/depurar-auditoria.ts','--aplicar'],{env:process.env,encoding:'utf8'});assert.equal(cli.status,0);assert(cli.stdout.includes('Depuración completada:'));assert.equal(await prisma.securityAuditEvent.count({where:{action:'PRUEBA_RETENCION_CLI'}}),0);assert(await prisma.securityOperationAuthor.findUnique({where:{id:permanente.id}}));
  const events=await consultarAuditoria({vista:'eventos'});assert(events.total>0&&events.filas.length<=25);const authors=await consultarAuditoria({vista:'autoria'});assert(authors.total>0&&authors.filas.length<=25);
 });
 const token=otro.token,now=Date.now();await prisma.securitySession.update({where:{tokenHash:huellaToken(token)},data:{authenticatedAt:new Date(now-7200000),reauthenticatedAt:new Date(now-7200000),lastActivityAt:new Date(now-3600001),expiresAt:new Date(now+3600000)}});
 assert.equal(await consultarSesionSeguridad(token,true,{browser:`Firefox/123 ${secreto}`}),null);assert.equal(await consultarSesionSeguridad(token),null);assert.equal(await prisma.securityAuditEvent.count({where:{targetUserId:otro.id,action:'SESION_EXPIRADA'}}),1);
 await assert.rejects(()=>conCredencialSeguridad(token,()=>exigirAcceso()),/NEXT_REDIRECT/);
 const events=JSON.stringify(await prisma.securityAuditEvent.findMany(),(_k,v)=>typeof v==='bigint'?String(v):v);for(const x of [password,secreto,...actores.map(a=>a.token)])assert(!events.includes(x),'Auditoría sin secretos');assert.equal(tipoNavegador(`Chrome/ ${secreto}`),'Chrome');
 await writeFile('/tmp/s5-actores.json',JSON.stringify({password,actores,antiguo:antiguo.id}),{mode:0o600});console.log('S5 integración: autor de servidor, rollback, reintento con otro actor, ciclo de cuatro modos, devolución, PDF, stock/Kardex, historia anterior, retención, reautenticación, expiración única y ausencia de secretos correctos.');
}
main().finally(()=>prisma.$disconnect());
