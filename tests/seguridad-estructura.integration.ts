// Sólo copia S1: prueba restricciones, no servicios de login que aún no existen.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma";
const u=new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s1_\d{8}$/.test(u.pathname),"Sólo copia local descartable S1");
const digest=()=>createHash("sha256").update(randomUUID()).digest("hex");
async function main(){
 const heredados=await prisma.userSecurity.findMany();
 assert(heredados.every(x=>x.status==="PENDIENTE_ACTIVACION"&&x.passwordHash===null&&x.passwordChangedAt===null));
 assert.equal(await prisma.securitySession.count(),0);assert.equal(await prisma.securityIdentity.count(),0);
 let checks=0;
 const retirarFixtures=new Error("RETIRAR_FIXTURES_S1");
 await prisma.$transaction(async tx=>{
  async function falla(accion:()=>Promise<unknown>){
   await tx.$executeRawUnsafe("SAVEPOINT rechazo_s1");
   await assert.rejects(accion);await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT rechazo_s1");
   await tx.$executeRawUnsafe("RELEASE SAVEPOINT rechazo_s1");checks++;
  }
  const role=await tx.role.findFirstOrThrow();
  const a=await tx.user.create({data:{name:"Usuario de prueba S1",email:`${randomUUID()}@ejemplo.invalid`,password:"INUTILIZABLE",roleId:role.id}});
  const b=await tx.user.create({data:{name:"Segundo usuario S1",email:`${randomUUID()}@ejemplo.invalid`,password:"INUTILIZABLE",roleId:role.id}});
  const datos={userId:a.id,normalizedEmail:a.email};await tx.userSecurity.create({data:datos});
  await tx.userSecurity.create({data:{userId:b.id,normalizedEmail:b.email}});
  await tx.userSecurityRole.createMany({data:[{userId:a.id,role:"VENTAS"},{userId:a.id,role:"COBRANZA"}]});
  await falla(()=>tx.userSecurityRole.create({data:{userId:a.id,role:"VENTAS"}}));
  await falla(()=>tx.userSecurity.update({where:{userId:a.id},data:{normalizedEmail:a.email.toUpperCase()}}));
  await falla(()=>tx.userSecurity.update({where:{userId:a.id},data:{securityVersion:0}}));
  await falla(()=>tx.userSecurity.update({where:{userId:a.id},data:{localAllowed:false,googleAllowed:false}}));
  await falla(()=>tx.userSecurity.update({where:{userId:a.id},data:{passwordHash:"texto-no-admitido",passwordChangedAt:new Date()}}));
  await falla(()=>tx.userSecurity.update({where:{userId:b.id},data:{normalizedEmail:a.email}}));
  const identidad={userId:a.id,provider:"GOOGLE",subject:randomUUID(),verifiedEmail:a.email};await tx.securityIdentity.create({data:identidad});
  await falla(()=>tx.securityIdentity.create({data:{...identidad,userId:b.id}}));
  await falla(()=>tx.securityIdentity.create({data:{...identidad,subject:randomUUID()}}));
  await falla(()=>tx.securityIdentity.create({data:{...identidad,userId:b.id,subject:randomUUID(),provider:"OTRO"}}));
  const now=new Date(),plus=(ms:number)=>new Date(now.getTime()+ms);
  const sesion={userId:a.id,tokenHash:digest(),securityVersion:1,authenticatedAt:now,lastActivityAt:now,expiresAt:plus(8*3600000)};
  await tx.securitySession.create({data:sesion});
  await falla(()=>tx.securitySession.create({data:{...sesion,tokenHash:digest(),expiresAt:plus(8*3600000+1)}}));
  await falla(()=>tx.securitySession.create({data:{...sesion,tokenHash:"no-es-hash"}}));
  await falla(()=>tx.securitySession.create({data:sesion}));
  const token=await tx.securityToken.create({data:{userId:a.id,purpose:"RECUPERACION_CLAVE",tokenHash:digest(),createdAt:now,expiresAt:plus(1800000)}});
  await falla(()=>tx.securityToken.update({where:{id:token.id},data:{consumedAt:plus(1800001)}}));
  await falla(()=>tx.securityChallenge.create({data:{userId:a.id,purpose:"INGRESO_TOTP",tokenHash:digest(),securityVersion:1,failedAttempts:-1,createdAt:now,expiresAt:plus(300000)}}));
  await falla(()=>tx.securitySecondFactor.create({data:{userId:a.id,encryptedSecret:"cifrado-de-prueba",encryptionKeyId:"clave-prueba",createdAt:now}}));
  await tx.securitySecondFactor.create({data:{userId:a.id,encryptedSecret:"cifrado-de-prueba",encryptionKeyId:"clave-prueba",createdAt:now,setupExpiresAt:plus(300000)}});
  const code=await tx.securityRecoveryCode.create({data:{userId:a.id,codeHash:digest()}});
  await falla(()=>tx.securityRecoveryCode.create({data:{userId:b.id,codeHash:code.codeHash}}));
  await falla(()=>tx.securityRateLimit.create({data:{keyHash:digest(),attempts:-1,windowStart:now,expiresAt:plus(60000)}}));
  const ev=await tx.securityAuditEvent.create({data:{actorUserId:a.id,action:"PRUEBA_S1",result:"CORRECTO",ipAddress:"127.0.0.1"}});
  await falla(()=>tx.securityAuditEvent.update({where:{id:ev.id},data:{action:"ALTERADO"}}));
  await falla(()=>tx.securityAuditEvent.delete({where:{id:ev.id}}));
  const old=await tx.securityAuditEvent.create({data:{actorUserId:a.id,action:"PRUEBA_S1_ANTERIOR",result:"CORRECTO",createdAt:new Date("2020-01-01T00:00:00Z")}});
  await tx.securityAuditEvent.delete({where:{id:old.id}});
  const author=await tx.securityOperationAuthor.create({data:{actorUserId:a.id,operationKey:randomUUID(),resourceType:"PRUEBA_S1",resourceId:"1",action:"CREAR"}});
  await falla(()=>tx.securityOperationAuthor.update({where:{id:author.id},data:{actorUserId:b.id}}));
  await falla(()=>tx.securityOperationAuthor.delete({where:{id:author.id}}));
  await falla(()=>tx.securityOperationAuthor.create({data:{actorUserId:b.id,operationKey:author.operationKey,resourceType:author.resourceType,resourceId:"otro",action:"CREAR"}}));
  await falla(()=>tx.user.delete({where:{id:a.id}}));
  throw retirarFixtures;
 },{timeout:30000}).catch(e=>{if(e!==retirarFixtures)throw e;});
 console.log(JSON.stringify({ok:true,checks,heredados:heredados.length,message:"S1: backfill sin credenciales activas, roles múltiples, unicidad, CHECK, FK, retención y autoría inmutable verificados"}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
