// Navegador y pérdidas de respuesta tras commit: sólo servidor local contra copia G6.
import "dotenv/config";
import assert from "node:assert/strict";
import { chromium, type Page, type Route } from "playwright";
import { createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { crearEntornoGuiasG6, exigirCopiaG6 } from "./fixtures/guias-despacho";
exigirCopiaG6();
const workOrderId = Number(process.argv[2]);

const base = "http://127.0.0.1:3031";
async function perderRespuesta(page: Page, campo: string, id: number) {
  const claves: string[] = [];
  const handler = async (route: Route) => {
    const request = route.request();
    let args: unknown;
    try { args = JSON.parse(request.postData() ?? "null"); } catch { args = null; }
    if (request.method() !== "POST" || !request.headers()["next-action"] || !Array.isArray(args) || args.length !== 2 || !args[0] || typeof args[0] !== "object" || args[0][campo] !== id || typeof args[1] !== "string") { await route.continue(); return; }
    claves.push(args[1]);
    if (claves.length === 1) {
      const response = await route.fetch(); assert(response.ok()); await response.body();
      await route.abort("connectionreset");
    } else await route.continue();
  };
  await page.route("**/*", handler);
  return { claves, terminar: async () => { await page.unroute("**/*", handler); assert.equal(claves.length, 2); assert.equal(claves[0], claves[1], "Conservar UUID al recuperar el resultado"); } };
}
async function contraste(page: Page) {
  const malos = await page.evaluate(`(() => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const ctx = canvas.getContext("2d");
    const color = (v) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = v; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; };
    const luz = (rgb) => rgb.slice(0,3).map(v => v/255).map(v => v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
    return [...document.querySelectorAll('[role="dialog"] h2,[role="dialog"] p,[role="dialog"] a,[role="dialog"] button')].filter(e => e.getClientRects().length && !e.closest('[disabled],[aria-disabled="true"]')).flatMap(e => {
      const cs=getComputedStyle(e); if(cs.visibility==="hidden" || !e.textContent?.trim()) return [];
      let bg=[0,0,0];const parents=[];for(let n=e;n;n=n.parentElement)parents.unshift(n);
      for(const n of parents){const c=color(getComputedStyle(n).backgroundColor),a=c[3]/255;bg=bg.map((v,i)=>c[i]*a+v*(1-a));}
      const fg=color(cs.color),a=fg[3]/255,f=fg.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a)),lf=luz(f),lb=luz(bg),ratio=(Math.max(lf,lb)+0.05)/(Math.min(lf,lb)+0.05);
      const size=parseFloat(cs.fontSize),large=size>=24||(size>=18.66&&parseInt(cs.fontWeight)>=700),limit=large?3:4.5;
      return ratio+0.01<limit?[{tag:e.tagName,clase:e.className,ratio:Number(ratio.toFixed(2)),limite:limit}]:[];
    });
  })()`);
  assert.deepEqual(malos, [], "Contraste de textos/acciones de consulta");
}
async function main() {
  if(process.argv[2]==="preparar"){
    const f=await crearEntornoGuiasG6(),w=await f.producir(await f.crear(["PRODUCTO","MATERIA_PRIMA","SERVICIO","A_MEDIDA"],{fabricar:"1"}));
    console.log(JSON.stringify({workOrderId:w.id,salesOrderId:w.plan!.salesOrderId,message:"Fixture UI G6 nuevo preparado"}));return;
  }
  assert(Number.isSafeInteger(workOrderId) && workOrderId>0,"Indica la OT de fixture G6");
  const work = await prisma.workOrder.findUniqueOrThrow({ where: { id: workOrderId } }); assert(work.salesOrderId);
  const mp = await prisma.workOrderLine.findFirstOrThrow({ where: { workOrderId, executionMode: "VENTA_DIRECTA_MP" } });
  const allocation = await prisma.stockReservationAllocation.findFirstOrThrow({ where: { workOrderId, workOrderLineId: mp.id, purpose: "ENTREGA_DIRECTA_MP" } });
  const before = await prisma.warehouseStock.findUniqueOrThrow({ where: { warehouseId_rawMaterialId: { warehouseId: allocation.warehouseId, rawMaterialId: mp.rawMaterialId! } } });
  const finanzas = JSON.stringify(await prisma.accountReceivable.findUnique({ where: { salesOrderId: work.salesOrderId } }));
  const consumos = JSON.stringify(await prisma.productionConsumption.findMany({ where: { workOrderId }, orderBy: { id: "asc" } }));
  const previos = await prisma.deliveryNote.count({ where: { workOrderId } }); assert.equal(previos,0,"Usar un fixture nuevo sin entregas previas");
  const browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errores: string[] = []; page.on("pageerror", e => errores.push(e.message));
  try {
    // Verificar la identidad aleatoria del fixture en el servidor antes de cualquier acción de escritura.
    assert(/^Validación G6 [0-9a-f-]{36}$/.test(work.productName),"Preparar un fixture UI G6 con identidad única");
    await page.goto(`${base}/trabajos/ordenes?ver=${workOrderId}`);await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("dialog").getByText(work.productName,{exact:true}).count(),1,"El servidor no corresponde a la copia de prueba");
    await page.goto(`${base}/trabajos/despachos?ot=${workOrderId}`); await page.getByRole("button", { name: "Previsualizar salida", exact: true }).waitFor();
    for (const width of [320,375,768,1440]) { await page.setViewportSize({ width, height: 1000 }); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); }
    await page.getByLabel("Cantidad (un)",{exact:true}).fill("-1"); await page.getByLabel("Cantidad (kg)",{exact:true}).fill("1");
    await page.getByRole("button",{name:"Previsualizar salida",exact:true}).click(); await page.getByRole("alert").filter({hasText:"cantidad"}).waitFor();
    assert.equal(await page.getByRole("region",{name:"Previsualización de salida"}).count(),0,"No omitir cantidades negativas mientras se despacha otra partida");
    assert.equal(await prisma.deliveryNote.count({where:{workOrderId}}),0);
    await page.getByLabel("Cantidad (un)",{exact:true}).fill("");await page.getByRole("button",{name:"Previsualizar salida",exact:true}).click();await page.getByRole("button",{name:"Confirmar salida y entrega",exact:true}).click();
    const salida = await perderRespuesta(page,"workOrderId",workOrderId);
    await page.getByRole("button",{name:"Confirmar salida",exact:true}).click();await page.getByRole("alertdialog").filter({hasText:"Reintenta"}).waitFor();
    assert(await page.getByLabel("Cantidad (kg)",{exact:true}).isDisabled());await page.keyboard.press("Escape");assert.equal(await page.getByRole("alertdialog").count(),1);
    assert.equal(await prisma.deliveryNote.count({where:{workOrderId}}),1,"La respuesta perdida ocurrió después del commit");
    await page.getByRole("button",{name:"Confirmar salida",exact:true}).click();await page.waitForURL(u=>u.searchParams.has("ver"));await salida.terminar();
    const guiaId=Number(new URL(page.url()).searchParams.get("ver"));await page.getByRole("dialog").waitFor();
    for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('[role="dialog"]')].every(e=>e.getBoundingClientRect().width<=innerWidth));}
    assert(await page.getByRole("heading",{name:/Guía /}).evaluate(e=>e===document.activeElement));await page.keyboard.press("Tab");assert(await page.getByRole("dialog").evaluate(e=>e.contains(document.activeElement)));await contraste(page);
    assert(await page.getByText("Los permisos por rol se incorporarán con autenticación; esta pantalla aún no los aplica.",{exact:true}).count());
    await page.getByRole("button",{name:"Generar PDF de guía",exact:true}).click();const pdf=await perderRespuesta(page,"id",guiaId);await page.getByRole("button",{name:"Generar PDF",exact:true}).click();
    await page.getByRole("button",{name:"Reintentar emisión con la misma solicitud",exact:true}).waitFor();await page.keyboard.press("Escape");assert.equal(await page.getByRole("dialog").count(),1,"No cerrar una emisión incierta");
    await page.getByRole("button",{name:"Reintentar emisión con la misma solicitud",exact:true}).click();await page.getByRole("button",{name:"Cerrar vista previa PDF",exact:true}).waitFor();await pdf.terminar();
    assert.equal(await prisma.deliveryNotePdfEmission.count({where:{deliveryNoteId:guiaId}}),1);
    const href=await page.getByRole("link",{name:"Descargar plantilla 1",exact:true}).getAttribute("href");const response=await page.request.get(base+href);assert(response.ok());const bytes=await response.body();assert.equal(bytes.subarray(0,5).toString(),"%PDF-");assert.equal(response.headers()["cache-control"],"private, no-store");assert.equal(response.headers()["x-content-type-options"],"nosniff");
    const emision=await prisma.deliveryNotePdfEmission.findFirstOrThrow({where:{deliveryNoteId:guiaId}});assert.equal(bytes.length,emision.fileSize);assert.equal(createHash("sha256").update(bytes).digest("hex"),emision.fileHash);
    await page.getByRole("link",{name:"Corregir guía",exact:true}).click();await page.getByLabel("Motivo obligatorio",{exact:true}).fill("Devolución con respuesta perdida G6");await page.getByLabel("Cantidad a corregir (kg)",{exact:true}).fill("0,25");await page.getByLabel("Confirmo que las cantidades de bienes indicadas fueron recibidas físicamente en sus bodegas originales.").check();await page.getByRole("button",{name:"Previsualizar corrección",exact:true}).click();
    const correccion=await perderRespuesta(page,"deliveryNoteId",guiaId);await page.getByRole("button",{name:"Confirmar corrección",exact:true}).click();await page.getByRole("alertdialog").filter({hasText:"Reintenta"}).waitFor();await page.getByRole("button",{name:"Confirmar corrección",exact:true}).click();await page.waitForURL(u=>u.searchParams.has("ver"));await correccion.terminar();
    assert.equal(await prisma.deliveryNote.count({where:{workOrderId}}),2);assert.equal(await prisma.deliveryNote.count({where:{correctsDeliveryNoteId:guiaId}}),1);
    const after=await prisma.warehouseStock.findUniqueOrThrow({where:{id:before.id}});assert(after.quantity.eq(before.quantity.minus(1).plus("0.25")));assert(after.minStock!.eq(before.minStock!));
    assert.equal(JSON.stringify(await prisma.accountReceivable.findUnique({where:{salesOrderId:work.salesOrderId}})),finanzas);assert.equal(JSON.stringify(await prisma.productionConsumption.findMany({where:{workOrderId},orderBy:{id:"asc"}})),consumos);
    assert.equal(createHash("sha256").update(await (await page.request.get(base+href)).body()).digest("hex"),emision.fileHash,"Corregir no reescribe el PDF original");
    assert.deepEqual(errores,[]);console.log(JSON.stringify({ok:true,workOrderId,guiaId,correccionId:new URL(page.url()).searchParams.get("ver"),message:"G6 UI: cantidades inválidas, móvil/foco/teclado/contraste y respuestas perdidas tras commit de entrega, PDF y corrección recuperadas con el mismo UUID"}));
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
