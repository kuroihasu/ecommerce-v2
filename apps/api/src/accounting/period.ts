// Fechas de la contabilidad: los días y meses son los de Chile, aunque la base
// guarde los pedidos en UTC.
const TZ = 'America/Santiago';
const DAY = 86_400_000;

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const offsetFormat = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' });

// Día (YYYY-MM-DD) en Chile de un instante.
export const chileDay = (d: Date) => dayFormat.format(d);

// Minutos de diferencia entre Chile y UTC en ese instante (-180 o -240).
function offsetMinutes(d: Date) {
  const name = offsetFormat.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// Instante en que empieza ese día en Chile.
export function chileDayStart(day: string) {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  let t = utcMidnight - offsetMinutes(new Date(utcMidnight)) * 60_000;
  const again = utcMidnight - offsetMinutes(new Date(t)) * 60_000;
  if (again !== t) t = again; // el día del cambio de hora
  return new Date(t);
}

export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

// Las columnas DATE de Postgres llegan como medianoche UTC.
export const dateOnly = (day: string) => new Date(`${day}T00:00:00Z`);
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function isValidDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(`${day}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === day;
}

// Primer día de los últimos `n` meses, contando el actual (en Chile).
export function monthsBack(now: Date, n: number) {
  const [y, m] = chileDay(now).split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}
