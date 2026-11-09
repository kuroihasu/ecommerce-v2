import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Public } from '@nestjs/authentication';

// Lo público del catálogo cambia poco: el CDN de Vercel lo sirve desde caché por un
// minuto y hasta 5 más mientras lo renueva en segundo plano, así la base y la función
// no se ejecutan en cada visita.
const PUBLIC_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';
import { CatalogService } from './catalog.service.js';

// Lectura pública: no pide sesión.
@Public()
@Controller('stores/:store')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE)
  getStore(@Param('store') store: string) {
    return this.catalog.getStore(store);
  }

  @Get('catalog')
  @Header('Cache-Control', PUBLIC_CACHE)
  getCatalog(@Param('store') store: string) {
    return this.catalog.getCatalog(store);
  }

  @Get('categories')
  @Header('Cache-Control', PUBLIC_CACHE)
  listCategories(@Param('store') store: string) {
    return this.catalog.listCategories(store);
  }

  @Get('products')
  @Header('Cache-Control', PUBLIC_CACHE)
  listProducts(
    @Param('store') store: string,
    @Query('category') category?: string,
    @Query('featured') featured?: string,
  ) {
    return this.catalog.listProducts(store, { category, featured: featured === 'true' });
  }

  @Get('products/:slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  getProduct(@Param('store') store: string, @Param('slug') slug: string) {
    return this.catalog.getProduct(store, slug);
  }
}
