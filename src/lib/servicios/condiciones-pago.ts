import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { condicionPagoSchema, referenciaCondicionSchema } from "@/lib/validaciones/condicion-pago";
import type { CondicionPago, ResultadoCondicion } from "@/lib/tipos/condicion-pago";

const seleccion = {
  id: true, name: true, days: true, version: true, createdAt: true, updatedAt: true,
  _count: { select: { quotes: true } },
} satisfies Prisma.PaymentConditionSelect;
function serializar(fila: Prisma.PaymentConditionGetPayload<{ select: typeof seleccion }>): CondicionPago {
  const { _count, createdAt, updatedAt, ...datos } = fila;
  return { ...datos, cotizaciones: _count.quotes, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}
function errorOperacion(error: unknown): ResultadoCondicion {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe una condición con ese nombre.", campos: { name: ["Usa un nombre diferente."] } };
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar: la condición tiene documentos asociados." };
    if (error.code === "P2025") return { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
  }
  console.error("Error en Condiciones de Pago:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Comprueba la conexión e inténtalo nuevamente." };
}
export async function listarCondiciones(): Promise<CondicionPago[]> {
  return (await prisma.paymentCondition.findMany({ select: seleccion, orderBy: [{ days: "asc" }, { name: "asc" }, { id: "asc" }] })).map(serializar);
}
export async function consultarCondicion(id: unknown): Promise<ResultadoCondicion> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "La condición indicada no es válida." };
  try {
    const fila = await prisma.paymentCondition.findUnique({ where: { id }, select: seleccion });
    return fila ? { ok: true, mensaje: "Condición consultada.", condicion: serializar(fila) } : { ok: false, mensaje: "La condición ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}
export async function guardarCondicion(datos: unknown, referencia?: unknown): Promise<ResultadoCondicion> {
  const validacion = condicionPagoSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaCondicionSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia no es válida. Actualiza el listado." };
  try {
    // Una versión entera impide sobrescribir cambios incluso dentro del mismo milisegundo.
    const fila = registro?.success
      ? await prisma.paymentCondition.update({ where: registro.data, data: { ...validacion.data, version: { increment: 1 } }, select: seleccion })
      : await prisma.paymentCondition.create({ data: validacion.data, select: seleccion });
    return { ok: true, mensaje: registro ? "Condición de pago actualizada." : "Condición de pago creada.", condicion: serializar(fila) };
  } catch (error) { return errorOperacion(error); }
}
export async function eliminarCondicion(referencia: unknown): Promise<ResultadoCondicion> {
  const validacion = referenciaCondicionSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia no es válida. Actualiza el listado." };
  try {
    // La FK Restrict protege también frente a referencias creadas concurrentemente.
    await prisma.paymentCondition.delete({ where: validacion.data });
    return { ok: true, mensaje: "Condición de pago eliminada." };
  } catch (error) { return errorOperacion(error); }
}
