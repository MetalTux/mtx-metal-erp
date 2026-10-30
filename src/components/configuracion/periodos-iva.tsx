"use client";
import { Permiso } from "@/components/seguridad/permisos";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { guardarIva, eliminarIva } from "@/app/(app)/configuracion/iva/actions";
import { periodoIvaSchema, type DatosPeriodoIva } from "@/lib/validaciones/iva";
import type { PeriodoIva, ResultadoIva } from "@/lib/tipos/iva";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
type Editor = { modo: "crear" | "ver" | "editar"; fila?: PeriodoIva };
const fecha = (v: string) => v.split("-").reverse().join("-");
function Formulario({ editor, abierta, pendiente, onGuardar, onCerrar, onCambio, onBloqueo }: {
  editor: Editor; abierta?: PeriodoIva; pendiente: boolean;
  onGuardar: (d: DatosPeriodoIva) => Promise<ResultadoIva>; onCerrar: () => void; onCambio: () => void; onBloqueo: (v: boolean) => void;
}) {
  const [rate, setRate] = useState(editor.fila?.rate ?? "");
  const [desde, setDesde] = useState(editor.fila?.validFrom ?? ""), [hasta, setHasta] = useState(editor.fila?.validTo ?? "");
  const [error, setError] = useState<string>(), [confirmacion, setConfirmacion] = useState<DatosPeriodoIva>();
  const consulta = editor.modo === "ver", utilizada = Boolean(editor.fila?.documentos);
  const cierre = editor.modo === "crear" && !hasta && abierta;
  return <>
    <form className="min-w-0 space-y-4" noValidate onSubmit={e => {
      e.preventDefault(); if (consulta || pendiente || confirmacion) return;
      const v = periodoIvaSchema.safeParse({ rate, validFrom: desde, validTo: hasta || null });
      if (!v.success) { setError(v.error.issues[0].message); return; }
      setError(undefined); setConfirmacion(v.data); onBloqueo(true);
    }}>
      {error && <Aviso titulo={error} />}
      <div className="space-y-2"><Label htmlFor="iva-tasa">Tasa de IVA (%) *</Label><AyudaCampo nombre="Porcentaje de IVA" texto="Porcentaje entre 0 y 100, con hasta cuatro decimales. Los documentos conservan la tasa copiada al registrarse; no se recalculan al cambiar la configuración." /><Input id="iva-tasa" inputMode="decimal" value={rate} maxLength={8} readOnly={consulta || utilizada} disabled={pendiente} onChange={e => { setRate(e.target.value); onCambio(); }} /></div>
      <div className="space-y-2"><Label htmlFor="iva-desde">Fecha desde *</Label><Input id="iva-desde" type="date" value={desde} readOnly={consulta || utilizada} disabled={pendiente} onChange={e => { setDesde(e.target.value); onCambio(); }} /><p className="text-[13px] text-muted-foreground">Se elige según la fecha del documento, no según su fecha de registro. Puedes programar una tasa futura.</p></div>
      <div className="space-y-2"><Label htmlFor="iva-hasta">Fecha hasta (opcional)</Label><AyudaCampo nombre="Fin del período" texto="Fecha inclusiva. Vacío significa período abierto, que aplica desde su inicio aunque ese inicio sea futuro. Siempre debe existir exactamente uno abierto. Para cerrar el abierto, crea el siguiente: el anterior se cerrará el día previo, en un solo guardado." /><Input id="iva-hasta" type="date" value={hasta} readOnly={consulta || editor.fila?.validTo === null} disabled={pendiente} onChange={e => { setHasta(e.target.value); onCambio(); }} /></div>
      {cierre && <Aviso tipo="informacion" titulo="Cambio conjunto de períodos">Al crear el nuevo período abierto, el anterior desde {fecha(abierta.validFrom)} se cerrará el día anterior al nuevo inicio. No se permiten solapamientos ni dejar documentos asociados fuera del período.</Aviso>}
      {utilizada && <Aviso tipo="informacion" titulo="Período utilizado">Tasa y fecha desde quedan protegidas. La fecha hasta sólo puede modificarse si conserva todos los documentos asociados.</Aviso>}
      {editor.fila && <p className="text-sm text-muted-foreground">Documentos asociados: {editor.fila.documentos}{editor.fila.ultimaFechaDocumento ? ` · Última fecha: ${fecha(editor.fila.ultimaFechaDocumento)}` : ""}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Permiso permiso="configuracion.operar"><Button type="submit" disabled={pendiente}>Revisar y guardar</Button></Permiso>}</DialogFooter>
    </form>
    <ConfirmarAccion abierto={Boolean(confirmacion)} onAbiertoChange={v => { if (!v) { setConfirmacion(undefined); onBloqueo(false); } }} titulo="Confirmar período de IVA" descripcion={`Tasa ${rate.replace(".", ",")}% desde ${desde ? fecha(desde) : ""}${hasta ? ` hasta ${fecha(hasta)} inclusive` : ", sin fecha de fin"}. ${cierre ? "El período abierto anterior se cerrará el día previo al nuevo inicio, en la misma operación." : "Los documentos existentes conservarán su tasa."} ${error ?? ""}`} accion="Guardar período" pendiente={pendiente} onConfirmar={async () => { if (!confirmacion || pendiente) return; const r = await onGuardar(confirmacion); if (!r.ok) setError(r.mensaje); }} />
  </>;
}
export function PeriodosIva({ periodos, hoy }: { periodos: PeriodoIva[]; hoy: string }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>(), [eliminar, setEliminar] = useState<PeriodoIva>(), [pendiente, setPendiente] = useState(false);
  const [descarte, setDescarte] = useState(false), [errorEliminar, setErrorEliminar] = useState<string>();
  const modificado = useRef(false), bloqueado = useRef(false), retorno = useRef<HTMLElement | null>(null), nuevo = useRef<HTMLButtonElement>(null);
  const abierta = periodos.find(p => p.validTo === null);
  const estado = (p: PeriodoIva) => p.validFrom > hoy ? "Programado" : p.validTo !== null && p.validTo < hoy ? "Finalizado" : "Aplicable hoy";
  function restaurar() { (retorno.current?.isConnected ? retorno.current : nuevo.current)?.focus(); }
  function abrir(modo: Editor["modo"], fila?: PeriodoIva) { retorno.current = document.activeElement as HTMLElement; modificado.current = false; bloqueado.current = false; setEditor({ modo, fila }); }
  function cerrar() { if (pendiente || bloqueado.current || descarte) return; if (modificado.current && editor?.modo !== "ver") setDescarte(true); else setEditor(undefined); }
  async function guardar(d: DatosPeriodoIva): Promise<ResultadoIva> {
    setPendiente(true);
    try {
      const r = await guardarIva(d, editor?.fila ? { id: editor.fila.id, version: editor.fila.version } : undefined, abierta ? { id: abierta.id, version: abierta.version } : null);
      if (r.ok) { bloqueado.current = false; setEditor(undefined); notificar.exito(r.mensaje); router.refresh(); }
      return r;
    } catch { return { ok: false, mensaje: "No se pudo confirmar. Actualiza el listado para comprobar el resultado antes de reintentar." }; }
    finally { setPendiente(false); }
  }
  const columnas: ColumnaDatos<PeriodoIva>[] = [
    { accessorKey: "rate", header: "Tasa", cell: ({ row }) => `${row.original.rate.replace(".", ",")}%` },
    { accessorKey: "validFrom", header: "Desde", cell: ({ row }) => fecha(row.original.validFrom) },
    { accessorKey: "validTo", header: "Hasta (inclusive)", cell: ({ row }) => row.original.validTo ? fecha(row.original.validTo) : "Abierto" },
    { id: "estado", header: "Estado", cell: ({ row }) => estado(row.original) },
    { accessorKey: "documentos", header: "Documentos" },
    { id: "acciones", header: "Acciones", cell: ({ row }) => <div className="flex gap-1"><BotonConAyuda ayuda="Consulta el período y sus referencias." aria-label={`Ver IVA ${row.original.id}`} variant="ghost" size="sm" disabled={pendiente} onClick={() => abrir("ver", row.original)}><Eye />Ver</BotonConAyuda><Permiso permiso="configuracion.operar"><BotonConAyuda ayuda="Edita el período respetando documentos asociados." aria-label={`Editar IVA ${row.original.id}`} variant="ghost" size="sm" disabled={pendiente} onClick={() => abrir("editar", row.original)}><Pencil />Editar</BotonConAyuda></Permiso><Permiso permiso="configuracion.operar"><BotonConAyuda ayuda="Sólo puedes eliminar períodos cerrados sin documentos. Las fechas sin cobertura bloquearán nuevos documentos." aria-label={`Eliminar IVA ${row.original.id}`} variant="ghost" size="sm" disabled={pendiente || row.original.validTo === null || row.original.documentos > 0} onClick={e => { retorno.current = e.currentTarget; setErrorEliminar(undefined); setEliminar(row.original); }}><Trash2 />Eliminar</BotonConAyuda></Permiso></div> },
  ];
  return <div className="min-w-0 space-y-4">
    <PageHeader titulo="Períodos de IVA" descripcion="Configura tasas por fecha de documento, conservando los valores históricos." acciones={<Permiso permiso="configuracion.operar"><Button ref={nuevo} disabled={pendiente} onClick={() => abrir("crear")}><Plus />Crear período</Button></Permiso>} />
    <SectionCard titulo="Configuración de IVA" descripcion="Fecha hasta inclusiva. Un período abierto puede comenzar en el futuro; la tasa aplicable depende de la fecha." contentClassName="p-0"><DataTable vacio={<p>No hay períodos configurados.</p>} datos={periodos} columnas={columnas} nombre="períodos de IVA" textoBusqueda={p => `${p.rate} ${p.validFrom} ${p.validTo ?? "abierto"} ${estado(p)}`} filtroPlaceholder="Buscar tasa, fecha o estado…" acciones={<Button variant="outline" disabled={pendiente} onClick={() => router.refresh()}>Actualizar</Button>} /></SectionCard>
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain sm:max-w-lg" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrar(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}><DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear período de IVA" : editor?.modo === "ver" ? "Ver período de IVA" : "Editar período de IVA"}</DialogTitle><DialogDescription>Los cambios de períodos no modifican las tasas copiadas en documentos.</DialogDescription></DialogHeader>{editor && <Formulario key={`${editor.modo}-${editor.fila?.id ?? "nuevo"}`} editor={editor} abierta={abierta} pendiente={pendiente} onGuardar={guardar} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} />}</DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); setEditor(undefined); }} />
    <ConfirmarEliminacion abierto={Boolean(eliminar)} onAbiertoChange={v => { if (!v) setEliminar(undefined); }} nombre={eliminar ? `${eliminar.rate}% desde ${fecha(eliminar.validFrom)}` : ""} pendiente={pendiente} error={errorEliminar} onRestaurarFoco={restaurar} onConfirmar={async () => { if (!eliminar || pendiente) return; setPendiente(true); try { const r = await eliminarIva({ id: eliminar.id, version: eliminar.version }); if (r.ok) { setEliminar(undefined); notificar.exito(r.mensaje); router.refresh(); } else setErrorEliminar(r.mensaje); } catch { setErrorEliminar("No se pudo confirmar la eliminación. Actualiza el listado."); } finally { setPendiente(false); } }} />
  </div>;
}
