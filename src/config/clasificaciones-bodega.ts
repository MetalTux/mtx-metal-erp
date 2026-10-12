/** Catálogo interno fijo; null sólo identifica bodegas heredadas aún sin clasificar. */
export const CLASIFICACIONES_BODEGA = [
  { valor: "MATERIA_PRIMA", etiqueta: "Materia prima" },
  { valor: "PRODUCTO_TERMINADO", etiqueta: "Producto terminado" },
  { valor: "MIXTA", etiqueta: "Mixta" },
] as const;
export type ClasificacionBodega = typeof CLASIFICACIONES_BODEGA[number]["valor"];
export function nombreClasificacionBodega(valor: ClasificacionBodega | null) {
  return CLASIFICACIONES_BODEGA.find(opcion => opcion.valor === valor)?.etiqueta ?? "Sin clasificar";
}
