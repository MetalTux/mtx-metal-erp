import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  filtrosStockSchema,
  filtrosMovimientosSchema,
} from "@/lib/validaciones/inventario";
import { inicioDiaChile, finExclusivoDiaChile } from "@/lib/fechas-chile";
import type {
  CatalogosInventario,
  MovimientoInventario,
  ResultadoConsulta,
  StockInventario,
  EstadoStock,
} from "@/lib/tipos/inventario";

const material = {
  id: true,
  code: true,
  name: true,
  unitMeasureId: true,
  unitMeasure: { select: { name: true, abbreviation: true } },
} satisfies Prisma.RawMaterialSelect;
const bodega = {
  id: true,
  name: true,
  location: true,
} satisfies Prisma.WarehouseSelect;
const seleccionStock = {
  id: true,
  quantity: true,
  minStock: true,
  createdAt: true,
  updatedAt: true,
  warehouseId: true,
  rawMaterialId: true,
} satisfies Prisma.WarehouseStockSelect;
const seleccionMovimiento = {
  id: true,
  date: true,
  type: true,
  quantity: true,
  note: true,
  createdAt: true,
  warehouseId: true,
  rawMaterialId: true,
  outgoingTransferId: true,
  incomingTransferId: true,
  inventoryAdjustmentId: true,
  purchaseDetailId: true,
  workOrderDetailId: true,
} satisfies Prisma.StockMovementSelect;
const convertirMaterial = (
  dato: Prisma.RawMaterialGetPayload<{ select: typeof material }>,
) => {
  const { unitMeasure, ...campos } = dato;
  return { ...campos, unidad: unitMeasure };
};
const paginaValida = (solicitada: number, total: number, tamano: number) =>
  Math.min(solicitada, Math.max(1, Math.ceil(total / tamano)));
const filtrosInvalidos = {
  ok: false as const,
  mensaje:
    "Revisa los filtros: IDs positivos, texto hasta 150 caracteres, fechas válidas y Desde anterior o igual a Hasta. También deben ser válidos el orden, la página y su tamaño.",
};

// Prisma puede consultar relaciones hermanas en paralelo dentro de un único PgTransaction.
// Leer lotes escalares con await conserva el snapshot y evita encolar consultas en esa conexión.
async function cargarIdentificaciones(
  tx: Prisma.TransactionClient,
  filas: { warehouseId: number; rawMaterialId: number }[],
) {
  const bodegas = await tx.warehouse.findMany({
    where: { id: { in: [...new Set(filas.map((fila) => fila.warehouseId))] } },
    select: bodega,
  });
  const materiales = await tx.rawMaterial.findMany({
    where: {
      id: { in: [...new Set(filas.map((fila) => fila.rawMaterialId))] },
    },
    select: { id: true, code: true, name: true, unitMeasureId: true },
  });
  const unidades = await tx.unitMeasure.findMany({
    where: {
      id: { in: [...new Set(materiales.map((item) => item.unitMeasureId))] },
    },
    select: { id: true, name: true, abbreviation: true },
  });
  const mapaBodegas = new Map(bodegas.map((item) => [item.id, item]));
  const mapaUnidades = new Map(
    unidades.map((item) => [
      item.id,
      { name: item.name, abbreviation: item.abbreviation },
    ]),
  );
  const mapaMateriales = new Map(
    materiales.map((item) => {
      const unidad = mapaUnidades.get(item.unitMeasureId);
      if (!unidad)
        throw new Error(
          "No se encontró la unidad del material en la consulta de inventario.",
        );
      return [
        item.id,
        { id: item.id, code: item.code, name: item.name, unidad },
      ] as const;
    }),
  );
  return (fila: { warehouseId: number; rawMaterialId: number }) => {
    const bodega = mapaBodegas.get(fila.warehouseId);
    const material = mapaMateriales.get(fila.rawMaterialId);
    if (!bodega || !material)
      throw new Error("No se encontraron las referencias de inventario.");
    return { bodega, material };
  };
}

export async function listarCatalogosInventario(): Promise<CatalogosInventario> {
  const [bodegas, materiales] = await Promise.all([
    prisma.warehouse.findMany({
      select: bodega,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.rawMaterial.findMany({
      select: material,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  ]);
  return { bodegas, materiales: materiales.map(convertirMaterial) };
}
export async function consultarStock(
  entrada: unknown = {},
): Promise<ResultadoConsulta<StockInventario>> {
  const validacion = filtrosStockSchema.safeParse(entrada);
  if (!validacion.success) return filtrosInvalidos;
  const filtros = validacion.data;
  const where: Prisma.WarehouseStockWhereInput = {
    warehouseId: filtros.bodega,
    rawMaterialId: filtros.material,
    // Comparación entre columnas en PostgreSQL: el filtro afecta total y todas las páginas.
    ...(filtros.reposicion === "reposicion" && {
      minStock: { not: null },
      quantity: { lt: prisma.warehouseStock.fields.minStock },
    }),
    ...(filtros.q && {
      OR: [
        { rawMaterial: { code: { contains: filtros.q, mode: "insensitive" } } },
        { rawMaterial: { name: { contains: filtros.q, mode: "insensitive" } } },
      ],
    }),
  };
  const orden: Prisma.WarehouseStockOrderByWithRelationInput =
    filtros.orden === "material"
      ? { rawMaterial: { name: filtros.sentido } }
      : filtros.orden === "bodega"
        ? { warehouse: { name: filtros.sentido } }
        : filtros.orden === "cantidad"
          ? { quantity: filtros.sentido }
          : { minStock: { sort: filtros.sentido, nulls: "last" } };
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.warehouseStock.count({ where });
      const pagina = paginaValida(filtros.pagina, total, filtros.tamano);
      const filas = await tx.warehouseStock.findMany({
        where,
        orderBy: [orden, { id: "asc" }],
        select: seleccionStock,
        take: filtros.tamano,
        skip: (pagina - 1) * filtros.tamano,
      });
      const identificar = await cargarIdentificaciones(tx, filas);
      return {
        ok: true as const,
        pagina: {
          total,
          pagina,
          tamano: filtros.tamano,
          datos: filas.map((fila) => ({
            id: fila.id,
            cantidad: fila.quantity.toString(),
            minimo: fila.minStock?.toString() ?? null,
            ...situacionStock(fila.quantity, fila.minStock),
            ...identificar(fila),
            createdAt: fila.createdAt.toISOString(),
            updatedAt: fila.updatedAt.toISOString(),
          })),
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function consultarMovimientos(
  entrada: unknown = {},
): Promise<ResultadoConsulta<MovimientoInventario>> {
  const validacion = filtrosMovimientosSchema.safeParse(entrada);
  if (!validacion.success) return filtrosInvalidos;
  const filtros = validacion.data;
  const where: Prisma.StockMovementWhereInput = {
    warehouseId: filtros.bodega,
    rawMaterialId: filtros.material,
    type: filtros.tipo,
    ...((filtros.desde || filtros.hasta) && {
      date: {
        ...(filtros.desde && { gte: inicioDiaChile(filtros.desde) }),
        ...(filtros.hasta && { lt: finExclusivoDiaChile(filtros.hasta) }),
      },
    }),
    ...(filtros.q && {
      OR: [
        { rawMaterial: { code: { contains: filtros.q, mode: "insensitive" } } },
        { rawMaterial: { name: { contains: filtros.q, mode: "insensitive" } } },
        { note: { contains: filtros.q, mode: "insensitive" } },
      ],
    }),
  };
  const orden: Prisma.StockMovementOrderByWithRelationInput =
    filtros.orden === "fecha"
      ? { date: filtros.sentido }
      : filtros.orden === "material"
        ? { rawMaterial: { name: filtros.sentido } }
        : filtros.orden === "bodega"
          ? { warehouse: { name: filtros.sentido } }
          : filtros.orden === "cantidad"
            ? { quantity: filtros.sentido }
            : { type: filtros.sentido };
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.stockMovement.count({ where });
      const pagina = paginaValida(filtros.pagina, total, filtros.tamano);
      const filas = await tx.stockMovement.findMany({
        where,
        orderBy: [orden, { id: "desc" }],
        select: seleccionMovimiento,
        take: filtros.tamano,
        skip: (pagina - 1) * filtros.tamano,
      });
      const identificar = await cargarIdentificaciones(tx, filas);
      const compras = await tx.purchaseDetail.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                filas.flatMap((fila) =>
                  fila.purchaseDetailId === null ? [] : [fila.purchaseDetailId],
                ),
              ),
            ],
          },
        },
        select: { id: true, purchaseId: true },
      });
      const trabajos = await tx.workOrderDetail.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                filas.flatMap((fila) =>
                  fila.workOrderDetailId === null
                    ? []
                    : [fila.workOrderDetailId],
                ),
              ),
            ],
          },
        },
        select: { id: true, workOrderId: true },
      });
      const ajustes = await tx.inventoryAdjustment.findMany({
        where: {
          id: {
            in: filas.flatMap((f) =>
              f.inventoryAdjustmentId === null ? [] : [f.inventoryAdjustmentId],
            ),
          },
        },
        select: { id: true, reason: true },
      });
      const mapaAjustes = new Map(ajustes.map((a) => [a.id, a.reason]));
      const mapaCompras = new Map(
        compras.map((item) => [
          item.id,
          { id: item.purchaseId, detalleId: item.id },
        ]),
      );
      const mapaTrabajos = new Map(
        trabajos.map((item) => [
          item.id,
          { id: item.workOrderId, detalleId: item.id },
        ]),
      );
      return {
        ok: true as const,
        pagina: {
          total,
          pagina,
          tamano: filtros.tamano,
          datos: filas.map((fila) => ({
            id: fila.id,
            cantidad: fila.quantity.toString(),
            fecha: fila.date.toISOString(),
            tipo: fila.type,
            nota: fila.note,
            trasladoId: fila.outgoingTransferId ?? fila.incomingTransferId,
            ajusteId: fila.inventoryAdjustmentId,
            ajusteMotivo:
              fila.inventoryAdjustmentId === null
                ? null
                : (mapaAjustes.get(fila.inventoryAdjustmentId) ?? null),
            ...identificar(fila),
            createdAt: fila.createdAt.toISOString(),
            compra:
              fila.purchaseDetailId === null
                ? null
                : (mapaCompras.get(fila.purchaseDetailId) ?? null),
            trabajo:
              fila.workOrderDetailId === null
                ? null
                : (mapaTrabajos.get(fila.workOrderDetailId) ?? null),
          })),
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

/** Estados derivados: sin mínimo y cero son diferentes; un negativo se muestra como incidencia. */
export function situacionStock(
  cantidad: Prisma.Decimal,
  minimo: Prisma.Decimal | null,
): { estado: EstadoStock; requiereReposicion: boolean } {
  const requiereReposicion = minimo !== null && cantidad.lt(minimo);
  const estado: EstadoStock = cantidad.lt(0)
    ? "Saldo negativo: revisar"
    : cantidad.eq(0)
      ? "Sin stock"
      : minimo === null
        ? "Sin mínimo configurado"
        : requiereReposicion
          ? "Stock bajo"
          : "Sobre el mínimo";
  return { estado, requiereReposicion };
}
