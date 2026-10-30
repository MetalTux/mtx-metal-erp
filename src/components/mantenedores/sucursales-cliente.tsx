"use client";
import { Permiso } from "@/components/seguridad/permisos";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { sucursalClienteSchema, type DatosSucursalCliente } from "@/lib/validaciones/cliente";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { Aviso } from "@/components/alertas/aviso";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type LineaSucursalCliente = DatosSucursalCliente & { uid: string };
type EditorSucursal = { modo: "agregar" | "editar" | "ver"; linea: LineaSucursalCliente };

/** El diálogo sólo valida/aplica una sucursal al borrador del formulario principal. */
function DetalleSucursal({ editor, lineas, onAplicar, onCerrar, onCambio }: {
  editor: EditorSucursal;
  lineas: LineaSucursalCliente[];
  onAplicar: (datos: DatosSucursalCliente) => void;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const consulta = editor.modo === "ver";
  const [error, setError] = useState<string>();
  const { uid, ...datos } = editor.linea;
  const { register, handleSubmit, formState: { errors } } = useForm<DatosSucursalCliente>({
    resolver: zodResolver(sucursalClienteSchema), defaultValues: datos,
  });
  const enviar = handleSubmit(sucursal => {
    if (consulta) return;
    if (lineas.some(l => l.uid !== uid && l.name.trim().toLocaleLowerCase("es-CL") === sucursal.name.toLocaleLowerCase("es-CL"))) {
      setError("Ya existe una sucursal con ese nombre dentro del cliente."); return;
    }
    onAplicar(sucursal);
  });
  const campos = [
    ["name", "Nombre de sucursal", "text", 150], ["address", "Dirección", "text", 250], ["city", "Ciudad", "text", 100],
    ["contact", "Nombre de contacto", "text", 150], ["phone", "Teléfono de contacto", "tel", 40], ["email", "Correo de contacto (opcional)", "email", 254],
  ] as const;

  return <form className="min-w-0 space-y-4" noValidate onChange={() => { setError(undefined); onCambio(); }} onSubmit={event => {
    // Un portal React propaga eventos al formulario de Clientes: Enter debe aplicar sólo esta fila.
    event.preventDefault(); event.stopPropagation();
    if (!consulta) void enviar(event);
  }}>
    {error && <Aviso titulo={error} />}
    <div className="grid gap-3 sm:grid-cols-2">
      {campos.map(([campo, titulo, tipo, limite]) => <div key={campo} className="min-w-0 space-y-1">
        <Label htmlFor={`sucursal-detalle-${campo}`}>{titulo}{!consulta && campo !== "email" && " *"}</Label>
        <Input id={`sucursal-detalle-${campo}`} type={tipo} {...register(campo)} readOnly={consulta || (campo === "name" && editor.linea.isHeadOffice)} maxLength={limite} aria-invalid={Boolean(errors[campo])} aria-describedby={errors[campo] ? `sucursal-detalle-${campo}-error` : undefined} />
        {errors[campo] && <p id={`sucursal-detalle-${campo}-error`} role="alert" className="text-sm text-destructive">{errors[campo]?.message}</p>}
      </div>)}
    </div>
    <p className="text-[13px] text-muted-foreground">Casa Central es obligatoria. Los datos de contacto pertenecen a esta sucursal. Para registrarlos en el sistema debes guardar el cliente.</p>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>
      {!consulta && <Button type="submit">{editor.modo === "agregar" ? "Agregar al detalle" : "Aplicar cambios"}</Button>}
    </DialogFooter>
  </form>;
}

/** Grilla y diálogos sobre el listado: ninguna acción escribe sucursales por separado. */
export function SucursalesCliente({ lineas, consulta, pendiente, error, onAplicar, onQuitar, onBloqueo }: {
  lineas: LineaSucursalCliente[]; consulta: boolean; pendiente: boolean; error?: string;
  onAplicar: (uid: string | null, datos: DatosSucursalCliente) => void;
  onQuitar: (uid: string) => void;
  onBloqueo: (bloqueado: boolean) => void;
}) {
  const [editor, setEditor] = useState<EditorSucursal>();
  const [descarte, setDescarte] = useState(false);
  const [aQuitar, setAQuitar] = useState<LineaSucursalCliente>();
  const modificado = useRef(false);
  const retorno = useRef<HTMLElement | null>(null);
  const agregar = useRef<HTMLButtonElement>(null);
  const detalle = useRef<HTMLDivElement>(null);
  function restaurar() { (retorno.current?.isConnected ? retorno.current : agregar.current)?.focus(); }
  function abrir(modo: EditorSucursal["modo"], linea?: LineaSucursalCliente) {
    retorno.current = document.activeElement as HTMLElement; modificado.current = false; onBloqueo(true);
    setEditor({ modo, linea: linea ?? { uid: crypto.randomUUID(), name: "", isHeadOffice: false, address: "", city: "", contact: "", phone: "", email: "" } });
  }
  function terminar() { setEditor(undefined); onBloqueo(false); }
  function cerrar() {
    if (pendiente || descarte) return;
    if (modificado.current && editor?.modo !== "ver") setDescarte(true); else terminar();
  }

  return <>
    <fieldset disabled={pendiente} className="min-w-0 space-y-3">
      <legend id="sucursales-titulo" className="mb-2 font-medium">Sucursales</legend>
      <AyudaCampo nombre="Sucursales del cliente" texto="Casa Central es obligatoria. Cada sucursal tiene dirección, ciudad y contacto propios. Agregar, editar o quitar modifica sólo este borrador; los cambios se registran al guardar el cliente. Las cotizaciones conservarán sus datos históricos." />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="min-w-0 rounded-md border">
        {/* En móvil cada fila se apila con etiquetas; en escritorio la tabla reparte el ancho disponible. */}
        <Table aria-label="Sucursales del cliente" className="block w-full table-fixed md:table">
          <TableHeader className="hidden bg-card-header md:table-header-group"><TableRow><TableHead className="w-[20%]">Sucursal</TableHead><TableHead className="w-[25%] whitespace-normal">Dirección / Ciudad</TableHead><TableHead className="w-[17%]">Contacto</TableHead><TableHead className="w-[20%] whitespace-normal">Teléfono / Correo</TableHead><TableHead className="w-[18%]">Acciones</TableHead></TableRow></TableHeader>
          <TableBody className="block md:table-row-group">
            {lineas.map(linea => <TableRow key={linea.uid} className="grid min-w-0 grid-cols-1 gap-1 p-3 sm:grid-cols-2 md:table-row md:p-0">
              <TableCell className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] sm:col-span-2 md:table-cell"><span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Sucursal</span><p className="font-medium">{linea.name || "Sin nombre"}</p>{linea.isHeadOffice && <p className="text-[13px] text-muted-foreground">Casa Central obligatoria</p>}{!sucursalClienteSchema.safeParse(linea).success && <p className="text-xs text-warning">Datos pendientes</p>}</TableCell>
              <TableCell className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] md:table-cell"><span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Dirección / Ciudad</span><p>{linea.address || "Sin dirección"}</p><p className="text-[13px] text-muted-foreground">{linea.city || "Sin ciudad"}</p></TableCell>
              <TableCell className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] md:table-cell"><span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Contacto</span>{linea.contact || "Sin contacto"}</TableCell>
              <TableCell className="block min-w-0 whitespace-normal [overflow-wrap:anywhere] md:table-cell"><span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Teléfono / Correo</span><p>{linea.phone || "Sin teléfono"}</p><p className="text-[13px] text-muted-foreground">{linea.email || "Sin correo"}</p></TableCell>
              <TableCell className="block min-w-0 sm:col-span-2 md:table-cell"><span className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Acciones</span><div className="flex flex-wrap gap-1">
                <BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Ver sucursal ${linea.name}`} ayuda="Consulta dirección y contacto de esta sucursal." disabled={pendiente} onClick={() => abrir("ver", linea)}><Eye />Ver</BotonConAyuda>
                {!consulta && <>
                  <Permiso permiso="clientes.operar"><BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Editar sucursal ${linea.name}`} ayuda="Edita esta sucursal sin salir del cliente." disabled={pendiente} onClick={() => abrir("editar", linea)}><Pencil />Editar</BotonConAyuda></Permiso>
                  {!linea.isHeadOffice && <BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Quitar sucursal ${linea.name}`} ayuda="Quita la sucursal del borrador con confirmación. Una sucursal con cotizaciones no se podrá eliminar al guardar." disabled={pendiente} onClick={() => { retorno.current = document.activeElement as HTMLElement; onBloqueo(true); setAQuitar(linea); }}><Trash2 />Quitar</BotonConAyuda>}
                </>}
              </div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      {!consulta && <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">{lineas.length} de 100 sucursales · Se guardan junto con el cliente.</p>
        <Button ref={agregar} id="cliente-agregar-sucursal" type="button" variant="outline" disabled={pendiente || lineas.length >= 100} onClick={() => abrir("agregar")}><Plus />Agregar sucursal</Button>
      </div>}
    </fieldset>
    <Dialog open={Boolean(editor)} onOpenChange={abierto => { if (!abierto) cerrar(); }}>
      <DialogContent ref={detalle} className="max-h-[85dvh] min-w-0 overflow-y-auto overscroll-contain sm:max-w-xl" showCloseButton={!pendiente} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.stopPropagation(); if (pendiente || descarte) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}>
        <DialogHeader><DialogTitle>{editor?.modo === "agregar" ? "Agregar sucursal" : editor?.modo === "editar" ? "Editar sucursal" : "Ver sucursal"}</DialogTitle><DialogDescription>Dirección, ciudad y contacto propios de la sucursal.</DialogDescription></DialogHeader>
        {editor && <DetalleSucursal key={`${editor.modo}-${editor.linea.uid}`} editor={editor} lineas={lineas} onCambio={() => { modificado.current = true; }} onCerrar={cerrar} onAplicar={datos => { onAplicar(editor.modo === "agregar" ? null : editor.linea.uid, datos); terminar(); }} />}
      </DialogContent>
    </Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); terminar(); }} onDevolverFoco={() => { if (detalle.current?.isConnected) detalle.current.focus(); }} />
    <ConfirmarEliminacion abierto={Boolean(aQuitar)} onAbiertoChange={v => { if (!v) { setAQuitar(undefined); onBloqueo(false); } }} nombre={aQuitar?.name ?? ""} pendiente={pendiente} onConfirmar={() => { if (aQuitar && !aQuitar.isHeadOffice) onQuitar(aQuitar.uid); setAQuitar(undefined); onBloqueo(false); }} onRestaurarFoco={restaurar} />
  </>;
}
