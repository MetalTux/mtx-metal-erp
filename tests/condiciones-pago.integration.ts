import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { consultarCondicion, guardarCondicion, eliminarCondicion, listarCondiciones } from "../src/lib/servicios/condiciones-pago";

async function main() {
  const destino = new URL(process.env.DATABASE_URL!);
  assert(["localhost", "127.0.0.1"].includes(destino.hostname) && destino.pathname.startsWith("/mtx_validacion_condiciones_"), "Usar exclusivamente copia local de Condiciones de Pago.");
  const ids: number[] = [];
  let clienteId: number | undefined, cotizacionId: number | undefined;
  const nombre = `Condición prueba ${Date.now()}`;
  try {
    const listado = await listarCondiciones();
    for (const [name, days] of [["Al día", 0], ["30 días", 30], ["60 días", 60], ["90 días", 90]] as const) {
      assert(listado.some(fila => fila.name === name && fila.days === days));
    }
    for (const days of [-1, 0.5, NaN, Infinity, "30", 2147483648]) assert.equal((await guardarCondicion({ name: nombre, days })).ok, false);
    assert.equal((await guardarCondicion({ name: " ", days: 0 })).ok, false);
    assert.equal((await consultarCondicion("1")).ok, false);
    const creada = await guardarCondicion({ name: ` ${nombre} `, days: 0 });
    assert(creada.ok && creada.condicion);
    const fila = creada.condicion;
    ids.push(fila.id);
    assert.equal(fila.name, nombre);
    assert.equal(typeof fila.createdAt, "string");
    assert.equal((await guardarCondicion({ name: nombre.toUpperCase(), days: 15 })).ok, false);
    const ref = { id: fila.id, version: fila.version };
    const carreras = await Promise.all([guardarCondicion({ name: nombre, days: 45 }, ref), guardarCondicion({ name: nombre, days: 60 }, ref)]);
    assert.equal(carreras.filter(r => r.ok).length, 1);
    assert.equal((await eliminarCondicion(ref)).ok, false);
    const vigente = await consultarCondicion(fila.id);
    assert(vigente.ok && vigente.condicion);
    assert.equal(vigente.condicion.version, fila.version + 1);

    clienteId = (await prisma.client.create({ data: { name: "Cliente de prueba de condición", rut: nombre } })).id;
    cotizacionId = (await prisma.quote.create({ data: {
      clientId: clienteId, totalAmount: "0", paymentConditionId: fila.id,
      paymentConditionName: nombre, paymentTermDays: vigente.condicion.days,
    } })).id;
    const editada = await guardarCondicion({ name: `${nombre} editada`, days: 90 }, { id: fila.id, version: vigente.condicion.version });
    assert(editada.ok && editada.condicion);
    assert.equal(editada.condicion.cotizaciones, 1);
    const historica = await prisma.quote.findUniqueOrThrow({ where: { id: cotizacionId } });
    assert.equal(historica.paymentConditionName, nombre);
    assert.equal(historica.paymentTermDays, vigente.condicion.days);
    assert.equal((await eliminarCondicion({ id: fila.id, version: editada.condicion.version })).ok, false);
    // CHECK y FK deben proteger escrituras fuera del servicio.
    await assert.rejects(prisma.paymentCondition.update({ where: { id: fila.id }, data: { days: -1 } }));
    await assert.rejects(prisma.paymentCondition.update({ where: { id: fila.id }, data: { name: " " } }));
    await assert.rejects(prisma.quote.update({ where: { id: cotizacionId }, data: { paymentTermDays: null } }));
    await prisma.quote.delete({ where: { id: cotizacionId } }); cotizacionId = undefined;
    assert((await eliminarCondicion({ id: fila.id, version: editada.condicion.version })).ok);
    assert.equal((await consultarCondicion(fila.id)).ok, false);
    console.log("Condiciones de Pago: bases, validación, unicidad, concurrencia, FK y copia histórica correctas.");
  } finally {
    if (cotizacionId) await prisma.quote.delete({ where: { id: cotizacionId } });
    if (clienteId) await prisma.client.delete({ where: { id: clienteId } });
    await prisma.paymentCondition.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
