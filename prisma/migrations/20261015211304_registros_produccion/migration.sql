BEGIN;
/*
  Warnings:

  - A unique constraint covering the columns `[productionOutputId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionOutputId,productId,warehouseId]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionConsumptionId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionConsumptionId,rawMaterialId,warehouseId]` on the table `StockMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,workOrderLineId,rawMaterialId,warehouseId]` on the table `WorkOrderDetail` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionRecordId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionRecordId,workOrderId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductionRecordType" AS ENUM ('FABRICACION_PRODUCTO', 'EJECUCION_A_MEDIDA', 'SERVICIO');

-- AlterEnum
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'REGISTRAR_PRODUCCION';

-- AlterTable
ALTER TABLE "ProductStockMovement" ADD COLUMN     "productionOutputId" INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "productionConsumptionId" INTEGER;

-- AlterTable
ALTER TABLE "StockReservationAllocation" ADD COLUMN     "productionOutputId" INTEGER;

-- AlterTable
ALTER TABLE "StockReservationEvent" ADD COLUMN     "productionConsumptionId" INTEGER;

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "productionRecordId" INTEGER;

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "type" "ProductionRecordType" NOT NULL,
    "date" DATE NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "deviationReason" VARCHAR(1000),
    "planVersion" INTEGER NOT NULL,
    "expectedSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionConsumption" (
    "id" SERIAL NOT NULL,
    "productionRecordId" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "plannedDetailId" INTEGER,
    "rawMaterialId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "expectedQuantity" DECIMAL(14,3) NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOutput" (
    "id" SERIAL NOT NULL,
    "productionRecordId" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
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

    CONSTRAINT "ProductionOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRecord_workOrderId_date_id_idx" ON "ProductionRecord"("workOrderId", "date", "id");

-- CreateIndex
CREATE INDEX "ProductionRecord_workOrderLineId_workOrderId_idx" ON "ProductionRecord"("workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRecord_id_workOrderId_key" ON "ProductionRecord"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRecord_id_workOrderLineId_workOrderId_key" ON "ProductionRecord"("id", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_productionRecordId_workOrderLineId_wo_idx" ON "ProductionConsumption"("productionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_plannedDetailId_workOrderLineId_rawMa_idx" ON "ProductionConsumption"("plannedDetailId", "workOrderLineId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_workOrderLineId_rawMaterialId_warehou_idx" ON "ProductionConsumption"("workOrderLineId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_rawMaterialId_warehouseId_id_idx" ON "ProductionConsumption"("rawMaterialId", "warehouseId", "id");

-- CreateIndex
CREATE INDEX "ProductionConsumption_warehouseId_idx" ON "ProductionConsumption"("warehouseId");

-- CreateIndex
CREATE INDEX "ProductionConsumption_unitMeasureId_idx" ON "ProductionConsumption"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionConsumption_id_rawMaterialId_warehouseId_key" ON "ProductionConsumption"("id", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionConsumption_productionRecordId_rawMaterialId_ware_key" ON "ProductionConsumption"("productionRecordId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOutput_productionRecordId_key" ON "ProductionOutput"("productionRecordId");

-- CreateIndex
CREATE INDEX "ProductionOutput_productionRecordId_workOrderLineId_workOrd_idx" ON "ProductionOutput"("productionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "ProductionOutput_workOrderLineId_workOrderId_idx" ON "ProductionOutput"("workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "ProductionOutput_productId_warehouseId_id_idx" ON "ProductionOutput"("productId", "warehouseId", "id");

-- CreateIndex
CREATE INDEX "ProductionOutput_warehouseId_idx" ON "ProductionOutput"("warehouseId");

-- CreateIndex
CREATE INDEX "ProductionOutput_unitMeasureId_idx" ON "ProductionOutput"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOutput_id_productId_warehouseId_key" ON "ProductionOutput"("id", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOutput_productionRecordId_workOrderLineId_workOrd_key" ON "ProductionOutput"("productionRecordId", "workOrderLineId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_productionOutputId_key" ON "ProductStockMovement"("productionOutputId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_productionOutputId_productId_warehouse_key" ON "ProductStockMovement"("productionOutputId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_productionConsumptionId_key" ON "StockMovement"("productionConsumptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_productionConsumptionId_rawMaterialId_warehou_key" ON "StockMovement"("productionConsumptionId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_productionOutputId_idx" ON "StockReservationAllocation"("productionOutputId");

-- CreateIndex
CREATE INDEX "StockReservationEvent_productionConsumptionId_idx" ON "StockReservationEvent"("productionConsumptionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderDetail_id_workOrderLineId_rawMaterialId_warehouseI_key" ON "WorkOrderDetail"("id", "workOrderLineId", "rawMaterialId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_productionRecordId_key" ON "WorkOrderOperation"("productionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_productionRecordId_workOrderId_key" ON "WorkOrderOperation"("productionRecordId", "workOrderId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productionConsumptionId_rawMaterialId_wareho_fkey" FOREIGN KEY ("productionConsumptionId", "rawMaterialId", "warehouseId") REFERENCES "ProductionConsumption"("id", "rawMaterialId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_productionRecordId_workOrderId_fkey" FOREIGN KEY ("productionRecordId", "workOrderId") REFERENCES "ProductionRecord"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productionOutputId_productId_warehous_fkey" FOREIGN KEY ("productionOutputId", "productId", "warehouseId") REFERENCES "ProductionOutput"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_productionOutputId_fkey" FOREIGN KEY ("productionOutputId") REFERENCES "ProductionOutput"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "StockReservationEvent_productionConsumptionId_fkey" FOREIGN KEY ("productionConsumptionId") REFERENCES "ProductionConsumption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_workOrderLineId_workOrderId_fkey" FOREIGN KEY ("workOrderLineId", "workOrderId") REFERENCES "WorkOrderLine"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_productionRecordId_workOrderLineId_w_fkey" FOREIGN KEY ("productionRecordId", "workOrderLineId", "workOrderId") REFERENCES "ProductionRecord"("id", "workOrderLineId", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_plannedDetailId_workOrderLineId_rawM_fkey" FOREIGN KEY ("plannedDetailId", "workOrderLineId", "rawMaterialId", "warehouseId") REFERENCES "WorkOrderDetail"("id", "workOrderLineId", "rawMaterialId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_productionRecordId_workOrderLineId_workOr_fkey" FOREIGN KEY ("productionRecordId", "workOrderLineId", "workOrderId") REFERENCES "ProductionRecord"("id", "workOrderLineId", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cantidades y documentos inmutables. Los movimientos conservan sus orígenes anteriores.
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_values" CHECK (quantity>0 AND quantity<>'NaN'::numeric AND "planVersion">0 AND length(note)<=2000);
ALTER TABLE "ProductionConsumption" ADD CONSTRAINT "ProductionConsumption_values" CHECK (quantity>0 AND quantity<>'NaN'::numeric AND "expectedQuantity">=0 AND "expectedQuantity"<>'NaN'::numeric AND btrim("materialCode")<>'' AND btrim("materialName")<>'' AND btrim("unitName")<>'' AND btrim("unitAbbreviation")<>'');
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_values" CHECK (quantity>0 AND quantity<>'NaN'::numeric AND btrim("productName")<>'' AND btrim("unitName")<>'' AND btrim("unitAbbreviation")<>'');
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_production_origin" CHECK ((type::text='REGISTRAR_PRODUCCION')=("productionRecordId" IS NOT NULL));
ALTER TABLE "ProductStockMovement" DROP CONSTRAINT "ProductStockMovement_origin";
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_origin" CHECK (quantity<>'NaN'::numeric AND btrim(note)<>'' AND num_nonnulls("initialStockId","adjustmentId","productionOutputId")=1 AND (
 ("initialStockId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0) OR ("adjustmentId" IS NOT NULL AND type::text='AJUSTE' AND quantity<>0) OR ("productionOutputId" IS NOT NULL AND type::text='ENTRADA' AND quantity>0)));
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_production_origin" CHECK ("productionConsumptionId" IS NULL OR (type::text='SALIDA' AND quantity<0 AND quantity<>'NaN'::numeric AND num_nonnulls("purchaseDetailId","purchaseReceiptDetailId","reversedReceiptDetailId","workOrderDetailId","inventoryAdjustmentId","outgoingTransferId","incomingTransferId")=0));
ALTER TABLE "StockReservationAllocation" DROP CONSTRAINT "Reservation_origin_check";
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "Reservation_origin_check" CHECK (num_nonnulls("plannedDetailId","supplyPlanId","productionOutputId")=1 AND (
 (purpose::text='CONSUMO_PRODUCCION' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND "plannedDetailId" IS NOT NULL) OR
 (purpose::text='ENTREGA_DIRECTA_MP' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND "supplyPlanId" IS NOT NULL) OR
 (purpose::text='ENTREGA_PRODUCTO' AND "productId" IS NOT NULL AND "rawMaterialId" IS NULL AND ("supplyPlanId" IS NOT NULL OR "productionOutputId" IS NOT NULL))));
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "ReservationEvent_consumption_origin" CHECK ((type::text='CONSUMIR')=("productionConsumptionId" IS NOT NULL));

CREATE FUNCTION public.necesidades_produccion(p_line integer,p_quantity numeric,p_reviews jsonb,p_require_review boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE l public."WorkOrderLine"; r record; d record; rev jsonb; exacta numeric; esperada numeric; restante numeric; asignada numeric; total numeric; materiales jsonb:='[]'; distribucion jsonb:='[]'; usados integer[]:='{}'; requiere boolean;
BEGIN
 SELECT * INTO l FROM public."WorkOrderLine" WHERE id=p_line;
 IF l.id IS NULL OR l."executionMode"::text='VENTA_DIRECTA_MP' OR p_quantity<=0 OR p_quantity<>round(p_quantity,3) OR p_quantity>'99999999999.999'::numeric OR p_quantity='NaN'::numeric OR jsonb_typeof(p_reviews) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Línea, cantidad o revisiones de producción inválidas'; END IF;
 FOR r IN
  SELECT m."rawMaterialId",m."unitMeasureId",m."materialName",m."unitAbbreviation",p_quantity*m."quantityPerUnit" AS exacta FROM public."WorkOrderRecipeMaterial" m WHERE m."workOrderLineId"=p_line AND m."retiredAt" IS NULL AND l."executionMode"::text='CATALOGO'
  UNION ALL SELECT m."rawMaterialId",min(m."unitMeasureId"),min(m."materialName"),min(m."unitAbbreviation"),sum(m."quantityNeeded")*p_quantity/l.quantity FROM public."WorkOrderDetail" m WHERE m."workOrderLineId"=p_line AND m."retiredAt" IS NULL AND l."executionMode"::text='A_MEDIDA' GROUP BY m."rawMaterialId"
  ORDER BY 1
 LOOP
  exacta:=r.exacta;esperada:=round(exacta,3);requiere:=exacta>0 AND esperada=0;
  IF esperada>'99999999999.999'::numeric THEN RAISE EXCEPTION 'Requerimiento de lote fuera de rango'; END IF;
  SELECT value INTO rev FROM jsonb_array_elements(p_reviews) WHERE (value->>'rawMaterialId')::integer=r."rawMaterialId";
  IF requiere AND (p_require_review OR rev IS NOT NULL) THEN
   IF rev IS NULL OR coalesce(rev->>'quantity','')!~'^\d{1,11}(\.\d{1,3})?$' OR (rev->>'quantity')::numeric<=0 OR coalesce(length(btrim(rev->>'reason')),0)=0 OR length(rev->>'reason')>1000 THEN RAISE EXCEPTION 'Necesidad positiva que redondea a cero exige revisión positiva y motivo para este lote'; END IF;
   esperada:=(rev->>'quantity')::numeric;usados:=array_append(usados,r."rawMaterialId");
  ELSIF NOT requiere AND rev IS NOT NULL THEN RAISE EXCEPTION 'Revisión sólo para necesidad positiva redondeada a cero'; END IF;
  materiales:=materiales||jsonb_build_array(jsonb_build_object('rawMaterialId',r."rawMaterialId",'unitMeasureId',r."unitMeasureId",'name',r."materialName",'unit',r."unitAbbreviation",'exactQuantity',to_char(round(exacta,6),'FM99999999999999999999999990.000000'),'quantity',to_char(esperada,'FM999999999990.000'),'requiresReview',requiere));
  SELECT sum("quantityNeeded") INTO total FROM public."WorkOrderDetail" WHERE "workOrderLineId"=p_line AND "rawMaterialId"=r."rawMaterialId" AND "retiredAt" IS NULL;
  restante:=esperada;
  FOR d IN SELECT *,row_number() OVER(ORDER BY id DESC)=1 AS ultimo FROM public."WorkOrderDetail" WHERE "workOrderLineId"=p_line AND "rawMaterialId"=r."rawMaterialId" AND "retiredAt" IS NULL ORDER BY id LOOP
   asignada:=CASE WHEN d.ultimo THEN restante ELSE least(restante,round(esperada*d."quantityNeeded"/total,3)) END;restante:=restante-asignada;
   distribucion:=distribucion||jsonb_build_array(jsonb_build_object('plannedDetailId',d.id,'rawMaterialId',d."rawMaterialId",'warehouseId',d."warehouseId",'unitMeasureId',d."unitMeasureId",'quantity',to_char(asignada,'FM999999999990.000')));
  END LOOP;
 END LOOP;
 IF jsonb_array_length(p_reviews)<>cardinality(usados) OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_reviews) x GROUP BY x->>'rawMaterialId' HAVING count(*)<>1) THEN RAISE EXCEPTION 'No repetir ni agregar revisiones ajenas al lote'; END IF;
 RETURN jsonb_build_object('schemaVersion',1,'workOrderLineId',p_line,'quantity',to_char(p_quantity,'FM999999999990.000'),'roundingReviews',p_reviews,'materials',materiales,'distribution',distribucion);
END $$;

-- El menor entre pendiente según consumo real y previsión del avance que aún falta.
CREATE FUNCTION public.demanda_pendiente_requerimiento(p_id integer) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT least(greatest(d."quantityNeeded"-coalesce((SELECT sum(c.quantity) FROM public."ProductionConsumption" c WHERE c."plannedDetailId"=d.id),0),0),
 greatest(round(d."quantityNeeded"*(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END-coalesce((SELECT sum(r.quantity) FROM public."ProductionRecord" r WHERE r."workOrderLineId"=l.id),0))/nullif(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END,0),3),0))
 FROM public."WorkOrderDetail" d JOIN public."WorkOrderLine" l ON l.id=d."workOrderLineId" WHERE d.id=p_id AND d."retiredAt" IS NULL
$$;

-- Conservar forma JSON histórica cuando la nueva referencia es nula.
CREATE OR REPLACE FUNCTION public.snapshot_reservas_trabajo(p_work integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('schemaVersion',1,
 'allocations',coalesce((SELECT jsonb_agg((to_jsonb(a)-'productionOutputId')||CASE WHEN a."productionOutputId" IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('productionOutputId',a."productionOutputId") END||jsonb_build_object('quantity',a.quantity::text) ORDER BY a.id) FROM public."StockReservationAllocation" a WHERE a."workOrderId"=p_work),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg((to_jsonb(e)-'productionConsumptionId')||CASE WHEN e."productionConsumptionId" IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('productionConsumptionId',e."productionConsumptionId") END||jsonb_build_object('quantity',e.quantity::text) ORDER BY e.id) FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" a ON a.id=e."allocationId" WHERE a."workOrderId"=p_work),'[]'::jsonb))
$$;

CREATE FUNCTION public.proteger_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; r public."ProductionRecord"; m public."RawMaterial"; u public."UnitMeasure"; p public."Product"; d public."WorkOrderDetail";
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Producción, consumos y resultados inmutables; corregir con documento de reversión'; END IF;
 IF TG_TABLE_NAME='ProductionRecord' THEN
  SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
  SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId" AND "workOrderId"=w.id;
  IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text<>'EN_PROCESO' OR l.id IS NULL OR NEW."planVersion"<>w.version OR NEW.date<w."startedDate" OR NEW.date>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Producción requiere OT en proceso, fecha compatible y versión vigente'; END IF;
  IF (NEW.type::text='FABRICACION_PRODUCTO')<>(l."executionMode"::text='CATALOGO') OR (NEW.type::text='EJECUCION_A_MEDIDA')<>(l."executionMode"::text='A_MEDIDA') OR (NEW.type::text='SERVICIO')<>(l."executionMode"::text='SERVICIO') THEN RAISE EXCEPTION 'Tipo productivo incompatible con línea'; END IF;
  IF NEW.quantity+coalesce((SELECT sum(quantity) FROM public."ProductionRecord" WHERE "workOrderLineId"=l.id),0)>(CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" ELSE l.quantity END) THEN RAISE EXCEPTION 'Registro supera cantidad pendiente de la línea'; END IF;
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
CREATE TRIGGER "ProductionRecord_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionRecord" FOR EACH ROW EXECUTE FUNCTION public.proteger_produccion();
CREATE TRIGGER "ProductionConsumption_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionConsumption" FOR EACH ROW EXECUTE FUNCTION public.proteger_produccion();
CREATE TRIGGER "ProductionOutput_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductionOutput" FOR EACH ROW EXECUTE FUNCTION public.proteger_produccion();

CREATE FUNCTION public.comprobar_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE record_id integer; r public."ProductionRecord"; w public."WorkOrder"; op public."WorkOrderOperation"; consumo_row public."ProductionConsumption"; o public."ProductionOutput"; reservado numeric; consumido numeric;
BEGIN
 IF TG_TABLE_NAME='ProductionRecord' THEN record_id:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderOperation' THEN record_id:=NEW."productionRecordId";
 ELSE record_id:=NEW."productionRecordId"; END IF;
 IF record_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO r FROM public."ProductionRecord" WHERE id=record_id;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=r."workOrderId";
 SELECT * INTO op FROM public."WorkOrderOperation" WHERE "productionRecordId"=r.id;
 IF op."idempotencyKey" IS NULL OR op.type::text<>'REGISTRAR_PRODUCCION' OR op."workOrderId"<>r."workOrderId" OR op.version<>r."planVersion"+1 OR
    (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
    ((op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM ((op."afterSnapshot"->'header')-ARRAY['version','updatedAt']) THEN RAISE EXCEPTION 'Producción exige operación propia sin cambiar plan'; END IF;
 IF r.type::text='FABRICACION_PRODUCTO' THEN
  SELECT * INTO o FROM public."ProductionOutput" WHERE "productionRecordId"=r.id;
  IF o.id IS NULL OR NOT EXISTS(SELECT 1 FROM public."ProductStockMovement" WHERE "productionOutputId"=o.id AND type::text='ENTRADA' AND quantity=o.quantity AND date=r.date) THEN RAISE EXCEPTION 'Fabricación requiere entrada de terminado vinculada'; END IF;
  IF w."salesOrderId" IS NOT NULL AND (SELECT coalesce(sum(a.quantity),0) FROM public."StockReservationAllocation" a WHERE a."productionOutputId"=o.id AND a."operationId"=op."idempotencyKey")<>o.quantity THEN RAISE EXCEPTION 'Resultado comercial exige reserva completa simultánea'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM public."ProductionOutput" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Servicio/a medida no crea resultado ficticio'; END IF;
 END IF;
 IF r.type::text='SERVICIO' AND EXISTS(SELECT 1 FROM public."ProductionConsumption" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Servicio puro no tiene consumos'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r."expectedSnapshot"->'distribution') x WHERE (x->>'quantity')::numeric<>coalesce((SELECT sum(quantity) FROM public."ProductionConsumption" c WHERE c."productionRecordId"=r.id AND c."rawMaterialId"=(x->>'rawMaterialId')::integer AND c."warehouseId"=(x->>'warehouseId')::integer),0)) OR EXISTS(SELECT 1 FROM public."ProductionConsumption" c WHERE c."productionRecordId"=r.id AND c.quantity<>c."expectedQuantity") THEN
  IF coalesce(length(btrim(r."deviationReason")),0)=0 THEN RAISE EXCEPTION 'Diferencias, omisiones, sustituciones o cambios de bodega requieren motivo'; END IF;
 END IF;
 FOR consumo_row IN SELECT * FROM public."ProductionConsumption" WHERE "productionRecordId"=r.id LOOP
  IF NOT EXISTS(SELECT 1 FROM public."StockMovement" WHERE "productionConsumptionId"=consumo_row.id AND type::text='SALIDA' AND quantity=-consumo_row.quantity AND ((date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date=r.date) THEN RAISE EXCEPTION 'Consumo exige salida física vinculada y misma fecha'; END IF;
  IF (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=consumo_row."rawMaterialId" AND "warehouseId"=consumo_row."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM public."StockMovement" WHERE "rawMaterialId"=consumo_row."rawMaterialId" AND "warehouseId"=consumo_row."warehouseId") THEN RAISE EXCEPTION 'Consumo requiere saldo y Kardex atómicos'; END IF;
  SELECT coalesce(sum(e.quantity),0) INTO consumido FROM public."StockReservationEvent" e WHERE e."productionConsumptionId"=consumo_row.id;
  SELECT coalesce(sum(public.reserva_activa_asignacion(a.id)+coalesce((SELECT sum(e.quantity) FROM public."StockReservationEvent" e WHERE e."allocationId"=a.id AND e."operationId"=op."idempotencyKey"),0)),0) INTO reservado FROM public."StockReservationAllocation" a WHERE a."workOrderLineId"=consumo_row."workOrderLineId" AND a."rawMaterialId"=consumo_row."rawMaterialId" AND a."warehouseId"=consumo_row."warehouseId" AND a.purpose::text='CONSUMO_PRODUCCION';
  IF consumido<>least(consumo_row.quantity,reservado) THEN RAISE EXCEPTION 'Consumir primero reserva propia elegible, sin sustituirla por liberación'; END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductionRecord_complete" AFTER INSERT ON "ProductionRecord" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_produccion();
CREATE CONSTRAINT TRIGGER "ProductionConsumption_complete" AFTER INSERT ON "ProductionConsumption" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_produccion();
CREATE CONSTRAINT TRIGGER "ProductionOutput_complete" AFTER INSERT ON "ProductionOutput" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_produccion();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_production_complete" AFTER INSERT ON "WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_produccion();

CREATE FUNCTION public.proteger_movimiento_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE registro integer; op text; r public."ProductionRecord";
BEGIN
 IF TG_OP<>'INSERT' AND ((TG_TABLE_NAME='StockMovement' AND to_jsonb(OLD)->>'productionConsumptionId' IS NOT NULL) OR (TG_TABLE_NAME='ProductStockMovement' AND to_jsonb(OLD)->>'productionOutputId' IS NOT NULL)) THEN RAISE EXCEPTION 'Movimiento productivo inmutable'; END IF;
 IF TG_TABLE_NAME='StockMovement' AND to_jsonb(NEW)->>'productionConsumptionId' IS NOT NULL THEN SELECT "productionRecordId" INTO registro FROM public."ProductionConsumption" WHERE id=NEW."productionConsumptionId";
 ELSIF TG_TABLE_NAME='ProductStockMovement' AND to_jsonb(NEW)->>'productionOutputId' IS NOT NULL THEN SELECT "productionRecordId" INTO registro FROM public."ProductionOutput" WHERE id=NEW."productionOutputId"; END IF;
 IF registro IS NOT NULL THEN
  SELECT * INTO r FROM public."ProductionRecord" WHERE id=registro;
  IF TG_OP<>'INSERT' OR NOT EXISTS(SELECT 1 FROM public."ProductionRecord" pr WHERE pr.id=r.id AND pr.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) THEN RAISE EXCEPTION 'Movimiento sólo al confirmar su registro productivo'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER "StockMovement_production_protect" BEFORE INSERT OR UPDATE OR DELETE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION public.proteger_movimiento_produccion();
CREATE TRIGGER "ProductStockMovement_production_protect" BEFORE INSERT ON "ProductStockMovement" FOR EACH ROW EXECUTE FUNCTION public.proteger_movimiento_produccion();

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
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='EN_PROCESO' AND op.type::text NOT IN ('INICIAR','RESERVAR_STOCK','LIBERAR_RESERVA','REGISTRAR_PRODUCCION')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
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
  SELECT * INTO o FROM public."ProductionOutput" WHERE id=NEW."productionOutputId";
  IF w."salesOrderId" IS NULL OR o.id IS NULL OR (NEW."workOrderId",NEW."workOrderLineId",NEW."productId",NEW."warehouseId",NEW."unitMeasureId",NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (o."workOrderId",o."workOrderLineId",o."productId",o."warehouseId",o."unitMeasureId",o."productCode"::text,o."productName",o."unitName",o."unitAbbreviation") THEN RAISE EXCEPTION 'Reserva del resultado exige línea comercial y copias del resultado fabricado'; END IF;
 END IF;
 activa:=public.reserva_activa_recurso(NEW."rawMaterialId",NEW."productId",NEW."warehouseId");
 IF activa+NEW.quantity>coalesce(fisico,0) THEN RAISE EXCEPTION 'Stock libre insuficiente para reserva; otras reservas se conservan'; END IF;
 RETURN NEW;
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
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK','REGISTRAR_PRODUCCION') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  IF origen.type::text='REGISTRAR_PRODUCCION' AND a."productionOutputId" IS NULL THEN RAISE EXCEPTION 'Producción sólo crea reservas del resultado fabricado'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR','REGISTRAR_PRODUCCION'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
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
    SELECT quantity INTO demanda FROM public."ProductionOutput" WHERE id=a."productionOutputId" AND "workOrderId"=work_id AND "workOrderLineId"=a."workOrderLineId" AND "productId"=a."productId" AND "warehouseId"=a."warehouseId";
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
CREATE INDEX "ProductionOutput_workOrderId_id_idx" ON "ProductionOutput"("workOrderId","id");
COMMIT;
