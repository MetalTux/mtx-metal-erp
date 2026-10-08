import { normalizarRut } from "@/lib/validaciones/rut";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { clienteSchema, referenciaClienteSchema } from "@/lib/validaciones/cliente";
import type { Cliente, ResultadoCliente } from "@/lib/tipos/cliente";

const seleccion = {
  id: true, rut: true, name: true, contact: true, email: true, phone: true, createdAt: true, updatedAt: true,
  branches: { select: { id: true, name: true, isHeadOffice: true, legacyIncomplete: true, address: true, city: true, contact: true, phone: true, email: true }, orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }, { id: "asc" }] },
  _count: { select: { quotes: true } },
} satisfies Prisma.ClientSelect;

function serializar(cliente: Prisma.ClientGetPayload<{ select: typeof seleccion }>): Cliente {
  const { _count, createdAt, updatedAt, ...datos } = cliente;
  return {
    ...datos, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
    cotizaciones: _count.quotes,
  };
}

class ReglaCliente extends Error {}

function errorOperacion(error: unknown): ResultadoCliente {
  if (error instanceof ReglaCliente) return { ok: false, mensaje: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" && String(error.meta?.target).includes("ClientBranch")) return { ok: false, mensaje: "Los nombres de sucursal deben ser únicos dentro del cliente." };
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe un cliente con este RUT.", campos: { rut: ["Este RUT ya está registrado."] } };
    if (error.code === "P2003") return { ok: false, mensaje: "No se puede eliminar este cliente porque tiene cotizaciones asociadas a él o a sus sucursales." };
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
    const cliente = await prisma.$transaction(async tx => {
      let id: number;
      if (registro?.success) {
        // Todas las sucursales se guardan junto con el cliente; el bloqueo serializa editores.
        await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${registro.data.id} FOR UPDATE`;
        const anterior = await tx.client.findUnique({ where: { id: registro.data.id } });
        if (!anterior || anterior.updatedAt.toISOString() !== registro.data.updatedAt) throw new ReglaCliente("El cliente cambió. Actualiza el listado y vuelve a abrirlo; tus datos no se guardaron.");
        id = anterior.id;
        const sucursales = await tx.clientBranch.findMany({ where: { clientId: id }, select: { id: true, isHeadOffice: true } });
        const ids = validacion.data.branches.flatMap(b => b.id ? [b.id] : []);
        if (new Set(ids).size !== ids.length || ids.some(i => !sucursales.some(b => b.id === i))) throw new ReglaCliente("Una sucursal no pertenece a este cliente o está repetida.");
        const central = sucursales.find(b => b.isHeadOffice);
        if (central && !validacion.data.branches.some(b => b.id === central.id && b.isHeadOffice)) throw new ReglaCliente("Casa Central no se puede eliminar ni reemplazar.");
        await tx.clientBranch.deleteMany({ where: { clientId: id, id: { notIn: ids } } });
        // Timestamp monotónico: no aceptar dos ediciones con la misma versión temporal.
        await tx.client.update({ where: { id }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), anterior.updatedAt.getTime() + 1)) } });
      } else {
        if (validacion.data.branches.some(b => b.id !== undefined)) throw new ReglaCliente("Una sucursal nueva no puede tener un identificador existente.");
        id = (await tx.client.create({ data })).id;
      }
      for (const b of validacion.data.branches) {
        const { id: branchId, ...campos } = b;
        const sucursal = { ...campos, email: campos.email || null, legacyIncomplete: false };
        if (branchId) await tx.clientBranch.update({ where: { id: branchId, clientId: id }, data: sucursal });
        else await tx.clientBranch.create({ data: { ...sucursal, clientId: id } });
      }
      // Consultas secuenciales: nunca cargar relaciones hermanas simultáneas dentro de pg.
      const fila = await tx.client.findUniqueOrThrow({ where: { id } });
      const branches = await tx.clientBranch.findMany({ where: { clientId: id }, select: seleccion.branches.select, orderBy: seleccion.branches.orderBy });
      const quotes = await tx.quote.count({ where: { clientId: id } });
      return serializar({ ...fila, branches, _count: { quotes } });
    });
    return { ok: true, mensaje: registro ? "Cliente actualizado." : "Cliente creado.", cliente };
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
