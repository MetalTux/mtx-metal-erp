BEGIN;
-- CreateTable
CREATE TABLE "WorkOrderPdfEmission" (
    "id" UUID NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "workOrderVersion" INTEGER NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "snapshotVersion" INTEGER NOT NULL,
    "status" "WorkOrderStatus" NOT NULL,
    "folio" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPdfEmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPdfRequest" (
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "emissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPdfRequest_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderPdfEmission_fileKey_key" ON "WorkOrderPdfEmission"("fileKey");

-- CreateIndex
CREATE INDEX "WorkOrderPdfEmission_workOrderId_createdAt_idx" ON "WorkOrderPdfEmission"("workOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderPdfEmission_workOrderId_workOrderVersion_templateV_key" ON "WorkOrderPdfEmission"("workOrderId", "workOrderVersion", "templateVersion");

-- CreateIndex
CREATE INDEX "WorkOrderPdfRequest_emissionId_idx" ON "WorkOrderPdfRequest"("emissionId");

-- AddForeignKey
ALTER TABLE "WorkOrderPdfEmission" ADD CONSTRAINT "WorkOrderPdfEmission_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPdfRequest" ADD CONSTRAINT "WorkOrderPdfRequest_emissionId_fkey" FOREIGN KEY ("emissionId") REFERENCES "WorkOrderPdfEmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Copia autocontenida: cantidades como texto decimal, fechas calendario e historia propia.
CREATE FUNCTION public.snapshot_pdf_trabajo(wid integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object(
 'plan',public.snapshot_plan_trabajo(wid),
 'folio',(SELECT to_jsonb(f)||jsonb_build_object('number',f.number::text) FROM "DocumentFolio" f WHERE f.id=w."folioId"),
 'company',coalesce(CASE WHEN w."salesOrderId" IS NOT NULL THEN (SELECT "companySnapshot" FROM "SalesOrder" WHERE id=w."salesOrderId") ELSE (SELECT to_jsonb(c) FROM "CompanyProfile" c WHERE id=1) END,'{}'::jsonb),
 'records',coalesce((SELECT jsonb_agg(to_jsonb(r)||jsonb_build_object('quantity',r.quantity::text) ORDER BY r.id) FROM "ProductionRecord" r WHERE r."workOrderId"=wid),'[]'::jsonb),
 'consumptions',coalesce((SELECT jsonb_agg(to_jsonb(c)||jsonb_build_object('quantity',c.quantity::text,'expectedQuantity',c."expectedQuantity"::text) ORDER BY c.id) FROM "ProductionConsumption" c JOIN "ProductionRecord" r ON r.id=c."productionRecordId" WHERE r."workOrderId"=wid),'[]'::jsonb),
 'outputs',coalesce((SELECT jsonb_agg(to_jsonb(o)||jsonb_build_object('quantity',o.quantity::text) ORDER BY o.id) FROM "ProductionOutput" o WHERE o."workOrderId"=wid),'[]'::jsonb),
 'reversals',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM "ProductionReversal" v WHERE v."workOrderId"=wid),'[]'::jsonb),
 'completion',(SELECT to_jsonb(c) FROM "WorkOrderCompletion" c WHERE c."workOrderId"=wid),
 'invoices',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.revision) FROM "WorkOrderInvoiceReference" f WHERE f."workOrderId"=wid),'[]'::jsonb),
 'reservations',public.snapshot_reservas_trabajo(wid),
 'warehouseNames',coalesce((SELECT jsonb_object_agg(b.id::text,b.name) FROM "Warehouse" b WHERE b.id IN (
 SELECT "warehouseId" FROM "WorkOrderDetail" WHERE "workOrderId"=wid UNION SELECT "warehouseId" FROM "WorkOrderSupplyPlan" WHERE "workOrderId"=wid UNION SELECT "warehouseId" FROM "ProductionOutput" WHERE "workOrderId"=wid UNION SELECT c."warehouseId" FROM "ProductionConsumption" c JOIN "ProductionRecord" r ON r.id=c."productionRecordId" WHERE r."workOrderId"=wid)),'{}'::jsonb)
 ) FROM "WorkOrder" w WHERE w.id=wid
$$;
ALTER TABLE "WorkOrderPdfEmission" ADD CONSTRAINT "WorkOrderPdfEmission_values" CHECK ((
 "workOrderVersion">0 AND "templateVersion">0 AND "snapshotVersion"=1 AND "fileSize">0 AND "fileSize"<=52428800 AND "fileHash" ~ '^[0-9a-f]{64}$' AND "fileKey"=id::text||'.pdf' AND btrim(folio)<>'' AND
 snapshot->>'schemaVersion'='1' AND snapshot->'documento'->>'version'="workOrderVersion"::text AND snapshot->'documento'->>'folio'=folio AND snapshot->'documento'->>'status'=status::text AND snapshot->'documento'->'origen'=snapshot->'origen' AND jsonb_typeof(snapshot->'recursos')='array') IS TRUE);
ALTER TABLE "WorkOrderPdfRequest" ADD CONSTRAINT "WorkOrderPdfRequest_values" CHECK (fingerprint ~ '^[0-9a-f]{64}$');
CREATE FUNCTION public.conservar_pdf_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Conservar emisiones PDF de OT y solicitudes inmutables'; END $$;
CREATE TRIGGER "WorkOrderPdfEmission_keep" BEFORE UPDATE OR DELETE ON "WorkOrderPdfEmission" FOR EACH ROW EXECUTE FUNCTION public.conservar_pdf_trabajo();
CREATE TRIGGER "WorkOrderPdfRequest_keep" BEFORE UPDATE OR DELETE ON "WorkOrderPdfRequest" FOR EACH ROW EXECUTE FUNCTION public.conservar_pdf_trabajo();
CREATE FUNCTION public.comprobar_pdf_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w "WorkOrder"; numero text;
BEGIN
 SELECT * INTO w FROM "WorkOrder" WHERE id=NEW."workOrderId" FOR SHARE;
 SELECT folio INTO numero FROM "DocumentFolio" WHERE id=w."folioId";
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w.version IS DISTINCT FROM NEW."workOrderVersion" OR w.status IS DISTINCT FROM NEW.status OR numero IS DISTINCT FROM NEW.folio OR NEW.snapshot->'origen' IS DISTINCT FROM public.snapshot_pdf_trabajo(w.id) THEN RAISE EXCEPTION 'PDF debe conservar origen completo y revisión actual de OT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderPdfEmission_origin" BEFORE INSERT ON "WorkOrderPdfEmission" FOR EACH ROW EXECUTE FUNCTION public.comprobar_pdf_trabajo();
CREATE FUNCTION public.completar_pdf_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM "WorkOrderPdfRequest" WHERE "emissionId"=NEW.id) THEN RAISE EXCEPTION 'PDF de OT requiere solicitud confirmada en la misma transacción'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "WorkOrderPdfEmission_complete" AFTER INSERT ON "WorkOrderPdfEmission" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.completar_pdf_trabajo();

COMMIT;
