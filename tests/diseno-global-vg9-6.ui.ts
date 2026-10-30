// Estados y perfiles con componentes reales; consultas/router ficticios, sin BD.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { tienePermiso } from '../src/lib/seguridad/permisos';
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('tsx/package.json'))('esbuild');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind = require('@tailwindcss/postcss');
const entrada = `import React,{useState}from'react';import{createRoot}from'react-dom/client';import ApplicationLayout from '@/app/(app)/layout';import{TablaConsulta}from'@/components/data-table/tabla-consulta';import{UnidadesMedida}from'@/components/mantenedores/unidades-medida';import{Bodegas}from'@/components/mantenedores/bodegas';import{Materiales}from'@/components/mantenedores/materiales';import{Clientes}from'@/components/mantenedores/clientes';import{Proveedores}from'@/components/mantenedores/proveedores';const q=new URLSearchParams(location.search),modulo=q.get('modulo')||'unidades';const fecha='2026-10-29T12:00:00Z';window.__lecturas=[];window.__respuesta={ok:true,mensaje:'Consulta ficticia',unidad:{id:1,name:'Unidad 001',abbreviation:'u1',materiales:0,createdAt:fecha,updatedAt:fecha}};function Contenido(){const[cantidad,setCantidad]=useState(Number(q.get('cantidad')||'1'));window.__cantidad=setCantidad;const filas=Array.from({length:cantidad},(_,i)=>({id:i+1,name:'Unidad '+String(i+1).padStart(3,'0'),abbreviation:'u'+(i+1),materiales:0,createdAt:fecha,updatedAt:fecha}));return modulo==='consulta-vacia'?<><h1>Consulta vacía de prueba</h1><TablaConsulta nombre='consulta vacía' pagina={{datos:[],total:0,pagina:1,tamano:10}} columnas={Array.from({length:8},(_,i)=>({id:String(i),titulo:'Columna extensa '+i,contenido:()=>''}))} orden='' sentido='asc' pendiente={false} onOrden={()=>{}} onPagina={()=>{}} onTamano={()=>{}} vacio={<p>Sin registros para los filtros seleccionados. Puedes cambiar los filtros y volver a consultar.</p>}/></>:modulo==='nav'?<h1>Perfil de prueba</h1>:modulo==='bodegas'?<Bodegas bodegas={[]}/>:modulo==='materiales'?<Materiales materiales={[]} unidades={[]}/>:modulo==='clientes'?<Clientes clientes={[]}/>:modulo==='proveedores'?<Proveedores proveedores={[]}/>:<UnidadesMedida unidades={filas}/>};async function main(){createRoot(document.getElementById('root')).render(await ApplicationLayout({children:<Contenido/>}))}main();`;

async function main() {
  const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg9-6');
  await mkdir(destino, { recursive: true });
  const archivo = resolve('src/app/globals.css');
  const css = await postcss([tailwind()]).process(await readFile(archivo, 'utf8'), { from: archivo });
  const fuentes = await Promise.all(['Regular', 'SemiBold'].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'sin-servidor', setup(b: { onResolve: (o: { filter: RegExp }, cb: (a: { path: string }) => unknown) => void; onLoad: (o: { filter: RegExp; namespace: string }, cb: (a: { path: string }) => unknown) => void }) {
    b.onResolve({ filter: /^next\/(navigation|link|headers)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/lib\/(seguridad\/acceso|consultas\/dashboard)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/generated\/prisma\/client$/ }, () => ({path:resolve('src/generated/prisma/browser.ts')}));
    b.onResolve({ filter: /^@\/app\/.*actions$/ }, a => ({path:resolve('src',a.path.slice(2)+'.ts'),namespace:'acciones'}));
    b.onLoad({filter:/.*/,namespace:'acciones'},async a=>({loader:'js',contents:[...(await readFile(a.path,'utf8')).matchAll(/export async function (\w+)/g)].map(m=>m[1]==='obtenerUnidad'?`export async function obtenerUnidad(id){window.__lecturas.push(id);if(window.__esperar)await new Promise(r=>window.__resolver=r);return window.__respuesta}`:`export async function ${m[1]}(){throw Error('Escritura no permitida en VG9.6')}`).join('\n')}));
    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error('No se admite PostgreSQL'); });
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ loader: 'js', resolveDir: resolve('.'), contents: a.path === 'next/link' ? `import React from 'react';export default function Link({scroll,...p}){return React.createElement('a',p)}` : a.path === 'next/navigation' ? `export function useRouter(){return{push:v=>{window.__ruta=v},replace:()=>{},refresh:()=>{}}}export function usePathname(){return '/'}` : a.path === 'next/headers' ? `export async function cookies(){return{get:()=>undefined}}` : a.path.includes('dashboard') ? `export async function consultarAvisosDashboard(){return{datos:[]}}` : `export async function exigirAcceso(){return{name:'Persona de prueba con nombre y apellidos muy extensos '.repeat(5),roles:JSON.parse(new URLSearchParams(location.search).get('roles')||'[]')}}` }));
  } }] });
  const browser=await chromium.launch({headless:true}),resultados:unknown[]=[],errores:string[]=[];
  const perfiles=[{nombre:'administrador',roles:['ADMINISTRADOR'],catalogos:true,clientes:true,proveedores:true,compras:true,cobranza:true},
    {nombre:'ventas',roles:['VENTAS'],catalogos:false,clientes:true,proveedores:false,compras:false,cobranza:true},
    {nombre:'bodega',roles:['COMPRAS_BODEGA'],catalogos:true,clientes:false,proveedores:true,compras:true,cobranza:false},
    {nombre:'produccion',roles:['PRODUCCION_DESPACHO'],catalogos:false,clientes:false,proveedores:false,compras:false,cobranza:false},
    {nombre:'cobranza',roles:['COBRANZA'],catalogos:false,clientes:false,proveedores:false,compras:false,cobranza:true},
    {nombre:'consulta',roles:['CONSULTA_GERENCIA'],catalogos:false,clientes:false,proveedores:false,compras:true,cobranza:true},
    {nombre:'ventas-cobranza',roles:['VENTAS','COBRANZA'],catalogos:false,clientes:true,proveedores:false,compras:false,cobranza:true},
    {nombre:'ventas-consulta',roles:['VENTAS','CONSULTA_GERENCIA'],catalogos:false,clientes:true,proveedores:false,compras:true,cobranza:true}];
  for(const perfil of perfiles){assert.equal(tienePermiso(perfil.roles,'catalogos.operar'),perfil.catalogos);assert.equal(tienePermiso(perfil.roles,'clientes.operar'),perfil.clientes);assert.equal(tienePermiso(perfil.roles,'proveedores.operar'),perfil.proveedores);}
  const permisosAdicionales=['cobranza.operar','trabajos.operar','precios.leer','costos.leer'];
  const matrizAdicional=[[true,true,true,true],[false,false,true,false],[false,false,false,true],[false,true,false,false],[true,false,true,false],[false,false,true,true],[true,false,true,false],[false,false,true,true]];
  perfiles.forEach((perfil,i)=>permisosAdicionales.forEach((permiso,j)=>assert.equal(tienePermiso(perfil.roles,permiso),matrizAdicional[i][j],perfil.nombre+' '+permiso)));
  assert(!tienePermiso(['ADMINISTRADOR'],'permiso.inventado'));assert(!tienePermiso(['ROL_DESCONOCIDO'],'catalogos.operar'));assert(!tienePermiso([],'usuarios.administrar'));
  try{
    for(const tema of ['oscuro','claro']){
      const contexto=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
      await contexto.route('**/*',r=>{assert.equal(new URL(r.request().url()).origin,'http://127.0.0.1:3031');assert.equal(r.request().method(),'GET');return r.fulfill({contentType:'text/html',body:`<!doctype html><html lang='es' class='${tema==='oscuro'?'dark':''}'><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id='root'></div><script>localStorage.setItem('mtx-apariencia','${tema}');window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>`})});
      const p=await contexto.newPage();p.on('pageerror',e=>errores.push(e.message));
      async function abrir(roles:string[],modulo='unidades',cantidad=1){await p.goto('http://127.0.0.1:3031/?'+new URLSearchParams({roles:JSON.stringify(roles),modulo,cantidad:String(cantidad)}));await p.locator('h1').waitFor();await p.evaluate(()=>document.fonts.ready)}
      async function captura(nombre:string){await p.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),nombre);await p.screenshot({path:join(destino,tema+'-'+nombre+'.png'),fullPage:true,animations:'disabled'});resultados.push({tema,nombre})}
      for(const perfil of perfiles){
        await abrir(perfil.roles,'nav');const nav=p.getByRole('navigation',{name:'Navegación principal',exact:true});
        for(const [ruta,permitida] of [['/compras',perfil.compras],['/ventas/cobranza',perfil.cobranza],['/administracion/usuarios',perfil.nombre==='administrador']] as const)assert.equal(await nav.locator(`a[href="${ruta}"]`).count(),permitida?1:0,perfil.nombre+' '+ruta);
        await p.keyboard.press('Control+k');await p.getByRole('dialog',{name:'Buscar página',exact:true}).waitFor();
        assert.equal(await p.getByRole('option',{name:'Compras',exact:true}).count(),perfil.compras?1:0);
        assert.equal(await p.getByRole('option',{name:'Cobranza',exact:true}).count(),perfil.cobranza?1:0);
        await p.keyboard.press('Escape');await captura(perfil.nombre+'-navegacion');
        // Cobranza carece de catalogos.leer: no se monta allí el catálogo como si fuera una ruta autorizada.
        if(perfil.nombre==='cobranza')continue;
        await abrir(perfil.roles);assert.equal(await p.getByRole('button',{name:'Crear unidad',exact:true}).count(),perfil.catalogos?1:0);
        assert.equal(await p.getByRole('button',{name:'Editar Unidad 001',exact:true}).count(),perfil.catalogos?1:0);
        assert.equal(await p.getByRole('button',{name:'Eliminar Unidad 001',exact:true}).count(),perfil.catalogos?1:0);
        await p.getByRole('button',{name:'Ver Unidad 001',exact:true}).click();await p.getByRole('dialog',{name:'Ver unidad de medida',exact:true}).waitFor();
        assert.equal(await p.getByRole('dialog').getByRole('button',{name:/Guardar|Crear/}).count(),0);
        assert(await p.getByRole('dialog').getByLabel('Nombre',{exact:true}).evaluate(e=>(e as HTMLInputElement).readOnly));await captura(perfil.nombre+'-consulta');
      }
      for(const perfil of [perfiles[0],perfiles[5]])for(const modulo of ['unidades','bodegas','materiales','clientes','proveedores']){
        await abrir(perfil.roles,modulo,0);
        assert.equal(await p.getByText(/aparecerán aquí cuando una persona/).count(),perfil.nombre==='consulta'?1:0);
        assert.equal(await p.getByRole('button',{name:/^Crear (unidad|bodega|material|cliente|proveedor)$/}).count(),perfil.nombre==='administrador'?1:0);
        for(const width of [360,1280]){await p.setViewportSize({width,height:900});if(perfil.nombre==='consulta')assert(await p.getByText(/aparecerán aquí cuando una persona/).evaluate(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&r.left>=0&&r.right<=innerWidth+1}),'Ayuda de consulta visible sin desplazar tabla');await captura(perfil.nombre+'-'+modulo+'-vacio-'+width)}
      }
      for(const [roles,modulo,crear] of [[['VENTAS'],'clientes','Crear cliente'],[['VENTAS','COBRANZA'],'clientes','Crear cliente'],[['VENTAS','CONSULTA_GERENCIA'],'clientes','Crear cliente'],[['COMPRAS_BODEGA'],'proveedores','Crear proveedor']] as const){await abrir([...roles],modulo,0);assert.equal(await p.getByRole('button',{name:crear,exact:true}).count(),1);assert.equal(await p.getByText(/aparecerán aquí cuando una persona/).count(),0);await captura(modulo+'-'+roles.join('-')+'-operativo');}
      await abrir(['CONSULTA_GERENCIA'],'consulta-vacia',0);await p.setViewportSize({width:360,height:900});assert(await p.getByText('Sin registros para los filtros seleccionados. Puedes cambiar los filtros y volver a consultar.',{exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}));await captura('consulta-servidor-vacia-360');
      await p.setViewportSize({width:1280,height:900});await abrir(['ADMINISTRADOR'],'unidades',125);const tabla=p.getByRole('table',{name:'unidades de medida',exact:true});
      assert.equal(await tabla.locator('tbody tr').count(),10);await p.getByRole('button',{name:'Siguiente',exact:true}).click();await p.getByText('Página 2 de 13',{exact:true}).waitFor();
      const filtro=p.getByRole('textbox',{name:'Filtrar unidades de medida',exact:true});await filtro.fill('sin-coincidencias');await p.getByText('No hay coincidencias',{exact:true}).waitFor();
      assert(await p.getByRole('button',{name:'Siguiente',exact:true}).isDisabled());await captura('muchos-sin-coincidencias');
      await p.getByRole('button',{name:'Limpiar filtro',exact:true}).click();await p.getByText('Página 1 de 13',{exact:true}).waitFor();
      await p.getByRole('combobox',{name:'Filas por página',exact:true}).selectOption('50');assert.equal(await tabla.locator('tbody tr').count(),50);
      await p.getByRole('button',{name:'Siguiente',exact:true}).click();await p.getByRole('button',{name:'Siguiente',exact:true}).click();assert.equal(await tabla.locator('tbody tr').count(),25);
      await captura('muchos-ultima-pagina');await p.evaluate(()=>{(window as unknown as {__cantidad:(n:number)=>void}).__cantidad(1)});await p.getByText('Página 1 de 1',{exact:true}).waitFor();assert.equal(await tabla.locator('tbody tr').count(),1);await captura('reduccion-a-un-registro');
      // Respuesta de lectura controlada: carga visible, error, recuperación. Nunca guardar/eliminar.
      await p.evaluate(()=>{Object.assign(window,{__esperar:true,__respuesta:{ok:false,mensaje:'No se pudo consultar. Reintenta la consulta.'}})});
      await p.getByRole('button',{name:'Ver Unidad 001',exact:true}).click();await p.getByText('Consultando unidad…',{exact:true}).waitFor();assert(await p.getByRole('button',{name:'Crear unidad',exact:true}).isDisabled());await captura('consulta-pendiente');
      await p.evaluate(()=>{(window as unknown as {__resolver:()=>void}).__resolver()});await p.getByText('No se pudo consultar. Reintenta la consulta.',{exact:true}).waitFor();await captura('consulta-error');
      assert(await p.getByRole('button',{name:'Ver Unidad 001',exact:true}).isEnabled());
      await p.evaluate(()=>{const w=window as unknown as {__esperar:boolean;__respuesta:object};w.__esperar=false;w.__respuesta={ok:true,mensaje:'Consulta ficticia',unidad:{id:1,name:'Unidad 001',abbreviation:'u1',materiales:0,createdAt:'2026-10-29T12:00:00Z',updatedAt:'2026-10-29T12:00:00Z'}}});
      await p.getByRole('button',{name:'Ver Unidad 001',exact:true}).click();await p.getByRole('dialog',{name:'Ver unidad de medida',exact:true}).waitFor();await captura('consulta-recuperada');
      await contexto.close();
    }
    assert.deepEqual(errores,[]);const archivos=['src/components/mantenedores/unidades-medida.tsx','src/components/mantenedores/bodegas.tsx','src/components/mantenedores/materiales.tsx','src/components/mantenedores/clientes.tsx','src/components/mantenedores/proveedores.tsx','src/components/data-table/data-table.tsx','src/lib/seguridad/permisos.ts','src/config/navegacion.ts','src/components/data-table/tabla-consulta.tsx'];
    const huellas=await Promise.all(archivos.map(async archivo=>({archivo,sha256:createHash('sha256').update(await readFile(archivo)).digest('hex')})));
    await writeFile(join(destino,'resultado.json'),JSON.stringify({ok:true,alcance:'Componentes y permisos cliente reales; identidad/consultas/acciones simuladas. No certifica sesiones ni autorización HTTP.',resultados,errores,huellas,perfiles,permisosAdicionales,matrizAdicional},null,2)+'\n');console.log('VG9.6: perfiles, unión de roles, vacíos, pocos/muchos registros, paginación y carga/error/recuperación correctos en ambos temas. Sin BD.');
  }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
