import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { guardarPlanTrabajo, iniciarTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "../src/lib/consultas/ordenes-trabajo";
import { completarReservasTrabajo, liberarReservaTrabajo } from "../src/lib/servicios/reservas-stock";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { PlanTrabajo } from "../src/lib/validaciones/orden-trabajo";
const url=new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(url.hostname)&&url.pathname.startsWith("/mtx_validacion_inicio_"));
const key=()=>randomUUID();
const hoy=hoyOrden();
const desplazar=(s:string,d:number)=>{const v=new Date(s+"T00:00:00Z");v.setUTCDate(v.getUTCDate()+d);return v.toISOString().slice(0,10);};
async function fisico(){return JSON.stringify([await prisma.warehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.stockMovement.findMany({orderBy:{id:"asc"}}),await prisma.productWarehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.productStockMovement.findMany({orderBy:{id:"asc"}})]);}
async function main(){
 const numbering=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});
 if(numbering.nextNumber===null)await prisma.documentNumbering.update({where:{id:numbering.id},data:{prefix:"OT-INICIO-",padding:5,nextNumber:1,version:{increment:1}}});
 const u=await prisma.unitMeasure.create({data:{name:`Unidad inicio ${key()}`,abbreviation:"un"}});
 const m=await prisma.rawMaterial.create({data:{code:`IN-${key()}`,name:"Material de inicio",unitMeasureId:u.id}});
 const b=await prisma.warehouse.create({data:{name:"Bodega de inicio",classification:"MATERIA_PRIMA"}});
 const ref=await consultarSaldoAjuste({rawMaterialId:m.id,unitMeasureId:u.id,warehouseId:b.id});assert(ref.ok);
 assert((await registrarAjusteInventario({rawMaterialId:m.id,unitMeasureId:u.id,warehouseId:b.id,finalQuantity:"2",reason:"INVENTARIO_INICIAL",date:hoy,note:"Prueba de inicio sin consumos",correctedAdjustmentId:null,idempotencyKey:key(),reference:ref.referencia})).ok);
 const base:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:desplazar(hoy,-1),productName:"Inicio de obra propia",ownPurpose:"Prueba de preparación sin consumos",internalInstructions:"",targetDate:null,confirmPlan:false,reason:"",lines:[{id:null,sourceDetailId:null,kind:"SERVICIO",executionMode:"A_MEDIDA",productId:null,rawMaterialId:null,unitMeasureId:u.id,description:"Trabajo interno",quantity:"1",quantityToProduce:"0",productVersion:null,refreshRecipe:false,materials:[{rawMaterialId:m.id,warehouseId:b.id,quantity:"6"}],supplies:[],roundingReviews:[]}]};
 async function crear(plan=base){const r=await guardarPlanTrabajo(plan,key());assert(r.ok,JSON.stringify(r));return consultarTrabajo(r.id);}
 let w=await crear();
 const inicio={workOrderId:w.id,version:w.version,startedDate:hoy};
 assert(!(await iniciarTrabajo(inicio,key())).ok);
 await assert.rejects(prisma.workOrder.update({where:{id:w.id},data:{version:{increment:1},status:"EN_PROCESO",startedDate:new Date(hoy+"T00:00:00Z")}}),/plan confirmado/);
 const saved=await guardarPlanTrabajo({...w.plan!,confirmPlan:true,reason:"Plan listo para iniciar"},key());assert(saved.ok);w=await consultarTrabajo(w.id);
 assert.equal(w.reservas[0].active,"2.000");
 const before=await fisico(),resBefore=JSON.stringify(w.reservas),folios=await prisma.documentFolio.count(),cuentas=JSON.stringify(await prisma.accountReceivable.findMany({orderBy:{id:"asc"}}));
 for(const startedDate of [desplazar(base.date,-1),desplazar(hoy,1),"2026-02-30"]){assert(!(await iniciarTrabajo({workOrderId:w.id,version:w.version,startedDate},key())).ok);}
 for(const startedDate of [desplazar(base.date,-1),desplazar(hoy,1)])await assert.rejects(prisma.workOrder.update({where:{id:w.id},data:{version:{increment:1},status:"EN_PROCESO",startedDate:new Date(startedDate+"T00:00:00Z")}}),/Fecha de inicio/);
 await assert.rejects(prisma.workOrder.update({where:{id:w.id},data:{version:{increment:1},status:"EN_PROCESO",startedDate:new Date(hoy+"T00:00:00Z")}}),/operación correspondiente/);
 async function inicioSQL(type:"INICIAR"|"RESERVAR_STOCK",cambiarPlan=false){return prisma.$transaction(async tx=>{
  const old=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:w.id,version:w.version}}});
  if(cambiarPlan){const line=await tx.workOrderLine.findFirstOrThrow({where:{workOrderId:w.id}});await tx.workOrderLine.update({where:{id:line.id},data:{quantity:"2",version:{increment:1}}});}
  await tx.workOrder.update({where:{id:w.id},data:{version:{increment:1},status:"EN_PROCESO",startedDate:new Date(hoy+"T00:00:00Z")}});
  const [s]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${w.id}) AS plan,public.snapshot_reservas_trabajo(${w.id}) AS reservations`;
  await tx.workOrderOperation.create({data:{workOrderId:w.id,version:w.version+1,type,idempotencyKey:key(),fingerprint:"c".repeat(64),beforeSnapshot:old.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}});
 });}
 await assert.rejects(inicioSQL("RESERVAR_STOCK"),/reserva no puede modificar/);
 await assert.rejects(inicioSQL("INICIAR",true),/sin cambiar plan ni reservas/);
 assert(!(await iniciarTrabajo({workOrderId:w.id,version:w.version-1,startedDate:hoy},key())).ok);
 const startKey=key();
 await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallar_inicio_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type::text='INICIAR' THEN RAISE EXCEPTION 'fallo deliberado inicio'; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe('CREATE TRIGGER fallo_inicio_prueba BEFORE INSERT ON "WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.fallar_inicio_prueba()');
 try{const fail=await iniciarTrabajo({workOrderId:w.id,version:w.version,startedDate:base.date},startKey);assert(!fail.ok&&fail.incierto);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER fallo_inicio_prueba ON "WorkOrderOperation"');await prisma.$executeRawUnsafe('DROP FUNCTION public.fallar_inicio_prueba()');}
 let actual=await consultarTrabajo(w.id);assert.equal(actual.status,"PENDIENTE");assert.equal(actual.startedDate,null);assert.equal(actual.version,w.version);assert.equal(await fisico(),before);assert.equal(JSON.stringify(actual.reservas),resBefore);
 const request={workOrderId:w.id,version:w.version,startedDate:base.date};
 const race=await Promise.all([iniciarTrabajo(request,startKey),iniciarTrabajo(request,startKey.toUpperCase())]);assert(race.every(r=>r.ok),JSON.stringify(race));
 actual=await consultarTrabajo(w.id);assert.equal(actual.status,"EN_PROCESO");assert.equal(actual.startedDate,base.date);assert.equal(actual.version,w.version+1);assert.equal(JSON.stringify(actual.reservas),resBefore);assert.equal(await fisico(),before);assert.equal(await prisma.documentFolio.count(),folios);
 assert.equal(actual.operations.filter(o=>o.type==="INICIAR").length,1);
 assert(!(await iniciarTrabajo({...request,startedDate:hoy},startKey)).ok);
 assert(!(await iniciarTrabajo(request,key())).ok);
 assert(!(await guardarPlanTrabajo({...actual.plan!,reason:"Intentar editar después del inicio"},key())).ok);
 await assert.rejects(prisma.workOrder.update({where:{id:w.id},data:{version:{increment:1},startedDate:new Date(hoy+"T00:00:00Z")}}),/fecha de inicio quedan fijos/);
 await assert.rejects(prisma.workOrder.update({where:{id:w.id},data:{version:{increment:1},status:"PENDIENTE"}}),/Transición no habilitada/);
 await assert.rejects(prisma.workOrderLine.update({where:{id:actual.plan!.lines[0].id!},data:{quantity:"2",version:{increment:1}}}),/Plan requiere trabajo nuevo pendiente/);
 // Completar/liberar sigue disponible en proceso sin editar ni consumir el plan.
 const r=await completarReservasTrabajo({workOrderId:w.id,version:actual.version,idempotencyKey:key()});assert.equal(r.version,actual.version+1);
 actual=await consultarTrabajo(w.id);
 await liberarReservaTrabajo({workOrderId:w.id,version:actual.version,allocationId:actual.reservas[0].id,quantity:"0,500",reason:"Liberar cobertura en proceso con historial",idempotencyKey:key()});
 actual=await consultarTrabajo(w.id);assert.equal(actual.reservas[0].active,"1.500");
 await completarReservasTrabajo({workOrderId:w.id,version:actual.version,idempotencyKey:key()});actual=await consultarTrabajo(w.id);assert.equal(actual.reservas.reduce((s,r)=>s.plus(r.active),new Prisma.Decimal(0)).toFixed(3),"2.000");
 assert((await iniciarTrabajo(request,startKey)).ok);assert.equal(await fisico(),before);
 assert.equal(JSON.stringify(await prisma.accountReceivable.findMany({orderBy:{id:"asc"}})),cuentas);
 // Distintos UUID/versión compiten: exactamente un inicio, sin duplicar historia.
 const competir=await crear({...base,productName:"Competencia de inicio",confirmPlan:true,lines:base.lines.map(l=>({...l,materials:[]}))});
 const competencia=await Promise.all([iniciarTrabajo({workOrderId:competir.id,version:competir.version,startedDate:hoy},key()),iniciarTrabajo({workOrderId:competir.id,version:competir.version,startedDate:hoy},key())]);assert.equal(competencia.filter(r=>r.ok).length,1);
 // Comercial de servicio: no exige insumos ni crea deuda/folio nuevos al iniciar.
 const q=await prisma.quote.findFirstOrThrow();
 const oferta=await guardarCotizacion({date:hoy,validUntil:null,clientId:q.clientId,clientBranchId:q.clientBranchId,paymentConditionId:q.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:[{kind:"SERVICIO",rawMaterialId:null,productId:null,unitMeasureId:u.id,description:"Servicio de prueba de inicio",quantity:"1",unitPrice:"100"}]},key());assert(oferta.ok);
 const detalle=await prisma.quoteDetail.findFirstOrThrow({where:{quoteId:oferta.id}});
 const orden=await registrarOrdenCompraCliente({quoteId:oferta.id,quoteVersion:oferta.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:[{quoteDetailId:detalle.id,quantity:"1"}]},key());assert(orden.ok);
 const comercial=await prepararTrabajoComercial(orden.id);const cr=await guardarPlanTrabajo({...comercial.plan,confirmPlan:true},key());assert(cr.ok);
 const account=JSON.stringify(await prisma.accountReceivable.findUniqueOrThrow({where:{salesOrderId:orden.id}}));
 assert((await iniciarTrabajo({workOrderId:cr.id,version:cr.version,startedDate:hoy},key())).ok);
 assert.equal(JSON.stringify(await prisma.accountReceivable.findUniqueOrThrow({where:{salesOrderId:orden.id}})),account);
 // Fixture pendiente para comprobación de interfaz, fecha manual y reservas parciales.
 const ui=await crear({...base,productName:"OT para validar inicio desde interfaz",confirmPlan:true});
 console.log(JSON.stringify({ok:true,uiWorkId:ui.id,message:"Inicio: confirmación/fechas, SQL directo, carreras, UUID, rollback, plan fijo, reservas en proceso, servicio comercial y físico/cuentas conservados."}));
}
main().finally(()=>prisma.$disconnect());
