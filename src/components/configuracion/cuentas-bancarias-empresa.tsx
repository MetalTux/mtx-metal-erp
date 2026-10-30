"use client";
import { Permiso } from "@/components/seguridad/permisos";
import { useRef, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Star, Ban, CheckCircle } from "lucide-react";
import { consultarCuentasEmpresa, guardarCuentaEmpresa, cambiarPrincipalEmpresa, cambiarEstadoCuentaEmpresa } from "@/app/(app)/configuracion/empresa/cuentas-actions";
import type { CuentaBancaria, ResultadoCuentaBancaria } from "@/lib/tipos/cuenta-bancaria";
import { cuentaBancariaSchema, type DatosCuentaBancaria } from "@/lib/validaciones/cuenta-bancaria";
import { formatearRut } from "@/lib/validaciones/rut";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { SectionCard } from "@/components/section-card";
import { Aviso } from "@/components/alertas/aviso";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { notificar } from "@/components/alertas/notificaciones";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Editor = { modo: "crear" | "ver" | "editar"; cuenta?: CuentaBancaria };
const campos: { nombre: keyof DatosCuentaBancaria; titulo: string; ayuda: string; max: number }[] = [
  { nombre: "bankName", titulo: "Banco", max: 100, ayuda: "Nombre del banco donde está registrada la cuenta. Por ahora se ingresa como texto." },
  { nombre: "accountType", titulo: "Tipo de cuenta", max: 100, ayuda: "Indica el tipo, por ejemplo Cuenta corriente, Cuenta vista o Cuenta de ahorro. Por ahora es texto libre." },
  { nombre: "accountNumber", titulo: "Número de cuenta", max: 60, ayuda: "Copia el número completo. Se conserva como texto, incluidos ceros iniciales, letras o guiones; no se calcula ni convierte a número." },
  { nombre: "holderName", titulo: "Nombre del titular", max: 150, ayuda: "Nombre o razón social del titular de esta cuenta. Puede diferir del nombre configurado en Empresa." },
  { nombre: "holderRut", titulo: "RUT del titular", max: 20, ayuda: "RUT de quien figura como titular. Debe tener un dígito verificador válido; acepta puntos y guion." },
  { nombre: "email", titulo: "Correo (opcional)", max: 254, ayuda: "Correo para enviar el comprobante de transferencia. Puedes dejarlo vacío." },
];
function FormularioCuenta({ editor, pendiente, onCerrar, onCambio, onGuardar }: { editor: Editor; pendiente: boolean; onCerrar: () => void; onCambio: () => void; onGuardar: (datos: DatosCuentaBancaria) => Promise<ResultadoCuentaBancaria> }) {
  const consulta = editor.modo === "ver", cuenta = editor.cuenta;
  const [valores, setValores] = useState<DatosCuentaBancaria>({ bankName: cuenta?.bankName ?? "", accountType: cuenta?.accountType ?? "", accountNumber: cuenta?.accountNumber ?? "", holderName: cuenta?.holderName ?? "", holderRut: cuenta ? formatearRut(cuenta.holderRut) : "", email: cuenta?.email ?? "" });
  const [error, setError] = useState<string>();
  const [errores, setErrores] = useState<Partial<Record<keyof DatosCuentaBancaria, string[]>>>({});
  return <form className="min-w-0 space-y-4" noValidate aria-busy={pendiente} onSubmit={async e => {
    e.preventDefault(); if (consulta || pendiente) return;
    const validacion = cuentaBancariaSchema.safeParse(valores);
    if (!validacion.success) { setErrores(validacion.error.flatten().fieldErrors); setError("Revisa los campos del formulario."); return; }
    setErrores({}); setError(undefined);
    const resultado = await onGuardar(validacion.data);
    if (!resultado.ok) setError(resultado.mensaje);
  }}>
    {error && <Aviso titulo={error} />}
    {editor.modo === "crear" && <p className="text-sm text-muted-foreground">La primera cuenta será principal. Luego puedes cambiar la principal desde el listado.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{campos.map(campo => <div className="space-y-2" key={campo.nombre}>
      <div className="flex items-center gap-1"><Label htmlFor={`cuenta-${campo.nombre}`}>{campo.titulo}{!consulta && campo.nombre !== "email" && " *"}</Label><AyudaCampo nombre={campo.titulo} texto={campo.ayuda} /></div>
      <Input id={`cuenta-${campo.nombre}`} value={valores[campo.nombre]} type={campo.nombre === "email" ? "email" : "text"} onChange={e => { setValores(v => ({ ...v, [campo.nombre]: e.target.value })); onCambio(); }} readOnly={consulta} disabled={pendiente} maxLength={campo.max} autoComplete="off" aria-invalid={Boolean(errores[campo.nombre])} aria-describedby={errores[campo.nombre] ? `cuenta-${campo.nombre}-error` : undefined} />
      {errores[campo.nombre] && <p className="text-sm" role="alert" id={`cuenta-${campo.nombre}-error`}>{errores[campo.nombre]?.[0]}</p>}
    </div>)}</div>
    {cuenta && <p className="text-[13px] text-muted-foreground">{cuenta.isActive ? "Activa" : "Inactiva"}{cuenta.isPrimary && " · Principal"} · Cotizaciones asociadas: {cuenta.cotizaciones}. Los documentos anteriores conservan la copia de sus datos.</p>}
    <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Permiso permiso="configuracion.operar"><Button type="submit" disabled={pendiente}>{pendiente ? "Guardando…" : editor.modo === "crear" ? "Crear cuenta" : "Guardar cambios"}</Button></Permiso>}</DialogFooter>
  </form>;
}
export function CuentasBancariasEmpresa({ cuentasIniciales, empresaConfigurada }: { cuentasIniciales: CuentaBancaria[]; empresaConfigurada: boolean }) {
  const [cuentas, setCuentas] = useState(cuentasIniciales);
  const [editor, setEditor] = useState<Editor>();
  const [pendiente, setPendiente] = useState(false);
  const [descarte, setDescarte] = useState(false);
  const [operacion, setOperacion] = useState<{ cuenta: CuentaBancaria; tipo: "principal" | "estado"; principalId: number | null }>();
  const [errorOperacion, setErrorOperacion] = useState<string>();
  const dirty = useRef(false), retorno = useRef<HTMLElement | null>(null), crear = useRef<HTMLButtonElement>(null);
  const principalId = cuentas.find(c => c.isPrimary)?.id ?? null;
  function recordarFoco() { retorno.current = document.activeElement as HTMLElement; }
  function restaurarFoco() { (retorno.current?.isConnected ? retorno.current : crear.current)?.focus(); }
  async function recargar() { const filas = await consultarCuentasEmpresa(); setCuentas(filas); return filas; }
  async function actualizar() { setPendiente(true); try { await recargar(); } catch { notificar.error("No se pudo actualizar el listado de cuentas."); } finally { setPendiente(false); } }
  async function abrir(modo: "ver" | "editar", id: number) {
    recordarFoco(); setPendiente(true);
    try { const cuenta = (await recargar()).find(c => c.id === id); if (!cuenta) { notificar.error("La cuenta ya no está disponible."); return; } dirty.current = false; setEditor({ modo, cuenta }); }
    catch { notificar.error("No se pudo consultar la cuenta. Inténtalo nuevamente."); }
    finally { setPendiente(false); }
  }
  function cerrar() { if (pendiente) return; if (dirty.current && editor?.modo !== "ver") setDescarte(true); else setEditor(undefined); }
  async function guardar(datos: DatosCuentaBancaria): Promise<ResultadoCuentaBancaria> {
    setPendiente(true);
    try {
      const resultado = await guardarCuentaEmpresa(datos, editor?.cuenta ? { id: editor.cuenta.id, version: editor.cuenta.version } : undefined);
      if (resultado.ok) { setEditor(undefined); notificar.exito(resultado.mensaje); try { await recargar(); } catch { notificar.error("La cuenta se guardó; actualiza el listado para consultar el resultado."); } }
      return resultado;
    } catch { return { ok: false, mensaje: "No se pudo guardar. Actualiza el listado antes de reintentar." }; }
    finally { setPendiente(false); }
  }
  async function confirmar() {
    if (!operacion || pendiente) return;
    setPendiente(true); setErrorOperacion(undefined);
    try {
      const { cuenta, tipo } = operacion, ref = { id: cuenta.id, version: cuenta.version };
      const resultado = tipo === "principal" ? await cambiarPrincipalEmpresa({ ...ref, principalId: operacion.principalId }) : await cambiarEstadoCuentaEmpresa(ref, !cuenta.isActive);
      if (resultado.ok) { setOperacion(undefined); notificar.exito(resultado.mensaje); }
      else setErrorOperacion(resultado.mensaje);
      try { await recargar(); } catch { notificar.error("Actualiza el listado para consultar los datos vigentes."); }
    } catch { setErrorOperacion("No se pudo completar la operación. Revisa la conexión."); }
    finally { setPendiente(false); }
  }
  const columnas: ColumnaDatos<CuentaBancaria>[] = [
    { accessorKey: "bankName", header: "Banco" }, { accessorKey: "accountType", header: "Tipo de cuenta" }, { accessorKey: "accountNumber", header: "Número" }, { accessorKey: "holderName", header: "Titular" },
    { id: "estado", header: "Estado", accessorFn: c => c.isPrimary ? "Principal · Activa" : c.isActive ? "Activa" : "Inactiva" },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => {
      const c = row.original;
      return <div className="flex gap-1">
        <BotonConAyuda ayuda="Consulta los datos sin modificarlos." variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver cuenta ${c.accountNumber}`} onClick={() => abrir("ver", c.id)}><Eye />Ver</BotonConAyuda>
        <Permiso permiso="configuracion.operar"><BotonConAyuda ayuda="Edita la cuenta; las cotizaciones anteriores conservan sus datos históricos." variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar cuenta ${c.accountNumber}`} onClick={() => abrir("editar", c.id)}><Pencil />Editar</BotonConAyuda></Permiso>
        <Permiso permiso="configuracion.operar"><BotonConAyuda ayuda="La principal se propondrá por defecto en nuevas cotizaciones. La cuenta debe estar activa." variant="ghost" size="sm" disabled={pendiente || !c.isActive || c.isPrimary} aria-label={`Marcar principal cuenta ${c.accountNumber}`} onClick={() => { recordarFoco(); setErrorOperacion(undefined); setOperacion({ cuenta: c, tipo: "principal", principalId }); }}><Star />Principal</BotonConAyuda></Permiso>
        <Permiso permiso="configuracion.operar"><BotonConAyuda ayuda={c.isPrimary ? "Selecciona otra principal antes de desactivar esta cuenta." : c.isActive ? "Retira la cuenta de nuevas cotizaciones y conserva su historial." : "Habilita la cuenta para nuevas cotizaciones."} variant="ghost" size="sm" disabled={pendiente || c.isPrimary} aria-label={`${c.isActive ? "Desactivar" : "Activar"} cuenta ${c.accountNumber}`} onClick={() => { recordarFoco(); setErrorOperacion(undefined); setOperacion({ cuenta: c, tipo: "estado", principalId }); }}>{c.isActive ? <Ban /> : <CheckCircle />}{c.isActive ? "Desactivar" : "Activar"}</BotonConAyuda></Permiso>
      </div>;
    } },
  ];
  return <SectionCard titulo="Cuentas bancarias" descripcion="La principal se propone en nuevas cotizaciones; podrás seleccionar otra cuenta activa." contentClassName="p-0" acciones={<div className="flex flex-wrap gap-2"><BotonConAyuda ayuda="Consulta las cuentas vigentes." variant="outline" size="sm" disabled={pendiente} onClick={actualizar}><RefreshCw />Actualizar cuentas</BotonConAyuda><Permiso permiso="configuracion.operar"><BotonConAyuda ref={crear} ayuda={empresaConfigurada ? "Registra una cuenta. La primera será principal." : "Guarda primero el perfil de Empresa para registrar sus cuentas."} size="sm" disabled={pendiente || !empresaConfigurada} onClick={() => { recordarFoco(); dirty.current = false; setEditor({ modo: "crear" }); }}><Plus />Crear cuenta</BotonConAyuda></Permiso></div>}>
    {!empresaConfigurada && <div className="p-4"><Aviso tipo="informacion" titulo="Configura primero Empresa">Guarda el perfil para poder asociar cuentas bancarias. No es obligatorio agregar cuentas para configurar Empresa.</Aviso></div>}
    {errorOperacion && <div className="p-4"><Aviso titulo={errorOperacion} /></div>}
    <DataTable datos={cuentas} columnas={columnas} textoBusqueda={c => `${c.bankName} ${c.accountType} ${c.accountNumber} ${c.holderName} ${c.holderRut} ${c.isActive ? "Activa" : "Inactiva"} ${c.isPrimary ? "Principal" : ""}`} filtroPlaceholder="Buscar banco, cuenta, titular o estado…" nombre="cuentas bancarias" vacio={<p>No hay cuentas bancarias configuradas.</p>} />
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] min-w-0 overflow-y-auto overscroll-contain sm:max-w-2xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (pendiente || descarte) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurarFoco(); }}>
      <DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear cuenta bancaria" : editor?.modo === "ver" ? "Ver cuenta bancaria" : "Editar cuenta bancaria"}</DialogTitle><DialogDescription>Banco, tipo, número, titular y RUT son obligatorios. El correo es opcional.</DialogDescription></DialogHeader>
      {editor && <FormularioCuenta key={`${editor.modo}-${editor.cuenta?.id}-${editor.cuenta?.version}`} editor={editor} pendiente={pendiente} onCerrar={cerrar} onCambio={() => { dirty.current = true; }} onGuardar={guardar} />}
    </DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); setEditor(undefined); }} />
    <ConfirmarAccion abierto={Boolean(operacion)} onAbiertoChange={v => { if (!v) setOperacion(undefined); }} titulo={operacion?.tipo === "principal" ? "Cambiar cuenta principal" : operacion?.cuenta.isActive ? "Desactivar cuenta" : "Activar cuenta"} descripcion={errorOperacion ? `${errorOperacion} Cierra esta confirmación y vuelve a seleccionar la cuenta.` : operacion?.tipo === "principal" ? `La cuenta ${operacion.cuenta.accountNumber} será la principal para nuevas cotizaciones. Los documentos anteriores conservarán sus datos.` : `La cuenta ${operacion?.cuenta.accountNumber} ${operacion?.cuenta.isActive ? "dejará de aparecer" : "estará disponible"} en nuevas cotizaciones. Su historial se conserva.`} accion={operacion?.tipo === "principal" ? "Marcar principal" : operacion?.cuenta.isActive ? "Desactivar" : "Activar"} pendiente={pendiente} onConfirmar={confirmar} onDevolverFoco={restaurarFoco} />
  </SectionCard>;
}
