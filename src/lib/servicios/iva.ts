import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { periodoIvaSchema, referenciaIvaSchema } from "@/lib/validaciones/iva";
import type { PeriodoIva, ResultadoIva } from "@/lib/tipos/iva";
class ReglaIva extends Error {}
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaIva(mensaje); }
function fallo(error: unknown): ResultadoIva {
  if (error instanceof ReglaIva) return { ok: false, mensaje: error.message };
  console.error("Error en períodos de IVA:", error);
  return { ok: false, mensaje: "No se pudo confirmar el período. Actualiza el listado y revisa los datos antes de reintentar." };
}
const calendario = (v: Date) => v.toISOString().slice(0, 10);
const date = (v: string) => new Date(`${v}T00:00:00Z`);
export function diaAnteriorIva(v: string) { const d = date(v); d.setUTCDate(d.getUTCDate() - 1); return calendario(d); }
export async function listarPeriodosIva(): Promise<PeriodoIva[]> {
  await exigirAcceso("configuracion.leer");

  return prisma.$transaction(async tx => {
    const filas = await tx.vatRatePeriod.findMany({ orderBy: [{ validFrom: "desc" }, { id: "desc" }] });
    const referencias = await tx.quote.groupBy({ by: ["vatRatePeriodId"], where: { vatRatePeriodId: { not: null } }, _count: { _all: true }, _max: { date: true } });
    return filas.map(f => { const r = referencias.find(r => r.vatRatePeriodId === f.id); return { id: f.id, rate: f.rate.toString(), validFrom: calendario(f.validFrom), validTo: f.validTo ? calendario(f.validTo) : null, version: f.version, documentos: r?._count._all ?? 0, ultimaFechaDocumento: r?._max.date ? calendario(r._max.date) : null }; });
  }, { isolationLevel: "RepeatableRead" });
}
/** Copiar ambos valores en la tx del documento. No reserva folios ni crea períodos. */
export async function ivaParaDocumento(tx: Prisma.TransactionClient, fecha: string) {
  exigir(fechaCalendarioValida(fecha), "La fecha del documento no es válida.");
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(73119)`;
  const filas = await tx.vatRatePeriod.findMany({ where: { validFrom: { lte: date(fecha) }, OR: [{ validTo: null }, { validTo: { gte: date(fecha) } }] }, take: 2 });
  exigir(filas.length === 1, "No hay un período de IVA configurado para la fecha del documento. Configúralo antes de guardar.");
  await tx.$queryRaw`SELECT id FROM "VatRatePeriod" WHERE id = ${filas[0].id} FOR SHARE`;
  return { vatRatePeriodId: filas[0].id, vatRate: filas[0].rate };
}
export async function guardarPeriodoIva(entrada: unknown, referencia?: unknown, abiertaEsperada?: unknown): Promise<ResultadoIva> {
  await exigirAcceso("configuracion.operar");

  const v = periodoIvaSchema.safeParse(entrada);
  if (!v.success) return { ok: false, mensaje: v.error.issues[0].message };
  const r = referencia === undefined ? undefined : referenciaIvaSchema.safeParse(referencia);
  if (r && !r.success) return { ok: false, mensaje: "La referencia del período no es válida." };
  const a = abiertaEsperada === null || abiertaEsperada === undefined ? undefined : referenciaIvaSchema.safeParse(abiertaEsperada);
  if (a && !a.success) return { ok: false, mensaje: "La referencia del período abierto no es válida." };
  const d = v.data;
  try {
    return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "configuracion.operar");

      // Exclusivo antes de bloquear filas: documentos toman el mismo bloqueo compartido.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73119)`;
      const filas = await tx.vatRatePeriod.findMany({ orderBy: { id: "asc" } });
      const actual = r?.success ? filas.find(f => f.id === r.data.id) : undefined;
      if (r?.success) exigir(actual?.version === r.data.version, "El período cambió. Actualiza el listado y vuelve a abrirlo.");
      const abierta = filas.find(f => f.validTo === null);
      const cierres: { id: number; hasta: string }[] = [];
      if (!actual && d.validTo === null && abierta) {
        exigir(a?.success && a.data.id === abierta.id && a.data.version === abierta.version, "El período abierto cambió. Actualiza el listado antes de crear otro.");
        exigir(d.validFrom > calendario(abierta.validFrom), "El nuevo período abierto debe comenzar después del actual. Para fechas anteriores registra un período cerrado.");
        cierres.push({ id: abierta.id, hasta: diaAnteriorIva(d.validFrom) });
      }
      for (const f of filas) {
        if (f.id === actual?.id) continue;
        const desde = calendario(f.validFrom), hasta = cierres.find(c => c.id === f.id)?.hasta ?? (f.validTo ? calendario(f.validTo) : null);
        exigir((d.validTo !== null && d.validTo < desde) || (hasta !== null && hasta < d.validFrom), "El período se solapa con otro. Las fechas hasta son inclusivas.");
      }
      if (actual) {
        const asociadas = await tx.quote.findFirst({ where: { vatRatePeriodId: actual.id }, select: { id: true } });
        if (asociadas) {
          exigir(actual.rate.equals(d.rate) && calendario(actual.validFrom) === d.validFrom, "No puedes cambiar la tasa ni la fecha desde de un período utilizado.");
          exigir(!await tx.quote.findFirst({ where: { vatRatePeriodId: actual.id, ...(d.validTo ? { date: { gte: diaSiguiente(d.validTo) } } : { id: -1 }) }, select: { id: true } }), "La fecha hasta dejaría documentos asociados fuera del período.");
        }
        exigir(actual.validTo !== null || d.validTo === null, "Para cerrar el período abierto, crea el siguiente con fecha hasta vacía; ambos cambios se guardarán juntos.");
      }
      for (const cierre of cierres) {
        exigir(!await tx.quote.findFirst({ where: { vatRatePeriodId: cierre.id, date: { gte: date(d.validFrom) } }, select: { id: true } }), "El nuevo inicio dejaría documentos del período anterior fuera de su rango.");
        await anotarMutacion(tx, "vatRatePeriod", "update", await tx.vatRatePeriod.update({ where: { id: cierre.id }, data: { validTo: date(cierre.hasta), version: { increment: 1 } } }));
      }
      const data = { rate: new Prisma.Decimal(d.rate), validFrom: date(d.validFrom), validTo: d.validTo ? date(d.validTo) : null };
      if (actual) await anotarMutacion(tx, "vatRatePeriod", "update", await tx.vatRatePeriod.update({ where: { id: actual.id }, data: { ...data, version: { increment: 1 } } }));
      else await anotarMutacion(tx, "vatRatePeriod", "create", await tx.vatRatePeriod.create({ data }));
      return { ok: true, mensaje: "Período de IVA guardado." };
    }, { timeout: 20000 });
  } catch (error) { return fallo(error); }
}
function diaSiguiente(v: string) { const d = date(v); d.setUTCDate(d.getUTCDate() + 1); return d; }
export async function eliminarPeriodoIva(entrada: unknown): Promise<ResultadoIva> {
  await exigirAcceso("configuracion.operar");

  const r = referenciaIvaSchema.safeParse(entrada);
  if (!r.success) return { ok: false, mensaje: "La referencia no es válida." };
  try {
    return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "configuracion.operar");

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73119)`;
      const fila = await tx.vatRatePeriod.findUnique({ where: { id: r.data.id } });
      exigir(fila?.version === r.data.version, "El período cambió. Actualiza el listado.");
      exigir(fila.validTo !== null, "No se puede eliminar el período abierto.");
      exigir(!await tx.quote.findFirst({ where: { vatRatePeriodId: fila.id }, select: { id: true } }), "No se puede eliminar un período con documentos asociados.");
      await anotarMutacion(tx, "vatRatePeriod", "delete", await tx.vatRatePeriod.delete({ where: { id: fila.id } }));
      return { ok: true, mensaje: "Período cerrado sin uso eliminado. Las fechas sin cobertura no permitirán guardar documentos." };
    });
  } catch (error) { return fallo(error); }
}
