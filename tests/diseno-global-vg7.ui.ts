// Galería de Cobranzas real. Consultas y acciones sustituidas por fixtures; sin base de datos.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium, type Page } from 'playwright';
const require = createRequire(import.meta.url), esbuild = createRequire(require.resolve('tsx/package.json'))('esbuild'), postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss'), tailwind = require('@tailwindcss/postcss');
const entrada = `import React from 'react';import{createRoot}from'react-dom/client';import{TooltipProvider}from'@/components/ui/tooltip';import{PermisosProvider}from'@/components/seguridad/permisos';import{Notificaciones}from'@/components/alertas/notificaciones';import Page from '@/app/(app)/ventas/cobranza/page';import{elegirTema}from'@/components/tema/estado';window.__cambiarTema=elegirTema;
const fecha='2026-10-27T12:00:00Z';window.__gd6={roles:['ADMINISTRADOR'],acciones:[],cuenta:{filtros:{q:'Cliente de prueba',estado:'TODOS',vencimiento:'TODOS',pagina:1,abonos:2,promesas:1,cuenta:1},filas:[],total:0,paginas:1,pendiente:'100.00',vencido:'0.00',hoy:'2026-10-27',c3Disponible:true,detalle:{id:1,folio:'OCC-TEST',cliente:'Cliente de prueba',sucursal:'Central',importe:'200.00',abonado:'100.00',saldo:'100.00',dueDate:'2026-11-27',invoiceDate:null,factura:null,paymentPromiseDate:'2026-11-01',voidedAt:null,versionPromesa:'version',totalPromesas:2,paginasPromesas:2,paginaPromesas:1,promesas:[{id:8,previousDate:null,newDate:'2026-11-01',reason:'Motivo histórico de promesa',createdAt:fecha}],totalAbonos:21,paginaAbonos:2,paginasAbonos:3,abonos:[{id:7,amount:'100.00',paidAt:fecha,createdAt:fecha,method:'Transferencia',reference:'Referencia extensa conservada',voidedAt:null,adjuntos:[{id:'archivo-a',originalName:'Anterior.pdf',createdAt:fecha},{id:'archivo-b',originalName:'Corregido.png',createdAt:fecha}]},{id:9,amount:'50.00',paidAt:fecha,createdAt:fecha,method:'Efectivo',reference:null,voidedAt:fecha,voidReason:'Error histórico',adjuntos:[]}]}}};

const ruta=location.pathname.slice(1);window.__llamadas=[];const datos=window.__gd6.cuenta;window.__gd6.roles=ruta==='lectura'?['CONSULTA_GERENCIA']:['ADMINISTRADOR'];
const fila={id:1,folio:'OCC-TEST',cliente:'Cliente de prueba',importe:'2000000.00',abonado:'1000000.00',saldo:'1000000.00',dueDate:'2026-10-20',voidedAt:null};datos.filas=ruta==='vacio'?[]:[fila,{...fila,id:2,folio:'OCC-PAGADA',saldo:'0.00',abonado:'2000000.00'},{...fila,id:3,folio:'OCC-ANULADA',voidedAt:fecha}];datos.total=datos.filas.length;datos.pendiente='1000000.00';datos.vencido='1000000.00';if(['listado','vacio','no-encontrada','sin-c3'].includes(ruta))datos.detalle=null;if(ruta==='no-encontrada')datos.cuentaNoEncontrada=true;if(ruta==='sin-c3')datos.c3Disponible=false;
async function montar(){const contenido=await Page({searchParams:Promise.resolve({})});createRoot(document.getElementById('root')).render(<TooltipProvider><PermisosProvider roles={window.__gd6.roles}><main className='mx-auto min-w-0 max-w-7xl p-4'>{contenido}</main><Notificaciones/></PermisosProvider></TooltipProvider>);}montar();`;
async function medir(p: Page) { return p.evaluate(() => { const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!; function color(v: string) { c.clearRect(0, 0, 1, 1); c.fillStyle = v; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; } function luz(a: number[]) { return a.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); } function fondo(e: Element) { const a: Element[] = []; for (let n: Element | null = e; n; n = n.parentElement)
    a.unshift(n); return a.reduce((bg, n) => { const v = color(getComputedStyle(n).backgroundColor); return bg.map((x, i) => v[i] * v[3] / 255 + x * (1 - v[3] / 255)); }, [255, 255, 255]); } return [...document.querySelectorAll('main p,main dt,main dd,main th,main td,main a,main label,main h1,main h3,main button:not(:disabled),[role="dialog"] p,[role="dialog"] dt,[role="dialog"] dd,[role="dialog"] a,[role="dialog"] button:not(:disabled),[role="dialog"] label,[role="alertdialog"] p')].filter(e => e.checkVisibility() && e.textContent?.trim() && ![...e.children].some(n => n.textContent?.trim())).map(e => { const a = luz(color(getComputedStyle(e).color)), b = luz(fondo(e)); return { texto: e.textContent!.slice(0, 75), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }; }); }); }
async function main() {
    const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg7');
    await mkdir(destino, { recursive: true });
    const archivo = resolve('src/app/globals.css'), css = await postcss([tailwind()]).process(await readFile(archivo, 'utf8'), { from: archivo });
    const fuentes = await Promise.all(['Regular', 'SemiBold'].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
    const bundle = await esbuild.build({ stdin: { contents: entrada, resolveDir: resolve('.'), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'sin-servidor', setup(b: {
                    onResolve: (o: {
                        filter: RegExp;
                    }, cb: (a: {
                        path: string;
                    }) => unknown) => void;
                    onLoad: (o: {
                        filter: RegExp;
                        namespace: string;
                    }, cb: (a: {
                        path: string;
                    }) => unknown) => void;
                }) {
                    b.onResolve({ filter: /^@\/lib\/(seguridad\/acceso|consultas\/cobranza)$/ }, a => ({ path: a.path, namespace: 'lecturas' }));
                    b.onLoad({ filter: /.*/, namespace: 'lecturas' }, a => ({ loader: 'js', contents: a.path.includes('acceso') ? `export async function exigirAcceso(){return{roles:window.__gd6.roles}}` : `export async function consultarCobranza(){return window.__gd6.cuenta}` }));
                    b.onResolve({ filter: /^@\/generated\/prisma\/client$/ }, () => ({ path: resolve('src/generated/prisma/browser.ts') }));
                    b.onResolve({ filter: /^next\/(navigation|link|image)$/ }, a => ({ path: a.path, namespace: 'next' }));
                    b.onLoad({ filter: /.*/, namespace: 'next' }, a => ({ loader: 'js', resolveDir: resolve('.'), contents: a.path === 'next/navigation' ? `export function useRouter(){return{refresh(){},push(){},replace(){}}}export function useSearchParams(){return new URLSearchParams()}export function usePathname(){return location.pathname}` : `import React from 'react';export default function Elemento({unoptimized,...p}){return React.createElement('${a.path === 'next/image' ? 'img' : 'a'}',p)}` }));
                    b.onResolve({ filter: /^@\/app\/.*actions$/ }, a => ({ path: resolve('src', a.path.slice(2) + '.ts'), namespace: 'acciones' }));
                    b.onLoad({ filter: /.*/, namespace: 'acciones' }, async (a) => { const s = await readFile(a.path, 'utf8'); const nombres = [...s.matchAll(/export async function (\w+)/g)].map(m => m[1]); return { loader: 'js', contents: nombres.map(n => `export async function ${n}(...args){const serializar=v=>v instanceof FormData?[...v.entries()].map(([k,x])=>[k,x instanceof File?{nombre:x.name,tipo:x.type,tamano:x.size}:x]):v;window.__llamadas.push({nombre:'${n}',args:args.map(serializar)});const intentos=window.__llamadas.filter(x=>x.nombre==='${n}').length;if(intentos===1)throw Error('Respuesta perdida simulada');return{ok:true,pagoId:7,mensaje:'Operación ficticia confirmada.'};}`).join('\n') }; });
                    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error('No se permite conectar a la base real'); });
                } }] });
    const browser = await chromium.launch({ headless: true }), resultados: unknown[] = [];
    const casos = ['listado', 'vacio', 'no-encontrada', 'sin-c3', 'cuenta', 'lectura', 'abono', 'anular', 'adjuntar', 'promesa', 'historial', 'promesas'] as const;
    try {
        for (const tema of ['oscuro', 'claro']) {
            const p = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' }), errores: string[] = [];
            p.on('pageerror', e => { errores.push(e.message); console.error('Error del ensayo:', e.message); });
            await p.route('**/*', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="es" class="${tema === 'oscuro' ? 'dark' : ''}"><head><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id="root"></div><script>localStorage.setItem('mtx-apariencia','${tema}');window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>` }));
            async function abrir(ruta: string) { await p.goto('http://127.0.0.1:3031/' + ruta); await p.locator('h1').waitFor(); if (!['listado', 'vacio', 'no-encontrada', 'sin-c3'].includes(ruta))
                await p.getByRole('dialog', { name: 'Detalle de cuenta por cobrar', exact: true }).waitFor(); await p.evaluate(() => document.fonts.ready); assert.equal(await p.locator('html').evaluate(e => e.classList.contains('dark')), tema === 'oscuro'); }
            async function captura(nombre: string) { await p.evaluate(() => new Promise<void>(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok())))); const contraste = await medir(p); assert.deepEqual(contraste.filter(c => c.ratio < 4.49), [], nombre); resultados.push({ tema, nombre, contraste }); assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), nombre + ' desborde de documento'); for (const d of await p.locator('[role=dialog]').all())
                assert(await d.evaluate(e => e.scrollWidth <= e.clientWidth + 1), nombre + ' desborde de diálogo'); if (nombre.startsWith('listado')) {
                const caja = await p.getByLabel('Cliente, OCC o factura', { exact: true }).boundingBox();
                assert(caja!.width >= 180, 'Buscador legible ' + nombre + ' ' + JSON.stringify(caja) + ' ' + JSON.stringify(await p.getByLabel('Cliente, OCC o factura', { exact: true }).evaluate(e => ({ clase: e.parentElement?.className, ancho: getComputedStyle(e.parentElement!).width, minimo: getComputedStyle(e.parentElement!).minWidth, flex: getComputedStyle(e.parentElement!).flex, body: getComputedStyle(document.body).fontSize }))));
            } await p.screenshot({ path: join(destino, `${tema}-${nombre}.png`), fullPage: true, animations: 'disabled' }); }
            for (const ruta of casos) {
                console.log('VG7', tema, ruta);
                await abrir(ruta);
                if (ruta === 'abono')
                    await p.getByRole('button', { name: 'Registrar abono', exact: true }).click();
                if (ruta === 'anular')
                    await p.getByRole('button', { name: 'Anular abono #7', exact: true }).click();
                if (ruta === 'adjuntar')
                    await p.getByRole('button', { name: 'Adjuntar comprobante', exact: true }).first().click();
                if (ruta === 'promesa')
                    await p.getByRole('button', { name: 'Cambiar promesa', exact: true }).click();
                if (ruta === 'historial')
                    await p.getByRole('button', { name: 'Ver Abono #7', exact: true }).click();
                if (ruta === 'promesas') {
                    await p.getByText('Historial de promesas (2)', { exact: true }).click();
                    await p.getByRole('button', { name: 'Ver Cambio de promesa #8', exact: true }).click();
                }
                for (const width of [360, 768, 1280]) {
                    await p.setViewportSize({ width, height: 1000 });
                    await captura(ruta + '-' + width);
                }
                if (['abono', 'anular', 'adjuntar', 'promesa'].includes(ruta)) {
                    const dialogo = p.getByRole('dialog').last();
                    const archivo = { name: 'Transferencia-de-prueba.png', mimeType: 'image/png', buffer: Buffer.from('comprobante ficticio') };
                    if (ruta === 'abono') {
                        await dialogo.getByLabel('Importe recibido (CLP)', { exact: true }).fill('12,34');
                        await dialogo.getByRole('combobox').selectOption('Cheque');
                        await dialogo.getByLabel('Referencia (opcional)', { exact: true }).fill('Referencia conservada');
                        await dialogo.locator('input[type=file]').setInputFiles(archivo);
                    }
                    if (ruta === 'anular')
                        await dialogo.getByLabel('Motivo de anulación', { exact: true }).fill('Error de registro de prueba');
                    if (ruta === 'adjuntar')
                        await dialogo.locator('input[type=file]').setInputFiles(archivo);
                    if (ruta === 'promesa') {
                        await dialogo.getByLabel('Nueva promesa (opcional)', { exact: true }).fill('2026-11-02');
                        await dialogo.getByLabel('Motivo del cambio', { exact: true }).fill('Compromiso de prueba');
                    }
                    await p.evaluate(t => (window as unknown as {
                        __cambiarTema: (t: string) => void;
                    }).__cambiarTema(t), tema === 'oscuro' ? 'claro' : 'oscuro');
                    if (ruta === 'abono')
                        assert.equal(await dialogo.getByLabel('Importe recibido (CLP)', { exact: true }).inputValue(), '12,34');
                    await p.evaluate(t => (window as unknown as {
                        __cambiarTema: (t: string) => void;
                    }).__cambiarTema(t), tema);
                    await dialogo.getByRole('button', { name: 'Revisar operación', exact: true }).click();
                    await captura(ruta + '-revision');
                    await dialogo.getByRole('button', { name: 'Volver a editar', exact: true }).click();
                    if (ruta === 'abono')
                        assert.equal(await dialogo.getByLabel('Importe recibido (CLP)', { exact: true }).inputValue(), '12,34');
                    await dialogo.getByRole('button', { name: 'Revisar operación', exact: true }).click();
                    await dialogo.getByRole('button', { name: 'Confirmar operación', exact: true }).click();
                    await dialogo.getByRole('button', { name: 'Reintentar misma operación', exact: true }).waitFor();
                    await p.keyboard.press('Escape');
                    assert.equal(await p.locator('[role=dialog]').count(), 2, 'La respuesta incierta conserva el diálogo');
                    await captura(ruta + '-incierto');
                    await dialogo.getByRole('button', { name: 'Reintentar misma operación', exact: true }).click();
                    if (ruta === 'abono') {
                        await dialogo.getByText('Abono #7 ya registrado;', { exact: false }).waitFor();
                        await dialogo.getByRole('button', { name: 'Reintentar misma operación', exact: true }).click();
                    }
                    await p.waitForFunction(() => document.querySelectorAll('[role=dialog]').length === 1);
                    const llamadas = await p.evaluate(() => (window as unknown as {
                        __llamadas: {
                            nombre: string;
                            args: unknown[];
                        }[];
                    }).__llamadas);
                    for (const nombre of new Set(llamadas.map(l => l.nombre))) {
                        const intentos = llamadas.filter(l => l.nombre === nombre);
                        assert.equal(intentos.length, 2, nombre + ' debe reintentar sin duplicar');
                        assert.deepEqual(intentos[0], intentos[1], nombre + ' conserva datos y clave');
                    }
                }
                if (ruta === 'listado') {
                    await p.setViewportSize({ width: 360, height: 1000 });
                    await p.evaluate(() => new Promise<void>(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
                    const region = p.getByRole('region', { name: 'Cuentas por cobrar', exact: true });
                    await region.focus();
                    await p.keyboard.press('ArrowRight');
                    await p.waitForFunction(() => document.querySelector('[aria-label="Cuentas por cobrar"]')!.scrollLeft > 0);
                }
                if (ruta === 'lectura')
                    assert.equal(await p.getByRole('button', { name: /Anular abono|Registrar abono|Adjuntar comprobante|Cambiar promesa/ }).count(), 0);
                await p.keyboard.press('Tab');
                assert(await p.evaluate(() => document.activeElement !== document.body), 'Foco de teclado disponible');
            }
            assert.deepEqual(errores, []);
            await p.close();
        }
        await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: true, alcance: 'Componentes, consultas y guardados simulados; sin PostgreSQL.', resultados }, null, 2) + '\n');
        console.log('VG7 Cobranzas: 12 superficies, ambos temas y tres anchos; acciones y consultas simuladas, sin PostgreSQL.');
    }
    finally {
        await browser.close();
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
