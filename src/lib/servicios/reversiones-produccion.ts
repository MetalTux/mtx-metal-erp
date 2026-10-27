import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { inicioDiaChile } from "@/lib/fechas-chile";
import { reversionProduccionSchema, anulacionTrabajoSchema, type ReversionProduccion } from "@/lib/validaciones/produccion";
import { hoyOrden } from "./ordenes-compra-cliente";

class ReglaCorreccion extends Error {}
function exigir(v:unknown,m:string):asserts v {if(!v)throw new ReglaCorreccion(m);}
const dec=(v:Prisma.Decimal|string|number)=>new Prisma.Decimal(v);
const fecha=(v:string)=>new Date(`${v}T00:00:00Z`);
function fallo(e:unknown){
 if(e instanceof ReglaCorreccion)return {ok:false as const,mensaje:e.message};
 if(e instanceof Prisma.PrismaClientKnownRequestError){const cause=(e.meta?.driverAdapterError as {cause?:{originalCode?:string;originalMessage?:string}}|undefined)?.cause;if(cause?.originalCode==="P0001")return {ok:false as const,mensaje:(cause.originalMessage??"No se pudo validar la corrección.").split("\n")[0]};}
 return null;
}
async function cargar(tx:Prisma.TransactionClient,d:ReversionProduccion){
 const w=await tx.workOrder.findUnique({where:{id:d.workOrderId}});
 exigir(w?.schemaVersion===1&&w.status==="EN_PROCESO","Sólo puedes revertir registros de una OT en proceso.");
 exigir(w.version===d.version,"La OT cambió. Actualiza la consulta antes de revertir.");
 const r=await tx.productionRecord.findUnique({where:{id:d.productionRecordId}});
 exigir(r?.workOrderId===w.id,"Selecciona un registro de esta OT.");
 exigir(!await tx.productionReversal.findUnique({where:{productionRecordId:r.id}}),"El registro ya tiene una reversión; no puede revertirse dos veces.");
 exigir(d.date>=r.date.toISOString().slice(0,10)&&d.date<=hoyOrden(),"La fecha de reversión debe estar entre el registro original y hoy en Santiago.");
 exigir(r.type==="SERVICIO"||d.physicalRestitutionConfirmed,"Confirma que los materiales se restituyen físicamente y que el producto se retira. Para daños o diferencias de conteo usa ajustes de inventario.");
 exigir(!await tx.deliveryNote.findFirst({where:{workOrderId:w.id},select:{id:true}}),"La OT tiene despacho asociado; no se permite revertir producción.");
 const consumptions=await tx.productionConsumption.findMany({where:{productionRecordId:r.id},orderBy:[{rawMaterialId:"asc"},{warehouseId:"asc"}]}),output=await tx.productionOutput.findUnique({where:{productionRecordId:r.id}});
 return {w,r,consumptions,output};
}
async function efectos(tx:Prisma.TransactionClient,s:Awaited<ReturnType<typeof cargar>>){
 const materials=[];
 for(const c of s.consumptions){
  const stock=await tx.warehouseStock.findUnique({where:{warehouseId_rawMaterialId:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId}}}),sum=(await tx.stockMovement.aggregate({where:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId},_sum:{quantity:true}}))._sum.quantity??dec(0);
  exigir(stock&&stock.quantity.eq(sum),"Stock de materia prima no coincide con Kardex. Concilia antes de revertir.");
  exigir(stock.quantity.plus(c.quantity).lte("99999999999.999"),"La devolución excede la capacidad del saldo de materia prima.");
  const warehouse=await tx.warehouse.findUniqueOrThrow({where:{id:c.warehouseId}});
  materials.push({id:c.id,name:c.materialName,unit:c.unitAbbreviation,warehouse:warehouse.name,quantity:c.quantity.toFixed(3),previous:stock.quantity.toFixed(3),final:stock.quantity.plus(c.quantity).toFixed(3)});
 }
 let product=null;
 if(s.output){const o=s.output;
  const entry=await tx.productStockMovement.findUnique({where:{productionOutputId:o.id}});
  exigir(entry,"No se encuentra la entrada original de producto terminado.");
  exigir(!await tx.productStockMovement.findFirst({where:{productId:o.productId,warehouseId:o.warehouseId,id:{gt:entry.id},quantity:{lt:0}},select:{id:true}}),"Hay una salida o ajuste negativo posterior del producto en esa bodega. La reposición posterior no habilita esta reversión.");
  const used=await tx.stockReservationEvent.findFirst({where:{allocation:{productionOutputId:o.id},type:"CONSUMIR"},select:{id:true}});exigir(!used,"El resultado tiene reservas consumidas y no se puede revertir.");
  const stock=await tx.productWarehouseStock.findUnique({where:{warehouseId_productId:{warehouseId:o.warehouseId,productId:o.productId}}}),sum=(await tx.productStockMovement.aggregate({where:{warehouseId:o.warehouseId,productId:o.productId},_sum:{quantity:true}}))._sum.quantity??dec(0);
  exigir(stock&&stock.quantity.eq(sum),"Stock terminado no coincide con Kardex. Concilia antes de revertir.");
  const [reserved]=await tx.$queryRaw<{total:string;own:string}[]>`SELECT public.reserva_activa_recurso(NULL,${o.productId},${o.warehouseId})::text AS total,coalesce(sum(public.reserva_activa_asignacion(id)),0)::text AS own FROM "StockReservationAllocation" WHERE "productionOutputId"=${o.id}`;
  exigir(stock.quantity.minus(o.quantity).gte(dec(reserved.total).minus(reserved.own)),"El retiro dejaría stock insuficiente para reservas ajenas al resultado. Libera esas reservas con motivo antes de corregir.");
  const warehouse=await tx.warehouse.findUniqueOrThrow({where:{id:o.warehouseId}});
  product={name:o.productName,unit:o.unitAbbreviation,warehouse:warehouse.name,quantity:o.quantity.toFixed(3),previous:stock.quantity.toFixed(3),final:stock.quantity.minus(o.quantity).toFixed(3),release:dec(reserved.own).toFixed(3)};
 }
 return {materials,product,quantity:s.r.quantity.toFixed(3),type:s.r.type};
}
export async function previsualizarReversionProduccion(input:unknown){
  await exigirAcceso("trabajos.operar");

 const parsed=reversionProduccionSchema.safeParse(input);if(!parsed.success)return {ok:false as const,mensaje:parsed.error.issues[0].message};
 try{return await prisma.$transaction(async tx=>({ok:true as const,preview:await efectos(tx,await cargar(tx,parsed.data))}),{isolationLevel:"RepeatableRead",timeout:30000});}catch(e){return fallo(e)??{ok:false as const,mensaje:"No se pudo consultar la previsualización de reversión."};}
}
/** Nueva asignación sólo para el faltante del requerimiento afectado. No reactiva débitos antiguos ni reserva otros resultados. */
async function reconstruirReservas(tx:Prisma.TransactionClient,s:Awaited<ReturnType<typeof cargar>>,key:string){
 const details=await tx.workOrderDetail.findMany({where:{workOrderLineId:s.r.workOrderLineId,retiredAt:null},orderBy:{id:"asc"}});
 for(const d of details){
  const [pending]=await tx.$queryRaw<{quantity:string;own:string;total:string}[]>`SELECT public.demanda_pendiente_requerimiento(${d.id})::text AS quantity,coalesce((SELECT sum(public.reserva_activa_asignacion(id)) FROM "StockReservationAllocation" WHERE "plannedDetailId"=${d.id}),0)::text AS own,public.reserva_activa_recurso(${d.rawMaterialId},NULL,${d.warehouseId})::text AS total`;
  const stock=await tx.warehouseStock.findUnique({where:{warehouseId_rawMaterialId:{warehouseId:d.warehouseId,rawMaterialId:d.rawMaterialId}}});
  const q=Prisma.Decimal.min(Prisma.Decimal.max(dec(pending.quantity).minus(pending.own),0),Prisma.Decimal.max((stock?.quantity??dec(0)).minus(pending.total),0));
  if(q.gt(0)){const sum=(await tx.stockMovement.aggregate({where:{rawMaterialId:d.rawMaterialId,warehouseId:d.warehouseId},_sum:{quantity:true}}))._sum.quantity??dec(0);exigir((stock?.quantity??dec(0)).eq(sum),"Stock de requerimiento no coincide con Kardex; concilia antes de reconstruir la reserva.");}
  if(q.gt(0))await tx.stockReservationAllocation.create({data:{workOrderId:s.w.id,workOrderLineId:s.r.workOrderLineId,purpose:"CONSUMO_PRODUCCION",rawMaterialId:d.rawMaterialId,productId:null,warehouseId:d.warehouseId,unitMeasureId:d.unitMeasureId!,quantity:q,resourceCode:d.materialCode!,resourceName:d.materialName!,unitName:d.unitName!,unitAbbreviation:d.unitAbbreviation!,plannedDetailId:d.id,operationId:key}});
 }
}
async function operacion(tx:Prisma.TransactionClient,workOrderId:number,version:number,key:string,fingerprint:string,type:"REVERTIR_PRODUCCION"|"ANULAR",reason:string,productionReversalId:number|null){
 const previous=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId,version}}});
 const [s]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${workOrderId}) AS plan,public.snapshot_reservas_trabajo(${workOrderId}) AS reservations`;
 await anotarMutacion(tx, "workOrderOperation", "create", await tx.workOrderOperation.create({data:{workOrderId,version:version+1,idempotencyKey:key,fingerprint,type,reason,productionReversalId,beforeSnapshot:previous.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}}));
}
export async function revertirProduccion(input:unknown,clave:unknown){
  await exigirAcceso("trabajos.operar");

 const parsed=reversionProduccionSchema.safeParse(input),k=z.uuid().safeParse(clave);if(!parsed.success||!k.success)return {ok:false as const,mensaje:!parsed.success?parsed.error.issues[0].message:"UUID inválido."};
 const d=parsed.data,key=k.data.toLowerCase(),fingerprint=createHash("sha256").update(JSON.stringify({type:"REVERTIR_PRODUCCION",...d})).digest("hex");
 try{return await prisma.$transaction(async tx=>{
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
  const previous=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});if(previous){exigir(previous.type==="REVERTIR_PRODUCCION"&&previous.workOrderId===d.workOrderId&&previous.fingerprint===fingerprint,"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:previous.workOrderId,version:previous.version,productionReversalId:previous.productionReversalId!};}
  exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave pertenece a otro documento.");
  await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${d.workOrderId} FOR UPDATE`;
  const s=await cargar(tx,d);
  await tx.$queryRaw`SELECT id FROM "ProductionRecord" WHERE id=${s.r.id} FOR UPDATE`;
  const details=await tx.workOrderDetail.findMany({where:{workOrderLineId:s.r.workOrderLineId,retiredAt:null}});
  const rawIds=[...new Set([...s.consumptions.map(c=>c.rawMaterialId),...details.map(m=>m.rawMaterialId)])].sort((a,b)=>a-b);
  for(const id of rawIds)await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
  if(s.output)await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${s.output.productId} FOR UPDATE`;
  const whIds=[...new Set([...s.consumptions.map(c=>c.warehouseId),...details.map(m=>m.warehouseId),...(s.output?[s.output.warehouseId]:[])])].sort((a,b)=>a-b);
  for(const id of whIds)await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
  const stocks=await tx.warehouseStock.findMany({where:{OR:[...s.consumptions.map(c=>({rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId})),...details.map(c=>({rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId}))]},orderBy:{id:"asc"}});
  for(const stock of stocks)await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${stock.id} FOR UPDATE`;
  if(s.output)await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE "productId"=${s.output.productId} AND "warehouseId"=${s.output.warehouseId} FOR UPDATE`;
  await efectos(tx,s);
  const reversal=await tx.productionReversal.create({data:{workOrderId:s.w.id,workOrderLineId:s.r.workOrderLineId,productionRecordId:s.r.id,date:fecha(d.date),reason:d.reason,physicalRestitutionConfirmed:d.physicalRestitutionConfirmed,planVersion:s.w.version}});
  for(const c of s.consumptions){
   const detail=await tx.productionReversalConsumption.create({data:{productionReversalId:reversal.id,productionRecordId:s.r.id,productionConsumptionId:c.id,rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId,unitMeasureId:c.unitMeasureId,quantity:c.quantity,materialCode:c.materialCode,materialName:c.materialName,unitName:c.unitName,unitAbbreviation:c.unitAbbreviation}});
   await tx.warehouseStock.update({where:{warehouseId_rawMaterialId:{warehouseId:c.warehouseId,rawMaterialId:c.rawMaterialId}},data:{quantity:{increment:c.quantity}}});
   await tx.stockMovement.create({data:{rawMaterialId:c.rawMaterialId,warehouseId:c.warehouseId,type:"AJUSTE",quantity:c.quantity,date:inicioDiaChile(d.date),note:`Reversión #${reversal.id} de producción #${s.r.id}: ${d.reason}`,productionReversalConsumptionId:detail.id}});
  }
  if(s.output){const o=s.output;
   const allocations=await tx.stockReservationAllocation.findMany({where:{productionOutputId:o.id},orderBy:{id:"asc"}});
   for(const a of allocations){const [active]=await tx.$queryRaw<{quantity:string}[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS quantity`;if(dec(active.quantity).gt(0))await tx.stockReservationEvent.create({data:{allocationId:a.id,type:"LIBERAR",quantity:active.quantity,reason:`Reversión de producción #${s.r.id}: ${d.reason}`.slice(0,1000),operationId:key}});}
   const detail=await tx.productionReversalOutput.create({data:{productionReversalId:reversal.id,productionRecordId:s.r.id,productionOutputId:o.id,productId:o.productId,warehouseId:o.warehouseId,unitMeasureId:o.unitMeasureId,quantity:o.quantity,productCode:o.productCode,productName:o.productName,unitName:o.unitName,unitAbbreviation:o.unitAbbreviation}});
   await tx.productWarehouseStock.update({where:{warehouseId_productId:{warehouseId:o.warehouseId,productId:o.productId}},data:{quantity:{decrement:o.quantity},version:{increment:1}}});
   await tx.productStockMovement.create({data:{productId:o.productId,warehouseId:o.warehouseId,type:"AJUSTE",quantity:o.quantity.negated(),date:fecha(d.date),note:`Reversión #${reversal.id} de producción #${s.r.id}: ${d.reason}`,productionReversalOutputId:detail.id}});
  }
  await reconstruirReservas(tx,s,key);
  await tx.workOrder.update({where:{id:s.w.id},data:{version:{increment:1}}});
  await operacion(tx,s.w.id,s.w.version,key,fingerprint,"REVERTIR_PRODUCCION",d.reason,reversal.id);
  return {ok:true as const,id:s.w.id,version:s.w.version+1,productionReversalId:reversal.id};
 },{maxWait:10000,timeout:60000});}catch(e){const known=fallo(e);if(known)return known;console.error("Error al revertir producción:",e);return {ok:false as const,mensaje:"No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.",incierto:true};}
}

export async function anularTrabajoPropio(input:unknown,clave:unknown){
  await exigirAcceso("trabajos.operar");

 const parsed=anulacionTrabajoSchema.safeParse(input),k=z.uuid().safeParse(clave);if(!parsed.success||!k.success)return {ok:false as const,mensaje:!parsed.success?parsed.error.issues[0].message:"UUID inválido."};
 const d=parsed.data,key=k.data.toLowerCase(),fingerprint=createHash("sha256").update(JSON.stringify({type:"ANULAR",...d})).digest("hex");
 try{return await prisma.$transaction(async tx=>{
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
  const previous=await tx.workOrderOperation.findUnique({where:{idempotencyKey:key}});if(previous){exigir(previous.type==="ANULAR"&&previous.workOrderId===d.workOrderId&&previous.fingerprint===fingerprint,"El UUID ya pertenece a otra solicitud.");return {ok:true as const,id:previous.workOrderId,version:previous.version};}
  exigir(!await tx.documentFolio.findUnique({where:{idempotencyKey:key}}),"La clave pertenece a otro documento.");
  await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${d.workOrderId} FOR UPDATE`;
  const w=await tx.workOrder.findUnique({where:{id:d.workOrderId}});
  exigir(w?.schemaVersion===1&&w.salesOrderId===null&&w.status==="PENDIENTE"&&w.startedDate===null,"Sólo puedes anular una OT de obra propia pendiente, sin inicio ni ejecución. La cancelación contractual comercial no está habilitada.");
  exigir(w.version===d.version,"La OT cambió. Actualiza antes de anular.");
  exigir(!await tx.productionRecord.findFirst({where:{workOrderId:w.id},select:{id:true}})&&!await tx.deliveryNote.findFirst({where:{workOrderId:w.id},select:{id:true}})&&!await tx.stockMovement.findFirst({where:{workOrderDetail:{workOrderId:w.id}},select:{id:true}}),"La OT tiene ejecución o documentos asociados y no puede anularse.");
  const allocations=await tx.stockReservationAllocation.findMany({where:{workOrderId:w.id},orderBy:{id:"asc"}});
  for(const id of [...new Set(allocations.flatMap(a=>a.rawMaterialId?[a.rawMaterialId]:[]))].sort((a,b)=>a-b))await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
  for(const id of [...new Set(allocations.flatMap(a=>a.productId?[a.productId]:[]))].sort((a,b)=>a-b))await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
  for(const a of allocations){const [v]=await tx.$queryRaw<{quantity:string}[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS quantity`;if(dec(v.quantity).gt(0))await tx.stockReservationEvent.create({data:{allocationId:a.id,type:"LIBERAR",quantity:v.quantity,reason:d.reason,operationId:key}});}
  await tx.workOrder.update({where:{id:w.id},data:{status:"ANULADO",voidedAt:new Date(),voidReason:d.reason,version:{increment:1}}});
  await operacion(tx,w.id,w.version,key,fingerprint,"ANULAR",d.reason,null);
  return {ok:true as const,id:w.id,version:w.version+1};
 },{maxWait:10000,timeout:30000});}catch(e){const known=fallo(e);if(known)return known;console.error("Error al anular obra propia:",e);return {ok:false as const,mensaje:"No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.",incierto:true};}
}
