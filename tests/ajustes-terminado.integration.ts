// Fixture y fallo deliberado sólo en copia PostgreSQL local descartable.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { consultarSaldoTerminado, registrarInicialTerminado, registrarAjusteTerminado, prepararAjusteTerminado } from "../src/lib/servicios/stock-terminado";
import { consultarInventarioTerminado } from "../src/lib/consultas/stock-terminado";
import { hoyChile, type DatosAjusteTerminado } from "../src/lib/validaciones/stock-terminado";
async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_terminado_ajustes_"));
  const nombre = `Ajuste terminado ${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({ data: { name: nombre, abbreviation: "un" } });
  const producto = await prisma.product.create({ data: { name: nombre, unitMeasureId: unidad.id, creationKey: randomUUID(), creationFingerprint: "0".repeat(64) } });
  const bodega = await prisma.warehouse.create({ data: { name: nombre, classification: "MIXTA" } });
  const otra = await prisma.warehouse.create({ data: { name: `${nombre} otra`, classification: "PRODUCTO_TERMINADO" } });
  const rawAntes = JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.stockMovement.findMany({ orderBy: { id: "asc" } })]);
  const c = { productId: producto.id, warehouseId: bodega.id, unitMeasureId: unidad.id, productVersion: 1 };
  const saldo = async () => { const r = await consultarSaldoTerminado(c); assert(r.ok); return r; };
  const contar = async () => [await prisma.productInventoryAdjustment.count(), await prisma.productStockMovement.count(), await prisma.productInventoryOperation.count()];
  const d0: DatosAjusteTerminado = { ...c, finalQuantity: "8", date: hoyChile(), note: "Conteo físico verificado", reason: "CONTEO_FISICO", correctedInitialStockId: null, correctedAdjustmentId: null, reference: (await saldo()).referencia, idempotencyKey: randomUUID() };
  assert.equal((await registrarAjusteTerminado(d0)).ok, false); // No reemplazar el flujo inicial con ajustes.
  const ini = await registrarInicialTerminado({ ...c, quantity: "10", date: hoyChile(), note: "Existencia previa", idempotencyKey: randomUUID(), reference: d0.reference }); assert(ini.ok && ini.documentoId);
  const inicial = await prisma.productInitialStock.findUniqueOrThrow({ where: { id: ini.documentoId } });
  const inicialAntes = JSON.stringify(inicial);
  const distinto = await prisma.product.create({ data: { name: `${nombre} distinto`, unitMeasureId: unidad.id, creationKey: randomUUID(), creationFingerprint: "0".repeat(64) } });
  const otraCombinacion = { ...c, productId: distinto.id, warehouseId: otra.id };
  const otroSaldo = await consultarSaldoTerminado(otraCombinacion); assert(otroSaldo.ok);
  const otroInicial = await registrarInicialTerminado({ ...otraCombinacion, quantity: "1", date: hoyChile(), note: "Origen ajeno", reference: otroSaldo.referencia, idempotencyKey: randomUUID() }); assert(otroInicial.ok && otroInicial.documentoId);
  const d: DatosAjusteTerminado = { ...d0, reason: "CORRECCION_REGISTRO", correctedInitialStockId: inicial.id, reference: (await saldo()).referencia };
  assert.equal((await registrarAjusteTerminado({ ...d, correctedInitialStockId: otroInicial.documentoId })).ok, false);
  const previos = await contar();
  const previo = await prepararAjusteTerminado(d); assert(previo.ok && previo.diferencia === "-2"); assert.deepEqual(await contar(), previos);
  for (const finalQuantity of ["-1", "NaN", "0.0001", "100000000000"]) assert.equal((await registrarAjusteTerminado({ ...d, finalQuantity })).ok, false);
  for (const cambios of [{ date: "2099-01-01" }, { date: "2026-02-30" }, { note: " " }, { productVersion: 99 }, { correctedInitialStockId: null }, { correctedAdjustmentId: inicial.id }, { reason: "INVENTARIO_INICIAL" }, { reason: "MERMA_PERDIDA" }, { correctedInitialStockId: 999999999 }]) assert.equal((await registrarAjusteTerminado({ ...d, ...cambios })).ok, false);
  assert((await registrarAjusteTerminado({ ...d, finalQuantity: "10" })).ok); assert.deepEqual(await contar(), previos); // Sin diferencia, tampoco guardar UUID.
  const reps = await Promise.all([registrarAjusteTerminado(d), registrarAjusteTerminado(d)]); assert(reps.every(r => r.ok)); assert.equal(reps[0].documentoId, reps[1].documentoId);
  assert.deepEqual(await contar(), previos.map(n => n + 1));
  const ajuste = await prisma.productInventoryAdjustment.findUniqueOrThrow({ where: { id: reps[0].documentoId } });
  assert(ajuste.previousQuantity.equals(10) && ajuste.finalQuantity.equals(8) && ajuste.quantity.equals(-2)); assert.equal(ajuste.correctedInitialStockId, inicial.id);
  assert.equal((await registrarAjusteTerminado({ ...d, finalQuantity: "9" })).ok, false); // Misma clave, otro contenido.
  assert.equal((await registrarAjusteTerminado({ ...d, idempotencyKey: randomUUID() })).ok, false); // Revisión de saldo anterior.
  assert.equal((await prepararAjusteTerminado(d)).ok, false);
  await assert.rejects(prisma.productInventoryAdjustment.update({ where: { id: ajuste.id }, data: { note: "Alterado" } }));
  await assert.rejects(prisma.productInventoryAdjustment.delete({ where: { id: ajuste.id } }));
  const movimiento = await prisma.productStockMovement.findUniqueOrThrow({ where: { adjustmentId: ajuste.id } });
  assert.equal(movimiento.type, "AJUSTE"); assert(movimiento.quantity.equals(-2)); assert.equal(movimiento.initialStockId, null);
  await assert.rejects(prisma.productStockMovement.delete({ where: { id: movimiento.id } }));
  const siguiente: DatosAjusteTerminado = { ...d, correctedInitialStockId: null, correctedAdjustmentId: ajuste.id, finalQuantity: "12.125", reference: (await saldo()).referencia, idempotencyKey: randomUUID() };
  const pre2 = await prepararAjusteTerminado(siguiente); assert(pre2.ok && pre2.diferencia === "4.125");
  const totales = await contar();
  await prisma.$executeRawUnsafe('CREATE FUNCTION prueba_fallo_ajuste_terminado() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'Fallo de prueba\'; END $$');
  await prisma.$executeRawUnsafe('CREATE TRIGGER prueba_fallo_ajuste_terminado BEFORE INSERT ON "ProductInventoryOperation" FOR EACH ROW EXECUTE FUNCTION prueba_fallo_ajuste_terminado()');
  try { assert.equal((await registrarAjusteTerminado(siguiente)).ok, false); assert.deepEqual(await contar(), totales); assert.equal((await saldo()).referencia.quantity, "8"); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER prueba_fallo_ajuste_terminado ON "ProductInventoryOperation"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_fallo_ajuste_terminado()'); }
  const carreras = await Promise.all([registrarAjusteTerminado(siguiente), registrarAjusteTerminado({ ...siguiente, idempotencyKey: randomUUID(), finalQuantity: "9" })]);
  assert.equal(carreras.filter(r => r.ok).length, 1);
  // El ganador se refleja tanto en Kardex como en el saldo, nunca se aplica el perdedor sobre una versión antigua.
  const actual = await saldo(); const suma = await prisma.productStockMovement.aggregate({ where: { productId: producto.id, warehouseId: bodega.id }, _sum: { quantity: true } }); assert(suma._sum.quantity?.equals(actual.referencia.quantity));
  const cero = await registrarAjusteTerminado({ ...siguiente, correctedAdjustmentId: ajuste.id, finalQuantity: "0", reference: actual.referencia, idempotencyKey: randomUUID() }); assert(cero.ok);
  const final = await saldo(); assert.equal(final.referencia.quantity, "0"); assert(final.puedeAjustar && !final.puedeInicial);
  assert.equal((await registrarInicialTerminado({ ...c, quantity: "1", date: hoyChile(), note: "Repetir", reference: final.referencia, idempotencyKey: randomUUID() })).ok, false);
  assert.equal((await registrarAjusteTerminado({ ...siguiente, warehouseId: otra.id, reference: { stockId: null, quantity: "0", version: null, lastMovementId: null }, idempotencyKey: randomUUID() })).ok, false);
  const countAnterior = await contar();
  await assert.rejects(prisma.productInventoryAdjustment.create({ data: { productId: producto.id, warehouseId: bodega.id, unitMeasureId: unidad.id, previousQuantity: "0", finalQuantity: "1", quantity: "1", reason: "CONTEO_FISICO", date: new Date(`${hoyChile()}T00:00:00Z`), note: "Documento incompleto", productCode: producto.code, productName: producto.name, unitName: unidad.name, unitAbbreviation: unidad.abbreviation } }));
  assert.deepEqual(await contar(), countAnterior);
  await prisma.product.update({ where: { id: producto.id }, data: { name: `${nombre} nuevo`, version: { increment: 1 } } });
  assert((await registrarAjusteTerminado(d)).ok); // UUID antes de versión de catálogo y saldos posteriores.
  const lista = await consultarInventarioTerminado({ vista: "ajustes", productId: producto.id, texto: producto.code.slice(0, 8), pagina: 99, tamano: 10 }); assert(lista.ok && lista.pagina.total === 3 && lista.pagina.pagina === 1);
  assert(lista.pagina.datos.every(r => r.producto === nombre && r.documentoTipo === "ajuste")); assert(lista.pagina.datos.some(r => r.origen?.tipo === "inicial")); assert(lista.pagina.datos.some(r => r.origen?.tipo === "ajuste"));
  const movimientos = await consultarInventarioTerminado({ vista: "movimientos", productId: producto.id }); assert(movimientos.ok && movimientos.pagina.total === 4); assert(movimientos.pagina.datos.some(r => r.motivo === "CORRECCION_REGISTRO" && r.anterior === "10"));
  assert.equal(JSON.stringify(await prisma.productInitialStock.findUniqueOrThrow({ where: { id: inicial.id } })), inicialAntes);
  assert.equal(JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.stockMovement.findMany({ orderBy: { id: "asc" } })]), rawAntes);
  console.log("OK: ajustes positivos/negativos/cero, sin diferencia, vista previa sin escritura, corrección inicial/ajuste, UUID, concurrencia/versiones, restricciones SQL, snapshots, rollback y materia prima intacta.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
