BEGIN;
CREATE TABLE "DeliveryNotePdfEmission" (
 "id" UUID PRIMARY KEY, "deliveryNoteId" INTEGER NOT NULL, "templateVersion" INTEGER NOT NULL,
 "snapshotVersion" INTEGER NOT NULL, "kind" "DeliveryNoteKind" NOT NULL, "folio" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "fileKey" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "fileHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "DeliveryNotePdfRequest" (
 "idempotencyKey" UUID PRIMARY KEY, "fingerprint" TEXT NOT NULL, "emissionId" UUID NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DeliveryNotePdfEmission_fileKey_key" ON "DeliveryNotePdfEmission"("fileKey");
CREATE UNIQUE INDEX "DeliveryNotePdfEmission_deliveryNoteId_templateVersion_key" ON "DeliveryNotePdfEmission"("deliveryNoteId","templateVersion");
CREATE INDEX "DeliveryNotePdfEmission_deliveryNoteId_createdAt_idx" ON "DeliveryNotePdfEmission"("deliveryNoteId","createdAt");
CREATE INDEX "DeliveryNotePdfRequest_emissionId_idx" ON "DeliveryNotePdfRequest"("emissionId");
ALTER TABLE "DeliveryNotePdfEmission" ADD CONSTRAINT "DeliveryNotePdfEmission_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryNotePdfRequest" ADD CONSTRAINT "DeliveryNotePdfRequest_emissionId_fkey" FOREIGN KEY ("emissionId") REFERENCES "DeliveryNotePdfEmission"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- Emisor, cliente, destino y partidas salen de la guía; nunca de mantenedores actuales.
-- Los nombres auxiliares de bodega se capturan al emitir y quedan archivados en esa emisión.
CREATE FUNCTION public.snapshot_pdf_guia(gid integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('header',to_jsonb(g),
 'folio',(SELECT folio FROM "DocumentFolio" WHERE id=g."folioId"),
 'workOrderFolio',(SELECT f.folio FROM "WorkOrder" w JOIN "DocumentFolio" f ON f.id=w."folioId" WHERE w.id=g."workOrderId"),
 'salesOrderFolio',(SELECT f.folio FROM "SalesOrder" s JOIN "DocumentFolio" f ON f.id=s."folioId" WHERE s.id=g."salesOrderId"),
 'originalFolio',(SELECT f.folio FROM "DeliveryNote" anterior JOIN "DocumentFolio" f ON f.id=anterior."folioId" WHERE anterior.id=g."correctsDeliveryNoteId"),
 'lines',coalesce((SELECT jsonb_agg(to_jsonb(l)||jsonb_build_object('quantity',l.quantity::text) ORDER BY l.position) FROM "DeliveryNoteLine" l WHERE l."deliveryNoteId"=g.id),'[]'::jsonb),
 'warehouseNames',coalesce((SELECT jsonb_object_agg(b.id::text,b.name) FROM "Warehouse" b WHERE b.id IN (SELECT "warehouseId" FROM "DeliveryNoteLine" WHERE "deliveryNoteId"=g.id)),'{}'::jsonb))
 FROM "DeliveryNote" g WHERE g.id=gid AND g."schemaVersion"=1
$$;
ALTER TABLE "DeliveryNotePdfEmission" ADD CONSTRAINT "DeliveryNotePdfEmission_values" CHECK ((
 "templateVersion">0 AND "snapshotVersion"=1 AND "fileSize">0 AND "fileSize"<=52428800 AND "fileHash" ~ '^[0-9a-f]{64}$' AND "fileKey"=id::text||'.pdf' AND btrim(folio)<>'' AND
 snapshot->>'schemaVersion'='1' AND snapshot->'documento'->>'folio'=folio AND snapshot->'documento'->>'kind'=kind::text AND
 snapshot->'documento'->'origen'=snapshot->'origen' AND jsonb_typeof(snapshot->'recursos')='array') IS TRUE);
ALTER TABLE "DeliveryNotePdfRequest" ADD CONSTRAINT "DeliveryNotePdfRequest_values" CHECK (fingerprint ~ '^[0-9a-f]{64}$');
CREATE FUNCTION public.conservar_pdf_guia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Conservar emisiones PDF de guía y solicitudes inmutables'; END $$;
CREATE TRIGGER "DeliveryNotePdfEmission_keep" BEFORE UPDATE OR DELETE ON "DeliveryNotePdfEmission" FOR EACH ROW EXECUTE FUNCTION public.conservar_pdf_guia();
CREATE TRIGGER "DeliveryNotePdfRequest_keep" BEFORE UPDATE OR DELETE ON "DeliveryNotePdfRequest" FOR EACH ROW EXECUTE FUNCTION public.conservar_pdf_guia();
CREATE FUNCTION public.comprobar_pdf_guia() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g "DeliveryNote"; origen jsonb;
BEGIN
 SELECT * INTO g FROM "DeliveryNote" WHERE id=NEW."deliveryNoteId" FOR SHARE;
 origen:=public.snapshot_pdf_guia(g.id);
 IF g."schemaVersion" IS DISTINCT FROM 1 OR g.kind IS DISTINCT FROM NEW.kind OR origen->>'folio' IS DISTINCT FROM NEW.folio OR
 NEW.snapshot->'origen' IS DISTINCT FROM origen OR NOT EXISTS(SELECT 1 FROM "DeliveryNoteLine" WHERE "deliveryNoteId"=g.id) THEN
  RAISE EXCEPTION 'PDF de guía exige origen completo y documento confirmado nuevo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "DeliveryNotePdfEmission_origin" BEFORE INSERT ON "DeliveryNotePdfEmission" FOR EACH ROW EXECUTE FUNCTION public.comprobar_pdf_guia();
CREATE FUNCTION public.completar_pdf_guia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "DeliveryNotePdfRequest" WHERE "emissionId"=NEW.id) THEN RAISE EXCEPTION 'PDF de guía requiere solicitud confirmada en la misma transacción'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "DeliveryNotePdfEmission_complete" AFTER INSERT ON "DeliveryNotePdfEmission" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.completar_pdf_guia();
COMMIT;
