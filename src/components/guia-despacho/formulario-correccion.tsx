"use client";
import { Prisma } from "@/generated/prisma/browser";
import { TablaPartidasGuia } from "./tabla-partidas";
import { DialogoCantidadDetalle } from "@/components/formularios/dialogo-cantidad-detalle";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PreparacionCorreccionGuia } from "@/lib/consultas/guias-despacho";
import { correccionGuiaSchema, type DatosCorreccionGuia } from "@/lib/validaciones/guia-despacho";
import { confirmarCorreccion, previsualizarCorreccion } from "@/app/(app)/trabajos/despachos/actions";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatearCantidad } from "@/lib/formato";

export function FormularioCorreccion({ preparacion: p }: { preparacion: PreparacionCorreccionGuia }) {
  const router = useRouter(), running = useRef(false), revisarBoton = useRef<HTMLButtonElement>(null), confirmarBoton = useRef<HTMLButtonElement>(null);
  const [date, setDate] = useState(p.fechaMaxima), [reason, setReason] = useState("");
  const [received, setReceived] = useState(false), [quantities, setQuantities] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<{ datos: DatosCorreccionGuia; key: string; preview: Extract<Awaited<ReturnType<typeof previsualizarCorreccion>>,{ok:true}>["preview"] } | null>(null);
  const [uncertain, setUncertain] = useState(false), [success, setSuccess] = useState(false);
  const [editor,setEditor]=useState<number>(),[confirm,setConfirm]=useState(false);
  const foco=useRef<HTMLElement|null>(null),tabla=useRef<HTMLDivElement>(null);
  const bloqueado=busy||Boolean(attempt)||Boolean(editor)||uncertain;
  const available = p.lines.filter(l => new Prisma.Decimal(l.pendiente).gt(0));
  const lineaEditor=p.lines.find(l=>l.id===editor);
  function devolverFoco(){if(foco.current?.isConnected)foco.current.focus();else tabla.current?.focus();}

  async function revisar() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    const datos: DatosCorreccionGuia = { deliveryNoteId: p.deliveryNoteId, version: p.version, date, reason,
      physicalRestitutionConfirmed: received,
      lines: available.filter(l => quantities[l.id]?.trim()).map(l => ({ deliveryNoteLineId: l.id, quantity: quantities[l.id] })) };
    try {
      const r = await previsualizarCorreccion(datos);
      if (!r.ok) { setError(r.mensaje); return; }
      setAttempt({ datos, key: crypto.randomUUID(), preview: r.preview });
    } catch { setError("No se pudo previsualizar la corrección. Actualiza y reintenta."); }
    finally { running.current = false; setBusy(false); }
  }
  async function confirmar() {
    if (running.current || !attempt) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const r = await confirmarCorreccion(attempt.datos, attempt.key);
      if (!r.ok) { setError(r.mensaje); setUncertain("incierto" in r && Boolean(r.incierto)); return; }
      setSuccess(true); setConfirm(false); setAttempt(null); setUncertain(false); router.push(`/trabajos/despachos?ver=${r.id}`); router.refresh();
    } catch { setError("Resultado incierto. Reintenta con los mismos datos y UUID."); setUncertain(true); }
    finally { running.current = false; setBusy(false); }
  }
  if (success) return <p role="status" className="text-sm text-success">Corrección registrada. La guía original y la deuda se conservan.</p>;
  if (!available.length) return <p role="status" className="text-sm">Esta guía ya está corregida completamente.</p>;
  return <div className="min-w-0 space-y-4">
    <p className="text-sm">Corrección de <strong>{p.folio}</strong>. Indica sólo las cantidades que deseas devolver. Una corrección completa incluye todo el pendiente de todas las partidas.</p>
    <fieldset disabled={bloqueado} className="min-w-0 space-y-4 disabled:opacity-70">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Fecha de devolución<Input type="date" min={p.fechaMinima} max={p.fechaMaxima} value={date} onChange={e => setDate(e.target.value)} /></label><label className="text-sm">Motivo obligatorio<Textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label></div>
      <div ref={tabla} tabIndex={-1} className="min-w-0"><TablaPartidasGuia titulo="Partidas de la guía original" columnas={["Partida original","Bodega original / prestación","Unidad","Entregado original","Pendiente retornable","Cantidad corrección","Estado","Acciones"]} numericas={["Entregado original","Pendiente retornable","Cantidad corrección"]} filas={p.lines.map(l=>({id:l.id,celdas:[`#${l.id} · ${l.descripcion}`,l.bodega??"Prestación: reversión sin inventario",l.unidad,formatearCantidad(l.quantity),formatearCantidad(l.pendiente),quantities[l.id]?formatearCantidad(quantities[l.id]):"Sin corrección",new Prisma.Decimal(l.pendiente).gt(0)?"Disponible":"Corregida completamente",<Button key="editar" variant="outline" aria-label={`Editar corrección ${l.id}`} disabled={new Prisma.Decimal(l.pendiente).lte(0)} onClick={()=>{foco.current=document.activeElement as HTMLElement;setEditor(l.id);}}>Editar</Button>]}))}/></div>
      {available.some(l => l.warehouseId !== null) && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={received} onChange={e => setReceived(e.target.checked)} className="mt-1" />Confirmo que las cantidades de bienes indicadas fueron recibidas físicamente en sus bodegas originales.</label>}
    </fieldset>
    <p className="text-sm text-muted-foreground">Factura, deuda y abonos se conservan. La devolución física repone stock y reserva propia; no permite revertir la producción histórica.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {uncertain && <p role="status" className="text-sm text-warning">Conserva este intento y vuelve a confirmar con el mismo UUID.</p>}
    <Button ref={revisarBoton} disabled={bloqueado||!available.some(l=>quantities[l.id]?.trim())} onClick={() => void revisar()}>Previsualizar corrección</Button>
    {attempt&&<section aria-label="Previsualización de corrección" className="min-w-0 space-y-3 rounded-md border p-3 text-sm"><h3 className="font-medium">Corrección que se confirmará · {attempt.datos.date.split("-").reverse().join("-")}</h3><p className="whitespace-pre-wrap break-words">Motivo: {attempt.datos.reason}</p><TablaPartidasGuia titulo="Partidas de esta corrección" columnas={["Partida original","Descripción","Bodega original / prestación","Cantidad","Unidad"]} numericas={["Cantidad"]} filas={attempt.preview.lines.map(l=>({id:l.id,celdas:[`#${l.id}`,l.descripcion,l.warehouseId?p.lines.find(v=>v.id===l.id)?.bodega:"Prestación sin inventario",formatearCantidad(l.quantity),l.unidad]}))}/><p>{attempt.preview.aviso}</p><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy||confirm||uncertain} onClick={()=>{setAttempt(null);setError(null);}}>Modificar selección</Button><Button ref={confirmarBoton} disabled={busy||confirm||uncertain} onClick={()=>setConfirm(true)}>Revisar y confirmar corrección</Button></div></section>}
    {lineaEditor&&<DialogoCantidadDetalle key={lineaEditor.id} titulo="Editar cantidad a corregir" descripcion={`${lineaEditor.descripcion} · ${lineaEditor.bodega??"Prestación sin inventario"} · Máximo retornable ${formatearCantidad(lineaEditor.pendiente)} ${lineaEditor.unidad}.`} etiqueta={`Cantidad a corregir (${lineaEditor.unidad})`} inicial={quantities[lineaEditor.id]??""} permitirVacio onCerrar={()=>setEditor(undefined)} devolverFoco={devolverFoco} onAceptar={async cantidad=>{let valor="";if(cantidad){const v=correccionGuiaSchema.shape.lines.element.safeParse({deliveryNoteLineId:lineaEditor.id,quantity:cantidad});if(!v.success)return v.error.issues[0].message;if(new Prisma.Decimal(v.data.quantity).gt(lineaEditor.pendiente))return "La cantidad supera lo entregado pendiente de corrección.";valor=v.data.quantity;}setQuantities(v=>({...v,[lineaEditor.id]:valor}));setError(null);setEditor(undefined);}}/>}
    <ConfirmarAccion abierto={confirm} onAbiertoChange={v => { if (!v && !busy && !uncertain) { setConfirm(false); setError(null); } }} titulo="Confirmar corrección de guía" descripcion={error ?? `${attempt?.preview.aviso ?? ""} Se corregirán ${attempt?.datos.lines.length ?? 0} partidas con fecha ${attempt?.datos.date??date}.`} accion={uncertain?"Reintentar misma corrección":"Confirmar corrección"} onDevolverFoco={() => confirmarBoton.current?.focus()} pendiente={busy} onConfirmar={() => void confirmar()} />
  </div>;
}
