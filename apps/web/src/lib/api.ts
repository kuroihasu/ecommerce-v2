// Cliente mínimo de la API NestJS. La tienda activa sale de STORE_SLUG
// (más adelante, en la plataforma, se resolverá por dominio).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const STORE_SLUG = process.env.STORE_SLUG ?? "demo";

export type Variant = { id: string; name: string; price: number; compareAtPrice: number | null; stock: number };
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: { url: string; alt: string | null }[];
  variants: Variant[];
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export const getProducts = () => get<Product[]>(`/stores/${STORE_SLUG}/products`);

export const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);
