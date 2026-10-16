"use client";
import { formatearCantidad } from "@/lib/formato";

import { useRef, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import type { MaterialReceta } from "@/lib/tipos/producto";
import { productoSchema } from "@/lib/validaciones/producto";
import { SelectorBuscable } from "@/components/formularios/selector-buscable";
import { AyudaCampo } from "@/components/formularios/ayuda-campo";
import { BotonConAyuda } from "@/components/formularios/boton-con-ayuda";
import { ConfirmarDescarte } from "@/components/alertas/confirmar-descarte";
import { Aviso } from "@/components/alertas/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type LineaRecetaProducto = {
  uid: string;
  rawMaterialId: number;
  unitMeasureId: number;
  quantity: string;
};
type EditorReceta = { modo: "agregar" | "editar" | "ver"; linea: LineaRecetaProducto };

/** El detalle es un borrador local: sólo Guardar producto escribe la receta en PostgreSQL. */
function DetalleMaterial({ editor, materiales, onAplicar, onCerrar, onCambio }: {
  editor: EditorReceta;
  materiales: MaterialReceta[];
  onAplicar: (linea: LineaRecetaProducto) => void;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const consulta = editor.modo === "ver";
  const [materialId, setMaterialId] = useState(editor.linea.rawMaterialId);
  const [cantidad, setCantidad] = useState(editor.linea.quantity);
  const [error, setError] = useState<string>();
  const material = materiales.find(m => m.id === materialId);

  return <form className="min-w-0 space-y-4" noValidate onSubmit={event => {
    // Los eventos de un portal React también llegan al formulario del producto.
    // Evitar que Enter en este diálogo guarde accidentalmente el producto completo.
    event.preventDefault();
    event.stopPropagation();
    if (consulta) return;
    if (!material) { setError("Selecciona una materia prima."); return; }
    const validacion = productoSchema.shape.recipes.element.safeParse({
      rawMaterialId: material.id, unitMeasureId: material.unitMeasureId, quantity: cantidad,
    });
    if (!validacion.success) { setError(validacion.error.issues[0].message); return; }
    onAplicar({ uid: editor.linea.uid, ...validacion.data });
  }}>
    {error && <Aviso titulo={error} />}
    <div className="space-y-2">
      <Label htmlFor="receta-detalle-material">Materia prima{!consulta && " *"}</Label>
      {consulta
        ? <Input id="receta-detalle-material" readOnly value={material ? `${material.code} — ${material.name}` : "Material no disponible"} />
        : <SelectorBuscable id="receta-detalle-material" opciones={materiales.map(m => ({ valor: String(m.id), etiqueta: `${m.code} — ${m.name} (${m.abbreviation})` }))} valor={String(materialId)} onChange={valor => { setMaterialId(Number(valor)); setError(undefined); onCambio(); }} nombre="materia prima" placeholder="Selecciona material…" />}
    </div>
    <div className="space-y-2">
      <Label htmlFor="receta-detalle-cantidad">Cantidad por unidad de producto{!consulta && " *"}</Label>
      <AyudaCampo nombre="Cantidad de materia prima" texto="Cantidad positiva en la unidad de esta materia prima, con hasta tres decimales. Corresponde al material necesario para una unidad del producto terminado, sin consumo de stock al guardar." />
      <Input id="receta-detalle-cantidad" inputMode="decimal" autoComplete="off" value={consulta ? formatearCantidad(cantidad) : cantidad} readOnly={consulta} onChange={event => { setCantidad(event.target.value); setError(undefined); onCambio(); }} />
      <p className="text-sm text-muted-foreground">Unidad: {material ? `${material.unitName} (${material.abbreviation})` : "Selecciona una materia prima"}</p>
    </div>
    <p className="text-xs text-muted-foreground">El detalle se incorpora al formulario. Para registrarlo en el sistema debes guardar el producto.</p>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCerrar}>{consulta ? "Cerrar" : "Cancelar"}</Button>
      {!consulta && <Button type="submit">{editor.modo === "agregar" ? "Agregar al detalle" : "Aplicar cambios"}</Button>}
    </DialogFooter>
  </form>;
}

export function RecetaProducto({ lineas, materiales, unidadProducto, consulta, pendiente, onChange, onQuitar, onBloqueo }: {
  lineas: LineaRecetaProducto[];
  materiales: MaterialReceta[];
  unidadProducto: string;
  consulta: boolean;
  pendiente: boolean;
  onChange: (lineas: LineaRecetaProducto[]) => void;
  onQuitar: (uid: string) => void;
  onBloqueo: (bloqueado: boolean) => void;
}) {
  const [editor, setEditor] = useState<EditorReceta>();
  const [descarte, setDescarte] = useState(false);
  const modificado = useRef(false);
  const retorno = useRef<HTMLElement | null>(null);
  const agregar = useRef<HTMLButtonElement>(null);
  const detalle = useRef<HTMLDivElement>(null);

  function abrir(modo: EditorReceta["modo"], linea?: LineaRecetaProducto) {
    retorno.current = document.activeElement as HTMLElement;
    modificado.current = false;
    onBloqueo(true);
    setEditor({ modo, linea: linea ?? { uid: crypto.randomUUID(), rawMaterialId: 0, unitMeasureId: 0, quantity: "" } });
  }
  function terminar() { setEditor(undefined); onBloqueo(false); }
  function cerrar() {
    if (pendiente || descarte) return;
    if (modificado.current && editor?.modo !== "ver") setDescarte(true);
    else terminar();
  }

  // No ofrecer materiales ya usados en otra fila; la validación completa del producto
  // conserva además la protección contra duplicados en el servidor.
  const disponibles = materiales.filter(m => !lineas.some(l => l.uid !== editor?.linea.uid && l.rawMaterialId === m.id));

  return <>
    <fieldset disabled={pendiente} className="min-w-0 space-y-3">
      <legend className="mb-2 font-medium">Receta por una unidad de producto</legend>
      <p className="text-xs text-muted-foreground">Material necesario para 1 {unidadProducto} de producto. Guardar no descuenta stock. Sin receta puedes cotizar; será necesaria para la futura fabricación.</p>
      <div className="min-w-0 rounded-md border">
        <Table aria-label="Materias primas de la receta">
          <TableHeader className="bg-card-header">
            <TableRow><TableHead>Materia prima</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Unidad</TableHead><TableHead>Acciones</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {lineas.map(linea => {
              const material = materiales.find(m => m.id === linea.rawMaterialId);
              const nombre = material?.name ?? "Material no disponible";
              return <TableRow key={linea.uid}>
                <TableCell className="min-w-40 whitespace-normal"><p className="font-medium">{nombre}</p><p className="break-all font-mono text-xs text-muted-foreground">{material?.code}</p></TableCell>
                <TableCell className="text-right tabular-nums">{formatearCantidad(linea.quantity)}</TableCell>
                <TableCell>{material?.abbreviation ?? "—"}</TableCell>
                <TableCell><div className="flex gap-1">
                  <BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Ver material ${nombre}`} ayuda="Consulta la cantidad y unidad de esta materia prima." disabled={pendiente} onClick={() => abrir("ver", linea)}><Eye /><span className="sr-only sm:not-sr-only">Ver</span></BotonConAyuda>
                  {!consulta && <>
                    <BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Editar material ${nombre}`} ayuda="Edita esta fila sin salir del producto." disabled={pendiente} onClick={() => abrir("editar", linea)}><Pencil /><span className="sr-only sm:not-sr-only">Editar</span></BotonConAyuda>
                    <BotonConAyuda type="button" variant="ghost" size="sm" aria-label={`Quitar material ${nombre}`} ayuda="Quita esta materia prima del borrador con confirmación." disabled={pendiente} onClick={() => onQuitar(linea.uid)}><Trash2 /><span className="sr-only sm:not-sr-only">Quitar</span></BotonConAyuda>
                  </>}
                </div></TableCell>
              </TableRow>;
            })}
            {!lineas.length && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sin receta configurada.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {!consulta && <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{lineas.length} de 100 materias primas</p>
        <Button ref={agregar} type="button" variant="outline" disabled={pendiente || lineas.length >= 100 || disponibles.length === 0} onClick={() => abrir("agregar")}><Plus />Agregar materia prima</Button>
        {disponibles.length === 0 && <p className="w-full text-xs text-muted-foreground">No hay más materias primas disponibles para agregar.</p>}
      </div>}
    </fieldset>
    <Dialog open={Boolean(editor)} onOpenChange={abierto => { if (!abierto) cerrar(); }}>
      <DialogContent ref={detalle} className="max-h-[85dvh] overflow-y-auto sm:max-w-lg" showCloseButton={!pendiente} onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (pendiente || descarte) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); (retorno.current?.isConnected ? retorno.current : agregar.current)?.focus(); }}>
        <DialogHeader><DialogTitle>{editor?.modo === "agregar" ? "Agregar materia prima" : editor?.modo === "editar" ? "Editar materia prima" : "Ver materia prima"}</DialogTitle><DialogDescription>Detalle de la receta para una unidad de producto terminado.</DialogDescription></DialogHeader>
        {editor && <DetalleMaterial key={`${editor.modo}-${editor.linea.uid}`} editor={editor} materiales={disponibles} onCerrar={cerrar} onCambio={() => { modificado.current = true; }} onAplicar={linea => {
          onChange(editor.modo === "agregar" ? [...lineas, linea] : lineas.map(l => l.uid === linea.uid ? linea : l));
          terminar();
        }} />}
      </DialogContent>
    </Dialog>
    <ConfirmarDescarte abierto={descarte} onAbiertoChange={setDescarte} onConfirmar={() => { setDescarte(false); terminar(); }} onDevolverFoco={() => { if (detalle.current?.isConnected) detalle.current.focus(); }} />
  </>;
}
