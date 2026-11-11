import { Injectable } from '@nestjs/common';
import { AuthenticationStorage, type MfaStore, type TotpRecord } from '@nestjs/authentication';
import { PrismaService } from '../prisma/prisma.service.js';

// Dónde guarda MfaService la verificación en dos pasos: el autenticador de cada usuario
// (secreto cifrado), los hashes de los códigos de respaldo y los códigos fallidos.
// Las escrituras que evitan usar un código dos veces son de una sola sentencia.
@Injectable()
export class PrismaMfaStore implements MfaStore {
  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ mfa: this });
  }

  private get db() {
    return this.prisma.client;
  }

  async getTotp(userId: string): Promise<TotpRecord | undefined> {
    const t = await this.db.userTotp.findUnique({ where: { userId } });
    if (!t) return undefined;
    return {
      secret: t.secret,
      confirmed: t.confirmed,
      ...(t.pendingSecret ? { pendingSecret: t.pendingSecret } : {}),
      ...(t.lastUsedStep !== null ? { lastUsedStep: t.lastUsedStep } : {}),
    };
  }

  async saveTotp(userId: string, record: TotpRecord | null): Promise<void> {
    if (!record) {
      await this.db.userTotp.deleteMany({ where: { userId } });
      return;
    }
    // Nunca baja lastUsedStep (GREATEST ignora NULL): un registro leído antes de un
    // claimTotpStep() concurrente no puede reabrir ese código.
    await this.db.$executeRaw`
      INSERT INTO "UserTotp" ("userId", "secret", "confirmed", "pendingSecret", "lastUsedStep", "updatedAt")
      VALUES (${userId}, ${record.secret}, ${record.confirmed}, ${record.pendingSecret ?? null}, ${record.lastUsedStep ?? null}, now())
      ON CONFLICT ("userId") DO UPDATE SET
        "secret" = EXCLUDED."secret",
        "confirmed" = EXCLUDED."confirmed",
        "pendingSecret" = EXCLUDED."pendingSecret",
        "lastUsedStep" = GREATEST("UserTotp"."lastUsedStep", EXCLUDED."lastUsedStep"),
        "updatedAt" = now()`;
  }

  async claimTotpStep(userId: string, step: number): Promise<boolean> {
    const n = await this.db.$executeRaw`
      UPDATE "UserTotp" SET "lastUsedStep" = ${step}, "updatedAt" = now()
      WHERE "userId" = ${userId} AND ("lastUsedStep" IS NULL OR "lastUsedStep" < ${step})`;
    return n === 1;
  }

  async saveRecoveryCodes(userId: string, hashes: string[]): Promise<void> {
    await this.db.$transaction([
      this.db.userRecoveryCode.deleteMany({ where: { userId } }),
      this.db.userRecoveryCode.createMany({ data: hashes.map((hash) => ({ userId, hash })), skipDuplicates: true }),
    ]);
  }

  async consumeRecoveryCode(userId: string, hash: string): Promise<boolean> {
    const r = await this.db.userRecoveryCode.deleteMany({ where: { userId, hash } });
    return r.count === 1;
  }

  countRecoveryCodes(userId: string): Promise<number> {
    return this.db.userRecoveryCode.count({ where: { userId } });
  }

  async recordMfaFailure(userId: string, windowMs: number, now: number): Promise<number> {
    await this.db.mfaFailure.create({ data: { userId, at: new Date(now) } });
    // De paso se borran los fallos viejos de este usuario.
    await this.db.mfaFailure.deleteMany({ where: { userId, at: { lte: new Date(now - windowMs) } } });
    return this.countMfaFailures(userId, windowMs, now);
  }

  countMfaFailures(userId: string, windowMs: number, now: number): Promise<number> {
    return this.db.mfaFailure.count({ where: { userId, at: { gt: new Date(now - windowMs) } } });
  }

  async clearMfaFailures(userId: string): Promise<void> {
    await this.db.mfaFailure.deleteMany({ where: { userId } });
  }
}
