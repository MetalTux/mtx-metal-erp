BEGIN;
/*
  Warnings:

  - A unique constraint covering the columns `[id,quoteId]` on the table `QuoteDetail` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[folioId]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creationKey]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,quoteId]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId,customerOrderKey]` on the table `SalesOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('CONFIRMADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "SalesOrderOperationType" AS ENUM ('CONFIRMAR', 'ANULAR');

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "acceptanceDate" DATE,
ADD COLUMN     "approvedQuoteVersion" INTEGER,
ADD COLUMN     "bankAccountId" INTEGER,
ADD COLUMN     "bankSnapshot" JSONB,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "clientBranchId" INTEGER,
ADD COLUMN     "clientId" INTEGER,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientSnapshot" JSONB,
ADD COLUMN     "commercialTerms" TEXT,
ADD COLUMN     "companySnapshot" JSONB,
ADD COLUMN     "creationKey" UUID,
ADD COLUMN     "customerOrderDate" DATE,
ADD COLUMN     "customerOrderKey" VARCHAR(150),
ADD COLUMN     "customerOrderNumber" VARCHAR(150),
ADD COLUMN     "discountAmount" DECIMAL(14,2),
ADD COLUMN     "discountMode" "QuoteDiscountMode",
ADD COLUMN     "discountValue" DECIMAL(14,2),
ADD COLUMN     "folioId" INTEGER,
ADD COLUMN     "netAmount" DECIMAL(14,2),
ADD COLUMN     "offeredDiscountAmount" DECIMAL(14,2),
ADD COLUMN     "offeredSubtotal" DECIMAL(14,2),
ADD COLUMN     "paymentConditionId" INTEGER,
ADD COLUMN     "paymentConditionName" TEXT,
ADD COLUMN     "paymentTermDays" INTEGER,
ADD COLUMN     "pdfEmissionId" UUID,
ADD COLUMN     "quoteSnapshot" JSONB,
ADD COLUMN     "quoteVersion" INTEGER,
ADD COLUMN     "status" "SalesOrderStatus",
ADD COLUMN     "subtotal" DECIMAL(14,2),
ADD COLUMN     "technicalDescription" JSONB,
ADD COLUMN     "totalAmount" DECIMAL(14,2),
ADD COLUMN     "vatAmount" DECIMAL(14,2),
ADD COLUMN     "vatRate" DECIMAL(7,4),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SalesOrderDetail" (
    "id" SERIAL NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "quoteDetailId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "QuoteLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "lineAmount" DECIMAL(14,2) NOT NULL,
    "rawMaterialId" INTEGER,
    "productId" INTEGER,
    "unitMeasureId" INTEGER NOT NULL,
    "code" TEXT,
    "unitName" TEXT NOT NULL,
    "unitAbbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderOperation" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "type" "SalesOrderOperationType" NOT NULL,
    "salesOrderId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderDetail_quoteDetailId_key" ON "SalesOrderDetail"("quoteDetailId");

-- CreateIndex
CREATE INDEX "SalesOrderDetail_salesOrderId_quoteId_idx" ON "SalesOrderDetail"("salesOrderId", "quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderDetail_salesOrderId_position_key" ON "SalesOrderDetail"("salesOrderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderDetail_quoteDetailId_quoteId_key" ON "SalesOrderDetail"("quoteDetailId", "quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderOperation_salesOrderId_version_key" ON "SalesOrderOperation"("salesOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteDetail_id_quoteId_key" ON "QuoteDetail"("id", "quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_folioId_key" ON "SalesOrder"("folioId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_creationKey_key" ON "SalesOrder"("creationKey");

-- CreateIndex
CREATE INDEX "SalesOrder_status_acceptanceDate_id_idx" ON "SalesOrder"("status", "acceptanceDate", "id");

-- CreateIndex
CREATE INDEX "SalesOrder_clientId_acceptanceDate_id_idx" ON "SalesOrder"("clientId", "acceptanceDate", "id");

-- CreateIndex
CREATE INDEX "SalesOrder_clientBranchId_clientId_idx" ON "SalesOrder"("clientBranchId", "clientId");

-- CreateIndex
CREATE INDEX "SalesOrder_paymentConditionId_idx" ON "SalesOrder"("paymentConditionId");

-- CreateIndex
CREATE INDEX "SalesOrder_bankAccountId_idx" ON "SalesOrder"("bankAccountId");

-- CreateIndex
CREATE INDEX "SalesOrder_pdfEmissionId_idx" ON "SalesOrder"("pdfEmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_id_quoteId_key" ON "SalesOrder"("id", "quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_clientId_customerOrderKey_key" ON "SalesOrder"("clientId", "customerOrderKey");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "DocumentFolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_clientBranchId_clientId_fkey" FOREIGN KEY ("clientBranchId", "clientId") REFERENCES "ClientBranch"("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_paymentConditionId_fkey" FOREIGN KEY ("paymentConditionId") REFERENCES "PaymentCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_pdfEmissionId_fkey" FOREIGN KEY ("pdfEmissionId") REFERENCES "QuotePdfEmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderDetail" ADD CONSTRAINT "SalesOrderDetail_salesOrderId_quoteId_fkey" FOREIGN KEY ("salesOrderId", "quoteId") REFERENCES "SalesOrder"("id", "quoteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderDetail" ADD CONSTRAINT "SalesOrderDetail_quoteDetailId_quoteId_fkey" FOREIGN KEY ("quoteDetailId", "quoteId") REFERENCES "QuoteDetail"("id", "quoteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderOperation" ADD CONSTRAINT "SalesOrderOperation_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El original del cliente nunca se reemplaza por esta clave de identidad.
CREATE FUNCTION normalizar_referencia_orden_cliente(text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT upper(regexp_replace($1, '[[:space:]]+', '', 'g')) $$;

ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_document_values" CHECK (("folioId" IS NULL OR (
  "creationKey" IS NOT NULL AND version > 0 AND "quoteVersion" > 0 AND "approvedQuoteVersion" >= "quoteVersion" AND
  status IS NOT NULL AND "acceptanceDate" IS NOT NULL AND date = "acceptanceDate"::timestamp AND
  "clientId" IS NOT NULL AND "clientBranchId" IS NOT NULL AND length(trim("clientName")) > 0 AND length(trim("branchName")) > 0 AND
  jsonb_typeof("quoteSnapshot") = 'object' AND jsonb_typeof("clientSnapshot") = 'object' AND jsonb_typeof("companySnapshot") = 'object' AND
  "paymentConditionId" IS NOT NULL AND length(trim("paymentConditionName")) > 0 AND "paymentTermDays" >= 0 AND
  jsonb_typeof("technicalDescription") = 'object' AND "technicalDescription"->>'type' = 'doc' AND
  "subtotal" BETWEEN 0 AND 999999999999 AND "subtotal" = trunc("subtotal") AND
  "offeredSubtotal" BETWEEN 0 AND 999999999999 AND "offeredSubtotal" = trunc("offeredSubtotal") AND "subtotal" <= "offeredSubtotal" AND
  "offeredDiscountAmount" BETWEEN 0 AND "offeredSubtotal" AND "offeredDiscountAmount" = trunc("offeredDiscountAmount") AND
  "discountAmount" BETWEEN 0 AND "subtotal" AND "discountAmount" = trunc("discountAmount") AND
  "netAmount" BETWEEN 0 AND 999999999999 AND "netAmount" = trunc("netAmount") AND
  "vatAmount" BETWEEN 0 AND 999999999999 AND "vatAmount" = trunc("vatAmount") AND
  "totalAmount" BETWEEN 0 AND 999999999999 AND "totalAmount" = trunc("totalAmount") AND "vatRate" BETWEEN 0 AND 100 AND
  "totalAmount" = "subtotal" - "discountAmount" AND "netAmount" + "vatAmount" = "totalAmount" AND
  "netAmount" = round("totalAmount" / (1 + "vatRate" / 100), 0) AND
  (("discountMode" = 'SIN_DESCUENTO' AND "discountValue" IS NULL AND "discountAmount" = 0) OR
   ("discountMode" = 'PORCENTAJE' AND "discountValue" BETWEEN 0 AND 100 AND "discountAmount" = round("subtotal" * "discountValue" / 100, 0)) OR
   ("discountMode" = 'MONTO' AND "discountValue" = "discountAmount" AND "discountAmount" =
     CASE WHEN "offeredSubtotal" = 0 THEN 0 ELSE round("offeredDiscountAmount" * "subtotal" / "offeredSubtotal", 0) END)) AND
  ((status = 'CONFIRMADA' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR
   (status = 'ANULADA' AND "voidedAt" IS NOT NULL AND length(trim("voidReason")) > 0)) AND
  (("customerOrderNumber" IS NULL AND "customerOrderKey" IS NULL) OR
   ("customerOrderNumber" IS NOT NULL AND length("customerOrderKey") > 0 AND
    "customerOrderKey" = normalizar_referencia_orden_cliente("customerOrderNumber")))
)) IS TRUE);

ALTER TABLE "SalesOrderDetail" ADD CONSTRAINT "SalesOrderDetail_values" CHECK (
  position > 0 AND quantity > 0 AND quantity <= 99999999999.999 AND
  "unitPrice" BETWEEN 0 AND 999999999999 AND "unitPrice" = trunc("unitPrice") AND
  "lineAmount" BETWEEN 0 AND 999999999999 AND "lineAmount" = round(quantity * "unitPrice", 0) AND
  length(trim(description)) > 0 AND length(trim("unitName")) > 0
);
ALTER TABLE "SalesOrderOperation" ADD CONSTRAINT "SalesOrderOperation_values" CHECK (version > 0 AND fingerprint ~ '^[0-9a-f]{64}$');

CREATE FUNCTION proteger_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oferta record; tipo "DocumentNumberType"; clave uuid; cuenta record;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar órdenes y compromisos históricos'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF OLD."folioId" IS NULL THEN RAISE EXCEPTION 'Orden legada requiere conciliación manual'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','voidedAt','voidReason','version','updatedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','voidedAt','voidReason','version','updatedAt']) THEN
   RAISE EXCEPTION 'Contenido e identidad de orden confirmada inmutables'; END IF;
  IF OLD.status <> 'CONFIRMADA' OR NEW.status <> 'ANULADA' OR NEW.version <> OLD.version + 1 THEN
   RAISE EXCEPTION 'Sólo se permite anular una orden confirmada incrementando su versión'; END IF;
  IF EXISTS (SELECT 1 FROM "WorkOrder" WHERE "salesOrderId" = OLD.id) THEN RAISE EXCEPTION 'Orden con trabajo no anulable'; END IF;
  SELECT * INTO cuenta FROM "AccountReceivable" WHERE "salesOrderId" = OLD.id FOR UPDATE;
  IF cuenta.id IS NULL OR cuenta."dueDate" IS NOT NULL OR cuenta."paymentPromiseDate" IS NOT NULL OR
     EXISTS (SELECT 1 FROM "Payment" WHERE "accountReceivableId" = cuenta.id) THEN RAISE EXCEPTION 'Orden con hitos de cobranza no anulable'; END IF;
  RETURN NEW;
 END IF;
 IF NEW."folioId" IS NULL OR NEW."creationKey" IS NULL OR NEW.status IS DISTINCT FROM 'CONFIRMADA' OR NEW.version <> 1 THEN
  RAISE EXCEPTION 'Las nuevas órdenes requieren folio y contenido comercial completo'; END IF;
 SELECT * INTO oferta FROM "Quote" WHERE id = NEW."quoteId" FOR SHARE;
 IF oferta.status IS DISTINCT FROM 'APROBADA' OR oferta."deletedAt" IS NOT NULL OR oferta."folioId" IS NULL OR
    NEW."approvedQuoteVersion" IS DISTINCT FROM oferta.version OR
    NEW."quoteVersion" NOT IN (oferta.version, oferta.version - 1) OR
    NEW."acceptanceDate" < oferta.date OR NEW."acceptanceDate" > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN
  RAISE EXCEPTION 'Origen aprobado, revisión o fecha de aceptación inválidos'; END IF;
 IF NEW."clientId" IS DISTINCT FROM oferta."clientId" OR NEW."clientBranchId" IS DISTINCT FROM oferta."clientBranchId" OR
    NEW."clientName" IS DISTINCT FROM oferta."clientName" OR NEW."branchName" IS DISTINCT FROM oferta."branchName" OR
    NEW."paymentConditionId" IS DISTINCT FROM oferta."paymentConditionId" OR NEW."paymentConditionName" IS DISTINCT FROM oferta."paymentConditionName" OR
    NEW."paymentTermDays" IS DISTINCT FROM oferta."paymentTermDays" OR NEW."bankAccountId" IS DISTINCT FROM oferta."bankAccountId" OR
    NEW."companySnapshot" IS DISTINCT FROM oferta."companySnapshot" OR NEW."commercialTerms" IS DISTINCT FROM oferta."commercialTerms" OR
    NEW."vatRate" IS DISTINCT FROM oferta."vatRate" OR NEW."offeredSubtotal" IS DISTINCT FROM oferta.subtotal OR
    NEW."offeredDiscountAmount" IS DISTINCT FROM oferta."discountAmount" OR NEW."discountMode" IS DISTINCT FROM oferta."discountMode" OR
    (NEW."discountMode" = 'PORCENTAJE' AND NEW."discountValue" IS DISTINCT FROM oferta."discountValue") THEN
  RAISE EXCEPTION 'La orden debe conservar condiciones e importes de la oferta histórica'; END IF;
 IF NEW."clientSnapshot" IS DISTINCT FROM jsonb_build_object('rut', oferta."clientRut", 'name', oferta."clientName", 'contact', oferta."clientContact", 'phone', oferta."clientPhone", 'email', oferta."clientEmail", 'branchName', oferta."branchName", 'address', oferta."branchAddress", 'city', oferta."branchCity", 'branchContact', oferta."branchContact", 'branchPhone', oferta."branchPhone", 'branchEmail', oferta."branchEmail") OR
    NEW."bankSnapshot" IS DISTINCT FROM jsonb_build_object('name', oferta."bankName", 'type', oferta."bankAccountType", 'number', oferta."bankAccountNumber", 'holder', oferta."bankHolderName", 'rut', oferta."bankHolderRut", 'email', oferta."bankEmail") OR
    (NEW."quoteSnapshot"->'quote'->>'id')::integer IS DISTINCT FROM oferta.id OR
    (NEW."quoteSnapshot"->'quote'->>'version')::integer IS DISTINCT FROM NEW."quoteVersion" THEN
  RAISE EXCEPTION 'Copias históricas de la orden no coinciden con el origen'; END IF;
 IF NEW."pdfEmissionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "QuotePdfEmission" e
    WHERE e.id = NEW."pdfEmissionId" AND e."quoteId" = NEW."quoteId" AND e."quoteVersion" = NEW."quoteVersion") THEN
  RAISE EXCEPTION 'PDF ajeno a la revisión aceptada'; END IF;
 SELECT n.type, f."idempotencyKey" INTO tipo, clave FROM "DocumentFolio" f JOIN "DocumentNumbering" n ON n.id = f."numberingId" WHERE f.id = NEW."folioId";
 IF tipo IS DISTINCT FROM 'ORDEN_COMPRA_CLIENTE' OR clave IS DISTINCT FROM NEW."creationKey" THEN RAISE EXCEPTION 'Folio o clave de orden incorrectos'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "SalesOrder_protect" BEFORE INSERT OR UPDATE OR DELETE ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION proteger_orden_cliente();

CREATE FUNCTION proteger_detalle_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record; documento record; xid bigint;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Detalle contratado inmutable'; END IF;
 SELECT *, xmin::text::bigint AS xid INTO documento FROM "SalesOrder" WHERE id = NEW."salesOrderId";
 IF documento."folioId" IS NULL OR documento.status <> 'CONFIRMADA' OR documento.xid <> txid_current() % 4294967296 THEN
  RAISE EXCEPTION 'El detalle debe registrarse junto a la creación de su orden'; END IF;
 SELECT * INTO origen FROM "QuoteDetail" WHERE id = NEW."quoteDetailId" AND "quoteId" = NEW."quoteId";
 IF origen.id IS NULL OR NEW.quantity > origen.quantity OR NEW.kind IS DISTINCT FROM origen.kind OR
    NEW.position IS DISTINCT FROM origen.position OR NEW.description IS DISTINCT FROM origen.description OR
    NEW."unitPrice" IS DISTINCT FROM origen."unitPrice" OR NEW."unitMeasureId" IS DISTINCT FROM origen."unitMeasureId" OR
    NEW."unitName" IS DISTINCT FROM origen."unitName" OR NEW."unitAbbreviation" IS DISTINCT FROM origen."unitAbbreviation" OR
    NEW."rawMaterialId" IS DISTINCT FROM origen."rawMaterialId" OR NEW."productId" IS DISTINCT FROM origen."productId" OR
    NEW.code IS DISTINCT FROM coalesce(origen."productCode"::text, origen."rawMaterialCode") THEN
  RAISE EXCEPTION 'El detalle contratado debe corresponder a la línea ofrecida'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "SalesOrderDetail_protect" BEFORE INSERT OR UPDATE OR DELETE ON "SalesOrderDetail" FOR EACH ROW EXECUTE FUNCTION proteger_detalle_orden_cliente();
CREATE FUNCTION conservar_operacion_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Operaciones de órdenes inmutables'; END $$;
CREATE TRIGGER "SalesOrderOperation_keep" BEFORE UPDATE OR DELETE ON "SalesOrderOperation" FOR EACH ROW EXECUTE FUNCTION conservar_operacion_orden_cliente();

CREATE FUNCTION comprobar_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen integer; documento record; cuenta record; suma numeric; cantidad integer;
BEGIN
 IF TG_TABLE_NAME = 'SalesOrder' THEN origen := NEW.id;
 ELSIF TG_OP = 'DELETE' THEN origen := OLD."salesOrderId";
 ELSE origen := NEW."salesOrderId"; END IF;
 SELECT * INTO documento FROM "SalesOrder" WHERE id = origen;
 IF documento."folioId" IS NULL THEN RETURN NULL; END IF;
 SELECT count(*), sum("lineAmount") INTO cantidad, suma FROM "SalesOrderDetail" WHERE "salesOrderId" = origen;
 IF cantidad = 0 OR suma IS DISTINCT FROM documento.subtotal THEN RAISE EXCEPTION 'Orden requiere detalle y suma coherentes'; END IF;
 IF NOT EXISTS (SELECT 1 FROM "SalesOrderOperation" op WHERE op."salesOrderId" = origen AND op.version = documento.version AND
   ((documento.status = 'CONFIRMADA' AND op.type = 'CONFIRMAR' AND op."idempotencyKey" = documento."creationKey") OR
    (documento.status = 'ANULADA' AND op.type = 'ANULAR'))) THEN RAISE EXCEPTION 'Operación debe confirmar junto a la orden'; END IF;
 SELECT * INTO cuenta FROM "AccountReceivable" WHERE "salesOrderId" = origen;
 IF cuenta.id IS NULL OR cuenta.amount IS DISTINCT FROM documento."totalAmount" OR
    (documento.status = 'CONFIRMADA' AND cuenta."voidedAt" IS NOT NULL) OR
    (documento.status = 'ANULADA' AND (cuenta."voidedAt" IS DISTINCT FROM documento."voidedAt" OR cuenta."voidReason" IS DISTINCT FROM documento."voidReason")) THEN
  RAISE EXCEPTION 'Orden y cuenta deben conservar importe y anulación coherentes'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "SalesOrder_complete" AFTER INSERT OR UPDATE ON "SalesOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_orden_cliente();
CREATE CONSTRAINT TRIGGER "SalesOrderDetail_complete" AFTER INSERT OR UPDATE OR DELETE ON "SalesOrderDetail" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_orden_cliente();
CREATE CONSTRAINT TRIGGER "SalesOrderOperation_complete" AFTER INSERT ON "SalesOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_orden_cliente();
CREATE CONSTRAINT TRIGGER "AccountReceivable_order_complete" AFTER INSERT OR UPDATE OR DELETE ON "AccountReceivable" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_orden_cliente();

-- Coordinar futuros hitos con anulación incluso si otra herramienta escribe SQL.
CREATE FUNCTION proteger_trabajo_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento record;
BEGIN
 IF NEW."salesOrderId" IS NOT NULL THEN
  SELECT "folioId", status INTO documento FROM "SalesOrder" WHERE id = NEW."salesOrderId" FOR UPDATE;
  IF documento."folioId" IS NOT NULL AND documento.status <> 'CONFIRMADA' THEN RAISE EXCEPTION 'No crear trabajo sobre orden anulada'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrder_customer_order" BEFORE INSERT OR UPDATE OF "salesOrderId" ON "WorkOrder" FOR EACH ROW EXECUTE FUNCTION proteger_trabajo_orden_cliente();
CREATE FUNCTION proteger_abono_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cuenta record; folio integer;
BEGIN
 SELECT * INTO cuenta FROM "AccountReceivable" WHERE id = NEW."accountReceivableId" FOR UPDATE;
 SELECT "folioId" INTO folio FROM "SalesOrder" WHERE id = cuenta."salesOrderId";
 IF folio IS NOT NULL AND cuenta."voidedAt" IS NOT NULL THEN RAISE EXCEPTION 'No registrar abono sobre cuenta de orden anulada'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Payment_customer_order" BEFORE INSERT OR UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION proteger_abono_orden_cliente();
COMMIT;
