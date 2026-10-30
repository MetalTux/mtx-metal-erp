"use client";
import { GrillaHistorial } from "@/components/grilla-historial";
import { usePermiso } from "@/components/seguridad/permisos";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emitirPdf, consultarPdfs, actualizarEmisor } from "@/app/(app)/ventas/cotizaciones/actions";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/alertas/aviso";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import type { historialPdfCotizacion } from "@/lib/servicios/pdfs-cotizacion";
type Fila = Awaited<ReturnType<typeof historialPdfCotizacion>>[number];
export function HistorialPdfCotizacion({ referencia, onBloqueo }: { referencia: { id: number; version: number }; onBloqueo?: (v: boolean) => void }) {
 const operar = usePermiso("cotizaciones.operar");

  const router = useRouter();
  const botonEmisor = useRef<HTMLButtonElement>(null);
  const [revision, setRevision] = useState(referencia.version);
  const [emisorEditable, setEmisorEditable] = useState(false);
  // Conservar referencia y UUID juntos durante reintentos de la misma confirmación.
  const [renovacion, setRenovacion] = useState<{ clave: string; referencia: { id: number; version: number } }>();
  const [confirmarEmisor, setConfirmarEmisor] = useState(false);
  const accion = useRef<HTMLButtonElement>(null);
  const [filas, setFilas] = useState<Fila[]>([]), [error, setError] = useState<string>(), [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState(false), [clave, setClave] = useState<string>(), [confirmar, setConfirmar] = useState(false), [seleccionada, setSeleccionada] = useState<Fila>();
  useEffect(() => {
    let vigente = true;
    consultarPdfs(referencia.id).then(r => { if (!vigente) return; if (r.ok) { setFilas(r.filas); setEmisorEditable(r.emisorEditable); } else setError(r.mensaje); }).catch(() => { if (vigente) setError("No se pudo consultar el historial de PDF."); }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [referencia.id]);
  const url = (f: Fila) => `/api/cotizaciones/pdfs/${f.id}`;
  const vigente = filas.find(f => f.quoteVersion === revision);
  return <section className="min-w-0 space-y-3 rounded-md border border-border p-3" aria-label="PDF y versiones de cotización">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">PDF y versiones</h3>{(operar || vigente) && <Button ref={accion} className="h-auto min-h-8 max-w-full whitespace-normal" type="button" disabled={pendiente || cargando} onClick={() => { if (vigente) { setSeleccionada(vigente); return; } if (!clave) setClave(crypto.randomUUID()); setConfirmar(true); }}>{vigente ? "Consultar PDF de esta revisión" : "Generar PDF de esta revisión"}</Button>}</div>
    <p className="text-[13px] text-muted-foreground">Carta · Revisión actual {revision}. Cada emisión conserva su contenido y estado; las descargas no regeneran versiones anteriores.</p>
    {emisorEditable && <div className="space-y-2">
      <Button ref={botonEmisor} type="button" variant="outline" className="h-auto min-h-8 max-w-full whitespace-normal" disabled={pendiente || cargando} onClick={() => {
        setError(undefined); setRenovacion({ clave: crypto.randomUUID(), referencia: { id: referencia.id, version: revision } }); setConfirmarEmisor(true);
      }}>Actualizar emisor desde Empresa</Button>
      <p className="text-[13px] text-muted-foreground">Sólo para cotizaciones Pendientes. Copia los datos actuales de Empresa en una nueva revisión; los PDF anteriores conservan su emisor original.</p>
    </div>}
    {error && <Aviso titulo="No se pudo completar la operación de PDF"><p className="break-words [overflow-wrap:anywhere]">{error}</p></Aviso>}
    {cargando ? <p className="text-sm">Cargando emisiones…</p> : filas.length ? <GrillaHistorial titulo="Emisiones de cotización" columnas={["Revisión","Estado al emitir","Fecha de emisión","Acciones"]} filas={filas.map(f=>({id:f.id,celdas:[f.quoteVersion,f.status === "PENDIENTE" ? "Pendiente" : f.status === "APROBADA" ? "Aprobada" : "Rechazada",new Intl.DateTimeFormat("es-CL",{timeZone:"America/Santiago",dateStyle:"short",timeStyle:"short"}).format(new Date(f.createdAt)),<div key="acciones" className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={pendiente} onClick={()=>setSeleccionada(f)}>Ver PDF revisión {f.quoteVersion}</Button><Button asChild variant="outline" size="sm"><a href={`${url(f)}?descargar=1`}>Descargar revisión {f.quoteVersion}</a></Button></div>]}))}/> : <p className="text-sm text-muted-foreground">Aún no hay PDF emitidos.</p>}
    {seleccionada && <div className="min-w-0 space-y-2"><p className="text-sm">Vista previa · Revisión {seleccionada.quoteVersion} · {seleccionada.status}</p><iframe title={`PDF cotización ${seleccionada.folio}, revisión ${seleccionada.quoteVersion}`} src={url(seleccionada)} className="h-[55dvh] w-full min-w-0 rounded-md border border-border" /><p className="text-[13px] text-muted-foreground">Si tu navegador no muestra la vista previa, utiliza Descargar o <a className="underline" href={url(seleccionada)} target="_blank" rel="noopener noreferrer">abrir el PDF</a>.</p><Button type="button" variant="outline" onClick={() => setSeleccionada(undefined)}>Cerrar vista previa</Button></div>}
    <ConfirmarAccion onDevolverFoco={() => accion.current?.focus()} abierto={confirmar} onAbiertoChange={setConfirmar} titulo={vigente ? "Consultar emisión archivada" : "Emitir PDF de cotización"} descripcion={`Se utilizará la revisión guardada ${revision}. El PDF y sus datos quedarán conservados; emitir no cambia el estado de la cotización. ${error ?? ""}`} accion={vigente ? "Consultar PDF" : "Generar y archivar PDF"} pendiente={pendiente} onConfirmar={async () => {
      if (!clave || pendiente) return; setPendiente(true); onBloqueo?.(true); setError(undefined);
      try {
        const r = await emitirPdf({ id: referencia.id, version: revision }, clave);
        if (!r.ok) { setError(r.mensaje); return; }
        const historial = await consultarPdfs(referencia.id);
        if (!historial.ok) { setError(historial.mensaje); return; }
        setFilas(historial.filas); setSeleccionada(historial.filas.find(f => f.id === r.id)); setConfirmar(false); setClave(undefined);
      } catch { setError("No se pudo confirmar la emisión. Reintenta para comprobar el resultado sin duplicarla."); }
      finally { setPendiente(false); onBloqueo?.(false); }
    }} />
    <ConfirmarAccion abierto={confirmarEmisor} onAbiertoChange={setConfirmarEmisor} onDevolverFoco={() => botonEmisor.current?.focus()} titulo="Actualizar emisor desde Empresa" descripcion={`Se copiarán razón social, RUT, dirección, ciudad, contactos, giro y logo actuales de Empresa. Se creará una nueva revisión, conservando folio, cliente, líneas, precios y condiciones. Los PDF archivados no cambian. ${error ?? ""}`} accion="Actualizar emisor y crear revisión" pendiente={pendiente} onConfirmar={async () => {
      if (!renovacion || pendiente) return;
      setPendiente(true); onBloqueo?.(true); setError(undefined);
      try {
        const r = await actualizarEmisor(renovacion.referencia, renovacion.clave);
        if (!r.ok) { setError(r.mensaje); return; }
        setRevision(r.version); setClave(undefined); setSeleccionada(undefined); setConfirmarEmisor(false); setRenovacion(undefined);
        router.refresh();
      } catch { setError("No se pudo confirmar la actualización del emisor. Reintenta para comprobar el resultado sin duplicar la revisión."); }
      finally { setPendiente(false); onBloqueo?.(false); }
    }} />
  </section>;
}
