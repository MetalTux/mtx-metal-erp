import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { produccionSchema, type RegistroProduccion } from "@/lib/validaciones/produccion";
import { inicioDiaChile } from "@/lib/fechas-chile";
import { hoyOrden } from "./ordenes-compra-cliente";
class ReglaProduccion extends Error {}
function exigir(v:unknown,m:string):asserts v {if(!v)throw new ReglaProduccion(m);}
const dec=(s:string|number|Prisma.Decimal)=>new Prisma.Decimal(s);
const date=(s:string)=>new Date(`${s}T00:00:00Z`);
export type NecesidadesProduccion={schemaVersion:number;workOrderLineId:number;quantity:string;roundingReviews:RegistroProduccion["roundingReviews"];materials:{rawMaterialId:number;unitMeasureId:number;name:string;unit:string;exactQuantity:string;quantity:string;requiresReview:boolean}[];distribution:{plannedDetailId:number;rawMaterialId:number;warehouseId:number;unitMeasureId:number;quantity:string}[]};
async function cargar(tx:Prisma.TransactionClient,d:RegistroProduccion,preparacion=false){
 const w=await tx.workOrder.findUnique({where:{id:d.workOrderId}});exigir(w?.schemaVersion===1&&w.status==="EN_PROCESO","La OT debe estar en proceso para registrar producción o avance.");
 exigir(w.version===d.version,"La OT cambió. Actualiza la consulta antes de registrar.");exigir(d.date>=w.startedDate!.toISOString().slice(0,10)&&d.date<=hoyOrden(),"La fecha del registro debe estar entre el inicio de OT y hoy en Santiago.");
 const line=await tx.workOrderLine.findUnique({where:{id:d.workOrderLineId}});exigir(line?.workOrderId===w.id&&line.executionMode!=="VENTA_DIRECTA_MP","Selecciona una línea de fabricación, servicio o trabajo a medida de esta OT.");
 const done=(await tx.productionRecord.aggregate({where:{workOrderLineId:line.id,reversal:null},_sum:{quantity:true}}))._sum.quantity??dec(0);
 if(d.correctsProductionRecordId!=null)exigir(await tx.productionReversal.findFirst({where:{productionRecordId:d.correctsProductionRecordId,workOrderId:w.id,workOrderLineId:line.id}}),"La corrección debe referir un registro revertido de esta línea.");
 const limit=line.executionMode==="CATALOGO"?line.quantityToProduce!:line.quantity;exigir(done.plus(d.quantity).lte(limit),"El registro supera la cantidad pendiente de la línea.");
 exigir(line.executionMode==="CATALOGO"?d.warehouseId!==null:d.warehouseId===null,"Sólo la fabricación de catálogo selecciona bodega de producto terminado.");
 exigir(line.executionMode!=="SERVICIO"||d.consumptions.length===0,"Servicio puro no consume materias primas.");
 const keys=new Set<string>();for(const c of d.consumptions){const k=`${c.rawMaterialId}/${c.warehouseId}`;exigir(!keys.has(k),"No repitas un material y bodega en los consumos.");keys.add(k);}
 const [expected]=await tx.$queryRaw<{snapshot:NecesidadesProduccion}[]>`SELECT public.necesidades_produccion(${line.id},${d.quantity}::numeric,${JSON.stringify(d.roundingReviews)}::jsonb,${!preparacion}) AS snapshot`;
 const changed=expected.snapshot.distribution.some(e=>!dec(d.consumptions.find(c=>c.rawMaterialId===e.rawMaterialId&&c.warehouseId===e.warehouseId)?.quantity??0).eq(e.quantity))||d.consumptions.some(c=>!dec(c.quantity).eq(expected.snapshot.distribution.find(e=>e.rawMaterialId===c.rawMaterialId&&e.warehouseId===c.warehouseId)?.quantity??0));
 exigir(preparacion||!changed||d.deviationReason.length>0,"Indica motivo de diferencias, omisiones, sustituciones o cambios de bodega.");
 return {w,line,done,limit,expected:expected.snapshot};
}
async function disponibilidad(tx:Prisma.TransactionClient,d:RegistroProduccion){
 const rows=[];
 for(const c of [...d.consumptions].sort((a,b)=>a.rawMaterialId-b.rawMaterialId||a.warehouseId-b.warehouseId)){
  const m=await tx.rawMaterial.findUnique({where:{id:c.rawMaterialId}}),u=m?await tx.unitMeasure.findUnique({where:{id:m.unitMeasureId}}):null,w=await tx.warehouse.findUnique({where:{id:c.warehouseId}});
  exigir(m&&u&&m.unitMeasureId===c.unitMeasureId,"Material o unidad de consumo incompatible.");exigir(w&&["MATERIA_PRIMA","MIXTA"].includes(w.classification??""),"Selecciona una bodega compatible con materia prima.");
  const stock=await tx.warehouseStock.findUnique({where:{warehouseId_rawMaterialId:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId}}});
  const sum=(await tx.stockMovement.aggregate({where:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId},_sum:{quantity:true}}))._sum.quantity??dec(0);
  exigir((stock?.quantity??dec(0)).eq(sum),"Stock de materia prima no coincide con Kardex; concilia antes de producir.");
  const [res]=await tx.$queryRaw<{total:string;own:string}[]>`SELECT public.reserva_activa_recurso(${c.rawMaterialId},NULL,${c.warehouseId})::text AS total,coalesce(sum(public.reserva_activa_asignacion(id)),0)::text AS own FROM "StockReservationAllocation" WHERE "workOrderLineId"=${d.workOrderLineId} AND "rawMaterialId"=${c.rawMaterialId} AND "warehouseId"=${c.warehouseId} AND purpose::text='CONSUMO_PRODUCCION'`;
  const free=(stock?.quantity??dec(0)).minus(res.total),eligible=free.plus(res.own);
  exigir(eligible.gte(c.quantity),`Stock libre y reserva propia insuficientes para ${m.name} en ${w.name}.`);
  rows.push({...c,name:m.name,unit:u.abbreviation,warehouse:w.name,physical:(stock?.quantity??dec(0)).toFixed(3),own:dec(res.own).toFixed(3),other:dec(res.total).minus(res.own).toFixed(3),free:free.toFixed(3),final:(stock?.quantity??dec(0)).minus(c.quantity).toFixed(3)});
 }
 return rows;
}
function error(e:unknown){
 if(e instanceof ReglaProduccion)return {ok:false as const,mensaje:e.message};
 if(e instanceof Prisma.PrismaClientKnownRequestError){
  const cause=(e.meta?.driverAdapterError as {cause?:{originalCode?:string;originalMessage?:string}}|undefined)?.cause;
  if(cause?.originalCode==="P0001")return {ok:false as const,mensaje:(cause.originalMessage??"No se pudo validar la producción.").split("\n")[0]};
 }
 return null;
}
export async function previsualizarProduccion(input:unknown){
  await exigirAcceso("trabajos.operar");

 const p=produccionSchema.safeParse(input);if(!p.success)return {ok:false as const,mensaje:p.error.issues[0].message};
 try{return await prisma.$transaction(async tx=>{
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");
const s=await cargar(tx,p.data),rows=await disponibilidad(tx,p.data);let destination=null;
  if(p.data.warehouseId){const w=await tx.warehouse.findUnique({where:{id:p.data.warehouseId}});exigir(w&&["PRODUCTO_TERMINADO","MIXTA"].includes(w.classification??""),"Selecciona bodega compatible con terminado.");destination=w.name;}
  return {ok:true as const,preview:{expected:s.expected,consumptions:rows,previous:s.done.toFixed(3),next:s.done.plus(p.data.quantity).toFixed(3),limit:s.limit.toFixed(3),destination,reserveOutput:s.w.salesOrderId!==null&&s.line.executionMode==="CATALOGO"}};
 },{isolationLevel:"RepeatableRead",timeout:30000});}catch(e){return error(e)??{ok:false as const,mensaje:"No se pudo consultar la previsualización de producción."};}
}
export async function registrarProduccion(input:unknown,clave:unknown){
  await exigirAcceso("trabajos.operar");

 const p=produccionSchema.safeParse(input),k=z.uuid().safeParse(clave);if(!p.success||!k.success)return {ok:false as const,mensaje:!p.success?p.error.issues[0].message:"UUID inválido."};
 const d=p.data,key=k.data.toLowerCase();
 // Conservar huellas de M2 cuando no hay vínculo de corrección.
 const {correctsProductionRecordId,...original}=d;
 const fingerprint=createHash("sha256").update(JSON.stringify({type:"REGISTRAR_PRODUCCION",...original,...(correctsProductionRecordId!==null?{correctsProductionRecordId}:{})})).digest("hex");
 try{return await prisma.$transaction(async tx=>{
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
  const old=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});if(old){exigir(old.type==="REGISTRAR_PRODUCCION"&&old.workOrderId===d.workOrderId&&old.fingerprint===fingerprint,"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:old.workOrderId,version:old.version,productionRecordId:old.productionRecordId!};}
  exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave pertenece a otro documento.");
  await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${d.workOrderId} FOR UPDATE`;
  const s=await cargar(tx,d);
  const details=await tx.workOrderDetail.findMany({where:{workOrderLineId:s.line.id,retiredAt:null},orderBy:{id:"asc"}});
  const rawIds=[...new Set([...details.map(m=>m.rawMaterialId),...d.consumptions.map(c=>c.rawMaterialId)])].sort((a,b)=>a-b);
  for(const id of rawIds)await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
  if(s.line.productId)await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${s.line.productId} FOR UPDATE`;
  const whIds=[...new Set([...details.map(m=>m.warehouseId),...d.consumptions.map(c=>c.warehouseId),...(d.warehouseId?[d.warehouseId]:[])])].sort((a,b)=>a-b);
  for(const id of whIds)await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
  const stocks=await tx.warehouseStock.findMany({where:{OR:d.consumptions.map(c=>({rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId}))},orderBy:{id:"asc"}});
  for(const stock of stocks)await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${stock.id} FOR UPDATE`;
  await disponibilidad(tx,d);
  const anterior=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:s.w.id,version:s.w.version}}});
  const record=await tx.productionRecord.create({data:{workOrderId:s.w.id,workOrderLineId:s.line.id,correctsProductionRecordId:d.correctsProductionRecordId,type:s.line.executionMode==="CATALOGO"?"FABRICACION_PRODUCTO":s.line.executionMode==="A_MEDIDA"?"EJECUCION_A_MEDIDA":"SERVICIO",date:date(d.date),quantity:d.quantity,note:d.note,deviationReason:d.deviationReason||null,planVersion:s.w.version,expectedSnapshot:s.expected as unknown as Prisma.InputJsonValue}});
  const created=[];
  for(const c of [...d.consumptions].sort((a,b)=>a.rawMaterialId-b.rawMaterialId||a.warehouseId-b.warehouseId)){
   const m=await tx.rawMaterial.findUniqueOrThrow({where:{id:c.rawMaterialId}}),u=await tx.unitMeasure.findUniqueOrThrow({where:{id:m.unitMeasureId}}),detail=details.find(m=>m.rawMaterialId===c.rawMaterialId&&m.warehouseId===c.warehouseId);
   const consumed=await tx.productionConsumption.create({data:{...c,productionRecordId:record.id,workOrderId:s.w.id,workOrderLineId:s.line.id,plannedDetailId:detail?.id??null,expectedQuantity:s.expected.distribution.find(e=>e.rawMaterialId===c.rawMaterialId&&e.warehouseId===c.warehouseId)?.quantity??"0",materialCode:detail?.materialCode??m.code,materialName:detail?.materialName??m.name,unitName:detail?.unitName??u.name,unitAbbreviation:detail?.unitAbbreviation??u.abbreviation}});
   created.push(consumed);
   const allocations=await tx.stockReservationAllocation.findMany({where:{workOrderLineId:s.line.id,rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId,purpose:"CONSUMO_PRODUCCION"},orderBy:{id:"asc"}});let remain=dec(c.quantity);
   for(const a of allocations){if(remain.isZero())break;const [v]=await tx.$queryRaw<{active:string}[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS active`;const q=Prisma.Decimal.min(remain,v.active);if(q.gt(0)){await tx.stockReservationEvent.create({data:{allocationId:a.id,type:"CONSUMIR",quantity:q,reason:"Consumo real del registro de producción",productionConsumptionId:consumed.id,operationId:key}});remain=remain.minus(q);}}
  }
  // Liberar sólo cobertura que deja de ser necesaria por el avance, sin re-reservarla.
  for(const detail of details){const [pending]=await tx.$queryRaw<{quantity:string}[]>`SELECT public.demanda_pendiente_requerimiento(${detail.id})::text AS quantity`;let retain=dec(pending.quantity);
   const allocations=await tx.stockReservationAllocation.findMany({where:{plannedDetailId:detail.id},orderBy:{id:"asc"}});
   for(const a of allocations){const [v]=await tx.$queryRaw<{active:string}[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS active`;const keep=Prisma.Decimal.min(retain,v.active),release=dec(v.active).minus(keep);retain=retain.minus(keep);if(release.gt(0))await tx.stockReservationEvent.create({data:{allocationId:a.id,type:"LIBERAR",quantity:release,reason:"Liberación de cobertura excedente por avance registrado",operationId:key}});}
  }
  for(const c of created){await tx.warehouseStock.update({where:{warehouseId_rawMaterialId:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId}},data:{quantity:{decrement:c.quantity}}});await tx.stockMovement.create({data:{rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId,type:"SALIDA",quantity:c.quantity.negated(),date:inicioDiaChile(d.date),note:`Producción #${record.id}${d.note?`: ${d.note}`:""}`,productionConsumptionId:c.id}});}
  if(s.line.executionMode==="CATALOGO"){
   const warehouseId=d.warehouseId!,product=await tx.product.findUniqueOrThrow({where:{id:s.line.productId!,deletedAt:null}});
   const wh=await tx.warehouse.findUniqueOrThrow({where:{id:warehouseId}});exigir(["PRODUCTO_TERMINADO","MIXTA"].includes(wh.classification??""),"Selecciona bodega de producto terminado o mixta.");
   await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE "productId"=${product.id} AND "warehouseId"=${warehouseId} FOR UPDATE`;
   const stock=await tx.productWarehouseStock.findUnique({where:{warehouseId_productId:{warehouseId,productId:product.id}}}),sum=(await tx.productStockMovement.aggregate({where:{warehouseId,productId:product.id},_sum:{quantity:true}}))._sum.quantity??dec(0);
   exigir((stock?.quantity??dec(0)).eq(sum),"Stock terminado no coincide con Kardex.");exigir((stock?.quantity??dec(0)).plus(d.quantity).lte("99999999999.999"),"El resultado excede la capacidad del saldo.");
   const output=await tx.productionOutput.create({data:{productionRecordId:record.id,workOrderId:s.w.id,workOrderLineId:s.line.id,productId:product.id,warehouseId,unitMeasureId:s.line.unitMeasureId,quantity:d.quantity,productCode:product.code,productName:s.line.description,unitName:s.line.unitName,unitAbbreviation:s.line.unitAbbreviation}});
   await tx.productWarehouseStock.upsert({where:{warehouseId_productId:{warehouseId,productId:product.id}},create:{warehouseId,productId:product.id,quantity:d.quantity},update:{quantity:{increment:d.quantity},version:{increment:1}}});
   await tx.productStockMovement.create({data:{warehouseId,productId:product.id,quantity:d.quantity,type:"ENTRADA",date:date(d.date),note:`Fabricación #${record.id}${d.note?`: ${d.note}`:""}`,productionOutputId:output.id}});
   if(s.w.salesOrderId!==null)await tx.stockReservationAllocation.create({data:{workOrderId:s.w.id,workOrderLineId:s.line.id,purpose:"ENTREGA_PRODUCTO",warehouseId,productId:product.id,unitMeasureId:s.line.unitMeasureId,resourceCode:output.productCode,resourceName:output.productName,unitName:output.unitName,unitAbbreviation:output.unitAbbreviation,quantity:d.quantity,productionOutputId:output.id,operationId:key}});
  }
  await tx.workOrder.update({where:{id:s.w.id},data:{version:{increment:1}}});
  const [snap]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${s.w.id}) AS plan,public.snapshot_reservas_trabajo(${s.w.id}) AS reservations`;
  await anotarMutacion(tx, "workOrderOperation", "create", await tx.workOrderOperation.create({data:{workOrderId:s.w.id,type:"REGISTRAR_PRODUCCION",version:s.w.version+1,idempotencyKey:key,fingerprint,productionRecordId:record.id,beforeSnapshot:anterior.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:snap.plan,reservationSnapshot:snap.reservations}}));
  return {ok:true as const,id:s.w.id,version:s.w.version+1,productionRecordId:record.id};
 },{maxWait:10000,timeout:60000});}catch(e){const known=error(e);if(known)return known;console.error("Error al registrar producción:",e);return {ok:false as const,mensaje:"No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.",incierto:true};}
}


export async function prepararLoteProduccion(input:unknown){
  await exigirAcceso("trabajos.operar");

 const p=produccionSchema.safeParse(input);if(!p.success)return {ok:false as const,mensaje:p.error.issues[0].message};
 try{return await prisma.$transaction(async tx=>({ok:true as const,expected:(await cargar(tx,p.data,true)).expected}),{isolationLevel:"RepeatableRead"});}catch(e){return error(e)??{ok:false as const,mensaje:"No se pudo calcular la previsión del lote."};}
}
