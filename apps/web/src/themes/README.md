# Temas de la tienda

La tienda tiene una sola URL (`/`, `/catalogo`, `/producto/[slug]`, `/carrito`) y
muestra el diseño que diga `Store.theme` en la base de datos. Hoy hay tres:
`atelier`, `vitrina` y `mercado`.

## Qué se guarda en `Store.theme`

```json
{
  "template": "vitrina",
  "colors": { "accent": "#1d4ed8" },
  "fonts": { "display": "archivo", "body": "inter" },
  "radius": 0
}
```

Todo es opcional: lo que falte se toma de los valores por defecto del diseño
(`defaults` en su `index.ts`). Colores inválidos se ignoran, y el texto sobre
botones y bloques se calcula solo (blanco o negro) para que siempre se lea.

Colores disponibles: `bg` (fondo), `ink` (texto), `surface` (tarjetas y filtros),
`accent` (botones), `field` y `field2` (bloques de color). Tipografías: las de
`fontOptions.ts`. Bordes: `radius` en píxeles, de 0 a 40.

El botón **Personalizar** de la tienda hace lo mismo como vista previa (en una
cookie) y su botón "Copiar configuración" entrega el JSON de arriba. En el panel
de administración, al guardar, se escribe en `Store.theme` y se llama a
`revalidateTag("store-theme")`. Para ocultar el botón en una tienda en producción:
`NEXT_PUBLIC_HIDE_CUSTOMIZER=1`.

## Agregar un diseño nuevo

1. Copia una carpeta existente, por ejemplo `cp -r vitrina nuevo`.
2. Cambia los componentes a gusto. Cada diseño exporta cinco piezas:
   `Layout` (menú y pie), `Home`, `Catalog`, `Product({ slug })` y `Cart`.
   Usa solo las clases de tokens (`bg-bg`, `text-ink`, `bg-accent`,
   `bg-field`, `rounded-brand`, `font-display`…), nunca colores fijos, para que
   el cliente pueda cambiar los colores.
3. En `nuevo/index.ts` ponle `id`, `name`, `description` y sus `defaults`.
4. Súmalo a la lista `themes` de `registry.ts`.

Listo: aparece en el personalizador (y en el panel) como una opción más.

Las piezas comunes (galería, selector de talla, carrito, carrusel, entradas al
hacer scroll) están en `src/designs/` y se pueden reutilizar en cualquier diseño.
