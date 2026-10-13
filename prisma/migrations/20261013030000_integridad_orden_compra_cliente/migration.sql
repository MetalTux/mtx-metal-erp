BEGIN;

-- Comprobar las copias completas con tipos PostgreSQL: Decimal/BigInt como
-- texto e ISO de Prisma se convierten al tipo original sin redondear con JS.
CREATE FUNCTION comprobar_copia_origen_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oferta "Quote"; copia "Quote"; folio "DocumentFolio"; copia_folio "DocumentFolio"; cantidad integer;
BEGIN
 SELECT * INTO oferta FROM "Quote" WHERE id = NEW."quoteId";
 IF (NEW."quoteSnapshot"->>'schemaVersion')::integer IS DISTINCT FROM 1 OR
    jsonb_typeof(NEW."quoteSnapshot"->'details') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'La copia de origen requiere formato histórico completo'; END IF;
 SELECT * INTO copia FROM jsonb_populate_record(NULL::"Quote", NEW."quoteSnapshot"->'quote');
 IF (to_jsonb(copia) - ARRAY['status','version','updatedAt']) IS DISTINCT FROM
    (to_jsonb(oferta) - ARRAY['status','version','updatedAt']) OR copia.version IS DISTINCT FROM NEW."quoteVersion" THEN
  RAISE EXCEPTION 'La copia completa de cotización no coincide con el origen'; END IF;
 IF copia.status = 'PENDIENTE' THEN
  IF copia.version <> oferta.version - 1 OR
    oferta."validUntil" < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date OR
    NOT EXISTS (SELECT 1 FROM "QuoteOperation" WHERE "quoteId" = oferta.id AND version = oferta.version AND type = 'APROBAR') THEN
   RAISE EXCEPTION 'La aceptación pendiente requiere aprobación vigente de esa revisión'; END IF;
 ELSIF copia.status = 'APROBADA' THEN
  IF copia.version <> oferta.version THEN RAISE EXCEPTION 'La oferta aprobada conserva su revisión de origen'; END IF;
 ELSE RAISE EXCEPTION 'Estado de origen no aceptable'; END IF;
 SELECT * INTO folio FROM "DocumentFolio" WHERE id = oferta."folioId";
 SELECT * INTO copia_folio FROM jsonb_populate_record(NULL::"DocumentFolio", NEW."quoteSnapshot"->'folio');
 IF to_jsonb(copia_folio) IS DISTINCT FROM to_jsonb(folio) THEN RAISE EXCEPTION 'La copia del folio ofrecido no coincide'; END IF;
 SELECT count(*) INTO cantidad FROM "QuoteDetail" WHERE "quoteId" = oferta.id;
 IF jsonb_array_length(NEW."quoteSnapshot"->'details') <> cantidad OR
    (SELECT count(DISTINCT id) FROM jsonb_populate_recordset(NULL::"QuoteDetail", NEW."quoteSnapshot"->'details')) <> cantidad OR
    EXISTS (SELECT 1 FROM jsonb_populate_recordset(NULL::"QuoteDetail", NEW."quoteSnapshot"->'details') c
      LEFT JOIN "QuoteDetail" d ON d.id = c.id AND d."quoteId" = oferta.id
      WHERE d.id IS NULL OR to_jsonb(c) IS DISTINCT FROM to_jsonb(d)) THEN
  RAISE EXCEPTION 'La copia debe conservar todas las líneas originales sin modificarlas'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "SalesOrder_snapshot_source" BEFORE INSERT ON "SalesOrder" FOR EACH ROW EXECUTE FUNCTION comprobar_copia_origen_orden_cliente();

CREATE FUNCTION comprobar_cuenta_inicial_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "SalesOrder" WHERE id = NEW."salesOrderId" AND "folioId" IS NOT NULL) AND
   (NEW."dueDate" IS NOT NULL OR NEW."paymentPromiseDate" IS NOT NULL OR NEW."voidedAt" IS NOT NULL) THEN
  RAISE EXCEPTION 'La cuenta inicial de la orden se registra vigente y sin fechas de cobranza'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "AccountReceivable_initial_customer_order" BEFORE INSERT ON "AccountReceivable" FOR EACH ROW EXECUTE FUNCTION comprobar_cuenta_inicial_orden_cliente();

CREATE FUNCTION conservar_abono_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM "AccountReceivable" a JOIN "SalesOrder" o ON o.id = a."salesOrderId"
    WHERE a.id = OLD."accountReceivableId" AND o."folioId" IS NOT NULL) THEN
  RAISE EXCEPTION 'Conservar el historial de abonos de la orden, incluso anulados'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER "Payment_customer_order_keep" BEFORE DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION conservar_abono_orden_cliente();

CREATE FUNCTION conservar_vinculo_trabajo_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."salesOrderId" IS NOT NULL AND EXISTS (SELECT 1 FROM "SalesOrder" WHERE id = OLD."salesOrderId" AND "folioId" IS NOT NULL) THEN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar trabajo vinculado a orden de cliente'; END IF;
  IF NEW."salesOrderId" IS DISTINCT FROM OLD."salesOrderId" THEN RAISE EXCEPTION 'No desvincular ni reasignar el trabajo de una orden'; END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "WorkOrder_customer_order_keep" BEFORE UPDATE OF "salesOrderId" OR DELETE ON "WorkOrder" FOR EACH ROW EXECUTE FUNCTION conservar_vinculo_trabajo_orden_cliente();
COMMIT;
