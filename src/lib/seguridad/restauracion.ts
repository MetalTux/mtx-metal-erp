import { prisma } from "@/lib/prisma";
/** Mantenimiento local tras restaurar, sin método HTTP ni sustitución del titular del factor. */
export async function revocarAccesosRestaurados(aplicar=false){
 if(!aplicar)return {sesiones:await prisma.securitySession.count({where:{revokedAt:null}}),enlaces:await prisma.securityToken.count(),desafios:await prisma.securityChallenge.count(),usuarios:await prisma.userSecurity.count()};
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(87244212)`;
  const sesiones=await tx.securitySession.updateMany({where:{revokedAt:null},data:{revokedAt:new Date()}});
  const enlaces=await tx.securityToken.deleteMany(),desafios=await tx.securityChallenge.deleteMany();
  const usuarios=await tx.userSecurity.updateMany({data:{securityVersion:{increment:1}}});
  await tx.securityAuditEvent.create({data:{action:"ACCESOS_REVOCADOS_RESTAURACION",result:"CORRECTO",reference:"Proceso del sistema. Revocación tras restauración; factores y códigos personales conservados."}});
  return {sesiones:sesiones.count,enlaces:enlaces.count,desafios:desafios.count,usuarios:usuarios.count};
 });
}
