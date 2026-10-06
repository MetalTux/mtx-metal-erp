import { normalizarRut } from "@/lib/validaciones/rut";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { proveedorSchema, referenciaProveedorSchema } from "@/lib/validaciones/proveedor";
import type { Proveedor, ResultadoProveedor } from "@/lib/tipos/proveedor";

const seleccion = {
  id: true, rut: true, name: true, email: true, phone: true, createdAt: true, updatedAt: true,
  _count: { select: { purchases: true } },
} satisfies Prisma.SupplierSelect;

function serializar(proveedor: Prisma.SupplierGetPayload<{ select: typeof seleccion }>): Proveedor {
  const { _count, createdAt, updatedAt, ...datos } = proveedor;
  return {
    ...datos, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
    compras: _count.purchases,
  };
}

function errorOperacion(error: unknown): ResultadoProveedor {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe un proveedor con este RUT.", campos: { rut: ["Este RUT ya está registrado."] } };
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar este proveedor porque tiene compras asociadas." };
    if (error.code === "P2025") return { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
  }
  console.error("Error en Proveedores:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}

export async function listarProveedores(): Promise<Proveedor[]> {
  return (await prisma.supplier.findMany({ select: seleccion, orderBy: [{ name: "asc" }, { id: "asc" }] })).map(serializar);
}

export async function consultarProveedor(id: unknown): Promise<ResultadoProveedor> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "El proveedor indicado no es válido." };
  try {
    const proveedor = await prisma.supplier.findUnique({ where: { id }, select: seleccion });
    return proveedor ? { ok: true, mensaje: "Proveedor consultado.", proveedor: serializar(proveedor) } : { ok: false, mensaje: "El proveedor ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}

export async function guardarProveedor(datos: unknown, referencia?: unknown): Promise<ResultadoProveedor> {
  const validacion = proveedorSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaProveedorSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  const data = { rut: normalizarRut(validacion.data.rut), name: validacion.data.name, email: validacion.data.email || null, phone: validacion.data.phone || null };
  try {
    // Detectar también formatos antiguos sin reescribir el catálogo existente.
    const existentes = await prisma.supplier.findMany({ select: { id: true, rut: true } });
    if (existentes.some((otro) => otro.id !== (registro?.success ? registro.data.id : undefined) && normalizarRut(otro.rut) === data.rut)) {
      return { ok: false, mensaje: "Ya existe un proveedor con este RUT.", campos: { rut: ["Este RUT ya está registrado."] } };
    }
    const proveedor = registro?.success
      ? await prisma.supplier.update({ where: { id: registro.data.id, updatedAt: new Date(registro.data.updatedAt) }, data, select: seleccion })
      : await prisma.supplier.create({ data, select: seleccion });
    return { ok: true, mensaje: registro ? "Proveedor actualizado." : "Proveedor creado.", proveedor: serializar(proveedor) };
  } catch (error) { return errorOperacion(error); }
}

export async function eliminarProveedor(referencia: unknown): Promise<ResultadoProveedor> {
  const validacion = referenciaProveedorSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    // La FK protege también frente a compras asociadas después de abrir la confirmación.
    await prisma.supplier.delete({ where: { id: validacion.data.id, updatedAt: new Date(validacion.data.updatedAt) } });
    return { ok: true, mensaje: "Proveedor eliminado." };
  } catch (error) { return errorOperacion(error); }
}
