// RUT chileno: número + dígito verificador (módulo 11).

// "12.345.678-5" → "12345678-5" (formato que pide el SII en los documentos). null si no es válido.
export function normalizeRut(raw: string | null | undefined): string | null {
  const clean = String(raw ?? '').replace(/[.\s-]/g, '').toUpperCase();
  const m = /^(\d{1,8})([\dK])$/.exec(clean);
  if (!m) return null;
  const [, body, dv] = m;
  return checkDigit(body) === dv ? `${Number(body)}-${dv}` : null;
}

export function checkDigit(body: string) {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

// Receptor de una boleta cuando el cliente no da su RUT (consumidor final).
export const GENERIC_RUT = '66666666-6';
