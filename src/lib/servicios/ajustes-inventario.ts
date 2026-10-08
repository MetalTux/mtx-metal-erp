import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ajusteSchema,
  combinacionAjusteSchema,
} from "@/lib/validaciones/ajuste";
import { inicioDiaChile } from "@/lib/fechas-chile";
class ReglaAjuste extends Error {}
function exigir(v: unknown, mensaje: string): asserts v {
  if (!v) throw new ReglaAjuste(mensaje);
}
function fallo(e: unknown) {
  if (e instanceof ReglaAjuste)
    return { ok: false as const, mensaje: e.message };
  console.error("Error de ajuste de inventario:", e);
  return {
    ok: false as const,
    mensaje:
      "No se pudo registrar el ajuste. Conserva los datos y reintenta con la misma operación.",
  };
}
export type ReferenciaAjuste = {
  stockId: number | null;
  updatedAt: string | null;
  quantity: string;
  lastMovementId: number | null;
};
/** Lectura consistente y sin crear stock. El último ID detecta cambios aunque el saldo vuelva al mismo valor. */
export async function consultarSaldoAjuste(entrada: unknown) {
  const v = combinacionAjusteSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje: "Selecciona material y bodega válidos.",
    };
  try {
    return await prisma.$transaction(
      async (tx) => {
        const m = await tx.rawMaterial.findUnique({
          where: { id: v.data.rawMaterialId },
        });
        exigir(
          m?.unitMeasureId === v.data.unitMeasureId,
          "El material o su unidad cambió. Actualiza el listado.",
        );
        exigir(
          await tx.warehouse.findUnique({ where: { id: v.data.warehouseId } }),
          "La bodega ya no existe.",
        );
        const s = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_rawMaterialId: {
              rawMaterialId: v.data.rawMaterialId,
              warehouseId: v.data.warehouseId,
            },
          },
        });
        const ultimo = await tx.stockMovement.findFirst({
          where: {
            rawMaterialId: v.data.rawMaterialId,
            warehouseId: v.data.warehouseId,
          },
          orderBy: { id: "desc" },
          select: { id: true },
        });
        const referencia: ReferenciaAjuste = {
          stockId: s?.id ?? null,
          updatedAt: s?.updatedAt.toISOString() ?? null,
          quantity: s?.quantity.toString() ?? "0",
          lastMovementId: ultimo?.id ?? null,
        };
        return {
          ok: true as const,
          referencia,
          puedeInicial: !ultimo && referencia.quantity === "0",
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  } catch (e) {
    return fallo(e);
  }
}
/** Cuenta física, no reversión ciega. Todo efecto y UUID se confirman o revierten juntos. */
export async function registrarAjusteInventario(entrada: unknown) {
  const v = ajusteSchema.safeParse(entrada);
  if (!v.success)
    return {
      ok: false as const,
      mensaje:
        "Revisa cantidad, fecha, motivo, observación y referencias del ajuste.",
    };
  const d = v.data;
  const final = new Prisma.Decimal(d.finalQuantity);
  // Canonizar cantidades evita que 1,000 y 1 representen solicitudes distintas al reintentar.
  const contenido = {
    ...d,
    finalQuantity: final.toString(),
    reference: {
      ...d.reference,
      quantity: new Prisma.Decimal(d.reference.quantity).toString(),
    },
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(contenido))
    .digest("hex");
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Serializa el mismo UUID incluso si dos solicitudes intentan combinaciones distintas.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey}, 0))::text`;
        const previa = await tx.inventoryOperation.findUnique({
          where: { idempotencyKey: d.idempotencyKey },
        });
        if (previa) {
          exigir(
            previa.requestHash === hash && previa.adjustmentId !== null,
            "Esta clave ya se usó con otros datos. Revisa la operación.",
          );
          return {
            ok: true as const,
            mensaje: "Ajuste ya registrado; no se duplicaron movimientos.",
            ajusteId: previa.adjustmentId,
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
          "El material o su unidad cambió. Actualiza antes de registrar.",
        );
        exigir(
          await tx.warehouse.findUnique({ where: { id: d.warehouseId } }),
          "La bodega ya no existe.",
        );
        const combinacion = {
          warehouseId: d.warehouseId,
          rawMaterialId: d.rawMaterialId,
        };
        const fila = await tx.warehouseStock.findUnique({
          where: { warehouseId_rawMaterialId: combinacion },
          select: { id: true },
        });
        if (fila)
          await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${fila.id} FOR UPDATE`;
        const stock = await tx.warehouseStock.findUnique({
          where: { warehouseId_rawMaterialId: combinacion },
        });
        const ultimo = await tx.stockMovement.findFirst({
          where: combinacion,
          orderBy: { id: "desc" },
          select: { id: true },
        });
        const anterior = stock?.quantity ?? new Prisma.Decimal(0);
        exigir(
          (stock?.id ?? null) === d.reference.stockId &&
            (stock?.updatedAt.toISOString() ?? null) ===
              d.reference.updatedAt &&
            anterior.eq(d.reference.quantity) &&
            (ultimo?.id ?? null) === d.reference.lastMovementId,
          "El stock cambió desde la revisión. Vuelve a consultar y confirma el nuevo saldo.",
        );
        const suma = await tx.stockMovement.aggregate({
          where: combinacion,
          _sum: { quantity: true },
        });
        exigir(
          anterior.eq(suma._sum.quantity ?? "0"),
          "El saldo no coincide con el Kardex. Revisa la incidencia antes de ajustar.",
        );
        const diferencia = final.minus(anterior);
        exigir(
          diferencia.abs().lte("99999999999.999"),
          "La diferencia supera el límite permitido.",
        );
        const inicial = d.reason === "INVENTARIO_INICIAL";
        const correccion = d.reason === "CORRECCION_REGISTRO";
        exigir(
          correccion === (d.correctedAdjustmentId !== null),
          "Una corrección debe vincular un ajuste previo; otros motivos no admiten ese vínculo.",
        );
        if (inicial)
          exigir(
            !ultimo && anterior.isZero(),
            "La carga inicial sólo se permite sin movimientos previos y con saldo cero.",
          );
        if (correccion) {
          const origen = await tx.inventoryAdjustment.findUnique({
            where: { id: d.correctedAdjustmentId! },
          });
          exigir(
            origen &&
              origen.rawMaterialId === d.rawMaterialId &&
              origen.warehouseId === d.warehouseId,
            "El ajuste corregido debe pertenecer al mismo material y bodega.",
          );
        }
        // No registrar actas ni claves para un conteo sin diferencia, según la regla aprobada.
        if (diferencia.isZero())
          return {
            ok: true as const,
            mensaje: "No hay diferencias. No se generó ajuste ni movimiento.",
            ajusteId: null,
          };
        const ajuste = await tx.inventoryAdjustment.create({
          data: {
            ...combinacion,
            date: new Date(`${d.date}T00:00:00Z`),
            reason: d.reason,
            note: d.note,
            previousQuantity: anterior,
            finalQuantity: final,
            difference: diferencia,
            correctedAdjustmentId: d.correctedAdjustmentId,
          },
        });
        if (stock)
          await tx.warehouseStock.update({
            where: { id: stock.id },
            data: { quantity: final },
          });
        else
          await tx.warehouseStock.create({
            data: { ...combinacion, quantity: final },
          });
        await tx.stockMovement.create({
          data: {
            ...combinacion,
            inventoryAdjustmentId: ajuste.id,
            type: "AJUSTE",
            quantity: diferencia,
            note: d.note,
            date: inicioDiaChile(d.date),
          },
        });
        await tx.inventoryOperation.create({
          data: {
            idempotencyKey: d.idempotencyKey,
            requestHash: hash,
            adjustmentId: ajuste.id,
            type: inicial
              ? "CARGAR_INICIAL"
              : correccion
                ? "CORREGIR"
                : "AJUSTAR",
          },
        });
        return {
          ok: true as const,
          mensaje: "Ajuste registrado y existencias actualizadas.",
          ajusteId: ajuste.id,
        };
      },
      { maxWait: 10000, timeout: 20000 },
    );
  } catch (e) {
    return fallo(e);
  }
}
