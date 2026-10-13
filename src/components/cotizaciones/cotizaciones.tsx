"use client";
import { HistorialPdfCotizacion } from "./historial-pdf-cotizacion";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2, Check, X, Copy, FileText, ClipboardList } from "lucide-react";
import { consultarOferta } from "@/app/(app)/ventas/ordenes/actions";
import type { OfertaOrden } from "@/lib/consultas/ordenes-compra-cliente";
import { FormularioOrden } from "@/components/ordenes-compra-cliente/formulario-orden";
import { consultar, resolver } from "@/app/(app)/ventas/cotizaciones/actions";
import type { CatalogosCotizacion, ListadoCotizaciones } from "@/lib/consultas/cotizaciones";
import { FormularioCotizacion, type EditorDocumento } from "./formulario-cotizacion";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
const moneda = (v: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(BigInt(v));
const fecha = (v: string) => v.split("-").reverse().join("-");
type Fila = ListadoCotizaciones["filas"][number];
export function Cotizaciones({ listado: l, catalogos, hoy }: { listado: ListadoCotizaciones; catalogos: CatalogosCotizacion; hoy: string }) {
  const router = useRouter();
  const [pdf, setPdf] = useState<Fila>();
  const [ofertaOrden, setOfertaOrden] = useState<OfertaOrden>();
  const [editor, setEditor] = useState<EditorDocumento>(), [pendiente, setPendiente] = useState(false), [descarte, setDescarte] = useState(false);
  const [accion, setAccion] = useState<{ fila: Fila; tipo: "RECHAZAR" | "ELIMINAR"; clave: string }>(), [error, setError] = useState<string>();
  const modificado = useRef(false), bloqueado = useRef(false), retorno = useRef<HTMLElement | null>(null);
  function foco() { if (retorno.current?.isConnected) retorno.current.focus(); }
  async function abrir(modo: EditorDocumento["modo"], fila?: Fila) {
    retorno.current = document.activeElement as HTMLElement; modificado.current = false; bloqueado.current = false;
    if (!fila) { setEditor({ modo, clave: crypto.randomUUID() }); return; }
    setPendiente(true);
    try { const r = await consultar(fila.id); if (r.ok) setEditor({ modo, documento: r.documento, clave: crypto.randomUUID() }); else notificar.error(r.mensaje); }
    catch { notificar.error("No se pudo consultar la cotización."); }
    finally { setPendiente(false); }
  }
  async function aceptar(fila: Fila) {
    retorno.current = document.activeElement as HTMLElement; modificado.current = false; bloqueado.current = false; setPendiente(true);
    try { const r = await consultarOferta(fila.id); if (r.ok) setOfertaOrden(r.documento); else notificar.error(r.mensaje); }
    catch { notificar.error("No se pudo abrir la aceptación."); } finally { setPendiente(false); }
  }
  function cerrarOrden() { if (pendiente || bloqueado.current || descarte) return; if (modificado.current) setDescarte(true); else setOfertaOrden(undefined); }
  function cerrar() { if (pendiente || bloqueado.current || descarte) return; if (modificado.current && editor?.modo !== "ver") setDescarte(true); else setEditor(undefined); }
  function pagina(n: number) { const p = new URLSearchParams({ ...l.filtros, pagina: String(n) }); router.push(`/ventas/cotizaciones?${p}`); }
  function confirmar(fila: Fila, tipo: NonNullable<typeof accion>["tipo"]) { retorno.current = document.activeElement as HTMLElement; setError(undefined); setAccion({ fila, tipo, clave: crypto.randomUUID() }); }
  return <div className="space-y-6">
    <PageHeader titulo="Cotizaciones" descripcion="Ofertas de materiales, productos y trabajos con detalle técnico e imágenes." acciones={<Button disabled={pendiente} onClick={() => void abrir("crear")}><Plus />Crear cotización</Button>} />
    <SectionCard titulo="Listado de cotizaciones" descripcion="Cotizar no reserva ni modifica existencias. Los documentos terminales conservan su contenido." contentClassName="p-0">
      <form method="get" className="flex flex-wrap items-end gap-3 border-b border-border p-4">
        <label className="min-w-0 flex-1 text-sm">Buscar<Input aria-label="Filtrar cotizaciones" name="q" defaultValue={l.filtros.q} placeholder="Folio, cliente o RUT…" maxLength={150} /></label>
        <label className="text-sm">Estado<select aria-label="Estado de cotizaciones" name="estado" defaultValue={l.filtros.estado} className="block h-9 rounded-md border border-input bg-card px-2"><option value="TODOS">Todos</option><option value="PENDIENTE">Pendiente</option><option value="APROBADA">Aprobada</option><option value="RECHAZADA">Rechazada</option></select></label>
        <label className="min-w-0 text-sm">Desde<Input aria-label="Fecha desde del listado" type="date" name="desde" defaultValue={l.filtros.desde} /></label>
        <label className="min-w-0 text-sm">Hasta<Input aria-label="Fecha hasta del listado" type="date" name="hasta" defaultValue={l.filtros.hasta} /></label>
        <label className="text-sm">Orden<select aria-label="Orden de cotizaciones" name="orden" defaultValue={l.filtros.orden} className="block h-9 rounded-md border border-input bg-card px-2"><option value="fecha">Fecha</option><option value="total">Total</option><option value="cliente">Cliente</option></select></label>
        <select aria-label="Sentido del orden" name="sentido" defaultValue={l.filtros.sentido} className="h-9 rounded-md border border-input bg-card px-2"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select>
        <Button type="submit" variant="outline">Filtrar</Button><Button type="button" variant="outline" disabled={pendiente} onClick={() => router.refresh()}>Actualizar</Button>
      </form>
      <Table aria-label="Cotizaciones"><TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead>Total final</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{l.filas.length ? l.filas.map(f => {
        const editable = f.status === "PENDIENTE" && !f.conOrden, vencida = Boolean(f.validUntil && f.validUntil < hoy);
        return <TableRow key={f.id}><TableCell className="font-mono">{f.folio}{f.correctedQuoteId && <p className="text-xs text-muted-foreground">Corrección vinculada</p>}</TableCell><TableCell>{fecha(f.date)}</TableCell><TableCell className="max-w-64 whitespace-normal break-words">{f.clientName}</TableCell><TableCell><span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs">{f.status === "PENDIENTE" ? "Pendiente" : f.status === "APROBADA" ? "Aprobada" : "Rechazada"}</span>{vencida && f.status === "PENDIENTE" && <p className="text-xs text-muted-foreground">Vencida</p>}</TableCell><TableCell className="tabular-nums">{moneda(f.totalAmount)}</TableCell><TableCell><div className="flex flex-wrap gap-1">
          <BotonConAyuda ayuda="Generar PDF Carta de la revisión actual y consultar emisiones archivadas." aria-label={`PDF cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => { retorno.current = document.activeElement as HTMLElement; setPdf(f); }}><FileText /></BotonConAyuda>
          <BotonConAyuda ayuda="Ver datos, importes y detalle técnico históricos." aria-label={`Ver cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => void abrir("ver", f)}><Eye /></BotonConAyuda>
          <BotonConAyuda ayuda="Editar una cotización pendiente sin orden de cliente." aria-label={`Editar cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || !editable} onClick={() => void abrir("editar", f)}><Pencil /></BotonConAyuda>
          {f.ordenId ? <BotonConAyuda ayuda="Consultar el compromiso registrado, incluso si fue anulado." aria-label={`Ver orden de cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => router.push(`/ventas/ordenes?ver=${f.ordenId}`)}><ClipboardList /></BotonConAyuda> : <BotonConAyuda ayuda="Seleccionar lo contratado y confirmar juntos aprobación, orden y cuenta. Cancelar conserva la oferta." aria-label={`${f.status === "APROBADA" ? "Registrar orden de" : "Aceptar y registrar orden de"} cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || f.status === "RECHAZADA" || (f.status === "PENDIENTE" && vencida)} onClick={() => void aceptar(f)}><Check /></BotonConAyuda>}
          <BotonConAyuda ayuda="Rechazar conserva el documento y bloquea el contenido." aria-label={`Rechazar cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || !editable} onClick={() => confirmar(f, "RECHAZAR")}><X /></BotonConAyuda>
          <BotonConAyuda ayuda="Crear una nueva pendiente con nuevo folio vinculada a este original; permite corregir sin alterar su historia." aria-label={`Corregir cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || f.status === "PENDIENTE"} onClick={() => void abrir("corregir", f)}><Copy /></BotonConAyuda>
          <BotonConAyuda ayuda="Eliminar oculta una pendiente; conserva folio, archivos e historial." aria-label={`Eliminar cotización ${f.folio}`} variant="ghost" size="icon-sm" disabled={pendiente || !editable} onClick={() => confirmar(f, "ELIMINAR")}><Trash2 /></BotonConAyuda>
        </div></TableCell></TableRow>;
      }) : <TableRow><TableCell colSpan={6} className="h-32 text-center">No hay cotizaciones para estos filtros.</TableCell></TableRow>}</TableBody></Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm"><p>{l.total} registros · Página {l.filtros.pagina} de {l.paginas}</p><div className="flex gap-2"><Button variant="outline" disabled={l.filtros.pagina <= 1} onClick={() => pagina(l.filtros.pagina - 1)}>Anterior</Button><Button variant="outline" disabled={l.filtros.pagina >= l.paginas} onClick={() => pagina(l.filtros.pagina + 1)}>Siguiente</Button></div></div>
    </SectionCard>
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-5xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrar(); }} onCloseAutoFocus={e => { e.preventDefault(); foco(); }}><DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear cotización" : editor?.modo === "editar" ? `Editar cotización ${editor.documento?.folio}` : editor?.modo === "corregir" ? `Corregir cotización ${editor.documento?.folio}` : `Ver cotización ${editor?.documento?.folio}`}</DialogTitle><DialogDescription>Precios finales con IVA incluido. El folio se asigna al primer guardado confirmado.</DialogDescription></DialogHeader>{editor && <FormularioCotizacion key={editor.clave} editor={editor} catalogos={catalogos} hoy={hoy} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} onCerrar={cerrar} onGuardado={mensaje => { setEditor(undefined); notificar.exito(mensaje); router.refresh(); }} />}</DialogContent></Dialog>
    <Dialog open={Boolean(pdf)} onOpenChange={v => { if (!v && !pendiente) setPdf(undefined); }}><DialogContent className="max-h-[90dvh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-5xl" onCloseAutoFocus={e => { e.preventDefault(); foco(); }} onEscapeKeyDown={e => { if (pendiente) e.preventDefault(); }} onInteractOutside={e => e.preventDefault()}><DialogHeader className="min-w-0"><DialogTitle className="break-words [overflow-wrap:anywhere]">PDF de cotización {pdf?.folio}</DialogTitle><DialogDescription>Emisiones históricas y revisión actual guardada.</DialogDescription></DialogHeader>{pdf && <HistorialPdfCotizacion key={`${pdf.id}-${pdf.version}`} referencia={{ id: pdf.id, version: pdf.version }} onBloqueo={setPendiente} />}</DialogContent></Dialog>
    <Dialog open={Boolean(ofertaOrden)} onOpenChange={v => { if (!v) cerrarOrden(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-5xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrarOrden(); }} onCloseAutoFocus={e => { e.preventDefault(); foco(); }}><DialogHeader><DialogTitle>Aceptar y registrar Orden de Compra Cliente</DialogTitle><DialogDescription>Revisa líneas, cantidades y alcance sobre la cotización seleccionada.</DialogDescription></DialogHeader>{ofertaOrden && <FormularioOrden key={`${ofertaOrden.id}-${ofertaOrden.version}`} oferta={ofertaOrden} hoy={hoy} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} onCerrar={cerrarOrden} onGuardado={mensaje => { modificado.current = false; bloqueado.current = false; setOfertaOrden(undefined); notificar.exito(mensaje); router.refresh(); }} />}</DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); modificado.current = false; setEditor(undefined); setOfertaOrden(undefined); }} />
    <ConfirmarAccion abierto={Boolean(accion)} onAbiertoChange={v => { if (!v) setAccion(undefined); }} onDevolverFoco={foco} titulo={accion?.tipo === "ELIMINAR" ? "Eliminar cotización pendiente" : "Rechazar cotización"} descripcion={`${accion?.fila.folio ?? ""}: ${accion?.tipo === "ELIMINAR" ? "Se ocultará del listado conservando folio e historial." : "El contenido quedará bloqueado. Para corregirlo tendrás que crear una nueva cotización vinculada."} ${error ?? ""}`} accion={accion?.tipo === "ELIMINAR" ? "Eliminar cotización" : "Rechazar cotización"} pendiente={pendiente} onConfirmar={async () => {
      if (!accion || pendiente) return; setPendiente(true);
      try { const r = await resolver({ id: accion.fila.id, version: accion.fila.version }, accion.clave, accion.tipo); if (r.ok) { setAccion(undefined); notificar.exito(r.mensaje); router.refresh(); } else setError(r.mensaje); }
      catch { setError("No se pudo confirmar. Actualiza el listado para revisar el resultado."); }
      finally { setPendiente(false); }
    }} />
  </div>;
}
