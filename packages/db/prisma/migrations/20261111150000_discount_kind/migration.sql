-- Códigos de envío gratis y compra mínima. Solo agrega columnas con valor por defecto:
-- los códigos existentes quedan como de porcentaje y sin mínimo.

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENT', 'FREE_SHIPPING');

-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN     "kind" "DiscountKind" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "minSubtotal" INTEGER NOT NULL DEFAULT 0;
