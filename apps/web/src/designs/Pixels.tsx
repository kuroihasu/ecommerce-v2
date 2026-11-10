"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Tracking } from "./catalog";
import { trackPageView, trackViewItem } from "./tracking";

// Formatos válidos de cada id. La API ya los valida al guardar; se revisan de nuevo
// aquí porque el id termina dentro de un <script>.
const valid = {
  metaPixelId: /^\d{5,20}$/,
  ga4Id: /^G-[A-Z0-9]{4,15}$/,
  googleAdsId: /^AW-\d{5,15}$/,
  tiktokPixelId: /^[A-Z0-9]{10,30}$/,
};
export const cleanTracking = (t: Tracking | undefined): Tracking =>
  Object.fromEntries(Object.entries(valid).flatMap(([k, re]) => {
    const v = t?.[k as keyof Tracking]?.trim();
    return v && re.test(v) ? [[k, v]] : [];
  }));

// Carga los píxeles que la tienda configuró en el panel (Redes y publicidad).
export function Pixels({ tracking }: { tracking: Tracking }) {
  const { metaPixelId: meta, ga4Id: ga4, googleAdsId: ads, tiktokPixelId: tiktok } = cleanTracking(tracking);
  const google = [ga4, ads].filter(Boolean) as string[];
  const pathname = usePathname();
  const last = useRef(pathname);

  // La primera vista la manda cada píxel al cargar; aquí solo los cambios de página.
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    trackPageView();
  }, [pathname]);

  return (
    <>
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}
      {google.length > 0 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${google[0]}`} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${google.map((id) => `gtag('config','${id}');`).join("")}`}
          </Script>
        </>
      )}
      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var s=d.createElement("script");s.type="text/javascript",s.async=!0,s.src=r+"?sdkid="+e+"&lib="+t;var f=d.getElementsByTagName("script")[0];f.parentNode.insertBefore(s,f)};ttq.load('${tiktok}');ttq.page()}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}

// Envía "vio el producto" al abrir una ficha.
export function TrackViewItem({ slug, name, price }: { slug: string; name: string; price: number }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === slug) return;
    sent.current = slug;
    trackViewItem({ id: slug, group: slug, name, price });
  }, [slug, name, price]);
  return null;
}
