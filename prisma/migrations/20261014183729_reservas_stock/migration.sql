BEGIN;
LOCK TABLE public."WarehouseStock", public."ProductWarehouseStock", public."WorkOrder" IN ACCESS EXCLUSIVE MODE;
-- CreateEnum
CREATE TYPE "StockReservationPurpose" AS ENUM ('CONSUMO_PRODUCCION', 'ENTREGA_DIRECTA_MP', 'ENTREGA_PRODUCTO');

-- CreateEnum
CREATE TYPE "StockReservationEventType" AS ENUM ('LIBERAR', 'CONSUMIR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderOperationType" ADD VALUE 'RESERVAR_STOCK';
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'LIBERAR_RESERVA';

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "reservationSnapshot" JSONB;

-- CreateTable
CREATE TABLE "StockReservationAllocation" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "purpose" "StockReservationPurpose" NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER,
    "productId" INTEGER,
    "unitMeasureId" INTEGER NOT NULL,
    "resourceCode" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "plannedDetailId" INTEGER,
    "supplyPlanId" INTEGER,
    "operationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservationEvent" (
    "id" SERIAL NOT NULL,
    "allocationId" INTEGER NOT NULL,
    "type" "StockReservationEventType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "operationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockReservationAllocation_workOrderId_workOrderLineId_purp_idx" ON "StockReservationAllocation"("workOrderId", "workOrderLineId", "purpose");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_workOrderLineId_idx" ON "StockReservationAllocation"("workOrderLineId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_rawMaterialId_warehouseId_idx" ON "StockReservationAllocation"("rawMaterialId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_productId_warehouseId_idx" ON "StockReservationAllocation"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_warehouseId_idx" ON "StockReservationAllocation"("warehouseId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_unitMeasureId_idx" ON "StockReservationAllocation"("unitMeasureId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_plannedDetailId_idx" ON "StockReservationAllocation"("plannedDetailId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_supplyPlanId_idx" ON "StockReservationAllocation"("supplyPlanId");

-- CreateIndex
CREATE INDEX "StockReservationAllocation_operationId_idx" ON "StockReservationAllocation"("operationId");

-- CreateIndex
CREATE INDEX "StockReservationEvent_allocationId_idx" ON "StockReservationEvent"("allocationId");

-- CreateIndex
CREATE INDEX "StockReservationEvent_operationId_idx" ON "StockReservationEvent"("operationId");

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_workOrderLineId_fkey" FOREIGN KEY ("workOrderLineId") REFERENCES "WorkOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_plannedDetailId_fkey" FOREIGN KEY ("plannedDetailId") REFERENCES "WorkOrderDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_supplyPlanId_fkey" FOREIGN KEY ("supplyPlanId") REFERENCES "WorkOrderSupplyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "StockReservationAllocation_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "WorkOrderOperation"("idempotencyKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "StockReservationEvent_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "StockReservationAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "StockReservationEvent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "WorkOrderOperation"("idempotencyKey") ON DELETE RESTRICT ON UPDATE CASCADE;
-- FK diferida: reservar y capturar el resultado antes de insertar la operación inmutable.
ALTER TABLE public."StockReservationAllocation" ALTER CONSTRAINT "StockReservationAllocation_operationId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public."StockReservationEvent" ALTER CONSTRAINT "StockReservationEvent_operationId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public."StockReservationAllocation" ADD CONSTRAINT "Reservation_quantity_check" CHECK (quantity > 0 AND quantity <> 'NaN'::numeric),
 ADD CONSTRAINT "Reservation_origin_check" CHECK (
 (purpose::text='CONSUMO_PRODUCCION' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND "plannedDetailId" IS NOT NULL AND "supplyPlanId" IS NULL) OR
 (purpose::text='ENTREGA_DIRECTA_MP' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND "supplyPlanId" IS NOT NULL AND "plannedDetailId" IS NULL) OR
 (purpose::text='ENTREGA_PRODUCTO' AND "productId" IS NOT NULL AND "rawMaterialId" IS NULL AND "supplyPlanId" IS NOT NULL AND "plannedDetailId" IS NULL));
ALTER TABLE public."StockReservationEvent" ADD CONSTRAINT "ReservationEvent_quantity_check" CHECK (quantity > 0 AND quantity <> 'NaN'::numeric),
 ADD CONSTRAINT "ReservationEvent_reason_check" CHECK (length(btrim(reason))>0);

CREATE FUNCTION public.reserva_activa_asignacion(p_id integer) RETURNS numeric LANGUAGE sql VOLATILE AS $$
 SELECT a.quantity-coalesce((SELECT sum(e.quantity) FROM public."StockReservationEvent" e WHERE e."allocationId"=a.id),0)
 FROM public."StockReservationAllocation" a WHERE a.id=p_id
$$;
CREATE FUNCTION public.reserva_activa_recurso(p_raw integer,p_product integer,p_warehouse integer) RETURNS numeric LANGUAGE sql VOLATILE AS $$
 SELECT coalesce(sum(public.reserva_activa_asignacion(a.id)),0) FROM public."StockReservationAllocation" a
 WHERE a."warehouseId"=p_warehouse AND a."rawMaterialId" IS NOT DISTINCT FROM p_raw AND a."productId" IS NOT DISTINCT FROM p_product
$$;
CREATE FUNCTION public.snapshot_reservas_trabajo(p_work integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('schemaVersion',1,
 'allocations',coalesce((SELECT jsonb_agg(to_jsonb(a)||jsonb_build_object('quantity',a.quantity::text) ORDER BY a.id)
  FROM public."StockReservationAllocation" a WHERE a."workOrderId"=p_work),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(to_jsonb(e)||jsonb_build_object('quantity',e.quantity::text) ORDER BY e.id)
  FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" a ON a.id=e."allocationId" WHERE a."workOrderId"=p_work),'[]'::jsonb))
$$;

CREATE FUNCTION public.proteger_reserva_stock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; a public."StockReservationAllocation"; d public."WorkOrderDetail"; s public."WorkOrderSupplyPlan"; fisico numeric; activa numeric; clasificacion text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reservas y eventos inmutables; registrar liberación con motivo'; END IF;
 IF TG_TABLE_NAME='StockReservationEvent' THEN
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
  SELECT * INTO w FROM public."WorkOrder" WHERE id=a."workOrderId" FOR UPDATE;
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId" FOR UPDATE;
  IF w.id IS NULL OR w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('PENDIENTE','ANULADO') THEN RAISE EXCEPTION 'Liberación requiere trabajo pendiente o anulación propia coordinada'; END IF;
  IF NEW.type::text<>'LIBERAR' THEN RAISE EXCEPTION 'Consumo de reserva requiere integración con documento físico de Producción/Despacho'; END IF;
  IF a."rawMaterialId" IS NOT NULL THEN PERFORM id FROM public."RawMaterial" WHERE id=a."rawMaterialId" FOR UPDATE;
  ELSE PERFORM id FROM public."Product" WHERE id=a."productId" FOR UPDATE; END IF;
  IF NEW.quantity>public.reserva_activa_asignacion(a.id) THEN RAISE EXCEPTION 'Liberación excede remanente de reserva'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text<>'PENDIENTE' OR l."workOrderId" IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'Reserva requiere línea del trabajo nuevo pendiente'; END IF;
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
 ELSE
  SELECT * INTO s FROM public."WorkOrderSupplyPlan" WHERE id=NEW."supplyPlanId";
  IF w."salesOrderId" IS NULL OR (s."workOrderId",s."workOrderLineId",s."rawMaterialId",s."productId",s."warehouseId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."productId",NEW."warehouseId") OR
     (NEW."unitMeasureId",NEW."unitName",NEW."unitAbbreviation",NEW."resourceCode",NEW."resourceName") IS DISTINCT FROM
     (l."unitMeasureId",l."unitName",l."unitAbbreviation",l.code,l.description) THEN RAISE EXCEPTION 'Reserva comercial no corresponde a abastecimiento histórico'; END IF;
 END IF;
 activa:=public.reserva_activa_recurso(NEW."rawMaterialId",NEW."productId",NEW."warehouseId");
 IF activa+NEW.quantity>coalesce(fisico,0) THEN RAISE EXCEPTION 'Stock libre insuficiente para reserva; otras reservas se conservan'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Reservation_immutable" BEFORE INSERT OR UPDATE OR DELETE ON public."StockReservationAllocation" FOR EACH ROW EXECUTE FUNCTION public.proteger_reserva_stock();
CREATE TRIGGER "ReservationEvent_immutable" BEFORE INSERT OR UPDATE OR DELETE ON public."StockReservationEvent" FOR EACH ROW EXECUTE FUNCTION public.proteger_reserva_stock();

-- Todos los escritores (incluido SQL directo) conservan la cobertura física.
CREATE FUNCTION public.proteger_stock_reservado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE raw_id integer; product_id integer; wh integer; activa numeric; fisico numeric;
BEGIN
 IF TG_TABLE_NAME='WarehouseStock' THEN
  raw_id:=CASE WHEN TG_OP='DELETE' THEN OLD."rawMaterialId" ELSE NEW."rawMaterialId" END;
  PERFORM id FROM public."RawMaterial" WHERE id=raw_id FOR UPDATE;
 ELSE
  product_id:=CASE WHEN TG_OP='DELETE' THEN OLD."productId" ELSE NEW."productId" END;
  PERFORM id FROM public."Product" WHERE id=product_id FOR UPDATE;
 END IF;
 wh:=CASE WHEN TG_OP='DELETE' THEN OLD."warehouseId" ELSE NEW."warehouseId" END;
 -- INSERT de UPSERT se ejecuta antes de resolver conflicto: validar el saldo real
 -- en el posterior UPDATE, no el valor candidato que nunca ingresará a stock.
 IF TG_OP='INSERT' THEN
  IF raw_id IS NOT NULL THEN
   PERFORM id FROM public."WarehouseStock" WHERE "rawMaterialId"=raw_id AND "warehouseId"=wh;
  ELSE
   PERFORM id FROM public."ProductWarehouseStock" WHERE "productId"=product_id AND "warehouseId"=wh;
  END IF;
  IF FOUND THEN RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)->'warehouseId' IS DISTINCT FROM to_jsonb(OLD)->'warehouseId' OR
    to_jsonb(NEW)->'rawMaterialId' IS DISTINCT FROM to_jsonb(OLD)->'rawMaterialId' OR to_jsonb(NEW)->'productId' IS DISTINCT FROM to_jsonb(OLD)->'productId') THEN
   RAISE EXCEPTION 'No cambiar identidad de una fila de existencias'; END IF;
 activa:=public.reserva_activa_recurso(raw_id,product_id,wh);
 fisico:=CASE WHEN TG_OP='DELETE' THEN 0 ELSE NEW.quantity END;
 IF activa>0 AND (fisico='NaN'::numeric OR fisico<activa) THEN RAISE EXCEPTION 'Existencias comprometidas: liberar o replanificar reservas con motivo antes de retirar stock'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WarehouseStock_reservation_cover" BEFORE INSERT OR UPDATE OR DELETE ON public."WarehouseStock" FOR EACH ROW EXECUTE FUNCTION public.proteger_stock_reservado();
CREATE TRIGGER "ProductWarehouseStock_reservation_cover" BEFORE INSERT OR UPDATE OR DELETE ON public."ProductWarehouseStock" FOR EACH ROW EXECUTE FUNCTION public.proteger_stock_reservado();

CREATE FUNCTION public.comprobar_reservas_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
  IF active>0 THEN
   IF w.status::text='ANULADO' THEN RAISE EXCEPTION 'Anulación debe liberar todas sus reservas'; END IF;
   IF a."plannedDetailId" IS NOT NULL THEN
    SELECT d."quantityNeeded" INTO demanda FROM public."WorkOrderDetail" d WHERE d.id=a."plannedDetailId" AND
      (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId")=(a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."plannedDetailId"=a."plannedDetailId")>demanda THEN RAISE EXCEPTION 'Reservas superan requerimiento vigente o recurso fue sustituido'; END IF;
   ELSE
    SELECT s.quantity INTO demanda FROM public."WorkOrderSupplyPlan" s WHERE s.id=a."supplyPlanId" AND
      (s."workOrderId",s."workOrderLineId",s."warehouseId")=(a."workOrderId",a."workOrderLineId",a."warehouseId") AND s."rawMaterialId" IS NOT DISTINCT FROM a."rawMaterialId" AND s."productId" IS NOT DISTINCT FROM a."productId";
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."supplyPlanId"=a."supplyPlanId")>demanda THEN RAISE EXCEPTION 'Reservas superan abastecimiento vigente o recurso fue sustituido'; END IF;
   END IF;
   IF public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")>coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN
       (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE
       (SELECT quantity FROM public."ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0) THEN RAISE EXCEPTION 'Reservas exceden físico'; END IF;
  END IF;
 END LOOP;
 IF op.type::text IN ('RESERVAR_STOCK','LIBERAR_RESERVA') AND (
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   ((op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM ((op."afterSnapshot"->'header')-ARRAY['version','updatedAt'])) THEN RAISE EXCEPTION 'Operación de reserva no puede modificar el plan'; END IF;
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
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "workOrderId"=w.id) THEN RAISE EXCEPTION 'Trabajo nuevo requiere líneas'; END IF;
 IF w."salesOrderId" IS NOT NULL AND (SELECT count(*) FROM "WorkOrderLine" WHERE "workOrderId"=w.id)<>(SELECT count(*) FROM "SalesOrderDetail" WHERE "salesOrderId"=w."salesOrderId") THEN RAISE EXCEPTION 'Trabajo debe incluir todas las líneas aceptadas, una vez'; END IF;
 FOR v_linea IN SELECT * FROM "WorkOrderLine" WHERE "workOrderId"=w.id LOOP
  IF v_linea."executionMode"::text='CATALOGO' AND v_linea."quantityToProduce">0 AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id) THEN RAISE EXCEPTION 'Fabricación requiere receta histórica'; END IF;
  recaptura := EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" r WHERE r."workOrderLineId"=v_linea.id AND r.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) OR
   NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderLine",coalesce(op."beforeSnapshot"->'lines','[]'::jsonb)) p WHERE p.id=v_linea.id AND
    p."productVersion" IS NOT DISTINCT FROM v_linea."productVersion" AND p."recipeCapturedAt" IS NOT DISTINCT FROM v_linea."recipeCapturedAt" AND p."recipeFingerprint" IS NOT DISTINCT FROM v_linea."recipeFingerprint");
  IF recaptura AND EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id) AND (
   NOT EXISTS(SELECT 1 FROM "Product" WHERE id=v_linea."productId" AND version=v_linea."productVersion" AND "deletedAt" IS NULL) OR
   (SELECT count(*) FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id)<>(SELECT count(*) FROM "ProductRecipe" WHERE "productId"=v_linea."productId") OR
   EXISTS(SELECT 1 FROM "ProductRecipe" r JOIN "RawMaterial" m ON m.id=r."rawMaterialId" JOIN "UnitMeasure" u ON u.id=m."unitMeasureId"
    WHERE r."productId"=v_linea."productId" AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" p WHERE p."workOrderLineId"=v_linea.id AND
     p."rawMaterialId"=r."rawMaterialId" AND p."quantityPerUnit"=r.quantity AND p."unitMeasureId"=m."unitMeasureId" AND
     p."materialCode"=m.code AND p."materialName"=m.name AND p."unitName"=u.name AND p."unitAbbreviation"=u.abbreviation))) THEN RAISE EXCEPTION 'Captura de receta debe ser completa y corresponder a revisión actual'; END IF;
  IF v_linea."executionMode"::text='CATALOGO' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id)>v_linea."quantityFromStock" THEN RAISE EXCEPTION 'Abastecimiento supera cantidad desde stock'; END IF;
  IF v_linea."executionMode"::text='VENTA_DIRECTA_MP' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id)>v_linea.quantity THEN RAISE EXCEPTION 'Abastecimiento directo supera cantidad contratada'; END IF;
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
CREATE CONSTRAINT TRIGGER "WorkOrder_reservations_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderLine_reservations_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderLine" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderDetail_reservations_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderDetail" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderSupplyPlan_reservations_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderSupplyPlan" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderRecipeMaterial_reservations_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderRecipeMaterial" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_reservations_complete" AFTER INSERT ON public."WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "StockReservationAllocation_reservations_complete" AFTER INSERT ON public."StockReservationAllocation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
CREATE CONSTRAINT TRIGGER "StockReservationEvent_reservations_complete" AFTER INSERT ON public."StockReservationEvent" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_reservas_trabajo();
COMMIT;
