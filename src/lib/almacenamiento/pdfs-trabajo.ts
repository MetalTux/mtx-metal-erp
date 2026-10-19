import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
export const CLAVE_PDF = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;
export interface AlmacenPdfTrabajo {
  guardar(clave: string, contenido: Buffer): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  eliminar(clave: string): Promise<void>;
}
class Local implements AlmacenPdfTrabajo {
  private directorio = process.env.TRABAJO_PDF_DIR || path.join(process.cwd(), "var/trabajos/pdfs");
  private ruta(clave: string) { if (!CLAVE_PDF.test(clave)) throw new Error("Referencia de PDF inválida."); return path.join(this.directorio, clave); }
  async guardar(clave: string, contenido: Buffer) { await mkdir(this.directorio, { recursive: true }); await writeFile(this.ruta(clave), contenido, { flag: "wx" }); }
  async leer(clave: string) { return readFile(this.ruta(clave)); }
  async eliminar(clave: string) { await unlink(this.ruta(clave)); }
}
/** Sustituir esta fábrica al adoptar S3, conservando claves e historial. */
export function almacenPdfTrabajo(): AlmacenPdfTrabajo { return new Local(); }
