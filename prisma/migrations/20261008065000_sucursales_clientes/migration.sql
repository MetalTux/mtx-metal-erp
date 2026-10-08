BEGIN;
-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "branchAddress" TEXT,
ADD COLUMN     "branchCity" TEXT,
ADD COLUMN     "branchContact" TEXT,
ADD COLUMN     "branchEmail" TEXT,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "branchPhone" TEXT,
ADD COLUMN     "clientBranchId" INTEGER;

-- CreateTable
CREATE TABLE "ClientBranch" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isHeadOffice" BOOLEAN NOT NULL DEFAULT false,
    "legacyIncomplete" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "city" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientBranch_clientId_idx" ON "ClientBranch"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientBranch_id_clientId_key" ON "ClientBranch"("id", "clientId");

-- CreateIndex
CREATE INDEX "Quote_clientBranchId_clientId_idx" ON "Quote"("clientBranchId", "clientId");

-- AddForeignKey
ALTER TABLE "ClientBranch" ADD CONSTRAINT "ClientBranch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientBranchId_clientId_fkey" FOREIGN KEY ("clientBranchId", "clientId") REFERENCES "ClientBranch"("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX "ClientBranch_name_key" ON "ClientBranch" ("clientId", lower(btrim("name")));
CREATE UNIQUE INDEX "ClientBranch_head_office_key" ON "ClientBranch" ("clientId") WHERE "isHeadOffice";
ALTER TABLE "ClientBranch" ADD CONSTRAINT "ClientBranch_data_check" CHECK (
 length(btrim("name")) BETWEEN 1 AND 150 AND (NOT "isHeadOffice" OR "name" = 'Casa Central')
 AND ("legacyIncomplete" OR (
   "address" IS NOT NULL AND length(btrim("address")) BETWEEN 1 AND 250
   AND "city" IS NOT NULL AND length(btrim("city")) BETWEEN 1 AND 100
   AND "contact" IS NOT NULL AND length(btrim("contact")) BETWEEN 1 AND 150
   AND "phone" IS NOT NULL AND length(btrim("phone")) BETWEEN 1 AND 40
 ))
);
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_branch_snapshot_check" CHECK (
 "clientBranchId" IS NULL OR (
   "branchName" IS NOT NULL AND length(btrim("branchName")) > 0
   AND "branchAddress" IS NOT NULL AND length(btrim("branchAddress")) > 0
   AND "branchCity" IS NOT NULL AND length(btrim("branchCity")) > 0
   AND "branchContact" IS NOT NULL AND length(btrim("branchContact")) > 0
   AND "branchPhone" IS NOT NULL AND length(btrim("branchPhone")) > 0
 )
);

-- Conservar contactos y datos faltantes de clientes históricos sin inventar direcciones.
INSERT INTO "ClientBranch" ("clientId", "name", "isHeadOffice", "legacyIncomplete", "contact", "phone", "email", "updatedAt")
 SELECT id, 'Casa Central', true, true, contact, phone, email, CURRENT_TIMESTAMP FROM "Client";

-- Al guardar/quitar sucursales, se comprueba el resultado completo al confirmar la transacción.
-- Los clientes heredados/insertados por herramientas externas se completan mediante el CRUD.
CREATE FUNCTION "verificarCasaCentralCliente"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid integer; ids integer[];
BEGIN
 IF TG_OP = 'INSERT' THEN ids := ARRAY[NEW."clientId"];
 ELSIF TG_OP = 'DELETE' THEN ids := ARRAY[OLD."clientId"];
 ELSE ids := ARRAY[OLD."clientId", NEW."clientId"]; END IF;
 FOREACH cid IN ARRAY ids LOOP
   IF EXISTS (SELECT 1 FROM "Client" WHERE id = cid)
      AND (SELECT count(*) FROM "ClientBranch" WHERE "clientId" = cid AND "isHeadOffice") <> 1 THEN
     RAISE EXCEPTION 'El cliente debe conservar una Casa Central' USING ERRCODE = '23514';
   END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ClientBranch_head_office_required"
 AFTER INSERT OR UPDATE OR DELETE ON "ClientBranch" DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION "verificarCasaCentralCliente"();
COMMIT;
