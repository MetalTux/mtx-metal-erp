import { accesoArchivo } from "@/lib/seguridad/archivos";
import { prisma } from "@/lib/prisma";
import { almacenImagenesProducto, claveImagenValida } from "@/lib/almacenamiento/imagenes-producto";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const acceso = await accesoArchivo("catalogos.leer");
  if (acceso.respuesta) return acceso.respuesta;
  const { archivo } = await params;
  if (!claveImagenValida(archivo)) return new Response(null, { status: 404 });
  try {
    // Incluso versiones retiradas conservan su URL para documentos históricos futuros.
    if (!await prisma.productImage.findUnique({ where: { fileKey: archivo }, select: { id: true } })) return new Response(null, { status: 404 });
    const bytes = await almacenImagenesProducto().leer(archivo);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return new Response(null, { status: 404 });
    console.error("No se pudo leer una imagen de producto:", error); return new Response(null, { status: 500 });
  }
}
