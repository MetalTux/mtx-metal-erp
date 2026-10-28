"use client";

import { useRef, useState } from "react";
import { Prisma } from "@/generated/prisma/browser";
import { lineaPlanTrabajoSchema, type LineaPlanTrabajo } from "@/lib/validaciones/orden-trabajo";
import type { CatalogosTrabajo, TrabajoConsultado } from "@/lib/consultas/ordenes-trabajo";
import { calcularRequerimientosProduccion } from "@/lib/servicios/requerimientos-produccion";
import { formatearCantidad } from "@/lib/formato";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TableCaption } from "@/components/ui/table";

const decimal = (valor: string) => { try { return new Prisma.Decimal(valor.replace(",", ".")); } catch { return new Prisma.Decimal(0); } };
type Fila<T> = { clave: string; datos: T };
type Subeditor = { tipo: "material" | "stock" | "revision"; clave?: string; rawMaterialId: number; warehouseId: number; quantity: string; reason: string };
const columnas = (titulos: string[]) => <TableHeader><TableRow>{titulos.map(t => <TableHead key={t} scope="col">{t}</TableHead>)}</TableRow></TableHeader>;

/** Borrador completo de una partida; aceptar no guarda OT ni crea reservas. */
export function EditorLineaPlan({ inicial, catalogos: c, historico, comercial, consulta, onAceptar, onCerrar, devolverFoco }: {
  inicial: LineaPlanTrabajo; catalogos: CatalogosTrabajo; historico?: TrabajoConsultado;
  comercial: boolean; consulta: boolean; onAceptar: (linea: LineaPlanTrabajo) => void; onCerrar: () => void; devolverFoco: () => void;
}) {
  const [l, setL] = useState(() => structuredClone(inicial));
  const [materiales, setMateriales] = useState<Fila<LineaPlanTrabajo["materials"][number]>[]>(() => inicial.materials.map(datos => ({ clave: crypto.randomUUID(), datos: { ...datos } })));
  const [stock, setStock] = useState<Fila<LineaPlanTrabajo["supplies"][number]>[]>(() => inicial.supplies.map(datos => ({ clave: crypto.randomUUID(), datos: { ...datos } })));
  const [sub, setSub] = useState<Subeditor>();
  const [error, setError] = useState<string>();
  const [errorSub, setErrorSub] = useState<string>();
  const [descarte, setDescarte] = useState(false), [descarteSub, setDescarteSub] = useState(false);
  const [quitar, setQuitar] = useState<{ tipo: "material" | "stock"; clave: string }>();
  const focoSub = useRef<HTMLElement | null>(null), tabla = useRef<HTMLDivElement>(null);
  const inicialSub = useRef("");
  const partida = { ...l, materials: materiales.map(f => f.datos), supplies: stock.map(f => f.datos) };
  const modificado = JSON.stringify(partida) !== JSON.stringify(inicial);
  const producto = c.products.find(p => p.id === l.productId);
  const recetaHistorica = historico?.historicalRecipes.filter(r => r.workOrderLineId === l.id);
  const receta = recetaHistorica?.length && !l.refreshRecipe ? recetaHistorica : producto?.recipe ?? [];
  const cantidadStock = l.kind === "PRODUCTO" ? decimal(l.quantity).minus(decimal(l.quantityToProduce)) : l.kind === "MATERIA_PRIMA" ? decimal(l.quantity) : new Prisma.Decimal(0);
  let necesidades: ReturnType<typeof calcularRequerimientosProduccion>["materials"] = [], errorCalculo = "";
  if (l.executionMode === "CATALOGO" && decimal(l.quantityToProduce).gt(0)) {
    try { necesidades = calcularRequerimientosProduccion(l.quantityToProduce, receta).materials; }
    catch (e) { errorCalculo = e instanceof Error ? e.message : "No se pudo calcular la necesidad."; }
  }
  const bodegas = (terminado: boolean) => c.warehouses.filter(w => w.classification === "MIXTA" || w.classification === (terminado ? "PRODUCTO_TERMINADO" : "MATERIA_PRIMA")).map(w => ({ valor: String(w.id), etiqueta: w.name }));
  function disponibilidad(raw: number | null, product: number | null, warehouseId: number) {
    const s = c.stock.find(s => s.rawMaterialId === raw && s.productId === product && s.warehouseId === warehouseId);
    return s ? `Físico ${formatearCantidad(s.quantity)} · Reservado ${formatearCantidad(s.reserved)} · Libre ${formatearCantidad(s.free)}` : "Físico 0 · Reservado 0 · Libre 0";
  }
  function cambiar(parte: Partial<LineaPlanTrabajo>) { setL(v => ({ ...v, ...parte })); setError(undefined); }
  function cerrar() { if (sub || quitar || descarte) return; if (!consulta && modificado) setDescarte(true); else onCerrar(); }
  function abrirSub(valor: Subeditor) { focoSub.current = document.activeElement as HTMLElement; inicialSub.current = JSON.stringify(valor); setSub(valor); setErrorSub(undefined); }
  function cerrarSub() { if (descarteSub) return; if (sub && JSON.stringify(sub) !== inicialSub.current) setDescarteSub(true); else setSub(undefined); }
  function aceptarSub() {
    if (!sub || consulta) return;
    if (sub.tipo === "revision") {
      const v = lineaPlanTrabajoSchema.shape.roundingReviews.element.safeParse({ rawMaterialId: sub.rawMaterialId, quantity: sub.quantity, reason: sub.reason });
      if (!v.success) { setErrorSub(v.error.issues[0].message); return; }
      cambiar({ roundingReviews: [...l.roundingReviews.filter(r => r.rawMaterialId !== sub.rawMaterialId), v.data] });
    } else if (sub.tipo === "material") {
      const v = lineaPlanTrabajoSchema.shape.materials.element.safeParse({ rawMaterialId: sub.rawMaterialId, warehouseId: sub.warehouseId, quantity: sub.quantity });
      if (!v.success) { setErrorSub(v.error.issues[0].message); return; }
      setMateriales(prev => sub.clave ? prev.map(f => f.clave === sub.clave ? { ...f, datos: v.data } : f) : [...prev, { clave: crypto.randomUUID(), datos: v.data }]);
    } else {
      const v = lineaPlanTrabajoSchema.shape.supplies.element.safeParse({ warehouseId: sub.warehouseId, quantity: sub.quantity });
      if (!v.success) { setErrorSub(v.error.issues[0].message); return; }
      setStock(prev => sub.clave ? prev.map(f => f.clave === sub.clave ? { ...f, datos: v.data } : f) : [...prev, { clave: crypto.randomUUID(), datos: v.data }]);
    }
    setSub(undefined); setError(undefined);
  }
  return <>
    <Dialog open onOpenChange={abierto => { if (!abierto) cerrar(); }}>
      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => {
        e.preventDefault(); const destino = e.target;
        if (destino instanceof HTMLElement && destino.getAttribute("role") === "combobox" && destino.getAttribute("aria-expanded") === "true") return;
        cerrar();
      }} onCloseAutoFocus={e => { e.preventDefault(); devolverFoco(); }}>
        <DialogHeader><DialogTitle>{consulta ? "Ver partida de la OT" : "Configurar partida de la OT"}</DialogTitle><DialogDescription>Configura la partida y sus distribuciones. Aceptar sólo actualiza el borrador; guardar o confirmar la OT revalida el plan en el servidor.</DialogDescription></DialogHeader>
        <form className="min-w-0 space-y-4" onSubmit={e => { e.preventDefault(); e.stopPropagation(); if (consulta || sub || quitar) return; const v = lineaPlanTrabajoSchema.safeParse(partida); if (!v.success) { setError(v.error.issues[0].message); return; } onAceptar(v.data); }}>
          {error && <Aviso titulo={error} />}
          <fieldset disabled={consulta || Boolean(sub) || Boolean(quitar)} className="min-w-0 space-y-3">
            {!l.id && !comercial && l.executionMode === "CATALOGO" && <SelectorBuscable id="plan-producto" nombre="producto" placeholder="Buscar producto…" valor={l.productId ? String(l.productId) : ""} opciones={c.products.map(p => ({ valor: String(p.id), etiqueta: `${p.name} · ${p.code}` }))} onChange={valor => { const p = c.products.find(p => p.id === Number(valor))!; cambiar({ productId: p.id, unitMeasureId: p.unitMeasureId, description: p.name, productVersion: p.version, roundingReviews: [] }); setMateriales([]); }} />}
            {!l.id && !comercial && l.executionMode === "A_MEDIDA" && <><label className="block text-sm">Descripción del trabajo<Input aria-label="Descripción del trabajo" value={l.description} onChange={e => cambiar({ description: e.target.value })} /></label><SelectorBuscable id="plan-unidad" nombre="unidad de ejecución" placeholder="Unidad de ejecución…" valor={l.unitMeasureId ? String(l.unitMeasureId) : ""} opciones={c.units.map(u => ({ valor: String(u.id), etiqueta: `${u.name} (${u.abbreviation})` }))} onChange={valor => cambiar({ unitMeasureId: Number(valor) })} /></>}
            <p className="break-words font-medium">{l.description || "Seleccionar producto o describir trabajo"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Cantidad {comercial ? "contratada" : "prevista"}<Input aria-label="Cantidad de la partida" value={l.quantity.replace(".", ",")} readOnly={comercial} inputMode="decimal" onChange={e => cambiar({ quantity: e.target.value, ...(!comercial && l.kind === "PRODUCTO" ? { quantityToProduce: e.target.value } : {}), roundingReviews: [] })} /></label>
              {l.kind === "PRODUCTO" && <label className="text-sm">Cantidad a fabricar<Input aria-label="Cantidad a fabricar" value={l.quantityToProduce.replace(".", ",")} readOnly={!comercial} inputMode="decimal" onChange={e => cambiar({ quantityToProduce: e.target.value, productVersion: l.productVersion ?? producto?.version ?? null, roundingReviews: [] })} /><span>Desde stock: {formatearCantidad(cantidadStock.toFixed(3))}</span></label>}
              {l.kind === "SERVICIO" && comercial && <label className="text-sm">Modo de ejecución<select aria-label="Modo de ejecución" className="block h-9 w-full rounded border bg-card px-2" value={l.executionMode} onChange={e => { cambiar({ executionMode: e.target.value as "SERVICIO" | "A_MEDIDA" }); setMateriales([]); }}><option value="SERVICIO">Servicio sin materiales</option><option value="A_MEDIDA">Trabajo a medida con materiales</option></select></label>}
            </div>
            {l.kind === "PRODUCTO" && decimal(l.quantityToProduce).gt(0) && <section className="space-y-2">
              <h3 className="font-medium">Necesidades de receta</h3><p className="text-sm">Receta {recetaHistorica?.length && !l.refreshRecipe ? `histórica (revisión ${l.productVersion})` : `de catálogo (revisión ${producto?.version ?? "no disponible"})`}. No se actualiza automáticamente.</p>
              {l.id && producto && <label className="flex gap-2 text-sm"><input type="checkbox" checked={l.refreshRecipe} onChange={e => cambiar({ refreshRecipe: e.target.checked, productVersion: e.target.checked ? producto.version : inicial.productVersion, roundingReviews: [] })} />Actualizar receta explícitamente al guardar</label>}
              {errorCalculo && <Aviso titulo={errorCalculo} />}
              <Table containerProps={{ role: "region", tabIndex: 0, "aria-label": "Necesidades de receta" }}><TableCaption>Necesidades por material, sin sumar unidades diferentes.</TableCaption>{columnas(["Material", "Unidad", "Exacto", "Previsto / revisado", "Diferencia", "Revisión", "Acciones"])}<TableBody>{necesidades.map(n => {
                const m = c.raws.find(r => r.id === n.rawMaterialId), revision = l.roundingReviews.find(r => r.rawMaterialId === n.rawMaterialId);
                return <TableRow key={n.rawMaterialId}><TableCell className="min-w-40 whitespace-normal">{m?.name ?? `Material ${n.rawMaterialId}`}</TableCell><TableCell>{m?.unitName}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(n.expectedExactQuantity)}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(revision?.quantity ?? n.expectedQuantity)}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(n.roundingDifference)}</TableCell><TableCell>{n.requiresReview ? revision ? "Revisado" : "Obligatoria pendiente" : "No requerida"}</TableCell><TableCell><div className="flex gap-2">{n.requiresReview && <Button type="button" variant="outline" size="sm" onClick={() => abrirSub({ tipo: "revision", rawMaterialId: n.rawMaterialId, warehouseId: 0, quantity: revision?.quantity ?? "", reason: revision?.reason ?? "" })}>Revisar {m?.name}</Button>}<Button type="button" variant="outline" size="sm" disabled={n.requiresReview && !revision || materiales.length >= 300} onClick={() => abrirSub({ tipo: "material", rawMaterialId: n.rawMaterialId, warehouseId: 0, quantity: revision?.quantity ?? n.expectedQuantity, reason: "" })}>Distribuir {m?.name}</Button></div></TableCell></TableRow>;
              })}</TableBody></Table>
            </section>}
            <section className="space-y-2"><h3 className="font-medium">Materiales previstos por bodega</h3>
              {l.executionMode === "A_MEDIDA" && <SelectorBuscable id="plan-agregar-material" nombre="material del trabajo a medida" placeholder="Agregar materia prima…" valor="" disabled={materiales.length >= 300} opciones={c.raws.map(m => ({ valor: String(m.id), etiqueta: `${m.code} · ${m.name} · ${m.unitName}` }))} onChange={valor => abrirSub({ tipo: "material", rawMaterialId: Number(valor), warehouseId: 0, quantity: "1.000", reason: "" })} />}
              <Table containerProps={{ ref: tabla, role: "region", tabIndex: 0, "aria-label": "Materiales previstos" }}><TableCaption>Distribuciones del borrador; se validan al guardar/confirmar.</TableCaption>{columnas(["Material", "Bodega", "Cantidad / unidad", "Disponibilidad orientativa", "Acciones"])}<TableBody>{materiales.map(f => <TableRow key={f.clave}><TableCell className="min-w-40 whitespace-normal">{c.raws.find(m => m.id === f.datos.rawMaterialId)?.name ?? "Material histórico"}</TableCell><TableCell>{c.warehouses.find(w => w.id === f.datos.warehouseId)?.name ?? "Sin bodega"}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(f.datos.quantity)} {c.raws.find(m => m.id === f.datos.rawMaterialId)?.unitName}</TableCell><TableCell className="min-w-48 whitespace-normal">{disponibilidad(f.datos.rawMaterialId, null, f.datos.warehouseId)}</TableCell><TableCell><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label={`Editar distribución ${f.clave}`} onClick={() => abrirSub({ tipo: "material", clave: f.clave, ...f.datos, reason: "" })}>Editar</Button><Button type="button" variant="outline" size="sm" aria-label={`Quitar distribución ${f.clave}`} onClick={() => setQuitar({ tipo: "material", clave: f.clave })}>Quitar</Button></div></TableCell></TableRow>)}{!materiales.length && <TableRow><TableCell colSpan={5}>Sin materiales distribuidos.</TableCell></TableRow>}</TableBody></Table>
            </section>
            <section className="space-y-2"><h3 className="font-medium">Abastecimiento desde stock</h3>
              {cantidadStock.gt(0) && <Button type="button" variant="outline" disabled={stock.length >= 100} onClick={() => abrirSub({ tipo: "stock", rawMaterialId: l.rawMaterialId ?? 0, warehouseId: 0, quantity: cantidadStock.toFixed(3), reason: "" })}>Agregar distribución de stock</Button>}
              <Table containerProps={{ role: "region", tabIndex: 0, "aria-label": "Abastecimiento desde stock" }}><TableCaption>Cantidad desde stock: {formatearCantidad(cantidadStock.toFixed(3))}. Las reservas se verifican en el servidor.</TableCaption>{columnas(["Bodega", "Cantidad / unidad", "Disponibilidad orientativa", "Acciones"])}<TableBody>{stock.map(f => <TableRow key={f.clave}><TableCell>{c.warehouses.find(w => w.id === f.datos.warehouseId)?.name ?? "Sin bodega"}</TableCell><TableCell className="text-right tabular-nums">{formatearCantidad(f.datos.quantity)} {c.units.find(u => u.id === l.unitMeasureId)?.abbreviation}</TableCell><TableCell className="min-w-48 whitespace-normal">{disponibilidad(l.rawMaterialId, l.productId, f.datos.warehouseId)}</TableCell><TableCell><div className="flex gap-2"><Button type="button" variant="outline" size="sm" aria-label={`Editar stock ${f.clave}`} onClick={() => abrirSub({ tipo: "stock", clave: f.clave, rawMaterialId: l.rawMaterialId ?? 0, ...f.datos, reason: "" })}>Editar</Button><Button type="button" variant="outline" size="sm" aria-label={`Quitar stock ${f.clave}`} onClick={() => setQuitar({ tipo: "stock", clave: f.clave })}>Quitar</Button></div></TableCell></TableRow>)}{!stock.length && <TableRow><TableCell colSpan={4}>Sin abastecimiento distribuido.</TableCell></TableRow>}</TableBody></Table>
            </section>
          </fieldset>
          <p className="text-xs text-muted-foreground">Desplaza las tablas horizontalmente. La disponibilidad no equivale a una reserva confirmada. Aceptar no modifica existencias.</p>
          <DialogFooter><Button type="button" variant="outline" onClick={cerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit">Aceptar partida</Button>}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {sub && <Dialog open onOpenChange={abierto => { if (!abierto) cerrarSub(); }}><DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { e.preventDefault(); const destino = e.target; if (destino instanceof HTMLElement && destino.getAttribute("role") === "combobox" && destino.getAttribute("aria-expanded") === "true") return; cerrarSub(); }} onCloseAutoFocus={e => { e.preventDefault(); (focoSub.current?.isConnected ? focoSub.current : tabla.current)?.focus(); }}>
      <DialogHeader><DialogTitle>{sub.tipo === "revision" ? "Revisar cantidad de receta" : "Configurar distribución"}</DialogTitle><DialogDescription>{sub.tipo === "stock" ? "Abastecimiento desde existencias; selecciona bodega y cantidad." : c.raws.find(m => m.id === sub.rawMaterialId)?.name ?? "Material histórico"}. Se aplica sólo al borrador de esta partida.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); e.stopPropagation(); aceptarSub(); }}>
        {errorSub && <Aviso titulo={errorSub} />}
        {sub.tipo !== "revision" && <SelectorBuscable id="plan-distribucion-bodega" nombre="bodega de distribución" placeholder="Seleccionar bodega…" valor={sub.warehouseId ? String(sub.warehouseId) : ""} opciones={bodegas(sub.tipo === "stock" && l.kind === "PRODUCTO")} onChange={valor => setSub({ ...sub, warehouseId: Number(valor) })} />}
        <label className="block text-sm">Cantidad positiva<Input aria-label="Cantidad de distribución o revisión" inputMode="decimal" value={sub.quantity} onChange={e => setSub({ ...sub, quantity: e.target.value })} /></label>
        {sub.tipo === "revision" && <label className="block text-sm">Motivo obligatorio<Input aria-label="Motivo de revisión" maxLength={1000} value={sub.reason} onChange={e => setSub({ ...sub, reason: e.target.value })} /></label>}
        <DialogFooter><Button type="button" variant="outline" onClick={cerrarSub}>Cancelar distribución</Button><Button type="submit">Aceptar distribución</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>}
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={onCerrar} />
    <ConfirmarDescarte abierto={descarteSub} onAbiertoChange={setDescarteSub} onConfirmar={() => { setDescarteSub(false); setSub(undefined); }} />
    <ConfirmarAccion abierto={Boolean(quitar)} onAbiertoChange={abierto => { if (!abierto) setQuitar(undefined); }} titulo="Quitar distribución del borrador" descripcion="La distribución se quitará de esta partida. No modifica reservas ni documentos guardados hasta confirmar la OT." accion="Quitar distribución" pendiente={false} onConfirmar={() => { if (!quitar) return; if (quitar.tipo === "material") setMateriales(v => v.filter(f => f.clave !== quitar.clave)); else setStock(v => v.filter(f => f.clave !== quitar.clave)); setQuitar(undefined); }} />
  </>;
}
