import { formatearCantidad } from "@/lib/formato";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type StockReservationPurpose } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularCoberturaReserva } from "./requerimientos-produccion";

const referencia = z.object({ workOrderId: z.number().int().positive(), version: z.number().int().positive(), idempotencyKey: z.uuid().transform(v => v.toLowerCase()) }).strict();
const liberacion = referencia.extend({ allocationId: z.number().int().positive(), quantity: z.string().trim().transform(v => v.replace(",", ".")).refine(v => /^\d{1,11}(?:\.\d{1,3})?$/.test(v), "Indica una cantidad con hasta tres decimales, sin separadores de miles."), reason: z.string().trim().min(1).max(1000) }).strict();
class ReglaReserva extends Error { name = "ReglaReserva"; }
function exigir(valor: unknown, mensaje: string): asserts valor { if (!valor) throw new ReglaReserva(mensaje); }

/** El llamador debe bloquear primero material/producto y saldos; nunca obtiene locks de OT. */
export async function cantidadReservadaRecurso(tx: Prisma.TransactionClient, rawMaterialId: number | null, productId: number | null, warehouseId: number) {
  exigir((rawMaterialId === null) !== (productId === null), "Indica exactamente un recurso para consultar su reserva.");
  const [r] = await tx.$queryRaw<{ quantity: string }[]>`SELECT public.reserva_activa_recurso(${rawMaterialId}::integer,${productId}::integer,${warehouseId}::integer)::text AS quantity`;
  return new Prisma.Decimal(r.quantity);
}
export async function exigirCoberturaReservas(tx: Prisma.TransactionClient, rawMaterialId: number | null, productId: number | null, warehouseId: number, finalQuantity: Prisma.Decimal) {
  const reservada = await cantidadReservadaRecurso(tx, rawMaterialId, productId, warehouseId);
  exigir(finalQuantity.gte(reservada), `Hay ${formatearCantidad(reservada.toFixed(3))} unidades reservadas. Libera o replanifica las reservas con motivo antes de retirar esas existencias.`);
}

async function snapshots(tx: Prisma.TransactionClient, id: number) {
  const [row] = await tx.$queryRaw<{ plan: Prisma.InputJsonValue; reservations: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${id}) AS plan, public.snapshot_reservas_trabajo(${id}) AS reservations`;
  return row;
}
async function preparar(tx: Prisma.TransactionClient, d: z.infer<typeof referencia>, type: "RESERVAR_STOCK" | "LIBERAR_RESERVA", fingerprint: string) {
  await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${d.workOrderId} FOR UPDATE`;
  const previa = await tx.workOrderOperation.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
  if (previa) {
    exigir(previa.workOrderId === d.workOrderId && previa.type === type && previa.fingerprint === fingerprint, "El UUID ya se utilizó con otra solicitud.");
    return { replay: previa };
  }
  const work = await tx.workOrder.findUniqueOrThrow({ where: { id: d.workOrderId } });
  exigir(work.schemaVersion === 1 && ["PENDIENTE", "EN_PROCESO"].includes(work.status), "Las reservas requieren una OT vigente pendiente o en proceso.");
  exigir(work.version === d.version, "La OT cambió. Actualiza el plan antes de continuar.");
  if (type === "RESERVAR_STOCK") {
    const decision = await tx.workOrderOperation.findFirst({ where: { workOrderId: work.id, type: { in: ["CREAR", "EDITAR_PLAN"] } }, orderBy: { version: "desc" } });
    exigir(decision?.planConfirmed !== false, "Confirma primero el plan y su distribución.");
  }
  const anterior = await tx.workOrderOperation.findUniqueOrThrow({ where: { workOrderId_version: { workOrderId: work.id, version: work.version } } });
  return { work, anterior };
}
async function registrar(tx: Prisma.TransactionClient, d: z.infer<typeof referencia>, type: "RESERVAR_STOCK" | "LIBERAR_RESERVA", fingerprint: string, beforeSnapshot: Prisma.JsonValue) {
  await tx.workOrder.update({ where: { id: d.workOrderId }, data: { version: { increment: 1 } } });
  const s = await snapshots(tx, d.workOrderId);
  return tx.workOrderOperation.create({ data: { idempotencyKey: d.idempotencyKey, workOrderId: d.workOrderId, version: d.version + 1, type, fingerprint,
    beforeSnapshot: beforeSnapshot as Prisma.InputJsonValue, afterSnapshot: s.plan, reservationSnapshot: s.reservations } });
}
const resultado = (op: { workOrderId: number; version: number; reservationSnapshot: Prisma.JsonValue }, replayed: boolean) => ({ workOrderId: op.workOrderId, version: op.version, reservationSnapshot: op.reservationSnapshot, replayed });

type Necesidad = { position: number; workOrderLineId: number; purpose: StockReservationPurpose; warehouseId: number; rawMaterialId: number | null; productId: number | null; unitMeasureId: number;
  resourceCode: string; resourceName: string; unitName: string; unitAbbreviation: string; requestedQuantity: string; plannedDetailId: number | null; supplyPlanId: number | null; productionOutputId: number | null };

/** Integra reservas con CREAR/EDITAR_PLAN en su misma tx; exige OT y recursos bloqueados.
 * El llamador captura snapshot e inserta la operación después de esta función.
 * No valida UUID/reintentos ni confirma la transacción por cuenta propia.
 */
export async function reservarPlanTrabajoEnTransaccion(tx: Prisma.TransactionClient, workOrderId: number, operationId: string) {
  await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${workOrderId} FOR UPDATE`;
  const work = await tx.workOrder.findUniqueOrThrow({ where: { id: workOrderId } });
  exigir(work.schemaVersion === 1 && ["PENDIENTE", "EN_PROCESO"].includes(work.status), "Sólo reservar un plan vigente pendiente o en proceso.");
    const lines = await tx.workOrderLine.findMany({ where: { workOrderId: workOrderId }, orderBy: { position: "asc" } });
    const materiales = await tx.workOrderDetail.findMany({ where: { workOrderId: workOrderId, retiredAt: null } });
    const supplies = await tx.workOrderSupplyPlan.findMany({ where: { workOrderId: workOrderId, retiredAt: null } });
    const necesidades: Necesidad[] = [];
    for (const line of lines) {
      for (const m of materiales.filter(m => m.workOrderLineId === line.id)) {
        exigir(m.unitMeasureId && m.materialCode !== null && m.materialName !== null && m.unitName !== null && m.unitAbbreviation !== null, "El requerimiento no conserva sus datos históricos.");
        necesidades.push({ position: line.position, workOrderLineId: line.id, purpose: "CONSUMO_PRODUCCION", warehouseId: m.warehouseId, rawMaterialId: m.rawMaterialId, productId: null,
          unitMeasureId: m.unitMeasureId, resourceCode: m.materialCode, resourceName: m.materialName, unitName: m.unitName, unitAbbreviation: m.unitAbbreviation,
          requestedQuantity: (await tx.$queryRaw<{quantity:string}[]>`SELECT public.demanda_pendiente_requerimiento(${m.id})::text AS quantity`)[0].quantity, plannedDetailId: m.id, supplyPlanId: null, productionOutputId: null });
      }
      if (work.salesOrderId !== null) for (const supply of supplies.filter(s => s.workOrderLineId === line.id)) {
        exigir(line.code !== null, "El abastecimiento no conserva el código del recurso.");
        necesidades.push({ position: line.position, workOrderLineId: line.id, purpose: supply.rawMaterialId === null ? "ENTREGA_PRODUCTO" : "ENTREGA_DIRECTA_MP",
          warehouseId: supply.warehouseId, rawMaterialId: supply.rawMaterialId, productId: supply.productId, unitMeasureId: line.unitMeasureId,
          resourceCode: line.code, resourceName: line.description, unitName: line.unitName, unitAbbreviation: line.unitAbbreviation,
          requestedQuantity: supply.quantity.toFixed(3), plannedDetailId: null, supplyPlanId: supply.id, productionOutputId: null });
      }
    }
    if(work.salesOrderId!==null){
      const outputs=await tx.productionOutput.findMany({where:{workOrderId,reversal:null},orderBy:{id:"asc"}});
      for(const o of outputs){const line=lines.find(l=>l.id===o.workOrderLineId)!;necesidades.push({position:line.position,workOrderLineId:line.id,purpose:"ENTREGA_PRODUCTO",warehouseId:o.warehouseId,rawMaterialId:null,productId:o.productId,unitMeasureId:o.unitMeasureId,resourceCode:o.productCode,resourceName:o.productName,unitName:o.unitName,unitAbbreviation:o.unitAbbreviation,requestedQuantity:o.quantity.toFixed(3),plannedDetailId:null,supplyPlanId:null,productionOutputId:o.id});}
    }
    const ids = (familia: "rawMaterialId" | "productId" | "warehouseId") => [...new Set(necesidades.flatMap(n => n[familia] === null ? [] : [n[familia]!]))].sort((a,b) => a-b);
    for (const id of ids("rawMaterialId")) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
    for (const id of ids("productId")) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    for (const id of ids("warehouseId")) await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
    // Padres de recurso serializan combinaciones inexistentes sin crearlas al consultar.
    necesidades.sort((a,b) => a.position-b.position || (a.rawMaterialId ?? 0)-(b.rawMaterialId ?? 0) || (a.productId ?? 0)-(b.productId ?? 0) || a.warehouseId-b.warehouseId || (a.plannedDetailId ?? a.supplyPlanId ?? a.productionOutputId!)-(b.plannedDetailId ?? b.supplyPlanId ?? b.productionOutputId!));
    for (const n of necesidades) {
      if(new Prisma.Decimal(n.requestedQuantity).isZero())continue;
      let stock: Prisma.Decimal, kardex: Prisma.Decimal;
      if (n.rawMaterialId !== null) {
        await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE "rawMaterialId"=${n.rawMaterialId} AND "warehouseId"=${n.warehouseId} FOR UPDATE`;
        const fila = await tx.warehouseStock.findUnique({ where: { warehouseId_rawMaterialId: { warehouseId: n.warehouseId, rawMaterialId: n.rawMaterialId } } });
        stock = fila?.quantity ?? new Prisma.Decimal(0);
        kardex = (await tx.stockMovement.aggregate({ where: { rawMaterialId: n.rawMaterialId, warehouseId: n.warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? new Prisma.Decimal(0);
      } else {
        await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE "productId"=${n.productId} AND "warehouseId"=${n.warehouseId} FOR UPDATE`;
        const fila = await tx.productWarehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: n.warehouseId, productId: n.productId! } } });
        stock = fila?.quantity ?? new Prisma.Decimal(0);
        kardex = (await tx.productStockMovement.aggregate({ where: { productId: n.productId!, warehouseId: n.warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? new Prisma.Decimal(0);
      }
      exigir(stock.eq(kardex), "El stock no coincide con Kardex; concilia la incidencia antes de reservar.");
      const total = await cantidadReservadaRecurso(tx, n.rawMaterialId, n.productId, n.warehouseId);
      const [own] = await tx.$queryRaw<{ quantity: string }[]>`SELECT coalesce(sum(public.reserva_activa_asignacion(a.id)),0)::text AS quantity FROM "StockReservationAllocation" a
        WHERE a."workOrderId"=${workOrderId} AND a."plannedDetailId" IS NOT DISTINCT FROM ${n.plannedDetailId}::integer AND a."supplyPlanId" IS NOT DISTINCT FROM ${n.supplyPlanId}::integer AND a."productionOutputId" IS NOT DISTINCT FROM ${n.productionOutputId}::integer`;
      const coverage = calcularCoberturaReserva({ requestedQuantity: n.requestedQuantity, stockQuantity: stock.toFixed(3), totalReservedQuantity: total.toFixed(3), ownReservedQuantity: own.quantity });
      if (new Prisma.Decimal(coverage.newReservationQuantity).isZero()) continue;
      const { position: _position, requestedQuantity: _requested, ...data } = n;
      void _position; void _requested;
      await tx.stockReservationAllocation.create({ data: { ...data, workOrderId: workOrderId, quantity: coverage.newReservationQuantity, operationId: operationId } });
    }
}

/** Backend de reserva parcial. No crea documentos de trabajo, filas de stock ni Kardex. */
export async function completarReservasTrabajo(input: z.infer<typeof referencia>) {
  const d = referencia.parse(input);
  const fingerprint = createHash("sha256").update(JSON.stringify({ type: "RESERVAR_STOCK", workOrderId: d.workOrderId, version: d.version })).digest("hex");
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey},91357))`;
    const p = await preparar(tx, d, "RESERVAR_STOCK", fingerprint);
    if (p.replay) return resultado(p.replay, true);
    await reservarPlanTrabajoEnTransaccion(tx, d.workOrderId, d.idempotencyKey);
    return resultado(await registrar(tx, d, "RESERVAR_STOCK", fingerprint, p.anterior!.afterSnapshot), false);
  }, { timeout: 30000 });
}

/** Liberación parcial explícita: no altera existencias ni se dispara por antigüedad. */
export async function liberarReservaTrabajo(input: z.infer<typeof liberacion>) {
  const d = liberacion.parse(input); const q = new Prisma.Decimal(d.quantity);
  exigir(q.gt(0) && q.lte("99999999999.999"), "La cantidad a liberar debe ser positiva y válida.");
  const fingerprint = createHash("sha256").update(JSON.stringify({ type: "LIBERAR_RESERVA", workOrderId: d.workOrderId, version: d.version, allocationId: d.allocationId, quantity: q.toFixed(3), reason: d.reason })).digest("hex");
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey},91357))`;
    const p = await preparar(tx, d, "LIBERAR_RESERVA", fingerprint);
    if (p.replay) return resultado(p.replay, true);
    const a = await tx.stockReservationAllocation.findUniqueOrThrow({ where: { id: d.allocationId } });
    exigir(a.workOrderId === d.workOrderId, "La asignación pertenece a otra OT.");
    if (a.rawMaterialId !== null) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${a.rawMaterialId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${a.productId} FOR UPDATE`;
    const [resto] = await tx.$queryRaw<{ quantity: string }[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS quantity`;
    exigir(q.lte(resto.quantity), "La cantidad supera el remanente de la reserva.");
    await tx.stockReservationEvent.create({ data: { allocationId: a.id, type: "LIBERAR", quantity: q, reason: d.reason, operationId: d.idempotencyKey } });
    return resultado(await registrar(tx, d, "LIBERAR_RESERVA", fingerprint, p.anterior!.afterSnapshot), false);
  }, { timeout: 30000 });
}
