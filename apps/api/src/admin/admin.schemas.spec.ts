import { describe, expect, it } from 'vitest';
import { SettingsInput } from './admin.schemas.js';

describe('SettingsInput.tracking', () => {
  it('acepta ids válidos y normaliza mayúsculas', () => {
    const r = SettingsInput.parse({
      tracking: { metaPixelId: '123456789012345', ga4Id: 'g-ab12cd34ef', googleAdsId: 'aw-123456789', tiktokPixelId: 'c4abcdef1234567890' },
    });
    expect(r.tracking).toEqual({ metaPixelId: '123456789012345', ga4Id: 'G-AB12CD34EF', googleAdsId: 'AW-123456789', tiktokPixelId: 'C4ABCDEF1234567890' });
  });

  it('acepta vacío para desactivar un píxel', () => {
    expect(SettingsInput.parse({ tracking: { metaPixelId: '' } }).tracking).toEqual({ metaPixelId: '' });
  });

  it('rechaza cualquier cosa que no sea un id (no se puede inyectar código)', () => {
    expect(() => SettingsInput.parse({ tracking: { metaPixelId: "1');alert(1)//" } })).toThrow();
    expect(() => SettingsInput.parse({ tracking: { ga4Id: "G-ABC'</script>" } })).toThrow();
  });
});

describe('SettingsInput.hiddenSections', () => {
  it('solo acepta ids simples', () => {
    expect(SettingsInput.parse({ hiddenSections: ['look', 'announce'] }).hiddenSections).toEqual(['look', 'announce']);
    expect(() => SettingsInput.parse({ hiddenSections: ['<b>'] })).toThrow();
  });
});
