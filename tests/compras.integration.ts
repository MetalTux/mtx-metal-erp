// Validar únicamente en copia local. Los fixtures pueden conservarse para navegador y se retira el clon al terminar.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import {
  guardarCompra,
  consultarCompra,
  listarCompras,
  previsualizarCompra,
  eliminarCompra,
} from "../src/lib/servicios/compras";
import type { DatosCompra } from "../src/lib/validaciones/compra";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/mtx_validacion_"),
  );
  const prefijo = `COMP-${Date.now()}`;
  let proveedor: number | undefined,
    unidad: number | undefined,
    bodega: number | undefined,
    material: number | undefined;
  const ids: number[] = [];
  try {
    // Buscar un RUT válido disponible sin modificar proveedores ya existentes de la copia.
    let rut = "";
    for (let cuerpo = 22222222; cuerpo < 22222300; cuerpo++) {
      let suma = 0,
        f = 2;
      for (const digito of String(cuerpo).split("").reverse()) {
        suma += Number(digito) * f;
        f = f === 7 ? 2 : f + 1;
      }
      const dv = 11 - (suma % 11);
      const candidato = `${cuerpo}-${dv === 11 ? "0" : dv === 10 ? "K" : dv}`;
      if (!(await prisma.supplier.findUnique({ where: { rut: candidato } }))) {
        rut = candidato;
        break;
      }
    }
    proveedor = (
      await prisma.supplier.create({
        data: { rut, name: prefijo + " Proveedor" },
      })
    ).id;
    unidad = (
      await prisma.unitMeasure.create({
        data: { name: prefijo + " Unidad", abbreviation: "un" },
      })
    ).id;
    bodega = (
      await prisma.warehouse.create({ data: { name: prefijo + " Recepción" } })
    ).id;
    material = (
      await prisma.rawMaterial.create({
        data: {
          code: prefijo,
          name: prefijo + " Material",
          unitMeasureId: unidad,
        },
      })
    ).id;
    const tipo = await prisma.documentType.findUniqueOrThrow({
      where: { code: "FACTURA_COMPRA" },
    });
    const datos: DatosCompra = {
      date: "2026-10-07",
      supplierId: proveedor,
      warehouseId: bodega,
      documentTypeId: tipo.id,
      documentNumber: prefijo + "-001",
      lines: [
        {
          rawMaterialId: material,
          presentation: "Caja",
          purchasedQuantity: "0.5",
          unitFactor: "20",
          unitPrice: "10.05",
        },
      ],
    };
    const vista = previsualizarCompra(datos);
    assert(vista.ok);
    assert.equal(vista.calculo.total, "5.03");
    assert.equal(vista.calculo.lineas[0].cantidad, "10");
    assert(
      !previsualizarCompra({
        ...datos,
        lines: [
          {
            ...datos.lines[0],
            purchasedQuantity: "0.001",
            unitFactor: "0.001",
          },
        ],
      }).ok,
    );
    const antes = await prisma.warehouseStock.count();
    const movimientos = await prisma.stockMovement.count();
    const clave = randomUUID();
    const [a, b] = await Promise.all([
      guardarCompra(datos, clave),
      guardarCompra(datos, clave),
    ]);
    assert(a.ok && b.ok);
    assert.equal(a.id, b.id);
    ids.push(a.id!);
    assert.equal(await prisma.warehouseStock.count(), antes);
    assert.equal(await prisma.stockMovement.count(), movimientos);
    assert.equal(
      await prisma.purchaseOperation.count({ where: { purchaseId: a.id } }),
      1,
    );
    assert(
      !(
        await guardarCompra(
          { ...datos, documentNumber: "Otro documento" },
          clave,
        )
      ).ok,
    );
    assert(!(await guardarCompra(datos, randomUUID())).ok);
    const consulta = await consultarCompra(a.id);
    assert(consulta.ok && consulta.compra);
    let c = consulta.compra;
    assert.equal(c.lines[0].pendiente, "0.5");
    assert.equal(c.lines[0].quantity, "10");
    const editar = {
      ...datos,
      lines: [{ ...datos.lines[0], id: c.lines[0].id, purchasedQuantity: "1" }],
    };
    assert(
      !(
        await guardarCompra(
          { ...editar, lines: [{ ...editar.lines[0], unitPrice: "11" }] },
          randomUUID(),
          { id: c.id, version: c.version },
        )
      ).ok,
    );
    const cambios = await Promise.all([
      guardarCompra(editar, randomUUID(), { id: c.id, version: c.version }),
      guardarCompra({ ...editar, date: "2026-10-08" }, randomUUID(), {
        id: c.id,
        version: c.version,
      }),
    ]);
    assert.equal(cambios.filter((r) => r.ok).length, 1);
    const actualizado = await consultarCompra(c.id);
    assert(actualizado.ok && actualizado.compra);
    c = actualizado.compra;
    assert.equal(c.lines[0].unitPrice, "10.05");
    assert.equal(c.totalAmount, "10.05");
    assert(
      !(await eliminarCompra({ id: c.id, version: c.version }, randomUUID()))
        .ok,
    );
    const recepcion = await prisma.purchaseReceipt.create({
      data: { purchaseId: c.id },
    });
    await prisma.purchaseReceiptDetail.create({
      data: {
        purchaseId: c.id,
        receiptId: recepcion.id,
        purchaseDetailId: c.lines[0].id,
        receivedQuantity: "0.25",
        inventoryQuantity: "5",
      },
    });
    assert(
      !(
        await guardarCompra(
          {
            ...editar,
            lines: [{ ...editar.lines[0], purchasedQuantity: "2" }],
          },
          randomUUID(),
          { id: c.id, version: c.version },
        )
      ).ok,
    );
    const cerrado = await prisma.purchasePendingClosure.create({
      data: {
        purchaseId: c.id,
        purchaseDetailId: c.lines[0].id,
        quantity: "0.75",
        reason: "No llegará el resto",
      },
    });
    const lista = await listarCompras({ q: prefijo, pagina: 999 });
    assert(lista.ok);
    assert.equal(lista.pagina.total, 1);
    assert.equal(lista.pagina.pagina, 1);
    assert.equal(lista.pagina.datos[0].estado, "Completa/cerrada");
    assert.equal(
      lista.pagina.datos[0].closures[0].motivo,
      "No llegará el resto",
    );
    await prisma.purchasePendingClosure.delete({ where: { id: cerrado.id } });
    await prisma.purchaseReceiptDetail.deleteMany({
      where: { receiptId: recepcion.id },
    });
    await prisma.purchaseReceipt.delete({ where: { id: recepcion.id } });
    // Más de una página permite comprobar que la consulta ordena/filtra en PostgreSQL.
    for (let i = 0; i < 11; i++) {
      const r = await guardarCompra(
        {
          ...datos,
          documentNumber: prefijo + "-" + String(i + 2).padStart(3, "0"),
        },
        randomUUID(),
      );
      assert(r.ok && r.id);
      ids.push(r.id);
    }
    const pag = await listarCompras({ q: prefijo, pagina: 2 });
    assert(pag.ok);
    assert.equal(pag.pagina.total, 12);
    assert.equal(pag.pagina.datos.length, 2);
    // Sólo fixture: simula una compra ya anulada para probar eliminación lógica, sin implementar anulación operativa.
    await prisma.purchase.update({
      where: { id: c.id },
      data: { voidedAt: new Date(), voidReason: "Fixture de anulación" },
    });
    const claveEliminar = randomUUID();
    assert(
      (await eliminarCompra({ id: c.id, version: c.version }, claveEliminar))
        .ok,
    );
    assert(
      (await eliminarCompra({ id: c.id, version: c.version }, claveEliminar))
        .ok,
    );
    assert.equal(
      await prisma.purchaseDetail.count({ where: { purchaseId: c.id } }),
      1,
    );
    assert(await prisma.purchase.findUnique({ where: { id: c.id } }));
    const normal = await listarCompras({ q: prefijo });
    assert(normal.ok);
    assert.equal(normal.pagina.total, 11);
    assert(!(await guardarCompra(datos, randomUUID())).ok); // Identidad reservada incluso eliminada.
    assert.equal(await prisma.warehouseStock.count(), antes);
    assert.equal(await prisma.stockMovement.count(), movimientos);
    if (process.env.COMPRAS_FIXTURE_PATH)
      await writeFile(
        process.env.COMPRAS_FIXTURE_PATH,
        JSON.stringify(
          { prefijo, proveedor, bodega, material, tipo: tipo.id, ids },
          null,
          2,
        ),
      );
    console.log(
      "Correcto: Decimal, fracciones exactas, precio inmutable, creación concurrente/idempotente, duplicados, versión, estructura bloqueada tras recepción, cierres/estado, paginación y eliminación lógica; guardar no altera stock/Kardex.",
    );
  } finally {
    if (!process.env.COMPRAS_FIXTURE_PATH) {
      await prisma.purchaseOperation.deleteMany({
        where: { purchaseId: { in: ids } },
      });
      await prisma.purchasePendingClosure.deleteMany({
        where: { purchaseId: { in: ids } },
      });
      await prisma.purchaseReceiptDetail.deleteMany({
        where: { purchaseId: { in: ids } },
      });
      await prisma.purchaseReceipt.deleteMany({
        where: { purchaseId: { in: ids } },
      });
      await prisma.purchaseDetail.deleteMany({
        where: { purchaseId: { in: ids } },
      });
      await prisma.purchase.deleteMany({ where: { id: { in: ids } } });
      if (material)
        await prisma.rawMaterial.delete({ where: { id: material } });
      if (bodega) await prisma.warehouse.delete({ where: { id: bodega } });
      if (proveedor) await prisma.supplier.delete({ where: { id: proveedor } });
      if (unidad) await prisma.unitMeasure.delete({ where: { id: unidad } });
    }
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
