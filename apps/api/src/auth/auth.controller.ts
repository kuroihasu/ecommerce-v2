import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Authenticate, AuthenticationError, CurrentUser, MfaAlreadyEnrolledError, MfaService, PasswordHasher, Public, TokenService } from '@nestjs/authentication';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { authEnabled } from './auth.config.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';
import { FailureCounter } from './rate-limit.js';
import type { AuthUser } from './auth.types.js';
import { RequireTwoFactor } from './step-up.js';

const totp = z.string().trim().regex(/^\d{6}$/, 'El código son 6 números');
const recovery = z.string().trim().min(6).max(40);

const LoginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1024),
  // Segundo paso, solo para quien activó la verificación en dos pasos.
  code: totp.optional(),
  recoveryCode: recovery.optional(),
});

const CodeBody = z.object({ code: totp });
const SecondFactorBody = z.object({ code: totp.optional(), recoveryCode: recovery.optional() }).refine((b) => b.code || b.recoveryCode, 'Escribe el código de tu app');

// Además del límite por IP: 10 contraseñas malas para una misma cuenta la bloquean 15
// minutos, aunque los intentos vengan de muchas IP distintas.
const failures = new FailureCounter(10, 15 * 60_000);

// Respuesta cuando falta o falla el segundo paso: la web muestra el campo del código.
const needsCode = (message: string) => new UnauthorizedException({ statusCode: 401, message, mfaRequired: true });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly mfa: MfaService,
  ) {}

  // Máximo 5 intentos por minuto por IP, para frenar a quien prueba contraseñas.
  @Public()
  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Body({ schema: LoginBody }) body: z.infer<typeof LoginBody>) {
    if (!authEnabled()) throw new ServiceUnavailableException('El panel no está configurado (falta AUTH_SECRET)');
    if (failures.blocked(body.email)) throw new HttpException('Demasiados intentos para esta cuenta. Espera 15 minutos y vuelve a probar.', HttpStatus.TOO_MANY_REQUESTS);
    const user = await this.prisma.client.user.findUnique({ where: { email: body.email } });
    // Con un correo desconocido igual se verifica contra un hash de relleno: la
    // respuesta tarda lo mismo y no revela qué cuentas existen.
    const ok = await this.hasher.verify(body.password, user?.passwordHash);
    if (!user || !ok) {
      failures.fail(body.email);
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    let issued: { accessToken: string; expiresIn: number };
    try {
      // Si la cuenta tiene verificación en dos pasos, issue() exige el código
      // (y cuenta los malos para el bloqueo de MfaService).
      issued = await this.tokens.issue(user.id, {
        method: 'password',
        secondFactor: body.code || body.recoveryCode ? { code: body.code, recoveryCode: body.recoveryCode } : undefined,
      });
    } catch (e) {
      if (e instanceof AuthenticationError && e.code === 'mfa_required') {
        if (!body.code && !body.recoveryCode) throw needsCode('Escribe el código de 6 números de tu app de verificación.');
        throw needsCode('Ese código no sirve. Revisa la hora del teléfono o espera el siguiente código.');
      }
      throw e;
    }
    failures.reset(body.email);
    if (this.hasher.needsRehash(user.passwordHash)) {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hasher.hash(body.password) },
      });
    }
    return { accessToken: issued.accessToken, expiresIn: issued.expiresIn, ...(await this.profile({ id: user.id, email: user.email, name: user.name })) };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.profile(user);
  }

  // ─── Verificación en dos pasos ─────────────────────────────────────

  @Get('2fa')
  async twoFactor(@CurrentUser() user: AuthUser) {
    const enabled = await this.mfa.isEnrolled(user.id);
    return { enabled, recoveryCodesLeft: enabled ? await this.mfa.remainingRecoveryCodes(user.id) : 0 };
  }

  // Paso 1: secreto nuevo (todavía sin activar) y el enlace para el QR.
  @Post('2fa/setup')
  @HttpCode(200)
  async setup(@CurrentUser() user: AuthUser) {
    try {
      return await this.mfa.enroll(user.id, user.email);
    } catch (e) {
      if (e instanceof MfaAlreadyEnrolledError) throw new HttpException('La verificación en dos pasos ya está activa. Desactívala primero si quieres cambiar de teléfono.', HttpStatus.CONFLICT);
      throw e;
    }
  }

  // Paso 2: el primer código de la app la activa y entrega los códigos de respaldo
  // (se muestran una sola vez).
  @Post('2fa/confirm')
  @HttpCode(200)
  async confirm(@CurrentUser() user: AuthUser, @Body({ schema: CodeBody }) body: z.infer<typeof CodeBody>) {
    if (await this.mfa.isEnrolled(user.id)) throw new HttpException('La verificación en dos pasos ya está activa.', HttpStatus.CONFLICT);
    if (!(await this.mfa.confirm(user.id, body.code))) throw new BadRequestException('Ese código no sirve. Revisa que escaneaste el QR y que la hora del teléfono esté bien.');
    return { recoveryCodes: await this.mfa.generateRecoveryCodes(user.id) };
  }

  // Apagarla o pedir códigos de respaldo nuevos exige haber entrado con el segundo
  // paso (mfa: true) y un código del momento: una sesión robada no basta.
  @Post('2fa/disable')
  @HttpCode(200)
  @Authenticate({ mfa: true })
  async disable(@CurrentUser() user: AuthUser, @Body({ schema: SecondFactorBody }) body: z.infer<typeof SecondFactorBody>) {
    await this.secondFactor(user.id, body);
    await this.mfa.disable(user.id);
    return { enabled: false, recoveryCodesLeft: 0 };
  }

  @Post('2fa/recovery-codes')
  @HttpCode(200)
  @Authenticate({ mfa: true })
  async newRecoveryCodes(@CurrentUser() user: AuthUser, @Body({ schema: CodeBody }) body: z.infer<typeof CodeBody>) {
    await this.secondFactor(user.id, body);
    return { recoveryCodes: await this.mfa.generateRecoveryCodes(user.id) };
  }

  // Confirmar un cambio crítico: el guard valida el código de x-2fa-code y responde el
  // permiso de 5 minutos en x-2fa-grant, que la web guarda y reenvía.
  @Post('2fa/step-up')
  @HttpCode(200)
  @RequireTwoFactor()
  stepUp() {
    return { ok: true };
  }

  private async secondFactor(userId: string, b: { code?: string; recoveryCode?: string }) {
    const ok = b.code ? await this.mfa.verifyTotp(userId, b.code) : b.recoveryCode ? await this.mfa.verifyRecoveryCode(userId, b.recoveryCode) : false;
    // 400 y no 401: la sesión sigue siendo válida, solo el código está mal.
    if (!ok) throw new BadRequestException('Ese código no sirve.');
  }

  private async profile(user: AuthUser) {
    const memberships = await this.prisma.client.storeMember.findMany({
      where: { userId: user.id },
      select: { role: true, store: { select: { slug: true, name: true } } },
    });
    return { user, stores: memberships.map((m) => ({ slug: m.store.slug, name: m.store.name, role: m.role })) };
  }
}
