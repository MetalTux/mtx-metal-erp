import { Fragment, type Node } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import type { EditorView, NodeView } from "@tiptap/pm/view";

/** Reordenar hermanos sin perder atributos ni el párrafo inicial obligatorio de una lista. */
export function moverImagenSeleccionada(view: EditorView, direccion: -1 | 1): boolean {
  if (!view.editable || !(view.state.selection instanceof NodeSelection) || view.state.selection.node.type.name !== "image") return false;
  const { $from } = view.state.selection, indice = $from.index(), nuevo = indice + direccion;
  const hijos: Node[] = []; $from.parent.forEach(n => hijos.push(n));
  if (nuevo < 0 || nuevo >= hijos.length || ($from.parent.type.name === "listItem" && nuevo === 0)) return true;
  [hijos[indice], hijos[nuevo]] = [hijos[nuevo], hijos[indice]];
  const contenido = Fragment.fromArray(hijos);
  if (!$from.parent.type.validContent(contenido)) return true;
  const inicio = $from.start(), tr = view.state.tr.replaceWith(inicio, inicio + $from.parent.content.size, contenido);
  const posicion = inicio + hijos.slice(0, nuevo).reduce((s, n) => s + n.nodeSize, 0);
  tr.setSelection(NodeSelection.create(tr.doc, posicion));
  view.dispatch(closeHistory(tr).scrollIntoView());
  return true;
}

/** Vista del editor: los tiradores nunca se serializan en el documento.
 * Conservamos sólo el ancho porcentual existente, sin altura ni píxeles fijos.
 */
export function crearVistaImagen(node: Node, view: EditorView, getPos: () => number | undefined): NodeView {
  const documento = view.dom.ownerDocument;
  const dom = documento.createElement("span"), imagen = documento.createElement("img");
  dom.className = "imagen-cotizacion";
  dom.contentEditable = "false";
  // ProseMirror reconoce el nodo arrastrable y serializa sus atributos;
  // el navegador debe poder iniciar el gesto sobre la imagen visible.
  dom.append(imagen);
  let actual = node, seleccionado = false;
  let arrastre: { id: number; x: number; y: number; ancho: number; proporcion: number; disponible: number; porcentaje: number; boton: HTMLButtonElement } | undefined;
  const botones: HTMLButtonElement[] = [];
  dom.addEventListener("dragstart", evento => {
    if (!view.editable || arrastre) { evento.preventDefault(); return; }
    // Separar el traslado de escrituras anteriores para que Deshacer revierta
    // sólo ese gesto. ProseMirror continúa procesando el arrastre nativo.
    view.dispatch(closeHistory(view.state.tr));
  });

  // Ancho útil del contenedor inmediato (también dentro de listas o tablas).
  function anchoDisponible() {
    const padre = dom.parentElement;
    if (!padre) return 0;
    const estilo = getComputedStyle(padre);
    return padre.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  }
  function pintar() {
    dom.draggable = view.editable;
    imagen.draggable = view.editable;
    // Seleccionar/mover no debe volver a cargar la misma imagen.
    if (imagen.getAttribute("src") !== actual.attrs.src) imagen.src = actual.attrs.src;
    imagen.alt = actual.attrs.alt ?? "";
    if (actual.attrs.title) imagen.title = actual.attrs.title; else imagen.removeAttribute("title");
    dom.dataset.placement = actual.attrs.placement ?? "bloque";
    dom.style.width = actual.attrs.width ? `${actual.attrs.width}%` : "fit-content";
    if (actual.attrs.width) imagen.dataset.width = String(actual.attrs.width); else delete imagen.dataset.width;
    dom.classList.toggle("imagen-seleccionada", seleccionado && view.editable);
    for (const boton of botones) {
      boton.hidden = !seleccionado || !view.editable;
      boton.disabled = !view.editable;
    }
  }
  function guardar(porcentaje: number) {
    const posicion = getPos();
    if (!view.editable || posicion === undefined || view.state.doc.nodeAt(posicion)?.type !== actual.type) { pintar(); return; }
    // Una sola transacción al soltar: Deshacer restaura el tamaño previo.
    const tr = view.state.tr.setNodeMarkup(posicion, undefined, { ...actual.attrs, width: porcentaje });
    tr.setSelection(NodeSelection.create(tr.doc, posicion));
    view.dispatch(tr);
  }
  function terminar(confirmar: boolean) {
    if (!arrastre) return;
    const anterior = arrastre;
    arrastre = undefined;
    documento.defaultView?.removeEventListener("keydown", cancelarConEscape, true);
    if (anterior.boton.hasPointerCapture(anterior.id)) anterior.boton.releasePointerCapture(anterior.id);
    if (confirmar && view.editable) guardar(anterior.porcentaje); else pintar();
  }
  function cancelarConEscape(evento: KeyboardEvent) {
    if (evento.key !== "Escape") return;
    evento.preventDefault(); evento.stopPropagation(); terminar(false);
  }
  for (const [esquina, horizontal, vertical, etiqueta] of [
    ["superior-izquierda", -1, -1, "superior izquierda"],
    ["superior-derecha", 1, -1, "superior derecha"],
    ["inferior-izquierda", -1, 1, "inferior izquierda"],
    ["inferior-derecha", 1, 1, "inferior derecha"],
  ] as const) {
    const boton = documento.createElement("button");
    boton.type = "button";
    boton.className = "tirador-imagen";
    boton.dataset.esquina = esquina;
    boton.setAttribute("aria-label", `Redimensionar imagen: esquina ${etiqueta}`);
    boton.title = "Arrastra para cambiar el tamaño. Flechas: ajustar ancho; Escape: cancelar.";
    boton.addEventListener("pointerdown", evento => {
      if (!view.editable || evento.button !== 0 || arrastre) return;
      const rect = imagen.getBoundingClientRect(), disponible = anchoDisponible(), posicion = getPos();
      if (!rect.width || !rect.height || !disponible || posicion === undefined) return;
      evento.preventDefault(); evento.stopPropagation();
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, posicion)));
      boton.focus({ preventScroll: true });
      arrastre = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, ancho: rect.width,
        proporcion: rect.height / rect.width, disponible, porcentaje: Math.max(10, Math.min(100, Math.round(rect.width / disponible * 100))), boton };
      boton.setPointerCapture(evento.pointerId);
      // Capturar antes del diálogo: Escape cancela el arrastre, no cierra el formulario.
      documento.defaultView?.addEventListener("keydown", cancelarConEscape, true);
    });
    boton.addEventListener("pointermove", evento => {
      if (!arrastre || evento.pointerId !== arrastre.id) return;
      if (!view.editable) { terminar(false); return; }
      // Proyectar el cursor sobre la diagonal mantiene la proporción incluso
      // cuando se arrastra más en vertical que en horizontal.
      const { proporcion: r } = arrastre;
      const cambio = (horizontal * (evento.clientX - arrastre.x) + vertical * (evento.clientY - arrastre.y) * r) / (1 + r * r);
      arrastre.porcentaje = Math.max(10, Math.min(100, Math.round((arrastre.ancho + cambio) / arrastre.disponible * 100)));
      dom.style.width = `${arrastre.porcentaje}%`;
    });
    boton.addEventListener("pointerup", evento => { if (evento.pointerId === arrastre?.id) terminar(true); });
    boton.addEventListener("pointercancel", () => terminar(false));
    boton.addEventListener("lostpointercapture", () => terminar(false));
    boton.addEventListener("keydown", evento => {
      if (evento.altKey && !evento.ctrlKey && !evento.metaKey && ["ArrowUp", "ArrowDown"].includes(evento.key)) {
        if (arrastre || !view.editable) return;
        evento.preventDefault(); evento.stopPropagation();
        moverImagenSeleccionada(view, evento.key === "ArrowUp" ? -1 : 1);
        view.focus(); return;
      }
      const cambios: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
      if (!view.editable || !cambios[evento.key] || arrastre || evento.altKey || evento.ctrlKey || evento.metaKey) return;
      evento.preventDefault(); evento.stopPropagation();
      const disponible = anchoDisponible();
      if (!disponible) return;
      const ancho = actual.attrs.width ?? Math.round(imagen.getBoundingClientRect().width / disponible * 100);
      guardar(Math.max(10, Math.min(100, ancho + cambios[evento.key] * (evento.shiftKey ? 10 : 1))));
    });
    botones.push(boton); dom.append(boton);
  }
  pintar();
  return {
    dom,
    update(nuevo) {
      if (nuevo.type !== actual.type) return false;
      actual = nuevo;
      if (arrastre) terminar(false);
      pintar(); return true;
    },
    selectNode() { seleccionado = true; pintar(); },
    deselectNode() { seleccionado = false; terminar(false); pintar(); },
    stopEvent: evento => {
      if (evento.type === "dragstart" && !view.editable) { evento.preventDefault(); return true; }
      return evento.target instanceof HTMLElement && !!evento.target.closest(".tirador-imagen");
    },
    ignoreMutation: mutacion => mutacion.type !== "selection",
    destroy() { terminar(false); },
  };
}
