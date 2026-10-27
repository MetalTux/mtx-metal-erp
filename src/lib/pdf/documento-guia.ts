import type { DeliveryNote, DeliveryNoteLine, Prisma } from "@/generated/prisma/client";
import { rutValido } from "@/lib/validaciones/rut";
type Copia<T> = { [K in keyof T]: T[K] extends Date | Prisma.Decimal ? string : T[K] extends Date | null ? string | null : T[K] };
export interface OrigenPdfGuia {
  header: Copia<DeliveryNote>;
  lines: Copia<DeliveryNoteLine>[];
  folio: string;
  workOrderFolio: string;
  salesOrderFolio: string;
  originalFolio: string | null;
  warehouseNames: Record<string, string>;
}
export interface DocumentoPdfGuia { folio: string; kind: "ENTREGA" | "CORRECCION"; origen: OrigenPdfGuia }
export function objetoGuia(v: Prisma.JsonValue | null): Prisma.JsonObject {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}
/** Validar copias históricas; nunca completar desde catálogos o Empresa actual. */
export function validarOrigenPdfGuia(o: OrigenPdfGuia) {
  const g = o.header, emisor = objetoGuia(g.companySnapshot), cliente = objetoGuia(g.clientSnapshot), destino = objetoGuia(g.destinationSnapshot);
  const completo = (v: Prisma.JsonObject, claves: string[]) => claves.every(k => typeof v[k] === "string" && String(v[k]).trim());
  if (g.schemaVersion !== 1 || !g.confirmedAt || !g.dispatchDate || !["ENTREGA", "CORRECCION"].includes(g.kind ?? "") || !o.folio || !o.workOrderFolio || !o.salesOrderFolio || !o.lines.length)
    throw new Error("La guía legada o incompleta requiere conciliación antes de emitir PDF.");
  if (!completo(emisor, ["legalName", "rut", "address", "city"]) || !rutValido(String(emisor.rut))) throw new Error("El emisor histórico de la guía está incompleto.");
  if (!completo(cliente, ["rut", "name"]) || !rutValido(String(cliente.rut)) || !completo(destino, ["branchName", "address", "city", "branchContact", "branchPhone"])) throw new Error("El cliente o destino histórico de la guía está incompleto.");
  if (g.kind === "CORRECCION" && (!o.originalFolio || !g.correctionReason?.trim())) throw new Error("La corrección no conserva su referencia o motivo.");
}
