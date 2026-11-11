"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { STORE_SLUG } from "@/lib/catalog";
import { PREVIEW_COOKIE } from "@/themes/resolve";
import { adminApi, apiLogin, ApiError } from "./api";
import { clearSession, setSession } from "./session";
import type { ActionResult, AdminCategory, AdminDiscount, AdminOrder, AdminProduct, AdminStore, DiscountPayload, EntryPayload, GatewayConfig, IntegrationSlug, LedgerEntry, ProductPayload, StockAdjust, StockMovement } from "./types";
import { adminOrigin } from "./origin";

// Acciones del panel. Cada una reenvía la sesión a la API, que valida permisos;
// después de escribir se refresca la tienda (updateTag) para que el cambio se vea al tiro.

const fail = (e: unknown): { ok: false; error: string } => {
  if (e instanceof ApiError) return { ok: false, error: e.message };
  throw e; // redirect() y errores inesperados siguen su curso
};

export const slugify = async (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

// Devuelve el correo junto al error para que el formulario no lo borre al reintentar.
export async function login(_: unknown, form: FormData): Promise<{ error?: string; email?: string }> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y contraseña.", email };
  try {
    const res = await apiLogin(email, password);
    if (!res.stores.some((s) => s.slug === STORE_SLUG)) return { error: "Tu cuenta no tiene acceso a esta tienda.", email };
    await setSession(res.accessToken, res.expiresIn);
  } catch (e) {
    if (!(e instanceof ApiError)) return { error: "No pudimos conectar con el servidor. Intenta de nuevo.", email };
    if (e.status === 429) return { error: e.message || "Demasiados intentos. Espera un minuto y vuelve a probar.", email };
    return { error: e.status === 401 ? "Correo o contraseña incorrectos." : e.message, email };
  }
  redirect("/admin/productos");
}

export async function logout() {
  await clearSession();
  redirect("/admin/login");
}

export async function createProduct(_: unknown, form: FormData): Promise<{ error?: string }> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre al producto." };
  let id: string;
  try {
    const p = await adminApi<AdminProduct>("/products", { method: "POST", body: { name, slug: await slugify(name) } });
    id = p.id;
  } catch (e) {
    return { error: fail(e).error };
  }
  redirect(`/admin/productos/${id}`);
}

export async function saveProduct(rawId: string, payload: ProductPayload): Promise<ActionResult<AdminProduct>> {
  // El id llega desde el navegador: se codifica para que no pueda cambiar la ruta de la API.
  const id = encodeURIComponent(rawId);
  try {
    await adminApi(`/products/${id}`, { method: "PATCH", body: payload.product });
    await adminApi(`/products/${id}/images`, { method: "PUT", body: payload.images });
    const product = await adminApi<AdminProduct>(`/products/${id}/variants`, { method: "PUT", body: payload.variants });
    updateTag("store");
    return { ok: true, data: product };
  } catch (e) {
    return fail(e);
  }
}

export async function archiveProduct(id: string) {
  await adminApi(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  updateTag("store");
  redirect("/admin/productos");
}

export async function saveStore(input: Partial<Pick<AdminStore, "name" | "theme" | "settings">>): Promise<ActionResult<AdminStore>> {
  try {
    const store = await adminApi<AdminStore>("", { method: "PATCH", body: input });
    // Si este navegador tenía una vista previa del personalizador, se borra para ver lo guardado.
    if (input.theme) (await cookies()).delete(PREVIEW_COOKIE);
    updateTag("store");
    return { ok: true, data: store };
  } catch (e) {
    return fail(e);
  }
}

export async function createCategory(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a la categoría." };
  try {
    await adminApi<AdminCategory>("/categories", { method: "POST", body: { name, slug: await slugify(name) } });
    updateTag("store");
    return { ok: true };
  } catch (e) {
    return { error: fail(e).error };
  }
}

// Conectar Meta o Google: la API arma el login con un state firmado y aquí se
// redirige al navegador a esa página. Al volver, /admin/redes/conectar/<proveedor>
// termina la conexión.
const isProvider = (p: string): p is IntegrationSlug => p === "meta" || p === "google";

export async function connectIntegration(provider: string): Promise<{ error: string }> {
  if (!isProvider(provider)) return { error: "Proveedor desconocido" };
  let url: string;
  try {
    const redirectUri = `${await adminOrigin()}/admin/redes/conectar/${provider}`;
    ({ url } = await adminApi<{ url: string }>(`/integrations/${provider}/start`, { method: "POST", body: { redirectUri } }));
  } catch (e) {
    return { error: fail(e).error };
  }
  redirect(url);
}

export async function disconnectIntegration(provider: string): Promise<ActionResult> {
  if (!isProvider(provider)) return { ok: false, error: "Proveedor desconocido" };
  try {
    await adminApi(`/integrations/${provider}`, { method: "DELETE" });
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

// Códigos de descuento. El id llega del navegador: se codifica para la ruta.
// Se refresca la tienda porque el código destacado aparece en la barra de avisos.
export async function saveDiscount(id: string | null, payload: DiscountPayload): Promise<ActionResult<AdminDiscount>> {
  try {
    const data = id
      ? await adminApi<AdminDiscount>(`/discounts/${encodeURIComponent(id)}`, { method: "PATCH", body: payload })
      : await adminApi<AdminDiscount>("/discounts", { method: "POST", body: payload });
    updateTag("store");
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function setDiscountActive(id: string, active: boolean): Promise<ActionResult<AdminDiscount>> {
  try {
    const data = await adminApi<AdminDiscount>(`/discounts/${encodeURIComponent(id)}`, { method: "PATCH", body: { active } });
    updateTag("store");
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDiscount(id: string): Promise<ActionResult> {
  try {
    await adminApi(`/discounts/${encodeURIComponent(id)}`, { method: "DELETE" });
    updateTag("store");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function featureDiscount(id: string): Promise<ActionResult> {
  try {
    await adminApi(`/discounts/${encodeURIComponent(id)}/feature`, { method: "POST" });
    updateTag("store");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

// Inventario: ajustar stock (suma, resta o conteo) y el costo de una variante.
// Se refresca la tienda porque el stock decide si una talla se puede comprar.
export async function adjustStock(input: StockAdjust): Promise<ActionResult<{ variantId: string; stock: number; movement: StockMovement }>> {
  try {
    const data = await adminApi<{ variantId: string; stock: number; movement: StockMovement }>("/inventory/adjust", { method: "POST", body: input });
    updateTag("store");
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

// Medios de pago (panel > Pagos). Las llaves viajan a la API, que las guarda cifradas.
export async function saveGateway(provider: "webpay" | "mercadopago" | "transfer", body: Record<string, unknown>): Promise<ActionResult<GatewayConfig>> {
  try {
    return { ok: true, data: await adminApi<GatewayConfig>(`/payments/${provider}`, { method: "PUT", body }) };
  } catch (e) {
    return fail(e);
  }
}

export async function setVariantCost(variantId: string, cost: number | null): Promise<ActionResult> {
  try {
    await adminApi(`/inventory/${encodeURIComponent(variantId)}/cost`, { method: "PATCH", body: { cost } });
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

// Contabilidad: movimientos anotados a mano.
export async function saveEntry(id: string | null, payload: EntryPayload): Promise<ActionResult<LedgerEntry>> {
  try {
    const data = id
      ? await adminApi<LedgerEntry>(`/accounting/entries/${encodeURIComponent(id)}`, { method: "PUT", body: payload })
      : await adminApi<LedgerEntry>("/accounting/entries", { method: "POST", body: payload });
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  try {
    await adminApi(`/accounting/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function updateOrder(id: string, patch: { status?: string; carrier?: string; trackingNumber?: string }): Promise<ActionResult<AdminOrder>> {
  try {
    const order = await adminApi<AdminOrder>(`/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
    // El stock cambia al marcar un pago: la tienda se refresca.
    if (patch.status === "PAID") updateTag("store");
    return { ok: true, data: order };
  } catch (e) {
    return fail(e);
  }
}
