// Teclado, árbol AX y zoom del navegador con componentes reales; datos/API ficticios, sin BD.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { chromium, type Locator } from 'playwright';
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('tsx/package.json'))('esbuild');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind = require('@tailwindcss/postcss');
const entrada = `import React,{useState}from'react';import{createRoot}from'react-dom/client';import ApplicationLayout from '@/app/(app)/layout';import AuthLayout from '@/app/(auth)/layout';import{Ingreso}from'@/components/seguridad/ingreso';import{Notificaciones,notificar}from'@/components/alertas/notificaciones';import{SelectorBuscable}from'@/components/formularios/selector-buscable';import{Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription,DialogClose}from'@/components/ui/dialog';import{Button}from'@/components/ui/button';import{Input}from'@/components/ui/input';
function Contenido(){const[v,setV]=useState('');return <><h1 className='text-[23px] font-semibold'>Accesibilidad de prueba</h1><div className='max-w-xl space-y-4'><label htmlFor='material'>Materia prima</label><SelectorBuscable id='material' nombre='materia prima' placeholder='Seleccionar material…' valor={v} onChange={setV} opciones={[{valor:'1',etiqueta:'Perfil de prueba'},{valor:'2',etiqueta:'Plancha de prueba'}]}/><p role='status'>Seleccionado: {v||'ninguno'}</p><Dialog><DialogTrigger asChild><Button>Consultar documento</Button></DialogTrigger><DialogContent><DialogTitle>Documento de prueba</DialogTitle><DialogDescription>Consulta con teclado, sin operaciones reales.</DialogDescription><label>Observación<Input defaultValue='Borrador conservado'/></label><p>{'Detalle largo para comprobar desplazamiento y acceso a las acciones. '.repeat(30)}</p><DialogClose asChild><Button>Volver al documento</Button></DialogClose></DialogContent></Dialog><Button variant='outline' onClick={()=>notificar.exito('Cambio ficticio registrado')}>Mostrar aviso</Button></div></>};async function main(){const contenido=location.pathname==='/ingresar'?<><AuthLayout><Ingreso disponible/></AuthLayout><Notificaciones/></>:await ApplicationLayout({children:<Contenido/>});createRoot(document.getElementById('root')).render(contenido)}main();`;
async function main() {
  const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg9-4');
  await mkdir(destino, { recursive: true });
  const archivo = resolve('src/app/globals.css');
  const css = await postcss([tailwind()]).process(await readFile(archivo, 'utf8'), { from: archivo });
  const fuentes = await Promise.all(['Regular', 'SemiBold'].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'sin-servidor', setup(b: { onResolve: (o: { filter: RegExp }, cb: (a: { path: string }) => unknown) => void; onLoad: (o: { filter: RegExp; namespace: string }, cb: (a: { path: string }) => unknown) => void }) {
    b.onResolve({ filter: /^next\/(navigation|link|headers)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/lib\/(seguridad\/acceso|consultas\/dashboard)$/ }, a => ({ path: a.path, namespace: 'mock' }));
    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error('No se admite PostgreSQL'); });
    b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ loader: 'js', resolveDir: resolve('.'), contents: a.path === 'next/link' ? `import React from 'react';export default function Link({scroll,...p}){return React.createElement('a',p)}` : a.path === 'next/navigation' ? `export function useRouter(){return{push:v=>{window.__ruta=v},replace:()=>{},refresh:()=>{}}}export function usePathname(){return '/'}` : a.path === 'next/headers' ? `export async function cookies(){return{get:()=>undefined}}` : a.path.includes('dashboard') ? `export async function consultarAvisosDashboard(){return{datos:[]}}` : `export async function exigirAcceso(){return{name:'Persona ficticia',roles:['ADMINISTRADOR']}}` }));
  } }] });
  const temporal = await mkdtemp(join(tmpdir(), 'mtx-vg94-'));
  const extension = join(temporal, 'extension');
  await mkdir(extension);
  await writeFile(join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Zoom local de validación', version: '1.0', permissions: ['tabs'], background: { service_worker: 'worker.js' } }));
  await writeFile(join(extension, 'worker.js'), 'chrome.runtime.onInstalled.addListener(()=>{});');
  const contexto = await chromium.launchPersistentContext(join(temporal, 'perfil'), { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const casos: string[] = [], zoom: unknown[] = [], errores: string[] = [];
  try {
    const worker = contexto.serviceWorkers()[0] ?? await contexto.waitForEvent('serviceworker');
    await contexto.route('**/*', r => {
      const u = new URL(r.request().url());
      assert.equal(u.origin, 'http://127.0.0.1:3031');
      if (u.pathname === '/api/seguridad') return r.fulfill({ json: { ok: false, message: 'Credenciales ficticias rechazadas.' } });
      assert.equal(r.request().method(), 'GET');
      const tema = u.searchParams.get('tema') ?? 'oscuro';
      return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang='es' class='${tema === 'oscuro' ? 'dark' : ''}'><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id='root'></div><script>localStorage.setItem('mtx-apariencia','${tema}');window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>` });
    });
    const p = contexto.pages()[0] ?? await contexto.newPage();
    p.on('pageerror', e => errores.push(e.message));
    async function foco(l: Locator) { await p.waitForFunction(e => e === document.activeElement, await l.elementHandle(), { timeout: 3000 }); }
    async function focoVisible(l: Locator) {
      await foco(l);
      assert(await l.evaluate(e => { for (let n: Element | null = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.boxShadow !== 'none' || (s.outlineStyle !== 'none' && s.outlineStyle !== 'hidden' && parseFloat(s.outlineWidth) >= 2)) return true; } return false; }), 'Falta indicador visible de foco');
    }
    async function relaciones(l: Locator) {
      assert(await l.evaluate(e => ['aria-controls', 'aria-activedescendant', 'aria-describedby', 'aria-labelledby'].every(a => (e.getAttribute(a) ?? '').split(' ').filter(Boolean).every(id => document.getElementById(id)))), 'Referencia ARIA inexistente');
    }
    async function tabHasta(l: Locator) { for (let i = 0; i < 100; i++) { await p.keyboard.press('Tab'); if (await l.evaluate(e => e === document.activeElement)) return; } throw Error('Control inalcanzable con Tab'); }
    async function visible(l: Locator) {
      assert(await l.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }), 'Control recortado: ' + (await l.textContent())?.slice(0, 60));
    }
    async function arbol(nombre: string) {
      const cdp = await contexto.newCDPSession(p);
      const ax = await cdp.send('Accessibility.getFullAXTree');
      await writeFile(join(destino, nombre + '-ax.json'), JSON.stringify(ax, null, 2));
      await writeFile(join(destino, nombre + '-aria.txt'), await p.locator('body').ariaSnapshot());
      await cdp.detach();
      const activos = ax.nodes.filter(n => !n.ignored);
      for (const n of activos) if (['button', 'link', 'combobox', 'textbox', 'checkbox', 'radio', 'menuitem', 'menuitemradio'].includes(String(n.role?.value))) assert(n.name?.value?.trim(), 'Control sin nombre accesible: ' + n.role?.value);
      return activos;
    }
    async function aplicarZoom(factor: number) {
      return worker.evaluate(async factor => {
        const api = (globalThis as unknown as { chrome: { tabs: { query: (q: object) => Promise<{ id: number }[]>; setZoom: (id: number, n: number) => Promise<void>; getZoom: (id: number) => Promise<number> } } }).chrome.tabs;
        const [tab] = await api.query({ active: true, lastFocusedWindow: true });
        await api.setZoom(tab.id, factor); return api.getZoom(tab.id);
      }, factor);
    }
    for (const tema of ['oscuro', 'claro']) {
      await aplicarZoom(1);
      await p.goto('http://127.0.0.1:3031/?tema=' + tema);
      await p.getByRole('heading', { name: 'Accesibilidad de prueba' }).waitFor();
      await p.keyboard.press('Tab'); await foco(p.getByRole('link', { name: 'Saltar al contenido' }));
      await p.keyboard.press('Enter'); await foco(p.locator('#contenido-principal'));
      const buscador = p.getByRole('button', { name: 'Buscar página', exact: true });
      await tabHasta(buscador); await p.keyboard.press('Enter');
      await focoVisible(p.getByRole('combobox', { name: 'Buscar una sección', exact: true }));
      await relaciones(p.getByRole('combobox', { name: 'Buscar una sección', exact: true }));
      let ax = await arbol(tema + '-buscador');
      assert(ax.some(n => n.role?.value === 'dialog' && n.name?.value === 'Buscar página'));
      assert(ax.some(n => n.role?.value === 'listbox' && n.name?.value === 'Páginas disponibles'));
      await p.keyboard.press('Escape'); await foco(buscador);
      // El atajo debe regresar al control previamente enfocado.
      const selector = p.locator('#material');
      await tabHasta(selector); await p.keyboard.press('Control+k');
      await p.getByRole('dialog', { name: 'Buscar página', exact: true }).waitFor();
      await p.keyboard.press('Escape'); await foco(selector);
      await p.keyboard.press('Control+k');
      await p.getByRole('combobox', { name: 'Buscar una sección', exact: true }).fill('Compras Compras');
      await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
      await p.waitForFunction(() => (window as unknown as { __ruta: string }).__ruta === '/compras');
      await foco(selector);
      await p.keyboard.press('ArrowDown');
      const filtro = p.getByRole('combobox', { name: 'Buscar materia prima', exact: true });
      await focoVisible(filtro); await relaciones(filtro); await p.keyboard.type('plancha'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
      await p.getByRole('status').filter({ hasText: 'Seleccionado: 2' }).waitFor(); await foco(selector);
      await p.keyboard.press('ArrowDown'); await filtro.fill('inexistente');
      await p.getByText('No hay coincidencias.', { exact: true }).waitFor(); assert.equal(await p.getByText('No hay coincidencias.', { exact: true }).getAttribute('aria-live'), 'polite'); await p.keyboard.press('Escape'); await foco(selector);
      const abrir = p.getByRole('button', { name: 'Consultar documento', exact: true });
      await tabHasta(abrir); await p.keyboard.press('Enter');
      const dialogo = p.getByRole('dialog', { name: 'Documento de prueba' }); await dialogo.waitFor();
      for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); assert(await dialogo.evaluate(e => e.contains(document.activeElement)), 'Tab atrapado dentro del diálogo'); }
      await p.keyboard.press('Escape'); await foco(abrir);
      await tabHasta(p.getByRole('button', { name: 'Mostrar aviso', exact: true })); await p.keyboard.press('Enter');
      ax = await arbol(tema + '-aviso');
      assert(ax.some(n => n.properties?.some(v => v.name === 'live' && v.value.value === 'polite')), 'Avisos con anuncio polite');
      await p.goto('http://127.0.0.1:3031/ingresar?tema=' + tema);
      await p.getByLabel('Correo', { exact: true }).fill('persona@example.invalid');
      await p.getByLabel('Contraseña', { exact: true }).fill('Clave-ficticia');
      await tabHasta(p.getByRole('button', { name: 'Mostrar contraseña', exact: true })); await p.keyboard.press('Space');
      assert.equal(await p.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
      assert.equal(await p.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed'), 'true');
      await p.keyboard.press('Tab'); await p.keyboard.press('Enter');
      const alerta = p.getByRole('alert').filter({ hasText: 'Credenciales ficticias rechazadas.' }); await alerta.waitFor(); await foco(alerta);
      ax = await arbol(tema + '-ingreso-error');
      assert(ax.some(n => n.role?.value === 'textbox' && n.name?.value === 'Correo'));
      casos.push(tema + ': salto, buscador/atajo, selector, diálogo, aviso y error de ingreso con teclado y árbol AX');
      for (const ruta of ['ingresar', '']) {
        await aplicarZoom(1); await p.goto('http://127.0.0.1:3031/' + ruta + '?tema=' + tema);
        await p.getByRole('heading', { name: ruta ? 'Iniciar sesión' : 'Accesibilidad de prueba', exact: true }).waitFor();
        const antes = await p.evaluate(() => ({ ancho: innerWidth, dpr: devicePixelRatio, exterior: outerWidth }));
        assert.equal(await aplicarZoom(2), 2);
        await p.waitForFunction(a => innerWidth === a / 2, antes.ancho);
        const despues = await p.evaluate(() => ({ ancho: innerWidth, dpr: devicePixelRatio, exterior: outerWidth, sinDesborde: document.documentElement.scrollWidth <= innerWidth + 1 }));
        assert.equal(despues.dpr, antes.dpr * 2); assert.equal(despues.exterior, antes.exterior); assert(despues.sinDesborde);
        if (ruta) { await tabHasta(p.getByRole('button', { name: 'Ingresar', exact: true })); await visible(p.getByRole('button', { name: 'Ingresar', exact: true })); }
        else {
          const menu = p.getByRole('button', { name: 'Expandir menú', exact: true }); await tabHasta(menu); await p.keyboard.press('Enter');
          await p.getByRole('dialog', { name: 'Menú de navegación', exact: true }).waitFor(); await p.keyboard.press('Escape'); await foco(menu);
          await tabHasta(buscador); await p.keyboard.press('Enter');
          await visible(p.getByRole('combobox', { name: 'Buscar una sección', exact: true })); await p.screenshot({path:join(destino,tema+'-buscador-zoom200.png')}); await p.keyboard.press('Escape');
          await tabHasta(abrir); await p.keyboard.press('Enter');
          const volver = p.getByRole('button', { name: 'Volver al documento', exact: true }); await tabHasta(volver); await visible(volver);
        }
        zoom.push({ tema, ruta: ruta || '/', factor: 2, antes, despues });
        await p.screenshot({ path: join(destino, tema + '-' + (ruta || 'dialogo') + '-zoom200.png'), fullPage: false });
      }
    }
    assert.deepEqual(errores, []);
    const archivosFuente = ['src/components/layout/command-menu.tsx', 'src/components/formularios/selector-buscable.tsx', 'src/components/ui/command.tsx', 'src/components/ui/sidebar.tsx', 'src/components/ui/dialog.tsx'];
    const huellas = await Promise.all(archivosFuente.map(async archivo => ({ archivo, sha256: createHash('sha256').update(await readFile(archivo)).digest('hex') })));
    await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: true, alcance: 'Componentes reales, API/datos ficticios. AX no equivale a prueba auditiva con lector. Zoom real chrome.tabs.setZoom en perfil Chromium desechable.', casos, zoom, errores, huellas }, null, 2) + '\n');
    console.log('VG9.4: teclado, AX y zoom del navegador 200% correctos en ambos temas. Lector de pantalla real pendiente.');
  } finally { await contexto.close(); await rm(temporal, { recursive: true, force: true }); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
