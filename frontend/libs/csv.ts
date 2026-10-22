export type Cell = string | number | null | undefined;

/** One CSV field: quoted when it holds a comma, quote or line break ("" escapes a quote) */
function field(value: Cell): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds the file in the browser and starts the download (no server file, no storage).
 * The BOM tells Excel the file is UTF-8, so Cyrillic and Korean names open correctly.
 */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]): void {
  const text = [header, ...rows].map((row) => row.map(field).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** "9A Math — Quarter 1" → "9a-math-quarter-1" (safe in every file system) */
export function fileSlug(...parts: string[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}
