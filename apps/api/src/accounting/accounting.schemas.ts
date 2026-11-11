import { z } from 'zod';
import { isValidDay } from './period.js';

const text = (max: number) => z.string().trim().max(max);
const day = z.string().refine(isValidDay, 'Fecha en formato AAAA-MM-DD');
const amount = z.number().int().min(0).max(1_000_000_000);
// RUT chileno con o sin puntos: 12.345.678-9 o 12345678-K.
const rut = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{1,2}\.?\d{3}\.?\d{3}-[\dK]$/, 'RUT con guion y dígito verificador, ej: 76.123.456-7');

export const Period = z
  .object({ from: day, to: day })
  .refine((p) => p.from <= p.to, 'La fecha de inicio va antes que la de término')
  .refine((p) => Date.parse(p.to) - Date.parse(p.from) <= 3 * 366 * 86_400_000, 'El período puede ser de hasta 3 años');

// Un movimiento anotado a mano. El IVA solo cuenta si hay documento: en un gasto
// únicamente la factura da crédito fiscal, así que una boleta de compra queda con IVA 0.
export const EntryInput = z
  .object({
    kind: z.enum(['INCOME', 'EXPENSE']),
    date: day,
    category: text(60).min(1, 'Elige una categoría'),
    description: text(200).min(1, 'Describe el movimiento'),
    amount: amount.min(1, 'El monto debe ser mayor a 0'),
    taxAmount: amount.default(0),
    document: z.enum(['FACTURA', 'BOLETA', 'NONE']).default('NONE'),
    documentNumber: text(30).nullable().optional(),
    counterparty: text(120).nullable().optional(),
    counterpartyRut: z.union([rut, z.literal('')]).nullable().optional(),
  })
  .transform((e) => ({
    ...e,
    taxAmount: e.document === 'NONE' || (e.kind === 'EXPENSE' && e.document === 'BOLETA') ? 0 : e.taxAmount,
    documentNumber: e.documentNumber || null,
    counterparty: e.counterparty || null,
    counterpartyRut: e.counterpartyRut || null,
  }))
  .refine((e) => e.taxAmount <= e.amount, { message: 'El IVA no puede ser mayor que el total', path: ['taxAmount'] });

export type Period = z.infer<typeof Period>;
export type EntryInput = z.infer<typeof EntryInput>;
