// Datos de las tipografías (sin cargarlas), para usar también en el navegador.
export const fontOptions = {
  "instrument-serif": { label: "Instrument Serif (serif elegante)", cssVar: "--f-instrument-serif" },
  playfair: { label: "Playfair Display (serif clásica)", cssVar: "--f-playfair" },
  hanken: { label: "Hanken Grotesk (sans limpia)", cssVar: "--f-hanken" },
  archivo: { label: "Archivo (sans condensable)", cssVar: "--f-archivo" },
  bricolage: { label: "Bricolage Grotesque (sans con carácter)", cssVar: "--f-bricolage" },
  inter: { label: "Inter (sans neutra)", cssVar: "--f-inter" },
} as const;

export type FontKey = keyof typeof fontOptions;
