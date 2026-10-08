import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  combinacionTrasladoSchema,
  trasladoSchema,
} from "@/lib/validaciones/traslado";
import { inicioDiaChile } from "@/lib/fechas-chile";
import type { ReferenciaAjuste } from "@/lib/servicios/ajustes-inventario";
class ReglaTraslado extends Error {}
function exigir(v: unknown, mensaje: string): asserts v {
  if (!v) throw new ReglaTraslado(mensaje);
}
function fallo(e: unknown) {
  if (e instanceof ReglaTraslado)
    return { ok: false as const, mensaje: e.message };
  console.error("Error en traslado de inventario:", e);
  return {
    ok: false as const,
    mensaje:
      "No se pudo confirmar el traslado. Reintenta con los mismos datos y la misma operación.",
    incierto: true as const,
  };
}
/** Mismo contrato de versión que ajustes, con lecturas escalares secuenciales. */
async function leerSaldo(
  tx: Prisma.TransactionClient,
  rawMaterialId: number,
  warehouseId: number,
) {
  const s = await tx.warehouseStock.findUnique({
    where: { warehouseId_rawMaterialId: { rawMaterialId, warehouseId } },
  });
  const ultimo = await tx.stockMovement.findFirst({
    where: { rawMaterialId, warehouseId },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const referencia: ReferenciaAjuste = {
    stockId: s?.id ?? null,
    updatedAt: s?.updatedAt.toISOString() ?? null,
    quantity: s?.quantity.toString() ?? "0",
    lastMovementId: ultimo?.id ?? null,
  };
  return { stock: s, referencia };
}
export async function consultarSaldosTraslado(entrada: unknown) {
  const v = combinacionTrasladoSchema.safeParse(entrada);
  if (!v.success || v.data.sourceWarehouseId === v.data.destinationWarehouseId)
    return {
      ok: false as const,
      mensaje: "Selecciona un material y dos bodegas distintas.",
    };
  const d = v.data;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const m = await tx.rawMaterial.findUnique({
          where: { id: d.rawMaterialId },
        });
        exigir(
          m?.unitMeasureId === d.unitMeasureId,
          "El material o su unidad cambió. Actualiza el catálogo.",
        );
        const bodegas = await tx.warehouse.count({
          where: {
            id: { in: [d.sourceWarehouseId, d.destinationWarehouseId] },
          },
        });
        exigir(bodegas === 2, "Una bodega ya no existe.");
        const origen = await leerSaldo(
          tx,
          d.rawMaterialId,
          d.sourceWarehouseId,
        );
        const destino = await leerSaldo(
          tx,
          d.rawMaterialId,
          d.destinationWarehouseId,
        );
        return {
          ok: true as const,
          origen: origen.referencia,
          destino: destino.referencia,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  } catch (e) {
    return fallo(e);
  }
}
/** Traslado inmediato: nunca queda una salida sin entrada. Las correcciones son otro documento inverso completo. */
export async function registrarTrasladoInventario(entrada: unknown) {
  const v = trasladoSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje:
        "Revisa material, bodegas, fecha, cantidad, observación y referencias.",
    };
  const d = v.data,
    q = new Prisma.Decimal(d.quantity);
  if (!q.gt(0))
    return {
      ok: false as const,
      mensaje: "La cantidad debe ser positiva, con hasta tres decimales.",
    };
  const normalizar = (r: ReferenciaAjuste) => ({
    ...r,
    quantity: new Prisma.Decimal(r.quantity).toString(),
  });
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        ...d,
        quantity: q.toString(),
        sourceReference: normalizar(d.sourceReference),
        destinationReference: normalizar(d.destinationReference),
      }),
    )
    .digest("hex");
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Mismo bloqueo de UUID que ajustes: una clave no puede producir efectos en ambos módulos.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey},0))::text`;
        const previa = await tx.inventoryOperation.findUnique({
          where: { idempotencyKey: d.idempotencyKey },
        });
        if (previa) {
          exigir(
            previa.requestHash === hash && previa.transferId !== null,
            "Esta clave ya se usó con otros datos.",
          );
          return {
            ok: true as const,
            mensaje: "Traslado ya registrado; no se duplicaron movimientos.",
            trasladoId: previa.transferId,
          };
        }
        exigir(
          inicioDiaChile(d.date) <= new Date(),
          "La fecha no puede ser futura.",
        );
        await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${d.rawMaterialId} FOR UPDATE`;
        const m = await tx.rawMaterial.findUnique({
          where: { id: d.rawMaterialId },
        });
        exigir(
          m?.unitMeasureId === d.unitMeasureId,
          "El material o su unidad cambió. Actualiza el catálogo.",
        );
        exigir(
          (await tx.warehouse.count({
            where: {
              id: { in: [d.sourceWarehouseId, d.destinationWarehouseId] },
            },
          })) === 2,
          "Una bodega ya no existe.",
        );
        // Material → stock por ID ascendente, también para traslados opuestos y destino todavía inexistente.
        const filas = await tx.warehouseStock.findMany({
          where: {
            rawMaterialId: d.rawMaterialId,
            warehouseId: {
              in: [d.sourceWarehouseId, d.destinationWarehouseId],
            },
          },
          orderBy: { id: "asc" },
          select: { id: true },
        });
        for (const f of filas)
          await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${f.id} FOR UPDATE`;
        const origen = await leerSaldo(
          tx,
          d.rawMaterialId,
          d.sourceWarehouseId,
        );
        const destino = await leerSaldo(
          tx,
          d.rawMaterialId,
          d.destinationWarehouseId,
        );
        const coincide = (actual: ReferenciaAjuste, ref: ReferenciaAjuste) =>
          actual.stockId === ref.stockId &&
          actual.updatedAt === ref.updatedAt &&
          new Prisma.Decimal(actual.quantity).eq(ref.quantity) &&
          actual.lastMovementId === ref.lastMovementId;
        exigir(
          coincide(origen.referencia, d.sourceReference) &&
            coincide(destino.referencia, d.destinationReference),
          "El stock cambió desde la revisión. Vuelve a consultar ambas bodegas y confirma sus nuevos saldos.",
        );
        const anteriorOrigen = new Prisma.Decimal(origen.referencia.quantity),
          anteriorDestino = new Prisma.Decimal(destino.referencia.quantity);
        exigir(
          anteriorOrigen.gte(0) && anteriorDestino.gte(0),
          "Existe un saldo negativo previo. Revisa la incidencia mediante un conteo físico antes de trasladar.",
        );
        for (const [warehouseId, saldo] of [
          [d.sourceWarehouseId, anteriorOrigen],
          [d.destinationWarehouseId, anteriorDestino],
        ] as const) {
          const suma = await tx.stockMovement.aggregate({
            where: { rawMaterialId: d.rawMaterialId, warehouseId },
            _sum: { quantity: true },
          });
          exigir(
            saldo.eq(suma._sum.quantity ?? "0"),
            "El saldo no coincide con el Kardex. Revisa la incidencia antes de trasladar.",
          );
        }
        const finalOrigen = anteriorOrigen.minus(q),
          finalDestino = anteriorDestino.plus(q);
        exigir(
          finalOrigen.gte(0),
          "La bodega de origen no tiene saldo suficiente para el traslado.",
        );
        exigir(
          finalDestino.lte("99999999999.999"),
          "El saldo de destino supera el límite permitido.",
        );
        if (d.correctedTransferId !== null) {
          const corregido = await tx.inventoryTransfer.findUnique({
            where: { id: d.correctedTransferId },
          });
          exigir(
            corregido &&
              corregido.rawMaterialId === d.rawMaterialId &&
              corregido.sourceWarehouseId === d.destinationWarehouseId &&
              corregido.destinationWarehouseId === d.sourceWarehouseId &&
              corregido.quantity.eq(q),
            "La corrección debe devolver toda la cantidad entre las mismas bodegas y para el mismo material.",
          );
          exigir(
            !(await tx.inventoryTransfer.findUnique({
              where: { correctedTransferId: d.correctedTransferId },
            })),
            "Este traslado ya tiene una corrección. Revisa el documento inverso registrado.",
          );
        }
        const documento = await tx.inventoryTransfer.create({
          data: {
            rawMaterialId: d.rawMaterialId,
            sourceWarehouseId: d.sourceWarehouseId,
            destinationWarehouseId: d.destinationWarehouseId,
            date: new Date(`${d.date}T00:00:00Z`),
            note: d.note,
            quantity: q,
            sourcePreviousQuantity: anteriorOrigen,
            sourceFinalQuantity: finalOrigen,
            destinationPreviousQuantity: anteriorDestino,
            destinationFinalQuantity: finalDestino,
            correctedTransferId: d.correctedTransferId,
          },
        });
        // Guardar sólo quantity conserva los mínimos independientes; destino nuevo se crea después de validar todo.
        exigir(origen.stock, "No existe stock en la bodega de origen.");
        await tx.warehouseStock.update({
          where: { id: origen.stock.id },
          data: { quantity: finalOrigen },
        });
        if (destino.stock)
          await tx.warehouseStock.update({
            where: { id: destino.stock.id },
            data: { quantity: finalDestino },
          });
        else
          await tx.warehouseStock.create({
            data: {
              rawMaterialId: d.rawMaterialId,
              warehouseId: d.destinationWarehouseId,
              quantity: finalDestino,
            },
          });
        const comun = {
          rawMaterialId: d.rawMaterialId,
          date: inicioDiaChile(d.date),
          note: d.note,
        };
        await tx.stockMovement.create({
          data: {
            ...comun,
            warehouseId: d.sourceWarehouseId,
            type: "SALIDA",
            quantity: q.negated(),
            outgoingTransferId: documento.id,
          },
        });
        await tx.stockMovement.create({
          data: {
            ...comun,
            warehouseId: d.destinationWarehouseId,
            type: "ENTRADA",
            quantity: q,
            incomingTransferId: documento.id,
          },
        });
        await tx.inventoryOperation.create({
          data: {
            idempotencyKey: d.idempotencyKey,
            requestHash: hash,
            transferId: documento.id,
            type:
              d.correctedTransferId === null
                ? "TRASLADAR"
                : "REVERTIR_TRASLADO",
          },
        });
        return {
          ok: true as const,
          mensaje: "Traslado registrado en ambas bodegas.",
          trasladoId: documento.id,
        };
      },
      { maxWait: 10000, timeout: 20000 },
    );
  } catch (e) {
    return fallo(e);
  }
}
