// Procedimiento local interactivo; nunca recibe contraseña por argumento ni crea ruta pública.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { configuracionSeguridad } from "../src/lib/seguridad/configuracion";
import { mensajeErrorProvision } from "../src/lib/seguridad/errores-provision";
import { DESCRIPCION_LONGITUD_CLAVE } from "../src/config/politica-contrasenas";
let desconectar:()=>Promise<void>=async()=>{};
async function password(prompt:string):Promise<string>{
 stdout.write(prompt);stdin.setRawMode(true);stdin.resume();stdin.setEncoding("utf8");
 return new Promise((resolve,reject)=>{let value="";const handler=(chunk:string)=>{
  for(const c of chunk){if(c==="\u0003"||c==="\r"||c==="\n"){stdin.off("data",handler);stdin.setRawMode(false);stdin.pause();stdout.write("\n");if(c==="\u0003")reject(Error("Cancelado"));else resolve(value);return;}
   if(c==="\u007f"||c==="\b")value=value.slice(0,-1);else if(c>=" ")value+=c;
  }
 };stdin.on("data",handler);});
}
async function main(){
 configuracionSeguridad();
 if(!stdin.isTTY||!stdout.isTTY)throw Error("Ejecuta en una terminal local interactiva.");
 let u:URL;try{u=new URL(process.env.DATABASE_URL??"");}catch{throw Error("Falta DATABASE_URL o su formato no es válido.");}
 if(!["localhost","127.0.0.1"].includes(u.hostname))throw Error("La provisión inicial exige destino PostgreSQL local verificado.");
 const {prisma}=await import("../src/lib/prisma");desconectar=()=>prisma.$disconnect();
 const {provisionarAdministrador,recuperarAdministradorLocal}=await import("../src/lib/seguridad/servicio");
 const rl=createInterface({input:stdin,output:stdout});
 if(process.argv.includes("--recuperar")){
  const email=await rl.question("Correo del Administrador cuya identidad verificaste: ");
  const confirm=await rl.question(`Destino: ${u.pathname.slice(1)}. Escribe RECUPERAR para emitir un enlace privado de un uso: `);rl.close();
  if(confirm!=="RECUPERAR")throw Error("Cancelado");
  const r=await recuperarAdministradorLocal(email);stdout.write("Enlace privado (30 minutos). No elimina ni recupera el doble factor:\n"+r.link+"\n");return;
 }
 const name=await rl.question("Nombre del primer Administrador: "),email=await rl.question("Correo del titular verificado: ");
 const confirm=await rl.question(`Destino: ${u.pathname.slice(1)}. Escribe CREAR para provisionar la primera cuenta: `);rl.close();
 if(confirm!=="CREAR")throw Error("Cancelado");const p=await password(`Contraseña nueva (${DESCRIPCION_LONGITUD_CLAVE}; no se muestra): `),repeat=await password("Repite la contraseña: ");
 if(p!==repeat)throw Error("Las contraseñas no coinciden");await provisionarAdministrador({name,email,password:p});console.log("Administrador inicial provisionado. Ingresa por /ingresar y guarda tus códigos si activas doble factor.");
}
main().catch(error=>{
 if(error instanceof Error&&error.message==="Cancelado"){console.log("Operación cancelada.");return;}
 console.error("No se provisionó la cuenta: "+mensajeErrorProvision(error));process.exitCode=1;
}).finally(()=>desconectar());
