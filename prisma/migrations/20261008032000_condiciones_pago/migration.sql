BEGIN;
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "paymentConditionId" INTEGER,
ADD COLUMN     "paymentConditionName" TEXT,
ADD COLUMN     "paymentTermDays" INTEGER;

-- CreateTable
CREATE TABLE "PaymentCondition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCondition_name_key" ON "PaymentCondition"("name");

-- CreateIndex
CREATE INDEX "Quote_paymentConditionId_idx" ON "Quote"("paymentConditionId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_paymentConditionId_fkey" FOREIGN KEY ("paymentConditionId") REFERENCES "PaymentCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Protección del catálogo, incluso ante escrituras ajenas al formulario.
ALTER TABLE "PaymentCondition"
  ADD CONSTRAINT "PaymentCondition_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 100),
  ADD CONSTRAINT "PaymentCondition_days_check" CHECK ("days" >= 0),
  ADD CONSTRAINT "PaymentCondition_version_check" CHECK ("version" > 0);
CREATE UNIQUE INDEX "PaymentCondition_name_normalized_key" ON "PaymentCondition" (lower(btrim("name")));

-- El documento conserva su condición/plazo; las cotizaciones heredadas quedan sin configurar.
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_payment_condition_snapshot_check" CHECK (
  ("paymentConditionName" IS NULL AND "paymentTermDays" IS NULL AND "paymentConditionId" IS NULL)
  OR ("paymentConditionName" IS NOT NULL AND length(btrim("paymentConditionName")) BETWEEN 1 AND 100
      AND "paymentTermDays" IS NOT NULL AND "paymentTermDays" >= 0)
);

-- Bases aprobadas: no ejecutar el seed general ni crear ofertas/ventas ficticias.
INSERT INTO "PaymentCondition" ("name", "days", "updatedAt") VALUES
 ('Al día', 0, CURRENT_TIMESTAMP), ('30 días', 30, CURRENT_TIMESTAMP),
 ('60 días', 60, CURRENT_TIMESTAMP), ('90 días', 90, CURRENT_TIMESTAMP);
COMMIT;
