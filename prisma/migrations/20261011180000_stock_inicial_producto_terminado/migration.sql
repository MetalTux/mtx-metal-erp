BEGIN;
-- CreateTable
CREATE TABLE "ProductWarehouseStock" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInitialStock" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "productCode" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInitialStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStockMovement" (
    "id" SERIAL NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "initialStockId" INTEGER,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInventoryOperation" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "initialStockId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventoryOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE INDEX "ProductWarehouseStock_productId_idx" ON "ProductWarehouseStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWarehouseStock_warehouseId_productId_key" ON "ProductWarehouseStock"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "ProductInitialStock_productId_idx" ON "ProductInitialStock"("productId");

-- CreateIndex
CREATE INDEX "ProductInitialStock_unitMeasureId_idx" ON "ProductInitialStock"("unitMeasureId");

-- CreateIndex
CREATE INDEX "ProductInitialStock_date_id_idx" ON "ProductInitialStock"("date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInitialStock_id_productId_warehouseId_key" ON "ProductInitialStock"("id", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInitialStock_warehouseId_productId_key" ON "ProductInitialStock"("warehouseId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_initialStockId_key" ON "ProductStockMovement"("initialStockId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_warehouseId_productId_id_idx" ON "ProductStockMovement"("warehouseId", "productId", "id");

-- CreateIndex
CREATE INDEX "ProductStockMovement_productId_idx" ON "ProductStockMovement"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_initialStockId_productId_warehouseId_key" ON "ProductStockMovement"("initialStockId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventoryOperation_initialStockId_key" ON "ProductInventoryOperation"("initialStockId");

-- AddForeignKey
ALTER TABLE "ProductWarehouseStock" ADD CONSTRAINT "ProductWarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductWarehouseStock" ADD CONSTRAINT "ProductWarehouseStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitialStock" ADD CONSTRAINT "ProductInitialStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitialStock" ADD CONSTRAINT "ProductInitialStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInitialStock" ADD CONSTRAINT "ProductInitialStock_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_initialStockId_productId_warehouseId_fkey" FOREIGN KEY ("initialStockId", "productId", "warehouseId") REFERENCES "ProductInitialStock"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryOperation" ADD CONSTRAINT "ProductInventoryOperation_initialStockId_fkey" FOREIGN KEY ("initialStockId") REFERENCES "ProductInitialStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION proteger_producto() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar producto y UUID mediante baja logica'; END IF;
 IF NEW.code <> OLD.code OR NEW.id <> OLD.id OR NEW."creationKey" <> OLD."creationKey" OR NEW."creationFingerprint" <> OLD."creationFingerprint"
 THEN RAISE EXCEPTION 'Identidad de producto inmutable'; END IF;
 IF OLD."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'Producto eliminado inmutable'; END IF;
 IF NEW."unitMeasureId" <> OLD."unitMeasureId" AND
 (EXISTS (SELECT 1 FROM "ProductRecipe" WHERE "productId" = OLD.id) OR EXISTS (SELECT 1 FROM "QuoteDetail" WHERE "productId" = OLD.id) OR EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "productId" = OLD.id))
 THEN RAISE EXCEPTION 'Unidad de producto bloqueada por referencias'; END IF;
 IF NEW."deletedAt" IS NOT NULL AND (EXISTS (SELECT 1 FROM "QuoteDetail" WHERE "productId" = OLD.id) OR EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "productId" = OLD.id))
 THEN RAISE EXCEPTION 'Producto referenciado no eliminable'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION proteger_clasificacion_bodega() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF NEW.classification = 'MATERIA_PRIMA' AND EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "warehouseId" = OLD.id)
 THEN RAISE EXCEPTION 'Bodega con producto terminado: usar Producto terminado o Mixta'; END IF;
 RETURN NEW;
END $$;

ALTER TABLE "ProductWarehouseStock" ADD CONSTRAINT "ProductWarehouseStock_valid" CHECK (quantity >= 0 AND quantity <> 'NaN'::numeric AND version > 0);
ALTER TABLE "ProductInitialStock" ADD CONSTRAINT "ProductInitialStock_valid" CHECK (quantity > 0 AND quantity <> 'NaN'::numeric AND btrim(note) <> '' AND btrim("productName") <> '' AND btrim("unitName") <> '' AND btrim("unitAbbreviation") <> '');
-- Esta entrega sólo habilita inventario inicial. Producción/ajustes ampliarán los orígenes tipados.
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_initial_only" CHECK ("initialStockId" IS NOT NULL AND type = 'ENTRADA' AND quantity > 0 AND quantity <> 'NaN'::numeric AND btrim(note) <> '');
ALTER TABLE "ProductInventoryOperation" ADD CONSTRAINT "ProductInventoryOperation_fingerprint" CHECK (fingerprint ~ '^[0-9a-f]{64}$');
CREATE FUNCTION proteger_historia_producto_terminado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Documento, movimiento u operacion de terminado inmutable; conservar historial'; END $$;
CREATE TRIGGER "ProductInitialStock_immutable" BEFORE UPDATE OR DELETE ON "ProductInitialStock" FOR EACH ROW EXECUTE FUNCTION proteger_historia_producto_terminado();
CREATE TRIGGER "ProductStockMovement_immutable" BEFORE UPDATE OR DELETE ON "ProductStockMovement" FOR EACH ROW EXECUTE FUNCTION proteger_historia_producto_terminado();
CREATE TRIGGER "ProductInventoryOperation_immutable" BEFORE UPDATE OR DELETE ON "ProductInventoryOperation" FOR EACH ROW EXECUTE FUNCTION proteger_historia_producto_terminado();
CREATE FUNCTION validar_referencia_terminado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record; tipo "WarehouseClassification";
BEGIN
 SELECT id, code, "unitMeasureId" INTO p FROM "Product" WHERE id = NEW."productId" AND "deletedAt" IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
 SELECT classification INTO tipo FROM "Warehouse" WHERE id = NEW."warehouseId" FOR SHARE;
 IF NOT FOUND OR tipo IS NULL OR tipo NOT IN ('PRODUCTO_TERMINADO','MIXTA') THEN RAISE EXCEPTION 'Seleccionar bodega de producto terminado o mixta'; END IF;
 IF TG_TABLE_NAME = 'ProductInitialStock' THEN
  IF NEW."productCode" <> p.code OR NEW."unitMeasureId" <> p."unitMeasureId" THEN RAISE EXCEPTION 'Unidad o codigo de producto diferente'; END IF;
  IF NEW.date > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'No se permiten fechas futuras'; END IF;
  IF EXISTS (SELECT 1 FROM "ProductStockMovement" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId") OR EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId" AND quantity <> 0)
  THEN RAISE EXCEPTION 'Inventario inicial solo sin movimientos y saldo cero'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductInitialStock_references" BEFORE INSERT ON "ProductInitialStock" FOR EACH ROW EXECUTE FUNCTION validar_referencia_terminado();
CREATE TRIGGER "ProductStockMovement_references" BEFORE INSERT ON "ProductStockMovement" FOR EACH ROW EXECUTE FUNCTION validar_referencia_terminado();
CREATE TRIGGER "ProductWarehouseStock_references" BEFORE INSERT OR UPDATE ON "ProductWarehouseStock" FOR EACH ROW EXECUTE FUNCTION validar_referencia_terminado();
CREATE FUNCTION proteger_saldo_terminado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar combinacion de stock de terminado'; END IF;
 IF NEW."warehouseId" <> OLD."warehouseId" OR NEW."productId" <> OLD."productId" OR NEW.id <> OLD.id OR NEW.version <= OLD.version THEN RAISE EXCEPTION 'Conservar identidad e incrementar version de stock'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductWarehouseStock_protect" BEFORE UPDATE OR DELETE ON "ProductWarehouseStock" FOR EACH ROW EXECUTE FUNCTION proteger_saldo_terminado();
CREATE FUNCTION comprobar_saldo_terminado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE saldo numeric; movimientos numeric;
BEGIN
 SELECT quantity INTO saldo FROM "ProductWarehouseStock" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId";
 SELECT coalesce(sum(quantity),0) INTO movimientos FROM "ProductStockMovement" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId";
 IF saldo IS NULL OR saldo <> movimientos THEN RAISE EXCEPTION 'Saldo de terminado debe coincidir con Kardex'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductWarehouseStock_balance" AFTER INSERT OR UPDATE ON "ProductWarehouseStock" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_saldo_terminado();
CREATE CONSTRAINT TRIGGER "ProductStockMovement_balance" AFTER INSERT ON "ProductStockMovement" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_saldo_terminado();
CREATE FUNCTION comprobar_inicial_terminado_completo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "ProductInventoryOperation" WHERE "initialStockId" = NEW.id) OR NOT EXISTS (SELECT 1 FROM "ProductStockMovement" WHERE "initialStockId" = NEW.id AND quantity = NEW.quantity AND date = NEW.date AND note = NEW.note) OR NOT EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "warehouseId" = NEW."warehouseId" AND "productId" = NEW."productId" AND quantity = NEW.quantity)
 THEN RAISE EXCEPTION 'Inventario inicial requiere operacion, movimiento y saldo atomicos'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductInitialStock_complete" AFTER INSERT ON "ProductInitialStock" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_inicial_terminado_completo();
COMMIT;
