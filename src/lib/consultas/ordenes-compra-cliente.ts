import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
import { cargarOfertaOrden, hoyOrden } from "@/lib/servicios/ordenes-compra-cliente";
import { validarTextoCotizacion, documentoVacioCotizacion } from "@/lib/validaciones/texto-cotizacion";
const fechaFiltro = z.string().default("").refine(v => v === "" || fechaCalendarioValida(v));
const filtrosSchema = z.object({
  q: z.string().trim().max(150).default(""), pagina: z.coerce.number().int().positive().default(1),
  estado: z.enum(["TODOS", "CONFIRMADA", "ANULADA"]).default("TODOS"),
  orden: z.enum(["fecha", "total", "cliente"]).default("fecha"), sentido: z.enum(["asc", "desc"]).default("desc"),
  desde: fechaFiltro, hasta: fechaFiltro, cotizacion: z.string().regex(/^\d*$/).default(""),
});
const pesos = (v: Prisma.Decimal | null) => v?.toFixed(0) ?? "0";
export async function consultarOrdenesCompraCliente(entrada: unknown) {
  const parsed = filtrosSchema.safeParse(entrada), f = parsed.success ? parsed.data : filtrosSchema.parse({});
  const where: Prisma.SalesOrderWhereInput = {
    folioId: { not: null }, ...(f.estado !== "TODOS" ? { status: f.estado } : {}),
    ...(f.cotizacion && Number.isSafeInteger(Number(f.cotizacion)) ? { quoteId: Number(f.cotizacion) } : {}),
    ...(f.desde || f.hasta ? { acceptanceDate: { ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00Z`) } : {}), ...(f.hasta ? { lte: new Date(`${f.hasta}T00:00:00Z`) } : {}) } } : {}),
    ...(f.q ? { OR: [{ clientName: { contains: f.q, mode: "insensitive" } }, { customerOrderNumber: { contains: f.q, mode: "insensitive" } }, { folio: { folio: { contains: f.q, mode: "insensitive" } } }] } : {}),
  };
  return prisma.$transaction(async tx => {
    const total = await tx.salesOrder.count({ where }), paginas = Math.max(1, Math.ceil(total / 10)), pagina = Math.min(f.pagina, paginas);
    const campo = f.orden === "total" ? "totalAmount" : f.orden === "cliente" ? "clientName" : "acceptanceDate";
    const filas = await tx.salesOrder.findMany({ where, orderBy: [{ [campo]: f.sentido }, { id: "desc" }], skip: (pagina - 1) * 10, take: 10 });
    const folios = await tx.documentFolio.findMany({ where: { id: { in: filas.map(o => o.folioId!) } }, select: { id: true, folio: true } });
    const quotes = await tx.quote.findMany({ where: { id: { in: filas.map(o => o.quoteId) } }, select: { id: true, folioId: true } });
    const ofrecidos = await tx.quoteDetail.findMany({ where: { quoteId: { in: filas.map(o => o.quoteId) } }, select: { id: true, quoteId: true, quantity: true } });
    const detalles = await tx.salesOrderDetail.findMany({ where: { salesOrderId: { in: filas.map(o => o.id) } }, select: { salesOrderId: true, quoteDetailId: true, quantity: true } });
    const origenFolios = await tx.documentFolio.findMany({ where: { id: { in: quotes.flatMap(q => q.folioId ? [q.folioId] : []) } }, select: { id: true, folio: true } });
    const legadas = await tx.salesOrder.count({ where: { folioId: null } });
    return { filtros: { ...f, pagina }, total, paginas, legadas, filas: filas.map(o => {
      const lineas = detalles.filter(d => d.salesOrderId === o.id), oferta = ofrecidos.filter(d => d.quoteId === o.quoteId);
      const completa = lineas.length === oferta.length && lineas.every(l => l.quantity.eq(oferta.find(d => d.id === l.quoteDetailId)!.quantity));
      const q = quotes.find(q => q.id === o.quoteId)!;
      return { id: o.id, version: o.version, folio: folios.find(f => f.id === o.folioId)!.folio, date: o.acceptanceDate!.toISOString().slice(0, 10),
        clientName: o.clientName!, branchName: o.branchName!, status: o.status!, totalAmount: pesos(o.totalAmount),
        customerOrderNumber: o.customerOrderNumber, quoteId: o.quoteId, quoteFolio: origenFolios.find(f => f.id === q.folioId)?.folio ?? String(o.quoteId), completa };
    }) };
  }, { isolationLevel: "RepeatableRead" });
}
export async function catalogoOfertasParaOrden() {
  return prisma.$transaction(async tx => {
    const hoy = new Date(`${hoyOrden()}T00:00:00Z`);
    const filas = await tx.quote.findMany({ where: { deletedAt: null, folioId: { not: null }, salesOrder: null,
      OR: [{ status: "APROBADA" }, { status: "PENDIENTE", OR: [{ validUntil: null }, { validUntil: { gte: hoy } }] }] },
      orderBy: [{ date: "desc" }, { id: "desc" }], select: { id: true, version: true, folioId: true, clientName: true } });
    const folios = await tx.documentFolio.findMany({ where: { id: { in: filas.map(q => q.folioId!) } }, select: { id: true, folio: true } });
    return filas.map(q => ({ id: q.id, version: q.version, etiqueta: `${folios.find(f => f.id === q.folioId)!.folio} · ${q.clientName ?? "Datos históricos incompletos"}` }));
  }, { isolationLevel: "RepeatableRead" });
}
export async function catalogoCotizacionesConOrden() {
  return prisma.$transaction(async tx => {
    const filas = await tx.quote.findMany({ where: { salesOrder: { is: { folioId: { not: null } } } }, orderBy: { id: "desc" }, select: { id: true, folioId: true, clientName: true } });
    const folios = await tx.documentFolio.findMany({ where: { id: { in: filas.flatMap(q => q.folioId ? [q.folioId] : []) } }, select: { id: true, folio: true } });
    return filas.map(q => ({ id: q.id, etiqueta: `${folios.find(f => f.id === q.folioId)?.folio ?? "Sin folio histórico"} · ${q.clientName ?? "Cliente histórico"}` }));
  }, { isolationLevel: "RepeatableRead" });
}
export async function obtenerOfertaParaOrden(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Referencia inválida.");
  return prisma.$transaction(async tx => {
    if (await tx.salesOrder.findUnique({ where: { quoteId: id }, select: { id: true } })) throw new Error("La cotización ya tiene una orden; consulta Ver orden desde Cotizaciones.");
    const q = await tx.quote.findUniqueOrThrow({ where: { id }, select: { version: true } });
    const { q: documento, folio, details, technicalDescription } = await cargarOfertaOrden(tx, id, q.version);
    const pdfs = await tx.quotePdfEmission.findMany({ where: { quoteId: id, quoteVersion: q.version }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, quoteVersion: true } });
    return { id, version: q.version, folio: folio.folio, date: documento.date.toISOString().slice(0, 10), validUntil: documento.validUntil?.toISOString().slice(0, 10) ?? null,
      status: documento.status, clientName: documento.clientName!, branchName: documento.branchName!, paymentConditionName: documento.paymentConditionName!, paymentTermDays: documento.paymentTermDays!,
      totalAmount: pesos(documento.totalAmount), subtotal: pesos(documento.subtotal), discountAmount: pesos(documento.discountAmount), vatRate: documento.vatRate!.toString(),
      discountMode: documento.discountMode, discountValue: documento.discountValue?.toString() ?? null, commercialTerms: documento.commercialTerms,
      technicalDescription, pdfs, lines: details.map(l => ({ id: l.id, kind: l.kind!, description: l.description, quantity: l.quantity.toString(), unitPrice: pesos(l.unitPrice), lineAmount: pesos(l.lineAmount), unitName: l.unitName!, code: l.productCode ?? l.rawMaterialCode })) };
  }, { isolationLevel: "RepeatableRead" });
}
export async function obtenerOrdenCompraCliente(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Referencia inválida.");
  return prisma.$transaction(async tx => {
    const o = await tx.salesOrder.findUniqueOrThrow({ where: { id } });
    if (!o.folioId) throw new Error("Orden legada sin aceptación documentada; requiere conciliación manual.");
    const folio = await tx.documentFolio.findUniqueOrThrow({ where: { id: o.folioId } });
    const detalles = await tx.salesOrderDetail.findMany({ where: { salesOrderId: id }, orderBy: { position: "asc" } });
    const cuenta = await tx.accountReceivable.findUniqueOrThrow({ where: { salesOrderId: id } });
    const pagos = await tx.payment.findMany({ where: { accountReceivableId: cuenta.id }, select: { amount: true, voidedAt: true } });
    const trabajo = await tx.workOrder.findUnique({ where: { salesOrderId: id }, select: { id: true } });
    const operaciones = await tx.salesOrderOperation.findMany({ where: { salesOrderId: id }, orderBy: { version: "asc" }, select: { type: true, version: true, createdAt: true } });
    // Oferta congelada, incluyendo líneas excluidas; no se consultan catálogos actuales.
    const snapshot = o.quoteSnapshot as { quote: { totalAmount: string; technicalDescription: unknown }; folio: { folio: string }; details: { id: number; description: string; quantity: string; unitPrice: string; unitName: string }[] };
    const abonado = pagos.filter(p => !p.voidedAt).reduce((s, p) => s.plus(p.amount), new Prisma.Decimal(0));
    const total = o.totalAmount!;
    return { id, version: o.version, folio: folio.folio, date: o.acceptanceDate!.toISOString().slice(0, 10), status: o.status!, quoteId: o.quoteId,
      quoteFolio: snapshot.folio.folio, quoteVersion: o.quoteVersion!, approvedQuoteVersion: o.approvedQuoteVersion!,
      clientName: o.clientName!, branchName: o.branchName!, clientSnapshot: o.clientSnapshot, companySnapshot: o.companySnapshot, bankSnapshot: o.bankSnapshot,
      paymentConditionName: o.paymentConditionName!, paymentTermDays: o.paymentTermDays!, commercialTerms: o.commercialTerms,
      technicalDescription: validarTextoCotizacion(o.technicalDescription), originalTechnicalDescription: validarTextoCotizacion(snapshot.quote.technicalDescription ?? documentoVacioCotizacion),
      customerOrderNumber: o.customerOrderNumber, customerOrderDate: o.customerOrderDate?.toISOString().slice(0, 10) ?? null, pdfEmissionId: o.pdfEmissionId,
      subtotal: pesos(o.subtotal), discountAmount: pesos(o.discountAmount), netAmount: pesos(o.netAmount), vatAmount: pesos(o.vatAmount), vatRate: o.vatRate!.toString(), totalAmount: pesos(total), offeredTotal: snapshot.quote.totalAmount,
      lines: snapshot.details.map(l => { const aceptada = detalles.find(d => d.quoteDetailId === l.id); return { id: l.id, description: l.description, unitName: l.unitName, offeredQuantity: l.quantity, acceptedQuantity: aceptada?.quantity.toString() ?? "0", excludedQuantity: new Prisma.Decimal(l.quantity).minus(aceptada?.quantity ?? 0).toString(), unitPrice: l.unitPrice, lineAmount: pesos(aceptada?.lineAmount ?? null) }; }),
      cuenta: { id: cuenta.id, amount: cuenta.amount.toFixed(0), abonado: abonado.toFixed(2), saldo: cuenta.voidedAt ? "0.00" : total.minus(abonado).toFixed(2), anulada: Boolean(cuenta.voidedAt), dueDate: cuenta.dueDate?.toISOString().slice(0, 10) ?? null },
      workOrderId: trabajo?.id ?? null, puedeAnular: o.status === "CONFIRMADA" && !trabajo && !pagos.length && !cuenta.voidedAt && !cuenta.dueDate && !cuenta.paymentPromiseDate,
      voidReason: o.voidReason, operaciones: operaciones.map(op => ({ ...op, createdAt: op.createdAt.toISOString() })) };
  }, { isolationLevel: "RepeatableRead" });
}
export type OfertaOrden = Awaited<ReturnType<typeof obtenerOfertaParaOrden>>;
export type OrdenConsultada = Awaited<ReturnType<typeof obtenerOrdenCompraCliente>>;
export type ListadoOrdenes = Awaited<ReturnType<typeof consultarOrdenesCompraCliente>>;
