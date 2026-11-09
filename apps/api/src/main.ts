import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // WEB_ORIGIN acepta varias URLs separadas por coma (producción, previews, local).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({ origin: origins });
  // Detrás del proxy de Vercel: la IP real (para el límite de intentos de login) viene en X-Forwarded-For.
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  // En Vercel el puerto llega en PORT; en local usamos API_PORT.
  await app.listen(process.env.PORT ?? process.env.API_PORT ?? 4000);
}
// Sin top-level await: en Vercel el módulo debe terminar de cargar para recibir tráfico.
void bootstrap();
