-- Cardinalidades confirmadas: una orden por cotización y un trabajo por orden.
-- No se reconstruyen detalles ni se modifican documentos heredados.
BEGIN;

-- Evitar escrituras entre la comprobación y la creación de los índices únicos.
LOCK TABLE "SalesOrder", "WorkOrder" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "SalesOrder" GROUP BY "quoteId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Existen varias órdenes para una cotización. Conciliar manualmente antes de migrar; no se modificó ningún documento.';
  END IF;
  IF EXISTS (SELECT 1 FROM "WorkOrder" WHERE "salesOrderId" IS NOT NULL
    GROUP BY "salesOrderId" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Existen varios trabajos para una orden. Conciliar manualmente antes de migrar; no se modificó ningún documento.';
  END IF;
END $$;
-- DropIndex
DROP INDEX "SalesOrder_quoteId_idx";

-- DropIndex
DROP INDEX "WorkOrder_salesOrderId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_quoteId_key" ON "SalesOrder"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_salesOrderId_key" ON "WorkOrder"("salesOrderId");

-- PostgreSQL conserva múltiples NULL para obras propias.
COMMIT;
