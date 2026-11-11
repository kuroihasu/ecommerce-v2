import { BadGatewayException } from '@nestjs/common';

// Error de Meta o Google con un mensaje que se puede mostrar en el panel. El detalle
// técnico va al log, nunca al navegador (podría traer datos de la cuenta).
export class ProviderError extends BadGatewayException {
  constructor(
    message: string,
    readonly needsReconnect = false,
  ) {
    super({ message, needsReconnect });
  }
}

export async function fetchJson<T>(url: string, init: RequestInit & { provider: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new ProviderError(`No pudimos comunicarnos con ${init.provider}. Intenta de nuevo en un rato.`);
  }
  const body = (await res.json().catch(() => null)) as T & { error?: unknown };
  if (!res.ok) {
    console.warn(`[integrations] ${init.provider} respondió ${res.status}`, JSON.stringify(body?.error ?? body).slice(0, 500));
    const expired = res.status === 401 || JSON.stringify(body?.error ?? '').includes('OAuthException');
    throw new ProviderError(
      expired ? `La conexión con ${init.provider} venció o fue revocada. Vuelve a conectar la cuenta.` : `${init.provider} rechazó la consulta (${res.status}).`,
      expired,
    );
  }
  return body;
}
