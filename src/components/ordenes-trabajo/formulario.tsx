"use client";
import { Permiso } from "@/components/seguridad/permisos";
import { formatearCantidad } from "@/lib/formato";
import { useRef, useState } from "react";
import { Prisma } from "@/generated/prisma/browser";
import type { PlanTrabajo, LineaPlanTrabajo } from "@/lib/validaciones/orden-trabajo";
import type { CatalogosTrabajo, TrabajoConsultado } from "@/lib/consultas/ordenes-trabajo";
import { guardar } from "@/app/(app)/trabajos/ordenes/actions";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { EditorLineaPlan } from "./editor-linea-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableCaption } from "@/components/ui/table";
const q = (valor: string) => { try { return new Prisma.Decimal(valor.replace(",", ".")); } catch { return new Prisma.Decimal(0); } };
const modos = { CATALOGO: "Producto de catálogo", A_MEDIDA: "Trabajo a medida", SERVICIO: "Servicio", VENTA_DIRECTA_MP: "Venta directa de materia prima" };
export function FormularioTrabajo({ initial, catalogos: c, historico, onGuardado, onCerrar, onCambio, onBloqueo }: {
  initial: PlanTrabajo; catalogos: CatalogosTrabajo; historico?: TrabajoConsultado;
  onGuardado: (id: number) => Promise<void>; onCerrar: () => void; onCambio: () => void; onBloqueo: (b: boolean) => void;
}) {
  const [d, setD] = useState(initial), [claves, setClaves] = useState(() => initial.lines.map(l => l.id ? `partida-${l.id}` : crypto.randomUUID()));
  const [error, setError] = useState<string>(), [confirmacion, setConfirmacion] = useState<PlanTrabajo>(), [busy, setBusy] = useState(false), [incierto, setIncierto] = useState(false);
  const [editor, setEditor] = useState<{ clave: string; linea: LineaPlanTrabajo; consulta: boolean; nueva: boolean }>();
  const [quitar, setQuitar] = useState<string>();
  const focoDetalle = useRef<HTMLElement | null>(null), tabla = useRef<HTMLDivElement>(null);
  const solicitud = useRef<{ plan: PlanTrabajo; key: string } | undefined>(undefined), ocupado = useRef(false);
  const bloqueado = busy || Boolean(confirmacion) || incierto || Boolean(editor) || Boolean(quitar);
  function cambiar(next: PlanTrabajo) { setD(next); solicitud.current = undefined; setError(undefined); onCambio(); }
  function cerrarEditor() { setEditor(undefined); onBloqueo(false); }
  function abrir(clave: string, linea: LineaPlanTrabajo, consulta: boolean, nueva = false) { focoDetalle.current = document.activeElement as HTMLElement; setEditor({ clave, linea: structuredClone(linea), consulta, nueva }); onBloqueo(true); }
  function agregar(tipo: "CATALOGO" | "A_MEDIDA") {
    abrir(crypto.randomUUID(), { id: null, sourceDetailId: null, kind: tipo === "CATALOGO" ? "PRODUCTO" : "SERVICIO", executionMode: tipo, productId: null, rawMaterialId: null, unitMeasureId: 0, description: "", quantity: "1.000", quantityToProduce: tipo === "CATALOGO" ? "1.000" : "0.000", productVersion: null, refreshRecipe: false, supplies: [], materials: [], roundingReviews: [] }, false, true);
  }
  function guardarModal(confirmPlan: boolean) { if (bloqueado) return; const plan = { ...d, confirmPlan }; if (d.id && !d.reason.trim()) { setError("Indica el motivo de la revisión."); return; } setConfirmacion(plan); onBloqueo(true); }
  async function confirmar() {
    if (ocupado.current) return; ocupado.current = true; setBusy(true); onBloqueo(true);
    const s = solicitud.current ?? { plan: confirmacion!, key: crypto.randomUUID() }; solicitud.current = s;
    try { const r = await guardar(s.plan, s.key); if (!r.ok) { setError(r.mensaje); setIncierto(Boolean(r.incierto)); setConfirmacion(undefined); onBloqueo(Boolean(r.incierto)); return; } setIncierto(false); setConfirmacion(undefined); await onGuardado(r.id); }
    catch { setError("No se pudo comprobar el resultado. Reintenta sin cambiar los datos."); setIncierto(true); setConfirmacion(undefined); onBloqueo(true); }
    finally { ocupado.current = false; setBusy(false); }
  }
  return <div className="min-w-0 space-y-4">
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    <fieldset disabled={bloqueado} className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="text-sm">Título de la OT<Input aria-label="Título de la OT" value={d.productName} maxLength={150} onChange={e => cambiar({ ...d, productName: e.target.value })} /></label>
        <label className="text-sm">Fecha de la OT<Input type="date" value={d.date} disabled={Boolean(d.id)} onChange={e => cambiar({ ...d, date: e.target.value })} /></label>
        {!d.salesOrderId && <label className="text-sm">Finalidad de obra propia<Textarea value={d.ownPurpose ?? ""} maxLength={1000} onChange={e => cambiar({ ...d, ownPurpose: e.target.value })} /></label>}
        <label className="text-sm">Fecha objetivo (opcional)<Input type="date" value={d.targetDate ?? ""} onChange={e => cambiar({ ...d, targetDate: e.target.value || null })} /></label>
      </div>
      <label className="block text-sm">Instrucciones internas<Textarea value={d.internalInstructions} maxLength={5000} onChange={e => cambiar({ ...d, internalInstructions: e.target.value })} /></label>
      <section className="min-w-0 space-y-3" aria-label="Partidas del plan de trabajo">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">Partidas de la OT ({d.lines.length})</h3>{!d.id && !d.salesOrderId && <Permiso permiso="trabajos.operar"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={d.lines.length >= 100} onClick={() => agregar("CATALOGO")}>Agregar producto</Button><Button type="button" variant="outline" disabled={d.lines.length >= 100} onClick={() => agregar("A_MEDIDA")}>Agregar trabajo a medida</Button></div></Permiso>}</div>
        <Table containerProps={{ ref: tabla, role: "region", tabIndex: 0, "aria-label": "Partidas del plan; desplazar horizontalmente" }}><TableCaption>Configurar una partida modifica sólo el borrador. Cobertura y reservas se validan al guardar/confirmar.</TableCaption><TableHeader><TableRow>{["Partida", "Modo", "Cantidad / unidad", "A fabricar", "Desde stock", "Distribuciones del borrador", "Acciones"].map(t => <TableHead key={t} scope="col">{t}</TableHead>)}</TableRow></TableHeader><TableBody>{d.lines.map((l, i) => {
          const desdeStock = l.kind === "PRODUCTO" ? q(l.quantity).minus(q(l.quantityToProduce)) : l.kind === "MATERIA_PRIMA" ? q(l.quantity) : new Prisma.Decimal(0);
          return <TableRow key={claves[i]}><TableCell className="min-w-48 whitespace-normal"><p className="font-medium">{l.description}</p><p className="text-[13px] text-muted-foreground">{l.sourceDetailId ? `Partida de OCC #${l.sourceDetailId}` : "Obra propia"}</p></TableCell><TableCell className="whitespace-normal">{modos[l.executionMode]}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(l.quantity)} {c.units.find(u => u.id === l.unitMeasureId)?.abbreviation}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(l.quantityToProduce)}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(desdeStock.toFixed(3))}</TableCell><TableCell>{l.materials.length} de materiales · {l.supplies.length} de stock</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" aria-label={`Ver partida ${l.description}`} onClick={() => abrir(claves[i], l, true)}>Ver</Button><Permiso permiso="trabajos.operar"><Button type="button" variant="outline" size="sm" aria-label={`Configurar partida ${l.description}`} onClick={() => abrir(claves[i], l, false)}>Configurar</Button>{!d.id && !d.salesOrderId && <Button type="button" variant="outline" size="sm" aria-label={`Quitar partida ${l.description}`} onClick={() => { focoDetalle.current = document.activeElement as HTMLElement; setQuitar(claves[i]); onBloqueo(true); }}>Quitar</Button>}</Permiso></div></TableCell></TableRow>;
        })}{!d.lines.length && <TableRow><TableCell colSpan={7}>Sin partidas. Agrega un producto o trabajo a medida si corresponde a obra propia.</TableCell></TableRow>}</TableBody></Table>
      </section>
      {d.id && <label className="block text-sm">Motivo de revisión<Textarea value={d.reason} maxLength={1000} onChange={e => cambiar({ ...d, reason: e.target.value })} /></label>}
    </fieldset>
    <p className="text-sm text-muted-foreground">Guardar borrador conserva el plan sin reservas activas. Confirmar exige distribución completa e intenta reservar lo disponible; muestra faltantes sin mover existencias.</p>
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={bloqueado} onClick={onCerrar}>Cancelar</Button>{incierto ? <Button disabled={busy} onClick={() => void confirmar()}>Reintentar sin cambiar datos</Button> : <Permiso permiso="trabajos.operar"><Button variant="outline" disabled={bloqueado || !d.lines.length} onClick={() => guardarModal(false)}>Guardar borrador</Button><Button disabled={bloqueado || !d.lines.length} onClick={() => guardarModal(true)}>Confirmar y reservar plan</Button></Permiso>}</div>
    {editor && <EditorLineaPlan key={editor.clave} inicial={editor.linea} catalogos={c} historico={historico} comercial={Boolean(d.salesOrderId)} consulta={editor.consulta} onCerrar={cerrarEditor} devolverFoco={() => (focoDetalle.current?.isConnected ? focoDetalle.current : tabla.current)?.focus()} onAceptar={linea => {
      if (editor.nueva) { setClaves(v => [...v, editor.clave]); cambiar({ ...d, lines: [...d.lines, linea] }); }
      else cambiar({ ...d, lines: d.lines.map((actual, i) => claves[i] === editor.clave ? linea : actual) });
      cerrarEditor();
    }} />}
    <ConfirmarAccion abierto={Boolean(quitar)} onAbiertoChange={abierto => { if (!abierto) { setQuitar(undefined); onBloqueo(false); } }} titulo="Quitar partida del borrador" descripcion="Se quitará la partida de esta OT nueva de obra propia. No cambia documentos ni reservas guardadas." accion="Quitar partida" pendiente={false} onDevolverFoco={() => tabla.current?.focus()} onConfirmar={() => { cambiar({ ...d, lines: d.lines.filter((_, i) => claves[i] !== quitar) }); setClaves(v => v.filter(clave => clave !== quitar)); setQuitar(undefined); onBloqueo(false); }} />
    <ConfirmarAccion abierto={Boolean(confirmacion)} titulo={confirmacion?.confirmPlan ? "Confirmar plan y reservas" : "Guardar borrador de OT"} descripcion={confirmacion?.confirmPlan ? "Se guardará el plan y se reservará parcialmente el stock disponible. Los faltantes seguirán pendientes. No se consumen materiales ni se fabrica todavía." : "Se guardará sin reservas activas. Las reservas anteriores se liberarán con el motivo de esta revisión."} accion="Confirmar" pendiente={busy} onConfirmar={() => void confirmar()} onAbiertoChange={abierto => { if (!abierto && !busy) { setConfirmacion(undefined); onBloqueo(false); } }} />
  </div>;
}
