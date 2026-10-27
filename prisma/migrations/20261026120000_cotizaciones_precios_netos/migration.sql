-- Los documentos existentes conservan su modalidad e importes. No hay recálculo ni UPDATE.
BEGIN;
ALTER TABLE "Quote" ADD COLUMN "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SalesOrder" ADD COLUMN "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_document_values";
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_document_values" CHECK (
 version > 0 AND isfinite(date) AND ("validUntil" IS NULL OR (isfinite("validUntil") AND "validUntil" >= date)) AND
 ("folioId" IS NULL OR (
  "creationKey" IS NOT NULL AND "clientName" IS NOT NULL AND length(trim("clientName")) > 0 AND "clientRut" IS NOT NULL AND
  "clientBranchId" IS NOT NULL AND "paymentConditionId" IS NOT NULL AND "vatRatePeriodId" IS NOT NULL AND
  "companySnapshot" IS NOT NULL AND jsonb_typeof("companySnapshot") = 'object' AND
  "subtotal" IS NOT NULL AND "discountAmount" IS NOT NULL AND "netAmount" IS NOT NULL AND "vatAmount" IS NOT NULL AND
  "subtotal" >= 0 AND "subtotal" <> 'NaN'::numeric AND "subtotal" = trunc("subtotal") AND
  "discountAmount" >= 0 AND "discountAmount" <> 'NaN'::numeric AND "discountAmount" = trunc("discountAmount") AND
  "netAmount" >= 0 AND "netAmount" <> 'NaN'::numeric AND "netAmount" = trunc("netAmount") AND
  "vatAmount" >= 0 AND "vatAmount" <> 'NaN'::numeric AND "vatAmount" = trunc("vatAmount") AND
  "totalAmount" >= 0 AND "totalAmount" <> 'NaN'::numeric AND "totalAmount" = trunc("totalAmount") AND
  "discountAmount" <= "subtotal" AND (("pricesIncludeVat" AND "totalAmount" = "subtotal" - "discountAmount" AND
    "netAmount" = round("totalAmount" / (1 + "vatRate" / 100), 0)) OR
   (NOT "pricesIncludeVat" AND "netAmount" = "subtotal" - "discountAmount" AND
    "vatAmount" = round("netAmount" * "vatRate" / 100, 0))) AND
  "netAmount" + "vatAmount" = "totalAmount" AND
  (("discountMode" = 'SIN_DESCUENTO' AND "discountValue" IS NULL AND "discountAmount" = 0) OR
   ("discountMode" = 'MONTO' AND "discountValue" IS NOT NULL AND "discountValue" <> 'NaN'::numeric AND "discountValue" = trunc("discountValue") AND "discountValue" = "discountAmount") OR
   ("discountMode" = 'PORCENTAJE' AND "discountValue" IS NOT NULL AND "discountValue" <> 'NaN'::numeric AND "discountValue" BETWEEN 0 AND 100 AND "discountAmount" = round("subtotal" * "discountValue" / 100, 0)))
 ))
);
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_document_values";
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
  (("pricesIncludeVat" AND "totalAmount" = "subtotal" - "discountAmount" AND
    "netAmount" = round("totalAmount" / (1 + "vatRate" / 100), 0)) OR
   (NOT "pricesIncludeVat" AND "netAmount" = "subtotal" - "discountAmount" AND
    "vatAmount" = round("netAmount" * "vatRate" / 100, 0))) AND "netAmount" + "vatAmount" = "totalAmount" AND
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

CREATE FUNCTION proteger_modalidad_precios() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND NEW."pricesIncludeVat" IS DISTINCT FROM OLD."pricesIncludeVat" THEN
  RAISE EXCEPTION 'La modalidad histórica de precios es inmutable';
 END IF;
 IF TG_TABLE_NAME = 'SalesOrder' AND TG_OP = 'INSERT' THEN
  IF NEW."pricesIncludeVat" IS DISTINCT FROM (SELECT "pricesIncludeVat" FROM "Quote" WHERE id = NEW."quoteId") THEN
   RAISE EXCEPTION 'La orden debe conservar la modalidad de precios de su cotización';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Quote_price_mode" BEFORE UPDATE ON "Quote" FOR EACH ROW EXECUTE FUNCTION proteger_modalidad_precios();
CREATE TRIGGER "SalesOrder_price_mode" BEFORE INSERT OR UPDATE ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION proteger_modalidad_precios();
COMMIT;
