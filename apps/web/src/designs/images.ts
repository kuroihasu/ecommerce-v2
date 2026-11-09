// Fotos de muestra (Unsplash, licencia libre para uso comercial). Son de referencia:
// cada pyme reemplaza estas imágenes por las suyas desde el panel.
export const photos: Record<string, string> = {
  mug: "photo-1514228742587-6b1558fcca3d",
  mug2: "photo-1572119865084-43c285814d63",
  bowls: "photo-1610701596007-11502861dcfa",
  plates: "photo-1603199506016-b9a594b593c0",
  vase: "photo-1612196808214-b8e1d6145a8c",
  pottery: "photo-1565193566173-7a0ee3dbe261",
  blanket: "photo-1580301762395-21ce84d00bc6",
  blanket2: "photo-1600369671236-e74521d4b6ad",
  wool: "photo-1584992236310-6edddc08acff",
  cushion: "photo-1584100936595-c0654b55a2e2",
  candle: "photo-1602874801007-bd458bb1b8b6",
  candle2: "photo-1603006905003-be475563bc59",
  diffuser: "photo-1608571423902-eed4a5ad8108",
  basket: "photo-1595515106969-1ce29566ff1c",
  board: "photo-1594385208974-2e75f8d7bb48",
  linen: "photo-1583847268964-b28dc8f51f92",
  room: "photo-1493663284031-b7e3aefcae8e",
  room2: "photo-1586023492125-27b2c045efd7",
  room3: "photo-1616486338812-3dadae4b4ace",
  table: "photo-1519710164239-da123dc03ef4",
  hands: "photo-1452860606245-08befc0ff44b",
  landscape: "photo-1478827387698-1527781a4887",
};

export const photoUrl = (key: string) =>
  `https://images.unsplash.com/${photos[key] ?? photos.room}?auto=format&fit=crop&q=80`;
