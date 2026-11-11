import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);

export const REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
] as const;

export const METHODS = ['webpay', 'mercadopago', 'transfer'] as const;
export type Method = (typeof METHODS)[number];

// Lo que manda la tienda al pagar. Los precios no vienen: se leen de la base.
export const CheckoutInput = z.object({
  items: z
    .array(z.object({ variantId: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) }))
    .min(1, 'El carrito está vacío')
    .max(50),
  email: z.string().trim().toLowerCase().email('Revisa el correo').max(254),
  name: text(100).min(2, 'Escribe tu nombre'),
  phone: text(20).regex(/^\+?[\d\s()-]{8,20}$/, 'Revisa el teléfono'),
  rut: z.union([text(12).regex(/^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/, 'Revisa el RUT'), z.literal('')]).optional(),
  address: z.object({
    region: z.enum(REGIONS, { error: 'Elige la región' }),
    comuna: text(60).min(2, 'Escribe la comuna'),
    street: text(120).min(2, 'Escribe la calle'),
    number: text(20).min(1, 'Escribe el número'),
    apartment: text(40).optional(),
  }),
  notes: text(300).optional(),
  code: z.string().trim().toUpperCase().max(30).optional(),
  method: z.enum(METHODS),
  // Dirección de la tienda, para volver después de pagar.
  origin: z.url({ protocol: /^https?$/ }).max(200),
});
export type CheckoutInput = z.infer<typeof CheckoutInput>;

export const PayInput = z.object({ key: z.string().min(10).max(100), method: z.enum(METHODS), origin: CheckoutInput.shape.origin });

export const WebpayReturn = z.object({
  order: z.string().max(40),
  token_ws: z.string().max(100).optional(),
  TBK_TOKEN: z.string().max(100).optional(),
});

export const MercadoPagoReturn = z.object({ order: z.string().max(40), paymentId: z.string().regex(/^\d{1,20}$/).optional() });

export const MercadoPagoNotice = z.object({ order: z.string().max(40), paymentId: z.string().regex(/^\d{1,20}$/) });

// Panel > Pagos.
export const WebpayConfig = z.object({
  enabled: z.boolean(),
  live: z.boolean(),
  commerceCode: z.union([z.string().trim().regex(/^\d{12}$/, 'El código de comercio son 12 números'), z.literal('')]),
  // Vacía = mantener la guardada.
  apiKey: z.union([z.string().trim().regex(/^[A-Za-z0-9]{20,128}$/, 'La llave secreta son letras y números'), z.literal('')]).optional(),
});

export const MercadoPagoConfig = z.object({
  enabled: z.boolean(),
  accessToken: z.union([z.string().trim().regex(/^(APP_USR|TEST)-[\w-]{20,200}$/, 'El access token empieza con APP_USR- o TEST-'), z.literal('')]).optional(),
});

export const TransferConfig = z.object({
  enabled: z.boolean(),
  bank: text(60),
  accountType: text(40),
  accountNumber: text(30),
  holder: text(100),
  rut: text(12),
  email: z.union([z.string().trim().email().max(254), z.literal('')]),
});

export const OrderPatch = z.object({
  status: z.enum(['PAID', 'FULFILLED', 'DELIVERED', 'CANCELLED']).optional(),
  carrier: text(40).optional(),
  trackingNumber: text(60).optional(),
});
