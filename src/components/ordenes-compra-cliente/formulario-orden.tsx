"use client";
import { formatearCantidad } from "@/lib/formato";
import { useRef, useState } from "react";
import { registrar, previsualizar } from "@/app/(app)/ventas/ordenes/actions";
import { registrarOrdenSchema, cantidadAceptadaSchema, type DatosOrdenCompraCliente } from "@/lib/validaciones/orden-compra-cliente";
import type { OfertaOrden } from "@/lib/consultas/ordenes-compra-cliente";
import { EditorCotizacion } from "@/components/formularios/editor-cotizacion";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
export const monedaOrden = (v: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(BigInt(v.split(".")[0]));
export const fechaOrden = (v: string) => v.split("-").reverse().join("-");
type VistaPrevia = Extract<Awaited<ReturnType<typeof previsualizar>>, { ok: true }>;
export function FormularioOrden({ oferta: o, hoy, onCambio, onBloqueo, onCerrar, onGuardado }: {
  oferta: OfertaOrden; hoy: string; onCambio: () => void; onBloqueo: (v: boolean) => void; onCerrar: () => void; onGuardado: (mensaje: string, id: number) => void;
}) {
  const [clave] = useState(() => crypto.randomUUID());
  const [seleccion, setSeleccion] = useState(o.lines.map(l => ({ quoteDetailId: l.id, quantity: l.quantity, seleccionada: true })));
  const [date, setDate] = useState(hoy), [numero, setNumero] = useState(""), [fechaCliente, setFechaCliente] = useState(""), [pdf, setPdf] = useState("");
  const [alcance, setAlcance] = useState(o.technicalDescription), [revisado, setRevisado] = useState(false), [valido, setValido] = useState(true);
  const [preview, setPreview] = useState<VistaPrevia>(), [error, setError] = useState<string>(), [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<DatosOrdenCompraCliente>();
  const [erroresLineas, setErroresLineas] = useState<Record<number, string>>({});
  const enCurso = useRef(false), confirmando = useRef(false);
  function cambiar() { onCambio(); setPreview(undefined); setError(undefined); setErroresLineas({}); }
  function bloqueando(v: boolean) { setOcupado(v); onBloqueo(v || confirmando.current); }
  const bloqueado = ocupado || Boolean(confirmacion);
  const lineas = () => seleccion.filter(l => l.seleccionada).map(({ quoteDetailId, quantity }) => ({ quoteDetailId, quantity }));
  async function revisar(confirmar: boolean) {
    if (enCurso.current || !valido) return;
    const errores: Record<number, string> = {};
    for (const l of lineas()) { const v = cantidadAceptadaSchema.safeParse(l.quantity); if (!v.success) errores[l.quoteDetailId] = v.error.issues[0].message; }
    if (Object.keys(errores).length) { setErroresLineas(errores); setError("Revisa las cantidades de las líneas indicadas."); return; }
    const datos = registrarOrdenSchema.safeParse({ quoteId: o.id, quoteVersion: o.version, date, customerOrderNumber: numero || null, customerOrderDate: fechaCliente || null, pdfEmissionId: pdf || null,
      lines: lineas(), technicalDescription: alcance, scopeReviewed: revisado });
    if (confirmar && !datos.success) { setError(datos.error.issues[0].message); return; }
    enCurso.current = true; bloqueando(true); setError(undefined);
    try { const p = await previsualizar(o.id, o.version, lineas()); if (!p.ok) { setError(p.mensaje); if (p.erroresLineas) setErroresLineas(Object.fromEntries(p.erroresLineas.map(l => [l.id, l.mensaje]))); } else { setPreview(p); if (confirmar && datos.success) { confirmando.current = true; setConfirmacion(datos.data); } } }
    catch { setError("No se pudo revisar el importe. Vuelve a intentarlo."); }
    finally { enCurso.current = false; bloqueando(false); }
  }
  return <form className="min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); void revisar(true); }}>
    <div className="rounded-md border border-border p-3 text-sm"><p className="font-medium">Cotización {o.folio} · Revisión {o.version} · {o.status === "PENDIENTE" ? "Pendiente" : "Aprobada"}</p><p className="break-words">{o.clientName} · {o.branchName}</p><p>Oferta: {monedaOrden(o.totalAmount)} · IVA histórico {formatearCantidad(o.vatRate)}% · {o.paymentConditionName} ({o.paymentTermDays} días desde factura)</p><p className="text-muted-foreground">{o.status === "PENDIENTE" ? "Al confirmar se aprobará la oferta y se registrará la orden." : "La oferta aprobada conserva su revisión actual."}</p></div>
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="min-w-0 space-y-1 text-sm">Fecha de aceptación<Input aria-label="Fecha de aceptación" type="date" min={o.date} max={hoy} value={date} disabled={bloqueado} onChange={e => { setDate(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm"><span className="inline-flex items-center gap-1">Número de OC del cliente (opcional)<AyudaCampo nombre="Número de OC del cliente" texto="Se conserva tal como lo entrega el cliente. No admite otro número equivalente por espacios/mayúsculas para el mismo cliente, incluso tras anular." /></span><Input aria-label="Número de OC del cliente" maxLength={150} value={numero} disabled={bloqueado} onChange={e => { setNumero(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">Fecha de OC del cliente (opcional)<Input aria-label="Fecha de OC del cliente" type="date" value={fechaCliente} disabled={bloqueado} onChange={e => { setFechaCliente(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">PDF de origen (opcional)<select aria-label="PDF de origen" className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2" value={pdf} disabled={bloqueado} onChange={e => { setPdf(e.target.value); cambiar(); }}><option value="">Sin vincular emisión</option>{o.pdfs.map(p => <option key={p.id} value={p.id}>Revisión {p.quoteVersion} · {p.status === "PENDIENTE" ? "Pendiente al emitir" : "Aprobada al emitir"}</option>)}</select></label>
    </div>
    <fieldset className="min-w-0 space-y-3" disabled={bloqueado}><legend className="mb-2 font-medium">Líneas contratadas</legend>{o.lines.map(l => {
      const s = seleccion.find(s => s.quoteDetailId === l.id)!;
      return <div key={l.id} className="grid min-w-0 gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="min-w-0"><label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label={`Contratar ${l.description}`} className="mt-1 size-4 shrink-0 accent-primary" checked={s.seleccionada} onChange={e => { setSeleccion(seleccion.map(v => v.quoteDetailId === l.id ? { ...v, seleccionada: e.target.checked } : v)); setRevisado(false); cambiar(); }} /><span className="min-w-0 break-words font-medium">{l.description}</span></label><p className="mt-1 break-words text-sm text-muted-foreground">Cotizado: {formatearCantidad(l.quantity)} {l.unitName} · {o.pricesIncludeVat ? "Precio con IVA" : "Precio neto"}: {monedaOrden(l.unitPrice)} · {l.kind === "PRODUCTO" ? "Producto" : l.kind === "MATERIA_PRIMA" ? "Materia prima" : "Servicio"}</p><p className="text-sm tabular-nums">Contratado: {preview ? monedaOrden(preview.lineAmounts.find(p => p.id === l.id)?.amount ?? "0") : "Revisar importes"}</p></div>
        <div className="min-w-0"><label className="min-w-0 text-sm">Cantidad aceptada<Input aria-label={`Cantidad aceptada de ${l.description}`} aria-invalid={Boolean(erroresLineas[l.id])} aria-describedby={erroresLineas[l.id] ? `error-cantidad-${l.id}` : undefined} inputMode="decimal" value={s.quantity} disabled={!s.seleccionada} onChange={e => { setSeleccion(seleccion.map(v => v.quoteDetailId === l.id ? { ...v, quantity: e.target.value } : v)); setRevisado(false); cambiar(); }} /></label>{erroresLineas[l.id] && <p id={`error-cantidad-${l.id}`} className="text-xs text-destructive">{erroresLineas[l.id]}</p>}</div>
      </div>;
    })}</fieldset>
    <div className="min-w-0 space-y-2"><p className="font-medium">Alcance técnico aceptado</p><p className="text-sm text-muted-foreground">Revisa el texto y retira trabajos no contratados. La cotización original conservará todo su contenido.</p>
      <EditorCotizacion valor={alcance} onChange={v => { setAlcance(v); setRevisado(false); cambiar(); }} draftKey={clave} disabled={bloqueado} permitirSubida={false} etiqueta="Alcance técnico aceptado" onBloqueo={onBloqueo} onValidez={setValido} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label="Confirmar revisión del alcance" className="mt-1 size-4 accent-primary" disabled={bloqueado || !valido} checked={revisado} onChange={e => { setRevisado(e.target.checked); onCambio(); }} />Revisé el alcance y corresponde exclusivamente a lo contratado.</label>
    </div>
    {o.commercialTerms && <div className="min-w-0 rounded-md bg-muted/30 p-3 text-sm"><p className="font-medium">Condiciones comerciales ofrecidas</p><p className="whitespace-pre-wrap break-words">{o.commercialTerms}</p></div>}
    {preview && <div className="grid min-w-0 gap-2 rounded-md border border-border p-4 text-sm sm:grid-cols-2" aria-live="polite"><p>Aceptación: <strong>{preview.completa ? "Total" : "Parcial"}</strong></p><p>Subtotal: {monedaOrden(preview.subtotal)}</p><p>Descuento: {monedaOrden(preview.discountAmount)}</p><p>Neto: {monedaOrden(preview.netAmount)}</p><p>IVA: {monedaOrden(preview.vatAmount)}</p><p className="font-semibold">Total contratado: {monedaOrden(preview.totalAmount)}</p></div>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={bloqueado} onClick={onCerrar}>Cancelar</Button><Button type="button" variant="outline" disabled={bloqueado || !valido} onClick={() => void revisar(false)}>Revisar importes</Button><Button type="submit" disabled={bloqueado || !valido}>Confirmar aceptación</Button></div>
    <ConfirmarAccion abierto={Boolean(confirmacion)} onAbiertoChange={v => { if (!v) { confirmando.current = false; setConfirmacion(undefined); onBloqueo(false); } }} titulo="Confirmar Orden de Compra Cliente" descripcion={`${o.folio}: ${preview?.completa ? "aceptación total" : "aceptación parcial"}, ${monedaOrden(preview?.totalAmount ?? "0")}, ${confirmacion?.lines.length ?? 0} líneas. Se asignará folio y cuenta sin vencimiento, trabajo ni pagos. La oferta original se conservará. ${error ?? ""}`} accion="Registrar orden" pendiente={ocupado} onConfirmar={async () => {
      if (!confirmacion || enCurso.current) return; enCurso.current = true; bloqueando(true); setError(undefined);
      try { const r = await registrar(confirmacion, clave); if (r.ok) { confirmando.current = false; onBloqueo(false); onGuardado(r.mensaje, r.id); } else setError(r.mensaje); }
      catch { setError("No se pudo comprobar el resultado. Reintenta con esta misma confirmación."); }
      finally { enCurso.current = false; bloqueando(false); }
    }} />
  </form>;
}
