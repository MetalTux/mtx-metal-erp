import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { asignarFolio } from "../src/lib/servicios/numeracion";
import { hoyOrden, registrarOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import { crearTrabajoComercialDePrueba } from "./fixtures/trabajo-comercial";
import { guardarMaterial, eliminarMaterial } from "../src/lib/servicios/materiales";
import { eliminarProducto } from "../src/lib/servicios/productos";
import { guardarBodega, eliminarBodega } from "../src/lib/servicios/bodegas";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_trabajo_"));

async function snapshot(tx: Prisma.TransactionClient, id: number) {
  const [row] = await tx.$queryRaw<{ snapshot: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${id}) AS snapshot`;
  return row.snapshot;
}
async function operacion(tx: Prisma.TransactionClient, id: number, key: string, version: number,
  type: "CREAR" | "EDITAR_PLAN" | "ANULAR", beforeSnapshot?: Prisma.InputJsonValue, afterSnapshot?: Prisma.InputJsonValue) {
  await tx.workOrderOperation.create({ data: { workOrderId: id, idempotencyKey: key, fingerprint: "b".repeat(64), version,
    type, planConfirmed: type === "ANULAR" ? null : false, reason: type === "EDITAR_PLAN" ? "Revisión de prueba M1" : null, beforeSnapshot, afterSnapshot: afterSnapshot ?? await snapshot(tx, id) } });
}

async function main() {
  const fisico = JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }),
    await prisma.stockMovement.findMany({ orderBy: { id: "asc" } }), await prisma.productWarehouseStock.findMany({ orderBy: { id: "asc" } }),
    await prisma.productStockMovement.findMany({ orderBy: { id: "asc" } })]);
  const base = await prisma.quote.findFirstOrThrow(), unidadBase = await prisma.unitMeasure.findFirstOrThrow();
  const cotizacion = await guardarCotizacion({ date: hoyOrden(), validUntil: null, clientId: base.clientId, clientBranchId: base.clientBranchId,
    paymentConditionId: base.paymentConditionId, bankAccountId: null, discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion,
    lines: [{ kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidadBase.id, description: "Servicio de estructura M1", quantity: "1", unitPrice: "100" }] }, randomUUID());
  assert(cotizacion.ok);
  const detalle = await prisma.quoteDetail.findFirstOrThrow({ where: { quoteId: cotizacion.id } });
  const alta = await registrarOrdenCompraCliente({ quoteId: cotizacion.id, quoteVersion: cotizacion.version, date: hoyOrden(),
    customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null, technicalDescription: documentoVacioCotizacion, scopeReviewed: true,
    lines: [{ quoteDetailId: detalle.id, quantity: "1" }] }, randomUUID());
  assert(alta.ok);
  const origen = await prisma.salesOrder.findUniqueOrThrow({ where: { id: alta.id } });
  const cuentas = JSON.stringify(await prisma.accountReceivable.findMany({ orderBy: { id: "asc" } }));
  const comercial = await crearTrabajoComercialDePrueba(origen.id, "Trabajo comercial de estructura M1");
  const aceptadas = await prisma.salesOrderDetail.findMany({ where: { salesOrderId: origen.id }, orderBy: { position: "asc" } });
  const lineas = await prisma.workOrderLine.findMany({ where: { workOrderId: comercial.id }, orderBy: { position: "asc" } });
  assert.equal(lineas.length, aceptadas.length);
  assert.deepEqual(lineas.map(l => [l.salesOrderDetailId, l.quantity.toString(), l.description, l.kind]),
    aceptadas.map(l => [l.id, l.quantity.toString(), l.description, l.kind]));
  await assert.rejects(crearTrabajoComercialDePrueba(origen.id, "Duplicado"));
  await assert.rejects(prisma.workOrder.delete({ where: { id: comercial.id } }));
  await assert.rejects(prisma.workOrder.update({ where: { id: comercial.id }, data: { salesOrderId: null, version: 2 } }));
  await assert.rejects(prisma.workOrder.update({ where: { id: comercial.id }, data: { status: "ANULADO", version: 2, voidedAt: new Date(), voidReason: "No permitido" } }));
  await assert.rejects(prisma.workOrderLine.delete({ where: { id: lineas[0].id } }));
  await assert.rejects(prisma.workOrderLine.update({ where: { id: lineas[0].id }, data: { quantity: lineas[0].quantity.plus(1), version: 2 } }));
  await assert.rejects(prisma.workOrderLine.update({ where: { id: lineas[0].id }, data: { version: 2 } }));
  await assert.rejects(prisma.workOrderOperation.delete({ where: { idempotencyKey: comercial.creationKey! } }));
  await assert.rejects(prisma.workOrder.update({ where: { id: comercial.id }, data: { status: "EN_PROCESO", version: 2, startedDate: comercial.date } }));

  const unidad = await prisma.unitMeasure.create({ data: { name: `Unidad M1 ${randomUUID()}`, abbreviation: "un" } });
  const otraUnidad = await prisma.unitMeasure.create({ data: { name: `Otra unidad M1 ${randomUUID()}`, abbreviation: "m" } });
  const material = await prisma.rawMaterial.create({ data: { code: `M1-${randomUUID()}`, name: "Material histórico M1", unitMeasureId: unidad.id } });
  const producto = await prisma.product.create({ data: { name: "Producto M1", unitMeasureId: unidad.id, creationKey: randomUUID(), creationFingerprint: "a".repeat(64) } });
  const material2 = await prisma.rawMaterial.create({ data: { code: `M1-${randomUUID()}`, name: "Segundo material M1", unitMeasureId: unidad.id } });
  for (const m of [material, material2]) await prisma.productRecipe.create({ data: { productId: producto.id, rawMaterialId: m.id, quantity: "2.500" } });
  const bodega = await prisma.warehouse.create({ data: { name: "Bodega M1 terminado", classification: "PRODUCTO_TERMINADO" } });

  async function propia(opciones: { fabricar?: boolean; omitirOperacion?: boolean; omitirLinea?: boolean; recetaIncompleta?: boolean; snapshotAdulterado?: boolean } = {}) {
    return prisma.$transaction(async tx => {
      for (const m of [material, material2].sort((a, b) => a.id - b.id)) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${m.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${producto.id} FOR UPDATE`;
      const key = randomUUID(), folio = await asignarFolio(tx, "ORDEN_TRABAJO", key);
      const w = await tx.workOrder.create({ data: { schemaVersion: 1, folioId: folio.id, creationKey: key,
        date: new Date(`${hoyOrden()}T00:00:00Z`), productName: "Obra propia M1", ownPurpose: "Uso interno" } });
      let l: { id: number } | undefined;
      if (!opciones.omitirLinea) {
        l = await tx.workOrderLine.create({ data: { workOrderId: w.id, position: 0, kind: "PRODUCTO", executionMode: "CATALOGO",
          description: producto.name, code: producto.code, unitMeasureId: unidad.id, unitName: unidad.name, unitAbbreviation: unidad.abbreviation,
          productId: producto.id, quantity: "1", quantityFromStock: opciones.fabricar ? "0" : "1", quantityToProduce: opciones.fabricar ? "1" : "0",
          productVersion: opciones.fabricar ? producto.version : null, recipeCapturedAt: opciones.fabricar ? new Date() : null,
          recipeFingerprint: opciones.fabricar ? "c".repeat(64) : null } });
        if (opciones.fabricar) {
          for (const m of opciones.recetaIncompleta ? [material] : [material, material2]) {
            await tx.workOrderRecipeMaterial.create({ data: { workOrderLineId: l.id, rawMaterialId: m.id, unitMeasureId: unidad.id,
              quantityPerUnit: "2.500", materialCode: m.code, materialName: m.name, unitName: unidad.name, unitAbbreviation: unidad.abbreviation } });
          }
        } else await tx.workOrderSupplyPlan.create({ data: { workOrderId: w.id, workOrderLineId: l.id,
          warehouseId: bodega.id, productId: producto.id, quantity: "1" } });
      }
      if (!opciones.omitirOperacion) {
        const after = await snapshot(tx, w.id);
        if (opciones.snapshotAdulterado) (after as { header: { productName: string } }).header.productName = "Nombre adulterado";
        await operacion(tx, w.id, key, 1, "CREAR", undefined, after);
      }
      return { work: w, line: l };
    }, { timeout: 30000 });
  }
  const numerosAntes = await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_TRABAJO" } });
  const cantidadAntes = await prisma.workOrder.count();
  for (const opciones of [{ omitirOperacion: true }, { omitirLinea: true }, { fabricar: true, recetaIncompleta: true }, { snapshotAdulterado: true }]) {
    await assert.rejects(propia(opciones));
    assert.equal(await prisma.workOrder.count(), cantidadAntes);
    assert.equal((await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_TRABAJO" } })).nextNumber, numerosAntes.nextNumber);
  }
  const fabricacion = await propia({ fabricar: true }), suministro = await propia();
  assert.notEqual(fabricacion.work.id, suministro.work.id);
  assert.equal(fabricacion.work.salesOrderId, null);
  assert.equal(suministro.work.salesOrderId, null);
  assert.equal(await prisma.workOrderRecipeMaterial.count({ where: { workOrderLineId: fabricacion.line!.id } }), 2);
  const recetaHistorica = JSON.stringify(await prisma.workOrderRecipeMaterial.findMany({ where: { workOrderLineId: fabricacion.line!.id }, orderBy: { id: "asc" } }));
  await prisma.productRecipe.deleteMany({ where: { productId: producto.id } });
  await prisma.product.update({ where: { id: producto.id }, data: { version: { increment: 1 } } });
  await prisma.$transaction(async tx => {
    const anterior = await tx.workOrderOperation.findUniqueOrThrow({ where: { idempotencyKey: fabricacion.work.creationKey! } });
    await tx.workOrder.update({ where: { id: fabricacion.work.id }, data: { version: 2, internalInstructions: "Revisar sin refrescar receta" } });
    await operacion(tx, fabricacion.work.id, randomUUID(), 2, "EDITAR_PLAN", anterior.afterSnapshot as Prisma.InputJsonValue);
  });
  assert.equal(JSON.stringify(await prisma.workOrderRecipeMaterial.findMany({ where: { workOrderLineId: fabricacion.line!.id }, orderBy: { id: "asc" } })), recetaHistorica);
  await assert.rejects(prisma.rawMaterial.update({ where: { id: material.id }, data: { unitMeasureId: otraUnidad.id } }));
  const mActual = await prisma.rawMaterial.findUniqueOrThrow({ where: { id: material.id } });
  const cambio = await guardarMaterial({ code: mActual.code, name: mActual.name, description: "", unitMeasureId: otraUnidad.id }, { id: mActual.id, updatedAt: mActual.updatedAt.toISOString() });
  assert(!cambio.ok);
  assert.equal((await eliminarProducto({ id: producto.id, version: 2 })).ok, false);
  const bActual = await prisma.warehouse.findUniqueOrThrow({ where: { id: bodega.id } });
  assert.equal((await guardarBodega({ name: bActual.name, location: "", classification: "MATERIA_PRIMA" }, { id: bActual.id, updatedAt: bActual.updatedAt.toISOString() })).ok, false);

  // Sustituir un plan pendiente conserva las referencias históricas en su operación.
  await prisma.$transaction(async tx => {
    const anterior = await tx.workOrderOperation.findFirstOrThrow({ where: { workOrderId: fabricacion.work.id, version: 2 } });
    await tx.workOrder.update({ where: { id: fabricacion.work.id }, data: { version: 3 } });
    await tx.workOrderRecipeMaterial.deleteMany({ where: { workOrderLineId: fabricacion.line!.id } });
    await tx.workOrderLine.update({ where: { id: fabricacion.line!.id }, data: { version: 2, quantityToProduce: "0", quantityFromStock: "1", productVersion: null, recipeCapturedAt: null, recipeFingerprint: null } });
    await operacion(tx, fabricacion.work.id, randomUUID(), 3, "EDITAR_PLAN", anterior.afterSnapshot as Prisma.InputJsonValue);
  });
  assert.equal(await prisma.workOrderRecipeMaterial.count({ where: { rawMaterialId: material.id } }), 0);
  assert.equal((await guardarMaterial({ code: mActual.code, name: mActual.name, description: "", unitMeasureId: otraUnidad.id }, { id: mActual.id, updatedAt: mActual.updatedAt.toISOString() })).ok, false);
  assert.equal((await eliminarMaterial({ id: mActual.id, updatedAt: mActual.updatedAt.toISOString() })).ok, false);
  await assert.rejects(prisma.rawMaterial.update({ where: { id: material.id }, data: { unitMeasureId: otraUnidad.id } }));
  await assert.rejects(prisma.rawMaterial.delete({ where: { id: material.id } }));
  await prisma.$transaction(async tx => {
    const anterior = await tx.workOrderOperation.findFirstOrThrow({ where: { workOrderId: suministro.work.id, version: 1 } });
    await tx.workOrder.update({ where: { id: suministro.work.id }, data: { version: 2 } });
    await tx.workOrderSupplyPlan.deleteMany({ where: { workOrderId: suministro.work.id } });
    await operacion(tx, suministro.work.id, randomUUID(), 2, "EDITAR_PLAN", anterior.afterSnapshot as Prisma.InputJsonValue);
  });
  await assert.rejects(prisma.warehouse.update({ where: { id: bodega.id }, data: { classification: "MATERIA_PRIMA" } }));
  await assert.rejects(prisma.warehouse.delete({ where: { id: bodega.id } }));
  assert.equal((await guardarBodega({ name: bActual.name, location: "", classification: "MATERIA_PRIMA" }, { id: bActual.id, updatedAt: bActual.updatedAt.toISOString() })).ok, false);
  assert.equal((await eliminarBodega({ id: bActual.id, updatedAt: bActual.updatedAt.toISOString() })).ok, false);
  await prisma.$transaction(async tx => {
    const anterior = await tx.workOrderOperation.findFirstOrThrow({ where: { workOrderId: suministro.work.id, version: 2 } });
    await tx.workOrder.update({ where: { id: suministro.work.id }, data: { version: 3, status: "ANULADO", voidedAt: new Date(), voidReason: "Obra propia sin ejecución" } });
    await operacion(tx, suministro.work.id, randomUUID(), 3, "ANULAR", anterior.afterSnapshot as Prisma.InputJsonValue);
  });
  await assert.rejects(prisma.workOrder.update({ where: { id: suministro.work.id }, data: { version: 4, status: "PENDIENTE", voidedAt: null, voidReason: null } }));
  assert.equal(JSON.stringify(await prisma.accountReceivable.findMany({ orderBy: { id: "asc" } })), cuentas);
  assert.equal(JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }),
    await prisma.stockMovement.findMany({ orderBy: { id: "asc" } }), await prisma.productWarehouseStock.findMany({ orderBy: { id: "asc" } }),
    await prisma.productStockMovement.findMany({ orderBy: { id: "asc" } })]), fisico);
  console.log("OK: estructura M1, origen aceptado, obra propia, folio/operación/snapshot atómicos, rollback, recetas históricas, referencias permanentes y ausencia de cambios físicos/financieros.");
}
main().catch(error => { console.error("Falló la validación M1:", error instanceof Error ? error.message : "error desconocido"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
