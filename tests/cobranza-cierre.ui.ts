import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_guias_g6_\d{8}$/.test(u.pathname));
const base='http://127.0.0.1:3031';
async function main(){const browser=await chromium.launch({headless:true});try{
 const c=await browser.newContext();await c.addCookies([{name:'mtx_sesion',value:process.env.C4_TOKEN!,url:base,httpOnly:true,sameSite:'Lax'}]);const page=await c.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const ruta of [`/ventas/ordenes?ver=${process.env.C4_ORDEN}`,`/trabajos/ordenes?ver=${process.env.C4_OT}`,`/trabajos/despachos?ver=${process.env.C4_GUIA}`]){
  await page.goto(base+ruta);const link=page.getByRole('link',{name:'Ver cuenta por cobrar',exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),`/ventas/cobranza?orden=${process.env.C4_ORDEN}`);await link.click();await page.getByRole('dialog').getByRole('heading',{name:'Detalle de cuenta por cobrar',exact:true}).waitFor();await page.getByRole('dialog').getByText(/Saldo.*\$0/).waitFor();
 }
 await page.goto(base+`/trabajos/ordenes?ver=${process.env.C4_PROPIA}`);await page.getByText('Sin cuenta comercial',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Ver cuenta por cobrar',exact:true}).count(),0);
 const email='c4-'+randomUUID()+'@ejemplo.invalid',password=randomUUID();const alta=await(await c.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'user-create',name:'Producción C4 sin precios',email,roles:['PRODUCCION_DESPACHO']}})).json();assert(alta.ok);
 const otro=await browser.newContext(),token=new URLSearchParams(new URL(alta.link).hash.slice(1)).get('token');assert((await(await otro.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'activate',token,password}})).json()).ok);assert((await(await otro.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email,password}})).json()).ok);
 const p=await otro.newPage();for(const ruta of [`/trabajos/ordenes?ver=${process.env.C4_OT}`,`/trabajos/despachos?ver=${process.env.C4_GUIA}`]){await p.goto(base+ruta);await p.getByRole('dialog').waitFor();assert.equal(await p.getByRole('link',{name:'Ver cuenta por cobrar',exact:true}).count(),0);}
 await p.goto(base+`/ventas/ordenes?ver=${process.env.C4_SIN_OT}`);await p.getByRole('link',{name:'Crear trabajo',exact:true}).waitFor();
 for(const rol of ['VENTAS','COBRANZA','CONSULTA_GERENCIA']){
  const correo='manual-'+randomUUID()+'@ejemplo.invalid',clave=randomUUID();const invitacion=await(await c.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'user-create',name:'Revisión de accesos '+rol,email:correo,roles:[rol]}})).json();assert(invitacion.ok);
  const lector=await browser.newContext(),tokenLector=new URLSearchParams(new URL(invitacion.link).hash.slice(1)).get('token');assert((await(await lector.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'activate',token:tokenLector,password:clave}})).json()).ok);assert((await(await lector.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:correo,password:clave}})).json()).ok);
  const vista=await lector.newPage();await vista.goto(base+`/ventas/ordenes?ver=${process.env.C4_ORDEN}`);await vista.getByRole('link',{name:'Ver trabajo',exact:true}).waitFor();
  await vista.goto(base+`/ventas/ordenes?ver=${process.env.C4_SIN_OT}`);await vista.getByRole('dialog').waitFor();assert.equal(await vista.getByRole('link',{name:'Crear trabajo',exact:true}).count(),0,rol);
  await vista.goto(base+`/trabajos/despachos?ver=${process.env.C4_GUIA}`);await vista.getByRole('dialog').waitFor();assert.equal(await vista.getByRole('link',{name:'Preparar otra entrega',exact:true}).count(),0,rol);await lector.close();
 }
 await p.goto(base+`/ventas/cobranza?orden=${process.env.C4_ORDEN}`);await p.waitForURL('**/acceso-denegado');assert.deepEqual(errors,[]);await otro.close();await c.close();console.log('C4 Chromium: enlaces desde OCC/OT/guía a la misma cuenta, obra propia sin enlace y Producción sin acceso ni botones financieros correctos.');
 }finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
