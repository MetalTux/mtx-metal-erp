// Regresión de componentes con transporte simulado: no inicia Next ni conecta a PostgreSQL.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
const require=createRequire(import.meta.url);
const postcss=createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind=require("@tailwindcss/postcss");
async function main(){
const destino=resolve(process.argv[2]??"var/validacion/grillas-gd7");
const temporal=await mkdtemp(join(tmpdir(),"mtx-grillas-"));
const resultados:{prueba:string;codigo:number|null}[]=[];
try {
 await mkdir(destino,{recursive:true});
 const archivo=resolve("src/app/globals.css");
 const css=await postcss([tailwind()]).process(await readFile(archivo,"utf8"),{from:archivo});
 const hoja=join(temporal,"grillas.css");await writeFile(hoja,css.css);
 for(const prueba of ["tests/requerimientos-produccion.ts","tests/seguridad-s4-cobertura.ts",...Array.from({length:5},(_,i)=>`tests/grillas-gd${i+2}.ui.ts`)]) {
  console.log(`\nEjecutando ${prueba}`);
  const codigo=await new Promise<number|null>((ok,error)=>{const hijo=spawn(process.execPath,["--import","tsx",prueba],{stdio:"inherit",env:{...process.env,GRILLAS_CSS:hoja,GRILLAS_EVIDENCIA_DIR:destino}});hijo.once("error",error);hijo.once("exit",ok);});
  resultados.push({prueba,codigo});
 }
 await writeFile(join(destino,"resultado.json"),JSON.stringify({fecha:new Date().toISOString(),alcance:"Componentes reales con CSS Tailwind local y transporte simulado. Sin servidor/BD; no sustituye aceptación ni integración.",resultados},null,2)+"\n");
 if(resultados.some(r=>r.codigo!==0))process.exitCode=1;
 console.log(`\nEvidencia: ${destino}`);
} finally {await rm(temporal,{recursive:true,force:true});}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
