-- Boletas electrónicas: configuración del proveedor por tienda y una boleta por pedido.
-- Solo agrega tablas nuevas.

-- CreateEnum
CREATE TYPE "DteStatus" AS ENUM ('ISSUING', 'ISSUED', 'FAILED');

-- CreateTable
CREATE TABLE "BillingConfig" (
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openfactura',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "exempt" BOOLEAN NOT NULL DEFAULT false,
    "issuer" JSONB NOT NULL DEFAULT '{}',
    "apiKeyEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingConfig_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "Dte" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" INTEGER NOT NULL,
    "folio" INTEGER,
    "status" "DteStatus" NOT NULL DEFAULT 'ISSUING',
    "test" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL,
    "token" TEXT,
    "total" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "exemptAmount" INTEGER NOT NULL DEFAULT 0,
    "receiverRut" TEXT NOT NULL,
    "issueDate" DATE,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dte_orderId_key" ON "Dte"("orderId");

-- CreateIndex
CREATE INDEX "Dte_storeId_createdAt_idx" ON "Dte"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "BillingConfig" ADD CONSTRAINT "BillingConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dte" ADD CONSTRAINT "Dte_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dte" ADD CONSTRAINT "Dte_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
