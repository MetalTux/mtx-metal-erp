import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { almacenPdfTrabajo } from "@/lib/almacenamiento/pdfs-trabajo";
import { almacenImagenesCotizacion } from "@/lib/almacenamiento/imagenes-cotizacion";
import { almacenLogo, URL_LOGO } from "@/lib/almacenamiento/logo-empresa";
import { documentoVacioCotizacion, validarTextoCotizacion, clavesImagenesCotizacion, CLAVE_IMAGEN_COTIZACION, URL_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";
const referenciaTrabajoSchema=z.object({id:z.number().int().positive(),version:z.number().int().positive()}).strict();
const claveTrabajoSchema=z.uuid().transform(v=>v.toLowerCase());
import { VERSION_PLANTILLA_PDF_TRABAJO as VERSION_PLANTILLA_PDF } from "@/lib/pdf/plantilla-trabajo";
import type { DocumentoPdfTrabajo, OrigenPdfTrabajo } from "@/lib/pdf/documento-trabajo";
import { renderizarTrabajoPdf } from "@/lib/pdf/renderizar-trabajo";
class ReglaPdf extends Error {}
const exigir = (v: unknown, mensaje: string) => { if (!v) throw new ReglaPdf(mensaje); };
export const hashPdf = (datos: Buffer | string) => createHash("sha256").update(datos).digest("hex");
const serializar = (v: unknown) => JSON.parse(JSON.stringify(v, (_clave, valor) => typeof valor === "bigint" ? valor.toString() : valor)) as Prisma.InputJsonObject;
async function capturar(tx: Prisma.TransactionClient, id: number) {
  const w = await tx.workOrder.findUnique({where:{id}});
  if (!w || w.schemaVersion!==1 || !w.folioId) throw new ReglaPdf("La OT legada requiere conciliación antes de emitir PDF.");
  const [fila] = await tx.$queryRaw<{origen:OrigenPdfTrabajo}[]>`SELECT public.snapshot_pdf_trabajo(${id}) AS origen`;
  const origen=fila.origen;
  const documento:DocumentoPdfTrabajo={folio:origen.folio.folio,version:w.version,status:w.status,origen};
  return {schemaVersion:1,documento,origen:serializar(origen),recursos:[] as {url:string;hash:string}[]};
}
async function recursosPdf(snapshot: Awaited<ReturnType<typeof capturar>>) {
  const recursos: Record<string,string> = {};
  const urls = clavesImagenesCotizacion(validarTextoCotizacion(snapshot.documento.origen.plan.header.technicalDescription??documentoVacioCotizacion)).map(k => URL_IMAGEN_COTIZACION+k);
  const logo=snapshot.documento.origen.company.logoUrl;
  if (typeof logo==="string" && logo) urls.push(logo);
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
export async function emitirPdfTrabajo(referencia: unknown, clave: unknown) {
  await exigirAcceso("trabajos.operar");

  const r = referenciaTrabajoSchema.safeParse(referencia), c = claveTrabajoSchema.safeParse(clave);
  if (!r.success || !c.success) return { ok: false as const, mensaje: "Referencia de emisión inválida." };
  const fingerprint = hashPdf(JSON.stringify({ ...r.data, plantilla: VERSION_PLANTILLA_PDF }));
  let archivo: string | undefined;
  try {
    const repetida = await prisma.workOrderPdfRequest.findUnique({ where: { idempotencyKey: c.data } });
    if (repetida) { exigir(repetida.fingerprint === fingerprint, "Esta clave ya se utilizó para otra emisión."); return { ok: true as const, id: repetida.emissionId }; }
    const existente=await prisma.workOrderPdfEmission.findUnique({where:{workOrderId_workOrderVersion_templateVersion:{workOrderId:r.data.id,workOrderVersion:r.data.version,templateVersion:VERSION_PLANTILLA_PDF}}});
    if(existente){
      await prisma.$transaction(async tx=>{
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${c.data},91425))`;
        const anterior=await tx.workOrderPdfRequest.findUnique({where:{idempotencyKey:c.data}});
        if(anterior){exigir(anterior.fingerprint===fingerprint,"Esta clave ya se utilizó para otra emisión.");return;}
        await tx.workOrderPdfRequest.create({data:{idempotencyKey:c.data,fingerprint,emissionId:existente.id}});
      });
      return {ok:true as const,id:existente.id};
    }
    const snapshot = await prisma.$transaction(tx => capturar(tx, r.data.id), { isolationLevel: "RepeatableRead" });
    exigir(snapshot.documento.version === r.data.version, "La OT cambió. Actualiza el listado antes de emitir.");
    const origenHash = hashPdf(JSON.stringify(snapshot.origen));
    const equivalente = await prisma.workOrderPdfEmission.findUnique({ where: { workOrderId_workOrderVersion_templateVersion: { workOrderId: r.data.id, workOrderVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF } } });
    let bytes: Buffer | undefined;
    const id = randomUUID();
    if (!equivalente) {
      const recursos = await recursosPdf(snapshot);
      bytes = await renderizarTrabajoPdf(snapshot.documento, recursos);
      exigir(bytes.subarray(0,5).toString() === "%PDF-" && bytes.length <= 50 * 1024 * 1024, "El PDF generado supera el límite permitido o no es válido.");
      archivo = `${id}.pdf`; await almacenPdfTrabajo().guardar(archivo, bytes);
    }
    const resultado = await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "trabajos.operar");

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${c.data}, 91425))`;
      const anterior = await tx.workOrderPdfRequest.findUnique({ where: { idempotencyKey: c.data } });
      if (anterior) { exigir(anterior.fingerprint === fingerprint, "Esta clave ya se utilizó para otra emisión."); return anterior.emissionId; }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${r.data.id}, 91426)`;
      await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id = ${r.data.id} FOR SHARE`;
      const actual = await capturar(tx, r.data.id);
      exigir(actual.documento.version === r.data.version && hashPdf(JSON.stringify(actual.origen)) === origenHash, "La OT cambió durante la generación. Actualiza y vuelve a emitir.");
      let emision = await tx.workOrderPdfEmission.findUnique({ where: { workOrderId_workOrderVersion_templateVersion: { workOrderId: r.data.id, workOrderVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF } } });
      if (!emision) {
        exigir(bytes && archivo, "No se pudo confirmar el archivo generado.");
        emision = await anotarMutacion(tx, "workOrderPdfEmission", "create", await tx.workOrderPdfEmission.create({ data: { id, workOrderId: r.data.id, workOrderVersion: r.data.version, templateVersion: VERSION_PLANTILLA_PDF, snapshotVersion: 1, status: snapshot.documento.status as "PENDIENTE" | "EN_PROCESO" | "FINALIZADO" | "ANULADO", folio: snapshot.documento.folio, snapshot: serializar(snapshot), fileKey: archivo!, fileSize: bytes!.length, fileHash: hashPdf(bytes!) } }));
      }
      await tx.workOrderPdfRequest.create({ data: { idempotencyKey: c.data, fingerprint, emissionId: emision.id } });
      return emision.id;
    }, { timeout: 15000 });
    return { ok: true as const, id: resultado };
  } catch (error) {
    if (!(error instanceof ReglaPdf)) console.error("Error al emitir PDF de OT:", error);
    return { ok: false as const, incierto: !(error instanceof ReglaPdf), mensaje: error instanceof ReglaPdf ? error.message : "No se pudo confirmar la emisión. Reintenta con la misma solicitud; si continúa, revisa la configuración de emisión." };
  } finally {
    if (archivo) {
      // También elimina el archivo perdedor de una emisión concurrente.
      try { if (!await prisma.workOrderPdfEmission.findUnique({ where: { fileKey: archivo }, select: { id: true } })) await almacenPdfTrabajo().eliminar(archivo); }
      catch { console.error("No se pudo verificar un PDF nuevo; conservar para revisión, sin borrado ante resultado incierto."); }
    }
  }
}
export async function historialPdfTrabajo(id: number) {
  await exigirAcceso("trabajos.leer");

  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Referencia inválida.");
  const filas = await prisma.workOrderPdfEmission.findMany({ where: { workOrderId: id }, orderBy: [{ workOrderVersion: "desc" }, { createdAt: "desc" }], select: { id: true, workOrderVersion: true, status: true, folio: true, templateVersion: true, createdAt: true } });
  return filas.map(f => ({ ...f, createdAt: f.createdAt.toISOString() }));
}
export async function leerPdfTrabajo(id: string) {
  await exigirAcceso("trabajos.leer");

  if (!z.string().uuid().safeParse(id).success) throw new Error("Referencia inválida.");
  const emision = await prisma.workOrderPdfEmission.findUniqueOrThrow({ where: { id } });
  const bytes = await almacenPdfTrabajo().leer(emision.fileKey);
  if (bytes.length !== emision.fileSize || hashPdf(bytes) !== emision.fileHash) throw new Error("El PDF archivado no coincide con su huella; revisar respaldo.");
  return { bytes, emision };
}
