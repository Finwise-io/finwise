// Investment-file import — parse a brokerage CSV export into holdings (ticker + shares + cost).
// Pure + testable: no file I/O, no store. The screen reads the file text, calls importHoldings(),
// previews the result, then builds Position/Lot rows (with fresh ids) and saves a new account.
//
// DR-5/DR-10: validates at the edge (ticker required, shares > 0, money parsed to Number USD).
// DR-6: ids are assigned by the caller via newEntityId, never derived from the file.

import { isCashEquivalentLabel, type AssetClass } from '../assets';

export interface ImportedHolding {
  symbol: string;          // raw identifier from the file (may contain spaces, e.g. an option or CD)
  ticker: string;          // clean tradeable ticker for price lookup, or '' for non-tradeable (CD/option/bond)
  shares: number;          // ≥ 0 (0 for a plain CASH line)
  costPerShare: number;    // USD; 0 when the file doesn't give a cost
  value: number;           // market value (USD) from the file; 0 if absent
  date?: string;           // 'YYYY-MM-DD' purchase date if the file had one
  label?: string;          // security description, if present
  assetClass: AssetClass;  // classified from symbol/name (CD→cash, Put→alternatives, …)
}

export interface ImportResult {
  holdings: ImportedHolding[];
  total: number;           // data rows seen (excludes the header)
  skipped: number;         // rows dropped (summary rows / no value)
  mapped: { ticker?: string; shares?: string; cost?: string; date?: string; name?: string; value?: string };
}

// ── Robust file decoding (#12) ────────────────────────────────────────────────
// Brokerage/Excel CSV exports come as UTF-8 (often with a BOM) OR UTF-16 (LE/BE). Reading a UTF-16
// file as UTF-8 is the #1 cause of "couldn't read that file". The screen reads RAW BYTES (base64,
// which never fails on encoding) and calls this to decode — detecting the encoding from BOM/NUL pattern.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64: string): number[] {
  const c = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < c.length; i += 4) {
    const e1 = B64.indexOf(c[i]), e2 = B64.indexOf(c[i + 1]), e3 = B64.indexOf(c[i + 2]), e4 = B64.indexOf(c[i + 3]);
    const n = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63);
    out.push((n >> 16) & 0xFF);
    if (c[i + 2] !== undefined && e3 !== -1) out.push((n >> 8) & 0xFF);
    if (c[i + 3] !== undefined && e4 !== -1) out.push(n & 0xFF);
  }
  return out;
}
function decodeUtf8(b: number[], start = 0): string {
  let s = '';
  for (let i = start; i < b.length;) {
    const c = b[i++];
    if (c < 0x80) s += String.fromCharCode(c);
    else if (c < 0xE0) s += String.fromCharCode(((c & 0x1F) << 6) | (b[i++] & 0x3F));
    else if (c < 0xF0) s += String.fromCharCode(((c & 0x0F) << 12) | ((b[i++] & 0x3F) << 6) | (b[i++] & 0x3F));
    else { const cp = ((c & 0x07) << 18) | ((b[i++] & 0x3F) << 12) | ((b[i++] & 0x3F) << 6) | (b[i++] & 0x3F); const u = cp - 0x10000; s += String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 0x3FF)); }
  }
  return s;
}
function decodeUtf16(b: number[], start: number, le: boolean): string {
  let s = '';
  for (let i = start; i + 1 < b.length; i += 2) s += String.fromCharCode(le ? (b[i] | (b[i + 1] << 8)) : ((b[i] << 8) | b[i + 1]));
  return s;
}
export function decodeCsvBase64(b64: string): string {
  const b = base64ToBytes(b64);
  if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return decodeUtf16(b, 2, true);   // UTF-16 LE BOM
  if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) return decodeUtf16(b, 2, false);  // UTF-16 BE BOM
  let start = 0;
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) start = 3;        // UTF-8 BOM
  let nul = 0; const probe = Math.min(b.length, 400);
  for (let i = 0; i < probe; i++) if (b[i] === 0) nul++;
  if (nul > probe / 4) return decodeUtf16(b, 0, b[1] === 0);   // no BOM but NUL-heavy → UTF-16 (LE if 2nd byte is NUL)
  return decodeUtf8(b, start);
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas, "" escapes, CR/LF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = (text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");   // strip UTF-8 BOM + normalize newlines
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

/** A plausible tradeable ticker: 1–10 chars, letters/digits/.-, at least one letter, no spaces. */
function cleanTicker(v: string): string | null {
  const t = (v ?? '').trim().toUpperCase();
  if (!t || /\s/.test(t) || t.length > 10) return null;
  if (!/[A-Z]/.test(t) || !/^[A-Z0-9.\-]+$/.test(t)) return null;
  if (['TOTAL', 'CASH', 'SUBTOTAL', 'N/A', 'SYMBOL', 'TICKER'].includes(t)) return null;
  return t;
}

// Common money-market fund tickers (trade at $1 NAV) → classified as cash, not equities.
const MMF_TICKERS = new Set(['VMFXX', 'VMRXX', 'SPAXX', 'SPRXX', 'SWVXX', 'SNVXX', 'FDRXX', 'FZFXX', 'TTTXX', 'SGOV']);
// Crypto trusts/ETFs and spot-commodity funds → alternatives, not equities (PRD F1 #19).
// COIN (Coinbase) is deliberately absent — that's a stock.
const CRYPTO_TICKERS = new Set(['BTC', 'ETH', 'GBTC', 'ETHE', 'IBIT', 'FBTC', 'BITO', 'ARKB', 'HODL']);
const COMMODITY_TICKERS = new Set(['GLD', 'SLV', 'IAU', 'SGOL', 'GLDM', 'PPLT', 'PALL', 'USO', 'UNG', 'DBC', 'PDBC']);
// A commodity word inside a COMPANY name (Barrick Gold Corp, First Majestic Silver) is a mining stock,
// not a commodity holding — company-shaped names stay equities.
const COMPANY_WORDS = /\b(corp|corporation|inc|ltd|plc|mining|miners?|resources|company)\b/i;

/** Classify a holding by asset class from its symbol + name (the importer sets asset_class explicitly,
 *  which overrides the kind/tax_bucket derivation). */
export function classifyHolding(symbol: string, name = ''): AssetClass {
  const s = `${symbol} ${name}`.trim();
  const sym = symbol.trim().toUpperCase();
  if (MMF_TICKERS.has(sym)) return 'cash';
  if (isCashEquivalentLabel(s)) return 'cash';                          // CD / T-bill / money-market
  if (/\b(put|call)s?\b/i.test(s)) return 'alternatives';              // options
  if (CRYPTO_TICKERS.has(sym) || /\b(bitcoin|ethereum|crypto(currenc(y|ies))?)\b/i.test(s)) return 'alternatives';
  if (COMMODITY_TICKERS.has(sym)) return 'alternatives';
  if (/\b(gold|silver|platinum|palladium|commodit(y|ies))\b/i.test(s) && !COMPANY_WORDS.test(s)) return 'alternatives';
  if (/\b(currency|currencies|forex)\b/i.test(s)) return 'alternatives';
  if (/\b(bond|note|treasury|t-note|muni|debenture)\b/i.test(s)) return 'bonds';   // fixed income
  return 'stocks_etf';                                                  // default: an equity ticker
}

/** Find the real positions header — the first row that has BOTH a symbol/ticker AND a quantity/shares
 *  column (skips brokerage preambles like "Account Summary" and filter headers). */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const h = rows[i].map((c) => c.trim());
    const hasSym = h.some((c) => /^(symbol|ticker)$/i.test(c));
    const hasQty = h.some((c) => /^(quantity|shares|qty|units)$/i.test(c));
    if (hasSym && hasQty) return i;
  }
  return 0;
}

export function importHoldings(text: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { holdings: [], total: 0, skipped: 0, mapped: {} };
  const hIdx = findHeaderRow(rows);
  const headers = rows[hIdx].map((h) => h.trim());

  const symbolCol = findCol(headers, [/^symbol$/i, /^ticker$/i, /symbol|ticker/i]);
  const sharesCol = findCol(headers, [/^quantity$/i, /quantity|shares|qty|units/i]);
  const perShareCol = findCol(headers, [/cost.*(per|\/).*sh|cost\/sh|average cost|avg\.? cost|price paid|purchase price|unit cost/i]);
  const totalCostCol = findCol(headers, [/cost basis|total cost|cost amount|book cost/i]);
  const valueCol = findCol(headers, [/^value\s*\$?$/i, /market value|current value|^value/i]);
  const dateCol = findCol(headers, [/purchase date|acquired|acquisition|trade date|date/i]);
  const nameCol = findCol(headers, [/description|security|name|fund|investment|holding|instrument/i]);   // broadened: brokerages label the name column many ways

  const holdings: ImportedHolding[] = [];
  let skipped = 0;
  const dataRows = rows.slice(hIdx + 1);
  for (const r of dataRows) {
    const symbol = (symbolCol >= 0 ? r[symbolCol] : '').trim();
    // Skip summary rows (TOTAL/SUBTOTAL/account lines) and rows with nothing usable.
    if (!symbol || /^(total|subtotal|net account|account\b)/i.test(symbol)) { skipped++; continue; }
    const shares = sharesCol >= 0 ? num(r[sharesCol]) : NaN;
    const value = valueCol >= 0 ? num(r[valueCol]) : NaN;
    const name = nameCol >= 0 ? (r[nameCol] ?? '').trim() : '';
    const isCashLine = /^cash$/i.test(symbol);
    // A CASH line imports only when it carries a real balance (a Value column); otherwise nothing to import.
    if (isCashLine ? !(value > 0) : (!(shares > 0) && !(value > 0))) { skipped++; continue; }

    let costPerShare = perShareCol >= 0 ? num(r[perShareCol]) : NaN;
    if (!(costPerShare >= 0)) {
      const totalCost = totalCostCol >= 0 ? num(r[totalCostCol]) : NaN;
      costPerShare = totalCost >= 0 && shares > 0 ? totalCost / shares : 0;
    }
    const assetClass: AssetClass = isCashLine ? 'cash' : classifyHolding(symbol, name);
    const ticker = assetClass === 'stocks_etf' ? cleanTicker(symbol) : null;   // only equities track by ticker
    holdings.push({
      symbol,
      ticker: ticker ?? '',
      shares: shares > 0 ? shares : 0,
      costPerShare: Number.isFinite(costPerShare) && costPerShare >= 0 ? costPerShare : 0,
      value: Number.isFinite(value) && value >= 0 ? value : 0,
      date: dateCol >= 0 ? toIsoDate(r[dateCol]) : undefined,
      label: name || undefined,
      assetClass,
    });
  }

  return {
    holdings,
    total: dataRows.length,
    skipped,
    mapped: {
      ticker: symbolCol >= 0 ? headers[symbolCol] : undefined,
      shares: sharesCol >= 0 ? headers[sharesCol] : undefined,
      cost: perShareCol >= 0 ? headers[perShareCol] : totalCostCol >= 0 ? headers[totalCostCol] : undefined,
      value: valueCol >= 0 ? headers[valueCol] : undefined,
      date: dateCol >= 0 ? headers[dateCol] : undefined,
      name: nameCol >= 0 ? headers[nameCol] : undefined,
    },
  };
}
