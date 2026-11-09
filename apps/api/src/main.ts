import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // WEB_ORIGIN acepta varias URLs separadas por coma (producción, previews, local).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim());
  app.enableCors({ origin: origins });
  // En Vercel el puerto llega en PORT; en local usamos API_PORT.
  await app.listen(process.env.PORT ?? process.env.API_PORT ?? 4000);
}
await bootstrap();
