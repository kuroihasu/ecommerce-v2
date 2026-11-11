// Arma el documento (boleta electrónica) con la estructura del SII que reciben los
// proveedores como OpenFactura: Encabezado (IdDoc, Emisor, Receptor, Totales) y Detalle.
//
// En una boleta los precios van con IVA incluido. El neto y el IVA se calculan sobre el
// total (neto = total / 1,19), que es como los separa el SII en las boletas.

export const BOLETA = 39;
export const BOLETA_EXENTA = 41;
export type DteType = typeof BOLETA | typeof BOLETA_EXENTA;

export type Issuer = {
  rut: string;
  name: string;
  activity: string;
  address: string;
  comuna: string;
  // Código de la sucursal en el SII (opcional).
  branchCode?: string;
};

export type BoletaInput = {
  type: DteType;
  issueDate: string; // YYYY-MM-DD (día de Chile)
  issuer: Issuer;
  receiver: { rut: string; name?: string | null };
  items: { name: string; quantity: number; unitPrice: number }[];
  shipping: number;
  discount: number;
  total: number;
};

export type Amounts = { total: number; net: number; tax: number; exempt: number };

export function amountsOf(type: DteType, total: number): Amounts {
  if (type === BOLETA_EXENTA) return { total, net: 0, tax: 0, exempt: total };
  const net = Math.round(total / 1.19);
  return { total, net, tax: total - net, exempt: 0 };
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function buildBoleta(b: BoletaInput) {
  const exempt = b.type === BOLETA_EXENTA;
  const lines = b.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }));
  if (b.shipping > 0) lines.push({ name: 'Despacho', quantity: 1, unitPrice: b.shipping });
  const sum = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  // Los totales del pedido ya cuadran (los calcula el checkout); si no, mejor no emitir.
  if (sum - b.discount !== b.total) throw new Error(`Los montos del pedido no cuadran (${sum} − ${b.discount} ≠ ${b.total})`);
  const a = amountsOf(b.type, b.total);

  return {
    Encabezado: {
      IdDoc: { TipoDTE: b.type, Folio: 0, FchEmis: b.issueDate, IndServicio: 3 },
      Emisor: {
        RUTEmisor: b.issuer.rut,
        RznSocEmisor: cut(b.issuer.name, 100),
        GiroEmisor: cut(b.issuer.activity, 80),
        ...(b.issuer.branchCode ? { CdgSIISucur: b.issuer.branchCode } : {}),
        DirOrigen: cut(b.issuer.address, 70),
        CmnaOrigen: cut(b.issuer.comuna, 20),
      },
      Receptor: { RUTRecep: b.receiver.rut, ...(b.receiver.name ? { RznSocRecep: cut(b.receiver.name, 100) } : {}) },
      Totales: exempt ? { MntExe: a.exempt, MntTotal: a.total } : { MntNeto: a.net, IVA: a.tax, MntTotal: a.total },
    },
    Detalle: lines.map((l, i) => ({
      NroLinDet: i + 1,
      NmbItem: cut(l.name, 80),
      QtyItem: l.quantity,
      PrcItem: l.unitPrice,
      MontoItem: l.quantity * l.unitPrice,
      ...(exempt ? { IndExe: 1 } : {}),
    })),
    ...(b.discount > 0
      ? { DscRcgGlobal: [{ NroLinDR: 1, TpoMov: 'D', GlosaDR: 'Descuento', TpoValor: '$', ValorDR: b.discount, ...(exempt ? { IndExeDR: 1 } : {}) }] }
      : {}),
  };
}

export type BoletaDocument = ReturnType<typeof buildBoleta>;
