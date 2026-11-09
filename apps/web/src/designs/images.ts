// Fotos de muestra (Unsplash, licencia libre para uso comercial). Son de referencia:
// cada tienda reemplaza estas imágenes por las suyas desde el panel.
export const photos: Record<string, string> = {
  hoodie: "photo-1556821840-3a63f95609a7",
  hoodie2: "photo-1620799140408-edc6dcb6d633",
  tee: "photo-1521572163474-6864f9cf17ab",
  tee2: "photo-1583743814966-8936f5b7be1a",
  tee3: "photo-1576566588028-4147f3842f27",
  cargo: "photo-1624378439575-d8705ad7ae80",
  jeans: "photo-1542272604-787c3835535d",
  jacket: "photo-1591047139829-d91aecb6caea",
  jacket2: "photo-1544022613-e87ca75a784a",
  dress: "photo-1595777457583-95e059d581b8",
  dress2: "photo-1572804013309-59a88b7e92f1",
  cap: "photo-1588850561407-ed78c282e89b",
  bag: "photo-1590874103328-eac38a683ce7",
  streetwear: "photo-1523398002811-999ca8dec234",
  man: "photo-1552374196-1ab2a1c593e8",
  woman: "photo-1509631179647-0177331693ae",
  rack: "photo-1490481651871-ab68de25d43d",
  shop: "photo-1441984904996-e0b6ba687e04",
  editorial: "photo-1529139574466-a303027c1d8b",
  editorial2: "photo-1469334031218-e382a71b716b",
  street2: "photo-1516826957135-700dedea698c",
  teeModel: "photo-1503342217505-b0a15ec3261c",
  pants: "photo-1594633312681-425c7b97ccd1",
  leather: "photo-1551028719-00167b16eac5",
  dress3: "photo-1515372039744-b8f02a3ae446",
  shopping: "photo-1483985988355-763728e1935b",
  portrait: "photo-1517841905240-472988babdf9",
  man2: "photo-1617137968427-85924c800a22",
  woman2: "photo-1485968579580-b6d095142e6e",
  woman3: "photo-1539109136881-3be0616acf4b",
  clothes: "photo-1558769132-cb1aea458c5e",
  handbag: "photo-1584917865442-de89df76afd3",
  knit: "photo-1434389677669-e08b4cac3105",
  shirt: "photo-1596755094514-f87e34085b2c",
  tee4: "photo-1618354691373-d851c5c3a990",
  sneakers: "photo-1549298916-b41d501d3772",
};

// Acepta una clave de la muestra ("hoodie") o una URL completa (fotos de la API).
export const photoUrl = (key: string) =>
  /^(https?:)?\/\//.test(key) || key.startsWith("/")
    ? key
    : `https://images.unsplash.com/${photos[key] ?? photos.rack}?auto=format&fit=crop&q=80`;

// Hosts que el optimizador de imágenes de Next acepta (next.config.ts → images.remotePatterns).
// Una foto de otro sitio (por ejemplo, subida desde el panel a otro servicio) se muestra
// tal cual, sin optimizar, en vez de quedar rota.
const OPTIMIZED_HOSTS = ["images.unsplash.com"];
export const canOptimize = (src: string) => {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
};
