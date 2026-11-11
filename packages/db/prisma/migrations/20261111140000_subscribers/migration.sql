-- Suscriptores de novedades (ruleta de regalos y pie de página). Solo agrega una tabla.

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'pie',
    "prize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_storeId_email_key" ON "Subscriber"("storeId", "email");

-- CreateIndex
CREATE INDEX "Subscriber_storeId_createdAt_idx" ON "Subscriber"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
