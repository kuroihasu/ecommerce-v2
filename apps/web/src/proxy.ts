import { NextResponse, type NextRequest } from "next/server";
import { ORDER_KEY_COOKIE } from "@/lib/order-key";

// La llave del pedido (?k=…) llega en el enlace que arma el checkout o la vuelta de la
// pasarela. Se guarda en una cookie que solo sirve para la página de ese pedido y se
// redirige a la dirección limpia: así la llave no queda en la barra del navegador ni
// se la llevan los píxeles de Meta, Google o TikTok (que leen la URL completa).
export function proxy(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("k");
  if (!key || key.length > 100) return NextResponse.next();
  const clean = req.nextUrl.clone();
  clean.searchParams.delete("k");
  const res = NextResponse.redirect(clean, 303);
  res.cookies.set(ORDER_KEY_COOKIE, key, {
    path: req.nextUrl.pathname,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}

export const config = {
  matcher: [{ source: "/pedido/:id", has: [{ type: "query", key: "k" }] }],
};
