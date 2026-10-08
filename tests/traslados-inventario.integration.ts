// Sólo copia local descartable; los fixtures nunca se crean en la base real.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import {
  consultarSaldoAjuste,
  registrarAjusteInventario,
} from "../src/lib/servicios/ajustes-inventario";
import {
  consultarSaldosTraslado,
  registrarTrasladoInventario,
} from "../src/lib/servicios/traslados-inventario";
import { consultarTraslados } from "../src/lib/consultas/traslados-inventario";
import {
  guardarCompra,
  consultarCompra,
  recibirCompra,
  anularCompra,
} from "../src/lib/servicios/compras";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      /^\/mtx_validacion_traslados_\d{8}_\d{6}$/.test(url.pathname),
  );
  const prefijo = `TR-${Date.now()}`,
    u = await prisma.unitMeasure.create({
      data: { name: prefijo, abbreviation: "un" },
    });
  const m = await prisma.rawMaterial.create({
    data: { code: prefijo, name: prefijo, unitMeasureId: u.id },
  });
  const a = await prisma.warehouse.create({
      data: { name: prefijo + " Origen" },
    }),
    b = await prisma.warehouse.create({ data: { name: prefijo + " Destino" } }),
    c = await prisma.warehouse.create({ data: { name: prefijo + " Nueva" } });
  async function ajustar(warehouseId: number, q: string, inicial = false) {
    const r = await consultarSaldoAjuste({
      rawMaterialId: m.id,
      unitMeasureId: u.id,
      warehouseId,
    });
    assert(r.ok);
    const salida = await registrarAjusteInventario({
      rawMaterialId: m.id,
      unitMeasureId: u.id,
      warehouseId,
      finalQuantity: q,
      reason: inicial ? "INVENTARIO_INICIAL" : "CONTEO_FISICO",
      date: "2026-10-07",
      note: "Conteo de validación",
      correctedAdjustmentId: null,
      idempotencyKey: randomUUID(),
      reference: r.referencia,
    });
    assert(salida.ok, JSON.stringify(salida));
  }
  await ajustar(a.id, "100", true);
  await prisma.warehouseStock.update({
    where: {
      warehouseId_rawMaterialId: { warehouseId: a.id, rawMaterialId: m.id },
    },
    data: { minStock: "10" },
  });
  await prisma.warehouseStock.create({
    data: { warehouseId: b.id, rawMaterialId: m.id, minStock: "5" },
  });
  async function preparar(
    quantity = "1",
    sourceWarehouseId = a.id,
    destinationWarehouseId = b.id,
    correctedTransferId: number | null = null,
  ) {
    const datos = {
      rawMaterialId: m.id,
      unitMeasureId: u.id,
      sourceWarehouseId,
      destinationWarehouseId,
    };
    const r = await consultarSaldosTraslado(datos);
    assert(r.ok, JSON.stringify(r));
    return {
      ...datos,
      quantity,
      date: "2026-10-07",
      note: "Traslado de validación",
      correctedTransferId,
      idempotencyKey: randomUUID(),
      sourceReference: r.origen,
      destinationReference: r.destino,
    };
  }
  async function stock(w: number) {
    return prisma.warehouseStock.findUnique({
      where: {
        warehouseId_rawMaterialId: { warehouseId: w, rawMaterialId: m.id },
      },
    });
  }
  async function invariant(w: number) {
    const s = await stock(w),
      sum = await prisma.stockMovement.aggregate({
        where: { warehouseId: w, rawMaterialId: m.id },
        _sum: { quantity: true },
      });
    assert((s?.quantity ?? new Prisma.Decimal(0)).eq(sum._sum.quantity ?? "0"));
  }
  assert.equal(await stock(c.id), null);
  await preparar("1", a.id, c.id);
  assert.equal(await stock(c.id), null);
  const n = await prisma.stockMovement.count();
  for (const q of ["0", "-1", "NaN", "1.0001", "100000000000", "101"])
    assert(!(await registrarTrasladoInventario(await preparar(q))).ok);
  assert(
    !(
      await registrarTrasladoInventario({
        ...(await preparar()),
        date: "9999-01-01",
      })
    ).ok,
  );
  assert(
    !(
      await registrarTrasladoInventario({
        ...(await preparar()),
        destinationWarehouseId: a.id,
      })
    ).ok,
  );
  assert(
    !(await registrarTrasladoInventario({ ...(await preparar()), note: " " }))
      .ok,
  );
  assert.equal(await prisma.stockMovement.count(), n);
  const datos = await preparar("2,125");
  const [r, repetido] = await Promise.all([
    registrarTrasladoInventario(datos),
    registrarTrasladoInventario(datos),
  ]);
  assert(r.ok && repetido.ok && r.trasladoId === repetido.trasladoId);
  assert.equal(await prisma.stockMovement.count(), n + 2);
  assert(!(await registrarTrasladoInventario({ ...datos, quantity: "3" })).ok);
  assert((await stock(a.id))!.quantity.eq("97.875"));
  assert((await stock(b.id))!.quantity.eq("2.125"));
  assert((await stock(a.id))!.minStock!.eq("10"));
  assert((await stock(b.id))!.minStock!.eq("5"));
  const viejo = await preparar("1");
  await ajustar(a.id, "90");
  assert(!(await registrarTrasladoInventario(viejo)).ok);
  const inverso = await registrarTrasladoInventario(
    await preparar("2.125", b.id, a.id, r.trasladoId),
  );
  assert(inverso.ok);
  await ajustar(b.id, "10");
  assert(
    !(
      await registrarTrasladoInventario(
        await preparar("2.125", b.id, a.id, r.trasladoId),
      )
    ).ok,
  );
  const primera = await prisma.inventoryTransfer.findUniqueOrThrow({
    where: { id: r.trasladoId },
  });
  assert(primera.quantity.eq("2.125"));
  await assert.rejects(
    prisma.inventoryTransfer.update({
      where: { id: r.trasladoId },
      data: { note: "Cambiar historia" },
    }),
  );
  await assert.rejects(
    prisma.inventoryTransfer.delete({ where: { id: r.trasladoId } }),
  );
  const movimiento = await prisma.stockMovement.findFirstOrThrow({
    where: { outgoingTransferId: r.trasladoId },
  });
  await assert.rejects(
    prisma.stockMovement.update({
      where: { id: movimiento.id },
      data: { note: "Cambiar historia" },
    }),
  );
  await assert.rejects(
    prisma.stockMovement.delete({ where: { id: movimiento.id } }),
  );
  assert(
    (await registrarTrasladoInventario(await preparar("1.125", a.id, c.id))).ok,
  );
  assert((await stock(c.id))!.quantity.eq("1.125"));
  assert.equal((await stock(c.id))!.minStock, null);
  await ajustar(b.id, "10");
  const [ida, vuelta] = await Promise.all([
    preparar("1", a.id, b.id),
    preparar("1", b.id, a.id),
  ]);
  const opuestos = await Promise.all([
    registrarTrasladoInventario(ida),
    registrarTrasladoInventario(vuelta),
  ]);
  assert.equal(opuestos.filter((r) => r.ok).length, 1);
  for (const w of [a.id, b.id, c.id]) await invariant(w);
  const disponible = (await stock(c.id))!.quantity;
  assert(
    (
      await registrarTrasladoInventario(
        await preparar(disponible.toString(), c.id, a.id),
      )
    ).ok,
  );
  assert((await stock(c.id))!.quantity.isZero());
  // No permitir correcciones parciales ni saldo de destino fuera de Decimal(14,3).
  assert(
    !(
      await registrarTrasladoInventario(
        await preparar("1", b.id, a.id, r.trasladoId),
      )
    ).ok,
  );
  const limite = await prisma.warehouse.create({
    data: { name: prefijo + " Límite" },
  });
  await ajustar(limite.id, "99999999999.999", true);
  assert(
    !(
      await registrarTrasladoInventario(
        await preparar("0.001", a.id, limite.id),
      )
    ).ok,
  );
  const incidencia = await prisma.warehouse.create({
    data: { name: prefijo + " Incidencia" },
  });
  await prisma.warehouseStock.create({
    data: { rawMaterialId: m.id, warehouseId: incidencia.id, quantity: "-1" },
  });
  await prisma.stockMovement.create({
    data: {
      rawMaterialId: m.id,
      warehouseId: incidencia.id,
      type: "AJUSTE",
      quantity: "-1",
    },
  });
  const saldoNegativo = await registrarTrasladoInventario(
    await preparar("1", a.id, incidencia.id),
  );
  assert(!saldoNegativo.ok && saldoNegativo.mensaje.includes("saldo negativo"));
  const descuadre = await prisma.warehouse.create({
    data: { name: prefijo + " Descuadre" },
  });
  await prisma.warehouseStock.create({
    data: { rawMaterialId: m.id, warehouseId: descuadre.id, quantity: "1" },
  });
  const descuadrado = await registrarTrasladoInventario(
    await preparar("1", a.id, descuadre.id),
  );
  assert(!descuadrado.ok && descuadrado.mensaje.includes("Kardex"));
  // Falla la entrada: revertir también salida, saldos, documento y UUID.
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION "falloTrasladoPrueba"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.note='FALLO CONTROLADO' AND NEW.type='ENTRADA' THEN RAISE EXCEPTION 'Fallo controlado'; END IF; RETURN NEW; END; $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER "falloTrasladoPrueba" BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION "falloTrasladoPrueba"()`,
  );
  const falloDatos = { ...(await preparar()), note: "FALLO CONTROLADO" },
    docs = await prisma.inventoryTransfer.count(),
    antesA = await stock(a.id),
    antesB = await stock(b.id),
    antesMov = await prisma.stockMovement.count();
  assert(!(await registrarTrasladoInventario(falloDatos)).ok);
  assert.deepEqual(await stock(a.id), antesA);
  assert.deepEqual(await stock(b.id), antesB);
  assert.equal(await prisma.inventoryTransfer.count(), docs);
  assert.equal(await prisma.stockMovement.count(), antesMov);
  assert.equal(
    await prisma.inventoryOperation.findUnique({
      where: { idempotencyKey: falloDatos.idempotencyKey },
    }),
    null,
  );
  await prisma.$executeRawUnsafe(
    `DROP TRIGGER "falloTrasladoPrueba" ON "StockMovement"`,
  );
  await prisma.$executeRawUnsafe(`DROP FUNCTION "falloTrasladoPrueba"()`);
  // El CHECK diferido rechaza documentos que intentan confirmarse sin el par de movimientos.
  await assert.rejects(
    prisma.inventoryTransfer.create({
      data: {
        rawMaterialId: m.id,
        sourceWarehouseId: a.id,
        destinationWarehouseId: b.id,
        quantity: "1",
        sourcePreviousQuantity: "10",
        sourceFinalQuantity: "9",
        destinationPreviousQuantity: "0",
        destinationFinalQuantity: "1",
        date: new Date("2026-10-07"),
        note: "Sin par",
      },
    }),
  );
  // Compra recibida: trasladar y devolver no permite anularla después.
  const proveedor = await prisma.supplier.upsert({
      where: { rut: "22222222-2" },
      create: { rut: "22222222-2", name: prefijo },
      update: {},
    }),
    tipo = await prisma.documentType.findFirstOrThrow();
  const creada = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo,
      warehouseId: a.id,
      lines: [
        {
          rawMaterialId: m.id,
          presentation: "Unidad",
          purchasedQuantity: "2",
          unitFactor: "1",
          unitPrice: "100",
        },
      ],
    },
    randomUUID(),
  );
  assert(creada.ok && creada.id);
  const compra = await consultarCompra(creada.id);
  assert(compra.ok && compra.compra);
  assert(
    (
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            {
              purchaseDetailId: compra.compra.lines[0].id,
              receivedQuantity: "2",
            },
          ],
        },
        { id: creada.id, version: compra.compra.version },
        randomUUID(),
      )
    ).ok,
  );
  const posterior = await registrarTrasladoInventario({
    ...(await preparar("2", a.id, b.id)),
    date: "2026-10-01",
  });
  assert(posterior.ok);
  assert(
    (
      await registrarTrasladoInventario(
        await preparar("2", b.id, a.id, posterior.trasladoId),
      )
    ).ok,
  );
  const recibida = await consultarCompra(creada.id);
  assert(recibida.ok && recibida.compra);
  const anulacion = await anularCompra(
    { reason: "Prueba de bloqueo" },
    { id: creada.id, version: recibida.compra.version },
    randomUUID(),
  );
  assert(!anulacion.ok && anulacion.mensaje.includes("posterior"));
  // Registro concurrente con recepción: revalidar versiones, sin perder cantidades.
  const nueva = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo + "-REC",
      warehouseId: a.id,
      lines: [
        {
          rawMaterialId: m.id,
          presentation: "Unidad",
          purchasedQuantity: "2",
          unitFactor: "1",
          unitPrice: "100",
        },
      ],
    },
    randomUUID(),
  );
  assert(nueva.ok && nueva.id);
  const nc = await consultarCompra(nueva.id);
  assert(nc.ok && nc.compra);
  const trasladoCarrera = await preparar();
  const carrera = await Promise.all([
    recibirCompra(
      {
        date: "2026-10-07",
        lines: [
          { purchaseDetailId: nc.compra.lines[0].id, receivedQuantity: "1" },
        ],
      },
      { id: nueva.id, version: nc.compra.version },
      randomUUID(),
    ),
    registrarTrasladoInventario(trasladoCarrera),
  ]);
  assert(carrera[0].ok);
  for (const w of [a.id, b.id, c.id]) await invariant(w);
  for (let i = 0; i < 11; i++)
    assert(
      (await registrarTrasladoInventario(await preparar("0.001", a.id, b.id)))
        .ok,
    );
  const listado = await consultarTraslados({
    rawMaterialId: m.id,
    sourceWarehouseId: a.id,
    tamano: 10,
    pagina: 2,
  });
  assert(
    listado.ok &&
      listado.pagina.pagina === 2 &&
      listado.pagina.datos.length > 0,
  );
  assert.equal(
    listado.pagina.total,
    await prisma.inventoryTransfer.count({
      where: { rawMaterialId: m.id, sourceWarehouseId: a.id },
    }),
  );
  assert(
    !(await consultarTraslados({ desde: "2026-10-08", hasta: "2026-10-07" }))
      .ok,
  );
  console.log(
    "Traslados: precisión, disponibilidad, mínimos, par atómico, historial, corrección completa, UUID, concurrencia, rollback, compras, saldo/Kardex y filtros/paginación aprobados.",
  );
}
main().finally(() => prisma.$disconnect());
