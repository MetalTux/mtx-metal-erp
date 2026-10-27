"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PreparacionCorreccionGuia } from "@/lib/consultas/guias-despacho";
import type { DatosCorreccionGuia } from "@/lib/validaciones/guia-despacho";
import { confirmarCorreccion, previsualizarCorreccion } from "@/app/(app)/trabajos/despachos/actions";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatearCantidad } from "@/lib/formato";

export function FormularioCorreccion({ preparacion: p }: { preparacion: PreparacionCorreccionGuia }) {
  const router = useRouter(), running = useRef(false), revisarBoton = useRef<HTMLButtonElement>(null);
  const [date, setDate] = useState(p.fechaMaxima), [reason, setReason] = useState("");
  const [received, setReceived] = useState(false), [quantities, setQuantities] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<{ datos: DatosCorreccionGuia; key: string; aviso: string } | null>(null);
  const [uncertain, setUncertain] = useState(false), [success, setSuccess] = useState(false);
  const available = p.lines.filter(l => l.pendiente !== "0.000");
  async function revisar() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    const datos: DatosCorreccionGuia = { deliveryNoteId: p.deliveryNoteId, version: p.version, date, reason,
      physicalRestitutionConfirmed: received,
      lines: available.filter(l => quantities[l.id]?.trim()).map(l => ({ deliveryNoteLineId: l.id, quantity: quantities[l.id] })) };
    try {
      const r = await previsualizarCorreccion(datos);
      if (!r.ok) { setError(r.mensaje); return; }
      setAttempt({ datos, key: crypto.randomUUID(), aviso: r.preview.aviso });
    } catch { setError("No se pudo previsualizar la corrección. Actualiza y reintenta."); }
    finally { running.current = false; setBusy(false); }
  }
  async function confirmar() {
    if (running.current || !attempt) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const r = await confirmarCorreccion(attempt.datos, attempt.key);
      if (!r.ok) { setError(r.mensaje); setUncertain("incierto" in r && Boolean(r.incierto)); return; }
      setSuccess(true); setAttempt(null); setUncertain(false); router.push(`/trabajos/despachos?ver=${r.id}`); router.refresh();
    } catch { setError("Resultado incierto. Reintenta con los mismos datos y UUID."); setUncertain(true); }
    finally { running.current = false; setBusy(false); }
  }
  if (success) return <p role="status" className="text-sm text-success">Corrección registrada. La guía original y la deuda se conservan.</p>;
  if (!available.length) return <p role="status" className="text-sm">Esta guía ya está corregida completamente.</p>;
  return <div className="space-y-4">
    <p className="text-sm">Corrección de <strong>{p.folio}</strong>. Indica sólo las cantidades que deseas devolver. Una corrección completa incluye todo el pendiente de todas las partidas.</p>
    <fieldset disabled={busy || Boolean(attempt)} className="space-y-4 disabled:opacity-70">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Fecha de devolución<Input type="date" min={p.fechaMinima} max={p.fechaMaxima} value={date} onChange={e => setDate(e.target.value)} /></label><label className="text-sm">Motivo obligatorio<Textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label></div>
      {available.map(l => <div key={l.id} className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2"><div><p className="font-medium">{l.descripcion}</p><p>{l.bodega ? `Bodega original: ${l.bodega}` : "Prestación: reversión de entrega acreditada, sin inventario"}</p><p>Pendiente de corrección: {formatearCantidad(l.pendiente)} {l.unidad}</p></div><label>Cantidad a corregir ({l.unidad})<Input inputMode="decimal" placeholder="Sin devolución" value={quantities[l.id] ?? ""} onChange={e => setQuantities(v => ({ ...v, [l.id]: e.target.value }))} /></label></div>)}
      {available.some(l => l.warehouseId !== null) && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={received} onChange={e => setReceived(e.target.checked)} className="mt-1" />Confirmo que las cantidades de bienes indicadas fueron recibidas físicamente en sus bodegas originales.</label>}
    </fieldset>
    <p className="text-sm text-muted-foreground">Factura, deuda y abonos se conservan. La devolución física repone stock y reserva propia; no permite revertir la producción histórica.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {uncertain && <p role="status" className="text-sm text-warning">Conserva este intento y vuelve a confirmar con el mismo UUID.</p>}
    <Button ref={revisarBoton} disabled={busy || Boolean(attempt)} onClick={() => void revisar()}>Previsualizar corrección</Button>
    <ConfirmarAccion abierto={Boolean(attempt)} onAbiertoChange={v => { if (!v && !busy && !uncertain) { setAttempt(null); setError(null); } }} titulo="Confirmar corrección de guía" descripcion={error ?? `${attempt?.aviso ?? ""} Se corregirán ${attempt?.datos.lines.length ?? 0} partidas con fecha ${date}.`} accion="Confirmar corrección" onDevolverFoco={() => revisarBoton.current?.focus()} pendiente={busy} onConfirmar={() => void confirmar()} />
  </div>;
}
