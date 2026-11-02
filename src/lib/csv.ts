// CSV helpers shared by the member and payment exports.

export type CsvCell = string | number | null | undefined;

// Cells that start with these characters can run as formulas when the file is opened in Excel or Sheets.
const FORMULA_START = /^[=+\-@\t\r]/;

// An international phone number such as +251 91 123 4567 is safe to leave alone.
const PHONE_NUMBER = /^\+\d[\d\s()-]{6,}$/;

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '""';
  if (typeof cell === "number") return String(cell);
  const safe = FORMULA_START.test(cell) && !PHONE_NUMBER.test(cell) ? `'${cell}` : cell;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
