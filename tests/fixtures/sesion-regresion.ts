import "dotenv/config";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { prisma } from "../../src/lib/prisma";
import { operarSeguridad } from "../../src/lib/seguridad/servicio";
import { conCredencialSeguridad } from "../../src/lib/seguridad/acceso";
const url=new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(url.hostname)&&/^\/mtx_validacion_[a-z0-9_]+$/.test(url.pathname),"Sólo copia local descartable");
const file=process.env.S6_PRUEBA!;assert(/^tests\/[a-z0-9-]+\.integration\.ts$/.test(file));
async function main(){
 const email=`regresion-${randomUUID()}@ejemplo.invalid`,password=randomUUID();
 const role=await prisma.role.upsert({where:{name:"Administrador de regresión S6"},create:{name:"Administrador de regresión S6"},update:{}});
 const user=await prisma.user.create({data:{name:"Actor de regresión S6",email,password:"!INUTILIZABLE",roleId:role.id}});
 await prisma.userSecurity.create({data:{userId:user.id,normalizedEmail:email,status:"ACTIVO",passwordHash:await hash(password,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1}),passwordChangedAt:new Date()}});
 await prisma.userSecurityRole.create({data:{userId:user.id,role:"ADMINISTRADOR"}});
 const login=await operarSeguridad({}, {action:"login",email,password});assert(login.client.ok&&login.sessionToken);
 // Los trabajos asíncronos iniciados al importar conservan la credencial ALS hasta terminar.
 await conCredencialSeguridad(login.sessionToken,()=>import(pathToFileURL(resolve(file)).href));
}
main().catch(async()=>{console.error("No se pudo preparar o ejecutar la credencial de regresión S6.");process.exitCode=1;await prisma.$disconnect();});
