BEGIN;
-- Las fechas pasan a calendario sólo tras comprobar que no hay documentos previos.
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Quote") OR EXISTS (SELECT 1 FROM "QuoteDetail") THEN RAISE EXCEPTION 'Revisar transición de cotizaciones existentes sin truncar fechas ni inventar snapshots'; END IF; END $$;
-- CreateEnum
CREATE TYPE "QuoteDiscountMode" AS ENUM ('SIN_DESCUENTO', 'PORCENTAJE', 'MONTO');

-- CreateEnum
CREATE TYPE "QuoteLineType" AS ENUM ('MATERIA_PRIMA', 'PRODUCTO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "QuoteOperationType" AS ENUM ('CREAR', 'EDITAR', 'APROBAR', 'RECHAZAR', 'ELIMINAR', 'CORREGIR');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientRut" TEXT,
ADD COLUMN     "clientContact" TEXT,
ADD COLUMN     "clientPhone" TEXT,
ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "companySnapshot" JSONB,
ADD COLUMN     "correctedQuoteId" INTEGER,
ADD COLUMN     "creationKey" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(14,2),
ADD COLUMN     "discountMode" "QuoteDiscountMode" NOT NULL DEFAULT 'SIN_DESCUENTO',
ADD COLUMN     "discountValue" DECIMAL(14,2),
ADD COLUMN     "folioId" INTEGER,
ADD COLUMN     "netAmount" DECIMAL(14,2),
ADD COLUMN     "subtotal" DECIMAL(14,2),
ADD COLUMN     "technicalDescription" JSONB,
ADD COLUMN     "vatAmount" DECIMAL(14,2),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "validUntil" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "QuoteDetail" ADD COLUMN     "kind" "QuoteLineType",
ADD COLUMN     "rawMaterialCode" TEXT,
ADD COLUMN     "lineAmount" DECIMAL(14,2),
ADD COLUMN     "position" INTEGER,
ADD COLUMN     "unitAbbreviation" TEXT,
ADD COLUMN     "unitMeasureId" INTEGER,
ADD COLUMN     "unitName" TEXT;

-- CreateTable
CREATE TABLE "QuoteOperation" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "type" "QuoteOperationType" NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteOperation_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateTable
CREATE TABLE "QuoteImageFile" (
    "id" UUID NOT NULL,
    "uploadKey" UUID NOT NULL,
    "draftKey" UUID NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteImageFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteImageLink" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "imageId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteImageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteOperation_quoteId_version_key" ON "QuoteOperation"("quoteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteImageFile_uploadKey_key" ON "QuoteImageFile"("uploadKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteImageFile_fileKey_key" ON "QuoteImageFile"("fileKey");

-- CreateIndex
CREATE INDEX "QuoteImageFile_draftKey_idx" ON "QuoteImageFile"("draftKey");

-- CreateIndex
CREATE INDEX "QuoteImageLink_imageId_idx" ON "QuoteImageLink"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteImageLink_quoteId_imageId_key" ON "QuoteImageLink"("quoteId", "imageId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_folioId_key" ON "Quote"("folioId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_creationKey_key" ON "Quote"("creationKey");

-- CreateIndex
CREATE INDEX "Quote_correctedQuoteId_idx" ON "Quote"("correctedQuoteId");

-- CreateIndex
CREATE INDEX "Quote_deletedAt_date_id_idx" ON "Quote"("deletedAt", "date", "id");

-- CreateIndex
CREATE INDEX "Quote_status_date_id_idx" ON "Quote"("status", "date", "id");

-- CreateIndex
CREATE INDEX "QuoteDetail_unitMeasureId_idx" ON "QuoteDetail"("unitMeasureId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteDetail_quoteId_position_key" ON "QuoteDetail"("quoteId", "position");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "DocumentFolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_correctedQuoteId_fkey" FOREIGN KEY ("correctedQuoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteDetail" ADD CONSTRAINT "QuoteDetail_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteOperation" ADD CONSTRAINT "QuoteOperation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteImageLink" ADD CONSTRAINT "QuoteImageLink_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteImageLink" ADD CONSTRAINT "QuoteImageLink_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "QuoteImageFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Los campos nullable preservan compatibilidad de los modelos previos. Un
-- documento comercial con folio debe tener la nueva estructura completa.
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
  "discountAmount" <= "subtotal" AND "totalAmount" = "subtotal" - "discountAmount" AND
  "netAmount" + "vatAmount" = "totalAmount" AND
  "netAmount" = round("totalAmount" / (1 + "vatRate" / 100), 0) AND
  (("discountMode" = 'SIN_DESCUENTO' AND "discountValue" IS NULL AND "discountAmount" = 0) OR
   ("discountMode" = 'MONTO' AND "discountValue" IS NOT NULL AND "discountValue" <> 'NaN'::numeric AND "discountValue" = trunc("discountValue") AND "discountValue" = "discountAmount") OR
   ("discountMode" = 'PORCENTAJE' AND "discountValue" IS NOT NULL AND "discountValue" <> 'NaN'::numeric AND "discountValue" BETWEEN 0 AND 100 AND "discountAmount" = round("subtotal" * "discountValue" / 100, 0)))
 ))
);
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_technical_json" CHECK (
 "technicalDescription" IS NULL OR (jsonb_typeof("technicalDescription") = 'object' AND ("technicalDescription"->>'type') IS NOT DISTINCT FROM 'doc')
);
ALTER TABLE "QuoteDetail" ADD CONSTRAINT "QuoteDetail_document_values" CHECK (
 "kind" IS NULL OR (
  "position" IS NOT NULL AND "position" > 0 AND "unitMeasureId" IS NOT NULL AND
  "unitName" IS NOT NULL AND length(trim("unitName")) > 0 AND "unitAbbreviation" IS NOT NULL AND
  length(trim(description)) > 0 AND quantity > 0 AND quantity <> 'NaN'::numeric AND
  "unitPrice" >= 0 AND "unitPrice" <> 'NaN'::numeric AND "unitPrice" = trunc("unitPrice") AND
  "lineAmount" IS NOT NULL AND "lineAmount" <> 'NaN'::numeric AND "lineAmount" = round(quantity * "unitPrice", 0) AND
  ((kind = 'MATERIA_PRIMA' AND "rawMaterialId" IS NOT NULL AND "rawMaterialCode" IS NOT NULL AND length(trim("rawMaterialCode")) > 0 AND "productId" IS NULL) OR
   (kind = 'PRODUCTO' AND "productId" IS NOT NULL AND "rawMaterialId" IS NULL) OR
   (kind = 'SERVICIO' AND "productId" IS NULL AND "rawMaterialId" IS NULL))
 )
);
ALTER TABLE "QuoteOperation" ADD CONSTRAINT "QuoteOperation_values" CHECK (version > 0 AND fingerprint ~ '^[0-9a-f]{64}$');
ALTER TABLE "QuoteImageFile" ADD CONSTRAINT "QuoteImageFile_values" CHECK (
 "fileKey" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$' AND fingerprint ~ '^[0-9a-f]{64}$'
);

CREATE FUNCTION proteger_documento_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo "DocumentNumberType"; clave uuid;
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF OLD."folioId" IS NOT NULL THEN RAISE EXCEPTION 'Conservar cotizacion mediante baja logica'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP = 'UPDATE' AND OLD."folioId" IS NOT NULL THEN
  IF NEW.id <> OLD.id OR NEW."folioId" IS DISTINCT FROM OLD."folioId" OR NEW."creationKey" IS DISTINCT FROM OLD."creationKey" OR NEW."correctedQuoteId" IS DISTINCT FROM OLD."correctedQuoteId" OR NEW."createdAt" <> OLD."createdAt"
  THEN RAISE EXCEPTION 'Identidad y origen de cotizacion inmutables'; END IF;
  IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'Incrementar version de cotizacion'; END IF;
  IF OLD.status <> 'PENDIENTE' OR OLD."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'Cotizacion terminal o eliminada inmutable'; END IF;
  IF EXISTS (SELECT 1 FROM "SalesOrder" WHERE "quoteId" = OLD.id) THEN RAISE EXCEPTION 'Cotizacion con orden de cliente protegida'; END IF;
  IF NEW."deletedAt" IS NOT NULL AND NEW.status <> 'PENDIENTE' THEN RAISE EXCEPTION 'Eliminar solo pendientes'; END IF;
  -- Resolver estados en operaciones separadas: no modificar contenido al aprobar/rechazar.
  IF NEW.status <> OLD.status AND (to_jsonb(NEW) - ARRAY['status','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','version','updatedAt'])
  THEN RAISE EXCEPTION 'Cambio de estado no modifica contenido'; END IF;
 END IF;
 IF NEW."folioId" IS NOT NULL THEN
  SELECT n.type, f."idempotencyKey" INTO tipo, clave FROM "DocumentFolio" f JOIN "DocumentNumbering" n ON n.id = f."numberingId" WHERE f.id = NEW."folioId";
  IF tipo IS DISTINCT FROM 'COTIZACION'::"DocumentNumberType" OR clave IS DISTINCT FROM NEW."creationKey" THEN RAISE EXCEPTION 'Folio debe corresponder a esta cotizacion'; END IF;
  IF NEW.date > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Fecha de cotizacion no puede ser futura'; END IF;
  IF NEW.status = 'APROBADA' AND NEW."validUntil" < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Cotizacion vencida no puede aprobarse'; END IF;
  IF TG_OP = 'INSERT' THEN
   IF NEW.status <> 'PENDIENTE' OR NEW.version <> 1 OR NEW."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'Crear cotizacion pendiente'; END IF;
   IF NEW."correctedQuoteId" IS NOT NULL THEN
    PERFORM id FROM "Quote" WHERE id = NEW."correctedQuoteId" AND status <> 'PENDIENTE' AND "deletedAt" IS NULL FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Correccion requiere original terminal'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Quote_document_protect" BEFORE INSERT OR UPDATE OR DELETE ON "Quote" FOR EACH ROW EXECUTE FUNCTION proteger_documento_cotizacion();

CREATE FUNCTION proteger_detalle_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento record; origen integer;
BEGIN
 IF TG_OP = 'UPDATE' AND NEW."quoteId" <> OLD."quoteId" THEN RAISE EXCEPTION 'Detalle no cambia de documento'; END IF;
 IF TG_OP = 'DELETE' THEN origen := OLD."quoteId"; ELSE origen := NEW."quoteId"; END IF;
 SELECT status, "deletedAt", "folioId" INTO documento FROM "Quote" WHERE id = origen FOR UPDATE;
 IF documento."folioId" IS NOT NULL THEN
  IF documento.status <> 'PENDIENTE' OR documento."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'Contenido de cotizacion terminal inmutable'; END IF;
  IF TG_OP <> 'DELETE' AND TG_TABLE_NAME = 'QuoteDetail' THEN
   IF NEW.kind IS NULL THEN RAISE EXCEPTION 'Detalle comercial requiere tipo/unidad/importe'; END IF;
   IF NEW.kind = 'MATERIA_PRIMA' AND NOT EXISTS (SELECT 1 FROM "RawMaterial" WHERE id = NEW."rawMaterialId" AND "unitMeasureId" = NEW."unitMeasureId") THEN RAISE EXCEPTION 'Unidad del material no coincide'; END IF;
   IF NEW.kind = 'PRODUCTO' AND NOT EXISTS (SELECT 1 FROM "Product" WHERE id = NEW."productId" AND "unitMeasureId" = NEW."unitMeasureId") THEN RAISE EXCEPTION 'Unidad del producto no coincide'; END IF;
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "QuoteDetail_document_protect" BEFORE INSERT OR UPDATE OR DELETE ON "QuoteDetail" FOR EACH ROW EXECUTE FUNCTION proteger_detalle_cotizacion();
CREATE TRIGGER "QuoteImageLink_document_protect" BEFORE INSERT OR UPDATE OR DELETE ON "QuoteImageLink" FOR EACH ROW EXECUTE FUNCTION proteger_detalle_cotizacion();

-- Cabecera, líneas y operación deben confirmar juntas; no se aceptan totales
-- inconsistentes aunque se escriba directamente mediante otro cliente SQL.
CREATE FUNCTION comprobar_documento_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen integer; documento record; cantidad integer; suma numeric;
BEGIN
 IF TG_TABLE_NAME = 'Quote' THEN origen := NEW.id;
 ELSIF TG_OP = 'DELETE' THEN origen := OLD."quoteId";
 ELSE origen := NEW."quoteId"; END IF;
 SELECT * INTO documento FROM "Quote" WHERE id = origen;
 IF documento."folioId" IS NULL THEN RETURN NULL; END IF;
 SELECT count(*), sum("lineAmount") INTO cantidad, suma FROM "QuoteDetail" WHERE "quoteId" = origen AND kind IS NOT NULL;
 IF cantidad = 0 OR suma IS DISTINCT FROM documento.subtotal OR cantidad <> (SELECT count(*) FROM "QuoteDetail" WHERE "quoteId" = origen) THEN RAISE EXCEPTION 'Cotizacion requiere detalles e importes coherentes'; END IF;
 IF NOT EXISTS (SELECT 1 FROM "QuoteOperation" WHERE "quoteId" = origen AND version = documento.version) THEN RAISE EXCEPTION 'Operacion de cotizacion debe confirmar junto al documento'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "Quote_document_complete" AFTER INSERT OR UPDATE ON "Quote" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_documento_cotizacion();
CREATE CONSTRAINT TRIGGER "QuoteDetail_document_complete" AFTER INSERT OR UPDATE OR DELETE ON "QuoteDetail" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_documento_cotizacion();
CREATE FUNCTION conservar_operacion_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Conservar operaciones y archivos de cotizaciones'; END $$;
CREATE TRIGGER "QuoteOperation_keep" BEFORE UPDATE OR DELETE ON "QuoteOperation" FOR EACH ROW EXECUTE FUNCTION conservar_operacion_cotizacion();
CREATE TRIGGER "QuoteImageFile_keep" BEFORE UPDATE OR DELETE ON "QuoteImageFile" FOR EACH ROW EXECUTE FUNCTION conservar_operacion_cotizacion();
COMMIT;
