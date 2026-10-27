import { exigirAcceso } from "@/lib/seguridad/acceso";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { documentoVacioCotizacion, validarTextoCotizacion } from "@/lib/validaciones/texto-cotizacion";
import type { DatosCotizacion } from "@/lib/validaciones/cotizacion";
import { fechaCalendarioValida } from "@/lib/fechas-chile";
const fechaFiltro = z.string().default("").refine(v => v === "" || fechaCalendarioValida(v), "Fecha de filtro inválida.");
const filtrosSchema = z.object({
  q: z.string().trim().max(150).default(""), pagina: z.coerce.number().int().positive().default(1),
  estado: z.enum(["TODOS", "PENDIENTE", "APROBADA", "RECHAZADA"]).default("TODOS"),
  orden: z.enum(["fecha", "total", "cliente"]).default("fecha"), sentido: z.enum(["asc", "desc"]).default("desc"),
  desde: fechaFiltro, hasta: fechaFiltro,
});
export async function consultarCotizaciones(entrada: unknown) {
  await exigirAcceso("cotizaciones.leer");
  await exigirAcceso("precios.leer");

  const parsed = filtrosSchema.safeParse(entrada), f = parsed.success ? parsed.data : filtrosSchema.parse({});
  const where: Prisma.QuoteWhereInput = { deletedAt: null, folioId: { not: null }, ...(f.estado !== "TODOS" ? { status: f.estado } : {}), ...(f.desde || f.hasta ? { date: { ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00Z`) } : {}), ...(f.hasta ? { lte: new Date(`${f.hasta}T00:00:00Z`) } : {}) } } : {}), ...(f.q ? { OR: [{ clientName: { contains: f.q, mode: "insensitive" } }, { clientRut: { contains: f.q, mode: "insensitive" } }, { folio: { folio: { contains: f.q, mode: "insensitive" } } }] } : {}) };
  return prisma.$transaction(async tx => {
    const total = await tx.quote.count({ where });
    const paginas = Math.max(1, Math.ceil(total / 10)), pagina = Math.min(f.pagina, paginas);
    const campo = f.orden === "total" ? "totalAmount" : f.orden === "cliente" ? "clientName" : "date";
    const filas = await tx.quote.findMany({ where, orderBy: [{ [campo]: f.sentido }, { id: "desc" }], skip: (pagina - 1) * 10, take: 10 });
    const folios = await tx.documentFolio.findMany({ where: { id: { in: filas.flatMap(q => q.folioId ? [q.folioId] : []) } }, select: { id: true, folio: true } });
    const ordenes = await tx.salesOrder.findMany({ where: { quoteId: { in: filas.map(q => q.id) } }, select: { id: true, quoteId: true } });
    return { filtros: { ...f, pagina }, total, paginas, filas: filas.map(q => ({ id: q.id, version: q.version, folio: folios.find(f => f.id === q.folioId)!.folio, date: q.date.toISOString().slice(0, 10), validUntil: q.validUntil?.toISOString().slice(0, 10) ?? null, clientName: q.clientName!, status: q.status, totalAmount: q.totalAmount.toFixed(0), conOrden: ordenes.some(o => o.quoteId === q.id), ordenId: ordenes.find(o => o.quoteId === q.id)?.id ?? null, correctedQuoteId: q.correctedQuoteId })) };
  }, { isolationLevel: "RepeatableRead" });
}
export async function catalogosCotizacion() {
  await exigirAcceso("cotizaciones.leer");
  await exigirAcceso("precios.leer");

  const [clientes, sucursales, condiciones, cuentas, materiales, productos, unidades] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, rut: true } }),
    prisma.clientBranch.findMany({ orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }] }),
    prisma.paymentCondition.findMany({ orderBy: { days: "asc" }, select: { id: true, name: true, days: true } }),
    prisma.companyBankAccount.findMany({ orderBy: [{ isPrimary: "desc" }, { id: "asc" }], select: { id: true, bankName: true, accountNumber: true, isPrimary: true, isActive: true } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true, unitMeasureId: true } }),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true, unitMeasureId: true, suggestedPrice: true } }),
    prisma.unitMeasure.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, abbreviation: true } }),
  ]);
  return { clientes, sucursales: sucursales.map(s => ({ id: s.id, clientId: s.clientId, name: s.name, isHeadOffice: s.isHeadOffice, legacyIncomplete: s.legacyIncomplete, address: s.address, city: s.city, contact: s.contact, phone: s.phone, email: s.email })), condiciones, cuentas, materiales, productos: productos.map(p => ({ ...p, suggestedPrice: p.suggestedPrice?.toFixed(0) ?? null })), unidades };
}
/** Consulta histórica escalar, sin include de relaciones hermanas en el mismo pg. */
export async function obtenerCotizacion(id: number) {
  await exigirAcceso("cotizaciones.leer");
  await exigirAcceso("precios.leer");

  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Referencia inválida.");
  return prisma.$transaction(async tx => {
    const q = await tx.quote.findFirstOrThrow({ where: { id, deletedAt: null, folioId: { not: null } } });
    const detalles = await tx.quoteDetail.findMany({ where: { quoteId: id }, orderBy: { position: "asc" } });
    const folio = await tx.documentFolio.findUniqueOrThrow({ where: { id: q.folioId! } });
    const datos: DatosCotizacion = {
      date: q.date.toISOString().slice(0, 10), validUntil: q.validUntil?.toISOString().slice(0, 10) ?? null,
      clientId: q.clientId, clientBranchId: q.clientBranchId!, paymentConditionId: q.paymentConditionId!, bankAccountId: q.bankAccountId,
      discount: q.discountMode === "SIN_DESCUENTO" ? { modo: "SIN_DESCUENTO" } : { modo: q.discountMode, valor: q.discountValue!.toString() },
      commercialTerms: q.commercialTerms,
      technicalDescription: q.technicalDescription ? validarTextoCotizacion(q.technicalDescription) : documentoVacioCotizacion,
      lines: detalles.map(l => ({ kind: l.kind!, rawMaterialId: l.rawMaterialId, productId: l.productId, unitMeasureId: l.unitMeasureId!, description: l.description, quantity: l.quantity.toString(), unitPrice: l.unitPrice.toFixed(0) })),
    };
    // Una corrección crea una oferta neta nueva; no modifica el original.
    const divisor = new Prisma.Decimal(1).plus(new Prisma.Decimal(q.vatRate ?? 0).dividedBy(100));
    const aNeto = (valor: string) => new Prisma.Decimal(valor).dividedBy(divisor).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0);
    const datosCorreccion: DatosCotizacion = q.pricesIncludeVat ? {
      ...datos,
      lines: datos.lines.map(l => ({ ...l, unitPrice: aNeto(l.unitPrice) })),
      discount: datos.discount.modo === "MONTO" ? { modo: "MONTO", valor: aNeto(datos.discount.valor) } : datos.discount,
    } : datos;
    return { pricesIncludeVat: q.pricesIncludeVat, datosCorreccion, id: q.id, version: q.version, folio: folio.folio, status: q.status, datos, historico: {
      clientName: q.clientName, clientRut: q.clientRut, clientContact: q.clientContact, clientPhone: q.clientPhone, clientEmail: q.clientEmail, branchName: q.branchName, branchAddress: q.branchAddress, branchCity: q.branchCity,
      branchContact: q.branchContact, branchPhone: q.branchPhone, branchEmail: q.branchEmail,
      paymentConditionName: q.paymentConditionName, paymentTermDays: q.paymentTermDays,
      bankName: q.bankName, bankAccountNumber: q.bankAccountNumber, bankAccountType: q.bankAccountType, bankHolderName: q.bankHolderName, bankHolderRut: q.bankHolderRut, bankEmail: q.bankEmail,
      companySnapshot: q.companySnapshot, correctedQuoteId: q.correctedQuoteId,
      vatRate: q.vatRate!.toString(), subtotal: q.subtotal!.toFixed(0), discountAmount: q.discountAmount!.toFixed(0), netAmount: q.netAmount!.toFixed(0), vatAmount: q.vatAmount!.toFixed(0), totalAmount: q.totalAmount.toFixed(0),
      units: detalles.map(l => ({ name: l.unitName, abbreviation: l.unitAbbreviation, code: l.productCode ?? l.rawMaterialCode })),
    } };
  }, { isolationLevel: "RepeatableRead" });
}
export type ListadoCotizaciones = Awaited<ReturnType<typeof consultarCotizaciones>>;
export type CatalogosCotizacion = Awaited<ReturnType<typeof catalogosCotizacion>>;
export type CotizacionConsultada = Awaited<ReturnType<typeof obtenerCotizacion>>;
