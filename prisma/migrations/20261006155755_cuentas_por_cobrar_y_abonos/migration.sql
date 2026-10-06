-- Cuentas y abonos nuevos, sin deducir deuda ni pagos desde las guías existentes.
-- Conservar los CHECK en SQL: Prisma no los representa como atributos del esquema.
BEGIN;

-- CreateTable
CREATE TABLE "AccountReceivable" (
    "id" SERIAL NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE,
    "paymentPromiseDate" DATE,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccountReceivable_amount_nonnegative_check"
        CHECK ("amount" >= 0 AND "amount" <> 'NaN'::numeric),
    CONSTRAINT "AccountReceivable_void_metadata_check" CHECK (
        ("voidedAt" IS NULL AND "voidReason" IS NULL) OR
        ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0)
    )
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "accountReceivableId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "voucherUrl" TEXT,
    "idempotencyKey" UUID NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_amount_positive_check"
        CHECK ("amount" > 0 AND "amount" <> 'NaN'::numeric),
    CONSTRAINT "Payment_method_not_blank_check" CHECK (length(btrim("method")) > 0),
    CONSTRAINT "Payment_void_metadata_check" CHECK (
        ("voidedAt" IS NULL AND "voidReason" IS NULL) OR
        ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountReceivable_salesOrderId_key" ON "AccountReceivable"("salesOrderId");

-- CreateIndex
CREATE INDEX "AccountReceivable_dueDate_idx" ON "AccountReceivable"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_accountReceivableId_voidedAt_paidAt_idx" ON "Payment"("accountReceivableId", "voidedAt", "paidAt");

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "AccountReceivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
