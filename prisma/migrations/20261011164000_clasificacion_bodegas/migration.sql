BEGIN;
CREATE TYPE "WarehouseClassification" AS ENUM ('MATERIA_PRIMA', 'PRODUCTO_TERMINADO', 'MIXTA');
-- Sin DEFAULT ni backfill: no decidir por el usuario la clasificación del historial.
ALTER TABLE "Warehouse" ADD COLUMN "classification" "WarehouseClassification";

CREATE FUNCTION proteger_clasificacion_bodega() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.classification IS NOT NULL AND NEW.classification IS NULL THEN
  RAISE EXCEPTION 'Seleccionar una clasificacion; no volver a sin clasificar';
 END IF;
 IF NEW.classification = 'PRODUCTO_TERMINADO' AND (
  EXISTS (SELECT 1 FROM "WarehouseStock" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "StockMovement" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "Purchase" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "PurchaseDetail" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "WorkOrderDetail" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "InventoryAdjustment" WHERE "warehouseId" = OLD.id) OR
  EXISTS (SELECT 1 FROM "InventoryTransfer" WHERE "sourceWarehouseId" = OLD.id OR "destinationWarehouseId" = OLD.id)
 ) THEN RAISE EXCEPTION 'Bodega con referencias de materia prima: usar Materia prima o Mixta'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Warehouse_classification_protect" BEFORE UPDATE OF classification ON "Warehouse" FOR EACH ROW EXECUTE FUNCTION proteger_clasificacion_bodega();

CREATE FUNCTION comprobar_bodega_materia_prima() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo "WarehouseClassification";
BEGIN
 -- Compartido con reclasificación: impedir carreras entre cambio de tipo y creación de referencias.
 SELECT classification INTO tipo FROM "Warehouse" WHERE id = NEW."warehouseId" FOR SHARE;
 IF tipo = 'PRODUCTO_TERMINADO' THEN RAISE EXCEPTION 'Bodega exclusiva de producto terminado no admite materia prima'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WarehouseStock_classification" BEFORE INSERT OR UPDATE ON "WarehouseStock" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE TRIGGER "StockMovement_classification" BEFORE INSERT OR UPDATE ON "StockMovement" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE TRIGGER "Purchase_classification" BEFORE INSERT OR UPDATE ON "Purchase" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE TRIGGER "PurchaseDetail_classification" BEFORE INSERT OR UPDATE ON "PurchaseDetail" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE TRIGGER "WorkOrderDetail_classification" BEFORE INSERT OR UPDATE ON "WorkOrderDetail" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE TRIGGER "InventoryAdjustment_classification" BEFORE INSERT OR UPDATE ON "InventoryAdjustment" FOR EACH ROW EXECUTE FUNCTION comprobar_bodega_materia_prima();
CREATE FUNCTION comprobar_bodegas_traslado_material() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record;
BEGIN
 FOR b IN SELECT classification FROM "Warehouse" WHERE id IN (NEW."sourceWarehouseId", NEW."destinationWarehouseId") ORDER BY id FOR SHARE LOOP
  IF b.classification = 'PRODUCTO_TERMINADO' THEN RAISE EXCEPTION 'Traslado de materia prima requiere bodegas de materia prima o mixtas'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER "InventoryTransfer_classification" BEFORE INSERT OR UPDATE ON "InventoryTransfer" FOR EACH ROW EXECUTE FUNCTION comprobar_bodegas_traslado_material();
COMMIT;
