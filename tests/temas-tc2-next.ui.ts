// Integración de carga e hidratación real en rutas públicas. Sólo GET; no envía credenciales ni accede a cuentas.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { setTimeout as pausa } from "node:timers/promises";
import { chromium } from "playwright";
import { CLAVE_TEMA } from "../src/lib/tema-config";
const require=createRequire(import.meta.url);
async function puertoLibre(){const s=createServer();await new Promise<void>((ok,error)=>{s.once('error',error);s.listen(3032,'127.0.0.1',ok);});await new Promise<void>((ok,error)=>s.close(e=>e?error(e):ok()));}
async function detener(hijo:ChildProcess){if(hijo.exitCode!==null||hijo.signalCode!==null)return;const termino=once(hijo,'exit');hijo.kill('SIGTERM');const limite=setTimeout(()=>hijo.kill('SIGKILL'),3000);try{await termino;}finally{clearTimeout(limite);}}
async function main(){
 await readFile('.next/BUILD_ID','utf8');await puertoLibre();const destino=resolve('var/validacion/temas-tc2');await mkdir(destino,{recursive:true});let registro='';
 const servidor=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3032'],{stdio:['ignore','pipe','pipe']});servidor.stdout?.on('data',v=>{registro+=String(v)});servidor.stderr?.on('data',v=>{registro+=String(v)});
 let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  let listo=false;for(let n=0;n<100;n++){if(servidor.exitCode!==null)throw Error('El servidor temporal terminó antes de estar disponible.');try{const r=await fetch('http://127.0.0.1:3032/ingresar');if(r.ok){listo=true;break;}}catch{}await pausa(100);}assert(listo,'Servidor temporal no disponible');
  browser=await chromium.launch({headless:true});const contexto=await browser.newContext({colorScheme:'light',viewport:{width:1280,height:900}});let post=0;await contexto.route('**/*',r=>{if(r.request().method()!=='GET'){post++;return r.abort();}return r.continue();});
  const pagina=await contexto.newPage();const errores:string[]=[];pagina.on('pageerror',e=>errores.push(e.message));pagina.on('console',m=>{if(m.type()==='error'&&/hydration|hydrating|did not match/i.test(m.text()))errores.push(m.text());});
  await pagina.goto('http://127.0.0.1:3032/ingresar');await pagina.getByRole('button',{name:'Apariencia: Oscuro',exact:true}).waitFor();assert(await pagina.locator('html').evaluate(e=>e.classList.contains('dark')));
  await pagina.evaluate(k=>localStorage.setItem(k,'claro'),CLAVE_TEMA);
  // Bloquear chunks sólo en esta recarga: el script propio debe restaurar Claro antes de hidratar React.
  const chunks='**/_next/static/**/*.js';await pagina.route(chunks,r=>r.abort());await pagina.reload({waitUntil:'domcontentloaded'});assert.equal(await pagina.locator('html').evaluate(e=>e.classList.contains('dark')),false);assert(await pagina.getByRole('button',{name:'Apariencia',exact:true}).isDisabled());
  await pagina.unroute(chunks);await pagina.reload();await pagina.getByRole('button',{name:'Apariencia: Claro',exact:true}).waitFor();await pagina.screenshot({path:join(destino,'ingreso-real-claro.png'),fullPage:true,animations:'disabled'});await pagina.getByRole('textbox',{name:'Correo',exact:true}).fill('apariencia@example.invalid');await pagina.getByRole('button',{name:'Apariencia: Claro',exact:true}).click();await pagina.getByRole('menuitemradio',{name:'Oscuro',exact:true}).click();assert.equal(await pagina.getByRole('textbox',{name:'Correo',exact:true}).inputValue(),'apariencia@example.invalid');
  for(const width of [360,1280]){await pagina.setViewportSize({width,height:900});await pagina.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");assert(await pagina.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await pagina.screenshot({path:join(destino,`ingreso-real-${width}.png`),fullPage:true,animations:'disabled'});}
  await pagina.goto('http://127.0.0.1:3032/recuperar');await pagina.getByRole('button',{name:'Apariencia: Oscuro',exact:true}).waitFor();assert.equal(post,0);assert.deepEqual(errores,[]);
  await writeFile(join(destino,'next-resultado.json'),JSON.stringify({ok:true,alcance:'Producción Next real, GET /ingresar y /recuperar, sin autenticarse ni enviar formularios.',casos:['predeterminado oscuro con SO claro','restauración sin chunks React','hidratación sin errores','correo conservado','persistencia entre rutas públicas','móvil y escritorio'],post},null,2)+'\n');console.log('TC2 Next real: SSR/restauración antes de hidratación, navegación pública, formulario conservado y móvil correctos. Sin POST ni operaciones de BD.');
 }finally{await browser?.close();await detener(servidor);await puertoLibre();await writeFile(join(destino,'next-temporal.log'),registro);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
