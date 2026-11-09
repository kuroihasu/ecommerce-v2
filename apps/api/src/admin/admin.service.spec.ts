import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { StoreAccess } from '../auth/store-access.guard.js';

const owner: StoreAccess = { id: 's1', slug: 'demo', role: 'OWNER' };
const staff: StoreAccess = { ...owner, role: 'STAFF' };

function service(client: Record<string, unknown>) {
  return new AdminService({ client } as unknown as PrismaService);
}

describe('AdminService', () => {
  it('busca productos siempre dentro de la tienda del usuario', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(service({ product: { findFirst } }).getProduct(owner, 'p-de-otra-tienda')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: 'p-de-otra-tienda', storeId: 's1' });
  });

  it('rechaza variantes que no son del producto', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'p1', variants: [{ id: 'v1' }], images: [] });
    const $transaction = vi.fn();
    const svc = service({ product: { findFirst }, $transaction });
    await expect(
      svc.setVariants(owner, 'p1', [{ id: 'v-ajena', name: 'x', options: {}, price: 1, stock: 1 }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect($transaction).not.toHaveBeenCalled();
  });

  it('el personal no puede cambiar el diseño ni los datos de la tienda', async () => {
    const update = vi.fn();
    await expect(
      service({ store: { update } }).updateStore(staff, { theme: { template: 'vitrina' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('los datos de tienda se mezclan con los que ya había', async () => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ settings: { email: 'hola@norte.cl', installments: 6 } });
    const update = vi.fn().mockResolvedValue({});
    await service({ store: { findUniqueOrThrow, update } }).updateStore(owner, { settings: { installments: 3 } });
    expect(update.mock.calls[0][0].data.settings).toEqual({ email: 'hola@norte.cl', installments: 3 });
  });
});
