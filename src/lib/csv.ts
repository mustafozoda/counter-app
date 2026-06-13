/** RFC 4180-style CSV: quote when needed, double embedded quotes. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}
