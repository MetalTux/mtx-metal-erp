export type UnidadMedida = {
  id: number;
  name: string;
  abbreviation: string;
  createdAt: string;
  updatedAt: string;
  materiales: number;
};

export type ResultadoUnidad =
  | { ok: true; mensaje: string; unidad?: UnidadMedida }
  | { ok: false; mensaje: string; campos?: Partial<Record<"name" | "abbreviation", string[]>> };
