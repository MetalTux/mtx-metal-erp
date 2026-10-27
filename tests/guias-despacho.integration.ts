// Fixtures, fallos inducidos y concurrencia: exclusivamente copia PostgreSQL local descartable G6.
import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { crearEntornoGuiasG6, exigirCopiaG6, huellaGuiasG6, ok, uuid } from "./fixtures/guias-despacho";
import { registrarGuiaDespacho, previsualizarGuiaDespacho, corregirGuiaDespacho } from "../src/lib/servicios/guias-despacho";
import { consultarGuiaDespacho, prepararGuiaDespacho } from "../src/lib/consultas/guias-despacho";
import { consultarTrabajo } from "../src/lib/consultas/ordenes-trabajo";
import { liberarReservaTrabajo } from "../src/lib/servicios/reservas-stock";
import { revertirProduccion } from "../src/lib/servicios/reversiones-produccion";
import { consultarSaldoAjuste, registrarAjusteInventario } from "../src/lib/servicios/ajustes-inventario";
import { consultarSaldosTraslado, registrarTrasladoInventario } from "../src/lib/servicios/traslados-inventario";
import { consultarSaldoTerminado, registrarAjusteTerminado } from "../src/lib/servicios/stock-terminado";
import { finalizarTrabajo } from "../src/lib/servicios/cierre-trabajo";
import { hoyOrden, anularOrdenCompraCliente } from "../src/lib/servicios/ordenes-compra-cliente";
import { fechaCalendarioValida, inicioDiaChile, finExclusivoDiaChile } from "../src/lib/fechas-chile";
exigirCopiaG6();
const hoy = hoyOrden();
async function rechazar(input: unknown) {
  const antes = await huellaGuiasG6(), r = await registrarGuiaDespacho(input, uuid());
  assert(!r.ok, JSON.stringify(r)); assert.equal(await huellaGuiasG6(), antes); return r;
}
async function falloTemporal(tabla: string, evento: "INSERT" | "UPDATE", ejecutar: () => Promise<void>, cuerpo = "RAISE EXCEPTION 'Fallo inducido G6';") {
  assert(/^[A-Za-z]+$/.test(tabla));
  await prisma.$executeRawUnsafe(`CREATE FUNCTION public.fallo_guias_g6() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${cuerpo} RETURN NEW; END $$`);
  try {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER fallo_guias_g6 AFTER ${evento} ON "${tabla}" FOR EACH ROW EXECUTE FUNCTION public.fallo_guias_g6()`);
    try { await ejecutar(); } finally { await prisma.$executeRawUnsafe(`DROP TRIGGER fallo_guias_g6 ON "${tabla}"`); }
  } finally { await prisma.$executeRawUnsafe("DROP FUNCTION public.fallo_guias_g6()"); }
}
async function main() {
  const f = await crearEntornoGuiasG6();
  // Mixta, producto abastecido en parte desde stock y en parte fabricado; unidades distintas.
  let w = await f.producir(await f.crear(["PRODUCTO", "MATERIA_PRIMA", "SERVICIO", "A_MEDIDA"], { fabricar: "1" }));
  const consumos = JSON.stringify(await prisma.productionConsumption.findMany({ where: { workOrderId: w.id } }));
  const dto = f.salida(w, "1"), key = uuid(), antesPreview = await huellaGuiasG6();
  assert((await previsualizarGuiaDespacho(dto)).ok); assert.equal(await huellaGuiasG6(), antesPreview);
  const first = ok(await registrarGuiaDespacho(dto, key)); assert.equal(ok(await registrarGuiaDespacho(dto, key.toUpperCase())).id, first.id);
  assert(!(await registrarGuiaDespacho({ ...dto, note: "Otra intención" }, key)).ok);
  w = await consultarTrabajo(w.id); const second = ok(await registrarGuiaDespacho(f.salida(w), uuid()));
  assert.notEqual(first.id, second.id); assert.equal(JSON.stringify(await prisma.productionConsumption.findMany({ where: { workOrderId: w.id } })), consumos, "No consumir receta de nuevo al despachar");
  const completo = await consultarGuiaDespacho(second.id); assert(completo); assert(completo.compromiso.every(l => l.pendiente === "0.000"));
  assert.deepEqual(completo.lineas.map(l => l.unidad), ["un", "kg", "h", "h"]);
  assert.equal(completo.lineas.filter(l => l.movimientos.length).length, 2);
  const consultaCompleta = await consultarTrabajo(w.id);
  assert(consultaCompleta.supplies.every(s=>new Prisma.Decimal(s.pendingQuantity).isZero()));
  assert(consultaCompleta.productionOutputs.every(s=>new Prisma.Decimal(s.pendingQuantity).isZero()));
  const retry = ok(await registrarGuiaDespacho(dto, key)); assert.equal(retry.id, first.id, "Reintento anterior tras otra revisión");
  await rechazar(f.salida(await consultarTrabajo(w.id), "0.001"));
  // Dos bodegas para la misma línea: sin repetición de línea/bodega.
  let dos = await f.crear(["MATERIA_PRIMA"], { reservasEnDosBodegas: true });
  const split = f.salida(dos); split.lines.push({ ...split.lines[0], warehouseId: f.otra.id });
  await rechazar({ ...split, lines: [...split.lines, split.lines[0]] });
  ok(await registrarGuiaDespacho(split, uuid())); dos = await consultarTrabajo(dos.id);
  assert.equal((await prepararGuiaDespacho(dos.id)).partidas[0].entregadoNeto, "2.000");
  // Rechazos sin efectos: precisión, formato, claves extra, fechas, conformidad, unidad/recurso ajenos.
  const servicio = await f.producir(await f.crear(["SERVICIO"])), base = f.salida(servicio);
  const manana = new Date(`${hoy}T12:00:00Z`); manana.setUTCDate(manana.getUTCDate()+1);
  for (const quantity of ["0", "-1", "NaN", "Infinity", "1e1", "0.0001", "100000000000", "1.000,1", ""]) await rechazar({ ...base, lines: [{ ...base.lines[0], quantity }] });
  for (const date of ["2026-02-30", "1900-02-29", "2026-08-31", manana.toISOString().slice(0,10)]) await rechazar({ ...base, date });
  for (const patch of [{ conformityName: " " }, { conformityDate: null }, { conformityDate: manana.toISOString().slice(0,10) }, { warehouseId: f.mp.id }, { workOrderLineId: dos.plan!.lines[0].id }, { unitMeasureId: f.unidad.id }]) await rechazar({ ...base, lines: [{ ...base.lines[0], ...patch }] });
  await rechazar({ ...base, version: base.version-1 }); await rechazar({ ...base, lines: [] }); await rechazar({ ...base, salesOrderId: 999 });
  const sinEjecucion = await f.crear(["SERVICIO"]); await rechazar(f.salida(sinEjecucion));
  const pendiente = await f.crear(["MATERIA_PRIMA"], { iniciar: false }); await rechazar(f.salida(pendiente));
  const noPropia = await f.crear(["MATERIA_PRIMA"]); const reserva = noPropia.reservas.find(r => r.purpose === "ENTREGA_DIRECTA_MP")!;
  await liberarReservaTrabajo({ workOrderId: noPropia.id, version: noPropia.version, allocationId: reserva.id, quantity: reserva.active, reason: "Quitar reserva propia para probar reserva ajena", idempotencyKey: uuid() });
  await rechazar(f.salida(await consultarTrabajo(noPropia.id)));
  const mp = await f.crear(["MATERIA_PRIMA"]), mDto = f.salida(mp);
  await rechazar({ ...mDto, lines: [{ ...mDto.lines[0], warehouseId: f.otra.id }] });
  await rechazar({ ...mDto, lines: [{ ...mDto.lines[0], warehouseId: f.pt.id }] });
  const productWork = await f.crear(["PRODUCTO"], { fabricar: "0" });
  await assert.rejects(prisma.product.update({where:{id:f.producto.id},data:{deletedAt:new Date()}}),/referenciado no eliminable/);
  assert((await previsualizarGuiaDespacho(f.salida(productWork))).ok,"La protección de catálogo conserva el producto referenciado");
  const saldo = await prisma.warehouseStock.findUniqueOrThrow({ where: { warehouseId_rawMaterialId: { warehouseId: f.mp.id, rawMaterialId: f.material.id } } });
  await prisma.warehouseStock.update({ where: { id: saldo.id }, data: { quantity: saldo.quantity.plus(1) } });
  try { await rechazar(mDto); } finally { await prisma.warehouseStock.update({ where: { id: saldo.id }, data: { quantity: saldo.quantity, updatedAt: saldo.updatedAt } }); }
  // Fechas calendario Santiago y DST; aceptar coma decimal sin perder precisión.
  assert(fechaCalendarioValida("2024-02-29")); assert(!fechaCalendarioValida("2026-02-29"));
  assert.equal(finExclusivoDiaChile("2026-09-06").getTime()-inicioDiaChile("2026-09-06").getTime(),23*60*60*1000);
  assert.equal(finExclusivoDiaChile("2026-04-04").getTime()-inicioDiaChile("2026-04-04").getTime(),25*60*60*1000);
  const fechaW = await f.crear(["MATERIA_PRIMA"]), fechaDto = f.salida(fechaW,"0,001","2026-09-06"), fechaKey=uuid();
  const fg = ok(await registrarGuiaDespacho(fechaDto,fechaKey)); assert.equal(ok(await registrarGuiaDespacho({...fechaDto,lines:fechaDto.lines.map(l=>({...l,quantity:"0.001"}))},fechaKey)).id,fg.id);
  const lineaFecha=await prisma.deliveryNoteLine.findFirstOrThrow({where:{deliveryNoteId:fg.id}}),movFecha=await prisma.stockMovement.findUniqueOrThrow({where:{deliveryNoteLineId:lineaFecha.id}});
  assert.equal(movFecha.quantity.toFixed(3),"-0.001"); assert.equal(movFecha.date.toISOString(),inicioDiaChile("2026-09-06").toISOString());
  // Misma intención concurrente se recupera; distintas intenciones no sobreentregan.
  for (const misma of [true,false]) {
    const r = await f.crear(["MATERIA_PRIMA"]), d=f.salida(r,"2"), k=uuid();
    const rs=await Promise.all([registrarGuiaDespacho(d,k),registrarGuiaDespacho(d,misma?k:uuid())]);
    assert.equal(rs.filter(v=>v.ok).length,misma?2:1,JSON.stringify(rs)); assert.equal(await prisma.deliveryNote.count({where:{workOrderId:r.id}}),1);
  }
  // Dos OT distintas agotan el mismo saldo exacto sin consumir reserva ajena ni dejar negativo.
  const escaso=await crearEntornoGuiasG6(),escRef=ok(await consultarSaldoAjuste({rawMaterialId:escaso.material.id,warehouseId:escaso.mp.id,unitMeasureId:escaso.peso.id}));
  ok(await registrarAjusteInventario({rawMaterialId:escaso.material.id,warehouseId:escaso.mp.id,unitMeasureId:escaso.peso.id,finalQuantity:"4",date:hoy,reason:"CONTEO_FISICO",note:"Saldo exacto para carrera G6",correctedAdjustmentId:null,idempotencyKey:uuid(),reference:escRef.referencia}));
  const escA=await escaso.crear(),escB=await escaso.crear();
  const carreraFisica=await Promise.all([registrarGuiaDespacho(escaso.salida(escA,"2"),uuid()),registrarGuiaDespacho(escaso.salida(escB,"2"),uuid())]);assert(carreraFisica.every(r=>r.ok),JSON.stringify(carreraFisica));
  assert((await prisma.warehouseStock.findUniqueOrThrow({where:{warehouseId_rawMaterialId:{warehouseId:escaso.mp.id,rawMaterialId:escaso.material.id}}})).quantity.isZero());
  const escC=await escaso.crear();await rechazar(escaso.salida(escC));await escaso.invariantes();
  const otros=[await f.crear(["SERVICIO"]),await f.crear(["SERVICIO"])];
  // Preparar ambos antes de la carrera; no paralelizar escrituras de fixtures en una misma copia.
  const a=await f.producir(otros[0]), b=await f.producir(otros[1]);
  const folios=await Promise.all([registrarGuiaDespacho(f.salida(a),uuid()),registrarGuiaDespacho(f.salida(b),uuid())]);
  const ids=folios.map(v=>ok(v).id); const fnums=await prisma.deliveryNote.findMany({where:{id:{in:ids}},select:{folioId:true}});assert.notEqual(fnums[0].folioId,fnums[1].folioId);
  // Reversión y guía sobre la misma ejecución: sólo una intención confirma.
  const rv=await f.producir(await f.crear(["PRODUCTO"]));
  const raceRv=await Promise.all([registrarGuiaDespacho(f.salida(rv),uuid()),revertirProduccion({workOrderId:rv.id,version:rv.version,productionRecordId:rv.productionRecords[0].id,date:hoy,reason:"Carrera G6",physicalRestitutionConfirmed:true},uuid())]);
  assert.equal(raceRv.filter(v=>v.ok).length,1,JSON.stringify(raceRv));
  // Guía y ajuste/traslado de stock libre comparten recursos; nunca afectan reservas ajenas.
  const aj=await f.crear(["MATERIA_PRIMA"]),ref=ok(await consultarSaldoAjuste({rawMaterialId:f.material.id,warehouseId:f.mp.id,unitMeasureId:f.peso.id}));
  const raceAj=await Promise.all([registrarGuiaDespacho(f.salida(aj),uuid()),registrarAjusteInventario({rawMaterialId:f.material.id,warehouseId:f.mp.id,unitMeasureId:f.peso.id,finalQuantity:new Prisma.Decimal(ref.referencia.quantity).minus(1).toFixed(3),date:hoy,reason:"CONTEO_FISICO",note:"Ajuste concurrente G6",correctedAdjustmentId:null,idempotencyKey:uuid(),reference:ref.referencia})]);assert(raceAj.some(v=>v.ok));await f.invariantes();
  const tr=await f.crear(["MATERIA_PRIMA"]),tref=ok(await consultarSaldosTraslado({rawMaterialId:f.material.id,unitMeasureId:f.peso.id,sourceWarehouseId:f.mp.id,destinationWarehouseId:f.otra.id}));
  const raceTr=await Promise.all([registrarGuiaDespacho(f.salida(tr),uuid()),registrarTrasladoInventario({rawMaterialId:f.material.id,unitMeasureId:f.peso.id,sourceWarehouseId:f.mp.id,destinationWarehouseId:f.otra.id,quantity:"1",date:hoy,note:"Traslado concurrente G6",correctedTransferId:null,idempotencyKey:uuid(),sourceReference:tref.origen,destinationReference:tref.destino})]);assert(raceTr.some(v=>v.ok));await f.invariantes();
  const pa=await f.crear(["PRODUCTO"],{fabricar:"0"}),pr=ok(await consultarSaldoTerminado({productId:f.producto.id,unitMeasureId:f.unidad.id,productVersion:f.producto.version,warehouseId:f.pt.id}));
  const racePt=await Promise.all([registrarGuiaDespacho(f.salida(pa),uuid()),registrarAjusteTerminado({productId:f.producto.id,unitMeasureId:f.unidad.id,productVersion:f.producto.version,warehouseId:f.pt.id,finalQuantity:new Prisma.Decimal(pr.referencia.quantity).minus(1).toFixed(3),date:hoy,reason:"CONTEO_FISICO",note:"Ajuste de terminado concurrente G6",correctedAdjustmentId:null,correctedInitialStockId:null,idempotencyKey:uuid(),reference:pr.referencia})]);assert(racePt.some(v=>v.ok));await f.invariantes();
  // Fallar después de cada escritura de una entrega mixta revierte documento, folio, versión, stock y reservas.
  const rb=await f.producir(await f.crear(["PRODUCTO","MATERIA_PRIMA"])),rbDto=f.salida(rb),rbKey=uuid();
  const etapas: [string,"INSERT"|"UPDATE"][]=[["DocumentNumbering","UPDATE"],["DocumentFolio","INSERT"],["DeliveryNote","INSERT"],["DeliveryNoteLine","INSERT"],["StockReservationEvent","INSERT"],["WarehouseStock","UPDATE"],["StockMovement","INSERT"],["ProductWarehouseStock","UPDATE"],["ProductStockMovement","INSERT"],["WorkOrder","UPDATE"],["WorkOrderOperation","INSERT"]];
  for (const [tabla,evento] of etapas) await falloTemporal(tabla,evento,async()=>{const before=await huellaGuiasG6();assert(!(await registrarGuiaDespacho(rbDto,rbKey)).ok,tabla);assert.equal(await huellaGuiasG6(),before,`Rollback ${tabla}`);});
  const rg=ok(await registrarGuiaDespacho(rbDto,rbKey)),rl=await prisma.deliveryNoteLine.findMany({where:{deliveryNoteId:rg.id}});
  const correction={deliveryNoteId:rg.id,version:(await consultarTrabajo(rb.id)).version,date:hoy,reason:"Corrección de prueba G6",physicalRestitutionConfirmed:true,lines:rl.map(l=>({deliveryNoteLineId:l.id,quantity:"0.5"}))},cKey=uuid();
  for(const [tabla,evento] of etapas.filter(([t])=>t!=="StockReservationEvent").concat([["StockReservationAllocation","INSERT"]])) await falloTemporal(tabla,evento,async()=>{const before=await huellaGuiasG6();assert(!(await corregirGuiaDespacho(correction,cKey)).ok,tabla);assert.equal(await huellaGuiasG6(),before,`Rollback inverso ${tabla}`);});
  const c=ok(await corregirGuiaDespacho(correction,cKey));assert.equal(ok(await corregirGuiaDespacho(correction,cKey)).id,c.id);
  const cw=await consultarTrabajo(rb.id);const once=await Promise.all([corregirGuiaDespacho({...correction,version:cw.version},uuid()),corregirGuiaDespacho({...correction,version:cw.version},uuid())]);assert.equal(once.filter(v=>v.ok).length,1);
  assert(!(await corregirGuiaDespacho({...correction,version:(await consultarTrabajo(rb.id)).version},uuid())).ok,"No devolver otra vez la cantidad ya corregida");
  // Cuenta/contrato: no anular una OCC con OT; permitir finalizar y despachar sin cambiar deuda.
  const cuentaAntes=JSON.stringify(await prisma.accountReceivable.findMany({where:{salesOrderId:rb.plan!.salesOrderId!}}));
  const anulada=await anularOrdenCompraCliente({referencia:{id:rb.plan!.salesOrderId!,version:1},motivo:"Cancelar contrato con despacho"},uuid());assert(!anulada.ok);
  assert.equal(JSON.stringify(await prisma.accountReceivable.findMany({where:{salesOrderId:rb.plan!.salesOrderId!}})),cuentaAntes);
  const fin=await f.crear(["MATERIA_PRIMA"]);ok(await finalizarTrabajo({workOrderId:fin.id,version:fin.version,date:hoy,note:"Cierre G6",preparationConfirmed:true},uuid()));ok(await registrarGuiaDespacho(f.salida(await consultarTrabajo(fin.id),"2"),uuid()));
  const ui=await f.producir(await f.crear(["PRODUCTO","MATERIA_PRIMA","SERVICIO","A_MEDIDA"],{fabricar:"1"}));
  await f.invariantes();
  console.log(JSON.stringify({ok:true,uiWorkId:ui.id,uiSaleId:ui.plan!.salesOrderId,uiGuideId:rg.id,materialId:f.material.id,warehouseId:f.mp.id,stages:etapas.length,correctionStages:etapas.length,message:"G6: mixtas, parcial/completa, precisión/fechas, reservas, carreras, folios y rollback tras cada escritura verificados"}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
