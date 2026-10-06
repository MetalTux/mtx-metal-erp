import { z } from "zod";

/** Forma de almacenamiento: cuerpo sin puntos ni ceros iniciales, guion y DV mayúsculo. */
export function normalizarRut(valor: string): string {
  const compacto = valor.trim().toUpperCase().replace(/[.\s-]/g, "");
  if (!/^\d{1,8}[\dK]$/.test(compacto)) return valor.trim();
  return `${compacto.slice(0, -1).replace(/^0+(?=\d)/, "")}-${compacto.at(-1)}`;
}

export function rutValido(valor: string): boolean {
  if (!/^(?:\d{1,8}|\d{1,2}(?:\.\d{3}){1,2})-?[\dKk]$/.test(valor.trim())) return false;
  const [cuerpo, dv] = normalizarRut(valor).split("-");
  if (!cuerpo || cuerpo === "0" || cuerpo.length > 8) return false;
  let suma = 0;
  let factor = 2;
  for (const digito of [...cuerpo].reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - suma % 11;
  return dv === (resto === 11 ? "0" : resto === 10 ? "K" : String(resto));
}

export function formatearRut(valor: string): string {
  const normalizado = normalizarRut(valor);
  if (!/^\d{1,8}-[\dK]$/.test(normalizado)) return valor;
  const [cuerpo, dv] = normalizado.split("-");
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

export const rutSchema = z.string().trim().min(1, "Ingresa el RUT.").max(20, "Usa hasta 20 caracteres.").refine(rutValido, "Ingresa un RUT con dígito verificador válido.");
