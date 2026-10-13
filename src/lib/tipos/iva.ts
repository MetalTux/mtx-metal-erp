export type PeriodoIva = { id: number; rate: string; validFrom: string; validTo: string | null; version: number; documentos: number; ultimaFechaDocumento: string | null };
export type ResultadoIva = { ok: true; mensaje: string } | { ok: false; mensaje: string };
