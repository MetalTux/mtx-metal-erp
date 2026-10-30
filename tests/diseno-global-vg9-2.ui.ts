// Componentes y redirecciones del cliente reales; servidor/API de acceso ficticios. Sin PostgreSQL.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
import { CLAVE_TEMA, SCRIPT_INICIAL_TEMA } from "../src/lib/tema-config";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind = require("@tailwindcss/postcss");
const entrada = `import React from 'react';import{createRoot}from'react-dom/client';import AuthLayout from '@/app/(auth)/layout';import{Ingreso}from'@/components/seguridad/ingreso';import{AppTopbar}from'@/components/layout/app-topbar';import{SidebarProvider,SidebarInset}from'@/components/ui/sidebar';import{PermisosProvider}from'@/components/seguridad/permisos';import{TooltipProvider}from'@/components/ui/tooltip';import{Notificaciones}from'@/components/alertas/notificaciones';
const acceso=location.pathname==='/ingresar';const titulo=location.pathname==='/compras'?'Compras de prueba':location.pathname==='/mi-acceso'?'Mi acceso de prueba':'Dashboard de prueba';
createRoot(document.getElementById('root')).render(<TooltipProvider><PermisosProvider roles={['ADMINISTRADOR']}>{acceso?<AuthLayout><Ingreso disponible/></AuthLayout>:<SidebarProvider><SidebarInset className='min-w-0'><AppTopbar sesion={{name:'Persona ficticia',roles:['ADMINISTRADOR']}} avisos={{datos:[]}}/><main className='space-y-4 p-4'><h1 className='text-[23px] font-semibold'>{titulo}</h1><nav className='flex flex-wrap gap-4'><a href='/'>Dashboard de prueba</a><a href='/compras'>Compras de prueba</a><a href='/mi-acceso'>Mi acceso de prueba</a></nav><label className='block'>Borrador<input aria-label='Borrador' className='block rounded-md border border-input bg-card p-2' defaultValue=''/></label></main></SidebarInset></SidebarProvider>}<Notificaciones/></PermisosProvider></TooltipProvider>);`;
async function main() {
  const destino = resolve(process.env.DISENO_EVIDENCIA_DIR ?? "var/validacion/diseno-global-vg9-2/ciclo");
  await mkdir(destino, { recursive: true });
  const archivo = resolve("src/app/globals.css");
  const css = await postcss([tailwind()]).process(await readFile(archivo, "utf8"), { from: archivo });
  const fuentes = await Promise.all(["Regular", "SemiBold"].map(async (n, i) => `@font-face{font-family:'IBM Plex Sans';font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile('src/app/fuentes/IBMPlexSans-' + n + '.woff2')).toString('base64')})}`));
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: "tsx", resolveDir: resolve(".") }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "router-ficticio", setup(b: { onResolve: (o: { filter: RegExp }, cb: (a: { path: string }) => unknown) => void; onLoad: (o: { filter: RegExp; namespace: string }, cb: (a: { path: string }) => unknown) => void }) {
    b.onResolve({ filter: /^next\/(navigation|link)$/ }, a => ({ path: a.path, namespace: "next" }));
    b.onLoad({ filter: /.*/, namespace: "next" }, a => ({ loader: "js", resolveDir: resolve("."), contents: a.path === "next/navigation" ? `export function useRouter(){return{push:v=>location.assign(v),replace:v=>location.replace(v),refresh:()=>location.reload()}}export function usePathname(){return location.pathname}` : `import React from 'react';export default function Link({scroll,...p}){return React.createElement('a',p)}` }));
    b.onResolve({ filter: /^@\/lib\/prisma$/ }, () => { throw Error("El ensayo no admite conexión a PostgreSQL"); });
  } }] });
  const html = `<!doctype html><html lang='es' class='dark'><head><style>${fuentes.join('')}${css.css}</style><script>${SCRIPT_INICIAL_TEMA}</script><script>window.__inicioTema={oscuro:document.documentElement.classList.contains('dark'),preferencia:document.documentElement.dataset.temaPreferencia};</script></head><body style="--font-plex:'IBM Plex Sans',sans-serif"><div id='root'></div><script>window.__name=f=>f;${bundle.outputFiles[0].text}</script></body></html>`;
  const browser = await chromium.launch({ headless: true });
  const casos: string[] = [], errores: string[] = [], acciones: string[] = [];
  try {
    const contexto = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 900 } });
    let conectada = false;
    await contexto.route("**/*", async r => {
      const url = new URL(r.request().url());
      assert.equal(url.origin, "http://127.0.0.1:3031");
      if (url.pathname === "/api/seguridad") {
        const datos = r.request().postDataJSON();
        assert(["login", "logout"].includes(datos.action), "Sólo ingreso/salida ficticios");
        acciones.push(datos.action); // No registrar contraseñas ni payloads.
        conectada = datos.action === "login";
        return r.fulfill({ json: { ok: true } });
      }
      assert.equal(r.request().method(), "GET");
      if (!conectada && url.pathname !== "/ingresar") return r.fulfill({ status: 302, headers: { location: "/ingresar" }, body: "" });
      return r.fulfill({ contentType: "text/html", body: html });
    });
    const p = await contexto.newPage();
    contexto.on("page", otra => otra.on("pageerror", e => errores.push(e.message)));
    p.on("pageerror", e => errores.push(e.message));
    async function listo(page: Page, oscuro: boolean, etiqueta: string) {
      await page.getByRole("button", { name: `Apariencia: ${etiqueta}`, exact: true }).waitFor();
      await page.waitForFunction(v => document.documentElement.classList.contains("dark") === v, oscuro);
    }
    async function elegir(page: Page, etiqueta: string) {
      await page.getByRole("button", { name: /^Apariencia:/ }).click();
      await page.getByRole("menuitemradio", { name: etiqueta, exact: true }).click();
    }
    async function inicial(page: Page, oscuro: boolean) {
      assert.equal(await page.evaluate(() => (window as unknown as { __inicioTema: { oscuro: boolean } }).__inicioTema.oscuro), oscuro, "Tema antes de montar React");
    }
    async function ingresar() {
      await p.getByRole("textbox", { name: "Correo", exact: true }).fill("apariencia@example.invalid");
      await p.getByLabel("Contraseña", { exact: true }).fill("Clave-ficticia-123");
      await p.getByRole("button", { name: "Ingresar", exact: true }).click();
      await p.getByRole("heading", { name: "Dashboard de prueba", exact: true }).waitFor();
    }
    await p.goto("http://127.0.0.1:3031/ingresar");
    await listo(p, true, "Oscuro"); await inicial(p, true);
    assert.equal(await p.evaluate(k => localStorage.getItem(k), CLAVE_TEMA), null);
    casos.push("Primer acceso Oscuro con SO Claro y sin preferencia guardada");
    for (const [etiqueta, valor, oscuro] of [["Claro", "claro", false], ["Oscuro", "oscuro", true], ["Según el sistema", "sistema", false]] as const) {
      await p.emulateMedia({ colorScheme: "light" });
      await elegir(p, etiqueta); await listo(p, oscuro, etiqueta);
      await ingresar(); await listo(p, oscuro, etiqueta); await inicial(p, oscuro);
      for (const ruta of ["Compras de prueba", "Mi acceso de prueba", "Dashboard de prueba"]) {
        await p.getByRole("link", { name: ruta, exact: true }).click();
        await p.getByRole("heading", { name: ruta, exact: true }).waitFor();
        await listo(p, oscuro, etiqueta); await inicial(p, oscuro);
      }
      await p.reload(); await listo(p, oscuro, etiqueta); await inicial(p, oscuro);
      assert.equal(await p.evaluate(k => localStorage.getItem(k), CLAVE_TEMA), valor);
      await p.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
      await p.getByRole("heading", { name: "Iniciar sesión", exact: true }).waitFor();
      await listo(p, oscuro, etiqueta); await inicial(p, oscuro);
      assert.equal(await p.evaluate(k => localStorage.getItem(k), CLAVE_TEMA), valor);
      casos.push(`Ingreso, tres rutas, recarga y salida conservan ${etiqueta}; API simulada`);
    }
    await p.emulateMedia({ colorScheme: "dark" }); await listo(p, true, "Según el sistema");
    await ingresar(); await listo(p, true, "Según el sistema"); await inicial(p, true);
    casos.push("Reingreso respeta Sistema guardado y SO Oscuro");
    await p.getByRole("textbox", { name: "Borrador", exact: true }).fill("Borrador conservado entre pestañas");
    const otra = await contexto.newPage(); await otra.goto("http://127.0.0.1:3031/");
    await listo(otra, false, "Según el sistema"); // Cada pestaña usa su propia media emulada.
    await elegir(otra, "Claro"); await listo(p, false, "Claro");
    assert.equal(await p.getByRole("textbox", { name: "Borrador", exact: true }).inputValue(), "Borrador conservado entre pestañas");
    await p.reload(); await listo(p, false, "Claro"); await inicial(p, false);
    await p.emulateMedia({ colorScheme: "light" }); await p.emulateMedia({ colorScheme: "dark" }); await listo(p, false, "Claro");
    casos.push("Dos pestañas sincronizan elección, conservan borrador y prioridad manual tras recargar");
    await p.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await p.getByRole("heading", { name: "Iniciar sesión", exact: true }).waitFor(); await listo(p, false, "Claro");
    await ingresar(); await listo(p, false, "Claro"); await inicial(p, false);
    casos.push("Salida y reingreso con Claro persistido aunque el SO esté Oscuro");
    await p.screenshot({ path: join(destino, "claro-erp-1280.png"), fullPage: true });
    assert.equal(acciones.filter(a => a === "login").length, 5);
    assert.equal(acciones.filter(a => a === "logout").length, 4);
    assert.deepEqual(errores, []);
    await writeFile(join(destino, "resultado.json"), JSON.stringify({ ok: true, alcance: "Componentes y navegación de documento reales, API y sesión simuladas; no acredita autenticación del servidor.", casos, acciones, errores }, null, 2) + "\n");
    console.log("VG9.2: tema conservado en ingreso/salida, navegación, recarga y pestañas. API y sesión ficticias; sin PostgreSQL.");
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
