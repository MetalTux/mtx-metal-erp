export type Bodega = {
  id: number;
  name: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  referencias: { stocks: number; movimientos: number; compras: number; trabajos: number };
};

export type ResultadoBodega =
  | { ok: true; mensaje: string; bodega?: Bodega }
  | { ok: false; mensaje: string; campos?: Partial<Record<"name" | "location", string[]>> };
