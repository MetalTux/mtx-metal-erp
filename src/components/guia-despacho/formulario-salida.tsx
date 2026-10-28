"use client";
import { Prisma } from "@/generated/prisma/browser";
import { EditorSalidaGuia } from "./editor-salida";
import { TablaPartidasGuia } from "./tabla-partidas";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PreparacionGuiaDespacho } from "@/lib/consultas/guias-despacho";
import type { DatosGuiaDespacho } from "@/lib/validaciones/guia-despacho";
import { confirmarSalida, previsualizarSalida } from "@/app/(app)/trabajos/despachos/actions";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatearCantidad } from "@/lib/formato";

type Entrada = DatosGuiaDespacho["lines"][number];
const identidad = (l: Entrada) => `${l.workOrderLineId}/${l.warehouseId ?? "conformidad"}`;
export function FormularioSalida({ preparacion: p }: { preparacion: PreparacionGuiaDespacho }) {
  const router = useRouter();
  const hoy = p.fechaMaxima;
  const [date, setDate] = useState(hoy), [note, setNote] = useState("");
  const [lines, setLines] = useState<Entrada[]>(() => p.partidas.flatMap<Entrada>(l => l.bodegas.length
    ? l.bodegas.filter(b => b.compatible && b.kardexConciliado).map(b => ({ workOrderLineId: l.id, warehouseId: b.warehouseId, quantity: "", conformityName: null, conformityDate: null }))
    : ["SERVICIO", "A_MEDIDA"].includes(l.modo) ? [{ workOrderLineId: l.id, warehouseId: null, quantity: "", conformityName: "", conformityDate: hoy }] : []));
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previsualizarSalida>> | null>(null);
  const [attempt, setAttempt] = useState<{datos:DatosGuiaDespacho;key:string}|null>(null), [uncertain, setUncertain] = useState(false);
  const running = useRef(false), confirmarBoton = useRef<HTMLButtonElement>(null);
  const [editor,setEditor]=useState<{linea:Entrada;descripcion:string;origen:string;unidad:string;maximo:string}>();
  const foco=useRef<HTMLElement|null>(null),tabla=useRef<HTMLDivElement>(null);
  const bloqueado=busy||confirm||uncertain||Boolean(editor);
  function invalidar(){setPreview(null);setAttempt(null);setError(null);}
  function maximo(item:Entrada){const l=p.partidas.find(l=>l.id===item.workOrderLineId)!;const b=l.bodegas.find(b=>b.warehouseId===item.warehouseId);const otras=lines.filter(v=>v.workOrderLineId===item.workOrderLineId&&identidad(v)!==identidad(item)).reduce((s,v)=>s.plus(v.quantity||"0"),new Prisma.Decimal(0));return Prisma.Decimal.max(0,Prisma.Decimal.min(b?.utilizable??l.maximoPrevisualizable,new Prisma.Decimal(l.pendiente).minus(otras),new Prisma.Decimal(l.maximoPrevisualizable).minus(otras))).toFixed(3);}
  function devolverFoco(){if(foco.current?.isConnected)foco.current.focus();else tabla.current?.focus();}

  const datos = useMemo((): DatosGuiaDespacho => ({ workOrderId: p.workOrderId, version: p.workOrderVersion, date, note,
    lines: lines.filter(l => Boolean(l.quantity.trim())).map(l => ({ ...l,
      conformityName: l.warehouseId === null ? l.conformityName : null,
      conformityDate: l.warehouseId === null ? l.conformityDate : null })) }), [p.workOrderId, p.workOrderVersion, date, note, lines]);
  async function revisar() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const r = await previsualizarSalida(datos);
      if (!r.ok) { setError(r.mensaje); setPreview(null); return; }
      setPreview(r); setAttempt({datos:structuredClone(datos),key:crypto.randomUUID()});
    } catch { setError("No se pudo comprobar la previsualización. Actualiza la OT y reintenta."); }
    finally { running.current = false; setBusy(false); }
  }
  async function confirmar() {
    if (running.current || !attempt) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const r = await confirmarSalida(attempt.datos, attempt.key);
      if (!r.ok) { setError(r.mensaje); setUncertain("incierto" in r && Boolean(r.incierto)); return; }
      setConfirm(false); setPreview(null); setAttempt(null); setUncertain(false);
      router.push(`/trabajos/despachos?ver=${r.id}`); router.refresh();
    } catch { setError("No se pudo comprobar el resultado. Reintenta con los mismos datos y UUID."); setUncertain(true); }
    finally { running.current = false; setBusy(false); }
  }
  if (!p.elegible) return <p className="text-sm text-warning">Resuelve las condiciones de la OT antes de preparar una salida.</p>;
  return <div className="min-w-0 space-y-4">
    <p className="text-sm">Selecciona las cantidades por partida y bodega. El máximo orientativo se revalidará al confirmar.</p>
    <fieldset disabled={bloqueado} className="min-w-0 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Fecha de salida<Input type="date" min={p.fechaMinima ?? undefined} max={hoy} value={date} onChange={e => { setDate(e.target.value); invalidar(); }} /></label>
      <label className="text-sm">Observación<Textarea value={note} maxLength={2000} onChange={e => { setNote(e.target.value); invalidar(); }} /></label></div>
    <div ref={tabla} tabIndex={-1} className="min-w-0"><TablaPartidasGuia titulo="Partidas para salida" columnas={["Partida OT","Bodega / prestación","Unidad","Pendiente","Reserva propia","Máximo orientativo","Cantidad salida","Conformidad / estado","Acciones"]} numericas={["Pendiente","Reserva propia","Máximo orientativo","Cantidad salida"]} filas={lines.map(item=>{const l=p.partidas.find(v=>v.id===item.workOrderLineId)!;const b=l.bodegas.find(v=>v.warehouseId===item.warehouseId);const limite=maximo(item);return {id:identidad(item),celdas:[`#${l.id} · ${l.descripcion}`,b?.bodega??"Prestación con conformidad",l.unidad,formatearCantidad(l.pendiente),b?formatearCantidad(b.reservadoPropio):"No aplica",formatearCantidad(limite),item.quantity?formatearCantidad(item.quantity):"Sin salida",l.motivos.length?l.motivos.join(" · "):item.warehouseId===null?(item.quantity?`${item.conformityName} · ${item.conformityDate?.split("-").reverse().join("-")}`:"Sin conformidad seleccionada"):"Bien físico",<Button key="editar" variant="outline" aria-label={`Editar salida ${identidad(item)}`} disabled={!item.quantity&&(l.motivos.length>0||new Prisma.Decimal(limite).lte(0))} onClick={()=>{foco.current=document.activeElement as HTMLElement;setEditor({linea:{...item},descripcion:l.descripcion,origen:b?.bodega??"Conformidad del cliente",unidad:l.unidad,maximo:limite});}}>Editar</Button>]};})}/></div>
    </fieldset>
    {preview?.ok && <section aria-label="Previsualización de salida" className="min-w-0 space-y-2 rounded-md border p-3 text-sm"><p className="font-medium">Salida que se confirmará · {date.split("-").reverse().join("-")}</p><p>Destino: {String(preview.preview.sucursal.branchName)} · {String(preview.preview.sucursal.address)} · {String(preview.preview.sucursal.city)}</p><TablaPartidasGuia titulo="Salida que se confirmará" columnas={["Partida OT","Descripción","Bodega / prestación","Cantidad","Unidad","Conformidad"]} numericas={["Cantidad"]} filas={preview.preview.lines.map(l=>({id:`${l.workOrderLineId}/${l.warehouseId??"conformidad"}`,celdas:[`#${l.workOrderLineId}`,l.descripcion,l.warehouseId?p.partidas.find(v=>v.id===l.workOrderLineId)?.bodegas.find(b=>b.warehouseId===l.warehouseId)?.bodega:"Prestación sin inventario",formatearCantidad(l.quantity),p.partidas.find(v=>v.id===l.workOrderLineId)?.unidad,l.warehouseId?"No aplica":`${l.conformityName} · ${l.conformityDate?.split("-").reverse().join("-")}`]}))}/><p>{preview.preview.aviso}</p><Button ref={confirmarBoton} disabled={bloqueado} onClick={() => setConfirm(true)}>Confirmar salida y entrega</Button></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {uncertain && <p className="text-sm text-warning">El resultado es incierto. Conserva los datos y vuelve a confirmar con la misma clave antes de hacer otro despacho.</p>}
    <Button type="button" disabled={bloqueado || !lines.length || !datos.lines.length} onClick={() => void revisar()}>Previsualizar salida</Button>
    {editor&&<EditorSalidaGuia key={identidad(editor.linea)} inicial={editor.linea} descripcion={editor.descripcion} origen={editor.origen} unidad={editor.unidad} maximo={editor.maximo} fechaSalida={date} onAceptar={item=>{setLines(v=>v.map(l=>identidad(l)===identidad(item)?item:l));invalidar();setEditor(undefined);}} onCerrar={()=>setEditor(undefined)} devolverFoco={devolverFoco}/>}
    <ConfirmarAccion abierto={confirm} onAbiertoChange={v => { if (!busy && !uncertain) setConfirm(v); }} titulo="Confirmar salida y entrega"
      descripcion={error ?? (preview?.ok ? `Se confirmarán ${preview.preview.lines.length} partidas de ${String(preview.preview.sucursal.branchName)} con fecha ${date}. Se descontará el stock físico y se consumirá su reserva propia en una transacción.` : "Revisa la previsualización.")}
      accion={uncertain?"Reintentar misma salida":"Confirmar salida"} onDevolverFoco={() => confirmarBoton.current?.focus()} pendiente={busy} onConfirmar={() => void confirmar()} />
  </div>;
}
