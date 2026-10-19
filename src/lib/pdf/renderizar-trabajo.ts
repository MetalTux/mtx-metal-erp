import { chromium } from "playwright";
import { htmlTrabajoPdf } from "./plantilla-trabajo";
import { escaparPdf } from "./plantilla-cotizacion";
import type { DocumentoPdfTrabajo } from "./documento-trabajo";
/** Chromium imprime HTML validado, sin navegación ni descarga de recursos remotos. */
export async function renderizarTrabajoPdf(documento: DocumentoPdfTrabajo, recursos: Record<string,string>): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true, timeout: 30000,
    ...(process.env.TRABAJO_CHROMIUM_PATH ? { executablePath: process.env.TRABAJO_CHROMIUM_PATH } : {}) });
  const limite = setTimeout(() => { void browser.close().catch(() => {}); }, 60000);
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block", viewport: { width: 816, height: 1056 } });
    await context.route("**/*", route => route.abort());
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    await page.setContent(htmlTrabajoPdf(documento, recursos), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(i => i.decode())); });
    return await page.pdf({ format: "Letter", printBackground: true, tagged: true, outline: true,
      margin: { top: "14mm", right: "14mm", bottom: "19mm", left: "14mm" }, displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font:9px Arial;color:#666;padding:0 14mm;display:flex;justify-content:space-between"><span>OT ${escaparPdf(documento.folio)} · Revisión ${documento.version}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>` });
  } finally { clearTimeout(limite); await browser.close(); }
}
