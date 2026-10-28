import { estilosGrillas, capturarGrillas } from "./soporte/grillas-navegador";
// Interacción real de tablas/editores; guardar simulado, sin servidor ni BD.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve("tsx/package.json"))("esbuild");
const entrada = `
import React from 'react';import{createRoot}from'react-dom/client';import{FormularioTrabajo}from'@/components/ordenes-trabajo/formulario';import{PermisosProvider}from'@/components/seguridad/permisos';
window.__gd3={intentos:[],fallar:false};
const c={units:[{id:1,name:'Unidad',abbreviation:'un'}],raws:[{id:1,code:'MP-1',name:'Perfil de prueba',unitMeasureId:1,unitName:'Unidad'}],products:[{id:1,code:'P-1',name:'Producto de prueba',unitMeasureId:1,version:2,recipe:[{rawMaterialId:1,unitMeasureId:1,quantityPerUnit:'4.000'}]}],warehouses:[{id:1,name:'Bodega A',classification:'MATERIA_PRIMA'},{id:2,name:'Bodega B',classification:'MIXTA'},{id:3,name:'Terminados',classification:'PRODUCTO_TERMINADO'}],stock:[],sales:[]};
const linea={id:101,sourceDetailId:10,kind:'PRODUCTO',executionMode:'CATALOGO',productId:1,rawMaterialId:null,unitMeasureId:1,description:'Producto de prueba',quantity:'2.000',quantityToProduce:'1.000',productVersion:1,refreshRecipe:false,materials:[{rawMaterialId:1,warehouseId:1,quantity:'1.000'},{rawMaterialId:1,warehouseId:2,quantity:'1.000'}],supplies:[{warehouseId:3,quantity:'1.000'}],roundingReviews:[]};
const base={id:1,version:3,salesOrderId:7,salesOrderVersion:1,date:'2026-10-27',productName:'OT de prueba',ownPurpose:null,internalInstructions:'Instrucción conservada',targetDate:null,confirmPlan:false,reason:'Prueba GD3',lines:[linea]};
const medida=descripcion=>({...linea,id:null,sourceDetailId:null,kind:'SERVICIO',executionMode:'A_MEDIDA',productId:null,description:descripcion,quantity:'1.000',quantityToProduce:'0.000',productVersion:null,materials:[],supplies:[]});
function App(){const[t,setT]=React.useState('');const hist={historicalRecipes:[{workOrderLineId:101,rawMaterialId:1,unitMeasureId:1,quantityPerUnit:t==='lote'?'0.001':'2.000'}]};const initial=t==='propia'?{...base,id:null,version:null,salesOrderId:null,salesOrderVersion:null,ownPurpose:'Uso interno',lines:[medida('Trabajo A'),medida('Trabajo B')]}:t==='lote'?{...base,lines:[{...linea,quantity:'0.001',quantityToProduce:'0.001',materials:[],supplies:[]}]}:base;return <PermisosProvider roles={['ADMINISTRADOR']}><button onClick={()=>setT('comercial')}>Abrir comercial</button><button onClick={()=>setT('propia')}>Abrir propia</button><button onClick={()=>setT('lote')}>Abrir lote pequeño</button>{t&&<FormularioTrabajo key={t} initial={initial} catalogos={c} historico={hist} onGuardado={async()=>setT('')} onCerrar={()=>setT('')} onCambio={()=>{}} onBloqueo={()=>{}}/>}</PermisosProvider>};createRoot(document.getElementById('root')).render(<App/>);
`;
async function main() {
  const bundle = await esbuild.build({ stdin: { contents: entrada, loader: 'tsx', resolveDir: resolve('.') }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'guardar-simulado', setup(build: { onResolve: (options: { filter: RegExp }, callback: () => unknown) => void; onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void }) {
    build.onResolve({ filter: /@\/app\/\(app\)\/trabajos\/ordenes\/actions$/ }, () => ({ path: 'guardar', namespace: 'gd3' }));
    build.onLoad({ filter: /.*/, namespace: 'gd3' }, () => ({ contents: `export async function guardar(plan,key){window.__gd3.intentos.push({plan,key});if(window.__gd3.fallar){window.__gd3.fallar=false;throw Error('Respuesta perdida')}return {ok:true,id:99}}`, loader: 'js' }));
  } }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errores: string[] = []; page.on('pageerror', e => errores.push(e.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><div id="root"></div>' }));
    await page.goto('http://127.0.0.1:3031/gd3-simulado'); await estilosGrillas(page); await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByRole('button', { name: 'Abrir comercial', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Agregar producto', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Configurar partida Producto de prueba', exact: true }).click();
    assert(await page.getByRole('textbox', { name: 'Cantidad de la partida', exact: true }).isEditable() === false);
    await page.getByText('Receta histórica (revisión 1). No se actualiza automáticamente.', { exact: true }).waitFor();
    const materiales = page.getByRole('region', { name: 'Materiales previstos', exact: true }).getByRole('table');
    await materiales.getByRole('button', { name: /^Quitar distribución/ }).first().click();
    await page.getByRole('button', { name: 'Quitar distribución', exact: true }).click();
    await materiales.getByRole('button', { name: /^Editar distribución/ }).click();
    const cantidad = page.getByRole('textbox', { name: 'Cantidad de distribución o revisión', exact: true });
    await cantidad.fill('2'); await page.getByRole('button', { name: 'Aceptar distribución', exact: true }).click();
    const abastecimiento = page.getByRole('region', { name: 'Abastecimiento desde stock', exact: true }).getByRole('table');
    await abastecimiento.getByRole('button', { name: /^Editar stock/ }).click();
    await cantidad.fill('0'); await page.getByRole('button', { name: 'Aceptar distribución', exact: true }).click(); await page.getByText('La cantidad debe ser positiva.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cancelar distribución', exact: true }).click(); await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    assert.equal(await page.locator('form form').count(), 0);
    await page.getByRole('button', { name: 'Aceptar partida', exact: true }).click();
    await page.getByRole('textbox', { name: 'Título de la OT', exact: true }).fill('Título conservado');
    await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
    await page.evaluate(() => { (window as unknown as { __gd3: { fallar: boolean } }).__gd3.fallar = true; });
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.getByRole('button', { name: 'Reintentar sin cambiar datos', exact: true }).click();
    const intentos = await page.evaluate(() => (window as unknown as { __gd3: { intentos: { plan: { lines: { id: number; materials: { warehouseId: number; quantity: string }[]; supplies: { quantity: string }[] }[]; productName: string }; key: string }[] } }).__gd3.intentos);
    assert.equal(intentos.length, 2); assert.deepEqual(intentos[0], intentos[1]);
    assert.equal(intentos[0].plan.lines[0].id, 101); assert.deepEqual(intentos[0].plan.lines[0].materials, [{ rawMaterialId: 1, warehouseId: 2, quantity: '2.000' }]);
    assert.equal(intentos[0].plan.lines[0].supplies[0].quantity, '1.000'); assert.equal(intentos[0].plan.productName, 'Título conservado');
    await page.getByRole('button', { name: 'Abrir propia', exact: true }).click();
    await page.getByRole('button', { name: 'Quitar partida Trabajo A', exact: true }).click(); await page.getByRole('button', { name: 'Quitar partida', exact: true }).click();
    await page.getByRole('button', { name: 'Configurar partida Trabajo B', exact: true }).click();
    await page.getByRole('textbox', { name: 'Descripción del trabajo', exact: true }).fill('Cambio descartado');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await page.getByRole('button', { name: 'Ver partida Trabajo B', exact: true }).click(); assert.equal(await page.getByRole('button', { name: 'Aceptar partida', exact: true }).count(), 0); await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir lote pequeño', exact: true }).click();
    await page.getByRole('button', { name: 'Configurar partida Producto de prueba', exact: true }).click();
    await page.getByText('Obligatoria pendiente', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Distribuir Perfil de prueba', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Revisar Perfil de prueba', exact: true }).click();
    await cantidad.fill('0,001'); await page.getByRole('button', { name: 'Aceptar distribución', exact: true }).click(); assert(await page.getByRole('dialog', { name: 'Revisar cantidad de receta', exact: true }).isVisible());
    await page.getByRole('textbox', { name: 'Motivo de revisión', exact: true }).fill('Revisión explícita del lote mínimo'); await page.getByRole('button', { name: 'Aceptar distribución', exact: true }).click();
    await page.getByText('Revisado', { exact: true }).waitFor(); assert(!(await page.getByRole('button', { name: 'Distribuir Perfil de prueba', exact: true }).isDisabled()));
    assert.equal(await page.locator('form form').count(), 0);
    for (const width of [360, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); assert(await page.getByRole('table').count() >= 3); await capturarGrillas(page,`gd3-${width}`); }
    assert.deepEqual(errores, []);
    console.log('GD3 navegador: tablas y borradores, identidad tras quitar, restricción comercial, receta histórica, revisión obligatoria con motivo, materiales/stock, descarte, consulta y reintento idéntico correctos. Guardado simulado; sin servidor ni BD.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
