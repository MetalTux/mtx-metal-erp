import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recuperarAdministradorLocal, operarSeguridad } from "../src/lib/seguridad/servicio";
import { prisma } from "../src/lib/prisma";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s2_\d{8}$/.test(u.pathname));
async function main(){
 const f=JSON.parse(await readFile('/tmp/mtx-s2-ui.json','utf8')) as {email:string;password:string;otherEmail:string};
 await assert.rejects(()=>recuperarAdministradorLocal(f.otherEmail));
 const user=await prisma.userSecurity.findUniqueOrThrow({where:{normalizedEmail:f.email}}),factor=await prisma.securitySecondFactor.findUnique({where:{userId:user.userId}});
 const r=await recuperarAdministradorLocal(f.email);assert(r.link.includes('#token='));
 assert.deepEqual(await prisma.userSecurity.findUniqueOrThrow({where:{userId:user.userId}}),user);
 assert.deepEqual(await prisma.securitySecondFactor.findUnique({where:{userId:user.userId}}),factor);
 const token=new URLSearchParams(new URL(r.link).hash.slice(1)).get('token');
 assert((await operarSeguridad({}, {action:'reset',token,password:f.password})).client.ok);
 assert.deepEqual(await prisma.securitySecondFactor.findUnique({where:{userId:user.userId}}),factor);
 assert(!(await operarSeguridad({}, {action:'reset',token,password:f.password})).client.ok);
 console.log('S2: recuperación local sólo de Administrador activo, enlace único y factor/roles/estado conservados.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
