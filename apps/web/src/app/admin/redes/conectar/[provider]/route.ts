import { NextResponse } from "next/server";
import { adminApi, ApiError } from "@/lib/admin/api";
import { adminOrigin } from "@/lib/admin/origin";

// Vuelta del login de Meta o Google. La API verifica el state (tienda, usuario,
// vencimiento), canjea el código por los tokens y los guarda cifrados.
export async function GET(req: Request, { params }: RouteContext<"/admin/redes/conectar/[provider]">) {
  const { provider } = await params;
  const origin = await adminOrigin();
  const back = (q: Record<string, string>) => NextResponse.redirect(`${origin}/admin/publicaciones?${new URLSearchParams(q)}`);
  if (provider !== "meta" && provider !== "google") return back({ error: "Proveedor desconocido" });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // Si la persona canceló en Meta/Google, vuelve sin código.
  if (!code || !state) return back({ error: "Se canceló la conexión. Puedes intentarlo de nuevo cuando quieras." });

  try {
    await adminApi(`/integrations/${provider}/finish`, {
      method: "POST",
      body: { code, state, redirectUri: `${origin}/admin/redes/conectar/${provider}` },
    });
  } catch (e) {
    if (e instanceof ApiError) return back({ error: e.message });
    throw e;
  }
  return back({ conectado: provider });
}
