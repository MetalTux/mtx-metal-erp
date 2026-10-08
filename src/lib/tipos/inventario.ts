export type CatalogosInventario = {
  bodegas: { id: number; name: string; location: string | null }[];
  materiales: {
    id: number;
    code: string;
    name: string;
    unitMeasureId: number;
    unidad: { name: string; abbreviation: string };
  }[];
};
type IdentificacionInventario = {
  id: number;
  cantidad: string;
  bodega: { id: number; name: string; location: string | null };
  material: {
    id: number;
    code: string;
    name: string;
    unidad: { name: string; abbreviation: string };
  };
  createdAt: string;
};
export type EstadoStock =
  | "Sin mínimo configurado"
  | "Sin stock"
  | "Stock bajo"
  | "Sobre el mínimo"
  | "Saldo negativo: revisar";
export type StockInventario = IdentificacionInventario & {
  minimo: string | null;
  updatedAt: string;
  estado: EstadoStock;
  requiereReposicion: boolean;
};
export type MovimientoInventario = IdentificacionInventario & {
  fecha: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  nota: string | null;
  trasladoId: number | null;
  ajusteId: number | null;
  ajusteMotivo: string | null;
  compra: { id: number; detalleId: number } | null;
  trabajo: { id: number; detalleId: number } | null;
};
export type PaginaConsulta<T> = {
  datos: T[];
  total: number;
  pagina: number;
  tamano: number;
};
export type ResultadoConsulta<T> =
  { ok: true; pagina: PaginaConsulta<T> } | { ok: false; mensaje: string };

export type ReferenciaMinimo = {
  id: number;
  updatedAt: string;
  minimo: string | null;
};
export type ConfiguracionMinimo = {
  cantidad: string;
  minimo: string | null;
  referencia: ReferenciaMinimo | null;
};
export type ResultadoMinimo =
  { ok: true; mensaje: string } | { ok: false; mensaje: string };
