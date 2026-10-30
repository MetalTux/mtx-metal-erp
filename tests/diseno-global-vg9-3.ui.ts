// Contraste de componentes reales y estados con datos ficticios. Sin Next/API/PostgreSQL.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind = require("@tailwindcss/postcss");
const entrada = `import React from 'react';import{createRoot}from'react-dom/client';import{Button}from'@/components/ui/button';import{Input}from'@/components/ui/input';import{Textarea}from'@/components/ui/textarea';import{Label}from'@/components/ui/label';import{InputGroup,InputGroupInput,InputGroupAddon}from'@/components/ui/input-group';import{DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuRadioGroup,DropdownMenuRadioItem}from'@/components/ui/dropdown-menu';import{Command,CommandInput,CommandList,CommandItem}from'@/components/ui/command';import{Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription}from'@/components/ui/dialog';import{Aviso}from'@/components/alertas/aviso';import{SelectorBuscable}from'@/components/formularios/selector-buscable';
const variantes=['default','outline','secondary','ghost','destructive','link'];function App(){return <main className='space-y-4 p-4'><h1 className='text-[23px] font-semibold'>Contraste VG9.3 · datos ficticios</h1><div className='grid gap-4 md:grid-cols-2'>{['bg-background','bg-card','bg-muted','bg-info'].map((f,i)=><section key={f} data-superficie={f} className={f+' min-w-0 space-y-3 border border-border p-3'}><h2 data-texto>{f}</h2><p data-texto className='text-muted-foreground'>Texto secundario y ayuda de formulario</p><p data-texto className='text-success'>Disponible</p><p data-texto className='text-warning'>Pendiente</p><p data-texto className='text-destructive'>Error de validación</p><p data-texto className='text-info-foreground'>Información</p><p data-texto className='text-brand'>Marca</p><a data-texto href='#' className='text-link underline'>Consultar documento</a><div className='flex flex-wrap gap-2'>{variantes.map(v=><React.Fragment key={v}><Button id={'b-'+i+'-'+v} data-texto variant={v}>{v}</Button><Button data-texto variant={v} disabled>{v} no disponible</Button></React.Fragment>)}</div><label>Campo<Input id={'campo-'+i} data-texto data-borde aria-label={'Campo '+i} defaultValue='Valor de trabajo'/></label><label>Placeholder<Input data-texto data-borde aria-label={'Placeholder '+i} placeholder='Buscar documento…'/></label><label>Campo con error<Input id={'error-'+i} data-texto data-borde aria-label={'Error '+i} aria-invalid defaultValue='Dato inválido'/></label><label>Campo no disponible<Input data-texto data-borde disabled defaultValue='Valor no disponible'/></label><fieldset disabled><Label data-texto htmlFor={'heredado-'+i}>Etiqueta de campo no disponible</Label><Input id={'heredado-'+i} data-texto data-borde defaultValue='Bloqueado por el formulario'/></fieldset><label>Observación<Textarea id={'texto-'+i} data-texto data-borde aria-label={'Observación '+i} defaultValue='Texto de observación'/></label><label>Observación bloqueada<Textarea data-texto data-borde disabled defaultValue='Observación conservada'/></label><InputGroup id={'grupo-'+i} data-borde><InputGroupAddon><span data-texto>CLP</span></InputGroupAddon><InputGroupInput id={'grupo-campo-'+i} data-texto aria-label={'Importe '+i} defaultValue='15000'/></InputGroup><InputGroup data-borde><InputGroupAddon><span data-texto>CLP</span></InputGroupAddon><InputGroupInput data-texto aria-label={'Importe no disponible '+i} disabled defaultValue='15000'/></InputGroup><label>Estado<select id={'nativo-'+i} data-texto data-borde className='block h-9 w-full rounded-md border border-input bg-card px-3'><option>Activo</option></select></label><SelectorBuscable id={'selector-'+i} nombre='material' placeholder='Seleccionar material…' opciones={[{valor:'1',etiqueta:'Perfil de prueba'},{valor:'2',etiqueta:'Plancha de prueba'}]} valor='' onChange={()=>{}}/><svg viewBox='0 0 300 40' className='h-10 w-full' aria-label='Series con etiquetas' role='img'>{[1,2,3,4,5].map((n)=><rect key={n} data-grafico={'Serie '+n} x={n*50-40} y='4' width='24' height='30' style={{fill:'var(--chart-'+n+')'}}/>)}</svg></section>)}</div><section className='space-y-3'><Aviso titulo='Error de operación'>Revisa los datos antes de confirmar.</Aviso><Aviso tipo='exito' titulo='Operación confirmada'>Documento de prueba conservado.</Aviso><Aviso tipo='informacion' titulo='Información'>Las cantidades mantienen su unidad.</Aviso><p id='seleccion' data-texto>Texto que admite selección del usuario</p></section><Command label='Opciones de prueba'><CommandInput aria-label='Buscar opción' placeholder='Buscar opción…'/><CommandList><CommandItem id='opcion-activa' data-texto value='activa'>Opción seleccionable</CommandItem><CommandItem data-texto value='inactiva' disabled>Opción no disponible</CommandItem></CommandList></Command><DropdownMenu><DropdownMenuTrigger asChild><Button>Abrir menú</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem id='menu-consultar' data-texto>Consultar</DropdownMenuItem><DropdownMenuItem id='menu-anular' data-texto variant='destructive'>Anular</DropdownMenuItem><DropdownMenuItem data-texto disabled>Eliminar: requiere anular previamente</DropdownMenuItem><DropdownMenuRadioGroup value='uno'><DropdownMenuRadioItem data-texto value='uno'>Opción elegida</DropdownMenuRadioItem><DropdownMenuRadioItem data-texto value='dos' disabled>Opción deshabilitada</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu><Dialog><DialogTrigger asChild><Button>Abrir diálogo</Button></DialogTrigger><DialogContent><DialogTitle data-texto>Consulta de prueba</DialogTitle><DialogDescription data-texto>Datos ficticios y errores conservados.</DialogDescription><label data-texto>Descripción<Input data-texto data-borde defaultValue='Documento de prueba'/></label></DialogContent></Dialog></main>};createRoot(document.getElementById('root')).render(<App/>);`;
type Medicion = {
    tema: string;
    estado: string;
    elemento: string;
    tipo: string;
    ratio: number;
    minimo: number;
    color: string;
    fondo: string;
};
async function medir(p: Page, tema: string, estado: string, focoId?: string): Promise<Medicion[]> {
    return p.evaluate(({ tema, estado, focoId }) => {
        type Color = number[];
        const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        function color(s: string): Color {
            assertColor(s);
            canvas.clearRect(0, 0, 1, 1);
            canvas.fillStyle = s;
            canvas.fillRect(0, 0, 1, 1);
            const a = [...canvas.getImageData(0, 0, 1, 1).data];
            return [a[0], a[1], a[2], a[3] / 255];
        }
        function assertColor(s: string) { if (!CSS.supports("color", s))
            throw Error("Color no interpretable: " + s); }
        function sobre(a: Color, b: Color): Color { const alfa = a[3] + b[3] * (1 - a[3]); return alfa ? [0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alfa).concat(alfa) : [0, 0, 0, 0]; }
        function luz(a: Color) { return a.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
        function ratio(a: Color, b: Color) { const x = luz(a), y = luz(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
        function cadena(e: Element) { const a: Element[] = []; for (let n: Element | null = e; n; n = n.parentElement)
            a.unshift(n); return a; }
        // Composición por grupos: incluye alfa de colores y opacity del elemento y de sus ancestros.
        function pintura(e: Element, tinta?: string, opacidad = 1): Color {
            const a = cadena(e);
            function capa(i: number): Color {
                const s = getComputedStyle(a[i]);
                let c = color(s.backgroundColor);
                if (i < a.length - 1)
                    c = sobre(capa(i + 1), c);
                else if (tinta) {
                    const t = color(tinta);
                    t[3] *= opacidad;
                    c = sobre(t, c);
                }
                c[3] *= Number(s.opacity);
                return c;
            }
            return sobre(capa(0), [255, 255, 255, 1]);
        }
        const datos: Medicion[] = [];
        function agregar(e: Element, tipo: string, tinta: string, minimo: number, fondo = pintura(e), opacidad = 1) {
            const pintado = pintura(e, tinta, opacidad);
            datos.push({ tema, estado, elemento: e.id || (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 90) || e.tagName, tipo, ratio: ratio(pintado, fondo), minimo, color: JSON.stringify(pintado), fondo: JSON.stringify(fondo) });
        }
        for (const e of document.querySelectorAll('[data-texto],[role=alert] p,[role=alert] > div > div,[role=status] p,[role=status] > div > div')) {
            if (!e.checkVisibility() || e.closest('[aria-hidden=true],[inert]'))
                continue;
            const s = getComputedStyle(e);
            const tinta = e.matches('input,textarea') ? s.getPropertyValue('-webkit-text-fill-color') || s.color : s.color;
            agregar(e, 'texto', tinta, 4.5);
            if (e.matches('input[placeholder],textarea[placeholder]') && !(e as HTMLInputElement).value) {
                const pseudo = getComputedStyle(e, '::placeholder');
                agregar(e, 'placeholder', pseudo.color, 4.5, pintura(e), Number(pseudo.opacity));
            }
        }
        for (const e of document.querySelectorAll('[data-borde],button[role=combobox],[data-slot=button][data-variant=outline]')) {
            if (!e.checkVisibility() || e.closest('[aria-hidden=true],[inert]'))
                continue;
            const s = getComputedStyle(e);
            agregar(e, 'borde interior', s.borderTopColor, 3);
            // La cara exterior del control descansa en su contenedor, no en su propio relleno.
            const exterior = pintura(e.parentElement!);
            const borde = pintura(e, s.borderTopColor);
            datos.push({ tema, estado, elemento: e.id || e.tagName, tipo: 'borde exterior', ratio: ratio(borde, exterior), minimo: 3, color: JSON.stringify(borde), fondo: JSON.stringify(exterior) });
        }
        for (const e of document.querySelectorAll('[role=combobox] svg,[data-slot=command-input-wrapper] svg')) {
            if (e.checkVisibility() && !e.parentElement!.closest('[aria-hidden=true],[inert]'))
                agregar(e, 'icono de control', getComputedStyle(e).stroke, 3);
        }
        for (const e of document.querySelectorAll('[data-grafico]')) {
            if (e.checkVisibility() && !e.closest('[aria-hidden=true],[inert]'))
                agregar(e, 'gráfico', getComputedStyle(e).fill, 3);
        }
        const seleccion = document.querySelector('#seleccion')!;
        if (!seleccion.closest('[aria-hidden=true],[inert]')) {
            const s = getComputedStyle(seleccion, '::selection');
            agregar(seleccion, 'selección de texto', s.color, 4.5, sobre(color(s.backgroundColor), pintura(seleccion)));
            // En la selección, el texto se pinta sobre el fondo seleccionado (sin usar el fondo original).
            datos[datos.length - 1].ratio = ratio(sobre(color(s.color), color(s.backgroundColor)), color(s.backgroundColor));
        }
        const seleccionado = document.querySelector('[data-slot=command-item][data-selected=true]');
        if (seleccionado && !seleccionado.closest('[aria-hidden=true],[inert]')) {
            const estilo = getComputedStyle(seleccionado);
            if (estilo.outlineStyle !== 'none' && estilo.outlineWidth !== '0px')
                agregar(seleccionado, 'indicador de selección', estilo.outlineColor, 3);
            else
                datos.push({ tema, estado, elemento: 'Selección de opción', tipo: 'indicador de selección', ratio: 1, minimo: 3, color: 'sin contorno', fondo: 'sin contorno' });
        }
        if (focoId) {
            const e = document.getElementById(focoId)!;
            const s = getComputedStyle(e), exterior = pintura(e.parentElement!);
            if (e.matches(':focus-visible') || e.querySelector(':focus-visible')) {
                const c = s.getPropertyValue('--tw-ring-color').trim();
                if (c && s.boxShadow !== 'none') {
                    const ring = sobre(color(c), exterior);
                    datos.push({ tema, estado, elemento: focoId, tipo: 'foco (anillo)', ratio: ratio(ring, exterior), minimo: 3, color: JSON.stringify(ring), fondo: JSON.stringify(exterior) });
                }
                else if (s.outlineStyle !== 'none' && s.outlineWidth !== '0px') {
                    const contorno = sobre(color(s.outlineColor), exterior);
                    datos.push({ tema, estado, elemento: focoId, tipo: 'foco (contorno)', ratio: ratio(contorno, exterior), minimo: 3, color: JSON.stringify(contorno), fondo: JSON.stringify(exterior) });
                }
                else
                    throw Error('Foco sin indicador medible: ' + focoId);
            }
            else
                throw Error('El elemento no recibió foco visible: ' + focoId);
        }
        return datos;
    }, { tema, estado, focoId });
}
async function main() {
    const diagnostico = process.env.VG9_3_DIAGNOSTICO === '1';
    const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? resolve('var/validacion/diseno-global-vg9-3', diagnostico ? 'antes' : 'final'));
    await mkdir(destino, { recursive: true });
    const archivo = resolve('src/app/globals.css');
    const css = await postcss([tailwind()]).process(await readFile(archivo, 'utf8'), { from: archivo });
    const fuentes = await Promise.all(['Regular', 'SemiBold'].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
    const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
    const browser = await chromium.launch({ headless: true }), resultados: Medicion[] = [], errores: string[] = [];
    try {
        for (const tema of ['claro', 'oscuro']) {
            const p = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
            p.on('pageerror', e => errores.push(e.message));
            await p.route('**/*', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang='es' class='${tema === 'oscuro' ? 'dark' : ''}'><head><style>${fuentes.join('')}${css.css}</style></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id='root'></div><script>window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>` }));
            await p.goto('http://127.0.0.1:3031/contraste-vg9-3');
            await p.getByRole('heading', { level: 1 }).waitFor();
            await p.evaluate(() => document.fonts.ready);
            await p.evaluate(() => new Promise<void>(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
            resultados.push(...await medir(p, tema, 'normal'));
            for (const superficie of [0, 1, 2, 3])
                for (const v of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']) {
                    await p.locator('#b-' + superficie + '-' + v).hover();
                    await p.locator('#b-' + superficie + '-' + v).evaluate(e => Promise.all(e.getAnimations().map(a => a.finished)));await p.evaluate(()=>new Promise<void>(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>ok()))));
                    resultados.push(...await medir(p, tema, 'hover ' + superficie + ' ' + v));
                }
            await p.mouse.move(0, 0);
            for (const id of ['b-0-default', 'b-0-outline', 'b-0-destructive', 'campo-0', 'error-0', 'texto-0', 'grupo-0', 'nativo-0']) {
                await p.keyboard.press('Tab');
                await p.locator('#' + (id === 'grupo-0' ? 'grupo-campo-0' : id)).focus();
                resultados.push(...await medir(p, tema, 'foco ' + id, id));
                if (id === 'campo-0')
                    await p.locator('[data-superficie=bg-background]').screenshot({ path: join(destino, tema + '-controles-foco.png'), animations: 'disabled' });
            }
            await p.getByRole('button', { name: 'Abrir diálogo', exact: true }).click();
            await p.getByRole('dialog').evaluate(e => Promise.all(e.getAnimations().map(a => a.finished)));
            resultados.push(...await medir(p, tema, 'diálogo'));
            await p.getByRole('button', { name: 'Cerrar', exact: true }).click();
            await p.getByRole('dialog').waitFor({ state: 'hidden' });
            await p.getByRole('button', { name: 'Abrir menú', exact: true }).press('Enter');
            await p.getByRole('menuitem', { name: 'Consultar', exact: true }).waitFor();
            await p.evaluate(() => new Promise<void>(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
            await p.locator('[data-slot=dropdown-menu-content]').evaluate(e => Promise.all(e.getAnimations().map(a => a.finished)));
            resultados.push(...await medir(p, tema, 'menú abierto', 'menu-consultar'));
            await p.getByRole('menuitem', { name: 'Anular', exact: true }).focus();
            resultados.push(...await medir(p, tema, 'menú enfocado', 'menu-anular'));
            await p.screenshot({ path: join(destino, tema + '-menu-1280.png'), fullPage: false, animations: 'disabled' });
            await p.keyboard.press('Escape');
            for (const width of [360, 1280]) {
                await p.setViewportSize({ width, height: 1000 });
                await p.screenshot({ path: join(destino, tema + '-' + width + '.png'), fullPage: true, animations: 'disabled' });
            }
            await p.close();
        }
        const fallos = resultados.filter(r => r.ratio + 1e-9 < r.minimo);
        await writeFile(join(destino, 'resultado.json'), JSON.stringify({ ok: fallos.length === 0 && errores.length === 0, alcance: 'Componentes reales y composición de colores/opacidades; sin datos/API/BD. No mide antialiasing ni imágenes/documentos históricos.', mediciones: resultados.length, fallos, errores, resultados }, null, 2) + '\n');
        console.log(JSON.stringify({ diagnostico, mediciones: resultados.length, fallos: fallos.length, muestra: fallos.slice(0, 12) }, null, 2));
        assert.deepEqual(errores, []);
        if (!diagnostico)
            assert.equal(fallos.length, 0, 'Hay contrastes bajo el objetivo');
    }
    finally {
        await browser.close();
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
