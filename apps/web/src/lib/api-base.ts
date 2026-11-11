// Dirección de la API y cabeceras comunes para llamarla desde el servidor.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Los previews de Vercel de la API están protegidos con login de Vercel. Para que el
// preview de la web pueda llamarlos, se le da el secreto de "Protection Bypass for
// Automation" de la API en API_BYPASS_TOKEN (solo en previews; en producción no va).
const BYPASS = process.env.API_BYPASS_TOKEN;

export function apiHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return BYPASS ? { ...headers, "x-vercel-protection-bypass": BYPASS } : headers;
}
