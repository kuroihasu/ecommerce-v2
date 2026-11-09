# Tienda: plantilla ecommerce para pymes

Plantilla de tienda online pensada para adaptarse a cada pyme (marca, colores, catálogo)
y, más adelante, convertirse en una plataforma donde varias tiendas conviven en la misma base.

## Stack

| Parte | Tecnología |
| --- | --- |
| Front | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| API | NestJS 12 |
| Base de datos | PostgreSQL + Prisma 7 |
| Monorepo | pnpm workspaces + Turborepo |
| Pagos (paso 3) | Webpay Plus, Mercado Pago, Flow |
| Envíos (paso 3) | Envíame o Shipit (Chilexpress, Starken, Blue Express) |

## Estructura

```
apps/
  web/      Tienda (Next.js)
  api/      API REST (NestJS)
packages/
  db/       Esquema Prisma, migraciones, seed y cliente compartido
```

## Modelo de datos

Todo cuelga de `Store`, la tienda de cada pyme. Así la misma base sirve para una sola tienda
hoy y para la plataforma de varias tiendas mañana.

- `Store`, `User`, `StoreMember`: la tienda, sus usuarios del panel y sus roles.
- `Category`, `Product`, `ProductImage`, `ProductVariant`: catálogo. Precio, SKU y stock viven en la variante.
- `Customer`, `Address`: compradores, con RUT y dirección chilena (región y comuna).
- `Cart`, `CartItem`: carrito guardado en la base.
- `Order`, `OrderItem`, `Payment`, `Shipment`: pedidos, pagos por pasarela y despachos.

Los montos son enteros en la moneda de la tienda (CLP no usa decimales).

## Puesta en marcha

Requisitos: Node 22+, pnpm 10, Docker (o un Postgres propio).

```bash
pnpm install
cp .env.example .env
cp .env.example packages/db/.env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

pnpm db:up        # levanta Postgres en Docker
pnpm db:migrate   # crea las tablas
pnpm db:seed      # carga la tienda demo (NORTE, ropa urbana)
pnpm dev          # web en http://localhost:3000, API en http://localhost:4000
```

## API disponible

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/health` | Estado de la API |
| GET | `/stores/:store` | Datos y tema de la tienda |
| GET | `/stores/:store/catalog` | Tienda, categorías con productos y productos, en una llamada (lo usa la vitrina) |
| GET | `/stores/:store/categories` | Categorías |
| GET | `/stores/:store/products?category=&featured=true` | Productos activos |
| GET | `/stores/:store/products/:slug` | Detalle de un producto |

## De dónde saca los datos la tienda

La vitrina (`apps/web`) pide `GET /stores/:store/catalog` y lo traduce al modelo de
los diseños en `src/lib/catalog.ts`. Cada producto usa:

- `tags`: `nuevo`, `preventa` o `ultimas` para la etiqueta, y `mujer` u `hombre` para la línea.
- `attributes`: `{ short, details[], colors: [{ name, hex }] }` para la ficha.
- Variantes con `options: { Color, Talla }`; fotos con `color` si son de un color.

Los datos de tienda (envíos, cuotas, código de descuento, redes, próximo drop) van en
`Store.settings`. La respuesta se cachea unos minutos; al guardar desde el panel,
`revalidateTag("store")`. Si la API no responde, la tienda se muestra con el catálogo
de muestra de `src/designs/catalog.ts`.

## Pruebas

```bash
pnpm test                               # unitarias
pnpm --filter @tienda/api test:e2e      # e2e contra la base con el seed
```

## Plan

1. Base técnica (este commit)
2. Dirección de diseño y prototipo
3. MVP: catálogo, carrito, checkout con pagos chilenos, envíos y panel de administración
4. Plantilla lista para vender: tienda demo publicada y guía de adaptación
