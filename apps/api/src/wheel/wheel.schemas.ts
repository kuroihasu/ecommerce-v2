import { z } from 'zod';
import { codeSchema } from '../discounts/discounts.schemas.js';

// Un premio de la ruleta: lo que dice la rebanada, el código de descuento que entrega
// (vacío = sin premio, por ejemplo "Sigue participando") y su peso en el sorteo.
export const WheelPrize = z.object({
  label: z.string().trim().min(1, 'Cada premio necesita un texto').max(24, 'Máximo 24 caracteres por premio'),
  code: z.union([codeSchema, z.literal('')]),
  weight: z.number().int().min(0).max(100),
});

export const WheelSettings = z
  .object({
    enabled: z.boolean(),
    title: z.string().trim().max(60),
    subtitle: z.string().trim().max(140),
    // Segundos que espera la tienda antes de mostrar la ruleta.
    delaySeconds: z.number().int().min(0).max(120),
    prizes: z.array(WheelPrize).min(2, 'La ruleta necesita al menos 2 premios').max(8, 'Máximo 8 premios'),
  })
  .refine((w) => w.prizes.some((p) => p.weight > 0), { message: 'Al menos un premio debe poder salir (peso mayor que 0)', path: ['prizes'] });
export type WheelSettings = z.infer<typeof WheelSettings>;

export const ClaimInput = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido').max(254),
  token: z.string().max(600),
});

export const SubscribeInput = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido').max(254),
});
