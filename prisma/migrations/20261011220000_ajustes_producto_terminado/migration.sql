BEGIN;
-- AlterTable
ALTER TABLE "ProductInventoryOperation" ADD COLUMN     "adjustmentId" INTEGER,
ALTER COLUMN "initialStockId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductStockMovement" ADD COLUMN     "adjustmentId" INTEGER;

-- CreateTable
CREATE TABLE "ProductInventoryAdjustment" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "unitMeasureId" INTEGER NOT NULL,
    "previousQuantity" DECIMAL(14,3) NOT NULL,
    "finalQuantity" DECIMAL(14,3) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" "InventoryAdjustmentReason" NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "productCode" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "correctedInitialStockId" INTEGER,
    "correctedAdjustmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_warehouseId_productId_date_idx" ON "ProductInventoryAdjustment"("warehouseId", "productId", "date");

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_productId_idx" ON "ProductInventoryAdjustment"("productId");

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_unitMeasureId_idx" ON "ProductInventoryAdjustment"("unitMeasureId");

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_correctedInitialStockId_productI_idx" ON "ProductInventoryAdjustment"("correctedInitialStockId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_correctedAdjustmentId_productId__idx" ON "ProductInventoryAdjustment"("correctedAdjustmentId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "ProductInventoryAdjustment_date_id_idx" ON "ProductInventoryAdjustment"("date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventoryAdjustment_id_productId_warehouseId_key" ON "ProductInventoryAdjustment"("id", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventoryOperation_adjustmentId_key" ON "ProductInventoryOperation"("adjustmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_adjustmentId_key" ON "ProductStockMovement"("adjustmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_adjustmentId_productId_warehouseId_key" ON "ProductStockMovement"("adjustmentId", "productId", "warehouseId");

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_adjustmentId_productId_warehouseId_fkey" FOREIGN KEY ("adjustmentId", "productId", "warehouseId") REFERENCES "ProductInventoryAdjustment"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryOperation" ADD CONSTRAINT "ProductInventoryOperation_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "ProductInventoryAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_correctedInitialStockId_product_fkey" FOREIGN KEY ("correctedInitialStockId", "productId", "warehouseId") REFERENCES "ProductInitialStock"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_correctedAdjustmentId_productId_fkey" FOREIGN KEY ("correctedAdjustmentId", "productId", "warehouseId") REFERENCES "ProductInventoryAdjustment"("id", "productId", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Amplía sólo los orígenes de terminado; conserva documentos iniciales y sus claves.
ALTER TABLE "ProductStockMovement" DROP CONSTRAINT "ProductStockMovement_initial_only";
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_origin" CHECK (
 quantity <> 'NaN'::numeric AND btrim(note) <> '' AND (
  ("initialStockId" IS NOT NULL AND "adjustmentId" IS NULL AND type = 'ENTRADA' AND quantity > 0) OR
  ("initialStockId" IS NULL AND "adjustmentId" IS NOT NULL AND type = 'AJUSTE' AND quantity <> 0)
 ));
ALTER TABLE "ProductInventoryOperation" ADD CONSTRAINT "ProductInventoryOperation_origin" CHECK (num_nonnulls("initialStockId", "adjustmentId") = 1);
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_quantities" CHECK (
 "previousQuantity" >= 0 AND "finalQuantity" >= 0 AND quantity <> 0 AND
 "previousQuantity" <> 'NaN'::numeric AND "finalQuantity" <> 'NaN'::numeric AND quantity <> 'NaN'::numeric AND
 quantity = "finalQuantity" - "previousQuantity"
);
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_content" CHECK (
 btrim(note) <> '' AND btrim("productName") <> '' AND btrim("unitName") <> '' AND btrim("unitAbbreviation") <> '' AND reason <> 'INVENTARIO_INICIAL'
);
ALTER TABLE "ProductInventoryAdjustment" ADD CONSTRAINT "ProductInventoryAdjustment_correction" CHECK (
 (reason = 'CORRECCION_REGISTRO' AND num_nonnulls("correctedInitialStockId", "correctedAdjustmentId") = 1 AND
  ("correctedAdjustmentId" IS NULL OR "correctedAdjustmentId" < id)) OR
 (reason <> 'CORRECCION_REGISTRO' AND "correctedInitialStockId" IS NULL AND "correctedAdjustmentId" IS NULL)
);
CREATE TRIGGER "ProductInventoryAdjustment_immutable" BEFORE UPDATE OR DELETE ON "ProductInventoryAdjustment" FOR EACH ROW EXECUTE FUNCTION proteger_historia_producto_terminado();
CREATE TRIGGER "ProductInventoryAdjustment_references" BEFORE INSERT ON "ProductInventoryAdjustment" FOR EACH ROW EXECUTE FUNCTION validar_referencia_terminado();

CREATE FUNCTION validar_conteo_terminado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record; saldo numeric; kardex numeric;
BEGIN
 -- La referencia de producto/bodega ya queda bloqueada por el trigger anterior.
 SELECT code, "unitMeasureId" INTO p FROM "Product" WHERE id = NEW."productId" FOR UPDATE;
 IF NEW."productCode" <> p.code OR NEW."unitMeasureId" <> p."unitMeasureId" THEN RAISE EXCEPTION 'Unidad o codigo de ajuste diferente'; END IF;
 IF NEW.date > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'No se permiten fechas futuras'; END IF;
 SELECT quantity INTO saldo FROM "ProductWarehouseStock" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId" FOR UPDATE;
 IF saldo IS NULL OR NOT EXISTS (SELECT 1 FROM "ProductStockMovement" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId")
 THEN RAISE EXCEPTION 'Registrar inventario inicial antes de ajustar'; END IF;
 SELECT coalesce(sum(quantity),0) INTO kardex FROM "ProductStockMovement" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId";
 IF NEW."previousQuantity" <> saldo OR saldo <> kardex THEN RAISE EXCEPTION 'Conteo anterior debe coincidir con saldo y Kardex'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductInventoryAdjustment_validate" BEFORE INSERT ON "ProductInventoryAdjustment" FOR EACH ROW EXECUTE FUNCTION validar_conteo_terminado();
CREATE FUNCTION comprobar_ajuste_terminado_completo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "ProductInventoryOperation" WHERE "adjustmentId" = NEW.id) OR
 NOT EXISTS (SELECT 1 FROM "ProductStockMovement" WHERE "adjustmentId" = NEW.id AND quantity = NEW.quantity AND date = NEW.date AND note = NEW.note) OR
 NOT EXISTS (SELECT 1 FROM "ProductWarehouseStock" WHERE "productId" = NEW."productId" AND "warehouseId" = NEW."warehouseId" AND quantity = NEW."finalQuantity")
 THEN RAISE EXCEPTION 'Ajuste requiere operacion, movimiento y saldo atomicos'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductInventoryAdjustment_complete" AFTER INSERT ON "ProductInventoryAdjustment" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_ajuste_terminado_completo();
COMMIT;
