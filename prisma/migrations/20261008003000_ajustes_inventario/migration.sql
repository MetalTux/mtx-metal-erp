-- CreateEnum
CREATE TYPE "InventoryAdjustmentReason" AS ENUM ('CONTEO_FISICO', 'MERMA_PERDIDA', 'DETERIORO_DANO', 'CORRECCION_REGISTRO', 'OTRO', 'INVENTARIO_INICIAL');

-- CreateEnum
CREATE TYPE "InventoryOperationType" AS ENUM ('AJUSTAR', 'CARGAR_INICIAL', 'CORREGIR');

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "inventoryAdjustmentId" INTEGER;

-- CreateTable
CREATE TABLE "InventoryAdjustment" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "reason" "InventoryAdjustmentReason" NOT NULL,
    "note" TEXT NOT NULL,
    "previousQuantity" DECIMAL(14,3) NOT NULL,
    "finalQuantity" DECIMAL(14,3) NOT NULL,
    "difference" DECIMAL(14,3) NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "correctedAdjustmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryOperation" (
    "idempotencyKey" UUID NOT NULL,
    "type" "InventoryOperationType" NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "adjustmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE INDEX "InventoryAdjustment_warehouseId_rawMaterialId_date_idx" ON "InventoryAdjustment"("warehouseId", "rawMaterialId", "date");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_rawMaterialId_idx" ON "InventoryAdjustment"("rawMaterialId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_correctedAdjustmentId_warehouseId_rawMa_idx" ON "InventoryAdjustment"("correctedAdjustmentId", "warehouseId", "rawMaterialId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_date_id_idx" ON "InventoryAdjustment"("date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAdjustment_id_warehouseId_rawMaterialId_key" ON "InventoryAdjustment"("id", "warehouseId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryOperation_adjustmentId_key" ON "InventoryOperation"("adjustmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_inventoryAdjustmentId_key" ON "StockMovement"("inventoryAdjustmentId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_inventoryAdjustmentId_warehouseId_rawMaterial_key" ON "StockMovement"("inventoryAdjustmentId", "warehouseId", "rawMaterialId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryAdjustmentId_warehouseId_rawMateria_fkey" FOREIGN KEY ("inventoryAdjustmentId", "warehouseId", "rawMaterialId") REFERENCES "InventoryAdjustment"("id", "warehouseId", "rawMaterialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_correctedAdjustmentId_warehouseId_rawM_fkey" FOREIGN KEY ("correctedAdjustmentId", "warehouseId", "rawMaterialId") REFERENCES "InventoryAdjustment"("id", "warehouseId", "rawMaterialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "InventoryAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Evidencia histórica: cantidades finitas, saldo final no negativo y diferencia exacta no nula.
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_quantities_check" CHECK (
 "previousQuantity" <> 'NaN'::numeric AND "finalQuantity" <> 'NaN'::numeric
 AND "difference" <> 'NaN'::numeric AND "finalQuantity" >= 0
 AND "difference" <> 0 AND "difference" = "finalQuantity" - "previousQuantity"
);
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_note_check" CHECK (length(btrim("note")) > 0);
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_correction_check" CHECK (
 ("reason" = 'CORRECCION_REGISTRO') = ("correctedAdjustmentId" IS NOT NULL)
 AND ("correctedAdjustmentId" IS NULL OR "correctedAdjustmentId" <> id)
);
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_initial_check" CHECK (
 "reason" <> 'INVENTARIO_INICIAL' OR ("previousQuantity" = 0 AND "difference" > 0)
);
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_hash_check" CHECK ("requestHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_adjustment_origin_check" CHECK (
 "inventoryAdjustmentId" IS NULL OR (
 "type" = 'AJUSTE' AND "purchaseDetailId" IS NULL AND "workOrderDetailId" IS NULL
 AND "purchaseReceiptDetailId" IS NULL AND "reversedReceiptDetailId" IS NULL)
);
-- No altera movimientos heredados. Un documento nuevo sólo admite el movimiento de su diferencia.
CREATE FUNCTION "validarMovimientoAjuste"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."inventoryAdjustmentId" IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "InventoryAdjustment" a WHERE a.id = NEW."inventoryAdjustmentId"
 AND a."difference" = NEW.quantity) THEN
 RAISE EXCEPTION 'El movimiento no coincide con la diferencia del ajuste';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "StockMovement_adjustment_difference" BEFORE INSERT OR UPDATE ON "StockMovement"
 FOR EACH ROW EXECUTE FUNCTION "validarMovimientoAjuste"();
-- Estos documentos y claves idempotentes se conservan; corregir exige un nuevo documento.
CREATE FUNCTION "conservarDocumentoInventario"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de inventario es inmutable'; END; $$;
CREATE TRIGGER "InventoryAdjustment_immutable" BEFORE UPDATE OR DELETE ON "InventoryAdjustment"
 FOR EACH ROW EXECUTE FUNCTION "conservarDocumentoInventario"();
CREATE TRIGGER "InventoryOperation_immutable" BEFORE UPDATE OR DELETE ON "InventoryOperation"
 FOR EACH ROW EXECUTE FUNCTION "conservarDocumentoInventario"();
