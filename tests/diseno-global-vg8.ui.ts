/* eslint-disable @typescript-eslint/no-explicit-any -- Contratos ficticios del navegador; sin tipos del servidor ni datos reales. */
// Galería de seguridad y estados existentes. Consultas y acciones sustituidas por fixtures; sin base de datos.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium, type Page } from 'playwright';
const require = createRequire(import.meta.url), esbuild = createRequire(require.resolve('tsx/package.json'))('esbuild'), postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss'), tailwind = require('@tailwindcss/postcss');
const entrada = `import React from 'react';import{createRoot}from'react-dom/client';import{TooltipProvider}from'@/components/ui/tooltip';import{PermisosProvider}from'@/components/seguridad/permisos';import{Notificaciones}from'@/components/alertas/notificaciones';import{PanelAcceso}from'@/components/seguridad/panel';import{UsuariosSeguridad}from'@/components/seguridad/usuarios';import Auditoria from '@/app/(app)/administracion/auditoria/page';import Denegado from '@/app/(auth)/acceso-denegado/page';import NoEncontrado from '@/app/not-found';import{SidebarProvider,SidebarInset}from'@/components/ui/sidebar';import{AppSidebar}from'@/components/layout/app-sidebar';import{AppTopbar}from'@/components/layout/app-topbar';import{navegacionPermitida}from'@/config/navegacion';import{elegirTema}from'@/components/tema/estado';import E0 from '@/app/(app)/compras/error';import E1 from '@/app/(app)/compras/loading';import E2 from '@/app/(app)/configuracion/empresa/error';import E3 from '@/app/(app)/configuracion/empresa/loading';import E4 from '@/app/(app)/inventario/ajustes/error';import E5 from '@/app/(app)/inventario/ajustes/loading';import E6 from '@/app/(app)/inventario/movimientos/error';import E7 from '@/app/(app)/inventario/movimientos/loading';import E8 from '@/app/(app)/inventario/stock/error';import E9 from '@/app/(app)/inventario/stock/loading';import E10 from '@/app/(app)/inventario/traslados/error';import E11 from '@/app/(app)/inventario/traslados/loading';import E12 from '@/app/(app)/mantenedores/bodegas/error';import E13 from '@/app/(app)/mantenedores/bodegas/loading';import E14 from '@/app/(app)/mantenedores/clientes/error';import E15 from '@/app/(app)/mantenedores/clientes/loading';import E16 from '@/app/(app)/mantenedores/condiciones-pago/error';import E17 from '@/app/(app)/mantenedores/condiciones-pago/loading';import E18 from '@/app/(app)/mantenedores/materiales/error';import E19 from '@/app/(app)/mantenedores/materiales/loading';import E20 from '@/app/(app)/mantenedores/proveedores/error';import E21 from '@/app/(app)/mantenedores/proveedores/loading';import E22 from '@/app/(app)/mantenedores/unidades/error';import E23 from '@/app/(app)/mantenedores/unidades/loading';import E24 from '@/app/(app)/trabajos/despachos/error';import E25 from '@/app/(app)/trabajos/despachos/loading';
const ruta=location.pathname.slice(1),roles=ruta==='nav-ventas'?['VENTAS']:ruta==='nav-cobranza'?['COBRANZA']:ruta==='nav-bodega'?['COMPRAS_BODEGA']:ruta==='nav-produccion'?['PRODUCCION_DESPACHO']:ruta==='nav-consulta'?['CONSULTA_GERENCIA']:ruta==='nav-mixto'?['VENTAS','COBRANZA']:['ADMINISTRADOR'];window.__rutasPermitidas=navegacionPermitida(roles).flatMap(g=>g.elementos.map(e=>e.ruta));const fecha='2026-10-27T12:00:00Z';window.__llamadas=[];window.__cambiarTema=elegirTema;window.__seguridad={ruta,autenticado:false,llamadas:[]};const estados=[E0,E1,E2,E3,E4,E5,E6,E7,E8,E9,E10,E11,E12,E13,E14,E15,E16,E17,E18,E19,E20,E21,E22,E23,E24,E25];
async function montar(){const index=Number(ruta.replace('estado-',''));const contenido=ruta.startsWith('nav-')?<SidebarProvider defaultOpen><AppSidebar/><SidebarInset className='min-w-0'><AppTopbar sesion={{name:'Persona de prueba',roles}} avisos={{datos:[]}}/><div className='p-4'><h1 className='text-[23px] font-semibold'>Navegación de prueba</h1></div></SidebarInset></SidebarProvider>:ruta.startsWith('usuarios')?<UsuariosSeguridad/>:ruta.startsWith('auditoria')?await Auditoria({searchParams:Promise.resolve({})}):ruta==='no-encontrada'?<NoEncontrado/>:ruta==='denegado'?<Denegado/>:ruta.startsWith('estado-')?React.createElement(estados[index],{reset:()=>{window.__llamadas.push({nombre:'reset'})}}):<PanelAcceso/>;createRoot(document.getElementById('root')).render(<TooltipProvider><PermisosProvider roles={roles}><div className={ruta.startsWith('nav-')?'min-w-0':'mx-auto min-w-0 max-w-7xl p-4'}>{contenido}</div><Notificaciones/></PermisosProvider></TooltipProvider>);}montar();`;
async function medir(p: Page) { return p.evaluate(() => { const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!; function color(v: string) { c.clearRect(0, 0, 1, 1); c.fillStyle = v; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; } function luz(a: number[]) { return a.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); } function fondo(e: Element) { const a: Element[] = []; for (let n: Element | null = e; n; n = n.parentElement)
    a.unshift(n); return a.reduce((bg, n) => { const v = color(getComputedStyle(n).backgroundColor); return bg.map((x, i) => v[i] * v[3] / 255 + x * (1 - v[3] / 255)); }, [255, 255, 255]); } return [...document.querySelectorAll('#root p,#root th,#root td,#root a,#root label,#root h1,#root h2,#root h3,#root button:not(:disabled),[role="dialog"] p,[role="dialog"] label,[role="alertdialog"] p')].filter(e => e.checkVisibility() && e.textContent?.trim() && ![...e.children].some(n => n.textContent?.trim())).map(e => { const a = luz(color(getComputedStyle(e).color)), b = luz(fondo(e)); return { texto: e.textContent!.slice(0, 75), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) }; }); }); }
async function main() {
    const destino = resolve(process.env.VG8_EVIDENCIA_DIR ?? 'var/validacion/diseno-global-vg8');
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
                    b.onResolve({ filter: /^@\/lib\/seguridad\/(acceso|auditoria)$/ }, a => ({ path: a.path, namespace: 'lecturas' }));
                    b.onLoad({ filter: /.*/, namespace: 'lecturas' }, a => ({ loader: 'js', contents: a.path.endsWith('acceso') ? `export async function exigirAcceso(){return{roles:['ADMINISTRADOR']}}` : `export async function consultarAuditoria(){const autoria=location.pathname.includes('autoria'),vacio=location.pathname.includes('vacio');return{filtros:{vista:autoria?'autoria':'eventos',accion:'',resultado:'TODOS',tipo:'',recurso:'',desde:'',hasta:'',pagina:1},filas:vacio?[]:[{id:1,fecha:'2026-10-27T12:00:00Z',actor:'Administrador de prueba',afectado:'Usuario ficticio',accion:'INICIO_SESION',resultado:'CORRECTO',ip:'127.0.0.1',navegador:'Navegador de prueba',referencia:'User #1'}],total:vacio?0:1,paginas:1}}` }));
                    b.onResolve({ filter: /^@\/generated\/prisma\/client$/ }, () => ({ path: resolve('src/generated/prisma/browser.ts') }));
                    b.onResolve({ filter: /^next\/(navigation|link|image)$/ }, a => ({ path: a.path, namespace: 'next' }));
                    b.onLoad({ filter: /.*/, namespace: 'next' }, a => ({ loader: 'js', resolveDir: resolve('.'), contents: a.path === 'next/navigation' ? `export function useRouter(){return{refresh(){},push(){},replace(){}}}export function useSearchParams(){return new URLSearchParams()}export function usePathname(){return location.pathname}` : `import React from 'react';export default function Elemento({unoptimized,...p}){return React.createElement('${a.path === 'next/image' ? 'img' : 'a'}',p)}` }));
                    b.onResolve({ filter: /^@\/app\/.*actions$/ }, a => ({ path: resolve('src', a.path.slice(2) + '.ts'), namespace: 'acciones' }));
                    b.onLoad({ filter: /.*/, namespace: 'acciones' }, async (a) => { const s = await readFile(a.path, 'utf8'); const nombres = [...s.matchAll(/export async function (\w+)/g)].map(m => m[1]); return { loader: 'js', contents: nombres.map(n => `export async function ${n}(...args){window.__llamadas.push({nombre:'${n}',args});if('${n}'==='consultar')return{ok:true,documento:window.__fixtures.trabajo};if('${n}'==='consultarPdfsTrabajo')return{ok:true,filas:[]};return{ok:false,mensaje:'No se confirmó el resultado de prueba. Conserva el borrador y reintenta.'};}`).join('\n') }; });
                    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error('No se permite conectar a la base real'); });
                } }] });
    const browser = await chromium.launch({ headless: true }), resultados: unknown[] = [];
    const casos = ['panel', 'factor', 'configurar', 'codigos', 'usuarios', 'usuarios-vacio', 'usuarios-error', 'usuarios-crear', 'usuarios-editar', 'usuarios-ver', 'usuarios-confirmar', 'usuarios-reauth', 'usuarios-enlace', 'auditoria', 'auditoria-autoria', 'auditoria-vacio', 'auditoria-depurar', 'denegado', 'no-encontrada', 'nav-admin', 'nav-ventas', 'nav-cobranza', 'nav-bodega', 'nav-produccion', 'nav-consulta', 'nav-mixto', 'nav-menu', 'nav-buscar', 'nav-avisos', 'estado-0', 'estado-1', 'estado-2', 'estado-3', 'estado-4', 'estado-5', 'estado-6', 'estado-7', 'estado-8', 'estado-9', 'estado-10', 'estado-11', 'estado-12', 'estado-13', 'estado-14', 'estado-15', 'estado-16', 'estado-17', 'estado-18', 'estado-19', 'estado-20', 'estado-21', 'estado-22', 'estado-23', 'estado-24', 'estado-25'] as const;
    try {
        for (const tema of ['oscuro', 'claro']) {
            const p = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' }), errores: string[] = [];
            p.on('pageerror', e => { errores.push(e.message); console.error('Error del ensayo:', e.message); });
            await p.route('**/*', async (r) => { if (r.request().url().includes('/api/seguridad')) {
                const respuesta = await p.evaluate(datos => { const estado = (window as any).__seguridad; estado.llamadas.push(datos); const fecha = '2026-10-27T12:00:00Z'; if (datos.action === 'self')
                    return { ok: true, user: { id: 1, name: 'Persona de prueba', email: 'persona@example.invalid', roles: ['ADMINISTRADOR'], factor: estado.ruta === 'factor' || estado.ruta === 'codigos' || estado.ruta === 'usuarios-reauth', localAllowed: true, version: 1 }, sessions: [{ id: 'actual', current: true, createdAt: fecha, lastActivityAt: fecha, expiresAt: fecha }, { id: 'otra', current: false, createdAt: fecha, lastActivityAt: fecha, expiresAt: fecha }] }; if (datos.action === 'users')
                    return estado.ruta === 'usuarios-error' ? { ok: false, message: 'No se pudo consultar. Actualiza la lista.' } : { ok: true, total: estado.ruta === 'usuarios-vacio' ? 0 : 1, rows: estado.ruta === 'usuarios-vacio' ? [] : [{ userId: 2, name: 'Usuario de prueba', normalizedEmail: 'usuario@example.invalid', roles: ['VENTAS', 'COBRANZA'], status: 'ACTIVO', securityVersion: 3, lastLoginAt: fecha }] }; if (datos.action === 'reauth') {
                    estado.autenticado = true;
                    return { ok: true };
                } if (['user-create', 'user-update', 'user-token'].includes(datos.action)) {
                    if (!estado.autenticado)
                        return { ok: false, reauthRequired: true };
                    return datos.action === 'user-token' ? { ok: true, link: 'https://ejemplo.invalid/activar#token=FICTICIO-SIN-VALIDEZ' } : { ok: true };
                } if (datos.action === 'factor-setup')
                    return { ok: true, setup: 'CONFIGURACION-FICTICIA', secret: 'CLAVE-FICTICIA-NO-VALIDA' }; if (datos.action === 'factor-codes')
                    return { ok: true, codes: ['RESPALDO-FICTICIO-1', 'RESPALDO-FICTICIO-2'] }; return { ok: true, message: 'Operación de prueba confirmada.' }; }, r.request().postDataJSON());
                return r.fulfill({ json: respuesta });
            } return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="es" class="${tema === 'oscuro' ? 'dark' : ''}"><head><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id="root"></div><script>localStorage.setItem('mtx-apariencia','${tema}');window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>` }); });
            async function abrir(ruta: string) { await p.goto('http://127.0.0.1:3031/' + ruta); await p.locator('#root').waitFor(); if (!ruta.startsWith('estado-'))
                await p.locator('h1').waitFor(); if (['panel', 'factor', 'configurar', 'codigos'].includes(ruta))
                await p.getByText('Persona de prueba', { exact: true }).waitFor(); if (ruta.startsWith('usuarios') && !['usuarios-vacio', 'usuarios-error'].includes(ruta))
                await p.getByText('Usuario de prueba', { exact: true }).waitFor(); await p.evaluate(() => document.fonts.ready); assert.equal(await p.locator('html').evaluate(e => e.classList.contains('dark')), tema === 'oscuro'); }
            async function captura(nombre: string) { await p.evaluate(() => new Promise<void>(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok())))); const contraste = await medir(p); assert.deepEqual(contraste.filter(c => c.ratio < 4.49), [], nombre); resultados.push({ tema, nombre, contraste }); assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), nombre + ' desborde de documento'); await p.screenshot({ path: join(destino, `${tema}-${nombre}.png`), fullPage: true, animations: 'disabled' }); }
            for (const ruta of casos) {
                console.log('VG8', tema, ruta);
                await abrir(ruta);
                if (ruta === 'configurar')
                    await p.getByRole('button', { name: 'Configurar doble factor', exact: true }).click();
                if (ruta === 'codigos') {
                    await p.getByRole('button', { name: 'Generar nuevos códigos', exact: true }).click();
                    await p.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
                    await p.getByRole('dialog', { name: 'Códigos personales de respaldo', exact: true }).waitFor();
                }
                if (ruta === 'usuarios-crear')
                    await p.getByRole('button', { name: 'Crear usuario', exact: true }).click();
                if (ruta === 'usuarios-editar')
                    await p.getByRole('button', { name: 'Editar', exact: true }).click();
                if (ruta === 'usuarios-ver')
                    await p.getByRole('button', { name: 'Ver', exact: true }).click();
                if (['usuarios-confirmar', 'usuarios-reauth', 'usuarios-enlace'].includes(ruta)) {
                    if (ruta === 'usuarios-enlace')
                        await p.getByRole('button', { name: 'Recuperar acceso', exact: true }).click();
                    else {
                        await p.getByRole('button', { name: 'Editar', exact: true }).click();
                        await p.getByLabel('Nombre', { exact: true }).fill('Nombre pendiente conservado');
                        await p.getByRole('button', { name: 'Revisar cambio', exact: true }).click();
                    }
                    if (ruta !== 'usuarios-confirmar') {
                        await p.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
                        await p.getByRole('dialog', { name: 'Confirmar identidad del Administrador', exact: true }).waitFor();
                        if (ruta === 'usuarios-enlace') {
                            await p.getByLabel('Contraseña del Administrador', { exact: true }).fill('Clave-ficticia-123');
                            await p.getByRole('dialog').getByRole('button', { name: 'Confirmar identidad', exact: true }).click();
                            await p.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
                            await p.getByRole('dialog', { name: 'Enlace privado para el titular', exact: true }).waitFor();
                        }
                    }
                }
                if (ruta === 'nav-menu')
                    await p.getByRole('button', { name: 'Menú de usuario', exact: true }).click();
                if (ruta === 'nav-buscar') {
                    await p.keyboard.press('Control+k');
                    await p.getByRole('dialog', { name: 'Buscar página', exact: true }).waitFor();
                }
                if (ruta === 'nav-avisos')
                    await p.getByRole('button', { name: 'Notificaciones', exact: true }).click();
                if (ruta === 'auditoria-depurar') {
                    await p.getByRole('button', { name: 'Depurar eventos antiguos', exact: true }).click();
                    await p.getByRole('alertdialog').waitFor();
                }
                for (const width of [360, 768, 1280]) {
                    await p.setViewportSize({ width, height: 1000 });
                    await captura(ruta + '-' + width);
                }
                if (ruta.startsWith('nav-') && !['nav-buscar', 'nav-menu', 'nav-avisos'].includes(ruta)) {
                    const visibles = await p.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link').evaluateAll(els => els.map(e => e.getAttribute('href')));
                    const permitidas = await p.evaluate(() => (window as any).__rutasPermitidas);
                    assert.deepEqual(visibles.sort(), permitidas.sort());
                    if (ruta !== 'nav-admin')
                        assert(!visibles.includes('/administracion/usuarios'));
                }
                if (ruta === 'codigos') {
                    await p.getByRole('button', { name: 'Ya guardé mis códigos', exact: true }).click();
                    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
                    assert.equal(await p.evaluate(() => document.activeElement?.textContent?.slice(0, 40)), 'Generar nuevos códigos');
                }
                if (ruta === 'usuarios-ver') {
                    await p.getByRole('button', { name: 'Cerrar', exact: true }).first().click();
                    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
                    assert.equal(await p.evaluate(() => document.activeElement?.textContent?.slice(0, 40)), 'Ver');
                }
                if (ruta === 'usuarios-reauth') {
                    await p.evaluate(t => (window as any).__cambiarTema(t), tema === 'oscuro' ? 'claro' : 'oscuro');
                    await p.evaluate(t => (window as any).__cambiarTema(t), tema);
                    await p.getByLabel('Contraseña del Administrador', { exact: true }).fill('Clave-ficticia-123');
                    await p.getByLabel('Código actual o respaldo', { exact: true }).fill('123456');
                    await p.getByRole('dialog').getByRole('button', { name: 'Confirmar identidad', exact: true }).click();
                    await p.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
                    await p.waitForFunction(() => !document.querySelector('[role=dialog]'));
                    const llamadas = await p.evaluate(() => (window as any).__seguridad.llamadas.filter((v: any) => v.action === 'user-update'));
                    assert.equal(llamadas.length, 2);
                    assert.deepEqual(llamadas[0], llamadas[1]);
                    assert.equal(llamadas[0].name, 'Nombre pendiente conservado');
                }
            }
            assert.deepEqual(errores, []);
            await p.close();
        }
        await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: true, alcance: 'Componentes, consultas y guardados simulados; sin PostgreSQL.', resultados }, null, 2) + '\n');
        console.log('VG8: administración, cuenta y estados existentes verificados en ambos temas; consultas/API simuladas, sin PostgreSQL.');
    }
    finally {
        await browser.close();
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
