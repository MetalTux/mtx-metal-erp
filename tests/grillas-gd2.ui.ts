// Ensayo de interacción de componentes reales con API simulada: sin servidor ni BD.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const acciones = `
const estado = () => window.__gd2;
export async function calcularRecepcionCompra(datos) {
  estado().lecturas++;
  if (!datos.lines.length) return {ok:false,mensaje:'Selecciona una cantidad.'};
  for(const l of datos.lines) if(!/^\\d+(?:[.,]\\d{1,3})?$/.test(l.receivedQuantity)||Number(l.receivedQuantity.replace(',','.'))<=0||Number(l.receivedQuantity.replace(',','.'))>8) return {ok:false,mensaje:'La cantidad debe ser positiva y no superar el pendiente.'};
  return {ok:true,lineas:datos.lines.map(l=>({id:l.purchaseDetailId,material:'Material largo de prueba',cantidad:l.receivedQuantity,presentacion:'Caja',equivalente:'12',unidad:'un'}))};
}
export async function registrarRecepcionCompra(datos,ref,clave){estado().recepciones.push({datos,ref,clave});if(estado().fallar){estado().fallar=false;throw Error('Respuesta perdida');}return {ok:true,mensaje:'Registrada'};}
export async function previsualizar(id,version,lineas){estado().lecturas++;for(const l of lineas)if(Number(l.quantity)>10||Number(l.quantity)<=0)return {ok:false,mensaje:'Cantidad superior a la cotizada'};return {ok:true,completa:false,subtotal:'1000',discountAmount:'0',netAmount:'1000',vatAmount:'190',totalAmount:'1190',lineAmounts:lineas.map(l=>({id:l.quoteDetailId,amount:'500'}))};}
export async function registrar(datos,clave){estado().ordenes.push({datos,clave});if(estado().fallar){estado().fallar=false;throw Error('Respuesta perdida');}return {ok:true,id:42,mensaje:'Registrada'};}
`;
const entrada = `
import React from 'react';import{createRoot}from'react-dom/client';
import{RecepcionCompra}from'@/components/compras/recepcion-compra';import{FormularioOrden}from'@/components/ordenes-compra-cliente/formulario-orden';import{VerOrden}from'@/components/ordenes-compra-cliente/ver-orden';import{PermisosProvider}from'@/components/seguridad/permisos';
window.__gd2={lecturas:0,recepciones:[],ordenes:[],fallar:false};
const compra={id:1,version:1,documentNumber:'FACT-PRUEBA',proveedor:'Proveedor ficticio',documento:'Factura',bodega:'Bodega original',lines:[{id:11,material:'Material largo de prueba',presentation:'Caja',unitFactor:'4',unidad:'un',purchasedQuantity:'10',recibido:'2',cerrado:'0',pendiente:'8'},{id:12,material:'Sin pendiente',presentation:'Caja',unitFactor:'1',unidad:'un',purchasedQuantity:'2',recibido:'2',cerrado:'0',pendiente:'0.000'}]};
const oferta={id:2,version:1,folio:'COT-PRUEBA',date:'2026-10-01',status:'PENDIENTE',clientName:'Cliente ficticio',branchName:'Central',totalAmount:'1190',vatRate:'19',pricesIncludeVat:false,paymentConditionName:'Al día',paymentTermDays:0,technicalDescription:{type:'doc',content:[{type:'paragraph'}]},pdfs:[],commercialTerms:null,lines:[{id:101,description:'Servicio de prueba',quantity:'10',unitName:'un',unitPrice:'100',kind:'SERVICIO',code:null}]};
const orden={id:3,version:1,folio:'OCC-PRUEBA',date:'2026-10-01',status:'ANULADA',quoteId:2,quoteVersion:1,quoteFolio:'COT-PRUEBA',clientName:'Cliente ficticio',branchName:'Central',clientSnapshot:{},companySnapshot:{},bankSnapshot:{},technicalDescription:{},originalTechnicalDescription:{},pricesIncludeVat:false,operaciones:[],lines:[{id:101,description:'Servicio de prueba',unitName:'un',offeredQuantity:'10',acceptedQuantity:'5',excludedQuantity:'5',unitPrice:'100',lineAmount:'500'}],offeredTotal:'1190',subtotal:'500',discountAmount:'0',netAmount:'500',vatRate:'19',vatAmount:'95',totalAmount:'595',cuenta:null,workOrderId:null};
function App(){const[v,setV]=React.useState(''),[roles,setRoles]=React.useState(['ADMINISTRADOR']);return <PermisosProvider roles={roles}><button onClick={()=>setV('recepcion')}>Abrir recepción</button><button onClick={()=>setV('occ')}>Abrir OCC</button><button onClick={()=>setV('occ-historica')}>Abrir OCC histórica</button><button onClick={()=>setV('consulta')}>Consultar OCC</button><button onClick={()=>{setRoles(['PRODUCCION_DESPACHO']);setV('consulta')}}>Consulta sin precios</button>{v==='recepcion'&&<RecepcionCompra compra={compra} onCerrar={()=>setV('')} onExito={()=>setV('')}/>} {(v==='occ'||v==='occ-historica')&&<FormularioOrden oferta={{...oferta,pricesIncludeVat:v==='occ-historica'}} hoy='2026-10-27' onCambio={()=>{}} onBloqueo={()=>{}} onCerrar={()=>setV('')} onGuardado={()=>setV('')}/>} {v==='consulta'&&<VerOrden orden={orden} onCerrar={()=>setV('')}/>}</PermisosProvider>};createRoot(document.getElementById('root')).render(<App/>);
`;
async function main() {
  const resultado = await esbuild.build({ stdin: { contents: entrada, resolveDir: resolve('.'), loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'gd2-sin-servidor', setup(build: { onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void; onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void }) {
    build.onResolve({ filter: /@\/app\/\(app\)\/(compras|ventas\/ordenes)\/actions$/ }, () => ({ path: 'acciones', namespace: 'gd2' }));
    build.onLoad({ filter: /.*/, namespace: 'gd2' }, () => ({ contents: acciones, loader: 'js' }));
    build.onResolve({ filter: /@\/components\/formularios\/editor-cotizacion$/ }, () => ({ path: 'editor', namespace: 'editor' }));
    build.onLoad({ filter: /.*/, namespace: 'editor' }, () => ({ contents: 'export function EditorCotizacion(){return null}', loader: 'js' }));
    build.onResolve({ filter: /@\/components\/seguridad\/enlace-autoria$/ }, () => ({ path: 'autoria', namespace: 'autoria' }));
    build.onLoad({ filter: /.*/, namespace: 'autoria' }, () => ({ contents: 'export function EnlaceAutoria(){return null}', loader: 'js' }));
    build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'link' }));
    build.onLoad({ filter: /.*/, namespace: 'link' }, () => ({ contents: "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}", loader: 'js', resolveDir: resolve('.') }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errores: string[] = []; page.on('pageerror', e => errores.push(e.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<html><body><div id="root"></div></body></html>' }));
    await page.goto('http://127.0.0.1:3031/gd2-simulado');
    await page.addScriptTag({ content: resultado.outputFiles[0].text });
    await page.getByRole('button', { name: 'Abrir recepción', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Editar cantidad de Sin pendiente', exact: true }).isDisabled());
    const editar = page.getByRole('button', { name: 'Editar cantidad de Material largo de prueba', exact: true });
    await editar.click();
    const cantidad = page.getByRole('textbox', { name: 'Cantidad a recibir de Material largo de prueba (Caja)', exact: true });
    await cantidad.fill('9'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click();
    await page.getByText('La cantidad debe ser positiva y no superar el pendiente.', { exact: true }).waitFor();
    await cantidad.fill('3'); await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
    await page.getByRole('button', { name: 'Seguir editando', exact: true }).click(); assert.equal(await cantidad.inputValue(), '3');
    await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click(); await editar.waitFor();
    assert(await editar.evaluate(e => e === document.activeElement));
    await editar.click();
    await cantidad.fill('4'); await page.getByRole('button', { name: 'Cancelar', exact: true }).last().click();
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await page.getByRole('cell', { name: '3 Caja', exact: true }).waitFor();
    const lecturas = await page.evaluate(() => (window as unknown as { __gd2: { lecturas: number } }).__gd2.lecturas);
    await page.getByRole('button', { name: 'Ver Material largo de prueba', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    assert.equal(await page.evaluate(() => (window as unknown as { __gd2: { lecturas: number } }).__gd2.lecturas), lecturas);
    assert.equal(await page.locator('form form').count(), 0);
    await page.getByRole('button', { name: 'Revisar recepción', exact: true }).click();
    await page.evaluate(() => { (window as unknown as { __gd2: { fallar: boolean } }).__gd2.fallar = true; });
    await page.getByRole('button', { name: 'Registrar recepción', exact: true }).click();
    await page.getByRole('button', { name: 'Reintentar la misma recepción', exact: true }).waitFor();
    assert(await page.locator('#recepcion-fecha').isDisabled());
    await page.getByRole('button', { name: 'Reintentar la misma recepción', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir OCC', exact: true }).click();
    const recibos = await page.evaluate(() => (window as unknown as { __gd2: { recepciones: unknown[] } }).__gd2.recepciones);
    assert.equal(recibos.length, 2); assert.deepEqual(recibos[0], recibos[1]);
    await page.getByRole('button', { name: 'Editar cantidad de Servicio de prueba', exact: true }).click();
    const aceptada = page.getByRole('textbox', { name: 'Cantidad aceptada de Servicio de prueba', exact: true });
    await aceptada.fill('11'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click(); await page.getByText('Cantidad superior a la cotizada', { exact: true }).waitFor();
    await aceptada.fill('5'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click();
    assert.equal(await page.locator('form form').count(), 0);
    await page.getByRole('checkbox', { name: 'Confirmar revisión del alcance', exact: true }).check();
    await page.getByRole('button', { name: 'Confirmar aceptación', exact: true }).click();
    await page.evaluate(() => { (window as unknown as { __gd2: { fallar: boolean } }).__gd2.fallar = true; });
    await page.getByRole('button', { name: 'Registrar orden', exact: true }).click();
    await page.getByText(/Los datos y el UUID quedan bloqueados/).last().waitFor();
    await page.getByRole('button', { name: 'Revisar datos', exact: true }).click();
    await page.getByRole('button', { name: 'Registrar orden', exact: true }).click();
    const ordenes = await page.evaluate(() => (window as unknown as { __gd2: { ordenes: unknown[] } }).__gd2.ordenes);
    assert.equal(ordenes.length, 2); assert.deepEqual(ordenes[0], ordenes[1]);
    await page.getByRole('button', { name: 'Abrir OCC histórica', exact: true }).click();
    await page.getByRole('columnheader', { name: 'Precio con IVA', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar OCC', exact: true }).click();
    await page.getByRole('columnheader', { name: 'Precio neto', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ver Servicio de prueba', exact: true }).click(); await page.getByRole('button', { name: 'Cerrar partida', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('button', { name: 'Consulta sin precios', exact: true }).click();
    assert.equal(await page.getByRole('columnheader', { name: 'Precio neto', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /Editar cantidad/ }).count(), 0);
    for (const width of [360, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.getByRole('table').waitFor(); }
    assert.deepEqual(errores, []);
    console.log('GD2 navegador: validación, cancelar/seguir, foco, formularios separados, reintento idéntico, aceptación parcial, consulta y ocultación de precios correctos. API simulada; sin BD ni servidor.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
