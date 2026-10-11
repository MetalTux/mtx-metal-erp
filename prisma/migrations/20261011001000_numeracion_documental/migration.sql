-- CreateEnum
CREATE TYPE "DocumentNumberType" AS ENUM ('COTIZACION', 'ORDEN_COMPRA_CLIENTE', 'ORDEN_TRABAJO', 'GUIA_DESPACHO');

-- CreateTable
CREATE TABLE "DocumentNumbering" (
    "id" SERIAL NOT NULL,
    "type" "DocumentNumberType" NOT NULL,
    "prefix" VARCHAR(20) NOT NULL DEFAULT '',
    "padding" INTEGER,
    "nextNumber" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentNumbering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolio" (
    "id" SERIAL NOT NULL,
    "numberingId" INTEGER NOT NULL,
    "number" BIGINT NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "padding" INTEGER NOT NULL,
    "folio" VARCHAR(38) NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentNumbering_type_key" ON "DocumentNumbering"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolio_idempotencyKey_key" ON "DocumentFolio"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolio_numberingId_number_key" ON "DocumentFolio"("numberingId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolio_numberingId_folio_key" ON "DocumentFolio"("numberingId", "folio");

-- AddForeignKey
ALTER TABLE "DocumentFolio" ADD CONSTRAINT "DocumentFolio_numberingId_fkey" FOREIGN KEY ("numberingId") REFERENCES "DocumentNumbering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cuatro configuraciones fijas, sin inferir el primer folio de IDs o documentos ajenos.
INSERT INTO "DocumentNumbering" ("type", "updatedAt")
SELECT unnest(enum_range(NULL::"DocumentNumberType")), CURRENT_TIMESTAMP;
ALTER TABLE "DocumentNumbering" ADD CONSTRAINT "DocumentNumbering_valid_check" CHECK (
 "prefix" ~ '^[A-Za-z0-9._/-]*$' AND "version" > 0 AND
 (("padding" IS NULL AND "nextNumber" IS NULL) OR
 ("padding" IS NOT NULL AND "nextNumber" IS NOT NULL AND "padding" BETWEEN 1 AND 18 AND "nextNumber" BETWEEN 1 AND 1000000000000000000))
);
ALTER TABLE "DocumentFolio" ADD CONSTRAINT "DocumentFolio_valid_check" CHECK (
 "number" BETWEEN 1 AND 999999999999999999 AND "padding" BETWEEN 1 AND 18 AND
 "prefix" ~ '^[A-Za-z0-9._/-]*$' AND
 "folio" = "prefix" || lpad("number"::text, greatest("padding", length("number"::text)), '0')
);
CREATE FUNCTION proteger_configuracion_numeracion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Los tipos documentales son fijos'; END IF;
 IF NEW."type" <> OLD."type" OR NEW.id <> OLD.id THEN RAISE EXCEPTION 'El tipo documental es inmutable'; END IF;
 IF EXISTS (SELECT 1 FROM "DocumentFolio" WHERE "numberingId" = OLD.id) AND
 (NEW.prefix <> OLD.prefix OR NEW.padding IS DISTINCT FROM OLD.padding OR NEW."nextNumber" IS NULL OR NEW."nextNumber" < OLD."nextNumber")
 THEN RAISE EXCEPTION 'Formato utilizado bloqueado; no retroceder numeracion'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "DocumentNumbering_protect" BEFORE UPDATE OR DELETE ON "DocumentNumbering"
FOR EACH ROW EXECUTE FUNCTION proteger_configuracion_numeracion();
CREATE FUNCTION proteger_folio_documental() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE configuracion "DocumentNumbering";
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Los folios asignados son permanentes'; END IF;
 SELECT * INTO configuracion FROM "DocumentNumbering" WHERE id = NEW."numberingId" FOR UPDATE;
 IF configuracion."nextNumber" IS NULL OR NEW.number IS DISTINCT FROM configuracion."nextNumber"
 OR NEW.prefix <> configuracion.prefix OR NEW.padding IS DISTINCT FROM configuracion.padding
 THEN RAISE EXCEPTION 'El folio debe coincidir con la configuracion vigente'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "DocumentFolio_protect" BEFORE INSERT OR UPDATE OR DELETE ON "DocumentFolio"
FOR EACH ROW EXECUTE FUNCTION proteger_folio_documental();
-- Un INSERT externo tampoco puede confirmar un folio sin avanzar el contador.
CREATE FUNCTION comprobar_avance_numeracion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "DocumentNumbering" WHERE id = NEW."numberingId" AND "nextNumber" > NEW.number)
 THEN RAISE EXCEPTION 'La asignacion exige avanzar la secuencia en la misma transaccion'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "DocumentFolio_advance" AFTER INSERT ON "DocumentFolio"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_avance_numeracion();
