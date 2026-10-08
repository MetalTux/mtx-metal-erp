import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const LIMITE_LOGO = 2 * 1024 * 1024;
export const URL_LOGO = "/api/empresa/logo/";
const archivoValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;

// Un adaptador futuro de S3 implementará este contrato conservando las URLs del ERP.
export interface AlmacenLogo {
  guardar(contenido: Buffer): Promise<string>;
  leer(archivo: string): Promise<Buffer>;
  eliminar(archivo: string): Promise<void>;
}
function comprobarArchivo(archivo: string) {
  if (!archivoValido.test(archivo)) throw new Error("Nombre de logo inválido.");
}
class AlmacenLocal implements AlmacenLogo {
  private readonly directorio = process.env.EMPRESA_LOGO_DIR || path.join(process.cwd(), "var/empresa/logos");
  async guardar(contenido: Buffer) {
    await mkdir(this.directorio, { recursive: true });
    const archivo = `${randomUUID()}.png`;
    await writeFile(path.join(this.directorio, archivo), contenido, { flag: "wx" });
    return archivo;
  }
  async leer(archivo: string) { comprobarArchivo(archivo);return readFile(path.join(this.directorio, archivo)); }
  async eliminar(archivo: string) { comprobarArchivo(archivo);await unlink(path.join(this.directorio, archivo)); }
}
export function almacenLogo(): AlmacenLogo { return new AlmacenLocal(); }

export async function prepararLogo(archivo: File): Promise<Buffer> {
  if (!archivo.size || archivo.size > LIMITE_LOGO) throw new Error("El logo debe pesar hasta 2 MB y no estar vacío.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) throw new Error("Selecciona un logo PNG, JPG o WebP.");
  try {
    const imagen = sharp(Buffer.from(await archivo.arrayBuffer()), { limitInputPixels: 16_000_000, failOn: "warning" });
    const metadata = await imagen.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Formato no permitido.");
    // Reprocesar elimina metadatos y evita guardar contenido activo o archivos disfrazados.
    return await imagen.rotate().resize(512, 512, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch { throw new Error("El logo no es una imagen PNG, JPG o WebP válida, o supera el límite de 16 megapíxeles."); }
}
