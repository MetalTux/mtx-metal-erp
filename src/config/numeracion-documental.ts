export const tiposNumeracion = {
  COTIZACION: "Cotización",
  ORDEN_COMPRA_CLIENTE: "Orden de Compra Cliente",
  ORDEN_TRABAJO: "Orden de Trabajo",
  GUIA_DESPACHO: "Guía de Despacho",
} as const;
export type TipoNumeracion = keyof typeof tiposNumeracion;
export const MAX_NUMERO_DOCUMENTAL = BigInt("999999999999999999");
/** El ancho es mínimo: nunca truncar números mayores que la cantidad de dígitos. */
export function vistaPreviaFolio(prefix: string, numero: string, padding: number | null): string | null {
  if (!/^[0-9]{1,18}$/.test(numero) || !Number.isInteger(padding) || !padding || padding < 1 || padding > 18) return null;
  const valor = BigInt(numero);
  return valor > BigInt(0) && valor <= MAX_NUMERO_DOCUMENTAL ? prefix + valor.toString().padStart(padding, "0") : null;
}
