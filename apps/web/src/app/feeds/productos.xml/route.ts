import { categoryName } from "@/designs/catalog";
import { photoUrl } from "@/designs/images";
import { getCatalog } from "@/lib/catalog";

// Catálogo de productos para anuncios: Google Merchant Center (Shopping y Performance
// Max) y el catálogo de Meta (anuncios de productos en Facebook e Instagram, y tienda
// de Instagram) leen este mismo archivo. Cada talla y color es un artículo; los de un
// mismo producto se agrupan con item_group_id. Se actualiza solo con lo del panel.

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const abs = (url: string, origin: string) => (url.startsWith("/") && !url.startsWith("//") ? origin + url : url.startsWith("//") ? "https:" + url : url);
const gender = { mujer: "female", hombre: "male", unisex: "unisex" } as const;

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const catalog = await getCatalog();
  const { store, products } = catalog;

  const items = products.flatMap((p) =>
    p.variants.map((v) => {
      const photos = (v.color && p.colorPhotos?.[v.color]) || [p.image, ...p.gallery];
      const [main, ...more] = [...new Set(photos.filter(Boolean))].map((i) => abs(photoUrl(i), origin));
      const sale = v.compareAtPrice && v.compareAtPrice > v.price;
      const tags: [string, string | number | undefined][] = [
        ["g:id", v.id],
        ["g:item_group_id", p.slug],
        ["title", [p.name, v.color, v.size].filter(Boolean).join(" · ")],
        ["description", p.description || p.short || p.name],
        ["link", `${origin}/producto/${encodeURIComponent(p.slug)}`],
        ["g:image_link", main],
        ...more.slice(0, 10).map((m): [string, string] => ["g:additional_image_link", m]),
        ["g:availability", v.stock > 0 ? "in_stock" : "out_of_stock"],
        ["g:price", `${sale ? v.compareAtPrice : v.price} CLP`],
        ["g:sale_price", sale ? `${v.price} CLP` : undefined],
        ["g:brand", store.name],
        ["g:condition", "new"],
        ["g:google_product_category", "Apparel & Accessories"],
        ["g:product_type", categoryName(catalog, p.category)],
        ["g:gender", gender[p.line] ?? "unisex"],
        ["g:age_group", "adult"],
        ["g:color", v.color || undefined],
        ["g:size", v.size || undefined],
      ];
      const body = tags
        .filter(([, val]) => val !== undefined && val !== "")
        .map(([k, val]) => `      <${k}>${esc(String(val))}</${k}>`)
        .join("\n");
      return `    <item>\n${body}\n    </item>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(store.name)}</title>
    <link>${origin}</link>
    <description>${esc(store.tagline)}</description>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=900" },
  });
}
