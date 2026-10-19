BEGIN;
-- M4 agregó currentInvoiceReferenceId nullable sin reescribir operaciones previas.
-- La ausencia histórica equivale exclusivamente a null para este campo conocido.
-- No eliminar la clave: un valor no nulo debe seguir siendo distinto y rechazarse.
CREATE FUNCTION public.normalizar_cabecera_snapshot_trabajo(cabecera jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT jsonb_build_object('currentInvoiceReferenceId',NULL) || cabecera
$$;

CREATE OR REPLACE FUNCTION public.comprobar_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE record_id integer; r public."ProductionRecord"; w public."WorkOrder"; op public."WorkOrderOperation"; consumo_row public."ProductionConsumption"; o public."ProductionOutput"; reservado numeric; consumido numeric;
BEGIN
 IF TG_TABLE_NAME='ProductionRecord' THEN record_id:=NEW.id;
 ELSIF TG_TABLE_NAME='WorkOrderOperation' THEN record_id:=NEW."productionRecordId";
 ELSE record_id:=NEW."productionRecordId"; END IF;
 IF record_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO r FROM public."ProductionRecord" WHERE id=record_id;
 SELECT * INTO w FROM public."WorkOrder" WHERE id=r."workOrderId";
 SELECT * INTO op FROM public."WorkOrderOperation" WHERE "productionRecordId"=r.id;
 IF op."idempotencyKey" IS NULL OR op.type::text<>'REGISTRAR_PRODUCCION' OR op."workOrderId"<>r."workOrderId" OR op.version<>r."planVersion"+1 OR
    (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
    (public.normalizar_cabecera_snapshot_trabajo(op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM (public.normalizar_cabecera_snapshot_trabajo(op."afterSnapshot"->'header')-ARRAY['version','updatedAt']) THEN RAISE EXCEPTION 'Producción exige operación propia sin cambiar plan'; END IF;
 IF r.type::text='FABRICACION_PRODUCTO' THEN
  SELECT * INTO o FROM public."ProductionOutput" WHERE "productionRecordId"=r.id;
  IF o.id IS NULL OR NOT EXISTS(SELECT 1 FROM public."ProductStockMovement" WHERE "productionOutputId"=o.id AND type::text='ENTRADA' AND quantity=o.quantity AND date=r.date) THEN RAISE EXCEPTION 'Fabricación requiere entrada de terminado vinculada'; END IF;
  IF w."salesOrderId" IS NOT NULL AND (SELECT coalesce(sum(a.quantity),0) FROM public."StockReservationAllocation" a WHERE a."productionOutputId"=o.id AND a."operationId"=op."idempotencyKey")<>o.quantity THEN RAISE EXCEPTION 'Resultado comercial exige reserva completa simultánea'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM public."ProductionOutput" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Servicio/a medida no crea resultado ficticio'; END IF;
 END IF;
 IF r.type::text='SERVICIO' AND EXISTS(SELECT 1 FROM public."ProductionConsumption" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Servicio puro no tiene consumos'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r."expectedSnapshot"->'distribution') x WHERE (x->>'quantity')::numeric<>coalesce((SELECT sum(quantity) FROM public."ProductionConsumption" c WHERE c."productionRecordId"=r.id AND c."rawMaterialId"=(x->>'rawMaterialId')::integer AND c."warehouseId"=(x->>'warehouseId')::integer),0)) OR EXISTS(SELECT 1 FROM public."ProductionConsumption" c WHERE c."productionRecordId"=r.id AND c.quantity<>c."expectedQuantity") THEN
  IF coalesce(length(btrim(r."deviationReason")),0)=0 THEN RAISE EXCEPTION 'Diferencias, omisiones, sustituciones o cambios de bodega requieren motivo'; END IF;
 END IF;
 FOR consumo_row IN SELECT * FROM public."ProductionConsumption" WHERE "productionRecordId"=r.id LOOP
  IF NOT EXISTS(SELECT 1 FROM public."StockMovement" WHERE "productionConsumptionId"=consumo_row.id AND type::text='SALIDA' AND quantity=-consumo_row.quantity AND ((date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date=r.date) THEN RAISE EXCEPTION 'Consumo exige salida física vinculada y misma fecha'; END IF;
  IF (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=consumo_row."rawMaterialId" AND "warehouseId"=consumo_row."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM public."StockMovement" WHERE "rawMaterialId"=consumo_row."rawMaterialId" AND "warehouseId"=consumo_row."warehouseId") THEN RAISE EXCEPTION 'Consumo requiere saldo y Kardex atómicos'; END IF;
  SELECT coalesce(sum(e.quantity),0) INTO consumido FROM public."StockReservationEvent" e WHERE e."productionConsumptionId"=consumo_row.id;
  SELECT coalesce(sum(public.reserva_activa_asignacion(a.id)+coalesce((SELECT sum(e.quantity) FROM public."StockReservationEvent" e WHERE e."allocationId"=a.id AND e."operationId"=op."idempotencyKey"),0)),0) INTO reservado FROM public."StockReservationAllocation" a WHERE a."workOrderLineId"=consumo_row."workOrderLineId" AND a."rawMaterialId"=consumo_row."rawMaterialId" AND a."warehouseId"=consumo_row."warehouseId" AND a.purpose::text='CONSUMO_PRODUCCION';
  IF consumido<>least(consumo_row.quantity,reservado) THEN RAISE EXCEPTION 'Consumir primero reserva propia elegible, sin sustituirla por liberación'; END IF;
 END LOOP;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.comprobar_inicio_trabajo() RETURNS trigger LANGUAGE plpgsql AS $$
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
    (public.normalizar_cabecera_snapshot_trabajo(NEW."beforeSnapshot"->'header')-ARRAY['status','startedDate','version','updatedAt']) IS DISTINCT FROM
    (public.normalizar_cabecera_snapshot_trabajo(NEW."afterSnapshot"->'header')-ARRAY['status','startedDate','version','updatedAt']) OR
    NEW."reservationSnapshot" IS DISTINCT FROM anterior."reservationSnapshot" THEN
  RAISE EXCEPTION 'Inicio exige transición única sin cambiar plan ni reservas'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.comprobar_reversion_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_id integer; v public."ProductionReversal"; r public."ProductionRecord"; op public."WorkOrderOperation"; c public."ProductionReversalConsumption"; o public."ProductionReversalOutput";
BEGIN
 IF TG_TABLE_NAME='ProductionReversal' THEN v_id:=NEW.id; ELSE v_id:=NEW."productionReversalId"; END IF;
 IF v_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO v FROM "ProductionReversal" WHERE id=v_id;
 SELECT * INTO r FROM "ProductionRecord" WHERE id=v."productionRecordId";
 SELECT * INTO op FROM "WorkOrderOperation" WHERE "productionReversalId"=v.id;
 IF op."idempotencyKey" IS NULL OR op.type::text<>'REVERTIR_PRODUCCION' OR op."workOrderId"<>v."workOrderId" OR op.version<>v."planVersion"+1 OR op.reason IS DISTINCT FROM v.reason OR
    (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
    (public.normalizar_cabecera_snapshot_trabajo(op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM (public.normalizar_cabecera_snapshot_trabajo(op."afterSnapshot"->'header')-ARRAY['version','updatedAt']) THEN RAISE EXCEPTION 'Reversión requiere operación propia sin cambiar plan'; END IF;
 IF (SELECT count(*) FROM "ProductionReversalConsumption" WHERE "productionReversalId"=v.id)<>(SELECT count(*) FROM "ProductionConsumption" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Reversión debe incluir todos los consumos originales'; END IF;
 IF (SELECT count(*) FROM "ProductionReversalOutput" WHERE "productionReversalId"=v.id)<>(SELECT count(*) FROM "ProductionOutput" WHERE "productionRecordId"=r.id) THEN RAISE EXCEPTION 'Reversión debe incluir resultado original'; END IF;
 FOR c IN SELECT * FROM "ProductionReversalConsumption" WHERE "productionReversalId"=v.id LOOP
  IF NOT EXISTS(SELECT 1 FROM "StockMovement" WHERE "productionReversalConsumptionId"=c.id AND type::text='AJUSTE' AND quantity=c.quantity AND ((date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date=v.date) OR
     (SELECT quantity FROM "WarehouseStock" WHERE "rawMaterialId"=c."rawMaterialId" AND "warehouseId"=c."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM "StockMovement" WHERE "rawMaterialId"=c."rawMaterialId" AND "warehouseId"=c."warehouseId") THEN RAISE EXCEPTION 'Restitución requiere cantidad, fecha, saldo y Kardex atómicos'; END IF;
 END LOOP;
 SELECT * INTO o FROM "ProductionReversalOutput" WHERE "productionReversalId"=v.id;
 IF o.id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM "ProductStockMovement" WHERE "productionReversalOutputId"=o.id AND type::text='AJUSTE' AND quantity=-o.quantity AND date=v.date) OR
     (SELECT quantity FROM "ProductWarehouseStock" WHERE "productId"=o."productId" AND "warehouseId"=o."warehouseId") IS DISTINCT FROM (SELECT coalesce(sum(quantity),0) FROM "ProductStockMovement" WHERE "productId"=o."productId" AND "warehouseId"=o."warehouseId") THEN RAISE EXCEPTION 'Retiro requiere cantidad, fecha, saldo y Kardex atómicos'; END IF;
  IF EXISTS(SELECT 1 FROM "StockReservationAllocation" a WHERE a."productionOutputId"=o."productionOutputId" AND public.reserva_activa_asignacion(a.id)>0) THEN RAISE EXCEPTION 'Liberar reservas del resultado revertido en la misma operación'; END IF;
 END IF;
 -- No se puede ocultar una ejecución mediante anulación posterior: sólo pendiente y sin inicio.
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
  IF origen."workOrderId" IS DISTINCT FROM work_id OR origen.type::text NOT IN ('CREAR','EDITAR_PLAN','RESERVAR_STOCK','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION') THEN RAISE EXCEPTION 'Asignación requiere operación de reserva del mismo trabajo'; END IF;
  IF origen.type::text='REVERTIR_PRODUCCION' AND (a."plannedDetailId" IS NULL OR a.purpose::text<>'CONSUMO_PRODUCCION') THEN RAISE EXCEPTION 'Reversión sólo reconstruye reservas de requerimientos pendientes'; END IF;
  IF origen.type::text='REGISTRAR_PRODUCCION' AND a."productionOutputId" IS NULL THEN RAISE EXCEPTION 'Producción sólo crea reservas del resultado fabricado'; END IF;
  active:=public.reserva_activa_asignacion(a.id);
  IF active<0 THEN RAISE EXCEPTION 'Débitos exceden asignación de reserva'; END IF;
  IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId"
    WHERE e."allocationId"=a.id AND (o."workOrderId"<>work_id OR o.version<origen.version OR o.type::text NOT IN ('EDITAR_PLAN','LIBERAR_RESERVA','ANULAR','REGISTRAR_PRODUCCION','REVERTIR_PRODUCCION'))) THEN RAISE EXCEPTION 'Evento de reserva debe pertenecer a revisión compatible del mismo trabajo'; END IF;
  IF active>0 THEN
   IF w.status::text='ANULADO' THEN RAISE EXCEPTION 'Anulación debe liberar todas sus reservas'; END IF;
   IF a."plannedDetailId" IS NOT NULL THEN
    SELECT public.demanda_pendiente_requerimiento(d.id) INTO demanda FROM public."WorkOrderDetail" d WHERE d.id=a."plannedDetailId" AND d."retiredAt" IS NULL AND
      (d."workOrderId",d."workOrderLineId",d."rawMaterialId",d."warehouseId",d."unitMeasureId")=(a."workOrderId",a."workOrderLineId",a."rawMaterialId",a."warehouseId",a."unitMeasureId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."plannedDetailId"=a."plannedDetailId")>demanda THEN RAISE EXCEPTION 'Reservas superan requerimiento vigente o recurso fue sustituido'; END IF;
   ELSIF a."supplyPlanId" IS NOT NULL THEN
    SELECT s.quantity INTO demanda FROM public."WorkOrderSupplyPlan" s WHERE s.id=a."supplyPlanId" AND s."retiredAt" IS NULL AND
      (s."workOrderId",s."workOrderLineId",s."warehouseId")=(a."workOrderId",a."workOrderLineId",a."warehouseId") AND s."rawMaterialId" IS NOT DISTINCT FROM a."rawMaterialId" AND s."productId" IS NOT DISTINCT FROM a."productId";
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."supplyPlanId"=a."supplyPlanId")>demanda THEN RAISE EXCEPTION 'Reservas superan abastecimiento vigente o recurso fue sustituido'; END IF;
   ELSE
    SELECT quantity INTO demanda FROM public."ProductionOutput" WHERE id=a."productionOutputId" AND "workOrderId"=work_id AND "workOrderLineId"=a."workOrderLineId" AND "productId"=a."productId" AND "warehouseId"=a."warehouseId" AND NOT EXISTS(SELECT 1 FROM "ProductionReversal" v WHERE v."productionRecordId"="ProductionOutput"."productionRecordId");
    IF demanda IS NULL OR (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."productionOutputId"=a."productionOutputId")>demanda THEN RAISE EXCEPTION 'Reservas del resultado superan cantidad fabricada'; END IF;
   END IF;
   IF a.purpose::text='ENTREGA_PRODUCTO' AND (SELECT sum(public.reserva_activa_asignacion(b.id)) FROM public."StockReservationAllocation" b WHERE b."workOrderLineId"=a."workOrderLineId" AND b.purpose::text='ENTREGA_PRODUCTO')>(SELECT quantity FROM public."WorkOrderLine" WHERE id=a."workOrderLineId") THEN RAISE EXCEPTION 'Cobertura de terminado supera compromiso de la línea'; END IF;
   IF public.reserva_activa_recurso(a."rawMaterialId",a."productId",a."warehouseId")>coalesce(CASE WHEN a."rawMaterialId" IS NOT NULL THEN
       (SELECT quantity FROM public."WarehouseStock" WHERE "rawMaterialId"=a."rawMaterialId" AND "warehouseId"=a."warehouseId") ELSE
       (SELECT quantity FROM public."ProductWarehouseStock" WHERE "productId"=a."productId" AND "warehouseId"=a."warehouseId") END,0) THEN RAISE EXCEPTION 'Reservas exceden físico'; END IF;
  END IF;
 END LOOP;
 IF op.type::text IN ('RESERVAR_STOCK','LIBERAR_RESERVA') AND (
   (op."beforeSnapshot"-ARRAY['header']) IS DISTINCT FROM (op."afterSnapshot"-ARRAY['header']) OR
   (public.normalizar_cabecera_snapshot_trabajo(op."beforeSnapshot"->'header')-ARRAY['version','updatedAt']) IS DISTINCT FROM (public.normalizar_cabecera_snapshot_trabajo(op."afterSnapshot"->'header')-ARRAY['version','updatedAt'])) THEN RAISE EXCEPTION 'Operación de reserva no puede modificar el plan'; END IF;
 IF EXISTS(SELECT 1 FROM public."StockReservationEvent" e JOIN public."StockReservationAllocation" alloc ON alloc.id=e."allocationId" JOIN public."WorkOrderOperation" o ON o."idempotencyKey"=e."operationId" LEFT JOIN public."ProductionConsumption" c ON c.id=e."productionConsumptionId" WHERE alloc."workOrderId"=work_id AND e.type::text='CONSUMIR' AND (o.type::text<>'REGISTRAR_PRODUCCION' OR o."productionRecordId" IS DISTINCT FROM c."productionRecordId")) THEN RAISE EXCEPTION 'Consumo de reserva debe pertenecer al mismo registro y operación'; END IF;
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

COMMIT;
