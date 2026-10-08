// Ejecutar sólo contra una copia local descartable: se prueban fallos y concurrencia reales en PostgreSQL.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { guardarMaterial } from "../src/lib/servicios/materiales";
import { Prisma } from "../src/generated/prisma/client";
import {
  guardarCompra,
  consultarCompra,
  recibirCompra,
  previsualizarRecepcionCompra,
} from "../src/lib/servicios/compras";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/mtx_validacion_recepciones_"),
  );
  const prefijo = `REC-${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({
    data: { name: prefijo, abbreviation: "un" },
  });
  const bodega = await prisma.warehouse.create({ data: { name: prefijo } });
  const material = await prisma.rawMaterial.create({
    data: { code: prefijo, name: prefijo, unitMeasureId: unidad.id },
  });
  const otro = await prisma.rawMaterial.create({
    data: {
      code: prefijo + "-2",
      name: prefijo + "-2",
      unitMeasureId: unidad.id,
    },
  });
  const proveedor = await prisma.supplier.upsert({
    where: { rut: "22222222-2" },
    create: { rut: "22222222-2", name: prefijo + " Proveedor" },
    update: {},
  });
  const tipo = await prisma.documentType.findUniqueOrThrow({
    where: { code: "FACTURA_COMPRA" },
  });
  const compra = async (
    numero: string,
    lineas = [
      {
        rawMaterialId: material.id,
        presentation: "Caja",
        purchasedQuantity: "2",
        unitFactor: "20",
        unitPrice: "100",
      },
    ],
  ) => {
    const r = await guardarCompra(
      {
        date: "2026-10-07",
        supplierId: proveedor.id,
        warehouseId: bodega.id,
        documentTypeId: tipo.id,
        documentNumber: prefijo + numero,
        lines: lineas,
      },
      randomUUID(),
    );
    assert(r.ok && r.id, JSON.stringify(r));
    const c = await consultarCompra(r.id);
    assert(c.ok && c.compra);
    return c.compra;
  };
  const c = await compra("-001");
  const ref = { id: c.id, version: c.version };
  const datos = {
    date: "2026-10-07",
    note: "Recepción parcial",
    lines: [{ purchaseDetailId: c.lines[0].id, receivedQuantity: "0.5" }],
  };
  const key = randomUUID();
  const respuestas = await Promise.all([
    recibirCompra(datos, ref, key),
    recibirCompra(datos, ref, key),
  ]);
  assert(
    respuestas.every((r) => r.ok),
    JSON.stringify(respuestas),
  );
  assert.equal(
    await prisma.purchaseReceipt.count({ where: { purchaseId: c.id } }),
    1,
  );
  const saldo = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: {
        warehouseId: bodega.id,
        rawMaterialId: material.id,
      },
    },
  });
  assert(saldo.quantity.eq(10));
  assert.equal(saldo.minStock, null);
  const movimiento = await prisma.stockMovement.findFirstOrThrow({
    where: { purchaseDetailId: c.lines[0].id },
  });
  assert.equal(movimiento.type, "ENTRADA");
  assert(movimiento.quantity.eq(10));
  assert(movimiento.purchaseReceiptDetailId);
  assert(!(await recibirCompra({ ...datos, note: "Distinta" }, ref, key)).ok);
  assert(!(await recibirCompra(datos, ref, randomUUID())).ok); // Versión vencida no genera otra entrada.
  const actualizado = await consultarCompra(c.id);
  assert(actualizado.ok && actualizado.compra);
  assert.equal(actualizado.compra.lines[0].pendiente, "1.5");
  assert.equal(actualizado.compra.estado, "Recepción parcial");
  await prisma.warehouseStock.update({
    where: { id: saldo.id },
    data: { minStock: "3.5" },
  });
  const ref2 = { id: c.id, version: actualizado.compra.version };
  for (const cantidad of ["0", "-1", "1.501", "NaN"])
    assert(
      !(
        await recibirCompra(
          {
            ...datos,
            lines: [{ ...datos.lines[0], receivedQuantity: cantidad }],
          },
          ref2,
          randomUUID(),
        )
      ).ok,
    );
  assert(
    !(
      await recibirCompra(
        { ...datos, lines: [datos.lines[0], datos.lines[0]] },
        ref2,
        randomUUID(),
      )
    ).ok,
  );
  assert(
    !(
      await recibirCompra(
        {
          ...datos,
          lines: [{ purchaseDetailId: 2147483647, receivedQuantity: "1" }],
        },
        ref2,
        randomUUID(),
      )
    ).ok,
  );
  // Dos solicitudes distintas con la misma versión: una sola recibe y la otra exige actualizar.
  const distintas = await Promise.all([
    recibirCompra(datos, ref2, randomUUID()),
    recibirCompra(datos, ref2, randomUUID()),
  ]);
  assert.equal(distintas.filter((r) => r.ok).length, 1);
  assert.equal(
    await prisma.purchaseReceipt.count({ where: { purchaseId: c.id } }),
    2,
  );
  const saldo2 = await prisma.warehouseStock.findUniqueOrThrow({
    where: { id: saldo.id },
  });
  assert(saldo2.quantity.eq(20));
  assert(saldo2.minStock!.eq("3.5"));
  const fin = await consultarCompra(c.id);
  assert(fin.ok && fin.compra);
  assert(
    (
      await recibirCompra(
        { ...datos, lines: [{ ...datos.lines[0], receivedQuantity: "1" }] },
        { id: c.id, version: fin.compra.version },
        randomUUID(),
      )
    ).ok,
  );
  const completa = await consultarCompra(c.id);
  assert(completa.ok && completa.compra);
  assert.equal(completa.compra.estado, "Completa/cerrada");
  assert(
    !(
      await recibirCompra(
        datos,
        { id: c.id, version: completa.compra.version },
        randomUUID(),
      )
    ).ok,
  );
  // Sólo recibir una de varias líneas; después completar otra sin redondear una equivalencia inválida.
  const parcial = await compra("-002", [
    {
      rawMaterialId: material.id,
      presentation: "Caja",
      purchasedQuantity: "1",
      unitFactor: "2",
      unitPrice: "10",
    },
    {
      rawMaterialId: otro.id,
      presentation: "Paquete",
      purchasedQuantity: "1",
      unitFactor: "0.001",
      unitPrice: "10",
    },
  ]);
  const invalidos = {
    date: "2026-10-07",
    lines: [
      { purchaseDetailId: parcial.lines[0].id, receivedQuantity: "1" },
      { purchaseDetailId: parcial.lines[1].id, receivedQuantity: "0.5" },
    ],
  };
  assert(
    !(
      await previsualizarRecepcionCompra(invalidos, {
        id: parcial.id,
        version: parcial.version,
      })
    ).ok,
  );
  assert(
    !(
      await recibirCompra(
        invalidos,
        { id: parcial.id, version: parcial.version },
        randomUUID(),
      )
    ).ok,
  );
  assert.equal(
    await prisma.purchaseReceipt.count({ where: { purchaseId: parcial.id } }),
    0,
  );
  assert(
    (
      await recibirCompra(
        { date: "2026-10-07", lines: [invalidos.lines[0]] },
        { id: parcial.id, version: parcial.version },
        randomUUID(),
      )
    ).ok,
  );
  assert.equal(
    await prisma.warehouseStock.count({
      where: { warehouseId: bodega.id, rawMaterialId: otro.id },
    }),
    0,
  );
  // Fallo SQL provocado después de incrementar stock: todo debe volver al estado anterior.
  const antes = await prisma.warehouseStock.findUniqueOrThrow({
    where: { id: saldo.id },
  });
  const fallo = await compra("-FALLO");
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION public.mtx_prueba_fallo_recepcion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."purchaseDetailId" = ${fallo.lines[0].id} THEN RAISE EXCEPTION 'Fallo controlado de integración'; END IF; RETURN NEW; END $$`,
  );
  await prisma.$executeRawUnsafe(
    'CREATE TRIGGER mtx_prueba_fallo_recepcion BEFORE INSERT ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION public.mtx_prueba_fallo_recepcion()',
  );
  try {
    const clave = randomUUID();
    assert(
      !(
        await recibirCompra(
          {
            date: "2026-10-07",
            lines: [
              { purchaseDetailId: fallo.lines[0].id, receivedQuantity: "1" },
            ],
          },
          { id: fallo.id, version: fallo.version },
          clave,
        )
      ).ok,
    );
    assert.equal(
      await prisma.purchaseReceipt.count({ where: { purchaseId: fallo.id } }),
      0,
    );
    assert.equal(
      await prisma.purchaseOperation.count({
        where: { idempotencyKey: clave },
      }),
      0,
    );
    const despues = await prisma.warehouseStock.findUniqueOrThrow({
      where: { id: saldo.id },
    });
    assert(despues.quantity.eq(antes.quantity));
  } finally {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER mtx_prueba_fallo_recepcion ON "StockMovement"',
    );
    await prisma.$executeRawUnsafe(
      "DROP FUNCTION public.mtx_prueba_fallo_recepcion()",
    );
  }
  // Dos compras que crean el primer saldo del mismo material no pierden entradas.
  const a = await compra("-A", [
    {
      rawMaterialId: otro.id,
      presentation: "Unidad",
      purchasedQuantity: "1",
      unitFactor: "1",
      unitPrice: "1",
    },
  ]);
  const b = await compra("-B", [
    {
      rawMaterialId: otro.id,
      presentation: "Unidad",
      purchasedQuantity: "1",
      unitFactor: "1",
      unitPrice: "1",
    },
  ]);
  const ambos = await Promise.all(
    [a, b].map((c) =>
      recibirCompra(
        {
          date: "2026-10-07",
          lines: [{ purchaseDetailId: c.lines[0].id, receivedQuantity: "1" }],
        },
        { id: c.id, version: c.version },
        randomUUID(),
      ),
    ),
  );
  assert(ambos.every((r) => r.ok));
  const stockOtro = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: {
        warehouseId: bodega.id,
        rawMaterialId: otro.id,
      },
    },
  });
  assert(stockOtro.quantity.eq(2));
  // Verificar invariantes de cada material; no sumar unidades de materiales distintos.
  for (const id of [material.id, otro.id]) {
    const s = await prisma.warehouseStock.findUniqueOrThrow({
      where: {
        warehouseId_rawMaterialId: {
          warehouseId: bodega.id,
          rawMaterialId: id,
        },
      },
    });
    const movimientos = await prisma.stockMovement.findMany({
      where: { warehouseId: bodega.id, rawMaterialId: id },
    });
    assert(
      s.quantity.eq(
        movimientos.reduce(
          (sum, m) => sum.plus(m.quantity),
          new Prisma.Decimal(0),
        ),
      ),
    );
  }
  const anulada = await compra("-ANULADA");
  await prisma.purchase.update({
    where: { id: anulada.id },
    data: { voidedAt: new Date(), voidReason: "Prueba" },
  });
  assert(
    !(
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            { purchaseDetailId: anulada.lines[0].id, receivedQuantity: "1" },
          ],
        },
        { id: anulada.id, version: anulada.version },
        randomUUID(),
      )
    ).ok,
  );
  const cerrada = await compra("-CERRADA");
  await prisma.purchasePendingClosure.create({
    data: {
      purchaseId: cerrada.id,
      purchaseDetailId: cerrada.lines[0].id,
      quantity: "2",
      reason: "Prueba",
    },
  });
  assert(
    !(
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            { purchaseDetailId: cerrada.lines[0].id, receivedQuantity: "1" },
          ],
        },
        { id: cerrada.id, version: cerrada.version },
        randomUUID(),
      )
    ).ok,
  );
  // Varias presentaciones del mismo material se acumulan en un único saldo.
  const repetida = await compra("-REPETIDA", [
    {
      rawMaterialId: otro.id,
      presentation: "Caja",
      purchasedQuantity: "1",
      unitFactor: "3",
      unitPrice: "10",
    },
    {
      rawMaterialId: otro.id,
      presentation: "Bolsa",
      purchasedQuantity: "1",
      unitFactor: "2",
      unitPrice: "5",
    },
  ]);
  assert(
    (
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: repetida.lines.map((l) => ({
            purchaseDetailId: l.id,
            receivedQuantity: "1",
          })),
        },
        { id: repetida.id, version: repetida.version },
        randomUUID(),
      )
    ).ok,
  );
  const acumulado = await prisma.warehouseStock.findUniqueOrThrow({
    where: { id: stockOtro.id },
  });
  assert(acumulado.quantity.eq(7));
  const suma = await prisma.stockMovement.aggregate({
    where: { warehouseId: bodega.id, rawMaterialId: otro.id },
    _sum: { quantity: true },
  });
  assert(suma._sum.quantity!.eq(acumulado.quantity));
  // La recepción conserva factor y precio, y el mantenedor sigue bloqueando cambios de unidad.
  const otraUnidad = await prisma.unitMeasure.create({
    data: { name: prefijo + " alternativa", abbreviation: "alt" },
  });
  const materialActual = await prisma.rawMaterial.findUniqueOrThrow({
    where: { id: material.id },
  });
  assert(
    !(
      await guardarMaterial(
        {
          code: materialActual.code,
          name: materialActual.name,
          unitMeasureId: otraUnidad.id,
        },
        {
          id: materialActual.id,
          updatedAt: materialActual.updatedAt.toISOString(),
        },
      )
    ).ok,
  );
  const historico = await prisma.purchaseDetail.findUniqueOrThrow({
    where: { id: c.lines[0].id },
  });
  assert(historico.unitFactor.eq(20));
  assert(historico.unitPrice.eq(100));
  // Un saldo al límite rechaza la recepción y no crea historial ni una operación persistida.
  const limite = await prisma.rawMaterial.create({
    data: {
      code: prefijo + "-LIM",
      name: prefijo + " límite",
      unitMeasureId: unidad.id,
    },
  });
  await prisma.warehouseStock.create({
    data: {
      warehouseId: bodega.id,
      rawMaterialId: limite.id,
      quantity: "99999999999.999",
    },
  });
  const excedida = await compra("-LIM", [
    {
      rawMaterialId: limite.id,
      presentation: "Unidad",
      purchasedQuantity: "1",
      unitFactor: "1",
      unitPrice: "1",
    },
  ]);
  assert(
    !(
      await recibirCompra(
        {
          date: "2026-10-07",
          lines: [
            { purchaseDetailId: excedida.lines[0].id, receivedQuantity: "1" },
          ],
        },
        { id: excedida.id, version: excedida.version },
        randomUUID(),
      )
    ).ok,
  );
  assert.equal(
    await prisma.purchaseReceipt.count({ where: { purchaseId: excedida.id } }),
    0,
  );
  const navegador = await compra("-WEB");
  if (process.env.COMPRAS_FIXTURE_PATH)
    await writeFile(
      process.env.COMPRAS_FIXTURE_PATH,
      JSON.stringify({
        compra: navegador,
        prefijo,
        bodega: bodega.id,
        material: material.id,
      }),
    );
  console.log(
    "Recepciones: equivalencias, pendientes, concurrencia, idempotencia, mínimos y rollback SQL validados.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
