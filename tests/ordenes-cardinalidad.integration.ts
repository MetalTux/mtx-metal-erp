import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname)
  && url.pathname.startsWith("/mtx_validacion_occ_"), "Usar exclusivamente copia local descartable de OCC.");
const conexion = new Client({ connectionString: url.toString() });
const insertarOrden = (quoteId: number) => conexion.query<{ id: number }>(
  'INSERT INTO "SalesOrder" ("quoteId", "updatedAt") VALUES ($1, now()) RETURNING id', [quoteId]);
const insertarTrabajo = (salesOrderId: number | null) => conexion.query(
  'INSERT INTO "WorkOrder" ("productName", "salesOrderId", "updatedAt") VALUES ($1, $2, now())',
  ["Trabajo de validación descartable", salesOrderId]);

async function main() {
  await conexion.connect();
  const estructura = await conexion.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SalesOrder' AND column_name = 'folioId'`);
  assert.equal(estructura.rows.length, 0, "Esta prueba corresponde al esquema inicial de cardinalidad, anterior al registro comercial. Para el esquema vigente usa ordenes-compra-cliente.integration.ts e integridad.");
  const origen = await conexion.query<{ id: number }>('SELECT id FROM "Quote" ORDER BY id LIMIT 1');
  assert(origen.rows.length, "Restaurar una copia con al menos una cotización; no ejecutar seed general.");
  const quoteId = origen.rows[0].id;
  if (process.argv.includes("--antes-migracion")) {
    const sql = await readFile("prisma/migrations/20261013021125_cardinalidad_orden_compra_cliente/migration.sql", "utf8");
    for (const caso of ["ordenes", "trabajos"] as const) {
      await conexion.query("BEGIN");
      try {
        const orden = await insertarOrden(quoteId);
        if (caso === "ordenes") await insertarOrden(quoteId);
        else {
          await insertarTrabajo(orden.rows[0].id);
          await insertarTrabajo(orden.rows[0].id);
        }
        // BEGIN interno conserva la transacción abierta; la precondición falla
        // antes de COMMIT. ROLLBACK retira también los duplicados de prueba.
        await assert.rejects(conexion.query(sql), caso === "ordenes"
          ? /Existen varias órdenes para una cotización/ : /Existen varios trabajos para una orden/);
      } finally { await conexion.query("ROLLBACK"); }
      const indices = await conexion.query<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
         AND indexname IN ('SalesOrder_quoteId_idx', 'WorkOrder_salesOrderId_idx')`);
      assert.equal(indices.rows.length, 2, "La migración fallida debe conservar ambos índices originales.");
    }
    console.log("OK: duplicados de órdenes/trabajos bloquean migración y conservan índices/datos.");
    return;
  }
  await conexion.query("BEGIN");
  try {
    const orden = await insertarOrden(quoteId);
    await conexion.query("SAVEPOINT orden_duplicada");
    await assert.rejects(insertarOrden(quoteId), (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "23505");
    await conexion.query("ROLLBACK TO SAVEPOINT orden_duplicada");
    await insertarTrabajo(orden.rows[0].id);
    await conexion.query("SAVEPOINT trabajo_duplicado");
    await assert.rejects(insertarTrabajo(orden.rows[0].id), (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === "23505");
    await conexion.query("ROLLBACK TO SAVEPOINT trabajo_duplicado");
    await insertarTrabajo(null);
    await insertarTrabajo(null);
    const obras = await conexion.query<{ cantidad: string }>(
      'SELECT count(*)::text AS cantidad FROM "WorkOrder" WHERE "salesOrderId" IS NULL');
    assert(BigInt(obras.rows[0].cantidad) >= BigInt(2), "La unicidad debe permitir múltiples obras propias.");
    const indices = await conexion.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
       AND indexname IN ('SalesOrder_quoteId_key', 'WorkOrder_salesOrderId_key') AND indexdef LIKE 'CREATE UNIQUE INDEX%'`);
    assert.equal(indices.rows.length, 2);
  } finally { await conexion.query("ROLLBACK"); }
  console.log("OK: orden única, trabajo único, múltiples obras propias e índices únicos; fixtures revertidos.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => conexion.end());
