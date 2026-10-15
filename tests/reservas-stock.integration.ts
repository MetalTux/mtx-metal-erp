import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { asignarFolio } from "../src/lib/servicios/numeracion";
import { completarReservasTrabajo, liberarReservaTrabajo, cantidadReservadaRecurso } from "../src/lib/servicios/reservas-stock";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { consultarSaldosTraslado, registrarTrasladoInventario } from "../src/lib/servicios/traslados-inventario";
import { consultarSaldoTerminado, registrarInicialTerminado, registrarAjusteTerminado } from "../src/lib/servicios/stock-terminado";
import { guardarCompra, consultarCompra, recibirCompra, anularCompra } from "../src/lib/servicios/compras";
import { guardarCotizacion } from "../src/lib/servicios/cotizaciones";
import { hoyOrden, registrarOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { documentoVacioCotizacion } from "../src/lib/validaciones/texto-cotizacion";
import { crearTrabajoComercialDePrueba } from "./fixtures/trabajo-comercial";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost","127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/mtx_validacion_reservas_"), "Sólo copia local descartable");
const key = () => randomUUID();
async function snapshots(tx: Prisma.TransactionClient, id: number) {
  const [s] = await tx.$queryRaw<{ plan: Prisma.InputJsonValue; reservations: Prisma.InputJsonValue }[]>`SELECT public.snapshot_plan_trabajo(${id}) AS plan, public.snapshot_reservas_trabajo(${id}) AS reservations`;
  return s;
}
async function fisico() { return JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.stockMovement.findMany({ orderBy: { id: "asc" } }),
  await prisma.productWarehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.productStockMovement.findMany({ orderBy: { id: "asc" } })]); }

async function main() {
  const unidad = await prisma.unitMeasure.create({ data: { name: `Unidad reservas ${key()}`, abbreviation: "un" } });
  const raw = await prisma.rawMaterial.create({ data: { code: `R-${key()}`, name: "Insumo de reservas", unitMeasureId: unidad.id } });
  const wh = await prisma.warehouse.create({ data: { name: "Reserva materia prima", classification: "MATERIA_PRIMA" } });
  const dest = await prisma.warehouse.create({ data: { name: "Destino libre", classification: "MATERIA_PRIMA" } });
  const initial = await consultarSaldoAjuste({ rawMaterialId: raw.id, warehouseId: wh.id, unitMeasureId: unidad.id }); assert(initial.ok);
  assert((await registrarAjusteInventario({ rawMaterialId: raw.id, warehouseId: wh.id, unitMeasureId: unidad.id, finalQuantity: "6", date: hoyOrden(), reason: "INVENTARIO_INICIAL", note: "Stock inicial prueba reservas", correctedAdjustmentId: null, idempotencyKey: key(), reference: initial.referencia })).ok);
  const numbering = await prisma.documentNumbering.findUniqueOrThrow({ where: { type: "ORDEN_TRABAJO" } });
  if (numbering.nextNumber === null) await prisma.documentNumbering.update({ where: { id: numbering.id }, data: { prefix: "OT-RES-", padding: 5, nextNumber: 1, version: { increment: 1 } } });
  async function propia(quantity: string) {
    return prisma.$transaction(async tx => {
      const k = key(), folio = await asignarFolio(tx, "ORDEN_TRABAJO", k);
      const w = await tx.workOrder.create({ data: { schemaVersion: 1, creationKey: k, folioId: folio.id, date: new Date(`${hoyOrden()}T00:00:00Z`), productName: "Obra a medida", ownPurpose: "Uso interno" } });
      const l = await tx.workOrderLine.create({ data: { workOrderId: w.id, position: 0, kind: "SERVICIO", executionMode: "A_MEDIDA", description: "Trabajo interno", quantity: "1", unitMeasureId: unidad.id, unitName: unidad.name, unitAbbreviation: unidad.abbreviation } });
      const d = await tx.workOrderDetail.create({ data: { workOrderId: w.id, workOrderLineId: l.id, rawMaterialId: raw.id, warehouseId: wh.id, quantityNeeded: quantity, unitMeasureId: unidad.id,
        materialCode: raw.code, materialName: raw.name, unitName: unidad.name, unitAbbreviation: unidad.abbreviation } });
      const s = await snapshots(tx,w.id);
      await tx.workOrderOperation.create({ data: { workOrderId: w.id, idempotencyKey: k, version: 1, type: "CREAR", planConfirmed: true, fingerprint: "a".repeat(64), afterSnapshot: s.plan, reservationSnapshot: s.reservations } });
      return { ...w, detail: d };
    });
  }
  const a = await propia("5"), b = await propia("5"), antes = await fisico();
  const reqA = { workOrderId: a.id, version: 1, idempotencyKey: key() }, reqB = { workOrderId: b.id, version: 1, idempotencyKey: key() };
  const results = await Promise.all([completarReservasTrabajo(reqA), completarReservasTrabajo(reqB)]);
  assert(results.every(r => r.version===2));
  assert.equal(await fisico(),antes,"Reservar no modifica existencia/Kardex");
  const asignadas = await prisma.stockReservationAllocation.findMany({ where: { rawMaterialId: raw.id } });
  assert.equal(asignadas.length,2); assert.equal(asignadas.reduce((s,a)=>s.plus(a.quantity),new Prisma.Decimal(0)).toFixed(3),"6.000");
  assert.deepEqual(asignadas.map(a=>a.quantity.toFixed(3)).sort(),["1.000","5.000"]);
  const replays = await Promise.all([completarReservasTrabajo(reqA), completarReservasTrabajo(reqA)]); assert(replays.every(r=>r.replayed));
  assert.equal(await prisma.stockReservationAllocation.count({ where: { rawMaterialId: raw.id } }),2);
  await assert.rejects(completarReservasTrabajo({ ...reqA, version: 2 }), /UUID/);
  await assert.rejects(completarReservasTrabajo({ ...reqA, idempotencyKey: key() }), /cambió/);
  const zero = await completarReservasTrabajo({ workOrderId: a.id, version: 2, idempotencyKey: key() }); assert.equal(zero.version,3);
  assert.equal(await prisma.stockReservationAllocation.count({ where: { rawMaterialId: raw.id } }),2);

  await assert.rejects(prisma.warehouseStock.update({ where: { warehouseId_rawMaterialId: { warehouseId: wh.id, rawMaterialId: raw.id } }, data: { quantity: "5" } }), /comprometidas/);
  await assert.rejects(prisma.stockReservationAllocation.update({ where: { id: asignadas[0].id }, data: { quantity: "1" } }), /inmutables/);
  await assert.rejects(prisma.stockReservationAllocation.delete({ where: { id: asignadas[0].id } }), /inmutables/);
  const saldo = await consultarSaldoAjuste({ rawMaterialId: raw.id, warehouseId: wh.id, unitMeasureId: unidad.id }); assert(saldo.ok);
  const ajuste = await registrarAjusteInventario({ rawMaterialId: raw.id, warehouseId: wh.id, unitMeasureId: unidad.id, finalQuantity: "5", date: hoyOrden(), reason: "CONTEO_FISICO", note: "Pérdida física exige conciliación", correctedAdjustmentId: null, idempotencyKey: key(), reference: saldo.referencia });
  assert(!ajuste.ok && ajuste.mensaje.includes("reservas"));
  const traslado = await consultarSaldosTraslado({ rawMaterialId: raw.id, unitMeasureId: unidad.id, sourceWarehouseId: wh.id, destinationWarehouseId: dest.id }); assert(traslado.ok);
  const transfer = await registrarTrasladoInventario({ rawMaterialId: raw.id, unitMeasureId: unidad.id, sourceWarehouseId: wh.id, destinationWarehouseId: dest.id,
    quantity: "1", date: hoyOrden(), note: "No trasladar reserva", correctedTransferId: null, idempotencyKey: key(), sourceReference: traslado.origen, destinationReference: traslado.destino });
  assert(!transfer.ok && transfer.mensaje.includes("libre"));
  assert.equal(await fisico(),antes,"Fallos de ajuste/traslado atómicos");

  const allocA = asignadas.find(x=>x.workOrderId===a.id)!;
  await assert.rejects(liberarReservaTrabajo({ workOrderId: b.id, version: 2, allocationId: allocA.id, quantity: "1", reason: "Ajena", idempotencyKey: key() }), /otra OT/);
  await assert.rejects(liberarReservaTrabajo({ workOrderId: a.id, version: 3, allocationId: allocA.id, quantity: allocA.quantity.plus(1).toString(), reason: "Exceso", idempotencyKey: key() }), /remanente/);
  const release = { workOrderId: a.id, version: 3, allocationId: allocA.id, quantity: "1.000", reason: "Replanificación explícita", idempotencyKey: key() };
  await liberarReservaTrabajo(release); assert((await liberarReservaTrabajo({ ...release, quantity: "1" })).replayed);
  assert.equal(await fisico(),antes); assert.equal(await prisma.stockReservationEvent.count({ where: { allocationId: allocA.id } }),1);
  const evento = await prisma.stockReservationEvent.findFirstOrThrow({ where: { allocationId: allocA.id } });
  await assert.rejects(prisma.stockReservationEvent.delete({ where: { id: evento.id } }), /inmutables/);
  await assert.rejects(prisma.stockReservationEvent.create({ data: { allocationId: allocA.id, type: "CONSUMIR", quantity: "0.1", reason: "Sin documento físico", operationId: key() } }), /documento físico/);

  // Incluso una diferencia menor que la escala del dominio invalida la copia de auditoría.
  await assert.rejects(prisma.$transaction(async tx => {
    const prev=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:a.id,version:4}}});
    await tx.workOrder.update({where:{id:a.id},data:{version:5}});
    const s=await snapshots(tx,a.id);
    const corrupted=s.reservations as { allocations: { quantity: string }[] };
    corrupted.allocations[0].quantity=new Prisma.Decimal(corrupted.allocations[0].quantity).plus("0.0001").toString();
    await tx.workOrderOperation.create({data:{workOrderId:a.id,version:5,type:"RESERVAR_STOCK",idempotencyKey:key(),fingerprint:"a".repeat(64),beforeSnapshot:prev.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}});
  }),/exactamente/);
  assert.equal((await prisma.workOrder.findUniqueOrThrow({where:{id:a.id}})).version,4);

  const c = await propia("1");
  await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallar_reserva_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type::text='RESERVAR_STOCK' THEN RAISE EXCEPTION 'fallo deliberado reserva'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_reserva_prueba BEFORE INSERT ON "WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.fallar_reserva_prueba()`);
  const reqC = { workOrderId: c.id, version: 1, idempotencyKey: key() };
  try { await assert.rejects(completarReservasTrabajo(reqC), /fallo deliberado/); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER fallo_reserva_prueba ON "WorkOrderOperation"'); await prisma.$executeRawUnsafe('DROP FUNCTION public.fallar_reserva_prueba()'); }
  assert.equal(await prisma.stockReservationAllocation.count({ where: { workOrderId: c.id } }),0);
  assert.equal((await prisma.workOrder.findUniqueOrThrow({ where: { id:c.id } })).version,1);
  await completarReservasTrabajo(reqC);
  assert.equal(await prisma.$transaction(tx=>cantidadReservadaRecurso(tx,raw.id,null,wh.id)).then(q=>q.toFixed(3)),"6.000");

  // El plan no puede reducir demanda cubierta; la anulación propia debe liberar.
  await assert.rejects(prisma.$transaction(async tx => {
    const prev=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:c.id,version:2}}});
    await tx.workOrder.update({where:{id:c.id},data:{version:3}});
    await tx.workOrderDetail.update({where:{id:c.detail.id},data:{quantityNeeded:"0.5"}});
    const s=await snapshots(tx,c.id);
    await tx.workOrderOperation.create({data:{workOrderId:c.id,version:3,type:"EDITAR_PLAN",planConfirmed:true,reason:"Revisión de prueba de reservas",idempotencyKey:key(),fingerprint:"a".repeat(64),beforeSnapshot:prev.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}});
  }),/superan requerimiento/);
  assert.equal((await prisma.workOrder.findUniqueOrThrow({where:{id:c.id}})).version,2);
  const ac=await prisma.stockReservationAllocation.findFirstOrThrow({where:{workOrderId:c.id}});
  const competing=await Promise.allSettled([1,2].map(()=>liberarReservaTrabajo({workOrderId:c.id,version:2,allocationId:ac.id,quantity:"0.5",reason:"Liberación concurrente",idempotencyKey:key()})));
  assert.equal(competing.filter(r=>r.status==="fulfilled").length,1);
  async function anular(liberar:boolean) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "WorkOrder" WHERE id=${c.id} FOR UPDATE`;
      const prev=await tx.workOrderOperation.findUniqueOrThrow({where:{workOrderId_version:{workOrderId:c.id,version:3}}});
      const k=key(); await tx.workOrder.update({where:{id:c.id},data:{version:4,status:"ANULADO",voidedAt:new Date(),voidReason:"Obra interna cancelada"}});
      if(liberar) await tx.stockReservationEvent.create({data:{allocationId:ac.id,type:"LIBERAR",quantity:"0.5",reason:"Anulación de obra propia",operationId:k}});
      const s=await snapshots(tx,c.id);
      await tx.workOrderOperation.create({data:{workOrderId:c.id,version:4,type:"ANULAR",idempotencyKey:k,fingerprint:"a".repeat(64),beforeSnapshot:prev.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations}});
    });
  }
  await assert.rejects(anular(false),/liberar todas/); await anular(true);
  assert.equal((await prisma.workOrder.findUniqueOrThrow({where:{id:c.id}})).status,"ANULADO");

  // Anulación de Compra respeta reservas aunque no exista todavía consumo físico.
  const supplier=await prisma.supplier.upsert({where:{rut:"22222222-2"},create:{rut:"22222222-2",name:"Proveedor de prueba reservas"},update:{}});
  const document=await prisma.documentType.findUniqueOrThrow({where:{code:"FACTURA_COMPRA"}});
  const purchase=await guardarCompra({date:hoyOrden(),supplierId:supplier.id,warehouseId:wh.id,documentTypeId:document.id,documentNumber:key(),lines:[{rawMaterialId:raw.id,presentation:"Unidad",purchasedQuantity:"2",unitFactor:"1",unitPrice:"10"}]},key());
  assert(purchase.ok && purchase.id);
  let pc=await consultarCompra(purchase.id); assert(pc.ok && pc.compra);
  assert((await recibirCompra({date:hoyOrden(),lines:[{purchaseDetailId:pc.compra.lines[0].id,receivedQuantity:"2"}]},{id:purchase.id,version:pc.compra.version},key())).ok);
  pc=await consultarCompra(purchase.id); assert(pc.ok && pc.compra);
  const d=await propia("3");await completarReservasTrabajo({workOrderId:d.id,version:1,idempotencyKey:key()});
  const physicalBeforeVoid=await fisico();
  const blocked=await anularCompra({reason:"Corregir documento de compra"},{id:purchase.id,version:pc.compra.version},key());
  assert(!blocked.ok && blocked.mensaje.includes("reservadas"));assert.equal(await fisico(),physicalBeforeVoid);
  const ad=await prisma.stockReservationAllocation.findFirstOrThrow({where:{workOrderId:d.id}});
  await liberarReservaTrabajo({workOrderId:d.id,version:2,allocationId:ad.id,quantity:ad.quantity.toFixed(3),reason:"Liberación para corregir compra",idempotencyKey:key()});
  assert((await anularCompra({reason:"Corregir documento de compra"},{id:purchase.id,version:pc.compra.version},key())).ok);

  // Terminado comercial: salida física bloqueada y fabricación futura no reservada.
  const product = await prisma.product.create({ data: { name: "Producto reserva", unitMeasureId: unidad.id, creationKey: key(), creationFingerprint: "a".repeat(64) } });
  const wp = await prisma.warehouse.create({ data: { name: "Terminado reservado", classification: "PRODUCTO_TERMINADO" } });
  const comb = { productId: product.id, warehouseId: wp.id, unitMeasureId: unidad.id, productVersion: product.version };
  const sp = await consultarSaldoTerminado(comb); assert(sp.ok);
  assert((await registrarInicialTerminado({ ...comb, quantity: "2", date: hoyOrden(), note: "Stock previo de terminado", idempotencyKey: key(), reference: sp.referencia })).ok);
  const base = await prisma.quote.findFirstOrThrow();
  const quote = await guardarCotizacion({ date: hoyOrden(), validUntil: null, clientId: base.clientId, clientBranchId: base.clientBranchId, paymentConditionId: base.paymentConditionId, bankAccountId: null,
    discount: { modo: "SIN_DESCUENTO" }, technicalDescription: documentoVacioCotizacion, lines: [{ kind: "PRODUCTO", productId: product.id, rawMaterialId: null, unitMeasureId: unidad.id, description: product.name, quantity: "3", unitPrice: "100" }] },key()); assert(quote.ok);
  const ql = await prisma.quoteDetail.findFirstOrThrow({ where: { quoteId: quote.id } });
  const sale = await registrarOrdenCompraCliente({ quoteId: quote.id, quoteVersion: quote.version, date: hoyOrden(), customerOrderNumber: null, customerOrderDate: null, pdfEmissionId: null, technicalDescription: documentoVacioCotizacion, scopeReviewed: true, lines: [{ quoteDetailId: ql.id, quantity: "3" }] },key()); assert(sale.ok);
  const w = await crearTrabajoComercialDePrueba(sale.id,"Terminado para cliente");
  await prisma.$transaction(async tx => {
    const previous = await tx.workOrderOperation.findUniqueOrThrow({ where: { workOrderId_version: { workOrderId:w.id,version:1 } } });
    const l = await tx.workOrderLine.findFirstOrThrow({ where: { workOrderId:w.id } });
    await tx.workOrder.update({ where: { id:w.id },data: { version:2 } });
    await tx.workOrderSupplyPlan.create({ data: { workOrderId:w.id,workOrderLineId:l.id,warehouseId:wp.id,productId:product.id,quantity:"3" } });
    const s=await snapshots(tx,w.id);
    await tx.workOrderOperation.create({ data: { workOrderId:w.id,idempotencyKey:key(),fingerprint:"a".repeat(64),version:2,type:"EDITAR_PLAN",planConfirmed:true,reason:"Revisión de prueba de reservas",beforeSnapshot:previous.afterSnapshot as Prisma.InputJsonValue,afterSnapshot:s.plan,reservationSnapshot:s.reservations } });
  });
  const fp = await fisico(); await completarReservasTrabajo({ workOrderId:w.id,version:2,idempotencyKey:key() }); assert.equal(await fisico(),fp);
  const ar = await prisma.stockReservationAllocation.findFirstOrThrow({ where: { workOrderId:w.id } }); assert.equal(ar.quantity.toFixed(3),"2.000"); assert.equal(ar.purpose,"ENTREGA_PRODUCTO");
  const ref = await consultarSaldoTerminado(comb); assert(ref.ok);
  const adj = await registrarAjusteTerminado({ ...comb, finalQuantity:"1",date:hoyOrden(),note:"Conteo bajo reservas",reason:"CONTEO_FISICO",correctedInitialStockId:null,correctedAdjustmentId:null,idempotencyKey:key(),reference:ref.referencia });
  assert(!adj.ok && adj.mensaje.includes("reservas"));
  await assert.rejects(prisma.productWarehouseStock.update({ where: { warehouseId_productId:{warehouseId:wp.id,productId:product.id} },data:{quantity:"1",version:{increment:1}} }),/comprometidas/);
  assert.equal(await fisico(),fp);
  console.log("Reservas MP/PT: parciales, concurrencia, UUID, liberaciones, historial, rollback y protección de escritores correctos.");
}
main().finally(()=>prisma.$disconnect());
