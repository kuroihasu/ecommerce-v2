-- CreateEnum
CREATE TYPE "WaChatStatus" AS ENUM ('BOT', 'HUMAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WaAuthor" AS ENUM ('CUSTOMER', 'BOT', 'STAFF');

-- CreateTable
CREATE TABLE "WhatsappAssistant" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "testNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "displayPhone" TEXT NOT NULL DEFAULT '',
    "verifyToken" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "appSecretEnc" TEXT,
    "aiKeyEnc" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-opus-5-5',
    "instructions" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappAssistant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "name" TEXT,
    "status" "WaChatStatus" NOT NULL DEFAULT 'BOT',
    "handoffReason" TEXT,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "author" "WaAuthor" NOT NULL,
    "text" TEXT NOT NULL,
    "waMessageId" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappAssistant_storeId_key" ON "WhatsappAssistant"("storeId");

-- CreateIndex
CREATE INDEX "WaConversation_storeId_lastMessageAt_idx" ON "WaConversation"("storeId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaConversation_storeId_waId_key" ON "WaConversation"("storeId", "waId");

-- CreateIndex
CREATE UNIQUE INDEX "WaMessage_waMessageId_key" ON "WaMessage"("waMessageId");

-- CreateIndex
CREATE INDEX "WaMessage_conversationId_createdAt_idx" ON "WaMessage"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsappAssistant" ADD CONSTRAINT "WhatsappAssistant_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
