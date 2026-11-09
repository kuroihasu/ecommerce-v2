import { HttpException, HttpStatus, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const LIMIT = 5;
const WINDOW_MS = 60_000;

// Máximo 5 intentos de login por minuto por IP, para frenar a quien prueba contraseñas.
// Vive en memoria de cada instancia: en serverless es un freno, no una garantía.
// Para algo estricto entre instancias habría que moverlo a Redis.
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.ip ?? 'desconocida';
    const now = Date.now();
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    entry.count++;
    if (entry.count > LIMIT) {
      throw new HttpException('Demasiados intentos. Espera un minuto y vuelve a probar.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
