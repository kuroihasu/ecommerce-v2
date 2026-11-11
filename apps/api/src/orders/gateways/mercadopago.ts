import { BadGatewayException } from '@nestjs/common';

// Mercado Pago Checkout Pro. Flujo:
// 1. Se crea una "preferencia" con el total, el correo y las direcciones de vuelta; el
//    navegador va a init_point y el cliente paga allá (tarjeta, débito, saldo, cuotas).
// 2. Mercado Pago vuelve con payment_id y avisa por webhook (notification_url).
// 3. En ambos casos se consulta el pago a Mercado Pago con el access token de la tienda:
//    nunca se cree lo que llega en la URL o en el aviso.
// https://www.mercadopago.cl/developers/es/docs/checkout-pro

const API = () => process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com';

export type MpPayment = { id: number; status: string; status_detail?: string; external_reference?: string; transaction_amount: number; currency_id?: string; payment_type_id?: string; installments?: number };

async function call<T>(token: string, method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new BadGatewayException('No pudimos comunicarnos con Mercado Pago. Intenta de nuevo en un rato.');
  }
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !data) {
    console.warn(`[mercadopago] ${method} ${path} respondió ${res.status}`, JSON.stringify(data).slice(0, 300));
    throw new BadGatewayException(
      res.status === 401 ? 'El access token de Mercado Pago no es válido. Revísalo en el panel.' : 'Mercado Pago rechazó la operación. Intenta de nuevo o elige otro medio de pago.',
    );
  }
  return data;
}

export const mercadopago = {
  createPreference: (
    token: string,
    p: { orderId: string; paymentId: string; title: string; amount: number; email: string; returnUrl: string; notificationUrl: string },
  ) =>
    call<{ id: string; init_point: string; sandbox_init_point?: string }>(
      token,
      'POST',
      '/checkout/preferences',
      {
        items: [{ id: p.orderId, title: p.title, quantity: 1, unit_price: p.amount, currency_id: 'CLP' }],
        payer: { email: p.email },
        external_reference: p.orderId,
        back_urls: { success: p.returnUrl, failure: p.returnUrl, pending: p.returnUrl },
        auto_return: 'approved',
        ...(p.notificationUrl ? { notification_url: p.notificationUrl } : {}),
      },
      `pref-${p.paymentId}`,
    ),
  payment: (token: string, id: string) => call<MpPayment>(token, 'GET', `/v1/payments/${encodeURIComponent(id)}`),
};
