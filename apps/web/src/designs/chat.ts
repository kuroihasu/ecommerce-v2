import { formatCLP, type StoreInfo } from "./catalog";
import { fillText } from "@/themes/texts";

// Chat de la tienda: preguntas frecuentes con respuesta automática y, cuando hace
// falta, paso a WhatsApp con el dueño. Se configura en el panel (Chat de WhatsApp) y
// se guarda en settings.chat.
export type ChatFaq = { question: string; answer: string; handoff: boolean };
export type ChatConfig = { enabled: boolean; whatsapp: string; greeting: string; faqs: ChatFaq[] };

export const chatPlaceholders = [
  { key: "{envio_rm}", label: "envío a la Región Metropolitana" },
  { key: "{envio_regiones}", label: "envío a regiones" },
  { key: "{envio_gratis}", label: "monto del envío gratis" },
  { key: "{cuotas}", label: "cuotas sin interés" },
  { key: "{codigo}", label: "código de descuento anunciado" },
];

export const defaultFaqs: ChatFaq[] = [
  {
    question: "¿Cuánto cuesta el envío?",
    answer: "Enviamos a todo Chile. A la Región Metropolitana cuesta {envio_rm} y a regiones {envio_regiones}. En compras sobre {envio_gratis} el envío es gratis.",
    handoff: false,
  },
  { question: "¿Cuánto demora en llegar?", answer: "En Santiago llega en 1 a 3 días hábiles y en regiones en 2 a 5 días hábiles desde que se confirma el pago.", handoff: false },
  { question: "¿Puedo cambiar una prenda?", answer: "Sí. Tienes 30 días para cambios gratis. La prenda debe estar sin uso y con sus etiquetas.", handoff: true },
  { question: "¿Cómo elijo mi talla?", answer: "En cada producto está la guía de tallas con las medidas en centímetros. Si estás entre dos tallas, te recomendamos la más grande.", handoff: false },
  { question: "¿Qué medios de pago aceptan?", answer: "Webpay, Mercado Pago y Venti, con hasta {cuotas} cuotas sin interés.", handoff: false },
  { question: "¿Dónde está mi pedido?", answer: "Cuando despachamos te enviamos el número de seguimiento por correo. Si no lo encuentras, escríbenos con tu número de pedido y lo revisamos.", handoff: true },
];

export const defaultChat = (whatsapp = ""): ChatConfig => ({
  enabled: false,
  whatsapp,
  greeting: "¡Hola! ¿En qué te ayudamos? Elige una pregunta o escríbela.",
  faqs: defaultFaqs,
});

type ChatData = Pick<StoreInfo, "discountCode" | "discountKind" | "discountPercent" | "discountMin" | "freeShippingFrom" | "installments" | "shippingRM" | "shippingRegions">;

export function fillAnswer(t: string, store: ChatData) {
  return fillText(t.replaceAll("{envio_rm}", formatCLP(store.shippingRM)).replaceAll("{envio_regiones}", formatCLP(store.shippingRegions)), store);
}

// Enlace a WhatsApp con el mensaje ya escrito. Acepta "+56 9 1234 5678" o "912345678".
export function whatsappLink(number: string, text: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`;
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, " ");

const STOP = new Set("el la los las un una de del en y o a que como cual cuanto cuando donde por para con mi mis tu su es son se me lo le hay puedo quiero tienen tiene hola".split(" "));
const words = (s: string) => norm(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
// Raíz corta para que "envíos", "envio" y "enviar" coincidan.
const stem = (w: string) => w.slice(0, 5);

// Busca la pregunta más parecida a lo que escribió el cliente, mirando la pregunta y
// la respuesta. Devuelve -1 si nada se parece lo suficiente.
export function bestFaq(faqs: ChatFaq[], text: string) {
  const asked = new Set(words(text).map(stem));
  if (!asked.size) return -1;
  let best = -1;
  let score = 0;
  faqs.forEach((f, i) => {
    const q = new Set(words(f.question).map(stem));
    const a = new Set(words(f.answer).map(stem));
    let s = 0;
    for (const w of asked) s += q.has(w) ? 3 : a.has(w) ? 1 : 0;
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return score >= 2 ? best : -1;
}
