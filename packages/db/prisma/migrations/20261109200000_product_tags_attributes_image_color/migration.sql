-- Solo agrega columnas con valor por defecto constante: no reescribe tablas ni bloquea lecturas.
ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ProductImage" ADD COLUMN "color" TEXT;
