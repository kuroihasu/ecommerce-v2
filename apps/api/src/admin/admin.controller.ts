import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentStore, StoreAccessGuard, type StoreAccess } from '../auth/store-access.guard.js';
import { AdminService } from './admin.service.js';
import {
  CategoryInput,
  CategoryPatch,
  ImagesInput,
  ProductInput,
  ProductPatch,
  StoreInput,
  VariantsInput,
} from './admin.schemas.js';

// Panel de administración. Requiere sesión (guard global) y ser miembro de la tienda.
@Controller('admin/stores/:store')
@UseGuards(StoreAccessGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  getStore(@CurrentStore() store: StoreAccess) {
    return this.admin.getStore(store);
  }

  @Patch()
  updateStore(@CurrentStore() store: StoreAccess, @Body({ schema: StoreInput }) body: StoreInput) {
    return this.admin.updateStore(store, body);
  }

  @Get('products')
  listProducts(@CurrentStore() store: StoreAccess) {
    return this.admin.listProducts(store);
  }

  @Post('products')
  createProduct(@CurrentStore() store: StoreAccess, @Body({ schema: ProductInput }) body: ProductInput) {
    return this.admin.createProduct(store, body);
  }

  @Get('products/:id')
  getProduct(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.admin.getProduct(store, id);
  }

  @Patch('products/:id')
  updateProduct(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: ProductPatch }) body: ProductPatch) {
    return this.admin.updateProduct(store, id, body);
  }

  @Delete('products/:id')
  archiveProduct(@CurrentStore() store: StoreAccess, @Param('id') id: string) {
    return this.admin.archiveProduct(store, id);
  }

  @Put('products/:id/variants')
  setVariants(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: VariantsInput }) body: VariantsInput) {
    return this.admin.setVariants(store, id, body);
  }

  @Put('products/:id/images')
  setImages(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: ImagesInput }) body: ImagesInput) {
    return this.admin.setImages(store, id, body);
  }

  @Get('categories')
  listCategories(@CurrentStore() store: StoreAccess) {
    return this.admin.listCategories(store);
  }

  @Post('categories')
  createCategory(@CurrentStore() store: StoreAccess, @Body({ schema: CategoryInput }) body: CategoryInput) {
    return this.admin.createCategory(store, body);
  }

  @Patch('categories/:id')
  updateCategory(@CurrentStore() store: StoreAccess, @Param('id') id: string, @Body({ schema: CategoryPatch }) body: CategoryPatch) {
    return this.admin.updateCategory(store, id, body);
  }
}
