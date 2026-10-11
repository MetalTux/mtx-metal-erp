"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, RefreshCw } from "lucide-react";
import { guardarNumeracion } from "@/app/(app)/configuracion/numeracion/actions";
import { tiposNumeracion, vistaPreviaFolio } from "@/config/numeracion-documental";
import type { Numeracion } from "@/lib/tipos/numeracion";
import { numeracionSchema } from "@/lib/validaciones/numeracion";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
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

function estado(f: Numeracion) { return f.nextNumber === null ? "Sin configurar" : vistaPreviaFolio(f.prefix, f.nextNumber, f.padding) ? f.usada ? "En uso" : "Configurada" : "Agotada"; }
function Formulario({ fila, consulta, onCerrar, onCambio, onGuardado, onBloqueo }: { fila: Numeracion; consulta: boolean; onCerrar: () => void; onCambio: () => void; onGuardado: () => void; onBloqueo: (v: boolean) => void }) {
  const [prefix, setPrefix] = useState(fila.prefix);
  const [numero, setNumero] = useState(fila.nextNumber ?? "");
  const [digitos, setDigitos] = useState(fila.padding?.toString() ?? "");
  const [error, setError] = useState<string>();
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const guardarBoton = useRef<HTMLButtonElement>(null);
  const previa = vistaPreviaFolio(prefix, numero, Number(digitos));
  const salto = fila.usada && fila.nextNumber !== null && /^[0-9]{1,18}$/.test(numero) && BigInt(numero) > BigInt(fila.nextNumber);
  async function guardar() {
    if (consulta || pendiente) return;
    setPendiente(true); setError(undefined);
    try {
      const resultado = await guardarNumeracion({ id: fila.id, version: fila.version, prefix, padding: Number(digitos), nextNumber: numero });
      if (resultado.ok) { setConfirmar(false); notificar.exito(resultado.mensaje); onGuardado(); }
      else { setConfirmar(false); setError(resultado.mensaje); }
    } catch { setConfirmar(false); setError("No se pudo guardar. Revisa la conexión e inténtalo nuevamente."); }
    finally { setPendiente(false); onBloqueo(false); }
  }
  return <>
    <form className="space-y-4" onChange={onCambio} onSubmit={e => {
      e.preventDefault(); if (consulta || pendiente) return;
      const validacion = numeracionSchema.safeParse({ id: fila.id, version: fila.version, prefix, padding: Number(digitos), nextNumber: numero });
      if (!validacion.success) { setError(validacion.error.issues[0].message); return; }
      setError(undefined); onBloqueo(true); setConfirmar(true);
    }}>
      {error && <Aviso titulo={error} />}
      <p className="text-sm text-muted-foreground">Estado: {estado(fila)}. Secuencia continua, sin reinicio anual. La vista previa no consume números.</p>
      {fila.usada && <Aviso tipo="informacion" titulo="Formato bloqueado desde el primer uso" >Sólo puedes adelantar el próximo número. Los folios anteriores se conservan, aunque sus documentos se anulen.</Aviso>}
      <div className="space-y-2"><Label htmlFor="numeracion-prefijo">Prefijo (opcional)</Label><AyudaCampo nombre="Prefijo" texto="Texto antes del número, por ejemplo COT-. Hasta 20 letras o números y los signos punto, guion, barra o guion bajo. Sin espacios. Se bloquea al usar el primer folio." /><Input id="numeracion-prefijo" value={prefix} onChange={e => setPrefix(e.target.value)} readOnly={consulta || fila.usada} disabled={pendiente} maxLength={20} autoComplete="off" /></div>
      <div className="space-y-2"><Label htmlFor="numeracion-digitos">Dígitos mínimos *</Label><AyudaCampo nombre="Dígitos mínimos" texto="Entre 1 y 18. Completa con ceros a la izquierda: número 25 y cuatro dígitos produce 0025. Si el número crece, se muestran todos sus dígitos sin truncarlos. Se bloquea después del primer uso." /><Input id="numeracion-digitos" value={digitos} onChange={e => setDigitos(e.target.value)} type="number" min={1} max={18} step={1} readOnly={consulta || fila.usada} disabled={pendiente} required={!consulta} /></div>
      <div className="space-y-2"><Label htmlFor="numeracion-proximo">Próximo número *</Label><AyudaCampo nombre="Próximo número" texto="Entero positivo de hasta 18 dígitos. Es el número del siguiente documento guardado. No se define un inicio automático. Adelantar una secuencia en uso deja un salto que no podrá recuperarse." /><Input id="numeracion-proximo" value={numero} onChange={e => setNumero(e.target.value)} inputMode="numeric" readOnly={consulta || estado(fila) === "Agotada"} disabled={pendiente} maxLength={19} autoComplete="off" required={!consulta} /></div>
      <div className="rounded-md border bg-muted/40 p-3 text-sm">Vista previa: <span className="font-mono tabular-nums">{previa ?? "Completa una configuración válida"}</span></div>
      <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button ref={guardarBoton} type="submit" disabled={pendiente || estado(fila) === "Agotada"}>Guardar configuración</Button>}</DialogFooter>
    </form>
    <ConfirmarAccion abierto={confirmar} onAbiertoChange={v => { setConfirmar(v); onBloqueo(v); }} titulo="Confirmar numeración" descripcion={salto ? `Se adelantará el próximo número de ${fila.nextNumber} a ${BigInt(numero).toString()}. Los números omitidos no podrán recuperarse. ¿Los datos son correctos?` : `El próximo folio será ${previa}. El formato quedará bloqueado cuando se guarde el primer documento. ¿Los datos son correctos?`} accion="Guardar configuración" pendiente={pendiente} onConfirmar={guardar} onDevolverFoco={() => guardarBoton.current?.focus()} />
    {/* La capa padre también impide cerrar el formulario mientras su confirmación esté abierta. */}
  </>;
}
export function NumeracionDocumental({ filas }: { filas: Numeracion[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ fila: Numeracion; consulta: boolean }>();
  const [descarte, setDescarte] = useState(false);
  const modificado = useRef(false);
  const bloqueado = useRef(false);
  const retorno = useRef<HTMLElement | null>(null);
  const actualizar = useRef<HTMLButtonElement>(null);
  function cerrar() { if (bloqueado.current) return; if (editor && !editor.consulta && modificado.current) setDescarte(true); else setEditor(undefined); }
  function abrir(fila: Numeracion, consulta: boolean) { retorno.current = document.activeElement as HTMLElement; modificado.current = false; setEditor({ fila, consulta }); }
  const columnas: ColumnaDatos<Numeracion>[] = [
    { id: "tipo", header: "Documento", accessorFn: f => tiposNumeracion[f.type] },
    { id: "estado", header: "Estado", accessorFn: estado },
    { accessorKey: "prefix", header: "Prefijo", cell: ({ row }) => row.original.prefix || "Sin prefijo" },
    { accessorKey: "nextNumber", header: "Próximo número", cell: ({ row }) => <span className="tabular-nums">{row.original.nextNumber ?? "Sin definir"}</span> },
    { id: "ejemplo", header: "Vista previa", cell: ({ row }) => <span className="font-mono">{vistaPreviaFolio(row.original.prefix, row.original.nextNumber ?? "", row.original.padding) ?? "—"}</span> },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex gap-1"><BotonConAyuda variant="ghost" size="sm" ayuda="Consulta la configuración sin consumir un folio." onClick={() => abrir(row.original, true)} aria-label={`Ver ${tiposNumeracion[row.original.type]}`}><Eye />Ver</BotonConAyuda><BotonConAyuda variant="ghost" size="sm" ayuda="Configura el inicio y formato; después del primer uso sólo puedes adelantar la secuencia." onClick={() => abrir(row.original, false)} disabled={estado(row.original) === "Agotada"} aria-label={`Configurar ${tiposNumeracion[row.original.type]}`}><Pencil />Configurar</BotonConAyuda></div> },
  ];
  return <>
    <PageHeader titulo="Numeración documental" descripcion="Define los folios internos de cotizaciones, órdenes y guías." acciones={<BotonConAyuda ref={actualizar} ayuda="Vuelve a consultar las configuraciones guardadas." variant="outline" onClick={() => router.refresh()}><RefreshCw />Actualizar</BotonConAyuda>} />
    <Aviso tipo="informacion" titulo="Elige el número inicial de cada documento antes de utilizarlo" >El folio se asignará al guardar cada documento por primera vez. Los números externos de órdenes del cliente y facturas se registran por separado.</Aviso>
    <div className="mt-4"><DataTable datos={filas} columnas={columnas} textoBusqueda={f => `${tiposNumeracion[f.type]} ${estado(f)} ${f.prefix}`} filtroPlaceholder="Buscar documento, estado o prefijo…" nombre="configuraciones" vacio={<p>No se encontraron configuraciones.</p>} /></div>
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={e => { if (bloqueado.current || descarte) e.preventDefault(); }} onInteractOutside={e => e.preventDefault()} onCloseAutoFocus={e => { e.preventDefault(); (retorno.current?.isConnected ? retorno.current : actualizar.current)?.focus(); }}>
      <DialogHeader><DialogTitle>{editor?.consulta ? "Ver" : "Configurar"} numeración — {editor && tiposNumeracion[editor.fila.type]}</DialogTitle><DialogDescription>Consulta o configura el próximo folio. Los tipos documentales son fijos.</DialogDescription></DialogHeader>
      {editor && <Formulario key={`${editor.fila.id}-${editor.fila.version}-${editor.consulta}`} fila={editor.fila} consulta={editor.consulta} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} onGuardado={() => { setEditor(undefined); router.refresh(); }} />}
    </DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); setEditor(undefined); }} />
  </>;
}
