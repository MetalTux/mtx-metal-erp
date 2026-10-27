import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { almacenPdfGuia } from "@/lib/almacenamiento/pdfs-guia";
import { almacenLogo, URL_LOGO } from "@/lib/almacenamiento/logo-empresa";
import { CLAVE_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";
import { VERSION_PLANTILLA_PDF_GUIA } from "@/lib/pdf/plantilla-guia";
import { objetoGuia, validarOrigenPdfGuia, type DocumentoPdfGuia, type OrigenPdfGuia } from "@/lib/pdf/documento-guia";
import { renderizarGuiaPdf } from "@/lib/pdf/renderizar-guia";
const referenciaSchema = z.object({ id: z.number().int().positive().max(2147483647) }).strict();
const claveSchema = z.uuid().transform(v => v.toLowerCase());
class ReglaPdfGuia extends Error {}
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaPdfGuia(mensaje); }
export const hashPdfGuia = (v: Buffer | string) => createHash("sha256").update(v).digest("hex");
const serializar = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonObject;
async function capturar(tx: Prisma.TransactionClient, id: number) {
  const [fila] = await tx.$queryRaw<{ origen: OrigenPdfGuia | null }[]>`SELECT public.snapshot_pdf_guia(${id}) AS origen`;
  exigir(fila.origen, "La guía legada o inexistente no admite emisión PDF.");
  const origen = fila.origen;
  try { validarOrigenPdfGuia(origen); } catch (e) { throw new ReglaPdfGuia(e instanceof Error ? e.message : "La copia histórica está incompleta."); }
  const documento: DocumentoPdfGuia = { folio: origen.folio, kind: origen.header.kind as "ENTREGA" | "CORRECCION", origen };
  return { schemaVersion: 1, documento, origen, recursos: [] as { url: string; hash: string }[] };
}
async function cargarRecursos(snapshot: Awaited<ReturnType<typeof capturar>>) {
  const logo = objetoGuia(snapshot.origen.header.companySnapshot).logoUrl;
  const recursos: Record<string, string> = {};
  if (logo === null || logo === undefined || logo === "") return recursos;
  exigir(typeof logo === "string" && logo.startsWith(URL_LOGO) && CLAVE_IMAGEN_COTIZACION.test(logo.slice(URL_LOGO.length)), "El logo histórico tiene una referencia inválida.");
  try {
    const bytes = await almacenLogo().leer(logo.slice(URL_LOGO.length));
    recursos[logo] = `data:image/png;base64,${bytes.toString("base64")}`;
    snapshot.recursos.push({ url: logo, hash: hashPdfGuia(bytes) });
  } catch { throw new ReglaPdfGuia("No se pudo leer el logo histórico. Revisa sus archivos respaldados antes de emitir."); }
  return recursos;
}
/** Capturar → render fuera de tx → verificar origen y archivar. Descargar nunca regenera. */
export async function emitirPdfGuia(referencia: unknown, clave: unknown) {
  await exigirAcceso("guias.operar");

  const r = referenciaSchema.safeParse(referencia), k = claveSchema.safeParse(clave);
  if (!r.success || !k.success) return { ok: false as const, mensaje: "Referencia de emisión inválida.", incierto: false };
  const idGuia = r.data.id, key = k.data, fingerprint = hashPdfGuia(JSON.stringify({ id: idGuia, plantilla: VERSION_PLANTILLA_PDF_GUIA }));
  let archivo: string | undefined;
  try {
    const anterior = await prisma.deliveryNotePdfRequest.findUnique({ where: { idempotencyKey: key } });
    if (anterior) { exigir(anterior.fingerprint === fingerprint, "El UUID ya pertenece a otra emisión."); return { ok: true as const, id: anterior.emissionId }; }
    const where = { deliveryNoteId_templateVersion: { deliveryNoteId: idGuia, templateVersion: VERSION_PLANTILLA_PDF_GUIA } };
    const existente = await prisma.deliveryNotePdfEmission.findUnique({ where });
    let snapshot: Awaited<ReturnType<typeof capturar>> | undefined, bytes: Buffer | undefined;
    const id = randomUUID();
    if (!existente) {
      snapshot = await prisma.$transaction(tx => capturar(tx, idGuia), { isolationLevel: "RepeatableRead" });
      const recursos = await cargarRecursos(snapshot);
      bytes = await renderizarGuiaPdf(snapshot.documento, recursos);
      exigir(bytes.subarray(0, 5).toString() === "%PDF-" && bytes.length <= 50 * 1024 * 1024, "El PDF generado no es válido o supera el límite permitido.");
      archivo = `${id}.pdf`; await almacenPdfGuia().guardar(archivo, bytes);
    }
    const resultado = await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "guias.operar");

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91435))`;
      const previa = await tx.deliveryNotePdfRequest.findUnique({ where: { idempotencyKey: key } });
      if (previa) { exigir(previa.fingerprint === fingerprint, "El UUID ya pertenece a otra emisión."); return previa.emissionId; }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${idGuia},91436)`;
      let emision = await tx.deliveryNotePdfEmission.findUnique({ where });
      if (!emision) {
        exigir(snapshot && bytes && archivo, "No se pudo confirmar el archivo generado.");
        await tx.$queryRaw`SELECT id FROM "DeliveryNote" WHERE id=${idGuia} FOR SHARE`;
        const actual = await capturar(tx, idGuia);
        exigir(hashPdfGuia(JSON.stringify(actual.origen)) === hashPdfGuia(JSON.stringify(snapshot.origen)), "El origen o nombre de bodega cambió durante la generación. Reintenta la emisión.");
        emision = await anotarMutacion(tx, "deliveryNotePdfEmission", "create", await tx.deliveryNotePdfEmission.create({ data: { id, deliveryNoteId: idGuia, templateVersion: VERSION_PLANTILLA_PDF_GUIA,
          snapshotVersion: 1, kind: snapshot.documento.kind, folio: snapshot.documento.folio, snapshot: serializar(snapshot),
          fileKey: archivo, fileSize: bytes.length, fileHash: hashPdfGuia(bytes) } }));
      }
      await tx.deliveryNotePdfRequest.create({ data: { idempotencyKey: key, fingerprint, emissionId: emision.id } });
      return emision.id;
    }, { timeout: 15_000 });
    return { ok: true as const, id: resultado };
  } catch (e) {
    if (!(e instanceof ReglaPdfGuia)) console.error("Error al emitir PDF de guía:", e);
    return { ok: false as const, incierto: !(e instanceof ReglaPdfGuia), mensaje: e instanceof ReglaPdfGuia ? e.message : "No se pudo confirmar la emisión. Reintenta con los mismos datos y UUID." };
  } finally {
    if (archivo) {
      try { if (!await prisma.deliveryNotePdfEmission.findUnique({ where: { fileKey: archivo }, select: { id: true } })) await almacenPdfGuia().eliminar(archivo); }
      catch { console.error("No se pudo verificar el PDF nuevo de guía; conservar para revisión ante resultado incierto."); }
    }
  }
}
export async function historialPdfGuia(id: number) {
  await exigirAcceso("guias.leer");

  referenciaSchema.parse({ id });
  const rows = await prisma.deliveryNotePdfEmission.findMany({ where: { deliveryNoteId: id }, orderBy: [{ templateVersion: "desc" }, { createdAt: "desc" }], select: { id: true, folio: true, kind: true, templateVersion: true, createdAt: true } });
  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
export async function leerPdfGuia(id: string) {
  await exigirAcceso("guias.leer");

  if (!z.uuid().safeParse(id).success) throw new Error("Referencia inválida.");
  const emision = await prisma.deliveryNotePdfEmission.findUniqueOrThrow({ where: { id } });
  const bytes = await almacenPdfGuia().leer(emision.fileKey);
  if (bytes.subarray(0, 5).toString() !== "%PDF-" || bytes.length !== emision.fileSize || hashPdfGuia(bytes) !== emision.fileHash) throw new Error("El PDF archivado no coincide con su huella. Revisa el respaldo.");
  return { bytes, emision };
}
