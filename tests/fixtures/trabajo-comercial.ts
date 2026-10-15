import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma";
import { Prisma } from "../../src/generated/prisma/client";
import { asignarFolio } from "../../src/lib/servicios/numeracion";
import { leerCompromisoParaTrabajo } from "../../src/lib/servicios/ordenes-compra-cliente";

/** Fixture del esquema M1; no implementa el servicio público ni confirma reservas. */
export async function crearTrabajoComercialDePrueba(salesOrderId: number, productName: string) {
  const url = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_"));
  return prisma.$transaction(async tx => {
    const orden = await tx.salesOrder.findUniqueOrThrow({ where: { id: salesOrderId } });
    await leerCompromisoParaTrabajo(tx, { id: orden.id, version: orden.version });
    const details = await tx.salesOrderDetail.findMany({ where: { salesOrderId }, orderBy: { position: "asc" } });
    const rawIds = [...new Set(details.flatMap(line => line.rawMaterialId === null ? [] : [line.rawMaterialId]))].sort((a, b) => a - b);
    const productIds = [...new Set(details.flatMap(line => line.productId === null ? [] : [line.productId]))].sort((a, b) => a - b);
    for (const id of rawIds) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
    for (const id of productIds) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    const numbering = await tx.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_TRABAJO" } });
    if (numbering.nextNumber === null) {
      await tx.documentNumbering.update({ where: { id: numbering.id }, data: { prefix: "OT-PRUEBA-", padding: 5, nextNumber: 1, version: { increment: 1 } } });
    }
    const key = randomUUID(), folio = await asignarFolio(tx, "ORDEN_TRABAJO", key);
    const sourceSnapshot = JSON.parse(JSON.stringify({ schemaVersion: 1, order: orden, details })) as Prisma.InputJsonValue;
    const work = await tx.workOrder.create({ data: { schemaVersion: 1, creationKey: key, folioId: folio.id,
      salesOrderId, salesOrderVersion: orden.version, sourceSnapshot,
      technicalDescription: orden.technicalDescription as Prisma.InputJsonValue,
      date: orden.acceptanceDate!, productName } });
    for (const line of details) {
      await tx.workOrderLine.create({ data: { workOrderId: work.id, salesOrderId, salesOrderDetailId: line.id,
        position: line.position, kind: line.kind, executionMode: line.kind === "PRODUCTO" ? "CATALOGO" : line.kind === "MATERIA_PRIMA" ? "VENTA_DIRECTA_MP" : "SERVICIO",
        description: line.description, code: line.code, unitMeasureId: line.unitMeasureId, unitName: line.unitName, unitAbbreviation: line.unitAbbreviation,
        rawMaterialId: line.rawMaterialId, productId: line.productId, quantity: line.quantity,
        quantityToProduce: line.kind === "PRODUCTO" ? "0" : null, quantityFromStock: line.kind === "PRODUCTO" ? line.quantity : null } });
    }
    const [snapshot] = await tx.$queryRaw<{ snapshot: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${work.id}) AS snapshot`;
    await tx.workOrderOperation.create({ data: { idempotencyKey: key, fingerprint: "a".repeat(64), workOrderId: work.id,
      type: "CREAR", version: 1, planConfirmed: false, afterSnapshot: snapshot.snapshot } });
    return work;
  }, { timeout: 30000 });
}
