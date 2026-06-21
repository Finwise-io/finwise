// Investment-file import — parse a brokerage CSV export into holdings (ticker + shares + cost).
// Pure + testable: no file I/O, no store. The screen reads the file text, calls importHoldings(),
// previews the result, then builds Position/Lot rows (with fresh ids) and saves a new account.
//
// DR-5/DR-10: validates at the edge (ticker required, shares > 0, money parsed to Number USD).
// DR-6: ids are assigned by the caller via newEntityId, never derived from the file.

export interface ImportedHolding {
  ticker: string;          // UPPERCASE symbol, e.g. 'VTI'
  shares: number;          // > 0
  costPerShare: number;    // USD; 0 when the file doesn't give a cost
  date?: string;           // 'YYYY-MM-DD' purchase date if the file had one
  label?: string;          // security description, if present
}

export interface ImportResult {
  holdings: ImportedHolding[];
  total: number;           // data rows seen (excludes the header)
  skipped: number;         // rows dropped (no ticker / non-positive shares)
  mapped: { ticker?: string; shares?: string; cost?: string; date?: string; name?: string };  // which headers we used
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas, "" escapes, CR/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop fully-empty rows
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const num = (v: string): number => {
  const n = parseFloat(String(v ?? '').replace(/[$,%\s]/g, '').replace(/[()]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

function findCol(headers: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = headers.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/** Normalise a date cell to 'YYYY-MM-DD', or undefined if it isn't a usable date. */
function toIsoDate(v: string): string | undefined {
  const t = (v ?? '').trim();
  if (!t) return undefined;
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);          // YYYY-MM-DD
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);              // MM/DD/YYYY
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return undefined;
}

/** A plausible ticker: 1–10 chars, letters/digits/.-, at least one letter, not a summary row. */
function cleanTicker(v: string): string | null {
  const t = (v ?? '').trim().toUpperCase();
  if (!t || /\s/.test(t) || t.length > 10) return null;
  if (!/[A-Z]/.test(t) || !/^[A-Z0-9.\-]+$/.test(t)) return null;
  if (['TOTAL', 'CASH', 'SUBTOTAL', 'N/A', 'SYMBOL', 'TICKER'].includes(t)) return null;
  return t;
}

export function importHoldings(text: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { holdings: [], total: 0, skipped: 0, mapped: {} };
  const headers = rows[0].map((h) => h.trim());

  const tickerCol = findCol(headers, [/^symbol$/i, /symbol|ticker/i]);
  const sharesCol = findCol(headers, [/^quantity$/i, /quantity|shares|qty|units/i]);
  const perShareCol = findCol(headers, [/cost.*(per|\/).*sh|cost\/sh|average cost|avg\.? cost|price paid|purchase price|unit cost/i]);
  const totalCostCol = findCol(headers, [/cost basis|total cost|cost amount|book cost/i]);
  const dateCol = findCol(headers, [/purchase date|acquired|acquisition|trade date|date/i]);
  const nameCol = findCol(headers, [/description|security|name|fund/i]);

  const holdings: ImportedHolding[] = [];
  let skipped = 0;
  const dataRows = rows.slice(1);
  for (const r of dataRows) {
    const ticker = tickerCol >= 0 ? cleanTicker(r[tickerCol]) : null;
    const shares = sharesCol >= 0 ? num(r[sharesCol]) : NaN;
    if (!ticker || !(shares > 0)) { skipped++; continue; }

    let costPerShare = perShareCol >= 0 ? num(r[perShareCol]) : NaN;
    if (!(costPerShare >= 0)) {
      const totalCost = totalCostCol >= 0 ? num(r[totalCostCol]) : NaN;
      costPerShare = totalCost >= 0 ? totalCost / shares : 0;
    }
    holdings.push({
      ticker,
      shares,
      costPerShare: Number.isFinite(costPerShare) && costPerShare >= 0 ? costPerShare : 0,
      date: dateCol >= 0 ? toIsoDate(r[dateCol]) : undefined,
      label: nameCol >= 0 ? (r[nameCol] ?? '').trim() || undefined : undefined,
    });
  }

  return {
    holdings,
    total: dataRows.length,
    skipped,
    mapped: {
      ticker: tickerCol >= 0 ? headers[tickerCol] : undefined,
      shares: sharesCol >= 0 ? headers[sharesCol] : undefined,
      cost: perShareCol >= 0 ? headers[perShareCol] : totalCostCol >= 0 ? headers[totalCostCol] : undefined,
      date: dateCol >= 0 ? headers[dateCol] : undefined,
      name: nameCol >= 0 ? headers[nameCol] : undefined,
    },
  };
}
