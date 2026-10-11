BEGIN;
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "bankAccountId" INTEGER,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankAccountType" TEXT,
ADD COLUMN     "bankEmail" TEXT,
ADD COLUMN     "bankHolderName" TEXT,
ADD COLUMN     "bankHolderRut" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "CompanyBankAccount" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL DEFAULT 1,
    "bankName" VARCHAR(100) NOT NULL,
    "accountType" VARCHAR(100) NOT NULL,
    "accountNumber" VARCHAR(60) NOT NULL,
    "holderName" VARCHAR(150) NOT NULL,
    "holderRut" VARCHAR(20) NOT NULL,
    "email" VARCHAR(254),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyBankAccount_companyId_idx" ON "CompanyBankAccount"("companyId");

-- CreateIndex
CREATE INDEX "Quote_bankAccountId_idx" ON "Quote"("bankAccountId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "CompanyBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verificar también el dígito del RUT normalizado ante escrituras externas.
CREATE FUNCTION rut_bancario_valido(valor text) RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE cuerpo text; suma int := 0; factor int := 2; resultado int; dv text; i int;
BEGIN
 IF valor !~ '^[1-9][0-9]{0,7}-[0-9K]$' THEN RETURN false; END IF;
 cuerpo := split_part(valor, '-', 1);
 FOR i IN REVERSE length(cuerpo)..1 LOOP
  suma := suma + substring(cuerpo, i, 1)::int * factor;
  factor := CASE WHEN factor = 7 THEN 2 ELSE factor + 1 END;
 END LOOP;
 resultado := 11 - suma % 11;
 dv := CASE WHEN resultado = 11 THEN '0' WHEN resultado = 10 THEN 'K' ELSE resultado::text END;
 RETURN split_part(valor, '-', 2) = dv;
END $$;
ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_valid_check" CHECK (
 "companyId" = 1 AND version > 0 AND btrim("bankName") <> '' AND btrim("accountType") <> ''
 AND btrim("accountNumber") <> '' AND btrim("holderName") <> '' AND rut_bancario_valido("holderRut")
 AND (email IS NULL OR btrim(email) <> '') AND (NOT "isPrimary" OR "isActive")
);
CREATE UNIQUE INDEX "CompanyBankAccount_identity_key" ON "CompanyBankAccount"
 ("companyId", lower(btrim("bankName")), lower(btrim("accountType")), lower(btrim("accountNumber")));
CREATE UNIQUE INDEX "CompanyBankAccount_primary_key" ON "CompanyBankAccount" ("companyId") WHERE "isPrimary";
CREATE FUNCTION bloquear_cuentas_empresa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Las cuentas se desactivan; conservar historial'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.id <> OLD.id OR NEW."companyId" <> OLD."companyId")
 THEN RAISE EXCEPTION 'La identidad y empresa de la cuenta son inmutables'; END IF;
 PERFORM id FROM "CompanyProfile" WHERE id = NEW."companyId" FOR UPDATE;
 RETURN NEW;
END $$;
CREATE TRIGGER "CompanyBankAccount_lock" BEFORE INSERT OR UPDATE OR DELETE ON "CompanyBankAccount"
FOR EACH ROW EXECUTE FUNCTION bloquear_cuentas_empresa();
CREATE FUNCTION comprobar_principal_empresa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "CompanyBankAccount" WHERE "companyId" = NEW."companyId")
 AND (SELECT count(*) FROM "CompanyBankAccount" WHERE "companyId" = NEW."companyId" AND "isPrimary" AND "isActive") <> 1
 THEN RAISE EXCEPTION 'Debe existir una cuenta principal activa'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "CompanyBankAccount_primary_required" AFTER INSERT OR UPDATE ON "CompanyBankAccount"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_principal_empresa();
-- Cotizaciones anteriores permanecen sin datos inferidos. Un vínculo nuevo exige snapshot.
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_bank_snapshot_check" CHECK (
 ("bankAccountId" IS NULL AND "bankName" IS NULL AND "bankAccountType" IS NULL AND "bankAccountNumber" IS NULL
 AND "bankHolderName" IS NULL AND "bankHolderRut" IS NULL AND "bankEmail" IS NULL)
 OR ("bankAccountId" IS NOT NULL AND coalesce(btrim("bankName"), '') <> ''
 AND coalesce(btrim("bankAccountType"), '') <> '' AND coalesce(btrim("bankAccountNumber"), '') <> ''
 AND coalesce(btrim("bankHolderName"), '') <> '' AND coalesce(rut_bancario_valido("bankHolderRut"), false)
 AND ("bankEmail" IS NULL OR btrim("bankEmail") <> ''))
);
COMMIT;
