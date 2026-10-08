-- Migración validada con compras vacías. No inventar documentos ni convertir historial.
BEGIN;
LOCK TABLE "Purchase", "PurchaseDetail", "StockMovement" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Purchase") OR EXISTS (SELECT 1 FROM "PurchaseDetail") THEN
    RAISE EXCEPTION 'Compras históricas detectadas: preparar transición explícita antes de aplicar esta migración';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "PurchaseOperationType" AS ENUM ('CREAR', 'RECIBIR', 'CERRAR_PENDIENTE', 'ANULAR', 'ELIMINAR');

-- DropForeignKey
ALTER TABLE "PurchaseDetail" DROP CONSTRAINT "PurchaseDetail_purchaseId_fkey";

-- DropIndex
DROP INDEX "Purchase_supplierId_idx";

-- DropIndex
DROP INDEX "PurchaseDetail_purchaseId_idx";

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "purchaseReceiptDetailId" INTEGER,
ADD COLUMN     "reversedReceiptDetailId" INTEGER;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "documentNumber" VARCHAR(100) NOT NULL,
ADD COLUMN     "documentNumberNormalized" VARCHAR(100) NOT NULL,
ADD COLUMN     "documentTypeCode" VARCHAR(50) NOT NULL,
ADD COLUMN     "documentTypeId" INTEGER NOT NULL,
ADD COLUMN     "supplierRut" VARCHAR(12) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "warehouseId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseDetail" ADD COLUMN     "lineAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "presentation" VARCHAR(100) NOT NULL,
ADD COLUMN     "purchasedQuantity" DECIMAL(14,3) NOT NULL,
ADD COLUMN     "unitFactor" DECIMAL(14,3) NOT NULL;

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptDetail" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "purchaseDetailId" INTEGER NOT NULL,
    "receivedQuantity" DECIMAL(14,3) NOT NULL,
    "inventoryQuantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReceiptDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePendingClosure" (
    "purchaseId" INTEGER NOT NULL,
    "id" SERIAL NOT NULL,
    "purchaseDetailId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePendingClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOperation" (
    "idempotencyKey" UUID NOT NULL,
    "type" "PurchaseOperationType" NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "receiptId" INTEGER,
    "closureId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_code_key" ON "DocumentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_purchaseId_date_idx" ON "PurchaseReceipt"("purchaseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_id_purchaseId_key" ON "PurchaseReceipt"("id", "purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptDetail_receiptId_purchaseId_idx" ON "PurchaseReceiptDetail"("receiptId", "purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptDetail_purchaseDetailId_purchaseId_idx" ON "PurchaseReceiptDetail"("purchaseDetailId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceiptDetail_receiptId_purchaseDetailId_key" ON "PurchaseReceiptDetail"("receiptId", "purchaseDetailId");

-- CreateIndex
CREATE INDEX "PurchasePendingClosure_purchaseDetailId_purchaseId_idx" ON "PurchasePendingClosure"("purchaseDetailId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePendingClosure_id_purchaseId_key" ON "PurchasePendingClosure"("id", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_receiptId_key" ON "PurchaseOperation"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_closureId_key" ON "PurchaseOperation"("closureId");

-- CreateIndex
CREATE INDEX "PurchaseOperation_purchaseId_type_idx" ON "PurchaseOperation"("purchaseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_receiptId_purchaseId_key" ON "PurchaseOperation"("receiptId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOperation_closureId_purchaseId_key" ON "PurchaseOperation"("closureId", "purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_purchaseReceiptDetailId_key" ON "StockMovement"("purchaseReceiptDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_reversedReceiptDetailId_key" ON "StockMovement"("reversedReceiptDetailId");

-- CreateIndex
CREATE INDEX "Purchase_documentTypeId_idx" ON "Purchase"("documentTypeId");

-- CreateIndex
CREATE INDEX "Purchase_warehouseId_idx" ON "Purchase"("warehouseId");

-- CreateIndex
CREATE INDEX "Purchase_deletedAt_date_idx" ON "Purchase"("deletedAt", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_supplierRut_documentTypeId_documentNumberNormalize_key" ON "Purchase"("supplierRut", "documentTypeId", "documentNumberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_supplierId_documentTypeId_documentNumberNormalized_key" ON "Purchase"("supplierId", "documentTypeId", "documentNumberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_id_warehouseId_key" ON "Purchase"("id", "warehouseId");

-- CreateIndex
CREATE INDEX "PurchaseDetail_purchaseId_warehouseId_idx" ON "PurchaseDetail"("purchaseId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDetail_id_purchaseId_key" ON "PurchaseDetail"("id", "purchaseId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_purchaseReceiptDetailId_fkey" FOREIGN KEY ("purchaseReceiptDetailId") REFERENCES "PurchaseReceiptDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_reversedReceiptDetailId_fkey" FOREIGN KEY ("reversedReceiptDetailId") REFERENCES "PurchaseReceiptDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_purchaseId_warehouseId_fkey" FOREIGN KEY ("purchaseId", "warehouseId") REFERENCES "Purchase"("id", "warehouseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptDetail" ADD CONSTRAINT "PurchaseReceiptDetail_receiptId_purchaseId_fkey" FOREIGN KEY ("receiptId", "purchaseId") REFERENCES "PurchaseReceipt"("id", "purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptDetail" ADD CONSTRAINT "PurchaseReceiptDetail_purchaseDetailId_purchaseId_fkey" FOREIGN KEY ("purchaseDetailId", "purchaseId") REFERENCES "PurchaseDetail"("id", "purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePendingClosure" ADD CONSTRAINT "PurchasePendingClosure_purchaseDetailId_purchaseId_fkey" FOREIGN KEY ("purchaseDetailId", "purchaseId") REFERENCES "PurchaseDetail"("id", "purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_receiptId_purchaseId_fkey" FOREIGN KEY ("receiptId", "purchaseId") REFERENCES "PurchaseReceipt"("id", "purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_closureId_purchaseId_fkey" FOREIGN KEY ("closureId", "purchaseId") REFERENCES "PurchasePendingClosure"("id", "purchaseId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reglas locales que Prisma no representa: conservar al regenerar SQL.
ALTER TABLE "DocumentType" ADD CONSTRAINT "DocumentType_text_check"
CHECK (length(btrim("code")) > 0 AND "code" = upper(btrim("code")) AND length(btrim("name")) > 0);
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_values_check"
CHECK ("totalAmount" >= 0 AND "totalAmount" <> 'NaN'::numeric AND "version" > 0
  AND length(btrim("supplierRut")) > 0 AND length(btrim("documentTypeCode")) > 0
  AND length(btrim("documentNumber")) > 0 AND "documentNumber" = btrim("documentNumber")
  AND "documentNumberNormalized" = upper(btrim("documentNumber")));
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_void_check"
CHECK (("voidedAt" IS NULL AND "voidReason" IS NULL)
  OR ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0));
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_deleted_check"
CHECK ("deletedAt" IS NULL OR ("voidedAt" IS NOT NULL AND "deletedAt" >= "voidedAt"));
ALTER TABLE "PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_values_check"
CHECK ("quantity" > 0 AND "quantity" <> 'NaN'::numeric
  AND "purchasedQuantity" > 0 AND "purchasedQuantity" <> 'NaN'::numeric
  AND "unitFactor" > 0 AND "unitFactor" <> 'NaN'::numeric
  AND "unitPrice" >= 0 AND "unitPrice" <> 'NaN'::numeric
  AND "lineAmount" >= 0 AND "lineAmount" <> 'NaN'::numeric
  AND length(btrim("presentation")) > 0
  AND "quantity" = "purchasedQuantity" * "unitFactor"
  AND "lineAmount" = round("purchasedQuantity" * "unitPrice", 2));
ALTER TABLE "PurchaseReceiptDetail" ADD CONSTRAINT "PurchaseReceiptDetail_quantities_check"
CHECK ("receivedQuantity" > 0 AND "receivedQuantity" <> 'NaN'::numeric
  AND "inventoryQuantity" > 0 AND "inventoryQuantity" <> 'NaN'::numeric);
ALTER TABLE "PurchasePendingClosure" ADD CONSTRAINT "PurchasePendingClosure_values_check"
CHECK ("quantity" > 0 AND "quantity" <> 'NaN'::numeric AND length(btrim("reason")) > 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_receipt_origin_check"
CHECK (("purchaseReceiptDetailId" IS NULL OR ("type" = 'ENTRADA' AND "quantity" > 0
    AND "quantity" <> 'NaN'::numeric AND "purchaseDetailId" IS NOT NULL AND "workOrderDetailId" IS NULL))
  AND ("reversedReceiptDetailId" IS NULL OR ("type" = 'AJUSTE' AND "quantity" < 0
    AND "quantity" <> 'NaN'::numeric AND "purchaseDetailId" IS NOT NULL AND "workOrderDetailId" IS NULL))
  AND NOT ("purchaseReceiptDetailId" IS NOT NULL AND "reversedReceiptDetailId" IS NOT NULL));
ALTER TABLE "PurchaseOperation" ADD CONSTRAINT "PurchaseOperation_result_check"
CHECK ("requestHash" ~ '^[0-9a-f]{64}$'
  AND (("type" = 'RECIBIR' AND "receiptId" IS NOT NULL AND "closureId" IS NULL)
    OR ("type" = 'CERRAR_PENDIENTE' AND "closureId" IS NOT NULL AND "receiptId" IS NULL)
    OR ("type" IN ('CREAR', 'ANULAR', 'ELIMINAR') AND "receiptId" IS NULL AND "closureId" IS NULL)));

-- Precio inmutable desde el primer guardado, incluso antes de recibir.
CREATE FUNCTION "protect_purchase_detail_price"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."unitPrice" IS DISTINCT FROM OLD."unitPrice" THEN
    RAISE EXCEPTION 'El precio del detalle de compra no puede modificarse después de guardar'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PurchaseDetail_immutable_price"
BEFORE UPDATE ON "PurchaseDetail" FOR EACH ROW EXECUTE FUNCTION "protect_purchase_detail_price"();

-- Sumas entre filas, sobre-recepción, cierre, bloqueo tras consumo, confirmación e
-- inmutabilidad estructural tras recibir necesitan el servicio transaccional futuro.
COMMIT;
