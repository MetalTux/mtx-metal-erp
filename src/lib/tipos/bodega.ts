import type { ClasificacionBodega } from "@/config/clasificaciones-bodega";
export type Bodega = {
  id: number;
  name: string;
  location: string | null;
  classification: ClasificacionBodega | null;
  createdAt: string;
  updatedAt: string;
  referencias: { productos: number; stocks: number; movimientos: number; compras: number; trabajos: number };
};

export type ResultadoBodega =
  | { ok: true; mensaje: string; bodega?: Bodega }
  | { ok: false; mensaje: string; campos?: Partial<Record<"name" | "location" | "classification", string[]>> };
