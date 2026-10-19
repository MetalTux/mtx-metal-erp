import { NextResponse } from "next/server";
import { leerPdfTrabajo } from "@/lib/servicios/pdfs-trabajo";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ emision: string }> }) {
  try {
    const { bytes, emision } = await leerPdfTrabajo((await params).emision);
    const nombre = `ot-${emision.folio.replace(/[^a-zA-Z0-9_-]/g, "_")}-r${emision.workOrderVersion}-p${emision.templateVersion}.pdf`;
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("descargar") === "1" ? "attachment" : "inline"}; filename="${nombre}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ mensaje: "No se pudo leer el PDF archivado. Revisa la referencia y el respaldo del archivo." }, { status: 404 }); }
}
