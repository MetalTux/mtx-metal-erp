import { NextResponse } from "next/server";
import { leerPdfCotizacion } from "@/lib/servicios/pdfs-cotizacion";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ emision: string }> }) {
  try {
    const { bytes, emision } = await leerPdfCotizacion((await params).emision);
    const nombre = `cotizacion-${emision.folio.replace(/[^a-zA-Z0-9_-]/g, "_")}-r${emision.quoteVersion}-p${emision.templateVersion}.pdf`;
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("descargar") === "1" ? "attachment" : "inline"}; filename="${nombre}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ mensaje: "No se pudo leer el PDF archivado. Revisa la referencia y el respaldo del archivo." }, { status: 404 }); }
}
