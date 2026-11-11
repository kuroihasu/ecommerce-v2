-- Índices para leer el catálogo: fotos y variantes por producto (en orden) y
-- productos por categoría. Sin ellos, cada carga del catálogo recorre las tablas completas.
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");
