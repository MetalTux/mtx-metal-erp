import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { guardarPlanTrabajo, iniciarTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "../src/lib/consultas/ordenes-trabajo";
import { finalizarTrabajo, registrarFacturaTrabajo } from "../src/lib/servicios/cierre-trabajo";
import { registrarProduccion } from "../src/lib/servicios/produccion";
import { completarReservasTrabajo } from "../src/lib/servicios/reservas-stock";
import { revertirProduccion } from "../src/lib/servicios/reversiones-produccion";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { PlanTrabajo } from "../src/lib/validaciones/orden-trabajo";
const url=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(url.hostname)&&url.pathname.startsWith("/mtx_validacion_guias_g4_"),"Sólo copia local descartable G4");
const key=()=>randomUUID(),hoy=hoyOrden();
const cierre=(w:{id:number;version:number})=>({workOrderId:w.id,version:w.version,date:hoy,note:"Cierre de prueba con preparación revisada",preparationConfirmed:true});
async function fisico(){return JSON.stringify([await prisma.warehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.stockMovement.findMany({orderBy:{id:"asc"}}),await prisma.productWarehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.productStockMovement.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationAllocation.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationEvent.findMany({orderBy:{id:"asc"}})]);}
import { corregirGuiaDespacho, previsualizarCorreccionGuia, registrarGuiaDespacho } from "../src/lib/servicios/guias-despacho";
import { prepararCorreccionGuia, prepararGuiaDespacho } from "../src/lib/consultas/guias-despacho";

async function main(){

 const unit=await prisma.unitMeasure.create({data:{name:`Unidad guías ${key()}`,abbreviation:"un"}}),raw=await prisma.rawMaterial.create({data:{code:`CI-${key()}`,name:"Material de guías",unitMeasureId:unit.id}}),mp=await prisma.warehouse.create({data:{name:`Insumos guías ${key()}`,classification:"MATERIA_PRIMA"}}),pt=await prisma.warehouse.create({data:{name:`Resultados guías ${key()}`,classification:"PRODUCTO_TERMINADO"}});
 const ref=await consultarSaldoAjuste({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id});assert(ref.ok);assert((await registrarAjusteInventario({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,finalQuantity:"100",date:hoy,reason:"INVENTARIO_INICIAL",note:"Existencias de prueba G4",correctedAdjustmentId:null,idempotencyKey:key(),reference:ref.referencia})).ok);
 await prisma.warehouseStock.update({where:{warehouseId_rawMaterialId:{warehouseId:mp.id,rawMaterialId:raw.id}},data:{minStock:"3"}});
 const product=await prisma.product.create({data:{name:`Producto guías ${key()}`,unitMeasureId:unit.id,creationKey:key(),creationFingerprint:"e".repeat(64)}});await prisma.productRecipe.create({data:{productId:product.id,rawMaterialId:raw.id,quantity:"1"}});
 const num=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});if(num.nextNumber===null)await prisma.documentNumbering.update({where:{id:num.id},data:{nextNumber:1,padding:5,version:{increment:1}}});
 const base:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoy,productName:"OT cierre",ownPurpose:"Validación G4",internalInstructions:"",targetDate:null,confirmPlan:true,reason:"",lines:[{id:null,sourceDetailId:null,kind:"SERVICIO",executionMode:"A_MEDIDA",productId:null,rawMaterialId:null,unitMeasureId:unit.id,description:"Servicio de prueba",quantity:"2",quantityToProduce:"0",productVersion:null,refreshRecipe:false,materials:[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}],supplies:[],roundingReviews:[]}]};
 async function crear(plan=base){const r=await guardarPlanTrabajo(plan,key());assert(r.ok,JSON.stringify(r));const s=await iniciarTrabajo({workOrderId:r.id,version:r.version,startedDate:hoy},key());assert(s.ok,JSON.stringify(s));return consultarTrabajo(r.id);}
 async function avanzar(w:Awaited<ReturnType<typeof consultarTrabajo>>,quantity="2",consumir=false){const r=await registrarProduccion({workOrderId:w.id,workOrderLineId:w.plan!.lines[0].id!,version:w.version,date:hoy,quantity,warehouseId:consumir?pt.id:null,note:"Ejecución para cierre",deviationReason:"",roundingReviews:[],consumptions:consumir||w.plan!.lines[0].executionMode==="A_MEDIDA"?[{rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,quantity}]:[]},key());assert(r.ok,JSON.stringify(r));return consultarTrabajo(w.id);}
 async function comercial(kind:"SERVICIO"|"PRODUCTO"|"MATERIA_PRIMA"="SERVICIO",desdeStock=false,issuer?:string,modoAMedida=false){
  if(issuer)await prisma.companyProfile.update({where:{id:1},data:{rut:issuer}});
  const q=await prisma.quote.findFirstOrThrow(),offer=await guardarCotizacion({date:hoy,validUntil:null,clientId:q.clientId,clientBranchId:q.clientBranchId,paymentConditionId:q.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:[{kind,productId:kind==="PRODUCTO"?product.id:null,rawMaterialId:kind==="MATERIA_PRIMA"?raw.id:null,unitMeasureId:unit.id,description:"Línea comercial G4",quantity:"2",unitPrice:"100"}]},key());assert(offer.ok,JSON.stringify(offer));
  const detail=await prisma.quoteDetail.findFirstOrThrow({where:{quoteId:offer.id}}),sale=await registrarOrdenCompraCliente({quoteId:offer.id,quoteVersion:offer.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:[{quoteDetailId:detail.id,quantity:"2"}]},key());assert(sale.ok,JSON.stringify(sale));const p=await prepararTrabajoComercial(sale.id);
  return crear({...p.plan,confirmPlan:true,lines:p.plan.lines.map(l=>({...l,executionMode:modoAMedida?"A_MEDIDA":l.executionMode,quantityToProduce:kind==="PRODUCTO"&&!desdeStock?"2":"0",materials:(kind==="PRODUCTO"&&!desdeStock)||modoAMedida?[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}]:[],supplies:kind==="MATERIA_PRIMA"||desdeStock?[{warehouseId:kind==="PRODUCTO"?pt.id:mp.id,quantity:"2"}]:[]}))});
 }
 const numbering=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"GUIA_DESPACHO"}});
 if(numbering.nextNumber===null)await prisma.documentNumbering.update({where:{id:numbering.id},data:{nextNumber:1,padding:5,version:{increment:1}}});
 const refresh=(w:{id:number})=>consultarTrabajo(w.id);
 async function despachar(w:Awaited<ReturnType<typeof consultarTrabajo>>,quantity="1"){
  const lines=await prisma.workOrderLine.findMany({where:{workOrderId:w.id},orderBy:{position:"asc"}});
  const r=await registrarGuiaDespacho({workOrderId:w.id,version:w.version,date:hoy,note:"Entrega original G4",lines:lines.map(l=>({workOrderLineId:l.id,warehouseId:l.executionMode==="CATALOGO"?pt.id:l.executionMode==="VENTA_DIRECTA_MP"?mp.id:null,quantity,conformityName:["SERVICIO","A_MEDIDA"].includes(l.executionMode)?"Receptor de prueba":null,conformityDate:["SERVICIO","A_MEDIDA"].includes(l.executionMode)?hoy:null}))},key());assert(r.ok,JSON.stringify(r));
  const details=await prisma.deliveryNoteLine.findMany({where:{deliveryNoteId:r.id},orderBy:{position:"asc"}});return {w:await refresh(w),id:r.id,details};
 }
 type Entrega=Awaited<ReturnType<typeof despachar>>;
 const request=(g:Entrega,quantity="0.5")=>({deliveryNoteId:g.id,version:g.w.version,date:hoy,reason:"Devolución física revisada G4",physicalRestitutionConfirmed:true,lines:g.details.map(l=>({deliveryNoteLineId:l.id,quantity}))});
 async function estado(){return JSON.stringify([await prisma.deliveryNote.findMany({orderBy:{id:"asc"}}),await prisma.deliveryNoteLine.findMany({orderBy:{id:"asc"}}),await prisma.documentNumbering.findMany({orderBy:{id:"asc"}}),await prisma.workOrder.findMany({orderBy:{id:"asc"}}),await prisma.workOrderOperation.findMany({orderBy:{idempotencyKey:"asc"}}),await fisico()],(_k,v)=>typeof v==="bigint"?v.toString():v);}
 async function finanzas(w:Entrega["w"]){return JSON.stringify([await prisma.accountReceivable.findMany({where:{salesOrderId:w.plan!.salesOrderId!}}),await prisma.payment.findMany(),await prisma.workOrderInvoiceReference.findMany({where:{workOrderId:w.id}})]);}
 // Producto fabricado, MP directa, servicio y a medida: parcial/completa, netos, reservas y reentrega.
 for(const kind of ["PRODUCTO","MATERIA_PRIMA","SERVICIO","A_MEDIDA"] as const){
  let w=await comercial(kind==="A_MEDIDA"?"SERVICIO":kind,false,undefined,kind==="A_MEDIDA");
  if(kind!=="MATERIA_PRIMA")w=await avanzar(w,"2",kind==="PRODUCTO");
  let g=await despachar(w);const original=JSON.stringify(await prisma.deliveryNote.findUniqueOrThrow({where:{id:g.id}})),financial=await finanzas(w);
  const before=await estado(),req=request(g),uuid=key(),preview=await previsualizarCorreccionGuia(req);assert(preview.ok,JSON.stringify(preview));assert.equal(await estado(),before);
  for(const patch of [{reason:" "},{date:"2999-01-01"},{date:"2000-01-01"},{version:1},{lines:[...req.lines,...req.lines]},{lines:req.lines.map(l=>({...l,quantity:"1.001"}))},{lines:req.lines.map(l=>({...l,quantity:"0"}))},{lines:req.lines.map(l=>({...l,quantity:"0.0001"}))}])assert(!(await corregirGuiaDespacho({...req,...patch},key())).ok);
  if(kind==="PRODUCTO"||kind==="MATERIA_PRIMA")assert(!(await corregirGuiaDespacho({...req,physicalRestitutionConfirmed:false},key())).ok);
  assert.equal(await estado(),before);
  const r=await corregirGuiaDespacho(req,uuid);assert(r.ok,JSON.stringify(r));assert((await corregirGuiaDespacho(req,uuid.toUpperCase())).ok);assert(!(await corregirGuiaDespacho({...req,reason:"Otra intención"},uuid)).ok);
  assert.equal(JSON.stringify(await prisma.deliveryNote.findUniqueOrThrow({where:{id:g.id}})),original);assert.equal(await finanzas(w),financial);
  let prep=await prepararGuiaDespacho(w.id);assert.equal(prep.partidas[0].entregadoNeto,"0.500");assert.equal((await prepararCorreccionGuia(g.id))!.lines[0].pendiente,"0.500");
  g={...g,w:await refresh(w)};const complete=await corregirGuiaDespacho(request(g),key());assert(complete.ok,JSON.stringify(complete));g={...g,w:await refresh(w)};assert(!(await corregirGuiaDespacho(request(g),key())).ok);
  prep=await prepararGuiaDespacho(w.id);assert.equal(prep.partidas[0].entregadoNeto,"0.000");
  const redo=await despachar(g.w,"2");assert.equal((await prepararGuiaDespacho(w.id)).partidas[0].entregadoNeto,"2.000");
  assert(!(await corregirGuiaDespacho({...request(redo),deliveryNoteId:complete.id},key())).ok,"No corregir una corrección");
  if(kind!=="MATERIA_PRIMA")assert(!(await revertirProduccion({workOrderId:w.id,version:redo.w.version,productionRecordId:w.productionRecords[0].id,date:hoy,reason:"La devolución no borra dependencia",physicalRestitutionConfirmed:true},key())).ok);
  await assert.rejects(prisma.deliveryNote.update({where:{id:g.id},data:{note:"Modificar"}}),/inmutables/);
  await assert.rejects(prisma.deliveryNoteLine.delete({where:{id:g.details[0].id}}),/inmutables/);
 }
 // OT finalizada, factura, anticipo y guía posterior: corregir conserva la deuda y permite reentrega.
 let w=await avanzar(await comercial("PRODUCTO"),"2",true);assert((await finalizarTrabajo(cierre(w),key())).ok);w=await refresh(w);
 assert((await registrarFacturaTrabajo({workOrderId:w.id,version:w.version,invoiceNumber:`G4-${key()}`,invoiceDate:hoy,correctionReason:""},key())).ok);w=await refresh(w);
 const account=await prisma.accountReceivable.findUniqueOrThrow({where:{salesOrderId:w.plan!.salesOrderId!}});await prisma.payment.create({data:{accountReceivableId:account.id,amount:"10",method:"Transferencia de prueba",idempotencyKey:key()}});
 let first=await despachar(w);const second=await despachar(first.w);first={...first,w:second.w};const financial=await finanzas(w);const r=await corregirGuiaDespacho(request(first,"1"),key());assert(r.ok,JSON.stringify(r));assert.equal(await finanzas(w),financial);assert((await despachar(await refresh(w))).id);assert.equal(await finanzas(w),financial);
 // Completar reservas tras una salida no vuelve a reservar lo entregado. Cerrar exige sólo pendiente.
 for(const kind of ["MATERIA_PRIMA","PRODUCTO"] as const){
  let progress=await comercial(kind);if(kind==="PRODUCTO")progress=await avanzar(progress,"2",true);
  let partial=await despachar(progress);const allocBefore=await prisma.stockReservationAllocation.count({where:{workOrderId:progress.id}});
  await completarReservasTrabajo({workOrderId:progress.id,version:partial.w.version,idempotencyKey:key()});assert.equal(await prisma.stockReservationAllocation.count({where:{workOrderId:progress.id}}),allocBefore);
  partial={...partial,w:await refresh(progress)};assert((await corregirGuiaDespacho(request(partial),key())).ok);
  progress=await refresh(progress);assert((await finalizarTrabajo(cierre(progress),key())).ok);progress=await refresh(progress);
  await despachar(progress,"1.5");
 }
 // Reintentos concurrentes y dos intenciones contra el mismo pendiente/revisión.
 for(const sameKey of [true,false]){
  const g=await despachar(await comercial("MATERIA_PRIMA")),req=request(g,"1"),uuid=key();const rs=await Promise.all([corregirGuiaDespacho(req,uuid),corregirGuiaDespacho(req,sameKey?uuid:key())]);assert.equal(rs.filter(v=>v.ok).length,sameKey?2:1,JSON.stringify(rs));assert.equal(await prisma.deliveryNote.count({where:{correctsDeliveryNoteId:g.id}}),1);
 }
 // Guía y corrección concurrentes usan la misma revisión: sólo una intención se confirma.
 const race=await despachar(await comercial("MATERIA_PRIMA"));const rs=await Promise.all([corregirGuiaDespacho(request(race),key()),despachar(race.w).then(()=>true).catch(()=>false)]);assert.equal(rs.filter(r=>typeof r==="boolean"?r:r.ok).length,1);
 // Rollback al final de la escritura y reintento con el mismo UUID.
 const rollback=await despachar(await comercial("MATERIA_PRIMA")),rbReq=request(rollback),rbKey=key();
 await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallo_g4() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type::text='CORREGIR_DESPACHO' THEN RAISE EXCEPTION 'Fallo inducido G4'; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_g4 BEFORE INSERT ON "WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.fallo_g4()`);
 const before=await estado();try{assert(!(await corregirGuiaDespacho(rbReq,rbKey)).ok);assert.equal(await estado(),before);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER fallo_g4 ON "WorkOrderOperation"');await prisma.$executeRawUnsafe('DROP FUNCTION public.fallo_g4()');}assert((await corregirGuiaDespacho(rbReq,rbKey)).ok);
 // Guía mixta con producto desde stock, MP directa y prestación: corregir sólo partidas elegidas.
 const own=await crear({...base,lines:[{...base.lines[0],kind:"PRODUCTO",executionMode:"CATALOGO",productId:product.id,productVersion:product.version,quantityToProduce:"2",materials:[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}]}]});await avanzar(own,"2",true);
 const customer=await prisma.quote.findFirstOrThrow();
 const offer=await guardarCotizacion({date:hoy,validUntil:null,clientId:customer.clientId,clientBranchId:customer.clientBranchId,paymentConditionId:customer.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:(["PRODUCTO","MATERIA_PRIMA","SERVICIO"] as const).map(kind=>({kind,productId:kind==="PRODUCTO"?product.id:null,rawMaterialId:kind==="MATERIA_PRIMA"?raw.id:null,unitMeasureId:unit.id,description:`Partida mixta ${kind}`,quantity:"2",unitPrice:"100"}))},key());assert(offer.ok,JSON.stringify(offer));
 const qlines=await prisma.quoteDetail.findMany({where:{quoteId:offer.id},orderBy:{position:"asc"}});
 const sale=await registrarOrdenCompraCliente({quoteId:offer.id,quoteVersion:offer.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:qlines.map(l=>({quoteDetailId:l.id,quantity:"2"}))},key());assert(sale.ok,JSON.stringify(sale));const plan=await prepararTrabajoComercial(sale.id);
 let mixed=await crear({...plan.plan,confirmPlan:true,lines:plan.plan.lines.map(l=>({...l,quantityToProduce:"0",materials:[],supplies:l.kind==="SERVICIO"?[]:[{warehouseId:l.kind==="PRODUCTO"?pt.id:mp.id,quantity:"2"}]}))});
 const service=mixed.plan!.lines.find(l=>l.kind==="SERVICIO")!;
 assert((await registrarProduccion({workOrderId:mixed.id,workOrderLineId:service.id,version:mixed.version,date:hoy,quantity:"2",warehouseId:null,note:"Prestación mixta",deviationReason:"",roundingReviews:[],consumptions:[]},key())).ok);mixed=await refresh(mixed);
 const mg=await despachar(mixed),mixReq={...request(mg),lines:mg.details.filter(l=>l.executionMode!=="VENTA_DIRECTA_MP").map(l=>({deliveryNoteLineId:l.id,quantity:l.executionMode==="SERVICIO"?"0.25":"0.5"}))};assert((await corregirGuiaDespacho(mixReq,key())).ok);const net=await prepararGuiaDespacho(mixed.id);assert.deepEqual(net.partidas.map(l=>l.entregadoNeto),["0.500","1.000","0.750"]);
 // Varias bodegas en una partida: devolver sólo a la bodega original seleccionada.
 const otherWarehouse=await prisma.warehouse.create({data:{name:`Devoluciones G4 ${key()}`,classification:"MATERIA_PRIMA"}});
 const otherRef=await consultarSaldoAjuste({rawMaterialId:raw.id,warehouseId:otherWarehouse.id,unitMeasureId:unit.id});assert(otherRef.ok);assert((await registrarAjusteInventario({rawMaterialId:raw.id,warehouseId:otherWarehouse.id,unitMeasureId:unit.id,finalQuantity:"2",date:hoy,reason:"INVENTARIO_INICIAL",note:"Segunda bodega G4",correctedAdjustmentId:null,idempotencyKey:key(),reference:otherRef.referencia})).ok);
 const of2=await guardarCotizacion({date:hoy,validUntil:null,clientId:customer.clientId,clientBranchId:customer.clientBranchId,paymentConditionId:customer.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:[{kind:"MATERIA_PRIMA",rawMaterialId:raw.id,productId:null,unitMeasureId:unit.id,description:"Partida en dos bodegas",quantity:"2",unitPrice:"100"}]},key());assert(of2.ok);const qd=await prisma.quoteDetail.findFirstOrThrow({where:{quoteId:of2.id}});const so2=await registrarOrdenCompraCliente({quoteId:of2.id,quoteVersion:of2.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:[{quoteDetailId:qd.id,quantity:"2"}]},key());assert(so2.ok);const plan2=await prepararTrabajoComercial(so2.id);const ww=await crear({...plan2.plan,confirmPlan:true,lines:plan2.plan.lines.map(l=>({...l,supplies:[{warehouseId:mp.id,quantity:"1"},{warehouseId:otherWarehouse.id,quantity:"1"}]}))});
 const gg=await registrarGuiaDespacho({workOrderId:ww.id,version:ww.version,date:hoy,note:"Guía en dos bodegas",lines:[mp.id,otherWarehouse.id].map(warehouseId=>({workOrderLineId:ww.plan!.lines[0].id!,warehouseId,quantity:"1",conformityName:null,conformityDate:null}))},key());assert(gg.ok,JSON.stringify(gg));const ll=await prisma.deliveryNoteLine.findFirstOrThrow({where:{deliveryNoteId:gg.id,warehouseId:otherWarehouse.id}});const rawBefore=await prisma.warehouseStock.findUniqueOrThrow({where:{warehouseId_rawMaterialId:{warehouseId:mp.id,rawMaterialId:raw.id}}});
 assert((await corregirGuiaDespacho({deliveryNoteId:gg.id,version:(await refresh(ww)).version,date:hoy,reason:"Recepción en segunda bodega",physicalRestitutionConfirmed:true,lines:[{deliveryNoteLineId:ll.id,quantity:"0.5"}]},key())).ok);assert.deepEqual(await prisma.warehouseStock.findUniqueOrThrow({where:{id:rawBefore.id}}),rawBefore);
 // La capa SQL rechaza una recepción no confirmada aunque se altere el DTO después de validarlo.
 const guarded=await despachar(await comercial("MATERIA_PRIMA")),guardReq=request(guarded);
 await prisma.$executeRawUnsafe(`CREATE FUNCTION public.adulterar_g4() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind::text='CORRECCION' THEN NEW."physicalRestitutionConfirmed":=false; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER adulterar_g4 BEFORE INSERT ON "DeliveryNote" FOR EACH ROW EXECUTE FUNCTION public.adulterar_g4()`);
 const guardedBefore=await estado();try{const rejected=await corregirGuiaDespacho(guardReq,key());assert(!rejected.ok,JSON.stringify(rejected));assert.equal(await estado(),guardedBefore);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER adulterar_g4 ON "DeliveryNote"');await prisma.$executeRawUnsafe('DROP FUNCTION public.adulterar_g4()');}
 // Ambas familias de saldo siguen conciliadas con su Kardex; mínimos intactos.
 for(const stock of await prisma.warehouseStock.findMany({where:{rawMaterialId:raw.id}})){const sum=(await prisma.stockMovement.aggregate({where:{rawMaterialId:stock.rawMaterialId,warehouseId:stock.warehouseId},_sum:{quantity:true}}))._sum.quantity??new Prisma.Decimal(0);assert(stock.quantity.eq(sum));assert.equal(stock.minStock?.toFixed(3)??null,stock.warehouseId===mp.id?"3.000":null);}
 for(const stock of await prisma.productWarehouseStock.findMany({where:{productId:product.id}})){const sum=(await prisma.productStockMovement.aggregate({where:{productId:stock.productId,warehouseId:stock.warehouseId},_sum:{quantity:true}}))._sum.quantity??new Prisma.Decimal(0);assert(stock.quantity.eq(sum));}
 console.log("G4: correcciones parciales/completas, bienes/prestaciones, recepción física, reservas, reentrega, factura/pagos, concurrencia, UUID, inmutabilidad y rollback verificados.");
}
main().finally(()=>prisma.$disconnect());
