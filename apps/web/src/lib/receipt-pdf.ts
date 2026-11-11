import "server-only";
import { API_URL, apiHeaders } from "./api-base";

// Reenvía el PDF de una boleta que entrega la API (que a su vez lo pide al proveedor).
export async function proxyPdf(path: string, headers: Record<string, string> = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: apiHeaders(headers), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  } catch {
    return new Response("No pudimos obtener la boleta. Intenta de nuevo en un rato.", { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (!res.ok || !res.headers.get("content-type")?.includes("application/pdf")) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return new Response(body?.message ?? "No encontramos la boleta.", { status: res.status === 401 ? 401 : 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(res.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": res.headers.get("content-disposition") ?? 'inline; filename="boleta.pdf"',
      "cache-control": "private, no-store",
    },
  });
}
