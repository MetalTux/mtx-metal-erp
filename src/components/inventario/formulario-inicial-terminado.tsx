"use client";
import { Permiso } from "@/components/seguridad/permisos";
import { useState } from "react";
import { revisarSaldoTerminado } from "@/app/(app)/inventario/productos-terminados/actions";
import { inicialTerminadoSchema, hoyChile, type DatosInicialTerminado } from "@/lib/validaciones/stock-terminado";
import type { CatalogosTerminado, ResultadoSaldoTerminado, ResultadoInicialTerminado } from "@/lib/tipos/stock-terminado";
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
export function FormularioInicialTerminado({ catalogos, uuid, pendiente, onGuardar, onCerrar, onCambio, onBloqueo }: {
  catalogos: CatalogosTerminado; uuid: string; pendiente: boolean;
  onGuardar: (datos: DatosInicialTerminado) => Promise<ResultadoInicialTerminado>;
  onCerrar: () => void; onCambio: () => void; onBloqueo: (v: boolean) => void;
}) {
  const [productId, setProductId] = useState(""), [warehouseId, setWarehouseId] = useState("");
  const [cantidad, setCantidad] = useState(""), [fecha, setFecha] = useState(hoyChile()), [nota, setNota] = useState("");
  // Cambiar producto o bodega invalida el saldo revisado; confirmar conserva los datos y el UUID.
  const [saldo, setSaldo] = useState<ResultadoSaldoTerminado>(), [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<string>(), [envio, setEnvio] = useState<DatosInicialTerminado>();
  const producto = catalogos.productos.find(p => String(p.id) === productId);
  const bodega = catalogos.bodegas.find(b => String(b.id) === warehouseId);
  const ocupado = pendiente || revisando;
  const combinacion = { productId: Number(productId), warehouseId: Number(warehouseId), unitMeasureId: producto?.unitMeasureId ?? 0, productVersion: producto?.version ?? 0 };
  function cerrarConfirmacion() { setEnvio(undefined); onBloqueo(false); }
  return <>
    <form className="min-w-0 space-y-4" noValidate aria-busy={ocupado} onSubmit={event => {
      event.preventDefault(); if (ocupado || envio) return;
      if (!saldo?.ok || !saldo.puedeInicial) { setError("Revisa primero que esta combinación permita inventario inicial."); return; }
      const v = inicialTerminadoSchema.safeParse({ ...combinacion, quantity: cantidad, date: fecha, note: nota, reference: saldo.referencia, idempotencyKey: uuid });
      if (!v.success) { setError(v.error.issues[0].message); return; }
      if (v.data.date > hoyChile()) { setError("No se permiten fechas futuras."); return; }
      setError(undefined); setEnvio(v.data); onBloqueo(true);
    }}>
      <Aviso tipo="informacion" titulo="Existencias anteriores a la puesta en marcha">Registra productos que ya están físicamente en bodega. No representa fabricación ni descuenta materia prima. Sólo se permite sin movimientos anteriores y con saldo cero.</Aviso>
      {error && <Aviso titulo={error} />}
      <div className="space-y-2"><Label htmlFor="inicial-producto">Producto terminado *</Label><SelectorBuscable id="inicial-producto" opciones={catalogos.productos.map(p => ({ valor: String(p.id), etiqueta: `${p.name} — ${p.code}` }))} valor={productId} onChange={v => { setProductId(v); setSaldo(undefined); onCambio(); }} nombre="producto terminado" placeholder="Selecciona producto…" disabled={ocupado} /><p className="text-xs text-muted-foreground">Unidad: {producto ? `${producto.nombreUnidad} (${producto.unidad})` : "Selecciona un producto"}</p></div>
      <div className="space-y-2"><Label htmlFor="inicial-bodega">Bodega *</Label><SelectorBuscable id="inicial-bodega" opciones={catalogos.bodegas.map(b => ({ valor: String(b.id), etiqueta: b.name }))} valor={warehouseId} onChange={v => { setWarehouseId(v); setSaldo(undefined); onCambio(); }} nombre="bodega de producto terminado" placeholder="Selecciona bodega…" disabled={ocupado} /><p className="text-xs text-muted-foreground">Sólo bodegas Mixta o Producto terminado.</p></div>
      <Button type="button" variant="outline" disabled={ocupado || !producto || !bodega} onClick={async () => {
        setRevisando(true); onBloqueo(true); setError(undefined);
        try { const r = await revisarSaldoTerminado(combinacion); setSaldo(r); if (!r.ok) setError(r.mensaje); }
        catch { setError("No se pudo revisar el saldo. Inténtalo nuevamente."); }
        finally { setRevisando(false); onBloqueo(false); }
      }}>{revisando ? "Revisando…" : "Revisar saldo"}</Button>
      {saldo?.ok && <Aviso tipo="informacion" titulo={`Saldo actual: ${formatearCantidad(saldo.referencia.quantity)} ${producto?.unidad ?? ""}`}>{saldo.puedeInicial ? "Sin movimientos anteriores: puedes registrar el inventario inicial." : "Ya tiene stock o movimientos. No se puede repetir el inventario inicial; una corrección debe registrarse mediante un ajuste posterior."}</Aviso>}
      <div className="space-y-2"><Label htmlFor="inicial-cantidad">Cantidad inicial *</Label><AyudaCampo nombre="Cantidad inicial de terminado" texto="Existencias físicas en la unidad del producto, no negativas y con hasta tres decimales. Cero no genera documentos ni movimientos. La receta no se consume en una carga inicial." /><Input id="inicial-cantidad" inputMode="decimal" autoComplete="off" disabled={ocupado} value={cantidad} onChange={e => { setCantidad(e.target.value); onCambio(); }} /></div>
      <div className="space-y-2"><Label htmlFor="inicial-fecha">Fecha del inventario *</Label><Input id="inicial-fecha" type="date" max={hoyChile()} disabled={ocupado} value={fecha} onChange={e => { setFecha(e.target.value); onCambio(); }} /></div>
      <div className="space-y-2"><Label htmlFor="inicial-nota">Observación *</Label><Textarea id="inicial-nota" maxLength={2000} rows={3} disabled={ocupado} value={nota} onChange={e => { setNota(e.target.value); onCambio(); }} placeholder="Ej.: Existencias anteriores al inicio del sistema, verificadas físicamente." /></div>
      <p className="text-xs text-muted-foreground">El ingreso conserva un documento histórico. Revisa los datos antes de confirmar: no se edita ni se elimina.</p>
      <DialogFooter><Button type="button" variant="outline" disabled={ocupado} onClick={onCerrar}>Cancelar</Button><Permiso permiso="inventario.operar"><Button type="submit" disabled={ocupado || !saldo?.ok || !saldo.puedeInicial}>{pendiente ? "Registrando…" : "Registrar inventario inicial"}</Button></Permiso></DialogFooter>
    </form>
    <ConfirmarAccion abierto={Boolean(envio)} onAbiertoChange={v => { if (!v) cerrarConfirmacion(); }} titulo="Confirmar inventario inicial" descripcion={`Se ingresarán ${envio ? formatearCantidad(envio.quantity) : ""} ${producto?.unidad ?? ""} de ${producto?.name ?? ""} en ${bodega?.name ?? ""}. No se consumirá materia prima. El documento no se edita ni se elimina; confirma que corresponde a existencias anteriores.`} accion="Confirmar ingreso" pendiente={pendiente} onConfirmar={async () => {
      if (!envio || pendiente) return;
      const r = await onGuardar(envio); if (!r.ok) { cerrarConfirmacion(); setError(r.mensaje); }
    }} />
  </>;
}
