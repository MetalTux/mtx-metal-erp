export type CondicionPago = {
  id: number; name: string; days: number; version: number;
  createdAt: string; updatedAt: string; cotizaciones: number;
};
export type ResultadoCondicion =
  | { ok: true; mensaje: string; condicion?: CondicionPago }
  | { ok: false; mensaje: string; campos?: Partial<Record<"name" | "days", string[]>> };
