import { NextResponse } from "next/server";
import { themes } from "@/themes/registry";
import { PREVIEW_COOKIE } from "@/themes/resolve";

// Enlace directo para ver la tienda con un diseño: /tema/vitrina
export async function GET(req: Request, { params }: RouteContext<"/tema/[id]">) {
  const { id } = await params;
  const res = NextResponse.redirect(new URL("/", req.url));
  if (themes.some((t) => t.id === id)) {
    res.cookies.set(PREVIEW_COOKIE, encodeURIComponent(JSON.stringify({ template: id })), { path: "/", maxAge: 2592000, sameSite: "lax" });
  }
  return res;
}
