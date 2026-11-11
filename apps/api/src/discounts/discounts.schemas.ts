import { z } from 'zod';

// Códigos en mayúsculas, sin espacios ni tildes: así el cliente los escribe igual en cualquier lado.
export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'El código debe tener al menos 3 caracteres')
  .max(30)
  .regex(/^[A-Z0-9_-]+$/, 'Solo letras sin tilde, números, guion y guion bajo');

export const DiscountKind = z.enum(['PERCENT', 'FREE_SHIPPING']);
const percent = z.number().int().min(0).max(90, 'Máximo 90%');
// Compra mínima en productos (CLP) para poder usar el código. 0 = sin mínimo.
const minSubtotal = z.number().int().min(0).max(100_000_000);

export const DiscountInput = z.object({
  code: codeSchema,
  kind: DiscountKind.default('PERCENT'),
  // En los de envío gratis se ignora (queda en 0).
  percent: percent.default(0),
  minSubtotal: minSubtotal.default(0),
  // null = usos ilimitados.
  maxUses: z.number().int().min(1).max(1_000_000).nullable().default(null),
  active: z.boolean().default(true),
  expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
})
  .transform((d) => (d.kind === 'FREE_SHIPPING' ? { ...d, percent: 0 } : d))
  .refine((d) => d.kind === 'FREE_SHIPPING' || d.percent >= 1, { message: 'Mínimo 1%', path: ['percent'] });
export type DiscountInput = z.infer<typeof DiscountInput>;

export const DiscountPatch = z.object({
  code: codeSchema.optional(),
  kind: DiscountKind.optional(),
  percent: percent.optional(),
  minSubtotal: minSubtotal.optional(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  active: z.boolean().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type DiscountPatch = z.infer<typeof DiscountPatch>;

export const CheckInput = z.object({ code: z.string().trim().toUpperCase().min(1).max(30) });
