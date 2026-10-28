import { estilosGrillas, capturarGrillas } from "./soporte/grillas-navegador";
// Componentes reales con acciones y router simulados, sin servidor ni escrituras en BD.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const entrada = `
import React from 'react';import{createRoot}from'react-dom/client';import{FormularioSalida}from'@/components/guia-despacho/formulario-salida';import{FormularioCorreccion}from'@/components/guia-despacho/formulario-correccion';
window.__gd5={salidas:[],correcciones:[],rutas:[]};
const b=(warehouseId,bodega)=>({warehouseId,bodega,compatible:true,kardexConciliado:true,saldo:'10.000',reservadoPropio:'6.000',reservadoTotal:'6.000',libre:'4.000',utilizable:'6.000'});
const salida={elegible:true,workOrderId:1,workOrderVersion:3,fechaMinima:'2026-10-25',fechaMaxima:'2026-10-27',partidas:[{id:101,descripcion:'Producto en dos bodegas',modo:'CATALOGO',unidad:'un',pendiente:'10.000',maximoPrevisualizable:'10.000',motivos:[],bodegas:[b(1,'Bodega A'),b(2,'Bodega B')]},{id:102,descripcion:'Servicio aprobado',modo:'SERVICIO',unidad:'h',pendiente:'2.000',maximoPrevisualizable:'2.000',motivos:[],bodegas:[]}]};
const correccion={deliveryNoteId:9,version:4,folio:'GD-TEST',fechaMinima:'2026-10-25',fechaMaxima:'2026-10-27',lines:[{id:501,descripcion:'Producto entregado',unidad:'un',quantity:'6.000',pendiente:'4.000',warehouseId:1,bodega:'Bodega A'},{id:502,descripcion:'Servicio entregado',unidad:'h',quantity:'2.000',pendiente:'2.000',warehouseId:null,bodega:null},{id:503,descripcion:'Partida ya corregida',unidad:'un',quantity:'1.000',pendiente:'0.000',warehouseId:2,bodega:'Bodega B'}]};
function App(){const[t,setT]=React.useState('');return <><button onClick={()=>setT('salida')}>Abrir salida</button><button onClick={()=>setT('correccion')}>Abrir correccion</button>{t==='salida'&&<FormularioSalida preparacion={salida}/ >}{t==='correccion'&&<FormularioCorreccion preparacion={correccion}/ >}</>};createRoot(document.getElementById('root')).render(<App/>);
`;
const acciones = `
export async function previsualizarSalida(d){return {ok:true,preview:{sucursal:{branchName:'Sucursal histórica',address:'Dirección de prueba',city:'Santiago'},lines:d.lines.map(l=>({...l,descripcion:l.workOrderLineId===101?'Producto en dos bodegas':'Servicio aprobado'})),aviso:'Se revalidará stock y reservas.'}}}
export async function confirmarSalida(datos,key){window.__gd5.salidas.push({datos,key});if(window.__gd5.salidas.length===1)throw Error('Respuesta perdida');return {ok:true,id:9}}
export async function previsualizarCorreccion(d){if(d.lines.some(l=>l.deliveryNoteLineId===501)&&!d.physicalRestitutionConfirmed)return {ok:false,mensaje:'Confirma recepción física en la bodega original.'};return {ok:true,preview:{lines:d.lines.map(l=>({id:l.deliveryNoteLineId,descripcion:l.deliveryNoteLineId===501?'Producto entregado':'Servicio entregado',quantity:l.quantity,unidad:l.deliveryNoteLineId===501?'un':'h',warehouseId:l.deliveryNoteLineId===501?1:null})),aviso:'La deuda, factura y pagos se conservan.'}}}
export async function confirmarCorreccion(datos,key){window.__gd5.correcciones.push({datos,key});if(window.__gd5.correcciones.length===1)throw Error('Respuesta perdida');return {ok:true,id:10}}
`;
async function main() {
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'acciones-simuladas', setup(build: { onResolve: (o: { filter: RegExp }, cb: (a: {path:string}) => unknown) => void; onLoad: (o: { filter: RegExp; namespace: string }, cb: () => unknown) => void }) {
    build.onResolve({ filter: /@\/app\/\(app\)\/trabajos\/despachos\/actions$/ }, () => ({ path: 'acciones', namespace: 'gd5' }));
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'gd5' }));
    build.onLoad({ filter: /^acciones$/, namespace: 'gd5' }, () => ({ contents: acciones, loader: 'js' }));
    build.onLoad({ filter: /^router$/, namespace: 'gd5' }, () => ({ contents: `export function useRouter(){return {push:v=>window.__gd5.rutas.push(v),refresh:()=>{}}}`, loader: 'js' }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errores: string[] = []; page.on('pageerror', e => errores.push(e.message));
    await page.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }));
    await page.goto('http://127.0.0.1:3031/gd5-simulado'); await estilosGrillas(page); await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const tabla = (name: string) => page.getByRole('region', { name, exact: true }).getByRole('table');
    const editarSalida = (id: string) => page.getByRole('button', { name: `Editar salida ${id}`, exact: true }).click();
    await page.getByRole('button', { name: 'Abrir salida', exact: true }).click();
    assert.equal(await tabla('Partidas para salida').getByRole('row').count(), 4);
    await editarSalida('101/1'); const cantidad = page.getByRole('textbox', { name: 'Cantidad de salida del detalle', exact: true });
    await cantidad.fill('0'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); await page.getByText('La cantidad debe ser positiva.', { exact: true }).waitFor();
    await cantidad.fill('6'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    await editarSalida('101/2'); await cantidad.fill('5'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); await page.getByText(/supera el máximo orientativo disponible/).waitFor();
    await cantidad.fill('4'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    await editarSalida('101/2'); await cantidad.fill('3'); await page.getByRole('button', { name: 'Cancelar detalle', exact: true }).click(); await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await editarSalida('102/conformidad'); await cantidad.fill('2'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); await page.getByText('Indica nombre y fecha de conformidad, sin superar la fecha de salida.', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Nombre de conformidad', exact: true }).fill('Persona de prueba'); await page.getByLabel('Fecha de conformidad', { exact: true }).fill('2026-10-28');
    await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); assert(await page.getByRole('dialog', { name: 'Editar partida de salida', exact: true }).isVisible());
    await page.getByLabel('Fecha de conformidad', { exact: true }).fill('2026-10-27'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    await page.getByRole('button', { name: 'Previsualizar salida', exact: true }).click(); assert.equal(await tabla('Salida que se confirmará').getByRole('row').count(), 4);
    await editarSalida('101/2'); await cantidad.fill(''); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click(); assert.equal(await page.getByRole('region', { name: 'Salida que se confirmará', exact: true }).count(), 0);
    assert.equal(await tabla('Partidas para salida').getByRole('row').count(), 4);
    await editarSalida('101/2'); await cantidad.fill('4'); await page.getByRole('button', { name: 'Aceptar detalle', exact: true }).click();
    await page.getByRole('button', { name: 'Previsualizar salida', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar salida y entrega', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar salida', exact: true }).click();
    await page.getByRole('button', { name: 'Reintentar misma salida', exact: true }).waitFor(); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('alertdialog').count(), 1); assert(await page.locator('button').filter({hasText:/^Previsualizar salida$/}).isDisabled());
    await page.getByRole('button', { name: 'Reintentar misma salida', exact: true }).click();
    const salidas = await page.evaluate(() => (window as unknown as { __gd5: { salidas: {datos:{lines:{workOrderLineId:number;warehouseId:number|null;quantity:string}[]};key:string}[] } }).__gd5.salidas);
    assert.equal(salidas.length, 2); assert.deepEqual(salidas[0], salidas[1]); assert.deepEqual(salidas[0].datos.lines.map(l => [l.workOrderLineId, l.warehouseId, l.quantity]), [[101,1,'6.000'],[101,2,'4.000'],[102,null,'2.000']]);
    await page.getByRole('button', { name: 'Abrir correccion', exact: true }).click(); assert(await page.getByRole('button', { name: 'Editar corrección 503', exact: true }).isDisabled());
    await page.getByRole('textbox', { name: 'Motivo obligatorio', exact: true }).fill('Devolución de prueba'); await page.getByRole('button', { name: 'Editar corrección 501', exact: true }).click();
    const retorno = page.getByRole('textbox', { name: 'Cantidad a corregir (un)', exact: true }); await retorno.fill('5'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click(); await page.getByText('La cantidad supera lo entregado pendiente de corrección.', { exact: true }).waitFor();
    await retorno.fill('2'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click();
    await page.getByRole('button', { name: 'Previsualizar corrección', exact: true }).click(); await page.getByText('Confirma recepción física en la bodega original.', { exact: true }).waitFor();
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Editar corrección 502', exact: true }).click(); await page.getByRole('textbox', { name: 'Cantidad a corregir (h)', exact: true }).fill('1'); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click();
    await page.getByRole('button', { name: 'Previsualizar corrección', exact: true }).click(); assert.equal(await tabla('Partidas de esta corrección').getByRole('row').count(), 3);
    await page.getByRole('button', { name: 'Modificar selección', exact: true }).click(); await page.getByRole('button', { name: 'Editar corrección 502', exact: true }).click(); await page.getByRole('textbox', { name: 'Cantidad a corregir (h)', exact: true }).fill(''); await page.getByRole('button', { name: 'Aceptar cantidad', exact: true }).click();
    await page.getByRole('button', { name: 'Previsualizar corrección', exact: true }).click(); assert.equal(await tabla('Partidas de esta corrección').getByRole('row').count(), 2);
    assert.equal(await page.locator('form form').count(), 0);
    for (const width of [360,768,1280]) { await page.setViewportSize({width,height:900}); await tabla('Partidas de esta corrección').waitFor(); await capturarGrillas(page,`gd5-${width}`); }
    await page.getByRole('button', { name: 'Revisar y confirmar corrección', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar corrección', exact: true }).click(); await page.getByRole('button', { name: 'Reintentar misma corrección', exact: true }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('alertdialog').count(), 1); assert(await page.locator('button').filter({hasText:/^Modificar selección$/}).isDisabled());
    await page.getByRole('button', { name: 'Reintentar misma corrección', exact: true }).click(); await page.getByText('Corrección registrada. La guía original y la deuda se conservan.', { exact: true }).waitFor();
    const correcciones = await page.evaluate(() => (window as unknown as { __gd5: { correcciones: {datos:{physicalRestitutionConfirmed:boolean;lines:unknown[]};key:string}[] } }).__gd5.correcciones);
    assert.equal(correcciones.length, 2); assert.deepEqual(correcciones[0],correcciones[1]); assert(correcciones[0].datos.physicalRestitutionConfirmed); assert.deepEqual(correcciones[0].datos.lines, [{deliveryNoteLineId:501,quantity:'2.000'}]); assert.deepEqual(errores,[]);
    console.log('GD5 navegador: identidad partida/bodega, límites conjuntos, conformidad, descarte/exclusión, devolución parcial, recepción física y reintentos idénticos correctos. Acciones simuladas; sin servidor ni BD.');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
