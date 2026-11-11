import { z } from 'zod';
import { normalizeRut } from './rut.js';

const text = (max: number) => z.string().trim().max(max);

// Panel > Boletas. La API key vacía = mantener la guardada.
export const BillingConfigInput = z.object({
  enabled: z.boolean(),
  live: z.boolean(),
  exempt: z.boolean().default(false),
  apiKey: z.union([z.string().trim().regex(/^[A-Za-z0-9_-]{16,128}$/, 'La API key son letras y números'), z.literal('')]).optional(),
  issuer: z.object({
    rut: z.union([
      text(12).transform((r, ctx) => {
        const ok = normalizeRut(r);
        if (!ok) ctx.addIssue({ code: 'custom', message: 'Revisa el RUT de la empresa' });
        return ok ?? r;
      }),
      z.literal(''),
    ]),
    name: text(100),
    activity: text(80),
    address: text(70),
    comuna: text(20),
    branchCode: z.union([text(10).regex(/^\d+$/, 'El código de sucursal son números'), z.literal('')]).optional(),
  }),
});
export type BillingConfigInput = z.infer<typeof BillingConfigInput>;
