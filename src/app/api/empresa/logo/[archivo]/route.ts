import { accesoArchivo, referenciaArchivoVisible } from "@/lib/seguridad/archivos";
import { almacenLogo } from "@/lib/almacenamiento/logo-empresa";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const acceso = await accesoArchivo();
  if (acceso.respuesta) return acceso.respuesta;
  const { archivo } = await params;
  try {
    if (!/^[a-zA-Z0-9-]+\.png$/.test(archivo) || !await referenciaArchivoVisible(acceso.sesion!.roles, `/api/empresa/logo/${archivo}`, "logo")) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const contenido = await almacenLogo().leer(archivo);
    return new Response(new Uint8Array(contenido), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.message === "Nombre de logo inválido." || ("code" in error && error.code === "ENOENT"))) return new Response(null, { status: 404 });
    console.error("Error al leer logo de Empresa:", error);
    return new Response(null, { status: 500 });
  }
}
