import "server-only";
import { cookies } from "next/headers";

// La sesión del panel es el JWT que firma la API, guardado en una cookie que el
// navegador no puede leer (httpOnly). La web no lo valida: lo reenvía a la API,
// que es la que decide.
const COOKIE = "admin_session";

export async function getToken() {
  return (await cookies()).get(COOKIE)?.value;
}

export async function setSession(token: string, maxAge: number) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
