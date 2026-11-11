import type { BoletaDocument, Issuer } from './dte.js';

// OpenFactura (Haulmer): proveedor de facturación electrónica autorizado por el SII. La
// empresa sube su certificado digital y pide sus folios en openfactura.cl; con la API key
// la tienda manda cada boleta y OpenFactura la firma, la timbra y la envía al SII.
// https://docsapi-openfactura.haulmer.com
//
// - POST /v2/dte/document con la cabecera `apikey` → { TOKEN, FOLIO, ... }
// - GET /v2/dte/document/{token}/pdf → { pdf (base64), folio }
// - `Idempotency-Key`: la misma llave durante 24 h no emite dos veces (responde OF-06 con
//   el token del documento ya emitido).
//
// Ambiente de prueba (dev-api): no pide cuenta y usa un CAF simulado, así que lo que se
// emite ahí no llega al SII.

const BASE = { test: 'https://dev-api.haulmer.com', live: 'https://api.haulmer.com' };

// API key pública del ambiente de prueba (documentación de OpenFactura) y su emisor de prueba.
export const OPENFACTURA_DEMO_KEY = '928e15a2d14d4a6292345f04960f4bd3';
export const OPENFACTURA_DEMO_ISSUER: Issuer = {
  rut: '76795561-8',
  name: 'HAULMER SPA',
  activity: 'VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VIA INTERNET',
  address: 'ARTURO PRAT 527 CURICO',
  comuna: 'Curicó',
  branchCode: '81303347',
};

export type OpenFacturaCreds = { apiKey: string; live: boolean };

// OPENFACTURA_BASE_URL apunta a un simulador en pruebas; en producción se ignora.
const base = (live: boolean) => (process.env.VERCEL_ENV !== 'production' && process.env.OPENFACTURA_BASE_URL) || (live ? BASE.live : BASE.test);

// El proveedor rechazó el documento (`rejected`: no se emitió, hay que corregir algo) o no
// respondió (`rejected` = false: puede que sí se haya emitido; se reintenta con la misma llave).
export class DteProviderError extends Error {
  constructor(
    message: string,
    readonly rejected: boolean,
    readonly existingToken: string | null = null,
  ) {
    super(message);
  }
}

type ErrorBody = { error?: { message?: string; code?: string; details?: unknown }; message?: string; code?: string; details?: unknown };

// Mensaje legible de un error de OpenFactura: { error: { message, code, details: [{ field, issue }] } }
// (algunos endpoints lo mandan sin el envoltorio `error` o con `details` como objeto).
export function describeError(status: number, body: unknown): { message: string; code: string | null } {
  const b = (body ?? {}) as ErrorBody;
  const e = b.error ?? b;
  const details = Array.isArray(e.details)
    ? e.details.map((d: { field?: string; issue?: string }) => [d.field, d.issue].filter(Boolean).join(': ')).filter(Boolean)
    : e.details && typeof e.details === 'object'
      ? Object.entries(e.details as Record<string, unknown>).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      : [];
  const message = [e.message || `OpenFactura respondió ${status}`, ...details].join(' · ').slice(0, 500);
  return { message, code: e.code ?? null };
}

// Busca un token en cualquier parte del cuerpo (la respuesta OF-06 trae el del documento ya emitido).
function findToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (/^token$/i.test(k) && typeof v === 'string' && v) return v;
    const inner = findToken(v);
    if (inner) return inner;
  }
  return null;
}

async function call<T>(c: OpenFacturaCreds, method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base(c.live)}/v2/dte${path}`, {
      method,
      headers: { apikey: c.apiKey, 'content-type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new DteProviderError('No pudimos comunicarnos con OpenFactura. Se puede reintentar.', false);
  }
  const data = (await res.json().catch(() => null)) as unknown;
  if (res.ok && data) return data as T;
  const { message, code } = describeError(res.status, data);
  console.warn(`[openfactura] ${method} ${path} respondió ${res.status}`, message);
  if (code === 'OF-06') throw new DteProviderError(message, false, findToken(data));
  if (res.status === 401) throw new DteProviderError('OpenFactura no reconoce la API key. Revísala en Boletas → Configurar.', true);
  // 429 (límite de 3 por segundo) y 5xx: no se emitió, pero se puede reintentar tal cual.
  throw new DteProviderError(message, res.status < 500 && res.status !== 429);
}

export const openfactura = {
  async emit(c: OpenFacturaCreds, dte: BoletaDocument, idempotencyKey: string): Promise<{ token: string; folio: number | null }> {
    try {
      const r = await call<{ TOKEN?: string; FOLIO?: number }>(c, 'POST', '/document', { response: ['FOLIO'], dte }, idempotencyKey);
      if (!r.TOKEN) throw new DteProviderError('OpenFactura no devolvió el documento emitido.', false);
      return { token: r.TOKEN, folio: typeof r.FOLIO === 'number' ? r.FOLIO : null };
    } catch (e) {
      // Ya se había emitido con esta llave (p. ej. la primera vez se cortó la conexión).
      if (e instanceof DteProviderError && e.existingToken) {
        const pdf = await openfactura.pdf(c, e.existingToken).catch(() => null);
        return { token: e.existingToken, folio: pdf?.folio ?? null };
      }
      throw e;
    }
  },

  async pdf(c: OpenFacturaCreds, token: string): Promise<{ pdf: Buffer; folio: number | null }> {
    const r = await call<{ pdf?: string; folio?: number | string }>(c, 'GET', `/document/${encodeURIComponent(token)}/pdf`);
    if (!r.pdf) throw new DteProviderError('OpenFactura no devolvió el PDF.', false);
    const folio = r.folio === undefined || r.folio === null ? null : Number(r.folio);
    return { pdf: Buffer.from(r.pdf, 'base64'), folio: Number.isFinite(folio) ? folio : null };
  },
};
