import { HttpException, HttpStatus, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Límite de pedidos por IP en una ventana de tiempo. Vive en memoria de cada
// instancia: en serverless es un freno, no una garantía. Para algo estricto
// entre instancias habría que moverlo a Redis.
export abstract class RateLimitGuard implements CanActivate {
  protected abstract readonly limit: number;
  protected readonly windowMs: number = 60_000;
  protected readonly message: string = 'Demasiados intentos. Espera un minuto y vuelve a probar.';
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
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count++;
    if (entry.count > this.limit) throw new HttpException(this.message, HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}

// Intentos fallidos por clave (p. ej. por correo), para frenar a quien prueba
// contraseñas de una cuenta desde muchas IP. También vive en memoria.
export class FailureCounter {
  private readonly fails = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  blocked(key: string, now = Date.now()) {
    const e = this.fails.get(key);
    return Boolean(e && e.resetAt > now && e.count >= this.limit);
  }

  fail(key: string, now = Date.now()) {
    if (this.fails.size > 10_000) for (const [k, v] of this.fails) if (v.resetAt <= now) this.fails.delete(k);
    const e = this.fails.get(key);
    if (!e || e.resetAt <= now) this.fails.set(key, { count: 1, resetAt: now + this.windowMs });
    else e.count++;
  }

  reset(key: string) {
    this.fails.delete(key);
  }
}
