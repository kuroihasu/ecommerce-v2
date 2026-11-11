import { fetchJson, ProviderError } from './http.js';

// Google Ads: OAuth con permiso de solo lectura de anuncios. Necesita un cliente
// OAuth de Google Cloud (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET) y un token de
// desarrollador de Google Ads (GOOGLE_ADS_DEVELOPER_TOKEN).
const V = () => process.env.GOOGLE_ADS_API_VERSION || 'v26';
const ADS = () => `https://googleads.googleapis.com/${V()}`;

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_ADS_DEVELOPER_TOKEN);

export const googleAuthUrl = (redirectUri: string, state: string) =>
  `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })}`;

export type GoogleAccounts = { customerId?: string; customerName?: string; currency?: string };

const token = (params: Record<string, string>) =>
  fetchJson<{ access_token: string; refresh_token?: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
    provider: 'Google',
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
  });

const adsHeaders = (accessToken: string) => ({
  authorization: `Bearer ${accessToken}`,
  'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  'content-type': 'application/json',
  ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? { 'login-customer-id': process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/\D/g, '') } : {}),
});

type Row = Record<string, Record<string, string | number | undefined> | undefined>;
const search = (accessToken: string, customerId: string, query: string) =>
  fetchJson<{ results?: Row[] }>(`${ADS()}/customers/${customerId}/googleAds:search`, {
    provider: 'Google',
    method: 'POST',
    headers: adsHeaders(accessToken),
    body: JSON.stringify({ query }),
  });

export async function googleConnect(code: string, redirectUri: string) {
  const t = await token({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new ProviderError('Google no entregó un permiso permanente. Quita el acceso de la tienda en tu cuenta de Google y vuelve a conectar.');
  const list = await fetchJson<{ resourceNames?: string[] }>(`${ADS()}/customers:listAccessibleCustomers`, { provider: 'Google', headers: adsHeaders(t.access_token) });
  const customerId = list.resourceNames?.[0]?.split('/')[1];
  if (!customerId) throw new ProviderError('Esa cuenta de Google no tiene acceso a ninguna cuenta de Google Ads.');
  const info = await search(t.access_token, customerId, 'SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1');
  const c = info.results?.[0]?.customer;
  const accounts: GoogleAccounts = { customerId, customerName: String(c?.descriptiveName ?? customerId), currency: String(c?.currencyCode ?? 'CLP') };
  return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(Date.now() + t.expires_in * 1000), accountName: accounts.customerName!, accounts };
}

export async function googleInsights(refreshToken: string, a: GoogleAccounts) {
  if (!a.customerId) return { instagram: null, ads: null };
  // El token de acceso dura una hora: se pide uno nuevo en cada consulta con el permanente.
  const { access_token } = await token({ refresh_token: refreshToken, grant_type: 'refresh_token' });
  const res = await search(
    access_token,
    a.customerId,
    `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.conversions, metrics.conversions_value
     FROM campaign WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'
     ORDER BY metrics.cost_micros DESC LIMIT 25`,
  );
  return {
    instagram: null,
    ads: {
      account: a.customerName ?? null,
      currency: a.currency ?? 'CLP',
      campaigns: (res.results ?? []).map((r) => ({
        name: String(r.campaign?.name ?? ''),
        status: String(r.campaign?.status ?? ''),
        spend: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
        impressions: Number(r.metrics?.impressions ?? 0),
        clicks: Number(r.metrics?.clicks ?? 0),
        ctr: Number(r.metrics?.ctr ?? 0) * 100,
        purchases: Number(r.metrics?.conversions ?? 0),
        revenue: Number(r.metrics?.conversionsValue ?? 0),
      })),
    },
  };
}
