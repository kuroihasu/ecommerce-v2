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
- `DiscountCode`: códigos de descuento (porcentaje o envío gratis) con compra mínima, usos máximos (vacío = ilimitado), usos hechos, activo y fecha de término.
- `Integration`: cuentas de Meta y Google Ads conectadas (token cifrado).
- `Subscriber`: correos para novedades (ruleta de regalos o pie de página), uno por tienda.

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

## Panel de administración

En `/admin` el equipo de la tienda edita productos (fotos, variantes, precios y
stock), el diseño y los colores, y los datos de la tienda (contacto, envíos, cuotas).
Lo que se guarda se ve en la tienda de inmediato.

Para activarlo:

1. Define `AUTH_SECRET` en la API (`openssl rand -hex 32`, mínimo 32 caracteres).
2. Crea la cuenta del dueño (la contraseña va por variable para que no quede en el historial):

   ```bash
   ADMIN_PASSWORD='una-clave-larga' pnpm --filter @tienda/api admin:create dueno@tienda.cl demo
   ```

El seed no crea usuarios a propósito: corre en cada deploy contra la base real.

Secciones del panel:

- **Productos**, **Diseño y colores** y **Datos de la tienda**.
- **Redes y publicidad**: redes sociales del pie de página, píxeles de Meta, Google Analytics 4,
  Google Ads y TikTok (la tienda envía vista de página, vio producto, agregó al carrito e
  inició el pago; ver `apps/web/src/designs/tracking.ts`) y el enlace del catálogo
  `/feeds/productos.xml`, un feed RSS de Google Merchant que también lee el catálogo de Meta.
- **Descuentos**: varios códigos a la vez. Cada uno regala un porcentaje (1 a 90%) o el
  envío gratis, y puede pedir una compra mínima en productos (el carrito avisa cuánto falta, y
  la barra de avisos, la ruleta y la suscripción la muestran). Además: usos
  ilimitados o una cantidad fija, fecha de término opcional y estado (activo, pausado,
  vencido, agotado). Uno se marca «En la tienda»: es el que anuncian la barra de avisos y la
  suscripción. El carrito valida el código con la API; el uso se descuenta al confirmar el
  pedido con `DiscountsService.redeem`, que lo hace en una sola sentencia para que dos
  compras simultáneas no gasten el último uso dos veces.
- **Ruleta de regalos**: se activa o apaga desde el panel. Aparece una vez por visitante
  después de unos segundos; el cliente gira, ve su premio y deja su correo para ver el
  código. Cada premio entrega uno de los códigos de Descuentos (o ninguno) con un peso en
  el sorteo. El servidor sortea y firma el resultado, los códigos no salen en la API
  pública, un premio con el código pausado, vencido o agotado no sale, y un correo participa
  una sola vez. La misma página lista los suscriptores y los descarga en CSV.
- **Chat de WhatsApp**: botón de chat en la tienda que responde solo las preguntas frecuentes
  (el dueño escribe preguntas y respuestas, con datos que se completan solos como el costo de
  envío). El cliente toca una pregunta o la escribe y el chat busca la más parecida; si no hay
  respuesta, o la pregunta lo pide, ofrece "Hablar con una persona", que abre el WhatsApp del
  dueño con la pregunta ya escrita (`settings.chat`, ver `apps/web/src/designs/chat.ts`).
- **Avanzado**: mostrar u ocultar la barra de avisos, la suscripción y cada sección de la
  portada (`settings.hiddenSections`, ver `apps/web/src/themes/sections.ts`), y los textos
  de la barra de avisos y la suscripción (`settings.texts`, ver `apps/web/src/themes/texts.ts`).
  Los textos aceptan `{codigo}`, `{porcentaje}`, `{envio_gratis}` y `{cuotas}`.
  La barra de avisos, la suscripción y la portada tienen un botón «Configurar» junto a su
  interruptor que abre sus ajustes en una ventana (pantalla completa en el celular).
  El carrusel de la portada: banners propios (foto, etiqueta, título, texto, botón y
  enlace, hasta 6), si avanza solo y cada cuántos segundos. Sin banners propios cada diseño
  usa los suyos (`settings.hero`, ver `apps/web/src/themes/hero.ts`).
- **Publicaciones y anuncios**: conecta Meta y Google Ads (solo lectura) para ver las últimas
  publicaciones de Instagram y los resultados de las campañas de los últimos 30 días.

### Conectar Meta y Google Ads

Los tokens se guardan cifrados (AES-256-GCM con una clave derivada de `AUTH_SECRET`, o de
`INTEGRATIONS_KEY` si se define). Si cambias esa clave, hay que volver a conectar las cuentas.
Cada servicio se activa al definir sus variables en la API; sin ellas, el botón aparece desactivado.

**Meta** (Facebook, Instagram y anuncios): `META_APP_ID` y `META_APP_SECRET`.

1. En developers.facebook.com crea una app de tipo *Empresa* con el producto *Inicio de sesión con Facebook para empresas*.
2. En *URI de redireccionamiento de OAuth válidos* agrega `https://<dominio-de-la-tienda>/admin/redes/conectar/meta`.
3. Pide en la revisión de apps los permisos `pages_show_list`, `pages_read_engagement`,
   `instagram_basic`, `instagram_manage_insights`, `ads_read` y `business_management`. Mientras
   no estén aprobados, solo pueden conectar las personas con rol en la app.
4. La cuenta de Instagram tiene que ser profesional y estar vinculada a una página de Facebook.

**Google Ads**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_ADS_DEVELOPER_TOKEN`
(opcional `GOOGLE_ADS_LOGIN_CUSTOMER_ID` si se entra a través de una cuenta de administrador).

1. En Google Cloud crea un cliente OAuth de tipo *Aplicación web* con la URI de redirección
   `https://<dominio-de-la-tienda>/admin/redes/conectar/google` y activa la *Google Ads API*.
2. En Google Ads → Herramientas → Centro de API pide el token de desarrollador (el acceso básico
   lo aprueba Google; con acceso de prueba solo funciona con cuentas de prueba).

Las versiones de las APIs se pueden cambiar con `META_GRAPH_VERSION` (por defecto `v26.0`) y
`GOOGLE_ADS_API_VERSION` (por defecto `v26`).

### Probar el panel en un preview de Vercel

Para mostrar el panel sin tocar producción, define estas variables **solo para Preview** (y si
quieres, solo para la rama):

- En la API: `AUTH_SECRET`, `DEMO_ADMIN_EMAIL` y `ADMIN_PASSWORD`. Al desplegar, el build crea
  (o actualiza la contraseña de) esa cuenta como dueña de la tienda demo.
- En la web: `NEXT_PUBLIC_API_URL` con la URL del preview de la API, y `API_BYPASS_TOKEN` con el
  secreto de *Protection Bypass for Automation* de la API (Settings → Deployment Protection),
  porque los previews de la API piden login de Vercel.

Ojo: la base es la misma de producción, así que esa cuenta también existe ahí. Al terminar,
borra las variables y cambia la contraseña con `admin:create`.

## API disponible

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/health` | Estado de la API |
| GET | `/stores/:store` | Datos y tema de la tienda |
| GET | `/stores/:store/catalog` | Tienda, categorías con productos y productos, en una llamada (lo usa la vitrina) |
| GET | `/stores/:store/categories` | Categorías |
| GET | `/stores/:store/products?category=&featured=true` | Productos activos |
| GET | `/stores/:store/products/:slug` | Detalle de un producto |
| POST | `/auth/login` | Entrar al panel (máx. 5 intentos por minuto por IP) |
| GET | `/auth/me` | Usuario y tiendas a las que tiene acceso |
| GET, PATCH | `/admin/stores/:store` | Nombre, diseño y datos de la tienda |
| GET, POST | `/admin/stores/:store/products` | Productos (todos los estados) |
| GET, PATCH, DELETE | `/admin/stores/:store/products/:id` | Un producto (DELETE archiva) |
| PUT | `/admin/stores/:store/products/:id/variants` | Reemplaza las variantes |
| PUT | `/admin/stores/:store/products/:id/images` | Reemplaza las fotos (en orden) |
| GET, POST, PATCH | `/admin/stores/:store/categories` | Categorías |
| GET, POST | `/admin/stores/:store/discounts` | Códigos de descuento |
| PATCH, DELETE | `/admin/stores/:store/discounts/:id` | Editar o borrar un código |
| POST | `/admin/stores/:store/discounts/:id/feature` | Anunciar ese código en la tienda |
| POST | `/stores/:store/discounts/check` | ¿Sirve este código? Devuelve el porcentaje (no gasta un uso) |
| POST | `/stores/:store/wheel/spin` | Gira la ruleta: premio sorteado y firmado |
| POST | `/stores/:store/wheel/claim` | Correo + giro firmado: guarda al suscriptor y entrega el código |
| POST | `/stores/:store/subscribers` | Suscripción a novedades desde el pie de página |
| GET | `/admin/stores/:store/subscribers` | Suscriptores de la tienda |

Las rutas `/admin` piden `Authorization: Bearer <token>` y ser miembro de la tienda.

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
