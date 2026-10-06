import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { referenciaUnidadSchema, unidadMedidaSchema } from "@/lib/validaciones/unidad-medida";
import type { ResultadoUnidad, UnidadMedida } from "@/lib/tipos/unidad-medida";

const seleccion = {
  id: true, name: true, abbreviation: true, createdAt: true, updatedAt: true,
  _count: { select: { materials: true } },
} satisfies Prisma.UnitMeasureSelect;

function serializar(unidad: Prisma.UnitMeasureGetPayload<{ select: typeof seleccion }>): UnidadMedida {
  const { _count, createdAt, updatedAt, ...datos } = unidad;
  return { ...datos, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), materiales: _count.materials };
}

function errorOperacion(error: unknown): ResultadoUnidad {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe una unidad con ese nombre.", campos: { name: ["El nombre debe ser único."] } };
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar esta unidad porque tiene materiales asociados." };
    if (error.code === "P2025") return { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
  }
  console.error("Error en Unidades de medida:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}

export async function listarUnidades(): Promise<UnidadMedida[]> {
  return (await prisma.unitMeasure.findMany({ select: seleccion, orderBy: [{ name: "asc" }, { id: "asc" }] })).map(serializar);
}

export async function consultarUnidad(id: unknown): Promise<ResultadoUnidad> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "La unidad indicada no es válida." };
  try {
    const unidad = await prisma.unitMeasure.findUnique({ where: { id }, select: seleccion });
    return unidad ? { ok: true, mensaje: "Unidad consultada.", unidad: serializar(unidad) } : { ok: false, mensaje: "La unidad ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}

export async function guardarUnidad(datos: unknown, referencia?: unknown): Promise<ResultadoUnidad> {
  const validacion = unidadMedidaSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaUnidadSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    const unidad = registro?.success
      ? await prisma.unitMeasure.update({ where: { id: registro.data.id, updatedAt: new Date(registro.data.updatedAt) }, data: validacion.data, select: seleccion })
      : await prisma.unitMeasure.create({ data: validacion.data, select: seleccion });
    return { ok: true, mensaje: registro ? "Unidad de medida actualizada." : "Unidad de medida creada.", unidad: serializar(unidad) };
  } catch (error) { return errorOperacion(error); }
}

export async function eliminarUnidad(referencia: unknown): Promise<ResultadoUnidad> {
  const validacion = referenciaUnidadSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    // La FK de materiales impide el borrado también ante una asociación concurrente.
    await prisma.unitMeasure.delete({ where: { id: validacion.data.id, updatedAt: new Date(validacion.data.updatedAt) } });
    return { ok: true, mensaje: "Unidad de medida eliminada." };
  } catch (error) { return errorOperacion(error); }
}
