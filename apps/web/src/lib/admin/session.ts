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
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(GRANT_COOKIE);
}

// Permiso de 5 minutos para cambios críticos, después de validar un código de 2FA
// (lo firma la API; aquí solo se guarda y se reenvía).
const GRANT_COOKIE = "admin_2fa";

export async function getGrant() {
  return (await cookies()).get(GRANT_COOKIE)?.value;
}

export async function setGrant(grant: string) {
  (await cookies()).set(GRANT_COOKIE, grant, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 5 * 60,
  });
}
