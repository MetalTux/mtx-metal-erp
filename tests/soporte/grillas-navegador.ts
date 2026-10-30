import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { CLAVE_TEMA } from "../../src/lib/tema-config";
import type { Page } from "playwright";

export async function estilosGrillas(page: Page) {
  if (!process.env.GRILLAS_CSS) return;
  const fuentes = await Promise.all(["Regular", "SemiBold"].map(async (nombre, i) => `@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:${i ? 600 : 400};src:url(data:font/woff2;base64,${(await readFile(`src/app/fuentes/IBMPlexSans-${nombre}.woff2`)).toString("base64")})}`));
  await page.addStyleTag({ content: fuentes.join("\n") + await readFile(process.env.GRILLAS_CSS, "utf8") });
  await page.evaluate(({ oscuro, clave }) => {
    localStorage.setItem(clave, oscuro ? "oscuro" : "claro");
    document.documentElement.classList.toggle("dark", oscuro);
    document.documentElement.lang = "es";
    document.body.style.padding = "16px";
    document.body.style.setProperty("--font-plex", "'IBM Plex Sans', sans-serif");
    document.body.style.setProperty("--font-geist-mono", "monospace");
  }, { oscuro: process.env.GRILLAS_TEMA !== "claro", clave: CLAVE_TEMA });
}

/** Evidencia de componentes con datos ficticios; no representa navegación integral del ERP. */
export async function capturarGrillas(page: Page, nombre: string) {
  if (!process.env.GRILLAS_EVIDENCIA_DIR) return;
  assert(process.env.GRILLAS_CSS, "Las capturas requieren la hoja de estilos real.");
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("html").evaluate(e => e.classList.contains("dark")), process.env.GRILLAS_TEMA !== "claro", `${nombre}: tema conservado al abrir los componentes`);
  assert(await page.evaluate(() => document.fonts.check('14px "IBM Plex Sans"') && getComputedStyle(document.body).fontFamily.includes("IBM Plex Sans")), `${nombre}: fuente local del ERP`);
  await page.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll<HTMLElement>('[data-slot="table-container"],[role="dialog"]')){el.scrollLeft=0;el.scrollTop=0;}});
  const dialogos=await page.locator('[role="dialog"]').evaluateAll(els=>els.map(el=>({ancho:el.getBoundingClientRect().width,contenido:el.scrollWidth,interior:el.clientWidth})));for(const d of dialogos){assert(d.ancho<=await page.evaluate(()=>innerWidth)+1,`${nombre}: diálogo más ancho que la ventana`);assert(d.contenido<=d.interior+1,`${nombre}: desborde horizontal dentro del diálogo ${JSON.stringify(d)}`);}
  const desborde = await page.evaluate(() => ({ ancho:innerWidth,documento:document.documentElement.scrollWidth }));
  assert(desborde.documento <= desborde.ancho + 1, `${nombre}: desborde horizontal de página ${JSON.stringify(desborde)}`);
  assert.equal(await page.locator('form form').count(),0,"No debe haber formularios anidados");
  await mkdir(process.env.GRILLAS_EVIDENCIA_DIR,{recursive:true});
  await page.screenshot({path:join(process.env.GRILLAS_EVIDENCIA_DIR,`${nombre}.png`),fullPage:true,animations:"disabled"});
}
