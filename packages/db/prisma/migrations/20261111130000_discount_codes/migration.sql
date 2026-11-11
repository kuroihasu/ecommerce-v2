-- Códigos de descuento administrables desde el panel. Solo agrega una tabla.

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_storeId_code_key" ON "DiscountCode"("storeId", "code");

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El código que cada tienda ya mostraba (settings.discountCode, 10% fijo) pasa a ser
-- un código real, de usos ilimitados, para que el carrito lo siga aceptando.
INSERT INTO "DiscountCode" ("id", "storeId", "code", "percent", "updatedAt")
SELECT gen_random_uuid()::text, "id", upper(trim("settings"->>'discountCode')), 10, CURRENT_TIMESTAMP
FROM "Store"
WHERE coalesce(trim("settings"->>'discountCode'), '') <> '';

UPDATE "Store"
SET "settings" = jsonb_set("settings", '{discountPercent}', '10')
WHERE coalesce(trim("settings"->>'discountCode'), '') <> '' AND NOT ("settings" ? 'discountPercent');
