export { fontOptions, type FontKey } from "./fontOptions";
import { Archivo, Bricolage_Grotesque, Hanken_Grotesk, Instrument_Serif, Inter, Playfair_Display } from "next/font/google";

// Tipografías disponibles para los temas. Cada tema elige una para títulos y otra
// para texto, y el cliente puede cambiarlas desde el panel. Para sumar una: cárgala
// aquí con su variable CSS y agrégala a `fontOptions`.
const instrumentSerif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--f-instrument-serif", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--f-playfair", preload: false });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-hanken", preload: false });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--f-archivo", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--f-bricolage", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", preload: false });

export const fontVariables = [instrumentSerif, playfair, hanken, archivo, bricolage, inter].map((f) => f.variable).join(" ");
