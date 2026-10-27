import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { prisma } from "@/lib/prisma";
import { Prisma, type DocumentNumberType } from "@/generated/prisma/client";
import { MAX_NUMERO_DOCUMENTAL, vistaPreviaFolio } from "@/config/numeracion-documental";
import { numeracionSchema } from "@/lib/validaciones/numeracion";
import type { Numeracion, ResultadoNumeracion } from "@/lib/tipos/numeracion";
export async function listarNumeraciones(): Promise<Numeracion[]> {
  await exigirAcceso("configuracion.leer");

  const filas = await prisma.documentNumbering.findMany({ orderBy: { id: "asc" }, include: { _count: { select: { assignments: true } } } });
  return filas.map(({ id, type, prefix, padding, nextNumber, version, _count }) => ({ id, type, prefix, padding, nextNumber: nextNumber?.toString() ?? null, version, usada: _count.assignments > 0 }));
}
export async function configurarNumeracion(datos: unknown): Promise<ResultadoNumeracion> {
  await exigirAcceso("configuracion.operar");

  const validacion = numeracionSchema.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: validacion.error.issues[0].message };
  try {
    return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "configuracion.operar");

      const { id, version, prefix, padding, nextNumber } = validacion.data;
      await tx.$queryRaw`SELECT id FROM "DocumentNumbering" WHERE id = ${id} FOR UPDATE`;
      const actual = await tx.documentNumbering.findUniqueOrThrow({ where: { id } });
      if (actual.version !== version) return { ok: false, mensaje: "La numeración cambió. Actualiza el listado y vuelve a abrir el formulario." };
      const usada = await tx.documentFolio.count({ where: { numberingId: id } });
      const numero = BigInt(nextNumber);
      if (usada && (prefix !== actual.prefix || padding !== actual.padding || numero < actual.nextNumber!)) return { ok: false, mensaje: "La numeración utilizada conserva su formato y sólo permite adelantar el próximo número." };
      await anotarMutacion(tx, "documentNumbering", "update", await tx.documentNumbering.update({ where: { id }, data: { prefix, padding, nextNumber: numero, version: { increment: 1 } } }));
      return { ok: true, mensaje: "Numeración guardada. La vista previa no consume números." };
    });
  } catch (error) {
    console.error("Error al configurar numeración:", error);
    return { ok: false, mensaje: "No se pudo guardar. Actualiza el listado y revisa la conexión." };
  }
}
/** Llamar desde la transacción que crea el documento, nunca desde una reserva independiente.
 * El módulo debe validar su contenido/idempotencia antes de llamar; el UUID estable identifica
 * la misma creación. Un fallo posterior del documento revierte folio y contador juntos.
 */
export async function asignarFolio(tx: Prisma.TransactionClient, tipo: DocumentNumberType, clave: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clave)) throw new Error("Clave de operación UUID inválida.");
  // Serializar reintentos incluso antes de que exista su registro; después bloquear la secuencia.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave.toLowerCase()}, 91357))`;
  const anterior = await tx.documentFolio.findUnique({ where: { idempotencyKey: clave } });
  if (anterior) {
    const configuracion = await tx.documentNumbering.findUniqueOrThrow({ where: { id: anterior.numberingId } });
    if (configuracion.type !== tipo) throw new Error("La clave ya pertenece a otro tipo documental.");
    return anterior;
  }
  await tx.$queryRaw`SELECT id FROM "DocumentNumbering" WHERE type = ${tipo}::"DocumentNumberType" FOR UPDATE`;
  const actual = await tx.documentNumbering.findUniqueOrThrow({ where: { type: tipo } });
  if (actual.nextNumber === null || actual.padding === null) throw new Error("Configura primero la numeración de este documento.");
  if (actual.nextNumber > MAX_NUMERO_DOCUMENTAL) throw new Error("La secuencia documental está agotada.");
  const folio = vistaPreviaFolio(actual.prefix, actual.nextNumber.toString(), actual.padding)!;
  // SQL valida el número vigente; el avance debe confirmarse en esta misma transacción.
  const asignacion = await tx.documentFolio.create({ data: { numberingId: actual.id, number: actual.nextNumber, prefix: actual.prefix, padding: actual.padding, folio, idempotencyKey: clave } });
  await tx.documentNumbering.update({ where: { id: actual.id }, data: { nextNumber: actual.nextNumber + BigInt(1), version: { increment: 1 } } });
  return asignacion;
}
