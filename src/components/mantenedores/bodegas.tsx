"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Warehouse, Trash2 } from "lucide-react";
import { guardarDatosBodega, eliminarDatosBodega, obtenerBodega } from "@/app/(app)/mantenedores/bodegas/actions";
import type { ResultadoBodega, Bodega } from "@/lib/tipos/bodega";
import { bodegaSchema, type DatosBodega } from "@/lib/validaciones/bodega";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar"; bodega?: Bodega };
const buscarBodega = (bodega: Bodega) => `${bodega.name} ${bodega.location ?? ""}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioBodega({ editor, pendiente, onCerrar, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosBodega) => Promise<ResultadoBodega> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { register, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosBodega>({
    resolver: zodResolver(bodegaSchema), defaultValues: { name: editor.bodega?.name ?? "", location: editor.bodega?.location ?? "" },
  });
  const submit = handleSubmit(async (datos) => {
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["name", "location"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onSubmit={submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="bodega-nombre">Nombre{!consulta && " *"}</Label><Input id="bodega-nombre" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={100} autoComplete="off" placeholder="Ej.: Bodega principal" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "bodega-nombre-error" : undefined} className="h-9" />{errors.name && <p id="bodega-nombre-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="bodega-ubicacion">Ubicación (opcional)</Label><Input id="bodega-ubicacion" {...register("location")} readOnly={consulta} disabled={pendiente} maxLength={200} autoComplete="off" placeholder="Ej.: Patio norte, sector A" aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? "bodega-ubicacion-error" : "bodega-ubicacion-ayuda"} className="h-9" /><p id="bodega-ubicacion-ayuda" className="text-xs text-muted-foreground">Puedes indicar una dirección o un sector de tu taller.</p>{errors.location && <p id="bodega-ubicacion-error" className="text-sm text-foreground" role="alert">{errors.location.message}</p>}</div>
    {editor.bodega && <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Referencias de esta bodega</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
        <dt>Registros de stock</dt><dd>{editor.bodega.referencias.stocks}</dd>
        <dt>Movimientos</dt><dd>{editor.bodega.referencias.movimientos}</dd>
        <dt>Líneas de compra</dt><dd>{editor.bodega.referencias.compras}</dd>
        <dt>Líneas de trabajo</dt><dd>{editor.bodega.referencias.trabajos}</dd>
      </dl>
      <p>Registro: {fecha(editor.bodega.createdAt)}</p>
      <p>Última actualización: {fecha(editor.bodega.updatedAt)}</p>
    </div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear bodega" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
}

export function Bodegas({ bodegas }: { bodegas: Bodega[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [aEliminar, setAEliminar] = useState<Bodega>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); setPendiente(true);
    try {
      const resultado = await obtenerBodega(id);
      if (resultado.ok && resultado.bodega) setEditor({ modo, bodega: resultado.bodega });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar la bodega. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosBodega): Promise<ResultadoBodega> {
    setPendiente(true);
    try {
      const resultado = await guardarDatosBodega(datos, editor?.modo === "editar" && editor.bodega ? { id: editor.bodega.id, updatedAt: editor.bodega.updatedAt } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar la bodega. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarDatosBodega({ id: aEliminar.id, updatedAt: aEliminar.updatedAt });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar la bodega. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<Bodega>[] = [
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "location", header: "Ubicación", cell: ({ row }) => row.original.location ? <span className="block max-w-72 truncate" title={row.original.location}>{row.original.location}</span> : <span className="text-muted-foreground">Sin ubicación</span> },
    { id: "referencias", header: "Referencias", enableSorting: false, cell: ({ row }) => <span className="text-muted-foreground">{Object.values(row.original.referencias).some((cantidad) => cantidad > 0) ? "En uso" : "Sin referencias"}</span> },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</Button>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Bodegas" descripcion="Organiza las bodegas y ubicaciones donde almacenas tus materiales." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear bodega</Button>} />
    <SectionCard titulo="Catálogo de bodegas" descripcion="Identifica cada bodega y consulta sus referencias de inventario y documentos." contentClassName="p-0">
      <DataTable datos={bodegas} columnas={columnas} textoBusqueda={buscarBodega} filtroPlaceholder="Buscar por nombre o ubicación…" nombre="bodegas" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={Warehouse} titulo="Todavía no hay bodegas" descripcion="Crea la primera bodega para organizar dónde guardas tus materiales." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando bodega…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto && !pendiente) setEditor(undefined); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear bodega" : editor?.modo === "editar" ? "Editar bodega" : "Ver bodega"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta la ubicación y las referencias asociadas a esta bodega." : "Completa el nombre de la bodega. La ubicación es opcional."}</DialogDescription></DialogHeader>
        {editor && <FormularioBodega key={`${editor.modo}-${editor.bodega?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
