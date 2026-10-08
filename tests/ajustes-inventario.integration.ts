// Ejecutar sólo en copia local descartable: nunca se crean fixtures en la base real.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import {
  consultarSaldoAjuste,
  registrarAjusteInventario,
} from "../src/lib/servicios/ajustes-inventario";
import { consultarAjustes } from "../src/lib/consultas/ajustes-inventario";
import {
  guardarCompra,
  consultarCompra,
  recibirCompra,
  anularCompra,
} from "../src/lib/servicios/compras";
async function main() {
  const u = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(u.hostname) &&
      /^\/mtx_validacion_ajustes_\d{8}_\d{6}$/.test(u.pathname),
  );
  const prefijo = `AJ-${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({
    data: { name: prefijo, abbreviation: "un" },
  });
  const m = await prisma.rawMaterial.create({
    data: {
      code: prefijo,
      name: prefijo + " Material",
      unitMeasureId: unidad.id,
    },
  });
  const b = await prisma.warehouse.create({
    data: { name: prefijo + " Bodega" },
  });
  const otra = await prisma.warehouse.create({
    data: { name: prefijo + " Otra" },
  });
  const combinacion = {
    rawMaterialId: m.id,
    warehouseId: b.id,
    unitMeasureId: unidad.id,
  };
  async function preparar(
    cantidad: string,
    reason = "CONTEO_FISICO",
    warehouseId = b.id,
  ) {
    const r = await consultarSaldoAjuste({ ...combinacion, warehouseId });
    assert(r.ok);
    return {
      ...combinacion,
      warehouseId,
      finalQuantity: cantidad,
      date: "2026-10-07",
      reason,
      note: "Conteo físico de validación",
      correctedAdjustmentId: null as number | null,
      reference: r.referencia,
      idempotencyKey: randomUUID(),
    };
  }
  const filasAntes = await prisma.warehouseStock.count();
  await preparar("0");
  assert.equal(await prisma.warehouseStock.count(), filasAntes);
  const cero = await registrarAjusteInventario(await preparar("0"));
  assert(cero.ok && cero.ajusteId === null);
  assert.equal(await prisma.warehouseStock.count(), filasAntes);
  assert(
    !(
      await registrarAjusteInventario({
        ...(await preparar("1")),
        date: "9999-01-01",
      })
    ).ok,
  );
  for (const cantidad of ["-1", "NaN", "0.0001", "100000000000"])
    assert(!(await registrarAjusteInventario(await preparar(cantidad))).ok);
  const inicial = await preparar("10,125", "INVENTARIO_INICIAL");
  const [a, repetido] = await Promise.all([
    registrarAjusteInventario(inicial),
    registrarAjusteInventario(inicial),
  ]);
  assert(a.ok && repetido.ok && a.ajusteId === repetido.ajusteId && a.ajusteId);
  assert.equal(
    await prisma.stockMovement.count({ where: { rawMaterialId: m.id } }),
    1,
  );
  assert(
    !(await registrarAjusteInventario({ ...inicial, finalQuantity: "11" })).ok,
  );
  assert(
    !(
      await registrarAjusteInventario(
        await preparar("11", "INVENTARIO_INICIAL"),
      )
    ).ok,
  );
  await prisma.warehouseStock.update({
    where: {
      warehouseId_rawMaterialId: { warehouseId: b.id, rawMaterialId: m.id },
    },
    data: { minStock: "7" },
  });
  const viejo = await preparar("9");
  const disminuye = await registrarAjusteInventario(
    await preparar("8.125", "MERMA_PERDIDA"),
  );
  assert(disminuye.ok);
  assert(!(await registrarAjusteInventario(viejo)).ok);
  const correccion = {
    ...(await preparar("9.125", "CORRECCION_REGISTRO")),
    correctedAdjustmentId: a.ajusteId,
  };
  const c = await registrarAjusteInventario(correccion);
  assert(c.ok && c.ajusteId);
  assert(
    !(
      await registrarAjusteInventario({
        ...(await preparar("1", "CORRECCION_REGISTRO", otra.id)),
        correctedAdjustmentId: a.ajusteId,
      })
    ).ok,
  );
  const r1 = await preparar("10"),
    r2 = await preparar("11");
  const carrera = await Promise.all([
    registrarAjusteInventario(r1),
    registrarAjusteInventario(r2),
  ]);
  assert.equal(carrera.filter((r) => r.ok).length, 1);
  const stock = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: { warehouseId: b.id, rawMaterialId: m.id },
    },
  });
  const suma = await prisma.stockMovement.aggregate({
    where: { warehouseId: b.id, rawMaterialId: m.id },
    _sum: { quantity: true },
  });
  assert(stock.quantity.eq(suma._sum.quantity!));
  assert(stock.minStock?.eq("7"));
  await assert.rejects(
    prisma.inventoryAdjustment.update({
      where: { id: a.ajusteId },
      data: { note: "Sobrescribir" },
    }),
  );
  await assert.rejects(
    prisma.inventoryAdjustment.delete({ where: { id: a.ajusteId } }),
  );
  await assert.rejects(
    prisma.inventoryAdjustment.create({
      data: {
        warehouseId: b.id,
        rawMaterialId: m.id,
        date: new Date(),
        reason: "OTRO",
        note: "Inválido",
        previousQuantity: "1",
        finalQuantity: "2",
        difference: "5",
      },
    }),
  );
  // Fila de mínimos sin historial sí permite carga inicial; el mínimo se preserva.
  await prisma.warehouseStock.create({
    data: { warehouseId: otra.id, rawMaterialId: m.id, minStock: "4" },
  });
  assert(
    (
      await registrarAjusteInventario(
        await preparar("3", "INVENTARIO_INICIAL", otra.id),
      )
    ).ok,
  );
  const listado = await consultarAjustes({
    rawMaterialId: m.id,
    reason: "INVENTARIO_INICIAL",
  });
  assert(listado.ok && listado.pagina.total === 2);
  assert(
    !(await consultarAjustes({ desde: "2026-10-08", hasta: "2026-10-07" })).ok,
  );
  // Incidencia previa: el conteo restaura un saldo no negativo sin inventar reconciliaciones.
  const negativo = await prisma.warehouse.create({
    data: { name: prefijo + " Incidencia" },
  });
  await prisma.warehouseStock.create({
    data: { warehouseId: negativo.id, rawMaterialId: m.id, quantity: "-1" },
  });
  await prisma.stockMovement.create({
    data: {
      warehouseId: negativo.id,
      rawMaterialId: m.id,
      type: "AJUSTE",
      quantity: "-1",
    },
  });
  assert(
    (
      await registrarAjusteInventario(
        await preparar("0", "CONTEO_FISICO", negativo.id),
      )
    ).ok,
  );
  // Fallo al insertar el movimiento debe revertir documento y cambio de stock.
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION "falloAjustePrueba"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.note='FALLO CONTROLADO' THEN RAISE EXCEPTION 'Fallo controlado'; END IF; RETURN NEW; END; $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER "falloAjustePrueba" BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION "falloAjustePrueba"()`,
  );
  const antes = await consultarSaldoAjuste(combinacion);
  assert(antes.ok);
  const docs = await prisma.inventoryAdjustment.count();
  assert(
    !(
      await registrarAjusteInventario({
        ...(await preparar("20")),
        note: "FALLO CONTROLADO",
      })
    ).ok,
  );
  const despues = await consultarSaldoAjuste(combinacion);
  assert(despues.ok);
  assert.deepEqual(antes.referencia, despues.referencia);
  assert.equal(await prisma.inventoryAdjustment.count(), docs);
  await prisma.$executeRawUnsafe(
    `DROP TRIGGER "falloAjustePrueba" ON "StockMovement"`,
  );
  await prisma.$executeRawUnsafe(`DROP FUNCTION "falloAjustePrueba"()`);
  // Un ajuste negativo posterior bloquea anulación aunque se reponga y su fecha manual sea anterior.
  const proveedor = await prisma.supplier.upsert({
    where: { rut: "22222222-2" },
    create: { rut: "22222222-2", name: prefijo },
    update: {},
  });
  const tipo = await prisma.documentType.findFirstOrThrow();
  const creada = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo,
      warehouseId: b.id,
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
  const saldoCompra = await consultarSaldoAjuste(combinacion);
  assert(saldoCompra.ok);
  const cantidadActual = new (
    await import("../src/generated/prisma/client")
  ).Prisma.Decimal(saldoCompra.referencia.quantity);
  assert(
    (
      await registrarAjusteInventario({
        ...(await preparar(cantidadActual.minus(1).toString())),
        date: "2026-10-01",
      })
    ).ok,
  );
  assert(
    (await registrarAjusteInventario(await preparar(cantidadActual.toString())))
      .ok,
  );
  const actualizada = await consultarCompra(creada.id);
  assert(actualizada.ok && actualizada.compra);
  assert(
    !(
      await anularCompra(
        { reason: "Validación de bloqueo" },
        { id: creada.id, version: actualizada.compra.version },
        randomUUID(),
      )
    ).ok,
  );
  // Recepción y ajuste concurrentes usan el mismo orden material → stock, sin perder cantidades.
  const compraParcial = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo + "-CARRERA",
      warehouseId: b.id,
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
  assert(compraParcial.ok && compraParcial.id);
  const cp = await consultarCompra(compraParcial.id);
  assert(cp.ok && cp.compra);
  const ajusteCarrera = await preparar("30");
  const [rc, ac] = await Promise.all([
    recibirCompra(
      {
        date: "2026-10-07",
        lines: [
          { purchaseDetailId: cp.compra.lines[0].id, receivedQuantity: "1" },
        ],
      },
      { id: cp.compra.id, version: cp.compra.version },
      randomUUID(),
    ),
    registrarAjusteInventario(ajusteCarrera),
  ]);
  assert(rc.ok);
  const post = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: { warehouseId: b.id, rawMaterialId: m.id },
    },
  });
  const movimientosPost = await prisma.stockMovement.aggregate({
    where: { warehouseId: b.id, rawMaterialId: m.id },
    _sum: { quantity: true },
  });
  assert(post.quantity.eq(movimientosPost._sum.quantity!));
  if (ac.ok) assert(post.quantity.eq("31"));
  for (let i = 0; i < 11; i++)
    assert(
      (await registrarAjusteInventario(await preparar(String(40 + i)))).ok,
    );
  const paginada = await consultarAjustes({
    rawMaterialId: m.id,
    tamano: 10,
    pagina: 2,
  });
  assert(
    paginada.ok &&
      paginada.pagina.pagina === 2 &&
      paginada.pagina.datos.length > 0,
  );
  assert.equal(
    paginada.pagina.total,
    await prisma.inventoryAdjustment.count({ where: { rawMaterialId: m.id } }),
  );
  // Anulación concurrente: gana el ajuste negativo o la reversión; nunca ambos ni un saldo huérfano.
  const bodegaAnular = await prisma.warehouse.create({
    data: { name: prefijo + " Anulación concurrente" },
  });
  const nuevaAnular = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo + "-ANULAR",
      warehouseId: bodegaAnular.id,
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
  assert(nuevaAnular.ok && nuevaAnular.id);
  const cabecera = await consultarCompra(nuevaAnular.id);
  assert(cabecera.ok && cabecera.compra);
  assert(
    (
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            {
              purchaseDetailId: cabecera.compra.lines[0].id,
              receivedQuantity: "2",
            },
          ],
        },
        { id: nuevaAnular.id, version: cabecera.compra.version },
        randomUUID(),
      )
    ).ok,
  );
  const recibida = await consultarCompra(nuevaAnular.id);
  assert(recibida.ok && recibida.compra);
  const conteoConcurrente = await preparar(
    "1",
    "CONTEO_FISICO",
    bodegaAnular.id,
  );
  const carreraAnulacion = await Promise.all([
    registrarAjusteInventario(conteoConcurrente),
    anularCompra(
      { reason: "Anulación concurrente de prueba" },
      { id: nuevaAnular.id, version: recibida.compra.version },
      randomUUID(),
    ),
  ]);
  assert.equal(carreraAnulacion.filter((r) => r.ok).length, 1);
  const stockAnular = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: {
        warehouseId: bodegaAnular.id,
        rawMaterialId: m.id,
      },
    },
  });
  const sumaAnular = await prisma.stockMovement.aggregate({
    where: { warehouseId: bodegaAnular.id, rawMaterialId: m.id },
    _sum: { quantity: true },
  });
  assert(stockAnular.quantity.eq(sumaAnular._sum.quantity!));
  assert(stockAnular.quantity.eq(carreraAnulacion[0].ok ? "1" : "0"));
  console.log(
    "Ajustes: carga inicial, conteo, corrección, precisión, saldo/Kardex, mínimos, idempotencia, conflictos, restricciones y rollback aprobados.",
  );
}
main().finally(() => prisma.$disconnect());
