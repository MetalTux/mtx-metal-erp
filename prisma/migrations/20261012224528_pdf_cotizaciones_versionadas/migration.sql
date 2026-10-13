-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "commercialTerms" TEXT;

-- CreateTable
CREATE TABLE "QuotePdfEmission" (
    "id" UUID NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "quoteVersion" INTEGER NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "snapshotVersion" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL,
    "folio" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotePdfEmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotePdfRequest" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "emissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotePdfRequest_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotePdfEmission_fileKey_key" ON "QuotePdfEmission"("fileKey");

-- CreateIndex
CREATE INDEX "QuotePdfEmission_quoteId_createdAt_idx" ON "QuotePdfEmission"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuotePdfEmission_quoteId_quoteVersion_templateVersion_key" ON "QuotePdfEmission"("quoteId", "quoteVersion", "templateVersion");

-- CreateIndex
CREATE INDEX "QuotePdfRequest_emissionId_idx" ON "QuotePdfRequest"("emissionId");

-- AddForeignKey
ALTER TABLE "QuotePdfEmission" ADD CONSTRAINT "QuotePdfEmission_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotePdfRequest" ADD CONSTRAINT "QuotePdfRequest_emissionId_fkey" FOREIGN KEY ("emissionId") REFERENCES "QuotePdfEmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No rellenar condiciones históricas ni crear emisiones para documentos existentes.
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_commercial_terms" CHECK (
 "commercialTerms" IS NULL OR (length(btrim("commercialTerms")) > 0 AND length("commercialTerms") <= 5000)
);
ALTER TABLE "QuotePdfEmission" ADD CONSTRAINT "QuotePdfEmission_values" CHECK (
 "quoteVersion" > 0 AND "templateVersion" > 0 AND "snapshotVersion" = 1 AND
 "fileSize" > 0 AND "fileSize" <= 52428800 AND "fileHash" ~ '^[0-9a-f]{64}$' AND
 "fileKey" = id::text || '.pdf' AND length(btrim(folio)) > 0 AND
 jsonb_typeof(snapshot) = 'object' AND (snapshot->>'schemaVersion') IS NOT DISTINCT FROM '1' AND
 (snapshot->'documento'->>'version') IS NOT DISTINCT FROM "quoteVersion"::text AND
 (snapshot->'documento'->>'status') IS NOT DISTINCT FROM status::text AND
 (snapshot->'documento'->>'folio') IS NOT DISTINCT FROM folio AND
 jsonb_typeof(snapshot->'origen') IS NOT DISTINCT FROM 'object'
);
ALTER TABLE "QuotePdfRequest" ADD CONSTRAINT "QuotePdfRequest_fingerprint" CHECK (fingerprint ~ '^[0-9a-f]{64}$');
CREATE FUNCTION conservar_emision_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Las emisiones PDF y sus solicitudes son inmutables; conservar el historial'; END $$;
CREATE TRIGGER "QuotePdfEmission_keep" BEFORE UPDATE OR DELETE ON "QuotePdfEmission" FOR EACH ROW EXECUTE FUNCTION conservar_emision_cotizacion();
CREATE TRIGGER "QuotePdfRequest_keep" BEFORE UPDATE OR DELETE ON "QuotePdfRequest" FOR EACH ROW EXECUTE FUNCTION conservar_emision_cotizacion();
-- Una emisión nueva sólo representa la revisión confirmada; descargar conserva la antigua.
CREATE FUNCTION comprobar_emision_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento RECORD; numero TEXT;
BEGIN
 SELECT "version", status, "folioId", "deletedAt" INTO documento FROM "Quote" WHERE id = NEW."quoteId" FOR SHARE;
 SELECT folio INTO numero FROM "DocumentFolio" WHERE id = documento."folioId";
 IF documento.version IS DISTINCT FROM NEW."quoteVersion" OR documento.status IS DISTINCT FROM NEW.status OR documento."deletedAt" IS NOT NULL OR numero IS DISTINCT FROM NEW.folio THEN
  RAISE EXCEPTION 'La emision debe representar la revision actual de la cotizacion';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "QuotePdfEmission_origin" BEFORE INSERT ON "QuotePdfEmission" FOR EACH ROW EXECUTE FUNCTION comprobar_emision_cotizacion();
CREATE FUNCTION comprobar_solicitud_emision_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "QuotePdfRequest" WHERE "emissionId" = NEW.id) THEN RAISE EXCEPTION 'La solicitud debe confirmar junto a la emision'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "QuotePdfEmission_complete" AFTER INSERT ON "QuotePdfEmission" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_solicitud_emision_cotizacion();
