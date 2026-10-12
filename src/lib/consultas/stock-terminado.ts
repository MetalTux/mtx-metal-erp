import { prisma } from "@/lib/prisma";
import { filtrosTerminadoSchema } from "@/lib/validaciones/stock-terminado";
import type { CatalogosTerminado, ConsultaTerminado, FilaTerminado } from "@/lib/tipos/stock-terminado";
export async function catalogosTerminado(): Promise<CatalogosTerminado> {
  const [productos, bodegas] = await Promise.all([
    prisma.product.findMany({ where: { deletedAt: null }, include: { unitMeasure: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.warehouse.findMany({ where: { classification: { in: ["MIXTA", "PRODUCTO_TERMINADO"] } }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
  ]);
  return { productos: productos.map(p => ({ id: p.id, name: p.name, code: p.code, version: p.version, unitMeasureId: p.unitMeasureId, unidad: p.unitMeasure.abbreviation, nombreUnidad: p.unitMeasure.name })), bodegas };
}
export async function consultarInventarioTerminado(entrada: unknown = {}): Promise<ConsultaTerminado> {
  const v = filtrosTerminadoSchema.safeParse(entrada);
  if (!v.success) return { ok: false, mensaje: "Los filtros no son válidos. Limpia los filtros para continuar." };
  const f = v.data;
  try {
    return await prisma.$transaction(async tx => {
      // Texto también busca fragmentos del UUID mediante cast en PostgreSQL, sin convertir cantidades.
      const ids = f.texto ? await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "Product" WHERE position(lower(${f.texto}) IN lower(name || ' ' || code::text)) > 0` : [];
      const base = { productId: f.productId, warehouseId: f.warehouseId, ...(f.texto && { OR: [{ productId: { in: ids.map(p => p.id) } }, { warehouse: { name: { contains: f.texto, mode: "insensitive" as const } } }] }) };
      const orderBy = f.orden === "quantity" ? [{ quantity: f.sentido }, { id: f.sentido }] : [{ id: f.sentido }];
      let total: number, pagina: number;
      type Fila = { id: number; productId: number; warehouseId: number; quantity: { toString(): string }; createdAt: Date; date?: Date; note?: string; productCode?: string; productName?: string; unitAbbreviation?: string; initialStockId?: number | null; adjustmentId?: number | null; previousQuantity?: { toString(): string }; finalQuantity?: { toString(): string }; reason?: string; correctedInitialStockId?: number | null; correctedAdjustmentId?: number | null };
      let filas: Fila[];
      if (f.vista === "stock") {
        total = await tx.productWarehouseStock.count({ where: base });
        pagina = Math.min(f.pagina, Math.max(1, Math.ceil(total / f.tamano)));
        filas = await tx.productWarehouseStock.findMany({ where: base, orderBy, skip: (pagina - 1) * f.tamano, take: f.tamano });
      } else if (f.vista === "ingresos") {
        const where = { ...base, ...(f.texto && { OR: [...base.OR!, { note: { contains: f.texto, mode: "insensitive" as const } }, { productName: { contains: f.texto, mode: "insensitive" as const } }] }) };
        total = await tx.productInitialStock.count({ where });
        pagina = Math.min(f.pagina, Math.max(1, Math.ceil(total / f.tamano)));
        filas = await tx.productInitialStock.findMany({ where, orderBy, skip: (pagina - 1) * f.tamano, take: f.tamano });
      } else if (f.vista === "ajustes") {
        const where = { ...base, ...(f.texto && { OR: [...base.OR!, { note: { contains: f.texto, mode: "insensitive" as const } }, { productName: { contains: f.texto, mode: "insensitive" as const } }] }) };
        total = await tx.productInventoryAdjustment.count({ where });
        pagina = Math.min(f.pagina, Math.max(1, Math.ceil(total / f.tamano)));
        filas = await tx.productInventoryAdjustment.findMany({ where, orderBy, skip: (pagina - 1) * f.tamano, take: f.tamano });
      } else {
        const where = { ...base, ...(f.texto && { OR: [...base.OR!, { note: { contains: f.texto, mode: "insensitive" as const } }, { initialStock: { productName: { contains: f.texto, mode: "insensitive" as const } } }, { adjustment: { productName: { contains: f.texto, mode: "insensitive" as const } } }] }) };
        total = await tx.productStockMovement.count({ where });
        pagina = Math.min(f.pagina, Math.max(1, Math.ceil(total / f.tamano)));
        filas = await tx.productStockMovement.findMany({ where, orderBy, skip: (pagina - 1) * f.tamano, take: f.tamano });
      }
      // Relaciones en lotes escalares con await secuencial: total y página coherentes sin queries simultáneas en pg.
      const productos = await tx.product.findMany({ where: { id: { in: filas.map(p => p.productId) } } });
      const unidades = await tx.unitMeasure.findMany({ where: { id: { in: productos.map(p => p.unitMeasureId) } } });
      const bodegas = await tx.warehouse.findMany({ where: { id: { in: filas.map(p => p.warehouseId) } } });
      const documentos = await tx.productInitialStock.findMany({ where: { id: { in: filas.flatMap(p => p.initialStockId ? [p.initialStockId] : []) } } });
      const ajustes = await tx.productInventoryAdjustment.findMany({ where: { id: { in: filas.flatMap(p => p.adjustmentId ? [p.adjustmentId] : []) } } });
      const datos: FilaTerminado[] = filas.map(p => {
        const producto = productos.find(r => r.id === p.productId)!;
        const historico = documentos.find(r => r.id === p.initialStockId) ?? ajustes.find(r => r.id === p.adjustmentId);
        const ajuste = f.vista === "ajustes" ? p : ajustes.find(r => r.id === p.adjustmentId);
        return { id: p.id, productId: p.productId, warehouseId: p.warehouseId, producto: p.productName ?? historico?.productName ?? producto.name, codigo: p.productCode ?? historico?.productCode ?? producto.code, bodega: bodegas.find(b => b.id === p.warehouseId)!.name, unidad: p.unitAbbreviation ?? historico?.unitAbbreviation ?? unidades.find(u => u.id === producto.unitMeasureId)!.abbreviation, cantidad: p.quantity.toString(), fecha: p.date?.toISOString().slice(0, 10) ?? null, observacion: p.note ?? null, documentoId: ["ingresos", "ajustes"].includes(f.vista) ? p.id : p.initialStockId ?? p.adjustmentId ?? null, registro: p.createdAt.toISOString(),
          documentoTipo: f.vista === "ingresos" || p.initialStockId ? "inicial" : f.vista === "ajustes" || p.adjustmentId ? "ajuste" : null,
          anterior: ajuste?.previousQuantity?.toString() ?? null, final: ajuste?.finalQuantity?.toString() ?? null,
          motivo: ajuste?.reason ?? null, origen: ajuste?.correctedInitialStockId ? { tipo: "inicial", id: ajuste.correctedInitialStockId } : ajuste?.correctedAdjustmentId ? { tipo: "ajuste", id: ajuste.correctedAdjustmentId } : null };
      });
      return { ok: true, pagina: { datos, total, pagina, tamano: f.tamano } };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) { console.error("Error al consultar productos terminados:", error); return { ok: false, mensaje: "No se pudo consultar el inventario de producto terminado." }; }
}
