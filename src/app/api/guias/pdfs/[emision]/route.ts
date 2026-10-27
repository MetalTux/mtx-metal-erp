import { accesoArchivo } from "@/lib/seguridad/archivos";
import { NextResponse } from "next/server";
import { leerPdfGuia } from "@/lib/servicios/pdfs-guia";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ emision: string }> }) {
  const acceso = await accesoArchivo("guias.leer");
  if (acceso.respuesta) return acceso.respuesta;
  try {
    const { bytes, emision } = await leerPdfGuia((await params).emision);
    const nombre = `guia-${emision.folio.replace(/[^a-zA-Z0-9_-]/g, "_")}-p${emision.templateVersion}.pdf`;
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${new URL(request.url).searchParams.get("descargar") === "1" ? "attachment" : "inline"}; filename="${nombre}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ mensaje: "No se pudo leer el PDF archivado. Revisa su referencia y respaldo." }, { status: 404 }); }
}
