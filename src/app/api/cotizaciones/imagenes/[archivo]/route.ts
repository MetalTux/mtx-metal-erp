import { prisma } from "@/lib/prisma";
import { almacenImagenesCotizacion } from "@/lib/almacenamiento/imagenes-cotizacion";
import { CLAVE_IMAGEN_COTIZACION } from "@/lib/validaciones/texto-cotizacion";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  if (!CLAVE_IMAGEN_COTIZACION.test(archivo)) return new Response(null, { status: 404 });
  try {
    if (!await prisma.quoteImageFile.findUnique({ where: { fileKey: archivo }, select: { id: true } })) return new Response(null, { status: 404 });
    const bytes = await almacenImagenesCotizacion().leer(archivo);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return new Response(null, { status: 404 });
    console.error("No se pudo leer la imagen de Cotización:", error); return new Response(null, { status: 500 });
  }
}
