"use client";
import { HistorialPdfCotizacion } from "./historial-pdf-cotizacion";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { guardar, previsualizar } from "@/app/(app)/ventas/cotizaciones/actions";
import { cotizacionSchema, lineaCotizacionSchema, type DatosCotizacion, type LineaCotizacion } from "@/lib/validaciones/cotizacion";
import { importesCotizacionSchema } from "@/lib/validaciones/importes-cotizacion";
import { documentoVacioCotizacion } from "@/lib/validaciones/texto-cotizacion";
import type { CatalogosCotizacion, CotizacionConsultada } from "@/lib/consultas/cotizaciones";
import { EditorCotizacion } from "@/components/formularios/editor-cotizacion";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
const moneda = (v: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(BigInt(v));
export type EditorDocumento = { modo: "crear" | "editar" | "ver" | "corregir"; documento?: CotizacionConsultada; clave: string };
type Preview = Extract<Awaited<ReturnType<typeof previsualizar>>, { ok: true }>;
function Campo({ nombre, ayuda, children }: { nombre: string; ayuda: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><div className="flex items-center gap-1"><Label>{nombre}</Label><AyudaCampo nombre={nombre} texto={ayuda} /></div>{children}</div>;
}
function Linea({ inicial, catalogos: c, ver, unidadHistorica, codigoHistorico, onAceptar, onCerrar }: { inicial: LineaCotizacion; catalogos: CatalogosCotizacion; ver: boolean; unidadHistorica?: string | null; codigoHistorico?: string | null; onAceptar: (l: LineaCotizacion) => void; onCerrar: () => void }) {
  const [l, setL] = useState(inicial), [error, setError] = useState<string>();
  const unidad = c.unidades.find(u => u.id === l.unitMeasureId);
  function elegir(v: string) {
    const item = l.kind === "PRODUCTO" ? c.productos.find(p => p.id === Number(v)) : c.materiales.find(p => p.id === Number(v));
    if (item) setL({ ...l, rawMaterialId: l.kind === "MATERIA_PRIMA" ? item.id : null, productId: l.kind === "PRODUCTO" ? item.id : null, unitMeasureId: item.unitMeasureId, description: item.name, unitPrice: c.productos.find(p => l.kind === "PRODUCTO" && p.id === item.id)?.suggestedPrice ?? "" });
  }
  return <form className="min-w-0 space-y-4" onSubmit={e => {
    // El portal del diálogo no debe propagar Enter al formulario principal.
    e.preventDefault(); e.stopPropagation(); if (ver) return;
    const v = lineaCotizacionSchema.safeParse(l), importe = importesCotizacionSchema.safeParse({ lineas: [{ quantity: l.quantity, unitPrice: l.unitPrice }], descuento: { modo: "SIN_DESCUENTO" }, tasaIva: "0" });
    if (!v.success || !importe.success) { setError(!v.success ? v.error.issues[0].message : !importe.success ? importe.error.issues[0].message : "Revisa la línea."); return; }
    onAceptar(v.data);
  }}>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Campo nombre="Tipo de línea" ayuda="Puedes combinar materia prima, productos terminados y servicios o trabajos a medida."><select aria-label="Tipo de línea" className="h-9 w-full rounded-md border border-input bg-card px-2" disabled={ver} value={l.kind} onChange={e => setL({ ...l, kind: e.target.value as LineaCotizacion["kind"], rawMaterialId: null, productId: null, description: "", unitPrice: "" })}><option value="MATERIA_PRIMA">Materia prima</option><option value="PRODUCTO">Producto terminado</option><option value="SERVICIO">Trabajo / servicio</option></select></Campo>
    {l.kind !== "SERVICIO" && <Campo nombre={l.kind === "PRODUCTO" ? "Producto" : "Materia prima"} ayuda="Busca por nombre o código; cotizar no requiere stock ni consume materiales.">{ver ? <Input readOnly aria-label="Origen de la línea" value={`${codigoHistorico ?? ""} ${l.description}`.trim()} /> : <SelectorBuscable id="cot-linea-origen" nombre={l.kind === "PRODUCTO" ? "producto" : "materia prima"} placeholder="Seleccionar…" valor={String(l.productId ?? l.rawMaterialId ?? "")} onChange={elegir} opciones={(l.kind === "PRODUCTO" ? c.productos : c.materiales).map(p => ({ valor: String(p.id), etiqueta: p.name, busqueda: p.code }))} />}</Campo>}
    <Campo nombre="Descripción breve" ayuda="Nombre y resumen de esta línea. El desarrollo técnico extenso se escribe en el detalle general."><Input aria-label="Descripción breve" value={l.description} readOnly={ver} maxLength={1000} onChange={e => setL({ ...l, description: e.target.value })} /></Campo>
    <Campo nombre="Unidad" ayuda="Materiales/productos conservan su unidad del catálogo. Para un trabajo o servicio puedes elegir una unidad.">{l.kind === "SERVICIO" && !ver ? <SelectorBuscable id="cot-linea-unidad" nombre="unidad" placeholder="Seleccionar unidad…" valor={String(l.unitMeasureId)} onChange={v => setL({ ...l, unitMeasureId: Number(v) })} opciones={c.unidades.map(u => ({ valor: String(u.id), etiqueta: `${u.name} (${u.abbreviation})` }))} /> : <Input aria-label="Unidad" value={unidadHistorica ?? unidad?.name ?? "Unidad histórica"} readOnly />}</Campo>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2"><Campo nombre="Cantidad" ayuda="Cantidad positiva; admite hasta tres decimales."><Input aria-label="Cantidad cotizada" inputMode="decimal" value={l.quantity} readOnly={ver} onChange={e => setL({ ...l, quantity: e.target.value })} /></Campo><Campo nombre="Precio unitario final" ayuda="Pesos enteros por unidad, con IVA incluido. El sistema desglosa el impuesto al calcular el total."><Input aria-label="Precio unitario final" inputMode="numeric" value={l.unitPrice} readOnly={ver} onChange={e => setL({ ...l, unitPrice: e.target.value })} /></Campo></div>
    <DialogFooter><Button type="button" variant="outline" onClick={onCerrar}>{ver ? "Cerrar" : "Cancelar"}</Button>{!ver && <Button type="submit">Aceptar línea</Button>}</DialogFooter>
  </form>;
}
export function FormularioCotizacion({ editor, catalogos: c, hoy, onCambio, onBloqueo, onCerrar, onGuardado }: {
  editor: EditorDocumento; catalogos: CatalogosCotizacion; hoy: string;
  onCambio: () => void; onBloqueo: (v: boolean) => void; onCerrar: () => void; onGuardado: (mensaje: string) => void;
}) {
  const ver = editor.modo === "ver", anterior = editor.documento;
  const [d, setD] = useState<DatosCotizacion>(() => anterior ? { ...anterior.datos } : { date: hoy, validUntil: null, clientId: 0, clientBranchId: 0, paymentConditionId: 0, bankAccountId: c.cuentas.find(a => a.isPrimary && a.isActive)?.id ?? null, lines: [], discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion, commercialTerms: null });
  const [linea, setLinea] = useState<{ indice?: number; datos: LineaCotizacion; ver: boolean }>(), [quitar, setQuitar] = useState<number>(), [error, setError] = useState<string>();
  const [pendiente, setPendiente] = useState(false), [bloqueoEditor, setBloqueoEditor] = useState(false), [invalidoEditor, setInvalidoEditor] = useState(false), [preview, setPreview] = useState<Preview>(), [confirmacion, setConfirmacion] = useState<DatosCotizacion>();
  const sucursal = c.sucursales.find(s => s.id === d.clientBranchId);
  const unidadDefecto = c.unidades.find(u => u.name.toLocaleLowerCase("es-CL") === "unidades")?.id ?? 0;
  function cambiar(parte: Partial<DatosCotizacion>) {
    setD(actual => ({ ...actual, ...parte }));
    // El formato o las imágenes no cambian los importes. Las transacciones del
    // editor pueden llegar después de una vista previa; no borrar sus totales.
    if ("date" in parte || "lines" in parte || "discount" in parte) setPreview(undefined);
    onCambio();
  }
  function detalle(v: typeof linea) { setLinea(v); onBloqueo(Boolean(v)); }
  async function calcular(confirmar: boolean) {
    if (pendiente || ver || bloqueoEditor || invalidoEditor || linea || quitar !== undefined) return;
    const validacion = cotizacionSchema.safeParse(d);
    if (!validacion.success) { setError(validacion.error.issues[0].message); return; }
    setPendiente(true); onBloqueo(true); setError(undefined); let confirmado = false;
    try {
      const p = await previsualizar(d.date, d.lines.map(l => ({ quantity: l.quantity, unitPrice: l.unitPrice })), d.discount);
      if (!p.ok) setError(p.mensaje); else { setPreview(p); if (confirmar) { setConfirmacion(validacion.data); confirmado = true; } }
    } catch { setError("No se pudo calcular. Revisa la conexión."); }
    finally { setPendiente(false); onBloqueo(confirmado); }
  }
  const historico = anterior?.historico;
  const totales = ver && historico ? { subtotal: historico.subtotal, discountAmount: historico.discountAmount, netAmount: historico.netAmount, vatAmount: historico.vatAmount, totalAmount: historico.totalAmount } : preview;
  return <>
    {ver && anterior && <HistorialPdfCotizacion referencia={{ id: anterior.id, version: anterior.version }} onBloqueo={onBloqueo} />}
    <form className="min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); if (!ver) void calcular(true); }}>
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {editor.modo === "corregir" && <Aviso tipo="informacion" titulo="Nueva cotización vinculada">Corrige el borrador antes de guardar. Se asignará un nuevo folio; el original {anterior?.folio} conservará su contenido e importes.</Aviso>}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Campo nombre="Fecha" ayuda="Fecha actual o pasada. Determina el período de IVA utilizado."><Input aria-label="Fecha de cotización" type="date" max={hoy} value={d.date} readOnly={ver} disabled={pendiente} onChange={e => cambiar({ date: e.target.value })} /></Campo>
        <Campo nombre="Vigencia hasta" ayuda="Opcional. Después de este día la cotización no se puede aprobar."><Input aria-label="Vigencia hasta" type="date" value={d.validUntil ?? ""} readOnly={ver} disabled={pendiente} onChange={e => cambiar({ validUntil: e.target.value || null })} /></Campo>
        <Campo nombre="Cliente" ayuda="Selecciona el cliente y su sucursal. Se conservarán sus datos en la cotización.">{ver ? <Input aria-label="Cliente histórico" readOnly value={`${historico?.clientName ?? ""} · ${historico?.clientRut ?? ""}`} /> : <SelectorBuscable id="cot-cliente" nombre="cliente" placeholder="Seleccionar cliente…" valor={String(d.clientId || "")} disabled={pendiente} opciones={c.clientes.map(cl => ({ valor: String(cl.id), etiqueta: cl.name, busqueda: cl.rut }))} onChange={v => { const id = Number(v); cambiar({ clientId: id, clientBranchId: c.sucursales.find(s => s.clientId === id && s.isHeadOffice)?.id ?? 0 }); }} />}</Campo>
        <Campo nombre="Sucursal" ayuda="Dirección, Ciudad y nombre/teléfono de contacto deben estar completos en Clientes.">{ver ? <Input readOnly aria-label="Sucursal histórica" value={historico?.branchName ?? ""} /> : <SelectorBuscable id="cot-sucursal" nombre="sucursal" placeholder="Seleccionar sucursal…" valor={String(d.clientBranchId || "")} disabled={pendiente || !d.clientId} opciones={c.sucursales.filter(s => s.clientId === d.clientId).map(s => ({ valor: String(s.id), etiqueta: s.name, busqueda: `${s.city ?? ""} ${s.contact ?? ""}` }))} onChange={v => cambiar({ clientBranchId: Number(v) })} />}</Campo>
        <Campo nombre="Condición de pago" ayuda="El plazo queda copiado. Cotizar no crea vencimiento de cobro ni registra abonos.">{ver ? <Input readOnly aria-label="Condición de pago histórica" value={historico?.paymentConditionName ?? ""} /> : <SelectorBuscable id="cot-pago" nombre="condición de pago" placeholder="Seleccionar condición…" disabled={pendiente} valor={String(d.paymentConditionId || "")} opciones={c.condiciones.map(p => ({ valor: String(p.id), etiqueta: `${p.name} · ${p.days} días` }))} onChange={v => cambiar({ paymentConditionId: Number(v) })} />}</Campo>
        <Campo nombre="Cuenta para pagos" ayuda="La principal se propone al crear. Puedes elegir otra cuenta o no incluir datos bancarios.">{ver ? <Input readOnly aria-label="Cuenta bancaria histórica" value={historico?.bankName ? `${historico.bankName} · ${historico.bankAccountNumber}` : "Sin cuenta"} /> : <SelectorBuscable id="cot-banco" nombre="cuenta bancaria" placeholder="Sin cuenta" disabled={pendiente} valor={String(d.bankAccountId ?? "ninguna")} opciones={[{ valor: "ninguna", etiqueta: "Sin datos bancarios" }, ...c.cuentas.filter(a => a.isActive || a.id === d.bankAccountId).map(a => ({ valor: String(a.id), etiqueta: `${a.bankName} · ${a.accountNumber}${a.isPrimary ? " · Principal" : ""}` }))]} onChange={v => cambiar({ bankAccountId: v === "ninguna" ? null : Number(v) })} />}</Campo>
      </div>
      {(ver ? historico : sucursal) && <div className="min-w-0 rounded-md bg-muted/30 p-3 text-sm break-words [overflow-wrap:anywhere]"><p>{ver ? `${historico?.branchAddress ?? ""}, ${historico?.branchCity ?? ""}` : `${sucursal?.address ?? ""}, ${sucursal?.city ?? ""}`}</p><p>Contacto: {ver ? `${historico?.branchContact ?? ""} · ${historico?.branchPhone ?? ""}` : `${sucursal?.contact ?? ""} · ${sucursal?.phone ?? ""}`}</p></div>}
      {ver && historico && <div className="grid min-w-0 gap-3 rounded-md border border-border p-3 text-sm break-words [overflow-wrap:anywhere] sm:grid-cols-2"><div><p className="font-medium">Datos históricos del cliente</p><p>Contacto general: {historico.clientContact ?? "Sin registrar"} · {historico.clientPhone ?? ""}</p><p>{historico.clientEmail}</p><p>Correo de sucursal: {historico.branchEmail ?? "Sin registrar"}</p><p>Plazo acordado: {historico.paymentTermDays} días</p></div><div><p className="font-medium">Datos históricos para pagos</p><p>{historico.bankName ?? "Sin datos bancarios"} · {historico.bankAccountType}</p><p>{historico.bankAccountNumber}</p><p>{historico.bankHolderName} · {historico.bankHolderRut}</p><p>{historico.bankEmail}</p></div></div>}
      <section className="min-w-0 space-y-3" aria-label="Líneas cotizadas"><h3 className="font-semibold">Detalle de productos y servicios</h3>
        <div className="rounded-md border border-border"><div className="hidden grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-border bg-muted/30 p-3 text-xs font-medium md:grid"><span>Descripción</span><span>Cantidad</span><span>Unidad</span><span>Precio final</span><span>Acciones</span></div>
          {d.lines.length ? d.lines.map((l, i) => <div key={i} className="grid min-w-0 gap-2 border-b border-border p-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-3"><div className="min-w-0 break-words [overflow-wrap:anywhere]"><p>{l.description}</p><p className="text-xs text-muted-foreground">{l.kind === "MATERIA_PRIMA" ? "Materia prima" : l.kind === "PRODUCTO" ? "Producto terminado" : "Trabajo / servicio"}</p></div><p><span className="md:hidden">Cantidad: </span>{l.quantity}</p><p className="break-words"><span className="md:hidden">Unidad: </span>{ver ? historico?.units[i]?.name : c.unidades.find(u => u.id === l.unitMeasureId)?.name}</p><p className="min-w-0 break-words"><span className="md:hidden">Precio final: </span>{l.unitPrice}</p><div className="flex gap-1"><BotonConAyuda type="button" ayuda="Ver el detalle de esta línea." aria-label={`Ver línea ${i + 1}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => detalle({ indice: i, datos: l, ver: true })}><Eye /></BotonConAyuda>{!ver && <><BotonConAyuda type="button" ayuda="Editar esta línea del borrador." aria-label={`Editar línea ${i + 1}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => detalle({ indice: i, datos: l, ver: false })}><Pencil /></BotonConAyuda><BotonConAyuda type="button" ayuda="Quitar la línea del borrador; no se escribe hasta guardar." aria-label={`Quitar línea ${i + 1}`} variant="ghost" size="icon-sm" disabled={pendiente} onClick={() => { setQuitar(i); onBloqueo(true); }}><Trash2 /></BotonConAyuda></>}</div></div>) : <p className="p-4 text-sm text-muted-foreground">Agrega al menos una línea.</p>}
        </div>
        {!ver && <Button type="button" variant="outline" disabled={pendiente} onClick={() => detalle({ datos: { kind: "SERVICIO", rawMaterialId: null, productId: null, unitMeasureId: unidadDefecto, description: "", quantity: "1", unitPrice: "" }, ver: false })}><Plus />Agregar línea</Button>}
      </section>
      <Campo nombre="Condiciones comerciales" ayuda="Texto opcional, por ejemplo anticipo y pago al entregar. No registra abonos ni modifica el plazo de la condición de pago."><Textarea aria-label="Condiciones comerciales" maxLength={5000} value={d.commercialTerms ?? ""} readOnly={ver} disabled={pendiente} onChange={e => cambiar({ commercialTerms: e.target.value || null })} /></Campo>
      <Campo nombre="Detalle técnico general" ayuda="Desarrolla aquí especificaciones, alcance y condiciones técnicas; admite formato e imágenes."><EditorCotizacion valor={d.technicalDescription} draftKey={editor.clave} soloLectura={ver} disabled={pendiente} onChange={v => cambiar({ technicalDescription: v })} onBloqueo={v => { setBloqueoEditor(v); onBloqueo(v); }} onValidez={v => { setInvalidoEditor(!v); if (!v) onCambio(); }} /></Campo>
      {!ver && <div className="grid min-w-0 gap-4 sm:grid-cols-2"><Campo nombre="Descuento global" ayuda="Elige porcentaje de hasta dos decimales o pesos enteros. No se acumulan modos ni puede superar el subtotal."><select aria-label="Tipo de descuento" disabled={pendiente} className="h-9 w-full rounded-md border border-input bg-card px-2" value={d.discount.modo} onChange={e => cambiar({ discount: e.target.value === "SIN_DESCUENTO" ? { modo: "SIN_DESCUENTO" } : { modo: e.target.value as "MONTO" | "PORCENTAJE", valor: "0" } })}><option value="SIN_DESCUENTO">Sin descuento</option><option value="PORCENTAJE">Porcentaje</option><option value="MONTO">Pesos</option></select></Campo>{d.discount.modo !== "SIN_DESCUENTO" && <Campo nombre="Valor del descuento" ayuda="Descuento aplicado al subtotal con IVA incluido, antes del desglose."><Input aria-label="Valor del descuento" inputMode="decimal" disabled={pendiente} value={d.discount.valor} onChange={e => { if (d.discount.modo !== "SIN_DESCUENTO") cambiar({ discount: { modo: d.discount.modo, valor: e.target.value } }); }} /></Campo>}</div>}
      {totales && <dl className="grid min-w-0 gap-2 rounded-md bg-muted/30 p-4 text-sm sm:grid-cols-2" aria-label="Importes de la cotización">{([['Subtotal', totales.subtotal], ['Descuento', totales.discountAmount], ['Neto', totales.netAmount], [`IVA ${ver ? historico?.vatRate : preview?.tasa}%`, totales.vatAmount], ['Total final', totales.totalAmount]] as [string, string][]).map(([n, v]) => <div key={n} className="flex min-w-0 flex-wrap justify-between gap-2"><dt>{n}</dt><dd className="font-semibold tabular-nums">{moneda(v)}</dd></div>)}</dl>}
      <DialogFooter className="flex-wrap"><Button type="button" variant="outline" disabled={pendiente || bloqueoEditor} onClick={onCerrar}>{ver ? "Cerrar" : "Cancelar"}</Button>{!ver && <><Button type="button" variant="outline" disabled={pendiente || bloqueoEditor || invalidoEditor} onClick={() => void calcular(false)}>Calcular importes</Button><Button type="submit" disabled={pendiente || bloqueoEditor || invalidoEditor}>Revisar y guardar</Button></>}</DialogFooter>
    </form>
    <Dialog open={Boolean(linea)} onOpenChange={v => { if (!v) detalle(undefined); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] min-w-0 overflow-y-auto sm:max-w-lg" onInteractOutside={e => e.preventDefault()}><DialogHeader><DialogTitle>{linea?.ver ? "Ver línea cotizada" : linea?.indice !== undefined ? "Editar línea cotizada" : "Agregar línea cotizada"}</DialogTitle><DialogDescription>Los precios finales incluyen IVA y se registran en pesos enteros.</DialogDescription></DialogHeader>{linea && <Linea key={`${linea.indice ?? "nueva"}-${linea.ver}`} inicial={linea.datos} catalogos={c} ver={linea.ver} unidadHistorica={ver && linea.indice !== undefined ? historico?.units[linea.indice]?.name : undefined} codigoHistorico={ver && linea.indice !== undefined ? historico?.units[linea.indice]?.code : undefined} onCerrar={() => detalle(undefined)} onAceptar={l => { cambiar({ lines: linea.indice === undefined ? [...d.lines, l] : d.lines.map((actual, i) => i === linea.indice ? l : actual) }); detalle(undefined); }} />}</DialogContent></Dialog>
    <ConfirmarAccion abierto={quitar !== undefined} onAbiertoChange={v => { if (!v) { setQuitar(undefined); onBloqueo(false); } }} titulo="Quitar línea" descripcion="Se quitará del borrador. La cotización guardada sólo cambia al confirmar el formulario principal." accion="Quitar línea" pendiente={false} onConfirmar={() => { cambiar({ lines: d.lines.filter((_, i) => i !== quitar) }); setQuitar(undefined); onBloqueo(false); }} />
    <ConfirmarAccion abierto={Boolean(confirmacion)} onAbiertoChange={v => { if (!v) { setConfirmacion(undefined); onBloqueo(false); } }} titulo="Confirmar cotización" descripcion={`${preview ? `Total final ${moneda(preview.totalAmount)}, IVA ${preview.tasa}%. ` : ""}Se guardará en estado Pendiente. Aprobar o rechazar bloqueará el contenido; las correcciones posteriores usarán un nuevo folio. ${error ?? ""}`} accion="Guardar cotización" pendiente={pendiente} onConfirmar={async () => {
      if (!confirmacion || pendiente) return; setPendiente(true);
      try { const ref = anterior ? { id: anterior.id, version: anterior.version } : undefined; const r = await guardar(confirmacion, editor.clave, editor.modo === "editar" ? ref : undefined, editor.modo === "corregir" ? ref : undefined); if (r.ok) { onBloqueo(false); onGuardado(r.mensaje); } else setError(r.mensaje); }
      catch { setError("No se pudo confirmar. Actualiza el listado antes de reintentar."); }
      finally { setPendiente(false); }
    }} />
  </>;
}
