import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { AUTH_SECRET, authEnabled } from '../auth/auth.config.js';

// Cifrado de los tokens de Meta y Google antes de guardarlos (AES-256-GCM) y firma
// del parámetro `state` del login con Meta/Google. Las claves salen de AUTH_SECRET
// (o de INTEGRATIONS_KEY si se define aparte), cada una con su propio uso.

const derive = (purpose: string) => {
  const secret = process.env.INTEGRATIONS_KEY || AUTH_SECRET;
  if (!(process.env.INTEGRATIONS_KEY || authEnabled())) throw new Error('Falta AUTH_SECRET');
  return Buffer.from(hkdfSync('sha256', secret, 'tienda-integrations', purpose, 32));
};

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive('token-encryption'), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(sealed: string): string {
  const [v, iv, tag, data] = sealed.split('.');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Token cifrado inválido');
  const decipher = createDecipheriv('aes-256-gcm', derive('token-encryption'), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

// `state` = datos + firma. Ata la vuelta de Meta/Google a la tienda, al usuario que
// empezó la conexión y a la dirección de regreso, y vence en 10 minutos.
export type OAuthState = { store: string; user: string; provider: string; redirectUri: string; exp: number; nonce: string };

const sign = (payload: string) => createHmac('sha256', derive('oauth-state')).update(payload).digest('base64url');

export function signState(s: Omit<OAuthState, 'exp' | 'nonce'>, ttlMs = 10 * 60_000): string {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + ttlMs, nonce: randomBytes(8).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyState(state: string): OAuthState | null {
  const [payload, mac] = state.split('.');
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(mac);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}
