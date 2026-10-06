export type UnidadMaterial = { id: number; name: string; abbreviation: string };
export type Material = {
  id: number; code: string; name: string; description: string | null;
  unitMeasureId: number; unidad: UnidadMaterial; createdAt: string; updatedAt: string;
  referencias: { stocks: number; movimientos: number; compras: number; trabajos: number; cotizaciones: number };
};
export type ResultadoMaterial =
  | { ok: true; mensaje: string; material?: Material }
  | { ok: false; mensaje: string; campos?: Partial<Record<"code" | "name" | "description" | "unitMeasureId", string[]>> };
export const materialEnUso = (material: Material) => Object.values(material.referencias).some(cantidad => cantidad > 0);
