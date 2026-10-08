import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { filtrosAjustesSchema } from "@/lib/validaciones/ajuste";
export type FilaAjuste = {
  id: number;
  fecha: string;
  registrado: string;
  motivo: string;
  observacion: string;
  anterior: string;
  final: string;
  diferencia: string;
  corregidoId: number | null;
  movimientoId: number | null;
  materialId: number;
  bodegaId: number;
  material: string;
  bodega: string;
  unidad: string;
  unitMeasureId: number;
};
export async function consultarAjustes(entrada: unknown) {
  const v = filtrosAjustesSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje: "Revisa texto, fechas, selecciones y paginación de los filtros.",
    };
  const f = v.data;
  const where: Prisma.InventoryAdjustmentWhereInput = {
    warehouseId: f.warehouseId,
    rawMaterialId: f.rawMaterialId,
    reason: f.reason,
    date: {
      gte: f.desde ? new Date(`${f.desde}T00:00:00Z`) : undefined,
      lte: f.hasta ? new Date(`${f.hasta}T00:00:00Z`) : undefined,
    },
    ...(f.texto
      ? {
          OR: [
            { note: { contains: f.texto, mode: "insensitive" } },
            {
              rawMaterial: {
                OR: [
                  { name: { contains: f.texto, mode: "insensitive" } },
                  { code: { contains: f.texto, mode: "insensitive" } },
                ],
              },
            },
            { warehouse: { name: { contains: f.texto, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  try {
    return await prisma.$transaction(
      async (tx) => {
        const total = await tx.inventoryAdjustment.count({ where });
        const pagina = Math.min(
          f.pagina,
          Math.max(1, Math.ceil(total / f.tamano)),
        );
        const filas = await tx.inventoryAdjustment.findMany({
          where,
          orderBy: [{ [f.orden]: f.sentido }, { id: f.sentido }],
          skip: (pagina - 1) * f.tamano,
          take: f.tamano,
        });
        // Lotes escalares secuenciales: evitar relaciones hermanas concurrentes dentro de pg.
        const materiales = await tx.rawMaterial.findMany({
          where: { id: { in: filas.map((a) => a.rawMaterialId) } },
        });
        const unidades = await tx.unitMeasure.findMany({
          where: { id: { in: materiales.map((m) => m.unitMeasureId) } },
        });
        const bodegas = await tx.warehouse.findMany({
          where: { id: { in: filas.map((a) => a.warehouseId) } },
        });
        const movimientos = await tx.stockMovement.findMany({
          where: { inventoryAdjustmentId: { in: filas.map((a) => a.id) } },
          select: { id: true, inventoryAdjustmentId: true },
        });
        const datos: FilaAjuste[] = filas.map((a) => {
          const m = materiales.find((m) => m.id === a.rawMaterialId)!;
          return {
            id: a.id,
            fecha: a.date.toISOString().slice(0, 10),
            registrado: a.createdAt.toISOString(),
            motivo: a.reason,
            observacion: a.note,
            anterior: a.previousQuantity.toString(),
            final: a.finalQuantity.toString(),
            diferencia: a.difference.toString(),
            corregidoId: a.correctedAdjustmentId,
            movimientoId:
              movimientos.find((x) => x.inventoryAdjustmentId === a.id)?.id ??
              null,
            materialId: m.id,
            bodegaId: a.warehouseId,
            material: `${m.code} · ${m.name}`,
            bodega: bodegas.find((b) => b.id === a.warehouseId)!.name,
            unidad: unidades.find((u) => u.id === m.unitMeasureId)!
              .abbreviation,
            unitMeasureId: m.unitMeasureId,
          };
        });
        return {
          ok: true as const,
          pagina: { datos, total, pagina, tamano: f.tamano },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  } catch (e) {
    console.error("Error consultando ajustes:", e);
    return {
      ok: false as const,
      mensaje: "No se pudieron consultar los ajustes. Reintenta actualizar.",
    };
  }
}
