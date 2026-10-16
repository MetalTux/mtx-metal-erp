BEGIN;
-- Inicio explícito, sin escrituras físicas; conservar contratos previos y reservas en proceso.
CREATE OR REPLACE FUNCTION proteger_cabecera_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o record; f record; copia record; q integer;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar trabajo, folio y vínculo histórico'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF OLD."schemaVersion" IS NULL THEN RAISE EXCEPTION 'Trabajo legado requiere conciliación manual'; END IF;
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

CREATE OR REPLACE FUNCTION comprobar_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento integer; w record; op record; v_linea record; s jsonb; esperado jsonb; recaptura boolean;
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN documento:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderLineId" ELSE NEW."workOrderLineId" END;
 ELSE documento:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=documento;
 IF w.id IS NULL OR w."schemaVersion" IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND version=w.version;
 IF op."idempotencyKey" IS NULL OR (w.version=1 AND op.type::text<>'CREAR') OR
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='EN_PROCESO' AND op.type::text NOT IN ('INICIAR','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
 IF NOT EXISTS(SELECT 1 FROM "WorkOrderLine" WHERE "workOrderId"=w.id) THEN RAISE EXCEPTION 'Trabajo nuevo requiere líneas'; END IF;
 IF w."salesOrderId" IS NOT NULL AND (SELECT count(*) FROM "WorkOrderLine" WHERE "workOrderId"=w.id)<>(SELECT count(*) FROM "SalesOrderDetail" WHERE "salesOrderId"=w."salesOrderId") THEN RAISE EXCEPTION 'Trabajo debe incluir todas las líneas aceptadas, una vez'; END IF;
 FOR v_linea IN SELECT * FROM "WorkOrderLine" WHERE "workOrderId"=w.id LOOP
  IF v_linea."executionMode"::text='CATALOGO' AND v_linea."quantityToProduce">0 AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL) THEN RAISE EXCEPTION 'Fabricación requiere receta histórica'; END IF;
  recaptura := EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" r WHERE r."workOrderLineId"=v_linea.id AND r."retiredAt" IS NULL AND r.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) OR
   NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderLine",coalesce(op."beforeSnapshot"->'lines','[]'::jsonb)) p WHERE p.id=v_linea.id AND
    p."productVersion" IS NOT DISTINCT FROM v_linea."productVersion" AND p."recipeCapturedAt" IS NOT DISTINCT FROM v_linea."recipeCapturedAt" AND p."recipeFingerprint" IS NOT DISTINCT FROM v_linea."recipeFingerprint");
  IF recaptura AND EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL) AND (
   NOT EXISTS(SELECT 1 FROM "Product" WHERE id=v_linea."productId" AND version=v_linea."productVersion" AND "deletedAt" IS NULL) OR
   (SELECT count(*) FROM "WorkOrderRecipeMaterial" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)<>(SELECT count(*) FROM "ProductRecipe" WHERE "productId"=v_linea."productId") OR
   EXISTS(SELECT 1 FROM "ProductRecipe" r JOIN "RawMaterial" m ON m.id=r."rawMaterialId" JOIN "UnitMeasure" u ON u.id=m."unitMeasureId"
    WHERE r."productId"=v_linea."productId" AND NOT EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" p WHERE p."workOrderLineId"=v_linea.id AND p."retiredAt" IS NULL AND
     p."rawMaterialId"=r."rawMaterialId" AND p."quantityPerUnit"=r.quantity AND p."unitMeasureId"=m."unitMeasureId" AND
     p."materialCode"=m.code AND p."materialName"=m.name AND p."unitName"=u.name AND p."unitAbbreviation"=u.abbreviation))) THEN RAISE EXCEPTION 'Captura de receta debe ser completa y corresponder a revisión actual'; END IF;
  IF v_linea."executionMode"::text='CATALOGO' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)>v_linea."quantityFromStock" THEN RAISE EXCEPTION 'Abastecimiento supera cantidad desde stock'; END IF;
  IF v_linea."executionMode"::text='VENTA_DIRECTA_MP' AND (SELECT coalesce(sum(quantity),0) FROM "WorkOrderSupplyPlan" WHERE "workOrderLineId"=v_linea.id AND "retiredAt" IS NULL)>v_linea.quantity THEN RAISE EXCEPTION 'Abastecimiento directo supera cantidad contratada'; END IF;
 END LOOP;
 s:=op."afterSnapshot"; esperado:=public.snapshot_plan_trabajo(w.id);
 -- Normalizar tipos de Prisma (Decimal texto/fechas ISO) antes de comparar la copia.
 IF s->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(s->'header') IS DISTINCT FROM 'object' OR
    to_jsonb(jsonb_populate_record(NULL::"WorkOrder",s->'header')) IS DISTINCT FROM to_jsonb(w) THEN RAISE EXCEPTION 'Snapshot de operación no coincide con cabecera'; END IF;
 IF jsonb_typeof(s->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'lines')<>jsonb_array_length(esperado->'lines') OR
    EXISTS(SELECT 1 FROM "WorkOrderLine" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderLine",s->'lines') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de líneas distinto'; END IF;
 IF jsonb_typeof(s->'recipeMaterials') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'recipeMaterials')<>jsonb_array_length(esperado->'recipeMaterials') OR
    EXISTS(SELECT 1 FROM "WorkOrderRecipeMaterial" a JOIN "WorkOrderLine" l ON l.id=a."workOrderLineId" WHERE l."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderRecipeMaterial",s->'recipeMaterials') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de receta distinto'; END IF;
 IF jsonb_typeof(s->'materials') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'materials')<>jsonb_array_length(esperado->'materials') OR
    EXISTS(SELECT 1 FROM "WorkOrderDetail" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderDetail",s->'materials') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de requerimientos distinto'; END IF;
 IF jsonb_typeof(s->'supplies') IS DISTINCT FROM 'array' OR jsonb_array_length(s->'supplies')<>jsonb_array_length(esperado->'supplies') OR
    EXISTS(SELECT 1 FROM "WorkOrderSupplyPlan" a WHERE a."workOrderId"=w.id AND NOT EXISTS(SELECT 1 FROM jsonb_populate_recordset(NULL::"WorkOrderSupplyPlan",s->'supplies') p WHERE p.id=a.id AND to_jsonb(p)=to_jsonb(a))) THEN RAISE EXCEPTION 'Snapshot de abastecimiento distinto'; END IF;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.proteger_reserva_stock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; a public."StockReservationAllocation"; d public."WorkOrderDetail"; s public."WorkOrderSupplyPlan"; fisico numeric; activa numeric; clasificacion text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reservas y eventos inmutables; registrar liberación con motivo'; END IF;
 IF TG_TABLE_NAME='StockReservationEvent' THEN
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
  SELECT * INTO w FROM public."WorkOrder" WHERE id=a."workOrderId" FOR UPDATE;
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId" FOR UPDATE;
  IF w.id IS NULL OR w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('PENDIENTE','EN_PROCESO','ANULADO') THEN RAISE EXCEPTION 'Liberación requiere trabajo pendiente/en proceso o anulación propia coordinada'; END IF;
  IF NEW.type::text<>'LIBERAR' THEN RAISE EXCEPTION 'Consumo de reserva requiere integración con documento físico de Producción/Despacho'; END IF;
  IF a."rawMaterialId" IS NOT NULL THEN PERFORM id FROM public."RawMaterial" WHERE id=a."rawMaterialId" FOR UPDATE;
  ELSE PERFORM id FROM public."Product" WHERE id=a."productId" FOR UPDATE; END IF;
  IF NEW.quantity>public.reserva_activa_asignacion(a.id) THEN RAISE EXCEPTION 'Liberación excede remanente de reserva'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 IF w."schemaVersion" IS DISTINCT FROM 1 OR w.status::text NOT IN ('PENDIENTE','EN_PROCESO') OR l."workOrderId" IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'Reserva requiere línea del trabajo nuevo pendiente o en proceso'; END IF;
 IF NEW."rawMaterialId" IS NOT NULL THEN
  PERFORM id FROM public."RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
  SELECT quantity INTO fisico FROM public."WarehouseStock" WHERE "rawMaterialId"=NEW."rawMaterialId" AND "warehouseId"=NEW."warehouseId" FOR UPDATE;
 ELSE
  PERFORM id FROM public."Product" WHERE id=NEW."productId" FOR UPDATE;
  SELECT quantity INTO fisico FROM public."ProductWarehouseStock" WHERE "productId"=NEW."productId" AND "warehouseId"=NEW."warehouseId" FOR UPDATE;
 END IF;
 SELECT classification::text INTO clasificacion FROM public."Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
 IF NEW."rawMaterialId" IS NOT NULL AND clasificacion NOT IN ('MATERIA_PRIMA','MIXTA') OR
    NEW."productId" IS NOT NULL AND clasificacion NOT IN ('PRODUCTO_TERMINADO','MIXTA') OR clasificacion IS NULL THEN RAISE EXCEPTION 'Reserva exige bodega explícitamente compatible'; END IF;
 IF NEW.purpose::text='CONSUMO_PRODUCCION' THEN
  SELECT * INTO d FROM public."WorkOrderDetail" WHERE id=NEW."plannedDetailId";
  IF (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."warehouseId",NEW."unitMeasureId") OR
    (NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM
     (d."materialCode",d."materialName",d."unitName",d."unitAbbreviation") THEN RAISE EXCEPTION 'Reserva no corresponde al requerimiento histórico'; END IF;
 ELSE
  SELECT * INTO s FROM public."WorkOrderSupplyPlan" WHERE id=NEW."supplyPlanId";
  IF w."salesOrderId" IS NULL OR (s."workOrderId",s."workOrderLineId",s."rawMaterialId",s."productId",s."warehouseId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."productId",NEW."warehouseId") OR
     (NEW."unitMeasureId",NEW."unitName",NEW."unitAbbreviation",NEW."resourceCode",NEW."resourceName") IS DISTINCT FROM
     (l."unitMeasureId",l."unitName",l."unitAbbreviation",l.code,l.description) THEN RAISE EXCEPTION 'Reserva comercial no corresponde a abastecimiento histórico'; END IF;
 END IF;
 activa:=public.reserva_activa_recurso(NEW."rawMaterialId",NEW."productId",NEW."warehouseId");
 IF activa+NEW.quantity>coalesce(fisico,0) THEN RAISE EXCEPTION 'Stock libre insuficiente para reserva; otras reservas se conservan'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.comprobar_inicio_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE anterior public."WorkOrderOperation";
BEGIN
 IF NEW.type::text<>'INICIAR' THEN RETURN NEW; END IF;
 SELECT * INTO anterior FROM public."WorkOrderOperation" WHERE "workOrderId"=NEW."workOrderId" AND version=NEW.version-1;
 IF anterior."idempotencyKey" IS NULL OR
    NEW."beforeSnapshot"->'header'->>'status' IS DISTINCT FROM 'PENDIENTE' OR
    NEW."afterSnapshot"->'header'->>'status' IS DISTINCT FROM 'EN_PROCESO' OR
    NEW."beforeSnapshot"->'header'->>'startedDate' IS NOT NULL OR
    NEW."afterSnapshot"->'header'->>'startedDate' IS NULL OR
    (NEW."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (NEW."afterSnapshot"-ARRAY['header']) OR
    ((NEW."beforeSnapshot"->'header')-ARRAY['status','startedDate','version','updatedAt']) IS DISTINCT FROM
    ((NEW."afterSnapshot"->'header')-ARRAY['status','startedDate','version','updatedAt']) OR
    NEW."reservationSnapshot" IS DISTINCT FROM anterior."reservationSnapshot" THEN
  RAISE EXCEPTION 'Inicio exige transición única sin cambiar plan ni reservas'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderOperation_start_protect" BEFORE INSERT ON public."WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.comprobar_inicio_trabajo();
COMMIT;
