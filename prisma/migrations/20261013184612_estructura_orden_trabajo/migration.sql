BEGIN;
LOCK TABLE "WorkOrder", "WorkOrderDetail" IN SHARE ROW EXCLUSIVE MODE;
/*
  Warnings:

  - A unique constraint covering the columns `[id,salesOrderId]` on the table `SalesOrderDetail` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[folioId]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creationKey]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workOrderLineId,rawMaterialId,warehouseId]` on the table `WorkOrderDetail` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WorkOrderExecutionMode" AS ENUM ('CATALOGO', 'VENTA_DIRECTA_MP', 'SERVICIO', 'A_MEDIDA');

-- CreateEnum
CREATE TYPE "WorkOrderOperationType" AS ENUM ('CREAR', 'EDITAR_PLAN', 'INICIAR', 'ANULAR');

-- AlterEnum
ALTER TYPE "WorkOrderStatus" ADD VALUE 'ANULADO';

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_salesOrderId_fkey";

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "creationKey" UUID,
ADD COLUMN     "date" DATE,
ADD COLUMN     "folioId" INTEGER,
ADD COLUMN     "internalInstructions" VARCHAR(5000),
ADD COLUMN     "ownPurpose" VARCHAR(1000),
ADD COLUMN     "salesOrderVersion" INTEGER,
ADD COLUMN     "schemaVersion" INTEGER,
ADD COLUMN     "sourceSnapshot" JSONB,
ADD COLUMN     "startedDate" DATE,
ADD COLUMN     "targetDate" DATE,
ADD COLUMN     "technicalDescription" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkOrderDetail" ADD COLUMN     "materialCode" TEXT,
ADD COLUMN     "materialName" TEXT,
ADD COLUMN     "recipeMaterialId" INTEGER,
ADD COLUMN     "unitAbbreviation" TEXT,
ADD COLUMN     "unitMeasureId" INTEGER,
ADD COLUMN     "unitName" TEXT,
ADD COLUMN     "workOrderLineId" INTEGER;

-- CreateTable
CREATE TABLE "WorkOrderLine" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "salesOrderId" INTEGER,
    "salesOrderDetailId" INTEGER,
    "position" INTEGER NOT NULL,
    "kind" "QuoteLineType" NOT NULL,
    "executionMode" "WorkOrderExecutionMode" NOT NULL,
    "description" TEXT NOT NULL,
    "code" TEXT,
    "unitMeasureId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "productId" INTEGER,
    "rawMaterialId" INTEGER,
    "quantity" DECIMAL(14,3) NOT NULL,
    "quantityToProduce" DECIMAL(14,3),
    "quantityFromStock" DECIMAL(14,3),
    "productVersion" INTEGER,
    "recipeCapturedAt" TIMESTAMP(3),
    "recipeFingerprint" VARCHAR(64),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderRecipeMaterial" (
    "id" SERIAL NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "quantityPerUnit" DECIMAL(14,3) NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderRecipeMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderSupplyPlan" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderLineId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "productId" INTEGER,
    "rawMaterialId" INTEGER,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderSupplyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderOperation" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "type" "WorkOrderOperationType" NOT NULL,
    "version" INTEGER NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLine_salesOrderDetailId_key" ON "WorkOrderLine"("salesOrderDetailId");

-- CreateIndex
CREATE INDEX "WorkOrderLine_productId_idx" ON "WorkOrderLine"("productId");

-- CreateIndex
CREATE INDEX "WorkOrderLine_rawMaterialId_idx" ON "WorkOrderLine"("rawMaterialId");

-- CreateIndex
CREATE INDEX "WorkOrderLine_unitMeasureId_idx" ON "WorkOrderLine"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLine_id_workOrderId_key" ON "WorkOrderLine"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLine_workOrderId_position_key" ON "WorkOrderLine"("workOrderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLine_salesOrderDetailId_salesOrderId_key" ON "WorkOrderLine"("salesOrderDetailId", "salesOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderRecipeMaterial_rawMaterialId_idx" ON "WorkOrderRecipeMaterial"("rawMaterialId");

-- CreateIndex
CREATE INDEX "WorkOrderRecipeMaterial_unitMeasureId_idx" ON "WorkOrderRecipeMaterial"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderRecipeMaterial_id_workOrderLineId_rawMaterialId_key" ON "WorkOrderRecipeMaterial"("id", "workOrderLineId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderRecipeMaterial_workOrderLineId_rawMaterialId_key" ON "WorkOrderRecipeMaterial"("workOrderLineId", "rawMaterialId");

-- CreateIndex
CREATE INDEX "WorkOrderSupplyPlan_workOrderLineId_workOrderId_idx" ON "WorkOrderSupplyPlan"("workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderSupplyPlan_warehouseId_idx" ON "WorkOrderSupplyPlan"("warehouseId");

-- CreateIndex
CREATE INDEX "WorkOrderSupplyPlan_productId_idx" ON "WorkOrderSupplyPlan"("productId");

-- CreateIndex
CREATE INDEX "WorkOrderSupplyPlan_rawMaterialId_idx" ON "WorkOrderSupplyPlan"("rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderSupplyPlan_workOrderLineId_warehouseId_key" ON "WorkOrderSupplyPlan"("workOrderLineId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_workOrderId_version_key" ON "WorkOrderOperation"("workOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderDetail_id_salesOrderId_key" ON "SalesOrderDetail"("id", "salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_folioId_key" ON "WorkOrder"("folioId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_creationKey_key" ON "WorkOrder"("creationKey");

-- CreateIndex
CREATE INDEX "WorkOrder_status_date_id_idx" ON "WorkOrder"("status", "date", "id");

-- CreateIndex
CREATE INDEX "WorkOrder_targetDate_id_idx" ON "WorkOrder"("targetDate", "id");

-- CreateIndex
CREATE INDEX "WorkOrderDetail_workOrderLineId_workOrderId_idx" ON "WorkOrderDetail"("workOrderLineId", "workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderDetail_recipeMaterialId_workOrderLineId_rawMateria_idx" ON "WorkOrderDetail"("recipeMaterialId", "workOrderLineId", "rawMaterialId");

-- CreateIndex
CREATE INDEX "WorkOrderDetail_unitMeasureId_idx" ON "WorkOrderDetail"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderDetail_workOrderLineId_rawMaterialId_warehouseId_key" ON "WorkOrderDetail"("workOrderLineId", "rawMaterialId", "warehouseId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "DocumentFolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_salesOrderDetailId_salesOrderId_fkey" FOREIGN KEY ("salesOrderDetailId", "salesOrderId") REFERENCES "SalesOrderDetail"("id", "salesOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRecipeMaterial" ADD CONSTRAINT "WorkOrderRecipeMaterial_workOrderLineId_fkey" FOREIGN KEY ("workOrderLineId") REFERENCES "WorkOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRecipeMaterial" ADD CONSTRAINT "WorkOrderRecipeMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderRecipeMaterial" ADD CONSTRAINT "WorkOrderRecipeMaterial_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSupplyPlan" ADD CONSTRAINT "WorkOrderSupplyPlan_workOrderLineId_workOrderId_fkey" FOREIGN KEY ("workOrderLineId", "workOrderId") REFERENCES "WorkOrderLine"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSupplyPlan" ADD CONSTRAINT "WorkOrderSupplyPlan_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSupplyPlan" ADD CONSTRAINT "WorkOrderSupplyPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSupplyPlan" ADD CONSTRAINT "WorkOrderSupplyPlan_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDetail" ADD CONSTRAINT "WorkOrderDetail_workOrderLineId_workOrderId_fkey" FOREIGN KEY ("workOrderLineId", "workOrderId") REFERENCES "WorkOrderLine"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDetail" ADD CONSTRAINT "WorkOrderDetail_recipeMaterialId_workOrderLineId_rawMateri_fkey" FOREIGN KEY ("recipeMaterialId", "workOrderLineId", "rawMaterialId") REFERENCES "WorkOrderRecipeMaterial"("id", "workOrderLineId", "rawMaterialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDetail" ADD CONSTRAINT "WorkOrderDetail_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La restauración de dump usa search_path vacío: la llamada debe ser explícita.
CREATE OR REPLACE FUNCTION public.normalizar_referencia_orden_cliente(text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT public.referencia_orden_cliente_espacios($1)
$$;

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_document_check" CHECK (("schemaVersion" IS NULL OR (
 "schemaVersion" = 1 AND "folioId" IS NOT NULL AND "creationKey" IS NOT NULL AND "date" IS NOT NULL AND version > 0 AND
 btrim("productName") <> '' AND length("productName") <= 150 AND
 (("salesOrderId" IS NULL AND "salesOrderVersion" IS NULL AND "sourceSnapshot" IS NULL AND coalesce(btrim("ownPurpose"),'') <> '') OR
  ("salesOrderId" IS NOT NULL AND "salesOrderVersion" > 0 AND "sourceSnapshot" IS NOT NULL AND "ownPurpose" IS NULL)) AND
 ((status::text = 'ANULADO' AND "voidedAt" IS NOT NULL AND coalesce(btrim("voidReason"),'') <> '') OR
  (status::text <> 'ANULADO' AND "voidedAt" IS NULL AND "voidReason" IS NULL))
 )) IS TRUE);
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_values" CHECK ((
 position >= 0 AND version > 0 AND quantity > 0 AND quantity <> 'NaN'::numeric AND
 btrim(description) <> '' AND btrim("unitName") <> '' AND btrim("unitAbbreviation") <> '' AND
 (("salesOrderId" IS NULL AND "salesOrderDetailId" IS NULL) OR ("salesOrderId" IS NOT NULL AND "salesOrderDetailId" IS NOT NULL)) AND
 ((kind = 'PRODUCTO' AND "executionMode" = 'CATALOGO' AND "productId" IS NOT NULL AND "rawMaterialId" IS NULL AND
   "quantityToProduce" >= 0 AND "quantityFromStock" >= 0 AND "quantityToProduce" <> 'NaN'::numeric AND "quantityFromStock" <> 'NaN'::numeric AND
   "quantityToProduce" + "quantityFromStock" = quantity AND
   ("quantityToProduce" = 0 OR ("productVersion" > 0 AND "recipeCapturedAt" IS NOT NULL AND "recipeFingerprint" ~ '^[0-9a-f]{64}$'))) OR
  (kind = 'MATERIA_PRIMA' AND "executionMode" = 'VENTA_DIRECTA_MP' AND "rawMaterialId" IS NOT NULL AND "productId" IS NULL AND
   "quantityToProduce" IS NULL AND "quantityFromStock" IS NULL AND "productVersion" IS NULL AND "recipeCapturedAt" IS NULL AND "recipeFingerprint" IS NULL) OR
  (kind = 'SERVICIO' AND "executionMode" IN ('SERVICIO','A_MEDIDA') AND "productId" IS NULL AND "rawMaterialId" IS NULL AND
   "quantityToProduce" IS NULL AND "quantityFromStock" IS NULL AND "productVersion" IS NULL AND "recipeCapturedAt" IS NULL AND "recipeFingerprint" IS NULL))
 ) IS TRUE);
ALTER TABLE "WorkOrderRecipeMaterial" ADD CONSTRAINT "WorkOrderRecipeMaterial_values" CHECK (
 "quantityPerUnit" > 0 AND "quantityPerUnit" <> 'NaN'::numeric AND btrim("materialCode") <> '' AND
 btrim("materialName") <> '' AND btrim("unitName") <> '' AND btrim("unitAbbreviation") <> ''
);
ALTER TABLE "WorkOrderSupplyPlan" ADD CONSTRAINT "WorkOrderSupplyPlan_values" CHECK (
 quantity > 0 AND quantity <> 'NaN'::numeric AND num_nonnulls("productId","rawMaterialId") = 1
);
ALTER TABLE "WorkOrderDetail" ADD CONSTRAINT "WorkOrderDetail_new_plan_values" CHECK (("workOrderLineId" IS NULL OR (
 "unitMeasureId" IS NOT NULL AND "quantityNeeded" > 0 AND "quantityNeeded" <> 'NaN'::numeric AND
 coalesce(btrim("materialCode"),'') <> '' AND coalesce(btrim("materialName"),'') <> '' AND
 coalesce(btrim("unitName"),'') <> '' AND coalesce(btrim("unitAbbreviation"),'') <> ''
 )) IS TRUE);
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_values" CHECK (
 version > 0 AND fingerprint ~ '^[0-9a-f]{64}$' AND jsonb_typeof("afterSnapshot") = 'object'
);

CREATE FUNCTION proteger_cabecera_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o record; f record; copia record; q integer;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar trabajo, folio y vínculo histórico'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF OLD."schemaVersion" IS NULL THEN RAISE EXCEPTION 'Trabajo legado requiere conciliación manual'; END IF;
  IF (to_jsonb(NEW) - ARRAY['productName','description','internalInstructions','ownPurpose','targetDate','status','voidedAt','voidReason','version','updatedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['productName','description','internalInstructions','ownPurpose','targetDate','status','voidedAt','voidReason','version','updatedAt']) THEN
   RAISE EXCEPTION 'Identidad, origen, alcance y fecha de trabajo inmutables'; END IF;
  IF OLD.status::text <> 'PENDIENTE' OR NEW.version <> OLD.version + 1 OR NEW.status::text NOT IN ('PENDIENTE','ANULADO') THEN
   RAISE EXCEPTION 'Sólo editar plan pendiente o anular obra propia; inicio se habilita con Reservas'; END IF;
  IF NEW.status::text = 'ANULADO' AND (NEW."salesOrderId" IS NOT NULL OR OLD."startedDate" IS NOT NULL OR EXISTS(
    SELECT 1 FROM "WorkOrderDetail" d JOIN "StockMovement" m ON m."workOrderDetailId"=d.id WHERE d."workOrderId"=OLD.id)) THEN
   RAISE EXCEPTION 'Sólo obra propia sin ejecución puede anularse'; END IF;
  RETURN NEW;
 END IF;
 IF NEW."schemaVersion" IS DISTINCT FROM 1 OR NEW.version <> 1 OR NEW.status::text <> 'PENDIENTE' OR NEW."startedDate" IS NOT NULL THEN
  RAISE EXCEPTION 'Trabajo nuevo requiere contrato completo y estado pendiente'; END IF;
 IF NEW."date" > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Fecha de trabajo no puede ser futura'; END IF;
 SELECT n.type,df."idempotencyKey" INTO f FROM "DocumentFolio" df JOIN "DocumentNumbering" n ON n.id=df."numberingId" WHERE df.id=NEW."folioId";
 IF f.type IS DISTINCT FROM 'ORDEN_TRABAJO' OR f."idempotencyKey" IS DISTINCT FROM NEW."creationKey" THEN RAISE EXCEPTION 'Folio o UUID incorrectos para trabajo'; END IF;
 IF NEW."salesOrderId" IS NOT NULL THEN
  SELECT "quoteId" INTO q FROM "SalesOrder" WHERE id=NEW."salesOrderId";
  PERFORM id FROM "Quote" WHERE id=q FOR UPDATE;
  SELECT * INTO o FROM "SalesOrder" WHERE id=NEW."salesOrderId" FOR UPDATE;
  IF o."folioId" IS NULL OR o.status::text IS DISTINCT FROM 'CONFIRMADA' OR NEW."salesOrderVersion" IS DISTINCT FROM o.version OR NEW."date" < o."acceptanceDate" THEN
   RAISE EXCEPTION 'Trabajo requiere orden confirmada, revisión actual y fecha compatible'; END IF;
  IF NEW."technicalDescription" IS DISTINCT FROM o."technicalDescription" OR (NEW."sourceSnapshot"->>'schemaVersion') IS DISTINCT FROM '1' OR
     jsonb_typeof(NEW."sourceSnapshot"->'order') IS DISTINCT FROM 'object' OR jsonb_typeof(NEW."sourceSnapshot"->'details') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Alcance y copia comercial de trabajo inválidos'; END IF;
  SELECT * INTO copia FROM jsonb_populate_record(NULL::"SalesOrder",NEW."sourceSnapshot"->'order');
  IF to_jsonb(copia) IS DISTINCT FROM to_jsonb(o) OR
     jsonb_array_length(NEW."sourceSnapshot"->'details') <> (SELECT count(*) FROM "SalesOrderDetail" WHERE "salesOrderId"=o.id) OR
     EXISTS(SELECT 1 FROM "SalesOrderDetail" d WHERE d."salesOrderId"=o.id AND NOT EXISTS(
       SELECT 1 FROM jsonb_populate_recordset(NULL::"SalesOrderDetail",NEW."sourceSnapshot"->'details') p WHERE p.id=d.id AND to_jsonb(p)=to_jsonb(d))) THEN
   RAISE EXCEPTION 'Copia de trabajo debe conservar orden y todos sus detalles históricos'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrder_core_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrder" FOR EACH ROW EXECUTE FUNCTION proteger_cabecera_trabajo();

CREATE FUNCTION proteger_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cab record; linea record; origen record; material record; producto record; receta record; tipo "WarehouseClassification"; documento integer; dato jsonb;
BEGIN
 dato := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME IN ('WorkOrderLine','WorkOrderDetail','WorkOrderSupplyPlan') THEN documento := (dato->>'workOrderId')::integer;
 ELSE SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=(dato->>'workOrderLineId')::integer; END IF;
 SELECT * INTO cab FROM "WorkOrder" WHERE id=documento FOR UPDATE;
 IF cab.id IS NULL OR cab."schemaVersion" IS NULL OR cab.status::text <> 'PENDIENTE' THEN RAISE EXCEPTION 'Plan requiere trabajo nuevo pendiente'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR (to_jsonb(NEW)->'workOrderId') IS DISTINCT FROM (to_jsonb(OLD)->'workOrderId') OR
    (to_jsonb(NEW)->'workOrderLineId') IS DISTINCT FROM (to_jsonb(OLD)->'workOrderLineId')) THEN RAISE EXCEPTION 'No reasignar identidad/origen del plan'; END IF;
 IF TG_OP='DELETE' THEN
  IF TG_TABLE_NAME='WorkOrderLine' AND cab."salesOrderId" IS NOT NULL THEN RAISE EXCEPTION 'Conservar línea comercial aceptada'; END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='WorkOrderLine' THEN
  IF NEW."salesOrderId" IS DISTINCT FROM cab."salesOrderId" THEN RAISE EXCEPTION 'Línea ajena al origen del trabajo'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.version<>OLD.version+1 OR (to_jsonb(NEW)-ARRAY['version','updatedAt','quantityToProduce','quantityFromStock','productVersion','recipeCapturedAt','recipeFingerprint','executionMode','quantity']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['version','updatedAt','quantityToProduce','quantityFromStock','productVersion','recipeCapturedAt','recipeFingerprint','executionMode','quantity']) THEN RAISE EXCEPTION 'Origen y copias de línea inmutables; incrementar versión'; END IF;
  ELSIF NEW.version<>1 THEN RAISE EXCEPTION 'Línea nueva inicia con versión uno'; END IF;
  IF cab."salesOrderId" IS NOT NULL THEN
   SELECT * INTO origen FROM "SalesOrderDetail" WHERE id=NEW."salesOrderDetailId" AND "salesOrderId"=cab."salesOrderId";
   IF origen.id IS NULL OR NEW.kind IS DISTINCT FROM origen.kind OR NEW.quantity IS DISTINCT FROM origen.quantity OR
      NEW."rawMaterialId" IS DISTINCT FROM origen."rawMaterialId" OR NEW."productId" IS DISTINCT FROM origen."productId" OR
      NEW."unitMeasureId" IS DISTINCT FROM origen."unitMeasureId" OR NEW.description IS DISTINCT FROM origen.description OR
      NEW.code IS DISTINCT FROM origen.code OR NEW."unitName" IS DISTINCT FROM origen."unitName" OR NEW."unitAbbreviation" IS DISTINCT FROM origen."unitAbbreviation" OR
      NEW.position IS DISTINCT FROM origen.position THEN RAISE EXCEPTION 'Línea debe conservar lo aceptado, sin cambios comerciales'; END IF;
  END IF;
  IF NEW."rawMaterialId" IS NOT NULL THEN
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   IF NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" THEN RAISE EXCEPTION 'Unidad de materia prima diferente'; END IF;
  END IF;
  IF NEW."productId" IS NOT NULL THEN
   SELECT * INTO producto FROM "Product" WHERE id=NEW."productId" AND "deletedAt" IS NULL FOR UPDATE;
   IF producto.id IS NULL OR NEW."unitMeasureId" IS DISTINCT FROM producto."unitMeasureId" THEN RAISE EXCEPTION 'Producto o unidad incompatible'; END IF;
  END IF;
  IF TG_OP='INSERT' AND cab."salesOrderId" IS NULL THEN
   IF NEW."productId" IS NOT NULL THEN
    IF NEW.code IS DISTINCT FROM producto.code::text OR NEW.description IS DISTINCT FROM producto.name THEN RAISE EXCEPTION 'Copia de producto propio diferente'; END IF;
   END IF;
   IF NEW."rawMaterialId" IS NOT NULL THEN
    IF NEW.code IS DISTINCT FROM material.code OR NEW.description IS DISTINCT FROM material.name THEN RAISE EXCEPTION 'Copia de material propio diferente'; END IF;
   END IF;
   IF NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN RAISE EXCEPTION 'Copia de unidad propia diferente'; END IF;
  END IF;
 ELSE
  SELECT * INTO linea FROM "WorkOrderLine" WHERE id=(dato->>'workOrderLineId')::integer AND "workOrderId"=cab.id;
  IF linea.id IS NULL THEN RAISE EXCEPTION 'Detalle debe pertenecer a la misma línea/trabajo'; END IF;
  IF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   SELECT * INTO producto FROM "Product" WHERE id=linea."productId" AND "deletedAt" IS NULL FOR UPDATE;
   SELECT * INTO receta FROM "ProductRecipe" WHERE "productId"=linea."productId" AND "rawMaterialId"=NEW."rawMaterialId";
   IF linea."executionMode"::text <> 'CATALOGO' OR producto.id IS NULL OR linea."productVersion" IS DISTINCT FROM producto.version OR
      receta.id IS NULL OR NEW."quantityPerUnit" IS DISTINCT FROM receta.quantity OR NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" OR
      NEW."materialCode" IS DISTINCT FROM material.code OR NEW."materialName" IS DISTINCT FROM material.name OR
      NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN
    RAISE EXCEPTION 'Capturar receta completa de una revisión vigente con unidades/cantidad históricas'; END IF;
  ELSIF TG_TABLE_NAME='WorkOrderSupplyPlan' THEN
   SELECT classification INTO tipo FROM "Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
   IF linea."executionMode"::text='CATALOGO' THEN
    IF NEW."productId" IS DISTINCT FROM linea."productId" OR NEW."rawMaterialId" IS NOT NULL OR tipo IS NULL OR tipo NOT IN ('PRODUCTO_TERMINADO','MIXTA') THEN RAISE EXCEPTION 'Abastecimiento de terminado incompatible'; END IF;
   ELSIF linea."executionMode"::text='VENTA_DIRECTA_MP' THEN
    IF NEW."rawMaterialId" IS DISTINCT FROM linea."rawMaterialId" OR NEW."productId" IS NOT NULL OR tipo IS NULL OR tipo NOT IN ('MATERIA_PRIMA','MIXTA') THEN RAISE EXCEPTION 'Abastecimiento directo de materia prima incompatible'; END IF;
   ELSE RAISE EXCEPTION 'Servicio o trabajo a medida no abastece stock comercial'; END IF;
  ELSE
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   SELECT classification INTO tipo FROM "Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
   IF linea."executionMode"::text NOT IN ('CATALOGO','A_MEDIDA') OR NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" OR
      tipo IS NULL OR tipo NOT IN ('MATERIA_PRIMA','MIXTA') THEN RAISE EXCEPTION 'Requerimiento o unidad/bodega incompatible'; END IF;
   IF NEW."recipeMaterialId" IS NOT NULL THEN
    SELECT * INTO receta FROM "WorkOrderRecipeMaterial" WHERE id=NEW."recipeMaterialId" AND "workOrderLineId"=linea.id AND "rawMaterialId"=NEW."rawMaterialId";
    IF receta.id IS NULL OR NEW."materialCode" IS DISTINCT FROM receta."materialCode" OR NEW."materialName" IS DISTINCT FROM receta."materialName" OR
      NEW."unitName" IS DISTINCT FROM receta."unitName" OR NEW."unitAbbreviation" IS DISTINCT FROM receta."unitAbbreviation" THEN RAISE EXCEPTION 'Requerimiento ajeno a receta histórica'; END IF;
   ELSIF linea."executionMode"::text='CATALOGO' THEN RAISE EXCEPTION 'Requerimiento de catálogo debe indicar su componente histórico';
   ELSIF NEW."materialCode" IS DISTINCT FROM material.code OR NEW."materialName" IS DISTINCT FROM material.name OR
      NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN RAISE EXCEPTION 'Copia de insumo a medida inválida'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderLine_plan_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderLine" FOR EACH ROW EXECUTE FUNCTION proteger_plan_trabajo();
CREATE TRIGGER "WorkOrderRecipeMaterial_plan_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderRecipeMaterial" FOR EACH ROW EXECUTE FUNCTION proteger_plan_trabajo();
CREATE TRIGGER "WorkOrderSupplyPlan_plan_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderSupplyPlan" FOR EACH ROW EXECUTE FUNCTION proteger_plan_trabajo();
-- Conservar inserciones heredadas de insumos sólo antes de esta migración; nuevas requieren línea.
CREATE TRIGGER "WorkOrderDetail_plan_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderDetail" FOR EACH ROW EXECUTE FUNCTION proteger_plan_trabajo();

CREATE FUNCTION snapshot_plan_trabajo(p_id integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('schemaVersion',1,'header',to_jsonb(w),
 'lines',coalesce((SELECT jsonb_agg(to_jsonb(l)||jsonb_build_object('quantity',l.quantity::text,'quantityToProduce',l."quantityToProduce"::text,'quantityFromStock',l."quantityFromStock"::text) ORDER BY l.position) FROM public."WorkOrderLine" l WHERE l."workOrderId"=w.id),'[]'::jsonb),
 'recipeMaterials',coalesce((SELECT jsonb_agg(to_jsonb(r)||jsonb_build_object('quantityPerUnit',r."quantityPerUnit"::text) ORDER BY r.id) FROM public."WorkOrderRecipeMaterial" r JOIN public."WorkOrderLine" l ON l.id=r."workOrderLineId" WHERE l."workOrderId"=w.id),'[]'::jsonb),
 'materials',coalesce((SELECT jsonb_agg(to_jsonb(d)||jsonb_build_object('quantityNeeded',d."quantityNeeded"::text) ORDER BY d.id) FROM public."WorkOrderDetail" d WHERE d."workOrderId"=w.id),'[]'::jsonb),
 'supplies',coalesce((SELECT jsonb_agg(to_jsonb(s)||jsonb_build_object('quantity',s.quantity::text) ORDER BY s.id) FROM public."WorkOrderSupplyPlan" s WHERE s."workOrderId"=w.id),'[]'::jsonb))
 FROM public."WorkOrder" w WHERE w.id=p_id
$$;

CREATE FUNCTION proteger_operacion_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w record; anterior jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Operación de trabajo inmutable'; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 IF w."schemaVersion" IS NULL OR NEW.version IS DISTINCT FROM w.version THEN RAISE EXCEPTION 'Operación debe corresponder a versión actual de trabajo nuevo'; END IF;
 IF NEW.version=1 THEN
  IF NEW.type::text<>'CREAR' OR NEW."idempotencyKey" IS DISTINCT FROM w."creationKey" OR NEW."beforeSnapshot" IS NOT NULL THEN RAISE EXCEPTION 'Creación debe conservar UUID/origen'; END IF;
 ELSE
  SELECT "afterSnapshot" INTO anterior FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND version=NEW.version-1;
  IF anterior IS NULL OR NEW."beforeSnapshot" IS DISTINCT FROM anterior THEN RAISE EXCEPTION 'Operación requiere copia anterior íntegra'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderOperation_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION proteger_operacion_trabajo();

CREATE FUNCTION comprobar_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento integer; w record; op record; v_linea record; s jsonb; esperado jsonb; recaptura boolean;
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN documento:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderLineId" ELSE NEW."workOrderLineId" END;
 ELSE documento:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=documento;
 IF w.id IS NULL OR w."schemaVersion" IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND version=w.version;
 IF op."idempotencyKey" IS NULL OR (w.version=1 AND op.type::text<>'CREAR') OR
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text<>'EDITAR_PLAN') OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
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
CREATE CONSTRAINT TRIGGER "WorkOrder_complete" AFTER INSERT OR UPDATE ON "WorkOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderLine_complete" AFTER INSERT OR UPDATE OR DELETE ON "WorkOrderLine" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderRecipeMaterial_complete" AFTER INSERT OR UPDATE OR DELETE ON "WorkOrderRecipeMaterial" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderDetail_complete" AFTER INSERT OR UPDATE OR DELETE ON "WorkOrderDetail" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderSupplyPlan_complete" AFTER INSERT OR UPDATE OR DELETE ON "WorkOrderSupplyPlan" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_complete" AFTER INSERT ON "WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_plan_trabajo();

CREATE FUNCTION referencia_historica_plan_trabajo(p_tipo text,p_id integer) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM public."WorkOrderOperation" o CROSS JOIN LATERAL jsonb_array_elements(
  coalesce(o."afterSnapshot"->'lines','[]'::jsonb)||coalesce(o."afterSnapshot"->'recipeMaterials','[]'::jsonb)||
  coalesce(o."afterSnapshot"->'materials','[]'::jsonb)||coalesce(o."afterSnapshot"->'supplies','[]'::jsonb)) d
  WHERE (d->>CASE p_tipo WHEN 'RawMaterial' THEN 'rawMaterialId' WHEN 'Product' THEN 'productId' WHEN 'UnitMeasure' THEN 'unitMeasureId' ELSE 'warehouseId' END)::integer=p_id
   AND (p_tipo<>'WarehouseMateria' OR d->>'rawMaterialId' IS NOT NULL) AND (p_tipo<>'WarehouseProducto' OR d->>'productId' IS NOT NULL))
$$;
CREATE FUNCTION proteger_referencias_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF public.referencia_historica_plan_trabajo(TG_TABLE_NAME,OLD.id) THEN RAISE EXCEPTION 'Referencia histórica de planificación no eliminable'; END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='RawMaterial' THEN
  IF NEW."unitMeasureId" IS DISTINCT FROM OLD."unitMeasureId" AND (
   EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "rawMaterialId"=OLD.id) OR EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "rawMaterialId"=OLD.id) OR
   EXISTS(SELECT 1 FROM "WorkOrderSupplyPlan" WHERE "rawMaterialId"=OLD.id) OR public.referencia_historica_plan_trabajo('RawMaterial',OLD.id)) THEN
   RAISE EXCEPTION 'Unidad de material bloqueada por planificación histórica'; END IF;
 ELSIF TG_TABLE_NAME='Product' THEN
  IF (NEW."unitMeasureId" IS DISTINCT FROM OLD."unitMeasureId" OR NEW."deletedAt" IS DISTINCT FROM OLD."deletedAt") AND (
   EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "productId"=OLD.id) OR public.referencia_historica_plan_trabajo('Product',OLD.id)) THEN
   RAISE EXCEPTION 'Producto referenciado en trabajo conserva unidad y disponibilidad'; END IF;
 ELSIF TG_TABLE_NAME='Warehouse' THEN
  IF (NEW.classification='MATERIA_PRIMA' AND (EXISTS(SELECT 1 FROM "WorkOrderSupplyPlan" WHERE "warehouseId"=OLD.id AND "productId" IS NOT NULL) OR public.referencia_historica_plan_trabajo('WarehouseProducto',OLD.id))) OR
     (NEW.classification='PRODUCTO_TERMINADO' AND (EXISTS(SELECT 1 FROM "WorkOrderSupplyPlan" WHERE "warehouseId"=OLD.id AND "rawMaterialId" IS NOT NULL) OR public.referencia_historica_plan_trabajo('WarehouseMateria',OLD.id))) THEN
   RAISE EXCEPTION 'Clasificación incompatible con abastecimiento histórico'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "RawMaterial_work_plan_unit" BEFORE UPDATE OR DELETE ON "RawMaterial" FOR EACH ROW EXECUTE FUNCTION proteger_referencias_plan_trabajo();
CREATE TRIGGER "Product_work_plan_reference" BEFORE UPDATE OR DELETE ON "Product" FOR EACH ROW EXECUTE FUNCTION proteger_referencias_plan_trabajo();
CREATE TRIGGER "Warehouse_work_plan_reference" BEFORE UPDATE OR DELETE ON "Warehouse" FOR EACH ROW EXECUTE FUNCTION proteger_referencias_plan_trabajo();
CREATE TRIGGER "UnitMeasure_work_plan_history" BEFORE DELETE ON "UnitMeasure" FOR EACH ROW EXECUTE FUNCTION proteger_referencias_plan_trabajo();
CREATE FUNCTION impedir_consumo_desde_plan_nuevo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."workOrderDetailId" IS NOT NULL AND EXISTS(SELECT 1 FROM "WorkOrderDetail" d JOIN "WorkOrder" w ON w.id=d."workOrderId" WHERE d.id=NEW."workOrderDetailId" AND w."schemaVersion" IS NOT NULL) THEN
  RAISE EXCEPTION 'Producción nueva requiere documento de consumo real; no consumir requerimiento previsto'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "StockMovement_work_plan_origin" BEFORE INSERT OR UPDATE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION impedir_consumo_desde_plan_nuevo();

COMMIT;
