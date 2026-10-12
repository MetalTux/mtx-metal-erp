import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { combinacionTerminadoSchema, inicialTerminadoSchema, ajusteTerminadoSchema, hoyChile } from "@/lib/validaciones/stock-terminado";
import type { ResultadoSaldoTerminado, ResultadoInicialTerminado } from "@/lib/tipos/stock-terminado";
class ReglaTerminado extends Error {}
function exigir(valor: unknown, mensaje: string): asserts valor { if (!valor) throw new ReglaTerminado(mensaje); }
function fallo(error: unknown) {
  if (error instanceof ReglaTerminado) return { ok: false as const, mensaje: error.message };
  console.error("Error de inventario de producto terminado:", error);
  return { ok: false as const, mensaje: "No se pudo registrar la operación. Conserva el formulario y reintenta con los mismos datos." };
}
async function saldo(tx: Prisma.TransactionClient, productId: number, warehouseId: number) {
  const stock = await tx.productWarehouseStock.findUnique({ where: { warehouseId_productId: { productId, warehouseId } } });
  const ultimo = await tx.productStockMovement.findFirst({ where: { productId, warehouseId }, orderBy: { id: "desc" }, select: { id: true } });
  return { stock, referencia: { stockId: stock?.id ?? null, version: stock?.version ?? null, quantity: stock?.quantity.toString() ?? "0", lastMovementId: ultimo?.id ?? null } };
}
async function validarReferencias(tx: Prisma.TransactionClient, d: { productId: number; warehouseId: number; unitMeasureId: number; productVersion: number }) {
  const producto = await tx.product.findUnique({ where: { id: d.productId, deletedAt: null } });
  exigir(producto && producto.unitMeasureId === d.unitMeasureId && producto.version === d.productVersion, "El producto o su unidad cambió. Actualiza el listado y vuelve a seleccionarlo.");
  const bodega = await tx.warehouse.findUnique({ where: { id: d.warehouseId } });
  exigir(bodega && ["MIXTA", "PRODUCTO_TERMINADO"].includes(bodega.classification ?? ""), "Selecciona una bodega Mixta o Producto terminado.");
  return producto;
}
/** Consultar no crea saldo ni documentos; conserva versión e ID de último movimiento. */
export async function consultarSaldoTerminado(entrada: unknown): Promise<ResultadoSaldoTerminado> {
  const v = combinacionTerminadoSchema.safeParse(entrada);
  if (!v.success) return { ok: false, mensaje: "Selecciona un producto y una bodega válidos." };
  try {
    return await prisma.$transaction(async tx => {
      await validarReferencias(tx, v.data);
      const s = await saldo(tx, v.data.productId, v.data.warehouseId);
      const iniciales = await tx.productInitialStock.findMany({ where: { productId: v.data.productId, warehouseId: v.data.warehouseId }, orderBy: { id: "desc" } });
      const ajustes = await tx.productInventoryAdjustment.findMany({ where: { productId: v.data.productId, warehouseId: v.data.warehouseId }, orderBy: { id: "desc" } });
      return { ok: true, referencia: s.referencia, puedeAjustar: Boolean(s.stock && s.referencia.lastMovementId), origenes: [
        ...iniciales.map(d => ({ tipo: "inicial" as const, id: d.id, etiqueta: `Inventario inicial #${d.id} · ${d.date.toISOString().slice(0, 10)}` })),
        ...ajustes.map(d => ({ tipo: "ajuste" as const, id: d.id, etiqueta: `Ajuste #${d.id} · ${d.date.toISOString().slice(0, 10)}` })),
      ], puedeInicial: !s.referencia.lastMovementId && new Prisma.Decimal(s.referencia.quantity).isZero() };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) { return fallo(error); }
}
export async function registrarInicialTerminado(entrada: unknown): Promise<ResultadoInicialTerminado> {
  const v = inicialTerminadoSchema.safeParse(entrada);
  if (!v.success) return { ok: false, mensaje: v.error.issues[0].message };
  const d = v.data, cantidad = new Prisma.Decimal(d.quantity);
  // La huella conserva también el saldo revisado: un UUID no puede aceptar un contenido distinto.
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...d, idempotencyKey: undefined, quantity: cantidad.toFixed(3), reference: { ...d.reference, quantity: new Prisma.Decimal(d.reference.quantity).toFixed(3) } })).digest("hex");
  try {
    return await prisma.$transaction(async tx => {
      // UUID → producto → bodega → stock. Consultas secuenciales en un único cliente pg.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey.toLowerCase()}, 72114))`;
      const anterior = await tx.productInventoryOperation.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
      if (anterior) {
        exigir(anterior.fingerprint === fingerprint && anterior.initialStockId !== null, "La clave de operación ya se utilizó con datos diferentes.");
        return { ok: true, mensaje: "Inventario inicial ya registrado; reintento reconocido.", documentoId: anterior.initialStockId };
      }
      exigir(d.date <= hoyChile(), "No se permiten fechas futuras.");
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${d.productId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id = ${d.warehouseId} FOR SHARE`;
      const producto = await validarReferencias(tx, d);
      const s = await saldo(tx, d.productId, d.warehouseId);
      if (s.stock) await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE id = ${s.stock.id} FOR UPDATE`;
      exigir(s.referencia.stockId === d.reference.stockId && s.referencia.version === d.reference.version && s.referencia.lastMovementId === d.reference.lastMovementId && new Prisma.Decimal(s.referencia.quantity).equals(d.reference.quantity), "El saldo cambió desde la revisión. Consulta nuevamente antes de confirmar.");
      const kardex = await tx.productStockMovement.aggregate({ where: { productId: d.productId, warehouseId: d.warehouseId }, _sum: { quantity: true } });
      exigir(new Prisma.Decimal(s.referencia.quantity).equals(kardex._sum.quantity ?? 0), "El saldo no coincide con sus movimientos. Revisa la incidencia antes de ingresar.");
      exigir(!s.referencia.lastMovementId && new Prisma.Decimal(s.referencia.quantity).isZero(), "Esta combinación ya tiene movimientos o stock. No se puede repetir la carga inicial; las correcciones requieren un ajuste posterior.");
      // Cero no crea documentos, saldos ni UUID: no se registra una entrada inexistente.
      if (cantidad.isZero()) return { ok: true, mensaje: "Saldo inicial cero: no se generaron documentos ni movimientos." };
      const unidad = await tx.unitMeasure.findUniqueOrThrow({ where: { id: producto.unitMeasureId } });
      const documento = await tx.productInitialStock.create({ data: { productId: producto.id, warehouseId: d.warehouseId, unitMeasureId: unidad.id, quantity: cantidad, date: new Date(`${d.date}T00:00:00Z`), note: d.note, productCode: producto.code, productName: producto.name, unitName: unidad.name, unitAbbreviation: unidad.abbreviation } });
      if (s.stock) await tx.productWarehouseStock.update({ where: { id: s.stock.id }, data: { quantity: cantidad, version: { increment: 1 } } });
      else await tx.productWarehouseStock.create({ data: { productId: producto.id, warehouseId: d.warehouseId, quantity: cantidad } });
      await tx.productStockMovement.create({ data: { productId: producto.id, warehouseId: d.warehouseId, initialStockId: documento.id, type: "ENTRADA", quantity: cantidad, date: documento.date, note: d.note } });
      await tx.productInventoryOperation.create({ data: { idempotencyKey: d.idempotencyKey, fingerprint, initialStockId: documento.id } });
      return { ok: true, mensaje: "Inventario inicial de producto terminado registrado.", documentoId: documento.id };
    }, { timeout: 20000 });
  } catch (error) { return fallo(error); }
}

/** Conserva el ingreso y corrige el saldo físico actual, sin consumir receta ni revertir a ciegas. */
export async function registrarAjusteTerminado(entrada: unknown): Promise<ResultadoInicialTerminado> {
  const v = ajusteTerminadoSchema.safeParse(entrada);
  if (!v.success) return { ok: false, mensaje: v.error.issues[0].message };
  const d = v.data;
  const final = new Prisma.Decimal(d.finalQuantity);
  const fingerprint = createHash("sha256").update(JSON.stringify({ ...d,
    idempotencyKey: undefined, finalQuantity: final.toFixed(3),
    reference: { ...d.reference, quantity: new Prisma.Decimal(d.reference.quantity).toFixed(3) },
  })).digest("hex");
  try {
    return await prisma.$transaction(async tx => {
      // Comparte orden y espacio de UUID con el inicial: no reutilizar claves entre operaciones.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${d.idempotencyKey.toLowerCase()}, 72114))`;
      const previa = await tx.productInventoryOperation.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
      if (previa) {
        exigir(previa.fingerprint === fingerprint && previa.adjustmentId !== null, "La clave de operación ya se utilizó con datos diferentes.");
        return { ok: true, mensaje: "Ajuste ya registrado; reintento reconocido.", documentoId: previa.adjustmentId };
      }
      exigir(d.date <= hoyChile(), "No se permiten fechas futuras.");
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${d.productId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Warehouse" WHERE id = ${d.warehouseId} FOR SHARE`;
      const producto = await validarReferencias(tx, d);
      const s = await saldo(tx, d.productId, d.warehouseId);
      exigir(s.stock && s.referencia.lastMovementId, "Registra primero el inventario inicial de esta combinación antes de ajustar.");
      await tx.$queryRaw`SELECT id FROM "ProductWarehouseStock" WHERE id = ${s.stock.id} FOR UPDATE`;
      exigir(s.referencia.stockId === d.reference.stockId && s.referencia.version === d.reference.version &&
        s.referencia.lastMovementId === d.reference.lastMovementId && new Prisma.Decimal(s.referencia.quantity).equals(d.reference.quantity),
        "El saldo cambió desde la revisión. Consulta nuevamente antes de confirmar.");
      const suma = await tx.productStockMovement.aggregate({ where: { productId: d.productId, warehouseId: d.warehouseId }, _sum: { quantity: true } });
      exigir(s.stock.quantity.equals(suma._sum.quantity ?? 0), "El saldo no coincide con sus movimientos. Revisa la incidencia antes de ajustar.");
      const diferencia = final.minus(s.stock.quantity);
      if (d.correctedInitialStockId !== null) {
        const origen = await tx.productInitialStock.findUnique({ where: { id: d.correctedInitialStockId } });
        exigir(origen?.productId === d.productId && origen.warehouseId === d.warehouseId, "El inventario inicial corregido debe pertenecer al mismo producto y bodega.");
      }
      if (d.correctedAdjustmentId !== null) {
        const origen = await tx.productInventoryAdjustment.findUnique({ where: { id: d.correctedAdjustmentId } });
        exigir(origen?.productId === d.productId && origen.warehouseId === d.warehouseId, "El ajuste corregido debe pertenecer al mismo producto y bodega.");
      }
      // Un conteo idéntico no genera acta, movimiento ni UUID, igual que en materia prima.
      if (diferencia.isZero()) return { ok: true, mensaje: "No hay diferencias. No se generó ajuste ni movimiento." };
      const unidad = await tx.unitMeasure.findUniqueOrThrow({ where: { id: producto.unitMeasureId } });
      const documento = await tx.productInventoryAdjustment.create({ data: {
        productId: d.productId, warehouseId: d.warehouseId, unitMeasureId: unidad.id,
        previousQuantity: s.stock.quantity, finalQuantity: final, quantity: diferencia,
        reason: d.reason, date: new Date(`${d.date}T00:00:00Z`), note: d.note,
        correctedInitialStockId: d.correctedInitialStockId, correctedAdjustmentId: d.correctedAdjustmentId,
        productCode: producto.code, productName: producto.name, unitName: unidad.name, unitAbbreviation: unidad.abbreviation,
      } });
      await tx.productWarehouseStock.update({ where: { id: s.stock.id }, data: { quantity: final, version: { increment: 1 } } });
      await tx.productStockMovement.create({ data: {
        productId: d.productId, warehouseId: d.warehouseId, adjustmentId: documento.id,
        type: "AJUSTE", quantity: diferencia, date: documento.date, note: d.note,
      } });
      await tx.productInventoryOperation.create({ data: { idempotencyKey: d.idempotencyKey, fingerprint, adjustmentId: documento.id } });
      return { ok: true, mensaje: "Ajuste registrado y existencias actualizadas.", documentoId: documento.id };
    }, { maxWait: 10000, timeout: 20000 });
  } catch (error) { return fallo(error); }
}

/** Vista previa sin escrituras; al confirmar se vuelven a verificar versión y saldo bajo bloqueo. */
export async function prepararAjusteTerminado(entrada: unknown) {
  const v = ajusteTerminadoSchema.safeParse(entrada);
  if (!v.success) return { ok: false as const, mensaje: v.error.issues[0].message };
  if (v.data.date > hoyChile()) return { ok: false as const, mensaje: "No se permiten fechas futuras." };
  const r = await consultarSaldoTerminado(v.data);
  if (!r.ok) return r;
  if (!r.puedeAjustar) return { ok: false as const, mensaje: "Registra primero el inventario inicial de esta combinación antes de ajustar." };
  if (r.referencia.stockId !== v.data.reference.stockId || r.referencia.version !== v.data.reference.version ||
    r.referencia.lastMovementId !== v.data.reference.lastMovementId || !new Prisma.Decimal(r.referencia.quantity).equals(v.data.reference.quantity)) {
    return { ok: false as const, mensaje: "El saldo cambió. Revisa nuevamente antes de confirmar." };
  }
  return { ok: true as const, diferencia: new Prisma.Decimal(v.data.finalQuantity).minus(r.referencia.quantity).toString() };
}
