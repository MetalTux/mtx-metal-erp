import { normalizarRut } from "@/lib/validaciones/rut";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { clienteSchema, referenciaClienteSchema } from "@/lib/validaciones/cliente";
import type { Cliente, ResultadoCliente } from "@/lib/tipos/cliente";

const seleccion = {
  id: true, rut: true, name: true, contact: true, email: true, phone: true, createdAt: true, updatedAt: true,
  _count: { select: { quotes: true } },
} satisfies Prisma.ClientSelect;

function serializar(cliente: Prisma.ClientGetPayload<{ select: typeof seleccion }>): Cliente {
  const { _count, createdAt, updatedAt, ...datos } = cliente;
  return {
    ...datos, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
    cotizaciones: _count.quotes,
  };
}

function errorOperacion(error: unknown): ResultadoCliente {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe un cliente con este RUT.", campos: { rut: ["Este RUT ya está registrado."] } };
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar este cliente porque tiene cotizaciones asociadas." };
    if (error.code === "P2025") return { ok: false, mensaje: "El registro cambió o ya no existe. Actualiza el listado y vuelve a abrirlo." };
  }
  console.error("Error en Clientes:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Inténtalo nuevamente." };
}

export async function listarClientes(): Promise<Cliente[]> {
  return (await prisma.client.findMany({ select: seleccion, orderBy: [{ name: "asc" }, { id: "asc" }] })).map(serializar);
}

export async function consultarCliente(id: unknown): Promise<ResultadoCliente> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { ok: false, mensaje: "El cliente indicado no es válido." };
  try {
    const cliente = await prisma.client.findUnique({ where: { id }, select: seleccion });
    return cliente ? { ok: true, mensaje: "Cliente consultado.", cliente: serializar(cliente) } : { ok: false, mensaje: "El cliente ya no existe. Actualiza el listado." };
  } catch (error) { return errorOperacion(error); }
}

export async function guardarCliente(datos: unknown, referencia?: unknown): Promise<ResultadoCliente> {
  const validacion = clienteSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: "Revisa los campos del formulario.", campos: validacion.error.flatten().fieldErrors };
  const registro = referencia === undefined ? undefined : referenciaClienteSchema.safeParse(referencia);
  if (registro && !registro.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  const data = { rut: normalizarRut(validacion.data.rut), name: validacion.data.name, contact: validacion.data.contact || null, email: validacion.data.email || null, phone: validacion.data.phone || null };
  try {
    // Detectar también formatos antiguos sin reescribir el catálogo existente.
    const existentes = await prisma.client.findMany({ select: { id: true, rut: true } });
    if (existentes.some((otro) => otro.id !== (registro?.success ? registro.data.id : undefined) && normalizarRut(otro.rut) === data.rut)) {
      return { ok: false, mensaje: "Ya existe un cliente con este RUT.", campos: { rut: ["Este RUT ya está registrado."] } };
    }
    const cliente = registro?.success
      ? await prisma.client.update({ where: { id: registro.data.id, updatedAt: new Date(registro.data.updatedAt) }, data, select: seleccion })
      : await prisma.client.create({ data, select: seleccion });
    return { ok: true, mensaje: registro ? "Cliente actualizado." : "Cliente creado.", cliente: serializar(cliente) };
  } catch (error) { return errorOperacion(error); }
}

export async function eliminarCliente(referencia: unknown): Promise<ResultadoCliente> {
  const validacion = referenciaClienteSchema.safeParse(referencia);
  if (!validacion.success) return { ok: false, mensaje: "La referencia del registro no es válida. Actualiza el listado." };
  try {
    // La FK protege también frente a cotizaciones asociadas después de abrir la confirmación.
    await prisma.client.delete({ where: { id: validacion.data.id, updatedAt: new Date(validacion.data.updatedAt) } });
    return { ok: true, mensaje: "Cliente eliminado." };
  } catch (error) { return errorOperacion(error); }
}
