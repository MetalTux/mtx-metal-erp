import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { operarSeguridad } from "../src/lib/seguridad/servicio";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s2_\d{8}$/.test(u.pathname));
async function main(){
 const role=await prisma.role.findFirstOrThrow();const email=`sin-clave-${randomUUID()}@ejemplo.invalid`;
 const user=await prisma.user.create({data:{name:'Sin credencial S2',email,password:'!INUTILIZABLE',roleId:role.id}});
 await prisma.userSecurity.create({data:{userId:user.id,normalizedEmail:email,status:'ACTIVO',localAllowed:true}});
 const r=await operarSeguridad({}, {action:'login',email,password:'Credencial interna inutilizable para comparación de tiempos'});
 assert(!r.client.ok);assert(!r.sessionToken);assert.equal(await prisma.securitySession.count({where:{userId:user.id}}),0);
 console.log('S2: una cuenta sin hash local no autentica mediante la comparación ficticia de tiempos, aun si figura activa.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
