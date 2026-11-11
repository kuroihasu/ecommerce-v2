import { describe, expect, it } from 'vitest';
import { FailureCounter } from './rate-limit.js';

describe('FailureCounter', () => {
  it('bloquea una cuenta tras varios fallos, la libera al pasar la ventana o al acertar', () => {
    const c = new FailureCounter(3, 1000);
    for (let i = 0; i < 3; i++) c.fail('a@b.cl', 0);
    expect(c.blocked('a@b.cl', 10)).toBe(true);
    expect(c.blocked('otra@b.cl', 10)).toBe(false);
    expect(c.blocked('a@b.cl', 1001)).toBe(false);
    c.fail('x@b.cl', 0);
    c.reset('x@b.cl');
    expect(c.blocked('x@b.cl', 0)).toBe(false);
  });
});
