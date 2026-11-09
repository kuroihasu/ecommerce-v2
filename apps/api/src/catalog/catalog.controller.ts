import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('stores/:store')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  getStore(@Param('store') store: string) {
    return this.catalog.getStore(store);
  }

  @Get('catalog')
  getCatalog(@Param('store') store: string) {
    return this.catalog.getCatalog(store);
  }

  @Get('categories')
  listCategories(@Param('store') store: string) {
    return this.catalog.listCategories(store);
  }

  @Get('products')
  listProducts(
    @Param('store') store: string,
    @Query('category') category?: string,
    @Query('featured') featured?: string,
  ) {
    return this.catalog.listProducts(store, { category, featured: featured === 'true' });
  }

  @Get('products/:slug')
  getProduct(@Param('store') store: string, @Param('slug') slug: string) {
    return this.catalog.getProduct(store, slug);
  }
}
