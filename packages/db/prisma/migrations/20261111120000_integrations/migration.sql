-- Cuentas de Meta y Google conectadas desde el panel (tokens cifrados por la API).
-- Solo agrega una tabla nueva: no toca datos existentes.

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('META', 'GOOGLE');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accounts" JSONB NOT NULL DEFAULT '{}',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_storeId_provider_key" ON "Integration"("storeId", "provider");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
