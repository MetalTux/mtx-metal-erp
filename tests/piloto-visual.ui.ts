// Auditoría visual con componentes reales y datos ficticios. No inicia Next ni conecta a BD.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind = require("@tailwindcss/postcss");
const entrada = `
import React from 'react';import{createRoot}from'react-dom/client';import Dashboard from '@/app/(app)/page';import{Compras}from'@/components/compras/compras';import{AppSidebar}from'@/components/layout/app-sidebar';import{AppTopbar}from'@/components/layout/app-topbar';import{SidebarProvider,SidebarInset}from'@/components/ui/sidebar';import{PermisosProvider}from'@/components/seguridad/permisos';import{TooltipProvider}from'@/components/ui/tooltip';import{Notificaciones}from'@/components/alertas/notificaciones';import{elegirTema}from'@/components/tema/estado';
const catalogos={unidades:[{id:1,name:'Kilogramos',abbreviation:'kg'}],presentaciones:['Unidad','Caja'],proveedores:[{id:1,name:'Proveedor industrial ficticio',rut:'11.111.111-1'}],bodegas:[{id:1,name:'Bodega central'}],tipos:[{id:1,code:'FACTURA',name:'Factura de Compra'}],materiales:[{id:1,code:'MP-001',name:'Perfil estructural 80 x 40 x 3 mm',unidad:'kg'},{id:2,code:'MP-002',name:'Plancha de acero laminado 3 mm',unidad:'kg'}]};
window.__compras=Array.from({length:8},(_,i)=>({id:i+1,version:1,date:'2026-10-27T12:00:00.000Z',dia:'2026-10-27',totalAmount:'125000.00',supplierId:1,proveedor:i%2?'Proveedor industrial ficticio':'Aceros de ejemplo — datos ficticios',rut:'11.111.111-1',documentTypeId:1,documento:'Factura de Compra',documentNumber:'FC-'+String(i+101),warehouseId:1,bodega:'Bodega central',voidedAt:null,voidReason:null,deletedAt:null,recibida:false,estado:'Pendiente',closures:[],receipts:[],lines:[{id:11,rawMaterialId:1,presentation:'Unidad',purchasedQuantity:'10',unitFactor:'1',unitPrice:'10000',quantity:'10',lineAmount:'100000',material:'Perfil estructural 80 x 40 x 3 mm',unidad:'kg',recibido:'0',cerrado:'0',pendiente:'10'},{id:12,rawMaterialId:2,presentation:'Unidad',purchasedQuantity:'5',unitFactor:'1',unitPrice:'5000',quantity:'5',lineAmount:'25000',material:'Plancha de acero laminado 3 mm',unidad:'kg',recibido:'0',cerrado:'0',pendiente:'5'}]}));
async function main(){const dash=await Dashboard();window.temaAuditoria=elegirTema;const compras=location.pathname==='/compras';createRoot(document.getElementById('root')).render(<TooltipProvider><PermisosProvider roles={['ADMINISTRADOR']}><SidebarProvider><AppSidebar/><SidebarInset className='min-w-0'><AppTopbar sesion={{name:'Persona ficticia',roles:['ADMINISTRADOR']}} avisos={{datos:[]}}/><main className='min-w-0 p-4 md:p-6'>{compras?<Compras catalogos={catalogos} consulta={{ok:true,pagina:{datos:window.__compras,total:8,pagina:1,tamano:10}}} filtros={{q:'',pagina:1,tamano:10,orden:'fecha',sentido:'desc'}}/>:dash}</main><Notificaciones/></SidebarInset></SidebarProvider></PermisosProvider></TooltipProvider>)}main();
`;
const datos = {
 hoy:'2026-10-27',
 ofertas:{datos:{pendientes:3,vigentes:2,vencidas:1,monto:'119000',legadas:0,proximas:[{id:1,folio:'COT-PRUEBA',cliente:'Cliente ficticio',fecha:'2026-10-28',legada:false}],meses:Array.from({length:6},(_,i)=>({mes:`2026-${String(i+5).padStart(2,'0')}`,cotizado:String(10000*(i+1)),contratado:String(5000*(i+1))}))}},
 trabajos:{datos:{preparacion:1,produccion:1,borradores:1,filas:[{id:1,folio:'OT-PRUEBA',productName:'Estructura de prueba',cliente:'Cliente ficticio',status:'EN_PROCESO',date:'2026-10-27'}]}},
 cobranza:{datos:{porCobrar:'119000',cuentasVencidas:1,vencido:'10000'}},
 inventario:{datos:{bajo:1,totalRequerimientos:1,requerimientos:[{materialId:1,bodegaId:1,material:'Perfil de prueba',bodega:'Central',unidad:'kg',requerido:'10',fisico:'8',reservado:'6',libre:'2',porReservar:'4',faltante:'2'}],movimientos:[{id:1,origen:'Materia prima',name:'Perfil de prueba',bodega:'Central',type:'ENTRADA',quantity:'8',unidad:'kg',date:'2026-10-27',createdAt:'2026-10-27T12:00:00.000Z'}]}}
};

// Contraste compuesto sobre el fondo efectivo, incluidas transparencias.
async function contraste(page: Page) {
 return page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently:true})!;
  const color=(v:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
  const luz=(c:number[])=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const ratio=(a:number[],b:number[])=>{const x=luz(a),y=luz(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function fondo(el:Element){const a:Element[]=[];for(let e:Element|null=el;e;e=e.parentElement)a.unshift(e);return a.reduce((bg,e)=>{const c=color(getComputedStyle(e).backgroundColor),alpha=c[3]/255;return bg.map((v,i)=>c[i]*alpha+v*(1-alpha));},[255,255,255]);}
  const visible=(el:Element)=>el.checkVisibility()&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0;
  const textos=[...document.querySelectorAll('main a,main button:not(:disabled),main p,main span,main td,main th,main label,summary,[role="dialog"] p,[role="dialog"] label,[role="dialog"] button:not(:disabled),[role="menuitem"] span')].filter(el=>visible(el)&&el.textContent?.trim()&&![...el.children].some(c=>c.textContent?.trim())&&!el.closest('[aria-hidden="true"]'));
  const medidas=textos.map(el=>({tipo:'texto',texto:el.textContent!.trim().slice(0,90),minimo:4.5,ratio:ratio(color(getComputedStyle(el).color),fondo(el))}));
  for(const el of document.querySelectorAll('main input:not(:disabled),[role="dialog"] input:not(:disabled)'))if(visible(el))medidas.push({tipo:'control',texto:el.id,minimo:3,ratio:ratio(color(getComputedStyle(el).borderTopColor),fondo(el))});
  const foco=document.activeElement;if(foco&&foco.matches(':focus-visible')){const s=getComputedStyle(foco);medidas.push({tipo:'foco',texto:foco.id||foco.textContent!.slice(0,40),minimo:3,ratio:ratio(color(s.outlineStyle!=='none'?s.outlineColor:s.getPropertyValue('--ring')),fondo(foco))});}
  return medidas;
 });
}
async function main(){
 const destino=resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/piloto-visual');await mkdir(destino,{recursive:true});
 const archivo=resolve('src/app/globals.css'),css=await postcss([tailwind()]).process(await readFile(archivo,'utf8'),{from:archivo});
 const bundle=await esbuild.build({stdin:{contents:entrada,resolveDir:resolve('.'),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'piloto-sin-servidor',setup(build:{onResolve:(o:{filter:RegExp},cb:(a:{path:string})=>unknown)=>void;onLoad:(o:{filter:RegExp;namespace:string},cb:(a:{path:string})=>unknown)=>void}){
 build.onResolve({filter:/^@\/generated\/prisma\/client$/},()=>({path:resolve('src/generated/prisma/browser.ts')}));
 build.onResolve({filter:/^next\/(navigation|link)$/},a=>({path:a.path,namespace:'next'}));build.onLoad({filter:/.*/,namespace:'next'},a=>({loader:'js',resolveDir:resolve('.'),contents:a.path==='next/link'?`import React from 'react';export default function Link({children,scroll,...p}){return React.createElement('a',p,children)}`:`import{useSyncExternalStore}from'react';export function useRouter(){return{push:()=>{},refresh:()=>{}}}export function useSearchParams(){return new URLSearchParams()}export function usePathname(){return useSyncExternalStore(cb=>{addEventListener('popstate',cb);return()=>removeEventListener('popstate',cb)},()=>location.pathname,()=>location.pathname)}`}));
 build.onResolve({filter:/^@\/app\/.*\/actions$/},a=>({path:a.path,namespace:'acciones'}));
 build.onLoad({filter:/.*/,namespace:'acciones'},async a=>{const fuente=await readFile(resolve('src',a.path.slice(2)+'.ts'),'utf8');const nombres=[...fuente.matchAll(/export async function (\w+)/g)].map(m=>m[1]);return{loader:'js',contents:nombres.map(n=>n==='calcularEquivalenciaCompra'?`export async function ${n}(){return {ok:false,mensaje:'Completa el detalle de prueba para calcular la equivalencia.'}}`:n==='obtenerCompra'?`export async function ${n}(id){return {ok:true,compra:window.__compras.find(c=>c.id===id)}}`:`export async function ${n}(){window.__mutaciones.push('${n}');throw Error('Mutación prohibida en ensayo visual: ${n}')}`).join('\n')};});
 build.onResolve({filter:/^@\/lib\/seguridad\/acceso$/},()=>({path:'acceso',namespace:'datos'}));build.onResolve({filter:/^@\/lib\/consultas\/dashboard$/},()=>({path:'dashboard',namespace:'datos'}));build.onLoad({filter:/.*/,namespace:'datos'},a=>({loader:'js',contents:a.path==='acceso'?'export async function exigirAcceso(){}':`export async function consultarDashboard(){return ${JSON.stringify(datos)}}`}));
 }}]});
 const compilacion=resolve('.next');let fuentes='';
 const archivos=await readdir(compilacion,{recursive:true});
 for(const nombre of archivos.filter(n=>n.endsWith('.css')&&(n.includes('inter_')||n.includes('geist_mono_')||n.startsWith('static/css/')))){
  const rutaCss=join(compilacion,nombre),hoja=await readFile(rutaCss,'utf8');let caras=[...hoja.matchAll(/@font-face\s*\{[^}]+\}/g)].map(m=>m[0]).join('');
  for(const url of [...caras.matchAll(/url\(([^)]+)\)/g)]){const ruta=url[1].replaceAll('"','').replaceAll("'",'');const path=ruta.startsWith('/_next/')?resolve(compilacion,nombre.startsWith('dev/')?'dev':'',ruta.slice(7)):resolve(rutaCss,'..',ruta);caras=caras.replace(url[0],`url(data:font/woff2;base64,${(await readFile(path)).toString('base64')})`);}
  fuentes+=caras;
 }
 for(const [peso,nombre] of [[400,'Regular'],[600,'SemiBold']] as const)fuentes+=`@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:${peso};src:url(data:font/woff2;base64,${(await readFile(`src/app/fuentes/IBMPlexSans-${nombre}.woff2`)).toString('base64')}) format('woff2');}`;
 const browser=await chromium.launch({headless:true});const errores:string[]=[];const medidas:unknown[]=[];let exito=false;
 try{for(const ruta of ['dashboard','compras']){
 const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>errores.push(e.message));
 await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html lang="es"><head><style>body{--font-inter:Inter,sans-serif}${fuentes}\n${css.css}</style></head><body style="--font-plex:'IBM Plex Sans';--font-geist-mono:'Geist Mono',monospace"><div id="root"></div></body></html>`}));
 await p.goto('http://127.0.0.1:3031/'+(ruta==='dashboard'?'':ruta));await p.addScriptTag({content:'window.__name=(f)=>f;window.__mutaciones=[];'});await p.addScriptTag({content:bundle.outputFiles[0].text});await p.getByRole('heading',{name:ruta==='dashboard'?'Dashboard':'Compras',exact:true}).waitFor();
 for(const tema of ['oscuro','claro']){
 await p.evaluate(t=>(window as unknown as{temaAuditoria:(t:string)=>void}).temaAuditoria(t),tema);await p.evaluate(()=>document.fonts.ready);
 for(const ancho of [1440,768,360,640]){await p.setViewportSize({width:ancho,height:1000});await p.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${ruta}/${tema}/${ancho}: desborde página`);
 if(ruta==='compras'&&ancho===360)assert(await p.locator('#compras-buscar').evaluate(e=>e.getBoundingClientRect().width>200),'Buscador móvil >200px');
 await p.mouse.move(0,0);await p.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);});await p.screenshot({path:join(destino,`${ruta}-${tema}-${ancho}${ancho===640?'-reflow-equivalente-200':''}.png`),fullPage:true,animations:'disabled'});
 }
 await p.setViewportSize({width:1440,height:1000});
 if(ruta==='dashboard'){
 for(const [nombre,href] of [['Revisar cotizaciones','/ventas/cotizaciones'],['Revisar órdenes de trabajo','/trabajos/ordenes'],['Revisar cobranza','/ventas/cobranza'],['Revisar reposición','/inventario/stock?reposicion=reposicion']])assert.equal(await p.getByRole('link',{name:nombre,exact:true}).getAttribute('href'),href);
 const resumen=p.locator('summary');await resumen.focus();await p.keyboard.press('Enter');await p.getByRole('table',{name:'Importes mensuales cotizados y contratados'}).waitFor();assert.equal(await p.getByRole('table',{name:'Importes mensuales cotizados y contratados'}).getByRole('row').count(),7);await p.keyboard.press('Enter');
 }else{
 assert.equal((await p.getByRole('button',{name:'Ver compra FC-101',exact:true}).innerText()).trim(),'Ver');assert.equal((await p.getByRole('button',{name:'Recibir compra FC-101',exact:true}).innerText()).trim(),'Recibir');
 const mas=p.getByRole('button',{name:'Más acciones de compra FC-101',exact:true});await mas.focus();await p.keyboard.press('ArrowDown');await p.getByRole('menu').waitFor();
 for(const texto of ['Editar compra','Cerrar cantidades pendientes','Anular compra','Ocultar del listado'])assert.equal(await p.getByRole('menuitem',{name:new RegExp('^'+texto)}).count(),1);
 assert.equal(await p.getByRole('menuitem',{name:/^Ocultar del listado/}).getAttribute('aria-disabled'),'true');await p.getByText('Primero debes anular la compra.',{exact:true}).waitFor();
 await p.screenshot({path:join(destino,`menu-${tema}.png`),animations:'disabled'});medidas.push({ruta,tema,estado:'menu',contraste:await contraste(p)});assert.deepEqual((await contraste(p)).filter(c=>c.ratio+.01<c.minimo),[],'Contraste menú');await p.getByRole('menuitem',{name:/^Editar compra/}).focus();await p.keyboard.press('Enter');await p.getByRole('dialog',{name:'Editar compra',exact:true}).waitFor();
 for(const ancho of [1440,768,360,640]){await p.setViewportSize({width:ancho,height:1000});const medida=await p.getByRole('dialog',{name:'Editar compra',exact:true}).evaluate(e=>({ancho:e.clientWidth,contenido:e.scrollWidth,formularios:[...e.querySelectorAll('form')].map(f=>({ancho:f.clientWidth,contenido:f.scrollWidth})),grilla:[...e.querySelectorAll('[aria-label="Grilla de detalles"]')].map(f=>({ancho:f.clientWidth,contenido:f.scrollWidth}))}));medidas.push({ruta,tema,ancho,medida});assert(medida.contenido<=medida.ancho+1,'Diálogo contenido');assert(medida.formularios.every(f=>f.contenido<=f.ancho+1),'Formulario contenido '+JSON.stringify({ancho,medida}));if(ancho===360)assert(medida.grilla.some(f=>f.contenido>f.ancho),'Grilla desplazable intencional');
 for(const selector of ['#supplierId','#documentTypeId','#warehouseId','#compra-numero','#compra-fecha']){const campo=p.locator(selector);await campo.scrollIntoViewIfNeeded();assert(await campo.isVisible(),selector+' visible');const rect=await campo.boundingBox();assert(rect&&rect.x>=0&&rect.x+rect.width<=ancho+1,selector+' contenido');}
 if(ancho===1440){await p.locator('#compra-numero').focus();const c=await contraste(p);medidas.push({ruta,tema,estado:'formulario',contraste:c});assert.deepEqual(c.filter(c=>c.ratio+.01<c.minimo),[],'Contraste formulario');}const cancelar=p.getByRole('button',{name:'Cancelar',exact:true});await cancelar.scrollIntoViewIfNeeded();assert(await cancelar.isVisible());const revisar=p.getByRole('button',{name:'Revisar y guardar',exact:true});await revisar.scrollIntoViewIfNeeded();const rb=await revisar.boundingBox();assert(rb&&rb.x>=0&&rb.x+rb.width<=ancho+1,'Acción de revisión contenida');await p.getByRole('dialog',{name:'Editar compra',exact:true}).evaluate(el=>el.scrollTop=0);await p.mouse.move(0,0);await p.screenshot({path:join(destino,`formulario-${tema}-${ancho}.png`),animations:'disabled'});
 }
 await p.setViewportSize({width:1440,height:1000});await p.getByRole('button',{name:'Ver detalle 1',exact:true}).click();
 const detalle=p.getByRole('dialog',{name:'Ver detalle de compra',exact:true});await detalle.waitFor();await detalle.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const anchoDetalle=(await detalle.boundingBox())!.width;assert(anchoDetalle>=671&&anchoDetalle<=673,'Detalle conserva 672px: '+anchoDetalle);await detalle.getByRole('button',{name:'Cerrar',exact:true}).click();
 await p.getByRole('button',{name:'Cancelar',exact:true}).click();await p.waitForFunction(()=>document.activeElement?.id==='acciones-compra-1');
 await p.getByRole('button',{name:'Recibir compra FC-101',exact:true}).click();const recepcion=p.getByRole('dialog',{name:'Recibir compra FC-101',exact:true});await recepcion.waitFor();await recepcion.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const anchoRecepcion=(await recepcion.boundingBox())!.width;assert(anchoRecepcion>=767&&anchoRecepcion<=769,'Recepción conserva 768px: '+anchoRecepcion);await recepcion.getByRole('button',{name:'Cancelar',exact:true}).click();
 
 await p.setViewportSize({width:1440,height:1000});await p.getByRole('button',{name:'Crear compra',exact:true}).click();await p.getByRole('dialog',{name:'Crear compra',exact:true}).waitFor();await p.locator('#compra-fecha').fill('');await p.getByRole('button',{name:'Revisar y guardar',exact:true}).click();
 for(const id of ['supplierId','documentTypeId','warehouseId','compra-numero','compra-fecha']){assert.equal(await p.locator('#'+id).getAttribute('aria-invalid'),'true',id);const descripcion=await p.locator('#'+id).getAttribute('aria-describedby');assert(descripcion&&await p.locator('[id="'+descripcion+'"]').isVisible(),id+' error enlazado');}await p.waitForFunction(()=>document.activeElement?.id==='supplierId');await p.screenshot({path:join(destino,`errores-${tema}.png`),animations:'disabled'});
 const erroresContraste=await contraste(p);medidas.push({ruta,tema,estado:'errores',contraste:erroresContraste});assert.deepEqual(erroresContraste.filter(c=>c.ratio+.01<c.minimo),[],'Contraste errores');
 // VG3: las altas relacionadas se cierran sin reemplazar el borrador de compra.
 await p.locator('#compra-numero').fill('BORRADOR-VG3');
 await p.getByRole('button',{name:'Crear proveedor',exact:true}).click();
 const altaProveedor=p.getByRole('dialog',{name:'Crear proveedor para la compra',exact:true});await altaProveedor.waitFor();await altaProveedor.getByRole('button',{name:'Cancelar',exact:true}).click();await altaProveedor.waitFor({state:'hidden'});assert.equal(await p.locator('#compra-numero').inputValue(),'BORRADOR-VG3');
 await p.getByRole('button',{name:'Agregar detalle de compra',exact:true}).click();
 await p.getByRole('button',{name:'Crear materia prima',exact:true}).click();
 const altaMaterial=p.getByRole('dialog',{name:/Crear materia prima para el detalle/});await altaMaterial.waitFor();await altaMaterial.getByRole('button',{name:'Cancelar',exact:true}).click();await altaMaterial.waitFor({state:'hidden'});
 await p.getByRole('dialog',{name:'Agregar detalle de compra',exact:true}).getByRole('button',{name:'Cancelar',exact:true}).click();await p.getByRole('dialog',{name:'Agregar detalle de compra',exact:true}).waitFor({state:'hidden'});assert.equal(await p.locator('#compra-numero').inputValue(),'BORRADOR-VG3');
 // Cerrar por X conserva la protección del borrador, sin ejecutar operaciones.
 await p.keyboard.press('Escape');const descartar=p.getByRole('button',{name:/Descartar/});if(await descartar.count())await descartar.click();await p.getByRole('dialog',{name:'Crear compra',exact:true}).waitFor({state:'hidden'});
 }
 await p.keyboard.press('Tab');const contrasteMedido=await contraste(p);medidas.push({ruta,tema,contraste:contrasteMedido});assert.deepEqual(contrasteMedido.filter(c=>c.ratio+.01<c.minimo),[],ruta+'/'+tema+' contraste');
 const leerBaseGlobal=()=>p.evaluate(()=>({fondo:getComputedStyle(document.body).getPropertyValue('--background').trim(),fuente:getComputedStyle(document.body).fontFamily}));
 const piloto=await leerBaseGlobal();await p.evaluate(()=>{history.pushState({},'','/inventario/stock');dispatchEvent(new PopStateEvent('popstate'));});const base=await leerBaseGlobal();
 const coherenciaGlobal={piloto,base};medidas.push({ruta,tema,coherenciaGlobal});assert.equal(piloto.fondo,base.fondo);assert.match(piloto.fuente,/IBM Plex/);assert.equal(piloto.fuente,base.fuente);
 await p.evaluate(r=>{history.pushState({},'',r==='dashboard'?'/':'/compras');dispatchEvent(new PopStateEvent('popstate'));},ruta);assert.equal(await p.locator('[data-piloto-visual]').count(),0);

 }
 assert.deepEqual(await p.evaluate(()=>(window as unknown as{__mutaciones:string[]}).__mutaciones),[]);await p.close();}
 assert.deepEqual(errores,[]);exito=true;await rm(join(destino,'fallo.json'),{force:true});await writeFile(join(destino,'resultado.json'),JSON.stringify({ok:true,alcance:'Componentes completos, datos ficticios, lecturas simuladas; sin servidor ni BD; 640px representa reflow equivalente, no zoom real.',medidas},null,2));console.log('Piloto visual correcto: ambos temas, responsive/reflow, formulario, teclado, errores, contraste y coherencia global entre rutas.');
 }finally{if(!exito)await writeFile(join(destino,'fallo.json'),JSON.stringify({ok:false,errores,medidas},null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
