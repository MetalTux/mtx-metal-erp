"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, LoaderCircle, Pencil, Plus, RefreshCw, Truck, Trash2 } from "lucide-react";
import { guardarDatosProveedor, eliminarDatosProveedor, obtenerProveedor } from "@/app/(app)/mantenedores/proveedores/actions";
import { formatearRut, normalizarRut } from "@/lib/validaciones/rut";
import type { ResultadoProveedor, Proveedor } from "@/lib/tipos/proveedor";
import { proveedorSchema, type DatosProveedor } from "@/lib/validaciones/proveedor";
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

type Editor = { modo: "crear" | "ver" | "editar"; proveedor?: Proveedor };
const buscarProveedor = (proveedor: Proveedor) => `${proveedor.name} ${proveedor.rut} ${normalizarRut(proveedor.rut).replace("-", "")} ${formatearRut(proveedor.rut)} ${proveedor.email ?? ""} ${proveedor.phone ?? ""}`;
const fecha = (valor: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(valor));

function FormularioProveedor({ editor, pendiente, onCerrar, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onGuardar: (datos: DatosProveedor) => Promise<ResultadoProveedor> }) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { register, handleSubmit, setError: setErrorCampo, formState: { errors } } = useForm<DatosProveedor>({
    resolver: zodResolver(proveedorSchema), defaultValues: { rut: editor.proveedor ? formatearRut(editor.proveedor.rut) : "", name: editor.proveedor?.name ?? "", email: editor.proveedor?.email ?? "", phone: editor.proveedor?.phone ?? "" },
  });
  const submit = handleSubmit(async (datos) => {
    setError(undefined);
    const resultado = await onGuardar(datos);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      for (const campo of ["rut", "name", "email", "phone"] as const) {
        if (resultado.campos?.[campo]?.[0]) setErrorCampo(campo, { message: resultado.campos[campo][0] }, { shouldFocus: true });
      }
    }
  });
  return <form onSubmit={consulta ? (event) => event.preventDefault() : submit} noValidate aria-busy={pendiente} className="space-y-4">
    {error && <Aviso titulo={error} />}
    <div className="space-y-2"><Label htmlFor="proveedor-rut">RUT{!consulta && " *"}</Label><Input id="proveedor-rut" type="text" {...register("rut")} readOnly={consulta} disabled={pendiente} maxLength={20} autoComplete="off" placeholder="Ej.: 12.345.678-5" aria-invalid={Boolean(errors.rut)} aria-describedby={errors.rut ? "proveedor-rut-error" : "proveedor-rut-ayuda"} className="h-9" /><p id="proveedor-rut-ayuda" className="text-xs text-muted-foreground">Puedes ingresarlo con o sin puntos y guion.</p>{errors.rut && <p id="proveedor-rut-error" className="text-sm text-foreground" role="alert">{errors.rut.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="proveedor-name">Nombre{!consulta && " *"}</Label><Input id="proveedor-name" type="text" {...register("name")} readOnly={consulta} disabled={pendiente} maxLength={150} autoComplete="organization" placeholder="Ej.: Aceros del Sur" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "proveedor-name-error" : undefined} className="h-9" />{errors.name && <p id="proveedor-name-error" className="text-sm text-foreground" role="alert">{errors.name.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="proveedor-email">Correo (opcional)</Label><Input id="proveedor-email" type="email" {...register("email")} readOnly={consulta} disabled={pendiente} maxLength={254} autoComplete="email" placeholder="Ej.: ventas@proveedor.cl" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "proveedor-email-error" : undefined} className="h-9" />{errors.email && <p id="proveedor-email-error" className="text-sm text-foreground" role="alert">{errors.email.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="proveedor-phone">Teléfono (opcional)</Label><Input id="proveedor-phone" type="tel" {...register("phone")} readOnly={consulta} disabled={pendiente} maxLength={40} autoComplete="tel" placeholder="Ej.: +56 9 1234 5678" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "proveedor-phone-error" : undefined} className="h-9" />{errors.phone && <p id="proveedor-phone-error" className="text-sm text-foreground" role="alert">{errors.phone.message}</p>}</div>
    {editor.proveedor && <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Compras asociadas: <span className="tabular-nums">{editor.proveedor.compras}</span></p>
      <p>Registro: {fecha(editor.proveedor.createdAt)}</p><p>Última actualización: {fecha(editor.proveedor.updatedAt)}</p>
    </div>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente}>{pendiente && <LoaderCircle className="animate-spin" aria-hidden="true" />}{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear proveedor" : "Guardar cambios"}</Button>}</DialogFooter>
  </form>;
}

export function Proveedores({ proveedores }: { proveedores: Proveedor[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>();
  const [aEliminar, setAEliminar] = useState<Proveedor>();
  const [pendiente, setPendiente] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string>();
  const retornoFoco = useRef<HTMLElement | null>(null);
  const crearBoton = useRef<HTMLButtonElement>(null);
  function recordarFoco() { retornoFoco.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retornoFoco.current?.isConnected ? retornoFoco.current : crearBoton.current)?.focus(); }

  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); setPendiente(true);
    try {
      const resultado = await obtenerProveedor(id);
      if (resultado.ok && resultado.proveedor) setEditor({ modo, proveedor: resultado.proveedor });
      else { notificar.error(resultado.mensaje); router.refresh(); }
    } catch { notificar.error("No se pudo consultar el proveedor. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  async function guardar(datos: DatosProveedor): Promise<ResultadoProveedor> {
    setPendiente(true);
    try {
      const resultado = await guardarDatosProveedor(datos, editor?.modo === "editar" && editor.proveedor ? { id: editor.proveedor.id, updatedAt: editor.proveedor.updatedAt } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar el proveedor. Revisa la conexión e inténtalo nuevamente." }; }
    finally { setPendiente(false); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    setPendiente(true); setErrorEliminar(undefined);
    try {
      const resultado = await eliminarDatosProveedor({ id: aEliminar.id, updatedAt: aEliminar.updatedAt });
      if (resultado.ok) { setAEliminar(undefined); notificar.exito(resultado.mensaje); router.refresh(); }
      else { setErrorEliminar(resultado.mensaje); router.refresh(); }
    } catch { setErrorEliminar("No se pudo eliminar el proveedor. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }

  const columnas: ColumnaDatos<Proveedor>[] = [
    { accessorKey: "name", header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "rut", header: "RUT", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatearRut(row.original.rut)}</span> },
    { accessorKey: "email", header: "Correo", cell: ({ row }) => row.original.email ? <span className="block max-w-56 truncate" title={row.original.email}>{row.original.email}</span> : <span className="text-muted-foreground">Sin correo</span> },
    { accessorKey: "phone", header: "Teléfono", cell: ({ row }) => row.original.phone ?? <span className="text-muted-foreground">Sin teléfono</span> },
    { accessorKey: "compras", header: "Compras", cell: ({ row }) => <span className="tabular-nums">{row.original.compras}</span> },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye aria-hidden="true" />Ver</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil aria-hidden="true" />Editar</Button>
      <Button variant="ghost" size="sm" disabled={pendiente} className="hover:bg-destructive/15" aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordarFoco(); setErrorEliminar(undefined); setAEliminar(row.original); }}><Trash2 className="text-destructive" aria-hidden="true" />Eliminar</Button>
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Proveedores" descripcion="Administra tus proveedores y sus datos de contacto." acciones={<Button ref={crearBoton} disabled={pendiente} className="h-9" onClick={() => { recordarFoco(); setEditor({ modo: "crear" }); }}><Plus aria-hidden="true" />Crear proveedor</Button>} />
    <SectionCard titulo="Catálogo de proveedores" descripcion="Consulta el RUT, los datos de contacto y las compras asociadas." contentClassName="p-0">
      <DataTable datos={proveedores} columnas={columnas} textoBusqueda={buscarProveedor} filtroPlaceholder="Buscar por nombre, RUT o contacto…" nombre="proveedores" acciones={<Button variant="outline" size="sm" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />Actualizar</Button>} vacio={<EmptyState icono={Truck} titulo="Todavía no hay proveedores" descripcion="Crea el primer proveedor para registrar tus compras." />} />
    </SectionCard>
    {pendiente && !editor && !aEliminar && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Consultando proveedor…</p>}
    <Dialog open={Boolean(editor)} onOpenChange={(abierto) => { if (!abierto && !pendiente) setEditor(undefined); }}>
      <DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto rounded-lg sm:max-w-lg" onCloseAutoFocus={(event) => { event.preventDefault(); restaurarFoco(); }} onEscapeKeyDown={(event) => { if (pendiente) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear proveedor" : editor?.modo === "editar" ? "Editar proveedor" : "Ver proveedor"}</DialogTitle><DialogDescription>{editor?.modo === "ver" ? "Consulta los datos de contacto y las compras asociadas a este proveedor." : "Completa el RUT y el nombre. Los datos de contacto son opcionales."}</DialogDescription></DialogHeader>
        {editor && <FormularioProveedor key={`${editor.modo}-${editor.proveedor?.updatedAt ?? "nueva"}`} editor={editor} pendiente={pendiente} onCerrar={() => setEditor(undefined)} onGuardar={guardar} />}
      </DialogContent>
    </Dialog>
    <ConfirmarEliminacion abierto={Boolean(aEliminar)} onAbiertoChange={(abierto) => { if (!abierto) setAEliminar(undefined); }} nombre={aEliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={eliminar} onRestaurarFoco={restaurarFoco} />
  </div>;
}
