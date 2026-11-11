import "server-only";
import { redirect } from "next/navigation";
import { STORE_SLUG } from "@/lib/catalog";
import { getGrant, getToken } from "./session";
import type { StepUp } from "./types";
import { API_URL, apiHeaders } from "@/lib/api-base";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    // La API pide el código de verificación en dos pasos (o el que llegó no sirve).
    readonly mfaRequired = false,
    // Cambio crítico: falta confirmar con el código de 2FA, o activarlo.
    readonly stepUp?: StepUp,
  ) {
    super(message);
  }
}

type ErrorBody = { message?: string | string[]; mfaRequired?: boolean; errorCode?: string; stepUp?: StepUp } | null;

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
  return { message, mfa, stepUp: body?.stepUp };
}

async function headersWith(token: string) {
  const grant = await getGrant();
  return apiHeaders({ authorization: `Bearer ${token}`, "content-type": "application/json", ...(grant ? { "x-2fa-grant": grant } : {}) });
}

// Llamada a /admin/stores/<tienda><path> con la sesión del panel. Sin sesión o
// con la sesión vencida, vuelve al login.
export async function adminApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_URL}/admin/stores/${STORE_SLUG}${path}`, {
    method: init?.method ?? "GET",
    headers: await headersWith(token),
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) redirect("/admin/login?vencida=1");
  if (!res.ok) {
    const e = await readError(res);
    throw new ApiError(res.status, e.message, e.mfa, e.stepUp);
  }
  return (await res.json()) as T;
}

// Llamada a /auth<path> con la sesión del panel (verificación en dos pasos). A
// diferencia de adminApi, un 401 aquí suele ser "código incorrecto", no sesión vencida.
export async function authApi<T>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
  return (await authApiRaw<T>(path, init)).data;
}

export async function authApiRaw<T>(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<{ data: T; res: Response }> {
  const token = await getToken();
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_URL}/auth${path}`, {
    method: init?.method ?? "GET",
    headers: { ...(await headersWith(token)), ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const e = await readError(res);
    if (res.status === 401 && !e.mfa) redirect("/admin/login?vencida=1");
    throw new ApiError(res.status, e.message, e.mfa, e.stepUp);
  }
  return { data: (await res.json()) as T, res };
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
