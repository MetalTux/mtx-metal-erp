import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/** Auditoría previa a OCC1: una sola instantánea, sin escribir ni deducir aceptación. */
async function main() {
  const informe = await prisma.$transaction(async tx => {
    // PostgreSQL impide escrituras incluso si se incorpora otra consulta por error.
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const entorno = await tx.$queryRaw<{ base: string; soloLectura: string; aislamiento: string }[]>`
      SELECT current_database() AS base,
        current_setting('transaction_read_only') AS "soloLectura",
        current_setting('transaction_isolation') AS aislamiento
    `;
    const conteos = await tx.$queryRaw<Record<string, string>[]>`
      SELECT
        (SELECT count(*)::text FROM "SalesOrder") AS ordenes,
        (SELECT count(*)::text FROM "SalesOrder" o WHERE to_jsonb(o)->>'folioId' IS NULL) AS "ordenesLegadas",
        (SELECT count(*)::text FROM "WorkOrder") AS trabajos,
        (SELECT count(*)::text FROM "WorkOrder" WHERE "salesOrderId" IS NULL) AS "obrasPropias",
        (SELECT count(*)::text FROM "AccountReceivable") AS cuentas,
        (SELECT count(*)::text FROM "Payment") AS abonos,
        (SELECT count(*)::text FROM "DeliveryNote") AS guias,
        (SELECT count(*)::text FROM "Quote") AS cotizaciones,
        (SELECT count(*)::text FROM "QuotePdfEmission") AS "emisionesPdf"
    `;
    const ordenesDuplicadas = await tx.$queryRaw<{ quoteId: number; ordenes: number[] }[]>`
      SELECT "quoteId", array_agg(id ORDER BY id) AS ordenes
      FROM "SalesOrder" GROUP BY "quoteId" HAVING count(*) > 1 ORDER BY "quoteId"
    `;
    const trabajosDuplicados = await tx.$queryRaw<{ salesOrderId: number; trabajos: number[] }[]>`
      SELECT "salesOrderId", array_agg(id ORDER BY id) AS trabajos
      FROM "WorkOrder" WHERE "salesOrderId" IS NOT NULL
      GROUP BY "salesOrderId" HAVING count(*) > 1 ORDER BY "salesOrderId"
    `;
    // Mostrar sólo IDs y presencia de referencias; no publicar URLs ni datos personales.
    const ordenesHeredadas = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT o.id, o."quoteId", q.status AS "estadoCotizacion",
        o.date::text AS "fechaTimestampSinZona",
        o.date::date::text AS "fechaSiFueCalendario",
        ((o.date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date::text AS "fechaSiFueInstanteUtc",
        o."pdfUrl" IS NOT NULL AS "tienePdfUrl",
        (SELECT array_agg(w.id ORDER BY w.id) FROM "WorkOrder" w WHERE w."salesOrderId" = o.id) AS trabajos,
        a.id AS "cuentaId", a.amount::text AS "importeCuenta",
        a."dueDate"::text AS vencimiento, a."voidedAt" IS NOT NULL AS "cuentaAnulada",
        (SELECT count(*)::text FROM "Payment" p WHERE p."accountReceivableId" = a.id) AS abonos,
        (SELECT count(*)::text FROM "DeliveryNote" d JOIN "WorkOrder" w ON w.id = d."workOrderId"
          WHERE w."salesOrderId" = o.id) AS guias
      FROM "SalesOrder" o JOIN "Quote" q ON q.id = o."quoteId"
      LEFT JOIN "AccountReceivable" a ON a."salesOrderId" = o.id
      WHERE to_jsonb(o)->>'folioId' IS NULL ORDER BY o.id
    `;
    const cotizaciones = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT q.id, q.status, q.version, q."deletedAt" IS NOT NULL AS oculta,
        EXISTS(SELECT 1 FROM "SalesOrder" o WHERE o."quoteId" = q.id) AS "tieneOrden",
        q.date::text AS fecha, q."validUntil"::text AS "vigenteHasta",
        array_remove(ARRAY[
          CASE WHEN q."folioId" IS NULL OR q."creationKey" IS NULL THEN 'identidad' END,
          CASE WHEN q."clientBranchId" IS NULL OR nullif(btrim(q."clientName"), '') IS NULL
            OR nullif(btrim(q."clientRut"), '') IS NULL OR nullif(btrim(q."branchName"), '') IS NULL
            OR nullif(btrim(q."branchAddress"), '') IS NULL OR nullif(btrim(q."branchCity"), '') IS NULL
            OR nullif(btrim(q."branchContact"), '') IS NULL OR nullif(btrim(q."branchPhone"), '') IS NULL
            THEN 'cliente/sucursal históricos' END,
          CASE WHEN q."paymentConditionId" IS NULL OR nullif(btrim(q."paymentConditionName"), '') IS NULL
            OR q."paymentTermDays" IS NULL THEN 'condición/plazo históricos' END,
          CASE WHEN nullif(btrim(q."companySnapshot"->>'legalName'), '') IS NULL
            OR nullif(btrim(q."companySnapshot"->>'rut'), '') IS NULL
            OR nullif(btrim(q."companySnapshot"->>'address'), '') IS NULL
            OR nullif(btrim(q."companySnapshot"->>'city'), '') IS NULL THEN 'emisor histórico' END,
          CASE WHEN q.subtotal IS NULL OR (q."discountMode" <> 'SIN_DESCUENTO' AND q."discountValue" IS NULL) OR q."discountAmount" IS NULL
            OR q."netAmount" IS NULL OR q."vatAmount" IS NULL OR q."vatRate" IS NULL THEN 'importes históricos' END,
          CASE WHEN NOT EXISTS(SELECT 1 FROM "QuoteDetail" l WHERE l."quoteId" = q.id) THEN 'sin detalle' END,
          CASE WHEN EXISTS(SELECT 1 FROM "QuoteDetail" l WHERE l."quoteId" = q.id AND
            (l.kind IS NULL OR l.position IS NULL OR l."unitMeasureId" IS NULL
              OR nullif(btrim(l."unitName"), '') IS NULL OR l."lineAmount" IS NULL)) THEN 'detalle legado' END
        ], NULL) AS faltantes,
        (SELECT count(*)::text FROM "QuoteOperation" op WHERE op."quoteId" = q.id) AS operaciones,
        (SELECT count(*)::text FROM "QuotePdfEmission" e WHERE e."quoteId" = q.id) AS "emisionesPdf"
      FROM "Quote" q ORDER BY q.id
    `;
    const numeracion = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT n.type, n.padding, n."nextNumber"::text AS "proximoNumero", n.version,
        (SELECT count(*)::text FROM "DocumentFolio" f WHERE f."numberingId" = n.id) AS asignaciones
      FROM "DocumentNumbering" n WHERE n.type IN ('ORDEN_COMPRA_CLIENTE', 'ORDEN_TRABAJO')
      ORDER BY n.type
    `;
    const migraciones = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT migration_name AS nombre, finished_at IS NOT NULL AS terminada,
        rolled_back_at IS NOT NULL AS revertida FROM "_prisma_migrations" ORDER BY started_at
    `;
    return {
      registradoEn: new Date().toISOString(), entorno: entorno[0], conteos: conteos[0],
      ordenesDuplicadas, trabajosDuplicados, ordenesHeredadas, cotizaciones, numeracion, migraciones,
      bloqueaUnicidad: ordenesDuplicadas.length > 0 || trabajosDuplicados.length > 0,
      requiereConciliacionLegado: ordenesHeredadas.length > 0,
      limites: [
        "Los faltantes detectan presencia de campos; no validan RUT, JSON del editor ni equivalencia de importes.",
        "Las fechas alternativas son hipótesis para revisión; no convierten datos ni determinan su semántica.",
        "Este informe no confirma reglas D1–D10, no reemplaza un respaldo y no autoriza por sí solo una migración.",
        "Los resultados corresponden a esta instantánea; repetir inmediatamente antes de migrar.",
      ],
    };
  }, { isolationLevel: "RepeatableRead", timeout: 30_000 });
  console.log(JSON.stringify(informe, null, 2));
}

main().catch(() => {
  console.error("No se pudo completar la auditoría de sólo lectura. Revisa conexión y migraciones; no se modificaron datos.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
