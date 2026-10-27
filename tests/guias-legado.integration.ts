// Ejecutar preparar con las migraciones previas al contrato de OT nuevas; validar después de migrar G1–G5.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { consultarGuiaDespacho, listarGuiasDespacho, prepararGuiaDespacho } from "../src/lib/consultas/guias-despacho";
import { registrarGuiaDespacho } from "../src/lib/servicios/guias-despacho";
import { emitirPdfGuia } from "../src/lib/servicios/pdfs-guia";
import { randomUUID } from "node:crypto";
const u=new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_guias_legado_g6_\d{8}$/.test(u.pathname),"Sólo copia local descartable de legado G6");
const archivo="/tmp/guias-legado-g6-antes.json";
async function main(){
 if(process.argv[2]==="preparar"){
  const [w]=await prisma.$queryRaw<{id:number}[]>`INSERT INTO "WorkOrder" ("productName",description,"updatedAt") VALUES ('OT histórica de prueba G6','Sin compromiso ni cantidades reconstruidas',CURRENT_TIMESTAMP) RETURNING id`;
  for(const estado of ["PENDIENTE","PAGADO","VENCIDO"]){
   await prisma.$executeRaw`INSERT INTO "DeliveryNote" ("workOrderId",date,"paymentStatus","paymentPromiseDate","voucherUrl","updatedAt") VALUES (${w.id},TIMESTAMP '2026-01-15 18:30:00',${estado}::"PaymentStatus",TIMESTAMP '2026-02-01 00:00:00',${estado==="PAGADO"?"https://ejemplo.invalid/comprobante-legado":null},CURRENT_TIMESTAMP)`;
  }
  const filas=await prisma.$queryRaw`SELECT * FROM "DeliveryNote" ORDER BY id`;
  await writeFile(archivo,JSON.stringify({workOrderId:w.id,filas}),{mode:0o600});console.log("Legado G6 preparado con esquema anterior, sin deshabilitar triggers.");return;
 }
 const original=JSON.parse(await readFile(archivo,"utf8")) as {workOrderId:number;filas:Record<string,unknown>[]};
 const filas=await prisma.deliveryNote.findMany({orderBy:{id:"asc"}});
 assert.equal(filas.length,3);assert.equal(await prisma.deliveryNoteLine.count(),0);assert.equal(await prisma.documentFolio.count(),0);assert.equal(await prisma.accountReceivable.count(),0);assert.equal(await prisma.payment.count(),0);
 for(const g of filas){
  const {schemaVersion,kind,dispatchDate,salesOrderId,folioId,creationKey,fingerprint,confirmedAt,companySnapshot,clientSnapshot,destinationSnapshot,note,correctionReason,correctsDeliveryNoteId,physicalRestitutionConfirmed,...conservado}=g;
  for(const v of [schemaVersion,kind,dispatchDate,salesOrderId,folioId,creationKey,fingerprint,confirmedAt,companySnapshot,clientSnapshot,destinationSnapshot,note,correctionReason,correctsDeliveryNoteId])assert.equal(v,null);
  assert.equal(physicalRestitutionConfirmed,false);assert.deepEqual(JSON.parse(JSON.stringify(conservado)),original.filas.find(f=>f.id===g.id));
  const detalle=await consultarGuiaDespacho(g.id);assert(detalle?.legado);assert.equal(detalle.estado,"Legado no conciliado");assert.equal(detalle.lineas.length,0);assert.equal(detalle.compromiso.length,0);assert(!("paymentStatus" in detalle));
  assert(!(await emitirPdfGuia({id:g.id},randomUUID())).ok);
 }
 const listado=await listarGuiasDespacho({});assert.equal(listado.total,0);assert(listado.avisoLegado);assert.equal(listado.legadas,3);assert.equal((await listarGuiasDespacho({estado:"LEGADO"})).total,3);
 const preparacion=await prepararGuiaDespacho(original.workOrderId);assert(!preparacion.elegible);assert.equal(preparacion.partidas.length,0);
 assert(!(await registrarGuiaDespacho({workOrderId:original.workOrderId,version:1,date:"2026-01-15",note:"No inventar entrega",lines:[{workOrderLineId:1,warehouseId:null,quantity:"1",conformityName:"Receptor",conformityDate:"2026-01-15"}]},randomUUID())).ok);
 console.log("G6 legado: fechas/pagos/promesas/comprobante conservados, sin folios/cantidades/deuda inferidos ni PDF retrospectivo.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
