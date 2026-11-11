import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { InventoryService } from './inventory.service.js';
import { AdjustInput, CostInput } from './inventory.schemas.js';

// Inventario del panel: cualquier miembro de la tienda puede ver y ajustar stock.
@Controller('admin/stores/:store/inventory')
@UseGuards(StoreAccessGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@CurrentStore() store: StoreAccess) {
    return this.inventory.list(store);
  }

  @Get('movements')
  movements(@CurrentStore() store: StoreAccess, @Query('variantId') variantId?: string) {
    return this.inventory.movements(store, typeof variantId === 'string' && variantId ? variantId.slice(0, 40) : undefined);
  }

  @Post('adjust')
  adjust(@CurrentStore() store: StoreAccess, @Body({ schema: AdjustInput }) body: AdjustInput) {
    return this.inventory.adjust(store, body);
  }

  @Patch(':variantId/cost')
  setCost(@CurrentStore() store: StoreAccess, @Param('variantId') variantId: string, @Body({ schema: CostInput }) body: CostInput) {
    return this.inventory.setCost(store, variantId, body);
  }
}
