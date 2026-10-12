import type { UnidadMaterial } from "@/lib/tipos/material";
export type Producto = { id: number; code: string; name: string; description: string | null; unitMeasureId: number; unidad: UnidadMaterial; suggestedPrice: string | null; version: number; inventario: number; cotizaciones: number; recipes: { rawMaterialId: number; unitMeasureId: number; quantity: string; name: string; code: string; unitName: string; abbreviation: string }[]; images: { id: number; url: string }[] };
export type MaterialReceta = { id: number; code: string; name: string; unitMeasureId: number; unitName: string; abbreviation: string };
export type ResultadoProducto = { ok: boolean; mensaje: string; producto?: Producto };
