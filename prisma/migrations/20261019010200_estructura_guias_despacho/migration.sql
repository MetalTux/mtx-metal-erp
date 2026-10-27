/*
  Warnings:

  - A unique constraint covering the columns `[folioId]` on the table `DeliveryNote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creationKey]` on the table `DeliveryNote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,workOrderId]` on the table `DeliveryNote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,workOrderId,salesOrderId]` on the table `DeliveryNote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteLineId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteLineId,productId,warehouseId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteLineId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteLineId,rawMaterialId,warehouseId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deliveryNoteId,workOrderId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeliveryNoteKind" AS ENUM ('ENTREGA', 'CORRECCION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderOperationType" ADD VALUE 'DESPACHAR';
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'CORREGIR_DESPACHO';

BEGIN;

-- DropIndex
DROP INDEX "DeliveryNote_workOrderId_idx";

-- AlterTable
ALTER TABLE "DeliveryNote" ADD COLUMN     "clientSnapshot" JSONB,
ADD COLUMN     "companySnapshot" JSONB,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "correctionReason" VARCHAR(1000),
ADD COLUMN     "correctsDeliveryNoteId" INTEGER,
ADD COLUMN     "creationKey" UUID,
ADD COLUMN     "destinationSnapshot" JSONB,
ADD COLUMN     "dispatchDate" DATE,
ADD COLUMN     "fingerprint" VARCHAR(64),
ADD COLUMN     "folioId" INTEGER,
ADD COLUMN     "kind" "DeliveryNoteKind",
ADD COLUMN     "note" VARCHAR(2000),
ADD COLUMN     "salesOrderId" INTEGER,
ADD COLUMN     "schemaVersion" INTEGER;

-- Los campos antiguos sólo describen filas legadas; las guías nuevas los dejan nulos.
-- No se modifica el valor existente de ninguna cabecera histórica.
ALTER TABLE "DeliveryNote" ALTER COLUMN "date" DROP NOT NULL,
 ALTER COLUMN "date" DROP DEFAULT,
 ALTER COLUMN "paymentStatus" DROP NOT NULL,
 ALTER COLUMN "paymentStatus" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductStockMovement" ADD COLUMN     "deliveryNoteLineId" INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "deliveryNoteLineId" INTEGER;

-- AlterTable
ALTER TABLE "StockReservationEvent" ADD COLUMN     "deliveryNoteLineId" INTEGER;

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "deliveryNoteId" INTEGER;

-- CreateTable
CREATE TABLE "DeliveryNoteLine" (
    "id" SERIAL NOT NULL,
    "deliveryNoteId" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "salesOrderDetailId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "executionMode" "WorkOrderExecutionMode" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resourceCode" TEXT,
    "rawMaterialId" INTEGER,
    "productId" INTEGER,
    "warehouseId" INTEGER,
    "conformityName" VARCHAR(150),
    "conformityDate" DATE,
    "correctsDeliveryNoteLineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_deliveryNoteId_workOrderId_salesOrderId_idx" ON "DeliveryNoteLine"("deliveryNoteId", "workOrderId", "salesOrderId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_workOrderLineId_workOrderId_idx" ON "DeliveryNoteLine"("workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_salesOrderDetailId_salesOrderId_idx" ON "DeliveryNoteLine"("salesOrderDetailId", "salesOrderId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_unitMeasureId_idx" ON "DeliveryNoteLine"("unitMeasureId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_rawMaterialId_warehouseId_idx" ON "DeliveryNoteLine"("rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_productId_warehouseId_idx" ON "DeliveryNoteLine"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_warehouseId_idx" ON "DeliveryNoteLine"("warehouseId");

-- CreateIndex
CREATE INDEX "DeliveryNoteLine_correctsDeliveryNoteLineId_workOrderLineId_idx" ON "DeliveryNoteLine"("correctsDeliveryNoteLineId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNoteLine_deliveryNoteId_position_key" ON "DeliveryNoteLine"("deliveryNoteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNoteLine_id_workOrderLineId_workOrderId_key" ON "DeliveryNoteLine"("id", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNoteLine_id_rawMaterialId_warehouseId_key" ON "DeliveryNoteLine"("id", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNoteLine_id_productId_warehouseId_key" ON "DeliveryNoteLine"("id", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_folioId_key" ON "DeliveryNote"("folioId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_creationKey_key" ON "DeliveryNote"("creationKey");

-- CreateIndex
CREATE INDEX "DeliveryNote_workOrderId_dispatchDate_id_idx" ON "DeliveryNote"("workOrderId", "dispatchDate", "id");

-- CreateIndex
CREATE INDEX "DeliveryNote_salesOrderId_dispatchDate_id_idx" ON "DeliveryNote"("salesOrderId", "dispatchDate", "id");

-- CreateIndex
CREATE INDEX "DeliveryNote_correctsDeliveryNoteId_workOrderId_idx" ON "DeliveryNote"("correctsDeliveryNoteId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_id_workOrderId_key" ON "DeliveryNote"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_id_workOrderId_salesOrderId_key" ON "DeliveryNote"("id", "workOrderId", "salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_deliveryNoteLineId_key" ON "ProductStockMovement"("deliveryNoteLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_deliveryNoteLineId_productId_warehouse_key" ON "ProductStockMovement"("deliveryNoteLineId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_deliveryNoteLineId_key" ON "StockMovement"("deliveryNoteLineId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_deliveryNoteLineId_rawMaterialId_warehouseId_key" ON "StockMovement"("deliveryNoteLineId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReservationEvent_deliveryNoteLineId_idx" ON "StockReservationEvent"("deliveryNoteLineId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_deliveryNoteId_key" ON "WorkOrderOperation"("deliveryNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_deliveryNoteId_workOrderId_key" ON "WorkOrderOperation"("deliveryNoteId", "workOrderId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_deliveryNoteLineId_rawMaterialId_warehouseId_fkey" FOREIGN KEY ("deliveryNoteLineId", "rawMaterialId", "warehouseId") REFERENCES "DeliveryNoteLine"("id", "rawMaterialId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_deliveryNoteId_workOrderId_fkey" FOREIGN KEY ("deliveryNoteId", "workOrderId") REFERENCES "DeliveryNote"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "DocumentFolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_correctsDeliveryNoteId_workOrderId_fkey" FOREIGN KEY ("correctsDeliveryNoteId", "workOrderId") REFERENCES "DeliveryNote"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_deliveryNoteId_workOrderId_salesOrderId_fkey" FOREIGN KEY ("deliveryNoteId", "workOrderId", "salesOrderId") REFERENCES "DeliveryNote"("id", "workOrderId", "salesOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_workOrderLineId_workOrderId_fkey" FOREIGN KEY ("workOrderLineId", "workOrderId") REFERENCES "WorkOrderLine"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_salesOrderDetailId_salesOrderId_fkey" FOREIGN KEY ("salesOrderDetailId", "salesOrderId") REFERENCES "SalesOrderDetail"("id", "salesOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_correctsDeliveryNoteLineId_workOrderLineI_fkey" FOREIGN KEY ("correctsDeliveryNoteLineId", "workOrderLineId", "workOrderId") REFERENCES "DeliveryNoteLine"("id", "workOrderLineId", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_deliveryNoteLineId_productId_warehous_fkey" FOREIGN KEY ("deliveryNoteLineId", "productId", "warehouseId") REFERENCES "DeliveryNoteLine"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "StockReservationEvent_deliveryNoteLineId_fkey" FOREIGN KEY ("deliveryNoteLineId") REFERENCES "DeliveryNoteLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- G1: la cabecera heredada permanece distinguible sin inventar entregas ni folios.
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_version_values" CHECK ((
 ("schemaVersion" IS NULL AND kind IS NULL AND "dispatchDate" IS NULL AND "salesOrderId" IS NULL
  AND "folioId" IS NULL AND "creationKey" IS NULL AND fingerprint IS NULL AND "confirmedAt" IS NULL
  AND "companySnapshot" IS NULL AND "clientSnapshot" IS NULL AND "destinationSnapshot" IS NULL
  AND note IS NULL AND "correctionReason" IS NULL AND "correctsDeliveryNoteId" IS NULL)
 OR
 ("schemaVersion"=1 AND kind IS NOT NULL AND "dispatchDate" IS NOT NULL AND "salesOrderId" IS NOT NULL
  AND "folioId" IS NOT NULL AND "creationKey" IS NOT NULL AND fingerprint ~ '^[0-9a-f]{64}$'
  AND "confirmedAt" IS NOT NULL AND jsonb_typeof("companySnapshot")='object'
  AND jsonb_typeof("clientSnapshot")='object' AND jsonb_typeof("destinationSnapshot")='object'
  AND date IS NULL AND "paymentStatus" IS NULL AND "paymentPromiseDate" IS NULL AND "voucherUrl" IS NULL
  AND ((kind='ENTREGA' AND "correctsDeliveryNoteId" IS NULL AND "correctionReason" IS NULL)
    OR (kind='CORRECCION' AND "correctsDeliveryNoteId" IS NOT NULL AND length(btrim("correctionReason"))>0)))) IS TRUE);
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_values" CHECK (
 position>0 AND quantity>0 AND quantity<>'NaN'::numeric AND length(btrim(description))>0
 AND length(btrim("unitName"))>0 AND length(btrim("unitAbbreviation"))>0
 AND ("conformityName" IS NULL)=("conformityDate" IS NULL)
 AND ("conformityName" IS NULL OR length(btrim("conformityName"))>0)
 AND (("executionMode"='CATALOGO' AND "productId" IS NOT NULL AND "rawMaterialId" IS NULL AND "warehouseId" IS NOT NULL)
   OR ("executionMode"='VENTA_DIRECTA_MP' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND "warehouseId" IS NOT NULL)
   OR ("executionMode" IN ('SERVICIO','A_MEDIDA') AND "rawMaterialId" IS NULL AND "productId" IS NULL AND "warehouseId" IS NULL)));
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_delivery_origin" CHECK (
 (type::text IN ('DESPACHAR','CORREGIR_DESPACHO'))=("deliveryNoteId" IS NOT NULL));
ALTER TABLE "StockReservationEvent" DROP CONSTRAINT "ReservationEvent_consumption_origin";
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "ReservationEvent_consumption_origin" CHECK (
 (type::text='CONSUMIR' AND num_nonnulls("productionConsumptionId","deliveryNoteLineId")=1)
 OR (type::text='LIBERAR' AND "productionConsumptionId" IS NULL AND "deliveryNoteLineId" IS NULL));
-- Un origen nuevo no puede coexistir con recepción, ajuste, traslado o consumo productivo.
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_production_origin";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_production_origin" CHECK (
 num_nonnulls("productionConsumptionId","productionReversalConsumptionId")<=1 AND
 ("productionConsumptionId" IS NULL OR (type::text='SALIDA' AND quantity<0 AND quantity<>'NaN'::numeric AND
  num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId","deliveryNoteLineId")=0)) AND
 ("productionReversalConsumptionId" IS NULL OR (type::text='AJUSTE' AND quantity>0 AND quantity<>'NaN'::numeric AND
  num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId","deliveryNoteLineId")=0)));
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_delivery_origin" CHECK (
 "deliveryNoteLineId" IS NULL OR (quantity<>'NaN'::numeric AND
 ((type::text='SALIDA' AND quantity<0) OR (type::text='AJUSTE' AND quantity>0)) AND
 num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId","productionConsumptionId","productionReversalConsumptionId")=0));
ALTER TABLE "ProductStockMovement" DROP CONSTRAINT "ProductStockMovement_origin";
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_origin" CHECK (
 quantity<>'NaN'::numeric AND btrim(note)<>'' AND
 num_nonnulls("initialStockId","adjustmentId","productionOutputId","productionReversalOutputId","deliveryNoteLineId")=1 AND
 (("initialStockId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0)
  OR ("adjustmentId" IS NOT NULL AND type::text='AJUSTE' AND quantity<>0)
  OR ("productionOutputId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0)
  OR ("productionReversalOutputId" IS NOT NULL AND type::text='AJUSTE' AND quantity<0)
  OR ("deliveryNoteLineId" IS NOT NULL AND ((type::text='SALIDA' AND quantity<0) OR (type::text='AJUSTE' AND quantity>0)))));

-- Hasta G3 no hay escritor que coordine operación de OT, reserva, stock y Kardex.
-- Esta barrera evita guías parciales mientras sólo existe la estructura.
CREATE FUNCTION public.proteger_estructura_guia_g1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Guías pendientes de servicio transaccional G3'; END IF;
 RAISE EXCEPTION 'Guías y partidas inmutables; corregir con documento vinculado';
END $$;
CREATE TRIGGER "DeliveryNote_g1_guard" BEFORE INSERT OR UPDATE OR DELETE ON "DeliveryNote"
 FOR EACH ROW EXECUTE FUNCTION public.proteger_estructura_guia_g1();
CREATE TRIGGER "DeliveryNoteLine_g1_guard" BEFORE INSERT OR UPDATE OR DELETE ON "DeliveryNoteLine"
 FOR EACH ROW EXECUTE FUNCTION public.proteger_estructura_guia_g1();

-- Integridad diferida de documentos G1. La barrera anterior se sustituirá en G3,
-- pero esta comprobación seguirá exigiendo una guía completa al confirmar.
CREATE FUNCTION public.comprobar_guia_estructura_g1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
 g public."DeliveryNote"; w public."WorkOrder"; s public."SalesOrder";
 f record; op public."WorkOrderOperation"; l public."DeliveryNoteLine";
 wl public."WorkOrderLine"; sd public."SalesOrderDetail"; original public."DeliveryNoteLine";
 movimiento numeric; mov_tipo text; eventos numeric; total_neto numeric;
BEGIN
 SELECT * INTO g FROM public."DeliveryNote" WHERE id=NEW.id;
 IF g."schemaVersion" IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=g."workOrderId" FOR UPDATE;
 SELECT * INTO s FROM public."SalesOrder" WHERE id=g."salesOrderId";
 SELECT n.type::text AS tipo, df."idempotencyKey" AS clave INTO f
  FROM public."DocumentFolio" df JOIN public."DocumentNumbering" n ON n.id=df."numberingId" WHERE df.id=g."folioId";
 SELECT * INTO op FROM public."WorkOrderOperation" WHERE "deliveryNoteId"=g.id;
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w."salesOrderId" IS DISTINCT FROM s.id OR
    w.status::text NOT IN ('EN_PROCESO','FINALIZADO') OR s.status::text IS DISTINCT FROM 'CONFIRMADA' OR
    g."dispatchDate"<w."startedDate" OR g."dispatchDate"<s."acceptanceDate" OR
    g."dispatchDate">(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN
   RAISE EXCEPTION 'Guía exige OCC confirmada y OT nueva iniciada, con fecha compatible'; END IF;
 IF f.tipo IS DISTINCT FROM 'GUIA_DESPACHO' OR f.clave IS DISTINCT FROM g."creationKey" OR
    op."idempotencyKey" IS DISTINCT FROM g."creationKey" OR op.fingerprint IS DISTINCT FROM g.fingerprint OR
    op."workOrderId" IS DISTINCT FROM g."workOrderId" OR
    op.type::text IS DISTINCT FROM (CASE WHEN g.kind='ENTREGA' THEN 'DESPACHAR' ELSE 'CORREGIR_DESPACHO' END) OR
    op.version IS DISTINCT FROM w.version THEN
   RAISE EXCEPTION 'Guía exige folio y operación vigentes de la misma OT'; END IF;
 IF g."clientSnapshot" IS DISTINCT FROM s."clientSnapshot" OR
    g."companySnapshot" IS DISTINCT FROM s."companySnapshot" OR
    g."destinationSnapshot" IS DISTINCT FROM jsonb_build_object(
      'branchName',s."clientSnapshot"->>'branchName','address',s."clientSnapshot"->>'address',
      'city',s."clientSnapshot"->>'city','branchContact',s."clientSnapshot"->>'branchContact',
      'branchPhone',s."clientSnapshot"->>'branchPhone','branchEmail',s."clientSnapshot"->>'branchEmail') OR
    coalesce(btrim(g."destinationSnapshot"->>'branchName'),'')='' OR
    coalesce(btrim(g."destinationSnapshot"->>'address'),'')='' OR
    coalesce(btrim(g."destinationSnapshot"->>'city'),'')='' OR
    coalesce(btrim(g."destinationSnapshot"->>'branchContact'),'')='' THEN
   RAISE EXCEPTION 'Destino y emisor deben coincidir con las copias históricas de la OCC'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."DeliveryNoteLine" WHERE "deliveryNoteId"=g.id) THEN
   RAISE EXCEPTION 'Guía confirmada exige al menos una línea'; END IF;
 IF g.kind='CORRECCION' AND NOT EXISTS(SELECT 1 FROM public."DeliveryNote" anterior
     WHERE anterior.id=g."correctsDeliveryNoteId" AND anterior.kind='ENTREGA' AND anterior."workOrderId"=g."workOrderId") THEN
   RAISE EXCEPTION 'Corrección exige guía de entrega original de la misma OT'; END IF;
 FOR l IN SELECT * FROM public."DeliveryNoteLine" WHERE "deliveryNoteId"=g.id LOOP
  SELECT * INTO wl FROM public."WorkOrderLine" WHERE id=l."workOrderLineId";
  SELECT * INTO sd FROM public."SalesOrderDetail" WHERE id=l."salesOrderDetailId";
  IF (wl."workOrderId",wl."salesOrderDetailId",wl."executionMode",wl."unitMeasureId",wl."unitName",wl."unitAbbreviation",wl.description,wl.code,wl."rawMaterialId",wl."productId") IS DISTINCT FROM
     (g."workOrderId",l."salesOrderDetailId",l."executionMode",l."unitMeasureId",l."unitName",l."unitAbbreviation",l.description,l."resourceCode",l."rawMaterialId",l."productId") OR
     sd."salesOrderId" IS DISTINCT FROM g."salesOrderId" THEN
   RAISE EXCEPTION 'Partida de guía debe copiar la línea comercial y de OT correspondiente'; END IF;
  IF g.kind='ENTREGA' THEN
   IF l."correctsDeliveryNoteLineId" IS NOT NULL THEN RAISE EXCEPTION 'Entrega nueva no corrige otra partida'; END IF;
  ELSE
   SELECT * INTO original FROM public."DeliveryNoteLine" WHERE id=l."correctsDeliveryNoteLineId";
   IF original."deliveryNoteId" IS DISTINCT FROM g."correctsDeliveryNoteId" OR
      (original."workOrderLineId",original."salesOrderDetailId",original."executionMode",original."rawMaterialId",original."productId",original."warehouseId") IS DISTINCT FROM
      (l."workOrderLineId",l."salesOrderDetailId",l."executionMode",l."rawMaterialId",l."productId",l."warehouseId") THEN
    RAISE EXCEPTION 'Partida de corrección debe invertir su origen exacto'; END IF;
   IF (SELECT coalesce(sum(cantidad.quantity),0) FROM public."DeliveryNoteLine" cantidad
       JOIN public."DeliveryNote" doc ON doc.id=cantidad."deliveryNoteId"
       WHERE cantidad."correctsDeliveryNoteLineId"=original.id AND doc.kind='CORRECCION')>original.quantity THEN
    RAISE EXCEPTION 'Correcciones superan la cantidad original'; END IF;
  END IF;
  IF l."executionMode" IN ('CATALOGO','VENTA_DIRECTA_MP') THEN
   IF l."executionMode"='CATALOGO' THEN
    SELECT quantity,type::text INTO movimiento,mov_tipo FROM public."ProductStockMovement" WHERE "deliveryNoteLineId"=l.id;
   ELSE
    SELECT quantity,type::text INTO movimiento,mov_tipo FROM public."StockMovement" WHERE "deliveryNoteLineId"=l.id;
   END IF;
   IF movimiento IS DISTINCT FROM (CASE WHEN g.kind='ENTREGA' THEN -l.quantity ELSE l.quantity END) OR
      mov_tipo IS DISTINCT FROM (CASE WHEN g.kind='ENTREGA' THEN 'SALIDA' ELSE 'AJUSTE' END) THEN
    RAISE EXCEPTION 'Partida física exige movimiento exacto de salida o restitución'; END IF;
   SELECT coalesce(sum(e.quantity),0) INTO eventos FROM public."StockReservationEvent" e
      JOIN public."StockReservationAllocation" a ON a.id=e."allocationId"
      WHERE e."deliveryNoteLineId"=l.id AND e.type::text='CONSUMIR' AND e."operationId"=op."idempotencyKey"
       AND a."workOrderId"=l."workOrderId" AND a."workOrderLineId"=l."workOrderLineId"
       AND a."rawMaterialId" IS NOT DISTINCT FROM l."rawMaterialId"
       AND a."productId" IS NOT DISTINCT FROM l."productId" AND a."warehouseId"=l."warehouseId"
       AND a.purpose::text=CASE WHEN l."executionMode"='CATALOGO' THEN 'ENTREGA_PRODUCTO' ELSE 'ENTREGA_DIRECTA_MP' END;
   IF (g.kind='ENTREGA' AND eventos<>l.quantity) OR (g.kind='CORRECCION' AND eventos<>0) THEN
    RAISE EXCEPTION 'Salida física exige consumo exacto de reserva propia'; END IF;
  ELSE
   IF g.kind='ENTREGA' AND (coalesce(btrim(l."conformityName"),'')='' OR l."conformityDate" IS NULL OR
      l."conformityDate">g."dispatchDate" OR l."conformityDate">(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date) THEN
    RAISE EXCEPTION 'Servicio/a medida exige nombre y fecha de conformidad por partida'; END IF;
   IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e WHERE e."deliveryNoteLineId"=l.id) OR
      EXISTS(SELECT 1 FROM public."StockMovement" m WHERE m."deliveryNoteLineId"=l.id) OR
      EXISTS(SELECT 1 FROM public."ProductStockMovement" m WHERE m."deliveryNoteLineId"=l.id) THEN
    RAISE EXCEPTION 'Partida de servicio no mueve inventario ni reservas'; END IF;
  END IF;
  SELECT coalesce(sum(CASE WHEN d.kind='ENTREGA' THEN x.quantity ELSE -x.quantity END),0) INTO total_neto
   FROM public."DeliveryNoteLine" x JOIN public."DeliveryNote" d ON d.id=x."deliveryNoteId"
   WHERE x."salesOrderDetailId"=l."salesOrderDetailId" AND d."schemaVersion"=1;
  IF total_neto<0 OR total_neto>sd.quantity THEN
   RAISE EXCEPTION 'Entregas netas fuera de la cantidad contratada'; END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "DeliveryNote_complete_g1" AFTER INSERT ON public."DeliveryNote"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_guia_estructura_g1();

COMMIT;
