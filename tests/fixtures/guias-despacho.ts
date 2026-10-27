import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../src/generated/prisma/client";
import { prisma } from "../../src/lib/prisma";
import { guardarCotizacion } from "../../src/lib/servicios/cotizaciones";
import { registrarOrdenCompraCliente, hoyOrden } from "../../src/lib/servicios/ordenes-compra-cliente";
import { guardarPlanTrabajo, iniciarTrabajo } from "../../src/lib/servicios/ordenes-trabajo";
import { consultarTrabajo, prepararTrabajoComercial } from "../../src/lib/consultas/ordenes-trabajo";
import { registrarProduccion } from "../../src/lib/servicios/produccion";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../../src/lib/servicios/ajustes-inventario";
import { consultarSaldoTerminado, registrarInicialTerminado } from "../../src/lib/servicios/stock-terminado";
import { documentoVacioCotizacion } from "../../src/lib/validaciones/texto-cotizacion";
import type { DatosGuiaDespacho } from "../../src/lib/validaciones/guia-despacho";
export function exigirCopiaG6() {
  const u = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(u.hostname) && /^\/mtx_validacion_(?:guias_g6|seguridad_s5)_\d{8}$/.test(u.pathname), "Sólo copia local descartable G6/S5");
}
export function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> { assert(r.ok, JSON.stringify(r)); return r as Extract<T, { ok: true }>; }
export const uuid = () => randomUUID();
export const fechaBase = "2026-09-01";
export type ModoG6 = "PRODUCTO" | "MATERIA_PRIMA" | "SERVICIO" | "A_MEDIDA";
export async function crearEntornoGuiasG6() {
  exigirCopiaG6();
  const unidad = await prisma.unitMeasure.create({ data: { name: `Unidad G6 ${uuid()}`, abbreviation: "un" } });
  const peso = await prisma.unitMeasure.create({ data: { name: `Peso G6 ${uuid()}`, abbreviation: "kg" } });
  const hora = await prisma.unitMeasure.create({ data: { name: `Hora G6 ${uuid()}`, abbreviation: "h" } });
  const material = await prisma.rawMaterial.create({ data: { name: "Material de pruebas G6", code: `G6-${uuid()}`, unitMeasureId: peso.id } });
  const producto = await prisma.product.create({ data: { name: `Producto G6 ${uuid()}`, unitMeasureId: unidad.id, creationKey: uuid(), creationFingerprint: "f".repeat(64) } });
  await prisma.productRecipe.create({ data: { productId: producto.id, rawMaterialId: material.id, quantity: "2" } });
  const mp = await prisma.warehouse.create({ data: { name: `Insumos G6 ${uuid()}`, classification: "MATERIA_PRIMA" } });
  const pt = await prisma.warehouse.create({ data: { name: `Terminados G6 ${uuid()}`, classification: "PRODUCTO_TERMINADO" } });
  const otra = await prisma.warehouse.create({ data: { name: `Alternativa G6 ${uuid()}`, classification: "MIXTA" } });
  for (const b of [mp, otra]) {
    const ref = ok(await consultarSaldoAjuste({ rawMaterialId: material.id, unitMeasureId: peso.id, warehouseId: b.id }));
    ok(await registrarAjusteInventario({ rawMaterialId: material.id, unitMeasureId: peso.id, warehouseId: b.id, finalQuantity: "1000", date: fechaBase, reason: "INVENTARIO_INICIAL", note: "Saldo inicial de prueba G6", correctedAdjustmentId: null, idempotencyKey: uuid(), reference: ref.referencia }));
    await prisma.warehouseStock.update({ where: { warehouseId_rawMaterialId: { warehouseId: b.id, rawMaterialId: material.id } }, data: { minStock: b.id === mp.id ? "7" : "3" } });
  }
  const ref = ok(await consultarSaldoTerminado({ productId: producto.id, unitMeasureId: unidad.id, productVersion: producto.version, warehouseId: pt.id }));
  ok(await registrarInicialTerminado({ productId: producto.id, unitMeasureId: unidad.id, productVersion: producto.version, warehouseId: pt.id, quantity: "100", date: fechaBase, note: "Terminado desde stock para G6", idempotencyKey: uuid(), reference: ref.referencia }));
  for (const type of ["COTIZACION", "ORDEN_COMPRA_CLIENTE", "ORDEN_TRABAJO", "GUIA_DESPACHO"] as const) {
    const n = await prisma.documentNumbering.findUniqueOrThrow({ where: { type } });
    if (n.nextNumber === null) await prisma.documentNumbering.update({ where: { id: n.id }, data: { nextNumber: 1, padding: 5, version: { increment: 1 } } });
  }
  const cliente = await prisma.quote.findFirstOrThrow();
  async function crear(modos: ModoG6[] = ["MATERIA_PRIMA"], opciones: { cantidad?: string; iniciar?: boolean; fabricar?: string; reservasEnDosBodegas?: boolean; condicionPagoId?: number } = {}) {
    const quantity = opciones.cantidad ?? "2";
    const quote = ok(await guardarCotizacion({ date: fechaBase, validUntil: null, clientId: cliente.clientId, clientBranchId: cliente.clientBranchId, paymentConditionId: opciones.condicionPagoId ?? cliente.paymentConditionId, bankAccountId: null, discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion,
      lines: modos.map((modo,i) => ({ kind: modo === "A_MEDIDA" ? "SERVICIO" : modo, productId: modo === "PRODUCTO" ? producto.id : null, rawMaterialId: modo === "MATERIA_PRIMA" ? material.id : null,
        unitMeasureId: modo === "PRODUCTO" ? unidad.id : modo === "MATERIA_PRIMA" ? peso.id : hora.id, description: `Partida ${i+1} ${modo} G6`, quantity, unitPrice: "100" })) }, uuid()));
    const details = await prisma.quoteDetail.findMany({ where: { quoteId: quote.id }, orderBy: { position: "asc" } });
    const sale = ok(await registrarOrdenCompraCliente({ quoteId: quote.id, quoteVersion: quote.version, date: fechaBase, customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null, technicalDescription: documentoVacioCotizacion, scopeReviewed: true, lines: details.map(d => ({ quoteDetailId: d.id, quantity })) }, uuid()));
    const prepared = await prepararTrabajoComercial(sale.id);
    const saved = ok(await guardarPlanTrabajo({ ...prepared.plan, date: fechaBase, productName: `Validación G6 ${uuid()}`, confirmPlan: true, lines: prepared.plan.lines.map((l,i) => {
      const fabricar = modos[i] === "PRODUCTO" ? opciones.fabricar ?? quantity : "0";
      const stock = modos[i] === "PRODUCTO" ? new Prisma.Decimal(quantity).minus(fabricar) : modos[i] === "MATERIA_PRIMA" ? new Prisma.Decimal(quantity) : new Prisma.Decimal(0);
      return { ...l, executionMode: modos[i] === "A_MEDIDA" ? "A_MEDIDA" : l.executionMode, quantityToProduce: fabricar,
        materials: (modos[i] === "PRODUCTO" && new Prisma.Decimal(fabricar).gt(0)) || modos[i] === "A_MEDIDA" ? [{ rawMaterialId: material.id, warehouseId: mp.id, quantity: new Prisma.Decimal(modos[i] === "A_MEDIDA" ? quantity : fabricar).times(2).toFixed(3) }] : [],
        supplies: stock.gt(0) ? opciones.reservasEnDosBodegas ? [{ warehouseId: mp.id, quantity: stock.div(2).toFixed(3) }, { warehouseId: otra.id, quantity: stock.div(2).toFixed(3) }] : [{ warehouseId: modos[i] === "PRODUCTO" ? pt.id : mp.id, quantity: stock.toFixed(3) }] : [] };
    }) }, uuid()));
    if (opciones.iniciar !== false) ok(await iniciarTrabajo({ workOrderId: saved.id, version: saved.version, startedDate: fechaBase }, uuid()));
    return consultarTrabajo(saved.id);
  }
  async function producir(w: Awaited<ReturnType<typeof consultarTrabajo>>, cantidad?: string) {
    for (const l of w.plan!.lines) {
      if (l.executionMode === "VENTA_DIRECTA_MP" || (l.executionMode === "CATALOGO" && new Prisma.Decimal(l.quantityToProduce).isZero())) continue;
      const q = cantidad ?? (l.executionMode === "CATALOGO" ? l.quantityToProduce : l.quantity);
      ok(await registrarProduccion({ workOrderId: w.id, version: w.version, workOrderLineId: l.id!, date: fechaBase, quantity: q,
        warehouseId: l.executionMode === "CATALOGO" ? pt.id : null, note: "Ejecución de prueba G6", deviationReason: "", roundingReviews: [],
        consumptions: l.executionMode === "SERVICIO" ? [] : [{ rawMaterialId: material.id, warehouseId: mp.id, unitMeasureId: peso.id, quantity: new Prisma.Decimal(q).times(2).toFixed(3) }] }, uuid()));
      w = await consultarTrabajo(w.id);
    }
    return w;
  }
  function salida(w: Awaited<ReturnType<typeof consultarTrabajo>>, cantidad = "1", date = hoyOrden()): DatosGuiaDespacho {
    return { workOrderId: w.id, version: w.version, date, note: "Salida de prueba G6", lines: w.plan!.lines.map(l => ({ workOrderLineId: l.id!, warehouseId: l.executionMode === "CATALOGO" ? pt.id : l.executionMode === "VENTA_DIRECTA_MP" ? mp.id : null, quantity: cantidad,
      conformityName: ["SERVICIO","A_MEDIDA"].includes(l.executionMode) ? "Receptor de prueba G6" : null, conformityDate: ["SERVICIO","A_MEDIDA"].includes(l.executionMode) ? date : null })) };
  }
  async function invariantes() {
    for (const b of [mp, otra]) {
      const s = await prisma.warehouseStock.findUniqueOrThrow({ where: { warehouseId_rawMaterialId: { warehouseId: b.id, rawMaterialId: material.id } } });
      const sum = (await prisma.stockMovement.aggregate({ where: { warehouseId: b.id, rawMaterialId: material.id }, _sum: { quantity: true } }))._sum.quantity!;
      assert(s.quantity.eq(sum) && s.quantity.gte(0)); assert(s.minStock!.eq(b.id === mp.id ? "7" : "3"));
      const [r] = await prisma.$queryRaw<{ q: string }[]>`SELECT public.reserva_activa_recurso(${material.id},NULL,${b.id})::text AS q`;
      assert(s.quantity.gte(r.q));
    }
    const s = await prisma.productWarehouseStock.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: pt.id, productId: producto.id } } });
    const sum = (await prisma.productStockMovement.aggregate({ where: { warehouseId: pt.id, productId: producto.id }, _sum: { quantity: true } }))._sum.quantity!;
    assert(s.quantity.eq(sum) && s.quantity.gte(0));
    const [r] = await prisma.$queryRaw<{ q: string }[]>`SELECT public.reserva_activa_recurso(NULL,${producto.id},${pt.id})::text AS q`;
    assert(s.quantity.gte(r.q));
  }
  return { unidad, peso, hora, material, producto, mp, pt, otra, crear, producir, salida, invariantes };
}
/** Huella de datos de negocio sin comparar secuencias SERIAL (sus huecos son legítimos). */
export async function huellaGuiasG6() {
  exigirCopiaG6();
  const tablas = ["DeliveryNote","DeliveryNoteLine","DocumentFolio","DocumentNumbering","WorkOrder","WorkOrderOperation","StockReservationAllocation","StockReservationEvent","WarehouseStock","StockMovement","ProductWarehouseStock","ProductStockMovement","ProductionRecord","ProductionConsumption","ProductionOutput","ProductionReversal","AccountReceivable","Payment","InventoryAdjustment","InventoryTransfer","InventoryOperation"];
  const sql = tablas.map(t => `SELECT '${t}' AS tabla, count(*)::text AS filas, md5(coalesce(string_agg(to_jsonb(r)::text,'' ORDER BY to_jsonb(r)::text),'')) AS huella FROM "${t}" r`).join(" UNION ALL ");
  return JSON.stringify(await prisma.$transaction(tx => tx.$queryRawUnsafe(sql), { isolationLevel: "RepeatableRead" }));
}
