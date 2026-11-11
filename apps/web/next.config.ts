import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas:
// - nadie puede meter la tienda o el panel dentro de un iframe (evita "clickjacking":
//   un sitio falso que hace clic por ti en "Pagar" o en el panel);
// - el navegador siempre usa https y no adivina tipos de archivo;
// - al salir a otro sitio solo se manda el dominio, nunca la página completa;
// - cámara, micrófono y ubicación apagados (la tienda no los usa).
// No hay una Content-Security-Policy completa porque los píxeles de Meta, Google y
// TikTok cargan scripts de muchos dominios; frame-ancestors sí va.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https:; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // El panel y las páginas de pedido no se indexan en buscadores.
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/pedido/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
