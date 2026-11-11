import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: el webhook de WhatsApp verifica la firma de Meta sobre el cuerpo tal como llegó.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // WEB_ORIGIN acepta varias URLs separadas por coma (producción, previews, local).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({ origin: origins });
  // Detrás del proxy de Vercel: la IP real (para el límite de intentos de login) viene en X-Forwarded-For.
  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', true);
  // La API solo responde JSON: no dice qué framework usa, no se deja cargar en un iframe
  // ni interpretar como otra cosa, y no se guarda en cachés intermedias.
  express.disable('x-powered-by');
  express.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // En Vercel el puerto llega en PORT; en local usamos API_PORT.
  await app.listen(process.env.PORT ?? process.env.API_PORT ?? 4000);
}
// Sin top-level await: en Vercel el módulo debe terminar de cargar para recibir tráfico.
void bootstrap();
