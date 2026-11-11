import "server-only";
import { redirect } from "next/navigation";
import { STORE_SLUG } from "@/lib/catalog";
import { getToken } from "./session";
import { API_URL, apiHeaders } from "@/lib/api-base";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    // La API pide el código de verificación en dos pasos (o el que llegó no sirve).
    readonly mfaRequired = false,
  ) {
    super(message);
  }
}

type ErrorBody = { message?: string | string[]; mfaRequired?: boolean; errorCode?: string } | null;

// Mensaje legible de un error de la API (Nest manda `message` como texto o lista).
export async function errorMessage(res: Response) {
  return (await readError(res)).message;
}

async function readError(res: Response) {
  const body = (await res.json().catch(() => null)) as ErrorBody;
  const m = body?.message;
  const mfa = Boolean(body?.mfaRequired) || body?.errorCode === "mfa_required";
  // Acciones que piden haber entrado con el código (p. ej. apagar el 2FA en una sesión
  // abierta antes de activarlo).
  const message = body?.errorCode === "mfa_required" ? "Para esto tienes que haber entrado con el código de tu app. Sal y vuelve a entrar." : Array.isArray(m) ? m.join(". ") : m || `Error ${res.status}`;
  return { message, mfa };
}

// Llamada a /admin/stores/<tienda><path> con la sesión del panel. Sin sesión o
// con la sesión vencida, vuelve al login.
export async function adminApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_URL}/admin/stores/${STORE_SLUG}${path}`, {
    method: init?.method ?? "GET",
    headers: apiHeaders({ authorization: `Bearer ${token}`, "content-type": "application/json" }),
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) redirect("/admin/login?vencida=1");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (await res.json()) as T;
}

// Llamada a /auth<path> con la sesión del panel (verificación en dos pasos). A
// diferencia de adminApi, un 401 aquí suele ser "código incorrecto", no sesión vencida.
export async function authApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_URL}/auth${path}`, {
    method: init?.method ?? "GET",
    headers: apiHeaders({ authorization: `Bearer ${token}`, "content-type": "application/json" }),
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const e = await readError(res);
    if (res.status === 401 && !e.mfa) redirect("/admin/login?vencida=1");
    throw new ApiError(res.status, e.message, e.mfa);
  }
  return (await res.json()) as T;
}

export async function apiLogin(email: string, password: string, second?: { code?: string; recoveryCode?: string }) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: apiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ email, password, ...second }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const e = await readError(res);
    throw new ApiError(res.status, e.message, e.mfa);
  }
  return (await res.json()) as {
    accessToken: string;
    expiresIn: number;
    stores: { slug: string; name: string; role: string }[];
  };
}
