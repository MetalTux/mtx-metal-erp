import type { DatosCuentaBancaria } from "@/lib/validaciones/cuenta-bancaria";
export type CuentaBancaria = Omit<DatosCuentaBancaria, "email"> & { id: number; email: string | null; isActive: boolean; isPrimary: boolean; version: number; cotizaciones: number; createdAt: string; updatedAt: string };
export type ResultadoCuentaBancaria = { ok: boolean; mensaje: string };
