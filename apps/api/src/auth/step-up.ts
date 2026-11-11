import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable, SetMetadata, UseGuards, applyDecorators, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MfaService } from '@nestjs/authentication';
import type { Request, Response } from 'express';
import { AUTH_SECRET, authEnabled } from './auth.config.js';
import type { AuthUser } from './auth.types.js';

// Cambios críticos del panel (medios de pago y cuenta para transferencias, marcar un
// pedido pagado o anularlo, códigos de descuento, conectar cuentas de publicidad):
// además de la sesión, piden un código de la app de verificación en dos pasos.
//
// - Sin 2FA activado: 403 `stepUp: 'setup'` (hay que activarlo en Panel > Seguridad).
// - Sin código o con uno malo: 403 `stepUp: 'code'`. Es 403 y no 401: la sesión sigue
//   valiendo, la web pide el código y reintenta.
// - Con un código válido responde la cabecera `x-2fa-grant`: un permiso firmado por 5
//   minutos para ese usuario, así no hay que escribir un código por cada cambio seguido.

const GRANT_TTL = 5 * 60_000;
const KEY = authEnabled() || process.env.INTEGRATIONS_KEY
  ? Buffer.from(hkdfSync('sha256', process.env.INTEGRATIONS_KEY || AUTH_SECRET, 'tienda-auth', 'step-up-grant', 32))
  : randomBytes(32);

const mac = (payload: string) => createHmac('sha256', KEY).update(payload).digest('base64url');

export function signGrant(userId: string, now = Date.now()) {
  const payload = `${userId}.${now + GRANT_TTL}`;
  return `${payload}.${mac(payload)}`;
}

export function verifyGrant(grant: string, userId: string, now = Date.now()) {
  const i = grant.lastIndexOf('.');
  if (i < 0) return false;
  const payload = grant.slice(0, i);
  const a = Buffer.from(mac(payload));
  const b = Buffer.from(grant.slice(i + 1));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const j = payload.lastIndexOf('.');
  return payload.slice(0, j) === userId && Number(payload.slice(j + 1)) > now;
}

type When = (req: Request) => boolean;
const STEP_UP = 'tienda:step-up';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly mfa: MfaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const when = this.reflector.get<When | undefined>(STEP_UP, context.getHandler());
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser | null }>();
    if (when && !when(req)) return true;
    const user = req.user;
    if (!user) throw new ForbiddenException();
    if (!(await this.mfa.isEnrolled(user.id))) {
      throw new ForbiddenException({ statusCode: 403, stepUp: 'setup', message: 'Para este cambio necesitas activar la verificación en dos pasos en Panel → Seguridad.' });
    }
    const grant = req.header('x-2fa-grant');
    if (grant && verifyGrant(grant, user.id)) return true;
    const code = (req.header('x-2fa-code') ?? '').replace(/\s/g, '');
    if (!code) throw new ForbiddenException({ statusCode: 403, stepUp: 'code', message: 'Confirma este cambio con el código de tu app de verificación.' });
    const ok = /^\d{6}$/.test(code) ? await this.mfa.verifyTotp(user.id, code) : await this.mfa.verifyRecoveryCode(user.id, code);
    if (!ok) throw new ForbiddenException({ statusCode: 403, stepUp: 'code', message: 'Ese código no sirve. Espera el siguiente código de la app y vuelve a intentar.' });
    context.switchToHttp().getResponse<Response>().setHeader('x-2fa-grant', signGrant(user.id));
    return true;
  }
}

/** Pide el código de 2FA en esta ruta (o solo cuando `when(req)` es verdadero). */
export const RequireTwoFactor = (when?: When) => applyDecorators(SetMetadata(STEP_UP, when), UseGuards(StepUpGuard));
