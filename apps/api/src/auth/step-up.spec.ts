import { describe, expect, it } from 'vitest';
import { signGrant, verifyGrant } from './step-up.js';

describe('permiso de 2FA (x-2fa-grant)', () => {
  it('vale 5 minutos, solo para su usuario y sin alterar', () => {
    const g = signGrant('u1', 0);
    expect(verifyGrant(g, 'u1', 60_000)).toBe(true);
    expect(verifyGrant(g, 'u1', 5 * 60_000 + 1)).toBe(false);
    expect(verifyGrant(g, 'u2', 60_000)).toBe(false);
    expect(verifyGrant(g.replace('u1', 'u2'), 'u2', 60_000)).toBe(false);
    expect(verifyGrant(`${g}x`, 'u1', 60_000)).toBe(false);
    expect(verifyGrant('basura', 'u1', 0)).toBe(false);
  });
});
