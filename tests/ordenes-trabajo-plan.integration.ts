import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Prisma, type RawMaterial } from "../src/generated/prisma/client";
import { guardarPlanTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial, listarTrabajos, catalogosTrabajo } from "../src/lib/consultas/ordenes-trabajo";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { hoyOrden, registrarOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { completarReservasTrabajo } from "../src/lib/servicios/reservas-stock";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { PlanTrabajo } from "../src/lib/validaciones/orden-trabajo";
const url=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(url.hostname)&&url.pathname.startsWith("/mtx_validacion_plan_"));
const key=()=>randomUUID();
async function fisico(){return JSON.stringify([await prisma.warehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.stockMovement.findMany({orderBy:{id:"asc"}}),await prisma.productWarehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.productStockMovement.findMany({orderBy:{id:"asc"}})]);}
async function main(){
 const unidad=await prisma.unitMeasure.create({data:{name:`Unidad plan ${key()}`,abbreviation:"un"}});
 const raws: RawMaterial[]=[];for(let i=0;i<3;i++)raws.push(await prisma.rawMaterial.create({data:{code:`PL-${key()}`,name:`Material plan ${i}`,unitMeasureId:unidad.id}}));
 const wh=await prisma.warehouse.create({data:{name:"Plan origen",classification:"MATERIA_PRIMA"}}),wh2=await prisma.warehouse.create({data:{name:"Plan alternativa",classification:"MATERIA_PRIMA"}});
 const producto=await prisma.product.create({data:{name:"Producto para plan",unitMeasureId:unidad.id,creationKey:key(),creationFingerprint:"a".repeat(64)}});
 for(const [m,q] of [[raws[0],"2.500"],[raws[1],"0.002"]] as const)await prisma.productRecipe.create({data:{productId:producto.id,rawMaterialId:m.id,quantity:q}});
 for(const [warehouseId,quantity] of [[wh.id,"2"],[wh2.id,"10"]] as const){const s=await consultarSaldoAjuste({rawMaterialId:raws[0].id,unitMeasureId:unidad.id,warehouseId});assert(s.ok);assert((await registrarAjusteInventario({rawMaterialId:raws[0].id,unitMeasureId:unidad.id,warehouseId,finalQuantity:quantity,reason:"INVENTARIO_INICIAL",date:hoyOrden(),note:"Stock de prueba de planificación",correctedAdjustmentId:null,idempotencyKey:key(),reference:s.referencia})).ok);}
 const base:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoyOrden(),productName:"Obra propia de planificación",ownPurpose:"Fabricar para uso interno",internalInstructions:"Respetar cotas del plano",targetDate:null,confirmPlan:false,reason:"",lines:[{id:null,sourceDetailId:null,kind:"PRODUCTO",executionMode:"CATALOGO",productId:producto.id,rawMaterialId:null,unitMeasureId:unidad.id,description:producto.name,quantity:"1",quantityToProduce:"1",productVersion:producto.version,refreshRecipe:false,materials:[],supplies:[],roundingReviews:[]}]};
 const numeracion=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});
 if(numeracion.nextNumber===null){const fail=await guardarPlanTrabajo(base,key());assert(!fail.ok&&fail.mensaje.includes("numeración"));assert.equal(await prisma.workOrder.count(),0);await prisma.documentNumbering.update({where:{id:numeracion.id},data:{prefix:"OT-PLAN-",padding:5,nextNumber:1,version:{increment:1}}});}
 const antes=await fisico(),clave=key();const created=await guardarPlanTrabajo(base,clave);assert(created.ok,JSON.stringify(created));
 const replay=await guardarPlanTrabajo(base,clave);assert(replay.ok&&replay.id===created.id);
 assert(!(await guardarPlanTrabajo({...base,productName:"Otro título"},clave)).ok);
 assert.equal(await fisico(),antes);assert.equal(await prisma.stockReservationAllocation.count({where:{workOrderId:created.id}}),0);
 let w=await consultarTrabajo(created.id);assert(w.plan && !w.plan.confirmPlan);assert.equal(w.historicalRecipes.length,2);
 await assert.rejects(completarReservasTrabajo({workOrderId:w.id,version:w.version,idempotencyKey:key()}),/Confirma primero/);
 for(const confirmed of [true,null]){
  await assert.rejects(prisma.$transaction(async tx=>{
   const previous=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:w.id,version:w.version}}});
   await tx.workOrder.update({where:{id:w.id},data:{version:{increment:1}}});
   const [snap]=await tx.$queryRaw<{plan:Prisma.InputJsonValue;reservations:Prisma.InputJsonValue}[]>`SELECT public.snapshot_plan_trabajo(${w.id}) AS plan,public.snapshot_reservas_trabajo(${w.id}) AS reservations`;
   await tx.workOrderOperation.create({data:{workOrderId:w.id,version:w.version+1,type:"EDITAR_PLAN",idempotencyKey:key(),fingerprint:"a".repeat(64),planConfirmed:confirmed,reason:"Intento directo de confirmación",beforeSnapshot:previous.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:snap.plan,reservationSnapshot:snap.reservations}});
  }),confirmed ? /distribución completa/ : /decisión explícita/);
 }
 let plan:PlanTrabajo={...w.plan,reason:"Definir bodegas y confirmar",confirmPlan:true,lines:w.plan.lines.map(l=>({...l,materials:[{rawMaterialId:raws[0].id,warehouseId:wh.id,quantity:"2.500"},{rawMaterialId:raws[1].id,warehouseId:wh.id,quantity:"0.002"}]}))};
 let saved=await guardarPlanTrabajo(plan,key());assert(saved.ok,JSON.stringify(saved));w=await consultarTrabajo(w.id);assert(w.plan?.confirmPlan);assert.equal(w.reservas.length,1);assert.equal(w.reservas[0].active,"2.000");assert.equal(await fisico(),antes);
 const viejaCantidad=w.materials.find(m=>m.rawMaterialId===raws[0].id&&!m.retired)!;
 plan={...w.plan!,reason:"Cambiar bodega con historia",lines:w.plan!.lines.map(l=>({...l,materials:l.materials.map(m=>m.rawMaterialId===raws[0].id?{...m,warehouseId:wh2.id}:m)}))};
 saved=await guardarPlanTrabajo(plan,key());assert(saved.ok,JSON.stringify(saved));w=await consultarTrabajo(w.id);assert(w.materials.find(m=>m.id===viejaCantidad.id)!.retired);assert.equal(w.reservas.find(r=>r.warehouseId===wh.id)!.active,"0.000");assert.equal(w.reservas.find(r=>r.warehouseId===wh2.id)!.active,"2.500");assert(w.eventos.some(e=>e.reason.includes("Cambiar bodega")));assert.equal(await fisico(),antes);
 await assert.rejects(prisma.workOrderDetail.update({where:{id:viejaCantidad.id},data:{quantityNeeded:"3.000"}}),/Archivar conserva/);
 const oldRecipe=w.historicalRecipes;
 await prisma.$transaction(async tx=>{await tx.productRecipe.deleteMany({where:{productId:producto.id,rawMaterialId:raws[1].id}});await tx.productRecipe.update({where:{productId_rawMaterialId:{productId:producto.id,rawMaterialId:raws[0].id}},data:{quantity:"3.500"}});await tx.productRecipe.create({data:{productId:producto.id,rawMaterialId:raws[2].id,quantity:"0.100"}});await tx.product.update({where:{id:producto.id},data:{version:{increment:1}}});});
 plan={...w.plan!,reason:"Conservar receta histórica"};saved=await guardarPlanTrabajo(plan,key());assert(saved.ok,JSON.stringify(saved));w=await consultarTrabajo(w.id);assert.deepEqual(w.historicalRecipes,oldRecipe);
 plan={...w.plan!,reason:"Actualizar receta expresamente",lines:w.plan!.lines.map(l=>({...l,refreshRecipe:true,productVersion:producto.version+1,materials:[{rawMaterialId:raws[0].id,warehouseId:wh2.id,quantity:"3.500"},{rawMaterialId:raws[2].id,warehouseId:wh.id,quantity:"0.100"}]}))};
 saved=await guardarPlanTrabajo(plan,key());assert(saved.ok,JSON.stringify(saved));w=await consultarTrabajo(w.id);assert(w.historicalRecipes.some(r=>r.rawMaterialId===raws[2].id));assert(!w.historicalRecipes.some(r=>r.rawMaterialId===raws[1].id));assert(w.materials.some(m=>m.rawMaterialId===raws[1].id&&m.retired));assert.equal(await fisico(),antes);
 const rev=w.version;assert(!(await guardarPlanTrabajo({...w.plan!,reason:"Versión anterior",version:rev-1},key())).ok);
 const draft={...w.plan!,reason:"Volver a borrador",confirmPlan:false};saved=await guardarPlanTrabajo(draft,key());assert(saved.ok);w=await consultarTrabajo(w.id);assert(w.reservas.every(r=>new Prisma.Decimal(r.active).isZero()));

 // Necesidad positiva que redondea a cero: confirmación sólo con revisión explícita.
 const small={...base,productName:"Revisión de necesidad mínima",confirmPlan:true,lines:[{...base.lines[0],quantity:"0.001",quantityToProduce:"0.001",productVersion:producto.version+1,materials:[{rawMaterialId:raws[0].id,warehouseId:wh.id,quantity:"0.004"}]}]};
 assert(!(await guardarPlanTrabajo(small,key())).ok);
 const reviewed={...small,lines:[{...small.lines[0],materials:[...small.lines[0].materials,{rawMaterialId:raws[2].id,warehouseId:wh.id,quantity:"0.001"}],roundingReviews:[{rawMaterialId:raws[2].id,quantity:"0.001",reason:"Mínimo físico revisado"}]}]};
 const sr=await guardarPlanTrabajo(reviewed,key());assert(sr.ok,JSON.stringify(sr));const sw=await consultarTrabajo(sr.id);assert.equal(sw.plan!.lines[0].roundingReviews[0].reason,"Mínimo físico revisado");

 // Límite transaccional: documento, contador, distribución y reservas revierten juntos.
 await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallar_plan_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type::text='CREAR' THEN RAISE EXCEPTION 'fallo deliberado plan'; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_plan_prueba BEFORE INSERT ON "WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.fallar_plan_prueba()`);
 const contador=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}}),cantidadWorks=await prisma.workOrder.count(),cantidadReservas=await prisma.stockReservationAllocation.count();
 const retryKey=key();try{assert(!(await guardarPlanTrabajo(reviewed,retryKey)).ok);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER fallo_plan_prueba ON "WorkOrderOperation"');await prisma.$executeRawUnsafe('DROP FUNCTION public.fallar_plan_prueba()');}
 assert.equal(await prisma.workOrder.count(),cantidadWorks);assert.equal(await prisma.stockReservationAllocation.count(),cantidadReservas);assert.equal((await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}})).nextNumber,contador.nextNumber);
 assert((await guardarPlanTrabajo(reviewed,retryKey)).ok);

 const quoteBase=await prisma.quote.findFirstOrThrow();
 const oferta=await guardarCotizacion({date:hoyOrden(),validUntil:null,clientId:quoteBase.clientId,clientBranchId:quoteBase.clientBranchId,paymentConditionId:quoteBase.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,
 lines:[{kind:"PRODUCTO",rawMaterialId:null,productId:producto.id,unitMeasureId:unidad.id,description:producto.name,quantity:"2",unitPrice:"100"},{kind:"SERVICIO",rawMaterialId:null,productId:null,unitMeasureId:unidad.id,description:"Montaje parcial",quantity:"3",unitPrice:"100"}]},key());assert(oferta.ok);
 const qlines=await prisma.quoteDetail.findMany({where:{quoteId:oferta.id},orderBy:{position:"asc"}});
 const accepted=await registrarOrdenCompraCliente({quoteId:oferta.id,quoteVersion:oferta.version,date:hoyOrden(),customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:qlines.map(l=>({quoteDetailId:l.id,quantity:"1"}))},key());assert(accepted.ok);
 const cuenta=JSON.stringify(await prisma.accountReceivable.findMany({orderBy:{id:"asc"}}));const commercial=await prepararTrabajoComercial(accepted.id);assert.equal(commercial.plan.lines.length,2);assert(commercial.plan.lines.every(l=>l.quantity==="1.000"));
 assert(!(await guardarPlanTrabajo({...commercial.plan,lines:[commercial.plan.lines[0]]},key())).ok);
 const ck=key(),race=await Promise.all([guardarPlanTrabajo(commercial.plan,ck),guardarPlanTrabajo(commercial.plan,ck)]);assert(race.every(r=>r.ok),JSON.stringify(race));assert(race[0].ok&&race[1].ok&&race[0].id===race[1].id);assert(!(await guardarPlanTrabajo(commercial.plan,key())).ok);
 assert.equal(JSON.stringify(await prisma.accountReceivable.findMany({orderBy:{id:"asc"}})),cuenta);assert.equal(await fisico(),antes);
 const beforeReads=await prisma.workOrderOperation.count();await listarTrabajos({});await catalogosTrabajo();await consultarTrabajo(w.id);assert.equal(await prisma.workOrderOperation.count(),beforeReads);
 console.log("OT: borrador/confirmación, receta histórica/actualizada, archivo de orígenes, cambio de bodega, reservas parciales, revisión de cero, UUID/carreras, aceptación parcial, rollback y consultas sin escrituras correctos.");
}
main().finally(()=>prisma.$disconnect());
