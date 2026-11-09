import { Injectable } from '@nestjs/common';
import { AuthenticationRegistry, JwtBearerProvider, type JwtClaims } from '@nestjs/authentication';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './auth.types.js';

// Lee el `Authorization: Bearer <token>` que firma el login y carga al usuario.
// Si el usuario ya no existe, el token deja de valer aunque no haya vencido.
@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<AuthUser> {
  constructor(
    private readonly prisma: PrismaService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  validate({ sub }: JwtClaims): Promise<AuthUser | null> | null {
    if (!sub) return null;
    return this.prisma.client.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true },
    });
  }
}
