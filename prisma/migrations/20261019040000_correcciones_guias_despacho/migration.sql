BEGIN;
ALTER TABLE "DeliveryNote" ADD COLUMN "physicalRestitutionConfirmed" boolean NOT NULL DEFAULT false;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_physical_return" CHECK (NOT "physicalRestitutionConfirmed" OR ("schemaVersion"=1 AND kind='CORRECCION'));
ALTER TABLE "StockReservationAllocation" ADD COLUMN "correctionDeliveryNoteLineId" integer, ADD COLUMN "restoresReservationEventId" integer;
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "Reservation_return_pair" CHECK (("correctionDeliveryNoteLineId" IS NULL)=("restoresReservationEventId" IS NULL));
CREATE INDEX "Reservation_correction_line_idx" ON "StockReservationAllocation"("correctionDeliveryNoteLineId","workOrderLineId","workOrderId");
CREATE INDEX "Reservation_restores_event_idx" ON "StockReservationAllocation"("restoresReservationEventId");
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "Reservation_correction_line_fk" FOREIGN KEY ("correctionDeliveryNoteLineId","workOrderLineId","workOrderId") REFERENCES "DeliveryNoteLine"(id,"workOrderLineId","workOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservationAllocation" ADD CONSTRAINT "Reservation_restores_event_fk" FOREIGN KEY ("restoresReservationEventId") REFERENCES "StockReservationEvent"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION public.proteger_estructura_guia_g1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g public."DeliveryNote";
BEGIN
 IF TG_OP='INSERT' THEN
  IF TG_TABLE_NAME='DeliveryNote' THEN
   IF NEW."schemaVersion"=1 AND NEW.kind::text IN ('ENTREGA','CORRECCION') THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME='DeliveryNoteLine' THEN
   SELECT * INTO g FROM public."DeliveryNote" WHERE id=NEW."deliveryNoteId";
   IF g."schemaVersion"=1 AND EXISTS(SELECT 1 FROM public."DeliveryNote" cabecera WHERE cabecera.id=g.id AND cabecera.xmin::text::bigint=(pg_current_xact_id()::text::bigint % 4294967296)) THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Sólo una nueva guía y sus partidas pueden registrarse juntas';
 END IF;
 RAISE EXCEPTION 'Guías y partidas inmutables; corregir con documento vinculado';
END $$;
-- Cantidad entregada derivada, nunca saldo materializado ni inferencia desde pago.
CREATE FUNCTION public.entrega_neta_linea_trabajo(linea integer) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce(sum(CASE WHEN g.kind='ENTREGA' THEN l.quantity ELSE -l.quantity END),0)
 FROM public."DeliveryNoteLine" l JOIN public."DeliveryNote" g ON g.id=l."deliveryNoteId"
 WHERE l."workOrderLineId"=linea AND g."schemaVersion"=1
$$;
CREATE FUNCTION public.entrega_neta_origen_reserva(abastecimiento integer,resultado integer) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT sum(e.quantity) FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" a ON a.id=e."allocationId"
  WHERE e.type::text='CONSUMIR' AND e."deliveryNoteLineId" IS NOT NULL AND a."supplyPlanId" IS NOT DISTINCT FROM abastecimiento AND a."productionOutputId" IS NOT DISTINCT FROM resultado),0)
 -coalesce((SELECT sum(a.quantity) FROM public."StockReservationAllocation" a
  WHERE a."correctionDeliveryNoteLineId" IS NOT NULL AND a."supplyPlanId" IS NOT DISTINCT FROM abastecimiento AND a."productionOutputId" IS NOT DISTINCT FROM resultado),0)
$$;
CREATE OR REPLACE FUNCTION public.comprobar_plan_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE documento integer; w record; op record; v_linea record; s jsonb; esperado jsonb; recaptura boolean;
BEGIN
 IF TG_TABLE_NAME='WorkOrder' THEN documento:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderRecipeMaterial' THEN SELECT "workOrderId" INTO documento FROM "WorkOrderLine" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderLineId" ELSE NEW."workOrderLineId" END;
 ELSE documento:=CASE WHEN TG_OP='DELETE' THEN OLD."workOrderId" ELSE NEW."workOrderId" END; END IF;
 SELECT * INTO w FROM "WorkOrder" WHERE id=documento;
 IF w.id IS NULL OR w."schemaVersion" IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "workOrderId"=w.id AND version=w.version;
 IF op."idempotencyKey" IS NULL OR (w.version=1 AND op.type::text<>'CREAR') OR
    (w.version>1 AND ((w.status::text='PENDIENTE' AND op.type::text NOT IN ('EDITAR_PLAN','RESERVAR_STOCK','LIBERAR_RESERVA')) OR (w.status::text='EN_PROCESO' AND op.type::text NOT IN ('INICIAR','RESERVAR_STOCK','LIBERAR_RESERVA','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION','DESPACHAR','CORREGIR_DESPACHO')) OR (w.status::text='ANULADO' AND op.type::text<>'ANULAR'))) THEN RAISE EXCEPTION 'Trabajo requiere operación correspondiente a su estado/revisión'; END IF;
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
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION','CORREGIR_DESPACHO') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  IF origen.type::text='REVERTIR_PRODUCCION' AND (a."plannedDetailId" IS NULL OR a.purpose::text<>'CONSUMO_PRODUCCION') THEN RAISE EXCEPTION 'Reversión sólo reconstruye reservas de requerimientos pendientes'; END IF;
  IF origen.type::text='REGISTRAR_PRODUCCION' AND a."productionOutputId" IS NULL THEN RAISE EXCEPTION 'Producción sólo crea reservas del resultado fabricado'; END IF;
  IF (origen.type::text='CORREGIR_DESPACHO') IS DISTINCT FROM (a."correctionDeliveryNoteLineId" IS NOT NULL) THEN RAISE EXCEPTION 'Reserva devuelta exige operación de corrección propia'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION','DESPACHAR'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
  IF active>0 THEN
   IF w.status::text='ANULADO' THEN RAISE EXCEPTION 'Anulación debe liberar todas sus reservas'; END IF;
   IF a."plannedDetailId" IS NOT NULL THEN
    SELECT public.demanda_pendiente_requerimiento(d.id) INTO demanda FROM public."WorkOrderDetail" d WHERE d.id=a."plannedDetailId" AND d."retiredAt" IS NULL AND
      (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId")=(a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."plannedDetailId"=a."plannedDetailId")>demanda THEN RAISE EXCEPTION 'Reservas superan requerimiento vigente o recurso fue sustituido'; END IF;
   ELSIF a."supplyPlanId" IS NOT NULL THEN
    SELECT s.quantity-public.entrega_neta_origen_reserva(s.id,NULL) INTO demanda FROM public."WorkOrderSupplyPlan" s WHERE s.id=a."supplyPlanId" AND s."retiredAt" IS NULL AND
      (s."workOrderId",s."workOrderLineId",s."warehouseId")=(a."workOrderId",a."workOrderLineId",a."warehouseId") AND s."rawMaterialId" IS NOT DISTINCT FROM a."rawMaterialId" AND s."productId" IS NOT DISTINCT FROM a."productId";
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."supplyPlanId"=a."supplyPlanId")>demanda THEN RAISE EXCEPTION 'Reservas superan abastecimiento vigente o recurso fue sustituido'; END IF;
   ELSE
    SELECT quantity-public.entrega_neta_origen_reserva(NULL,id) INTO demanda FROM public."ProductionOutput" WHERE id=a."productionOutputId" AND "workOrderId"=work_id AND "workOrderLineId"=a."workOrderLineId" AND "productId"=a."productId" AND "warehouseId"=a."warehouseId" AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionOutput"."productionRecordId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."productionOutputId"=a."productionOutputId")>demanda THEN RAISE EXCEPTION 'Reservas del resultado superan cantidad fabricada'; END IF;
   END IF;
   IF a.purpose::text='ENTREGA_PRODUCTO' AND (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."workOrderLineId"=a."workOrderLineId" AND b.purpose::text='ENTREGA_PRODUCTO')>(SELECT quantity-public.entrega_neta_linea_trabajo(id) FROM public."WorkOrderLine" WHERE id=a."workOrderLineId") THEN RAISE EXCEPTION 'Cobertura de terminado supera compromiso de la línea'; END IF;
   IF public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")>coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN
       (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE
       (SELECT quantity FROM public."ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0) THEN RAISE EXCEPTION 'Reservas exceden físico'; END IF;
  END IF;
 END LOOP;
 IF op.type::text IN ('RESERVAR_STOCK','LIBERAR_RESERVA') AND (
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   (public.normalizar_cabecera_snapshot_trabajo(op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM (public.normalizar_cabecera_snapshot_trabajo(op."afterSnapshot"->'header')-ARRAY['version','updatedAt'])) THEN RAISE EXCEPTION 'Operación de reserva no puede modificar el plan'; END IF;
 IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" alloc ON alloc.id=e."allocationId" JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId" LEFT JOIN public."ProductionConsumption" c ON c.id=e."productionConsumptionId" WHERE alloc."workOrderId"=work_id AND e.type::text='CONSUMIR' AND NOT ((e."productionConsumptionId" IS NOT NULL AND o.type::text='REGISTRAR_PRODUCCION' AND o."productionRecordId"=c."productionRecordId") OR (e."deliveryNoteLineId" IS NOT NULL AND o.type::text='DESPACHAR' AND o."deliveryNoteId"=(SELECT "deliveryNoteId" FROM public."DeliveryNoteLine" WHERE id=e."deliveryNoteLineId")))) THEN RAISE EXCEPTION 'Consumo de reserva debe pertenecer al mismo registro o guía y operación'; END IF;
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
CREATE OR REPLACE FUNCTION public.proteger_reserva_stock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w public."WorkOrder"; l public."WorkOrderLine"; a public."StockReservationAllocation"; d public."WorkOrderDetail"; s public."WorkOrderSupplyPlan"; fisico numeric; activa numeric; clasificacion text; c public."ProductionConsumption"; o public."ProductionOutput"; g public."DeliveryNoteLine";
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Reservas y eventos inmutables; registrar liberación con motivo'; END IF;
 IF TG_TABLE_NAME='StockReservationEvent' THEN
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId";
  SELECT * INTO w FROM public."WorkOrder" WHERE id=a."workOrderId" FOR UPDATE;
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=NEW."allocationId" FOR UPDATE;
  IF w.id IS NULL OR w."schemaVersion" IS DISTINCT FROM 1 OR (w.status::text NOT IN ('PENDIENTE','EN_PROCESO','ANULADO') AND NOT (w.status::text='FINALIZADO' AND NEW.type::text='CONSUMIR' AND NEW."deliveryNoteLineId" IS NOT NULL)) THEN RAISE EXCEPTION 'Liberación requiere trabajo pendiente/en proceso o anulación propia coordinada'; END IF;
  IF NEW.type::text='CONSUMIR' THEN
   IF NEW."deliveryNoteLineId" IS NOT NULL THEN
    SELECT * INTO g FROM public."DeliveryNoteLine" WHERE id=NEW."deliveryNoteLineId";
    IF w.status::text NOT IN ('EN_PROCESO','FINALIZADO') OR g.id IS NULL OR
       (SELECT kind::text FROM public."DeliveryNote" WHERE id=g."deliveryNoteId") IS DISTINCT FROM 'ENTREGA' OR
       a.purpose::text IS DISTINCT FROM (CASE WHEN g."executionMode"::text='CATALOGO' THEN 'ENTREGA_PRODUCTO' ELSE 'ENTREGA_DIRECTA_MP' END) OR
       (g."workOrderId",g."workOrderLineId",g."rawMaterialId",g."productId",g."warehouseId",g."unitMeasureId") IS DISTINCT FROM
       (a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."productId",a."warehouseId",a."unitMeasureId") THEN RAISE EXCEPTION 'Débito de despacho debe usar reserva propia y recurso de la misma partida'; END IF;
   ELSE
    SELECT * INTO c FROM public."ProductionConsumption" WHERE id=NEW."productionConsumptionId";
    IF a.purpose::text<>'CONSUMO_PRODUCCION' OR c.id IS NULL OR (c."workOrderId",c."workOrderLineId",c."rawMaterialId",c."warehouseId",c."unitMeasureId") IS DISTINCT FROM (a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId") THEN RAISE EXCEPTION 'Débito debe consumir reserva propia del mismo insumo y línea'; END IF;
   END IF;
  END IF;
  IF a."rawMaterialId" IS NOT NULL THEN PERFORM id FROM public."RawMaterial" WHERE id=a."rawMaterialId" FOR UPDATE;
  ELSE PERFORM id FROM public."Product" WHERE id=a."productId" FOR UPDATE; END IF;
  IF NEW.quantity>public.reserva_activa_asignacion(a.id) THEN RAISE EXCEPTION 'Liberación excede remanente de reserva'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=NEW."workOrderId" FOR UPDATE;
 SELECT * INTO l FROM public."WorkOrderLine" WHERE id=NEW."workOrderLineId";
 IF w."schemaVersion" IS DISTINCT FROM 1 OR (w.status::text NOT IN ('PENDIENTE','EN_PROCESO') AND NOT (w.status::text='FINALIZADO' AND NEW."correctionDeliveryNoteLineId" IS NOT NULL)) OR l."workOrderId" IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'Reserva requiere línea del trabajo nuevo pendiente o en proceso'; END IF;
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
 ELSIF NEW."supplyPlanId" IS NOT NULL THEN
  SELECT * INTO s FROM public."WorkOrderSupplyPlan" WHERE id=NEW."supplyPlanId";
  IF w."salesOrderId" IS NULL OR (s."workOrderId",s."workOrderLineId",s."rawMaterialId",s."productId",s."warehouseId") IS DISTINCT FROM
     (NEW."workOrderId",NEW."workOrderLineId",NEW."rawMaterialId",NEW."productId",NEW."warehouseId") OR
     (NEW."unitMeasureId",NEW."unitName",NEW."unitAbbreviation",NEW."resourceCode",NEW."resourceName") IS DISTINCT FROM
     (l."unitMeasureId",l."unitName",l."unitAbbreviation",l.code,l.description) THEN RAISE EXCEPTION 'Reserva comercial no corresponde a abastecimiento histórico'; END IF;
 ELSE
  SELECT * INTO o FROM public."ProductionOutput" WHERE id=NEW."productionOutputId" AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionOutput"."productionRecordId");
  IF w."salesOrderId" IS NULL OR o.id IS NULL OR (NEW."workOrderId",NEW."workOrderLineId",NEW."productId",NEW."warehouseId",NEW."unitMeasureId",NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") IS DISTINCT FROM (o."workOrderId",o."workOrderLineId",o."productId",o."warehouseId",o."unitMeasureId",o."productCode"::text,o."productName",o."unitName",o."unitAbbreviation") THEN RAISE EXCEPTION 'Reserva del resultado exige línea comercial y copias del resultado fabricado'; END IF;
 END IF;
 IF NEW."correctionDeliveryNoteLineId" IS NOT NULL THEN
  SELECT * INTO g FROM public."DeliveryNoteLine" WHERE id=NEW."correctionDeliveryNoteLineId";
  SELECT * INTO a FROM public."StockReservationAllocation" WHERE id=(SELECT "allocationId" FROM public."StockReservationEvent" WHERE id=NEW."restoresReservationEventId" AND type::text='CONSUMIR' AND "deliveryNoteLineId"=g."correctsDeliveryNoteLineId");
  IF a.id IS NULL OR (SELECT kind::text FROM public."DeliveryNote" WHERE id=g."deliveryNoteId") IS DISTINCT FROM 'CORRECCION' OR
    (SELECT "creationKey" FROM public."DeliveryNote" WHERE id=g."deliveryNoteId") IS DISTINCT FROM NEW."operationId" OR
    (g."workOrderId",g."workOrderLineId",g."warehouseId",g."rawMaterialId",g."productId") IS DISTINCT FROM
    (NEW."workOrderId",NEW."workOrderLineId",NEW."warehouseId",NEW."rawMaterialId",NEW."productId") OR
    (a.purpose,a."plannedDetailId",a."supplyPlanId",a."productionOutputId",a."unitMeasureId",a."resourceCode",a."resourceName",a."unitName",a."unitAbbreviation") IS DISTINCT FROM
    (NEW.purpose,NEW."plannedDetailId",NEW."supplyPlanId",NEW."productionOutputId",NEW."unitMeasureId",NEW."resourceCode",NEW."resourceName",NEW."unitName",NEW."unitAbbreviation") OR
    NEW.quantity+coalesce((SELECT sum(quantity) FROM public."StockReservationAllocation" WHERE "restoresReservationEventId"=NEW."restoresReservationEventId"),0)>
    (SELECT quantity FROM public."StockReservationEvent" WHERE id=NEW."restoresReservationEventId") THEN
   RAISE EXCEPTION 'Restitución exige débito original, partida inversa y cantidad aún no devuelta'; END IF;
 END IF;
 activa:=public.reserva_activa_recurso(NEW."rawMaterialId",NEW."productId",NEW."warehouseId");
 IF activa+NEW.quantity>coalesce(fisico,0) THEN RAISE EXCEPTION 'Stock libre insuficiente para reserva; otras reservas se conservan'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.comprobar_cierre_factura() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF w.status::text='FINALIZADO' AND op.type::text NOT IN ('FINALIZAR','REGISTRAR_FACTURA','CORREGIR_FACTURA','DESPACHAR','CORREGIR_DESPACHO') THEN RAISE EXCEPTION 'Operación incompatible con OT finalizada'; END IF;
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
-- Completa el contrato de corrección sobre las comprobaciones G1 que se conservan.
CREATE OR REPLACE FUNCTION public.comprobar_operacion_despacho() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g public."DeliveryNote"; partida public."DeliveryNoteLine"; original public."DeliveryNote";
BEGIN
 IF NEW.type::text NOT IN ('DESPACHAR','CORREGIR_DESPACHO') THEN RETURN NULL; END IF;
 SELECT * INTO g FROM public."DeliveryNote" WHERE id=NEW."deliveryNoteId";
 IF g.id IS NULL OR g.kind::text IS DISTINCT FROM (CASE WHEN NEW.type::text='DESPACHAR' THEN 'ENTREGA' ELSE 'CORRECCION' END) OR
    g."creationKey" IS DISTINCT FROM NEW."idempotencyKey" OR
    (NEW."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (NEW."afterSnapshot"-ARRAY['header']) OR
    (public.normalizar_cabecera_snapshot_trabajo(NEW."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM
    (public.normalizar_cabecera_snapshot_trabajo(NEW."afterSnapshot"->'header')-ARRAY['version','updatedAt']) THEN
  RAISE EXCEPTION 'Despacho/corrección exige operación propia sin alterar plan ni contrato'; END IF;
 IF NEW.type::text='DESPACHAR' THEN
  IF EXISTS(SELECT 1 FROM public."StockReservationAllocation" WHERE "operationId"=NEW."idempotencyKey") OR
    EXISTS(SELECT 1 FROM public."StockReservationEvent" e LEFT JOIN public."DeliveryNoteLine" l ON l.id=e."deliveryNoteLineId"
      WHERE e."operationId"=NEW."idempotencyKey" AND (e.type::text<>'CONSUMIR' OR l."deliveryNoteId" IS DISTINCT FROM g.id)) THEN
   RAISE EXCEPTION 'Despacho sólo consume reservas de sus partidas'; END IF;
 ELSE
  SELECT * INTO original FROM public."DeliveryNote" WHERE id=g."correctsDeliveryNoteId";
  IF g."dispatchDate"<original."dispatchDate" OR NEW.reason IS DISTINCT FROM g."correctionReason" OR
    EXISTS(SELECT 1 FROM public."StockReservationEvent" WHERE "operationId"=NEW."idempotencyKey") OR
    EXISTS(SELECT 1 FROM public."StockReservationAllocation" a LEFT JOIN public."DeliveryNoteLine" l ON l.id=a."correctionDeliveryNoteLineId"
     WHERE a."operationId"=NEW."idempotencyKey" AND l."deliveryNoteId" IS DISTINCT FROM g.id) THEN
   RAISE EXCEPTION 'Corrección exige fecha/motivo propios y sólo reconstruye reservas de su devolución'; END IF;
  FOR partida IN SELECT * FROM public."DeliveryNoteLine" WHERE "deliveryNoteId"=g.id LOOP
   IF EXISTS(SELECT 1 FROM public."DeliveryNoteLine" duplicada WHERE duplicada."deliveryNoteId"=g.id AND duplicada."correctsDeliveryNoteLineId"=partida."correctsDeliveryNoteLineId" AND duplicada.id<>partida.id) THEN
    RAISE EXCEPTION 'No repetir la partida original en una corrección'; END IF;
   IF partida."executionMode"::text IN ('CATALOGO','VENTA_DIRECTA_MP') THEN
    IF NOT g."physicalRestitutionConfirmed" OR
      (SELECT coalesce(sum(a.quantity),0) FROM public."StockReservationAllocation" a WHERE a."correctionDeliveryNoteLineId"=partida.id AND a."operationId"=NEW."idempotencyKey")<>partida.quantity THEN
     RAISE EXCEPTION 'Devolución física requiere recepción confirmada y restitución exacta de reserva propia'; END IF;
   ELSIF EXISTS(SELECT 1 FROM public."StockReservationAllocation" WHERE "correctionDeliveryNoteLineId"=partida.id) THEN
    RAISE EXCEPTION 'Corrección de prestación no crea reservas'; END IF;
  END LOOP;
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.validar_cierre_trabajo(wid integer,fecha date) RETURNS boolean LANGUAGE plpgsql AS $$
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
   IF reservado<>l.quantity-public.entrega_neta_linea_trabajo(l.id) THEN RAISE EXCEPTION 'Preparación de línea % requiere reservas completas del pendiente de entrega',l.position; END IF;
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
CREATE OR REPLACE FUNCTION public.snapshot_preparacion_trabajo(wid integer) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'mode',l."executionMode",'unit',l."unitAbbreviation",'quantity',l.quantity::text,
 'delivered',public.entrega_neta_linea_trabajo(l.id)::text,'pendingDelivery',(l.quantity-public.entrega_neta_linea_trabajo(l.id))::text,
 'required',CASE WHEN l."executionMode"::text='CATALOGO' THEN l."quantityToProduce" WHEN l."executionMode"::text IN ('SERVICIO','A_MEDIDA') THEN l.quantity ELSE 0 END::text,
 'executed',coalesce((SELECT sum(r.quantity) FROM "ProductionRecord" r WHERE r."workOrderLineId"=l.id AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"=r.id)),0)::text,
 'reserved',coalesce((SELECT sum(public.reserva_activa_asignacion(a.id)) FROM "StockReservationAllocation" a WHERE a."workOrderLineId"=l.id AND a.purpose::text IN ('ENTREGA_PRODUCTO','ENTREGA_DIRECTA_MP')),0)::text,
 'allocations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'warehouseId',a."warehouseId",'warehouse',b.name,'active',public.reserva_activa_asignacion(a.id)::text,
 'physical',coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN (SELECT quantity FROM "WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE (SELECT quantity FROM "ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0)::text,
 'totalReserved',public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")::text) ORDER BY a.id) FROM "StockReservationAllocation" a JOIN "Warehouse" b ON b.id=a."warehouseId" WHERE a."workOrderLineId"=l.id AND public.reserva_activa_asignacion(a.id)>0),'[]'::jsonb)
 ) ORDER BY l.position),'[]'::jsonb) FROM "WorkOrderLine" l WHERE l."workOrderId"=wid
$$;
COMMIT;
