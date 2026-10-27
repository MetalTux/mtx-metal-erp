import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { datosProvision, entradaSeguridad } from "../src/lib/seguridad/entradas";
import { configuracionSeguridad, ErrorConfiguracionSeguridad, nombreCookieSeguridad } from "../src/lib/seguridad/configuracion";
import { mensajeErrorProvision } from "../src/lib/seguridad/errores-provision";
const values={name:"Administrador prueba",email:"prueba@ejemplo.invalid"};
assert(datosProvision.safeParse({...values,password:"Clave8!!"}).success);
const short=datosProvision.safeParse({...values,password:"1234567"});assert(!short.success);
if(!short.success)assert.match(mensajeErrorProvision(short.error),/8 a 128/);
assert(!datosProvision.safeParse({...values,password:"a".repeat(129)}).success);
for(const action of ["activate","reset","password"]){
 const extra=action==="password"?{}:{token:"token-de-prueba"};
 assert(entradaSeguridad.safeParse({action,...extra,password:"Clave8!!"}).success);
 assert(!entradaSeguridad.safeParse({action,...extra,password:"1234567"}).success);
}
const names=["SEGURIDAD_ORIGEN","SEGURIDAD_CLAVES","SEGURIDAD_CLAVE_ACTIVA"] as const;
const before=names.map(n=>process.env[n]);
try{
 for(const n of names)delete process.env[n];
 assert.throws(configuracionSeguridad,e=>e instanceof ErrorConfiguracionSeguridad&&/Falta SEGURIDAD_ORIGEN/.test(mensajeErrorProvision(e)));
 process.env.SEGURIDAD_ORIGEN="http://localhost:3030";
 assert.throws(configuracionSeguridad,e=>e instanceof ErrorConfiguracionSeguridad&&/Falta SEGURIDAD_CLAVES/.test(mensajeErrorProvision(e)));
 process.env.SEGURIDAD_CLAVES=JSON.stringify({prueba:randomBytes(32).toString("base64")});
 assert.throws(configuracionSeguridad,e=>e instanceof ErrorConfiguracionSeguridad&&/Falta SEGURIDAD_CLAVE_ACTIVA/.test(mensajeErrorProvision(e)));
 process.env.SEGURIDAD_CLAVE_ACTIVA="prueba";assert.equal(configuracionSeguridad().origin,"http://localhost:3030");
 assert.equal(nombreCookieSeguridad("sesion"),"mtx_sesion");
 for(const origen of ["https://ejemplo.invalid"," HTTPS://ejemplo.invalid ","h\nttps://ejemplo.invalid"]){
  process.env.SEGURIDAD_ORIGEN=origen;assert(configuracionSeguridad().secure);
  assert.equal(nombreCookieSeguridad("sesion"),"__Host-mtx_sesion");assert.equal(nombreCookieSeguridad("desafio"),"__Host-mtx_desafio");
 }
 const privateValue="valor-privado-no-mostrar";process.env.SEGURIDAD_CLAVES=privateValue;
 try{configuracionSeguridad();assert.fail();}catch(e){assert(!mensajeErrorProvision(e).includes(privateValue));assert.match(mensajeErrorProvision(e),/JSON/);}
 assert(!mensajeErrorProvision(new Error(privateValue)).includes(privateValue));
 assert.match(mensajeErrorProvision(new Error("Ya existe un Administrador activo. Usa Administración → Usuarios.")),/Ya existe/);
}finally{names.forEach((n,i)=>{if(before[i]===undefined)delete process.env[n];else process.env[n]=before[i];});}
console.log("Política 8–128 y diagnósticos seguros de provisión/configuración correctos.");
