import { hkdfSync, randomBytes } from 'node:crypto';

// Clave con que se firman las sesiones del panel. Sin AUTH_SECRET el panel queda
// apagado (el login responde 503) pero la tienda pública sigue funcionando: se usa
// una clave al azar que no sirve para nada fuera de este proceso.
export const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
export const authEnabled = () => AUTH_SECRET.length >= 32;
export const signingKey = () => (authEnabled() ? AUTH_SECRET : randomBytes(32).toString('hex'));

// Clave para cifrar los secretos de la verificación en dos pasos, derivada aparte
// (INTEGRATIONS_KEY si existe, si no AUTH_SECRET), con su propio uso.
export const mfaKey = () => {
  const secret = process.env.INTEGRATIONS_KEY || (authEnabled() ? AUTH_SECRET : '');
  return secret ? Buffer.from(hkdfSync('sha256', secret, 'tienda-auth', 'totp-secret', 32)) : randomBytes(32);
};

export const TOKEN_ISSUER = 'tienda-api';
export const TOKEN_AUDIENCE = 'tienda-admin';
