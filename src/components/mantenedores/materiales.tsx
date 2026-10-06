"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Package, Trash2 } from "lucide-react";
import { guardarDatosMaterial, eliminarDatosMaterial, obtenerMaterial } from "@/app/(app)/mantenedores/materiales/actions";
import { materialEnUso, type ResultadoMaterial, type Material, type UnidadMaterial } from "@/lib/tipos/material";
import { materialSchema, type DatosMaterial } from "@/lib/validaciones/material";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar"; material?: Material };
const buscarMaterial = (material: Material) => `${material.code} ${material.name} ${material.unidad.name} ${material.unidad.abbreviation}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioMaterial({ editor, unidades, pendiente, onCerrar, onGuardar }: { editor: Editor; unidades: UnidadMaterial[]; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosMaterial) => Promise<ResultadoMaterial> }) {
  const consulta = editor.modo === "ver";
  const unidadBloqueada = editor.modo === "editar" && Boolean(editor.material && materialEnUso(editor.material));
  const [error, setError] = useState<string>();
  const { register, control, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosMaterial>({
    resolver: zodResolver(materialSchema), defaultValues: { code: editor.material?.code ?? "", name: editor.material?.name ?? "", description: editor.material?.description ?? "", unitMeasureId: editor.material?.unitMeasureId ?? 0 },
  });
  const submit = handleSubmit(async (datos) => {
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["code", "name", "description", "unitMeasureId"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onSubmit={consulta ? (event) => event.preventDefault() : submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="material-code">Código{!consulta && " *"}</Label><Input id="material-code" {...register("code")} readOnly={consulta} disabled={pendiente} maxLength={50} autoComplete="off" placeholder="Ej.: PERF-001" aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? "material-code-error" : undefined} className="h-9" />{errors.code && <p id="material-code-error" className="text-sm text-foreground" role="alert">{errors.code.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="material-name">Nombre{!consulta && " *"}</Label><Input id="material-name" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={150} autoComplete="off" placeholder="Ej.: Perfil cuadrado 40 × 40" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "material-name-error" : undefined} className="h-9" />{errors.name && <p id="material-name-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="material-unidad">Unidad de medida{!consulta && " *"}</Label>
      {consulta || unidadBloqueada ? <Input id="material-unidad" readOnly value={`${editor.material?.unidad.name} (${editor.material?.unidad.abbreviation})`} aria-describedby={unidadBloqueada ? "material-unidad-ayuda" : undefined} className="h-9" /> : <Controller name="unitMeasureId" control={control} render={({ field }) => <SelectorBuscable ref={field.ref} id="material-unidad" opciones={unidades.map(unidad => ({ valor: String(unidad.id), etiqueta: `${unidad.name} (${unidad.abbreviation})` }))} valor={String(field.value)} onChange={valor => field.onChange(Number(valor))} onBlur={field.onBlur} nombre="unidad" placeholder="Selecciona una unidad…" disabled={pendiente || unidades.length === 0} invalido={Boolean(errors.unitMeasureId)} descripcionId={errors.unitMeasureId ? "material-unidad-error" : "material-unidad-ayuda"} />} />}
      <p id="material-unidad-ayuda" className="text-xs text-muted-foreground">{unidadBloqueada ? "La unidad no puede cambiarse porque este material tiene stock, movimientos o documentos asociados." : "Todas las cantidades del material utilizan esta unidad, sin conversiones."}</p>
      {errors.unitMeasureId && <p id="material-unidad-error" className="text-sm text-foreground" role="alert">{errors.unitMeasureId.message}</p>}
      {!unidades.length && !consulta && <Aviso titulo="No hay unidades disponibles">Crea una unidad en Unidades de medida y actualiza este listado antes de guardar.</Aviso>}
    </div>
    <div className="space-y-2"><Label htmlFor="material-description">Descripción (opcional)</Label><Textarea id="material-description" {...register("description")} readOnly={consulta} disabled={pendiente} maxLength={2000} rows={3} placeholder="Características o especificaciones del material" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "material-description-error" : undefined} />{errors.description && <p id="material-description-error" className="text-sm text-foreground" role="alert">{errors.description.message}</p>}</div>
    {editor.material && <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Referencias de este material</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
        <dt>Registros de stock</dt><dd>{editor.material.referencias.stocks}</dd>
        <dt>Movimientos</dt><dd>{editor.material.referencias.movimientos}</dd>
        <dt>Líneas de compra</dt><dd>{editor.material.referencias.compras}</dd>
        <dt>Líneas de trabajo</dt><dd>{editor.material.referencias.trabajos}</dd>
        <dt>Líneas de cotización</dt><dd>{editor.material.referencias.cotizaciones}</dd>
      </dl>
      <p>Registro: {fecha(editor.material.createdAt)}</p>
      <p>Última actualización: {fecha(editor.material.updatedAt)}</p>
    </div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente || unidades.length === 0}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear material" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
}

export function Materiales({ materiales, unidades }: { materiales: Material[]; unidades: UnidadMaterial[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [aEliminar, setAEliminar] = useState<Material>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); setPendiente(true);
    try {
      const resultado = await obtenerMaterial(id);
      if (resultado.ok && resultado.material) setEditor({ modo, material: resultado.material });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar el material. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosMaterial): Promise<ResultadoMaterial> {
    setPendiente(true);
    try {
      const resultado = await guardarDatosMaterial(datos, editor?.modo === "editar" && editor.material ? { id: editor.material.id, updatedAt: editor.material.updatedAt } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar el material. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarDatosMaterial({ id: aEliminar.id, updatedAt: aEliminar.updatedAt });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar el material. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<Material>[] = [
    { accessorKey: "code", header: "Código", cell: ({ row }) => <span className="font-mono">{row.original.code}</span> },
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: "unidad", accessorFn: material => material.unidad.name, header: "Unidad", cell: ({ row }) => `${row.original.unidad.name} (${row.original.unidad.abbreviation})` },
    { id: "referencias", header: "Referencias", enableSorting: false, cell: ({ row }) => <span className="text-muted-foreground">{materialEnUso(row.original) ? "En uso" : "Sin referencias"}</span> },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</Button>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Materias primas" descripcion="Administra los materiales y sus unidades de medida." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear material</Button>} />
    <SectionCard titulo="Catálogo de materias primas" descripcion="Consulta códigos, unidades y referencias de inventario y documentos." contentClassName="p-0">
      <DataTable datos={materiales} columnas={columnas} textoBusqueda={buscarMaterial} filtroPlaceholder="Buscar por código, nombre o unidad…" nombre="materiales" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={Package} titulo="Todavía no hay materiales" descripcion="Crea el primer material y asigna su unidad de medida." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando material…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto && !pendiente) setEditor(undefined); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear material" : editor?.modo === "editar" ? "Editar material" : "Ver material"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos, la unidad y las referencias del material." : "Completa el código, el nombre y selecciona una unidad existente."}</DialogDescription></DialogHeader>
        {editor && <FormularioMaterial key={`${editor.modo}-${editor.material?.updatedAt ?? "nueva"}`} editor={editor} unidades={unidades} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
