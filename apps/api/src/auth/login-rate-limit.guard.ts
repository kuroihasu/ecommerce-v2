import { Injectable } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.js';

// Máximo 5 intentos de login por minuto por IP, para frenar a quien prueba contraseñas.
@Injectable()
export class LoginRateLimitGuard extends RateLimitGuard {
  protected readonly limit = 5;
}
