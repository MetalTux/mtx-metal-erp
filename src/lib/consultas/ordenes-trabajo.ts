import type { NecesidadesProduccion } from "@/lib/servicios/produccion";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import type { PlanTrabajo } from "@/lib/validaciones/orden-trabajo";
import { hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion, validarTextoCotizacion } from "@/lib/validaciones/texto-cotizacion";
const filtros = z.object({ q:z.string().trim().max(150).default(""), estado:z.enum(["TODOS","PENDIENTE","EN_PROCESO","FINALIZADO","ANULADO"]).default("TODOS"),
  origen:z.enum(["TODOS","COMERCIAL","PROPIA"]).default("TODOS"),pagina:z.coerce.number().int().positive().max(1000000).default(1),orden:z.enum(["fecha","titulo"]).default("fecha"),sentido:z.enum(["asc","desc"]).default("desc"),
  desde:z.string().default("").refine(v=>!v||fechaCalendarioValida(v)),hasta:z.string().default("").refine(v=>!v||fechaCalendarioValida(v)) }).refine(v=>!v.desde||!v.hasta||v.desde<=v.hasta);
export async function listarTrabajos(input:unknown){
  const p=filtros.safeParse(input),f=p.success?p.data:filtros.parse({});
  const where:Prisma.WorkOrderWhereInput={...(f.estado!=="TODOS"?{status:f.estado}:{}),...(f.origen==="PROPIA"?{salesOrderId:null}:f.origen==="COMERCIAL"?{salesOrderId:{not:null}}:{}),
    ...(f.desde||f.hasta?{date:{...(f.desde?{gte:new Date(`${f.desde}T00:00:00Z`)}:{}),...(f.hasta?{lte:new Date(`${f.hasta}T00:00:00Z`)}:{})}}:{}),
    ...(f.q?{OR:[{productName:{contains:f.q,mode:"insensitive"}},{folio:{folio:{contains:f.q,mode:"insensitive"}}},{salesOrder:{clientName:{contains:f.q,mode:"insensitive"}}}]}:{})};
  return prisma.$transaction(async tx=>{
    const total=await tx.workOrder.count({where}),paginas=Math.max(1,Math.ceil(total/10)),pagina=Math.min(f.pagina,paginas);
    const ws=await tx.workOrder.findMany({where,orderBy:[{[f.orden==="titulo"?"productName":"date"]:f.sentido},{id:"desc"}],take:10,skip:(pagina-1)*10});
    const folios=await tx.documentFolio.findMany({where:{id:{in:ws.flatMap(w=>w.folioId?[w.folioId]:[])}}});
    const sales=await tx.salesOrder.findMany({where:{id:{in:ws.flatMap(w=>w.salesOrderId?[w.salesOrderId]:[])}}});
    const lineas=await tx.workOrderLine.groupBy({by:["workOrderId"],where:{workOrderId:{in:ws.map(w=>w.id)}},_count:{_all:true}});
    return {filtros:{...f,pagina},total,paginas,filas:ws.map(w=>({id:w.id,version:w.version,folio:folios.find(f=>f.id===w.folioId)?.folio??`Histórica #${w.id}`,date:w.date?.toISOString().slice(0,10)??null,
      productName:w.productName,status:w.status,propia:w.salesOrderId===null,clientName:sales.find(s=>s.id===w.salesOrderId)?.clientName??null,legada:w.schemaVersion===null,
      lineas:lineas.find(l=>l.workOrderId===w.id)?._count._all??0}))};
  },{isolationLevel:"RepeatableRead"});
}
export async function catalogosTrabajo(){
  return prisma.$transaction(async tx=>{
    const units=await tx.unitMeasure.findMany({orderBy:{name:"asc"}}),raws=await tx.rawMaterial.findMany({orderBy:{name:"asc"}}),products=await tx.product.findMany({where:{deletedAt:null},orderBy:{name:"asc"}});
    const recipes=await tx.productRecipe.findMany({where:{productId:{in:products.map(p=>p.id)}},orderBy:{rawMaterialId:"asc"}});
    const warehouses=await tx.warehouse.findMany({where:{classification:{not:null}},orderBy:{name:"asc"}});
    const sales=await tx.salesOrder.findMany({where:{status:"CONFIRMADA",folioId:{not:null},workOrder:null},orderBy:{id:"desc"}});
    const folios=await tx.documentFolio.findMany({where:{id:{in:sales.flatMap(s=>s.folioId?[s.folioId]:[])}}});
    const stock=await tx.$queryRaw<{rawMaterialId:number|null;productId:number|null;warehouseId:number;quantity:string;reserved:string}[]>`
      SELECT "rawMaterialId",NULL::integer AS "productId","warehouseId",quantity::text,public.reserva_activa_recurso("rawMaterialId",NULL,"warehouseId")::text AS reserved FROM "WarehouseStock"
      UNION ALL SELECT NULL::integer,"productId","warehouseId",quantity::text,public.reserva_activa_recurso(NULL,"productId","warehouseId")::text FROM "ProductWarehouseStock"`;
    return {units:units.map(u=>({id:u.id,name:u.name,abbreviation:u.abbreviation})),raws:raws.map(m=>({id:m.id,code:m.code,name:m.name,unitMeasureId:m.unitMeasureId,unitName:units.find(u=>u.id===m.unitMeasureId)!.name})),
      products:products.map(p=>({id:p.id,code:p.code,name:p.name,unitMeasureId:p.unitMeasureId,version:p.version,
        recipe:recipes.filter(r=>r.productId===p.id).map(r=>({rawMaterialId:r.rawMaterialId,unitMeasureId:raws.find(m=>m.id===r.rawMaterialId)!.unitMeasureId,quantityPerUnit:r.quantity.toFixed(3)}))})),
      warehouses:warehouses.map(w=>({id:w.id,name:w.name,classification:w.classification!})),sales:sales.map(s=>({id:s.id,version:s.version,etiqueta:`${folios.find(f=>f.id===s.folioId)!.folio} · ${s.clientName}`})),
      stock:stock.map(s=>({...s,free:new Prisma.Decimal(s.quantity).minus(s.reserved).toFixed(3)}))};
  },{isolationLevel:"RepeatableRead"});
}
function revision(v:Prisma.JsonValue|null):PlanTrabajo["lines"][number]["roundingReviews"] {
  if(!v||typeof v!=="object"||Array.isArray(v))return [];
  return Object.entries(v).flatMap(([id,r])=>r&&typeof r==="object"&&!Array.isArray(r)&&typeof r.quantity==="string"&&typeof r.reason==="string"?[{rawMaterialId:Number(id),quantity:r.quantity,reason:r.reason}]:[]);
}
export async function consultarTrabajo(id:number){
  if(!Number.isSafeInteger(id)||id<=0)throw new Error("Referencia inválida.");
  return prisma.$transaction(async tx=>{
    const w=await tx.workOrder.findUniqueOrThrow({where:{id}}),folio=w.folioId?await tx.documentFolio.findUniqueOrThrow({where:{id:w.folioId}}):null;
    const lines=await tx.workOrderLine.findMany({where:{workOrderId:id},orderBy:{position:"asc"}});
    const materials=await tx.workOrderDetail.findMany({where:{workOrderId:id},orderBy:{id:"asc"}});
    const recipe=await tx.workOrderRecipeMaterial.findMany({where:{workOrderLineId:{in:lines.map(l=>l.id)}}});
    const supplies=await tx.workOrderSupplyPlan.findMany({where:{workOrderId:id}});
    const operations=await tx.workOrderOperation.findMany({where:{workOrderId:id},orderBy:{version:"desc"},select:{version:true,type:true,createdAt:true,planConfirmed:true,reason:true}});
    const ultima=operations.find(o=>o.type==="CREAR"||o.type==="EDITAR_PLAN");
    const source=w.salesOrderId?await tx.salesOrder.findUniqueOrThrow({where:{id:w.salesOrderId}}):null;
    const sf=source?.folioId?await tx.documentFolio.findUniqueOrThrow({where:{id:source.folioId}}):null;
    const reservas=await tx.$queryRaw<{id:number;workOrderLineId:number;purpose:string;warehouseId:number;rawMaterialId:number|null;productId:number|null;quantity:string;active:string;resourceName:string;unitAbbreviation:string;plannedDetailId:number|null;supplyPlanId:number|null;productionOutputId:number|null}[]>`
      SELECT id,"workOrderLineId",purpose::text,"warehouseId","rawMaterialId","productId",quantity::text,public.reserva_activa_asignacion(id)::text AS active,"resourceName","unitAbbreviation","plannedDetailId","supplyPlanId","productionOutputId"
      FROM "StockReservationAllocation" WHERE "workOrderId"=${id} ORDER BY id`;
    const stock=await tx.$queryRaw<{rawMaterialId:number|null;productId:number|null;warehouseId:number;quantity:string;reserved:string}[]>`
      SELECT "rawMaterialId",NULL::integer AS "productId","warehouseId",quantity::text,public.reserva_activa_recurso("rawMaterialId",NULL,"warehouseId")::text AS reserved FROM "WarehouseStock"
      UNION ALL SELECT NULL::integer,"productId","warehouseId",quantity::text,public.reserva_activa_recurso(NULL,"productId","warehouseId")::text FROM "ProductWarehouseStock"`;
    const eventos=await tx.stockReservationEvent.findMany({where:{allocationId:{in:reservas.map(r=>r.id)}},orderBy:{id:"asc"}});
    const productionRecords=await tx.productionRecord.findMany({where:{workOrderId:id},orderBy:{id:"desc"}});
    const reversals=await tx.productionReversal.findMany({where:{workOrderId:id},orderBy:{id:"asc"}});
    const productionConsumptions=await tx.productionConsumption.findMany({where:{productionRecordId:{in:productionRecords.map(r=>r.id)}},orderBy:{id:"asc"}});
    const productionOutputs=await tx.productionOutput.findMany({where:{workOrderId:id},orderBy:{id:"asc"}});
    const pending=await tx.$queryRaw<{id:number;quantity:string}[]>`SELECT id,public.demanda_pendiente_requerimiento(id)::text AS quantity FROM "WorkOrderDetail" WHERE "workOrderId"=${id} AND "retiredAt" IS NULL`;
    const plan:PlanTrabajo|null=w.schemaVersion===null?null:{id:w.id,version:w.version,salesOrderId:w.salesOrderId,salesOrderVersion:w.salesOrderVersion,date:w.date!.toISOString().slice(0,10),
      productName:w.productName,ownPurpose:w.ownPurpose,internalInstructions:w.internalInstructions??"",targetDate:w.targetDate?.toISOString().slice(0,10)??null,confirmPlan:ultima?.planConfirmed===true,reason:"",
      lines:lines.map(l=>({id:l.id,sourceDetailId:l.salesOrderDetailId,kind:l.kind,executionMode:l.executionMode,productId:l.productId,rawMaterialId:l.rawMaterialId,unitMeasureId:l.unitMeasureId,description:l.description,quantity:l.quantity.toFixed(3),quantityToProduce:l.quantityToProduce?.toFixed(3)??"0.000",productVersion:l.productVersion,refreshRecipe:false,
        supplies:supplies.filter(s=>s.workOrderLineId===l.id&&!s.retiredAt).map(s=>({warehouseId:s.warehouseId,quantity:s.quantity.toFixed(3)})),materials:materials.filter(m=>m.workOrderLineId===l.id&&!m.retiredAt).map(m=>({rawMaterialId:m.rawMaterialId,warehouseId:m.warehouseId,quantity:m.quantityNeeded.toFixed(3)})),roundingReviews:revision(l.roundingReview)}))};
    return {id:w.id,version:w.version,folio:folio?.folio??`Histórica #${id}`,status:w.status,voidedAt:w.voidedAt?.toISOString()??null,voidReason:w.voidReason,startedDate:w.startedDate?.toISOString().slice(0,10)??null,legada:w.schemaVersion===null,plan,clientName:source?.clientName??null,salesFolio:sf?.folio??null,
      technicalDescription:w.technicalDescription?validarTextoCotizacion(w.technicalDescription):documentoVacioCotizacion,
      historicalRecipes:recipe.filter(r=>!r.retiredAt).map(r=>({workOrderLineId:r.workOrderLineId,rawMaterialId:r.rawMaterialId,unitMeasureId:r.unitMeasureId,quantityPerUnit:r.quantityPerUnit.toFixed(3),materialName:r.materialName,unitName:r.unitName})),
      materials:materials.map(m=>({id:m.id,workOrderLineId:m.workOrderLineId,rawMaterialId:m.rawMaterialId,warehouseId:m.warehouseId,quantity:m.quantityNeeded.toFixed(3),pendingQuantity:pending.find(p=>p.id===m.id)?.quantity??"0.000",retired:Boolean(m.retiredAt),name:m.materialName??"Material histórico"})),
      stock:stock.map(s=>({...s,free:new Prisma.Decimal(s.quantity).minus(s.reserved).toFixed(3)})),supplies:supplies.map(s=>({id:s.id,workOrderLineId:s.workOrderLineId,warehouseId:s.warehouseId,quantity:s.quantity.toFixed(3),retired:Boolean(s.retiredAt)})),reservas,
      productionRecords:productionRecords.map(r=>({id:r.id,correctsProductionRecordId:r.correctsProductionRecordId,reversal:(()=>{const v=reversals.find(v=>v.productionRecordId===r.id);return v?{id:v.id,date:v.date.toISOString().slice(0,10),reason:v.reason,createdAt:v.createdAt.toISOString()}:null;})(),workOrderLineId:r.workOrderLineId,type:r.type,unit:lines.find(l=>l.id===r.workOrderLineId)?.unitAbbreviation??"",date:r.date.toISOString().slice(0,10),quantity:r.quantity.toFixed(3),note:r.note,deviationReason:r.deviationReason,planVersion:r.planVersion,createdAt:r.createdAt.toISOString(),expected:r.expectedSnapshot as unknown as NecesidadesProduccion,
        consumptions:productionConsumptions.filter(c=>c.productionRecordId===r.id).map(c=>({id:c.id,rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId,quantity:c.quantity.toFixed(3),expectedQuantity:c.expectedQuantity.toFixed(3),name:c.materialName,unit:c.unitAbbreviation}))})),
      productionOutputs:productionOutputs.map(o=>({id:o.id,reversed:reversals.some(v=>v.productionRecordId===o.productionRecordId),productionRecordId:o.productionRecordId,workOrderLineId:o.workOrderLineId,warehouseId:o.warehouseId,productId:o.productId,name:o.productName,quantity:o.quantity.toFixed(3),unit:o.unitAbbreviation})),
      eventos:eventos.map(e=>({id:e.id,allocationId:e.allocationId,type:e.type,quantity:e.quantity.toFixed(3),reason:e.reason,createdAt:e.createdAt.toISOString()})),
      operations:operations.map(o=>({...o,createdAt:o.createdAt.toISOString()})),legacyTitle:w.productName,legacyDescription:w.description};
  },{isolationLevel:"RepeatableRead"});
}
export async function prepararTrabajoComercial(id:number){
  return prisma.$transaction(async tx=>{
    const s=await tx.salesOrder.findUniqueOrThrow({where:{id}});
    if(s.status!=="CONFIRMADA"||!s.folioId||await tx.workOrder.findUnique({where:{salesOrderId:id}}))throw new Error("La orden no está disponible para crear su trabajo.");
    const details=await tx.salesOrderDetail.findMany({where:{salesOrderId:id},orderBy:{position:"asc"}});
    const products=await tx.product.findMany({where:{id:{in:details.flatMap(l=>l.productId?[l.productId]:[])}}});
    const folio=await tx.documentFolio.findUniqueOrThrow({where:{id:s.folioId}});
    return {clientName:s.clientName!,folio:folio.folio,technicalDescription:validarTextoCotizacion(s.technicalDescription),plan:{id:null,version:null,salesOrderId:id,salesOrderVersion:s.version,
      date:hoyOrden(),productName:`Trabajo ${folio.folio}`,ownPurpose:null,internalInstructions:"",targetDate:null,confirmPlan:false,reason:"",lines:details.map(l=>({id:null,sourceDetailId:l.id,kind:l.kind,
        executionMode:l.kind==="PRODUCTO"?"CATALOGO":l.kind==="MATERIA_PRIMA"?"VENTA_DIRECTA_MP":"SERVICIO",productId:l.productId,rawMaterialId:l.rawMaterialId,unitMeasureId:l.unitMeasureId,description:l.description,quantity:l.quantity.toFixed(3),quantityToProduce:"0.000",productVersion:products.find(p=>p.id===l.productId)?.version??null,refreshRecipe:false,materials:[],supplies:[],roundingReviews:[]}))} satisfies PlanTrabajo};
  },{isolationLevel:"RepeatableRead"});
}
export type CatalogosTrabajo=Awaited<ReturnType<typeof catalogosTrabajo>>;
export type TrabajoConsultado=Awaited<ReturnType<typeof consultarTrabajo>>;
export type ListadoTrabajos=Awaited<ReturnType<typeof listarTrabajos>>;
export type TrabajoComercial=Awaited<ReturnType<typeof prepararTrabajoComercial>>;
