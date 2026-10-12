// Fixtures únicamente en copia local descartable; nunca ejecutar sobre la base real.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { consultarSaldoTerminado, registrarInicialTerminado } from "../src/lib/servicios/stock-terminado";
import { consultarInventarioTerminado, catalogosTerminado } from "../src/lib/consultas/stock-terminado";
import { hoyChile } from "../src/lib/validaciones/stock-terminado";
async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_terminado_"));
  const nombre = `Terminado prueba ${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({ data: { name: nombre, abbreviation: "un" } });
  const otra = await prisma.unitMeasure.create({ data: { name: `${nombre} otra`, abbreviation: "ot" } });
  const producto = await prisma.product.create({ data: { name: nombre, unitMeasureId: unidad.id, creationKey: randomUUID(), creationFingerprint: "0".repeat(64) } });
  const bodegas: { id: number }[] = [];
  for (const classification of ["MIXTA", "PRODUCTO_TERMINADO", "MATERIA_PRIMA", null] as const) bodegas.push(await prisma.warehouse.create({ data: { name: `${nombre} ${classification}`, classification } }));
  const raw = JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.stockMovement.findMany({ orderBy: { id: "asc" } })]);
  const combinacion = (i = 0) => ({ productId: producto.id, warehouseId: bodegas[i].id, unitMeasureId: unidad.id, productVersion: producto.version });
  const leer = async (i = 0) => { const r = await consultarSaldoTerminado(combinacion(i)); assert(r.ok); return r; };
  const datos = async (i = 0) => ({ ...combinacion(i), quantity: "5.125", date: hoyChile(), note: "Existencias verificadas sin receta", idempotencyKey: randomUUID(), reference: (await leer(i)).referencia });
  const contar = async () => [await prisma.productWarehouseStock.count(), await prisma.productInitialStock.count(), await prisma.productStockMovement.count(), await prisma.productInventoryOperation.count()];
  const antes = await contar();
  assert((await leer()).puedeInicial); assert.deepEqual(await contar(), antes);
  const d = await datos();
  assert((await registrarInicialTerminado({ ...d, quantity: "0" })).ok); assert.deepEqual(await contar(), antes);
  for (const quantity of ["-1", "NaN", "1.1234", "100000000000"]) assert.equal((await registrarInicialTerminado({ ...d, quantity })).ok, false);
  for (const cambios of [{ date: "2099-01-01" }, { note: " " }, { productVersion: 9999 }, { unitMeasureId: otra.id }, { warehouseId: bodegas[2].id }, { warehouseId: bodegas[3].id }, { reference: { ...d.reference, quantity: "1" } }]) assert.equal((await registrarInicialTerminado({ ...d, ...cambios })).ok, false);
  const concurrentes = await Promise.all([registrarInicialTerminado(d), registrarInicialTerminado(d)]);
  assert(concurrentes.every(r => r.ok)); assert.deepEqual(concurrentes.map(r => r.ok ? r.documentoId : null), [concurrentes[0].ok ? concurrentes[0].documentoId : null, concurrentes[0].ok ? concurrentes[0].documentoId : null]);
  assert.deepEqual(await contar(), antes.map(n => n + 1));
  assert.equal((await registrarInicialTerminado({ ...d, note: "Otro contenido" })).ok, false);
  assert.equal((await registrarInicialTerminado({ ...d, idempotencyKey: randomUUID() })).ok, false);
  assert(!(await leer()).puedeInicial);
  const stock = await prisma.productWarehouseStock.findUniqueOrThrow({ where: { warehouseId_productId: { productId: producto.id, warehouseId: bodegas[0].id } } });
  assert(stock.quantity.equals("5.125"));
  const mov = await prisma.productStockMovement.findFirstOrThrow({ where: { productId: producto.id } });
  const doc = await prisma.productInitialStock.findUniqueOrThrow({ where: { id: mov.initialStockId! } });
  assert(mov.quantity.equals(stock.quantity)); assert(doc.quantity.equals(stock.quantity));
  await assert.rejects(prisma.product.update({ where: { id: producto.id }, data: { unitMeasureId: otra.id, version: { increment: 1 } } }));
  await assert.rejects(prisma.product.update({ where: { id: producto.id }, data: { deletedAt: new Date(), version: { increment: 1 } } }));
  await assert.rejects(prisma.warehouse.update({ where: { id: bodegas[0].id }, data: { classification: "MATERIA_PRIMA" } }));
  await assert.rejects(prisma.productInitialStock.update({ where: { id: doc.id }, data: { note: "Alterado" } }));
  await assert.rejects(prisma.productInitialStock.delete({ where: { id: doc.id } }));
  await assert.rejects(prisma.productStockMovement.update({ where: { id: mov.id }, data: { quantity: "6" } }));
  await assert.rejects(prisma.productStockMovement.delete({ where: { id: mov.id } }));
  await assert.rejects(prisma.productInventoryOperation.delete({ where: { idempotencyKey: d.idempotencyKey } }));
  await assert.rejects(prisma.productWarehouseStock.update({ where: { id: stock.id }, data: { quantity: "6", version: { increment: 1 } } }));
  await prisma.product.update({ where: { id: producto.id }, data: { name: `${nombre} actualizado`, version: { increment: 1 } } });
  assert((await registrarInicialTerminado(d)).ok); // Reintento reconocido antes de comprobar versión actual.
  for (const vista of ["stock", "ingresos", "movimientos"] as const) {
    const r = await consultarInventarioTerminado({ vista, productId: producto.id, texto: producto.code.slice(0, 8), pagina: 99, tamano: 10 });
    assert(r.ok); assert.equal(r.pagina.total, 1); assert.equal(r.pagina.pagina, 1); assert.equal(r.pagina.datos[0].cantidad, "5.125");
    if (vista !== "stock") assert.equal(r.pagina.datos[0].producto, nombre);
  }
  assert.equal((await consultarInventarioTerminado({ vista: "inventado" })).ok, false);
  const catalogo = await catalogosTerminado(); assert(catalogo.bodegas.some(b => b.id === bodegas[0].id)); assert(!catalogo.bodegas.some(b => b.id === bodegas[2].id || b.id === bodegas[3].id));
  // Una fila cero también conserva identidad/unidad y admite su primer ingreso.
  await prisma.productWarehouseStock.create({ data: { productId: producto.id, warehouseId: bodegas[1].id, quantity: "0" } });
  const actualizado = { ...combinacion(1), productVersion: 2 };
  const r = await consultarSaldoTerminado(actualizado); assert(r.ok && r.puedeInicial);
  const segundo = { ...d, ...actualizado, idempotencyKey: randomUUID(), reference: r.referencia };
  const previos = await contar();
  // Fallo deliberado al final de la transacción: documento, saldo y movimiento deben revertirse juntos.
  await prisma.$executeRawUnsafe('CREATE FUNCTION prueba_fallo_terminado() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'Fallo de prueba\'; END $$');
  await prisma.$executeRawUnsafe('CREATE TRIGGER prueba_fallo_terminado BEFORE INSERT ON "ProductInventoryOperation" FOR EACH ROW EXECUTE FUNCTION prueba_fallo_terminado()');
  try { assert.equal((await registrarInicialTerminado(segundo)).ok, false); assert.deepEqual(await contar(), previos); }
  finally { await prisma.$executeRawUnsafe('DROP TRIGGER prueba_fallo_terminado ON "ProductInventoryOperation"'); await prisma.$executeRawUnsafe('DROP FUNCTION prueba_fallo_terminado()'); }
  const carreras = await Promise.all([registrarInicialTerminado(segundo), registrarInicialTerminado({ ...segundo, idempotencyKey: randomUUID() })]);
  assert.equal(carreras.filter(x => x.ok).length, 1);
  assert.equal(JSON.stringify([await prisma.warehouseStock.findMany({ orderBy: { id: "asc" } }), await prisma.stockMovement.findMany({ orderBy: { id: "asc" } })]), raw);
  console.log("OK: carga inicial sin receta/consumo, cero sin escritura, decimales, fechas, bodegas, versiones, concurrencia, UUID, snapshots, inmutabilidad, stock/Kardex y rollback.");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
