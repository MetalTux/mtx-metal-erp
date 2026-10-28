import { tienePermiso } from "@/lib/seguridad/permisos";
import { exigirAcceso } from "@/lib/seguridad/acceso";
import Link from "next/link";
import { consultarGuiaDespacho, listarGuiasDespacho, prepararCorreccionGuia, prepararGuiaDespacho } from "@/lib/consultas/guias-despacho";
import { formatearCantidad } from "@/lib/formato";
import { SectionCard } from "@/components/section-card";
import { FormularioSalida } from "@/components/guia-despacho/formulario-salida";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { historialPdfGuia } from "@/lib/servicios/pdfs-guia";
import { ConsultaGuia } from "@/components/guia-despacho/consulta-guia";
import { FormularioCorreccion } from "@/components/guia-despacho/formulario-correccion";

const valor = (v: string | string[] | undefined) => typeof v === "string" ? v : "";
const fechaCalendario = (v: string) => v.split("-").reverse().join("-");
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sesion = await exigirAcceso("guias.leer");
  const operar = tienePermiso(sesion.roles,"guias.operar");

  const params = await searchParams;
  const listado = await listarGuiasDespacho(params);
  const otId = Number(valor(params.ot));
  let preparacion: Awaited<ReturnType<typeof prepararGuiaDespacho>> | null = null;
  let error: string | null = null;
  if (valor(params.ot)) {
    try { preparacion = await prepararGuiaDespacho(otId); }
    catch { error = "No se pudo preparar la OT indicada. Comprueba su número y actualiza la consulta."; }
  }
  const correccion = await prepararCorreccionGuia(Number(valor(params.corregir)));
  const detalle = await consultarGuiaDespacho(Number(valor(params.ver)));
  const pdfs = detalle && !detalle.legado ? await historialPdfGuia(detalle.id) : [];
  const contexto = new URLSearchParams();
  for (const [k,v] of Object.entries(params)) if (typeof v === "string" && !["ver","corregir"].includes(k)) contexto.set(k,v);
  const cerrarHref = `/trabajos/despachos${contexto.size ? `?${contexto}` : ""}`;
  const verGuia = (id: number) => { const q = new URLSearchParams(contexto); q.set("ver",String(id)); return `/trabajos/despachos?${q}`; };
  const enlace = (pagina: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && k !== "pagina") q.set(k, v);
    q.set("pagina", String(pagina));
    return `/trabajos/despachos?${q.toString()}`;
  };
  return <div className="min-w-0 space-y-6">
    <header><h1 className="text-3xl font-semibold tracking-tight">Guías de Despacho</h1><p className="mt-2 text-sm text-muted-foreground">Consulta de documentos y confirmación de salidas comerciales.</p></header>
    {valor(params.ver) && !detalle && <p role="alert" className="text-sm text-warning">No se encontró la guía solicitada. Actualiza la consulta o selecciona otro documento.</p>}
    {detalle && <ConsultaGuia key={detalle.id} guia={detalle} pdfs={pdfs} cerrarHref={cerrarHref} />}
    {listado.avisoLegado && <p role="status" className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">Hay {listado.legadas} guías heredadas sin conciliación. Se muestran por separado y no cuentan como entregas confirmadas.</p>}
    <SectionCard titulo="Documentos" contentClassName="space-y-4">
      {listado.filtros.ot && <p className="text-sm">Guías de la OT #{listado.filtros.ot}. <Link href="/trabajos/despachos" className="text-info-foreground underline">Ver todas</Link></p>}
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {listado.filtros.ot && <input type="hidden" name="ot" value={listado.filtros.ot} />}
        <label className="text-sm">Buscar folio, cliente u OT<input name="q" defaultValue={listado.filtros.q} maxLength={150} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3" /></label>
        <label className="text-sm">Estado<select name="estado" defaultValue={listado.filtros.estado} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3">
          <option value="TODOS">Guías nuevas</option><option value="CONFIRMADA">Confirmadas</option><option value="CORREGIDA">Con corrección</option><option value="CORRECCION">Correcciones</option><option value="LEGADO">Legado no conciliado</option>
        </select></label>
        <label className="text-sm">Desde<input type="date" name="desde" defaultValue={listado.filtros.desde} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3" /></label>
        <label className="text-sm">Hasta<input type="date" name="hasta" defaultValue={listado.filtros.hasta} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3" /></label>
        <label className="text-sm">Ordenar por<select name="orden" defaultValue={listado.filtros.orden} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3"><option value="fecha">Fecha</option><option value="folio">Folio</option><option value="cliente">Cliente</option><option value="ot">OT</option></select></label>
        <label className="text-sm">Sentido<select name="sentido" defaultValue={listado.filtros.sentido} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3"><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label>
        <div className="flex items-end"><button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">Filtrar</button></div>
      </form>
      <div className="overflow-x-auto"><Table aria-label="Guías de Despacho"><TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>OT</TableHead><TableHead>Partidas</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader><TableBody>
        {listado.filas.map(g => <TableRow key={g.id}><TableCell className="font-mono"><Link data-guia-id={g.id} aria-label={`Ver guía ${g.folio ?? `legada ${g.id}`}`} href={verGuia(g.id)} className="text-info-foreground underline-offset-4 hover:underline">{g.folio ?? `Legado #${g.id}`}</Link></TableCell><TableCell>{g.fecha ? fechaCalendario(g.fecha) : "Sin fecha"}</TableCell><TableCell>{g.cliente ?? "—"}</TableCell><TableCell>{g.workOrderFolio ?? `#${g.workOrderId}`}</TableCell><TableCell className="tabular-nums">{g.partidas}</TableCell><TableCell>{g.estado === "LEGADO_NO_CONCILIADO" ? "Legado no conciliado" : g.estado === "CORREGIDA" ? "Con corrección" : g.estado === "CORRECCION" ? "Corrección" : "Confirmada"}</TableCell><TableCell>{operar && ["CONFIRMADA", "CORREGIDA"].includes(g.estado) && <Link href={`/trabajos/despachos?corregir=${g.id}`} className="text-info-foreground underline-offset-4 hover:underline">Corregir</Link>}</TableCell></TableRow>)}
        {!listado.filas.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay guías para estos filtros.</TableCell></TableRow>}
      </TableBody></Table></div>
      <div className="flex items-center justify-between text-sm"><span className="tabular-nums">{listado.total} documentos · Página {listado.filtros.pagina} de {listado.paginas}</span><nav aria-label="Páginas de guías" className="flex gap-3">{listado.filtros.pagina > 1 && <Link href={enlace(listado.filtros.pagina - 1)} className="text-info-foreground underline-offset-4 hover:underline">Anterior</Link>}{listado.filtros.pagina < listado.paginas && <Link href={enlace(listado.filtros.pagina + 1)} className="text-info-foreground underline-offset-4 hover:underline">Siguiente</Link>}</nav></div>
    </SectionCard>
    {operar && valor(params.corregir) && <SectionCard titulo="Corregir guía de despacho">{correccion ? <FormularioCorreccion key={`${correccion.deliveryNoteId}/${correccion.version}`} preparacion={correccion} /> : <p role="alert" className="text-sm text-warning">La guía indicada no es una entrega corregible.</p>}</SectionCard>}
    <SectionCard titulo="Preparar entrega por OT" contentClassName="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-3"><label className="text-sm">Número interno de OT<input name="ot" type="number" min="1" step="1" defaultValue={valor(params.ot)} className="mt-1 h-9 w-40 rounded-md border border-input bg-background px-3" /></label><button type="submit" className="h-9 rounded-md border border-input px-4 text-sm hover:bg-accent">Consultar</button></form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {preparacion && <div className="space-y-3 text-sm"><p><strong>{preparacion.workOrderFolio ?? `OT #${preparacion.workOrderId}`}</strong> · {preparacion.salesOrderFolio ?? "Sin OCC documentada"} · {preparacion.cliente ?? "Sin cliente"}</p>
        <p className={preparacion.elegible ? "text-success" : "text-warning"}>{preparacion.elegible ? "Hay partidas potencialmente entregables." : "Esta OT no cumple todas las condiciones de emisión."}</p>
        {preparacion.motivos.map(m => <p key={m} className="text-warning">{m}</p>)}
        <div className="overflow-x-auto"><Table aria-label="Preparación de entrega"><TableHeader><TableRow><TableHead>Partida</TableHead><TableHead>Contratado</TableHead><TableHead>Ejecutado</TableHead><TableHead>Entregado</TableHead><TableHead>Pendiente</TableHead><TableHead>Máximo orientativo</TableHead><TableHead>Bodegas y reservas</TableHead></TableRow></TableHeader><TableBody>{preparacion.partidas.map(l => <TableRow key={l.id}><TableCell className="max-w-64 whitespace-normal">{l.descripcion}<p className="text-xs text-muted-foreground">{l.modo}</p>{l.motivos.map(m => <p key={m} className="text-xs text-warning">{m}</p>)}</TableCell>{[l.contratado,l.ejecutadoNeto,l.entregadoNeto,l.pendiente,l.maximoPrevisualizable].map((n,i) => <TableCell key={i} className="tabular-nums">{formatearCantidad(n)} {l.unidad}</TableCell>)}<TableCell className="min-w-56">{l.bodegas.length ? l.bodegas.map(b => <p key={b.warehouseId}>{b.bodega}: reserva propia {formatearCantidad(b.reservadoPropio)}, libre {formatearCantidad(b.libre)}, utilizable {formatearCantidad(b.utilizable)}{!b.compatible ? " · incompatible" : ""}{!b.kardexConciliado ? " · saldo/Kardex desalineados" : ""}</p>) : "No aplica o no hay reserva"}</TableCell></TableRow>)}</TableBody></Table></div>
        <p className="text-xs text-muted-foreground">{preparacion.aviso}</p>
        {operar && <FormularioSalida key={`${preparacion.workOrderId}/${preparacion.workOrderVersion}`} preparacion={preparacion} />}
      </div>}
    </SectionCard>
  </div>;
}
