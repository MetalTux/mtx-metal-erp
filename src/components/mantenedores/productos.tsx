"use client";
import { formatearCantidad } from "@/lib/formato";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, RefreshCw, Trash2, Star } from "lucide-react";
import { obtenerProducto, guardarDatosProducto, eliminarDatosProducto } from "@/app/(app)/mantenedores/productos/actions";
import type { Producto, MaterialReceta, ResultadoProducto } from "@/lib/tipos/producto";
import type { UnidadMaterial } from "@/lib/tipos/material";
import { productoSchema, type DatosProducto } from "@/lib/validaciones/producto";
import { DataTable, type ColumnaDatos } from "@/components/data-table/data-table";
import { RecetaProducto } from "@/components/mantenedores/receta-producto";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { ConfirmarEliminacion } from "@/components/alertas/confirmar-eliminacion";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { ConfirmarAccion } from "@/components/alertas/confirmar-accion";
import { Aviso } from "@/components/alertas/aviso";
import { notificar } from "@/components/alertas/notificaciones";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
type Editor = { modo: "crear" | "ver" | "editar"; producto?: Producto };
type Foto = { uid: string; id?: number; file?: File; url: string };
function Imagen({ url, alt }: { url: string; alt: string }) {
  const [fallo, setFallo] = useState(false);
  return fallo ? <p className="p-4 text-sm text-muted-foreground">Imagen no disponible</p> : <Image src={url} alt={alt} width={240} height={160} unoptimized onError={() => setFallo(true)} className="h-36 w-full rounded-md bg-white object-contain" />;
}
function FormularioProducto({ editor, unidades, materiales, pendiente, onCerrar, onGuardar, onCambio, onBloqueo }: { editor: Editor; unidades: UnidadMaterial[]; materiales: MaterialReceta[]; pendiente: boolean; onCerrar: () => void; onGuardar: (f: FormData) => Promise<ResultadoProducto>; onCambio: () => void; onBloqueo: (v: boolean) => void }) {
  const p = editor.producto, consulta = editor.modo === "ver", bloqueada = Boolean(p && (p.recipes.length || p.cotizaciones || p.inventario));
  const [nombre, setNombre] = useState(p?.name ?? ""), [descripcion, setDescripcion] = useState(p?.description ?? ""), [precio, setPrecio] = useState(p?.suggestedPrice ?? "");
  const [unidad, setUnidad] = useState(p?.unitMeasureId ?? unidades.find(u => u.name.trim().toLowerCase() === "unidades")?.id ?? 0);
  const [recetas, setRecetas] = useState(() => (p?.recipes ?? []).map(r => ({ uid: crypto.randomUUID(), rawMaterialId: r.rawMaterialId, unitMeasureId: r.unitMeasureId, quantity: r.quantity })));
  const [fotos, setFotos] = useState<Foto[]>(() => (p?.images ?? []).map(i => ({ uid: `img-${i.id}`, id: i.id, url: i.url })));
  const [clave] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string>();
  const [retirar, setRetirar] = useState<{ tipo: "foto" | "receta"; uid: string }>();
  const urls = useRef<string[]>([]);
  const retornoRetiro = useRef<HTMLElement | null>(null);
  useEffect(() => { const creadas = urls.current; return () => creadas.forEach(url => URL.revokeObjectURL(url)); }, []);
  function quitar(tipo: "foto" | "receta", uid: string) { retornoRetiro.current = document.activeElement as HTMLElement; setRetirar({ tipo, uid }); onBloqueo(true); }
  function seleccionar(files: FileList | null) {
    if (!files) return;
    const elegidas = [...files];
    if (fotos.length + elegidas.length > 10 || elegidas.some(f => !f.size || f.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(f.type))) { setError("Hasta diez imágenes PNG/JPG/WebP de 2 MB cada una, no vacías."); return; }
    const nuevas = elegidas.map(file => { const url = URL.createObjectURL(file); urls.current.push(url); return { uid: crypto.randomUUID(), file, url }; });
    setFotos(v => [...v, ...nuevas]); onCambio(); setError(undefined);
  }
  return <>
    <form className="min-w-0 space-y-5" noValidate aria-busy={pendiente} onSubmit={async e => {
      e.preventDefault(); if (consulta || pendiente || retirar) return;
      let fileIndex = 0;
      const datos: DatosProducto = { name: nombre, description: descripcion, suggestedPrice: precio, unitMeasureId: unidad, recipes: recetas.map(({ rawMaterialId, unitMeasureId, quantity }) => ({ rawMaterialId, unitMeasureId, quantity })), images: fotos.map(i => i.id ? { id: i.id } : { fileIndex: fileIndex++ }) };
      const validacion = productoSchema.safeParse(datos);
      if (!validacion.success) { setError(validacion.error.issues[0].message); return; }
      const form = new FormData(); form.set("datos", JSON.stringify(validacion.data)); form.set("clave", clave);
      if (p) form.set("referencia", JSON.stringify({ id: p.id, version: p.version }));
      for (const i of fotos) if (i.file) form.append("imagenes", i.file);
      setError(undefined); const resultado = await onGuardar(form); if (!resultado.ok) setError(resultado.mensaje);
    }}>
      {error && <Aviso titulo={error} />}
      <fieldset disabled={pendiente} className="min-w-0 space-y-4"><legend className="mb-2 font-medium">Producto</legend>
        <div className="space-y-2"><Label htmlFor="producto-code">Código automático</Label><AyudaCampo nombre="Código automático" texto="UUID único generado al crear el producto. No se modifica ni utiliza la numeración de cotizaciones." /><Input id="producto-code" readOnly value={p?.code ?? "Se genera al guardar"} className="font-mono text-xs" /></div>
        <div className="space-y-2"><Label htmlFor="producto-name">Nombre{!consulta && " *"}</Label><Input id="producto-name" value={nombre} onChange={e => { setNombre(e.target.value); onCambio(); }} readOnly={consulta} maxLength={150} autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="producto-unidad">Unidad de medida{!consulta && " *"}</Label><AyudaCampo nombre="Unidad de producto" texto="Se toma del mantenedor. Todas las cantidades del producto usan esta unidad. La receta indica el material necesario para una unidad; referencias existentes bloquean cambios de unidad." />{consulta || bloqueada ? <Input id="producto-unidad" readOnly value={`${p?.unidad.name} (${p?.unidad.abbreviation})`} /> : <SelectorBuscable id="producto-unidad" opciones={unidades.map(u => ({ valor: String(u.id), etiqueta: `${u.name} (${u.abbreviation})` }))} valor={String(unidad)} onChange={v => { setUnidad(Number(v)); onCambio(); }} nombre="unidad de producto" placeholder="Selecciona unidad…" disabled={pendiente} />}{bloqueada && <p className="text-xs text-muted-foreground">Unidad bloqueada por receta, cotizaciones o inventario.</p>}</div>
        <div className="space-y-2"><Label htmlFor="producto-price">Precio sugerido (opcional)</Label><AyudaCampo nombre="Precio sugerido" texto="Precio final de venta por unidad, con IVA incluido, en pesos enteros. Es independiente del costo de materiales. Dejarlo vacío significa sin precio sugerido; cero es válido." /><Input id="producto-price" value={consulta ? formatearCantidad(precio) : precio} onChange={e => { setPrecio(e.target.value); onCambio(); }} readOnly={consulta} inputMode="numeric" maxLength={12} autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="producto-description">Descripción (opcional)</Label><Textarea id="producto-description" value={descripcion} onChange={e => { setDescripcion(e.target.value); onCambio(); }} readOnly={consulta} maxLength={4000} rows={3} /></div>
      </fieldset>
      <fieldset disabled={pendiente} className="min-w-0 space-y-3"><legend className="mb-2 font-medium">Imágenes</legend>
        <p className="text-xs text-muted-foreground">Hasta diez imágenes, PNG/JPG/WebP de 2 MB cada una. La principal se muestra primero. Retirar una imagen del catálogo conserva el archivo histórico.</p>
        {!consulta && <div className="space-y-2"><Label htmlFor="producto-imagenes">Agregar imágenes</Label><Input id="producto-imagenes" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => { seleccionar(e.target.files); e.target.value = ""; }} /></div>}
        <div className="grid gap-3 sm:grid-cols-2">{fotos.map((foto, i) => <div className="space-y-2 rounded-md border p-2" key={foto.uid}><Imagen url={foto.url} alt={`Imagen ${i + 1} de ${nombre || "producto nuevo"}`} />{i === 0 && <p className="text-xs font-medium">Principal</p>}{!consulta && <div className="flex flex-wrap gap-1"><BotonConAyuda type="button" size="sm" variant="outline" ayuda="Muestra esta imagen primero en la galería." aria-pressed={i === 0} disabled={pendiente || i === 0} onClick={() => { setFotos(v => [foto, ...v.filter(f => f.uid !== foto.uid)]); onCambio(); }}><Star />Principal</BotonConAyuda><BotonConAyuda type="button" size="sm" variant="outline" ayuda="Retira la imagen del borrador. Se aplicará al guardar." onClick={() => quitar("foto", foto.uid)}><Trash2 />Retirar imagen {i + 1}</BotonConAyuda></div>}</div>)}</div>
        {!fotos.length && <p className="text-sm text-muted-foreground">Sin imágenes.</p>}
      </fieldset>
      <RecetaProducto lineas={recetas} materiales={materiales} unidadProducto={unidades.find(u => u.id === unidad)?.abbreviation ?? "unidad"} consulta={consulta} pendiente={pendiente} onChange={lineas => { setRecetas(lineas); onCambio(); }} onQuitar={uid => quitar("receta", uid)} onBloqueo={onBloqueo} />
      <DialogFooter><Button type="button" variant="outline" disabled={pendiente} onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>{!consulta && <Button type="submit" disabled={pendiente || !unidades.length}>{pendiente ? "Guardando…" : p ? "Guardar cambios" : "Crear producto"}</Button>}</DialogFooter>
    </form>
    <ConfirmarAccion abierto={Boolean(retirar)} onAbiertoChange={v => { if (!v) setRetirar(undefined); onBloqueo(v); }} titulo={retirar?.tipo === "foto" ? "Retirar imagen" : "Quitar material de receta"} descripcion="Este cambio afecta sólo al borrador hasta guardar el producto. Puedes cancelar para conservar los datos guardados." accion="Quitar del borrador" pendiente={pendiente} onDevolverFoco={() => retornoRetiro.current?.isConnected && retornoRetiro.current.focus()} onConfirmar={() => { if (retirar?.tipo === "foto") setFotos(v => v.filter(i => i.uid !== retirar.uid)); else setRecetas(v => v.filter(r => r.uid !== retirar?.uid)); setRetirar(undefined); onBloqueo(false); onCambio(); }} />
  </>;
}
export function Productos({ productos, materiales, unidades }: { productos: Producto[]; materiales: MaterialReceta[]; unidades: UnidadMaterial[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor>(), [eliminar, setEliminar] = useState<Producto>();
  const [pendiente, setPendiente] = useState(false), [descarte, setDescarte] = useState(false), [errorEliminar, setErrorEliminar] = useState<string>();
  const modificado = useRef(false), bloqueado = useRef(false), retorno = useRef<HTMLElement | null>(null), crear = useRef<HTMLButtonElement>(null);
  function recordar() { retorno.current = document.activeElement as HTMLElement; }
  function restaurar() { (retorno.current?.isConnected ? retorno.current : crear.current)?.focus(); }
  function cerrar() { if (pendiente || bloqueado.current) return; if (modificado.current && editor?.modo !== "ver") setDescarte(true); else setEditor(undefined); }
  async function abrir(modo: "ver" | "editar", id: number) {
    recordar(); setPendiente(true);
    try { const r = await obtenerProducto(id); if (r.ok && r.producto) { modificado.current = false; setEditor({ modo, producto: r.producto }); } else { notificar.error(r.mensaje); router.refresh(); } }
    catch { notificar.error("No se pudo consultar el producto."); } finally { setPendiente(false); }
  }
  async function guardar(f: FormData): Promise<ResultadoProducto> {
    setPendiente(true); try { const r = await guardarDatosProducto(f); if (r.ok) { setEditor(undefined); notificar.exito(r.mensaje); router.refresh(); } return r; }
    catch { return { ok: false, mensaje: "No se pudo guardar. Revisa la conexión y reintenta con este mismo formulario." }; } finally { setPendiente(false); }
  }
  async function confirmarEliminar() {
    if (!eliminar || pendiente) return;
    setPendiente(true); setErrorEliminar(undefined);
    try { const r = await eliminarDatosProducto({ id: eliminar.id, version: eliminar.version }); if (r.ok) { setEliminar(undefined); notificar.exito(r.mensaje); router.refresh(); } else setErrorEliminar(r.mensaje); }
    catch { setErrorEliminar("No se pudo eliminar el producto."); } finally { setPendiente(false); }
  }
  const columnas: ColumnaDatos<Producto>[] = [
    { accessorKey: "code", header: "Código", cell: ({ row }) => <span className="block max-w-40 truncate font-mono text-xs" title={row.original.code}>{row.original.code}</span> },
    { accessorKey: "name", header: "Producto" }, { id: "unidad", header: "Unidad", accessorFn: p => p.unidad.name },
    { accessorKey: "suggestedPrice", header: "Precio sugerido", cell: ({ row }) => row.original.suggestedPrice === null ? "Sin definir" : `$ ${BigInt(row.original.suggestedPrice).toLocaleString("es-CL")}` },
    { id: "receta", header: "Receta", accessorFn: p => p.recipes.length ? `${p.recipes.length} materiales` : "Sin receta" },
    { id: "acciones", header: "Acciones", enableSorting: false, cell: ({ row }) => <div className="flex gap-1"><BotonConAyuda ayuda="Consulta el producto, imágenes y receta sin modificar datos." variant="ghost" size="sm" disabled={pendiente} aria-label={`Ver ${row.original.name}`} onClick={() => abrir("ver", row.original.id)}><Eye />Ver</BotonConAyuda><BotonConAyuda ayuda="Edita datos, imágenes y receta. Guardar no altera existencias." variant="ghost" size="sm" disabled={pendiente} aria-label={`Editar ${row.original.name}`} onClick={() => abrir("editar", row.original.id)}><Pencil />Editar</BotonConAyuda><BotonConAyuda ayuda="Retira el producto del catálogo si no tiene referencias comerciales ni inventario; conserva su código y archivos." variant="ghost" size="sm" disabled={pendiente} aria-label={`Eliminar ${row.original.name}`} onClick={() => { recordar(); setErrorEliminar(undefined); setEliminar(row.original); }}><Trash2 />Eliminar</BotonConAyuda></div> },
  ];
  return <>
    <PageHeader titulo="Productos" descripcion="Catálogo de productos terminados, imágenes y recetas por unidad." acciones={<><BotonConAyuda ayuda="Consulta los datos actuales." variant="outline" disabled={pendiente} onClick={() => router.refresh()}><RefreshCw />Actualizar</BotonConAyuda><BotonConAyuda ref={crear} ayuda="Registra un producto con código automático, sin crear stock." disabled={pendiente || !unidades.length} onClick={() => { recordar(); modificado.current = false; setEditor({ modo: "crear" }); }}><Plus />Crear producto</BotonConAyuda></>} />
    <SectionCard titulo="Catálogo" contentClassName="p-0"><DataTable datos={productos} columnas={columnas} textoBusqueda={p => `${p.code} ${p.name} ${p.description ?? ""} ${p.unidad.name}`} filtroPlaceholder="Buscar código, producto o unidad…" nombre="productos" vacio={<p>No hay productos registrados.</p>} /></SectionCard>
    <Dialog open={Boolean(editor)} onOpenChange={v => { if (!v) cerrar(); }}><DialogContent showCloseButton={!pendiente} className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (pendiente || bloqueado.current || descarte) e.preventDefault(); }} onCloseAutoFocus={e => { e.preventDefault(); restaurar(); }}><DialogHeader><DialogTitle>{editor?.modo === "crear" ? "Crear producto" : editor?.modo === "ver" ? "Ver producto" : "Editar producto"}</DialogTitle><DialogDescription>Gestiona datos, imágenes y receta sin salir del listado. Guardar no modifica stock.</DialogDescription></DialogHeader>{editor && <FormularioProducto key={`${editor.modo}-${editor.producto?.id}-${editor.producto?.version}`} editor={editor} unidades={unidades} materiales={materiales} pendiente={pendiente} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onBloqueo={v => { bloqueado.current = v; }} onGuardar={guardar} />}</DialogContent></Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); setEditor(undefined); }} />
    <ConfirmarEliminacion abierto={Boolean(eliminar)} onAbiertoChange={v => { if (!v) setEliminar(undefined); }} nombre={eliminar?.name ?? ""} pendiente={pendiente} error={errorEliminar} onConfirmar={confirmarEliminar} onRestaurarFoco={restaurar} />
  </>;
}
