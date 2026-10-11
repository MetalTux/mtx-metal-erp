import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { normalizarRut } from "@/lib/validaciones/rut";
import { cuentaBancariaSchema, referenciaCuentaSchema, referenciaPrincipalSchema } from "@/lib/validaciones/cuenta-bancaria";
import type { CuentaBancaria, ResultadoCuentaBancaria } from "@/lib/tipos/cuenta-bancaria";
const seleccion = { id: true, bankName: true, accountType: true, accountNumber: true, holderName: true, holderRut: true, email: true, isActive: true, isPrimary: true, version: true, createdAt: true, updatedAt: true, _count: { select: { quotes: true } } } satisfies Prisma.CompanyBankAccountSelect;
export async function listarCuentasBancarias(): Promise<CuentaBancaria[]> {
  const filas = await prisma.companyBankAccount.findMany({ where: { companyId: 1 }, select: seleccion, orderBy: [{ isPrimary: "desc" }, { isActive: "desc" }, { id: "asc" }] });
  return filas.map(({ createdAt, updatedAt, _count, ...f }) => ({ ...f, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), cotizaciones: _count.quotes }));
}
/** Un solo bloqueo del perfil serializa cambios de principal, altas y bajas, incluso por SQL. */
async function bloquearEmpresa(tx: Prisma.TransactionClient) {
  const filas = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "CompanyProfile" WHERE id = 1 FOR UPDATE`;
  if (!filas.length) throw new Error("Configura y guarda primero los datos de Empresa.");
}
function errorOperacion(error: unknown): ResultadoCuentaBancaria {
  if (error instanceof Error && error.message === "Configura y guarda primero los datos de Empresa.") return { ok: false, mensaje: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, mensaje: "Ya existe una cuenta con ese banco, tipo y número. Actualiza el listado." };
    if (error.code === "P2025") return { ok: false, mensaje: "La cuenta cambió. Actualiza el listado antes de continuar." };
  }
  console.error("Error en cuentas bancarias de Empresa:", error);
  return { ok: false, mensaje: "No se pudo completar la operación. Revisa la conexión y actualiza el listado." };
}
export async function guardarCuentaBancaria(datos: unknown, referencia?: unknown): Promise<ResultadoCuentaBancaria> {
  const validacion = cuentaBancariaSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: validacion.error.issues[0].message };
  const ref = referencia === undefined ? undefined : referenciaCuentaSchema.safeParse(referencia);
  if (ref && !ref.success) return { ok: false, mensaje: "La referencia de la cuenta no es válida." };
  try {
    return await prisma.$transaction(async tx => {
      await bloquearEmpresa(tx);
      const datos = { ...validacion.data, holderRut: normalizarRut(validacion.data.holderRut), email: validacion.data.email || null };
      if (ref?.success) await tx.companyBankAccount.update({ where: { ...ref.data, companyId: 1 }, data: { ...datos, version: { increment: 1 } } });
      else {
        const principal = await tx.companyBankAccount.findFirst({ where: { companyId: 1, isPrimary: true } });
        // Primera cuenta principal: no crear un perfil ni datos bancarios ficticios.
        await tx.companyBankAccount.create({ data: { ...datos, companyId: 1, isPrimary: !principal } });
      }
      return { ok: true, mensaje: ref ? "Cuenta bancaria actualizada." : "Cuenta bancaria creada." };
    });
  } catch (error) { return errorOperacion(error); }
}
export async function marcarCuentaPrincipal(referencia: unknown): Promise<ResultadoCuentaBancaria> {
  const ref = referenciaPrincipalSchema.safeParse(referencia);
  if (!ref.success) return { ok: false, mensaje: "La referencia de la cuenta no es válida." };
  try {
    return await prisma.$transaction(async tx => {
      await bloquearEmpresa(tx);
      const cuenta = await tx.companyBankAccount.findUniqueOrThrow({ where: { id: ref.data.id, companyId: 1, version: ref.data.version } });
      const anterior = await tx.companyBankAccount.findFirst({ where: { companyId: 1, isPrimary: true } });
      if ((anterior?.id ?? null) !== ref.data.principalId) return { ok: false, mensaje: "La cuenta principal cambió. Actualiza el listado antes de continuar." };
      if (!cuenta.isActive) return { ok: false, mensaje: "Activa la cuenta antes de marcarla como principal." };
      if (cuenta.isPrimary) return { ok: true, mensaje: "La cuenta ya es principal." };
      // Liberar el índice único antes de marcar la nueva principal; el trigger diferido
      // exige una principal al confirmar y un fallo revierte ambas escrituras.
      if (anterior) await tx.companyBankAccount.update({ where: { id: anterior.id }, data: { isPrimary: false, version: { increment: 1 } } });
      await tx.companyBankAccount.update({ where: { id: cuenta.id }, data: { isPrimary: true, version: { increment: 1 } } });
      return { ok: true, mensaje: "Cuenta principal actualizada. Los documentos anteriores conservan sus datos." };
    });
  } catch (error) { return errorOperacion(error); }
}
export async function cambiarEstadoCuenta(referencia: unknown, activa: unknown): Promise<ResultadoCuentaBancaria> {
  const ref = referenciaCuentaSchema.safeParse(referencia);
  if (!ref.success || typeof activa !== "boolean") return { ok: false, mensaje: "La referencia o estado no es válido." };
  try {
    return await prisma.$transaction(async tx => {
      await bloquearEmpresa(tx);
      const cuenta = await tx.companyBankAccount.findUniqueOrThrow({ where: { ...ref.data, companyId: 1 } });
      if (!activa && cuenta.isPrimary) return { ok: false, mensaje: "Selecciona otra cuenta principal antes de desactivar esta cuenta." };
      if (cuenta.isActive === activa) return { ok: true, mensaje: "La cuenta ya tiene ese estado." };
      await tx.companyBankAccount.update({ where: { id: cuenta.id }, data: { isActive: activa, version: { increment: 1 } } });
      return { ok: true, mensaje: activa ? "Cuenta activada." : "Cuenta desactivada; su historial se conserva." };
    });
  } catch (error) { return errorOperacion(error); }
}
/** Para el futuro formulario: sólo cuentas activas, con búsqueda en el selector cliente. */
export async function listarCuentasParaCotizacion() {
  return (await listarCuentasBancarias()).filter(c => c.isActive);
}
/** Crear el snapshot dentro de la transacción de la cotización. Omitir ID usa la principal;
 * null significa no incluir datos bancarios. El bloqueo impide cambiar la cuenta mientras
 * se captura y guarda el documento. Sin configuración, retorna un documento sin cuenta.
 */
export async function datosBancariosParaCotizacion(tx: Prisma.TransactionClient, cuentaId?: number | null) {
  if (cuentaId === null) return {};
  if (cuentaId !== undefined && (!Number.isSafeInteger(cuentaId) || cuentaId <= 0)) throw new Error("Cuenta bancaria inválida.");
  await tx.$queryRaw`SELECT id FROM "CompanyProfile" WHERE id = 1 FOR UPDATE`;
  const cuenta = await tx.companyBankAccount.findFirst({ where: { companyId: 1, isActive: true, ...(cuentaId === undefined ? { isPrimary: true } : { id: cuentaId }) } });
  if (!cuenta && cuentaId !== undefined) throw new Error("La cuenta bancaria ya no está disponible para cotizar.");
  return cuenta ? { bankAccountId: cuenta.id, bankName: cuenta.bankName, bankAccountType: cuenta.accountType, bankAccountNumber: cuenta.accountNumber, bankHolderName: cuenta.holderName, bankHolderRut: cuenta.holderRut, bankEmail: cuenta.email } : {};
}
