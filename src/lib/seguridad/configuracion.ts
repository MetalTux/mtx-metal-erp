import { origenesSeguridad, origenPeticionSeguridad } from "./origenes-desarrollo";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";

export class ErrorConfiguracionSeguridad extends Error {
  constructor(message:string){super(message);this.name="ErrorConfiguracionSeguridad";}
}
export function configuracionSeguridad() {
  if(!process.env.SEGURIDAD_ORIGEN)throw new ErrorConfiguracionSeguridad("Falta SEGURIDAD_ORIGEN. Define la URL exacta del ERP en el entorno privado del servidor.");
  let origin:URL;
  try{origin=new URL(process.env.SEGURIDAD_ORIGEN);}catch{throw new ErrorConfiguracionSeguridad("SEGURIDAD_ORIGEN debe ser una URL absoluta válida.");}
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash
    || (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost","127.0.0.1"].includes(origin.hostname)))) throw new ErrorConfiguracionSeguridad("SEGURIDAD_ORIGEN exige HTTPS, sin ruta ni credenciales; HTTP sólo se admite en localhost o 127.0.0.1.");
  origenesSeguridad(origin.origin);
  if(!process.env.SEGURIDAD_CLAVES)throw new ErrorConfiguracionSeguridad("Falta SEGURIDAD_CLAVES. Configura claves privadas Base64 de 32 bytes; consulta docs/OPERACION-SEGURIDAD.md.");
  let keys:Record<string,string>;
  try{keys=z.record(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), z.string()).parse(JSON.parse(process.env.SEGURIDAD_CLAVES));}
  catch{throw new ErrorConfiguracionSeguridad("SEGURIDAD_CLAVES debe ser un objeto JSON de identificadores y claves Base64; no compartas su contenido.");}
  const active = process.env.SEGURIDAD_CLAVE_ACTIVA ?? "";
  if(!active)throw new ErrorConfiguracionSeguridad("Falta SEGURIDAD_CLAVE_ACTIVA. Indica el identificador de la clave que usará el servidor.");
  if (!Object.hasOwn(keys,active))throw new ErrorConfiguracionSeguridad("SEGURIDAD_CLAVE_ACTIVA no corresponde a una clave de SEGURIDAD_CLAVES.");
  if(Object.values(keys).some(v=>! /^[A-Za-z0-9+/]{43}=$/.test(v) || Buffer.from(v,"base64").length!==32)) throw new ErrorConfiguracionSeguridad("Las claves de SEGURIDAD_CLAVES deben codificar exactamente 32 bytes aleatorios en Base64.");
  return { origin:origin.origin, secure:origin.protocol==="https:", active, keys };
}
export function seguridadConfigurada() { try { configuracionSeguridad(); return true; } catch { return false; } }
export const tokenAleatorio = () => randomBytes(32).toString("base64url");
export const huellaToken = (v:string) => createHash("sha256").update(v).digest("hex");
export function claveLimite(v:string) { const c=configuracionSeguridad(); return createHmac("sha256",Buffer.from(c.keys[c.active],"base64")).update(v).digest("hex"); }
export async function cifrarPrivado(payload:Record<string,unknown>, purpose:string, expires?:string) {
  const c=configuracionSeguridad();
  const jwt=new EncryptJWT(payload).setProtectedHeader({alg:"dir",enc:"A256GCM",kid:c.active}).setIssuer(purpose==="totp"?"mtx-metal-erp-seguridad":c.origin).setAudience(purpose).setIssuedAt();
  if(expires)jwt.setExpirationTime(expires);
  return jwt.encrypt(Buffer.from(c.keys[c.active],"base64"));
}
export async function descifrarPrivado(value:string,purpose:string) {
  const c=configuracionSeguridad();
  const {payload}=await jwtDecrypt(value, header=> {
    const key=typeof header.kid==="string"?c.keys[header.kid]:undefined;
    if(!key)throw Error("Clave no disponible");return Buffer.from(key,"base64");
  },{issuer:purpose==="totp"?"mtx-metal-erp-seguridad":c.origin,audience:purpose,keyManagementAlgorithms:["dir"],contentEncryptionAlgorithms:["A256GCM"]});
  return payload;
}

export function nombreCookieSeguridad(tipo:"sesion"|"desafio", headers?: Pick<Headers, "get">) {
  // Usar la misma normalización de URL que la configuración, también con HTTPS en mayúsculas.
  let seguro=false;
  try { const principal = process.env.SEGURIDAD_ORIGEN ?? ""; seguro = new URL(headers ? origenPeticionSeguridad(headers, principal) : principal).protocol === "https:"; } catch {}
  return (seguro?"__Host-":"")+`mtx_${tipo}`;
}
