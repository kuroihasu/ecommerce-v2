import { randomBytes } from 'node:crypto';

// Clave con que se firman las sesiones del panel. Sin AUTH_SECRET el panel queda
// apagado (el login responde 503) pero la tienda pública sigue funcionando: se usa
// una clave al azar que no sirve para nada fuera de este proceso.
export const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
export const authEnabled = () => AUTH_SECRET.length >= 32;
export const signingKey = () => (authEnabled() ? AUTH_SECRET : randomBytes(32).toString('hex'));

export const TOKEN_ISSUER = 'tienda-api';
export const TOKEN_AUDIENCE = 'tienda-admin';
