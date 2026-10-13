"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, X } from "lucide-react";
import { consultarOferta, consultarOrden, anular } from "@/app/(app)/ventas/ordenes/actions";
import type { ListadoOrdenes, OfertaOrden, OrdenConsultada } from "@/lib/consultas/ordenes-compra-cliente";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioOrden, monedaOrden, fechaOrden } from "./formulario-orden";
import { VerOrden } from "./ver-orden";
type Editor = { modo: "crear"; oferta?: OfertaOrden } | { modo: "ver"; orden: OrdenConsultada };
export function OrdenesCompraCliente({ listado: l, ofertas, cotizaciones, hoy, inicial, errorInicial }: {
  listado: ListadoOrdenes; ofertas: { id: number; version: number; etiqueta: string }[]; hoy: string;
  cotizaciones: { id: number; etiqueta: string }[];
  inicial?: { oferta?: OfertaOrden; orden?: OrdenConsultada }; errorInicial?: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | undefined>(() => inicial?.orden ? { modo: "ver", orden: inicial.orden } : inicial?.oferta ? { modo: "crear", oferta: inicial.oferta } : undefined);
  const [pendiente, setPendiente] = useState(false), [descarte, setDescarte] = useState(false), [error, setError] = useState(errorInicial);
  const [anulacion, setAnulacion] = useState<{ orden: OrdenConsultada; clave: string }>(), [motivo, setMotivo] = useState(""), [confirmar, setConfirmar] = useState(false);
  const [cotizacionFiltro, setCotizacionFiltro] = useState(l.filtros.cotizacion);
  const ocupado = useRef(false), modificado = useRef(false), bloqueado = useRef(false), retorno = useRef<HTMLElement | null>(null);
  const foco = () => { if (retorno.current?.isConnected) retorno.current.focus(); };
  function cerrar() { if (pendiente || bloqueado.current || descarte) return; if (editor?.modo === "crear" && modificado.current) setDescarte(true); else setEditor(undefined); }
  async function elegirOferta(id: number) {
    if (ocupado.current) return; ocupado.current = true; setPendiente(true); setError(undefined);
    try { const r = await consultarOferta(id); if (r.ok) { modificado.current = false; setEditor({ modo: "crear", oferta: r.documento }); } else setError(r.mensaje); }
    catch { setError("No se pudo cargar la cotización."); } finally { ocupado.current = false; setPendiente(false); }
  }
  async function abrirOrden(id: number, paraAnular = false) {
    if (ocupado.current) return; ocupado.current = true; retorno.current = document.activeElement as HTMLElement; setPendiente(true); setError(undefined);
    try { const r = await consultarOrden(id); if (!r.ok) setError(r.mensaje); else if (paraAnular) {
      if (!r.documento.puedeAnular) { setError("La orden tiene trabajo, abonos u otros hitos de cobranza, o ya fue anulada."); return; }
      setMotivo(""); setAnulacion({ orden: r.documento, clave: crypto.randomUUID() });
    } else setEditor({ modo: "ver", orden: r.documento }); }
    catch { setError("No se pudo consultar la orden."); } finally { ocupado.current = false; setPendiente(false); }
  }
  function pagina(n: number) { const p = new URLSearchParams({ ...l.filtros, pagina: String(n) }); router.push(`/ventas/ordenes?${p}`); }
  return <div className="space-y-6">
    <PageHeader titulo="Órdenes de Compra Cliente" descripcion="Compromisos totales o parciales sobre una cotización, con importes y alcance propios." acciones={<Button disabled={pendiente} onClick={() => { retorno.current = document.activeElement as HTMLElement; modificado.current = false; bloqueado.current = false; setError(undefined); setEditor({ modo: "crear" }); }}><Plus />Crear orden</Button>} />
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    {l.legadas > 0 && <p className="text-sm text-muted-foreground">{l.legadas} órdenes históricas sin aceptación documentada requieren conciliación manual y no se incluyen en este listado.</p>}
    <SectionCard titulo="Listado de órdenes" descripcion="Confirmar no modifica existencias ni crea trabajos. Las anulaciones conservan su identidad." contentClassName="p-0">
      <form method="get" className="flex flex-wrap items-end gap-3 border-b border-border p-4">
        <label className="min-w-0 flex-1 text-sm">Buscar<Input aria-label="Filtrar órdenes" name="q" defaultValue={l.filtros.q} placeholder="Folio, número del cliente o cliente…" maxLength={150} /></label>
        <label className="text-sm">Estado<select aria-label="Estado de órdenes" name="estado" defaultValue={l.filtros.estado} className="block h-9 rounded-md border border-input bg-card px-2"><option value="TODOS">Todos</option><option value="CONFIRMADA">Confirmada</option><option value="ANULADA">Anulada</option></select></label>
        <label className="min-w-0 text-sm">Desde<Input aria-label="Fecha desde de órdenes" type="date" name="desde" defaultValue={l.filtros.desde} /></label><label className="min-w-0 text-sm">Hasta<Input aria-label="Fecha hasta de órdenes" type="date" name="hasta" defaultValue={l.filtros.hasta} /></label>
        <label className="text-sm">Orden<select aria-label="Orden del listado" name="orden" defaultValue={l.filtros.orden} className="block h-9 rounded-md border border-input bg-card px-2"><option value="fecha">Fecha</option><option value="total">Importe</option><option value="cliente">Cliente</option></select></label>
        <select aria-label="Sentido del orden" name="sentido" defaultValue={l.filtros.sentido} className="h-9 rounded-md border border-input bg-card px-2"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select>
        <div className="min-w-0 space-y-1 text-sm"><label htmlFor="filtro-cotizacion-orden">Cotización</label><SelectorBuscable id="filtro-cotizacion-orden" nombre="cotización de origen" placeholder="Todas las cotizaciones" valor={cotizacionFiltro || "todas"} opciones={[{ valor: "todas", etiqueta: "Todas las cotizaciones" }, ...cotizaciones.map(q => ({ valor: String(q.id), etiqueta: q.etiqueta }))]} onChange={v => setCotizacionFiltro(v === "todas" ? "" : v)} /><input type="hidden" name="cotizacion" value={cotizacionFiltro} /></div>
        <Button variant="outline" type="submit">Filtrar</Button><Button variant="outline" type="button" onClick={() => router.refresh()}>Actualizar</Button>
      </form>
      <Table aria-label="Órdenes de Compra Cliente"><TableHeader><TableRow><TableHead>Folio / OC cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente / Sucursal</TableHead><TableHead>Cotización</TableHead><TableHead>Aceptación</TableHead><TableHead>Importe</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{l.filas.length ? l.filas.map(f => <TableRow key={f.id}><TableCell className="font-mono">{f.folio}{f.customerOrderNumber && <p className="max-w-48 whitespace-pre-wrap break-words text-xs text-muted-foreground">{f.customerOrderNumber}</p>}</TableCell><TableCell>{fechaOrden(f.date)}</TableCell><TableCell className="max-w-64 whitespace-normal break-words">{f.clientName}<p className="text-xs text-muted-foreground">{f.branchName}</p></TableCell><TableCell>{f.quoteFolio}</TableCell><TableCell>{f.completa ? "Total" : "Parcial"}</TableCell><TableCell className="tabular-nums">{monedaOrden(f.totalAmount)}</TableCell><TableCell><span className="rounded-md bg-muted px-2 py-1 text-xs">{f.status === "ANULADA" ? "Anulada" : "Confirmada"}</span></TableCell><TableCell><div className="flex gap-1"><BotonConAyuda ayuda="Ver detalle contratado, comparación con la oferta e historial." aria-label={`Ver orden ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => void abrirOrden(f.id)}><Eye /></BotonConAyuda><BotonConAyuda ayuda="Anular sólo sin trabajo, abonos ni hitos posteriores; requiere motivo." aria-label={`Anular orden ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || f.status !== "CONFIRMADA"} onClick={() => void abrirOrden(f.id, true)}><X /></BotonConAyuda></div></TableCell></TableRow>) : <TableRow><TableCell colSpan={8} className="h-32 text-center">No hay órdenes para estos filtros.</TableCell></TableRow>}</TableBody></Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm"><p>{l.total} registros · Página {l.filtros.pagina} de {l.paginas}</p><div className="flex gap-2"><Button variant="outline" disabled={l.filtros.pagina <= 1} onClick={() => pagina(l.filtros.pagina - 1)}>Anterior</Button><Button variant="outline" disabled={l.filtros.pagina >= l.paginas} onClick={() => pagina(l.filtros.pagina + 1)}>Siguiente</Button></div></div>
    </SectionCard>
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-5xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrar(); }} onCloseAutoFocus={e => { e.preventDefault(); foco(); }}><DialogHeader className="min-w-0"><DialogTitle className="break-words">{editor?.modo === "ver" ? `Ver orden ${editor.orden.folio}` : "Crear Orden de Compra Cliente"}</DialogTitle><DialogDescription>El folio se asigna al confirmar. Sólo las cantidades aceptadas generan compromiso y cuenta.</DialogDescription></DialogHeader>
      {editor?.modo === "crear" && !editor.oferta && <div className="space-y-4"><label className="block text-sm" htmlFor="oferta-orden">Cotización de origen</label><SelectorBuscable id="oferta-orden" nombre="cotización" placeholder="Buscar cotización vigente o aprobada…" valor="" disabled={pendiente} opciones={ofertas.map(o => ({ valor: String(o.id), etiqueta: o.etiqueta }))} onChange={v => void elegirOferta(Number(v))} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button variant="outline" disabled={pendiente} onClick={cerrar}>Cancelar</Button></div>}
      {editor?.modo === "crear" && editor.oferta && <FormularioOrden key={`${editor.oferta.id}-${editor.oferta.version}`} oferta={editor.oferta} hoy={hoy} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} onCerrar={cerrar} onGuardado={(mensaje, id) => { modificado.current = false; bloqueado.current = false; setEditor(undefined); notificar.exito(mensaje); router.refresh(); void abrirOrden(id); }} />}
      {editor?.modo === "ver" && <VerOrden orden={editor.orden} onCerrar={cerrar} />}
    </DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); modificado.current = false; setEditor(undefined); }} />
    <Dialog open={Boolean(anulacion)} onOpenChange={v => { if (!v && !pendiente && !confirmar) setAnulacion(undefined); }}><DialogContent showCloseButton={false} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (pendiente || confirmar) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); foco(); }}><DialogHeader><DialogTitle>Anular orden {anulacion?.orden.folio}</DialogTitle><DialogDescription>Se anulará también su cuenta. Se conservarán el folio, la referencia externa y la cotización aprobada.</DialogDescription></DialogHeader><label className="space-y-1 text-sm">Motivo<Textarea aria-label="Motivo de anulación" maxLength={1000} value={motivo} disabled={pendiente || confirmar} onChange={e => setMotivo(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={pendiente || confirmar} onClick={() => setAnulacion(undefined)}>Cancelar</Button><Button disabled={pendiente || confirmar || !motivo.trim()} onClick={() => { setError(undefined); setConfirmar(true); }}>Confirmar anulación</Button></div></DialogContent></Dialog>
    <ConfirmarAccion abierto={confirmar} onAbiertoChange={setConfirmar} titulo="Confirmar anulación" descripcion={`${anulacion?.orden.folio ?? ""}: ${motivo}. Orden y cuenta se anularán juntas conservando historial. ${error ?? ""}`} accion="Anular orden y cuenta" pendiente={pendiente} onConfirmar={async () => {
      if (!anulacion || ocupado.current) return; ocupado.current = true; setPendiente(true);
      try { const r = await anular({ referencia: { id: anulacion.orden.id, version: anulacion.orden.version }, motivo }, anulacion.clave); if (r.ok) { setConfirmar(false); setAnulacion(undefined); notificar.exito(r.mensaje); router.refresh(); } else setError(r.mensaje); }
      catch { setError("No se pudo comprobar la anulación. Reintenta con esta misma confirmación."); } finally { ocupado.current = false; setPendiente(false); }
    }} />
  </div>;
}
