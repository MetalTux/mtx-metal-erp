// Sólo lectura sobre copia local: comprobar sugerencias únicas y equivalencias usadas por la interfaz.
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import {
  catalogosCompra,
  previsualizarEquivalenciaCompra,
} from "../src/lib/servicios/compras";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/mtx_validacion_"),
  );
  const catalogo = await catalogosCompra();
  assert(catalogo.presentaciones.every((p) => p.trim() === p && p.length > 0));
  assert.equal(
    new Set(catalogo.presentaciones.map((p) => p.toLocaleLowerCase("es-CL")))
      .size,
    catalogo.presentaciones.length,
  );
  for (const [cantidad, factor, esperada] of [
    ["10", "1", "10"],
    ["3", "20", "60"],
    ["0,5", "20", "10"],
  ]) {
    const r = previsualizarEquivalenciaCompra({
      purchasedQuantity: cantidad,
      unitFactor: factor,
    });
    assert(r.ok);
    assert.equal(r.cantidad, esperada);
  }
  for (const [cantidad, factor] of [
    ["0", "1"],
    ["1", "0"],
    ["-1", "1"],
    ["0.001", "0.001"],
    ["99999999999", "20"],
  ])
    assert(
      !previsualizarEquivalenciaCompra({
        purchasedQuantity: cantidad,
        unitFactor: factor,
      }).ok,
    );
  console.log(
    "Ayudas de Compras: sugerencias únicas y equivalencias exactas/fracciones/precisión correctas; sólo lectura.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
