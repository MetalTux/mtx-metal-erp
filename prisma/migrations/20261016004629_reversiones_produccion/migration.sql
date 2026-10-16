BEGIN;
/*
  Warnings:

  - A unique constraint covering the columns `[productionReversalOutputId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionReversalOutputId,productId,warehouseId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionReversalConsumptionId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionReversalConsumptionId,rawMaterialId,warehouseId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionReversalId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionReversalId,workOrderId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'REVERTIR_PRODUCCION';

-- AlterTable
ALTER TABLE "ProductStockMovement" ADD COLUMN     "productionReversalOutputId" INTEGER;

-- AlterTable
ALTER TABLE "ProductionRecord" ADD COLUMN     "correctsProductionRecordId" INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "productionReversalConsumptionId" INTEGER;

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "productionReversalId" INTEGER;

-- CreateTable
CREATE TABLE "ProductionReversal" (
    "id" SERIAL NOT NULL,
    "productionRecordId" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "physicalRestitutionConfirmed" BOOLEAN NOT NULL,
    "planVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionReversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReversalConsumption" (
    "id" SERIAL NOT NULL,
    "productionReversalId" INTEGER NOT NULL,
    "productionRecordId" INTEGER NOT NULL,
    "productionConsumptionId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionReversalConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReversalOutput" (
    "id" SERIAL NOT NULL,
    "productionReversalId" INTEGER NOT NULL,
    "productionRecordId" INTEGER NOT NULL,
    "productionOutputId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "productCode" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionReversalOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversal_productionRecordId_key" ON "ProductionReversal"("productionRecordId");

-- CreateIndex
CREATE INDEX "ProductionReversal_productionRecordId_workOrderLineId_workO_idx" ON "ProductionReversal"("productionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "ProductionReversal_workOrderId_date_id_idx" ON "ProductionReversal"("workOrderId", "date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversal_productionRecordId_workOrderLineId_workO_key" ON "ProductionReversal"("productionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversal_id_workOrderId_key" ON "ProductionReversal"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversal_id_productionRecordId_key" ON "ProductionReversal"("id", "productionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalConsumption_productionConsumptionId_key" ON "ProductionReversalConsumption"("productionConsumptionId");

-- CreateIndex
CREATE INDEX "ProductionReversalConsumption_productionReversalId_producti_idx" ON "ProductionReversalConsumption"("productionReversalId", "productionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalConsumption_id_rawMaterialId_warehouseId_key" ON "ProductionReversalConsumption"("id", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalConsumption_productionConsumptionId_rawMa_key" ON "ProductionReversalConsumption"("productionConsumptionId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalOutput_productionReversalId_key" ON "ProductionReversalOutput"("productionReversalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalOutput_productionOutputId_key" ON "ProductionReversalOutput"("productionOutputId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalOutput_id_productId_warehouseId_key" ON "ProductionReversalOutput"("id", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalOutput_productionReversalId_productionRec_key" ON "ProductionReversalOutput"("productionReversalId", "productionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReversalOutput_productionOutputId_productId_wareh_key" ON "ProductionReversalOutput"("productionOutputId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_productionReversalOutputId_key" ON "ProductStockMovement"("productionReversalOutputId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_productionReversalOutputId_productId_w_key" ON "ProductStockMovement"("productionReversalOutputId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "ProductionRecord_correctsProductionRecordId_workOrderLineId_idx" ON "ProductionRecord"("correctsProductionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_productionReversalConsumptionId_key" ON "StockMovement"("productionReversalConsumptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_productionReversalConsumptionId_rawMaterialId_key" ON "StockMovement"("productionReversalConsumptionId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_productionReversalId_key" ON "WorkOrderOperation"("productionReversalId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_productionReversalId_workOrderId_key" ON "WorkOrderOperation"("productionReversalId", "workOrderId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionReversalConsumptionId_rawMaterialI_fkey" FOREIGN KEY ("productionReversalConsumptionId", "rawMaterialId", "warehouseId") REFERENCES "ProductionReversalConsumption"("id", "rawMaterialId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_productionReversalId_workOrderId_fkey" FOREIGN KEY ("productionReversalId", "workOrderId") REFERENCES "ProductionReversal"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productionReversalOutputId_productId__fkey" FOREIGN KEY ("productionReversalOutputId", "productId", "warehouseId") REFERENCES "ProductionReversalOutput"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_correctsProductionRecordId_workOrderLineI_fkey" FOREIGN KEY ("correctsProductionRecordId", "workOrderLineId", "workOrderId") REFERENCES "ProductionRecord"("id", "workOrderLineId", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversal" ADD CONSTRAINT "ProductionReversal_productionRecordId_workOrderLineId_work_fkey" FOREIGN KEY ("productionRecordId", "workOrderLineId", "workOrderId") REFERENCES "ProductionRecord"("id", "workOrderLineId", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversal" ADD CONSTRAINT "ProductionReversal_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversalConsumption" ADD CONSTRAINT "ProductionReversalConsumption_productionReversalId_product_fkey" FOREIGN KEY ("productionReversalId", "productionRecordId") REFERENCES "ProductionReversal"("id", "productionRecordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversalConsumption" ADD CONSTRAINT "ProductionReversalConsumption_productionConsumptionId_rawM_fkey" FOREIGN KEY ("productionConsumptionId", "rawMaterialId", "warehouseId") REFERENCES "ProductionConsumption"("id", "rawMaterialId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversalOutput" ADD CONSTRAINT "ProductionReversalOutput_productionReversalId_productionRe_fkey" FOREIGN KEY ("productionReversalId", "productionRecordId") REFERENCES "ProductionReversal"("id", "productionRecordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReversalOutput" ADD CONSTRAINT "ProductionReversalOutput_productionOutputId_productId_ware_fkey" FOREIGN KEY ("productionOutputId", "productId", "warehouseId") REFERENCES "ProductionOutput"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_reversal_origin" CHECK ((type::text='REVERTIR_PRODUCCION')=("productionReversalId" IS NOT NULL));
ALTER TABLE "ProductionReversal" ADD CONSTRAINT "ProductionReversal_values" CHECK (btrim(reason)<>'' AND "planVersion">0);
ALTER TABLE "ProductionReversalConsumption" ADD CONSTRAINT "ProductionReversalConsumption_quantity" CHECK (quantity>0 AND quantity<>'NaN'::numeric);
ALTER TABLE "ProductionReversalOutput" ADD CONSTRAINT "ProductionReversalOutput_quantity" CHECK (quantity>0 AND quantity<>'NaN'::numeric);
ALTER TABLE "ProductStockMovement" DROP CONSTRAINT "ProductStockMovement_origin";
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_origin" CHECK (quantity<>'NaN'::numeric AND btrim(note)<>'' AND num_nonnulls("initialStockId","adjustmentId","productionOutputId","productionReversalOutputId")=1 AND (
 ("initialStockId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0) OR ("adjustmentId" IS NOT NULL AND type::text='AJUSTE' AND quantity<>0) OR ("productionOutputId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0) OR ("productionReversalOutputId" IS NOT NULL AND type::text='AJUSTE' AND quantity<0)));
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_production_origin";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_production_origin" CHECK (num_nonnulls("productionConsumptionId","productionReversalConsumptionId")<=1 AND (
 "productionConsumptionId" IS NULL OR (type::text='SALIDA' AND quantity<0 AND quantity<>'NaN'::numeric AND num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId")=0)) AND (
 "productionReversalConsumptionId" IS NULL OR (type::text='AJUSTE' AND quantity>0 AND quantity<>'NaN'::numeric AND num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId")=0)));

CREATE FUNCTION public.proteger_reversion_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v public."ProductionReversal"; r public."ProductionRecord"; w public."WorkOrder"; c public."ProductionConsumption"; o public."ProductionOutput"; mov integer;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reversiones y detalles inmutables; conservar historial'; END IF;
 IF TG_TABLE_NAME='ProductionReversal' THEN
  SELECT * INTO w FROM "WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
  SELECT * INTO r FROM "ProductionRecord" WHERE id=NEW."productionRecordId" FOR UPDATE;
  IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text<>'EN_PROCESO' OR r.id IS NULL OR
     (NEW."workOrderId",NEW."workOrderLineId") IS DISTINCT FROM (r."workOrderId",r."workOrderLineId") OR NEW."planVersion"<>w.version OR NEW.date<r.date OR NEW.date>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Reversión exige OT en proceso, registro propio, fecha y versión compatibles'; END IF;
  IF r.type::text<>'SERVICIO' AND NOT NEW."physicalRestitutionConfirmed" THEN RAISE EXCEPTION 'Confirma restitución física real; daños se corrigen mediante ajustes'; END IF;
  IF EXISTS(SELECT 1 FROM "DeliveryNote" WHERE "workOrderId"=w.id) THEN RAISE EXCEPTION 'No revertir producción con despacho asociado'; END IF;
 ELSE
  SELECT * INTO v FROM "ProductionReversal" WHERE id=NEW."productionReversalId";
  IF v.id IS NULL OR NOT EXISTS(SELECT 1 FROM "ProductionReversal" x WHERE x.id=v.id AND x.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) OR NEW."productionRecordId"<>v."productionRecordId" THEN RAISE EXCEPTION 'Detalle sólo al confirmar la misma reversión'; END IF;
  IF TG_TABLE_NAME='ProductionReversalConsumption' THEN
   SELECT * INTO c FROM "ProductionConsumption" WHERE id=NEW."productionConsumptionId";
   PERFORM id FROM "RawMaterial" WHERE id=c."rawMaterialId" FOR UPDATE;
   IF c.id IS NULL OR (NEW."productionRecordId",NEW."rawMaterialId",NEW."warehouseId",NEW."unitMeasureId",NEW.quantity,NEW."materialCode",NEW."materialName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (c."productionRecordId",c."rawMaterialId",c."warehouseId",c."unitMeasureId",c.quantity,c."materialCode",c."materialName",c."unitName",c."unitAbbreviation") THEN RAISE EXCEPTION 'Devolver cada consumo original completo con sus copias históricas'; END IF;
  ELSE
   SELECT * INTO o FROM "ProductionOutput" WHERE id=NEW."productionOutputId";
   PERFORM id FROM "Product" WHERE id=o."productId" FOR UPDATE;
   IF o.id IS NULL OR (NEW."productionRecordId",NEW."productId",NEW."warehouseId",NEW."unitMeasureId",NEW.quantity,NEW."productCode",NEW."productName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (o."productionRecordId",o."productId",o."warehouseId",o."unitMeasureId",o.quantity,o."productCode",o."productName",o."unitName",o."unitAbbreviation") THEN RAISE EXCEPTION 'Retirar resultado original completo con sus copias históricas'; END IF;
   SELECT id INTO mov FROM "ProductStockMovement" WHERE "productionOutputId"=o.id;
   IF mov IS NULL OR EXISTS(SELECT 1 FROM "ProductStockMovement" m WHERE m."productId"=o."productId" AND m."warehouseId"=o."warehouseId" AND m.id>mov AND m.quantity<0) THEN RAISE EXCEPTION 'Salida o ajuste negativo posterior bloquea reversión, aunque exista reposición'; END IF;
   IF EXISTS(SELECT 1 FROM "StockReservationEvent" e JOIN "StockReservationAllocation" a ON a.id=e."allocationId" WHERE a."productionOutputId"=o.id AND e.type::text='CONSUMIR') THEN RAISE EXCEPTION 'Resultado con reserva consumida no puede revertirse'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductionReversal_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionReversal" FOR EACH ROW EXECUTE FUNCTION public.proteger_reversion_produccion();
CREATE TRIGGER "ProductionReversalConsumption_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionReversalConsumption" FOR EACH ROW EXECUTE FUNCTION public.proteger_reversion_produccion();
CREATE TRIGGER "ProductionReversalOutput_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionReversalOutput" FOR EACH ROW EXECUTE FUNCTION public.proteger_reversion_produccion();

CREATE FUNCTION public.proteger_movimiento_reversion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id integer; v public."ProductionReversal";
BEGIN
 IF TG_OP<>'INSERT' AND (to_jsonb(OLD)->>'productionReversalConsumptionId' IS NOT NULL OR to_jsonb(OLD)->>'productionReversalOutputId' IS NOT NULL) THEN RAISE EXCEPTION 'Movimientos de reversión inmutables'; END IF;
 IF TG_TABLE_NAME='StockMovement' AND to_jsonb(NEW)->>'productionReversalConsumptionId' IS NOT NULL THEN SELECT "productionReversalId" INTO v_id FROM "ProductionReversalConsumption" WHERE id=NEW."productionReversalConsumptionId";
 ELSIF TG_TABLE_NAME='ProductStockMovement' AND to_jsonb(NEW)->>'productionReversalOutputId' IS NOT NULL THEN SELECT "productionReversalId" INTO v_id FROM "ProductionReversalOutput" WHERE id=NEW."productionReversalOutputId"; END IF;
 IF v_id IS NOT NULL AND (TG_OP<>'INSERT' OR NOT EXISTS(SELECT 1 FROM "ProductionReversal" x WHERE x.id=v_id AND x.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296))) THEN RAISE EXCEPTION 'Movimiento sólo al confirmar la reversión'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER "StockMovement_reversal_protect" BEFORE INSERT OR UPDATE OR DELETE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION public.proteger_movimiento_reversion();
CREATE TRIGGER "ProductStockMovement_reversal_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductStockMovement" FOR EACH ROW EXECUTE FUNCTION public.proteger_movimiento_reversion();

CREATE FUNCTION public.comprobar_reversion_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id integer; v public."ProductionReversal"; r public."ProductionRecord"; op public."WorkOrderOperation"; c public."ProductionReversalConsumption"; o public."ProductionReversalOutput";
BEGIN
 IF TG_TABLE_NAME='ProductionReversal' THEN v_id:=NEW.id; ELSE v_id:=NEW."productionReversalId"; END IF;
 IF v_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO v FROM "ProductionReversal" WHERE id=v_id;
 SELECT * INTO r FROM "ProductionRecord" WHERE id=v."productionRecordId";
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "productionReversalId"=v.id;
 IF op."idempotencyKey" IS NULL OR op.type::text<>'REVERTIR_PRODUCCION' OR op."workOrderId"<>v."workOrderId" OR op.version<>v."planVersion"+1 OR op.reason IS DISTINCT FROM v.reason OR
    (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
    ((op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM ((op."afterSnapshot"->'header')-ARRAY['version','updatedAt']) THEN RAISE EXCEPTION 'Reversión requiere operación propia sin cambiar plan'; END IF;
 IF (SELECT count(*) FROM "ProductionReversalConsumption" WHERE "productionReversalId"=v.id)<>(SELECT count(*) FROM "ProductionConsumption" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Reversión debe incluir todos los consumos originales'; END IF;
 IF (SELECT count(*) FROM "ProductionReversalOutput" WHERE "productionReversalId"=v.id)<>(SELECT count(*) FROM "ProductionOutput" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Reversión debe incluir resultado original'; END IF;
 FOR c IN SELECT * FROM "ProductionReversalConsumption" WHERE "productionReversalId"=v.id LOOP
  IF NOT EXISTS(SELECT 1 FROM "StockMovement" WHERE "productionReversalConsumptionId"=c.id AND type::text='AJUSTE' AND quantity=c.quantity AND ((date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date=v.date) OR
     (SELECT quantity FROM "WarehouseStock" WHERE "rawMaterialId"=c."rawMaterialId" AND "warehouseId"=c."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM "StockMovement" WHERE "rawMaterialId"=c."rawMaterialId" AND "warehouseId"=c."warehouseId") THEN RAISE EXCEPTION 'Restitución requiere cantidad, fecha, saldo y Kardex atómicos'; END IF;
 END LOOP;
 SELECT * INTO o FROM "ProductionReversalOutput" WHERE "productionReversalId"=v.id;
 IF o.id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM "ProductStockMovement" WHERE "productionReversalOutputId"=o.id AND type::text='AJUSTE' AND quantity=-o.quantity AND date=v.date) OR
     (SELECT quantity FROM "ProductWarehouseStock" WHERE "productId"=o."productId" AND "warehouseId"=o."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM "ProductStockMovement" WHERE "productId"=o."productId" AND "warehouseId"=o."warehouseId") THEN RAISE EXCEPTION 'Retiro requiere cantidad, fecha, saldo y Kardex atómicos'; END IF;
  IF EXISTS(SELECT 1 FROM "StockReservationAllocation" a WHERE a."productionOutputId"=o."productionOutputId" AND public.reserva_activa_asignacion(a.id)>0) THEN RAISE EXCEPTION 'Liberar reservas del resultado revertido en la misma operación'; END IF;
 END IF;
 -- No se puede ocultar una ejecución mediante anulación posterior: sólo pendiente y sin inicio.
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductionReversal_complete" AFTER INSERT ON "ProductionReversal" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reversion_produccion();
CREATE CONSTRAINT TRIGGER "ProductionReversalConsumption_complete" AFTER INSERT ON "ProductionReversalConsumption" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reversion_produccion();
CREATE CONSTRAINT TRIGGER "ProductionReversalOutput_complete" AFTER INSERT ON "ProductionReversalOutput" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reversion_produccion();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_reversal_complete" AFTER INSERT ON "WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reversion_produccion();
CREATE OR REPLACE FUNCTION public.proteger_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; r public."ProductionRecord"; m public."RawMaterial"; u public."UnitMeasure"; p public."Product"; d public."WorkOrderDetail";
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Producción, consumos y resultados inmutables; corregir con documento de reversión'; END IF;
 IF TG_TABLE_NAME='ProductionRecord' THEN
  SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
  SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId" AND "workOrderId"=w.id;
  IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text<>'EN_PROCESO' OR l.id IS NULL OR NEW."planVersion"<>w.version OR NEW.date<w."startedDate" OR NEW.date>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Producción requiere OT en proceso, fecha compatible y versión vigente'; END IF;
  IF (NEW.type::text='FABRICACION_PRODUCTO')<>(l."executionMode"::text='CATALOGO') OR (NEW.type::text='EJECUCION_A_MEDIDA')<>(l."executionMode"::text='A_MEDIDA') OR (NEW.type::text='SERVICIO')<>(l."executionMode"::text='SERVICIO') THEN RAISE EXCEPTION 'Tipo productivo incompatible con línea'; END IF;
  IF NEW.quantity+coalesce((SELECT sum(quantity) FROM public."ProductionRecord" WHERE "workOrderLineId"=l.id AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionRecord".id)),0)>(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END) THEN RAISE EXCEPTION 'Registro supera cantidad pendiente de la línea'; END IF;
  IF NEW."correctsProductionRecordId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" WHERE "productionRecordId"=NEW."correctsProductionRecordId" AND "workOrderId"=NEW."workOrderId" AND "workOrderLineId"=NEW."workOrderLineId") THEN RAISE EXCEPTION 'La corrección debe referir un registro revertido de la misma línea'; END IF;
  IF NEW."expectedSnapshot" IS DISTINCT FROM public.necesidades_produccion(l.id,NEW.quantity,NEW."expectedSnapshot"->'roundingReviews') THEN RAISE EXCEPTION 'Necesidades históricas del registro adulteradas'; END IF;
 ELSE
  SELECT * INTO r FROM public."ProductionRecord" WHERE id=NEW."productionRecordId";
  SELECT * INTO w FROM public."WorkOrder" WHERE id=r."workOrderId" FOR UPDATE;
  IF r.id IS NULL OR r."workOrderId"<>NEW."workOrderId" OR r."workOrderLineId"<>NEW."workOrderLineId" OR NOT EXISTS(SELECT 1 FROM public."ProductionRecord" pr WHERE pr.id=r.id AND pr.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) THEN RAISE EXCEPTION 'Hijos sólo al confirmar el mismo registro productivo'; END IF;
  SELECT * INTO l FROM public."WorkOrderLine" WHERE id=r."workOrderLineId";
  IF TG_TABLE_NAME='ProductionConsumption' THEN
   IF r.type::text='SERVICIO' THEN RAISE EXCEPTION 'Servicio puro no consume materiales'; END IF;
   SELECT * INTO m FROM public."RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   SELECT * INTO u FROM public."UnitMeasure" WHERE id=m."unitMeasureId";
   SELECT * INTO d FROM public."WorkOrderDetail" WHERE id=NEW."plannedDetailId";
   IF NEW."unitMeasureId" IS DISTINCT FROM m."unitMeasureId" OR NOT EXISTS(SELECT 1 FROM public."Warehouse" WHERE id=NEW."warehouseId" AND classification::text IN ('MATERIA_PRIMA','MIXTA')) THEN RAISE EXCEPTION 'Consumo con unidad o bodega incompatible'; END IF;
   IF NEW."plannedDetailId" IS NOT NULL THEN
    IF d."retiredAt" IS NOT NULL OR (NEW."materialCode",NEW."materialName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (d."materialCode",d."materialName",d."unitName",d."unitAbbreviation") THEN RAISE EXCEPTION 'Consumo debe conservar copias del requerimiento histórico'; END IF;
   ELSIF (NEW."materialCode",NEW."materialName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (m.code,m.name,u.name,u.abbreviation) THEN RAISE EXCEPTION 'Copia de material adicional incompatible'; END IF;
   IF NEW."expectedQuantity" IS DISTINCT FROM coalesce((SELECT (x->>'quantity')::numeric FROM jsonb_array_elements(r."expectedSnapshot"->'distribution') x WHERE (x->>'rawMaterialId')::integer=NEW."rawMaterialId" AND (x->>'warehouseId')::integer=NEW."warehouseId"),0) THEN RAISE EXCEPTION 'Previsión de consumo debe calcularse en servidor'; END IF;
  ELSE
   SELECT * INTO p FROM public."Product" WHERE id=l."productId" AND "deletedAt" IS NULL FOR UPDATE;
   IF r.type::text<>'FABRICACION_PRODUCTO' OR p.id IS NULL OR NEW."productId"<>p.id OR NEW.quantity<>r.quantity OR (NEW."productCode",NEW."productName",NEW."unitMeasureId",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (p.code,l.description,l."unitMeasureId",l."unitName",l."unitAbbreviation") OR NOT EXISTS(SELECT 1 FROM public."Warehouse" WHERE id=NEW."warehouseId" AND classification::text IN ('PRODUCTO_TERMINADO','MIXTA')) THEN RAISE EXCEPTION 'Resultado debe corresponder al producto, cantidad, unidad y bodega de la línea'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION comprobar_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento integer; w record; op record; v_linea record; s jsonb; esperado jsonb; recaptura boolean;
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN documento:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderLineId" ELSE NEW."workOrderLineId" END;
 ELSE documento:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=documento;
 IF w.id IS NULL OR w."schemaVersion" IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND version=w.version;
 IF op."idempotencyKey" IS NULL OR (w.version=1 AND op.type::text<>'CREAR') OR
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='EN_PROCESO' AND op.type::text NOT IN ('INICIAR','RESERVAR_STOCK','LIBERAR_RESERVA','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "workOrderId"=w.id) THEN RAISE EXCEPTION 'Trabajo nuevo requiere líneas'; END IF;
 IF w."salesOrderId" IS NOT NULL AND (SELECT count(*) FROM "WorkOrderLine" WHERE "workOrderId"=w.id)<>(SELECT count(*) FROM "SalesOrderDetail" WHERE "salesOrderId"=w."salesOrderId") THEN RAISE EXCEPTION 'Trabajo debe incluir todas las líneas aceptadas, una vez'; END IF;
 FOR v_linea IN SELECT * FROM "WorkOrderLine" WHERE "workOrderId"=w.id LOOP
  IF v_linea."executionMode"::text='CATALOGO' AND v_linea."quantityToProduce">0 AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL) THEN RAISE EXCEPTION 'Fabricación requiere receta histórica'; END IF;
  recaptura := EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" r WHERE r."workOrderLineId"=v_linea.id AND r."retiredAt" IS NULL AND r.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) OR
   NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderLine",coalesce(op."beforeSnapshot"->'lines','[]'::jsonb)) p WHERE p.id=v_linea.id AND
    p."productVersion" IS NOT DISTINCT FROM v_linea."productVersion" AND p."recipeCapturedAt" IS NOT DISTINCT FROM v_linea."recipeCapturedAt" AND p."recipeFingerprint" IS NOT DISTINCT FROM v_linea."recipeFingerprint");
  IF recaptura AND EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL) AND (
   NOT EXISTS(SELECT 1 FROM "Product" WHERE id=v_linea."productId" AND version=v_linea."productVersion" AND "deletedAt" IS NULL) OR
   (SELECT count(*) FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)<>(SELECT count(*) FROM "ProductRecipe" WHERE "productId"=v_linea."productId") OR
   EXISTS(SELECT 1 FROM "ProductRecipe" r JOIN "RawMaterial" m ON m.id=r."rawMaterialId" JOIN "UnitMeasure" u ON u.id=m."unitMeasureId"
    WHERE r."productId"=v_linea."productId" AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" p WHERE p."workOrderLineId"=v_linea.id AND p."retiredAt" IS NULL AND
     p."rawMaterialId"=r."rawMaterialId" AND p."quantityPerUnit"=r.quantity AND p."unitMeasureId"=m."unitMeasureId" AND
     p."materialCode"=m.code AND p."materialName"=m.name AND p."unitName"=u.name AND p."unitAbbreviation"=u.abbreviation))) THEN RAISE EXCEPTION 'Captura de receta debe ser completa y corresponder a revisión actual'; END IF;
  IF v_linea."executionMode"::text='CATALOGO' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)>v_linea."quantityFromStock" THEN RAISE EXCEPTION 'Abastecimiento supera cantidad desde stock'; END IF;
  IF v_linea."executionMode"::text='VENTA_DIRECTA_MP' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)>v_linea.quantity THEN RAISE EXCEPTION 'Abastecimiento directo supera cantidad contratada'; END IF;
 END LOOP;
 s:=op."afterSnapshot"; esperado:=public.snapshot_plan_trabajo(w.id);
 -- Normalizar tipos de Prisma (Decimal texto/fechas ISO) antes de comparar la copia.
 IF s->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(s->'header') IS DISTINCT FROM 'object' OR
    to_jsonb(jsonb_populate_record(NULL::"WorkOrder",s->'header')) IS DISTINCT FROM to_jsonb(w) THEN RAISE EXCEPTION 'Snapshot de operación no coincide con cabecera'; END IF;
 IF jsonb_typeof(s->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'lines')<>jsonb_array_length(esperado->'lines') OR
    EXISTS(SELECT 1 FROM "WorkOrderLine" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderLine",s->'lines') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de líneas distinto'; END IF;
 IF jsonb_typeof(s->'recipeMaterials') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'recipeMaterials')<>jsonb_array_length(esperado->'recipeMaterials') OR
    EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" a JOIN "WorkOrderLine" l ON l.id=a."workOrderLineId" WHERE l."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderRecipeMaterial",s->'recipeMaterials') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de receta distinto'; END IF;
 IF jsonb_typeof(s->'materials') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'materials')<>jsonb_array_length(esperado->'materials') OR
    EXISTS(SELECT 1 FROM "WorkOrderDetail" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderDetail",s->'materials') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de requerimientos distinto'; END IF;
 IF jsonb_typeof(s->'supplies') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'supplies')<>jsonb_array_length(esperado->'supplies') OR
    EXISTS(SELECT 1 FROM "WorkOrderSupplyPlan" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderSupplyPlan",s->'supplies') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de abastecimiento distinto'; END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.comprobar_reservas_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE work_id integer; op public."WorkOrderOperation"; w public."WorkOrder"; esperado jsonb; s jsonb; a public."StockReservationAllocation"; active numeric; demanda numeric; origen public."WorkOrderOperation";
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN work_id:=NEW.id;
 ELSIF TG_TABLE_NAME='StockReservationEvent' THEN SELECT "workOrderId" INTO work_id FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO work_id FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 ELSE work_id:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=work_id;
 IF w."schemaVersion" IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 SELECT * INTO op FROM public."WorkOrderOperation" WHERE "workOrderId"=work_id AND version=w.version;
 FOR a IN SELECT * FROM public."StockReservationAllocation" WHERE "workOrderId"=work_id LOOP
  SELECT * INTO origen FROM public."WorkOrderOperation" WHERE "idempotencyKey"=a."operationId";
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  IF origen.type::text='REVERTIR_PRODUCCION' AND (a."plannedDetailId" IS NULL OR a.purpose::text<>'CONSUMO_PRODUCCION') THEN RAISE EXCEPTION 'Reversión sólo reconstruye reservas de requerimientos pendientes'; END IF;
  IF origen.type::text='REGISTRAR_PRODUCCION' AND a."productionOutputId" IS NULL THEN RAISE EXCEPTION 'Producción sólo crea reservas del resultado fabricado'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
  IF active>0 THEN
   IF w.status::text='ANULADO' THEN RAISE EXCEPTION 'Anulación debe liberar todas sus reservas'; END IF;
   IF a."plannedDetailId" IS NOT NULL THEN
    SELECT public.demanda_pendiente_requerimiento(d.id) INTO demanda FROM public."WorkOrderDetail" d WHERE d.id=a."plannedDetailId" AND d."retiredAt" IS NULL AND
      (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId")=(a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."plannedDetailId"=a."plannedDetailId")>demanda THEN RAISE EXCEPTION 'Reservas superan requerimiento vigente o recurso fue sustituido'; END IF;
   ELSIF a."supplyPlanId" IS NOT NULL THEN
    SELECT s.quantity INTO demanda FROM public."WorkOrderSupplyPlan" s WHERE s.id=a."supplyPlanId" AND s."retiredAt" IS NULL AND
      (s."workOrderId",s."workOrderLineId",s."warehouseId")=(a."workOrderId",a."workOrderLineId",a."warehouseId") AND s."rawMaterialId" IS NOT DISTINCT FROM a."rawMaterialId" AND s."productId" IS NOT DISTINCT FROM a."productId";
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."supplyPlanId"=a."supplyPlanId")>demanda THEN RAISE EXCEPTION 'Reservas superan abastecimiento vigente o recurso fue sustituido'; END IF;
   ELSE
    SELECT quantity INTO demanda FROM public."ProductionOutput" WHERE id=a."productionOutputId" AND "workOrderId"=work_id AND "workOrderLineId"=a."workOrderLineId" AND "productId"=a."productId" AND "warehouseId"=a."warehouseId" AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionOutput"."productionRecordId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."productionOutputId"=a."productionOutputId")>demanda THEN RAISE EXCEPTION 'Reservas del resultado superan cantidad fabricada'; END IF;
   END IF;
   IF a.purpose::text='ENTREGA_PRODUCTO' AND (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."workOrderLineId"=a."workOrderLineId" AND b.purpose::text='ENTREGA_PRODUCTO')>(SELECT quantity FROM public."WorkOrderLine" WHERE id=a."workOrderLineId") THEN RAISE EXCEPTION 'Cobertura de terminado supera compromiso de la línea'; END IF;
   IF public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")>coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN
       (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE
       (SELECT quantity FROM public."ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0) THEN RAISE EXCEPTION 'Reservas exceden físico'; END IF;
  END IF;
 END LOOP;
 IF op.type::text IN ('RESERVAR_STOCK','LIBERAR_RESERVA') AND (
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   ((op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM ((op."afterSnapshot"->'header')-ARRAY['version','updatedAt'])) THEN RAISE EXCEPTION 'Operación de reserva no puede modificar el plan'; END IF;
 IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" alloc ON alloc.id=e."allocationId" JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId" LEFT JOIN public."ProductionConsumption" c ON c.id=e."productionConsumptionId" WHERE alloc."workOrderId"=work_id AND e.type::text='CONSUMIR' AND (o.type::text<>'REGISTRAR_PRODUCCION' OR o."productionRecordId" IS DISTINCT FROM c."productionRecordId")) THEN RAISE EXCEPTION 'Consumo de reserva debe pertenecer al mismo registro y operación'; END IF;
 esperado:=public.snapshot_reservas_trabajo(work_id); s:=op."reservationSnapshot";
 IF jsonb_array_length(esperado->'allocations')>0 OR s IS NOT NULL THEN
  -- Snapshot generado en servidor: igualdad JSON exacta, sin redondear una copia adulterada.
  IF s IS DISTINCT FROM esperado THEN RAISE EXCEPTION 'Historial de reservas debe coincidir exactamente con operación actual'; END IF;
 END IF;
 -- Añadir filas a una operación anterior no puede aprovechar una revisión posterior.
 IF TG_TABLE_NAME IN ('StockReservationAllocation','StockReservationEvent') THEN
  IF NEW."operationId" IS DISTINCT FROM op."idempotencyKey" THEN RAISE EXCEPTION 'Reserva/evento exige UUID de revisión actual'; END IF;
 END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.proteger_reserva_stock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; a public."StockReservationAllocation"; d public."WorkOrderDetail"; s public."WorkOrderSupplyPlan"; fisico numeric; activa numeric; clasificacion text; c public."ProductionConsumption"; o public."ProductionOutput";
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reservas y eventos inmutables; registrar liberación con motivo'; END IF;
 IF TG_TABLE_NAME='StockReservationEvent' THEN
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
  SELECT * INTO w FROM public."WorkOrder" WHERE id=a."workOrderId" FOR UPDATE;
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId" FOR UPDATE;
  IF w.id IS NULL OR w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('PENDIENTE','EN_PROCESO','ANULADO') THEN RAISE EXCEPTION 'Liberación requiere trabajo pendiente/en proceso o anulación propia coordinada'; END IF;
  IF NEW.type::text='CONSUMIR' THEN
   SELECT * INTO c FROM public."ProductionConsumption" WHERE id=NEW."productionConsumptionId";
   IF a.purpose::text<>'CONSUMO_PRODUCCION' OR c.id IS NULL OR (c."workOrderId",c."workOrderLineId",c."rawMaterialId",c."warehouseId",c."unitMeasureId") IS DISTINCT FROM (a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId") THEN RAISE EXCEPTION 'Débito debe consumir reserva propia del mismo insumo y línea'; END IF;
  END IF;
  IF a."rawMaterialId" IS NOT NULL THEN PERFORM id FROM public."RawMaterial" WHERE id=a."rawMaterialId" FOR UPDATE;
  ELSE PERFORM id FROM public."Product" WHERE id=a."productId" FOR UPDATE; END IF;
  IF NEW.quantity>public.reserva_activa_asignacion(a.id) THEN RAISE EXCEPTION 'Liberación excede remanente de reserva'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('PENDIENTE','EN_PROCESO') OR l."workOrderId" IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'Reserva requiere línea del trabajo nuevo pendiente o en proceso'; END IF;
 IF NEW."rawMaterialId" IS NOT NULL THEN
  PERFORM id FROM public."RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
  SELECT quantity INTO fisico FROM public."WarehouseStock" WHERE "rawMaterialId"=NEW."rawMaterialId" AND "warehouseId"=NEW."warehouseId" FOR UPDATE;
 ELSE
  PERFORM id FROM public."Product" WHERE id=NEW."productId" FOR UPDATE;
  SELECT quantity INTO fisico FROM public."ProductWarehouseStock" WHERE "productId"=NEW."productId" AND "warehouseId"=NEW."warehouseId" FOR UPDATE;
 END IF;
 SELECT classification::text INTO clasificacion FROM public."Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
 IF NEW."rawMaterialId" IS NOT NULL AND clasificacion NOT IN ('MATERIA_PRIMA','MIXTA') OR
    NEW."productId" IS NOT NULL AND clasificacion NOT IN ('PRODUCTO_TERMINADO','MIXTA') OR clasificacion IS NULL THEN RAISE EXCEPTION 'Reserva exige bodega explícitamente compatible'; END IF;
 IF NEW.purpose::text='CONSUMO_PRODUCCION' THEN
  SELECT * INTO d FROM public."WorkOrderDetail" WHERE id=NEW."plannedDetailId";
  IF (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."warehouseId",NEW."unitMeasureId") OR
    (NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM
     (d."materialCode",d."materialName",d."unitName",d."unitAbbreviation") THEN RAISE EXCEPTION 'Reserva no corresponde al requerimiento histórico'; END IF;
 ELSIF NEW."supplyPlanId" IS NOT NULL THEN
  SELECT * INTO s FROM public."WorkOrderSupplyPlan" WHERE id=NEW."supplyPlanId";
  IF w."salesOrderId" IS NULL OR (s."workOrderId",s."workOrderLineId",s."rawMaterialId",s."productId",s."warehouseId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."productId",NEW."warehouseId") OR
     (NEW."unitMeasureId",NEW."unitName",NEW."unitAbbreviation",NEW."resourceCode",NEW."resourceName") IS DISTINCT FROM
     (l."unitMeasureId",l."unitName",l."unitAbbreviation",l.code,l.description) THEN RAISE EXCEPTION 'Reserva comercial no corresponde a abastecimiento histórico'; END IF;
 ELSE
  SELECT * INTO o FROM public."ProductionOutput" WHERE id=NEW."productionOutputId" AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionOutput"."productionRecordId");
  IF w."salesOrderId" IS NULL OR o.id IS NULL OR (NEW."workOrderId",NEW."workOrderLineId",NEW."productId",NEW."warehouseId",NEW."unitMeasureId",NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (o."workOrderId",o."workOrderLineId",o."productId",o."warehouseId",o."unitMeasureId",o."productCode"::text,o."productName",o."unitName",o."unitAbbreviation") THEN RAISE EXCEPTION 'Reserva del resultado exige línea comercial y copias del resultado fabricado'; END IF;
 END IF;
 activa:=public.reserva_activa_recurso(NEW."rawMaterialId",NEW."productId",NEW."warehouseId");
 IF activa+NEW.quantity>coalesce(fisico,0) THEN RAISE EXCEPTION 'Stock libre insuficiente para reserva; otras reservas se conservan'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.demanda_pendiente_requerimiento(p_id integer) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT least(greatest(d."quantityNeeded"-coalesce((SELECT sum(c.quantity) FROM public."ProductionConsumption" c WHERE c."plannedDetailId"=d.id AND NOT EXISTS(SELECT 1 FROM public."ProductionReversal" v WHERE v."productionRecordId"=c."productionRecordId")),0),0),
 greatest(round(d."quantityNeeded"*(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END-coalesce((SELECT sum(r.quantity) FROM public."ProductionRecord" r WHERE r."workOrderLineId"=l.id AND NOT EXISTS(SELECT 1 FROM public."ProductionReversal" v WHERE v."productionRecordId"=r.id)),0))/nullif(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END,0),3),0))
 FROM public."WorkOrderDetail" d JOIN public."WorkOrderLine" l ON l.id=d."workOrderLineId" WHERE d.id=p_id AND d."retiredAt" IS NULL
$$;

CREATE FUNCTION public.proteger_anulacion_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status::text='ANULADO' AND OLD.status::text<>'ANULADO' THEN
  IF OLD.status::text<>'PENDIENTE' OR OLD."salesOrderId" IS NOT NULL OR OLD."startedDate" IS NOT NULL OR
    (to_jsonb(NEW)-ARRAY['status','voidedAt','voidReason','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','voidedAt','voidReason','version','updatedAt']) OR
    EXISTS(SELECT 1 FROM "ProductionRecord" WHERE "workOrderId"=OLD.id) OR EXISTS(SELECT 1 FROM "DeliveryNote" WHERE "workOrderId"=OLD.id) THEN RAISE EXCEPTION 'Anular sólo obra propia pendiente sin ejecución, conservando su plan'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrder_annulment_protect" BEFORE UPDATE ON "WorkOrder" FOR EACH ROW EXECUTE FUNCTION public.proteger_anulacion_trabajo();

CREATE FUNCTION public.comprobar_operacion_correccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v public."ProductionReversal"; w public."WorkOrder";
BEGIN
 IF NEW.type::text='REVERTIR_PRODUCCION' THEN
  SELECT * INTO v FROM "ProductionReversal" WHERE id=NEW."productionReversalId";
  IF EXISTS(SELECT 1 FROM "StockReservationAllocation" a WHERE a."operationId"=NEW."idempotencyKey" AND (a."workOrderLineId"<>v."workOrderLineId" OR a."plannedDetailId" IS NULL)) OR
    EXISTS(SELECT 1 FROM "StockReservationEvent" e JOIN "StockReservationAllocation" a ON a.id=e."allocationId" LEFT JOIN "ProductionOutput" o ON o.id=a."productionOutputId" WHERE e."operationId"=NEW."idempotencyKey" AND (e.type::text<>'LIBERAR' OR o."productionRecordId" IS DISTINCT FROM v."productionRecordId")) THEN RAISE EXCEPTION 'Reversión sólo libera su resultado y reserva requerimientos de su línea'; END IF;
 ELSIF NEW.type::text='ANULAR' THEN
  SELECT * INTO w FROM "WorkOrder" WHERE id=NEW."workOrderId";
  IF NEW.reason IS DISTINCT FROM w."voidReason" OR (NEW."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (NEW."afterSnapshot"-ARRAY['header']) THEN RAISE EXCEPTION 'Anulación requiere mismo motivo y conserva plan histórico'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_correction_complete" AFTER INSERT ON "WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_operacion_correccion();

COMMIT;
