// Sólo copia descartable; genera archivos, fixtures y fallos transaccionales deliberados.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { guardarCotizacion, resolverCotizacion, actualizarEmisorCotizacion } from "../src/lib/servicios/cotizaciones";
import { cargarImagenCotizacion } from "../src/lib/servicios/imagenes-cotizacion";
import { emitirPdfCotizacion, leerPdfCotizacion, historialPdfCotizacion, hashPdf } from "../src/lib/servicios/pdfs-cotizacion";
import { documentoVacioCotizacion, type NodoCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import sharp from "sharp";
const u = new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(u.hostname) && /^\/mtx_validacion_cotizaciones_/.test(u.pathname));
const directorio = process.env.COTIZACION_PDF_DIR!; assert(directorio?.includes("pdfs-validacion"));
assert(process.env.COTIZACION_IMAGEN_DIR?.includes("imagenes-validacion"));
const ok = <T extends {ok:boolean}>(r:T): Extract<T,{ok:true}> => { assert(r.ok,JSON.stringify(r)); return r as Extract<T,{ok:true}>; };
const hoy = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santiago"}).format(new Date());
async function main() {
  const emisionesPrevias = await prisma.quotePdfEmission.count();
  const cl = await prisma.clientBranch.findFirstOrThrow({where:{legacyIncomplete:false}}), unit = await prisma.unitMeasure.findFirstOrThrow(), pc = await prisma.paymentCondition.findFirstOrThrow();
  await prisma.companyProfile.upsert({where:{id:1},create:{id:1,legalName:"Empresa de validación PDF",rut:"76086428-5",address:"Dirección de prueba 123",city:"Curicó"},update:{legalName:"Empresa de validación PDF",rut:"76086428-5",address:"Dirección de prueba 123",city:"Curicó",logoUrl:null}});
  const datos = {date:hoy,validUntil:null,clientId:cl.clientId,clientBranchId:cl.id,paymentConditionId:pc.id,bankAccountId:null,discount:{modo:"SIN_DESCUENTO"},commercialTerms:"50% como anticipo y 50% al entregar.\nTexto exclusivo de esta revisión.",technicalDescription:documentoVacioCotizacion,lines:[{kind:"SERVICIO",rawMaterialId:null,productId:null,unitMeasureId:unit.id,description:"Trabajo de prueba PDF",quantity:"1",unitPrice:"4800000"}]};
  const inventario = async()=>[await prisma.stockMovement.count(),await prisma.warehouseStock.count(),await prisma.accountReceivable.count(),await prisma.payment.count()];
  const inv = await inventario();
  const q = ok(await guardarCotizacion(datos,randomUUID())); const ref = {id:q.id,version:q.version}, clave = randomUUID();
  const e1 = ok(await emitirPdfCotizacion(ref,clave));const primer = await leerPdfCotizacion(e1.id);assert(primer.bytes.subarray(0,5).toString()==="%PDF-");assert.equal((await prisma.quote.findUniqueOrThrow({where:{id:q.id}})).version,1);
  assert.equal(ok(await emitirPdfCotizacion(ref,clave)).id,e1.id);assert.equal(ok(await emitirPdfCotizacion(ref,randomUUID())).id,e1.id);
  const snapshot = primer.emision.snapshot as {documento:{commercialTerms:string,totalAmount:string};origen:{quote:{commercialTerms:string};details:unknown[]}};assert.equal(snapshot.documento.commercialTerms,datos.commercialTerms);assert.equal(snapshot.origen.quote.commercialTerms,datos.commercialTerms);assert.equal(snapshot.documento.totalAmount,"4800000");assert.equal(snapshot.origen.details.length,1);
  await assert.rejects(prisma.quotePdfEmission.update({where:{id:e1.id},data:{folio:"ALTERADO"}}));await assert.rejects(prisma.quotePdfEmission.delete({where:{id:e1.id}}));await assert.rejects(prisma.quotePdfRequest.delete({where:{idempotencyKey:clave}}));
  const modificada = ok(await guardarCotizacion({...datos,commercialTerms:"Pago al entregar, segunda revisión.",lines:[{...datos.lines[0],description:"Descripción modificada",unitPrice:"1000"}]},randomUUID(),ref));const ref2={id:q.id,version:modificada.version};
  assert.equal(ok(await emitirPdfCotizacion(ref,clave)).id,e1.id);assert(!(await emitirPdfCotizacion(ref,randomUUID())).ok);assert(!(await emitirPdfCotizacion(ref2,clave)).ok);
  const dobles=await Promise.all([emitirPdfCotizacion(ref2,randomUUID()),emitirPdfCotizacion(ref2,randomUUID())]);assert.equal(ok(dobles[0]).id,ok(dobles[1]).id);assert.equal((await historialPdfCotizacion(q.id)).length,2);assert.equal((await readdir(directorio)).filter(n=>n.endsWith('.pdf')).length,(await prisma.quotePdfEmission.count())-emisionesPrevias);
  assert.deepEqual((await leerPdfCotizacion(e1.id)).bytes,primer.bytes);
  await prisma.companyProfile.update({where:{id:1},data:{legalName:"Empresa actual distinta"}});assert.deepEqual((await leerPdfCotizacion(e1.id)).bytes,primer.bytes);
  const aprobada=ok(await resolverCotizacion(ref2,randomUUID(),"APROBAR"));const e3=ok(await emitirPdfCotizacion({id:q.id,version:aprobada.version},randomUUID()));assert.equal((await leerPdfCotizacion(e3.id)).emision.status,"APROBADA");
  const rechazo=ok(await guardarCotizacion(datos,randomUUID()));const rechaz=ok(await resolverCotizacion({id:rechazo.id,version:rechazo.version},randomUUID(),"RECHAZAR"));const er=ok(await emitirPdfCotizacion({id:rechazo.id,version:rechaz.version},randomUUID()));assert.equal((await leerPdfCotizacion(er.id)).emision.status,"RECHAZADA");
  const ocultable=ok(await guardarCotizacion(datos,randomUUID()));const eo=ok(await emitirPdfCotizacion({id:ocultable.id,version:ocultable.version},randomUUID()));ok(await resolverCotizacion({id:ocultable.id,version:ocultable.version},randomUUID(),"ELIMINAR"));assert((await leerPdfCotizacion(eo.id)).bytes.length);assert.equal((await historialPdfCotizacion(ocultable.id)).length,1);
  await prisma.companyProfile.update({where:{id:1},data:{city:null}});const incompleta=ok(await guardarCotizacion(datos,randomUUID()));const ei=await emitirPdfCotizacion({id:incompleta.id,version:incompleta.version},randomUUID());assert(!ei.ok&&ei.mensaje.includes("históricos del emisor"));await prisma.companyProfile.update({where:{id:1},data:{city:"Curicó"}});
  // Renovar únicamente el emisor de una Pendiente incompleta; conservar todas
  // las demás copias/filas y reconocer UUID antes de comprobar versión o Empresa.
  const antesEmisor = await prisma.quote.findUniqueOrThrow({where:{id:incompleta.id}});
  const detallesEmisor = await prisma.quoteDetail.findMany({where:{quoteId:incompleta.id}});
  const claveEmisor = randomUUID(), referenciaEmisor = {id:incompleta.id,version:incompleta.version};
  const renovada = ok(await actualizarEmisorCotizacion(referenciaEmisor,claveEmisor));
  assert.equal(renovada.version,incompleta.version+1);
  const despuesEmisor = await prisma.quote.findUniqueOrThrow({where:{id:incompleta.id}});
  const sinEmisor = ({companySnapshot: _emisor,version: _version,updatedAt: _fecha,...resto}: typeof antesEmisor) => {
    void _emisor; void _version; void _fecha; return resto;
  };
  assert.deepEqual(sinEmisor(despuesEmisor),sinEmisor(antesEmisor));
  assert.deepEqual(await prisma.quoteDetail.findMany({where:{quoteId:incompleta.id}}),detallesEmisor);
  assert.equal((despuesEmisor.companySnapshot as {city:string}).city,"Curicó");
  await prisma.companyProfile.update({where:{id:1},data:{city:null}});
  assert.equal(ok(await actualizarEmisorCotizacion(referenciaEmisor,claveEmisor)).version,renovada.version);
  assert(!(await actualizarEmisorCotizacion({id:incompleta.id,version:renovada.version},claveEmisor)).ok);
  assert(!(await actualizarEmisorCotizacion({id:incompleta.id,version:renovada.version},randomUUID())).ok);
  assert.equal((await prisma.quote.findUniqueOrThrow({where:{id:incompleta.id}})).version,renovada.version);
  await prisma.companyProfile.update({where:{id:1},data:{city:"Curicó"}});
  ok(await emitirPdfCotizacion({id:incompleta.id,version:renovada.version},randomUUID()));
  assert(!(await actualizarEmisorCotizacion({id:q.id,version:aprobada.version},randomUUID())).ok);
  assert(!(await actualizarEmisorCotizacion({id:rechazo.id,version:rechaz.version},randomUUID())).ok);
  const oculta = await prisma.quote.findUniqueOrThrow({where:{id:ocultable.id}});
  assert(!(await actualizarEmisorCotizacion({id:oculta.id,version:oculta.version},randomUUID())).ok);
  // Una nueva revisión nunca altera bytes ni snapshots de un PDF previo.
  const archivada = ok(await guardarCotizacion(datos,randomUUID()));
  const ar = {id:archivada.id,version:archivada.version};
  const ae = ok(await emitirPdfCotizacion(ar,randomUUID())), bytesAntes = await leerPdfCotizacion(ae.id);
  await prisma.companyProfile.update({where:{id:1},data:{legalName:"Emisor renovado expresamente"}});
  const simultaneas = await Promise.all([actualizarEmisorCotizacion(ar,randomUUID()),actualizarEmisorCotizacion(ar,randomUUID())]);
  assert.equal(simultaneas.filter(r=>r.ok).length,1);
  const actual = ok(simultaneas.find(r=>r.ok)!);
  const nuevaEmision = ok(await emitirPdfCotizacion({id:archivada.id,version:actual.version},randomUUID()));
  assert.deepEqual((await leerPdfCotizacion(ae.id)).bytes,bytesAntes.bytes);
  assert.deepEqual((await leerPdfCotizacion(ae.id)).emision.snapshot,bytesAntes.emision.snapshot);
  const nuevaCopia = (await leerPdfCotizacion(nuevaEmision.id)).emision.snapshot as {documento:{company:{legalName:string}}};
  assert.equal(nuevaCopia.documento.company.legalName,"Emisor renovado expresamente");
  assert.equal((await historialPdfCotizacion(archivada.id)).length,2);
  // Fallo de operación: revierten juntos snapshot y versión, sin consumir UUID.
  const falloEmisor = ok(await guardarCotizacion(datos,randomUUID())), uuidFallo = randomUUID();
  await prisma.$executeRawUnsafe(`CREATE FUNCTION emisor_fallo_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo emisor de prueba'; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER emisor_fallo_test BEFORE INSERT ON "QuoteOperation" FOR EACH ROW EXECUTE FUNCTION emisor_fallo_test()`);
  assert(!(await actualizarEmisorCotizacion({id:falloEmisor.id,version:falloEmisor.version},uuidFallo)).ok);
  assert.equal((await prisma.quote.findUniqueOrThrow({where:{id:falloEmisor.id}})).version,falloEmisor.version);
  assert.equal(await prisma.quoteOperation.count({where:{idempotencyKey:uuidFallo}}),0);
  await prisma.$executeRawUnsafe(`DROP TRIGGER emisor_fallo_test ON "QuoteOperation"`);
  await prisma.$executeRawUnsafe(`DROP FUNCTION emisor_fallo_test()`);
  if (process.argv.includes("--emisor")) {
    assert.deepEqual(await inventario(),inv);
    console.log("OK EMISOR: sólo snapshot/versión, UUID/reintentos, estados protegidos, concurrencia, rollback y conservación de bytes/snapshots PDF; inventario y cobranza intactos.");
    return;
  }
  // Rollback SQL tras guardar archivo: no queda emisión ni PDF huérfano.
  const fallida=ok(await guardarCotizacion(datos,randomUUID()));await prisma.$executeRawUnsafe(`CREATE FUNCTION pdf_fallo_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo PDF de prueba'; END $$`);await prisma.$executeRawUnsafe(`CREATE TRIGGER pdf_fallo_test BEFORE INSERT ON "QuotePdfRequest" FOR EACH ROW EXECUTE FUNCTION pdf_fallo_test()`);
  const cuenta=await prisma.quotePdfEmission.count();assert(!(await emitirPdfCotizacion({id:fallida.id,version:fallida.version},randomUUID())).ok);assert.equal(await prisma.quotePdfEmission.count(),cuenta);assert.equal((await readdir(directorio)).length,cuenta-emisionesPrevias);await prisma.$executeRawUnsafe(`DROP TRIGGER pdf_fallo_test ON "QuotePdfRequest"`);await prisma.$executeRawUnsafe(`DROP FUNCTION pdf_fallo_test()`);
  // Cambio después de capturar y antes de confirmar: rechazar el PDF obsoleto.
  const carrera=ok(await guardarCotizacion(datos,randomUUID()));
  const buscar=prisma.quotePdfEmission.findUnique.bind(prisma.quotePdfEmission);let cambio=false;
  prisma.quotePdfEmission.findUnique=(async (args: Parameters<typeof buscar>[0])=>{
    if(!cambio && args.where.quoteId_quoteVersion_templateVersion?.quoteId===carrera.id){cambio=true;ok(await guardarCotizacion({...datos,commercialTerms:"Cambio durante render"},randomUUID(),{id:carrera.id,version:carrera.version}));}
    return buscar(args);
  }) as unknown as typeof prisma.quotePdfEmission.findUnique;
  try { const r=await emitirPdfCotizacion({id:carrera.id,version:carrera.version},randomUUID());assert(!r.ok&&r.mensaje.includes("durante la generación")); }
  finally { prisma.quotePdfEmission.findUnique=buscar; }
  assert.equal(await prisma.quotePdfEmission.count({where:{quoteId:carrera.id}}),0);assert.equal((await readdir(directorio)).length,(await prisma.quotePdfEmission.count())-emisionesPrevias);
  // Simular pérdida de confirmación después del commit; mismo UUID recupera resultado.
  const incierta=ok(await guardarCotizacion(datos,randomUUID())), requestKey=randomUUID();
  const transaccion=prisma.$transaction.bind(prisma);let perder=true;
  prisma.$transaction=(async (...args:unknown[])=>{const resultado=await Reflect.apply(transaccion,prisma,args);if(perder&&typeof resultado==='string'){perder=false;throw new Error("Confirmación perdida después del commit de prueba");}return resultado;}) as typeof prisma.$transaction;
  try {assert(!(await emitirPdfCotizacion({id:incierta.id,version:incierta.version},requestKey)).ok);}
  finally {prisma.$transaction=transaccion;}
  const recuperada=ok(await emitirPdfCotizacion({id:incierta.id,version:incierta.version},requestKey));assert((await leerPdfCotizacion(recuperada.id)).bytes.length);assert.equal(await prisma.quotePdfEmission.count({where:{quoteId:incierta.id}}),1);
  // Imagen/lista/tabla y contenido largo: tamaño Carta y paginación verificable.
  const draft=randomUUID(), form=new FormData(), image=await sharp({create:{width:300,height:400,channels:3,background:"#335588"}}).png().toBuffer();form.set("archivo",new File([new Uint8Array(image)],"imagen.png",{type:"image/png"}));form.set("draftKey",draft);form.set("uploadKey",randomUUID());const img=ok(await cargarImagenCotizacion(form));
  const p=(text:string):NodoCotizacion=>({type:"paragraph",content:[{type:"text",text}]});
  const technical:NodoCotizacion={type:"doc",content:[{type:"heading",attrs:{level:2},content:[{type:"text",text:"Especificaciones técnicas"}]},{type:"bulletList",content:[{type:"listItem",content:[p("Primer elemento de lista"),{type:"image",attrs:{src:img.src,width:33,placement:"derecha"}}]},{type:"listItem",content:[p("Segundo elemento continuo")]}]},{type:"table",content:[{type:"tableRow",content:[{type:"tableHeader",content:[p("Cabecera técnica")]},{type:"tableHeader",content:[p("Valor")]}]},...Array.from({length:45},(_,i)=>({type:"tableRow",content:[{type:"tableCell",content:[p(`Fila ${i+1}`)]},{type:"tableCell",content:[p("Descripción de celda larga conservada.")]}]}))]},...Array.from({length:25},(_,i)=>p(`Párrafo ${i+1}: ${"Características del producto y alcance de trabajos. ".repeat(12)}`)),p("FIN DEL DOCUMENTO LARGO") ]};
  const larga=ok(await guardarCotizacion({...datos,technicalDescription:technical},draft));const el=ok(await emitirPdfCotizacion({id:larga.id,version:larga.version},randomUUID()));const pdf=await leerPdfCotizacion(el.id);const ruta=path.join(path.dirname(directorio),"evidencia-larga.pdf");await writeFile(ruta,pdf.bytes);const info=execFileSync('pdfinfo',[ruta],{encoding:'utf8'});assert(/612 x 792 pts/.test(info));assert(Number(info.match(/Pages:\s+(\d+)/)![1])>=4);const texto=execFileSync('pdftotext',['-layout',ruta,'-'],{encoding:'utf8'});assert(texto.includes("FIN DEL DOCUMENTO LARGO")&&texto.includes("Condiciones de pago")&&texto.includes("Segundo elemento continuo"));assert(!texto.includes("undefined"));
  // Archivo alterado: no entregar bytes que contradigan la huella archivada.
  const rutaOriginal=path.join(directorio,primer.emision.fileKey);await writeFile(rutaOriginal,Buffer.from("alterado"));await assert.rejects(leerPdfCotizacion(e1.id));await writeFile(rutaOriginal,primer.bytes);assert.equal(hashPdf((await leerPdfCotizacion(e1.id)).bytes),primer.emision.fileHash);
  assert.deepEqual(await inventario(),inv);console.log("OK: PDF Carta, snapshot completo, todos los estados, versiones/idempotencia/concurrencia, protección/rollback/archivos, historial y paginación con imágenes/listas/tablas; inventario/cobranza intactos. Sólo copia descartable.");
}
main().finally(()=>prisma.$disconnect());
