// Exclusivamente sobre copia local descartable. Configurar nunca modifica cantidades ni genera Kardex.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import {
  consultarStock,
  situacionStock,
} from "../src/lib/consultas/inventario";
import {
  consultarConfiguracionMinimo,
  guardarMinimoInventario,
} from "../src/lib/servicios/minimos-inventario";
import {
  guardarCompra,
  consultarCompra,
  recibirCompra,
} from "../src/lib/servicios/compras";
import { guardarMaterial } from "../src/lib/servicios/materiales";
import { Prisma } from "../src/generated/prisma/client";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/mtx_validacion_minimos_"),
  );
  const prefijo = `MIN-${Date.now()}`;
  const unidad = await prisma.unitMeasure.create({
    data: { name: prefijo, abbreviation: "un" },
  });
  const bodega = await prisma.warehouse.create({
      data: { name: prefijo + " Principal" },
    }),
    otra = await prisma.warehouse.create({ data: { name: prefijo + " Otra" } });
  const material = await prisma.rawMaterial.create({
    data: {
      code: prefijo,
      name: prefijo + " Material",
      unitMeasureId: unidad.id,
    },
  });
  const datos = {
    rawMaterialId: material.id,
    warehouseId: bodega.id,
    unitMeasureId: unidad.id,
    minStock: "5",
  };
  const consultar = async (d = datos) => {
    const r = await consultarConfiguracionMinimo(d);
    assert(r.ok);
    return r.configuracion;
  };
  assert.equal((await consultar()).referencia, null);
  assert.equal(
    await prisma.warehouseStock.count({
      where: { rawMaterialId: material.id },
    }),
    0,
  );
  const antes = await prisma.stockMovement.count();
  assert((await guardarMinimoInventario({ ...datos, minStock: "" }, null)).ok);
  assert.equal(
    await prisma.warehouseStock.count({
      where: { rawMaterialId: material.id },
    }),
    0,
  );
  assert((await guardarMinimoInventario({ ...datos, minStock: "0" }, null)).ok);
  let conf = await consultar();
  assert.equal(conf.minimo, "0");
  assert.equal(conf.cantidad, "0");
  const saldo = await prisma.warehouseStock.findUniqueOrThrow({
    where: { id: conf.referencia!.id },
  });
  assert.equal(await prisma.stockMovement.count(), antes);
  const igual = await consultarStock({
    material: material.id,
    bodega: bodega.id,
    reposicion: "reposicion",
  });
  assert(igual.ok);
  assert.equal(igual.pagina.total, 0);
  const refCero = conf.referencia;
  assert(
    (await guardarMinimoInventario({ ...datos, minStock: "5,125" }, refCero))
      .ok,
  );
  assert(
    (await guardarMinimoInventario({ ...datos, minStock: "5.125" }, refCero))
      .ok,
  ); // Reintento sin nueva escritura.
  assert(
    !(await guardarMinimoInventario({ ...datos, minStock: "8" }, refCero)).ok,
  );
  conf = await consultar();
  assert.equal(conf.minimo, "5.125");
  assert.equal(conf.cantidad, "0");
  for (const minStock of [
    "-1",
    "NaN",
    "Infinity",
    "1.0001",
    "100000000000",
    "1e2",
  ])
    assert(
      !(await guardarMinimoInventario({ ...datos, minStock }, conf.referencia))
        .ok,
    );
  const carreras = await Promise.all([
    guardarMinimoInventario({ ...datos, minStock: "6" }, conf.referencia),
    guardarMinimoInventario({ ...datos, minStock: "7" }, conf.referencia),
  ]);
  assert.equal(carreras.filter((r) => r.ok).length, 1);
  assert(
    (
      await guardarMinimoInventario(
        { ...datos, warehouseId: otra.id, minStock: "2" },
        null,
      )
    ).ok,
  );
  assert.equal(
    await prisma.warehouseStock.count({
      where: { rawMaterialId: material.id },
    }),
    2,
  );
  assert(
    (
      await guardarMinimoInventario(
        { ...datos, minStock: "" },
        (await consultar()).referencia,
      )
    ).ok,
  );
  assert.equal((await consultar()).minimo, null);
  assert.equal(
    await prisma.warehouseStock.count({
      where: { rawMaterialId: material.id },
    }),
    2,
  );
  assert.equal(await prisma.stockMovement.count(), antes);
  const nuevaUnidad = await prisma.unitMeasure.create({
    data: { name: prefijo + " Alternativa", abbreviation: "alt" },
  });
  const actual = await prisma.rawMaterial.findUniqueOrThrow({
    where: { id: material.id },
  });
  assert(
    !(
      await guardarMaterial(
        { code: actual.code, name: actual.name, unitMeasureId: nuevaUnidad.id },
        { id: actual.id, updatedAt: actual.updatedAt.toISOString() },
      )
    ).ok,
  );
  assert(
    !(
      await guardarMinimoInventario(
        { ...datos, unitMeasureId: nuevaUnidad.id },
        null,
      )
    ).ok,
  );
  assert(
    !(
      await guardarMinimoInventario({ ...datos, warehouseId: 2147483647 }, null)
    ).ok,
  );
  // Ajustes de fixture sólo para obtener saldos de prueba; nunca generar ajustes al configurar mínimos.
  const ids: number[] = [];
  for (const [cantidad, minimo] of [
    ["12", "20"],
    ["20", "20"],
    ["0", "0"],
    ["5", null],
    ["-1", null],
    ["0", "2"],
    ["0.999", "1"],
    ["0", "99999999999.999"],
  ] as const) {
    const m = await prisma.rawMaterial.create({
      data: {
        code: prefijo + "-" + ids.length,
        name: prefijo + " Caso " + ids.length,
        unitMeasureId: unidad.id,
      },
    });
    ids.push(m.id);
    await prisma.$transaction(async (tx) => {
      await tx.warehouseStock.create({
        data: {
          rawMaterialId: m.id,
          warehouseId: bodega.id,
          quantity: cantidad,
          minStock: minimo,
        },
      });
      if (cantidad !== "0")
        await tx.stockMovement.create({
          data: {
            rawMaterialId: m.id,
            warehouseId: bodega.id,
            type: "AJUSTE",
            quantity: cantidad,
            note: "Fixture de inventario",
          },
        });
    });
  }
  const bajos = await consultarStock({
    q: prefijo,
    reposicion: "reposicion",
    tamano: "10",
  });
  assert(bajos.ok);
  assert.equal(bajos.pagina.total, 5); // La otra bodega del primer material también requiere reposición.
  assert(bajos.pagina.datos.every((s) => s.requiereReposicion));
  const igualdad = await consultarStock({
    material: ids[1],
    reposicion: "reposicion",
  });
  assert(igualdad.ok);
  assert.equal(igualdad.pagina.total, 0);
  assert.equal(
    situacionStock(new Prisma.Decimal(-1), null).estado,
    "Saldo negativo: revisar",
  );
  assert.equal(
    situacionStock(new Prisma.Decimal(0), new Prisma.Decimal(0))
      .requiereReposicion,
    false,
  );
  assert.equal(
    situacionStock(new Prisma.Decimal(0), new Prisma.Decimal(2)).estado,
    "Sin stock",
  );
  assert.equal(
    situacionStock(new Prisma.Decimal(5), null).estado,
    "Sin mínimo configurado",
  );
  assert.equal(
    situacionStock(new Prisma.Decimal(20), new Prisma.Decimal(20)).estado,
    "Sobre el mínimo",
  );
  // Completar suficientes combinaciones para comprobar total y paginación del filtro SQL.
  for (let i = 0; i < 12; i++) {
    const m = await prisma.rawMaterial.create({
      data: {
        code: prefijo + "-P" + i,
        name: prefijo + " Página " + i,
        unitMeasureId: unidad.id,
      },
    });
    assert(
      (
        await guardarMinimoInventario(
          { ...datos, rawMaterialId: m.id, minStock: "1" },
          null,
        )
      ).ok,
    );
  }
  const pagina = await consultarStock({
    q: prefijo,
    reposicion: "reposicion",
    tamano: "10",
    pagina: 2,
  });
  assert(pagina.ok);
  assert.equal(pagina.pagina.total, 17);
  assert.equal(pagina.pagina.datos.length, 7);
  assert(!(await consultarStock({ reposicion: "invalido" })).ok);
  // Primera combinación creada concurrentemente con una recepción: no perder saldo ni mínimo.
  const concurrente = await prisma.rawMaterial.create({
    data: {
      code: prefijo + "-CON",
      name: prefijo + " Concurrente",
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
  const c = await guardarCompra(
    {
      date: "2026-10-07",
      supplierId: proveedor.id,
      documentTypeId: tipo.id,
      documentNumber: prefijo,
      warehouseId: bodega.id,
      lines: [
        {
          rawMaterialId: concurrente.id,
          presentation: "Unidad",
          purchasedQuantity: "10",
          unitFactor: "1",
          unitPrice: "1",
        },
      ],
    },
    randomUUID(),
  );
  assert(c.ok && c.id);
  const compra = await consultarCompra(c.id);
  assert(compra.ok && compra.compra);
  const ambas = await Promise.all([
    guardarMinimoInventario(
      { ...datos, rawMaterialId: concurrente.id, minStock: "20" },
      null,
    ),
    recibirCompra(
      {
        date: "2026-10-07",
        lines: [
          {
            purchaseDetailId: compra.compra.lines[0].id,
            receivedQuantity: "10",
          },
        ],
      },
      { id: c.id, version: compra.compra.version },
      randomUUID(),
    ),
  ]);
  assert(
    ambas.every((r) => r.ok),
    JSON.stringify(ambas),
  );
  const combinado = await prisma.warehouseStock.findUniqueOrThrow({
    where: {
      warehouseId_rawMaterialId: {
        warehouseId: bodega.id,
        rawMaterialId: concurrente.id,
      },
    },
  });
  assert(combinado.quantity.eq(10));
  assert(combinado.minStock!.eq(20));
  assert.equal(
    await prisma.stockMovement.count({
      where: { rawMaterialId: concurrente.id },
    }),
    1,
  );
  // Una recepción posterior también invalida un token antiguo cuando se intenta otro mínimo.
  const vieja = await consultar({ ...datos, rawMaterialId: concurrente.id });
  await prisma.warehouseStock.update({
    where: { id: combinado.id },
    data: { updatedAt: new Date(combinado.updatedAt.getTime() + 1000) },
  });
  assert(
    !(
      await guardarMinimoInventario(
        { ...datos, rawMaterialId: concurrente.id, minStock: "30" },
        vieja.referencia,
      )
    ).ok,
  );
  const foto = await prisma.stockMovement.count();
  const cantAntes = await prisma.warehouseStock.findUniqueOrThrow({
    where: { id: saldo.id },
  });
  await consultarStock({ q: prefijo, reposicion: "todos" });
  await consultarStock({ q: prefijo, reposicion: "reposicion" });
  assert.equal(await prisma.stockMovement.count(), foto);
  assert(
    (
      await prisma.warehouseStock.findUniqueOrThrow({ where: { id: saldo.id } })
    ).quantity.eq(cantAntes.quantity),
  );
  if (process.env.MINIMOS_FIXTURE_PATH)
    await writeFile(
      process.env.MINIMOS_FIXTURE_PATH,
      JSON.stringify({
        prefijo,
        material: material.id,
        bodega: bodega.id,
        otra: otra.id,
        unitMeasureId: unidad.id,
      }),
    );
  console.log(
    "Mínimos: null/cero/precisión, estados/filtro SQL/paginación, mínimos por bodega, reintentos/versiones, unidad protegida y recepción concurrente correctos; configuración sin cambiar cantidades ni movimientos.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
