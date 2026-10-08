import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { bodegaSchema, referenciaBodegaSchema } from "@/lib/validaciones/bodega";
import type { Bodega, ResultadoBodega } from "@/lib/tipos/bodega";

const seleccion = {
  id: true, name: true, location: true, createdAt: true, updatedAt: true,
  _count: { select: { stocks: true, stockMovements: true, purchases: true, workOrderDetails: true } },
} satisfies Prisma.WarehouseSelect;

function serializar(bodega: Prisma.WarehouseGetPayload<{ select: typeof seleccion }>): Bodega {
  const { _count, createdAt, updatedAt, ...datos } = bodega;
  return {
    ...datos, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
    referencias: { stocks: _count.stocks, movimientos: _count.stockMovements, compras: _count.purchases, trabajos: _count.workOrderDetails },
  };
}

function errorOperacion(error: unknown): ResultadoBodega {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar esta bodega porque tiene stock, movimientos o documentos asociados." };
    if (error.code === "P2025") return { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
  }
  console.error("Error en Bodegas:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}

export async function listarBodegas(): Promise<Bodega[]> {
  return (await prisma.warehouse.findMany({ select: seleccion, orderBy: [{ name: "asc" }, { id: "asc" }] })).map(serializar);
}

export async function consultarBodega(id: unknown): Promise<ResultadoBodega> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "La bodega indicada no es válida." };
  try {
    const bodega = await prisma.warehouse.findUnique({ where: { id }, select: seleccion });
    return bodega ? { ok: true, mensaje: "Bodega consultada.", bodega: serializar(bodega) } : { ok: false, mensaje: "La bodega ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}

export async function guardarBodega(datos: unknown, referencia?: unknown): Promise<ResultadoBodega> {
  const validacion = bodegaSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaBodegaSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  const data = { name: validacion.data.name, location: validacion.data.location || null };
  try {
    const bodega = registro?.success
      ? await prisma.warehouse.update({ where: { id: registro.data.id, updatedAt: new Date(registro.data.updatedAt) }, data, select: seleccion })
      : await prisma.warehouse.create({ data, select: seleccion });
    return { ok: true, mensaje: registro ? "Bodega actualizada." : "Bodega creada.", bodega: serializar(bodega) };
  } catch (error) { return errorOperacion(error); }
}

export async function eliminarBodega(referencia: unknown): Promise<ResultadoBodega> {
  const validacion = referenciaBodegaSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    // Las FK protegen incluso saldo cero y compras sin detalles; se cuenta la cabecera una sola vez.
    await prisma.warehouse.delete({ where: { id: validacion.data.id, updatedAt: new Date(validacion.data.updatedAt) } });
    return { ok: true, mensaje: "Bodega eliminada." };
  } catch (error) { return errorOperacion(error); }
}
