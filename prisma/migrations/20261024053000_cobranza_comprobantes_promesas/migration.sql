-- CreateTable
CREATE TABLE "PaymentAttachment" (
    "id" UUID NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "originalName" VARCHAR(180) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPromiseChange" (
    "id" UUID NOT NULL,
    "accountReceivableId" INTEGER NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "previousDate" DATE,
    "newDate" DATE,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPromiseChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttachment_fileKey_key" ON "PaymentAttachment"("fileKey");

-- CreateIndex
CREATE INDEX "PaymentAttachment_paymentId_createdAt_idx" ON "PaymentAttachment"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentPromiseChange_accountReceivableId_createdAt_idx" ON "PaymentPromiseChange"("accountReceivableId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentAttachment" ADD CONSTRAINT "PaymentAttachment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPromiseChange" ADD CONSTRAINT "PaymentPromiseChange_accountReceivableId_fkey" FOREIGN KEY ("accountReceivableId") REFERENCES "AccountReceivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAttachment" ADD CONSTRAINT "PaymentAttachment_values" CHECK (
 "size">0 AND "size"<=5242880 AND "mimeType" IN ('image/jpeg','image/png','application/pdf') AND
 fingerprint ~ '^[0-9a-f]{64}$' AND length(trim("originalName"))>0 AND "fileKey" ~ '^[0-9a-f-]{36}\.bin$');
ALTER TABLE "PaymentPromiseChange" ADD CONSTRAINT "PaymentPromiseChange_values" CHECK (
 fingerprint ~ '^[0-9a-f]{64}$' AND length(trim(reason))>0 AND "previousDate" IS DISTINCT FROM "newDate");
CREATE FUNCTION conservar_historia_cobranza_c3() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de comprobantes y promesas es inmutable'; END $$;
CREATE TRIGGER "PaymentAttachment_immutable" BEFORE UPDATE OR DELETE ON "PaymentAttachment" FOR EACH ROW EXECUTE FUNCTION conservar_historia_cobranza_c3();
CREATE TRIGGER "PaymentPromiseChange_immutable" BEFORE UPDATE OR DELETE ON "PaymentPromiseChange" FOR EACH ROW EXECUTE FUNCTION conservar_historia_cobranza_c3();
