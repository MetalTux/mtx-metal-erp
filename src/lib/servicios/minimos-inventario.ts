import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  combinacionMinimoSchema,
  minimoInventarioSchema,
  referenciaMinimoSchema,
} from "@/lib/validaciones/inventario";
import type {
  ConfiguracionMinimo,
  ResultadoMinimo,
} from "@/lib/tipos/inventario";
class ReglaMinimo extends Error {}
function exigir(v: unknown, mensaje: string) {
  if (!v) throw new ReglaMinimo(mensaje);
}
function errorMinimo(e: unknown): { ok: false; mensaje: string } {
  if (e instanceof ReglaMinimo) return { ok: false, mensaje: e.message };
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2003", "P2025", "P2034"].includes(e.code)
  )
    return {
      ok: false,
      mensaje:
        "Las referencias o la configuración cambiaron. Actualiza y revisa nuevamente.",
    };
  console.error("Error al configurar mínimo:", e);
  return {
    ok: false,
    mensaje:
      "No se pudo guardar el mínimo. Conservamos los datos para reintentar.",
  };
}
/** Abrir el formulario no crea stock. La unidad se compara para no configurar con un catálogo antiguo. */
export async function consultarConfiguracionMinimo(
  entrada: unknown,
): Promise<
  | { ok: true; configuracion: ConfiguracionMinimo }
  | { ok: false; mensaje: string }
> {
  const v = combinacionMinimoSchema.safeParse(entrada);
  if (!v.success)
    return { ok: false, mensaje: "Selecciona material y bodega válidos." };
  try {
    return await prisma.$transaction(
      async (tx) => {
        const m = await tx.rawMaterial.findUnique({
          where: { id: v.data.rawMaterialId },
          select: { unitMeasureId: true },
        });
        exigir(
          m && m.unitMeasureId === v.data.unitMeasureId,
          "El material o su unidad cambió. Actualiza el listado.",
        );
        exigir(
          await tx.warehouse.findUnique({
            where: { id: v.data.warehouseId },
            select: { id: true },
          }),
          "La bodega ya no existe. Actualiza el listado.",
        );
        const s = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_rawMaterialId: {
              warehouseId: v.data.warehouseId,
              rawMaterialId: v.data.rawMaterialId,
            },
          },
        });
        return {
          ok: true as const,
          configuracion: {
            cantidad: s?.quantity.toString() ?? "0",
            minimo: s?.minStock?.toString() ?? null,
            referencia: s
              ? {
                  id: s.id,
                  updatedAt: s.updatedAt.toISOString(),
                  minimo: s.minStock?.toString() ?? null,
                }
              : null,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  } catch (e) {
    return errorMinimo(e);
  }
}
/** Sólo cambia minStock. Material → stock coordina con recepciones y evita carreras del primer saldo. */
export async function guardarMinimoInventario(
  entrada: unknown,
  referencia: unknown,
): Promise<ResultadoMinimo> {
  const v = minimoInventarioSchema.safeParse(entrada),
    ref = referenciaMinimoSchema.nullable().safeParse(referencia);
  if (!v.success || !ref.success)
    return {
      ok: false,
      mensaje:
        "Revisa material, bodega y mínimo: vacío o no negativo con hasta tres decimales.",
    };
  const deseado =
    v.data.minStock === null ? null : new Prisma.Decimal(v.data.minStock);
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${v.data.rawMaterialId} FOR UPDATE`;
        const m = await tx.rawMaterial.findUnique({
          where: { id: v.data.rawMaterialId },
          select: { unitMeasureId: true },
        });
        exigir(
          m && m.unitMeasureId === v.data.unitMeasureId,
          "La unidad del material cambió. Actualiza antes de configurar el mínimo.",
        );
        exigir(
          await tx.warehouse.findUnique({
            where: { id: v.data.warehouseId },
            select: { id: true },
          }),
          "La bodega ya no existe.",
        );
        const combinacion = {
          warehouseId: v.data.warehouseId,
          rawMaterialId: v.data.rawMaterialId,
        };
        const fila = await tx.warehouseStock.findUnique({
          where: { warehouseId_rawMaterialId: combinacion },
          select: { id: true },
        });
        if (fila)
          await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${fila.id} FOR UPDATE`;
        const actual = await tx.warehouseStock.findUnique({
          where: { warehouseId_rawMaterialId: combinacion },
        });
        const iguales = (a: Prisma.Decimal | null, b: Prisma.Decimal | null) =>
          a === null ? b === null : b !== null && a.eq(b);
        if (ref.data) {
          exigir(
            actual && actual.id === ref.data.id,
            "La combinación cambió o fue eliminada. Actualiza el listado.",
          );
          // Guardar de nuevo el mismo mínimo es un reintento inocuo: no escribir ni tocar updatedAt.
          if (iguales(actual!.minStock, deseado)) return;
          exigir(
            actual!.updatedAt.toISOString() === ref.data.updatedAt &&
              actual!.minStock?.toString() === (ref.data.minimo ?? undefined),
            "El stock o mínimo cambió mientras editabas. Cierra y vuelve a abrir para revisar.",
          );
        } else if (actual) {
          if (iguales(actual.minStock, deseado)) return;
          // Una recepción pudo crear la combinación después de abrir el formulario: conserva su saldo.
          exigir(
            actual.minStock === null,
            "La combinación ya tiene un mínimo configurado. Cierra y vuelve a abrir para revisar.",
          );
        }
        if (actual)
          await tx.warehouseStock.update({
            where: { id: actual.id },
            data: { minStock: deseado },
          });
        else if (deseado !== null)
          await tx.warehouseStock.create({
            data: { ...combinacion, quantity: "0", minStock: deseado },
          });
        // Quitar mínimo sin una fila previa es un no-op. No generar combinaciones ni movimientos innecesarios.
      },
      { maxWait: 10000, timeout: 15000 },
    );
    return {
      ok: true,
      mensaje:
        deseado === null
          ? "Mínimo sin configurar; existencias y movimientos sin cambios."
          : "Mínimo guardado; existencias y movimientos sin cambios.",
    };
  } catch (e) {
    return errorMinimo(e);
  }
}
