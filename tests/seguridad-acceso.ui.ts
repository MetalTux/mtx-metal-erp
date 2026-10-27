import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { generate } from "otplib";
import { chromium } from "playwright";
import { prisma } from "../src/lib/prisma";
import { huellaToken } from "../src/lib/seguridad/configuracion";
const u=new URL(process.env.DATABASE_URL!);assert(["localhost","127.0.0.1"].includes(u.hostname)&&/^\/mtx_validacion_seguridad_s2_\d{8}$/.test(u.pathname));
const base='http://127.0.0.1:3031';
async function main(){
 const f=JSON.parse(await readFile('/tmp/mtx-s2-ui.json','utf8')) as {email:string;password:string;otherEmail:string};
 const browser=await chromium.launch({headless:true});const context=await browser.newContext();const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/mi-acceso');await page.waitForURL('**/ingresar');
  const entry=await context.request.get(base+'/ingresar');assert.equal(entry.headers()['x-frame-options'],'DENY');assert.equal(entry.headers()['referrer-policy'],'no-referrer');
  const csrf=await context.request.post(base+'/api/seguridad',{headers:{Origin:'https://ajeno.invalid'},data:{action:'login',email:f.email,password:f.password}});assert.equal(csrf.status(),403);
  const large=await context.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:f.email,password:'a'.repeat(17000)}});assert.equal(large.status(),413);
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
  await page.getByLabel('Correo',{exact:true}).fill(f.email);await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.waitForURL(base+'/');await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();await page.goto(base+'/mi-acceso');await page.getByRole('heading',{name:'Mi acceso',exact:true}).waitFor();
  const cookie=(await context.cookies()).find(c=>c.name==='mtx_sesion');assert(cookie?.httpOnly);assert.equal(cookie.sameSite,'Lax');
  await page.getByRole('link',{name:'Administrar usuarios',exact:true}).click();await page.getByRole('heading',{name:'Usuarios y acceso'}).waitFor();
  async function vencerIdentidad(){
   const token=(await context.cookies()).find(c=>c.name==='mtx_sesion')!.value;
   await prisma.securitySession.update({where:{tokenHash:huellaToken(token)},data:{authenticatedAt:new Date(Date.now()-600000),reauthenticatedAt:new Date(Date.now()-360001),expiresAt:new Date(Date.now()+7*3600000)}});
  }
  await vencerIdentidad();
  const cantidad=await prisma.userSecurity.count();
  await page.getByRole('button',{name:'Crear usuario',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Nombre',{exact:true}).fill('Usuario navegador S2');const email=`ui-${randomUUID()}@ejemplo.invalid`;await dialog.getByLabel('Correo',{exact:true}).fill(email);await dialog.getByLabel('Ventas',{exact:true}).check();await dialog.getByLabel('Cobranza',{exact:true}).check();await dialog.getByRole('button',{name:'Revisar cambio'}).click();await page.getByRole('dialog').filter({hasText:'Confirmar cambio de acceso'}).getByRole('button',{name:'Confirmar cambio',exact:true}).click();
  const identidad=page.getByRole('dialog').filter({hasText:'Confirmar identidad del Administrador'});
  await identidad.waitFor();assert.equal(await prisma.userSecurity.count(),cantidad,'No crear antes de reautenticar');
  assert(page.url().endsWith('/administracion/usuarios'));
  await identidad.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(await page.getByRole('dialog').getByLabel('Correo',{exact:true}).inputValue(),email,'Cancelar conserva el formulario');
  await page.getByRole('dialog').getByRole('button',{name:'Revisar cambio'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar cambio',exact:true}).click();await identidad.waitFor();
  await identidad.getByLabel('Contraseña del Administrador').fill('incorrecta');await identidad.getByRole('button',{name:'Confirmar identidad',exact:true}).click();
  await identidad.getByRole('alert').waitFor();await page.locator('[data-sonner-toast][data-type="error"]').first().waitFor();assert.equal(await prisma.userSecurity.count(),cantidad);
  await identidad.getByLabel('Contraseña del Administrador').fill(f.password);await identidad.getByRole('button',{name:'Confirmar identidad',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar cambio',exact:true}).waitFor();assert.equal(await prisma.userSecurity.count(),cantidad,'Reautenticar no confirma automáticamente');
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar cambio',exact:true}).click();
  const linkDialog=page.getByRole('dialog').filter({hasText:'Enlace privado para el titular'});await linkDialog.waitFor();const link=await linkDialog.getByLabel('Enlace de acceso').inputValue();assert(link.includes('#token='));await linkDialog.getByRole('button',{name:'Ya guardé el enlace'}).click();
  const another=await browser.newContext();const otherPage=await another.newPage();await otherPage.goto(link);await otherPage.getByLabel('Contraseña nueva',{exact:true}).fill(f.password);await otherPage.getByLabel('Repetir contraseña',{exact:true}).fill(f.password);await otherPage.getByRole('button',{name:'Guardar contraseña',exact:true}).click();await otherPage.waitForURL('**/ingresar*');await otherPage.locator('[data-sonner-toast][data-type="success"]').filter({hasText:'Cuenta activada'}).waitFor();assert(!otherPage.url().includes('token'));
  await otherPage.goto(base+'/ingresar');await otherPage.getByLabel('Correo',{exact:true}).fill(email);await otherPage.getByLabel('Contraseña',{exact:true}).fill(f.password);await otherPage.getByRole('button',{name:'Ingresar',exact:true}).click();await otherPage.waitForURL(base+'/');await otherPage.goto(base+'/administracion/usuarios');await otherPage.getByRole('alert').filter({hasText:'Tu perfil no permite'}).waitFor();
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  const fila=page.getByRole('row').filter({hasText:email});await fila.getByRole('button',{name:'Recuperar acceso'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Confirmar cambio',exact:true}).click();await linkDialog.waitFor();
  const reset=await linkDialog.getByLabel('Enlace de acceso').inputValue();await linkDialog.getByRole('button',{name:'Ya guardé el enlace'}).click();
  await otherPage.goto(reset);await otherPage.getByLabel('Contraseña nueva',{exact:true}).fill(f.password);await otherPage.getByLabel('Repetir contraseña',{exact:true}).fill(f.password+' distinta');await otherPage.getByRole('button',{name:'Guardar contraseña'}).click();
  await otherPage.locator('[data-sonner-toast][data-type="error"]').filter({hasText:'no coinciden'}).waitFor();
  await otherPage.getByLabel('Repetir contraseña',{exact:true}).fill(f.password);await otherPage.getByRole('button',{name:'Guardar contraseña'}).click();await otherPage.waitForURL('**/ingresar*');await otherPage.locator('[data-sonner-toast][data-type="success"]').filter({hasText:'Contraseña guardada'}).waitFor();
  await another.close();
  await page.goto(base+'/mi-acceso');await page.getByRole('button',{name:'Configurar doble factor',exact:true}).click();await page.getByLabel('Clave privada de configuración',{exact:true}).waitFor();const secret=await page.getByLabel('Clave privada de configuración',{exact:true}).inputValue();await page.getByLabel('Código del nuevo autenticador',{exact:true}).fill(await generate({secret}));await page.getByRole('button',{name:'Confirmar doble factor',exact:true}).click();const codesDialog=page.getByRole('dialog').filter({hasText:'Códigos personales de respaldo'});await codesDialog.waitFor();const codes=(await codesDialog.getByLabel('Códigos de respaldo',{exact:true}).inputValue()).split('\n');assert.equal(codes.length,10);await codesDialog.getByRole('button',{name:'Ya guardé mis códigos'}).click();
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.waitForURL('**/ingresar');
  await page.getByLabel('Correo',{exact:true}).fill(f.email);await page.getByLabel('Contraseña',{exact:true}).fill(f.password);await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByLabel('Código de aplicación o respaldo',{exact:true}).fill(codes[0]);assert(!(await context.cookies()).some(c=>c.name==='mtx_sesion'),'Desafío sin sesión completa');await page.getByRole('button',{name:'Verificar código',exact:true}).click();await page.waitForURL(base+'/');await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();await page.goto(base+'/mi-acceso');
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);}
  await page.goto(base+'/administracion/usuarios');await vencerIdentidad();
  await page.getByRole('button',{name:'Confirmar identidad',exact:true}).click();await identidad.waitFor();await identidad.getByLabel('Código actual o respaldo').waitFor();
  await identidad.getByLabel('Contraseña del Administrador').fill(f.password);await identidad.getByLabel('Código actual o respaldo').fill('invalido');await identidad.getByRole('button',{name:'Confirmar identidad',exact:true}).click();await identidad.getByRole('alert').waitFor();
  await identidad.getByLabel('Contraseña del Administrador').fill(f.password);await identidad.getByLabel('Código actual o respaldo').fill(codes[1]);await identidad.getByRole('button',{name:'Confirmar identidad',exact:true}).click();await identidad.waitFor({state:'hidden'});
  await page.goto(base+'/mi-acceso');
  await page.getByRole('button',{name:'Deshabilitar doble factor',exact:true}).click();const confirm=page.getByRole('dialog').filter({hasText:'Deshabilitar mi doble factor'});await confirm.getByRole('button',{name:'Confirmar cambio',exact:true}).click();await page.getByText('Deshabilitado',{exact:true}).waitFor();assert.deepEqual(errors,[]);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.waitForURL('**/ingresar');
  console.log('S2 Chromium: ingreso/salida, CSRF/tamaño, cookie HttpOnly, invitación/activación, roles/denegación, TOTP y recuperación/desactivación propia, 320/375/768/1440 y sin errores JS correctos.');
 }finally{await browser.close();await prisma.$disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
