// DATABASE_URL debe apuntar a una copia temporal mtx_validacion_*.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarMaterial, eliminarMaterial, guardarMaterial, listarMateriales, listarUnidadesMaterial } from "../src/lib/servicios/materiales";
import type { Material, ResultadoMaterial } from "../src/lib/tipos/material";
function registro(r: ResultadoMaterial): Material { assert(r.ok && r.material);return r.material; }
async function main() {
  assert(new URL(process.env.DATABASE_URL!).pathname.startsWith("/mtx_validacion_"), "Se requiere una base temporal mtx_validacion_*.");
  const nombre = `Material prueba ${Date.now()}`;
  let tipoDocumentoId: number | undefined;
  const ids: number[] = [];let unidadId: number | undefined, otraUnidadId: number | undefined, bodegaId: number | undefined, proveedorId: number | undefined, compraId: number | undefined, trabajoId: number | undefined, clienteId: number | undefined, cotizacionId: number | undefined;
  try {
    unidadId = (await prisma.unitMeasure.create({ data: { name: nombre, abbreviation: "pr" } })).id;
    otraUnidadId = (await prisma.unitMeasure.create({ data: { name: nombre + " otra", abbreviation: "ot" } })).id;
    const datos = { code: nombre, name: nombre, unitMeasureId: unidadId };
    for (const cambio of [{ code: " " }, { name: " " }, { code: "x".repeat(51) }, { name: "x".repeat(151) }, { description: "x".repeat(2001) }, { unitMeasureId: 0 }, { unitMeasureId: "1" }, { unitMeasureId: 2147483647 }]) assert.equal((await guardarMaterial({ ...datos, ...cambio })).ok, false);
    assert.equal((await guardarMaterial(datos, null)).ok, false);assert.equal((await consultarMaterial("1")).ok, false);
    const material = registro(await guardarMaterial({ ...datos, code: "  " + datos.code + "  " }));ids.push(material.id);assert.equal(material.code, datos.code);assert.equal(material.description, null);
    assert((await listarMateriales()).some(m => m.id === material.id && m.unidad.abbreviation === "pr"));assert((await listarUnidadesMaterial()).some(u => u.id === unidadId));
    assert.equal((await guardarMaterial(datos)).ok, false);
    let actual = registro(await guardarMaterial({ ...datos, unitMeasureId: otraUnidadId, description: "  Especificación  " }, material));assert.equal(actual.unitMeasureId, otraUnidadId);assert.equal(actual.description, "Especificación");
    assert.equal((await guardarMaterial(datos, material)).ok, false);assert.equal((await eliminarMaterial(material)).ok, false);
    actual = registro(await guardarMaterial({ ...datos, description: " " }, actual));assert.equal(actual.description, null);
    bodegaId = (await prisma.warehouse.create({ data: { name: nombre } })).id;
    proveedorId = (await prisma.supplier.create({ data: { name: nombre, rut: nombre } })).id;
    const codigoDocumento = `PRUEBA-${Date.now()}`;
    tipoDocumentoId = (await prisma.documentType.create({data:{code:codigoDocumento,name:nombre}})).id;
    compraId = (await prisma.purchase.create({ data: { supplierId: proveedorId, supplierRut:"11111111-1", documentTypeId:tipoDocumentoId, documentTypeCode:codigoDocumento, documentNumber:"001", documentNumberNormalized:"001", warehouseId:bodegaId, totalAmount: "1" } })).id;
    trabajoId = (await prisma.workOrder.create({ data: { productName: nombre } })).id;
    clienteId = (await prisma.client.create({ data: { name: nombre, rut: nombre } })).id;
    cotizacionId = (await prisma.quote.create({ data: { clientId: clienteId, totalAmount: "1" } })).id;
    const verificar = async (referencia: keyof Material["referencias"]) => {
      const consultado = registro(await consultarMaterial(actual.id));assert.equal(consultado.referencias[referencia], 1);
      assert.equal(Object.values(consultado.referencias).reduce((a,b) => a+b,0), 1);
      const cambio = await guardarMaterial({ ...datos, unitMeasureId: otraUnidadId }, actual);assert(!cambio.ok && cambio.campos?.unitMeasureId);
      actual = registro(await guardarMaterial({ ...datos, name: nombre + " editado" }, actual)); // Otros campos sí se pueden editar.
      const borrado = await eliminarMaterial(actual);assert(!borrado.ok && borrado.mensaje.includes("asociados"));
    };
    await prisma.warehouseStock.create({ data: { warehouseId: bodegaId, rawMaterialId: actual.id, quantity: "0" } });await verificar("stocks");await prisma.warehouseStock.deleteMany({ where: { rawMaterialId: actual.id } });
    await prisma.stockMovement.create({ data: { warehouseId: bodegaId, rawMaterialId: actual.id, quantity: "0", type: "AJUSTE" } });await verificar("movimientos");await prisma.stockMovement.deleteMany({ where: { rawMaterialId: actual.id } });
    await prisma.purchaseDetail.create({ data: { warehouseId: bodegaId, rawMaterialId: actual.id, purchaseId: compraId, quantity: "1", purchasedQuantity:"1", presentation:"Unidad", unitFactor:"1", lineAmount:"1", unitPrice: "1" } });await verificar("compras");await prisma.purchaseDetail.deleteMany({ where: { rawMaterialId: actual.id } });
    await prisma.workOrderDetail.create({ data: { warehouseId: bodegaId, rawMaterialId: actual.id, workOrderId: trabajoId, quantityNeeded: "1" } });await verificar("trabajos");await prisma.workOrderDetail.deleteMany({ where: { rawMaterialId: actual.id } });
    const linea = await prisma.quoteDetail.create({ data: { rawMaterialId: actual.id, quoteId: cotizacionId, description: nombre, quantity: "1", unitPrice: "1" } });await verificar("cotizaciones");assert.equal((await prisma.quoteDetail.findUniqueOrThrow({ where: { id: linea.id } })).rawMaterialId, actual.id);await prisma.quoteDetail.delete({ where: { id: linea.id } });
    actual = registro(await guardarMaterial({ ...datos, unitMeasureId: otraUnidadId }, actual));assert.equal(actual.unitMeasureId, otraUnidadId);
    assert.equal((await eliminarMaterial(actual)).ok, true);assert.equal((await consultarMaterial(actual.id)).ok, false);
    console.log("Correcto: CRUD, código único, unidad existente, límites, versión, cambio de unidad sin referencias y bloqueo por las cinco relaciones, incluido stock cero y cotizaciones sin desvincular.");
  } finally {
    await prisma.warehouseStock.deleteMany({ where: { rawMaterialId: { in: ids } } });await prisma.stockMovement.deleteMany({ where: { rawMaterialId: { in: ids } } });await prisma.purchaseDetail.deleteMany({ where: { rawMaterialId: { in: ids } } });await prisma.workOrderDetail.deleteMany({ where: { rawMaterialId: { in: ids } } });await prisma.quoteDetail.deleteMany({ where: { rawMaterialId: { in: ids } } });await prisma.rawMaterial.deleteMany({ where: { id: { in: ids } } });
    if (compraId) await prisma.purchase.delete({ where: { id: compraId } });if(tipoDocumentoId)await prisma.documentType.delete({where:{id:tipoDocumentoId}});if (trabajoId) await prisma.workOrder.delete({ where: { id: trabajoId } });if (cotizacionId) await prisma.quote.delete({ where: { id: cotizacionId } });if (proveedorId) await prisma.supplier.delete({ where: { id: proveedorId } });if (clienteId) await prisma.client.delete({ where: { id: clienteId } });if (bodegaId) await prisma.warehouse.delete({ where: { id: bodegaId } });if (unidadId) await prisma.unitMeasure.delete({ where: { id: unidadId } });if (otraUnidadId) await prisma.unitMeasure.delete({ where: { id: otraUnidadId } });
  }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
