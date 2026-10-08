// Reproduce una caché heredada y recargas del módulo sin consultas ni escrituras en PostgreSQL.
import "dotenv/config";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const importar = createRequire(`${process.cwd()}/tests/prisma-cache.integration.ts`);
async function main() {
  const cache = globalThis as unknown as {
    prisma?: { $disconnect: () => Promise<void> };
    prismaConstructor?: unknown;
  };
  let cierres = 0;
  cache.prisma = { $disconnect: async () => { cierres++; } };
  delete cache.prismaConstructor;
  const ruta = importar.resolve("../src/lib/prisma");
  const cargar = () => importar(ruta) as typeof import("../src/lib/prisma");
  const primero = cargar().prisma;
  assert(primero.inventoryTransfer && primero.inventoryAdjustment);
  assert.equal(cierres, 1, "Cerrar la instancia heredada sin modelo actualizado");
  delete importar.cache[ruta];
  assert.equal(cargar().prisma, primero, "Reutilizar la instancia con el mismo constructor");
  // Simular una clase anterior: el módulo debe reemplazarla, sin abrir conexiones por cada recarga.
  cache.prisma = { $disconnect: async () => { cierres++; } };
  cache.prismaConstructor = class ClienteAnterior {};
  delete importar.cache[ruta];
  const segundo = cargar().prisma;
  assert.notEqual(segundo, primero);
  assert(segundo.inventoryTransfer);
  assert.equal(cierres, 2);
  delete importar.cache[ruta];
  assert.equal(cargar().prisma, segundo);
  await primero.$disconnect();
  await segundo.$disconnect();
  console.log("Caché Prisma: instancia heredada reemplazada, constructor anterior invalidado y recargas del mismo constructor reutilizadas; sin consultas a PostgreSQL.");
}
main();
