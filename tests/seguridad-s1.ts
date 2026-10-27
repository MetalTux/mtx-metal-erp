// Verificación de decisiones de permisos y compatibilidad real de las dependencias S1.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash, verify as verificarClave } from "@node-rs/argon2";
import { generateSecret, generate, verify as verificarTotp } from "otplib";
import { EncryptJWT, jwtDecrypt } from "jose";
import { randomPKCECodeVerifier, calculatePKCECodeChallenge } from "openid-client";
import { tienePermiso, esTitularDelFactor } from "../src/lib/seguridad/permisos";
async function main() {
  const combinados = ["VENTAS","COBRANZA"];
  assert(tienePermiso(combinados,"cotizaciones.operar"));
  assert(tienePermiso(combinados,"cobranza.operar"));
  assert(tienePermiso(combinados,"facturas.operar"));
  assert(!tienePermiso(combinados,"inventario.operar"));
  assert(!tienePermiso(combinados,"costos.leer"));
  assert(!tienePermiso(["Administrador"],"usuarios.administrar"));
  assert(!tienePermiso([],"guias.leer"));
  assert(!tienePermiso(["ADMINISTRADOR"],"permiso.inventado"));
  assert(tienePermiso(["ADMINISTRADOR"],"auditoria.leer"));
  assert(tienePermiso(["CONSULTA_GERENCIA"],"costos.leer"));
  assert(!tienePermiso(["CONSULTA_GERENCIA"],"guias.operar"));
  assert(!tienePermiso(["CONSULTA_GERENCIA"],"auditoria.leer"));
  assert(!tienePermiso(["PRODUCCION_DESPACHO"],"precios.leer"));
  assert(tienePermiso(["PRODUCCION_DESPACHO"],"ordenes_cliente.leer"));
  assert(esTitularDelFactor(1,1)); assert(!esTitularDelFactor(1,2)); assert(!esTitularDelFactor(0,0));
  const clave=randomUUID(), h=await hash(clave,{algorithm:2 /* Argon2id; const enum externo incompatible con isolatedModules */,memoryCost:19456,timeCost:2,parallelism:1});
  assert(h.startsWith("$argon2id$"));assert(await verificarClave(h,clave));assert(!(await verificarClave(h,randomUUID())));
  const secret=generateSecret(), token=await generate({secret}); assert((await verificarTotp({secret,token})).valid);
  const verifier=randomPKCECodeVerifier(),challenge=await calculatePKCECodeChallenge(verifier);
  assert(verifier.length>=43);assert.equal(challenge.length,43);assert.notEqual(verifier,challenge);
  const key=randomBytes(32), encrypted=await new EncryptJWT({state:randomUUID()}).setProtectedHeader({alg:"dir",enc:"A256GCM"}).setIssuedAt().setExpirationTime("5m").encrypt(key);
  assert((await jwtDecrypt(encrypted,key)).payload.state);
  await assert.rejects(()=>jwtDecrypt(encrypted,randomBytes(32)));
  console.log("S1: unión de roles, lecturas sensibles, denegación por defecto, titularidad y bibliotecas Argon2id/TOTP/PKCE/JWE correctas. No acredita login ni autorización de rutas.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
