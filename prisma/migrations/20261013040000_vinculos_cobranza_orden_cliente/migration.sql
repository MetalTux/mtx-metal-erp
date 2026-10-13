BEGIN;
-- La cuenta y sus abonos conservan origen/identidad; moverlos no puede retirar
-- la deuda ni el historial que bloquea la anulación de la orden original.
CREATE FUNCTION conservar_vinculos_cobranza_orden_cliente() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'AccountReceivable' THEN
  IF (NEW.id IS DISTINCT FROM OLD.id OR NEW."salesOrderId" IS DISTINCT FROM OLD."salesOrderId") AND
     EXISTS (SELECT 1 FROM "SalesOrder" WHERE id IN (OLD."salesOrderId", NEW."salesOrderId") AND "folioId" IS NOT NULL) THEN
   RAISE EXCEPTION 'Identidad y origen de cuenta de orden inmutables'; END IF;
 ELSE
  IF (NEW.id IS DISTINCT FROM OLD.id OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
      NEW."accountReceivableId" IS DISTINCT FROM OLD."accountReceivableId") AND
     EXISTS (SELECT 1 FROM "AccountReceivable" a JOIN "SalesOrder" o ON o.id = a."salesOrderId"
       WHERE a.id IN (OLD."accountReceivableId", NEW."accountReceivableId") AND o."folioId" IS NOT NULL) THEN
   RAISE EXCEPTION 'Identidad y origen del abono de orden inmutables'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "AccountReceivable_customer_order_identity" BEFORE UPDATE ON "AccountReceivable" FOR EACH ROW EXECUTE FUNCTION conservar_vinculos_cobranza_orden_cliente();
CREATE TRIGGER "Payment_customer_order_identity" BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION conservar_vinculos_cobranza_orden_cliente();
COMMIT;
