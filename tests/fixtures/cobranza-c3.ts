import assert from "node:assert/strict";
import { consultarCobranza } from "../../src/lib/consultas/cobranza";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "../../src/lib/prisma";
import { adjuntarComprobante,cambiarPromesa } from "../../src/lib/servicios/cobranza-c3";
import { almacenComprobantes } from "../../src/lib/almacenamiento/comprobantes-cobranza";
import { hoyOrden } from "../../src/lib/servicios/ordenes-compra-cliente";
export async function probarC3(cuentaId:number,pagoId:number){
 const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_cobranza_c1_\d{8}$/.test(u.pathname));assert(process.env.COBRANZA_COMPROBANTE_DIR?.startsWith('/tmp/'));
 await prisma.$executeRawUnsafe('ALTER TABLE "PaymentAttachment" RENAME TO "PaymentAttachment_validacion_c3"');
 try{const sinMigrar=await consultarCobranza({cuenta:cuentaId});assert.equal(sinMigrar.c3Disponible,false);assert(sinMigrar.detalle);assert.equal(sinMigrar.detalle.totalPromesas,0);}finally{await prisma.$executeRawUnsafe('ALTER TABLE "PaymentAttachment_validacion_c3" RENAME TO "PaymentAttachment"');}
 const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#336699'}}).png().toBuffer();
 function form(clave=randomUUID(),contenido:Buffer=bytes,nombre='transferencia.png',pago=pagoId){const f=new FormData();f.set('pagoId',String(pago));f.set('clave',clave);f.set('archivo',new File([new Uint8Array(contenido)],nombre));return f;}
 const clave=randomUUID();assert((await adjuntarComprobante(form(clave))).ok);assert((await adjuntarComprobante(form(clave))).ok);assert.equal(await prisma.paymentAttachment.count({where:{id:clave}}),1);
 assert(!(await adjuntarComprobante(form(clave,Buffer.from('otro'),'texto.pdf'))).ok);
 assert(!(await adjuntarComprobante(form(randomUUID(),Buffer.alloc(5*1024*1024+1),'grande.pdf'))).ok);
 assert(!(await adjuntarComprobante(form(randomUUID(),bytes,'invalido.html'))).ok);
 assert(!(await adjuntarComprobante(form(randomUUID(),bytes,'valido.png',2147483647))).ok);
 const almacenado=await prisma.paymentAttachment.findUniqueOrThrow({where:{id:clave}});assert.deepEqual(await almacenComprobantes.leer(almacenado.fileKey),bytes);
 assert((await adjuntarComprobante(form(randomUUID(),Buffer.from('%PDF-1.7\ncomprobante de prueba\n%%EOF'),'deposito.pdf'))).ok);
 await assert.rejects(()=>prisma.paymentAttachment.update({where:{id:clave},data:{originalName:'cambio.png'}}));
 const cuenta=await prisma.accountReceivable.findUniqueOrThrow({where:{id:cuentaId}}),version=cuenta.updatedAt.toISOString()+"|0",uuid=randomUUID();
 const datos={cuentaId,clave:uuid,version,fecha:hoyOrden(),motivo:'Compromiso de prueba C3'};
 assert((await cambiarPromesa(datos)).ok);assert((await cambiarPromesa(datos)).ok);assert(!(await cambiarPromesa({...datos,motivo:'Otra intención'})).ok);
 assert(!(await cambiarPromesa({...datos,clave:randomUUID(),fecha:null})).ok);
 const actual=await prisma.accountReceivable.findUniqueOrThrow({where:{id:cuentaId}});
 const carrera=await Promise.all([1,2].map(i=>cambiarPromesa({...datos,clave:randomUUID(),version:actual.updatedAt.toISOString()+"|1",fecha:null,motivo:'Quitar promesa '+i})));assert.equal(carrera.filter(r=>r.ok).length,1);
 const base=await prisma.accountReceivable.findUniqueOrThrow({where:{id:cuentaId}});assert.equal(base.dueDate?.toISOString(),cuenta.dueDate?.toISOString());assert(base.amount.eq(cuenta.amount));
 assert(!(await cambiarPromesa({...datos,clave:randomUUID(),version:base.updatedAt.toISOString()+"|2",fecha:'2020-01-01'})).ok);
 const archivosAntes=await readdir(almacenComprobantes.directorio()),history=await prisma.paymentPromiseChange.count();
 await prisma.$executeRawUnsafe(`CREATE FUNCTION fallo_c3() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."resourceType" IN ('PaymentAttachment','PaymentPromiseChange') THEN RAISE EXCEPTION 'Fallo inducido C3'; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_c3 BEFORE INSERT ON "SecurityOperationAuthor" FOR EACH ROW EXECUTE FUNCTION fallo_c3()`);
 try{assert(!(await adjuntarComprobante(form())).ok);assert(!(await cambiarPromesa({...datos,clave:randomUUID(),version:base.updatedAt.toISOString()+"|2"})).ok);assert.equal(await prisma.paymentPromiseChange.count(),history);assert.deepEqual((await readdir(almacenComprobantes.directorio())).sort(),archivosAntes.sort());assert.deepEqual(await prisma.accountReceivable.findUniqueOrThrow({where:{id:cuentaId}}),base);}finally{await prisma.$executeRawUnsafe(`DROP TRIGGER fallo_c3 ON "SecurityOperationAuthor"`);await prisma.$executeRawUnsafe(`DROP FUNCTION fallo_c3()`);}
 assert.equal(await prisma.securityOperationAuthor.count({where:{resourceType:'PaymentAttachment',resourceId:clave}}),1);
 console.log('C3: adjuntos privados, límites/formato, UUID, inmutabilidad SQL, promesas/versiones/concurrencia, vencimiento intacto, autoría y rollback/limpieza correctos.');
 return {id:clave,bytes:bytes.toString('base64')};
}
