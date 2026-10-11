import type { TipoNumeracion } from "@/config/numeracion-documental";
export type Numeracion = { id: number; type: TipoNumeracion; prefix: string; padding: number | null; nextNumber: string | null; version: number; usada: boolean };
export type ResultadoNumeracion = { ok: boolean; mensaje: string };
