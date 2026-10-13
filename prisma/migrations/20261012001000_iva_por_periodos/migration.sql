BEGIN;
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "vatRate" DECIMAL(7,4),
ADD COLUMN     "vatRatePeriodId" INTEGER;

-- CreateTable
CREATE TABLE "VatRatePeriod" (
    "id" SERIAL NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatRatePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VatRatePeriod_validFrom_idx" ON "VatRatePeriod"("validFrom");

-- CreateIndex
CREATE INDEX "Quote_vatRatePeriodId_idx" ON "Quote"("vatRatePeriodId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_vatRatePeriodId_fkey" FOREIGN KEY ("vatRatePeriodId") REFERENCES "VatRatePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hasta inclusiva, sin intersecciones, y exactamente un período abierto al confirmar.
ALTER TABLE "VatRatePeriod" ADD CONSTRAINT "VatRatePeriod_values" CHECK (
 rate >= 0 AND rate <= 100 AND rate <> 'NaN'::numeric AND version > 0 AND
 isfinite("validFrom") AND ("validTo" IS NULL OR (isfinite("validTo") AND "validTo" >= "validFrom"))
);
ALTER TABLE "VatRatePeriod" ADD CONSTRAINT "VatRatePeriod_no_overlap" EXCLUDE USING gist
 (daterange("validFrom", "validTo", '[]') WITH &&) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX "VatRatePeriod_one_open" ON "VatRatePeriod" ((true)) WHERE "validTo" IS NULL;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_vat_pair" CHECK (
 ("vatRatePeriodId" IS NULL AND "vatRate" IS NULL) OR
 ("vatRatePeriodId" IS NOT NULL AND "vatRate" IS NOT NULL AND "vatRate" >= 0 AND "vatRate" <= 100 AND "vatRate" <> 'NaN'::numeric)
);
CREATE FUNCTION proteger_periodo_iva() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- El guardado de documentos usa la variante compartida, antes de elegir/capturar la tasa.
 PERFORM pg_advisory_xact_lock(73119);
 IF TG_OP = 'UPDATE' THEN
  IF NEW.id <> OLD.id OR NEW.version <= OLD.version THEN RAISE EXCEPTION 'Conservar identidad e incrementar version del IVA'; END IF;
  IF EXISTS (SELECT 1 FROM "Quote" WHERE "vatRatePeriodId" = OLD.id) THEN
   IF NEW.rate <> OLD.rate OR NEW."validFrom" <> OLD."validFrom" THEN RAISE EXCEPTION 'Tasa y fecha desde bloqueadas por documentos'; END IF;
   IF EXISTS (SELECT 1 FROM "Quote" WHERE "vatRatePeriodId" = OLD.id AND (date::date < NEW."validFrom" OR (NEW."validTo" IS NOT NULL AND date::date > NEW."validTo")))
   THEN RAISE EXCEPTION 'El periodo debe cubrir todos sus documentos'; END IF;
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "VatRatePeriod_protect" BEFORE INSERT OR UPDATE OR DELETE ON "VatRatePeriod" FOR EACH ROW EXECUTE FUNCTION proteger_periodo_iva();
CREATE FUNCTION comprobar_periodo_iva_abierto() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT count(*) FROM "VatRatePeriod" WHERE "validTo" IS NULL) <> 1 THEN RAISE EXCEPTION 'Debe existir exactamente un periodo de IVA abierto'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "VatRatePeriod_open" AFTER INSERT OR UPDATE OR DELETE ON "VatRatePeriod" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_periodo_iva_abierto();
CREATE FUNCTION validar_iva_cotizacion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE periodo record;
BEGIN
 IF TG_OP = 'UPDATE' AND OLD."vatRatePeriodId" IS NOT NULL THEN
  IF NEW."vatRatePeriodId" IS NULL THEN RAISE EXCEPTION 'No retirar IVA de documento ya registrado'; END IF;
  IF OLD.status <> 'PENDIENTE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW."vatRatePeriodId" IS DISTINCT FROM OLD."vatRatePeriodId" OR NEW."vatRate" IS DISTINCT FROM OLD."vatRate" OR NEW.date IS DISTINCT FROM OLD.date)
  THEN RAISE EXCEPTION 'IVA y fecha de cotizacion terminal inmutables'; END IF;
 END IF;
 -- Cotizaciones previas sin IVA conocido conservan sus nulos; no inventar datos históricos.
 IF NEW."vatRatePeriodId" IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock_shared(73119);
 SELECT rate, "validFrom", "validTo" INTO periodo FROM "VatRatePeriod" WHERE id = NEW."vatRatePeriodId" FOR SHARE;
 IF NOT FOUND OR NEW."vatRate" IS DISTINCT FROM periodo.rate OR NEW.date::date < periodo."validFrom" OR (periodo."validTo" IS NOT NULL AND NEW.date::date > periodo."validTo")
 THEN RAISE EXCEPTION 'IVA copiado debe coincidir con periodo de la fecha del documento'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Quote_vat" BEFORE INSERT OR UPDATE ON "Quote" FOR EACH ROW EXECUTE FUNCTION validar_iva_cotizacion();

CREATE FUNCTION conservar_cotizacion_con_iva() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."vatRatePeriodId" IS NOT NULL THEN RAISE EXCEPTION 'Conservar cotizacion con IVA mediante eliminacion logica'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER "Quote_vat_keep" BEFORE DELETE ON "Quote" FOR EACH ROW EXECUTE FUNCTION conservar_cotizacion_con_iva();

-- Dato inicial explícito del usuario, conforme a Ley 19.888; no se configuran tasas anteriores.
INSERT INTO "VatRatePeriod" (rate, "validFrom", "validTo", "updatedAt") VALUES (19, DATE '2003-10-01', NULL, CURRENT_TIMESTAMP);
COMMIT;
