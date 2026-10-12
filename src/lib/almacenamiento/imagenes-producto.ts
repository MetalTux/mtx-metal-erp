import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
export const MAX_IMAGENES_PRODUCTO = 10;
export const MAX_BYTES_IMAGEN_PRODUCTO = 2 * 1024 * 1024;
export const URL_IMAGEN_PRODUCTO = "/api/productos/imagenes/";
export const claveImagenValida = (clave: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/.test(clave);
/** Sustituir el adaptador de esta fábrica para usar S3 conservando claves y URLs del ERP. */
export interface AlmacenImagenesProducto {
  guardar(contenido: Buffer): Promise<string>;
  leer(clave: string): Promise<Buffer>;
  eliminar(clave: string): Promise<void>;
}
class AlmacenLocal implements AlmacenImagenesProducto {
  private readonly directorio = process.env.PRODUCTO_IMAGEN_DIR || path.join(process.cwd(), "var/productos/imagenes");
  async guardar(contenido: Buffer) {
    await mkdir(this.directorio, { recursive: true });
    const clave = `${randomUUID()}.png`;
    await writeFile(path.join(this.directorio, clave), contenido, { flag: "wx" });
    return clave;
  }
  async leer(clave: string) { if (!claveImagenValida(clave)) throw new Error("Clave de imagen inválida."); return readFile(path.join(this.directorio, clave)); }
  async eliminar(clave: string) { if (!claveImagenValida(clave)) throw new Error("Clave de imagen inválida."); await unlink(path.join(this.directorio, clave)); }
}
export function almacenImagenesProducto(): AlmacenImagenesProducto { return new AlmacenLocal(); }
export async function prepararImagenProducto(archivo: File) {
  if (!(archivo instanceof File) || !archivo.size || archivo.size > MAX_BYTES_IMAGEN_PRODUCTO) throw new Error("La imagen debe pesar hasta 2 MB y no estar vacía.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) throw new Error("Selecciona imágenes PNG, JPG o WebP.");
  try {
    const imagen = sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 16_000_000, failOn: "warning" });
    const metadata = await imagen.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Formato inválido.");
    // Reprocesar elimina metadatos/contenido activo y genera versiones inmutables.
    return await imagen.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch { throw new Error("La imagen no es PNG, JPG o WebP válida, o supera 16 megapíxeles."); }
}
