// Transporte simulado y servicio de seguridad sustituido: API/cookies reales, sin BD ni servidor.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
async function main() {
  const anterior = { NODE_ENV: process.env.NODE_ENV, SEGURIDAD_ORIGEN: process.env.SEGURIDAD_ORIGEN, SEGURIDAD_ORIGENES_DESARROLLO: process.env.SEGURIDAD_ORIGENES_DESARROLLO, SEGURIDAD_CLAVES: process.env.SEGURIDAD_CLAVES, SEGURIDAD_CLAVE_ACTIVA: process.env.SEGURIDAD_CLAVE_ACTIVA };
  const publico = "https://b1315pk2-3030.brs.devtunnels.ms", local = "http://localhost:3030";
  Object.assign(process.env, { NODE_ENV: "development", SEGURIDAD_ORIGEN: publico, SEGURIDAD_ORIGENES_DESARROLLO: local, SEGURIDAD_CLAVES: JSON.stringify({ prueba: randomBytes(32).toString('base64') }), SEGURIDAD_CLAVE_ACTIVA: 'prueba' });
  try {
    const r = await esbuild.build({ entryPoints: ['src/app/api/seguridad/route.ts'], bundle: true, write: false, platform: 'node', packages: 'external', format: 'cjs', plugins: [{ name: 'servicio-simulado', setup(build: { onResolve: (options: { filter: RegExp }, callback: () => unknown) => void; onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void }) {
      build.onResolve({ filter: /@\/lib\/seguridad\/servicio$/ }, () => ({ path: 'servicio', namespace: 'prueba' }));
      build.onLoad({ filter: /.*/, namespace: 'prueba' }, () => ({ contents: `export async function operarSeguridad(context,datos){
        if(datos.action==='login')return {client:{ok:true},sessionToken:'sesion-de-prueba-sin-BD'};
        if(datos.action==='challenge')return {client:{ok:true},challengeToken:'desafio-de-prueba-sin-BD'};
        if(datos.action==='logout')return {client:{ok:true},clearSession:true,clearChallenge:true};
        return {client:{ok:Boolean(context.session),desafio:Boolean(context.challenge)}};
      }`, loader: 'js' }));
    } }] });
    const modulo = { exports: {} as { POST: (request: NextRequest) => Promise<Response> } };
    const cargar = runInThisContext(`(function(require,module,exports){${r.outputFiles[0].text}\n})`) as (require: NodeRequire, module: typeof modulo, exports: typeof modulo.exports) => void;
    cargar(require, modulo, modulo.exports);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      await context.route('**/*', async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.pathname !== '/api/seguridad') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Ensayo de orígenes</title>' });
        const headers = new Headers(req.headers()); headers.set('host', url.host); headers.set('x-forwarded-host', url.host);
        if (url.origin === publico) headers.set('origin', 'http://localhost:3030'); // Reescritura de Dev Tunnels.
        const response = await modulo.exports.POST(new NextRequest(req.url(), { method: 'POST', headers, body: req.postData() }));
        const salida = Object.fromEntries(response.headers.entries());
        const cookies = response.headers.getSetCookie(); if (cookies.length) salida['set-cookie'] = cookies.join('\n');
        await route.fulfill({ status: response.status, headers: salida, body: await response.text() });
      });
      const a = await context.newPage(), b = await context.newPage();
      await a.goto(local); await b.goto(publico);
      const operar = (page: typeof a, action: string) => page.evaluate(async action => {
        const r = await fetch('/api/seguridad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        return { status: r.status, body: await r.json() as { ok: boolean; desafio?: boolean } };
      }, action);
      for (const page of [a, b]) { assert.equal((await operar(page, 'login')).status, 200); assert((await operar(page, 'challenge')).body.ok); assert((await operar(page, 'perfil')).body.ok); assert((await operar(page, 'perfil')).body.desafio); }
      const locales = await context.cookies(local), publicas = await context.cookies(publico);
      assert(locales.some(c => c.name === 'mtx_sesion' && !c.secure && c.httpOnly && c.sameSite === 'Lax' && c.path === '/'));
      assert(publicas.some(c => c.name === '__Host-mtx_sesion' && c.secure && c.httpOnly && c.sameSite === 'Lax' && c.path === '/' && c.domain === new URL(publico).hostname));
      assert(!locales.some(c => c.name.startsWith('__Host-'))); assert(!publicas.some(c => c.name === 'mtx_sesion'));
      assert((await operar(a, 'logout')).body.ok); assert(!(await operar(a, 'perfil')).body.ok); assert((await operar(b, 'perfil')).body.ok);
      const ataque = await modulo.exports.POST(new NextRequest(publico + '/api/seguridad', { method: 'POST', headers: { host: new URL(publico).host, origin: 'https://ajeno.example', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: '{"action":"login"}' }));
      assert.equal(ataque.status, 403);
      Object.assign(process.env, { NODE_ENV: 'production' });
      const localEnProduccion = await modulo.exports.POST(new NextRequest(local + '/api/seguridad', { method: 'POST', headers: { host: 'localhost:3030', origin: local, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' }, body: '{"action":"login"}' }));
      assert.equal(localEnProduccion.status, 403);
      console.log('Navegador: API local y túnel simultáneos, desafío/sesión, cookies HTTP/HTTPS aisladas, logout local sin afectar túnel, rechazo cross-site y de origen adicional en producción. Servicio simulado; sin BD ni servidor.');
    } finally { await browser.close(); }
  } finally { for (const [key, value] of Object.entries(anterior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
