"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Ruler, Trash2 } from "lucide-react";
import { guardarUnidadMedida, eliminarUnidadMedida, obtenerUnidad } from "@/app/(app)/mantenedores/unidades/actions";
import type { ResultadoUnidad, UnidadMedida } from "@/lib/tipos/unidad-medida";
import { unidadMedidaSchema, type DatosUnidadMedida } from "@/lib/validaciones/unidad-medida";
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

type Editor = { modo: "crear" | "ver" | "editar"; unidad?: UnidadMedida };
const buscarUnidad = (unidad: UnidadMedida) => `${unidad.name} ${unidad.abbreviation}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioUnidad({ editor, pendiente, onCerrar, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosUnidadMedida) => Promise<ResultadoUnidad> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { register, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosUnidadMedida>({
    resolver: zodResolver(unidadMedidaSchema), defaultValues: { name: editor.unidad?.name ?? "", abbreviation: editor.unidad?.abbreviation ?? "" },
  });
  const submit = handleSubmit(async (datos) => {
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["name", "abbreviation"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onSubmit={submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="unidad-nombre">Nombre{!consulta && " *"}</Label><Input id="unidad-nombre" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={100} autoComplete="off" placeholder="Ej.: Metros" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "unidad-nombre-error" : undefined} className="h-9" />{errors.name && <p id="unidad-nombre-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="unidad-abreviatura">Abreviatura{!consulta && " *"}</Label><Input id="unidad-abreviatura" {...register("abbreviation")} readOnly={consulta} disabled={pendiente} maxLength={20} autoComplete="off" placeholder="Ej.: m" aria-invalid={Boolean(errors.abbreviation)} aria-describedby={errors.abbreviation ? "unidad-abreviatura-error" : "unidad-abreviatura-ayuda"} className="h-9" /><p id="unidad-abreviatura-ayuda" className="text-xs text-muted-foreground">Se utiliza junto a las cantidades de los materiales.</p>{errors.abbreviation && <p id="unidad-abreviatura-error" className="text-sm text-foreground" role="alert">{errors.abbreviation.message}</p>}</div>
    {editor.unidad && <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"><p>Materiales asociados: <span className="tabular-nums">{editor.unidad.materiales}</span></p><p className="mt-1">Registro: {fecha(editor.unidad.createdAt)}</p><p className="mt-1">Última actualización: {fecha(editor.unidad.updatedAt)}</p></div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear unidad" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
}

export function UnidadesMedida({ unidades }: { unidades: UnidadMedida[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [aEliminar, setAEliminar] = useState<UnidadMedida>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); setPendiente(true);
    try {
      const resultado = await obtenerUnidad(id);
      if (resultado.ok && resultado.unidad) setEditor({ modo, unidad: resultado.unidad });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar la unidad. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosUnidadMedida): Promise<ResultadoUnidad> {
    setPendiente(true);
    try {
      const resultado = await guardarUnidadMedida(datos, editor?.modo === "editar" && editor.unidad ? { id: editor.unidad.id, updatedAt: editor.unidad.updatedAt } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar la unidad. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarUnidadMedida({ id: aEliminar.id, updatedAt: aEliminar.updatedAt });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar la unidad. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<UnidadMedida>[] = [
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "abbreviation", header: "Abreviatura", cell: ({ row }) => <span className="font-mono">{row.original.abbreviation}</span> },
    { accessorKey: "materiales", header: "Materiales", sortFn: (a, b) => a.original.materiales - b.original.materiales },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</Button>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Unidades de medida" descripcion="Define cómo se miden tus materiales: kilos, metros, unidades y más." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear unidad</Button>} />
    <SectionCard titulo="Catálogo de unidades" descripcion="Cada material utiliza una única unidad de medida." contentClassName="p-0">
      <DataTable datos={unidades} columnas={columnas} textoBusqueda={buscarUnidad} filtroPlaceholder="Buscar por nombre o abreviatura…" nombre="unidades de medida" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={Ruler} titulo="Todavía no hay unidades" descripcion="Crea la primera unidad para comenzar a organizar tus materiales." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando unidad…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto && !pendiente) setEditor(undefined); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear unidad de medida" : editor?.modo === "editar" ? "Editar unidad de medida" : "Ver unidad de medida"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos y los materiales asociados a esta unidad." : "Completa el nombre y la abreviatura. Los campos con * son obligatorios."}</DialogDescription></DialogHeader>
        {editor && <FormularioUnidad key={`${editor.modo}-${editor.unidad?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
