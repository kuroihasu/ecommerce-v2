import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthController } from './auth.controller.js';
import { signingKey, TOKEN_AUDIENCE, TOKEN_ISSUER } from './auth.config.js';
import { JwtAuthProvider } from './jwt-auth.provider.js';
import { StoreAccessGuard } from './store-access.guard.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';

// Sesión del panel: un JWT firmado por 12 horas, sin refresh tokens (al vencer se
// vuelve a entrar), así no hace falta guardar sesiones en la base.
// El guard global exige sesión en todas las rutas; las públicas llevan @Public().
@Module({
  imports: [
    AuthenticationModule.forRoot({
      accessToken: { key: signingKey(), issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, ttl: '12h' },
      refreshToken: false,
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthProvider, StoreAccessGuard, LoginRateLimitGuard],
  exports: [StoreAccessGuard],
})
export class AuthModule {}
