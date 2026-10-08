import type { DatosEmpresa } from "@/lib/validaciones/empresa";
export type Empresa = { id: number; createdAt: string; updatedAt: string; logoUrl: string | null } & { [Campo in keyof DatosEmpresa]-?: string | null };
export type ResultadoEmpresa =
  | { ok: true; mensaje: string; empresa: Empresa | null }
  | { ok: false; mensaje: string; campos?: Partial<Record<keyof DatosEmpresa, string[]>> };
