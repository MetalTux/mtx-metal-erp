-- Mínimo por material y bodega, en la unidad del material.
-- Sin DEFAULT: las filas existentes quedan sin mínimo configurado (NULL).
-- El CHECK se mantiene en SQL porque no se expresa en el esquema de Prisma.
-- PostgreSQL admite NaN en numeric; también se rechaza como umbral inválido.
ALTER TABLE "WarehouseStock"
ADD COLUMN "minStock" DECIMAL(14,3),
ADD CONSTRAINT "WarehouseStock_minStock_nonnegative_check"
CHECK ("minStock" IS NULL OR ("minStock" >= 0 AND "minStock" <> 'NaN'::numeric));
