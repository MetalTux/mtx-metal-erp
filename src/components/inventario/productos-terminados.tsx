"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ingresarInicialTerminado, ajustarTerminado } from "@/app/(app)/inventario/productos-terminados/actions";
import type { CatalogosTerminado, ConsultaTerminado, FilaTerminado, ResultadoInicialTerminado } from "@/lib/tipos/stock-terminado";
import type { DatosInicialTerminado, DatosAjusteTerminado } from "@/lib/validaciones/stock-terminado";
import { motivosAjuste } from "@/config/motivos-ajuste";
import { FormularioAjusteTerminado } from "@/components/inventario/formulario-ajuste-terminado";
import { FormularioInicialTerminado } from "@/components/inventario/formulario-inicial-terminado";
import { TablaConsulta, type ColumnaConsulta } from "@/components/data-table/tabla-consulta";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatearCantidad, formatearFecha } from "@/lib/formato";
const fechaCalendario = (fecha: string) => fecha.split("-").reverse().join("-");
export function InventarioTerminado({ consulta, catalogos }: { consulta: ConsultaTerminado; catalogos: CatalogosTerminado }) {
  const router = useRouter(), params = useSearchParams();
  const vista = params.get("vista") ?? "stock", orden = params.get("orden") ?? "id", sentido = params.get("sentido") === "asc" ? "asc" : "desc";
  const [navegando, startTransition] = useTransition(), [guardando, setGuardando] = useState(false);
  const [texto, setTexto] = useState(params.get("texto") ?? ""), [producto, setProducto] = useState(params.get("productId") ?? ""), [bodega, setBodega] = useState(params.get("warehouseId") ?? "");
  const [inicial, setInicial] = useState<string>(), [detalle, setDetalle] = useState<FilaTerminado>(), [descarte, setDescarte] = useState(false);
  const [ajuste, setAjuste] = useState<{ uuid: string; fila?: FilaTerminado }>();
  // El formulario conserva un UUID hasta guardar o descartar; las consultas sólo cambian la URL.
  const modificado = useRef(false), bloqueado = useRef(false), retorno = useRef<HTMLElement | null>(null), nuevo = useRef<HTMLButtonElement>(null);
  const tituloAjuste = useRef<HTMLHeadingElement>(null);
  const ocupado = navegando || guardando;
  function navegar(cambios: Record<string, string>) {
    const siguientes = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) { if (v) siguientes.set(k, v); else siguientes.delete(k); }
    startTransition(() => router.push(`/inventario/productos-terminados?${siguientes}`));
  }
  function restaurar() { (retorno.current?.isConnected ? retorno.current : nuevo.current)?.focus(); }
  function cerrar() {
    if (ocupado || bloqueado.current || descarte) return;
    if (modificado.current) setDescarte(true); else { setInicial(undefined); setAjuste(undefined); }
  }
  async function guardar(datos: DatosInicialTerminado): Promise<ResultadoInicialTerminado> {
    setGuardando(true);
    try {
      const r = await ingresarInicialTerminado(datos);
      if (r.ok) { bloqueado.current = false; setInicial(undefined); notificar.exito(r.mensaje); router.refresh(); }
      return r;
    } catch { return { ok: false, mensaje: "No se pudo confirmar el ingreso. Conserva el formulario y reintenta con los mismos datos." }; }
    finally { setGuardando(false); }
  }
  function abrirAjuste(elemento: HTMLElement, fila?: FilaTerminado) {
    retorno.current = elemento; modificado.current = false; bloqueado.current = false;
    setAjuste({ uuid: crypto.randomUUID(), fila });
  }
  async function guardarAjuste(datos: DatosAjusteTerminado): Promise<ResultadoInicialTerminado> {
    setGuardando(true);
    try {
      const r = await ajustarTerminado(datos);
      if (r.ok) { bloqueado.current = false; setAjuste(undefined); notificar.exito(r.mensaje); router.refresh(); }
      return r;
    } catch { return { ok: false, mensaje: "Resultado pendiente de confirmar. Reintenta con los mismos datos; no se duplicará el ajuste." }; }
    finally { setGuardando(false); }
  }
  const columnas: ColumnaConsulta<FilaTerminado>[] = [
    { id: "id", titulo: vista === "stock" ? "Registro" : vista === "ingresos" ? "Ingreso" : vista === "ajustes" ? "Ajuste" : "Movimiento", orden: "id", contenido: r => `#${r.id}` },
    { id: "producto", titulo: "Producto", contenido: r => <div className="max-w-72 whitespace-normal"><p className="font-medium">{r.producto}</p><p className="break-all font-mono text-xs text-muted-foreground">{r.codigo}</p></div> },
    { id: "bodega", titulo: "Bodega", contenido: r => r.bodega },
    { id: "cantidad", titulo: vista === "stock" ? "Saldo" : vista === "ingresos" ? "Cantidad ingresada" : "Variación", orden: "quantity", contenido: r => `${formatearCantidad(r.cantidad)} ${r.unidad}` },
    ...(vista === "ajustes" ? [
      { id: "anterior", titulo: "Saldo anterior", contenido: (r: FilaTerminado) => `${formatearCantidad(r.anterior ?? "0")} ${r.unidad}` },
      { id: "final", titulo: "Saldo final", contenido: (r: FilaTerminado) => `${formatearCantidad(r.final ?? "0")} ${r.unidad}` },
    ] : []),
    ...(vista === "movimientos" ? [{ id: "tipo", titulo: "Tipo", contenido: (r: FilaTerminado) => r.produccion?r.produccion.reversalId?"Reversión de fabricación":"Fabricación":r.documentoTipo === "ajuste" ? "Ajuste" : "Entrada inicial" }] : []),
    ...(vista !== "stock" ? [{ id: "fecha", titulo: "Fecha", contenido: (r: FilaTerminado) => r.fecha ? fechaCalendario(r.fecha) : "—" }] : []),
    { id: "acciones", titulo: "Acciones", contenido: r => <div className="flex gap-2">
      {vista === "stock" ? <>
        <BotonConAyuda variant="outline" size="sm" disabled={ocupado} ayuda="Consulta los movimientos de este producto en esta bodega." onClick={() => { setProducto(String(r.productId)); setBodega(String(r.warehouseId)); navegar({ vista: "movimientos", productId: String(r.productId), warehouseId: String(r.warehouseId), pagina: "1" }); }}>Movimientos</BotonConAyuda>
        <BotonConAyuda variant="outline" size="sm" disabled={ocupado} ayuda="Registra el conteo físico final sin borrar el historial." onClick={e => abrirAjuste(e.currentTarget, r)}>Ajustar</BotonConAyuda>
      </> : r.produccion ? <Button asChild variant="outline"><Link href={`/trabajos/ordenes?ver=${r.produccion.workOrderId}`}>Ver OT · {r.produccion.reversalId?`Reversión #${r.produccion.reversalId}`:`Registro #${r.produccion.recordId}`}</Link></Button> : <>
        <BotonConAyuda variant="outline" size="sm" disabled={ocupado} ayuda="Consulta el documento histórico y su origen." aria-label={`Ver ${vista === "ingresos" ? "ingreso" : vista === "ajustes" ? "ajuste" : "movimiento"} ${r.id}`} onClick={e => { retorno.current = e.currentTarget; setDetalle(r); }}>Ver</BotonConAyuda>
        <BotonConAyuda variant="outline" size="sm" disabled={ocupado} ayuda="Corrige mediante un nuevo conteo del saldo actual, vinculado a este documento." aria-label={`Corregir ${r.documentoTipo === "ajuste" ? "ajuste" : "ingreso"} ${r.documentoId}`} onClick={e => abrirAjuste(e.currentTarget, r)}>Corregir</BotonConAyuda>
      </>}
    </div> },
  ];
  return <div className="space-y-6">
    <PageHeader titulo="Productos terminados" descripcion="Existencias por bodega, inventario inicial, ajustes y movimientos de producto terminado." acciones={<><BotonConAyuda variant="outline" ayuda="Consulta los datos actuales." disabled={ocupado} onClick={() => startTransition(() => router.refresh())}>Actualizar</BotonConAyuda><BotonConAyuda ref={nuevo} ayuda="Ingresa productos existentes sin consumir materias primas, sólo sin movimientos y con saldo cero." disabled={ocupado || !catalogos.productos.length || !catalogos.bodegas.length} onClick={e => { retorno.current = e.currentTarget; modificado.current = false; bloqueado.current = false; setInicial(crypto.randomUUID()); }}>Inventario inicial</BotonConAyuda><BotonConAyuda ayuda="Corrige existencias mediante un conteo físico final; conserva los documentos originales." disabled={ocupado || !catalogos.productos.length || !catalogos.bodegas.length} onClick={e => abrirAjuste(e.currentTarget)}>Ajustar stock</BotonConAyuda></>} />
    {(!catalogos.productos.length || !catalogos.bodegas.length) && <Aviso tipo="informacion" titulo="Configura productos y una bodega apta">Necesitas productos en el catálogo y al menos una bodega clasificada Mixta o Producto terminado para ingresar existencias iniciales.</Aviso>}
    <div className="flex flex-wrap gap-2" aria-label="Consultas de producto terminado">{[{ valor: "stock", nombre: "Stock por bodega" }, { valor: "ingresos", nombre: "Ingresos iniciales" }, { valor: "ajustes", nombre: "Ajustes de terminado" }, { valor: "movimientos", nombre: "Movimientos de terminado" }].map(v => <Button key={v.valor} variant={vista === v.valor ? "default" : "outline"} aria-pressed={vista === v.valor} disabled={ocupado} onClick={() => navegar({ vista: v.valor, pagina: "1" })}>{v.nombre}</Button>)}</div>
    <form className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); navegar({ texto, productId: producto, warehouseId: bodega, pagina: "1" }); }}>
      <div className="min-w-0 space-y-2"><Label htmlFor="terminado-texto">Buscar</Label><Input id="terminado-texto" value={texto} maxLength={150} disabled={ocupado} placeholder="Producto, código o bodega…" onChange={e => setTexto(e.target.value)} /></div>
      <div className="min-w-0 space-y-2"><Label htmlFor="terminado-producto">Producto</Label><SelectorBuscable id="terminado-producto" opciones={[{ valor: "", etiqueta: "Todos los productos" }, ...catalogos.productos.map(p => ({ valor: String(p.id), etiqueta: `${p.name} — ${p.code}` }))]} valor={producto} onChange={setProducto} nombre="producto del filtro" placeholder="Todos los productos" disabled={ocupado} /></div>
      <div className="min-w-0 space-y-2"><Label htmlFor="terminado-bodega">Bodega</Label><SelectorBuscable id="terminado-bodega" opciones={[{ valor: "", etiqueta: "Todas las bodegas" }, ...catalogos.bodegas.map(b => ({ valor: String(b.id), etiqueta: b.name }))]} valor={bodega} onChange={setBodega} nombre="bodega del filtro" placeholder="Todas las bodegas" disabled={ocupado} /></div>
      <div className="flex items-end gap-2"><Button type="submit" disabled={ocupado}>Filtrar</Button><Button type="button" variant="outline" disabled={ocupado} onClick={() => { setTexto(""); setProducto(""); setBodega(""); navegar({ texto: "", productId: "", warehouseId: "", pagina: "1", vista: ["stock", "ingresos", "ajustes", "movimientos"].includes(vista) ? vista : "stock", orden: "id", sentido: "desc", tamano: "20" }); }}>Limpiar</Button></div>
    </form>
    <SectionCard titulo={vista === "stock" ? "Stock de producto terminado" : vista === "ingresos" ? "Ingresos de inventario inicial" : vista === "ajustes" ? "Ajustes de producto terminado" : "Kardex de producto terminado"} contentClassName="p-0">
      {consulta.ok ? <TablaConsulta nombre="Inventario de productos terminados" pagina={consulta.pagina} columnas={columnas} orden={orden} sentido={sentido} pendiente={ocupado} onOrden={v => navegar({ orden: v, sentido: orden === v && sentido === "asc" ? "desc" : "asc", pagina: "1" })} onPagina={v => navegar({ pagina: String(v) })} onTamano={v => navegar({ tamano: v, pagina: "1" })} vacio={<p>No hay registros para esta consulta.</p>} /> : <div className="p-4"><Aviso titulo={consulta.mensaje} /></div>}
    </SectionCard>
    <Dialog open={Boolean(inicial)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!ocupado} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (ocupado || bloqueado.current || descarte) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}><DialogHeader><DialogTitle>Inventario inicial de producto terminado</DialogTitle><DialogDescription>Registra existencias anteriores sin salir del listado.</DialogDescription></DialogHeader>{inicial && <FormularioInicialTerminado key={inicial} uuid={inicial} catalogos={catalogos} pendiente={guardando} onGuardar={guardar} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} />}</DialogContent></Dialog>
    <Dialog open={Boolean(ajuste)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent onOpenAutoFocus={e => { e.preventDefault(); tituloAjuste.current?.focus({ preventScroll: true }); }} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!ocupado} onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (ocupado || bloqueado.current || descarte) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}><DialogHeader><DialogTitle ref={tituloAjuste} tabIndex={-1}>{ajuste?.fila?.documentoTipo ? "Corregir registro de producto terminado" : "Ajustar stock de producto terminado"}</DialogTitle><DialogDescription>Registra el conteo físico actual sin salir del listado.</DialogDescription></DialogHeader>{ajuste && <FormularioAjusteTerminado key={ajuste.uuid} uuid={ajuste.uuid} fila={ajuste.fila} catalogos={catalogos} pendiente={guardando} onGuardar={guardarAjuste} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} />}</DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); setInicial(undefined); setAjuste(undefined); }} />
    <Dialog open={Boolean(detalle)} onOpenChange={v => { if (!v) setDetalle(undefined); }}><DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}><DialogHeader><DialogTitle>{detalle?.documentoTipo === "ajuste" ? "Ver ajuste de producto terminado" : "Ver inventario inicial"}</DialogTitle><DialogDescription>Documento histórico; no modifica existencias.</DialogDescription></DialogHeader>{detalle && <dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Documento</dt><dd>{detalle.documentoTipo === "ajuste" ? "Ajuste" : "Inventario inicial"} #{detalle.documentoId}</dd></div><div><dt className="text-muted-foreground">Producto</dt><dd>{detalle.producto}</dd><dd className="break-all font-mono text-xs">{detalle.codigo}</dd></div><div><dt className="text-muted-foreground">Bodega</dt><dd>{detalle.bodega}</dd></div><div><dt className="text-muted-foreground">{detalle.documentoTipo === "ajuste" ? "Variación" : "Cantidad ingresada"}</dt><dd>{formatearCantidad(detalle.cantidad)} {detalle.unidad}</dd></div>{detalle.documentoTipo === "ajuste" && <><div><dt className="text-muted-foreground">Saldo anterior</dt><dd>{formatearCantidad(detalle.anterior ?? "0")} {detalle.unidad}</dd></div><div><dt className="text-muted-foreground">Saldo final</dt><dd>{formatearCantidad(detalle.final ?? "0")} {detalle.unidad}</dd></div><div><dt className="text-muted-foreground">Motivo</dt><dd>{motivosAjuste[detalle.motivo as keyof typeof motivosAjuste] ?? detalle.motivo}</dd></div><div><dt className="text-muted-foreground">Documento que se corrige</dt><dd>{detalle.origen ? `${detalle.origen.tipo === "inicial" ? "Inventario inicial" : "Ajuste"} #${detalle.origen.id}` : "Sin corrección vinculada"}</dd></div></>}<div><dt className="text-muted-foreground">Fecha</dt><dd>{detalle.fecha && fechaCalendario(detalle.fecha)}</dd></div><div><dt className="text-muted-foreground">Observación</dt><dd className="whitespace-pre-wrap break-words">{detalle.observacion}</dd></div><div><dt className="text-muted-foreground">Registrado</dt><dd>{detalle.registro && formatearFecha(detalle.registro)}</dd></div></dl>}<Button variant="outline" onClick={() => setDetalle(undefined)}>Cerrar</Button></DialogContent></Dialog>
  </div>;
}
