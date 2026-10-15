BEGIN;
-- AlterTable
ALTER TABLE "WorkOrderDetail" ADD COLUMN     "retiredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkOrderOperation" ADD COLUMN     "planConfirmed" BOOLEAN,
ADD COLUMN     "reason" VARCHAR(1000);

-- AlterTable
ALTER TABLE "WorkOrderRecipeMaterial" ADD COLUMN     "retiredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkOrderSupplyPlan" ADD COLUMN     "retiredAt" TIMESTAMP(3);

ALTER TABLE "WorkOrderLine" ADD COLUMN "roundingReview" JSONB;
CREATE OR REPLACE FUNCTION proteger_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cab record; linea record; origen record; material record; producto record; receta record; tipo "WarehouseClassification"; documento integer; dato jsonb;
BEGIN
 dato := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME IN ('WorkOrderLine','WorkOrderDetail','WorkOrderSupplyPlan') THEN documento := (dato->>'workOrderId')::integer;
 ELSE SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=(dato->>'workOrderLineId')::integer; END IF;
 SELECT * INTO cab FROM "WorkOrder" WHERE id=documento FOR UPDATE;
 IF cab.id IS NULL OR cab."schemaVersion" IS NULL OR cab.status::text <> 'PENDIENTE' THEN RAISE EXCEPTION 'Plan requiere trabajo nuevo pendiente'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR (to_jsonb(NEW)->'workOrderId') IS DISTINCT FROM (to_jsonb(OLD)->'workOrderId') OR
    (to_jsonb(NEW)->'workOrderLineId') IS DISTINCT FROM (to_jsonb(OLD)->'workOrderLineId')) THEN RAISE EXCEPTION 'No reasignar identidad/origen del plan'; END IF;
 IF TG_OP<>'DELETE' AND TG_TABLE_NAME<>'WorkOrderLine' THEN
  IF (to_jsonb(NEW)->>'retiredAt') IS NOT NULL THEN
   IF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Un origen nuevo se registra vigente, no archivado'; END IF;
   IF (to_jsonb(NEW)-ARRAY['retiredAt','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['retiredAt','updatedAt']) THEN RAISE EXCEPTION 'Archivar conserva cantidades, identidad y copias del origen'; END IF;
   RETURN NEW;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN
  IF TG_TABLE_NAME='WorkOrderLine' AND cab."salesOrderId" IS NOT NULL THEN RAISE EXCEPTION 'Conservar línea comercial aceptada'; END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='WorkOrderLine' THEN
  IF NEW."salesOrderId" IS DISTINCT FROM cab."salesOrderId" THEN RAISE EXCEPTION 'Línea ajena al origen del trabajo'; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.version<>OLD.version+1 OR (to_jsonb(NEW)-ARRAY['version','updatedAt','quantityToProduce','quantityFromStock','productVersion','recipeCapturedAt','recipeFingerprint','executionMode','quantity','roundingReview']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['version','updatedAt','quantityToProduce','quantityFromStock','productVersion','recipeCapturedAt','recipeFingerprint','executionMode','quantity','roundingReview']) THEN RAISE EXCEPTION 'Origen y copias de línea inmutables; incrementar versión'; END IF;
  ELSIF NEW.version<>1 THEN RAISE EXCEPTION 'Línea nueva inicia con versión uno'; END IF;
  IF cab."salesOrderId" IS NOT NULL THEN
   SELECT * INTO origen FROM "SalesOrderDetail" WHERE id=NEW."salesOrderDetailId" AND "salesOrderId"=cab."salesOrderId";
   IF origen.id IS NULL OR NEW.kind IS DISTINCT FROM origen.kind OR NEW.quantity IS DISTINCT FROM origen.quantity OR
      NEW."rawMaterialId" IS DISTINCT FROM origen."rawMaterialId" OR NEW."productId" IS DISTINCT FROM origen."productId" OR
      NEW."unitMeasureId" IS DISTINCT FROM origen."unitMeasureId" OR NEW.description IS DISTINCT FROM origen.description OR
      NEW.code IS DISTINCT FROM origen.code OR NEW."unitName" IS DISTINCT FROM origen."unitName" OR NEW."unitAbbreviation" IS DISTINCT FROM origen."unitAbbreviation" OR
      NEW.position IS DISTINCT FROM origen.position THEN RAISE EXCEPTION 'Línea debe conservar lo aceptado, sin cambios comerciales'; END IF;
  END IF;
  IF NEW."rawMaterialId" IS NOT NULL THEN
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   IF NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" THEN RAISE EXCEPTION 'Unidad de materia prima diferente'; END IF;
  END IF;
  IF NEW."productId" IS NOT NULL THEN
   SELECT * INTO producto FROM "Product" WHERE id=NEW."productId" AND "deletedAt" IS NULL FOR UPDATE;
   IF producto.id IS NULL OR NEW."unitMeasureId" IS DISTINCT FROM producto."unitMeasureId" THEN RAISE EXCEPTION 'Producto o unidad incompatible'; END IF;
  END IF;
  IF TG_OP='INSERT' AND cab."salesOrderId" IS NULL THEN
   IF NEW."productId" IS NOT NULL THEN
    IF NEW.code IS DISTINCT FROM producto.code::text OR NEW.description IS DISTINCT FROM producto.name THEN RAISE EXCEPTION 'Copia de producto propio diferente'; END IF;
   END IF;
   IF NEW."rawMaterialId" IS NOT NULL THEN
    IF NEW.code IS DISTINCT FROM material.code OR NEW.description IS DISTINCT FROM material.name THEN RAISE EXCEPTION 'Copia de material propio diferente'; END IF;
   END IF;
   IF NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN RAISE EXCEPTION 'Copia de unidad propia diferente'; END IF;
  END IF;
 ELSE
  SELECT * INTO linea FROM "WorkOrderLine" WHERE id=(dato->>'workOrderLineId')::integer AND "workOrderId"=cab.id;
  IF linea.id IS NULL THEN RAISE EXCEPTION 'Detalle debe pertenecer a la misma línea/trabajo'; END IF;
  IF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   SELECT * INTO producto FROM "Product" WHERE id=linea."productId" AND "deletedAt" IS NULL FOR UPDATE;
   SELECT * INTO receta FROM "ProductRecipe" WHERE "productId"=linea."productId" AND "rawMaterialId"=NEW."rawMaterialId";
   IF linea."executionMode"::text <> 'CATALOGO' OR producto.id IS NULL OR linea."productVersion" IS DISTINCT FROM producto.version OR
      receta.id IS NULL OR NEW."quantityPerUnit" IS DISTINCT FROM receta.quantity OR NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" OR
      NEW."materialCode" IS DISTINCT FROM material.code OR NEW."materialName" IS DISTINCT FROM material.name OR
      NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN
    RAISE EXCEPTION 'Capturar receta completa de una revisión vigente con unidades/cantidad históricas'; END IF;
  ELSIF TG_TABLE_NAME='WorkOrderSupplyPlan' THEN
   SELECT classification INTO tipo FROM "Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
   IF linea."executionMode"::text='CATALOGO' THEN
    IF NEW."productId" IS DISTINCT FROM linea."productId" OR NEW."rawMaterialId" IS NOT NULL OR tipo IS NULL OR tipo NOT IN ('PRODUCTO_TERMINADO','MIXTA') THEN RAISE EXCEPTION 'Abastecimiento de terminado incompatible'; END IF;
   ELSIF linea."executionMode"::text='VENTA_DIRECTA_MP' THEN
    IF NEW."rawMaterialId" IS DISTINCT FROM linea."rawMaterialId" OR NEW."productId" IS NOT NULL OR tipo IS NULL OR tipo NOT IN ('MATERIA_PRIMA','MIXTA') THEN RAISE EXCEPTION 'Abastecimiento directo de materia prima incompatible'; END IF;
   ELSE RAISE EXCEPTION 'Servicio o trabajo a medida no abastece stock comercial'; END IF;
  ELSE
   SELECT * INTO material FROM "RawMaterial" WHERE id=NEW."rawMaterialId" FOR UPDATE;
   SELECT classification INTO tipo FROM "Warehouse" WHERE id=NEW."warehouseId" FOR SHARE;
   IF linea."executionMode"::text NOT IN ('CATALOGO','A_MEDIDA') OR NEW."unitMeasureId" IS DISTINCT FROM material."unitMeasureId" OR
      tipo IS NULL OR tipo NOT IN ('MATERIA_PRIMA','MIXTA') THEN RAISE EXCEPTION 'Requerimiento o unidad/bodega incompatible'; END IF;
   IF NEW."recipeMaterialId" IS NOT NULL THEN
    SELECT * INTO receta FROM "WorkOrderRecipeMaterial" WHERE id=NEW."recipeMaterialId" AND "workOrderLineId"=linea.id AND "rawMaterialId"=NEW."rawMaterialId" AND "retiredAt" IS NULL;
    IF receta.id IS NULL OR NEW."materialCode" IS DISTINCT FROM receta."materialCode" OR NEW."materialName" IS DISTINCT FROM receta."materialName" OR
      NEW."unitName" IS DISTINCT FROM receta."unitName" OR NEW."unitAbbreviation" IS DISTINCT FROM receta."unitAbbreviation" THEN RAISE EXCEPTION 'Requerimiento ajeno a receta histórica'; END IF;
   ELSIF linea."executionMode"::text='CATALOGO' THEN RAISE EXCEPTION 'Requerimiento de catálogo debe indicar su componente histórico';
   ELSIF NEW."materialCode" IS DISTINCT FROM material.code OR NEW."materialName" IS DISTINCT FROM material.name OR
      NOT EXISTS(SELECT 1 FROM "UnitMeasure" u WHERE u.id=NEW."unitMeasureId" AND u.name=NEW."unitName" AND u.abbreviation=NEW."unitAbbreviation") THEN RAISE EXCEPTION 'Copia de insumo a medida inválida'; END IF;
  END IF;
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
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
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
CREATE OR REPLACE FUNCTION public.comprobar_reservas_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE work_id integer; op public."WorkOrderOperation"; w public."WorkOrder"; esperado jsonb; s jsonb; a public."StockReservationAllocation"; active numeric; demanda numeric; origen public."WorkOrderOperation";
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN work_id:=NEW.id;
 ELSIF TG_TABLE_NAME='StockReservationEvent' THEN SELECT "workOrderId" INTO work_id FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO work_id FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 ELSE work_id:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=work_id;
 IF w."schemaVersion" IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 SELECT * INTO op FROM public."WorkOrderOperation" WHERE "workOrderId"=work_id AND version=w.version;
 FOR a IN SELECT * FROM public."StockReservationAllocation" WHERE "workOrderId"=work_id LOOP
  SELECT * INTO origen FROM public."WorkOrderOperation" WHERE "idempotencyKey"=a."operationId";
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
  IF active>0 THEN
   IF w.status::text='ANULADO' THEN RAISE EXCEPTION 'Anulación debe liberar todas sus reservas'; END IF;
   IF a."plannedDetailId" IS NOT NULL THEN
    SELECT d."quantityNeeded" INTO demanda FROM public."WorkOrderDetail" d WHERE d.id=a."plannedDetailId" AND d."retiredAt" IS NULL AND
      (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId")=(a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."plannedDetailId"=a."plannedDetailId")>demanda THEN RAISE EXCEPTION 'Reservas superan requerimiento vigente o recurso fue sustituido'; END IF;
   ELSE
    SELECT s.quantity INTO demanda FROM public."WorkOrderSupplyPlan" s WHERE s.id=a."supplyPlanId" AND s."retiredAt" IS NULL AND
      (s."workOrderId",s."workOrderLineId",s."warehouseId")=(a."workOrderId",a."workOrderLineId",a."warehouseId") AND s."rawMaterialId" IS NOT DISTINCT FROM a."rawMaterialId" AND s."productId" IS NOT DISTINCT FROM a."productId";
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."supplyPlanId"=a."supplyPlanId")>demanda THEN RAISE EXCEPTION 'Reservas superan abastecimiento vigente o recurso fue sustituido'; END IF;
   END IF;
   IF public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")>coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN
       (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE
       (SELECT quantity FROM public."ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0) THEN RAISE EXCEPTION 'Reservas exceden físico'; END IF;
  END IF;
 END LOOP;
 IF op.type::text IN ('RESERVAR_STOCK','LIBERAR_RESERVA') AND (
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   ((op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM ((op."afterSnapshot"->'header')-ARRAY['version','updatedAt'])) THEN RAISE EXCEPTION 'Operación de reserva no puede modificar el plan'; END IF;
 esperado:=public.snapshot_reservas_trabajo(work_id); s:=op."reservationSnapshot";
 IF jsonb_array_length(esperado->'allocations')>0 OR s IS NOT NULL THEN
  -- Snapshot generado en servidor: igualdad JSON exacta, sin redondear una copia adulterada.
  IF s IS DISTINCT FROM esperado THEN RAISE EXCEPTION 'Historial de reservas debe coincidir exactamente con operación actual'; END IF;
 END IF;
 -- Añadir filas a una operación anterior no puede aprovechar una revisión posterior.
 IF TG_TABLE_NAME IN ('StockReservationAllocation','StockReservationEvent') THEN
  IF NEW."operationId" IS DISTINCT FROM op."idempotencyKey" THEN RAISE EXCEPTION 'Reserva/evento exige UUID de revisión actual'; END IF;
 END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.proteger_decision_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."planConfirmed" IS NOT NULL AND NEW.type::text NOT IN ('CREAR','EDITAR_PLAN') THEN RAISE EXCEPTION 'Confirmación del plan sólo corresponde a crear o revisar plan'; END IF;
 IF NEW.type::text IN ('CREAR','EDITAR_PLAN') AND NEW."planConfirmed" IS NULL THEN RAISE EXCEPTION 'Operación nueva de plan exige decisión explícita de confirmación'; END IF;
 IF NEW.type::text='EDITAR_PLAN' AND coalesce(length(btrim(NEW.reason)),0)=0 THEN RAISE EXCEPTION 'Revisar plan requiere motivo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrderOperation_plan_decision" BEFORE INSERT ON public."WorkOrderOperation" FOR EACH ROW EXECUTE FUNCTION public.proteger_decision_plan_trabajo();

CREATE FUNCTION public.comprobar_distribucion_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE work_id integer; w public."WorkOrder"; decision public."WorkOrderOperation"; l public."WorkOrderLine"; r public."WorkOrderRecipeMaterial"; exacta numeric; esperada numeric; asignada numeric; revision jsonb;
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN work_id:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO work_id FROM public."WorkOrderLine" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderLineId" ELSE NEW."workOrderLineId" END;
 ELSE work_id:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=work_id;
 IF w."schemaVersion" IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
 SELECT * INTO decision FROM public."WorkOrderOperation" WHERE "workOrderId"=work_id AND type::text IN ('CREAR','EDITAR_PLAN') ORDER BY version DESC LIMIT 1;
 IF decision."planConfirmed"=false AND EXISTS(SELECT 1 FROM public."StockReservationAllocation" a WHERE a."workOrderId"=work_id AND public.reserva_activa_asignacion(a.id)>0) THEN RAISE EXCEPTION 'Borrador nuevo no conserva reservas activas'; END IF;
 IF decision."planConfirmed" IS DISTINCT FROM true THEN RETURN NULL; END IF;
 FOR l IN SELECT * FROM public."WorkOrderLine" WHERE "workOrderId"=work_id LOOP
  IF l."executionMode"::text='CATALOGO' THEN
   IF w."salesOrderId" IS NULL AND l."quantityToProduce"<>l.quantity THEN RAISE EXCEPTION 'Obra propia confirmada fabrica toda su cantidad'; END IF;
   SELECT coalesce(sum(quantity),0) INTO asignada FROM public."WorkOrderSupplyPlan" WHERE "workOrderLineId"=l.id AND "retiredAt" IS NULL;
   IF asignada<>l."quantityFromStock" THEN RAISE EXCEPTION 'Confirmación requiere distribución completa de terminado desde stock'; END IF;
   IF EXISTS(SELECT 1 FROM public."WorkOrderDetail" d WHERE d."workOrderLineId"=l.id AND d."retiredAt" IS NULL AND NOT EXISTS(SELECT 1 FROM public."WorkOrderRecipeMaterial" p WHERE p.id=d."recipeMaterialId" AND p."retiredAt" IS NULL)) THEN RAISE EXCEPTION 'Requerimiento activo no puede usar receta archivada'; END IF;
   FOR r IN SELECT * FROM public."WorkOrderRecipeMaterial" WHERE "workOrderLineId"=l.id AND "retiredAt" IS NULL LOOP
    exacta:=l."quantityToProduce"*r."quantityPerUnit";esperada:=round(exacta,3);
    IF exacta>0 AND esperada=0 THEN
     revision:=l."roundingReview"->r."rawMaterialId"::text;
     IF revision IS NULL OR coalesce(revision->>'quantity','')!~'^\d{1,11}(\.\d{1,3})?$' OR coalesce(length(btrim(revision->>'reason')),0)=0 THEN RAISE EXCEPTION 'Necesidad positiva que queda en cero exige revisión positiva con motivo'; END IF;
     esperada:=(revision->>'quantity')::numeric;
     IF esperada<=0 OR (revision->>'exactQuantity')::numeric IS DISTINCT FROM exacta THEN RAISE EXCEPTION 'Revisión no corresponde a necesidad exacta'; END IF;
    END IF;
    SELECT coalesce(sum("quantityNeeded"),0) INTO asignada FROM public."WorkOrderDetail" WHERE "workOrderLineId"=l.id AND "rawMaterialId"=r."rawMaterialId" AND "retiredAt" IS NULL;
    IF asignada<>esperada THEN RAISE EXCEPTION 'Confirmación requiere distribución completa de cada necesidad de receta'; END IF;
   END LOOP;
  ELSIF l."executionMode"::text='VENTA_DIRECTA_MP' THEN
   SELECT coalesce(sum(quantity),0) INTO asignada FROM public."WorkOrderSupplyPlan" WHERE "workOrderLineId"=l.id AND "retiredAt" IS NULL;
   IF asignada<>l.quantity THEN RAISE EXCEPTION 'Confirmación requiere distribución completa de venta directa'; END IF;
  ELSIF l."executionMode"::text='SERVICIO' AND EXISTS(SELECT 1 FROM public."WorkOrderDetail" WHERE "workOrderLineId"=l.id AND "retiredAt" IS NULL) THEN RAISE EXCEPTION 'Servicio puro no tiene requerimientos de material';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "WorkOrder_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderLine_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderLine" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderRecipeMaterial_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderRecipeMaterial" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderDetail_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderDetail" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderSupplyPlan_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderSupplyPlan" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
CREATE CONSTRAINT TRIGGER "WorkOrderOperation_distribution_complete" AFTER INSERT OR UPDATE OR DELETE ON public."WorkOrderOperation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.comprobar_distribucion_plan_trabajo();
COMMIT;
