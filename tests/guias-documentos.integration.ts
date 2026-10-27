import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { guardarPlanTrabajo, iniciarTrabajo } from "../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "../src/lib/consultas/ordenes-trabajo";
import { registrarProduccion } from "../src/lib/servicios/produccion";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden } from "../src/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import type { PlanTrabajo } from "../src/lib/validaciones/orden-trabajo";
const url=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(url.hostname)&&url.pathname.startsWith("/mtx_validacion_guias_g5_"),"Sólo copia local descartable G5");
const key=()=>randomUUID(),hoy=hoyOrden();
import { corregirGuiaDespacho, registrarGuiaDespacho } from "../src/lib/servicios/guias-despacho";
import { consultarGuiaDespacho, listarGuiasDespacho } from "../src/lib/consultas/guias-despacho";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { emitirPdfGuia, leerPdfGuia, historialPdfGuia, hashPdfGuia } from "../src/lib/servicios/pdfs-guia";
import { renderizarGuiaPdf } from "../src/lib/pdf/renderizar-guia";
import { htmlGuiaPdf } from "../src/lib/pdf/plantilla-guia";
import { validarOrigenPdfGuia, type OrigenPdfGuia } from "../src/lib/pdf/documento-guia";
const dir=process.env.GUIA_PDF_DIR!;
assert(dir?.startsWith("/tmp/pdfs-validacion-guias-g5-"),"Usar almacén descartable de PDF G5");
function ok<T extends {ok:boolean}>(r:T):Extract<T,{ok:true}>{assert(r.ok,JSON.stringify(r));return r as Extract<T,{ok:true}>;}
async function main(){
 await mkdir(dir,{recursive:true});
 await prisma.companyProfile.update({where:{id:1},data:{logoUrl:null}});

 const unit=await prisma.unitMeasure.create({data:{name:`Unidad guías ${key()}`,abbreviation:"un"}}),raw=await prisma.rawMaterial.create({data:{code:`CI-${key()}`,name:"Material de guías",unitMeasureId:unit.id}}),mp=await prisma.warehouse.create({data:{name:`Insumos guías ${key()}`,classification:"MATERIA_PRIMA"}}),pt=await prisma.warehouse.create({data:{name:`Resultados guías ${key()}`,classification:"PRODUCTO_TERMINADO"}});
 const ref=await consultarSaldoAjuste({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id});assert(ref.ok);assert((await registrarAjusteInventario({rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,finalQuantity:"100",date:hoy,reason:"INVENTARIO_INICIAL",note:"Existencias de prueba G5",correctedAdjustmentId:null,idempotencyKey:key(),reference:ref.referencia})).ok);
 await prisma.warehouseStock.update({where:{warehouseId_rawMaterialId:{warehouseId:mp.id,rawMaterialId:raw.id}},data:{minStock:"3"}});
 const product=await prisma.product.create({data:{name:`Producto guías ${key()}`,unitMeasureId:unit.id,creationKey:key(),creationFingerprint:"e".repeat(64)}});await prisma.productRecipe.create({data:{productId:product.id,rawMaterialId:raw.id,quantity:"1"}});
 const num=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"ORDEN_TRABAJO"}});if(num.nextNumber===null)await prisma.documentNumbering.update({where:{id:num.id},data:{nextNumber:1,padding:5,version:{increment:1}}});
 const base:PlanTrabajo={id:null,version:null,salesOrderId:null,salesOrderVersion:null,date:hoy,productName:"OT cierre",ownPurpose:"Validación G5",internalInstructions:"",targetDate:null,confirmPlan:true,reason:"",lines:[{id:null,sourceDetailId:null,kind:"SERVICIO",executionMode:"A_MEDIDA",productId:null,rawMaterialId:null,unitMeasureId:unit.id,description:"Servicio de prueba",quantity:"2",quantityToProduce:"0",productVersion:null,refreshRecipe:false,materials:[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}],supplies:[],roundingReviews:[]}]};
 async function crear(plan=base){const r=await guardarPlanTrabajo(plan,key());assert(r.ok,JSON.stringify(r));const s=await iniciarTrabajo({workOrderId:r.id,version:r.version,startedDate:hoy},key());assert(s.ok,JSON.stringify(s));return consultarTrabajo(r.id);}
 async function avanzar(w:Awaited<ReturnType<typeof consultarTrabajo>>,quantity="2",consumir=false){const r=await registrarProduccion({workOrderId:w.id,workOrderLineId:w.plan!.lines[0].id!,version:w.version,date:hoy,quantity,warehouseId:consumir?pt.id:null,note:"Ejecución para cierre",deviationReason:"",roundingReviews:[],consumptions:consumir||w.plan!.lines[0].executionMode==="A_MEDIDA"?[{rawMaterialId:raw.id,warehouseId:mp.id,unitMeasureId:unit.id,quantity}]:[]},key());assert(r.ok,JSON.stringify(r));return consultarTrabajo(w.id);}
 async function comercial(kind:"SERVICIO"|"PRODUCTO"|"MATERIA_PRIMA"="SERVICIO",desdeStock=false,issuer?:string,modoAMedida=false){
  if(issuer)await prisma.companyProfile.update({where:{id:1},data:{rut:issuer}});
  const q=await prisma.quote.findFirstOrThrow(),offer=await guardarCotizacion({date:hoy,validUntil:null,clientId:q.clientId,clientBranchId:q.clientBranchId,paymentConditionId:q.paymentConditionId,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},technicalDescription:documentoVacioCotizacion,lines:[{kind,productId:kind==="PRODUCTO"?product.id:null,rawMaterialId:kind==="MATERIA_PRIMA"?raw.id:null,unitMeasureId:unit.id,description:"Línea <script>literal</script> G5",quantity:"2",unitPrice:"100"}]},key());assert(offer.ok,JSON.stringify(offer));
  const detail=await prisma.quoteDetail.findFirstOrThrow({where:{quoteId:offer.id}}),sale=await registrarOrdenCompraCliente({quoteId:offer.id,quoteVersion:offer.version,date:hoy,customerOrderNumber:null,customerOrderDate:null,pdfEmissionId:null,technicalDescription:documentoVacioCotizacion,scopeReviewed:true,lines:[{quoteDetailId:detail.id,quantity:"2"}]},key());assert(sale.ok,JSON.stringify(sale));const p=await prepararTrabajoComercial(sale.id);
  return crear({...p.plan,confirmPlan:true,lines:p.plan.lines.map(l=>({...l,executionMode:modoAMedida?"A_MEDIDA":l.executionMode,quantityToProduce:kind==="PRODUCTO"&&!desdeStock?"2":"0",materials:(kind==="PRODUCTO"&&!desdeStock)||modoAMedida?[{rawMaterialId:raw.id,warehouseId:mp.id,quantity:"2"}]:[],supplies:kind==="MATERIA_PRIMA"||desdeStock?[{warehouseId:kind==="PRODUCTO"?pt.id:mp.id,quantity:"2"}]:[]}))});
 }
 const numbering=await prisma.documentNumbering.findUniqueOrThrow({where:{type:"GUIA_DESPACHO"}});
 if(numbering.nextNumber===null)await prisma.documentNumbering.update({where:{id:numbering.id},data:{nextNumber:1,padding:5,version:{increment:1}}});
 async function dominio(){return JSON.stringify([await prisma.deliveryNote.findMany({orderBy:{id:"asc"}}),await prisma.deliveryNoteLine.findMany({orderBy:{id:"asc"}}),await prisma.workOrder.findMany({orderBy:{id:"asc"}}),await prisma.stockMovement.findMany({orderBy:{id:"asc"}}),await prisma.productStockMovement.findMany({orderBy:{id:"asc"}}),await prisma.warehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.productWarehouseStock.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationAllocation.findMany({orderBy:{id:"asc"}}),await prisma.stockReservationEvent.findMany({orderBy:{id:"asc"}}),await prisma.accountReceivable.findMany({orderBy:{id:"asc"}}),await prisma.payment.findMany({orderBy:{id:"asc"}}),await prisma.documentFolio.findMany({orderBy:{id:"asc"}})],(_k,v)=>typeof v==="bigint"?v.toString():v);}
 let uiGuideId=0,uiWorkId=0,uiSaleId=0;
 for(const kind of ["PRODUCTO","MATERIA_PRIMA","SERVICIO","A_MEDIDA"] as const){
  let w=await comercial(kind==="A_MEDIDA"?"SERVICIO":kind,false,undefined,kind==="A_MEDIDA");
  if(kind!=="MATERIA_PRIMA")w=await avanzar(w,"2",kind==="PRODUCTO");
  const line=w.plan!.lines[0],physical=kind==="PRODUCTO"||kind==="MATERIA_PRIMA";
  const guide=ok(await registrarGuiaDespacho({workOrderId:w.id,version:w.version,date:hoy,note:"Entrega documental G5",lines:[{workOrderLineId:line.id!,warehouseId:physical?(kind==="PRODUCTO"?pt.id:mp.id):null,quantity:"1",conformityName:physical?null:"Receptor histórico",conformityDate:physical?null:hoy}]},key()));
  const before=await dominio(),detail=await consultarGuiaDespacho(guide.id);assert(detail&&!detail.legado);assert.equal(detail.lineas[0].movimientos.length,physical?1:0);assert.equal(detail.compromiso[0].pendiente,"1.000");assert.equal(await dominio(),before);
  const uuid=key(),emitted=ok(await emitirPdfGuia({id:guide.id},uuid)),pdf=await leerPdfGuia(emitted.id);assert.equal(await dominio(),before,"Emitir PDF no modifica dominio");
  assert.equal(ok(await emitirPdfGuia({id:guide.id},uuid.toUpperCase())).id,emitted.id);assert(!(await emitirPdfGuia({id:guide.id+999999},uuid)).ok);
  const twins=await Promise.all([emitirPdfGuia({id:guide.id},key()),emitirPdfGuia({id:guide.id},key())]);assert(twins.every(v=>v.ok));assert.equal(ok(twins[0]).id,emitted.id);assert.equal(ok(twins[1]).id,emitted.id);assert.equal((await historialPdfGuia(guide.id)).length,1);
  const sample=path.join(dir,`muestra-${kind}.pdf`);await writeFile(sample,pdf.bytes);const text=execFileSync("pdftotext",[sample,"-"],{encoding:"utf8"});assert.match(text,/GUÍA DE DESPACHO/);assert.match(text,/Documento operativo interno/);assert.match(text,/literal/);assert.match(text,/Cliente y destino histórico/);if(!physical)assert.match(text,/Receptor histórico/);
  const snapshot=pdf.emision.snapshot as unknown as {documento:{folio:string;kind:"ENTREGA";origen:OrigenPdfGuia};origen:OrigenPdfGuia};
  assert(!htmlGuiaPdf(snapshot.documento,{}).includes('<script>literal</script>'));assert(htmlGuiaPdf(snapshot.documento,{}).includes('&lt;script&gt;literal&lt;/script&gt;'));
  assert.throws(()=>validarOrigenPdfGuia({...snapshot.origen,header:{...snapshot.origen.header,companySnapshot:{legalName:"Incompleto"}}}),/emisor histórico/);
  assert.throws(()=>validarOrigenPdfGuia({...snapshot.origen,header:{...snapshot.origen.header,destinationSnapshot:{branchName:"Incompleto"}}}),/destino histórico/);
  w=await consultarTrabajo(w.id);const correction=ok(await corregirGuiaDespacho({deliveryNoteId:guide.id,version:w.version,date:hoy,reason:"Devolución documental G5",physicalRestitutionConfirmed:physical,lines:[{deliveryNoteLineId:detail.lineas[0].id,quantity:"0.25"}]},key()));
  const corrected=await consultarGuiaDespacho(guide.id);assert.equal(corrected!.lineas[0].corregido,"0.250");assert.equal(corrected!.compromiso[0].entregado,"0.750");assert.equal(hashPdfGuia((await leerPdfGuia(emitted.id)).bytes),hashPdfGuia(pdf.bytes));
  const cPdf=await leerPdfGuia(ok(await emitirPdfGuia({id:correction.id},key())).id);const cSample=path.join(dir,`correccion-${kind}.pdf`);await writeFile(cSample,cPdf.bytes);const ct=execFileSync("pdftotext",[cSample,"-"],{encoding:"utf8"});assert.match(ct,/CORRECCIÓN DE GUÍA/);assert(ct.includes(pdf.emision.folio));assert.match(ct,/Devolución documental G5/);assert.match(ct,physical?/Recepción física confirmada/:/sin movimientos de inventario/);
  if(kind==="A_MEDIDA"){
    // Comprobar la plantilla multipágina y mixta sin archivar datos de dominio inventados.
    const mixed={...snapshot.documento,origen:{...snapshot.origen,warehouseNames:{[mp.id]:"Bodega de referencia"},lines:Array.from({length:80},(_,i)=>({...snapshot.origen.lines[0],id:i+1,position:i+1,description:`Partida extensa ${i+1} · Texto de prueba de impresión`,executionMode:(i%3===0?"CATALOGO":i%3===1?"VENTA_DIRECTA_MP":"SERVICIO") as "CATALOGO"|"VENTA_DIRECTA_MP"|"SERVICIO",warehouseId:i%3===2?null:mp.id,conformityName:i%3===2?"Receptor multipágina":null,conformityDate:i%3===2?hoy:null}))}};
    const multi=await renderizarGuiaPdf(mixed,{}),mpath=path.join(dir,"muestra-multipagina.pdf");await writeFile(mpath,multi);const info=execFileSync("pdfinfo",[mpath],{encoding:"utf8"});assert(Number(/Pages:\s+(\d+)/.exec(info)?.[1])>1);const mt=execFileSync("pdftotext",[mpath,"-"],{encoding:"utf8"});assert.match(mt,/Partida extensa 80/);assert.match(mt,/Receptor multipágina/);assert.match(mt,/Bodega de referencia/);
  }
  const priorFiles=(await readdir(dir)).length;
  // Dos primeras emisiones concurrentes de otra guía reutilizan un único PDF.
  const other=ok(await registrarGuiaDespacho({workOrderId:w.id,version:(await consultarTrabajo(w.id)).version,date:hoy,note:"Guía concurrente G5",lines:[{workOrderLineId:line.id!,warehouseId:physical?(kind==="PRODUCTO"?pt.id:mp.id):null,quantity:"0.5",conformityName:physical?null:"Receptor histórico",conformityDate:physical?null:hoy}]},key()));
  const race=await Promise.all([emitirPdfGuia({id:other.id},key()),emitirPdfGuia({id:other.id},key())]);assert.equal(ok(race[0]).id,ok(race[1]).id);assert.equal((await readdir(dir)).length,priorFiles+1,"Eliminar PDF perdedor sin borrar archivo archivado");
  const altered=JSON.parse(JSON.stringify(pdf.emision.snapshot));altered.origen.header.note="Adulterado";altered.documento.origen.header.note="Adulterado";const fid=key();await assert.rejects(prisma.deliveryNotePdfEmission.create({data:{...pdf.emision,id:fid,templateVersion:999,fileKey:`${fid}.pdf`,snapshot:altered}}),/origen completo/);
  await assert.rejects(prisma.deliveryNotePdfEmission.update({where:{id:emitted.id},data:{folio:"Alterado"}}),/inmutables/);await assert.rejects(prisma.deliveryNotePdfRequest.delete({where:{idempotencyKey:uuid}}),/inmutables/);
  const bytes=await readFile(path.join(dir,pdf.emision.fileKey));await writeFile(path.join(dir,pdf.emision.fileKey),Buffer.from("corrupto"));await assert.rejects(leerPdfGuia(emitted.id),/huella/);await writeFile(path.join(dir,pdf.emision.fileKey),bytes);
  await prisma.companyProfile.update({where:{id:1},data:{legalName:"Empresa actual diferente G5"}});await prisma.warehouse.update({where:{id:mp.id},data:{name:`Bodega actual ${key()}`}});assert.deepEqual((await leerPdfGuia(emitted.id)).bytes,pdf.bytes);assert.deepEqual((await prisma.deliveryNotePdfEmission.findUniqueOrThrow({where:{id:emitted.id}})).snapshot,pdf.emision.snapshot);
  const listado=await listarGuiasDespacho({ot:w.id});assert(listado.filas.every(v=>v.workOrderId===w.id));assert.equal(listado.total,3);
  uiGuideId=other.id;uiWorkId=w.id;uiSaleId=w.plan!.salesOrderId!;
 }
 // Error al registrar solicitud: rollback y limpieza del archivo nuevo, reintento estable.
 const target=await comercial("MATERIA_PRIMA"),g=ok(await registrarGuiaDespacho({workOrderId:target.id,version:target.version,date:hoy,note:"Rollback PDF",lines:[{workOrderLineId:target.plan!.lines[0].id!,warehouseId:mp.id,quantity:"1",conformityName:null,conformityDate:null}]},key()));const count=(await readdir(dir)).length;
 await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallo_pdf_guia_g5() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo inducido PDF guía'; END $$`);await prisma.$executeRawUnsafe('CREATE TRIGGER fallo_pdf_g5 BEFORE INSERT ON "DeliveryNotePdfRequest" FOR EACH ROW EXECUTE FUNCTION public.fallo_pdf_guia_g5()');const retry=key();
 try{assert(!(await emitirPdfGuia({id:g.id},retry)).ok);assert.equal(await prisma.deliveryNotePdfEmission.count({where:{deliveryNoteId:g.id}}),0);assert.equal((await readdir(dir)).length,count);}finally{await prisma.$executeRawUnsafe('DROP TRIGGER fallo_pdf_g5 ON "DeliveryNotePdfRequest"');await prisma.$executeRawUnsafe('DROP FUNCTION public.fallo_pdf_guia_g5()');}ok(await emitirPdfGuia({id:g.id},retry));
 await assert.rejects(prisma.deliveryNote.create({data:{workOrderId:target.id}}),/nueva guía/);
 assert.equal(await consultarGuiaDespacho(-1),null);assert.equal(await consultarGuiaDespacho(2147483648),null);assert(!(await emitirPdfGuia({id:-1},key())).ok);assert(!(await emitirPdfGuia({id:g.id},"inválido")).ok);
 console.log(JSON.stringify({ok:true,uiGuideId,uiWorkId,uiSaleId,message:"G5: detalle, historial, filtros, PDF de entrega/corrección, snapshots, integridad, concurrencia, idempotencia y rollback correctos"}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
