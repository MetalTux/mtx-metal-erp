import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type SalesOrderOperationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { rutValido } from "@/lib/validaciones/rut";
import { registrarOrdenSchema, claveOrdenSchema, anularOrdenSchema, seleccionOrdenSchema } from "@/lib/validaciones/orden-compra-cliente";
import { documentoVacioCotizacion, validarTextoCotizacion, clavesImagenesCotizacion } from "@/lib/validaciones/texto-cotizacion";
import { calcularImportesOrden, type OfertaParaOrden } from "./importes-orden-compra-cliente";
import { aprobarCotizacionEnTransaccion } from "./cotizaciones";
import { asignarFolio } from "./numeracion";
class ReglaOrden extends Error { name = "ReglaOrden"; }
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaOrden(mensaje); }
export const hoyOrden = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const fecha = (v: string) => new Date(`${v}T00:00:00Z`);
const huella = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const jsonHistoricoOrden = (v: unknown): Prisma.InputJsonObject => JSON.parse(JSON.stringify(v, (_k, valor) => typeof valor === "bigint" ? valor.toString() : valor));
export type ResultadoOrden = { ok: true; id: number; version: number; mensaje: string } | { ok: false; mensaje: string };
function fallo(error: unknown): { ok: false; mensaje: string } {
  if (error instanceof ReglaOrden) return { ok: false, mensaje: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, mensaje: "La cotización o el número externo del cliente ya tiene una orden. Actualiza el listado y revisa sus referencias." };
  console.error("Error en Orden de Compra Cliente:", error);
  return { ok: false, mensaje: "No se pudo confirmar la operación. Reintenta con la misma solicitud para comprobar el resultado." };
}
function calcular(oferta: OfertaParaOrden, seleccion: unknown) {
  try { return calcularImportesOrden(oferta, seleccion); }
  catch (e) { throw new ReglaOrden(e instanceof Error ? e.message : "Revisa las cantidades y los importes históricos."); }
}
/** Captura escalar histórica. Nunca refresca desde mantenedores ni completa datos legados. */
export async function cargarOfertaOrden(tx: Prisma.TransactionClient, id: number, version: number) {
  const q = await tx.quote.findUnique({ where: { id } });
  exigir(q && q.version === version, "La cotización cambió. Actualiza el listado y vuelve a abrirla.");
  exigir(q.folioId && !q.deletedAt && ["PENDIENTE", "APROBADA"].includes(q.status), "La cotización debe estar pendiente o aprobada, visible y con folio.");
  exigir(q.status !== "PENDIENTE" || !q.validUntil || q.validUntil.toISOString().slice(0, 10) >= hoyOrden(), "La cotización pendiente venció. Corrige su vigencia antes de aceptar.");
  exigir(q.clientName?.trim() && q.clientRut && rutValido(q.clientRut) && q.clientBranchId && q.branchName?.trim() && q.branchAddress?.trim() && q.branchCity?.trim() && q.branchContact?.trim() && q.branchPhone?.trim(), "La cotización no tiene identidad/contacto histórico completo. Utiliza una nueva cotización corregida.");
  exigir(q.paymentConditionId && q.paymentConditionName?.trim() && q.paymentTermDays !== null && q.paymentTermDays >= 0, "Falta la condición/plazo histórico de la oferta.");
  const empresa = z.object({ legalName: z.string().trim().min(1), rut: z.string().refine(rutValido), address: z.string().trim().min(1), city: z.string().trim().min(1) }).passthrough().safeParse(q.companySnapshot);
  exigir(empresa.success, "Faltan datos históricos válidos del emisor. Actualiza explícitamente el emisor si la oferta está pendiente, o crea una nueva cotización corregida.");
  if (q.bankAccountId !== null) exigir(q.bankName && q.bankAccountType && q.bankAccountNumber && q.bankHolderName && q.bankHolderRut && rutValido(q.bankHolderRut), "Los datos bancarios históricos están incompletos.");
  exigir(q.subtotal !== null && q.discountAmount !== null && q.netAmount !== null && q.vatAmount !== null && q.vatRate !== null && (q.discountMode === "SIN_DESCUENTO" || q.discountValue !== null), "Faltan importes históricos de la oferta.");
  const details = await tx.quoteDetail.findMany({ where: { quoteId: id }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  exigir(details.length && details.every(l => l.kind && l.position && l.unitMeasureId && l.unitName && l.unitAbbreviation !== null && l.lineAmount !== null), "La oferta tiene detalles legados/incompletos; utiliza una nueva cotización corregida.");
  const folio = await tx.documentFolio.findUniqueOrThrow({ where: { id: q.folioId } });
  const oferta: OfertaParaOrden = {
    lines: details.map(l => ({ id: l.id, quantity: l.quantity.toString(), unitPrice: l.unitPrice.toString(), lineAmount: l.lineAmount!.toString() })),
    discount: q.discountMode === "SIN_DESCUENTO" ? { modo: "SIN_DESCUENTO" } : { modo: q.discountMode, valor: q.discountValue!.toString() },
    vatRate: q.vatRate.toString(), subtotal: q.subtotal.toString(), discountAmount: q.discountAmount.toString(),
    netAmount: q.netAmount.toString(), vatAmount: q.vatAmount.toString(), totalAmount: q.totalAmount.toString(),
  };
  calcular(oferta, details.map(l => ({ quoteDetailId: l.id, quantity: l.quantity.toString() })));
  const technicalDescription = validarTextoCotizacion(q.technicalDescription ?? documentoVacioCotizacion);
  return { q, details, folio, oferta, technicalDescription };
}
async function anterior(tx: Prisma.TransactionClient, clave: string, fingerprint: string, type: SalesOrderOperationType) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 73430))`;
  const op = await tx.salesOrderOperation.findUnique({ where: { idempotencyKey: clave } });
  if (!op) return;
  exigir(op.fingerprint === fingerprint && op.type === type, "La clave de operación ya se utilizó con otros datos.");
  return { ok: true as const, id: op.salesOrderId, version: op.version, mensaje: "La operación ya había sido confirmada." };
}
function claveAprobacion(clave: string) {
  const h = huella({ aprobarParaOrden: clave });
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function registrarOrdenCompraCliente(entrada: unknown, claveEntrada: unknown): Promise<ResultadoOrden> {
  const d = registrarOrdenSchema.safeParse(entrada), c = claveOrdenSchema.safeParse(claveEntrada);
  if (!d.success) return { ok: false, mensaje: d.error.issues[0].message };
  if (!c.success) return { ok: false, mensaje: "Clave de operación inválida." };
  const datos = d.data, fingerprint = huella({ tipo: "CONFIRMAR", datos });
  try {
    return await prisma.$transaction(async tx => {
      const repetida = await anterior(tx, c.data, fingerprint, "CONFIRMAR"); if (repetida) return repetida;
      exigir(datos.date <= hoyOrden(), "La fecha de aceptación no puede ser futura.");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(73119)`;
      await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${datos.quoteId} FOR UPDATE`;
      exigir(!await tx.salesOrder.findUnique({ where: { quoteId: datos.quoteId }, select: { id: true } }), "La cotización ya tiene una Orden de Compra Cliente, incluso si fue anulada.");
      const { q, details, folio, oferta } = await cargarOfertaOrden(tx, datos.quoteId, datos.quoteVersion);
      exigir(datos.date >= q.date.toISOString().slice(0, 10), "La aceptación no puede ser anterior a la cotización.");
      const importes = calcular(oferta, datos.lines);
      // Sólo reutilizar recursos de la oferta, sin subir archivos propios en esta etapa.
      const imagenes = clavesImagenesCotizacion(datos.technicalDescription);
      const vinculadas = await tx.quoteImageLink.findMany({ where: { quoteId: q.id }, select: { imageId: true } });
      const archivos = await tx.quoteImageFile.findMany({ where: { id: { in: vinculadas.map(v => v.imageId) } }, select: { fileKey: true } });
      exigir(imagenes.every(k => archivos.some(a => a.fileKey === k)), "El alcance sólo puede conservar imágenes históricas de esta oferta.");
      if (datos.pdfEmissionId) {
        const pdf = await tx.quotePdfEmission.findUnique({ where: { id: datos.pdfEmissionId } });
        exigir(pdf?.quoteId === q.id && pdf.quoteVersion === q.version, "La emisión PDF debe corresponder a la revisión aceptada de la cotización.");
      }
      const normalizada = datos.customerOrderNumber === null ? null : (await tx.$queryRaw<{ clave: string }[]>`
        SELECT normalizar_referencia_orden_cliente(${datos.customerOrderNumber}) AS clave`)[0].clave;
      if (normalizada !== null) exigir(!await tx.salesOrder.findFirst({ where: { clientId: q.clientId, customerOrderKey: normalizada }, select: { id: true } }), "El cliente ya tiene una orden con un número equivalente por espacios/mayúsculas.");
      const numeracion = await tx.documentNumbering.findUnique({ where: { type: "ORDEN_COMPRA_CLIENTE" } });
      exigir(numeracion?.padding !== null && numeracion?.nextNumber !== null && numeracion, "Configura primero la numeración de Orden de Compra Cliente.");
      const aprobada = q.status === "PENDIENTE" ? await aprobarCotizacionEnTransaccion(tx, { id: q.id, version: q.version }, claveAprobacion(c.data)) : q;
      const asignacion = await asignarFolio(tx, "ORDEN_COMPRA_CLIENTE", c.data);
      const orden = await tx.salesOrder.create({ data: {
        quoteId: q.id, quoteVersion: q.version, approvedQuoteVersion: aprobada.version,
        quoteSnapshot: jsonHistoricoOrden({ schemaVersion: 1, quote: q, details, folio }),
        folioId: asignacion.id, creationKey: c.data, status: "CONFIRMADA", date: fecha(datos.date), acceptanceDate: fecha(datos.date),
        clientId: q.clientId, clientBranchId: q.clientBranchId, clientName: q.clientName, branchName: q.branchName,
        clientSnapshot: jsonHistoricoOrden({ rut: q.clientRut, name: q.clientName, contact: q.clientContact, phone: q.clientPhone, email: q.clientEmail, branchName: q.branchName, address: q.branchAddress, city: q.branchCity, branchContact: q.branchContact, branchPhone: q.branchPhone, branchEmail: q.branchEmail }),
        companySnapshot: q.companySnapshot as Prisma.InputJsonObject,
        paymentConditionId: q.paymentConditionId, paymentConditionName: q.paymentConditionName, paymentTermDays: q.paymentTermDays,
        bankAccountId: q.bankAccountId, bankSnapshot: jsonHistoricoOrden({ name: q.bankName, type: q.bankAccountType, number: q.bankAccountNumber, holder: q.bankHolderName, rut: q.bankHolderRut, email: q.bankEmail }),
        commercialTerms: q.commercialTerms, technicalDescription: datos.technicalDescription as Prisma.InputJsonObject,
        customerOrderNumber: datos.customerOrderNumber, customerOrderKey: normalizada, customerOrderDate: datos.customerOrderDate ? fecha(datos.customerOrderDate) : null,
        pdfEmissionId: datos.pdfEmissionId, offeredSubtotal: q.subtotal, offeredDiscountAmount: q.discountAmount,
        subtotal: importes.subtotal, discountMode: importes.descuento.modo,
        discountValue: importes.descuento.modo === "SIN_DESCUENTO" ? null : new Prisma.Decimal(importes.descuento.valor),
        discountAmount: importes.discountAmount, vatRate: q.vatRate, netAmount: importes.netAmount, vatAmount: importes.vatAmount, totalAmount: importes.totalAmount,
      } });
      for (const l of importes.aceptadas) {
        const original = details.find(o => o.id === l.quoteDetailId)!;
        await tx.salesOrderDetail.create({ data: {
          salesOrderId: orden.id, quoteId: q.id, quoteDetailId: original.id, position: original.position!, kind: original.kind!,
          description: original.description, quantity: new Prisma.Decimal(l.quantity), unitPrice: original.unitPrice, lineAmount: l.lineAmount,
          rawMaterialId: original.rawMaterialId, productId: original.productId, unitMeasureId: original.unitMeasureId!,
          code: original.productCode ?? original.rawMaterialCode, unitName: original.unitName!, unitAbbreviation: original.unitAbbreviation!,
        } });
      }
      await tx.accountReceivable.create({ data: { salesOrderId: orden.id, amount: importes.totalAmount, dueDate: null } });
      await tx.salesOrderOperation.create({ data: { idempotencyKey: c.data, fingerprint, type: "CONFIRMAR", salesOrderId: orden.id, version: orden.version } });
      return { ok: true as const, id: orden.id, version: orden.version, mensaje: "Orden de Compra Cliente confirmada; cuenta registrada sin vencimiento ni pagos." };
    }, { timeout: 30_000 });
  } catch (error) { return fallo(error); }
}
type ResultadoPrevisualizacionOrden =
  | { ok: false; mensaje: string; erroresLineas?: { id: number; mensaje: string }[] }
  | { ok: true; completa: boolean; subtotal: string; discountAmount: string; netAmount: string; vatAmount: string; totalAmount: string; lineAmounts: { id: number; amount: string }[] };
export async function previsualizarOrdenCompraCliente(quoteId: number, quoteVersion: number, seleccion: unknown): Promise<ResultadoPrevisualizacionOrden> {
  const ids = z.object({ quoteId: z.number().int().positive(), quoteVersion: z.number().int().positive() }).safeParse({ quoteId, quoteVersion });
  const s = seleccionOrdenSchema.safeParse(seleccion);
  if (!ids.success || !s.success) return { ok: false as const, mensaje: "Revisa la referencia y selecciona al menos una cantidad positiva." };
  try {
    return await prisma.$transaction(async tx => {
      const { oferta } = await cargarOfertaOrden(tx, quoteId, quoteVersion);
      const erroresLineas = s.data.flatMap(l => {
        const origen = oferta.lines.find(o => o.id === l.quoteDetailId);
        return origen && new Prisma.Decimal(l.quantity).gt(origen.quantity)
          ? [{ id: l.quoteDetailId, mensaje: `La cantidad máxima cotizada es ${origen.quantity}.` }] : [];
      });
      if (erroresLineas.length) return { ok: false as const, mensaje: "Revisa las cantidades aceptadas de las líneas indicadas.", erroresLineas };
      const i = calcular(oferta, s.data);
      return { ok: true as const, completa: i.completa, subtotal: i.subtotal.toFixed(0), discountAmount: i.discountAmount.toFixed(0), netAmount: i.netAmount.toFixed(0), vatAmount: i.vatAmount.toFixed(0), totalAmount: i.totalAmount.toFixed(0), lineAmounts: i.aceptadas.map(l => ({ id: l.quoteDetailId, amount: l.lineAmount.toFixed(0) })) };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) { return fallo(error); }
}
export async function anularOrdenCompraCliente(entrada: unknown, claveEntrada: unknown): Promise<ResultadoOrden> {
  const d = anularOrdenSchema.safeParse(entrada), c = claveOrdenSchema.safeParse(claveEntrada);
  if (!d.success || !c.success) return { ok: false, mensaje: !d.success ? d.error.issues[0].message : "Clave inválida." };
  const { referencia, motivo } = d.data, fingerprint = huella({ tipo: "ANULAR", datos: d.data });
  try {
    return await prisma.$transaction(async tx => {
      const repetida = await anterior(tx, c.data, fingerprint, "ANULAR"); if (repetida) return repetida;
      // Misma precedencia que confirmar: fuente → orden → cuenta.
      const origen = await tx.salesOrder.findUnique({ where: { id: referencia.id }, select: { quoteId: true } });
      exigir(origen, "La orden no está disponible.");
      await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${origen.quoteId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${referencia.id} FOR UPDATE`;
      const orden = await tx.salesOrder.findUniqueOrThrow({ where: { id: referencia.id } });
      exigir(orden.folioId && orden.version === referencia.version && orden.status === "CONFIRMADA", "La orden cambió, es legada o ya fue anulada. Actualiza el listado.");
      exigir(!await tx.workOrder.findUnique({ where: { salesOrderId: orden.id }, select: { id: true } }), "No se puede anular una orden con trabajo asociado.");
      await tx.$queryRaw`SELECT id FROM "AccountReceivable" WHERE "salesOrderId" = ${orden.id} FOR UPDATE`;
      const cuenta = await tx.accountReceivable.findUnique({ where: { salesOrderId: orden.id } });
      exigir(cuenta && !cuenta.voidedAt && cuenta.dueDate === null && cuenta.paymentPromiseDate === null && cuenta.amount.eq(orden.totalAmount!), "La cuenta tiene un hito posterior o es inconsistente; requiere conciliación antes de anular.");
      exigir(!await tx.payment.findFirst({ where: { accountReceivableId: cuenta.id }, select: { id: true } }), "No se puede anular una orden con abonos, incluidos los anulados.");
      const instante = new Date();
      await tx.accountReceivable.update({ where: { id: cuenta.id }, data: { voidedAt: instante, voidReason: motivo } });
      const anulada = await tx.salesOrder.update({ where: { id: orden.id }, data: { status: "ANULADA", voidedAt: instante, voidReason: motivo, version: { increment: 1 } } });
      await tx.salesOrderOperation.create({ data: { idempotencyKey: c.data, fingerprint, type: "ANULAR", salesOrderId: orden.id, version: anulada.version } });
      return { ok: true as const, id: anulada.id, version: anulada.version, mensaje: "Orden y cuenta anuladas; folio, referencia externa y cotización conservados." };
    }, { timeout: 30_000 });
  } catch (error) { return fallo(error); }
}

/** Contrato para el futuro servicio de Producción: llamar después de reconocer
 * su propia idempotencia y dentro de la tx que registrará el trabajo. No crea
 * trabajo, reservas, consumos ni folios; entrega exclusivamente lo contratado. */
export async function leerCompromisoParaTrabajo(tx: Prisma.TransactionClient, referencia: { id: number; version: number }) {
  const origen = await tx.salesOrder.findUnique({ where: { id: referencia.id }, select: { quoteId: true } });
  exigir(origen, "La orden de origen no está disponible.");
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${origen.quoteId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${referencia.id} FOR UPDATE`;
  const o = await tx.salesOrder.findUniqueOrThrow({ where: { id: referencia.id } });
  exigir(o.folioId && o.status === "CONFIRMADA" && o.version === referencia.version, "El trabajo requiere una orden confirmada y una revisión actual.");
  exigir(!await tx.workOrder.findUnique({ where: { salesOrderId: o.id }, select: { id: true } }), "La orden ya tiene su único trabajo asociado.");
  const lineas = await tx.salesOrderDetail.findMany({ where: { salesOrderId: o.id }, orderBy: { position: "asc" } });
  return { id: o.id, version: o.version, clientId: o.clientId!, clientBranchId: o.clientBranchId!, totalAmount: o.totalAmount!.toFixed(0), paymentTermDays: o.paymentTermDays!,
    technicalDescription: validarTextoCotizacion(o.technicalDescription),
    lines: lineas.map(l => ({ id: l.id, kind: l.kind, rawMaterialId: l.rawMaterialId, productId: l.productId, unitMeasureId: l.unitMeasureId,
      description: l.description, quantity: l.quantity.toString(), unitPrice: l.unitPrice.toFixed(0), lineAmount: l.lineAmount.toFixed(0) })) };
}
