import type { Prisma } from "@/generated/prisma/client";

type TipoReferenciaPlan = "RawMaterial" | "Product" | "WarehouseMateria" | "WarehouseProducto" | "Warehouse" | "UnitMeasure";

/** Revisiones inmutables siguen protegiendo catálogos aunque cambie el plan actual. */
export async function tieneReferenciaHistoricaPlan(tx: Prisma.TransactionClient, tipo: TipoReferenciaPlan, id: number) {
  const [resultado] = await tx.$queryRaw<{ referenced: boolean }[]>`
    SELECT public.referencia_historica_plan_trabajo(${tipo}, ${id}) AS referenced
  `;
  return resultado.referenced;
}
