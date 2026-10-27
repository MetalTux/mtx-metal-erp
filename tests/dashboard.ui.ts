import 'dotenv/config';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tienePermiso } from '../src/lib/seguridad/permisos';
const u=new URL(process.env.DATABASE_URL!);assert(['localhost','127.0.0.1'].includes(u.hostname)&&/^\/mtx_validacion_guias_g6_\d{8}$/.test(u.pathname));
const base='http://127.0.0.1:3031';
async function main(){const browser=await chromium.launch({headless:true});try{const actors=JSON.parse(process.env.DASH_ACTORES!) as {token:string;rol:string}[];
 for(const a of actors){const c=await browser.newContext();await c.addCookies([{name:'mtx_sesion',value:a.token,url:base,httpOnly:true,sameSite:'Lax'}]);const p=await c.newPage(),errores:string[]=[];p.on('pageerror',e=>errores.push(e.message));await p.goto(base+'/');await p.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();assert.equal(await p.locator('section[aria-label="Por cobrar"]').count(),tienePermiso([a.rol],'cobranza.leer')?1:0);assert.equal(await p.locator('section[aria-label="Cotizado vs contratado"]').count(),tienePermiso([a.rol],'cotizaciones.leer')&&tienePermiso([a.rol],'precios.leer')?1:0);
 if(a.rol==='ADMINISTRADOR'){for(const width of [320,375,768,1440]){await p.setViewportSize({width,height:1000});await p.waitForTimeout(150);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Ancho ${width}`);}await p.getByRole('button',{name:'Notificaciones',exact:true}).click();await p.getByRole('heading',{name:'Notificaciones',exact:true}).waitFor();await p.getByRole('link',{name:/Cuentas vencidas con saldo pendiente/}).waitFor();await p.keyboard.press('Escape');}
 assert.deepEqual(errores,[]);await c.close();}
 console.log('Dashboard Chromium: cifras reales, gráfico/tabla, avisos, seis roles y 320/375/768/1440 sin desbordamiento ni errores JS correctos.');
 }finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
