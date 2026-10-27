import { tipoNavegador, type MetadatosSeguridad } from "./metadatos";
import { DESCRIPCION_LONGITUD_CLAVE } from "@/config/politica-contrasenas";
import { hash, verify as verificarClave } from "@node-rs/argon2";
import { generateSecret, generateURI, verify as verificarTotp } from "otplib";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cifrarPrivado, descifrarPrivado, configuracionSeguridad, huellaToken, tokenAleatorio, claveLimite } from "./configuracion";
import { datosProvision, entradaSeguridad } from "./entradas";
import { tienePermiso } from "./permisos";

class ReautenticacionRequerida extends Error {}
type Tx=Prisma.TransactionClient;
export type ContextoSeguridad={session?:string;challenge?:string;ip?:string;browser?:string};
export type RespuestaSeguridad={client:Record<string,unknown>;sessionToken?:string;challengeToken?:string;clearSession?:boolean;clearChallenge?:boolean};
const fallo=(message="No fue posible completar la operación. Revisa los datos o inicia sesión de nuevo."):RespuestaSeguridad=>({client:{ok:false,message}});
const correcto=(data:Record<string,unknown>={}):RespuestaSeguridad=>({client:{ok:true,...data}});
function exigir(condition:unknown,message="Operación no disponible para tu sesión."):asserts condition {if(!condition)throw Error(message);}
const dummy=hash("Credencial interna inutilizable para comparación de tiempos",{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1});
const crearHash=(password:string)=>hash(password,{algorithm:2,memoryCost:19456,timeCost:2,parallelism:1});
const despues=(n:number)=>new Date(Date.now()+n);
async function bloqueo(tx:Tx){await tx.$executeRaw`SELECT pg_advisory_xact_lock(87244212)`;}
async function auditar(tx:Tx,c:ContextoSeguridad,action:string,actorUserId?:number,targetUserId?:number,result="CORRECTO",reference?:string){
 if(result==="RECHAZADO"&&await tx.securityAuditEvent.count({where:{actorUserId:actorUserId??null,targetUserId:targetUserId??null,action,result,ipAddress:c.ip??null,createdAt:{gte:new Date(Date.now()-300000)}}}))return;
 await tx.securityAuditEvent.create({data:{actorUserId,targetUserId,action,result,ipAddress:c.ip,browserType:tipoNavegador(c.browser),reference}});
}
async function limite(tx:Tx,key:string,max=10,minutes=15){
 const keyHash=claveLimite(key),now=new Date();const old=await tx.securityRateLimit.findUnique({where:{keyHash}});
 if(old&&old.expiresAt>now&&old.attempts>=max)return false;
 if(!old||old.expiresAt<=now)await tx.securityRateLimit.upsert({where:{keyHash},create:{keyHash,attempts:1,windowStart:now,expiresAt:despues(minutes*60000)},update:{attempts:1,windowStart:now,expiresAt:despues(minutes*60000),blockedUntil:null}});
 else await tx.securityRateLimit.update({where:{keyHash},data:{attempts:{increment:1}}});
 return true;
}
async function invalidar(tx:Tx,id:number){
 await tx.userSecurity.update({where:{userId:id},data:{securityVersion:{increment:1}}});
 await tx.securitySession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
 await tx.securityToken.deleteMany({where:{userId:id}});await tx.securityChallenge.deleteMany({where:{userId:id}});
}
async function nuevaSesion(tx:Tx,id:number,factor=false):Promise<RespuestaSeguridad>{
 const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:id}}),now=new Date(),token=tokenAleatorio();
 await tx.securitySession.create({data:{userId:id,tokenHash:huellaToken(token),securityVersion:u.securityVersion,authenticatedAt:now,reauthenticatedAt:now,secondFactorAt:factor?now:null,lastActivityAt:now,expiresAt:new Date(now.getTime()+8*3600000)}});
 await tx.userSecurity.update({where:{userId:id},data:{lastLoginAt:now}});
 return {...correcto(),sessionToken:token,clearChallenge:true};
}
async function contexto(tx:Tx,token?:string){
 if(!token||token.length>200)return null;
 const s=await tx.securitySession.findUnique({where:{tokenHash:huellaToken(token)}});
 const now=new Date();if(!s||s.revokedAt||s.expiresAt<=now||now.getTime()-s.lastActivityAt.getTime()>=3600000)return null;
 const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:s.userId}});
 if(u.status!=="ACTIVO"||u.securityVersion!==s.securityVersion)return null;
 const f=await tx.securitySecondFactor.findUnique({where:{userId:u.userId}});
 if(f?.enabledAt&&(!s.secondFactorAt||s.secondFactorAt<f.enabledAt))return null;
 const user=await tx.user.findUniqueOrThrow({where:{id:u.userId}});
 const roles=(await tx.userSecurityRole.findMany({where:{userId:u.userId}})).map(r=>r.role);
 return {s,u,f,user,roles};
}
async function probarFactor(tx:Tx,id:number,code:string,meta:MetadatosSeguridad={}){
 const f=await tx.securitySecondFactor.findUnique({where:{userId:id}});if(!f?.enabledAt)return false;
 if(/^\d{6}$/.test(code)){
  const payload=await descifrarPrivado(f.encryptedSecret,"totp");
  if(payload.userId!==id||typeof payload.secret!=="string")return false;
  const r=await verificarTotp({secret:payload.secret,token:code,epochTolerance:30,...(f.lastUsedStep===null?{}:{afterTimeStep:Number(f.lastUsedStep)})});
  if(!r.valid||!("timeStep" in r))return false;
  await tx.securitySecondFactor.update({where:{userId:id},data:{lastUsedStep:BigInt(r.timeStep)}});return true;
 }
 const backup=await tx.securityRecoveryCode.findUnique({where:{codeHash:huellaToken(code)}});
 if(!backup||backup.userId!==id||backup.consumedAt)return false;
 await tx.securityRecoveryCode.update({where:{id:backup.id},data:{consumedAt:new Date()}});await auditar(tx,meta,"CODIGO_RESPALDO_UTILIZADO",id,id);return true;
}
async function nuevosCodigos(tx:Tx,id:number){
 await tx.securityRecoveryCode.deleteMany({where:{userId:id}});
 const codes=Array.from({length:10},()=>randomBytes(16).toString("hex"));
 await tx.securityRecoveryCode.createMany({data:codes.map(c=>({userId:id,codeHash:huellaToken(c)}))});return codes;
}
async function tokenAcceso(tx:Tx,id:number,purpose:"ACTIVACION"|"RECUPERACION_CLAVE"){
 await tx.securityToken.deleteMany({where:{userId:id}});const raw=tokenAleatorio();
 await tx.securityToken.create({data:{userId:id,purpose,tokenHash:huellaToken(raw),expiresAt:despues(30*60000)}});return raw;
}
async function ultimoAdministrador(tx:Tx){
 const admins=await tx.userSecurityRole.findMany({where:{role:"ADMINISTRADOR"}});
 for(const a of admins){const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:a.userId}});
  if(u.status==="ACTIVO"&&((u.localAllowed&&u.passwordHash)||(u.googleAllowed&&await tx.securityIdentity.count({where:{userId:u.userId}})>0)))return;
 }
 throw Error("Debe permanecer al menos un Administrador activo con un método de acceso utilizable.");
}
// Invocable sólo por CLI local: no existe acción HTTP para este procedimiento.
export async function provisionarAdministrador(datos:unknown){
 configuracionSeguridad();const d=datosProvision.parse(datos),passwordHash=await crearHash(d.password);
 return prisma.$transaction(async tx=>{
  await bloqueo(tx);
  const admins=await tx.userSecurityRole.findMany({where:{role:"ADMINISTRADOR"}});
  for(const a of admins){const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:a.userId}});exigir(u.status!=="ACTIVO","Ya existe un Administrador activo. Usa Administración → Usuarios.");}
  const existing=await tx.userSecurity.findUnique({where:{normalizedEmail:d.email}});
  if(existing){exigir(existing.status==="PENDIENTE_ACTIVACION","La cuenta no admite provisión inicial.");exigir(!await tx.securitySecondFactor.count({where:{userId:existing.userId}}),"No se puede reemplazar un factor existente.");}
  const role=await tx.role.upsert({where:{name:"Administrador"},update:{},create:{name:"Administrador"}});
  const user=existing?await tx.user.update({where:{id:existing.userId},data:{name:d.name,password:"!INUTILIZABLE",roleId:role.id}}):await tx.user.create({data:{name:d.name,email:d.email,password:"!INUTILIZABLE",roleId:role.id}});
  await tx.userSecurity.upsert({where:{userId:user.id},create:{userId:user.id,normalizedEmail:d.email,status:"ACTIVO",passwordHash,passwordChangedAt:new Date()},update:{status:"ACTIVO",passwordHash,passwordChangedAt:new Date(),localAllowed:true,securityVersion:{increment:1}}});
  await tx.userSecurityRole.upsert({where:{userId_role:{userId:user.id,role:"ADMINISTRADOR"}},create:{userId:user.id,role:"ADMINISTRADOR"},update:{}});
  await auditar(tx,{},"ADMINISTRADOR_INICIAL",user.id,user.id);return {id:user.id};
 },{timeout:30000});
}
// Recuperación sólo desde CLI local; conserva factor, roles y estado.
export async function recuperarAdministradorLocal(email:unknown){
 configuracionSeguridad();const parsed=entradaSeguridad.parse({action:"recover",email});exigir(parsed.action==="recover");
 return prisma.$transaction(async tx=>{
  await bloqueo(tx);const u=await tx.userSecurity.findUnique({where:{normalizedEmail:parsed.email}});
  exigir(u?.status==="ACTIVO"&&u.localAllowed&&u.passwordHash,"La cuenta no admite recuperación administrativa local.");
  exigir(await tx.userSecurityRole.count({where:{userId:u.userId,role:"ADMINISTRADOR"}}),"La cuenta no es un Administrador activo.");
  const token=await tokenAcceso(tx,u.userId,"RECUPERACION_CLAVE");await auditar(tx,{},"RECUPERACION_ADMIN_LOCAL",undefined,u.userId);
  return {link:`${configuracionSeguridad().origin}/recuperar#token=${token}`};
 });
}
export async function consultarSesionSeguridad(token?:string, registrarActividad=false, meta:MetadatosSeguridad={}){
 if(!token)return null;
 return prisma.$transaction(async tx=>{const x=await contexto(tx,token);
 if(!x){const s=await tx.securitySession.findUnique({where:{tokenHash:huellaToken(token)}});if(s&&!s.revokedAt&&(s.expiresAt<=new Date()||Date.now()-s.lastActivityAt.getTime()>=3600000)){
 const cambio=await tx.securitySession.updateMany({where:{id:s.id,revokedAt:null},data:{revokedAt:new Date()}});if(cambio.count)await auditar(tx,meta,"SESION_EXPIRADA",undefined,s.userId);
 }}
 if(x&&registrarActividad)await tx.securitySession.update({where:{id:x.s.id},data:{lastActivityAt:new Date()}});return x?{id:x.u.userId,name:x.user.name,roles:x.roles}:null;});
}
export async function operarSeguridad(c:ContextoSeguridad,datos:unknown):Promise<RespuestaSeguridad>{
 configuracionSeguridad();const parsed=entradaSeguridad.safeParse(datos);if(!parsed.success)return fallo(`Revisa los campos: contraseña nueva de ${DESCRIPCION_LONGITUD_CLAVE} y datos válidos.`);
 const d=parsed.data;
 if(c.session)await consultarSesionSeguridad(c.session,false,c);
 // SMTP se procesa fuera de la tx; el resultado público nunca revela existencia.
 let correo: {email:string;token:string}|undefined;
 let actorAuditoria:number|undefined;
 try{
 const response=await prisma.$transaction(async tx=>{
  await bloqueo(tx);
  if(d.action==="login"){
   if(!await limite(tx,`login:cuenta:${d.email}`)||!await limite(tx,`login:origen:${c.ip??"desconocido"}`,100)){await auditar(tx,c,"LIMITE_INGRESO",undefined,undefined,"RECHAZADO");return fallo("Demasiados intentos. Espera 15 minutos y vuelve a intentar.");}
   const u=await tx.userSecurity.findUnique({where:{normalizedEmail:d.email}});
   const valid=await verificarClave(u?.passwordHash??await dummy,d.password).catch(()=>false);
   if(!u||!u.passwordHash||!valid||!u.localAllowed||u.status!=="ACTIVO") {await auditar(tx,c,"INGRESO_LOCAL",undefined,u?.userId,"RECHAZADO");return fallo("No pudimos iniciar sesión con estos datos.");}
   await tx.securityRateLimit.deleteMany({where:{keyHash:claveLimite(`login:cuenta:${d.email}`)}});
   const f=await tx.securitySecondFactor.findUnique({where:{userId:u.userId}});
   if(f?.enabledAt){const token=tokenAleatorio();await tx.securityChallenge.create({data:{userId:u.userId,purpose:"INGRESO_TOTP",tokenHash:huellaToken(token),securityVersion:u.securityVersion,expiresAt:despues(300000)}});
    return {...correcto({factor:true}),challengeToken:token,clearSession:true};}
   await auditar(tx,c,"INGRESO_LOCAL",u.userId,u.userId);return nuevaSesion(tx,u.userId);
  }
  if(d.action==="factor-login"){
   if(!await limite(tx,`factor:origen:${c.ip??"desconocido"}`,50))return fallo("Demasiados intentos. Espera 15 minutos.");
   const challenge=await tx.securityChallenge.findUnique({where:{tokenHash:huellaToken(c.challenge??"")}});
   if(!challenge||challenge.purpose!=="INGRESO_TOTP"||challenge.consumedAt||challenge.expiresAt<=new Date()||challenge.failedAttempts>=5){await auditar(tx,c,"DESAFIO_FACTOR_RECHAZADO",undefined,challenge?.userId,"RECHAZADO");return {...fallo("El desafío venció. Inicia sesión nuevamente."),clearChallenge:true};}
   const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:challenge.userId}});
   if(u.status!=="ACTIVO"||u.securityVersion!==challenge.securityVersion)return {...fallo(),clearChallenge:true};
   await tx.securityChallenge.update({where:{id:challenge.id},data:{failedAttempts:{increment:1}}});
   if(!await probarFactor(tx,u.userId,d.code,c)){await auditar(tx,c,"DESAFIO_FACTOR",undefined,u.userId,"RECHAZADO");return fallo("Código inválido, utilizado o vencido.");}
   await tx.securityChallenge.update({where:{id:challenge.id},data:{consumedAt:new Date()}});
   await auditar(tx,c,"INGRESO_CON_FACTOR",u.userId,u.userId);return nuevaSesion(tx,u.userId,true);
  }
  if(d.action==="recover"){
   const generic=correcto({message:"Si el acceso permite recuperación por correo y hay SMTP disponible, recibirás instrucciones. También puedes contactar al Administrador."});
   if(!await limite(tx,`recuperacion:${d.email}`,3)||!await limite(tx,`recuperacion:origen:${c.ip??"desconocido"}`,20))return generic;
   const u=await tx.userSecurity.findUnique({where:{normalizedEmail:d.email}});
   if(u?.status==="ACTIVO"&&u.localAllowed&&process.env.SMTP_HOST){const token=await tokenAcceso(tx,u.userId,"RECUPERACION_CLAVE");correo={email:u.normalizedEmail,token};await auditar(tx,c,"RECUPERACION_SOLICITADA",undefined,u.userId);}
   return generic;
  }
  if(d.action==="activate"||d.action==="reset"){
   if(!await limite(tx,`token:origen:${c.ip??"desconocido"}`,30))return fallo("Demasiados intentos. Espera 15 minutos.");
   const t=await tx.securityToken.findUnique({where:{tokenHash:huellaToken(d.token)}}),purpose=d.action==="activate"?"ACTIVACION":"RECUPERACION_CLAVE";
   if(!t||t.purpose!==purpose||t.consumedAt||t.expiresAt<=new Date()){await auditar(tx,c,"ENLACE_ACCESO_RECHAZADO",undefined,t?.userId,"RECHAZADO");return fallo("El enlace no es válido o venció. Solicita uno nuevo.");}
   const u=await tx.userSecurity.findUniqueOrThrow({where:{userId:t.userId}});
   if(!u.localAllowed||u.status==="INACTIVO"||(d.action==="activate"&&u.status!=="PENDIENTE_ACTIVACION")||(d.action==="reset"&&u.status!=="ACTIVO"))return fallo();
   await tx.securityToken.update({where:{id:t.id},data:{consumedAt:new Date()}});
   await tx.userSecurity.update({where:{userId:u.userId},data:{passwordHash:await crearHash(d.password),passwordChangedAt:new Date(),status:"ACTIVO"}});
   await tx.user.update({where:{id:u.userId},data:{password:"!INUTILIZABLE"}});await invalidar(tx,u.userId);
   await auditar(tx,c,d.action==="activate"?"CUENTA_ACTIVADA":"CLAVE_RECUPERADA",u.userId,u.userId);
   return {...correcto({message:"Contraseña guardada. Inicia sesión; tu doble factor se conserva."}),clearSession:true,clearChallenge:true};
  }
  const x=await contexto(tx,c.session);if(!x)return {client:{ok:false,loginRequired:true,message:"Tu sesión terminó. Inicia sesión para continuar."},clearSession:true};
  const {s,u,user,roles,f}=x;
  actorAuditoria=u.userId;
  if(d.action!=="self")await tx.securitySession.update({where:{id:s.id},data:{lastActivityAt:new Date()}});
  if(d.action==="logout"){await tx.securitySession.update({where:{id:s.id},data:{revokedAt:new Date()}});await auditar(tx,c,"SESION_CERRADA",u.userId);return {...correcto(),clearSession:true,clearChallenge:true};}
  if(d.action==="self"){
   const sessions=await tx.securitySession.findMany({where:{userId:u.userId,revokedAt:null,expiresAt:{gt:new Date()},lastActivityAt:{gt:new Date(Date.now()-3600000)}},orderBy:{createdAt:"desc"},take:100});
   return correcto({user:{id:u.userId,name:user.name,email:u.normalizedEmail,roles,version:u.securityVersion,factor:Boolean(f?.enabledAt),localAllowed:u.localAllowed},sessions:sessions.map(v=>({id:v.id,current:v.id===s.id,createdAt:v.createdAt.toISOString(),lastActivityAt:v.lastActivityAt.toISOString(),expiresAt:v.expiresAt.toISOString()}))});
  }
  if(!await limite(tx,`sesion:${s.id}`,100))return fallo("Demasiadas solicitudes. Espera 15 minutos.");
  if(d.action==="reauth"){
   if(!await limite(tx,`reauth:${u.userId}`,10))return fallo("Demasiados intentos. Espera 15 minutos.");
   if(!u.localAllowed||!u.passwordHash||!await verificarClave(u.passwordHash,d.password)||(f?.enabledAt&&!await probarFactor(tx,u.userId,d.code,c))){await auditar(tx,c,"REAUTENTICACION",u.userId,undefined,"RECHAZADO");return fallo("No se pudo confirmar tu identidad. Revisa contraseña y código.");}
   await tx.securitySession.update({where:{id:s.id},data:{reauthenticatedAt:new Date()}});await auditar(tx,c,"REAUTENTICACION",u.userId);return correcto({message:"Identidad confirmada durante 5 minutos."});
  }
  if(d.action==="sessions-revoke"){
   await tx.securitySession.updateMany({where:{userId:u.userId,id:d.id??{not:s.id},revokedAt:null},data:{revokedAt:new Date()}});
   await auditar(tx,c,"SESIONES_REVOCADAS",u.userId);return {...correcto(),...(d.id===s.id?{clearSession:true}: {})};
  }
  // Lista administrativa puede leerse sin pedir contraseña repetida; escrituras sí reautentican.
  if(d.action==="users"){
   exigir(tienePermiso(roles,"usuarios.administrar"));
   const where:Prisma.UserSecurityWhereInput={OR:[{normalizedEmail:{contains:d.query,mode:"insensitive"}},{user:{name:{contains:d.query,mode:"insensitive"}}}]};
   const total=await tx.userSecurity.count({where}),rows=await tx.userSecurity.findMany({where,select:{userId:true,normalizedEmail:true,status:true,securityVersion:true,localAllowed:true,googleAllowed:true,lastLoginAt:true},orderBy:{userId:"asc"},skip:(d.page-1)*20,take:20});
   const result=[];for(const row of rows){const usr=await tx.user.findUniqueOrThrow({where:{id:row.userId},select:{name:true}});const rr=await tx.userSecurityRole.findMany({where:{userId:row.userId}});result.push({...row,name:usr.name,lastLoginAt:row.lastLoginAt?.toISOString()??null,roles:rr.map(v=>v.role)});}
   return correcto({rows:result,total,page:d.page});
  }
  if(!s.reauthenticatedAt||Date.now()-s.reauthenticatedAt.getTime()>=300000)throw new ReautenticacionRequerida("Confirma tu identidad para continuar (máximo 5 minutos).");
  if(d.action==="password"){
   exigir(u.localAllowed,"No tienes acceso local habilitado.");
   await tx.userSecurity.update({where:{userId:u.userId},data:{passwordHash:await crearHash(d.password),passwordChangedAt:new Date()}});await invalidar(tx,u.userId);await auditar(tx,c,"CLAVE_CAMBIADA",u.userId);
   return nuevaSesion(tx,u.userId,Boolean(f?.enabledAt));
  }
  if(d.action==="factor-setup"){
   const secret=generateSecret(),setup=await cifrarPrivado({userId:u.userId,version:u.securityVersion,secret},"totp-setup","5m");
   await auditar(tx,c,"FACTOR_PREPARADO",u.userId);return correcto({setup,secret,uri:generateURI({issuer:"MTX Metal ERP",label:u.normalizedEmail,secret})});
  }
  if(d.action==="factor-enable"){
   const p=await descifrarPrivado(d.setup,"totp-setup");exigir(p.userId===u.userId&&p.version===u.securityVersion&&typeof p.secret==="string");
   const v=await verificarTotp({secret:p.secret,token:d.code,epochTolerance:30});exigir(v.valid&&"timeStep" in v,"Código de la aplicación inválido o vencido.");
   const encryptedSecret=await cifrarPrivado({userId:u.userId,secret:p.secret},"totp"),key=configuracionSeguridad().active,now=new Date();
   await tx.securitySecondFactor.upsert({where:{userId:u.userId},create:{userId:u.userId,encryptedSecret,encryptionKeyId:key,createdAt:now,enabledAt:now,lastUsedStep:BigInt(v.timeStep)},update:{encryptedSecret,encryptionKeyId:key,enabledAt:now,setupExpiresAt:null,lastUsedStep:BigInt(v.timeStep)}});
   const codes=await nuevosCodigos(tx,u.userId);await invalidar(tx,u.userId);await auditar(tx,c,"FACTOR_HABILITADO",u.userId);
   return {...await nuevaSesion(tx,u.userId,true),client:{ok:true,codes,message:"Guarda los códigos fuera de tu móvil. No se mostrarán otra vez."}};
  }
  if(d.action==="factor-disable"){
   await tx.securityRecoveryCode.deleteMany({where:{userId:u.userId}});await tx.securitySecondFactor.deleteMany({where:{userId:u.userId}});await invalidar(tx,u.userId);await auditar(tx,c,"FACTOR_DESHABILITADO",u.userId);return nuevaSesion(tx,u.userId);
  }
  if(d.action==="factor-codes"){
   exigir(f?.enabledAt,"Activa primero tu doble factor.");const codes=await nuevosCodigos(tx,u.userId);await invalidar(tx,u.userId);await auditar(tx,c,"CODIGOS_REGENERADOS",u.userId);
   return {...await nuevaSesion(tx,u.userId,true),client:{ok:true,codes,message:"Los códigos anteriores quedaron inválidos. Guarda este respaldo."}};
  }
  exigir(tienePermiso(roles,"usuarios.administrar"));
  if(d.action==="user-create"){
   exigir(!await tx.userSecurity.count({where:{normalizedEmail:d.email}}),"El correo ya existe. Consulta el usuario; no repitas el alta.");
   const role=await tx.role.upsert({where:{name:d.roles[0]},create:{name:d.roles[0]},update:{}});
   const nu=await tx.user.create({data:{name:d.name,email:d.email,password:"!INUTILIZABLE",roleId:role.id}});
   await tx.userSecurity.create({data:{userId:nu.id,normalizedEmail:d.email}});await tx.userSecurityRole.createMany({data:d.roles.map(role=>({userId:nu.id,role}))});
   const token=await tokenAcceso(tx,nu.id,"ACTIVACION");await auditar(tx,c,"USUARIO_INVITADO",u.userId,nu.id);
   return correcto({link:`${configuracionSeguridad().origin}/activar#token=${token}`,message:"Entrega este enlace privado al titular después de verificar su identidad. Vence en 30 minutos."});
  }
  const target=await tx.userSecurity.findUniqueOrThrow({where:{userId:d.id}});exigir(target.securityVersion===d.version,"El usuario cambió. Actualiza la lista antes de guardar.");
  if(d.action==="user-update"){
   exigir(d.status!=="PENDIENTE_ACTIVACION"||!target.passwordHash,"No se puede devolver una cuenta activada al estado de invitación.");
   exigir(d.status!=="ACTIVO"||Boolean(target.passwordHash&&target.localAllowed)||Boolean(target.googleAllowed&&await tx.securityIdentity.count({where:{userId:d.id}})),"Para habilitarlo debe completar primero su activación.");
   const rolesAnteriores=(await tx.userSecurityRole.findMany({where:{userId:d.id}})).map(r=>r.role).sort().join(",");
   await tx.user.update({where:{id:d.id},data:{name:d.name}});await tx.userSecurity.update({where:{userId:d.id},data:{status:d.status}});
   await tx.userSecurityRole.deleteMany({where:{userId:d.id}});await tx.userSecurityRole.createMany({data:d.roles.map(role=>({userId:d.id,role}))});
   await ultimoAdministrador(tx);await invalidar(tx,d.id);await auditar(tx,c,"USUARIO_MODIFICADO",u.userId,d.id);
   if(rolesAnteriores!==[...d.roles].sort().join(","))await auditar(tx,c,"ROLES_MODIFICADOS",u.userId,d.id);
   if(target.status!==d.status)await auditar(tx,c,d.status==="INACTIVO"?"USUARIO_DESACTIVADO":"ESTADO_USUARIO_MODIFICADO",u.userId,d.id);
   return {...correcto(),...(u.userId===d.id?{clearSession:true}: {})};
  }
  exigir(target.localAllowed&&target.status!=="INACTIVO","La cuenta no permite recuperar acceso local.");
  const purpose=target.status==="PENDIENTE_ACTIVACION"?"ACTIVACION":"RECUPERACION_CLAVE",token=await tokenAcceso(tx,d.id,purpose);
  await auditar(tx,c,"ENLACE_ACCESO_EMITIDO",u.userId,d.id);
  return correcto({link:`${configuracionSeguridad().origin}/${purpose==="ACTIVACION"?"activar":"recuperar"}#token=${token}`,message:"Enlace privado de un uso; entrega sólo al titular verificado. No elimina su doble factor."});
 },{timeout:30000,maxWait:10000});
 if(correo){const {enviarRecuperacion}=await import("./correo");await enviarRecuperacion(correo.email,correo.token).catch(()=>{});}
 return response;
 }catch(error){
  if(actorAuditoria)await prisma.$transaction(tx=>auditar(tx,c,"OPERACION_SEGURIDAD_RECHAZADA",actorAuditoria,undefined,"RECHAZADO",d.action)).catch(()=>{});
  if(error instanceof ReautenticacionRequerida)return {client:{ok:false,reauthRequired:true,message:error.message}};
  if(error instanceof Error&&["Operación no disponible para tu sesión.","Debe permanecer al menos un Administrador activo con un método de acceso utilizable.","El correo ya existe. Consulta el usuario; no repitas el alta.","Código de la aplicación inválido o vencido.","Activa primero tu doble factor.","El usuario cambió. Actualiza la lista antes de guardar.","Para habilitarlo debe completar primero su activación.","La cuenta no permite recuperar acceso local.","No tienes acceso local habilitado."].includes(error.message))return fallo(error.message);
  return fallo();
 }
}

/** Comparte el cerrojo de cambios de seguridad hasta confirmar la operación de negocio. */
export async function autorizarSesionEnTransaccion(tx: Tx, token: string | undefined, permiso: string) {
 await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(87244212)`;
 const x = await contexto(tx, token);
 if (!x || !tienePermiso(x.roles, permiso)) throw new Error("Tu sesión venció o ya no permite esta operación. Inicia sesión y revisa tus permisos.");
 return { id: x.u.userId, roles: x.roles };
}


export async function registrarDenegacionSeguridad(actorUserId:number, referencia:string, meta:MetadatosSeguridad={}) {
 if(!/^(?:[a-z_]+\.(?:leer|operar)|usuarios\.administrar|auditoria\.leer|seguridad:[a-z-]+)$/.test(referencia))return;
 await prisma.$transaction(async tx=>{
  await bloqueo(tx);
  const reciente=await tx.securityAuditEvent.count({where:{actorUserId,action:"ACCESO_DENEGADO",reference:referencia,createdAt:{gte:new Date(Date.now()-300000)}}});
  if(!reciente)await tx.securityAuditEvent.create({data:{actorUserId,action:"ACCESO_DENEGADO",result:"RECHAZADO",reference:referencia,ipAddress:meta.ip,browserType:tipoNavegador(meta.browser)}});
 });
}
export async function exigirReautenticacionEnTransaccion(tx:Tx,token:string|undefined) {
 const x=await contexto(tx,token);
 if(!x||!x.s.reauthenticatedAt||Date.now()-x.s.reauthenticatedAt.getTime()>300000)throw Error("Confirma tu identidad en Mi acceso antes de depurar (máximo 5 minutos).");
}
