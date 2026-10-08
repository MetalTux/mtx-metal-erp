// DATABASE_URL debe apuntar a una copia local mtx_validacion_*; no carga .env.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { consultarStock, consultarMovimientos, listarCatalogosInventario } from "../src/lib/consultas/inventario";
import { formatearCantidad, formatearFecha } from "../src/lib/formato";
import { inicioDiaChile, finExclusivoDiaChile, fechaCalendarioValida } from "../src/lib/fechas-chile";
import type { ResultadoConsulta } from "../src/lib/tipos/inventario";
function pagina<T>(resultado: ResultadoConsulta<T>) { assert(resultado.ok);return resultado.pagina; }
async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_"), "Usar únicamente una copia local temporal mtx_validacion_*.");
  const prefijo = `INV-${Date.now()}`;
  const avisos: string[] = [];
  const observarAviso = (aviso: Error) => { if (aviso.name === "DeprecationWarning") avisos.push(aviso.message); };
  process.on("warning", observarAviso);
  let tipoDocumento: number | undefined;
  let unidad: number | undefined, proveedor: number | undefined, compra: number | undefined, trabajo: number | undefined;
  const bodegas: number[] = [], materiales: number[] = [];
  try {
    const u=await prisma.unitMeasure.create({data:{name:prefijo+" Kilos",abbreviation:"kg"}});unidad=u.id;
    for(const nombre of ["Producción Núñez","Reserva","Sin registros"]) bodegas.push((await prisma.warehouse.create({data:{name:prefijo+" "+nombre}})).id);
    for(let i=0;i<16;i++)materiales.push((await prisma.rawMaterial.create({data:{code:`${prefijo}-${i}`,name:`${prefijo} Material ${String(i).padStart(2,"0")}`,unitMeasureId:unidad}})).id);
    proveedor=(await prisma.supplier.create({data:{rut:prefijo,name:prefijo+" Proveedor"}})).id;
    tipoDocumento=(await prisma.documentType.create({data:{code:prefijo.toUpperCase(),name:prefijo+" Documento"}})).id;
    compra=(await prisma.purchase.create({data:{supplierId:proveedor,supplierRut:"11111111-1",documentTypeId:tipoDocumento,documentTypeCode:prefijo.toUpperCase(),documentNumber:"00123",documentNumberNormalized:"00123",warehouseId:bodegas[0],totalAmount:new Prisma.Decimal("20.50")}})).id;
    const detalleCompra=await prisma.purchaseDetail.create({data:{purchaseId:compra,warehouseId:bodegas[0],rawMaterialId:materiales[0],quantity:new Prisma.Decimal("10"),purchasedQuantity:new Prisma.Decimal("10"),presentation:"Unidad",unitFactor:new Prisma.Decimal("1"),lineAmount:new Prisma.Decimal("20.50"),unitPrice:new Prisma.Decimal("2.05")}});
    trabajo=(await prisma.workOrder.create({data:{productName:prefijo+" Obra propia"}})).id;
    const detalleTrabajo=await prisma.workOrderDetail.create({data:{workOrderId:trabajo,warehouseId:bodegas[0],rawMaterialId:materiales[0],quantityNeeded:new Prisma.Decimal("2.25")}});
    const movs = [
      {date:new Date("2026-09-06T03:59:59.999Z"),type:"AJUSTE" as const,quantity:new Prisma.Decimal("2"),note:prefijo+" Antes"},
      {date:new Date("2026-09-06T04:00:00Z"),type:"ENTRADA" as const,quantity:new Prisma.Decimal("10"),note:prefijo+" Recepción",purchaseDetailId:detalleCompra.id},
      {date:new Date("2026-09-06T05:00:00Z"),type:"SALIDA" as const,quantity:new Prisma.Decimal("-2.25"),note:prefijo+" Consumo",workOrderDetailId:detalleTrabajo.id},
      {date:new Date("2026-09-07T02:59:59.999Z"),type:"AJUSTE" as const,quantity:new Prisma.Decimal("0.375"),note:prefijo+" Último del día"},
      {date:new Date("2026-09-07T03:00:00Z"),type:"AJUSTE" as const,quantity:new Prisma.Decimal("-0.125"),note:prefijo+" Después"},
    ];
    for(const mov of movs)await prisma.stockMovement.create({data:{...mov,warehouseId:bodegas[0],rawMaterialId:materiales[0]}});
    await prisma.warehouseStock.create({data:{warehouseId:bodegas[0],rawMaterialId:materiales[0],quantity:new Prisma.Decimal("10"),minStock:new Prisma.Decimal("20")}});
    await prisma.warehouseStock.create({data:{warehouseId:bodegas[1],rawMaterialId:materiales[0],quantity:new Prisma.Decimal("0"),minStock:new Prisma.Decimal("0")}});
    for(let i=1;i<materiales.length;i++) {
      const cantidad=i===1?"12345678901.123":i===2?"-1.001":`${i}.125`;
      await prisma.warehouseStock.create({data:{warehouseId:bodegas[0],rawMaterialId:materiales[i],quantity:new Prisma.Decimal(cantidad)}});
      await prisma.stockMovement.create({data:{warehouseId:bodegas[0],rawMaterialId:materiales[i],type:"AJUSTE",quantity:new Prisma.Decimal(cantidad),note:prefijo+" Ajuste de prueba",date:new Date("2026-09-06T12:00:00Z")}});
    }
    const antes=await prisma.$transaction([prisma.warehouseStock.findMany({where:{rawMaterialId:{in:materiales}},orderBy:{id:"asc"}}),prisma.stockMovement.findMany({where:{rawMaterialId:{in:materiales}},orderBy:{id:"asc"}})]);
    const stock=pagina(await consultarStock({q:prefijo.toLowerCase()}));assert.equal(stock.total,17);assert.equal(stock.datos.length,10);
    const segunda=pagina(await consultarStock({q:prefijo,pagina:"2"}));assert.equal(segunda.datos.length,7);
    const ultima=pagina(await consultarStock({q:prefijo,pagina:"100"}));assert.equal(ultima.pagina,2);
    const mismo=pagina(await consultarStock({material:String(materiales[0])}));assert.equal(mismo.total,2);assert.equal(mismo.datos.find(r=>r.bodega.id===bodegas[0])?.cantidad,"10");assert.equal(mismo.datos.find(r=>r.bodega.id===bodegas[1])?.minimo,"0");
    assert.equal(pagina(await consultarStock({bodega:String(bodegas[2])})).total,0);
    const grandes=pagina(await consultarStock({q:prefijo,orden:"cantidad",sentido:"desc"}));assert.equal(grandes.datos[0].cantidad,"12345678901.123");assert.equal(grandes.datos[0].minimo,null);
    assert.equal(pagina(await consultarStock({q:prefijo,orden:"cantidad",sentido:"asc"})).datos[0].cantidad,"-1.001");
    const minimos=pagina(await consultarStock({q:prefijo,orden:"minimo",sentido:"desc"}));assert.equal(minimos.datos[0].minimo,"20");assert.equal(minimos.datos[1].minimo,"0");assert.equal(minimos.datos[2].minimo,null);
    const mov=pagina(await consultarMovimientos({material:String(materiales[0]),bodega:String(bodegas[0])}));assert.equal(mov.total,5);assert.equal(mov.datos[0].fecha,"2026-09-07T03:00:00.000Z");
    const entrada=pagina(await consultarMovimientos({material:String(materiales[0]),tipo:"ENTRADA"}));assert.equal(entrada.total,1);assert.equal(entrada.datos[0].compra?.id,compra);assert.equal(entrada.datos[0].compra?.detalleId,detalleCompra.id);
    const salida=pagina(await consultarMovimientos({material:String(materiales[0]),tipo:"SALIDA"}));assert.equal(salida.datos[0].trabajo?.id,trabajo);assert.equal(salida.datos[0].cantidad,"-2.25");
    assert.equal(pagina(await consultarMovimientos({material:String(materiales[0]),q:"recepción"})).total,1);
    const dia=pagina(await consultarMovimientos({material:String(materiales[0]),desde:"2026-09-06",hasta:"2026-09-06"}));assert.equal(dia.total,3);assert(dia.datos.some(r=>r.fecha==="2026-09-06T04:00:00.000Z"));assert(dia.datos.some(r=>r.fecha==="2026-09-07T02:59:59.999Z"));
    for(const mal of [{material:"0"},{bodega:"-1"},{bodega:["1","2"]},{pagina:"0"},{pagina:"1.5"},{tamano:"5000"},{orden:"SQL"},{q:"x".repeat(151)}])assert.equal((await consultarStock(mal)).ok,false);
    for(const mal of [{tipo:"OTRO"},{desde:"2026-02-30"},{desde:"2026-10-02",hasta:"2026-10-01"},{hasta:"2026-09-06T00:00Z"}])assert.equal((await consultarMovimientos(mal)).ok,false);
    assert.equal(fechaCalendarioValida("2024-02-29"),true);assert.equal(fechaCalendarioValida("2025-02-29"),false);
    assert.equal(inicioDiaChile("2026-09-06").toISOString(),"2026-09-06T04:00:00.000Z");assert.equal(finExclusivoDiaChile("2026-09-06").getTime()-inicioDiaChile("2026-09-06").getTime(),23*3600000);assert.equal(finExclusivoDiaChile("2026-04-04").getTime()-inicioDiaChile("2026-04-04").getTime(),25*3600000);
    assert.equal(formatearCantidad("12345678901.123"),"12.345.678.901,123");assert.equal(formatearCantidad("-1.001"),"-1,001");assert.equal(formatearCantidad("0.000"),"0");assert.equal(formatearFecha("2026-09-06T04:00:00Z"),"06-09-2026 01:00");
    const catalogos=await listarCatalogosInventario();assert(catalogos.bodegas.some(r=>r.id===bodegas[2]));assert.equal(catalogos.materiales.find(r=>r.id===materiales[0])?.unidad.abbreviation,"kg");
    // Las relaciones se cargan secuencialmente en cada transacción; otras conexiones pueden trabajar en paralelo.
    for (let intento = 0; intento < 5; intento++) {
      await Promise.all([consultarStock({q:prefijo}), consultarMovimientos({q:prefijo}), listarCatalogosInventario()]);
    }
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(avisos, [], "Las consultas de inventario no deben encolar consultas concurrentes en un único cliente pg.");
    const despues=await prisma.$transaction([prisma.warehouseStock.findMany({where:{rawMaterialId:{in:materiales}},orderBy:{id:"asc"}}),prisma.stockMovement.findMany({where:{rawMaterialId:{in:materiales}},orderBy:{id:"asc"}})]);assert.equal(JSON.stringify(antes),JSON.stringify(despues));
    console.log("Correcto: consultas sin escrituras, Decimal exacto, mínimos null/0, filtros relacionados/texto/tipo, orden numérico, paginación completa y ajuste, origen compra/trabajo, fechas Chile inclusive/DST 23h/25h, validación y formato.");
    if(process.env.INVENTARIO_CONSERVAR_DATOS==="1") {
      assert(process.env.INVENTARIO_FIXTURE_PATH,"Indicar ruta de evidencias para conservar datos de prueba.");
      await writeFile(process.env.INVENTARIO_FIXTURE_PATH,JSON.stringify({prefijo,bodegas,materiales,compra,trabajo},null,2));
    }
  } finally {
    process.off("warning", observarAviso);
    if(process.env.INVENTARIO_CONSERVAR_DATOS!=="1") {
      await prisma.stockMovement.deleteMany({where:{rawMaterialId:{in:materiales}}});await prisma.warehouseStock.deleteMany({where:{rawMaterialId:{in:materiales}}});await prisma.purchaseDetail.deleteMany({where:{rawMaterialId:{in:materiales}}});await prisma.workOrderDetail.deleteMany({where:{rawMaterialId:{in:materiales}}});
      if(compra)await prisma.purchase.delete({where:{id:compra}});if(tipoDocumento)await prisma.documentType.delete({where:{id:tipoDocumento}});if(trabajo)await prisma.workOrder.delete({where:{id:trabajo}});
      await prisma.rawMaterial.deleteMany({where:{id:{in:materiales}}});await prisma.warehouse.deleteMany({where:{id:{in:bodegas}}});if(unidad)await prisma.unitMeasure.delete({where:{id:unidad}});if(proveedor)await prisma.supplier.delete({where:{id:proveedor}});
    }
  }
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
