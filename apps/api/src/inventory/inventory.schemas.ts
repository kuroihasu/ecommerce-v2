import { z } from 'zod';

export const STOCK_REASONS = ['ADJUSTMENT', 'RESTOCK', 'SALE', 'RETURN', 'LOSS'] as const;

// Un ajuste suma o resta unidades (`delta`) o fija el stock contado (`stock`), nunca las dos.
export const AdjustInput = z
  .object({
    variantId: z.string().min(1).max(40),
    delta: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, 'La cantidad no puede ser 0').optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    reason: z.enum(STOCK_REASONS),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => (v.delta === undefined) !== (v.stock === undefined), 'Indica cuántas unidades mover o el stock contado');

export const CostInput = z.object({ cost: z.number().int().min(0).max(100_000_000).nullable() });

export type AdjustInput = z.infer<typeof AdjustInput>;
export type CostInput = z.infer<typeof CostInput>;
