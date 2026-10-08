import { almacenLogo } from "@/lib/almacenamiento/logo-empresa";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  try {
    const contenido = await almacenLogo().leer(archivo);
    return new Response(new Uint8Array(contenido), { headers: { "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (error) {
    if (error instanceof Error && (error.message === "Nombre de logo inválido." || ("code" in error && error.code === "ENOENT"))) return new Response(null, { status: 404 });
    console.error("Error al leer logo de Empresa:", error);
    return new Response(null, { status: 500 });
  }
}
