// Sólo copia descartable. Reproduce snapshots válidos anteriores a M4 sin editar historia existente.
import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/prisma";
import {Prisma} from "../src/generated/prisma/client";
import {guardarPlanTrabajo,iniciarTrabajo} from "../src/lib/servicios/ordenes-trabajo";
import {consultarTrabajo,prepararTrabajoComercial} from "../src/lib/consultas/ordenes-trabajo";
import {registrarProduccion} from "../src/lib/servicios/produccion";
import {revertirProduccion} from "../src/lib/servicios/reversiones-produccion";
import {liberarReservaTrabajo,completarReservasTrabajo} from "../src/lib/servicios/reservas-stock";
import {consultarSaldoAjuste,registrarAjusteInventario} from "../src/lib/servicios/ajustes-inventario";
import {guardarCotizacion} from "../src/lib/servicios/cotizaciones";
import {registrarOrdenCompraCliente,hoyOrden} from "../src/lib/servicios/ordenes-compra-cliente";
import {documentoVacioCotizacion} from "../src/lib/validaciones/texto-cotizacion";
import type {PlanTrabajo} from "../src/lib/validaciones/orden-trabajo";
import type {RegistroProduccion} from "../src/lib/validaciones/produccion";
const url=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(url.hostname)&&url.pathname.startsWith("/mtx_validacion_produccion_snapshots_"));
const key=()=>randomUUID(),hoy=hoyOrden(),antesDeCorreccion=process.env.MTX_SNAPSHOT_ESPERAR_FALLO==="1";
function ok<T extends {ok:boolean}>(r:T):Extract<T,{ok:true}>{assert(r.ok,JSON.stringify(r));return r as Extract<T,{ok:true}>;}
/** Omitir exclusivamente el campo nullable nuevo al INSERTAR los snapshots del fixture.
 * La BD sigue validando todas las operaciones; no se deshabilitan triggers ni se actualiza historia.
 */
async function formatoAnterior<T>(accion:()=>Promise<T>):Promise<T>{
 const original=prisma.$transaction.bind(prisma);
 prisma.$transaction=(async (...args:unknown[])=>{
  const callback=args[0];if(typeof callback!=="function")return Reflect.apply(original,prisma,args);
  const wrapped=(tx:Prisma.TransactionClient)=>callback(new Proxy(tx,{get(target,prop){
   if(prop!=="$queryRaw")return Reflect.get(target,prop);
   return async (...params:unknown[])=>{const result:unknown=await Reflect.apply(target.$queryRaw,target,params);
    if(Array.isArray(result))for(const row of result){if(!row||typeof row!=="object")continue;const plan=(row as {plan?:Prisma.JsonObject}).plan;const header=plan?.header;
     if(header&&typeof header==="object"&&!Array.isArray(header)){assert.equal(header.currentInvoiceReferenceId,null);delete header.currentInvoiceReferenceId;}}
    return result;
   };
  }}));
  return Reflect.apply(original,prisma,[wrapped,...args.slice(1)]);
 }) as typeof prisma.$transaction;
 try{return await accion();}finally{prisma.$transaction=original;}
}
async function snapshot(){return JSON.stringify([await prisma.workOrder.findMany({orderBy:{id:"asc"}}),await prisma.workOrderOperation.findMany({orderBy:{idempotencyKey:"asc"}}),await prisma.productionRecord.findMany({orderBy:{id:"asc"}}),await prisma.productionReversal.findMany({orderBy:{id:"asc"}}),await prisma.warehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.stockMovement.findMany({orderBy:{id:"asc"}}),await prisma.productWarehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.productStockMovement.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationAllocation.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationEvent.findMany({orderBy:{id:"asc"}})]);}
async function ultimaSinCampo(id:number){const w=await prisma.workOrder.findUniqueOrThrow({where:{id}}),op=await prisma.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:id,version:w.version}}});const header=(op.afterSnapshot as Prisma.JsonObject).header as Prisma.JsonObject;assert(!Object.hasOwn(header,"currentInvoiceReferenceId"));return op;}
async function main(){
 const unit=await prisma.unitMeasure.create({data:{name:`Unidad snapshots ${key()}`,abbreviation:"un"}}),raw=await prisma.rawMaterial.create({data:{code:key(),name:"Material snapshots previos",unitMeasureId:unit.id}}),mp=await prisma.warehouse.create({data:{name:"Insumos snapshots",classification:"MATERIA_PRIMA"}}),pt=await prisma.warehouse.create({data:{name:"Resultado snapshots",classification:"PRODUCTO_TERMINADO"}});
 const initial=ok(await consultarSaldoAjuste({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id}));ok(await registrarAjusteInventario({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,finalQuantity:"100",date:hoy,reason:"INVENTARIO_INICIAL",note:"Fixture de compatibilidad",correctedAdjustmentId:null,idempotencyKey:key(),reference:initial.referencia}));
 const p=await prisma.product.create({data:{name:"Producto de snapshot histórico",unitMeasureId:unit.id,creationKey:key(),creationFingerprint:"a".repeat(64)}});await prisma.productRecipe.create({data:{productId:p.id,rawMaterialId:raw.id,quantity:"1"}});
 const n=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});if(n.nextNumber===null)await prisma.documentNumbering.update({where:{id:n.id},data:{nextNumber:1,padding:5,version:{increment:1}}});
 const base:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoy,productName:"Compatibilidad de OT previa a M4",ownPurpose:"Prueba de migración sin reescribir historia",internalInstructions:"Conservar plan",targetDate:null,confirmPlan:true,reason:"",lines:[{id:null,sourceDetailId:null,kind:"PRODUCTO",executionMode:"CATALOGO",productId:p.id,rawMaterialId:null,unitMeasureId:unit.id,description:p.name,quantity:"2",quantityToProduce:"2",productVersion:p.version,refreshRecipe:false,materials:[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}],supplies:[],roundingReviews:[]}]};
 async function crear(plan=base,iniciar=true){const w=ok(await formatoAnterior(()=>guardarPlanTrabajo(plan,key())));if(iniciar)ok(await formatoAnterior(()=>iniciarTrabajo({workOrderId:w.id,version:w.version,startedDate:hoy},key())));return consultarTrabajo(w.id);}
 const amedida:PlanTrabajo={...base,lines:base.lines.map(l=>({...l,kind:"SERVICIO",executionMode:"A_MEDIDA",productId:null,productVersion:null,quantityToProduce:"0"}))};
 const catalog=await crear(),custom=await crear(amedida),pending=await crear(amedida,false),reserved=await crear(amedida,false),reversalWork=await crear();
 await prisma.companyProfile.update({where:{id:1},data:{legalName:"Empresa snapshots",rut:"76086428-5",address:"Dirección de prueba",city:"Curicó"}});
 const q=await prisma.quote.findFirstOrThrow(),offer=ok(await guardarCotizacion({date:hoy,validUntil:null,clientId:q.clientId,clientBranchId:q.clientBranchId,paymentConditionId:q.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:[{kind:"SERVICIO",rawMaterialId:null,productId:null,unitMeasureId:unit.id,description:"Servicio con snapshot anterior",quantity:"2",unitPrice:"100"}]},key()));const detail=await prisma.quoteDetail.findFirstOrThrow({where:{quoteId:offer.id}}),sale=ok(await registrarOrdenCompraCliente({quoteId:offer.id,quoteVersion:offer.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:[{quoteDetailId:detail.id,quantity:"2"}]},key()));const prepared=await prepararTrabajoComercial(sale.id),service=await crear({...prepared.plan,confirmPlan:true});
 const dto=(w:typeof catalog):RegistroProduccion=>({workOrderId:w.id,workOrderLineId:w.plan!.lines[0].id!,version:w.version,date:hoy,quantity:"1",warehouseId:w.plan!.lines[0].executionMode==="CATALOGO"?pt.id:null,note:"Producción después de ampliar esquema",deviationReason:"",roundingReviews:[],consumptions:w.plan!.lines[0].executionMode==="SERVICIO"?[]:[{rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,quantity:"1"}]});
 const originalProduction=ok(await formatoAnterior(()=>registrarProduccion(dto(reversalWork),key()))),reverseView=await consultarTrabajo(reversalWork.id);
 const oldOps=await prisma.workOrderOperation.findMany({where:{workOrderId:{in:[catalog.id,custom.id,pending.id,reserved.id,service.id,reversalWork.id]}},orderBy:{idempotencyKey:"asc"}});
 for(const w of [catalog,custom,pending,reserved,service,reverseView])await ultimaSinCampo(w.id);
 for(const w of [catalog,custom,service]){
  const before=await snapshot(),uuid=key(),input=dto(w),r=await registrarProduccion(input,uuid);
  if(antesDeCorreccion){assert(!r.ok);assert.equal(await snapshot(),before,"Rechazo revierte todos los efectos");continue;}
  const saved=ok(r);assert.equal(ok(await registrarProduccion(input,uuid.toUpperCase())).productionRecordId,saved.productionRecordId);assert(!(await registrarProduccion({...input,note:"Otra intención"},uuid)).ok);
  const op=await prisma.workOrderOperation.findUniqueOrThrow({where:{productionRecordId:saved.productionRecordId}});assert.deepEqual(op.beforeSnapshot,oldOps.find(o=>o.workOrderId===w.id&&o.version===w.version)!.afterSnapshot);
 }
 const operations=[()=>iniciarTrabajo({workOrderId:pending.id,version:pending.version,startedDate:hoy},key()),()=>liberarReservaTrabajo({workOrderId:reserved.id,version:reserved.version,allocationId:reserved.reservas.find(r=>new Prisma.Decimal(r.active).gt(0))!.id,quantity:"1",reason:"Liberación después de migrar",idempotencyKey:key()}).then(r=>({ok:true as const,...r})),()=>revertirProduccion({workOrderId:reverseView.id,version:reverseView.version,productionRecordId:originalProduction.productionRecordId,date:hoy,reason:"Corrección tras migración",physicalRestitutionConfirmed:true},key())];
 for(const operation of operations){const before=await snapshot();try{const r=await operation();assert.equal(r.ok,!antesDeCorreccion,JSON.stringify(r));}catch(e){assert(antesDeCorreccion,e instanceof Error?e.message:String(e));}if(antesDeCorreccion)assert.equal(await snapshot(),before);}
 assert.deepEqual(await prisma.workOrderOperation.findMany({where:{idempotencyKey:{in:oldOps.map(o=>o.idempotencyKey)}},orderBy:{idempotencyKey:"asc"}}),oldOps,"Las operaciones históricas no se reescriben");
 if(!antesDeCorreccion){const w=await consultarTrabajo(reserved.id);await completarReservasTrabajo({workOrderId:w.id,version:w.version,idempotencyKey:key()});const [normal]=await prisma.$queryRaw<{iguales:boolean;nonnullDistinto:boolean;planDistinto:boolean;desconocidoDistinto:boolean}[]>`SELECT public.normalizar_cabecera_snapshot_trabajo('{}')=public.normalizar_cabecera_snapshot_trabajo('{"currentInvoiceReferenceId":null}') AS iguales,public.normalizar_cabecera_snapshot_trabajo('{}')<>public.normalizar_cabecera_snapshot_trabajo('{"currentInvoiceReferenceId":7}') AS "nonnullDistinto",public.normalizar_cabecera_snapshot_trabajo('{"productName":"a"}')<>public.normalizar_cabecera_snapshot_trabajo('{"productName":"b"}') AS "planDistinto",public.normalizar_cabecera_snapshot_trabajo('{}')<>public.normalizar_cabecera_snapshot_trabajo('{"otroCampo":null}') AS "desconocidoDistinto"`;assert(Object.values(normal).every(Boolean));}
 console.log(JSON.stringify({ok:true,modo:antesDeCorreccion?"error reproducido y rollback verificado":"producto, servicio, a medida, inicio, reservas y reversión compatibles; historia y protecciones conservadas"}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
