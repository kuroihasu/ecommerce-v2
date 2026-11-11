// Descarga de CSV desde el panel. Usa punto y coma porque Excel en español lo abre
// directo en columnas, y BOM para que respete las tildes.
// Comillas cuando hace falta, y un apóstrofo delante de =, +, -, @, tab o retorno en textos para que
// Excel no lo tome como fórmula (los números van tal cual).
const cell = (raw: string | number | null | undefined) => {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return String(raw);
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const clp = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-CL")}`;
