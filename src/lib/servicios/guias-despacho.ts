import { anotarMutacion } from "@/lib/seguridad/autoria";
import { exigirAcceso, exigirAccesoEnTransaccion } from "@/lib/seguridad/acceso";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { correccionGuiaSchema, guiaDespachoSchema } from "@/lib/validaciones/guia-despacho";
import { hoyOrden } from "./ordenes-compra-cliente";
import { asignarFolio } from "./numeracion";
import { inicioDiaChile } from "@/lib/fechas-chile";
import { rutValido } from "@/lib/validaciones/rut";

class ReglaGuia extends Error { name = "ReglaGuia"; }
function exigir(v: unknown, mensaje: string): asserts v { if (!v) throw new ReglaGuia(mensaje); }
const dec = (v: string | number | Prisma.Decimal) => new Prisma.Decimal(v);
const fecha = (v: string) => new Date(`${v}T00:00:00Z`);
const json = (v: Prisma.JsonValue | null): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v : null;
const texto = (v: unknown) => typeof v === "string" && v.trim().length > 0;
function fallo(e: unknown) {
  if (e instanceof ReglaGuia) return { ok: false as const, mensaje: e.message };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const cause = (e.meta?.driverAdapterError as { cause?: { originalCode?: string; originalMessage?: string } } | undefined)?.cause;
    if (cause?.originalCode === "P0001") return { ok: false as const, mensaje: (cause.originalMessage ?? "La guía no pasó la validación de integridad.").split("\n")[0] };
    if (e.code === "P2002") return { ok: false as const, mensaje: "El folio o la clave ya pertenecen a otra guía. Actualiza el listado." };
  }
  const cause = e instanceof Error ? (e.cause as { originalCode?: string; originalMessage?: string } | undefined) : undefined;
  if (cause?.originalCode === "P0001") return { ok: false as const, mensaje: (cause.originalMessage ?? "La guía no pasó la validación de integridad.").split("\n")[0] };
  return null;
}

type Datos = z.infer<typeof guiaDespachoSchema>;
async function contexto(tx: Prisma.TransactionClient, d: Datos, bloquear: boolean) {
  const base = await tx.workOrder.findUnique({ where: { id: d.workOrderId } });
  exigir(base?.schemaVersion === 1 && base.salesOrderId !== null, "Sólo una OT comercial nueva admite guías.");
  const orden = await tx.salesOrder.findUniqueOrThrow({ where: { id: base.salesOrderId } });
  if (bloquear) {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${orden.quoteId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id=${orden.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${base.id} FOR UPDATE`;
  }
  const w = await tx.workOrder.findUniqueOrThrow({ where: { id: base.id } });
  const s = await tx.salesOrder.findUniqueOrThrow({ where: { id: orden.id } });
  exigir(w.version === d.version && w.salesOrderId === s.id, "La OT cambió. Actualiza la preparación antes de despachar.");
  exigir(["EN_PROCESO", "FINALIZADO"].includes(w.status) && w.startedDate, "La OT debe estar iniciada o finalizada.");
  exigir(s.status === "CONFIRMADA" && s.folioId && s.acceptanceDate, "La OCC debe estar confirmada y documentada.");
  exigir(d.date >= w.startedDate.toISOString().slice(0, 10) && d.date >= s.acceptanceDate.toISOString().slice(0, 10) && d.date <= hoyOrden(), "La fecha debe estar entre el inicio/aceptación y hoy en Santiago.");
  const emisor = json(s.companySnapshot), cliente = json(s.clientSnapshot);
  exigir(emisor && ["legalName", "rut", "address", "city"].every(k => texto(emisor[k])) && rutValido(String(emisor.rut)), "El emisor histórico de la OCC está incompleto.");
  exigir(cliente && ["rut", "name", "branchName", "address", "city", "branchContact", "branchPhone"].every(k => texto(cliente[k])) && rutValido(String(cliente.rut)), "El cliente o sucursal histórica de la OCC está incompleto.");
  const destino = { branchName: cliente.branchName, address: cliente.address, city: cliente.city,
    branchContact: cliente.branchContact, branchPhone: cliente.branchPhone, branchEmail: cliente.branchEmail ?? null };
  const lines = await tx.workOrderLine.findMany({ where: { workOrderId: w.id }, orderBy: { id: "asc" } });
  const details = await tx.salesOrderDetail.findMany({ where: { salesOrderId: s.id } });
  exigir(lines.length > 0 && lines.length === details.length, "La OT y la OCC deben conservar todas sus líneas.");
  for (const l of lines) {
    const c = details.find(x => x.id === l.salesOrderDetailId);
    exigir(c && c.quantity.eq(l.quantity) && c.kind === l.kind && c.description === l.description && c.code === l.code &&
      c.unitMeasureId === l.unitMeasureId && c.unitName === l.unitName && c.unitAbbreviation === l.unitAbbreviation &&
      c.rawMaterialId === l.rawMaterialId && c.productId === l.productId, "La línea de OT difiere de la OCC histórica.");
  }
  const keys = new Set<string>();
  for (const item of d.lines) {
    const l = lines.find(x => x.id === item.workOrderLineId);
    exigir(l && l.salesOrderDetailId !== null, "La partida no pertenece a esta OT comercial.");
    const key = `${l.id}/${item.warehouseId ?? "prestacion"}`;
    exigir(!keys.has(key), "No repitas una misma partida y bodega en la guía."); keys.add(key);
    if (["SERVICIO", "A_MEDIDA"].includes(l.executionMode)) {
      exigir(item.warehouseId === null && texto(item.conformityName) && item.conformityDate && item.conformityDate <= d.date && item.conformityDate <= hoyOrden(), "Servicio y a medida exigen nombre y fecha de conformidad válida por partida.");
    } else exigir(item.warehouseId !== null && item.conformityName === null && item.conformityDate === null, "El bien físico requiere bodega y no registra conformidad de prestación.");
  }
  const comerciales = [...new Set(d.lines.map(x => lines.find(l => l.id === x.workOrderLineId)!.salesOrderDetailId!))];
  const entregas = await tx.deliveryNoteLine.findMany({ where: { salesOrderDetailId: { in: comerciales }, deliveryNote: { schemaVersion: 1 } },
    select: { salesOrderDetailId: true, quantity: true, deliveryNote: { select: { kind: true } } } });
  const records = await tx.productionRecord.findMany({ where: { workOrderId: w.id, workOrderLineId: { in: d.lines.map(x => x.workOrderLineId) } }, select: { id: true, workOrderLineId: true, quantity: true } });
  const reversed = await tx.productionReversal.findMany({ where: { productionRecordId: { in: records.map(r => r.id) } }, select: { productionRecordId: true } });
  for (const id of comerciales) {
    const c = details.find(v => v.id === id)!;
    const before = entregas.filter(v => v.salesOrderDetailId === id).reduce((n, v) => v.deliveryNote.kind === "CORRECCION" ? n.minus(v.quantity) : n.plus(v.quantity), dec(0));
    const selected = d.lines.filter(v => lines.find(l => l.id === v.workOrderLineId)?.salesOrderDetailId === id).reduce((n, v) => n.plus(v.quantity), dec(0));
    exigir(before.gte(0) && before.plus(selected).lte(c.quantity), "La guía excede la cantidad pendiente contratada.");
    const l = lines.find(v => v.salesOrderDetailId === id)!;
    if (["SERVICIO", "A_MEDIDA"].includes(l.executionMode)) {
      const executed = records.filter(r => r.workOrderLineId === l.id && !reversed.some(v => v.productionRecordId === r.id)).reduce((n, r) => n.plus(r.quantity), dec(0));
      exigir(before.plus(selected).lte(executed), "La prestación supera la ejecución neta confirmada.");
    }
  }
  const physical = d.lines.map(item => ({ item, line: lines.find(l => l.id === item.workOrderLineId)! })).filter(x => x.item.warehouseId !== null);
  const rawIds = [...new Set(physical.flatMap(x => x.line.rawMaterialId === null ? [] : [x.line.rawMaterialId]))].sort((a, b) => a - b);
  const productIds = [...new Set(physical.flatMap(x => x.line.productId === null ? [] : [x.line.productId]))].sort((a, b) => a - b);
  if (bloquear) {
    for (const id of rawIds) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
    for (const id of productIds) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
  }
  const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, deletedAt: true } });
  exigir(products.every(p => !p.deletedAt) && products.length === productIds.length, "El producto está archivado o no existe.");
  const warehouses = [...new Set(physical.map(x => x.item.warehouseId!))].sort((a, b) => a - b);
  if (bloquear) for (const id of warehouses) await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
  const wh = await tx.warehouse.findMany({ where: { id: { in: warehouses } }, select: { id: true, classification: true } });
  const rawPairs = physical.filter(x => x.line.rawMaterialId !== null).map(x => ({ rawMaterialId: x.line.rawMaterialId!, warehouseId: x.item.warehouseId! }));
  const productPairs = physical.filter(x => x.line.productId !== null).map(x => ({ productId: x.line.productId!, warehouseId: x.item.warehouseId! }));
  const rawStock = await tx.warehouseStock.findMany({ where: { OR: rawPairs.length ? rawPairs : [{ id: -1 }] }, orderBy: { id: "asc" } });
  const productStock = await tx.productWarehouseStock.findMany({ where: { OR: productPairs.length ? productPairs : [{ id: -1 }] }, orderBy: { id: "asc" } });
  if (bloquear) {
    for (const row of rawStock) await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${row.id} FOR UPDATE`;
    for (const row of productStock) await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE id=${row.id} FOR UPDATE`;
  }
  const result = [];
  for (const { item, line } of physical) {
    const warehouseId = item.warehouseId!;
    const b = wh.find(x => x.id === warehouseId);
    exigir(b && (line.productId !== null ? ["PRODUCTO_TERMINADO", "MIXTA"].includes(b.classification ?? "") : ["MATERIA_PRIMA", "MIXTA"].includes(b.classification ?? "")), "La bodega no es compatible con la partida.");
    const stock = line.productId !== null ? productStock.find(x => x.productId === line.productId && x.warehouseId === warehouseId)
      : rawStock.find(x => x.rawMaterialId === line.rawMaterialId && x.warehouseId === warehouseId);
    exigir(stock, "No hay saldo físico en la bodega indicada.");
    const sum = line.productId !== null
      ? (await tx.productStockMovement.aggregate({ where: { productId: line.productId, warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? dec(0)
      : (await tx.stockMovement.aggregate({ where: { rawMaterialId: line.rawMaterialId!, warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? dec(0);
    exigir(stock.quantity.eq(sum), "El saldo no coincide con Kardex; concilia antes de despachar.");
    const allocation = await tx.stockReservationAllocation.findMany({ where: { workOrderLineId: line.id, warehouseId,
      purpose: line.productId !== null ? "ENTREGA_PRODUCTO" : "ENTREGA_DIRECTA_MP", productId: line.productId, rawMaterialId: line.rawMaterialId }, orderBy: { id: "asc" } });
    const active = [];
    for (const a of allocation) {
      const [row] = await tx.$queryRaw<{ quantity: string }[]>`SELECT public.reserva_activa_asignacion(${a.id})::text AS quantity`;
      active.push({ id: a.id, quantity: dec(row.quantity) });
    }
    const own = active.reduce((n, a) => n.plus(a.quantity), dec(0));
    const [res] = await tx.$queryRaw<{ quantity: string }[]>`SELECT public.reserva_activa_recurso(${line.rawMaterialId},${line.productId},${warehouseId})::text AS quantity`;
    const total = dec(res.quantity);
    exigir(total.lte(stock.quantity) && own.gte(item.quantity) && stock.quantity.gte(item.quantity), "Stock o reserva propia insuficiente para confirmar la salida.");
    result.push({ item, line, active, stockQuantity: stock.quantity.toFixed(3) });
  }
  return { w, s, lines, emisor, cliente, destino, physical: result };
}

export async function previsualizarGuiaDespacho(input: unknown) {
  await exigirAcceso("guias.operar");

  const p = guiaDespachoSchema.safeParse(input);
  if (!p.success) return { ok: false as const, mensaje: p.error.issues[0].message };
  try { return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "guias.operar");

    const v = await contexto(tx, p.data, false);
    return { ok: true as const, preview: { workOrderId: v.w.id, version: v.w.version, salesOrderId: v.s.id,
      cliente: v.s.clientName, sucursal: v.destino, date: p.data.date,
      lines: p.data.lines.map(x => ({ ...x, descripcion: v.lines.find(l => l.id === x.workOrderLineId)!.description })),
      aviso: "Confirmar acredita la entrega y descuenta stock. Los datos se volverán a comprobar bajo bloqueo." } };
  }, { isolationLevel: "RepeatableRead", timeout: 30_000 }); }
  catch (e) { return fallo(e) ?? { ok: false as const, mensaje: "No se pudo validar la previsualización. Actualiza y reintenta." }; }
}

export async function registrarGuiaDespacho(input: unknown, clave: unknown) {
  await exigirAcceso("guias.operar");

  const p = guiaDespachoSchema.safeParse(input), k = z.uuid().safeParse(clave);
  if (!p.success || !k.success) return { ok: false as const, mensaje: !p.success ? p.error.issues[0].message : "UUID inválido." };
  const d = p.data, key = k.data.toLowerCase();
  const fingerprint = createHash("sha256").update(JSON.stringify({ type: "DESPACHAR", ...d })).digest("hex");
  try { return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "guias.operar");

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
    const old = await tx.workOrderOperation.findUnique({ where: { idempotencyKey: key } });
    if (old) {
      exigir(old.type === "DESPACHAR" && old.workOrderId === d.workOrderId && old.fingerprint === fingerprint && old.deliveryNoteId,
        "El UUID ya pertenece a otra solicitud.");
      return { ok: true as const, id: old.deliveryNoteId, workOrderId: old.workOrderId, version: old.version, repetida: true };
    }
    exigir(!await tx.documentFolio.findUnique({ where: { idempotencyKey: key } }), "El UUID ya pertenece a otro documento.");
    const v = await contexto(tx, d, true);
    const previous = await tx.workOrderOperation.findUniqueOrThrow({ where: { workOrderId_version: { workOrderId: v.w.id, version: v.w.version } } });
    const folio = await asignarFolio(tx, "GUIA_DESPACHO", key);
    const guide = await tx.deliveryNote.create({ data: { workOrderId: v.w.id, salesOrderId: v.s.id,
      schemaVersion: 1, kind: "ENTREGA", dispatchDate: fecha(d.date), folioId: folio.id, creationKey: key, fingerprint,
      confirmedAt: new Date(), companySnapshot: v.s.companySnapshot as Prisma.InputJsonObject,
      clientSnapshot: v.s.clientSnapshot as Prisma.InputJsonObject, destinationSnapshot: v.destino as Prisma.InputJsonObject,
      note: d.note || null } });
    for (const [index, item] of d.lines.entries()) {
      const line = v.lines.find(l => l.id === item.workOrderLineId)!;
      const created = await tx.deliveryNoteLine.create({ data: { deliveryNoteId: guide.id, workOrderId: v.w.id, salesOrderId: v.s.id,
        workOrderLineId: line.id, salesOrderDetailId: line.salesOrderDetailId!, position: index + 1,
        executionMode: line.executionMode, quantity: item.quantity, unitMeasureId: line.unitMeasureId,
        unitName: line.unitName, unitAbbreviation: line.unitAbbreviation, description: line.description,
        resourceCode: line.code, rawMaterialId: line.rawMaterialId, productId: line.productId,
        warehouseId: item.warehouseId, conformityName: item.conformityName, conformityDate: item.conformityDate ? fecha(item.conformityDate) : null } });
      const physical = v.physical.find(x => x.item === item);
      if (!physical) continue;
      let remaining = dec(item.quantity);
      for (const a of physical.active) {
        if (remaining.isZero()) break;
        const amount = Prisma.Decimal.min(remaining, a.quantity);
        if (amount.gt(0)) {
          await tx.stockReservationEvent.create({ data: { allocationId: a.id, type: "CONSUMIR", quantity: amount,
            reason: `Salida confirmada por guía ${folio.folio}`, deliveryNoteLineId: created.id, operationId: key } });
          remaining = remaining.minus(amount);
        }
      }
      exigir(remaining.isZero(), "La reserva propia cambió antes de registrar la salida.");
      if (line.productId !== null) {
        await tx.productWarehouseStock.update({ where: { warehouseId_productId: { warehouseId: item.warehouseId!, productId: line.productId } },
          data: { quantity: { decrement: item.quantity }, version: { increment: 1 } } });
        await tx.productStockMovement.create({ data: { warehouseId: item.warehouseId!, productId: line.productId, quantity: dec(item.quantity).negated(),
          type: "SALIDA", date: fecha(d.date), note: `Salida por guía ${folio.folio}`, deliveryNoteLineId: created.id } });
      } else {
        await tx.warehouseStock.update({ where: { warehouseId_rawMaterialId: { warehouseId: item.warehouseId!, rawMaterialId: line.rawMaterialId! } },
          data: { quantity: { decrement: item.quantity } } });
        await tx.stockMovement.create({ data: { warehouseId: item.warehouseId!, rawMaterialId: line.rawMaterialId!, quantity: dec(item.quantity).negated(),
          type: "SALIDA", date: inicioDiaChile(d.date), note: `Salida por guía ${folio.folio}`, deliveryNoteLineId: created.id } });
      }
    }
    await tx.workOrder.update({ where: { id: v.w.id }, data: { version: { increment: 1 } } });
    const [snap] = await tx.$queryRaw<{ plan: Prisma.InputJsonValue; reservations: Prisma.InputJsonValue }[]>`
      SELECT public.snapshot_plan_trabajo(${v.w.id}) AS plan, public.snapshot_reservas_trabajo(${v.w.id}) AS reservations`;
    await anotarMutacion(tx, "workOrderOperation", "create", await tx.workOrderOperation.create({ data: { workOrderId: v.w.id, type: "DESPACHAR", version: v.w.version + 1,
      idempotencyKey: key, fingerprint, deliveryNoteId: guide.id,
      beforeSnapshot: previous.afterSnapshot as Prisma.InputJsonValue, afterSnapshot: snap.plan, reservationSnapshot: snap.reservations } }));
    return { ok: true as const, id: guide.id, workOrderId: v.w.id, version: v.w.version + 1, repetida: false };
  }, { maxWait: 10_000, timeout: 60_000 }); }
  catch (e) { const known = fallo(e); if (known) return known; console.error("Error al registrar guía de despacho:", e);
    return { ok: false as const, mensaje: "No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.", incierto: true }; }
}

type Correccion = z.infer<typeof correccionGuiaSchema>;
async function contextoCorreccion(tx: Prisma.TransactionClient, d: Correccion, bloquear: boolean) {
  const g = await tx.deliveryNote.findUnique({ where: { id: d.deliveryNoteId } });
  exigir(g?.schemaVersion === 1 && g.kind === "ENTREGA" && g.salesOrderId && g.dispatchDate, "Selecciona una guía de entrega nueva; no se corrige legado ni otro documento inverso.");
  const s = await tx.salesOrder.findUniqueOrThrow({ where: { id: g.salesOrderId } });
  if (bloquear) {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${s.quoteId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "SalesOrder" WHERE id=${s.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${g.workOrderId} FOR UPDATE`;
  }
  const w = await tx.workOrder.findUniqueOrThrow({ where: { id: g.workOrderId } });
  const orden = await tx.salesOrder.findUniqueOrThrow({ where: { id: s.id } });
  exigir(w.schemaVersion === 1 && w.salesOrderId === orden.id && orden.status === "CONFIRMADA" && ["EN_PROCESO", "FINALIZADO"].includes(w.status), "La corrección exige OCC confirmada y OT comercial iniciada o finalizada.");
  exigir(w.version === d.version, "La OT cambió. Actualiza la guía antes de corregir.");
  exigir(d.date >= g.dispatchDate.toISOString().slice(0, 10) && d.date <= hoyOrden(), "La devolución debe fecharse entre la guía original y hoy en Santiago.");
  const originals = await tx.deliveryNoteLine.findMany({ where: { deliveryNoteId: g.id }, orderBy: { id: "asc" } });
  const corrections = await tx.deliveryNoteLine.findMany({ where: { correctsDeliveryNoteLineId: { in: originals.map(l => l.id) } } });
  const ids = new Set<number>();
  const selected = d.lines.map(item => {
    const line = originals.find(l => l.id === item.deliveryNoteLineId);
    exigir(line && !ids.has(line.id), "Selecciona partidas originales sin repetirlas."); ids.add(line.id);
    const returned = corrections.filter(l => l.correctsDeliveryNoteLineId === line.id).reduce((n, l) => n.plus(l.quantity), dec(0));
    exigir(returned.plus(item.quantity).lte(line.quantity), "La devolución supera la cantidad original aún no corregida.");
    return { item, line };
  });
  const physical = selected.filter(x => x.line.warehouseId !== null);
  exigir(!physical.length || d.physicalRestitutionConfirmed, "Confirma la recepción física de los bienes en la misma bodega de salida. Una devolución comercial sin recepción no repone stock.");
  if (bloquear) {
    for (const id of [...new Set(physical.flatMap(x => x.line.rawMaterialId === null ? [] : [x.line.rawMaterialId]))].sort((a,b) => a-b)) await tx.$queryRaw`SELECT id FROM "RawMaterial" WHERE id=${id} FOR UPDATE`;
    for (const id of [...new Set(physical.flatMap(x => x.line.productId === null ? [] : [x.line.productId]))].sort((a,b) => a-b)) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    for (const id of [...new Set(physical.map(x => x.line.warehouseId!))].sort((a,b) => a-b)) await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id=${id} FOR SHARE`;
    const raw = await tx.warehouseStock.findMany({ where: { OR: physical.flatMap(x => x.line.rawMaterialId === null ? [] : [{ rawMaterialId: x.line.rawMaterialId, warehouseId: x.line.warehouseId! }]) }, orderBy: { id: "asc" } });
    const products = await tx.productWarehouseStock.findMany({ where: { OR: physical.flatMap(x => x.line.productId === null ? [] : [{ productId: x.line.productId, warehouseId: x.line.warehouseId! }]) }, orderBy: { id: "asc" } });
    for (const row of raw) await tx.$queryRaw`SELECT id FROM "WarehouseStock" WHERE id=${row.id} FOR UPDATE`;
    for (const row of products) await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE id=${row.id} FOR UPDATE`;
  }
  const accumulated = new Map<string, Prisma.Decimal>();
  const restitutions = [];
  for (const { item, line } of physical) {
    const warehouseId = line.warehouseId!;
    const stock = line.productId !== null
      ? await tx.productWarehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId, productId: line.productId } } })
      : await tx.warehouseStock.findUnique({ where: { warehouseId_rawMaterialId: { warehouseId, rawMaterialId: line.rawMaterialId! } } });
    const sum = line.productId !== null
      ? (await tx.productStockMovement.aggregate({ where: { productId: line.productId, warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? dec(0)
      : (await tx.stockMovement.aggregate({ where: { rawMaterialId: line.rawMaterialId!, warehouseId }, _sum: { quantity: true } }))._sum.quantity ?? dec(0);
    exigir(stock && stock.quantity.gte(0) && stock.quantity.eq(sum), "El saldo no coincide con Kardex; concilia antes de recibir la devolución.");
    const pair = `${line.productId !== null ? "P" : "M"}/${line.productId ?? line.rawMaterialId}/${warehouseId}`;
    const total = (accumulated.get(pair) ?? dec(0)).plus(item.quantity); accumulated.set(pair, total);
    exigir(stock.quantity.plus(total).lte("99999999999.999"), "La devolución excede la capacidad del saldo de bodega.");
    const events = await tx.stockReservationEvent.findMany({ where: { deliveryNoteLineId: line.id, type: "CONSUMIR" }, orderBy: { id: "asc" } });
    let remaining = dec(item.quantity);
    const allocations = [];
    for (const event of events) {
      const original = await tx.stockReservationAllocation.findUniqueOrThrow({ where: { id: event.allocationId } });
      const restored = (await tx.stockReservationAllocation.aggregate({ where: { restoresReservationEventId: event.id }, _sum: { quantity: true } }))._sum.quantity ?? dec(0);
      const available = event.quantity.minus(restored);
      exigir(available.gte(0), "El historial de restituciones supera el débito original.");
      const amount = Prisma.Decimal.min(remaining, available);
      if (amount.gt(0)) { allocations.push({ eventId: event.id, original, quantity: amount }); remaining = remaining.minus(amount); }
    }
    exigir(remaining.isZero(), "No se encontró reserva consumida suficiente para reconstruir la devolución.");
    restitutions.push({ lineId: line.id, allocations });
  }
  return { g, w, selected, restitutions };
}

export async function previsualizarCorreccionGuia(input: unknown) {
  await exigirAcceso("guias.operar");

  const p = correccionGuiaSchema.safeParse(input);
  if (!p.success) return { ok: false as const, mensaje: p.error.issues[0].message };
  try { return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "guias.operar");

    const v = await contextoCorreccion(tx, p.data, false);
    return { ok: true as const, preview: { workOrderId: v.w.id, version: v.w.version,
      lines: v.selected.map(({ line, item }) => ({ id: line.id, descripcion: line.description, quantity: item.quantity, unidad: line.unitAbbreviation, warehouseId: line.warehouseId })),
      aviso: "Se emitirá una corrección con folio propio. Los bienes recibidos reponen stock y reserva propia. La deuda, factura y pagos se conservan." } };
  }, { isolationLevel: "RepeatableRead", timeout: 30_000 }); }
  catch (e) { return fallo(e) ?? { ok: false as const, mensaje: "No se pudo preparar la corrección. Actualiza y reintenta." }; }
}

export async function corregirGuiaDespacho(input: unknown, clave: unknown) {
  await exigirAcceso("guias.operar");

  const p = correccionGuiaSchema.safeParse(input), k = z.uuid().safeParse(clave);
  if (!p.success || !k.success) return { ok: false as const, mensaje: !p.success ? p.error.issues[0].message : "UUID inválido." };
  const d = p.data, key = k.data.toLowerCase();
  const fingerprint = createHash("sha256").update(JSON.stringify({ type: "CORREGIR_DESPACHO", ...d })).digest("hex");
  try { return await prisma.$transaction(async tx => {
      await exigirAccesoEnTransaccion(tx, "guias.operar");

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},91357))`;
    const old = await tx.workOrderOperation.findUnique({ where: { idempotencyKey: key } });
    if (old) {
      const guide = old.deliveryNoteId ? await tx.deliveryNote.findUnique({ where: { id: old.deliveryNoteId } }) : null;
      exigir(old.type === "CORREGIR_DESPACHO" && old.fingerprint === fingerprint && guide?.correctsDeliveryNoteId === d.deliveryNoteId, "El UUID ya pertenece a otra solicitud.");
      return { ok: true as const, id: guide.id, workOrderId: old.workOrderId, version: old.version, repetida: true };
    }
    exigir(!await tx.documentFolio.findUnique({ where: { idempotencyKey: key } }), "El UUID ya pertenece a otro documento.");
    const v = await contextoCorreccion(tx, d, true);
    const previous = await tx.workOrderOperation.findUniqueOrThrow({ where: { workOrderId_version: { workOrderId: v.w.id, version: v.w.version } } });
    const folio = await asignarFolio(tx, "GUIA_DESPACHO", key);
    const guide = await tx.deliveryNote.create({ data: { workOrderId: v.w.id, salesOrderId: v.g.salesOrderId,
      schemaVersion: 1, kind: "CORRECCION", dispatchDate: fecha(d.date), folioId: folio.id, creationKey: key, fingerprint,
      confirmedAt: new Date(), companySnapshot: v.g.companySnapshot as Prisma.InputJsonObject,
      clientSnapshot: v.g.clientSnapshot as Prisma.InputJsonObject, destinationSnapshot: v.g.destinationSnapshot as Prisma.InputJsonObject,
      correctsDeliveryNoteId: v.g.id, correctionReason: d.reason, physicalRestitutionConfirmed: d.physicalRestitutionConfirmed } });
    for (const [index, { line, item }] of v.selected.entries()) {
      const created = await tx.deliveryNoteLine.create({ data: { deliveryNoteId: guide.id, workOrderId: v.w.id, salesOrderId: line.salesOrderId,
        workOrderLineId: line.workOrderLineId, salesOrderDetailId: line.salesOrderDetailId, position: index + 1,
        executionMode: line.executionMode, quantity: item.quantity, unitMeasureId: line.unitMeasureId, unitName: line.unitName,
        unitAbbreviation: line.unitAbbreviation, description: line.description, resourceCode: line.resourceCode,
        rawMaterialId: line.rawMaterialId, productId: line.productId, warehouseId: line.warehouseId,
        correctsDeliveryNoteLineId: line.id } });
      if (line.warehouseId === null) continue;
      if (line.productId !== null) {
        await tx.productWarehouseStock.update({ where: { warehouseId_productId: { warehouseId: line.warehouseId, productId: line.productId } }, data: { quantity: { increment: item.quantity }, version: { increment: 1 } } });
        await tx.productStockMovement.create({ data: { warehouseId: line.warehouseId, productId: line.productId, quantity: item.quantity, type: "AJUSTE", date: fecha(d.date), note: `Devolución por guía ${folio.folio}: ${d.reason}`, deliveryNoteLineId: created.id } });
      } else {
        await tx.warehouseStock.update({ where: { warehouseId_rawMaterialId: { warehouseId: line.warehouseId, rawMaterialId: line.rawMaterialId! } }, data: { quantity: { increment: item.quantity } } });
        await tx.stockMovement.create({ data: { warehouseId: line.warehouseId, rawMaterialId: line.rawMaterialId!, quantity: item.quantity, type: "AJUSTE", date: inicioDiaChile(d.date), note: `Devolución por guía ${folio.folio}: ${d.reason}`, deliveryNoteLineId: created.id } });
      }
      for (const { eventId, original: a, quantity } of v.restitutions.find(x => x.lineId === line.id)!.allocations) {
        await tx.stockReservationAllocation.create({ data: { workOrderId: a.workOrderId, workOrderLineId: a.workOrderLineId,
          purpose: a.purpose, warehouseId: a.warehouseId, rawMaterialId: a.rawMaterialId, productId: a.productId,
          unitMeasureId: a.unitMeasureId, resourceCode: a.resourceCode, resourceName: a.resourceName, unitName: a.unitName,
          unitAbbreviation: a.unitAbbreviation, quantity, plannedDetailId: a.plannedDetailId, supplyPlanId: a.supplyPlanId,
          productionOutputId: a.productionOutputId, operationId: key, restoresReservationEventId: eventId, correctionDeliveryNoteLineId: created.id } });
      }
    }
    await tx.workOrder.update({ where: { id: v.w.id }, data: { version: { increment: 1 } } });
    const [snap] = await tx.$queryRaw<{ plan: Prisma.InputJsonValue; reservations: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${v.w.id}) AS plan, public.snapshot_reservas_trabajo(${v.w.id}) AS reservations`;
    await anotarMutacion(tx, "workOrderOperation", "create", await tx.workOrderOperation.create({ data: { workOrderId: v.w.id, type: "CORREGIR_DESPACHO", version: v.w.version + 1,
      idempotencyKey: key, fingerprint, deliveryNoteId: guide.id, reason: d.reason,
      beforeSnapshot: previous.afterSnapshot as Prisma.InputJsonValue, afterSnapshot: snap.plan, reservationSnapshot: snap.reservations } }));
    return { ok: true as const, id: guide.id, workOrderId: v.w.id, version: v.w.version + 1, repetida: false };
  }, { maxWait: 10_000, timeout: 60_000 }); }
  catch (e) { const known = fallo(e); if (known) return known; console.error("Error al corregir guía de despacho:", e);
    return { ok: false as const, mensaje: "No se pudo comprobar el resultado. Reintenta sin cambiar los datos ni el UUID.", incierto: true }; }
}
