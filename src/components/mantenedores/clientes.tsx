"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Users, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar"; cliente?: Cliente };
const buscarCliente = (cliente: Cliente) => `${cliente.name} ${cliente.rut} ${normalizarRut(cliente.rut).replace("-", "")} ${formatearRut(cliente.rut)} ${cliente.contact ?? ""} ${cliente.email ?? ""} ${cliente.phone ?? ""}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioCliente({ editor, pendiente, onCerrar, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosCliente) => Promise<ResultadoCliente> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { register, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosCliente>({
    resolver: zodResolver(clienteSchema), defaultValues: { rut: editor.cliente ? formatearRut(editor.cliente.rut) : "", name: editor.cliente?.name ?? "", contact: editor.cliente?.contact ?? "", email: editor.cliente?.email ?? "", phone: editor.cliente?.phone ?? "" },
  });
  const submit = handleSubmit(async (datos) => {
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["rut", "name", "contact", "email", "phone"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onSubmit={consulta ? (event) => event.preventDefault() : submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="cliente-rut">RUT{!consulta && " *"}</Label><Input id="cliente-rut" type="text" {...register("rut")} readOnly={consulta} disabled={pendiente} maxLength={20} autoComplete="off" placeholder="Ej.: 12.345.678-5" aria-invalid={Boolean(errors.rut)} aria-describedby={errors.rut ? "cliente-rut-error" : "cliente-rut-ayuda"} className="h-9" /><p id="cliente-rut-ayuda" className="text-xs text-muted-foreground">Puedes ingresarlo con o sin puntos y guion.</p>{errors.rut && <p id="cliente-rut-error" className="text-sm text-foreground" role="alert">{errors.rut.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="cliente-name">Nombre{!consulta && " *"}</Label><Input id="cliente-name" type="text" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={150} autoComplete="organization" placeholder="Ej.: Constructora del Sur" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "cliente-name-error" : undefined} className="h-9" />{errors.name && <p id="cliente-name-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="cliente-contact">Persona de contacto (opcional)</Label><Input id="cliente-contact" {...register("contact")} readOnly={consulta} disabled={pendiente} maxLength={150} autoComplete="name" placeholder="Ej.: María Pérez" aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? "cliente-contact-error" : undefined} className="h-9" />{errors.contact && <p id="cliente-contact-error" className="text-sm text-foreground" role="alert">{errors.contact.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="cliente-email">Correo (opcional)</Label><Input id="cliente-email" type="email" {...register("email")} readOnly={consulta} disabled={pendiente} maxLength={254} autoComplete="email" placeholder="Ej.: ventas@cliente.cl" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "cliente-email-error" : undefined} className="h-9" />{errors.email && <p id="cliente-email-error" className="text-sm text-foreground" role="alert">{errors.email.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="cliente-phone">Teléfono (opcional)</Label><Input id="cliente-phone" type="tel" {...register("phone")} readOnly={consulta} disabled={pendiente} maxLength={40} autoComplete="tel" placeholder="Ej.: +56 9 1234 5678" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "cliente-phone-error" : undefined} className="h-9" />{errors.phone && <p id="cliente-phone-error" className="text-sm text-foreground" role="alert">{errors.phone.message}</p>}</div>
    {editor.cliente && <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Cotizaciones asociadas: <span className="tabular-nums">{editor.cliente.cotizaciones}</span></p>
      <p>Registro: {fecha(editor.cliente.createdAt)}</p><p>Última actualización: {fecha(editor.cliente.updatedAt)}</p>
    </div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear cliente" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
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

  async function abrir(modo: "ver" | "editar", id: number) {
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
      const resultado = await guardarDatosCliente(datos, editor?.modo === "editar" && editor.cliente ? { id: editor.cliente.id, updatedAt: editor.cliente.updatedAt } : undefined);
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
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
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
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear cliente" : editor?.modo === "editar" ? "Editar cliente" : "Ver cliente"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos de contacto y las cotizaciones asociadas a este cliente." : "Completa el RUT y el nombre. Los datos de contacto son opcionales."}</DialogDescription></DialogHeader>
        {editor && <FormularioCliente key={`${editor.modo}-${editor.cliente?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
