BEGIN;
LOCK TABLE "SalesOrder" IN SHARE ROW EXCLUSIVE MODE;

-- POSIX no incluye todos los espacios tipográficos que se copian desde PDF/Excel.
CREATE FUNCTION referencia_orden_cliente_espacios(text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT upper(regexp_replace($1, '[[:space:]' || chr(160) || chr(8199) || chr(8239) || ']+', '', 'g'))
$$;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "SalesOrder" WHERE "folioId" IS NOT NULL AND "customerOrderNumber" IS NOT NULL AND
   "customerOrderKey" IS DISTINCT FROM referencia_orden_cliente_espacios("customerOrderNumber")) THEN
  RAISE EXCEPTION 'Existen claves históricas con espacios tipográficos. Conciliar antes de migrar; no se modificó ninguna referencia original.';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION normalizar_referencia_orden_cliente(text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT referencia_orden_cliente_espacios($1)
$$;
COMMIT;
