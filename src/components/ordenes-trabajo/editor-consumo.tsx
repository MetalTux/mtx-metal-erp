"use client";

import { useRef, useState } from "react";
import type { CatalogosTrabajo } from "@/lib/consultas/ordenes-trabajo";
import { produccionSchema, type RegistroProduccion } from "@/lib/validaciones/produccion";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Consumo = RegistroProduccion["consumptions"][number];
type Revision = RegistroProduccion["roundingReviews"][number];
export type EdicionConsumo = { tipo: "consumo"; clave: string; datos: Consumo } | { tipo: "revision"; nombre: string; datos: Revision };

export function EditorConsumo({ inicial, catalogos: c, onAceptar, onCerrar, devolverFoco }: {
  inicial: EdicionConsumo; catalogos: CatalogosTrabajo; onAceptar: (v: EdicionConsumo) => string | void; onCerrar: () => void; devolverFoco: () => void;
}) {
  const [d, setD] = useState(() => structuredClone(inicial));
  const [error, setError] = useState<string>(), [descarte, setDescarte] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  function cerrar() { if (descarte) return; if (JSON.stringify(d) !== JSON.stringify(inicial)) setDescarte(true); else onCerrar(); }
  function aceptar() {
    const validado = d.tipo === "consumo" ? produccionSchema.shape.consumptions.element.safeParse(d.datos) : produccionSchema.shape.roundingReviews.element.safeParse(d.datos);
    if (!validado.success) { setError(validado.error.issues[0].message); return; }
    if (d.tipo === "consumo") {
      const b = c.warehouses.find(w => w.id === d.datos.warehouseId);
      if (!b || !["MATERIA_PRIMA", "MIXTA"].includes(b.classification ?? "")) { setError("Selecciona una bodega de materia prima o mixta."); return; }
      const mensaje = onAceptar({ ...d, datos: produccionSchema.shape.consumptions.element.parse(d.datos) });
      if (mensaje) setError(mensaje);
    } else { const mensaje = onAceptar({ ...d, datos: produccionSchema.shape.roundingReviews.element.parse(d.datos) }); if (mensaje) setError(mensaje); }
  }
  return <><Dialog open onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); cerrar(); }} onCloseAutoFocus={e => { e.preventDefault(); devolverFoco(); }}>
    <DialogHeader><DialogTitle>{d.tipo === "consumo" ? "Consumo real" : "Revisión de redondeo del lote"}</DialogTitle><DialogDescription>Aceptar aplica al borrador del registro; todavía no mueve stock.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); e.stopPropagation(); aceptar(); }}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-sm">Unidad: {c.raws.find(m => m.id === d.datos.rawMaterialId)?.unitName ?? "Unidad histórica del material"}</p>
      <p className="break-words">{d.tipo === "consumo" ? c.raws.find(m => m.id === d.datos.rawMaterialId)?.name : d.nombre}</p>
      {d.tipo === "consumo" && <SelectorBuscable id="bodega-consumo-editor" nombre="bodega de consumo real" placeholder="Seleccionar bodega…" valor={d.datos.warehouseId ? String(d.datos.warehouseId) : ""} opciones={c.warehouses.filter(w => ["MATERIA_PRIMA", "MIXTA"].includes(w.classification ?? "")).map(w => ({ valor: String(w.id), etiqueta: w.name }))} onChange={v => { setD({ ...d, datos: { ...d.datos, warehouseId: Number(v) } }); setError(undefined); }} />}
      <label className="block space-y-2 text-sm">Cantidad positiva<Input ref={entrada} aria-label="Cantidad del detalle de producción" inputMode="decimal" value={d.datos.quantity.replace(".", ",")} onChange={e => { setD(d.tipo === "consumo" ? { ...d, datos: { ...d.datos, quantity: e.target.value } } : { ...d, datos: { ...d.datos, quantity: e.target.value } }); setError(undefined); }} /></label>
      {d.tipo === "revision" && <label className="block space-y-2 text-sm">Motivo obligatorio<Textarea aria-label="Motivo de revisión del lote" maxLength={1000} value={d.datos.reason} onChange={e => { setD({ ...d, datos: { ...d.datos, reason: e.target.value } }); setError(undefined); }} /></label>}
      <DialogFooter><Button type="button" variant="outline" onClick={cerrar}>Cancelar detalle</Button><Button type="submit">Aceptar detalle</Button></DialogFooter>
    </form>
  </DialogContent></Dialog><ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={onCerrar} onDevolverFoco={() => entrada.current?.focus()} /></>;
}
