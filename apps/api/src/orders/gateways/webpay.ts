import { BadGatewayException } from '@nestjs/common';

// Webpay Plus de Transbank (API REST v1.2). Flujo:
// 1. create → Transbank devuelve token y url; el navegador envía token_ws a esa url.
// 2. El cliente paga y Transbank lo devuelve a return_url con token_ws (pago aprobado o
//    rechazado) o con TBK_TOKEN (lo anuló), o solo con TBK_ORDEN_COMPRA (se le acabó el tiempo).
// 3. commit(token) confirma el pago: response_code 0 y status AUTHORIZED = pagado.
// https://www.transbankdevelopers.cl/referencia/webpay

// Comercio de prueba público de Transbank (ambiente de integración). Con tarjeta de
// prueba VISA 4051 8856 0044 6623, CVV 123, RUT 11.111.111-1, clave 123.
export const WEBPAY_TEST = { commerceCode: '597055555532', apiKey: '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C' };

const BASE = { test: 'https://webpay3gint.transbank.cl', live: 'https://webpay3g.transbank.cl' };
const PATH = '/rswebpaytransaction/api/webpay/v1.2/transactions';

export type WebpayCreds = { commerceCode: string; apiKey: string; live: boolean };
export type WebpayCommit = {
  vci?: string;
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  card_detail?: { card_number?: string };
  authorization_code?: string;
  payment_type_code?: string;
  response_code: number;
  installments_number?: number;
  transaction_date?: string;
};

// WEBPAY_BASE_URL permite apuntar a un servidor simulado en pruebas; en producción se
// ignora, para que nadie pueda hacer pasar un pago falso cambiando una variable.
const base = (live: boolean) => (process.env.VERCEL_ENV !== 'production' && process.env.WEBPAY_BASE_URL) || (live ? BASE.live : BASE.test);

async function call<T>(c: WebpayCreds, method: 'POST' | 'PUT' | 'GET', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base(c.live)}${PATH}${path}`, {
      method,
      headers: { 'Tbk-Api-Key-Id': c.commerceCode, 'Tbk-Api-Key-Secret': c.apiKey, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new BadGatewayException('No pudimos comunicarnos con Webpay. Intenta de nuevo en un rato.');
  }
  const data = (await res.json().catch(() => null)) as (T & { error_message?: string }) | null;
  if (!res.ok || !data) {
    console.warn(`[webpay] ${method} ${path || '/'} respondió ${res.status}`, JSON.stringify(data).slice(0, 300));
    throw new WebpayError(res.status, data?.error_message ?? `Webpay respondió ${res.status}`);
  }
  return data;
}

export class WebpayError extends BadGatewayException {
  constructor(
    readonly httpStatus: number,
    readonly detail: string,
  ) {
    super('Webpay rechazó la operación. Intenta de nuevo o elige otro medio de pago.');
  }
}

export const webpay = {
  // buy_order: hasta 26 caracteres (el id del pedido); session_id: hasta 61 (el id del pago).
  create: (c: WebpayCreds, p: { buyOrder: string; sessionId: string; amount: number; returnUrl: string }) =>
    call<{ token: string; url: string }>(c, 'POST', '', { buy_order: p.buyOrder, session_id: p.sessionId, amount: p.amount, return_url: p.returnUrl }),
  commit: (c: WebpayCreds, token: string) => call<WebpayCommit>(c, 'PUT', `/${encodeURIComponent(token)}`),
  status: (c: WebpayCreds, token: string) => call<WebpayCommit>(c, 'GET', `/${encodeURIComponent(token)}`),
};

export const webpayApproved = (r: WebpayCommit) => r.response_code === 0 && r.status === 'AUTHORIZED';
