// Paletas y componentes reales sin Next, servicios, sesión o BD. El cambio de clase es sólo del ensayo.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve("tsx/package.json"))("esbuild");
const postcss=createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind=require("@tailwindcss/postcss");
const entrada=`
import React from 'react';import{createRoot}from'react-dom/client';import{SectionCard}from'@/components/section-card';import{Button}from'@/components/ui/button';import{Input}from'@/components/ui/input';import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription}from'@/components/ui/dialog';import{GrillaHistorial}from'@/components/grilla-historial';
function App(){const[dialogo,setDialogo]=React.useState(false);return <main className='mx-auto min-w-0 max-w-4xl space-y-5 p-4'><header className='rounded border bg-topbar p-3'><h1 className='text-xl font-semibold'>Muestra de paleta — datos ficticios</h1><p data-contraste className='text-muted-foreground'>Claro y Oscuro · ensayo TC1</p></header><SectionCard titulo='Tarjeta representativa' descripcion='Descripción legible sobre cabecera metálica'><div className='space-y-4'><p data-contraste>Texto de lectura</p><p data-contraste className='text-muted-foreground'>Texto secundario</p><div className='flex flex-wrap gap-3'><Button id='principal' data-contraste>Guardar borrador</Button><Button id='peligro' data-contraste variant='destructive'>Anular documento</Button><Button variant='outline' onClick={()=>setDialogo(true)}>Ver diálogo</Button></div><label className='block'>Nombre<Input id='campo' defaultValue='Ejemplo de prueba' placeholder='Escribir nombre'/></label><div className='flex flex-wrap gap-3'>{['success','warning','destructive','brand'].map((c,i)=><span key={c} data-contraste className={'text-'+c}>{['Disponible','Pendiente','Error de validación','Identidad de marca'][i]}</span>)}</div><div data-contraste className='rounded border bg-info p-3 text-info-foreground'>Información de la operación</div><GrillaHistorial titulo='Detalles de muestra' columnas={['Material','Cantidad','Estado']} numericas={['Cantidad']} filas={[{id:1,celdas:['Perfil de prueba','2,5','Disponible']}]}/><figure aria-label='Series gráficas de muestra'><figcaption>Series separadas por etiqueta</figcaption><svg role='img' aria-label='Gráfico representativo' viewBox='0 0 300 70' className='h-20 w-full'>{[1,2,3,4,5].map((n)=><rect key={n} x={n*45-30} y={10} width={25} height={n*8+15} style={{fill:'var(--chart-'+n+')'}}/>)}</svg></figure></div></SectionCard><div className='detalle-cotizacion p-3'>Superficie documental blanca conservada.</div><Dialog open={dialogo} onOpenChange={setDialogo}><DialogContent><DialogHeader><DialogTitle>Consulta de muestra</DialogTitle><DialogDescription data-contraste>El diálogo utiliza la paleta activa.</DialogDescription></DialogHeader><p data-contraste>Texto del diálogo</p><Button onClick={()=>setDialogo(false)}>Cerrar muestra</Button></DialogContent></Dialog></main>};createRoot(document.getElementById('root')).render(<App/>);
`;
async function main(){
 const archivo=resolve('src/app/globals.css'),css=await postcss([tailwind()]).process(await readFile(archivo,'utf8'),{from:archivo});
 const bundle=await esbuild.build({stdin:{contents:entrada,loader:'tsx',resolveDir:resolve('.')},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 const destino=resolve('var/validacion/temas-tc1');await mkdir(destino,{recursive:true});
 const browser=await chromium.launch({headless:true});const resultados:unknown[]=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es" class="dark"><body><div id="root"></div></body></html>'}));await page.goto('http://127.0.0.1:3031/paletas-tc1');await page.addStyleTag({content:css.css});await page.addScriptTag({content:'window.__name = (funcion) => funcion;'});await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(const oscuro of [true,false]){
   const tema=oscuro?'oscuro':'claro';await page.evaluate(d=>{document.documentElement.classList.toggle('dark',d);document.body.style.setProperty('--font-inter','Arial, sans-serif');},oscuro);await page.getByRole('heading',{name:'Tarjeta representativa',exact:true}).waitFor();
   const medir=()=>page.evaluate(()=>{
    const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true})!;
    function color(v:string){ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];}
    function luz(c:number[]){return c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
    function ratio(a:number[],b:number[]){const x=luz(a),y=luz(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    function fondo(el:Element){const ar:Element[]=[];for(let e:Element|null=el;e;e=e.parentElement)ar.unshift(e);return ar.reduce((bg,e)=>{const c=color(getComputedStyle(e).backgroundColor),a=c[3]/255;return bg.map((v,i)=>c[i]*a+v*(1-a));},[255,255,255]);}
    const texto=[...document.querySelectorAll('[data-contraste]')].map(el=>({elemento:el.textContent,ratio:ratio(color(getComputedStyle(el).color),fondo(el)),minimo:4.5}));
    const header=document.querySelector('.section-card-header')!,description=header.querySelector('p')!;
    for(const token of ['--card-header-start','--card-header-end'])texto.push({elemento:'Descripción de cabecera '+token,ratio:ratio(color(getComputedStyle(description).color),color(getComputedStyle(header).getPropertyValue(token))),minimo:4.5});
    const campo=document.querySelector('#campo')!;texto.push({elemento:'Borde de campo',ratio:ratio(color(getComputedStyle(campo).borderColor),fondo(campo)),minimo:3});
    for(const el of document.querySelectorAll('svg rect'))texto.push({elemento:'Serie gráfica',ratio:ratio(color(getComputedStyle(el).fill),fondo(el)),minimo:3});
    texto.push({elemento:'Placeholder del campo',ratio:ratio(color(getComputedStyle(campo,'::placeholder').color),fondo(campo)),minimo:4.5});
    const tokens=['background','foreground','sidebar','topbar','card','popover','card-header','muted','accent','border','input','control-surface','muted-foreground','primary','primary-hover','primary-foreground','ring','brand','success','warning','destructive','info','info-foreground','chart-1','chart-2','chart-3','chart-4','chart-5'].map(n=>({nombre:n,valor:getComputedStyle(document.documentElement).getPropertyValue('--'+n).trim()}));
    return {texto,tokens,scheme:getComputedStyle(document.documentElement).colorScheme};
   });
   const base=await medir();assert(base.tokens.every(t=>t.valor),`${tema}: token vacío`);assert.equal(base.scheme,oscuro?'dark':'light');
   for(const selector of ['#principal','#peligro']){await page.locator(selector).hover();await page.locator(selector).evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const datos=await medir();resultados.push({tema,estado:selector,datos});const malos=datos.texto.filter(d=>d.ratio+.01<d.minimo);assert.deepEqual(malos,[],`${tema}: contraste de componentes`);}
   await page.mouse.move(0,0);await page.getByRole('button',{name:'Ver diálogo',exact:true}).click();await page.getByRole('dialog').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const dialogo=await medir();assert.deepEqual(dialogo.texto.filter(d=>d.ratio+.01<d.minimo),[],`${tema}: contraste en diálogo`);await page.getByRole('button',{name:'Cerrar muestra',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   for(const width of [360,768,1280]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(destino,`${tema}-${width}.png`),fullPage:true,animations:'disabled'});}
  }
  assert.deepEqual(errores,[]);await writeFile(join(destino,'contrastes.json'),JSON.stringify(resultados,null,2)+'\n');assert.match(await readFile('src/app/layout.tsx','utf8'),/dark \$\{inter.variable\}/);console.log('TC1: tokens completos, contraste de componentes/hover/cabeceras/campos, diálogo y seis capturas responsive correctos. Oscuro conservado como respaldo SSR; sin servidor ni BD.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
