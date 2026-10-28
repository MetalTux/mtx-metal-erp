import { estilosGrillas, capturarGrillas } from "./soporte/grillas-navegador";
// Componentes reales y acciones simuladas: no abre servidor ni escribe en BD.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const entrada = `
import React from 'react';import{createRoot}from'react-dom/client';
import{FormularioProduccion}from'@/components/ordenes-trabajo/produccion';import{ConsultaDetallesTrabajo}from'@/components/ordenes-trabajo/consulta-detalles';import{CierreTrabajo}from'@/components/ordenes-trabajo/cierre';import{CorreccionTrabajo}from'@/components/ordenes-trabajo/correccion';import{PermisosProvider}from'@/components/seguridad/permisos';
window.__gd4={intentos:[],bloqueado:false,accion:null};
const c={units:[{id:1,name:'Unidad',abbreviation:'un'}],raws:[{id:1,name:'Perfil histórico',code:'MP1',unitName:'Unidad',unitMeasureId:1}],products:[],warehouses:[{id:1,name:'Bodega A',classification:'MATERIA_PRIMA'},{id:2,name:'Bodega B',classification:'MIXTA'},{id:3,name:'Terminados',classification:'PRODUCTO_TERMINADO'}],stock:[],sales:[]};
const line={id:101,sourceDetailId:10,kind:'PRODUCTO',executionMode:'CATALOGO',productId:1,rawMaterialId:null,unitMeasureId:1,description:'Partida histórica',quantity:'5.000',quantityToProduce:'5.000',productVersion:1,refreshRecipe:false,materials:[],supplies:[],roundingReviews:[]};
const record={id:20,workOrderLineId:101,type:'FABRICACION_PRODUCTO',unit:'un',date:'2026-10-26',quantity:'1.000',note:'Observación histórica extensa',deviationReason:'Diferencia histórica',planVersion:2,createdAt:'2026-10-26T12:00:00Z',correctsProductionRecordId:19,expected:{materials:[{rawMaterialId:1,name:'Perfil histórico',quantity:'2.000',exactQuantity:'2.000',unit:'un'}],roundingReviews:[{rawMaterialId:1,quantity:'2.000',reason:'Revisión histórica'}]},consumptions:[{id:30,rawMaterialId:1,warehouseId:1,quantity:'2.000',expectedQuantity:'2.000',name:'Perfil histórico',unit:'un'}],reversal:null};
const work={id:1,version:3,folio:'OT-TEST',status:'EN_PROCESO',startedDate:'2026-10-25',plan:{salesOrderId:7,lines:[line]},historicalRecipes:[{workOrderLineId:101,rawMaterialId:1,quantityPerUnit:'2.000',unitName:'un',materialName:'Perfil histórico'}],materials:[{id:11,workOrderLineId:101,rawMaterialId:1,warehouseId:1,name:'Perfil histórico',quantity:'4.000',pendingQuantity:'2.000',retired:false}],supplies:[],productionRecords:[record,{...record,id:21,reversal:{id:40,date:'2026-10-27',reason:'Error histórico',createdAt:'2026-10-27T12:00:00Z'}}],productionOutputs:[{id:31,productionRecordId:20,workOrderLineId:101,warehouseId:3,productId:1,name:'Producto histórico',quantity:'1.000',pendingQuantity:'1.000',unit:'un',reversed:false}],reservas:[{id:50,plannedDetailId:11,supplyPlanId:null,productionOutputId:null,warehouseId:1,resourceName:'Perfil histórico',quantity:'4.000',active:'2.000',unitAbbreviation:'un'}],stock:[{rawMaterialId:1,productId:null,warehouseId:1,quantity:'10.000',reserved:'3.000',free:'7.000'}],eventos:[{id:60,allocationId:50,type:'CONSUMIR',quantity:'2.000',reason:'Registro original',createdAt:'2026-10-26T12:00:00Z'}],operations:[{version:2,type:'PLANIFICAR',createdAt:'2026-10-26T12:00:00Z',planConfirmed:true,reason:'Motivo histórico'}],invoices:[]};
window.__gd4.expected={schemaVersion:1,workOrderLineId:101,quantity:'1.000',roundingReviews:[],materials:[{rawMaterialId:1,unitMeasureId:1,name:'Perfil histórico',unit:'un',exactQuantity:'0.000001',quantity:'0.000',requiresReview:true}],distribution:[{plannedDetailId:11,rawMaterialId:1,warehouseId:1,unitMeasureId:1,quantity:'1.000'},{plannedDetailId:12,rawMaterialId:1,warehouseId:2,unitMeasureId:1,quantity:'2.000'}]};
function App(){const[modo,setModo]=React.useState(''),[n,setN]=React.useState(0);const props={work,catalogos:c,hoy:'2026-10-27',onCambio:()=>{},onBloqueo:v=>{window.__gd4.bloqueado=v},onGuardado:async()=>setModo(''),onCerrar:()=>setModo('')};return <PermisosProvider roles={modo==='lectura'?['CONSULTA_GERENCIA']:['ADMINISTRADOR']}><div>{['produccion','consulta','lectura','cierre','reversion'].map(m=><button key={m} onClick={()=>{setN(n+1);setModo(m)}}>{'Abrir '+m}</button>)}</div>{modo==='produccion'&&<FormularioProduccion key={n} {...props} lineId={101}/ >}{['consulta','lectura'].includes(modo)&&<ConsultaDetallesTrabajo key={n} {...props} busy={false} onProduccion={id=>window.__gd4.accion=['producir',id]} onRevertir={id=>window.__gd4.accion=['revertir',id]} onLiberar={id=>window.__gd4.accion=['liberar',id]}/ >}{modo==='cierre'&&<CierreTrabajo key={n} {...props} modo='cierre'/ >}{modo==='reversion'&&<CorreccionTrabajo key={n} {...props} recordId={20}/ >}</PermisosProvider>};createRoot(document.getElementById('root')).render(<App/>);
`;
const acciones = `
export async function prepararLote(){return {ok:true,expected:window.__gd4.expected}}
export async function previsualizarLote(d){return {ok:true,preview:{expected:window.__gd4.expected,previous:'1.000',next:'2.000',limit:'5.000',destination:'Terminados',reserveOutput:true,consumptions:d.consumptions.map(r=>({...r,name:'Perfil histórico',unit:'un',warehouse:r.warehouseId===1?'Bodega A':'Bodega B',physical:'10.000',final:'8.000',own:'2.000',other:'1.000',free:'7.000'}))}}}
export async function registrarLote(data,key){window.__gd4.intentos.push({data,key});if(window.__gd4.intentos.length===1)throw Error('Respuesta perdida');return {ok:true,id:1}}
export async function previsualizarCierre(){return {ok:true,preview:[{id:101,description:'Partida histórica',mode:'CATALOGO',unit:'un',quantity:'5.000',required:'5.000',executed:'5.000',delivered:'1.000',pendingDelivery:'4.000',reserved:'4.000',allocations:[{id:50,warehouse:'Terminados',active:'4.000',physical:'10.000',totalReserved:'5.000'}]}]}}
export async function previsualizarReversion(){return {ok:true,preview:{quantity:'1.000',materials:[{id:30,name:'Perfil histórico',warehouse:'Bodega A',quantity:'2.000',unit:'un',previous:'8.000',final:'10.000'}],product:{name:'Producto histórico',warehouse:'Terminados',quantity:'1.000',unit:'un',previous:'10.000',final:'9.000',release:'1.000'}}}}
export async function finalizar(){throw Error('No guardar en este ensayo')};export const facturar=finalizar,revertir=finalizar,anularPropia=finalizar;
`;
async function main() {
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'acciones-simuladas', setup(build: { onResolve: (options: { filter: RegExp }, callback: () => unknown) => void; onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void }) {
    build.onResolve({ filter: /@\/app\/\(app\)\/trabajos\/ordenes\/actions$/ }, () => ({ path: 'acciones', namespace: 'gd4' }));
    build.onLoad({ filter: /.*/, namespace: 'gd4' }, () => ({ contents: acciones, loader: 'js' }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errores: string[] = []; page.on('pageerror', e => errores.push(e.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }));
    await page.goto('http://127.0.0.1:3031/gd4-simulado'); await estilosGrillas(page); await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const tabla = (name: string) => page.getByRole('region', { name, exact: true }).getByRole('table');
    await page.getByRole('button', { name: 'Abrir produccion', exact: true }).click();
    await page.getByRole('button', { name: 'Cargar consumos previstos', exact: true }).click();
    await page.getByText('Obligatoria pendiente', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Revisar lote Perfil histórico', exact: true }).click();
    const cantidad = page.getByRole('textbox', { name: 'Cantidad del detalle de producción', exact: true });
    await cantidad.fill('0,001'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    assert(await page.getByRole('dialog', { name: 'Revisión de redondeo del lote', exact: true }).isVisible());
    await page.getByRole('textbox', { name: 'Motivo de revisión del lote', exact: true }).fill('Mínimo físico revisado'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    await page.getByRole('button', { name: 'Quitar consumo 1', exact: true }).click(); await page.getByRole('button', { name: 'Quitar consumo', exact: true }).click();
    await page.getByRole('button', { name: 'Editar consumo 1', exact: true }).click(); await cantidad.fill('0'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); await page.getByText('La cantidad debe ser positiva.', { exact: true }).waitFor();
    await cantidad.fill('3'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    assert((await tabla('Consumos reales del borrador').innerText()).includes('Bodega B'));
    await page.getByRole('button', { name: 'Editar consumo 1', exact: true }).click(); await cantidad.fill('7'); await page.getByRole('button', { name: 'Cancelar detalle', exact: true }).click(); await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await page.locator('#agregar-consumo-produccion').click(); await page.getByRole('option', { name: 'MP1 · Perfil histórico · Unidad', exact: true }).click();
    await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); assert(await page.getByRole('dialog', { name: 'Consumo real', exact: true }).isVisible());
    await page.locator('#bodega-consumo-editor').click(); assert.equal(await page.getByRole('option', { name: 'Terminados', exact: true }).count(), 0); await page.getByRole('option', { name: 'Bodega B', exact: true }).click();
    await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); await page.getByText('No repitas un material y bodega en los consumos.', { exact: true }).waitFor();
    await page.locator('#bodega-consumo-editor').click(); await page.getByRole('option', { name: 'Bodega A', exact: true }).click(); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    assert.equal(await tabla('Consumos reales del borrador').getByRole('row').count(), 3);
    await page.getByRole('button', { name: 'Quitar consumo 2', exact: true }).click(); await page.getByRole('button', { name: 'Quitar consumo', exact: true }).click();
    await page.getByRole('button', { name: 'Cargar consumos previstos', exact: true }).click(); await page.getByRole('button', { name: 'Revisar datos', exact: true }).click();
    await tabla('Consumos reales del borrador').waitFor();
    assert.equal(await tabla('Consumos reales del borrador').getByRole('row').count(), 2);
    assert.equal(await page.locator('form form').count(), 0);
    await page.locator('#destino-produccion').click(); await page.getByRole('option', { name: 'Terminados', exact: true }).click();
    await page.getByRole('textbox', { name: 'Motivo de diferencias o sustituciones', exact: true }).fill('Consumo real revisado');
    await page.getByRole('button', { name: 'Previsualizar registro', exact: true }).click(); await tabla('Efectos del registro de producción').waitFor();
    await page.getByRole('button', { name: 'Confirmar registro', exact: true }).click(); await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Cargar consumos previstos', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Reintentar sin cambiar datos', exact: true }).click();
    const intentos = await page.evaluate(() => (window as unknown as { __gd4: { intentos: { data: { consumptions: { warehouseId: number; quantity: string }[]; roundingReviews: { reason: string }[] }; key: string }[] } }).__gd4.intentos);
    assert.equal(intentos.length, 2); assert.deepEqual(intentos[0], intentos[1]); assert.equal(intentos[0].data.consumptions[0].warehouseId, 2); assert.equal(intentos[0].data.consumptions[0].quantity, '3.000'); assert.equal(intentos[0].data.roundingReviews[0].reason, 'Mínimo físico revisado');
    await page.getByRole('button', { name: 'Abrir consulta', exact: true }).click();
    await tabla('Recursos y cobertura de la OT').waitFor();
    await page.getByRole('button', { name: 'Ver partida 101', exact: true }).click(); await tabla('Receta histórica de la partida').waitFor(); await page.getByRole('button', { name: 'Cerrar detalle', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Ver partida 101');
    await page.getByRole('button', { name: 'Ver registro 21', exact: true }).click(); await page.getByText(/Error histórico/).waitFor(); await tabla('Consumos históricos').waitFor(); await page.getByRole('button', { name: 'Cerrar detalle', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Revertir registro #21', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Liberar reserva #50', exact: true }).click(); assert.deepEqual(await page.evaluate(() => (window as unknown as { __gd4: { accion: unknown } }).__gd4.accion), ['liberar', 50]);
    await page.getByRole('button', { name: 'Abrir lectura', exact: true }).click(); assert.equal(await page.getByRole('button', { name: /Revertir registro|Liberar reserva|Registrar fabricación/ }).count(), 0);
    await page.getByRole('button', { name: 'Abrir cierre', exact: true }).click(); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Revisar preparación', exact: true }).click(); await tabla('Partidas al cierre').waitFor(); await tabla('Reservas de entrega al cierre').waitFor();
    await page.getByRole('button', { name: 'Abrir reversion', exact: true }).click(); await page.getByRole('textbox', { name: 'Motivo del error de registro', exact: true }).fill('Corrección de prueba'); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Previsualizar reversión', exact: true }).click(); await tabla('Materiales a restituir').waitFor(); await tabla('Producto a retirar').waitFor();
    for (const width of [360, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await tabla('Materiales a restituir').waitFor(); await capturarGrillas(page,`gd4-${width}`); }
    assert.deepEqual(errores, []);
    console.log('GD4 navegador: revisión obligatoria, consumos con identidad estable, descarte y reemplazo confirmado, reintento idéntico, consultas históricas, permisos y tablas de cierre/reversión correctos. Acciones simuladas, sin BD ni servidor.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
