"use client";
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
export function FormularioSalida({ preparacion: p }: { preparacion: PreparacionGuiaDespacho }) {
  const router = useRouter();
  const hoy = p.fechaMaxima;
  const [date, setDate] = useState(hoy), [note, setNote] = useState("");
  const [lines, setLines] = useState<Entrada[]>(() => p.partidas.flatMap<Entrada>(l => l.bodegas.length
    ? l.bodegas.filter(b => b.compatible && b.kardexConciliado).map(b => ({ workOrderLineId: l.id, warehouseId: b.warehouseId, quantity: "", conformityName: null, conformityDate: null }))
    : ["SERVICIO", "A_MEDIDA"].includes(l.modo) ? [{ workOrderLineId: l.id, warehouseId: null, quantity: "", conformityName: "", conformityDate: hoy }] : []));
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previsualizarSalida>> | null>(null);
  const [key, setKey] = useState<string | null>(null), [uncertain, setUncertain] = useState(false);
  const running = useRef(false), confirmarBoton = useRef<HTMLButtonElement>(null);
  const change = (index: number, patch: Partial<Entrada>) => { setLines(v => v.map((l, i) => i === index ? { ...l, ...patch } : l)); setPreview(null); setKey(null); setUncertain(false); setError(null); };
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
      setPreview(r); setKey(crypto.randomUUID());
    } catch { setError("No se pudo comprobar la previsualización. Actualiza la OT y reintenta."); }
    finally { running.current = false; setBusy(false); }
  }
  async function confirmar() {
    if (running.current || !key) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const r = await confirmarSalida(datos, key);
      if (!r.ok) { setError(r.mensaje); setUncertain("incierto" in r && Boolean(r.incierto)); return; }
      setConfirm(false); setPreview(null); setKey(null); setUncertain(false);
      router.push(`/trabajos/despachos?ver=${r.id}`); router.refresh();
    } catch { setError("No se pudo comprobar el resultado. Reintenta con los mismos datos y UUID."); setUncertain(true); }
    finally { running.current = false; setBusy(false); }
  }
  if (!p.elegible) return <p className="text-sm text-warning">Resuelve las condiciones de la OT antes de preparar una salida.</p>;
  return <div className="space-y-4">
    <p className="text-sm">Selecciona las cantidades por partida y bodega. El máximo orientativo se revalidará al confirmar.</p>
    <fieldset disabled={busy || confirm || uncertain} className="min-w-0 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Fecha de salida<Input type="date" min={p.fechaMinima ?? undefined} max={hoy} value={date} onChange={e => { setDate(e.target.value); setPreview(null); setKey(null); }} /></label>
      <label className="text-sm">Observación<Textarea value={note} maxLength={2000} onChange={e => { setNote(e.target.value); setPreview(null); setKey(null); }} /></label></div>
    {lines.map((item, index) => { const l = p.partidas.find(x => x.id === item.workOrderLineId)!; const b = l.bodegas.find(x => x.warehouseId === item.warehouseId);
      return <div key={`${l.id}/${item.warehouseId ?? "conformidad"}`} className="grid gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
        <div><p className="font-medium">{l.descripcion}</p><p>{b ? `${b.bodega} · Reserva propia ${formatearCantidad(b.reservadoPropio)} ${l.unidad}` : "Conformidad del cliente"}</p><p>Pendiente {formatearCantidad(l.pendiente)} {l.unidad} · Máximo orientativo {formatearCantidad(b?.utilizable ?? l.maximoPrevisualizable)} {l.unidad}</p></div>
        <label>Cantidad ({l.unidad})<Input inputMode="decimal" value={item.quantity} onChange={e => change(index, { quantity: e.target.value })} placeholder="0,000" /></label>
        {item.warehouseId === null && <><label>Nombre de quien da conformidad<Input value={item.conformityName ?? ""} maxLength={150} onChange={e => change(index, { conformityName: e.target.value })} /></label><label>Fecha de conformidad<Input type="date" max={date} value={item.conformityDate ?? ""} onChange={e => change(index, { conformityDate: e.target.value })} /></label></>}
      </div>;
    })}
    </fieldset>
    {preview?.ok && <section aria-label="Previsualización de salida" className="space-y-2 rounded-md border p-3 text-sm"><p className="font-medium">Salida que se confirmará · {date.split("-").reverse().join("-")}</p><p>Destino: {String(preview.preview.sucursal.branchName)} · {String(preview.preview.sucursal.address)} · {String(preview.preview.sucursal.city)}</p>{preview.preview.lines.map((l,i) => <p key={i}>{l.descripcion}: {formatearCantidad(l.quantity)} {p.partidas.find(v => v.id === l.workOrderLineId)?.unidad} · {l.warehouseId ? p.partidas.find(v => v.id === l.workOrderLineId)?.bodegas.find(b => b.warehouseId === l.warehouseId)?.bodega : `Conformidad: ${l.conformityName} · ${l.conformityDate?.split("-").reverse().join("-")}`}</p>)}<p>{preview.preview.aviso}</p><Button ref={confirmarBoton} disabled={busy || uncertain} onClick={() => setConfirm(true)}>Confirmar salida y entrega</Button></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {uncertain && <p className="text-sm text-warning">El resultado es incierto. Conserva los datos y vuelve a confirmar con la misma clave antes de hacer otro despacho.</p>}
    <Button type="button" disabled={busy || uncertain || !lines.length || !datos.lines.length} onClick={() => void revisar()}>Previsualizar salida</Button>
    <ConfirmarAccion abierto={confirm} onAbiertoChange={v => { if (!busy && !uncertain) setConfirm(v); }} titulo="Confirmar salida y entrega"
      descripcion={error ?? (preview?.ok ? `Se confirmarán ${preview.preview.lines.length} partidas de ${String(preview.preview.sucursal.branchName)} con fecha ${date}. Se descontará el stock físico y se consumirá su reserva propia en una transacción.` : "Revisa la previsualización.")}
      accion="Confirmar salida" onDevolverFoco={() => confirmarBoton.current?.focus()} pendiente={busy} onConfirmar={() => void confirmar()} />
  </div>;
}
