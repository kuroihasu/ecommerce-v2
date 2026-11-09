import { Body, Controller, Get, HttpCode, Post, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser, PasswordHasher, Public, TokenService } from '@nestjs/authentication';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import { authEnabled } from './auth.config.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';
import type { AuthUser } from './auth.types.js';

const LoginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1024),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  // Máximo 5 intentos por minuto por IP, para frenar a quien prueba contraseñas.
  @Public()
  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Body({ schema: LoginBody }) body: z.infer<typeof LoginBody>) {
    if (!authEnabled()) throw new ServiceUnavailableException('El panel no está configurado (falta AUTH_SECRET)');
    const user = await this.prisma.client.user.findUnique({ where: { email: body.email } });
    // Con un correo desconocido igual se verifica contra un hash de relleno: la
    // respuesta tarda lo mismo y no revela qué cuentas existen.
    const ok = await this.hasher.verify(body.password, user?.passwordHash);
    if (!user || !ok) throw new UnauthorizedException('Correo o contraseña incorrectos');
    if (this.hasher.needsRehash(user.passwordHash)) {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hasher.hash(body.password) },
      });
    }
    const { accessToken, expiresIn } = await this.tokens.issue(user.id, { method: 'pwd' });
    return { accessToken, expiresIn, ...(await this.profile({ id: user.id, email: user.email, name: user.name })) };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.profile(user);
  }

  private async profile(user: AuthUser) {
    const memberships = await this.prisma.client.storeMember.findMany({
      where: { userId: user.id },
      select: { role: true, store: { select: { slug: true, name: true } } },
    });
    return { user, stores: memberships.map((m) => ({ slug: m.store.slug, name: m.store.name, role: m.role })) };
  }
}
