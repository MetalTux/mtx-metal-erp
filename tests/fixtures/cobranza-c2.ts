import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { registrarAbono, anularAbono } from "../../src/lib/servicios/cobranza";
import { operarSeguridad } from "../../src/lib/seguridad/servicio";
import { credencialServidor, conCredencialSeguridad } from "../../src/lib/seguridad/acceso";
import { hoyOrden } from "../../src/lib/servicios/ordenes-compra-cliente";
export async function probarC2(cuentaId:number) {
 const destino=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(destino.hostname)&&/^\/mtx_validacion_cobranza_c1_\d{8}$/.test(destino.pathname));
 const antes=await prisma.payment.count(), hoy=hoyOrden();
 const datos={cuentaId,importe:"100.50",fecha:hoy,medio:"Transferencia",referencia:"C2",clave:randomUUID()};
 await assert.rejects(()=>conCredencialSeguridad("invalida",()=>registrarAbono(datos)),/NEXT_REDIRECT/);
 const admin=await credencialServidor();assert(admin);const password=randomUUID(),email=`c2-${randomUUID()}@ejemplo.invalid`;
 async function actor(rol:string){const correo=rol+email;const invitacion=await operarSeguridad({session:admin},{action:"user-create",name:"Actor C2 "+rol,email:correo,roles:[rol]});assert(invitacion.client.ok);const token=new URLSearchParams(new URL(String(invitacion.client.link)).hash.slice(1)).get("token");assert((await operarSeguridad({},{action:"activate",token,password})).client.ok);const login=await operarSeguridad({},{action:"login",email:correo,password});assert(login.sessionToken);return login.sessionToken;}
 const ventas=await actor("VENTAS"),cobranza=await actor("COBRANZA");
 await assert.rejects(()=>conCredencialSeguridad(ventas,()=>registrarAbono(datos)),/NEXT_REDIRECT/);
 const resultados=await Promise.all([conCredencialSeguridad(cobranza,()=>registrarAbono(datos)),registrarAbono({...datos,importe:"0100.50"})]);
 assert(resultados.every(r=>r.ok));assert.equal(resultados[0].pagoId,resultados[1].pagoId);assert.equal(await prisma.payment.count(),antes+1);
 assert(!(await registrarAbono({...datos,importe:"100.51"})).ok);
 assert(!(await registrarAbono({...datos,clave:randomUUID(),importe:"0"})).ok);
 assert(!(await registrarAbono({...datos,clave:randomUUID(),fecha:"9999-01-01"})).ok);
 const pagoId=resultados[0].pagoId!;const original=await prisma.payment.findUniqueOrThrow({where:{id:pagoId}});
 assert((await anularAbono({pagoId,motivo:"Corrección de prueba C2"})).ok);
 const baja=await prisma.payment.findUniqueOrThrow({where:{id:pagoId}});
 assert((await anularAbono({pagoId,motivo:"Corrección de prueba C2"})).ok);assert(!(await anularAbono({pagoId,motivo:"Otro motivo"})).ok);
 assert.deepEqual(await prisma.payment.findUniqueOrThrow({where:{id:pagoId}}),baja);
 assert((await registrarAbono(datos)).ok);assert.equal((await prisma.payment.findUniqueOrThrow({where:{id:pagoId}})).voidedAt!.getTime(),baja.voidedAt!.getTime());
 assert(original.amount.eq(baja.amount));assert.equal(original.paidAt.getTime(),baja.paidAt.getTime());
 const cuentaAnulada=await prisma.accountReceivable.findFirstOrThrow({where:{voidedAt:{not:null}}});assert(!(await registrarAbono({...datos,cuentaId:cuentaAnulada.id,clave:randomUUID()})).ok);
 const total=await registrarAbono({...datos,importe:"728.75",clave:randomUUID()});assert(total.ok);assert(!(await registrarAbono({...datos,importe:"0.01",clave:randomUUID()})).ok);assert((await anularAbono({pagoId:total.pagoId!,motivo:"Restaurar pago completo de prueba"})).ok);
 const carrera=await Promise.all([1,2].map(()=>registrarAbono({...datos,importe:"500",clave:randomUUID()})));
 assert.equal(carrera.filter(r=>r.ok).length,1);assert((await anularAbono({pagoId:carrera.find(r=>r.ok)!.pagoId!,motivo:"Restaurar saldo de prueba"})).ok);
 const rollback={...datos,clave:randomUUID(),referencia:"ROLLBACK-C2"};
 await prisma.$executeRawUnsafe(`CREATE FUNCTION fallo_c2() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."resourceType"='Payment' AND EXISTS(SELECT 1 FROM "Payment" WHERE id::text=NEW."resourceId" AND reference='ROLLBACK-C2') THEN RAISE EXCEPTION 'Fallo inducido C2'; END IF; RETURN NEW; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_c2 BEFORE INSERT ON "SecurityOperationAuthor" FOR EACH ROW EXECUTE FUNCTION fallo_c2()`);
 try {assert(!(await registrarAbono(rollback)).ok);assert.equal(await prisma.payment.count({where:{idempotencyKey:rollback.clave}}),0);}finally{await prisma.$executeRawUnsafe(`DROP TRIGGER fallo_c2 ON "SecurityOperationAuthor"`);await prisma.$executeRawUnsafe(`DROP FUNCTION fallo_c2()`);}
 const recuperado=await registrarAbono(rollback);assert(recuperado.ok);assert((await anularAbono({pagoId:recuperado.pagoId!,motivo:"Restaurar prueba rollback"})).ok);
 const autores=await prisma.securityOperationAuthor.findMany({where:{resourceType:"Payment",resourceId:String(pagoId)}});assert.equal(autores.length,2);assert(autores.every(a=>a.actorUserId>0));
 console.log("C2: UUID/contenido, reintento tras anular, motivo inmutable, concurrencia/sobrepago, fecha/importe inválidos, sesión inválida, rollback y autoría correctos.");
}
