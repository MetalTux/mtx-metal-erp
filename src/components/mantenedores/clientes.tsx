"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Users, Trash2, Building2 } from "lucide-react";
import { guardarDatosCliente, eliminarDatosCliente, obtenerCliente } from "@/app/(app)/mantenedores/clientes/actions";
import { formatearRut, normalizarRut } from "@/lib/validaciones/rut";
import type { ResultadoCliente, Cliente } from "@/lib/tipos/cliente";
import { clienteSchema, type DatosCliente } from "@/lib/validaciones/cliente";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar" | "sucursales"; cliente?: Cliente };
const buscarCliente = (cliente: Cliente) => `${cliente.name} ${cliente.rut} ${normalizarRut(cliente.rut).replace("-", "")} ${formatearRut(cliente.rut)} ${cliente.contact ?? ""} ${cliente.email ?? ""} ${cliente.phone ?? ""}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

const sucursalNueva = (central = false) => ({ name: central ? "Casa Central" : "", isHeadOffice: central, address: "", city: "", contact: "", phone: "", email: "" });

/** Cliente y sucursales son un único borrador: cancelar no escribe cambios parciales. */
function FormularioCliente({ editor, pendiente, onCerrar, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosCliente) => Promise<ResultadoCliente> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const [descarte, setDescarte] = useState(false);
  const [eliminarSucursal, setEliminarSucursal] = useState<number>();
  const { register, handleSubmit, control, formState: { errors, isDirty } } = useForm<DatosCliente>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      rut: editor.cliente ? formatearRut(editor.cliente.rut) : "", name: editor.cliente?.name ?? "",
      contact: editor.cliente?.contact ?? "", email: editor.cliente?.email ?? "", phone: editor.cliente?.phone ?? "",
      branches: editor.cliente?.branches.length ? editor.cliente.branches.map(b => ({ id: b.id, name: b.name, isHeadOffice: b.isHeadOffice, address: b.address ?? "", city: b.city ?? "", contact: b.contact ?? "", phone: b.phone ?? "", email: b.email ?? "" })) : [sucursalNueva(true)],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "branches", keyName: "claveFormulario" });
  const cerrar = () => { if (pendiente) return; if (!consulta && isDirty) setDescarte(true); else onCerrar(); };
  const submit = handleSubmit(async datos => {
    if (consulta || pendiente) return;
    setError(undefined);
    const r = await onGuardar(datos);
    if (!r.ok) setError(r.mensaje);
  });
  const generales = [
    ["rut", "RUT", "text", 20], ["name", "Nombre del cliente", "text", 150],
    ["contact", "Contacto general", "text", 150], ["phone", "Teléfono general", "tel", 40], ["email", "Correo general (opcional)", "email", 254],
  ] as const;
  return <>
    <form onSubmit={consulta ? e => e.preventDefault() : submit} noValidate aria-busy={pendiente} className="space-y-5">
      {error && <Aviso titulo={error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {generales.map(([campo, titulo, tipo, limite]) => <div key={campo} className="space-y-1">
          <Label htmlFor={`cliente-${campo}`}>{titulo}{!consulta && campo !== "email" && " *"}</Label>
          <Input id={`cliente-${campo}`} type={tipo} {...register(campo)} readOnly={consulta} disabled={pendiente} maxLength={limite} aria-invalid={Boolean(errors[campo])} aria-describedby={errors[campo] ? `cliente-${campo}-error` : undefined} />
          {errors[campo] && <p id={`cliente-${campo}-error`} role="alert" className="text-sm text-destructive">{errors[campo]?.message}</p>}
        </div>)}
      </div>
      <section className="space-y-3" aria-labelledby="sucursales-titulo">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="sucursales-titulo" className="font-medium">Sucursales</h3>
          <AyudaCampo nombre="Sucursales del cliente" texto="Casa Central es obligatoria. Cada sucursal tiene dirección, ciudad y contacto propios. Los cambios se guardan junto con el cliente; las cotizaciones conservarán la copia de los datos acordados." />
          {!consulta && <Button id="cliente-agregar-sucursal" type="button" variant="outline" disabled={pendiente || fields.length >= 100} onClick={() => append(sucursalNueva())}><Plus />Agregar sucursal</Button>}
        </div>
        {editor.cliente?.branches.some(b => b.legacyIncomplete) && <Aviso tipo="informacion" titulo="Completa los datos de Casa Central">Se conservaron los contactos existentes. Completa dirección, ciudad y contactos pendientes antes de guardar.</Aviso>}
        {errors.branches?.message && <p role="alert" className="text-sm text-destructive">{errors.branches.message}</p>}
        {fields.map((b, i) => <div key={b.claveFormulario} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2"><p className="font-medium">{b.isHeadOffice ? "Casa Central" : `Sucursal ${i + 1}`}</p>
            {!consulta && !b.isHeadOffice && <BotonConAyuda ayuda="Quita la sucursal al guardar el cliente. Si tiene cotizaciones, se rechazará la eliminación." type="button" variant="ghost" disabled={pendiente} aria-label={`Eliminar sucursal ${i + 1}`} onClick={() => setEliminarSucursal(i)}><Trash2 />Eliminar</BotonConAyuda>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{([
            ["name", "Nombre de sucursal", "text", 150], ["address", "Dirección", "text", 250], ["city", "Ciudad", "text", 100],
            ["contact", "Nombre de contacto", "text", 150], ["phone", "Teléfono de contacto", "tel", 40], ["email", "Correo de contacto (opcional)", "email", 254],
          ] as const).map(([campo, titulo, tipo, limite]) => <div key={campo} className="space-y-1">
            <Label htmlFor={`sucursal-${i}-${campo}`}>{titulo}{!consulta && campo !== "email" && " *"}</Label>
            <Input id={`sucursal-${i}-${campo}`} type={tipo} {...register(`branches.${i}.${campo}`)} readOnly={consulta || (campo === "name" && b.isHeadOffice)} disabled={pendiente} maxLength={limite} aria-invalid={Boolean(errors.branches?.[i]?.[campo])} aria-describedby={errors.branches?.[i]?.[campo] ? `sucursal-${i}-${campo}-error` : undefined} />
            {errors.branches?.[i]?.[campo] && <p id={`sucursal-${i}-${campo}-error`} role="alert" className="text-sm text-destructive">{errors.branches[i]?.[campo]?.message}</p>}
          </div>)}</div>
        </div>)}
      </section>
      {editor.cliente && <p className="text-xs text-muted-foreground">Cotizaciones: {editor.cliente.cotizaciones} · Última actualización: {fecha(editor.cliente.updatedAt)}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={pendiente} id="cliente-cancelar" onClick={cerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear cliente" : "Guardar cambios"}</Button>}</DialogFooter>
    </form>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={onCerrar} onDevolverFoco={() => document.getElementById("cliente-rut")?.focus()} />
    <ConfirmarEliminacion abierto={eliminarSucursal !== undefined} onAbiertoChange={v => { if (!v) setEliminarSucursal(undefined); }} nombre={eliminarSucursal === undefined ? "" : fields[eliminarSucursal]?.name || `Sucursal ${eliminarSucursal + 1}`} pendiente={pendiente} onConfirmar={() => { if (eliminarSucursal !== undefined) remove(eliminarSucursal); setEliminarSucursal(undefined); }} onRestaurarFoco={() => document.getElementById("cliente-agregar-sucursal")?.focus()} />
  </>;
}

export function Clientes({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [aEliminar, setAEliminar] = useState<Cliente>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar" | "sucursales", id: number) {
    recordarFoco(); setPendiente(true);
    try {
      const resultado = await obtenerCliente(id);
      if (resultado.ok && resultado.cliente) setEditor({ modo, cliente: resultado.cliente });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar el cliente. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosCliente): Promise<ResultadoCliente> {
    setPendiente(true);
    try {
      const resultado = await guardarDatosCliente(datos, editor?.modo !== "crear" && editor?.cliente ? { id: editor.cliente.id, updatedAt: editor.cliente.updatedAt } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar el cliente. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarDatosCliente({ id: aEliminar.id, updatedAt: aEliminar.updatedAt });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar el cliente. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<Cliente>[] = [
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "rut", header: "RUT", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatearRut(row.original.rut)}</span> },
    { accessorKey: "contact", header: "Contacto", cell: ({ row }) => row.original.contact ? <span className="block max-w-48 truncate" title={row.original.contact}>{row.original.contact}</span> : <span className="text-muted-foreground">Sin contacto</span> },
    { accessorKey: "email", header: "Correo", cell: ({ row }) => row.original.email ? <span className="block max-w-56 truncate" title={row.original.email}>{row.original.email}</span> : <span className="text-muted-foreground">Sin correo</span> },
    { accessorKey: "phone", header: "Teléfono", cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">Sin teléfono</span> },
    { accessorKey: "cotizaciones", header: "Cotizaciones", cell: ({ row }) => <span className="tabular-nums">{row.original.cotizaciones}</span> },
    { id: "sucursales", header: "Sucursales", cell: ({ row }) => row.original.branches.length },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
      <BotonConAyuda ayuda="Administra las sucursales y sus contactos sin salir de Clientes." variant="ghost" size="sm" disabled={pendiente} aria-label={`Sucursales de ${row.original.name}`} onClick={() => abrir("sucursales", row.original.id)}><Building2 />Sucursales</BotonConAyuda>
      <Button variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</Button>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Clientes" descripcion="Administra tus clientes y sus datos de contacto." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear cliente</Button>} />
    <SectionCard titulo="Catálogo de clientes" descripcion="Consulta el RUT, los datos de contacto y las cotizaciones asociadas." contentClassName="p-0">
      <DataTable datos={clientes} columnas={columnas} textoBusqueda={buscarCliente} filtroPlaceholder="Buscar por nombre, RUT o contacto…" nombre="clientes" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={Users} titulo="Todavía no hay clientes" descripcion="Crea el primer cliente para preparar tus cotizaciones." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando cliente…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto && !pendiente) setEditor(undefined); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-3xl" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { event.preventDefault(); if (!pendiente) document.getElementById("cliente-cancelar")?.click(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear cliente" : editor?.modo === "sucursales" ? "Sucursales del cliente" : editor?.modo === "editar" ? "Editar cliente" : "Ver cliente"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos de contacto y las cotizaciones asociadas a este cliente." : "Completa datos generales y sucursales. Nombre y teléfono de contacto, dirección y ciudad son obligatorios; correo opcional."}</DialogDescription></DialogHeader>
        {editor && <FormularioCliente key={`${editor.modo}-${editor.cliente?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
