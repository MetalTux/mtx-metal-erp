import { z } from "zod";

export type NodoCotizacion = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | number[] | null>;
  marks?: { type: string; attrs?: Record<string, string | number | number[] | null> }[];
  content?: NodoCotizacion[];
};
export const URL_IMAGEN_COTIZACION = "/api/cotizaciones/imagenes/";
export const CLAVE_IMAGEN_COTIZACION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;
export const documentoVacioCotizacion: NodoCotizacion = { type: "doc", content: [{ type: "paragraph" }] };
const bloques = ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image", "table"];
const marcas = ["bold", "italic", "underline", "strike", "textStyle"];
function objeto(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("El detalle técnico no tiene un formato válido.");
  return v as Record<string, unknown>;
}
function claves(v: Record<string, unknown>, permitidas: string[]) {
  if (Object.keys(v).some((k) => !permitidas.includes(k))) throw new Error("El detalle técnico contiene atributos no permitidos.");
}
function alineacion(a: Record<string, unknown>): Record<string, string | null> {
  if (a.textAlign !== undefined && a.textAlign !== null && !["left", "center", "right", "justify"].includes(String(a.textAlign))) throw new Error("Alineación inválida.");
  return a.textAlign === undefined ? {} : { textAlign: a.textAlign as string | null };
}
export function validarEstilo(a: Record<string, unknown>): Record<string, string | null> {
  claves(a, ["color", "backgroundColor", "fontFamily", "fontSize", "lineHeight"]);
  const resultado: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === "") { resultado[k] = null; continue; }
    if (typeof v !== "string" || v.length > 200) throw new Error("Estilo de texto inválido.");
    if ((k === "color" || k === "backgroundColor") && !/^(?:#[0-9a-f]{3,8}|[a-z]{1,30}|(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\([a-z\d.,% /+-]+\))$/i.test(v)) throw new Error("Color inválido.");
    if (k === "fontFamily" && !/^[\p{L}\d ,_'"-]+$/u.test(v)) throw new Error("Fuente inválida.");
    if ((k === "fontSize" || k === "lineHeight") && !(k === "lineHeight" && v === "normal") && !/^(?:\d{1,3}(?:\.\d{1,3})?)(?:px|pt|em|rem|%)?$/.test(v)) throw new Error("Tamaño o interlineado inválido.");
    resultado[k] = v;
  }
  return resultado;
}
/** Lista explícita de nodos/atributos: no persistir HTML pegado ni URLs arbitrarias. */
export function validarTextoCotizacion(entrada: unknown): NodoCotizacion {
  if ((JSON.stringify(entrada)?.length ?? 0) > 200_000) throw new Error("El detalle técnico supera el tamaño permitido.");
  let nodos = 0, imagenes = 0;
  function leer(v: unknown, profundidad: number, permitidos: string[]): NodoCotizacion {
    if (++nodos > 4000 || profundidad > 16) throw new Error("El detalle técnico es demasiado extenso o tiene demasiados niveles.");
    const o = objeto(v); claves(o, ["type", "text", "attrs", "marks", "content"]);
    if (typeof o.type !== "string" || !permitidos.includes(o.type)) throw new Error("El detalle técnico contiene un formato no permitido.");
    const n: NodoCotizacion = { type: o.type };
    if (o.type === "text") {
      if (typeof o.text !== "string" || !o.text.length || o.content !== undefined || o.attrs !== undefined) throw new Error("Texto inválido en el detalle técnico.");
      n.text = o.text;
      if (o.marks !== undefined) {
        if (!Array.isArray(o.marks) || o.marks.length > marcas.length) throw new Error("Formato de texto inválido.");
        n.marks = o.marks.map((m) => { const r = objeto(m); claves(r, ["type", "attrs"]); if (typeof r.type !== "string" || !marcas.includes(r.type)) throw new Error("Formato de texto no permitido."); if (r.type === "textStyle") return { type: r.type, attrs: validarEstilo(objeto(r.attrs ?? {})) }; if (r.attrs !== undefined) throw new Error("Atributos de marca inválidos."); return { type: r.type }; });
      }
      return n;
    }
    if (o.text !== undefined || o.marks !== undefined) throw new Error("Nodo de texto inválido.");
    const a = o.attrs === undefined ? {} : objeto(o.attrs);
    if (o.type === "heading") {
      claves(a, ["level", "textAlign"]); if (![1, 2, 3, 4, 5, 6].includes(a.level as number)) throw new Error("Nivel de título inválido."); n.attrs = { level: a.level as number, ...alineacion(a) };
    } else if (o.type === "paragraph") { claves(a, ["textAlign"]); n.attrs = alineacion(a);
    } else if (o.type === "orderedList") {
      claves(a, ["start", "type"]);
      const start = a.start ?? 1;
      if (!Number.isSafeInteger(start) || (start as number) < 1 || (start as number) > 9999 || (a.type !== undefined && a.type !== null)) throw new Error("Numeración de lista inválida.");
      n.attrs = { start: start as number, type: null };
    } else if (o.type === "image") {
      claves(a, ["src", "alt", "title", "placement", "width"]);
      if (++imagenes > 10 || typeof a.src !== "string" || !a.src.startsWith(URL_IMAGEN_COTIZACION) || !CLAVE_IMAGEN_COTIZACION.test(a.src.slice(URL_IMAGEN_COTIZACION.length))) throw new Error("La imagen no pertenece al almacenamiento de Cotizaciones o supera las diez imágenes.");
      for (const campo of ["alt", "title"]) if (a[campo] !== undefined && a[campo] !== null && (typeof a[campo] !== "string" || (a[campo] as string).length > 300)) throw new Error("Descripción de imagen inválida.");
      const placement = a.placement ?? "bloque", width = a.width ?? null;
      if (!["bloque", "izquierda", "derecha", "centro"].includes(String(placement)) || (width !== null && (!Number.isInteger(width) || (width as number) < 10 || (width as number) > 100))) throw new Error("Posición o ancho de imagen inválidos.");
      n.attrs = { placement: placement as string, width: width as number | null, src: a.src, alt: (a.alt as string | null) ?? null, title: (a.title as string | null) ?? null };
    } else if (o.type === "tableCell" || o.type === "tableHeader") {
      claves(a, ["colspan", "rowspan", "colwidth", "align", "backgroundColor"]);
      const colspan = a.colspan ?? 1, rowspan = a.rowspan ?? 1, colwidth = a.colwidth ?? null;
      if (![colspan, rowspan].every(v => Number.isInteger(v) && (v as number) > 0 && (v as number) <= 100) || (colwidth !== null && (!Array.isArray(colwidth) || colwidth.length !== colspan || !colwidth.every(v => Number.isInteger(v) && v >= 0 && v <= 2000)))) throw new Error("Dimensiones de celda inválidas.");
      const align = a.align ?? null;
      if (align !== null && !["left", "center", "right", "justify"].includes(String(align))) throw new Error("Alineación de celda inválida.");
      const color = validarEstilo({ backgroundColor: a.backgroundColor ?? null });
      n.attrs = { colspan: colspan as number, rowspan: rowspan as number, colwidth: colwidth as number[] | null, align: align as string | null, ...color };
    } else claves(a, []);
    if (["hardBreak", "horizontalRule", "image"].includes(o.type)) {
      if (o.content !== undefined) throw new Error("Nodo sin contenido inválido.");
      return n;
    }
    if (o.content !== undefined && !Array.isArray(o.content)) throw new Error("Contenido inválido.");
    const hijos = (o.content ?? []) as unknown[];
    const tipos = ["paragraph", "heading"].includes(o.type) ? ["text", "hardBreak"] : ["bulletList", "orderedList"].includes(o.type) ? ["listItem"] : o.type === "table" ? ["tableRow"] : o.type === "tableRow" ? ["tableCell", "tableHeader"] : bloques;
    n.content = hijos.map((h) => leer(h, profundidad + 1, tipos));
    if (["doc", "bulletList", "orderedList", "blockquote", "listItem", "table", "tableRow", "tableCell", "tableHeader"].includes(o.type) && !hijos.length) throw new Error("Bloque vacío inválido.");
    if (o.type === "listItem" && n.content[0].type !== "paragraph") throw new Error("Cada elemento de lista debe comenzar con un párrafo.");
    return n;
  }
  return leer(entrada, 0, ["doc"]);
}
export function clavesImagenesCotizacion(n: NodoCotizacion): string[] {
  return [...new Set([...(n.type === "image" ? [String(n.attrs!.src!).slice(URL_IMAGEN_COTIZACION.length)] : []), ...(n.content ?? []).flatMap(clavesImagenesCotizacion)])];
}
export const textoCotizacionSchema = z.unknown().transform((v, ctx) => {
  try { return validarTextoCotizacion(v); }
  catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Detalle técnico inválido." }); return z.NEVER; }
});
