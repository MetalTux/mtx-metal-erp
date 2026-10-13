import { rutValido } from "@/lib/validaciones/rut";
import { createHash } from "node:crypto";
import { Prisma, type QuoteOperationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ivaParaDocumento } from "./iva";
import { asignarFolio } from "./numeracion";
import { datosBancariosParaCotizacion } from "./cuentas-bancarias";
import { calcularImportesCotizacion } from "./importes-cotizacion";
import { cotizacionSchema, claveCotizacionSchema, referenciaCotizacionSchema, type DatosCotizacion } from "@/lib/validaciones/cotizacion";
import { clavesImagenesCotizacion } from "@/lib/validaciones/texto-cotizacion";

class ReglaCotizacion extends Error {}
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaCotizacion(mensaje); }
export type ResultadoCotizacion = { ok: true; mensaje: string; id: number; version: number } | { ok: false; mensaje: string };
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const fecha = (v: string) => new Date(`${v}T00:00:00Z`);
const huella = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fallo(error: unknown): ResultadoCotizacion {
  if (error instanceof ReglaCotizacion) return { ok: false, mensaje: error.message };
  console.error("Error en Cotizaciones:", error);
  return { ok: false, mensaje: "No se pudo confirmar la cotización. Actualiza el listado para comprobar el resultado antes de reintentar." };
}
async function anterior(tx: Prisma.TransactionClient, clave: string, fingerprint: string, type: QuoteOperationType) {
  // Serializar UUID antes de versiones; también esperar reintentos aún no confirmados.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 73422))`;
  const op = await tx.quoteOperation.findUnique({ where: { idempotencyKey: clave } });
  if (!op) return;
  exigir(op.fingerprint === fingerprint && op.type === type, "La clave de operación ya se utilizó con otros datos.");
  return { ok: true as const, mensaje: "La operación ya había sido confirmada.", id: op.quoteId, version: op.version };
}
async function editable(tx: Prisma.TransactionClient, id: number, version: number) {
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${id} FOR UPDATE`;
  const q = await tx.quote.findUnique({ where: { id } });
  exigir(q && q.folioId !== null && q.version === version, "La cotización cambió. Actualiza el listado y vuelve a abrirla.");
  exigir(q.status === "PENDIENTE" && !q.deletedAt, "Sólo se puede modificar una cotización pendiente.");
  exigir(!await tx.salesOrder.findFirst({ where: { quoteId: id }, select: { id: true } }), "La cotización tiene una Orden de Compra Cliente y está protegida.");
  return q;
}
/** Crear/editar incluye folio, copias, líneas, imágenes e importes en una sola tx. */
export async function guardarCotizacion(entrada: unknown, claveEntrada: unknown, referencia?: unknown, correccion?: unknown): Promise<ResultadoCotizacion> {
  const v = cotizacionSchema.safeParse(entrada), c = claveCotizacionSchema.safeParse(claveEntrada);
  const r = referencia === undefined ? undefined : referenciaCotizacionSchema.safeParse(referencia);
  const original = correccion === undefined ? undefined : referenciaCotizacionSchema.safeParse(correccion);
  if (!v.success) return { ok: false, mensaje: v.error.issues[0].message };
  if (!c.success || (r && !r.success) || (original && !original.success) || (r && original)) return { ok: false, mensaje: "La referencia de la operación no es válida." };
  const d = v.data, tipo = r ? "EDITAR" : original ? "CORREGIR" : "CREAR";
  // Ausencia de condiciones conserva la huella anterior a este campo nuevo:
  // un reintento de una solicitud ya confirmada no debe cambiar de identidad.
  const { commercialTerms, ...datosAnteriores } = d;
  const datosHuella = commercialTerms ? { ...datosAnteriores, commercialTerms } : datosAnteriores;
  const fingerprint = huella({ tipo, datos: datosHuella, referencia: r?.data ?? null, correccion: original?.data ?? null });
  try {
    exigir(d.date <= hoy(), "La fecha de cotización no puede ser futura.");
    return await prisma.$transaction(async tx => {
      const repetida = await anterior(tx, c.data, fingerprint, tipo); if (repetida) return repetida;
      // IVA compartido antes de bloquear documento/catálogos; configuración usa exclusivo.
      const iva = await ivaParaDocumento(tx, d.date);
      const actual = r?.success ? await editable(tx, r.data.id, r.data.version) : undefined;
      if (original?.success) {
        await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${original.data.id} FOR SHARE`;
        const origen = await tx.quote.findUnique({ where: { id: original.data.id } });
        exigir(origen && origen.folioId && origen.version === original.data.version && origen.status !== "PENDIENTE" && !origen.deletedAt, "La corrección requiere una cotización aprobada o rechazada vigente en el listado.");
      }
      await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${d.clientId} FOR SHARE`;
      const cliente = await tx.client.findUnique({ where: { id: d.clientId } });
      exigir(cliente, "El cliente ya no está disponible.");
      await tx.$queryRaw`SELECT id FROM "ClientBranch" WHERE id = ${d.clientBranchId} FOR SHARE`;
      const sucursal = await tx.clientBranch.findUnique({ where: { id: d.clientBranchId } });
      exigir(sucursal?.clientId === d.clientId && !sucursal.legacyIncomplete && sucursal.address && sucursal.city && sucursal.contact && sucursal.phone, "Completa Dirección, Ciudad y contacto de la sucursal antes de cotizar.");
      await tx.$queryRaw`SELECT id FROM "PaymentCondition" WHERE id = ${d.paymentConditionId} FOR SHARE`;
      const condicion = await tx.paymentCondition.findUnique({ where: { id: d.paymentConditionId } });
      exigir(condicion, "La condición de pago ya no está disponible.");
      const conservarBanco = actual && actual.bankAccountId === d.bankAccountId;
      const banco = conservarBanco ? {
        bankAccountId: actual.bankAccountId, bankName: actual.bankName, bankAccountType: actual.bankAccountType,
        bankAccountNumber: actual.bankAccountNumber, bankHolderName: actual.bankHolderName, bankHolderRut: actual.bankHolderRut, bankEmail: actual.bankEmail,
      } : { bankAccountId: null, bankName: null, bankAccountType: null, bankAccountNumber: null, bankHolderName: null, bankHolderRut: null, bankEmail: null, ...await datosBancariosParaCotizacion(tx, d.bankAccountId) };
      await tx.$queryRaw`SELECT id FROM "CompanyProfile" WHERE id = 1 FOR SHARE`;
      const empresa = await tx.companyProfile.findUnique({ where: { id: 1 } });
      const emisor = actual?.companySnapshot ?? (empresa ? {
        legalName: empresa.legalName, tradeName: empresa.tradeName, rut: empresa.rut, businessActivity: empresa.businessActivity,
        address: empresa.address, commune: empresa.commune, city: empresa.city, email: empresa.email, phone: empresa.phone, logoUrl: empresa.logoUrl,
      } : {});
      // Bloquear materias primas ascendentes antes de productos, igual que Recetas.
      const materiales = [...new Set(d.lines.flatMap(l => l.rawMaterialId ? [l.rawMaterialId] : []))].sort((a, b) => a - b);
      for (const id of materiales) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id = ${id} FOR SHARE`;
      const productos = [...new Set(d.lines.flatMap(l => l.productId ? [l.productId] : []))].sort((a, b) => a - b);
      // El trigger histórico QuoteDetail_product toma FOR UPDATE. Usar aquí el
      // mismo bloqueo evita que dos cotizaciones intenten ascender SHARE a UPDATE.
      for (const id of productos) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
      const unidades = [...new Set(d.lines.map(l => l.unitMeasureId))].sort((a, b) => a - b);
      for (const id of unidades) await tx.$queryRaw`SELECT id FROM "UnitMeasure" WHERE id = ${id} FOR SHARE`;
      const raws = await tx.rawMaterial.findMany({ where: { id: { in: materiales } } });
      const products = await tx.product.findMany({ where: { id: { in: productos } } });
      const units = await tx.unitMeasure.findMany({ where: { id: { in: unidades } } });
      const importes = calcularImportesCotizacion({ lineas: d.lines.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), descuento: d.discount, tasaIva: iva.vatRate.toString() });
      const lineas = d.lines.map((l, i) => {
        const unidad = units.find(u => u.id === l.unitMeasureId), material = raws.find(m => m.id === l.rawMaterialId), producto = products.find(p => p.id === l.productId);
        exigir(unidad, "La unidad de una línea ya no está disponible.");
        if (l.kind === "MATERIA_PRIMA") exigir(material?.unitMeasureId === l.unitMeasureId, "La unidad del material cambió o el material no está disponible.");
        if (l.kind === "PRODUCTO") exigir(producto && !producto.deletedAt && producto.unitMeasureId === l.unitMeasureId, "El producto no está activo o su unidad cambió.");
        return { ...l, quantity: new Prisma.Decimal(l.quantity.replace(",", ".")), unitPrice: new Prisma.Decimal(l.unitPrice.replace(",", ".")), position: i + 1, lineAmount: importes.lineAmounts[i], unitName: unidad.name, unitAbbreviation: unidad.abbreviation,
          rawMaterialCode: material?.code ?? null, productCode: producto?.code ?? null, productUnitName: producto ? unidad.name : null, productUnitAbbreviation: producto ? unidad.abbreviation : null };
      });
      const claves = clavesImagenesCotizacion(d.technicalDescription);
      const archivos = await tx.quoteImageFile.findMany({ where: { fileKey: { in: claves } } });
      const vinculados = await tx.quoteImageLink.findMany({ where: { quoteId: { in: [actual?.id, original?.success ? original.data.id : undefined].filter((v): v is number => v !== undefined) } }, select: { imageId: true } });
      exigir(archivos.length === claves.length && archivos.every(a => a.draftKey === c.data || vinculados.some(v => v.imageId === a.id)), "Una imagen no pertenece a este borrador o documento.");
      const { lineAmounts: _lineAmounts, ...totales } = importes;
      void _lineAmounts;
      const data = { ...totales, ...iva, ...banco, date: fecha(d.date), validUntil: d.validUntil ? fecha(d.validUntil) : null,
        clientId: d.clientId, clientBranchId: d.clientBranchId,
        clientName: actual?.clientId === d.clientId ? actual.clientName : cliente.name, clientRut: actual?.clientId === d.clientId ? actual.clientRut : cliente.rut,
        clientContact: actual?.clientId === d.clientId ? actual.clientContact : cliente.contact, clientPhone: actual?.clientId === d.clientId ? actual.clientPhone : cliente.phone, clientEmail: actual?.clientId === d.clientId ? actual.clientEmail : cliente.email,
        branchName: sucursal.name, branchAddress: sucursal.address, branchCity: sucursal.city, branchContact: sucursal.contact, branchPhone: sucursal.phone, branchEmail: sucursal.email,
        paymentConditionId: condicion.id, paymentConditionName: actual?.paymentConditionId === condicion.id ? actual.paymentConditionName : condicion.name, paymentTermDays: actual?.paymentConditionId === condicion.id ? actual.paymentTermDays : condicion.days,
        commercialTerms: d.commercialTerms, companySnapshot: emisor as Prisma.InputJsonValue, technicalDescription: d.technicalDescription as Prisma.InputJsonValue,
        discountMode: d.discount.modo, discountValue: d.discount.modo === "SIN_DESCUENTO" ? null : new Prisma.Decimal(d.discount.valor) };
      let documento;
      if (actual) {
        await tx.quoteDetail.deleteMany({ where: { quoteId: actual.id } });
        await tx.quoteImageLink.deleteMany({ where: { quoteId: actual.id } });
        documento = await tx.quote.update({ where: { id: actual.id }, data: { ...data, version: { increment: 1 } } });
      } else {
        const folio = await asignarFolio(tx, "COTIZACION", c.data);
        documento = await tx.quote.create({ data: { ...data, folioId: folio.id, creationKey: c.data, correctedQuoteId: original?.success ? original.data.id : null } });
      }
      await tx.quoteDetail.createMany({ data: lineas.map(l => ({ ...l, quoteId: documento.id })) });
      if (archivos.length) await tx.quoteImageLink.createMany({ data: archivos.map(a => ({ quoteId: documento.id, imageId: a.id })) });
      await tx.quoteOperation.create({ data: { idempotencyKey: c.data, fingerprint, type: tipo, quoteId: documento.id, version: documento.version } });
      return { ok: true as const, mensaje: actual ? "Cotización actualizada." : "Cotización pendiente registrada; no modifica inventario.", id: documento.id, version: documento.version };
    }, { timeout: 30000 });
  } catch (error) { return fallo(error); }
}

/** Operación interna de aceptación: el llamador confirma la orden en esta misma tx. */
export async function aprobarCotizacionEnTransaccion(tx: Prisma.TransactionClient, referencia: { id: number; version: number }, clave: string) {
  const actual = await editable(tx, referencia.id, referencia.version);
  exigir(!actual.validUntil || actual.validUntil.toISOString().slice(0, 10) >= hoy(), "La cotización venció. Corrige la vigencia antes de aprobarla.");
  const q = await tx.quote.update({ where: { id: actual.id }, data: { version: { increment: 1 }, status: "APROBADA" } });
  await tx.quoteOperation.create({ data: { idempotencyKey: clave, fingerprint: huella({ tipo: "APROBAR", referencia }), type: "APROBAR", quoteId: q.id, version: q.version } });
  return q;
}

export async function resolverCotizacion(referencia: unknown, claveEntrada: unknown, accion: unknown): Promise<ResultadoCotizacion> {
  const r = referenciaCotizacionSchema.safeParse(referencia), c = claveCotizacionSchema.safeParse(claveEntrada);
  if (!r.success || !c.success || !["APROBAR", "RECHAZAR", "ELIMINAR"].includes(String(accion))) return { ok: false, mensaje: "La acción o referencia no es válida." };
  const tipo = accion as "APROBAR" | "RECHAZAR" | "ELIMINAR", fingerprint = huella({ tipo, referencia: r.data });
  try {
    return await prisma.$transaction(async tx => {
      const repetida = await anterior(tx, c.data, fingerprint, tipo); if (repetida) return repetida;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(73119)`;
      if (tipo === "APROBAR") {
        const q = await aprobarCotizacionEnTransaccion(tx, r.data, c.data);
        return { ok: true as const, mensaje: "Cotización aprobada; su contenido queda protegido.", id: q.id, version: q.version };
      }
      const actual = await editable(tx, r.data.id, r.data.version);
      const q = await tx.quote.update({ where: { id: actual.id }, data: { version: { increment: 1 }, ...(tipo === "ELIMINAR" ? { deletedAt: new Date() } : { status: "RECHAZADA" }) } });
      await tx.quoteOperation.create({ data: { idempotencyKey: c.data, fingerprint, type: tipo, quoteId: q.id, version: q.version } });
      return { ok: true as const, mensaje: tipo === "ELIMINAR" ? "Cotización ocultada; folio e historial conservados." : "Cotización rechazada; su contenido queda protegido.", id: q.id, version: q.version };
    });
  } catch (error) { return fallo(error); }
}
export type { DatosCotizacion };

/** Renovación expresa del emisor: no recalcular importes ni sustituir otros snapshots.
 * El UUID se reconoce antes de leer Empresa o comprobar la versión, para que un
 * reintento recupere su resultado aunque el perfil o la cotización hayan cambiado.
 */
export async function actualizarEmisorCotizacion(referencia: unknown, clave: unknown): Promise<ResultadoCotizacion> {
  const r = referenciaCotizacionSchema.safeParse(referencia), c = claveCotizacionSchema.safeParse(clave);
  if (!r.success || !c.success) return { ok: false, mensaje: "La referencia de la operación no es válida." };
  const fingerprint = huella({ accion: "ACTUALIZAR_EMISOR", referencia: r.data });
  try {
    return await prisma.$transaction(async tx => {
      const repetida = await anterior(tx, c.data, fingerprint, "EDITAR");
      if (repetida) return repetida;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(73119)`;
      const q = await editable(tx, r.data.id, r.data.version);
      await tx.$queryRaw`SELECT id FROM "CompanyProfile" WHERE id = 1 FOR SHARE`;
      const empresa = await tx.companyProfile.findUnique({ where: { id: 1 } });
      exigir(empresa, "Configura Empresa antes de actualizar el emisor.");
      exigir(empresa.legalName?.trim() && empresa.rut && rutValido(empresa.rut) && empresa.address?.trim() && empresa.city?.trim(),
        "Completa Empresa con razón social, RUT válido, dirección y ciudad antes de actualizar el emisor.");
      const companySnapshot = {
        legalName: empresa.legalName, tradeName: empresa.tradeName, rut: empresa.rut, businessActivity: empresa.businessActivity,
        address: empresa.address, commune: empresa.commune, city: empresa.city, email: empresa.email, phone: empresa.phone, logoUrl: empresa.logoUrl,
      };
      const documento = await tx.quote.update({ where: { id: q.id }, data: { companySnapshot, version: { increment: 1 } } });
      // El registro de operación satisface también la protección diferida en SQL.
      await tx.quoteOperation.create({ data: { idempotencyKey: c.data, fingerprint, type: "EDITAR", quoteId: q.id, version: documento.version } });
      return { ok: true as const, mensaje: "Emisor actualizado desde Empresa; se creó una nueva revisión.", id: q.id, version: documento.version };
    });
  } catch (error) { return fallo(error); }
}
