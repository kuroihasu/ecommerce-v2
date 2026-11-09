import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('CatalogService', () => {
  it('lanza 404 si la tienda no existe', async () => {
    const prisma = {
      client: { store: { findUnique: vi.fn().mockResolvedValue(null) } },
    } as unknown as PrismaService;
    await expect(new CatalogService(prisma).getStore('nada')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filtra productos activos de la tienda', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      client: {
        store: { findUnique: vi.fn().mockResolvedValue({ id: 's1' }) },
        product: { findMany },
      },
    } as unknown as PrismaService;
    await new CatalogService(prisma).listProducts('demo', { featured: true });
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      storeId: 's1',
      status: 'ACTIVE',
      featured: true,
    });
  });
});
