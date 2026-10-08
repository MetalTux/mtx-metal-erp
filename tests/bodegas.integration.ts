// Ejecutar solamente contra una copia temporal: DATABASE_URL debe apuntar a mtx_validacion_*.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarBodega, eliminarBodega, guardarBodega, listarBodegas } from "../src/lib/servicios/bodegas";
import type { Bodega } from "../src/lib/tipos/bodega";

async function main() {
  assert(new URL(process.env.DATABASE_URL!).pathname.startsWith("/mtx_validacion_"), "Las pruebas requieren una base temporal mtx_validacion_*.");
  const nombre = `Bodega prueba ${Date.now()}`;
  let tipoDocumentoId: number | undefined;
  const ids: number[] = [];
  let unidadId: number | undefined;
  let materialId: number | undefined;
  let proveedorId: number | undefined;
  let compraId: number | undefined;
  let trabajoId: number | undefined;
  const registrar = async (name: string): Promise<Bodega> => {
    const resultado = await guardarBodega({ name });
    assert(resultado.ok && resultado.bodega);
    ids.push(resultado.bodega.id);
    return resultado.bodega;
  };
  const verificarBloqueo = async (bodega: Bodega, tipo: keyof Bodega["referencias"]) => {
    const detalle = await consultarBodega(bodega.id);
    assert(detalle.ok && detalle.bodega);
    assert.equal(detalle.bodega.referencias[tipo], 1);
    assert.equal(Object.values(detalle.bodega.referencias).reduce((a, b) => a + b, 0), 1);
    const resultado = await eliminarBodega({ id: bodega.id, updatedAt: bodega.updatedAt });
    assert(!resultado.ok && resultado.mensaje.includes("asociados"));
    assert(await prisma.warehouse.findUnique({ where: { id: bodega.id } }));
  };
  try {
    assert((await listarBodegas()).every((bodega) => typeof bodega.createdAt === "string" && typeof bodega.referencias.stocks === "number"));
    assert.equal((await guardarBodega({ name: "   " })).ok, false);
    assert.equal((await guardarBodega({ name: "A".repeat(101) })).ok, false);
    assert.equal((await guardarBodega({ name: nombre, location: "A".repeat(201) })).ok, false);
    assert.equal((await guardarBodega({ name: nombre, location: 42 })).ok, false);
    assert.equal((await guardarBodega({ name: nombre }, null)).ok, false);
    assert.equal((await consultarBodega("1")).ok, false);
    assert.equal((await eliminarBodega({ id: -1, updatedAt: "ayer" })).ok, false);

    const bodega = await registrar(`  ${nombre}  `);
    assert.equal(bodega.name, nombre);
    assert.equal(bodega.location, null);
    const editada = await guardarBodega({ name: `${nombre} editada`, location: "  Patio norte  " }, { id: bodega.id, updatedAt: bodega.updatedAt });
    assert(editada.ok && editada.bodega);
    assert.equal(editada.bodega.location, "Patio norte");
    assert.equal((await guardarBodega({ name: "No debe sobrescribir" }, { id: bodega.id, updatedAt: bodega.updatedAt })).ok, false);
    assert.equal((await eliminarBodega({ id: bodega.id, updatedAt: bodega.updatedAt })).ok, false);
    const sinUbicacion = await guardarBodega({ name: editada.bodega.name, location: "   " }, { id: bodega.id, updatedAt: editada.bodega.updatedAt });
    assert(sinUbicacion.ok && sinUbicacion.bodega?.location === null);

    // Warehouse.name no es único en el esquema: se conserva esa regla.
    const mismoNombre = await registrar(sinUbicacion.bodega.name);
    assert.notEqual(mismoNombre.id, bodega.id);

    unidadId = (await prisma.unitMeasure.create({ data: { name: `${nombre} unidad`, abbreviation: "pr" } })).id;
    materialId = (await prisma.rawMaterial.create({ data: { code: nombre, name: "Material de prueba", unitMeasureId: unidadId } })).id;
    const relacionada = await registrar(`${nombre} relacionada`);

    await prisma.warehouseStock.create({ data: { warehouseId: relacionada.id, rawMaterialId: materialId, quantity: "0", minStock: "2" } });
    await verificarBloqueo(relacionada, "stocks");
    await prisma.warehouseStock.deleteMany({ where: { warehouseId: relacionada.id } });

    // Cantidad cero en un fixture aislado para probar la FK sin alterar saldos.
    const movimiento = await prisma.stockMovement.create({ data: { warehouseId: relacionada.id, rawMaterialId: materialId, type: "AJUSTE", quantity: "0", note: "Referencia temporal de prueba" } });
    await verificarBloqueo(relacionada, "movimientos");
    await prisma.stockMovement.delete({ where: { id: movimiento.id } });

    proveedorId = (await prisma.supplier.create({ data: { name: nombre, rut: nombre } })).id;
    const codigoDocumento = `PRUEBA-${Date.now()}`;
    tipoDocumentoId = (await prisma.documentType.create({data:{code:codigoDocumento,name:nombre}})).id;
    compraId = (await prisma.purchase.create({ data: { supplierId: proveedorId, supplierRut:"11111111-1", documentTypeId:tipoDocumentoId, documentTypeCode:codigoDocumento, documentNumber:"001", documentNumberNormalized:"001", warehouseId:relacionada.id, totalAmount: "1" } })).id;
    await verificarBloqueo(relacionada, "compras"); // Cabecera sin líneas también protege la bodega.
    const detalleCompra = await prisma.purchaseDetail.create({ data: { purchaseId: compraId, rawMaterialId: materialId, warehouseId: relacionada.id, quantity: "1", purchasedQuantity:"1", presentation:"Unidad", unitFactor:"1", lineAmount:"1", unitPrice: "1" } });
    await verificarBloqueo(relacionada, "compras");
    await prisma.purchaseDetail.delete({ where: { id: detalleCompra.id } });
    await verificarBloqueo(relacionada, "compras");
    await prisma.purchase.delete({where:{id:compraId}});compraId=undefined;

    trabajoId = (await prisma.workOrder.create({ data: { productName: nombre } })).id;
    const detalleTrabajo = await prisma.workOrderDetail.create({ data: { workOrderId: trabajoId, rawMaterialId: materialId, warehouseId: relacionada.id, quantityNeeded: "1" } });
    await verificarBloqueo(relacionada, "trabajos");
    await prisma.workOrderDetail.delete({ where: { id: detalleTrabajo.id } });

    assert.equal((await eliminarBodega({ id: relacionada.id, updatedAt: relacionada.updatedAt })).ok, true);
    assert.equal((await consultarBodega(relacionada.id)).ok, false);
    assert.equal((await eliminarBodega({ id: relacionada.id, updatedAt: relacionada.updatedAt })).ok, false);
    console.log("Correcto: CRUD, ubicación opcional, normalización, nombres no únicos, concurrencia y las cuatro FK, incluido stock cero.");
  } finally {
    // Solo referencias de las bodegas creadas por esta prueba en la copia temporal.
    await prisma.stockMovement.deleteMany({ where: { warehouseId: { in: ids } } });
    await prisma.warehouseStock.deleteMany({ where: { warehouseId: { in: ids } } });
    await prisma.purchaseDetail.deleteMany({ where: { warehouseId: { in: ids } } });
    await prisma.workOrderDetail.deleteMany({ where: { warehouseId: { in: ids } } });
    if (compraId !== undefined) await prisma.purchase.delete({ where: { id: compraId } });
    await prisma.warehouse.deleteMany({ where: { id: { in: ids } } });
    if (trabajoId !== undefined) await prisma.workOrder.delete({ where: { id: trabajoId } });
    if(tipoDocumentoId)await prisma.documentType.delete({where:{id:tipoDocumentoId}});
    if (proveedorId !== undefined) await prisma.supplier.delete({ where: { id: proveedorId } });
    if (materialId !== undefined) await prisma.rawMaterial.delete({ where: { id: materialId } });
    if (unidadId !== undefined) await prisma.unitMeasure.delete({ where: { id: unidadId } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
