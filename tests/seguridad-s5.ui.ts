import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { prisma } from "../src/lib/prisma";
import { huellaToken } from "../src/lib/seguridad/configuracion";
const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s5_\d{8}$/.test(u.pathname));
const base='http://127.0.0.1:3031';
async function main(){
 const f=JSON.parse(await readFile('/tmp/s5-actores.json','utf8')) as {password:string;antiguo:number;actores:{id:number;email:string;token:string;role:string}[]};
 const browser=await chromium.launch({headless:true}),errors:string[]=[];
 try{
  const anon=await browser.newContext();const response=await anon.request.get(base+'/administracion/auditoria',{maxRedirects:0});assert.equal(response.status(),307);await anon.close();
  const admin=await browser.newContext();const login=await admin.request.post(base+'/api/seguridad',{headers:{Origin:base,'X-Forwarded-For':'192.0.2.66','User-Agent':'Mozilla/5.0 Firefox/120.0 NO_REGISTRAR_S5'},data:{action:'login',email:f.actores[0].email,password:f.password}});assert((await login.json()).ok);
  const page=await admin.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/administracion/auditoria');await page.getByRole('heading',{name:'Auditoría y autoría',exact:true}).waitFor();
  assert(await page.locator('nav[aria-label="Navegación principal"] a[href="/administracion/auditoria"]').count());
  const meta=await prisma.securityAuditEvent.findFirstOrThrow({where:{actorUserId:f.actores[0].id,action:'INGRESO_LOCAL',ipAddress:'192.0.2.66'},orderBy:{id:'desc'}});assert.equal(meta.browserType,'Firefox');assert(!meta.browserType?.includes('NO_REGISTRAR'));
  await page.goto(base+`/administracion/auditoria?vista=autoria&tipo=SalesOrder&recurso=${f.antiguo}`);await page.getByRole('cell',{name:'Sin autoría registrada',exact:true}).waitFor();
  await page.goto(base+'/ventas/ordenes?ver='+f.antiguo);const link=page.getByRole('link',{name:'Consultar autoría registrada',exact:true});await link.waitFor();await link.click();await page.waitForURL('**/administracion/auditoria?**');await page.getByRole('cell',{name:'Sin autoría registrada',exact:true}).waitFor();
  await page.goto(base+'/administracion/auditoria?vista=autoria');await page.getByLabel('Documento o registro (autoría)').selectOption('WorkOrder');await page.getByRole('button',{name:'Filtrar',exact:true}).click();await page.waitForURL('**/administracion/auditoria?**');assert(await page.getByRole('cell',{name:/Orden de Trabajo #/}).count());
  // Cambiar el plazo de reautenticación del fixture sin violar las restricciones de sesión.
  const cookie=(await admin.cookies()).find(c=>c.name==='mtx_sesion')!;assert(cookie);
  await prisma.securitySession.update({where:{tokenHash:huellaToken(cookie.value)},data:{authenticatedAt:new Date(Date.now()-600000),reauthenticatedAt:new Date(Date.now()-360001),expiresAt:new Date(Date.now()+7*3600000)}});
  await page.getByRole('button',{name:'Depurar eventos antiguos',exact:true}).click();await page.getByRole('button',{name:'Depurar eventos',exact:true}).click();await page.getByRole('status').filter({hasText:'Confirma tu identidad'}).waitFor();
  const reauth=await admin.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'reauth',password:f.password}});assert((await reauth.json()).ok);
  await page.getByRole('button',{name:'Depurar eventos antiguos',exact:true}).click();await page.getByRole('button',{name:'Depurar eventos',exact:true}).click();await page.getByRole('status').filter({hasText:'La autoría documental se conserva'}).waitFor();
  for(const width of [375,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
  await page.goto(base+'/administracion/auditoria');const before=await prisma.securityAuditEvent.count({where:{action:'EVENTOS_DEPURADOS'}});
  const manifest=JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));const action=Object.entries(manifest.node).find(([,v])=>(v as {exportedName:string}).exportedName==='depurarEventos')![0];
  for(const a of [f.actores[2],f.actores[3]]){
   const context=await browser.newContext();assert((await (await context.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:a.email,password:f.password}})).json()).ok);
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/');assert.equal(await p.locator('nav[aria-label="Navegación principal"] a[href="/administracion/auditoria"]').count(),0);await p.goto(base+'/administracion/auditoria');await p.waitForURL(base+'/acceso-denegado');
   const denied=await context.request.post(base+'/administracion/auditoria',{headers:{Origin:base,'Next-Action':action,'Content-Type':'text/plain;charset=UTF-8'},data:'[]',maxRedirects:0});assert(denied.headers()['x-action-redirect']?.includes('/acceso-denegado'));await context.close();
  }
  assert.equal(await prisma.securityAuditEvent.count({where:{action:'EVENTOS_DEPURADOS'}}),before);assert.deepEqual(errors,[]);await admin.close();console.log('S5 Chromium: visor exclusivo, menú, filtros/autoría previa, enlaces documentales, reautenticación/confirmación, acción directa denegada, metadatos sin UA crudo y 375/1440 correctos.');
 }finally{await browser.close();}
}
main().finally(()=>prisma.$disconnect());
