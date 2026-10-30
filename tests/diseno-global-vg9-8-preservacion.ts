// Auditoría de fuentes y bytes locales; sólo escribe evidencia. Sin cliente Prisma, Next o BD.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import ts from 'typescript';
const git=(...args:string[])=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const lista=(...args:string[])=>git(...args).toString().split('\0').filter(Boolean);
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const destino=resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg9-8');
const base=git('rev-parse',process.env.VG9_8_BASE??'HEAD').toString().trim();
const impresor=ts.createPrinter({removeComments:true});
function llamadas(texto:string,archivo:string){
  const sf=ts.createSourceFile(archivo,texto,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nombres=new Map<string,string>();
  for(const n of sf.statements)if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)){
    const origen=n.moduleSpecifier.text;
    if(!(/actions$/.test(origen)||/^@\/lib\/(servicios|consultas)\//.test(origen)||/^@\/lib\/seguridad\//.test(origen)||origen==='./cliente'||origen==='@/components/seguridad/cliente'))continue;
    const bindings=n.importClause?.namedBindings;
    if(bindings&&ts.isNamedImports(bindings))for(const e of bindings.elements)nombres.set(e.name.text,origen+'#'+(e.propertyName?.text??e.name.text));
  }
  const r:string[]=[];
  function visitar(n:ts.Node){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&nombres.has(n.expression.text))r.push(nombres.get(n.expression.text)+'('+n.arguments.map(a=>impresor.printNode(ts.EmitHint.Expression,a,sf)).join(',')+')');ts.forEachChild(n,visitar)}
  visitar(sf);return r.sort();
}
async function pdfs(){
  const r:{area:string;id:string;bytes:number;sha256:string;cabeceraPdf:boolean}[]=[];
  for(const [area,variable,defecto] of [['cotizaciones','COTIZACION_PDF_DIR','var/cotizaciones/pdfs'],['trabajos','TRABAJO_PDF_DIR','var/trabajos/pdfs'],['guias','GUIA_PDF_DIR','var/guias/pdfs']]){
    const carpeta=resolve(process.env[variable]||defecto);
    let entradas;try{entradas=await readdir(carpeta,{withFileTypes:true})}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e}
    for(const entrada of entradas)if(entrada.isFile()&&entrada.name.toLowerCase().endsWith('.pdf')){const b=await readFile(join(carpeta,entrada.name));r.push({area,id:sha(entrada.name).slice(0,20),bytes:b.length,sha256:sha(b),cabeceraPdf:b.subarray(0,5).toString()==='%PDF-'})}
  }
  return r.sort((a,b)=>(a.area+a.id).localeCompare(b.area+b.id));
}
async function main(){
 await mkdir(destino,{recursive:true});
 const antes=await pdfs();await writeFile(join(destino,'pdfs-antes.json'),JSON.stringify({fecha:new Date().toISOString(),archivos:antes},null,2)+'\n');
 const rutas=['prisma','src/lib','src/config','src/app/api'];
 const protegidos=[...new Set([...lista('ls-files','-z','--',...rutas),...lista('ls-files','-z','--','src/app').filter(f=>f.endsWith('actions.ts'))])];
 const nuevos=[...lista('ls-files','--others','--exclude-standard','-z','--',...rutas),...lista('ls-files','--others','--exclude-standard','-z','--','src/app').filter(f=>f.endsWith('actions.ts'))];
 assert.deepEqual(nuevos,[],'Fuentes nuevas en áreas protegidas requieren revisión');
 const huellas=[];
 for(const archivo of protegidos){const actual=await readFile(archivo),anterior=git('show',base+':'+archivo);assert.equal(sha(actual),sha(anterior),'Cambio protegido: '+archivo);huellas.push({archivo,sha256:sha(actual)})}
 const modificados=lista('diff','--name-only','-z',base,'--','src').filter(f=>/\.[tj]sx?$/.test(f));
 const contratos=[];
 for(const archivo of modificados){const anterior=llamadas(git('show',base+':'+archivo).toString(),archivo),actual=llamadas(await readFile(archivo,'utf8'),archivo);contratos.push({archivo,llamadas:actual.length,iguales:JSON.stringify(actual)===JSON.stringify(anterior),antes:anterior,despues:actual})}
 const diferencias=contratos.filter(c=>!c.iguales);
 await writeFile(join(destino,'contratos.json'),JSON.stringify({base,archivos:contratos,diferencias},null,2)+'\n');
 assert.deepEqual(diferencias.map(c=>c.archivo),[],'Llamadas alteradas requieren revisión manual del contrato');
 const despues=await pdfs();assert.deepEqual(despues,antes,'Cambios de archivos durante la auditoría');assert(antes.every(p=>p.cabeceraPdf),'Archivo con extensión PDF sin cabecera PDF');
 await writeFile(join(destino,'pdfs-despues.json'),JSON.stringify({fecha:new Date().toISOString(),archivos:despues},null,2)+'\n');
 const resultado={ok:true,base,alcance:'Fuentes protegidas idénticas a Git; sintaxis de llamadas importadas, no equivalencia integral. PDF locales iguales durante esta auditoría; sin baseline anterior al rediseño ni validación de BD.',protegidos:huellas,interfacesRevisadas:contratos.length,llamadasRevisadas:contratos.reduce((s,c)=>s+c.llamadas,0),pdfs:{total:antes.length,porArea:antes.reduce<Record<string,number>>((r,p)=>({...r,[p.area]:(r[p.area]??0)+1}),{}),sinCambiosDuranteAuditoria:true},manualPdfFueraDeAlcance:'docs/MANUAL-USUARIO.pdf es una exportación editable, no un documento comercial histórico'};
 await writeFile(join(destino,'resultado.json'),JSON.stringify(resultado,null,2)+'\n');
 console.log(JSON.stringify({ok:true,base,fuentesProtegidas:huellas.length,interfaces:contratos.length,llamadas:resultado.llamadasRevisadas,pdfs:resultado.pdfs},null,2));
}
async function cerrar(){
 const antes=JSON.parse(await readFile(join(destino,'pdfs-antes.json'),'utf8')) as {archivos:Awaited<ReturnType<typeof pdfs>>};
 const resultado=JSON.parse(await readFile(join(destino,'resultado.json'),'utf8')) as {protegidos:{archivo:string;sha256:string}[];cierre?:object};
 const despues=await pdfs();assert.deepEqual(despues,antes.archivos,'Los PDF cambiaron durante las comprobaciones');
 for(const h of resultado.protegidos)assert.equal(sha(await readFile(h.archivo)),h.sha256,'Cambió una fuente protegida: '+h.archivo);
 const fecha=new Date().toISOString();await writeFile(join(destino,'pdfs-despues.json'),JSON.stringify({fecha,archivos:despues},null,2)+'\n');
 resultado.cierre={fecha,pdfsIguales:true,fuentesProtegidasIguales:true};await writeFile(join(destino,'resultado.json'),JSON.stringify(resultado,null,2)+'\n');
 console.log('Cierre: PDF y fuentes protegidas conservados durante las comprobaciones; sin escrituras de negocio.');
}
(process.argv.includes('--comprobar-cierre')?cerrar():main()).catch(e=>{console.error(e);process.exitCode=1});
