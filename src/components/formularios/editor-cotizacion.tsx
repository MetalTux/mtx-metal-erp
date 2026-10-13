"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { crearVistaImagen, moverImagenSeleccionada } from "./imagen-cotizacion-redimensionable";
import { prepararPegadoCotizacion } from "./pegado-cotizacion";
import { subirImagen } from "@/app/(app)/ventas/cotizaciones/actions";
import { Button } from "@/components/ui/button";
import { BotonConAyuda } from "./boton-con-ayuda";
import { validarTextoCotizacion, CLAVE_IMAGEN_COTIZACION, URL_IMAGEN_COTIZACION, type NodoCotizacion } from "@/lib/validaciones/texto-cotizacion";
const ImagenDocumento = Image.extend({
  addKeyboardShortcuts() { return {
    "Alt-ArrowUp": () => moverImagenSeleccionada(this.editor.view, -1),
    "Alt-ArrowDown": () => moverImagenSeleccionada(this.editor.view, 1),
  }; },
  // Durante el montaje, editor.view aún no está asignada. ProseMirror entrega
  // la vista real al constructor del nodo; usarla también para imágenes iniciales.
  addNodeView() { return ({ node, view, getPos }) => crearVistaImagen(node, view, getPos); },
  // Ancho porcentual y disposición explícita; conserva compatibilidad con imágenes antiguas.
  addAttributes() { return {
    src: { default: null }, alt: { default: null }, title: { default: null },
    width: { default: null, parseHTML: el => { const v = el.getAttribute("data-width"); return v ? Number(v) : null; }, renderHTML: a => a.width ? { "data-width": a.width, style: `width:${a.width}%` } : {} },
    placement: { default: "bloque", parseHTML: el => el.getAttribute("data-placement") ?? "bloque", renderHTML: a => ({ "data-placement": a.placement }) },
  }; },
  parseHTML() { return [{ tag: "img[src]", getAttrs: element => { const src = element.getAttribute("src") ?? ""; return src.startsWith(URL_IMAGEN_COTIZACION) && CLAVE_IMAGEN_COTIZACION.test(src.slice(URL_IMAGEN_COTIZACION.length)) ? null : false; } }]; },
});
const fondoCelda = { default: null, parseHTML: (el: HTMLElement) => el.style.backgroundColor || null, renderHTML: (a: Record<string, unknown>) => a.backgroundColor ? { style: `background-color:${a.backgroundColor}` } : {} };
const Celda = TableCell.extend({ addAttributes() { return { ...this.parent?.(), backgroundColor: fondoCelda }; } });
const Cabecera = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), backgroundColor: fondoCelda }; } });
const extensiones = [StarterKit.configure({ code: false, codeBlock: false, link: false, heading: { levels: [1, 2, 3, 4, 5, 6] } }), TextStyleKit, TextAlign.configure({ types: ["heading", "paragraph"] }), Table.configure({ resizable: false }), TableRow, Celda, Cabecera, ImagenDocumento.configure({ allowBase64: false })];

/** Editor reutilizable: JSON validado, formato accesible y subida local reemplazable. */
export function EditorCotizacion({ valor, onChange, draftKey, disabled, soloLectura, onBloqueo, onValidez, permitirSubida = true, etiqueta = "Detalle técnico de la cotización" }: {
  valor: NodoCotizacion; onChange: (v: NodoCotizacion) => void; draftKey: string;
  disabled?: boolean; soloLectura?: boolean; onBloqueo: (v: boolean) => void; onValidez: (v: boolean) => void;
  permitirSubida?: boolean; etiqueta?: string;
}) {
  const archivo = useRef<HTMLInputElement>(null), ultimo = useRef<{ archivo: File; clave: string } | null>(null), invalido = useRef(false);
  const [subiendo, setSubiendo] = useState(false), [error, setError] = useState<string>(), [reintento, setReintento] = useState(false);
  const editor = useEditor({ extensions: extensiones, content: valor, immediatelyRender: false, shouldRerenderOnTransaction: false,
    editable: !soloLectura && !disabled,
    editorProps: { transformPastedHTML: prepararPegadoCotizacion, attributes: { role: "textbox", "aria-label": etiqueta, "aria-multiline": "true", class: "min-h-40 p-3 outline-none detalle-cotizacion" } },
    onUpdate: ({ editor }) => { try { onChange(validarTextoCotizacion(editor.getJSON())); invalido.current = false; setError(undefined); onValidez(true); } catch (e) { invalido.current = true; onValidez(false); setError(e instanceof Error ? e.message : "Formato inválido."); } },
  });
  const estado = useEditorState({ editor, selector: ({ editor }) => ({ bold: editor?.isActive("bold"), italic: editor?.isActive("italic"), underline: editor?.isActive("underline"), strike: editor?.isActive("strike"), bulletList: editor?.isActive("bulletList"), orderedList: editor?.isActive("orderedList"), blockquote: editor?.isActive("blockquote"), image: editor?.isActive("image"), imageAttrs: editor?.getAttributes("image"), fontSize: editor?.getAttributes("textStyle").fontSize ?? "", fontFamily: editor?.getAttributes("textStyle").fontFamily ?? "", table: editor?.isActive("table") }) });
  // Bloquear controles no cambia el documento. Emitir onUpdate aquí borraba
  // la vista previa/errores y desmarcaba la revisión del alcance al consultar.
  useEffect(() => { editor?.setEditable(!soloLectura && !disabled && !subiendo, false); }, [editor, soloLectura, disabled, subiendo]);
  async function subir() {
    if (!ultimo.current || !editor || subiendo || disabled || soloLectura) return;
    let imagenes = 0; editor.state.doc.descendants(n => { if (n.type.name === "image") imagenes++; });
    if (imagenes >= 10) { setError("El detalle admite hasta diez imágenes; quita una antes de agregar otra."); setReintento(false); return; }
    setSubiendo(true); onBloqueo(true); setError(undefined);
    try {
      const form = new FormData(); form.set("archivo", ultimo.current.archivo); form.set("draftKey", draftKey); form.set("uploadKey", ultimo.current.clave);
      const r = await subirImagen(form);
      if (!r.ok) { setError(r.mensaje); setReintento(true); return; }
      editor.chain().focus().setImage({ src: r.src, alt: ultimo.current.archivo.name.slice(0, 300) }).run();
      ultimo.current = null; setReintento(false);
    } catch { setError("No se pudo confirmar la subida. Reintenta para comprobarla sin duplicar el archivo."); setReintento(true); }
    finally { setSubiendo(false); onBloqueo(false); }
  }
  const bloqueado = disabled || soloLectura || subiendo || !editor;
  function moverImagen(direccion: -1 | 1) {
    if (editor && !bloqueado) { moverImagenSeleccionada(editor.view, direccion); editor.commands.focus(); }
  }
  const boton = (nombre: string, accion: () => void, activo = false) => <BotonConAyuda key={nombre} type="button" ayuda={nombre} aria-label={nombre} aria-pressed={activo} variant={activo ? "secondary" : "ghost"} size="sm" disabled={bloqueado} onMouseDown={e => e.preventDefault()} onClick={accion}>{nombre}</BotonConAyuda>;
  return <div className="min-w-0 rounded-md border border-input">
    {!soloLectura && <div className="flex flex-wrap gap-1 border-b border-border p-2" role="toolbar" aria-label="Formato del detalle técnico">
      {boton("Negrita", () => editor?.chain().focus().toggleBold().run(), estado?.bold)}
      {boton("Cursiva", () => editor?.chain().focus().toggleItalic().run(), estado?.italic)}
      {boton("Subrayado", () => editor?.chain().focus().toggleUnderline().run(), estado?.underline)}
      {boton("Tachado", () => editor?.chain().focus().toggleStrike().run(), estado?.strike)}
      <select aria-label="Fuente del texto" disabled={bloqueado} value={estado?.fontFamily ?? ""} className="h-8 max-w-full rounded-md border border-input bg-card px-2" onChange={e => { if (e.target.value) editor?.chain().focus().setFontFamily(e.target.value).run(); else editor?.chain().focus().unsetFontFamily().run(); }}><option value="">Fuente original / predeterminada</option>{estado?.fontFamily && !["Arial", "Calibri", "Times New Roman", "Verdana", "Georgia", "Courier New"].includes(estado.fontFamily) && <option value={estado.fontFamily}>{estado.fontFamily} (copiada)</option>}{["Arial", "Calibri", "Times New Roman", "Verdana", "Georgia", "Courier New"].map(f => <option key={f} value={f}>{f}</option>)}</select>
      <select aria-label="Tamaño del texto" disabled={bloqueado} value={estado?.fontSize ?? ""} className="h-8 rounded-md border border-input bg-card px-2" onChange={e => { if (e.target.value) editor?.chain().focus().setFontSize(e.target.value).run(); else editor?.chain().focus().unsetFontSize().run(); }}><option value="">Tamaño original</option>{estado?.fontSize && ![10, 12, 14, 16, 18, 24, 32, 48].some(n => `${n}px` === estado.fontSize) && <option value={estado.fontSize}>{estado.fontSize} (copiado)</option>}{[10, 12, 14, 16, 18, 24, 32, 48].map(n => <option key={n} value={`${n}px`}>{n} px</option>)}</select>
      <label className="flex items-center gap-1 text-xs">Color<input aria-label="Color del texto" type="color" className="h-8 w-8" disabled={bloqueado} defaultValue="#000000" onChange={e => editor?.chain().focus().setColor(e.target.value).run()} /></label>
      {([['Izquierda', 'left'], ['Centro', 'center'], ['Derecha', 'right'], ['Justificar', 'justify']] as const).map(([n, v]) => boton(`Alinear texto: ${n}`, () => editor?.chain().focus().setTextAlign(v).run()))}
      {boton("Limpiar formato", () => editor?.chain().focus().unsetAllMarks().clearNodes().run())}
      {[1, 2, 3].map(n => boton(`Título ${n}`, () => editor?.chain().focus().toggleHeading({ level: n as 1 | 2 | 3 }).run()))}
      {boton("Lista", () => editor?.chain().focus().toggleBulletList().run(), estado?.bulletList)}
      {boton("Lista numerada", () => editor?.chain().focus().toggleOrderedList().run(), estado?.orderedList)}
      {boton("Cita", () => editor?.chain().focus().toggleBlockquote().run(), estado?.blockquote)}
      {boton("Separador", () => editor?.chain().focus().setHorizontalRule().run())}
      {boton("Insertar tabla", () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      {estado?.table && <>{boton("Agregar fila", () => editor?.chain().focus().addRowAfter().run())}{boton("Agregar columna", () => editor?.chain().focus().addColumnAfter().run())}{boton("Eliminar fila", () => editor?.chain().focus().deleteRow().run())}{boton("Eliminar columna", () => editor?.chain().focus().deleteColumn().run())}{boton("Eliminar tabla", () => editor?.chain().focus().deleteTable().run())}</>}
      {estado?.image && <div className="flex w-full flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2" aria-label="Disposición de imagen seleccionada"><span className="text-xs">Imagen seleccionada: arrastra la imagen para moverla, o usa Alt + ↑/↓. Las esquinas cambian su tamaño.</span><select aria-label="Posición de imagen" disabled={bloqueado} value={estado.imageAttrs?.placement ?? "bloque"} className="h-8 max-w-full rounded-md border border-input bg-card px-2" onChange={e => editor?.chain().focus().updateAttributes("image", { placement: e.target.value }).run()}><option value="bloque">En bloque</option><option value="izquierda">Izquierda, texto al lado</option><option value="derecha">Derecha, texto al lado</option><option value="centro">Centrada, texto debajo</option></select><label className="flex items-center gap-1 text-xs">Ancho<select aria-label="Ancho de imagen" disabled={bloqueado} value={estado.imageAttrs?.width ?? ""} className="h-8 rounded-md border border-input bg-card px-2" onChange={e => editor?.chain().focus().updateAttributes("image", { width: e.target.value ? Number(e.target.value) : null }).run()}><option value="">Original</option>{estado.imageAttrs?.width && ![25, 33, 50, 66, 75, 100].includes(estado.imageAttrs.width) && <option value={estado.imageAttrs.width}>{estado.imageAttrs.width}%</option>}{[25, 33, 50, 66, 75, 100].map(n => <option key={n} value={n}>{n}%</option>)}</select></label>{boton("Mover imagen antes", () => moverImagen(-1))}{boton("Mover imagen después", () => moverImagen(1))}</div>}
      {boton("Deshacer", () => editor?.chain().focus().undo().run())}
      {boton("Rehacer", () => editor?.chain().focus().redo().run())}
      {permitirSubida && <><Button type="button" variant="ghost" size="sm" disabled={bloqueado} onClick={() => archivo.current?.click()}>{subiendo ? "Subiendo imagen…" : "Agregar imagen"}</Button>
      <input ref={archivo} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Archivo de imagen del detalle técnico" disabled={bloqueado} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { ultimo.current = { archivo: f, clave: crypto.randomUUID() }; void subir(); } }} /></>}
    </div>}
    <EditorContent editor={editor} className="min-w-0 break-words [overflow-wrap:anywhere] [&_.tiptap_p]:my-2 [&_.tiptap_h1]:my-3 [&_.tiptap_h1]:text-xl [&_.tiptap_h1]:font-bold [&_.tiptap_h2]:my-3 [&_.tiptap_h2]:text-lg [&_.tiptap_h2]:font-bold [&_.tiptap_h3]:my-2 [&_.tiptap_h3]:font-bold [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:pl-3 [&_.tiptap_img]:h-auto [&_.tiptap_img]:max-w-full [&_.tiptap_hr]:my-4" />
    {error && <div className="p-3"><p role="alert" className="text-sm text-destructive">{error}</p>{reintento && <Button type="button" variant="outline" disabled={bloqueado} onClick={() => void subir()}>Reintentar subida</Button>}</div>}
    {!soloLectura && <p className="border-t border-border p-3 text-xs text-muted-foreground">{permitirSubida ? "Detalle general opcional. Hasta diez imágenes PNG, JPG o WebP de 2 MB. Se conservan las imágenes históricas; editar este borrador no cambia el stock." : "Revisa el alcance contratado. Puedes conservar las imágenes de la oferta; sus archivos originales permanecen archivados."}</p>}
  </div>;
}
