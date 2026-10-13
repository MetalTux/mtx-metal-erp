import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { almacenPdfCotizacion } from "@/lib/almacenamiento/pdfs-cotizacion";
import { almacenImagenesCotizacion } from "@/lib/almacenamiento/imagenes-cotizacion";
import { almacenLogo, URL_LOGO } from "@/lib/almacenamiento/logo-empresa";
import { documentoVacioCotizacion, validarTextoCotizacion, clavesImagenesCotizacion, CLAVE_IMAGEN_COTIZACION, URL_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";
import { referenciaCotizacionSchema, claveCotizacionSchema } from "@/lib/validaciones/cotizacion";
import { rutValido } from "@/lib/validaciones/rut";
import { VERSION_PLANTILLA_PDF, type DocumentoPdfCotizacion } from "@/lib/pdf/plantilla-cotizacion";
import { renderizarCotizacionPdf } from "@/lib/pdf/renderizar-cotizacion";
class ReglaPdf extends Error {}
const exigir = (v: unknown, mensaje: string) => { if (!v) throw new ReglaPdf(mensaje); };
export const hashPdf = (datos: Buffer | string) => createHash("sha256").update(datos).digest("hex");
const compania = z.object({ legalName: z.string().trim().min(1), rut: z.string().refine(rutValido), address: z.string().trim().min(1), city: z.string().trim().min(1) }).catchall(z.string().nullable());
const serializar = (v: unknown) => JSON.parse(JSON.stringify(v, (_clave, valor) => typeof valor === "bigint" ? valor.toString() : valor)) as Prisma.InputJsonObject;
async function capturar(tx: Prisma.TransactionClient, id: number) {
  const q = await tx.quote.findUnique({ where: { id } });
  if (!q || !q.folioId || q.deletedAt) throw new ReglaPdf("La cotización no está disponible para una nueva emisión.");
  const emisor = compania.safeParse(q.companySnapshot);
  if (!emisor.success) throw new ReglaPdf("Los datos históricos del emisor deben incluir razón social, RUT válido, dirección y ciudad. Completa Empresa y, si la cotización está Pendiente, utiliza Actualizar emisor desde Empresa. En otros estados crea una nueva cotización o corrección; no se reemplazan datos históricos automáticamente.");
  exigir(q.clientRut && rutValido(q.clientRut), "El RUT histórico del cliente no tiene un dígito verificador válido. Corrige el cliente y utiliza una nueva cotización o corrección.");
  exigir(!q.bankName || (q.bankHolderRut && rutValido(q.bankHolderRut)), "El RUT histórico del titular de la cuenta no es válido. Revisa la cuenta y utiliza una nueva cotización o corrección.");
  const detalles = await tx.quoteDetail.findMany({ where: { quoteId: id }, orderBy: { position: "asc" } });
  const folio = await tx.documentFolio.findUniqueOrThrow({ where: { id: q.folioId } });
  exigir(detalles.length && q.subtotal !== null && q.netAmount !== null && q.vatAmount !== null && q.vatRate !== null, "La cotización no tiene los importes históricos necesarios para emitir.");
  const documento: DocumentoPdfCotizacion = {
    folio: folio.folio, version: q.version, status: q.status, date: q.date.toISOString().slice(0,10), validUntil: q.validUntil?.toISOString().slice(0,10) ?? null,
    company: emisor.data, client: { name: q.clientName, rut: q.clientRut, branchName: q.branchName, address: q.branchAddress, city: q.branchCity, contact: q.branchContact, phone: q.branchPhone, email: q.branchEmail },
    bank: { name: q.bankName, type: q.bankAccountType, number: q.bankAccountNumber, holder: q.bankHolderName, rut: q.bankHolderRut, email: q.bankEmail },
    paymentCondition: q.paymentConditionName ?? "", paymentDays: q.paymentTermDays, commercialTerms: q.commercialTerms,
    technicalDescription: validarTextoCotizacion(q.technicalDescription ?? documentoVacioCotizacion),
    subtotal: q.subtotal!.toFixed(0), discountAmount: q.discountAmount!.toFixed(0), netAmount: q.netAmount!.toFixed(0), vatAmount: q.vatAmount!.toFixed(0), vatRate: q.vatRate!.toString(), totalAmount: q.totalAmount.toFixed(0),
    lines: detalles.map(l => ({ description: l.description, quantity: l.quantity.toString(), unitPrice: l.unitPrice.toFixed(0), lineAmount: l.lineAmount!.toFixed(0), unitName: l.unitName ?? "", code: l.productCode ?? l.rawMaterialCode, kind: l.kind! })),
  };
  // Incluye todos los campos escalares originales, no sólo los usados por la plantilla.
  return { schemaVersion: 1, documento, origen: serializar({ quote: q, details: detalles, folio }), recursos: [] as { url: string; hash: string }[] };
}
async function recursosPdf(snapshot: Awaited<ReturnType<typeof capturar>>) {
  const recursos: Record<string,string> = {};
  const urls = clavesImagenesCotizacion(snapshot.documento.technicalDescription).map(k => URL_IMAGEN_COTIZACION+k);
  if (snapshot.documento.company.logoUrl) urls.push(snapshot.documento.company.logoUrl);
  for (const url of urls) {
    let contenido: Buffer;
    try {
      if (url.startsWith(URL_IMAGEN_COTIZACION) && CLAVE_IMAGEN_COTIZACION.test(url.slice(URL_IMAGEN_COTIZACION.length))) contenido = await almacenImagenesCotizacion().leer(url.slice(URL_IMAGEN_COTIZACION.length));
      else if (url.startsWith(URL_LOGO) && CLAVE_IMAGEN_COTIZACION.test(url.slice(URL_LOGO.length))) contenido = await almacenLogo().leer(url.slice(URL_LOGO.length));
      else throw new Error("Referencia inválida");
    } catch { throw new ReglaPdf("No se pudo leer una imagen o el logo histórico. Revisa los archivos respaldados antes de emitir."); }
    recursos[url] = `data:image/png;base64,${contenido.toString("base64")}`;
    snapshot.recursos.push({ url, hash: hashPdf(contenido) });
  }
  return recursos;
}
/** Copia coherente → render fuera de tx → comprobar revisión y archivar juntos.
 * Los archivos nuevos sólo se limpian tras confirmar que la BD no los referencia.
 */
export async function emitirPdfCotizacion(referencia: unknown, clave: unknown) {
  const r = referenciaCotizacionSchema.safeParse(referencia), c = claveCotizacionSchema.safeParse(clave);
  if (!r.success || !c.success) return { ok: false as const, mensaje: "Referencia de emisión inválida." };
  const fingerprint = hashPdf(JSON.stringify({ ...r.data, plantilla: VERSION_PLANTILLA_PDF }));
  let archivo: string | undefined;
  try {
    const repetida = await prisma.quotePdfRequest.findUnique({ where: { idempotencyKey: c.data } });
    if (repetida) { exigir(repetida.fingerprint === fingerprint, "Esta clave ya se utilizó para otra emisión."); return { ok: true as const, id: repetida.emissionId }; }
    const snapshot = await prisma.$transaction(tx => capturar(tx, r.data.id), { isolationLevel: "RepeatableRead" });
    exigir(snapshot.documento.version === r.data.version, "La cotización cambió. Actualiza el listado antes de emitir.");
    const origenHash = hashPdf(JSON.stringify(snapshot.origen));
    const equivalente = await prisma.quotePdfEmission.findUnique({ where: { quoteId_quoteVersion_templateVersion: { quoteId: r.data.id, quoteVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF } } });
    let bytes: Buffer | undefined;
    const id = randomUUID();
    if (!equivalente) {
      const recursos = await recursosPdf(snapshot);
      bytes = await renderizarCotizacionPdf(snapshot.documento, recursos);
      exigir(bytes.subarray(0,5).toString() === "%PDF-" && bytes.length <= 50 * 1024 * 1024, "El PDF generado supera el límite permitido o no es válido.");
      archivo = `${id}.pdf`; await almacenPdfCotizacion().guardar(archivo, bytes);
    }
    const resultado = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${c.data}, 73425))`;
      const anterior = await tx.quotePdfRequest.findUnique({ where: { idempotencyKey: c.data } });
      if (anterior) { exigir(anterior.fingerprint === fingerprint, "Esta clave ya se utilizó para otra emisión."); return anterior.emissionId; }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${r.data.id}, 73426)`;
      await tx.$queryRaw`SELECT id FROM "Quote" WHERE id = ${r.data.id} FOR SHARE`;
      const actual = await capturar(tx, r.data.id);
      exigir(actual.documento.version === r.data.version && hashPdf(JSON.stringify(actual.origen)) === origenHash, "La cotización cambió durante la generación. Actualiza y vuelve a emitir.");
      let emision = await tx.quotePdfEmission.findUnique({ where: { quoteId_quoteVersion_templateVersion: { quoteId: r.data.id, quoteVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF } } });
      if (!emision) {
        exigir(bytes && archivo, "No se pudo confirmar el archivo generado.");
        emision = await tx.quotePdfEmission.create({ data: { id, quoteId: r.data.id, quoteVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF, snapshotVersion: 1, status: snapshot.documento.status as "PENDIENTE" | "APROBADA" | "RECHAZADA", folio: snapshot.documento.folio, snapshot: serializar(snapshot), fileKey: archivo!, fileSize: bytes!.length, fileHash: hashPdf(bytes!) } });
      }
      await tx.quotePdfRequest.create({ data: { idempotencyKey: c.data, fingerprint, emissionId: emision.id } });
      return emision.id;
    }, { timeout: 15000 });
    return { ok: true as const, id: resultado };
  } catch (error) {
    if (!(error instanceof ReglaPdf)) console.error("Error al emitir PDF de Cotización:", error);
    return { ok: false as const, mensaje: error instanceof ReglaPdf ? error.message : "No se pudo confirmar la emisión. Reintenta con la misma solicitud; si continúa, revisa la configuración de emisión." };
  } finally {
    if (archivo) {
      // También elimina el archivo perdedor de una emisión concurrente.
      try { if (!await prisma.quotePdfEmission.findUnique({ where: { fileKey: archivo }, select: { id: true } })) await almacenPdfCotizacion().eliminar(archivo); }
      catch { console.error("No se pudo verificar un PDF nuevo; conservar para revisión, sin borrado ante resultado incierto."); }
    }
  }
}
export async function historialPdfCotizacion(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Referencia inválida.");
  const filas = await prisma.quotePdfEmission.findMany({ where: { quoteId: id }, orderBy: [{ quoteVersion: "desc" }, { createdAt: "desc" }], select: { id: true, quoteVersion: true, status: true, folio: true, templateVersion: true, createdAt: true } });
  return filas.map(f => ({ ...f, createdAt: f.createdAt.toISOString() }));
}
export async function leerPdfCotizacion(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new Error("Referencia inválida.");
  const emision = await prisma.quotePdfEmission.findUniqueOrThrow({ where: { id } });
  const bytes = await almacenPdfCotizacion().leer(emision.fileKey);
  if (bytes.length !== emision.fileSize || hashPdf(bytes) !== emision.fileHash) throw new Error("El PDF archivado no coincide con su huella; revisar respaldo.");
  return { bytes, emision };
}
