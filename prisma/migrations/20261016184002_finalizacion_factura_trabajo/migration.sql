/*
  Warnings:

  - A unique constraint covering the columns `[currentInvoiceReferenceId]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[currentInvoiceReferenceId,id]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[completionId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceReferenceId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[completionId,workOrderId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceReferenceId,workOrderId]` on the table `WorkOrderOperation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderOperationType" ADD VALUE 'FINALIZAR';
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'REGISTRAR_FACTURA';
ALTER TYPE "WorkOrderOperationType" ADD VALUE 'CORREGIR_FACTURA';

BEGIN;
-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "currentInvoiceReferenceId" INTEGER;

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "completionId" INTEGER,
ADD COLUMN     "invoiceReferenceId" INTEGER;

-- CreateTable
CREATE TABLE "WorkOrderCompletion" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" VARCHAR(1000) NOT NULL,
    "preparationConfirmed" BOOLEAN NOT NULL,
    "progressSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderInvoiceIdentity" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "issuerRut" VARCHAR(12) NOT NULL,
    "invoiceNumber" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderInvoiceIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderInvoiceReference" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "identityId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "issuerRut" VARCHAR(12) NOT NULL,
    "invoiceNumber" VARCHAR(150) NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "paymentTermDays" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "replacesInvoiceReferenceId" INTEGER,
    "correctionReason" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderInvoiceReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderCompletion_workOrderId_key" ON "WorkOrderCompletion"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderCompletion_id_workOrderId_key" ON "WorkOrderCompletion"("id", "workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderInvoiceIdentity_workOrderId_idx" ON "WorkOrderInvoiceIdentity"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceIdentity_issuerRut_invoiceNumber_key" ON "WorkOrderInvoiceIdentity"("issuerRut", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceIdentity_id_workOrderId_key" ON "WorkOrderInvoiceIdentity"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceReference_replacesInvoiceReferenceId_key" ON "WorkOrderInvoiceReference"("replacesInvoiceReferenceId");

-- CreateIndex
CREATE INDEX "WorkOrderInvoiceReference_identityId_workOrderId_idx" ON "WorkOrderInvoiceReference"("identityId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceReference_replacesInvoiceReferenceId_workOr_key" ON "WorkOrderInvoiceReference"("replacesInvoiceReferenceId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceReference_id_workOrderId_key" ON "WorkOrderInvoiceReference"("id", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInvoiceReference_workOrderId_revision_key" ON "WorkOrderInvoiceReference"("workOrderId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_currentInvoiceReferenceId_key" ON "WorkOrder"("currentInvoiceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_currentInvoiceReferenceId_id_key" ON "WorkOrder"("currentInvoiceReferenceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_completionId_key" ON "WorkOrderOperation"("completionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_invoiceReferenceId_key" ON "WorkOrderOperation"("invoiceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_completionId_workOrderId_key" ON "WorkOrderOperation"("completionId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderOperation_invoiceReferenceId_workOrderId_key" ON "WorkOrderOperation"("invoiceReferenceId", "workOrderId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_currentInvoiceReferenceId_id_fkey" FOREIGN KEY ("currentInvoiceReferenceId", "id") REFERENCES "WorkOrderInvoiceReference"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_completionId_workOrderId_fkey" FOREIGN KEY ("completionId", "workOrderId") REFERENCES "WorkOrderCompletion"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_invoiceReferenceId_workOrderId_fkey" FOREIGN KEY ("invoiceReferenceId", "workOrderId") REFERENCES "WorkOrderInvoiceReference"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCompletion" ADD CONSTRAINT "WorkOrderCompletion_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderInvoiceIdentity" ADD CONSTRAINT "WorkOrderInvoiceIdentity_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderInvoiceReference" ADD CONSTRAINT "WorkOrderInvoiceReference_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderInvoiceReference" ADD CONSTRAINT "WorkOrderInvoiceReference_identityId_workOrderId_fkey" FOREIGN KEY ("identityId", "workOrderId") REFERENCES "WorkOrderInvoiceIdentity"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderInvoiceReference" ADD CONSTRAINT "WorkOrderInvoiceReference_replacesInvoiceReferenceId_workO_fkey" FOREIGN KEY ("replacesInvoiceReferenceId", "workOrderId") REFERENCES "WorkOrderInvoiceReference"("id", "workOrderId") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE OR REPLACE FUNCTION proteger_cabecera_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o record; f record; copia record; q integer;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar trabajo, folio y vínculo histórico'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF OLD."schemaVersion" IS NULL THEN RAISE EXCEPTION 'Trabajo legado requiere conciliación manual'; END IF;
  IF (OLD.status::text='EN_PROCESO' AND NEW.status::text='FINALIZADO') OR (OLD.status::text='FINALIZADO' AND NEW.status::text='FINALIZADO') THEN
   IF NEW.version<>OLD.version+1 OR
     (to_jsonb(NEW)-ARRAY['status','version','updatedAt','currentInvoiceReferenceId']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','version','updatedAt','currentInvoiceReferenceId']) OR
     (OLD.status::text='EN_PROCESO' AND NEW."currentInvoiceReferenceId" IS DISTINCT FROM OLD."currentInvoiceReferenceId") THEN
    RAISE EXCEPTION 'Cierre/factura sólo cambian estado o referencia vigente y versión'; END IF;
   RETURN NEW;
  END IF;
  IF OLD.status::text='PENDIENTE' AND NEW.status::text='EN_PROCESO' THEN
   IF NEW.version<>OLD.version+1 OR
      (to_jsonb(NEW)-ARRAY['status','startedDate','version','updatedAt']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['status','startedDate','version','updatedAt']) THEN
    RAISE EXCEPTION 'Iniciar sólo cambia estado, fecha de inicio y versión'; END IF;
   IF NEW."startedDate" IS NULL OR NEW."startedDate"<NEW.date OR
      NEW."startedDate">(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN
    RAISE EXCEPTION 'Fecha de inicio debe estar entre fecha de OT y hoy en Santiago'; END IF;
   IF (SELECT "planConfirmed" FROM "WorkOrderOperation" WHERE "workOrderId"=OLD.id AND type::text IN ('CREAR','EDITAR_PLAN') ORDER BY version DESC LIMIT 1) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Iniciar requiere plan confirmado y distribución revisada'; END IF;
   RETURN NEW;
  END IF;
  IF OLD.status::text='EN_PROCESO' AND NEW.status::text='EN_PROCESO' THEN
   IF NEW.version<>OLD.version+1 OR
      (to_jsonb(NEW)-ARRAY['version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['version','updatedAt']) THEN
    RAISE EXCEPTION 'Plan y fecha de inicio quedan fijos al iniciar; sólo operaciones de reservas habilitadas'; END IF;
   RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - ARRAY['productName','description','internalInstructions','ownPurpose','targetDate','status','voidedAt','voidReason','version','updatedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['productName','description','internalInstructions','ownPurpose','targetDate','status','voidedAt','voidReason','version','updatedAt']) THEN
   RAISE EXCEPTION 'Identidad, origen, alcance y fecha de trabajo inmutables'; END IF;
  IF OLD.status::text <> 'PENDIENTE' OR NEW.version <> OLD.version + 1 OR NEW.status::text NOT IN ('PENDIENTE','ANULADO') THEN
   RAISE EXCEPTION 'Transición no habilitada; conservar estado y contrato del trabajo'; END IF;
  IF NEW.status::text = 'ANULADO' AND (NEW."salesOrderId" IS NOT NULL OR OLD."startedDate" IS NOT NULL OR EXISTS(
    SELECT 1 FROM "WorkOrderDetail" d JOIN "StockMovement" m ON m."workOrderDetailId"=d.id WHERE d."workOrderId"=OLD.id)) THEN
   RAISE EXCEPTION 'Sólo obra propia sin ejecución puede anularse'; END IF;
  RETURN NEW;
 END IF;
 IF NEW."currentInvoiceReferenceId" IS NOT NULL THEN RAISE EXCEPTION 'Nueva OT no admite factura'; END IF;
 IF NEW."schemaVersion" IS DISTINCT FROM 1 OR NEW.version <> 1 OR NEW.status::text <> 'PENDIENTE' OR NEW."startedDate" IS NOT NULL THEN
  RAISE EXCEPTION 'Trabajo nuevo requiere contrato completo y estado pendiente'; END IF;
 IF NEW."date" > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date THEN RAISE EXCEPTION 'Fecha de trabajo no puede ser futura'; END IF;
 SELECT n.type,df."idempotencyKey" INTO f FROM "DocumentFolio" df JOIN "DocumentNumbering" n ON n.id=df."numberingId" WHERE df.id=NEW."folioId";
 IF f.type IS DISTINCT FROM 'ORDEN_TRABAJO' OR f."idempotencyKey" IS DISTINCT FROM NEW."creationKey" THEN RAISE EXCEPTION 'Folio o UUID incorrectos para trabajo'; END IF;
 IF NEW."salesOrderId" IS NOT NULL THEN
  SELECT "quoteId" INTO q FROM "SalesOrder" WHERE id=NEW."salesOrderId";
  PERFORM id FROM "Quote" WHERE id=q FOR UPDATE;
  SELECT * INTO o FROM "SalesOrder" WHERE id=NEW."salesOrderId" FOR UPDATE;
  IF o."folioId" IS NULL OR o.status::text IS DISTINCT FROM 'CONFIRMADA' OR NEW."salesOrderVersion" IS DISTINCT FROM o.version OR NEW."date" < o."acceptanceDate" THEN
   RAISE EXCEPTION 'Trabajo requiere orden confirmada, revisión actual y fecha compatible'; END IF;
  IF NEW."technicalDescription" IS DISTINCT FROM o."technicalDescription" OR (NEW."sourceSnapshot"->>'schemaVersion') IS DISTINCT FROM '1' OR
     jsonb_typeof(NEW."sourceSnapshot"->'order') IS DISTINCT FROM 'object' OR jsonb_typeof(NEW."sourceSnapshot"->'details') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Alcance y copia comercial de trabajo inválidos'; END IF;
  SELECT * INTO copia FROM jsonb_populate_record(NULL::"SalesOrder",NEW."sourceSnapshot"->'order');
  IF to_jsonb(copia) IS DISTINCT FROM to_jsonb(o) OR
     jsonb_array_length(NEW."sourceSnapshot"->'details') <> (SELECT count(*) FROM "SalesOrderDetail" WHERE "salesOrderId"=o.id) OR
     EXISTS(SELECT 1 FROM "SalesOrderDetail" d WHERE d."salesOrderId"=o.id AND NOT EXISTS(
       SELECT 1 FROM jsonb_populate_recordset(NULL::"SalesOrderDetail",NEW."sourceSnapshot"->'details') p WHERE p.id=d.id AND to_jsonb(p)=to_jsonb(d))) THEN
   RAISE EXCEPTION 'Copia de trabajo debe conservar orden y todos sus detalles históricos'; END IF;
 END IF;
 RETURN NEW;
END $$;


-- Contratos M4: no modifica documentos ni saldos previos.
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_completion_origin" CHECK ((type::text='FINALIZAR')=("completionId" IS NOT NULL));
ALTER TABLE "WorkOrderOperation" ADD CONSTRAINT "WorkOrderOperation_invoice_origin" CHECK ((type::text IN ('REGISTRAR_FACTURA','CORREGIR_FACTURA'))=("invoiceReferenceId" IS NOT NULL));
ALTER TABLE "WorkOrderCompletion" ADD CONSTRAINT "WorkOrderCompletion_values" CHECK ("preparationConfirmed" AND jsonb_typeof("progressSnapshot")='array');
ALTER TABLE "WorkOrderInvoiceIdentity" ADD CONSTRAINT "WorkOrderInvoiceIdentity_values" CHECK (public.rut_bancario_valido("issuerRut") AND btrim("invoiceNumber")<>'');
ALTER TABLE "WorkOrderInvoiceReference" ADD CONSTRAINT "WorkOrderInvoiceReference_values" CHECK (revision>0 AND "paymentTermDays">=0 AND "dueDate"="invoiceDate"+"paymentTermDays" AND "invoiceDate">=DATE '1900-01-01' AND "dueDate"<=DATE '9999-12-31' AND
 ((revision=1 AND "replacesInvoiceReferenceId" IS NULL AND "correctionReason" IS NULL) OR (revision>1 AND "replacesInvoiceReferenceId" IS NOT NULL AND coalesce(btrim("correctionReason"),'')<>'')));

-- Avance neto por línea y evidencia de cantidades/reservas/físico por bodega.
CREATE FUNCTION public.snapshot_preparacion_trabajo(wid integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'mode',l."executionMode",'unit',l."unitAbbreviation",'quantity',l.quantity::text,
 'required',CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" WHEN l."executionMode"::text IN ('SERVICIO','A_MEDIDA') THEN l.quantity ELSE 0 END::text,
 'executed',coalesce((SELECT sum(r.quantity) FROM "ProductionRecord" r WHERE r."workOrderLineId"=l.id AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"=r.id)),0)::text,
 'reserved',coalesce((SELECT sum(public.reserva_activa_asignacion(a.id)) FROM "StockReservationAllocation" a WHERE a."workOrderLineId"=l.id AND a.purpose::text IN ('ENTREGA_PRODUCTO','ENTREGA_DIRECTA_MP')),0)::text,
 'allocations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'warehouseId',a."warehouseId",'warehouse',b.name,'active',public.reserva_activa_asignacion(a.id)::text,
 'physical',coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN (SELECT quantity FROM "WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE (SELECT quantity FROM "ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0)::text,
 'totalReserved',public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")::text) ORDER BY a.id) FROM "StockReservationAllocation" a JOIN "Warehouse" b ON b.id=a."warehouseId" WHERE a."workOrderLineId"=l.id AND public.reserva_activa_asignacion(a.id)>0),'[]'::jsonb)
 ) ORDER BY l.position),'[]'::jsonb) FROM "WorkOrderLine" l WHERE l."workOrderId"=wid
$$;
CREATE FUNCTION public.validar_cierre_trabajo(wid integer,fecha date) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE w "WorkOrder"; l record; a record; ejecutado numeric; reservado numeric; fisico numeric; kardex numeric;
BEGIN
 SELECT * INTO w FROM "WorkOrder" WHERE id=wid;
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('EN_PROCESO','FINALIZADO') OR w."startedDate" IS NULL OR fecha IS NULL OR fecha<w."startedDate" OR fecha>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date OR
    EXISTS(SELECT 1 FROM "ProductionRecord" WHERE "workOrderId"=wid AND date>fecha) OR EXISTS(SELECT 1 FROM "ProductionReversal" WHERE "workOrderId"=wid AND date>fecha) THEN RAISE EXCEPTION 'Cierre requiere OT iniciada y fecha entre el último hecho y hoy en Santiago'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "workOrderId"=wid) THEN RAISE EXCEPTION 'Cierre requiere líneas'; END IF;
 IF w."salesOrderId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "AccountReceivable" cuenta JOIN "SalesOrder" s ON s.id=cuenta."salesOrderId" WHERE s.id=w."salesOrderId" AND s.status::text='CONFIRMADA' AND cuenta."voidedAt" IS NULL AND cuenta."dueDate" IS NULL) THEN RAISE EXCEPTION 'Cierre comercial requiere orden y cuenta vigentes sin vencimiento previo'; END IF;
 FOR l IN SELECT * FROM "WorkOrderLine" WHERE "workOrderId"=wid LOOP
  SELECT coalesce(sum(r.quantity),0) INTO ejecutado FROM "ProductionRecord" r WHERE r."workOrderLineId"=l.id AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"=r.id);
  IF ejecutado IS DISTINCT FROM (CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" WHEN l."executionMode"::text IN ('SERVICIO','A_MEDIDA') THEN l.quantity ELSE 0::numeric END) THEN RAISE EXCEPTION 'Fabricación o servicio pendiente en línea %; no se permite cierre incompleto',l.position; END IF;
  IF w."salesOrderId" IS NOT NULL AND l."executionMode"::text IN ('CATALOGO','VENTA_DIRECTA_MP') THEN
   SELECT coalesce(sum(public.reserva_activa_asignacion(id)),0) INTO reservado FROM "StockReservationAllocation" WHERE "workOrderLineId"=l.id AND purpose::text IN ('ENTREGA_PRODUCTO','ENTREGA_DIRECTA_MP');
   IF reservado<>l.quantity THEN RAISE EXCEPTION 'Preparación de línea % requiere reservas completas para entregar',l.position; END IF;
  END IF;
 END LOOP;
 FOR a IN SELECT * FROM "StockReservationAllocation" WHERE "workOrderId"=wid AND public.reserva_activa_asignacion(id)>0 ORDER BY id LOOP
  IF a.purpose::text='CONSUMO_PRODUCCION' THEN RAISE EXCEPTION 'Hay reservas de consumo pendientes incompatibles con cierre'; END IF;
  IF a."rawMaterialId" IS NOT NULL THEN
   SELECT quantity INTO fisico FROM "WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId";
   SELECT coalesce(sum(quantity),0) INTO kardex FROM "StockMovement" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId";
  ELSE
   SELECT quantity INTO fisico FROM "ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId";
   SELECT coalesce(sum(quantity),0) INTO kardex FROM "ProductStockMovement" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId";
  END IF;
  IF fisico IS NULL OR fisico<>kardex OR fisico<public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId") THEN RAISE EXCEPTION 'Preparación sin respaldo físico/Kardex coherente'; END IF;
 END LOOP;
 RETURN true;
END $$;

CREATE FUNCTION public.proteger_documento_cierre() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w "WorkOrder"; anterior "WorkOrderInvoiceReference"; identidad "WorkOrderInvoiceIdentity"; s "SalesOrder"; rut text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Conservar cierre, identidad y revisiones de factura inmutables'; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 IF TG_TABLE_NAME='WorkOrderCompletion' THEN
  IF w.status::text<>'EN_PROCESO' THEN RAISE EXCEPTION 'Finalizar sólo una OT en proceso'; END IF;
  PERFORM public.validar_cierre_trabajo(w.id,NEW.date);
  IF NEW."progressSnapshot" IS DISTINCT FROM public.snapshot_preparacion_trabajo(w.id) THEN RAISE EXCEPTION 'Resumen de preparación adulterado'; END IF;
 ELSE
  IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text<>'FINALIZADO' OR w."salesOrderId" IS NULL THEN RAISE EXCEPTION 'Factura sólo en OT comercial finalizada'; END IF;
  SELECT * INTO s FROM "SalesOrder" WHERE id=w."salesOrderId";
  IF s.status::text<>'CONFIRMADA' OR NOT EXISTS(SELECT 1 FROM "AccountReceivable" WHERE "salesOrderId"=s.id AND "voidedAt" IS NULL) THEN RAISE EXCEPTION 'Factura requiere cuenta vigente'; END IF;
  SELECT * INTO anterior FROM "WorkOrderInvoiceReference" WHERE id=w."currentInvoiceReferenceId";
  rut:=coalesce(anterior."issuerRut",regexp_replace(upper(s."companySnapshot"->>'rut'),'[.[:space:]]','','g'));
  IF NEW."issuerRut" IS DISTINCT FROM rut THEN RAISE EXCEPTION 'Conservar RUT histórico del emisor'; END IF;
  IF TG_TABLE_NAME='WorkOrderInvoiceReference' THEN
   SELECT * INTO identidad FROM "WorkOrderInvoiceIdentity" WHERE id=NEW."identityId";
   IF (identidad."workOrderId",identidad."issuerRut",identidad."invoiceNumber") IS DISTINCT FROM (w.id,NEW."issuerRut",NEW."invoiceNumber") OR NEW."paymentTermDays" IS DISTINCT FROM s."paymentTermDays" OR NEW."invoiceDate">(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date OR
      NEW.revision<>coalesce(anterior.revision,0)+1 OR NEW."replacesInvoiceReferenceId" IS DISTINCT FROM anterior.id THEN RAISE EXCEPTION 'Referencia requiere identidad, plazo histórico y sucesión vigente'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderCompletion_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderCompletion" FOR EACH ROW EXECUTE FUNCTION public.proteger_documento_cierre();
CREATE TRIGGER "WorkOrderInvoiceIdentity_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderInvoiceIdentity" FOR EACH ROW EXECUTE FUNCTION public.proteger_documento_cierre();
CREATE TRIGGER "WorkOrderInvoiceReference_protect" BEFORE INSERT OR UPDATE OR DELETE ON "WorkOrderInvoiceReference" FOR EACH ROW EXECUTE FUNCTION public.proteger_documento_cierre();

CREATE FUNCTION public.comprobar_cierre_factura() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE wid integer; w "WorkOrder"; c "WorkOrderCompletion"; f "WorkOrderInvoiceReference"; a "AccountReceivable"; op "WorkOrderOperation"; previo "WorkOrderOperation";
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN wid:=NEW.id;
 ELSIF TG_TABLE_NAME='AccountReceivable' THEN SELECT id INTO wid FROM "WorkOrder" WHERE "salesOrderId"=NEW."salesOrderId";
 ELSE wid:=NEW."workOrderId"; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=wid;
 IF w."schemaVersion" IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 SELECT * INTO c FROM "WorkOrderCompletion" WHERE "workOrderId"=wid;
 SELECT * INTO f FROM "WorkOrderInvoiceReference" WHERE id=w."currentInvoiceReferenceId";
 SELECT * INTO a FROM "AccountReceivable" WHERE "salesOrderId"=w."salesOrderId";
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "workOrderId"=wid AND version=w.version;
 SELECT * INTO previo FROM "WorkOrderOperation" WHERE "workOrderId"=wid AND version=w.version-1;
 IF (w.status::text='FINALIZADO') IS DISTINCT FROM (c.id IS NOT NULL) THEN RAISE EXCEPTION 'Estado finalizado exige cierre documentado'; END IF;
 IF c.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "WorkOrderOperation" WHERE "completionId"=c.id AND type::text='FINALIZAR' AND "workOrderId"=wid) THEN RAISE EXCEPTION 'Cierre requiere operación propia'; END IF;
 IF w.status::text='FINALIZADO' AND op.type::text NOT IN ('FINALIZAR','REGISTRAR_FACTURA','CORREGIR_FACTURA') THEN RAISE EXCEPTION 'Operación incompatible con OT finalizada'; END IF;
 IF EXISTS(SELECT 1 FROM "WorkOrderInvoiceIdentity" i WHERE i."workOrderId"=wid AND NOT EXISTS(SELECT 1 FROM "WorkOrderInvoiceReference" r WHERE r."identityId"=i.id)) OR
    EXISTS(SELECT 1 FROM "WorkOrderInvoiceReference" r WHERE r."workOrderId"=wid AND NOT EXISTS(SELECT 1 FROM "WorkOrderOperation" o WHERE o."invoiceReferenceId"=r.id AND o.type::text=CASE WHEN r.revision=1 THEN 'REGISTRAR_FACTURA' ELSE 'CORREGIR_FACTURA' END)) THEN RAISE EXCEPTION 'Factura e identidad requieren revisión y operación completas'; END IF;
 IF (SELECT count(*) FROM "WorkOrderInvoiceReference" WHERE "workOrderId"=wid)>0 AND (f.id IS NULL OR EXISTS(SELECT 1 FROM "WorkOrderInvoiceReference" WHERE "workOrderId"=wid AND revision>f.revision)) THEN RAISE EXCEPTION 'Puntero debe apuntar a última revisión de factura'; END IF;
 IF f.id IS NOT NULL AND (w.status::text<>'FINALIZADO' OR w."salesOrderId" IS NULL OR a.id IS NULL OR a."voidedAt" IS NOT NULL OR a."dueDate" IS DISTINCT FROM f."dueDate") THEN RAISE EXCEPTION 'Factura vigente y vencimiento de cuenta deben coincidir'; END IF;
 IF w."salesOrderId" IS NOT NULL AND f.id IS NULL AND a."dueDate" IS NOT NULL THEN RAISE EXCEPTION 'Vencimiento requiere referencia de factura vigente'; END IF;
 IF op.type::text IN ('FINALIZAR','REGISTRAR_FACTURA','CORREGIR_FACTURA') THEN
  IF op."reservationSnapshot" IS DISTINCT FROM previo."reservationSnapshot" OR
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   ((op."beforeSnapshot"->'header')-ARRAY['status','version','updatedAt','currentInvoiceReferenceId']) IS DISTINCT FROM
   ((op."afterSnapshot"->'header')-ARRAY['status','version','updatedAt','currentInvoiceReferenceId']) THEN RAISE EXCEPTION 'Cierre/factura conservan plan y reservas'; END IF;
  IF op.type::text='FINALIZAR' AND (op."beforeSnapshot"->'header'->>'status' IS DISTINCT FROM 'EN_PROCESO' OR op."afterSnapshot"->'header'->>'status' IS DISTINCT FROM 'FINALIZADO' OR w."currentInvoiceReferenceId" IS NOT NULL OR op."completionId" IS DISTINCT FROM c.id) THEN RAISE EXCEPTION 'Finalizar exige transición única, sin factura implícita'; END IF;
  IF op.type::text IN ('REGISTRAR_FACTURA','CORREGIR_FACTURA') AND (op."beforeSnapshot"->'header'->>'status' IS DISTINCT FROM 'FINALIZADO' OR op."invoiceReferenceId" IS DISTINCT FROM f.id OR (op.type::text='CORREGIR_FACTURA' AND op.reason IS DISTINCT FROM f."correctionReason")) THEN RAISE EXCEPTION 'Operación de factura debe conservar estado final y referencia vigente'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "WorkOrder_close_complete" AFTER INSERT OR UPDATE ON "WorkOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();
CREATE CONSTRAINT TRIGGER "WorkOrderCompletion_complete" AFTER INSERT ON "WorkOrderCompletion" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();
CREATE CONSTRAINT TRIGGER "WorkOrderInvoiceIdentity_complete" AFTER INSERT ON "WorkOrderInvoiceIdentity" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();
CREATE CONSTRAINT TRIGGER "WorkOrderInvoiceReference_complete" AFTER INSERT ON "WorkOrderInvoiceReference" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_close_complete" AFTER INSERT ON "WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();
CREATE CONSTRAINT TRIGGER "AccountReceivable_invoice_complete" AFTER INSERT OR UPDATE ON "AccountReceivable" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_cierre_factura();

COMMIT;
