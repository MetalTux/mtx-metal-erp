import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
const u = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(u.hostname) && /^\/mtx_validacion_cobranza_c1_\d{8}$/.test(u.pathname));
const base = "http://127.0.0.1:3031";
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const anon = await browser.newContext();
    const respuesta = await anon.request.get(base + "/ventas/cobranza", { maxRedirects: 0 });
    assert([307,308].includes(respuesta.status()));assert(respuesta.headers().location?.includes("/ingresar"));await anon.close();
    const privado=await browser.newContext();assert.equal((await privado.request.get(base+'/api/cobranza/comprobantes/'+process.env.C3_ADJUNTO)).status(),401);await privado.close();
    const contexto = await browser.newContext();
    await contexto.addCookies([{name:"mtx_sesion",value:process.env.C1_TOKEN!,url:base,httpOnly:true,sameSite:"Lax"}]);
    const descarga=await contexto.request.get(base+'/api/cobranza/comprobantes/'+process.env.C3_ADJUNTO);assert.equal(descarga.status(),200);assert.deepEqual(await descarga.body(),Buffer.from(process.env.C3_BYTES!,'base64'));assert(descarga.headers()['content-disposition'].startsWith('attachment;'));assert.equal(descarga.headers()['cache-control'],'private, no-store');
    assert.equal((await contexto.request.get(base+'/api/cobranza/comprobantes/'+randomUUID())).status(),404);
    const credencial=randomUUID(),correo='c3-'+randomUUID()+'@ejemplo.invalid';const creado=await contexto.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'user-create',name:'Bodega sin cobranza C3',email:correo,roles:['COMPRAS_BODEGA']}});const invitacion=await creado.json();assert(invitacion.ok);
    const otro=await browser.newContext(),token=new URLSearchParams(new URL(invitacion.link).hash.slice(1)).get('token');assert((await (await otro.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'activate',token,password:credencial}})).json()).ok);assert((await (await otro.request.post(base+'/api/seguridad',{headers:{Origin:base},data:{action:'login',email:correo,password:credencial}})).json()).ok);assert.equal((await otro.request.get(base+'/api/cobranza/comprobantes/'+process.env.C3_ADJUNTO)).status(),403);await otro.close();
    const pagina = await contexto.newPage(), errores: string[] = [];
    pagina.on("pageerror",e=>errores.push(e.message));pagina.on("console",m=>{if(m.type()==="error")console.error("Navegador C3:",m.text());});
    await pagina.goto(base+"/ventas/cobranza?"+new URLSearchParams({q:process.env.C1_FOLIO!}));
    await pagina.getByRole("heading",{name:"Cobranzas",exact:true}).waitFor();
    await pagina.getByRole("cell",{name:"$728,75",exact:true}).waitFor();
    const desbordes:unknown[]=[];
    for(const width of [320,375,768,1440]){await pagina.setViewportSize({width,height:1000});await pagina.waitForTimeout(200);const medidas=await pagina.evaluate(()=>({ancho:innerWidth,documento:document.documentElement.scrollWidth,elementos:[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,clase:e.className,derecha:e.getBoundingClientRect().right}))}));if(medidas.documento>width)desbordes.push(medidas);}
    assert.deepEqual(desbordes,[],JSON.stringify(desbordes));
    await pagina.getByRole("link",{name:/Ver cuenta/}).click();
    const dialogo=pagina.getByRole("dialog");await dialogo.getByRole("heading",{name:"Historial de abonos"}).waitFor();
    await dialogo.getByRole("link",{name:"Más abonos"}).click();await pagina.getByRole("dialog").getByText(`${process.env.C1_ABONOS} abonos · Página 2 de 2`,{exact:true}).waitFor();
    await pagina.keyboard.press("Escape");await pagina.getByRole("dialog").waitFor({state:"hidden"});assert(!new URL(pagina.url()).searchParams.has("cuenta"));
    await pagina.getByLabel("Cliente, OCC o factura").fill("sin-coincidencias-c1");await pagina.getByRole("button",{name:"Filtrar",exact:true}).click();await pagina.getByText("No hay cuentas para estos filtros.",{exact:true}).waitFor();
    await pagina.goto(base+"/ventas/cobranza?"+new URLSearchParams({q:process.env.C1_FOLIO!,cuenta:process.env.C1_CUENTA!}));
    await pagina.getByRole("button",{name:"Registrar abono",exact:true}).click();
    const formulario=pagina.getByRole("dialog").filter({has:pagina.getByRole("heading",{name:"Registrar abono",exact:true})});
    await formulario.getByLabel("Importe recibido (CLP)").fill("10");await formulario.getByLabel("Referencia (opcional)").fill("C2-UI");await formulario.getByLabel("Comprobante opcional (JPG, PNG o PDF, hasta 5 MB)").setInputFiles({name:"comprobante-alta.png",mimeType:"image/png",buffer:Buffer.from(process.env.C3_BYTES!,"base64")});await formulario.getByRole("button",{name:"Revisar operación"}).click();await formulario.getByRole("button",{name:"Confirmar operación"}).click();await formulario.waitFor({state:"hidden",timeout:10000}).catch(async e=>{console.error("Diagnóstico alta con comprobante:",await formulario.innerText(),await pagina.locator("[data-sonner-toast]").allTextContents());throw e;});
    await pagina.goto(base+"/ventas/cobranza?"+new URLSearchParams({q:process.env.C1_FOLIO!,cuenta:process.env.C1_CUENTA!,abonos:"999"}));
    await pagina.getByRole("link",{name:"Descargar comprobante-alta.png",exact:true}).waitFor();
    const abono=pagina.getByRole("dialog").getByRole("listitem").filter({hasText:"C2-UI"});await abono.getByRole("button",{name:/Anular abono/}).click();
    const anulacion=pagina.getByRole("dialog").filter({has:pagina.getByLabel("Motivo de anulación")});await anulacion.getByLabel("Motivo de anulación").fill("Corrección navegador C2");await anulacion.getByRole("button",{name:"Revisar operación"}).click();await anulacion.getByRole("button",{name:"Confirmar operación"}).click();await anulacion.waitFor({state:"hidden"});await pagina.getByText("Anulación: Corrección navegador C2",{exact:false}).waitFor();
    await pagina.getByRole('button',{name:'Cambiar promesa',exact:true}).click();
    const promesa=pagina.getByRole('dialog').filter({has:pagina.getByRole('heading',{name:'Cambiar promesa de pago',exact:true})});await promesa.getByLabel('Nueva promesa (opcional)').fill(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date()));await promesa.getByLabel('Motivo del cambio').fill('Promesa navegador C3');await promesa.getByRole('button',{name:'Revisar operación'}).click();await promesa.getByRole('button',{name:'Confirmar operación'}).click();await promesa.waitFor({state:'hidden'});await pagina.getByText('Historial de promesas (3)',{exact:true}).waitFor();
    const boton=pagina.getByRole('button',{name:'Adjuntar comprobante',exact:true}).first();await boton.click();const subida=pagina.getByRole('dialog').filter({has:pagina.getByRole('heading',{name:'Adjuntar comprobante',exact:true})});await subida.getByLabel('Comprobante',{exact:true}).setInputFiles({name:'captura.png',mimeType:'image/png',buffer:Buffer.from(process.env.C3_BYTES!,'base64')});await subida.getByRole('button',{name:'Revisar operación'}).click();await subida.getByRole('button',{name:'Confirmar operación'}).click();await subida.waitFor({state:'hidden'});await pagina.getByRole('link',{name:'Descargar captura.png',exact:true}).waitFor();
    assert.deepEqual(errores,[]);await contexto.close();
    console.log("C1 Chromium: cuenta/saldo, detalle y paginación, cierre por teclado, filtros/vacío, acceso anónimo y 320/375/768/1440 sin errores JS correctos.");
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
