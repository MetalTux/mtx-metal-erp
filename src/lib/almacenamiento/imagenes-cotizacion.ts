import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLAVE_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";
// Reutilizamos el reprocesado seguro PNG/JPG/WebP (2 MB, 16 MP, salida PNG/1600).
export { prepararImagenProducto as prepararImagenCotizacion } from "./imagenes-producto";
export interface AlmacenImagenesCotizacion {
  guardar(contenido: Buffer): Promise<string>;
  leer(clave: string): Promise<Buffer>;
  eliminar(clave: string): Promise<void>;
}
class Local implements AlmacenImagenesCotizacion {
  private readonly directorio = process.env.COTIZACION_IMAGEN_DIR || path.join(process.cwd(), "var/cotizaciones/imagenes");
  async guardar(contenido: Buffer) {
    await mkdir(this.directorio, { recursive: true });
    const clave = `${randomUUID()}.png`;
    await writeFile(path.join(this.directorio, clave), contenido, { flag: "wx" });
    return clave;
  }
  async leer(clave: string) { this.validar(clave); return readFile(path.join(this.directorio, clave)); }
  async eliminar(clave: string) { this.validar(clave); await unlink(path.join(this.directorio, clave)); }
  private validar(clave: string) { if (!CLAVE_IMAGEN_COTIZACION.test(clave)) throw new Error("Clave de imagen inválida."); }
}
/** Cambiar únicamente esta fábrica al adoptar S3; documentos conservan sus URLs del ERP. */
export function almacenImagenesCotizacion(): AlmacenImagenesCotizacion { return new Local(); }
