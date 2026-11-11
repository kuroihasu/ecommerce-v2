// Secciones que el panel (Avanzado) puede ocultar. La tienda guarda en
// settings.hiddenSections los ids ocultos; los ids se comparten entre diseños, así
// que ocultar "look" lo oculta en todos los diseños que tengan "Compra el look".
export type SectionDef = { id: string; label: string; hint?: string };

export const sectionVisible = (store: { hiddenSections?: string[] }) => (id: string) => !store.hiddenSections?.includes(id);

// Partes del marco (arriba y abajo de todas las páginas), comunes a los cuatro diseños.
export const layoutSections: SectionDef[] = [
  { id: "announce", label: "Barra de avisos", hint: "La franja de arriba con envío gratis, cuotas y código de descuento." },
  { id: "newsletter", label: "Suscripción al correo", hint: "El formulario del pie de página que ofrece el descuento de bienvenida." },
];
