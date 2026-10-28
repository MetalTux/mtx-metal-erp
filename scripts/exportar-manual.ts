// Exportación local del Markdown del manual: sin conexiones externas ni documentos de negocio.
import { readFile, rename, rm } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { chromium } from "playwright";
const escapar=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const slug=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,"").trim().replace(/\s+/g,"-");
function inline(s:string){return escapar(s).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>");}
async function htmlManual(archivo:string){
 const lineas=(await readFile(archivo,"utf8")).split(/\r?\n/),salida:string[]=[];let lista="",parrafo:string[]=[];
 function cerrar(){if(parrafo.length){salida.push(`<p>${inline(parrafo.join(" "))}</p>`);parrafo=[];}if(lista){salida.push(`</${lista}>`);lista="";}}
 for(let i=0;i<lineas.length;i++){
  const l=lineas[i];if(!l.trim()){cerrar();continue;}
  const imagen=/^!\[([^\]]*)\]\(([^)]+)\)$/.exec(l);
  if(imagen){cerrar();const ruta=resolve(dirname(archivo),imagen[2]);if(!ruta.startsWith(dirname(archivo)+"/"))throw Error("Imagen fuera de docs");const tipo=extname(ruta)===".png"?"image/png":"image/jpeg";salida.push(`<figure><img alt="${escapar(imagen[1])}" src="data:${tipo};base64,${(await readFile(ruta)).toString("base64")}"><figcaption>${escapar(imagen[1])}</figcaption></figure>`);continue;}
  const h=/^(#{1,6}) (.+)$/.exec(l);if(h){cerrar();salida.push(`<h${h[1].length} id="${slug(h[2])}">${inline(h[2])}</h${h[1].length}>`);continue;}
  if(/^\|/.test(l)&&/^\|[\s:|-]+\|\s*$/.test(lineas[i+1]??"")){cerrar();const celdas=(v:string)=>v.trim().replace(/^\||\|$/g,"").split("|").map(v=>v.trim());salida.push(`<table><thead><tr>${celdas(l).map(v=>`<th>${inline(v)}</th>`).join("")}</tr></thead><tbody>`);i++;while(/^\|/.test(lineas[i+1]??"")){i++;salida.push(`<tr>${celdas(lineas[i]).map(v=>`<td>${inline(v)}</td>`).join("")}</tr>`);}salida.push("</tbody></table>");continue;}
  const item=/^(?:(\d+)\.|-) (.+)$/.exec(l);if(item){if(parrafo.length){salida.push(`<p>${inline(parrafo.join(" "))}</p>`);parrafo=[];}const tipo=item[1]?"ol":"ul";if(lista!==tipo){cerrar();salida.push(`<${tipo}${item[1]?` start="${item[1]}"`:""}>`);lista=tipo;}salida.push(`<li>${inline(item[2])}</li>`);continue;}
  if(/^---+$/.test(l)){cerrar();salida.push("<hr>");continue;}
  if(/^\s|^```|^>/.test(l))throw Error(`Sintaxis no admitida por este exportador en línea ${i+1}; revisar antes de exportar.`);
  if(lista)cerrar();parrafo.push(l);
 }
 cerrar();return salida.join("\n");
}
async function main(){
 const origen=resolve("docs/MANUAL-USUARIO.md"),destino=resolve(process.argv[2]??"docs/MANUAL-USUARIO.pdf"),temporal=destino+".tmp";
 const contenido=await htmlManual(origen),browser=await chromium.launch({headless:true});
 try{
  const pagina=await browser.newPage();await pagina.route("**/*",r=>r.abort());
  await pagina.setContent(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Manual de usuario — MTX Metal ERP</title><style>
  body{font:10pt/1.5 Arial,sans-serif;color:#172033}h1{font-size:24pt;border-bottom:3px solid #315cac;padding-bottom:12px}h2{font-size:17pt;margin-top:28px;break-after:avoid}h3{font-size:12pt;margin-top:18px;break-after:avoid}p,li{orphans:3;widows:3}a{color:#234c94;text-decoration:none}code{font-size:9pt;background:#eef1f6}table{border-collapse:collapse;width:100%;font-size:9pt;margin:12px 0}th,td{border:1px solid #bbc4d2;text-align:left;vertical-align:top;padding:6px;overflow-wrap:anywhere}th{background:#e8eef9}thead{display:table-header-group}tr,figure{break-inside:avoid}img{width:100%;max-width:100%;max-height:520px;object-fit:contain}figcaption{font-size:9pt;color:#475569}figure{margin:18px 0}ul,ol{padding-left:22px}li{margin-bottom:6px}
  </style><body>${contenido}</body></html>`,{waitUntil:"load"});
  await pagina.evaluate(()=>document.fonts.ready);
  await pagina.pdf({path:temporal,format:"Letter",printBackground:true,tagged:true,outline:true,displayHeaderFooter:true,headerTemplate:"<span></span>",footerTemplate:'<div style="font:8px Arial;width:100%;text-align:center;color:#64748b">MTX Metal ERP · Manual de usuario · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin:{top:"16mm",right:"14mm",bottom:"18mm",left:"14mm"}});
  const bytes=await readFile(temporal);if(bytes.subarray(0,5).toString()!=="%PDF-")throw Error("PDF inválido");await rename(temporal,destino);console.log(`PDF actualizado: ${destino} (${bytes.length} bytes).`);
 }finally{await browser.close();await rm(temporal,{force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
