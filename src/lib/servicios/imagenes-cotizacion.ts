import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { almacenImagenesCotizacion, prepararImagenCotizacion } from "@/lib/almacenamiento/imagenes-cotizacion";
import { claveCotizacionSchema } from "@/lib/validaciones/cotizacion";
import { URL_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";

/** Subida de borrador idempotente. No crea cotización, folio ni movimientos. */
export async function cargarImagenCotizacion(form: FormData) {
  const borrador = claveCotizacionSchema.safeParse(form.get("draftKey"));
  const clave = claveCotizacionSchema.safeParse(form.get("uploadKey"));
  if (!borrador.success || !clave.success) return { ok: false as const, mensaje: "La referencia de la imagen no es válida." };
  let archivoNuevo: string | undefined;
  const almacen = almacenImagenesCotizacion();
  try {
    const contenido = await prepararImagenCotizacion(form.get("archivo") as File);
    const huella = createHash("sha256").update(contenido).digest("hex");
    const resultado = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave.data}, 73421))`;
      const anterior = await tx.quoteImageFile.findUnique({ where: { uploadKey: clave.data } });
      if (anterior) {
        if (anterior.draftKey !== borrador.data || anterior.fingerprint !== huella) throw new Error("La clave de subida ya se utilizó para otra imagen.");
        return anterior;
      }
      // Una imagen permanece como borrador hasta que un guardado la vincula al documento.
      archivoNuevo = await almacen.guardar(contenido);
      return tx.quoteImageFile.create({ data: { draftKey: borrador.data, uploadKey: clave.data, fileKey: archivoNuevo, fingerprint: huella } });
    }, { timeout: 20000 });
    return { ok: true as const, src: URL_IMAGEN_COTIZACION + resultado.fileKey };
  } catch (error) {
    if (archivoNuevo) {
      // Una pérdida de conexión puede ocultar un commit exitoso. Sólo limpiar
      // cuando otra lectura confirme que no existe referencia en PostgreSQL.
      try { if (!await prisma.quoteImageFile.findUnique({ where: { fileKey: archivoNuevo }, select: { id: true } })) await almacen.eliminar(archivoNuevo); }
      catch (e) { console.error("Se conserva la subida hasta poder verificar su referencia:", e); }
    }
    console.error("Error de imagen de Cotización:", error);
    return { ok: false as const, mensaje: "No se pudo subir la imagen. Usa PNG, JPG o WebP de hasta 2 MB; revisa la conexión y reintenta con la misma clave." };
  }
}
