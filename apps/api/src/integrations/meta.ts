import { createHmac } from 'node:crypto';
import { fetchJson, ProviderError } from './http.js';

// Meta: Facebook Login para leer la página e Instagram de la tienda y los
// resultados de su cuenta publicitaria. Necesita una app de Meta (META_APP_ID y
// META_APP_SECRET) con estos permisos aprobados en la revisión de apps.
const V = () => process.env.META_GRAPH_VERSION || 'v26.0';
const graph = (path: string, params: Record<string, string>) => `https://graph.facebook.com/${V()}/${path}?${new URLSearchParams(params)}`;
// Toda llamada con el token del usuario va firmada con el secreto de la app (appsecret_proof):
// así un token filtrado no sirve desde fuera de esta API.
const auth = (token: string) => ({ access_token: token, appsecret_proof: createHmac('sha256', process.env.META_APP_SECRET!).update(token).digest('hex') });
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights', 'ads_read', 'business_management'];

export const metaConfigured = () => Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);

export const metaAuthUrl = (redirectUri: string, state: string) =>
  `https://www.facebook.com/${V()}/dialog/oauth?${new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES.join(','),
    response_type: 'code',
  })}`;

export type MetaAccounts = { pageId?: string; pageName?: string; igUserId?: string; igUsername?: string; adAccountId?: string; adAccountName?: string; currency?: string };

export async function metaConnect(code: string, redirectUri: string) {
  const provider = 'Meta';
  const app = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await fetchJson<{ access_token: string }>(graph('oauth/access_token', { ...app, redirect_uri: redirectUri, code }), { provider });
  // Token de larga duración (unos 60 días) para no pedir login a cada rato.
  const long = await fetchJson<{ access_token: string; expires_in?: number }>(
    graph('oauth/access_token', { ...app, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token }),
    { provider },
  );
  const token = long.access_token;
  const pages = await fetchJson<{ data: { id: string; name: string; instagram_business_account?: { id: string; username?: string } }[] }>(
    graph('me/accounts', { fields: 'id,name,instagram_business_account{id,username}', limit: '50', ...auth(token) }),
    { provider },
  );
  const ads = await fetchJson<{ data: { account_id: string; name: string; currency: string; account_status: number }[] }>(
    graph('me/adaccounts', { fields: 'account_id,name,currency,account_status', limit: '50', ...auth(token) }),
    { provider },
  );
  // Se elige la primera página con Instagram conectado (o la primera página) y la primera cuenta publicitaria activa.
  const page = pages.data.find((p) => p.instagram_business_account) ?? pages.data[0];
  const ad = ads.data.find((a) => a.account_status === 1) ?? ads.data[0];
  if (!page && !ad) throw new ProviderError('Tu cuenta de Meta no tiene páginas ni cuentas publicitarias que la tienda pueda leer.');
  const accounts: MetaAccounts = {
    pageId: page?.id,
    pageName: page?.name,
    igUserId: page?.instagram_business_account?.id,
    igUsername: page?.instagram_business_account?.username,
    adAccountId: ad?.account_id,
    adAccountName: ad?.name,
    currency: ad?.currency,
  };
  const accountName = [page?.name, accounts.igUsername && `@${accounts.igUsername}`].filter(Boolean).join(' · ') || ad!.name;
  return { accessToken: token, expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null, accountName, accounts };
}

type Action = { action_type: string; value: string };
const sumActions = (list: Action[] | undefined, types: string[]) => (list ?? []).filter((a) => types.includes(a.action_type)).reduce((s, a) => s + Number(a.value), 0);
const PURCHASE = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];

export async function metaInsights(token: string, a: MetaAccounts) {
  const provider = 'Meta';
  const [profile, media, campaigns] = await Promise.all([
    a.igUserId
      ? fetchJson<{ username: string; followers_count?: number; media_count?: number }>(graph(a.igUserId, { fields: 'username,followers_count,media_count', ...auth(token) }), { provider })
      : null,
    a.igUserId
      ? fetchJson<{ data: { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string; like_count?: number; comments_count?: number }[] }>(
          graph(`${a.igUserId}/media`, { fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count', limit: '12', ...auth(token) }),
          { provider },
        )
      : null,
    a.adAccountId
      ? fetchJson<{ data: { campaign_name: string; spend?: string; impressions?: string; clicks?: string; ctr?: string; actions?: Action[]; action_values?: Action[] }[] }>(
          graph(`act_${a.adAccountId}/insights`, {
            level: 'campaign',
            date_preset: 'last_30d',
            fields: 'campaign_name,spend,impressions,clicks,ctr,actions,action_values',
            limit: '25',
            ...auth(token),
          }),
          { provider },
        )
      : null,
  ]);
  return {
    instagram: profile && {
      username: profile.username,
      followers: profile.followers_count ?? null,
      posts: (media?.data ?? []).map((m) => ({
        id: m.id,
        caption: m.caption ?? '',
        type: m.media_type,
        image: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? null) : (m.media_url ?? null),
        url: m.permalink,
        date: m.timestamp,
        likes: m.like_count ?? null,
        comments: m.comments_count ?? null,
      })),
    },
    ads: campaigns && {
      account: a.adAccountName ?? null,
      currency: a.currency ?? 'CLP',
      campaigns: campaigns.data.map((c) => ({
        name: c.campaign_name,
        spend: Number(c.spend ?? 0),
        impressions: Number(c.impressions ?? 0),
        clicks: Number(c.clicks ?? 0),
        ctr: Number(c.ctr ?? 0),
        purchases: sumActions(c.actions, PURCHASE),
        revenue: sumActions(c.action_values, PURCHASE),
      })),
    },
  };
}
