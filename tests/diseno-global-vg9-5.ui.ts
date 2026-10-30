// Responsive y contenido largo con componentes reales; consultas/router ficticios, sin BD.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, type Locator } from 'playwright';
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('tsx/package.json'))('esbuild');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind = require('@tailwindcss/postcss');
const entrada = `import React,{useState}from'react';import{createRoot}from'react-dom/client';import ApplicationLayout from '@/app/(app)/layout';import{PageHeader}from'@/components/page-header';import{DataTable}from'@/components/data-table/data-table';import{TablaConsulta}from'@/components/data-table/tabla-consulta';import{Dialog,DialogContent,DialogTitle,DialogDescription}from'@/components/ui/dialog';import{Input}from'@/components/ui/input';import{Button}from'@/components/ui/button';import{SelectorBuscable}from'@/components/formularios/selector-buscable';
const largo='ReferenciaSinSeparadores'.repeat(14);const datos=Array.from({length:30},(_,i)=>({id:i+1,nombre:'Material ficticio '+(i+1)+' '+largo,referencia:'Documento '+largo,bodega:'Bodega ficticia de fabricación y estructuras metálicas',cantidad:'123456,789 kg',importe:'$ 123.456.789'}));function Contenido(){const[abierto,setAbierto]=useState(false),[valor,setValor]=useState(''),[pagina,setPagina]=useState(1);const columnas=[...['nombre','referencia','bodega','cantidad','importe'].map(k=>({accessorKey:k,header:k})),{id:'acciones',header:'Acciones',cell:({row})=><Button variant='outline' size='sm' onClick={()=>setAbierto(true)}>Ver material {row.original.id}</Button>}];return <><PageHeader titulo={'Consulta de materiales '+largo} descripcion={'Datos ficticios, referencias largas y desplazamiento contenido. '+largo} acciones={<><Button onClick={()=>setAbierto(true)}>Registrar documento</Button><Button variant='outline'>Exportar listado</Button></>}/><div className='space-y-4'><section className='min-w-0 rounded-lg border border-border bg-card'><DataTable nombre='materiales ficticios' datos={datos} columnas={columnas} textoBusqueda={d=>d.nombre} filtroPlaceholder='Buscar material…' vacio='Sin registros'/></section><section className='min-w-0 rounded-lg border border-border bg-card'><TablaConsulta nombre='consulta de materiales' pagina={{datos:datos.slice((pagina-1)*10,pagina*10),total:30,pagina,tamano:10}} columnas={['nombre','referencia','bodega','cantidad','importe'].map(k=>({id:k,titulo:k,contenido:d=>d[k]}))} orden='nombre' sentido='asc' pendiente={false} onOrden={()=>{}} onPagina={setPagina} onTamano={()=>{}} vacio='Sin registros'/></section></div><Dialog open={abierto} onOpenChange={setAbierto}><DialogContent><DialogTitle>Documento ficticio</DialogTitle><DialogDescription>Verificación responsive, sin guardar datos.</DialogDescription><label>Descripción<Input defaultValue={largo}/></label><label htmlFor='material'>Materia prima</label><SelectorBuscable id='material' nombre='materia prima' placeholder='Seleccionar material…' valor={valor} onChange={setValor} opciones={[{valor:'1',etiqueta:'Perfil '+largo},{valor:'2',etiqueta:'Plancha '+largo}]}/><p className='break-words'>{('Descripción extensa para comprobar la lectura y el desplazamiento interior. ').repeat(25)}</p><Button onClick={()=>setAbierto(false)}>Volver sin guardar</Button></DialogContent></Dialog></>};async function main(){createRoot(document.getElementById('root')).render(await ApplicationLayout({children:<Contenido/>}))}main();`;
async function main() {
  const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg9-5');
  await mkdir(destino, { recursive: true });
  const archivo = resolve('src/app/globals.css');
  const css = await postcss([tailwind()]).process(await readFile(archivo, 'utf8'), { from: archivo });
  const fuentes = await Promise.all(['Regular', 'SemiBold'].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'sin-servidor', setup(b: { onResolve: (o: { filter: RegExp }, cb: (a: { path: string }) => unknown) => void; onLoad: (o: { filter: RegExp; namespace: string }, cb: (a: { path: string }) => unknown) => void }) {
    b.onResolve({ filter: /^next\/(navigation|link|headers)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/lib\/(seguridad\/acceso|consultas\/dashboard)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error('No se admite PostgreSQL'); });
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ loader: 'js', resolveDir: resolve('.'), contents: a.path === 'next/link' ? `import React from 'react';export default function Link({scroll,...p}){return React.createElement('a',p)}` : a.path === 'next/navigation' ? `export function useRouter(){return{push:v=>{window.__ruta=v},replace:()=>{},refresh:()=>{}}}export function usePathname(){return '/'}` : a.path === 'next/headers' ? `export async function cookies(){return{get:()=>undefined}}` : a.path.includes('dashboard') ? `export async function consultarAvisosDashboard(){return{datos:[]}}` : `export async function exigirAcceso(){return{name:'Persona de prueba con nombre y apellidos muy extensos '.repeat(5),roles:['ADMINISTRADOR']}}` }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  const resultados: unknown[] = [], errores: string[] = [];
  try {
    for (const tema of ['oscuro', 'claro']) {
      const contexto = await browser.newContext({ reducedMotion: 'reduce', hasTouch: true });
      await contexto.route('**/*', r => {
        assert.equal(new URL(r.request().url()).origin, 'http://127.0.0.1:3031'); assert.equal(r.request().method(), 'GET');
        return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang='es' class='${tema === 'oscuro' ? 'dark' : ''}'><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id='root'></div><script>localStorage.setItem('mtx-apariencia','${tema}');window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>` });
      });
      const p = await contexto.newPage(); p.on('pageerror', e => errores.push(e.message));
      async function tabHasta(l: Locator) { for (let i = 0; i < 140; i++) { await p.keyboard.press('Tab'); if (await l.evaluate(e => e === document.activeElement)) return; } throw Error('Control inalcanzable con Tab'); }
      for (const [width, height] of [[360,800],[768,1000],[1280,900],[1440,900],[640,360]]) {
        await p.setViewportSize({width,height}); await p.goto('http://127.0.0.1:3031/');
        await p.getByRole('heading',{level:1}).waitFor(); await p.evaluate(()=>document.fonts.ready);
        await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
        const sinDesborde = await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
        if(!sinDesborde){await p.screenshot({path:join(destino,'diagnostico-'+tema+'-'+width+'.png'),fullPage:true});await writeFile(join(destino,'diagnostico.json'),JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('h1,p,header,button,section')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,texto:e.textContent?.slice(0,60),clase:e.className,ancho:e.getBoundingClientRect().width}))),null,2));}
        assert(sinDesborde, `${tema} ${width}: desborde de página`);
        const medidas = await p.locator('header').first().evaluate(e=>[...e.querySelectorAll('button')].filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect();return{nombre:n.getAttribute('aria-label'),x:r.x,derecha:r.right,ancho:r.width,alto:r.height}}));
        for(const m of medidas){assert(m.x>=0&&m.derecha<=width+1,JSON.stringify(m));assert(m.ancho>=24&&m.alto>=24,JSON.stringify(m));}
        await p.keyboard.press('Control+k');
        const busqueda=p.getByRole('combobox',{name:'Buscar una sección',exact:true});await busqueda.waitFor();await p.keyboard.press('End');
        await p.waitForFunction(()=>{const e=document.querySelector('[cmdk-item][aria-selected=true]');return e?.textContent?.includes('Empresa')});
        for(const control of [busqueda,p.locator('[cmdk-item][aria-selected=true]')]) assert(await control.evaluate(e=>{const r=e.getBoundingClientRect(),d=e.closest('[role=dialog]')!.getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom&&r.top>=0&&r.bottom<=innerHeight+1}),'Buscador y última opción visibles en ventana baja');
        await p.keyboard.press('Escape');
        for (const nombre of ['materiales ficticios','consulta de materiales']) {
          const region = p.getByRole('region',{name:'Desplazar tabla de '+nombre,exact:true});
          await region.waitFor(); await tabHasta(region);
          assert(await region.evaluate(e=>e.scrollWidth>e.clientWidth), 'Referencia larga conserva ancho legible dentro de tabla');
          await p.keyboard.press('ArrowRight'); await p.waitForFunction(e=>e!.scrollLeft>0,await region.elementHandle());
          assert(await region.evaluate(e=>getComputedStyle(e).outlineStyle==='solid'&&parseFloat(getComputedStyle(e).outlineWidth)>=2),'Foco del desplazamiento visible');
        }
        const tabla = p.getByRole('table',{name:'materiales ficticios',exact:true});
        const ver=tabla.getByRole('button',{name:'Ver material 1',exact:true});await tabHasta(ver);
        await p.waitForFunction(e=>{const r=e!.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1},await ver.elementHandle(),{timeout:3000}).catch(async e=>{console.log(await ver.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,ancho:innerWidth,alto:innerHeight,padres:[e.closest('[data-slot=table-container]'),document.querySelector('#contenido-principal')].map(n=>({ancho:n?.clientWidth,scroll:n?.scrollWidth,left:n?.scrollLeft,rect:n?.getBoundingClientRect().toJSON()}))}}));throw e;});
        await p.screenshot({path:join(destino,`${tema}-${width}-tablas.png`),fullPage:true,animations:'disabled'});
        await p.keyboard.press('Enter');const dialogo=p.getByRole('dialog',{name:'Documento ficticio',exact:true});await dialogo.waitFor();
        assert(await dialogo.evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}),'Diálogo contenido');
        await p.locator('#material').focus();await p.keyboard.press('ArrowDown');
        await p.getByRole('combobox',{name:'Buscar materia prima',exact:true}).waitFor();
        await p.waitForFunction(()=>{const e=document.querySelector('[data-slot=popover-content]');if(!e)return false;const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1},null,{timeout:3000}).catch(async e=>{console.log(await p.locator('[data-slot=popover-content]').evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),max:getComputedStyle(e).maxHeight,disponible:getComputedStyle(e).getPropertyValue('--radix-popover-content-available-height'),alto:innerHeight})));await p.screenshot({path:join(destino,'selector-fallo.png')});throw e;});
        assert(await p.getByRole('option').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Opción extensa legible sin recorte horizontal');
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Selector largo sin desbordar documento');
        await p.keyboard.press('Escape'); const volver=p.getByRole('button',{name:'Volver sin guardar',exact:true});await tabHasta(volver);
        assert(await volver.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}),'Pie alcanzable en ventana baja');
        await p.screenshot({path:join(destino,`${tema}-${width}-dialogo.png`),animations:'disabled'});await p.keyboard.press('Enter');
        if(width===360){await p.getByRole('button',{name:'Expandir menú',exact:true}).tap();await p.getByRole('dialog',{name:'Menú de navegación',exact:true}).waitFor();await p.getByRole('button',{name:'Cerrar menú',exact:true}).tap();await p.getByRole('button',{name:'Registrar documento',exact:true}).tap();await dialogo.waitFor();await p.getByRole('button',{name:'Volver sin guardar',exact:true}).tap();}
        resultados.push({tema,width,height,controlesBarra:medidas.length,tablas:2,contenidoLargo:true,accionesAlcanzables:true,tactilEmulado:width===360});
      }
      await contexto.close();
    }
    assert.deepEqual(errores,[]);
    const archivos=['src/components/layout/app-topbar.tsx','src/components/page-header.tsx','src/components/data-table/data-table.tsx','src/components/ui/dialog.tsx','src/components/ui/command.tsx','src/components/ui/table.tsx','src/components/formularios/selector-buscable.tsx'];
    const huellas=await Promise.all(archivos.map(async archivo=>({archivo,sha256:createHash('sha256').update(await readFile(archivo)).digest('hex')})));
    await writeFile(join(destino,'resultado.json'),JSON.stringify({ok:true,alcance:'Layout y componentes reales con consultas/router ficticios; sin API ni BD. Viewports, no zoom.',resultados,errores,huellas},null,2)+'\n');
    console.log('VG9.5: cinco tamaños, ambos temas, contenido largo, tablas y acciones accesibles con teclado. Sin BD.');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
