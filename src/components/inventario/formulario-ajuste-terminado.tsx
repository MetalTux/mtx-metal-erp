"use client";

import { useState } from "react";
import { revisarSaldoTerminado, prepararConfirmacionTerminado } from "@/app/(app)/inventario/productos-terminados/actions";
import { ajusteTerminadoSchema, hoyChile, type DatosAjusteTerminado } from "@/lib/validaciones/stock-terminado";
import type { CatalogosTerminado, FilaTerminado, ResultadoSaldoTerminado, ResultadoInicialTerminado } from "@/lib/tipos/stock-terminado";
import { motivosAjuste } from "@/config/motivos-ajuste";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { formatearCantidad } from "@/lib/formato";

/** El usuario indica el saldo final, nunca una cantidad a sumar/restar ni una reversión automática. */
export function FormularioAjusteTerminado({ catalogos, uuid, fila, pendiente, onGuardar, onCerrar, onCambio, onBloqueo }: {
  catalogos: CatalogosTerminado; uuid: string; fila?: FilaTerminado; pendiente: boolean;
  onGuardar: (datos: DatosAjusteTerminado) => Promise<ResultadoInicialTerminado>;
  onCerrar: () => void; onCambio: () => void; onBloqueo: (v: boolean) => void;
}) {
  const correccion = Boolean(fila?.documentoTipo);
  const [productoId, setProducto] = useState(fila ? String(fila.productId) : "");
  const [bodegaId, setBodega] = useState(fila ? String(fila.warehouseId) : "");
  const [motivo, setMotivo] = useState<DatosAjusteTerminado["reason"]>(correccion ? "CORRECCION_REGISTRO" : "CONTEO_FISICO");
  const [origen, setOrigen] = useState(correccion ? `${fila!.documentoTipo}:${fila!.documentoId}` : "");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(hoyChile());
  const [nota, setNota] = useState("");
  const [saldo, setSaldo] = useState<ResultadoSaldoTerminado>();
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmacion, setConfirmacion] = useState<{ datos: DatosAjusteTerminado; diferencia: string }>();
  const producto = catalogos.productos.find(p => String(p.id) === productoId);
  const bodega = catalogos.bodegas.find(b => String(b.id) === bodegaId);
  const ocupado = pendiente || revisando;
  const combinacion = { productId: Number(productoId), warehouseId: Number(bodegaId), unitMeasureId: producto?.unitMeasureId ?? 0, productVersion: producto?.version ?? 0 };
  function cerrarConfirmacion() { if (!pendiente) { setConfirmacion(undefined); onBloqueo(false); } }

  return <>
    <form className="min-w-0 space-y-4" noValidate aria-busy={ocupado} onSubmit={async event => {
      event.preventDefault();
      if (ocupado || confirmacion) return;
      if (!saldo?.ok || !saldo.puedeAjustar) { setError("Revisa primero el saldo de un inventario registrado."); return; }
      const [tipoOrigen, idOrigen] = origen.split(":");
      const v = ajusteTerminadoSchema.safeParse({ ...combinacion, finalQuantity: cantidad, date: fecha, note: nota,
        reason: motivo, correctedInitialStockId: motivo === "CORRECCION_REGISTRO" && tipoOrigen === "inicial" ? Number(idOrigen) : null,
        correctedAdjustmentId: motivo === "CORRECCION_REGISTRO" && tipoOrigen === "ajuste" ? Number(idOrigen) : null,
        reference: saldo.referencia, idempotencyKey: uuid,
      });
      if (!v.success) { setError(v.error.issues[0].message); return; }
      setRevisando(true); onBloqueo(true); setError(undefined);
      try {
        // Vista previa calculada con Decimal en servidor; no registra documentos ni altera stock.
        const r = await prepararConfirmacionTerminado(v.data);
        if (r.ok) setConfirmacion({ datos: v.data, diferencia: r.diferencia });
        else { setError(r.mensaje); onBloqueo(false); }
      } catch { setError("No se pudo preparar el ajuste. Revisa el saldo e intenta nuevamente."); onBloqueo(false); }
      finally { setRevisando(false); }
    }}>
      <Aviso tipo="informacion" titulo="Corregir el saldo físico actual">Indica cuánto producto existe realmente en esta bodega. El sistema registrará la diferencia como un ajuste y conservará el ingreso original. No consume materia prima ni revierte automáticamente cantidades históricas.</Aviso>
      {error && <Aviso titulo={error} />}
      <div className="space-y-2"><Label htmlFor="ajuste-producto">Producto terminado *</Label><SelectorBuscable id="ajuste-producto" opciones={catalogos.productos.map(p => ({ valor: String(p.id), etiqueta: `${p.name} — ${p.code}` }))} valor={productoId} onChange={v => { setProducto(v); setSaldo(undefined); setOrigen(""); onCambio(); }} nombre="producto del ajuste" placeholder="Selecciona producto…" disabled={ocupado || correccion} /><p className="text-xs text-muted-foreground">Unidad: {producto ? `${producto.nombreUnidad} (${producto.unidad})` : "Selecciona producto"}</p></div>
      <div className="space-y-2"><Label htmlFor="ajuste-bodega">Bodega *</Label><SelectorBuscable id="ajuste-bodega" opciones={catalogos.bodegas.map(b => ({ valor: String(b.id), etiqueta: b.name }))} valor={bodegaId} onChange={v => { setBodega(v); setSaldo(undefined); setOrigen(""); onCambio(); }} nombre="bodega del ajuste" placeholder="Selecciona bodega…" disabled={ocupado || correccion} /></div>
      <Button type="button" variant="outline" disabled={ocupado || !producto || !bodega} onClick={async () => {
        setRevisando(true); onBloqueo(true); setError(undefined);
        try { const r = await revisarSaldoTerminado(combinacion); setSaldo(r); if (!r.ok) setError(r.mensaje); }
        catch { setError("No se pudo revisar el saldo. Inténtalo nuevamente."); }
        finally { setRevisando(false); onBloqueo(false); }
      }}>{revisando ? "Revisando…" : "Revisar saldo"}</Button>
      {saldo?.ok && <Aviso tipo="informacion" titulo={`Saldo actual: ${formatearCantidad(saldo.referencia.quantity)} ${producto?.unidad ?? ""}`}>{saldo.puedeAjustar ? "Indica el conteo físico final, considerando los movimientos que hayan ocurrido después del ingreso." : "Esta combinación no tiene un inventario registrado. Usa Inventario inicial antes de ajustar."}</Aviso>}
      <div className="space-y-2"><Label htmlFor="ajuste-cantidad">Cantidad física final *</Label><AyudaCampo nombre="Cantidad física final" texto="Saldo correcto actual, no una diferencia. Ej.: si el sistema tiene 10 y hay 8, escribe 8; el ajuste será −2. Cero es válido y no se permiten negativos. Hasta tres decimales; un conteo sin diferencia no genera documentos." /><Input id="ajuste-cantidad" inputMode="decimal" autoComplete="off" disabled={ocupado} value={cantidad} onChange={e => { setCantidad(e.target.value); onCambio(); }} /></div>
      <div className="space-y-2"><Label htmlFor="ajuste-motivo">Motivo *</Label><SelectorBuscable id="ajuste-motivo" opciones={Object.entries(motivosAjuste).filter(([k]) => k !== "INVENTARIO_INICIAL").map(([valor, etiqueta]) => ({ valor, etiqueta }))} valor={motivo} onChange={v => { setMotivo(v as DatosAjusteTerminado["reason"]); if (v !== "CORRECCION_REGISTRO") setOrigen(""); onCambio(); }} nombre="motivo del ajuste" placeholder="Selecciona motivo…" disabled={ocupado} /></div>
      {motivo === "CORRECCION_REGISTRO" && <div className="space-y-2"><Label htmlFor="ajuste-origen">Documento que se corrige *</Label><SelectorBuscable id="ajuste-origen" opciones={saldo?.ok ? saldo.origenes.map(o => ({ valor: `${o.tipo}:${o.id}`, etiqueta: o.etiqueta })) : []} valor={origen} onChange={v => { setOrigen(v); onCambio(); }} nombre="documento de origen" placeholder="Revisa el saldo para elegir el documento…" disabled={ocupado || !saldo?.ok} /><p className="text-xs text-muted-foreground">Sólo documentos de este producto y esta bodega. Se conserva su historial.</p></div>}
      <div className="space-y-2"><Label htmlFor="ajuste-fecha">Fecha del ajuste *</Label><Input id="ajuste-fecha" type="date" max={hoyChile()} disabled={ocupado} value={fecha} onChange={e => { setFecha(e.target.value); onCambio(); }} /></div>
      <div className="space-y-2"><Label htmlFor="ajuste-nota">Observación *</Label><Textarea id="ajuste-nota" maxLength={2000} rows={3} disabled={ocupado} value={nota} onChange={e => { setNota(e.target.value); onCambio(); }} placeholder="Explica el conteo y el motivo de la diferencia." /></div>
      <p className="text-xs text-muted-foreground">El ajuste confirmado no se edita ni elimina. Otro error se corrige mediante un nuevo conteo vinculado.</p>
      <DialogFooter><Button type="button" variant="outline" disabled={ocupado} onClick={onCerrar}>Cancelar</Button><Button type="submit" disabled={ocupado || !saldo?.ok || !saldo.puedeAjustar}>{revisando ? "Preparando…" : "Revisar y confirmar ajuste"}</Button></DialogFooter>
    </form>
    <ConfirmarAccion abierto={Boolean(confirmacion)} onAbiertoChange={v => { if (!v) cerrarConfirmacion(); }} titulo="Confirmar ajuste de producto terminado" descripcion={`Producto: ${producto?.name ?? ""}. Bodega: ${bodega?.name ?? ""}. Saldo anterior: ${formatearCantidad(confirmacion?.datos.reference.quantity ?? "0")}. Saldo final: ${formatearCantidad(confirmacion?.datos.finalQuantity ?? "0")}. Diferencia: ${formatearCantidad(confirmacion?.diferencia ?? "0")} ${producto?.unidad ?? ""}. ${error ?? "Confirma el conteo; se conservará el historial y no se consumirá materia prima."}`} accion="Confirmar ajuste" pendiente={pendiente} onConfirmar={async () => {
      if (!confirmacion || pendiente) return;
      const r = await onGuardar(confirmacion.datos);
      if (!r.ok) setError(r.mensaje); // Mantener datos/UUID para un reintento de resultado incierto.
    }} />
  </>;
}
