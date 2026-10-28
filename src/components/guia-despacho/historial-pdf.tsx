"use client";
import { GrillaHistorial } from "@/components/grilla-historial";
import { usePermiso } from "@/components/seguridad/permisos";
import { useRef, useState } from "react";
import { emitirDocumentoGuia, consultarDocumentosGuia } from "@/app/(app)/trabajos/despachos/actions";
import type { historialPdfGuia } from "@/lib/servicios/pdfs-guia";
import { VERSION_PLANTILLA_PDF_GUIA } from "@/config/pdf-guias";
import { Button } from "@/components/ui/button";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { formatearFecha } from "@/lib/formato";
type Fila = Awaited<ReturnType<typeof historialPdfGuia>>[number];
export function HistorialPdfGuia({ id, iniciales, onBloqueo }: { id: number; iniciales: Fila[]; onBloqueo: (v: boolean) => void }) {
 const operar = usePermiso("guias.operar");

  const [filas, setFilas] = useState(iniciales), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [confirm, setConfirm] = useState(false), [error, setError] = useState<string>(), [selected, setSelected] = useState<Fila>();
  const running = useRef(false), key = useRef<string | undefined>(undefined), button = useRef<HTMLButtonElement>(null);
  const current = filas.find(f => f.templateVersion === VERSION_PLANTILLA_PDF_GUIA), url = (f: Fila) => `/api/guias/pdfs/${f.id}`;
  async function emitir() {
    if (running.current) return;
    running.current = true; setBusy(true); onBloqueo(true); key.current ??= crypto.randomUUID();
    try {
      const r = await emitirDocumentoGuia({ id }, key.current);
      if (!r.ok) { setError(r.mensaje); setUncertain(r.incierto); setConfirm(false); onBloqueo(r.incierto); return; }
      const h = await consultarDocumentosGuia(id);
      if (!h.ok) { setUncertain(true); setError("Emisión confirmada. Reintenta para recuperar el historial."); setConfirm(false); return; }
      setFilas(h.filas); setSelected(h.filas.find(f => f.id === r.id)); setConfirm(false); setUncertain(false); setError(undefined); onBloqueo(false);
    } catch { setError("Resultado incierto. Reintenta la emisión con la misma solicitud."); setConfirm(false); setUncertain(true); }
    finally { running.current = false; setBusy(false); }
  }
  return <section aria-label="PDF archivados de guía" className="min-w-0 space-y-3 rounded-md border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">PDF e historial de emisiones</h3>{(operar || current) && <Button ref={button} className="h-auto min-h-9 max-w-full whitespace-normal" disabled={busy} onClick={() => { if (uncertain) { void emitir(); return; } if (current) { setSelected(current); return; } setError(undefined); setConfirm(true); onBloqueo(true); }}>{uncertain ? "Reintentar emisión con la misma solicitud" : current ? "Ver PDF archivado" : "Generar PDF de guía"}</Button>}</div>
    <p className="text-xs text-muted-foreground">Documento interno en formato Carta, sin carácter tributario. Cada emisión conserva sus bytes; descargar no la regenera.</p>
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    {!filas.length ? <p className="text-sm text-muted-foreground">Sin emisiones archivadas.</p> : <GrillaHistorial titulo="Emisiones de guía" columnas={["Plantilla","Tipo documental","Estado","Fecha de emisión","Acciones"]} filas={filas.map(f=>({id:f.id,celdas:[f.templateVersion,f.kind==="CORRECCION"?"Corrección":"Entrega","Archivado",formatearFecha(f.createdAt),<div key="acciones" className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy||uncertain} onClick={()=>setSelected(f)}>Ver PDF plantilla {f.templateVersion}</Button><Button asChild variant="outline" size="sm"><a href={`${url(f)}?descargar=1`}>Descargar plantilla {f.templateVersion}</a></Button></div>]}))}/>}
    {selected && <div className="min-w-0 space-y-2"><iframe title={`PDF guía ${selected.folio}, plantilla ${selected.templateVersion}`} src={url(selected)} className="h-[55dvh] w-full min-w-0 rounded-md border" /><div className="flex flex-wrap gap-3"><a className="text-sm underline" href={url(selected)} target="_blank" rel="noopener noreferrer">Abrir PDF en otra pestaña e imprimir</a><Button variant="outline" onClick={() => setSelected(undefined)}>Cerrar vista previa PDF</Button></div></div>}
    <ConfirmarAccion abierto={confirm} titulo="Generar PDF de guía" descripcion="Se archivará el documento confirmado con su emisor, cliente, destino y partidas históricos. Se conservan stock, reservas, deuda y folio." accion="Generar PDF" pendiente={busy} onConfirmar={() => void emitir()} onAbiertoChange={v => { if (!busy && !uncertain) { setConfirm(v); onBloqueo(v); } }} onDevolverFoco={() => button.current?.focus()} />
  </section>;
}
