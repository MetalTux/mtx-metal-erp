import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { operarSeguridad, consultarSesionSeguridad, provisionarAdministrador } from "../src/lib/seguridad/servicio";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_clave8_\d{8}$/.test(u.pathname));
async function main(){
 await provisionarAdministrador({name:'Administrador ocho S6',email:'administrador-ocho@ejemplo.invalid',password:'Clave8!!'});
 const admin=await operarSeguridad({}, {action:'login',email:'administrador-ocho@ejemplo.invalid',password:'Clave8!!'});assert(admin.client.ok&&admin.sessionToken);
 const invite=await operarSeguridad({session:admin.sessionToken},{action:'user-create',name:'Usuario ocho',email:'usuario-ocho@ejemplo.invalid',roles:['VENTAS']});assert(invite.client.ok);
 const token=new URLSearchParams(new URL(String(invite.client.link)).hash.slice(1)).get('token');
 assert(!(await operarSeguridad({}, {action:'activate',token,password:'1234567'})).client.ok);
 assert((await operarSeguridad({}, {action:'activate',token,password:'Clave8!!'})).client.ok);
 const login=await operarSeguridad({}, {action:'login',email:'usuario-ocho@ejemplo.invalid',password:'Clave8!!'});assert(login.client.ok&&login.sessionToken);
 assert(!(await operarSeguridad({session:login.sessionToken},{action:'password',password:'1234567'})).client.ok);
 const change=await operarSeguridad({session:login.sessionToken},{action:'password',password:'Cambio8!'});assert(change.client.ok&&change.sessionToken);
 assert.equal(await consultarSesionSeguridad(login.sessionToken),null);
 const user=await prisma.userSecurity.findUniqueOrThrow({where:{normalizedEmail:'usuario-ocho@ejemplo.invalid'}});
 const reset=await operarSeguridad({session:admin.sessionToken},{action:'user-token',id:user.userId,version:user.securityVersion});assert(reset.client.ok);
 const resetToken=new URLSearchParams(new URL(String(reset.client.link)).hash.slice(1)).get('token');
 assert(!(await operarSeguridad({}, {action:'reset',token:resetToken,password:'1234567'})).client.ok);
 assert((await operarSeguridad({}, {action:'reset',token:resetToken,password:'Nueva8!!'})).client.ok);
 assert((await operarSeguridad({}, {action:'login',email:'usuario-ocho@ejemplo.invalid',password:'Nueva8!!'})).client.ok);
 console.log('Clave8: login del Administrador provisionado por el servicio local, activación, cambio y recuperación aceptan 8; 7 se rechaza sin consumir el enlace.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
