import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
const walk=(d:string):string[]=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const inventario=readFileSync("docs/SEGURIDAD-S1-INVENTARIO.md","utf8");
let actions=0,pages=0,files=0;
for(const f of walk("src/app/(app)")){
 if(!/\/(page\.tsx|.*actions\.ts)$/.test(f))continue;
 const s=readFileSync(f,"utf8"),sf=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const n of sf.statements){
  if(!ts.isFunctionDeclaration(n)||!n.body||!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
  if(f.endsWith("actions.ts")){
   const rel=f.slice("src/".length),name=n.name!.text;
   const line=inventario.split("\n").find(l=>l.includes('`'+rel+'`')&&l.includes('`'+name+'`'));
   assert(line,`Falta inventariar ${f}#${name}`);
   const perm=line.match(/`([a-z_]+\.(?:leer|operar|administrar))`/)?.[1];assert(perm);
   const body=n.body.getText(sf);assert(body.includes(`exigirAcceso("${perm}", true)`),`${f}#${name}: permiso`);
   assert(body.includes("await exigirOrigenAccion()"),`${f}#${name}: origen`);actions++;
  }else{assert(/exigirAcceso|consultarSesionSeguridad/.test(n.body.getText(sf)),f);pages++;}
 }
}
for(const f of walk("src/app/api").filter(f=>f.endsWith("route.ts")&&!f.includes("/seguridad/"))){assert(readFileSync(f,"utf8").includes("await accesoArchivo("),f);files++;}
assert.equal(actions,93);assert.equal(files,7);assert(pages>=25);
console.log(`Cobertura S4: ${actions} acciones con permiso/origen, ${pages} páginas y ${files} rutas de archivos protegidas.`);
// Los auxiliares de transacción reciben un cliente de servidor y no son entradas HTTP.
const auxiliares = new Set(["cantidadReservadaRecurso","exigirCoberturaReservas","reservarPlanTrabajoEnTransaccion","datosBancariosParaCotizacion","asignarFolio","ivaParaDocumento","aprobarCotizacionEnTransaccion","cargarOfertaOrden","leerCompromisoParaTrabajo","tieneReferenciaHistoricaPlan"]);
let servicios=0;
for(const dir of ["src/lib/servicios","src/lib/consultas"])for(const file of walk(dir)){
 const source=readFileSync(file,"utf8"),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 for(const n of sf.statements)if(ts.isFunctionDeclaration(n)&&n.body&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&n.modifiers.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)&&!auxiliares.has(n.name!.text)){
  assert(n.body.getText(sf).includes("await exigirAcceso("),`${file}#${n.name!.text}`);servicios++;
 }
}
assert.equal(servicios,127);console.log(`${servicios} entradas asíncronas de servicios y consultas con autorización de servidor.`);
