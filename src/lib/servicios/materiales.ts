import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { materialSchema, referenciaMaterialSchema } from "@/lib/validaciones/material";
import { materialEnUso, type Material, type ResultadoMaterial, type UnidadMaterial } from "@/lib/tipos/material";

const seleccion = {
  id: true, code: true, name: true, description: true, unitMeasureId: true, createdAt: true, updatedAt: true,
  unitMeasure: { select: { id: true, name: true, abbreviation: true } },
  _count: { select: { stocks: true, stockMovements: true, purchases: true, workOrders: true, quoteDetails: true } },
} satisfies Prisma.RawMaterialSelect;
function serializar(material: Prisma.RawMaterialGetPayload<{ select: typeof seleccion }>): Material {
  const { unitMeasure, _count, createdAt, updatedAt, ...datos } = material;
  return { ...datos, unidad: unitMeasure, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), referencias: { stocks: _count.stocks, movimientos: _count.stockMovements, compras: _count.purchases, trabajos: _count.workOrders, cotizaciones: _count.quoteDetails } };
}
const obsoleto: ResultadoMaterial = { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
function errorOperacion(error: unknown, eliminacion = false): ResultadoMaterial {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe un material con este código.", campos: { code: ["Este código ya está registrado."] } };
    if (error.code === "P2025") return obsoleto;
    if (error.code === "P2003") return eliminacion
      ? { ok: false, mensaje: "No se puede eliminar este material porque tiene stock, movimientos o documentos asociados." }
      : { ok: false, mensaje: "La unidad seleccionada ya no existe. Actualiza el listado.", campos: { unitMeasureId: ["Selecciona una unidad existente."] } };
  }
  console.error("Error en Materias primas:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}
export async function listarMateriales(): Promise<Material[]> {
  return (await prisma.rawMaterial.findMany({ select: seleccion, orderBy: [{ name: "asc" }, { id: "asc" }] })).map(serializar);
}
export async function listarUnidadesMaterial(): Promise<UnidadMaterial[]> {
  return prisma.unitMeasure.findMany({ select: { id: true, name: true, abbreviation: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
}
export async function consultarMaterial(id: unknown): Promise<ResultadoMaterial> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "El material indicado no es válido." };
  try {
    const material = await prisma.rawMaterial.findUnique({ where: { id }, select: seleccion });
    return material ? { ok: true, mensaje: "Material consultado.", material: serializar(material) } : { ok: false, mensaje: "El material ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}
export async function guardarMaterial(datos: unknown, referencia?: unknown): Promise<ResultadoMaterial> {
  const validacion = materialSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaMaterialSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  const data = { ...validacion.data, description: validacion.data.description || null };
  try {
    return await prisma.$transaction(async (tx): Promise<ResultadoMaterial> => {
      if (registro?.success) {
        // Bloquear la fila antes de contar referencias; las inserciones con FK también toman un bloqueo.
        const filas = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "RawMaterial" WHERE id = ${registro.data.id} AND "updatedAt" = ${new Date(registro.data.updatedAt)} FOR UPDATE`;
        if (!filas.length) return obsoleto;
        const actual = await tx.rawMaterial.findUniqueOrThrow({ where: { id: registro.data.id }, select: seleccion });
        if (actual.unitMeasureId !== data.unitMeasureId && materialEnUso(serializar(actual))) return { ok: false, mensaje: "No se puede cambiar la unidad de un material con stock, movimientos o documentos asociados.", campos: { unitMeasureId: ["La unidad está bloqueada porque el material tiene referencias."] } };
      }
      if (!await tx.unitMeasure.findUnique({ where: { id: data.unitMeasureId }, select: { id: true } })) return { ok: false, mensaje: "La unidad seleccionada ya no existe. Actualiza el listado.", campos: { unitMeasureId: ["Selecciona una unidad existente."] } };
      const material = registro?.success
        ? await tx.rawMaterial.update({ where: { id: registro.data.id, updatedAt: new Date(registro.data.updatedAt) }, data, select: seleccion })
        : await tx.rawMaterial.create({ data, select: seleccion });
      return { ok: true, mensaje: registro ? "Material actualizado." : "Material creado.", material: serializar(material) };
    });
  } catch (error) { return errorOperacion(error); }
}
export async function eliminarMaterial(referencia: unknown): Promise<ResultadoMaterial> {
  const validacion = referenciaMaterialSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    return await prisma.$transaction(async (tx): Promise<ResultadoMaterial> => {
      const filas = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "RawMaterial" WHERE id = ${validacion.data.id} AND "updatedAt" = ${new Date(validacion.data.updatedAt)} FOR UPDATE`;
      if (!filas.length) return obsoleto;
      const actual = await tx.rawMaterial.findUniqueOrThrow({ where: { id: validacion.data.id }, select: seleccion });
      // QuoteDetail es opcional: no permitir que el borrado desvincule una cotización histórica.
      if (materialEnUso(serializar(actual))) return { ok: false, mensaje: "No se puede eliminar este material porque tiene stock, movimientos o documentos asociados." };
      await tx.rawMaterial.delete({ where: { id: validacion.data.id, updatedAt: new Date(validacion.data.updatedAt) } });
      return { ok: true, mensaje: "Material eliminado." };
    });
  } catch (error) { return errorOperacion(error, true); }
}
