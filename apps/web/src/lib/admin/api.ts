import "server-only";
import { redirect } from "next/navigation";
import { STORE_SLUG } from "@/lib/catalog";
import { getToken } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Mensaje legible de un error de la API (Nest manda `message` como texto o lista).
export async function errorMessage(res: Response) {
  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const m = body?.message;
  return Array.isArray(m) ? m.join(". ") : m || `Error ${res.status}`;
}

// Llamada a /admin/stores/<tienda><path> con la sesión del panel. Sin sesión o
// con la sesión vencida, vuelve al login.
export async function adminApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/admin/login");
  const res = await fetch(`${API_URL}/admin/stores/${STORE_SLUG}${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) redirect("/admin/login?vencida=1");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (await res.json()) as T;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (await res.json()) as {
    accessToken: string;
    expiresIn: number;
    stores: { slug: string; name: string; role: string }[];
  };
}
