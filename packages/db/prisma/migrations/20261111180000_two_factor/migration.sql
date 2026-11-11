-- CreateTable
CREATE TABLE "UserTotp" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "pendingSecret" TEXT,
    "lastUsedStep" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTotp_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserRecoveryCode" (
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "UserRecoveryCode_pkey" PRIMARY KEY ("userId","hash")
);

-- CreateTable
CREATE TABLE "MfaFailure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfaFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MfaFailure_userId_at_idx" ON "MfaFailure"("userId", "at");

-- AddForeignKey
ALTER TABLE "UserTotp" ADD CONSTRAINT "UserTotp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecoveryCode" ADD CONSTRAINT "UserRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaFailure" ADD CONSTRAINT "MfaFailure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

