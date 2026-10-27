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
import { DialogoCantidadDetalle } from "@/components/formularios/dialogo-cantidad-detalle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
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
  const [incierto, setIncierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState<DatosOrdenCompraCliente>();
  const [erroresLineas, setErroresLineas] = useState<Record<number, string>>({});
  const [editor, setEditor] = useState<{ id: number; consulta: boolean }>();
  const focoDetalle = useRef<HTMLElement | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const actual = o.lines.find(l => l.id === editor?.id);
  function abrirDetalle(id: number, consulta: boolean) { focoDetalle.current = document.activeElement as HTMLElement; setEditor({ id, consulta }); onBloqueo(true); }
  function cerrarDetalle() { setEditor(undefined); onBloqueo(ocupado || confirmando.current); }
  const enCurso = useRef(false), confirmando = useRef(false);
  function cambiar() { onCambio(); setPreview(undefined); setError(undefined); setErroresLineas({}); }
  function bloqueando(v: boolean) { setOcupado(v); onBloqueo(v || Boolean(editor) || confirmando.current); }
  const bloqueado = ocupado || incierto || Boolean(confirmacion) || Boolean(editor);
  const lineas = () => seleccion.filter(l => l.seleccionada).map(({ quoteDetailId, quantity }) => ({ quoteDetailId, quantity }));
  async function revisar(confirmar: boolean) {
    if (enCurso.current || !valido || editor) return;
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
  function bloquearEditor(valor: boolean) { onBloqueo(valor || Boolean(editor) || confirmando.current || ocupado); }
  function cambiarConfirmacion(abierta: boolean) { if (incierto) return; if (!abierta) { confirmando.current = false; setConfirmacion(undefined); onBloqueo(false); } }
  async function confirmarOrden() {
    if (!confirmacion || enCurso.current) return;
    enCurso.current = true; bloqueando(true); setError(undefined);
    try { const r = await registrar(confirmacion, clave); if (r.ok) { confirmando.current = false; onBloqueo(false); onGuardado(r.mensaje, r.id); } else setError(r.mensaje); }
    catch { setIncierto(true); setError("No se pudo comprobar el resultado. Los datos y el UUID quedan bloqueados; reintenta con esta misma confirmación."); }
    finally { enCurso.current = false; bloqueando(false); }
  }
  return <><form className="min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); void revisar(true); }}>
    <div className="rounded-md border border-border p-3 text-sm"><p className="font-medium">Cotización {o.folio} · Revisión {o.version} · {o.status === "PENDIENTE" ? "Pendiente" : "Aprobada"}</p><p className="break-words">{o.clientName} · {o.branchName}</p><p>Oferta: {monedaOrden(o.totalAmount)} · IVA histórico {formatearCantidad(o.vatRate)}% · {o.paymentConditionName} ({o.paymentTermDays} días desde factura)</p><p className="text-muted-foreground">{o.status === "PENDIENTE" ? "Al confirmar se aprobará la oferta y se registrará la orden." : "La oferta aprobada conserva su revisión actual."}</p></div>
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="min-w-0 space-y-1 text-sm">Fecha de aceptación<Input aria-label="Fecha de aceptación" type="date" min={o.date} max={hoy} value={date} disabled={bloqueado} onChange={e => { setDate(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm"><span className="inline-flex items-center gap-1">Número de OC del cliente (opcional)<AyudaCampo nombre="Número de OC del cliente" texto="Se conserva tal como lo entrega el cliente. No admite otro número equivalente por espacios/mayúsculas para el mismo cliente, incluso tras anular." /></span><Input aria-label="Número de OC del cliente" maxLength={150} value={numero} disabled={bloqueado} onChange={e => { setNumero(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">Fecha de OC del cliente (opcional)<Input aria-label="Fecha de OC del cliente" type="date" value={fechaCliente} disabled={bloqueado} onChange={e => { setFechaCliente(e.target.value); cambiar(); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">PDF de origen (opcional)<select aria-label="PDF de origen" className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2" value={pdf} disabled={bloqueado} onChange={e => { setPdf(e.target.value); cambiar(); }}><option value="">Sin vincular emisión</option>{o.pdfs.map(p => <option key={p.id} value={p.id}>Revisión {p.quoteVersion} · {p.status === "PENDIENTE" ? "Pendiente al emitir" : "Aprobada al emitir"}</option>)}</select></label>
    </div>
    <section className="min-w-0 space-y-2" aria-label="Líneas contratadas">
      <h3 className="font-medium">Líneas contratadas</h3>
      <Table containerProps={{ ref: tabla, role: "region", tabIndex: 0, "aria-label": "Partidas a contratar; desplazar horizontalmente para ver todas las columnas" }}>
        <TableCaption>Selecciona partidas de la oferta. Editar una cantidad no modifica la cotización original.</TableCaption>
        <TableHeader><TableRow>{["Contratar", "Descripción", "Unidad", "Cotizado", "Aceptado", o.pricesIncludeVat ? "Precio con IVA" : "Precio neto", "Importe contratado", "Acciones"].map(t => <TableHead scope="col" key={t}>{t}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{o.lines.map(l => {
          const s = seleccion.find(v => v.quoteDetailId === l.id)!;
          return <TableRow key={l.id}>
            <TableCell><input type="checkbox" aria-label={`Contratar ${l.description}`} disabled={bloqueado} checked={s.seleccionada} onChange={e => { setSeleccion(v => v.map(f => f.quoteDetailId === l.id ? { ...f, seleccionada: e.target.checked } : f)); setRevisado(false); cambiar(); }} /></TableCell>
            <TableCell className="min-w-48 whitespace-normal"><p className="font-medium">{l.description}</p><p className="text-xs text-muted-foreground">{l.code} · {l.kind === "PRODUCTO" ? "Producto" : l.kind === "MATERIA_PRIMA" ? "Materia prima" : "Servicio"}</p>{erroresLineas[l.id] && <p role="alert" id={`error-cantidad-${l.id}`} className="text-xs text-destructive">{erroresLineas[l.id]}</p>}</TableCell>
            <TableCell>{l.unitName}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(l.quantity)}</TableCell><TableCell className="text-right tabular-nums">{s.seleccionada ? formatearCantidad(s.quantity) : "No contratada"}</TableCell>
            <TableCell className="text-right tabular-nums">{monedaOrden(l.unitPrice)}</TableCell><TableCell className="text-right tabular-nums">{preview ? monedaOrden(preview.lineAmounts.find(p => p.id === l.id)?.amount ?? "0") : "Revisar importes"}</TableCell>
            <TableCell><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={bloqueado} onClick={() => abrirDetalle(l.id, true)}>Ver {l.description}</Button><Button type="button" variant="outline" size="sm" disabled={bloqueado || !s.seleccionada} aria-describedby={erroresLineas[l.id] ? `error-cantidad-${l.id}` : undefined} onClick={() => abrirDetalle(l.id, false)}>Editar cantidad de {l.description}</Button></div></TableCell>
          </TableRow>;
        })}</TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">Desplaza la tabla horizontalmente si es necesario. No se agregan ni eliminan partidas de la oferta; deseleccionar las excluye de esta aceptación.</p>
    </section>
    <div className="min-w-0 space-y-2"><p className="font-medium">Alcance técnico aceptado</p><p className="text-sm text-muted-foreground">Revisa el texto y retira trabajos no contratados. La cotización original conservará todo su contenido.</p>
      <EditorCotizacion valor={alcance} onChange={v => { setAlcance(v); setRevisado(false); cambiar(); }} draftKey={clave} disabled={bloqueado} permitirSubida={false} etiqueta="Alcance técnico aceptado" onBloqueo={bloquearEditor} onValidez={setValido} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label="Confirmar revisión del alcance" className="mt-1 size-4 accent-primary" disabled={bloqueado || !valido} checked={revisado} onChange={e => { setRevisado(e.target.checked); onCambio(); }} />Revisé el alcance y corresponde exclusivamente a lo contratado.</label>
    </div>
    {o.commercialTerms && <div className="min-w-0 rounded-md bg-muted/30 p-3 text-sm"><p className="font-medium">Condiciones comerciales ofrecidas</p><p className="whitespace-pre-wrap break-words">{o.commercialTerms}</p></div>}
    {preview && <div className="grid min-w-0 gap-2 rounded-md border border-border p-4 text-sm sm:grid-cols-2" aria-live="polite"><p>Aceptación: <strong>{preview.completa ? "Total" : "Parcial"}</strong></p><p>Subtotal: {monedaOrden(preview.subtotal)}</p><p>Descuento: {monedaOrden(preview.discountAmount)}</p><p>Neto: {monedaOrden(preview.netAmount)}</p><p>IVA: {monedaOrden(preview.vatAmount)}</p><p className="font-semibold">Total contratado: {monedaOrden(preview.totalAmount)}</p></div>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={bloqueado} onClick={onCerrar}>Cancelar</Button><Button type="button" variant="outline" disabled={bloqueado || !valido} onClick={() => void revisar(false)}>Revisar importes</Button><Button type="submit" disabled={bloqueado || !valido}>Confirmar aceptación</Button></div>
    </form>
    {editor && actual && <DialogoCantidadDetalle key={`${editor.id}-${editor.consulta}`} titulo={editor.consulta ? "Ver partida de la oferta" : "Editar cantidad aceptada"} descripcion={`${actual.description} · Cotizado ${formatearCantidad(actual.quantity)} ${actual.unitName}. ${o.pricesIncludeVat ? "Precio con IVA" : "Precio neto"} ${monedaOrden(actual.unitPrice)}. El original se conserva y la cantidad no puede superar lo cotizado.`} etiqueta={`Cantidad aceptada de ${actual.description}`} inicial={seleccion.find(s => s.quoteDetailId === actual.id)!.quantity} consulta={editor.consulta} onCerrar={cerrarDetalle} devolverFoco={() => (focoDetalle.current?.isConnected ? focoDetalle.current : tabla.current)?.focus()} onAceptar={async valor => {
      const validacion = cantidadAceptadaSchema.safeParse(valor);
      if (!validacion.success) return validacion.error.issues[0].message;
      const siguientes = seleccion.map(s => s.quoteDetailId === actual.id ? { ...s, quantity: validacion.data } : s);
      const r = await previsualizar(o.id, o.version, siguientes.filter(s => s.seleccionada).map(({ quoteDetailId, quantity }) => ({ quoteDetailId, quantity })));
      if (!r.ok) return r.mensaje;
      setSeleccion(siguientes); setRevisado(false); cambiar(); cerrarDetalle();
    }} />}
    <ConfirmarAccion abierto={Boolean(confirmacion)} onAbiertoChange={cambiarConfirmacion} titulo="Confirmar Orden de Compra Cliente" descripcion={`${o.folio}: ${preview?.completa ? "aceptación total" : "aceptación parcial"}, ${monedaOrden(preview?.totalAmount ?? "0")}, ${confirmacion?.lines.length ?? 0} líneas. Se asignará folio y cuenta sin vencimiento, trabajo ni pagos. La oferta original se conservará. ${error ?? ""}`} accion="Registrar orden" pendiente={ocupado} onConfirmar={() => void confirmarOrden()} />
  </>;
}
