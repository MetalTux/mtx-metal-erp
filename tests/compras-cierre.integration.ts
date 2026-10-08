// Sólo sobre una copia descartable: incluye salidas, reposición y fallos SQL inducidos.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import {
  guardarCompra,
  previsualizarCompra,
  consultarCompra,
  recibirCompra,
  cerrarPendienteCompra,
  anularCompra,
  eliminarCompra,
} from "../src/lib/servicios/compras";
import type { Compra } from "../src/lib/tipos/compra";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/mtx_validacion_recepciones_"),
  );
  const prefijo = `CIE-${Date.now()}`;
  const proveedor = await prisma.supplier.upsert({
    where: { rut: "22222222-2" },
    create: { rut: "22222222-2", name: prefijo + " Proveedor" },
    update: {},
  });
  const unidad = await prisma.unitMeasure.create({
    data: { name: prefijo, abbreviation: "un" },
  });
  const bodega = await prisma.warehouse.create({ data: { name: prefijo } });
  const material = await prisma.rawMaterial.create({
    data: { code: prefijo, name: prefijo, unitMeasureId: unidad.id },
  });
  const tipo = await prisma.documentType.findUniqueOrThrow({
    where: { code: "FACTURA_COMPRA" },
  });
  const base = {
    date: "2026-10-07",
    supplierId: proveedor.id,
    warehouseId: bodega.id,
    documentTypeId: tipo.id,
    documentNumber: prefijo,
    lines: [
      {
        rawMaterialId: material.id,
        presentation: "Caja",
        purchasedQuantity: "2",
        unitFactor: "20",
        unitPrice: "10.05",
      },
    ],
  };
  const redondeo = previsualizarCompra({
    ...base,
    lines: [
      {
        ...base.lines[0],
        purchasedQuantity: "0.5",
        unitFactor: "2",
        unitPrice: "2.01",
      },
      {
        ...base.lines[0],
        purchasedQuantity: "0.5",
        unitFactor: "2",
        unitPrice: "2.01",
      },
    ],
  });
  assert(redondeo.ok);
  assert.equal(redondeo.calculo.total, "2.02");
  assert(
    !previsualizarCompra({
      ...base,
      lines: [
        {
          ...base.lines[0],
          purchasedQuantity: "99999999999",
          unitFactor: "20",
        },
      ],
    }).ok,
  );
  assert(
    !previsualizarCompra({
      ...base,
      lines: [{ ...base.lines[0], unitPrice: "999999999999.99" }],
    }).ok,
  );
  const nueva = async (sufijo: string) => {
    const r = await guardarCompra(
      { ...base, documentNumber: prefijo + sufijo },
      randomUUID(),
    );
    assert(r.ok && r.id);
    return leer(r.id);
  };
  const leer = async (id: number) => {
    const r = await consultarCompra(id);
    assert(r.ok && r.compra);
    return r.compra;
  };
  const ref = (c: Compra) => ({ id: c.id, version: c.version });
  const recibir = async (c: Compra, q = "0.5") => {
    const r = await recibirCompra(
      {
        date: "2026-10-07",
        lines: [{ purchaseDetailId: c.lines[0].id, receivedQuantity: q }],
      },
      ref(c),
      randomUUID(),
    );
    assert(r.ok, JSON.stringify(r));
    return leer(c.id);
  };
  const stock = async () =>
    await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_rawMaterialId: {
          warehouseId: bodega.id,
          rawMaterialId: material.id,
        },
      },
    });
  let c = await nueva("-CIERRE");
  const key = randomUUID(),
    datos = {
      purchaseDetailId: c.lines[0].id,
      reason: "Proveedor no entregará el resto",
    };
  const cierre = await Promise.all([
    cerrarPendienteCompra(datos, ref(c), key),
    cerrarPendienteCompra(datos, ref(c), key),
  ]);
  assert(cierre.every((r) => r.ok));
  assert.equal(
    await prisma.purchasePendingClosure.count({ where: { purchaseId: c.id } }),
    1,
  );
  assert.equal(await stock(), null);
  assert(
    !(
      await cerrarPendienteCompra({ ...datos, reason: "Distinta" }, ref(c), key)
    ).ok,
  );
  c = await leer(c.id);
  assert.equal(c.lines[0].pendiente, "0");
  assert.equal(c.lines[0].purchasedQuantity, "2");
  assert(
    !(
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [{ purchaseDetailId: c.lines[0].id, receivedQuantity: "1" }],
        },
        ref(c),
        randomUUID(),
      )
    ).ok,
  );
  assert(
    !(
      await guardarCompra(
        {
          ...base,
          documentNumber: c.documentNumber,
          lines: [{ ...c.lines[0], purchasedQuantity: "3" }],
        },
        randomUUID(),
        ref(c),
      )
    ).ok,
  );
  const fecha = await guardarCompra(
    {
      ...base,
      date: "2026-10-06",
      documentNumber: c.documentNumber,
      lines: c.lines,
    },
    randomUUID(),
    ref(c),
  );
  assert(fecha.ok);
  c = await leer(c.id);
  assert(
    (
      await anularCompra(
        { reason: "Documento incorrecto" },
        ref(c),
        randomUUID(),
      )
    ).ok,
  );
  assert.equal(await stock(), null);
  assert.equal(
    await prisma.stockMovement.count({
      where: { purchaseDetailId: c.lines[0].id },
    }),
    0,
  );
  assert(
    !(
      await anularCompra(
        { reason: "" },
        ref(await nueva("-MOTIVO")),
        randomUUID(),
      )
    ).ok,
  );
  // Recibido parcial más cierre: sólo se revierte lo realmente recibido, conservando mínimo e historial.
  let parcial = await recibir(await nueva("-PARCIAL"));
  assert(
    (
      await cerrarPendienteCompra(
        {
          purchaseDetailId: parcial.lines[0].id,
          reason: "Sin entrega restante",
        },
        ref(parcial),
        randomUUID(),
      )
    ).ok,
  );
  parcial = await leer(parcial.id);
  assert.equal(parcial.lines[0].recibido, "0.5");
  assert.equal(parcial.lines[0].cerrado, "1.5");
  const saldo = (await stock())!;
  await prisma.warehouseStock.update({
    where: { id: saldo.id },
    data: { minStock: "2" },
  });
  const anulacion = randomUUID(),
    motivo = { reason: "Compra cancelada" },
    original = ref(parcial);
  const anuladas = await Promise.all([
    anularCompra(motivo, original, anulacion),
    anularCompra(motivo, original, anulacion),
  ]);
  assert(anuladas.every((r) => r.ok));
  assert((await stock())!.quantity.eq(0));
  assert((await stock())!.minStock!.eq(2));
  const movimientos = await prisma.stockMovement.findMany({
    where: { purchaseDetailId: parcial.lines[0].id },
    orderBy: { id: "asc" },
  });
  assert.equal(movimientos.length, 2);
  assert(movimientos[0].quantity.eq(10));
  assert(movimientos[1].quantity.eq(-10));
  assert.equal(movimientos[1].type, "AJUSTE");
  assert(movimientos[1].reversedReceiptDetailId);
  assert.equal(
    await prisma.purchaseReceipt.count({ where: { purchaseId: parcial.id } }),
    1,
  );
  assert.equal(
    await prisma.purchasePendingClosure.count({
      where: { purchaseId: parcial.id },
    }),
    1,
  );
  const anulada = await leer(parcial.id);
  assert.equal(anulada.lines[0].pendiente, "0");
  assert.equal(anulada.estado, "Anulada");
  assert(
    !(
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            { purchaseDetailId: parcial.lines[0].id, receivedQuantity: "1" },
          ],
        },
        ref(anulada),
        randomUUID(),
      )
    ).ok,
  );
  assert((await eliminarCompra(ref(anulada), randomUUID())).ok);
  assert((await leer(parcial.id)).deletedAt);
  assert.equal(
    await prisma.purchaseDetail.count({ where: { purchaseId: parcial.id } }),
    1,
  );
  assert(
    !(
      await guardarCompra(
        { ...base, documentNumber: parcial.documentNumber },
        randomUUID(),
      )
    ).ok,
  );
  // La fecha manual retroactiva de una salida no evade el bloqueo; tampoco la reposición posterior.
  const bloqueada = await recibir(await nueva("-CONSUMIDA"));
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.update({
      where: { id: saldo.id },
      data: { quantity: { decrement: 1 } },
    });
    await tx.stockMovement.create({
      data: {
        date: new Date("2000-01-01"),
        type: "SALIDA",
        quantity: "-1",
        warehouseId: bodega.id,
        rawMaterialId: material.id,
        note: "Consumo de prueba retroactivo",
      },
    });
  });
  assert(
    !(await anularCompra({ reason: "No puede" }, ref(bloqueada), randomUUID()))
      .ok,
  );
  await recibir(await nueva("-REPONE"));
  assert((await stock())!.quantity.gt(10));
  assert(
    !(
      await anularCompra(
        { reason: "Tampoco con reposición" },
        ref(bloqueada),
        randomUUID(),
      )
    ).ok,
  );
  // Un ajuste negativo también bloquea; usar otra combinación para no mezclar los motivos de rechazo.
  const bodega2 = await prisma.warehouse.create({
    data: { name: prefijo + " Segunda" },
  });
  const r2 = await guardarCompra(
    { ...base, warehouseId: bodega2.id, documentNumber: prefijo + "-AJUSTE" },
    randomUUID(),
  );
  assert(r2.ok && r2.id);
  const ajuste = await recibir(await leer(r2.id));
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.update({
      where: {
        warehouseId_rawMaterialId: {
          warehouseId: bodega2.id,
          rawMaterialId: material.id,
        },
      },
      data: { quantity: { decrement: 1 } },
    });
    await tx.stockMovement.create({
      data: {
        date: new Date("1999-01-01"),
        type: "AJUSTE",
        quantity: "-1",
        warehouseId: bodega2.id,
        rawMaterialId: material.id,
      },
    });
  });
  assert(
    !(
      await anularCompra(
        { reason: "Bloqueo ajuste" },
        ref(ajuste),
        randomUUID(),
      )
    ).ok,
  );
  // Fallo durante la creación del ajuste tras descontar stock: rollback conserva recepción, saldo y versión.
  let fallo = await nueva("-FALLO");
  fallo = await recibir(fallo);
  const antes = (await stock())!.quantity;
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION mtx_prueba_fallo_anular() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."purchaseDetailId"=${fallo.lines[0].id} AND NEW.type='AJUSTE' THEN RAISE EXCEPTION 'Fallo controlado de anulación'; END IF; RETURN NEW; END $$`,
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER mtx_prueba_fallo_anular BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION mtx_prueba_fallo_anular()',
  );
  try {
    assert(
      !(await anularCompra({ reason: "Prueba" }, ref(fallo), randomUUID())).ok,
    );
    assert((await stock())!.quantity.eq(antes));
    assert.equal((await leer(fallo.id)).voidedAt, null);
    assert.equal((await leer(fallo.id)).version, fallo.version);
  } finally {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER mtx_prueba_fallo_anular ON "StockMovement"',
    );
    await prisma.$executeRawUnsafe("DROP FUNCTION mtx_prueba_fallo_anular()");
  }
  // Recibir y anular simultáneamente: sólo una operación con esa versión puede triunfar.
  const carrera = await nueva("-CARRERA");
  const race = await Promise.all([
    recibirCompra(
      {
        date: "2026-10-07",
        lines: [
          { purchaseDetailId: carrera.lines[0].id, receivedQuantity: "0.5" },
        ],
      },
      ref(carrera),
      randomUUID(),
    ),
    anularCompra({ reason: "Concurrente" }, ref(carrera), randomUUID()),
  ]);
  assert.equal(race.filter((r) => r.ok).length, 1);
  const sum = await prisma.stockMovement.aggregate({
    where: { warehouseId: bodega.id, rawMaterialId: material.id },
    _sum: { quantity: true },
  });
  assert((await stock())!.quantity.eq(sum._sum.quantity!));
  // Saldos iniciales representados por AJUSTE anteriores a la compra permanecen intactos.
  const inicialBodega = await prisma.warehouse.create({
    data: { name: prefijo + " Inicial" },
  });
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.create({
      data: {
        warehouseId: inicialBodega.id,
        rawMaterialId: material.id,
        quantity: "5",
      },
    });
    await tx.stockMovement.create({
      data: {
        type: "AJUSTE",
        quantity: "5",
        warehouseId: inicialBodega.id,
        rawMaterialId: material.id,
        note: "Saldo inicial de prueba",
      },
    });
  });
  const inicialR = await guardarCompra(
    {
      ...base,
      warehouseId: inicialBodega.id,
      documentNumber: prefijo + "-INICIAL",
    },
    randomUUID(),
  );
  assert(inicialR.ok && inicialR.id);
  const inicial = await recibir(await leer(inicialR.id));
  assert(
    (
      await anularCompra(
        { reason: "Conservar saldo inicial" },
        ref(inicial),
        randomUUID(),
      )
    ).ok,
  );
  const inicialS = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: {
        warehouseId: inicialBodega.id,
        rawMaterialId: material.id,
      },
    },
  });
  assert(inicialS.quantity.eq(5));
  // Una alteración de saldo sin Kardex se rechaza, sin intentar cuadrarla mediante ajustes ficticios.
  const inconsistenteR = await guardarCompra(
    {
      ...base,
      warehouseId: inicialBodega.id,
      documentNumber: prefijo + "-INCONSISTENTE",
    },
    randomUUID(),
  );
  assert(inconsistenteR.ok && inconsistenteR.id);
  const inconsistente = await recibir(await leer(inconsistenteR.id));
  await prisma.warehouseStock.update({
    where: { id: inicialS.id },
    data: { quantity: "14" },
  });
  assert(
    !(
      await anularCompra(
        { reason: "Saldo distinto" },
        ref(inconsistente),
        randomUUID(),
      )
    ).ok,
  );
  await prisma.warehouseStock.update({
    where: { id: inicialS.id },
    data: { quantity: "1" },
  });
  assert(
    !(
      await anularCompra(
        { reason: "Insuficiente" },
        ref(inconsistente),
        randomUUID(),
      )
    ).ok,
  );
  await prisma.warehouseStock.update({
    where: { id: inicialS.id },
    data: { quantity: "15" },
  });
  const web = await recibir(await nueva("-WEB"));
  const webBloqueada = await recibir(await nueva("-WEB-BLOQUEADA"));
  await prisma.$transaction(async (tx) => {
    await tx.warehouseStock.update({
      where: { id: saldo.id },
      data: { quantity: { decrement: 1 } },
    });
    await tx.stockMovement.create({
      data: {
        type: "SALIDA",
        quantity: "-1",
        warehouseId: bodega.id,
        rawMaterialId: material.id,
      },
    });
  });
  // Una bodega nueva permite probar la anulación desde navegador sin salidas compartidas.
  const webBodega = await prisma.warehouse.create({
    data: { name: prefijo + " Web" },
  });
  const webR = await guardarCompra(
    { ...base, warehouseId: webBodega.id, documentNumber: prefijo + "-WEB-OK" },
    randomUUID(),
  );
  assert(webR.ok && webR.id);
  const webOk = await recibir(await leer(webR.id));
  if (process.env.COMPRAS_FIXTURE_PATH)
    await writeFile(
      process.env.COMPRAS_FIXTURE_PATH,
      JSON.stringify({
        prefijo,
        compra: webOk,
        bloqueada: webBloqueada,
        cierre: web,
      }),
    );
  console.log(
    "Cierre/anulación: historial, inmutabilidad, idempotencia, bloqueos tras salidas y reposición, fechas retroactivas, rollback, concurrencia, saldo/Kardex y eliminación lógica correctos.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
