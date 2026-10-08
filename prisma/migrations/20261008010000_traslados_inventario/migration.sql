-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryOperationType" ADD VALUE 'TRASLADAR';
ALTER TYPE "InventoryOperationType" ADD VALUE 'REVERTIR_TRASLADO';

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "incomingTransferId" INTEGER,
ADD COLUMN     "outgoingTransferId" INTEGER;

-- AlterTable
ALTER TABLE "InventoryOperation" ADD COLUMN     "transferId" INTEGER,
ALTER COLUMN "adjustmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "sourcePreviousQuantity" DECIMAL(14,3) NOT NULL,
    "sourceFinalQuantity" DECIMAL(14,3) NOT NULL,
    "destinationPreviousQuantity" DECIMAL(14,3) NOT NULL,
    "destinationFinalQuantity" DECIMAL(14,3) NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "sourceWarehouseId" INTEGER NOT NULL,
    "destinationWarehouseId" INTEGER NOT NULL,
    "correctedTransferId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_correctedTransferId_key" ON "InventoryTransfer"("correctedTransferId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_rawMaterialId_date_idx" ON "InventoryTransfer"("rawMaterialId", "date");

-- CreateIndex
CREATE INDEX "InventoryTransfer_sourceWarehouseId_date_idx" ON "InventoryTransfer"("sourceWarehouseId", "date");

-- CreateIndex
CREATE INDEX "InventoryTransfer_destinationWarehouseId_date_idx" ON "InventoryTransfer"("destinationWarehouseId", "date");

-- CreateIndex
CREATE INDEX "InventoryTransfer_date_id_idx" ON "InventoryTransfer"("date", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_id_sourceWarehouseId_rawMaterialId_key" ON "InventoryTransfer"("id", "sourceWarehouseId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_id_destinationWarehouseId_rawMaterialId_key" ON "InventoryTransfer"("id", "destinationWarehouseId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_outgoingTransferId_key" ON "StockMovement"("outgoingTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_incomingTransferId_key" ON "StockMovement"("incomingTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_outgoingTransferId_warehouseId_rawMaterialId_key" ON "StockMovement"("outgoingTransferId", "warehouseId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_incomingTransferId_warehouseId_rawMaterialId_key" ON "StockMovement"("incomingTransferId", "warehouseId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryOperation_transferId_key" ON "InventoryOperation"("transferId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_outgoingTransferId_warehouseId_rawMaterialId_fkey" FOREIGN KEY ("outgoingTransferId", "warehouseId", "rawMaterialId") REFERENCES "InventoryTransfer"("id", "sourceWarehouseId", "rawMaterialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_incomingTransferId_warehouseId_rawMaterialId_fkey" FOREIGN KEY ("incomingTransferId", "warehouseId", "rawMaterialId") REFERENCES "InventoryTransfer"("id", "destinationWarehouseId", "rawMaterialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_correctedTransferId_fkey" FOREIGN KEY ("correctedTransferId") REFERENCES "InventoryTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Evidencia de traslado finita, positiva y equilibrada, sin bodegas iguales.
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_balances_check" CHECK (
 quantity <> 'NaN'::numeric AND quantity > 0
 AND "sourcePreviousQuantity" <> 'NaN'::numeric AND "sourcePreviousQuantity" >= 0
 AND "sourceFinalQuantity" <> 'NaN'::numeric AND "sourceFinalQuantity" >= 0
 AND "destinationPreviousQuantity" <> 'NaN'::numeric AND "destinationPreviousQuantity" >= 0
 AND "destinationFinalQuantity" <> 'NaN'::numeric AND "destinationFinalQuantity" >= 0
 AND "sourceFinalQuantity" = "sourcePreviousQuantity" - quantity
 AND "destinationFinalQuantity" = "destinationPreviousQuantity" + quantity
);
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_document_check" CHECK (
 "sourceWarehouseId" <> "destinationWarehouseId" AND length(btrim(note)) > 0
 AND ("correctedTransferId" IS NULL OR "correctedTransferId" <> id)
);
ALTER TABLE "InventoryOperation" ADD CONSTRAINT "InventoryOperation_origin_check" CHECK (
 ("adjustmentId" IS NOT NULL AND "transferId" IS NULL AND type::text IN ('AJUSTAR','CARGAR_INICIAL','CORREGIR'))
 OR ("adjustmentId" IS NULL AND "transferId" IS NOT NULL AND type::text IN ('TRASLADAR','REVERTIR_TRASLADO'))
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transfer_origin_check" CHECK (
 ("outgoingTransferId" IS NULL AND "incomingTransferId" IS NULL) OR (
 "inventoryAdjustmentId" IS NULL AND "purchaseDetailId" IS NULL AND "workOrderDetailId" IS NULL
 AND "purchaseReceiptDetailId" IS NULL AND "reversedReceiptDetailId" IS NULL AND (
 ("outgoingTransferId" IS NOT NULL AND "incomingTransferId" IS NULL AND type='SALIDA') OR
 ("outgoingTransferId" IS NULL AND "incomingTransferId" IS NOT NULL AND type='ENTRADA')))
);
CREATE FUNCTION "validarCorreccionTraslado"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."correctedTransferId" IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "InventoryTransfer" t WHERE t.id=NEW."correctedTransferId"
 AND t."rawMaterialId"=NEW."rawMaterialId" AND t.quantity=NEW.quantity
 AND t."sourceWarehouseId"=NEW."destinationWarehouseId" AND t."destinationWarehouseId"=NEW."sourceWarehouseId") THEN
 RAISE EXCEPTION 'La corrección debe ser el traslado inverso completo';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "InventoryTransfer_inverse_check" BEFORE INSERT ON "InventoryTransfer"
 FOR EACH ROW EXECUTE FUNCTION "validarCorreccionTraslado"();
CREATE TRIGGER "InventoryTransfer_immutable" BEFORE UPDATE OR DELETE ON "InventoryTransfer"
 FOR EACH ROW EXECUTE FUNCTION "conservarDocumentoInventario"();
CREATE FUNCTION "validarMovimientoTraslado"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' AND (OLD."outgoingTransferId" IS NOT NULL OR OLD."incomingTransferId" IS NOT NULL) THEN
 RAISE EXCEPTION 'Los movimientos de traslado son inmutables';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 IF NEW."outgoingTransferId" IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "InventoryTransfer" t WHERE t.id=NEW."outgoingTransferId" AND NEW.quantity=-t.quantity) THEN
 RAISE EXCEPTION 'La salida no coincide con la cantidad del traslado'; END IF;
 IF NEW."incomingTransferId" IS NOT NULL AND NOT EXISTS (
 SELECT 1 FROM "InventoryTransfer" t WHERE t.id=NEW."incomingTransferId" AND NEW.quantity=t.quantity) THEN
 RAISE EXCEPTION 'La entrada no coincide con la cantidad del traslado'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "StockMovement_transfer_check" BEFORE INSERT OR UPDATE OR DELETE ON "StockMovement"
 FOR EACH ROW EXECUTE FUNCTION "validarMovimientoTraslado"();
-- Un documento nuevo no puede confirmarse sin ambos movimientos y su operación idempotente.
CREATE FUNCTION "exigirParTraslado"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "StockMovement" WHERE "outgoingTransferId"=NEW.id)
 OR NOT EXISTS (SELECT 1 FROM "StockMovement" WHERE "incomingTransferId"=NEW.id)
 OR NOT EXISTS (SELECT 1 FROM "InventoryOperation" WHERE "transferId"=NEW.id
 AND type::text = CASE WHEN NEW."correctedTransferId" IS NULL THEN 'TRASLADAR' ELSE 'REVERTIR_TRASLADO' END) THEN
 RAISE EXCEPTION 'El traslado requiere salida, entrada y operación coherentes'; END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER "InventoryTransfer_pair_check" AFTER INSERT ON "InventoryTransfer"
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "exigirParTraslado"();
