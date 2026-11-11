"use client";

// Eventos de compra para los píxeles de publicidad (Meta, Google y TikTok).
// Si la tienda no configuró un píxel, su función no existe y la llamada no hace nada.
// Los ids de producto coinciden con el catálogo de /feeds/productos.xml: el grupo
// es el slug del producto y cada artículo es una variante (talla + color).

type Item = { id: string; group: string; name: string; price: number; qty?: number };
type Win = Window & {
  fbq?: (...a: unknown[]) => void;
  gtag?: (...a: unknown[]) => void;
  ttq?: { track: (...a: unknown[]) => void; page: () => void };
};

const CURRENCY = "CLP";

function send(meta: string, google: string, tiktok: string, items: Item[], contentType: "product" | "product_group" = "product") {
  if (typeof window === "undefined" || items.length === 0) return;
  const w = window as Win;
  const value = items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
  const ids = items.map((i) => (contentType === "product" ? i.id : i.group));
  try {
    w.fbq?.("track", meta, { content_ids: ids, content_type: contentType, value, currency: CURRENCY, num_items: items.reduce((s, i) => s + (i.qty ?? 1), 0) });
    w.gtag?.("event", google, {
      currency: CURRENCY,
      value,
      items: items.map((i) => ({ item_id: i.id, item_group_id: i.group, item_name: i.name, price: i.price, quantity: i.qty ?? 1 })),
    });
    w.ttq?.track(tiktok, {
      contents: items.map((i, k) => ({ content_id: ids[k], content_name: i.name, price: i.price, quantity: i.qty ?? 1 })),
      content_type: "product",
      value,
      currency: CURRENCY,
    });
  } catch {
    // Un píxel bloqueado (por ejemplo, por un bloqueador de anuncios) nunca debe romper la compra.
  }
}

export const trackViewItem = (item: Item) => send("ViewContent", "view_item", "ViewContent", [item], "product_group");
export const trackAddToCart = (item: Item) => send("AddToCart", "add_to_cart", "AddToCart", [item]);
export const trackBeginCheckout = (items: Item[]) => send("InitiateCheckout", "begin_checkout", "InitiateCheckout", items);

// Compra confirmada (página del pedido pagado). value = total cobrado, con envío.
export function trackPurchase(orderNumber: number, total: number, items: { id: string; name: string; price: number; qty: number }[]) {
  if (typeof window === "undefined") return;
  const w = window as Win;
  try {
    w.fbq?.("track", "Purchase", { content_ids: items.map((i) => i.id), content_type: "product", value: total, currency: CURRENCY, num_items: items.reduce((s, i) => s + i.qty, 0) });
    w.gtag?.("event", "purchase", { transaction_id: String(orderNumber), currency: CURRENCY, value: total, items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty })) });
    w.ttq?.track("CompletePayment", { contents: items.map((i) => ({ content_id: i.id, content_name: i.name, price: i.price, quantity: i.qty })), content_type: "product", value: total, currency: CURRENCY });
  } catch {}
}

// Vista de página al navegar dentro de la tienda (la primera la manda cada píxel al cargar;
// Google Analytics cuenta los cambios de página por su cuenta).
export function trackPageView() {
  const w = window as Win;
  try {
    w.fbq?.("track", "PageView");
    w.ttq?.page();
  } catch {}
}
