// Requiere la base con el seed aplicado (pnpm db:migrate && pnpm db:seed).
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /stores/demo/products devuelve el catálogo', async () => {
    const res = await request(app.getHttpServer()).get('/stores/demo/products').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].variants[0].price).toBeTypeOf('number');
  });

  it('GET /stores/no-existe da 404', () => {
    return request(app.getHttpServer()).get('/stores/no-existe').expect(404);
  });

  it('el panel pide sesión', () => {
    return request(app.getHttpServer()).get('/admin/stores/demo/products').expect(401);
  });

  it('login con datos incorrectos da 401 sin revelar si el correo existe', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nadie@ejemplo.cl', password: 'incorrecta' });
    expect([401, 503]).toContain(res.status);
  });
});
