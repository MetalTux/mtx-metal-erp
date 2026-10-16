import type { PaginaConsulta } from "@/lib/tipos/inventario";
export type CatalogosTerminado = {
  productos: { id: number; name: string; code: string; unitMeasureId: number; version: number; unidad: string; nombreUnidad: string }[];
  bodegas: { id: number; name: string }[];
};
export type ReferenciaTerminado = { stockId: number | null; version: number | null; quantity: string; lastMovementId: number | null };
export type FilaTerminado = { produccion?: {workOrderId:number;recordId:number;reversalId?:number} | null; id: number; productId: number; warehouseId: number; producto: string; codigo: string; bodega: string; unidad: string; cantidad: string; fecha: string | null; observacion: string | null; documentoId: number | null; registro: string | null; documentoTipo: "inicial" | "ajuste" | null; anterior: string | null; final: string | null; motivo: string | null; origen: { tipo: "inicial" | "ajuste"; id: number } | null };
export type ConsultaTerminado = { ok: true; pagina: PaginaConsulta<FilaTerminado> } | { ok: false; mensaje: string };
export type ResultadoInicialTerminado = { ok: boolean; mensaje: string; documentoId?: number };
export type ResultadoSaldoTerminado = { ok: true; referencia: ReferenciaTerminado; puedeInicial: boolean; puedeAjustar: boolean; origenes: { tipo: "inicial" | "ajuste"; id: number; etiqueta: string }[] } | { ok: false; mensaje: string };
