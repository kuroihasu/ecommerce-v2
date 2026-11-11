import { z } from 'zod';

// Códigos en mayúsculas, sin espacios ni tildes: así el cliente los escribe igual en cualquier lado.
export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'El código debe tener al menos 3 caracteres')
  .max(30)
  .regex(/^[A-Z0-9_-]+$/, 'Solo letras sin tilde, números, guion y guion bajo');

export const DiscountInput = z.object({
  code: codeSchema,
  percent: z.number().int().min(1, 'Mínimo 1%').max(90, 'Máximo 90%'),
  // null = usos ilimitados.
  maxUses: z.number().int().min(1).max(1_000_000).nullable().default(null),
  active: z.boolean().default(true),
  expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
});
export type DiscountInput = z.infer<typeof DiscountInput>;

export const DiscountPatch = z.object({
  code: codeSchema.optional(),
  percent: z.number().int().min(1).max(90).optional(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  active: z.boolean().optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type DiscountPatch = z.infer<typeof DiscountPatch>;

export const CheckInput = z.object({ code: z.string().trim().toUpperCase().min(1).max(30) });
