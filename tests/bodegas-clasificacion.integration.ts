// Sólo copia local descartable: no ejecutar fixtures contra la base real.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { guardarBodega, consultarBodega } from "../src/lib/servicios/bodegas";
import { listarCatalogosInventario } from "../src/lib/consultas/inventario";
import { catalogosCompra } from "../src/lib/servicios/compras";
async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_bodegas_"));
  const nombre = `Clasificación ${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({ data: { name: nombre, abbreviation: "un" } });
  const material = await prisma.rawMaterial.create({ data: { name: nombre, code: nombre, unitMeasureId: unidad.id } });
  for (const classification of [undefined, null, "OTRA"]) assert.equal((await guardarBodega({ name: nombre, classification })).ok, false);
  const heredada = await prisma.warehouse.create({ data: { name: `${nombre} heredada` } });
  assert.equal(heredada.classification, null);
  assert.equal((await guardarBodega({ name: heredada.name }, { id: heredada.id, updatedAt: heredada.updatedAt.toISOString() })).ok, false);
  for (const classification of ["MATERIA_PRIMA", "MIXTA", "PRODUCTO_TERMINADO"] as const) {
    const resultado = await guardarBodega({ name: `${nombre} ${classification}`, classification });
    assert(resultado.ok && resultado.bodega);
    assert.equal(resultado.bodega.classification, classification);
    const consulta = await consultarBodega(resultado.bodega.id);
    assert(consulta.ok && consulta.bodega?.classification === classification);
    const inventario = await listarCatalogosInventario(), compras = await catalogosCompra();
    assert.equal(inventario.bodegas.some(b => b.id === resultado.bodega!.id), classification !== "PRODUCTO_TERMINADO");
    assert.equal(compras.bodegas.some(b => b.id === resultado.bodega!.id), classification !== "PRODUCTO_TERMINADO");
    if (classification === "PRODUCTO_TERMINADO") {
      await assert.rejects(prisma.warehouseStock.create({ data: { warehouseId: resultado.bodega.id, rawMaterialId: material.id, quantity: "0" } }));
      await assert.rejects(prisma.stockMovement.create({ data: { warehouseId: resultado.bodega.id, rawMaterialId: material.id, type: "AJUSTE", quantity: "0" } }));
      const trabajo = await prisma.workOrder.create({ data: { productName: nombre } });
      await assert.rejects(prisma.workOrderDetail.create({ data: { workOrderId: trabajo.id, rawMaterialId: material.id, warehouseId: resultado.bodega.id, quantityNeeded: "1" } }));
    }
  }
  await prisma.warehouseStock.create({ data: { warehouseId: heredada.id, rawMaterialId: material.id, quantity: "0", minStock: "1" } });
  const referencia = { id: heredada.id, updatedAt: heredada.updatedAt.toISOString() };
  assert.equal((await guardarBodega({ name: heredada.name, classification: "PRODUCTO_TERMINADO" }, referencia)).ok, false);
  await assert.rejects(prisma.warehouse.update({ where: { id: heredada.id }, data: { classification: "PRODUCTO_TERMINADO" } }));
  const mixta = await guardarBodega({ name: heredada.name, classification: "MIXTA" }, referencia);
  assert(mixta.ok && mixta.bodega);
  assert.equal((await guardarBodega({ name: heredada.name, classification: "MATERIA_PRIMA" }, referencia)).ok, false);
  await assert.rejects(prisma.warehouse.update({ where: { id: heredada.id }, data: { classification: null } }));
  // Reclasificar y crear stock simultáneamente nunca puede dejar material en terminado exclusivo.
  for (let i = 0; i < 5; i++) {
    const b = await prisma.warehouse.create({ data: { name: `${nombre} carrera ${i}`, classification: "MIXTA" } });
    const resultados = await Promise.allSettled([
      prisma.warehouse.update({ where: { id: b.id }, data: { classification: "PRODUCTO_TERMINADO" } }),
      prisma.warehouseStock.create({ data: { warehouseId: b.id, rawMaterialId: material.id, quantity: "0" } }),
    ]);
    assert(resultados.some(r => r.status === "rejected"));
    const final = await prisma.warehouse.findUniqueOrThrow({ where: { id: b.id } });
    if (final.classification === "PRODUCTO_TERMINADO") assert.equal(await prisma.warehouseStock.count({ where: { warehouseId: b.id } }), 0);
  }
  console.log("OK: clasificación obligatoria, tres tipos, heredadas sin clasificar, selectores, stock cero, protecciones SQL, versión y concurrencia.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
