import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { filtrosTrasladosSchema } from "@/lib/validaciones/traslado";
export type FilaTraslado = {
  id: number;
  fecha: string;
  registrado: string;
  observacion: string;
  cantidad: string;
  materialId: number;
  unitMeasureId: number;
  material: string;
  unidad: string;
  origenId: number;
  destinoId: number;
  origen: string;
  destino: string;
  anteriorOrigen: string;
  finalOrigen: string;
  anteriorDestino: string;
  finalDestino: string;
  corregidoId: number | null;
  correccionId: number | null;
  salidaId: number | null;
  entradaId: number | null;
};
export async function consultarTraslados(entrada: unknown) {
  const v = filtrosTrasladosSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje:
        "Revisa texto, fechas, bodegas, material y paginación de los filtros.",
    };
  const f = v.data;
  const where: Prisma.InventoryTransferWhereInput = {
    rawMaterialId: f.rawMaterialId,
    sourceWarehouseId: f.sourceWarehouseId,
    destinationWarehouseId: f.destinationWarehouseId,
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
                  { code: { contains: f.texto, mode: "insensitive" } },
                  { name: { contains: f.texto, mode: "insensitive" } },
                ],
              },
            },
            {
              sourceWarehouse: {
                name: { contains: f.texto, mode: "insensitive" },
              },
            },
            {
              destinationWarehouse: {
                name: { contains: f.texto, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  try {
    return await prisma.$transaction(
      async (tx) => {
        const total = await tx.inventoryTransfer.count({ where }),
          pagina = Math.min(f.pagina, Math.max(1, Math.ceil(total / f.tamano)));
        const filas = await tx.inventoryTransfer.findMany({
          where,
          orderBy: [{ [f.orden]: f.sentido }, { id: f.sentido }],
          skip: (pagina - 1) * f.tamano,
          take: f.tamano,
        });
        // Lotes secuenciales evitan consultas internas paralelas en una misma transacción pg.
        const materiales = await tx.rawMaterial.findMany({
          where: { id: { in: filas.map((t) => t.rawMaterialId) } },
        });
        const unidades = await tx.unitMeasure.findMany({
          where: { id: { in: materiales.map((m) => m.unitMeasureId) } },
        });
        const bodegas = await tx.warehouse.findMany({
          where: {
            id: {
              in: filas.flatMap((t) => [
                t.sourceWarehouseId,
                t.destinationWarehouseId,
              ]),
            },
          },
        });
        const movimientos = await tx.stockMovement.findMany({
          where: {
            OR: [
              { outgoingTransferId: { in: filas.map((t) => t.id) } },
              { incomingTransferId: { in: filas.map((t) => t.id) } },
            ],
          },
          select: {
            id: true,
            outgoingTransferId: true,
            incomingTransferId: true,
          },
        });
        const correcciones = await tx.inventoryTransfer.findMany({
          where: { correctedTransferId: { in: filas.map((t) => t.id) } },
          select: { id: true, correctedTransferId: true },
        });
        const datos: FilaTraslado[] = filas.map((t) => {
          const m = materiales.find((m) => m.id === t.rawMaterialId)!;
          return {
            id: t.id,
            fecha: t.date.toISOString().slice(0, 10),
            registrado: t.createdAt.toISOString(),
            observacion: t.note,
            cantidad: t.quantity.toString(),
            materialId: m.id,
            unitMeasureId: m.unitMeasureId,
            material: `${m.code} · ${m.name}`,
            unidad: unidades.find((u) => u.id === m.unitMeasureId)!
              .abbreviation,
            origenId: t.sourceWarehouseId,
            destinoId: t.destinationWarehouseId,
            origen: bodegas.find((b) => b.id === t.sourceWarehouseId)!.name,
            destino: bodegas.find((b) => b.id === t.destinationWarehouseId)!
              .name,
            anteriorOrigen: t.sourcePreviousQuantity.toString(),
            finalOrigen: t.sourceFinalQuantity.toString(),
            anteriorDestino: t.destinationPreviousQuantity.toString(),
            finalDestino: t.destinationFinalQuantity.toString(),
            corregidoId: t.correctedTransferId,
            correccionId:
              correcciones.find((c) => c.correctedTransferId === t.id)?.id ??
              null,
            salidaId:
              movimientos.find((m) => m.outgoingTransferId === t.id)?.id ??
              null,
            entradaId:
              movimientos.find((m) => m.incomingTransferId === t.id)?.id ??
              null,
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
    console.error("Error consultando traslados:", e);
    return {
      ok: false as const,
      mensaje: "No se pudieron consultar los traslados. Reintenta actualizar.",
    };
  }
}
