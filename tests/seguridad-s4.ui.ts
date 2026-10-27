import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { prisma } from "../src/lib/prisma";
import { tienePermiso } from "../src/lib/seguridad/permisos";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s4_\d{8}$/.test(u.pathname));
const base="http://127.0.0.1:3031";
const routes: [string,string][] = [["/compras","compras.leer"],["/configuracion/empresa","configuracion.leer"],["/configuracion/iva","configuracion.leer"],["/configuracion/numeracion","configuracion.leer"],["/inventario/ajustes","ajustes.leer"],["/inventario/traslados","traslados.leer"],["/inventario/stock","inventario.leer"],["/inventario/movimientos","inventario.leer"],["/inventario/productos-terminados","inventario.leer"],["/mantenedores/productos","catalogos.leer"],["/mantenedores/materiales","catalogos.leer"],["/mantenedores/unidades","catalogos.leer"],["/mantenedores/bodegas","catalogos.leer"],["/mantenedores/proveedores","proveedores.leer"],["/mantenedores/clientes","clientes.leer"],["/mantenedores/condiciones-pago","configuracion.leer"],["/ventas/cotizaciones","cotizaciones.leer"],["/ventas/ordenes","ordenes_cliente.leer"],["/ventas/cobranza","cobranza.leer"],["/trabajos/ordenes","trabajos.leer"],["/trabajos/despachos","guias.leer"]];
async function main(){
 const f=JSON.parse(await readFile('/tmp/s4-actores.json','utf8')) as {password:string;actors:{id:number;roles:string[];email:string}[]};
 const manifest=JSON.parse(await readFile(".next/server/server-reference-manifest.json","utf8"));
 const actionId=Object.entries(manifest.node).find(([,v])=>(v as {exportedName:string;filename:string}).exportedName==="guardarUnidadMedida"&&(v as {filename:string}).filename.includes("mantenedores/unidades"))![0];
 const browser=await chromium.launch({headless:true});const errors:string[]=[];
 try{
  const anon=await browser.newContext();for(const [route] of [["/",""],...routes]){const r=await anon.request.get(base+route,{maxRedirects:0});assert([307,308].includes(r.status()),`${route}: ${r.status()}`);assert(r.headers().location?.includes('/ingresar'));}
  for(const route of ['/api/empresa/logo/inexistente.png','/api/productos/imagenes/inexistente.png','/api/cotizaciones/imagenes/inexistente.png','/api/cotizaciones/pdfs/inexistente','/api/trabajos/pdfs/inexistente','/api/guias/pdfs/inexistente'])assert.equal((await anon.request.get(base+route)).status(),401,route);
  await anon.close();
  // Restaurar el rol del fixture usado para comprobar revocación, por el API autorizado.
  const setup=await browser.newContext();const admin=f.actors[0];
  const login=await setup.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:admin.email,password:f.password}});assert((await login.json()).ok);
  const bodega=f.actors.find(a=>a.roles[0]==='COMPRAS_BODEGA')!;
  const row=await prisma.userSecurity.findUniqueOrThrow({where:{userId:bodega.id}});
  const restore=await setup.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'user-update',id:bodega.id,version:row.securityVersion,name:'Compras y Bodega S4',roles:bodega.roles,status:'ACTIVO'}});assert((await restore.json()).ok);
  const archived=[['cotizaciones',await prisma.quotePdfEmission.findFirstOrThrow()],['trabajos',await prisma.workOrderPdfEmission.findFirstOrThrow()],['guias',await prisma.deliveryNotePdfEmission.findFirstOrThrow()]] as const;
  for(const [family,emission] of archived){const pdf=await setup.request.get(`${base}/api/${family}/pdfs/${emission.id}`);assert.equal(pdf.status(),200,`PDF histórico ${family}`);assert.equal(pdf.headers()['cache-control'],'private, no-store');assert.equal(createHash('sha256').update(await pdf.body()).digest('hex'),emission.fileHash);}
  await setup.close();
  for(const actor of f.actors){
   const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   const r=await context.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:actor.email,password:f.password}});assert((await r.json()).ok);
   await page.goto(base+'/');await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
   const enlaces=await page.locator('nav[aria-label="Navegación principal"] a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
   for(const [route,permission] of routes){
    const allowed=tienePermiso(actor.roles,permission);assert.equal(enlaces.filter(e=>e===route).length,allowed?1:0,`${actor.roles} menú ${route}`);
    await page.goto(base+route);
    if(allowed){assert.equal(new URL(page.url()).pathname,route,`${actor.roles} ${route}`);assert(!await page.getByRole('heading',{name:'Application error',exact:false}).count());}
    else await page.waitForURL(base+'/acceso-denegado');
   }
   if(actor.roles[0]==='CONSULTA_GERENCIA'){
    await page.goto(base+'/mantenedores/unidades');assert.equal(await page.getByRole('button',{name:/Crear|Editar|Eliminar/}).count(),0);
    await page.goto(base+'/trabajos/ordenes');assert.equal(await page.getByRole('button',{name:'Crear OT',exact:true}).count(),0);
   }
   if(actor.roles[0]==='PRODUCCION_DESPACHO'){
    assert.equal((await context.request.get(base+'/api/cotizaciones/pdfs/inexistente')).status(),403);
    await page.goto(base+'/mantenedores/productos');assert.equal(await page.getByRole('button',{name:/Crear producto/}).count(),0);
   }
   await page.goto(base+'/');for(const width of [375,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
   if(actor.roles[0]==='CONSULTA_GERENCIA'){
    const count=await prisma.unitMeasure.count();
    const denied=await context.request.post(base+'/mantenedores/unidades',{headers:{Origin:base,'Next-Action':actionId,'Content-Type':'text/plain;charset=UTF-8'},data:JSON.stringify([{name:'No escribir desde HTTP',abbreviation:'no'}]),maxRedirects:0});
    assert(denied.headers()['x-action-redirect']?.includes('/acceso-denegado'),`Acción directa: ${denied.status()}`);
    assert.equal(await prisma.unitMeasure.count(),count);
    const foreign=await context.request.post(base+'/mantenedores/unidades',{headers:{Origin:'https://ajeno.invalid','Next-Action':actionId,'Content-Type':'text/plain;charset=UTF-8'},data:JSON.stringify([{name:'No escribir con origen ajeno',abbreviation:'no'}]),maxRedirects:0});
    assert(foreign.status()>=400||foreign.headers()['x-action-redirect']?.includes('/acceso-denegado'));assert.equal(await prisma.unitMeasure.count(),count);
   }
   if(actor.roles[0]==='COMPRAS_BODEGA'){
    await page.goto(base+'/mantenedores/unidades');
    const manager=await browser.newContext();assert((await (await manager.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:admin.email,password:f.password}})).json()).ok);
    const current=await prisma.userSecurity.findUniqueOrThrow({where:{userId:actor.id}});
    assert((await (await manager.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'user-update',id:actor.id,version:current.securityVersion,name:'Consulta S4',roles:['CONSULTA_GERENCIA'],status:'ACTIVO'}})).json()).ok);
    const count=await prisma.unitMeasure.count();
    const stale=await context.request.post(base+'/mantenedores/unidades',{headers:{Origin:base,'Next-Action':actionId,'Content-Type':'text/plain;charset=UTF-8'},data:JSON.stringify([{name:'No escribir con pestaña vieja',abbreviation:'no'}]),maxRedirects:0});
    assert(stale.headers()['x-action-redirect']?.includes('/ingresar'));assert.equal(await prisma.unitMeasure.count(),count);
    await manager.close();
   }
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log('S4 Chromium: URL directa, seis roles y combinación, menú, lectura sin escritura, archivos, 375/1440 y ausencia de errores JS correctos.');
 }finally{await browser.close();}
}
main().finally(()=>prisma.$disconnect());
