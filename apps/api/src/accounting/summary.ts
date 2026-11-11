// Cálculos de la contabilidad, separados de la base para poder probarlos.
// Todos los montos son enteros en pesos y con IVA, salvo los que dicen "neto".

export const IVA_RATE = 0.19;
// IVA que viene dentro de un total con IVA.
export const ivaOf = (total: number) => Math.round((total * IVA_RATE) / (1 + IVA_RATE));

export type SaleRow = {
  total: number;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  items: { quantity: number; unitPrice: number; variant: { cost: number | null } | null }[];
};
export type EntryRow = { kind: 'INCOME' | 'EXPENSE'; category: string; amount: number; taxAmount: number };

const byCategory = (rows: EntryRow[]) => {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
  return [...map].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
};
const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

export function computeSummary(orders: SaleRow[], entries: EntryRow[]) {
  const incomes = entries.filter((e) => e.kind === 'INCOME');
  const expenses = entries.filter((e) => e.kind === 'EXPENSE');

  const sales = {
    count: orders.length,
    total: sum(orders, (o) => o.total),
    products: sum(orders, (o) => o.subtotal),
    shipping: sum(orders, (o) => o.shippingTotal),
    discounts: sum(orders, (o) => o.discountTotal),
    tax: sum(orders, (o) => ivaOf(o.total)),
  };

  // Margen de los productos vendidos que tienen costo ingresado (con el costo actual).
  const items = orders.flatMap((o) => o.items);
  const costed = items.filter((i) => i.variant?.cost != null);
  const revenue = sum(costed, (i) => i.unitPrice * i.quantity);
  const cost = sum(costed, (i) => i.variant!.cost! * i.quantity);
  const margin = {
    revenue,
    cost,
    profit: revenue - cost,
    percent: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : null,
    unitsWithoutCost: sum(
      items.filter((i) => i.variant?.cost == null),
      (i) => i.quantity,
    ),
  };

  const income = { total: sum(incomes, (e) => e.amount), tax: sum(incomes, (e) => e.taxAmount), byCategory: byCategory(incomes) };
  const expense = { total: sum(expenses, (e) => e.amount), tax: sum(expenses, (e) => e.taxAmount), byCategory: byCategory(expenses) };

  const netIncome = sales.total - sales.tax + income.total - income.tax;
  const netExpenses = expense.total - expense.tax;
  const debit = sales.tax + income.tax;
  const credit = expense.tax;

  return {
    sales,
    income,
    expense,
    margin,
    netIncome,
    netExpenses,
    result: netIncome - netExpenses,
    // Positivo: IVA a pagar en el F29. Negativo: remanente de crédito para el mes siguiente.
    iva: { debit, credit, balance: debit - credit },
  };
}
