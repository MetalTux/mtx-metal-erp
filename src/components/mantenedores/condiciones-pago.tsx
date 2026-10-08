"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, CalendarDays, Trash2 } from "lucide-react";
import { guardarCondicionPago, eliminarCondicionPago, obtenerCondicion } from "@/app/(app)/mantenedores/condiciones-pago/actions";
import type { ResultadoCondicion, CondicionPago } from "@/lib/tipos/condicion-pago";
import { condicionPagoSchema, type DatosCondicionPago } from "@/lib/validaciones/condicion-pago";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar"; condicion?: CondicionPago };
const buscarCondicion = (condicion: CondicionPago) => `${condicion.name} ${condicion.days} días`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioCondicion({ editor, pendiente, onCerrar, onGuardar, onCambio }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onCambio: () => void; onGuardar: (datos: DatosCondicionPago) => Promise<ResultadoCondicion> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { register, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosCondicionPago>({
    resolver: zodResolver(condicionPagoSchema), defaultValues: { name: editor.condicion?.name ?? "", days: editor.condicion?.days ?? 0 },
  });
  const submit = handleSubmit(async (datos) => {
    // Enter o un submit programático tampoco deben escribir en el modo Ver.
    if (consulta || pendiente) return;
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["name", "days"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onChange={onCambio} onSubmit={submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="condicion-nombre">Nombre{!consulta && " *"}</Label><Input id="condicion-nombre" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={100} autoComplete="off" placeholder="Ej.: 30 días" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "condicion-nombre-error" : undefined} className="h-9" />{errors.name && <p id="condicion-nombre-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="condicion-plazo">Plazo (días){!consulta && " *"}</Label><AyudaCampo nombre="Plazo de pago" texto="Número de días de calendario desde la fecha de factura registrada al finalizar el trabajo. Cero significa Al día. Los abonos no cambian la fecha tope." /><Input id="condicion-plazo" {...register("days", { valueAsNumber: true })} type="number" min={0} step={1} readOnly={consulta} disabled={pendiente}  autoComplete="off" placeholder="Ej.: 30" aria-invalid={Boolean(errors.days)} aria-describedby={errors.days ? "condicion-plazo-error" : "condicion-plazo-ayuda"} className="h-9" /><p id="condicion-plazo-ayuda" className="text-xs text-muted-foreground">Días de calendario desde la fecha de factura, registrada al finalizar el trabajo. Al día corresponde a cero.</p>{errors.days && <p id="condicion-plazo-error" className="text-sm text-foreground" role="alert">{errors.days.message}</p>}</div>
    {editor.condicion && <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"><p>Cotizaciones asociadas: <span className="tabular-nums">{editor.condicion.cotizaciones}</span></p><p className="mt-1">Registro: {fecha(editor.condicion.createdAt)}</p><p className="mt-1">Última actualización: {fecha(editor.condicion.updatedAt)}</p></div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear condición" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
}

export function CondicionesPago({ condiciones }: { condiciones: CondicionPago[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [descarte, setDescarte] = useState(false);
  const modificado = useRef(false);
  function cerrarEditor() { if (pendiente) return; if (modificado.current && editor?.modo !== "ver") setDescarte(true); else setEditor(undefined); }
  const [aEliminar, setAEliminar] = useState<CondicionPago>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); modificado.current = false; setPendiente(true);
    try {
      const resultado = await obtenerCondicion(id);
      if (resultado.ok && resultado.condicion) setEditor({ modo, condicion: resultado.condicion });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar la condición. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosCondicionPago): Promise<ResultadoCondicion> {
    setPendiente(true);
    try {
      const resultado = await guardarCondicionPago(datos, editor?.modo === "editar" && editor.condicion ? { id: editor.condicion.id, version: editor.condicion.version } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar la condición. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarCondicionPago({ id: aEliminar.id, version: aEliminar.version });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar la condición. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<CondicionPago>[] = [
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "days", header: "Plazo (días)", cell: ({ row }) => <span className="tabular-nums">{row.original.days} días</span>, sortFn: (a, b) => a.original.days - b.original.days },
    { accessorKey: "cotizaciones", header: "Cotizaciones", sortFn: (a, b) => a.original.cotizaciones - b.original.cotizaciones },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <BotonConAyuda ayuda="Consulta el nombre, plazo y referencias de esta condición." variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</BotonConAyuda>
      <BotonConAyuda ayuda="Cambia el catálogo. Los plazos ya acordados en documentos conservarán su copia histórica." variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</BotonConAyuda>
      <BotonConAyuda ayuda="Elimina la condición sólo si no tiene cotizaciones asociadas." variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</BotonConAyuda>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Condiciones de Pago" descripcion="Define el plazo de pago: Al día, 30 días, 60 días, 90 días u otro plazo." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); modificado.current = false; setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear condición</Button>} />
    <SectionCard titulo="Catálogo de condiciones de pago" descripcion="Los abonos se registran aparte y no modifican el plazo acordado." contentClassName="p-0">
      <DataTable datos={condiciones} columnas={columnas} textoBusqueda={buscarCondicion} filtroPlaceholder="Buscar por nombre o días…" nombre="condiciones de pago" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={CalendarDays} titulo="Todavía no hay condiciones" descripcion="Crea una condición con su plazo de pago." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando condición…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto) cerrarEditor(); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear condición de pago" : editor?.modo === "editar" ? "Editar condición de pago" : "Ver condición de pago"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos y las cotizaciones asociadas a esta condición." : "Completa el nombre y el plazo en días. Los campos con * son obligatorios."}</DialogDescription></DialogHeader>
        {editor && <FormularioCondicion key={`${editor.modo}-${editor.condicion?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={cerrarEditor} onCambio={() => { modificado.current = true; }} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { modificado.current = false; setEditor(undefined); }} onDevolverFoco={() => { if (modificado.current) document.getElementById("condicion-nombre")?.focus(); else restaurarFoco(); }} />
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
