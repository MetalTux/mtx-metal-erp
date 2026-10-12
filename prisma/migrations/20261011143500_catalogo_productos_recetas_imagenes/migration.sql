BEGIN;
-- AlterTable
ALTER TABLE "QuoteDetail" ADD COLUMN     "productCode" UUID,
ADD COLUMN     "productId" INTEGER,
ADD COLUMN     "productUnitAbbreviation" TEXT,
ADD COLUMN     "productUnitName" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "code" UUID NOT NULL,
    "creationKey" UUID NOT NULL,
    "creationFingerprint" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "unitMeasureId" INTEGER NOT NULL,
    "suggestedPrice" DECIMAL(14,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRecipe" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "rawMaterialId" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "fileKey" VARCHAR(40) NOT NULL,
    "position" INTEGER NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_creationKey_key" ON "Product"("creationKey");

-- CreateIndex
CREATE INDEX "Product_unitMeasureId_idx" ON "Product"("unitMeasureId");

-- CreateIndex
CREATE INDEX "ProductRecipe_rawMaterialId_idx" ON "ProductRecipe"("rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecipe_productId_rawMaterialId_key" ON "ProductRecipe"("productId", "rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_fileKey_key" ON "ProductImage"("fileKey");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "QuoteDetail_productId_idx" ON "QuoteDetail"("productId");

-- AddForeignKey
ALTER TABLE "QuoteDetail" ADD CONSTRAINT "QuoteDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitMeasureId_fkey" FOREIGN KEY ("unitMeasureId") REFERENCES "UnitMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_valid_check" CHECK (
 btrim(name) <> '' AND version > 0 AND "creationFingerprint" ~ '^[0-9a-f]{64}$'
 AND ("suggestedPrice" IS NULL OR ("suggestedPrice" <> 'NaN'::numeric AND "suggestedPrice" >= 0 AND "suggestedPrice" = trunc("suggestedPrice")))
);
ALTER TABLE "ProductRecipe" ADD CONSTRAINT "ProductRecipe_quantity_check" CHECK (quantity > 0 AND quantity <> 'NaN'::numeric);
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_valid_check" CHECK (position BETWEEN 0 AND 9 AND "fileKey" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]png$');
ALTER TABLE "QuoteDetail" ADD CONSTRAINT "QuoteDetail_product_check" CHECK (
 ("productId" IS NULL AND "productCode" IS NULL AND "productUnitName" IS NULL AND "productUnitAbbreviation" IS NULL)
 OR ("productId" IS NOT NULL AND "rawMaterialId" IS NULL AND "productCode" IS NOT NULL
 AND coalesce(btrim("productUnitName"),'') <> '' AND coalesce(btrim("productUnitAbbreviation"),'') <> '')
);
CREATE FUNCTION proteger_producto() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar producto y UUID mediante baja logica'; END IF;
 IF NEW.code <> OLD.code OR NEW.id <> OLD.id OR NEW."creationKey" <> OLD."creationKey" OR NEW."creationFingerprint" <> OLD."creationFingerprint"
 THEN RAISE EXCEPTION 'Identidad de producto inmutable'; END IF;
 IF OLD."deletedAt" IS NOT NULL THEN RAISE EXCEPTION 'Producto eliminado inmutable'; END IF;
 IF NEW."unitMeasureId" <> OLD."unitMeasureId" AND
 (EXISTS (SELECT 1 FROM "ProductRecipe" WHERE "productId" = OLD.id) OR EXISTS (SELECT 1 FROM "QuoteDetail" WHERE "productId" = OLD.id))
 THEN RAISE EXCEPTION 'Unidad de producto bloqueada por referencias'; END IF;
 IF NEW."deletedAt" IS NOT NULL AND EXISTS (SELECT 1 FROM "QuoteDetail" WHERE "productId" = OLD.id)
 THEN RAISE EXCEPTION 'Producto referenciado no eliminable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Product_protect" BEFORE UPDATE OR DELETE ON "Product" FOR EACH ROW EXECUTE FUNCTION proteger_producto();
CREATE FUNCTION proteger_material_recetado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."unitMeasureId" <> OLD."unitMeasureId" AND EXISTS (SELECT 1 FROM "ProductRecipe" WHERE "rawMaterialId" = OLD.id)
 THEN RAISE EXCEPTION 'Unidad de material bloqueada por recetas'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "RawMaterial_recipe_unit" BEFORE UPDATE ON "RawMaterial" FOR EACH ROW EXECUTE FUNCTION proteger_material_recetado();
CREATE FUNCTION bloquear_receta_producto() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE material int; producto int;
BEGIN
 material := CASE WHEN TG_OP = 'DELETE' THEN OLD."rawMaterialId" ELSE NEW."rawMaterialId" END;
 producto := CASE WHEN TG_OP = 'DELETE' THEN OLD."productId" ELSE NEW."productId" END;
 IF TG_OP = 'UPDATE' AND (NEW."rawMaterialId" <> OLD."rawMaterialId" OR NEW."productId" <> OLD."productId") THEN RAISE EXCEPTION 'Sustituir linea de receta sin cambiar su identidad'; END IF;
 PERFORM id FROM "RawMaterial" WHERE id = material FOR UPDATE;
 PERFORM id FROM "Product" WHERE id = producto AND "deletedAt" IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductRecipe_lock" BEFORE INSERT OR UPDATE OR DELETE ON "ProductRecipe" FOR EACH ROW EXECUTE FUNCTION bloquear_receta_producto();
CREATE FUNCTION proteger_imagen_producto() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Conservar referencia de imagen mediante retirada logica'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW."fileKey" <> OLD."fileKey" OR NEW."productId" <> OLD."productId" OR OLD."removedAt" IS NOT NULL)
 THEN RAISE EXCEPTION 'Identidad e imagen retirada inmutables'; END IF;
 PERFORM id FROM "Product" WHERE id = NEW."productId" AND "deletedAt" IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no disponible'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "ProductImage_protect" BEFORE INSERT OR UPDATE OR DELETE ON "ProductImage" FOR EACH ROW EXECUTE FUNCTION proteger_imagen_producto();
CREATE FUNCTION comprobar_galeria_producto() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT count(*) FROM "ProductImage" WHERE "productId" = NEW."productId" AND "removedAt" IS NULL) > 10
 THEN RAISE EXCEPTION 'Hasta diez imagenes por producto'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "ProductImage_limit" AFTER INSERT OR UPDATE ON "ProductImage" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_galeria_producto();
CREATE FUNCTION comprobar_producto_cotizado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE codigo uuid;
BEGIN
 IF NEW."productId" IS NOT NULL THEN
  SELECT code INTO codigo FROM "Product" WHERE id = NEW."productId" AND "deletedAt" IS NULL FOR UPDATE;
  IF NOT FOUND OR codigo <> NEW."productCode" THEN RAISE EXCEPTION 'Producto no disponible o UUID ajeno'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "QuoteDetail_product" BEFORE INSERT OR UPDATE ON "QuoteDetail" FOR EACH ROW EXECUTE FUNCTION comprobar_producto_cotizado();
COMMIT;
