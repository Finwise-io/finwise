// Investment-file import — parse a brokerage CSV export into holdings (ticker + shares + cost).
// Pure + testable: no file I/O, no store. The screen reads the file text, calls importHoldings(),
// previews the result, then builds Position/Lot rows (with fresh ids) and saves a new account.
//
// DR-5/DR-10: validates at the edge (ticker required, shares > 0, money parsed to Number USD).
// DR-6: ids are assigned by the caller via newEntityId, never derived from the file.

import { type AssetClass } from '../assets';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';

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
/* ─ MK-XS-F-123 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * base64ToBytes
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     c = b64.replace( ÷ [^A − za − z0 − 9+ ÷ ] ÷ g, '')
 *     out = []
 *     e1 = B64.index of(c[i]), e2 = B64.index of(c[i + 1]), e3 = B64.index of(c[i + 2]), e4 = B64.index of(c[i + 3])
 *     n = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63)
 *     the answer = out
 *
 * Called by ... MK-XS-F-012 decodeCsvBase64
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-012 decodeCsvBase64
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-123
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-XS-F-124 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * decodeUtf8
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     s = ''
 *     c = b[i++]
 *     the answer = s
 *
 * Called by ... MK-XS-F-012 decodeCsvBase64
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-012 decodeCsvBase64
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-124
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-XS-F-125 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * decodeUtf16
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     s = ''
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-012 decodeCsvBase64
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-012 decodeCsvBase64
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-125
 * Changed ..... not in git yet (—)
 */
function decodeUtf16(b: number[], start: number, le: boolean): string {
  let s = '';
  for (let i = start; i + 1 < b.length; i += 2) s += String.fromCharCode(le ? (b[i] | (b[i + 1] << 8)) : ((b[i] << 8) | b[i + 1]));
  return s;
}
/* ─ MK-XS-F-012 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * decodeCsvBase64
 *
 * Answers ..... What is the text of the file that was picked?
 *
 * Formula .....
 *     b = base64 to bytes(b64)
 *     decode utf16(b, 2, true)   when length ≥ 2 and b[0] = 0xFF and b[1] = 0xFE
 *     decode utf16(b, 2, false)   when length ≥ 2 and b[0] = 0xFE and b[1] = 0xFF
 *     start = 0
 *     nul = 0; const probe = min(count of b, 400)
 *     decode utf16(b, 0, b[1] = 0)   when nul > probe ÷ 4
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in start of 0.
 *     · Uses a built-in nul of 0.
 *     · Caps length at 400.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-012
 * Changed ..... 2026-06-22 (feb22ca)
 */
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
/* ─ MK-XS-F-013 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * parseCsv
 *
 * Answers ..... Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas, "" escapes, CR/LF, BOM.
 *
 * Formula .....
 *     rows = []
 *     row = []
 *     field = ''
 *     in quotes = false
 *     s = (text.char code at(0) = 0xFEFF ? text.slice(1) : text).replace( ÷ \r\n ÷ g, "\n").replace( ÷ \r ÷ g, "\n")
 *     c = s[i]
 *     the answer = rows where some((cell) => cell.trim() ! = '')
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-013
 * Changed ..... 2026-06-22 (feb22ca)
 */
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

/* ─ MK-XS-F-171 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * numOrNaN
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     n = parse float(string(v ?? '').replace( ÷ [$,%\s] ÷ g, '').replace( ÷ [()] ÷ g, ''))
 *     the answer:
 *     n   if number.is finite(n)
 *     na n   otherwise
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-171
 * Changed ..... not in git yet (—)
 */
const numOrNaN = (v: string): number => {
  const n = parseFloat(String(v ?? '').replace(/[$,%\s]/g, '').replace(/[()]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

/* ─ MK-XS-F-126 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * findCol
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     i = headers.find index((h) => re.test(h))
 *     i   when i ≥ 0
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-126
 * Changed ..... not in git yet (—)
 */
function findCol(headers: string[], patterns: RegExp[]): number {
  for (const re of patterns) {
    const i = headers.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/** Normalise a date cell to 'YYYY-MM-DD', or undefined if it isn't a usable date. */
/* ─ MK-XS-F-127 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * toIsoDate
 *
 * Answers ..... Normalise a date cell to 'YYYY-MM-DD', or undefined if it isn't a usable date.
 *
 * Formula .....
 *     t = (v ?? '').trim()
 *     undefined   when t is missing
 *     m = match( ÷ ^(\d{4})[- ÷ ](\d{1,2})[- ÷ ](\d{1,2})$ ÷ )
 *     `${m[1]}-${m[2].pad start(2, '0')}-${m[3].pad start(2, '0')}`   when m
 *     `${m[3]}-${m[1].pad start(2, '0')}-${m[2].pad start(2, '0')}`   when m
 *     the answer = undefined
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-127
 * Changed ..... not in git yet (—)
 */
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
/* ─ MK-XS-F-128 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * cleanTicker
 *
 * Answers ..... A plausible tradeable ticker: 1–10 chars, letters/digits/.-, at least one letter, no spaces.
 *
 * Formula .....
 *     t = (v ?? '').trim().to upper case()
 *     nothing   when t is missing (or ÷ \s ÷ .test(t) (or length > 10 when missing or zero) when missing or zero)
 *     nothing   when ! ÷ [A − Z] ÷ .test(t) (or ! ÷ ^[A − Z0 − 9.\-]+$ ÷ .test(t) when missing or zero)
 *     nothing   when ['TOTAL', 'CASH', 'SUBTOTAL', 'N ÷ A', 'SYMBOL', 'TICKER'].includes(t)
 *     the answer = t
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-128
 * Changed ..... not in git yet (—)
 */
function cleanTicker(v: string): string | null {
  const t = (v ?? '').trim().toUpperCase();
  if (!t || /\s/.test(t) || t.length > 10) return null;
  if (!/[A-Z]/.test(t) || !/^[A-Z0-9.\-]+$/.test(t)) return null;
  if (['TOTAL', 'CASH', 'SUBTOTAL', 'N/A', 'SYMBOL', 'TICKER'].includes(t)) return null;
  return t;
}

/** B7 (founder brief 2026-08-20): classification lives in the ONE function — this road only adapts.
 *  All the evidence this function used to hold (money-market tickers, OCC option symbols, crypto
 *  and commodity lists, the company-word guard) moved into the function verbatim, behavior kept. */
/* ─ MK-XS-F-172 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * assetClassForSymbol
 *
 * Answers ..... B7 (founder brief 2026-08-20): classification lives in the ONE function — this road only adapts.
 *
 * Formula .....
 *     classify holding class({ ticker: symbol, name, has security identity: true }).cls
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-172
 * Changed ..... not in git yet (—)
 */
export function assetClassForSymbol(symbol: string, name = ''): AssetClass {
  return classifyHoldingClass({ ticker: symbol, name, hasSecurityIdentity: true }).cls;
}

/** Find the real positions header — the first row that has BOTH a symbol/ticker AND a quantity/shares
 *  column (skips brokerage preambles like "Account Summary" and filter headers). */
/* ─ MK-XS-F-129 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * findHeaderRow
 *
 * Answers ..... Find the real positions header — the first row that has BOTH a symbol/ticker AND a quantity/shares column (skips brokerage preambles like "Account Summary" and filter headers).
 *
 * Formula .....
 *     h = for each of rows[i]: trim()
 *     has sym = some((c) => ÷ ^(symbol|ticker)$ ÷ test(c))
 *     has qty = some((c) => ÷ ^(quantity|shares|qty|units)$ ÷ test(c))
 *     i   when has sym and has qty
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-129
 * Changed ..... not in git yet (—)
 */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const h = rows[i].map((c) => c.trim());
    const hasSym = h.some((c) => /^(symbol|ticker)$/i.test(c));
    const hasQty = h.some((c) => /^(quantity|shares|qty|units)$/i.test(c));
    if (hasSym && hasQty) return i;
  }
  return 0;
}

/* ─ MK-XS-F-015 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * importHoldings
 *
 * Answers ..... What holdings are in this file?
 *
 * Formula .....
 *     rows = parse csv(text)
 *     holdings = []
 *     total = 0
 *     skipped = 0
 *     mapped = {}   when rows.length < 2
 *     h idx = find header row(rows)
 *     headers = for each of rows[h idx]: trim()
 *     symbol col = find col(headers, [ ÷ ^symbol$ ÷ i, ÷ ^ticker$ ÷ i, ÷ symbol|ticker ÷ i])
 *     shares col = find col(headers, [ ÷ ^quantity$ ÷ i, ÷ quantity|shares|qty|units ÷ i])
 *     per share col = find col(headers, [ ÷ cost. × (per|\ ÷ ). × sh|cost\ ÷ sh|average cost|avg\.? cost|price paid|purchase price|unit cost ÷ i])
 *     total cost col = find col(headers, [ ÷ cost basis|total cost|cost amount|book cost ÷ i])
 *     value col = find col(headers, [ ÷ ^value\s × \$?$ ÷ i, ÷ market value|current value|^value ÷ i])
 *     date col = find col(headers, [ ÷ purchase date|acquired|acquisition|trade date|date ÷ i])
 *     name col = find col(headers, [ ÷ description|security|name|fund|investment|holding|instrument ÷ i])
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Uses a built-in skipped of 0.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-015
 * Changed ..... 2026-06-22 (6f13ff0)
 */
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
    const shares = sharesCol >= 0 ? numOrNaN(r[sharesCol]) : NaN;
    const value = valueCol >= 0 ? numOrNaN(r[valueCol]) : NaN;
    const name = nameCol >= 0 ? (r[nameCol] ?? '').trim() : '';
    const isCashLine = /^cash$/i.test(symbol);
    // A CASH line imports only when it carries a real balance (a Value column); otherwise nothing to import.
    if (isCashLine ? !(value > 0) : (!(shares > 0) && !(value > 0))) { skipped++; continue; }

    let costPerShare = perShareCol >= 0 ? numOrNaN(r[perShareCol]) : NaN;
    if (!(costPerShare >= 0)) {
      const totalCost = totalCostCol >= 0 ? numOrNaN(r[totalCostCol]) : NaN;
      costPerShare = totalCost >= 0 && shares > 0 ? totalCost / shares : 0;
    }
    const assetClass: AssetClass = isCashLine ? 'cash' : assetClassForSymbol(symbol, name);
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

// ── Import v2 (FCC): the merge-not-duplicate rule ──────────────────────────────────────────────
// Re-importing next quarter's file from the same institution must REFRESH the account, never twin
// it. Candidate = an existing investment account whose institution (normalized) matches. The same
// rule serves the F1 connect flow's reconcile step — one behavior: "we never double an account."
import type { AssetAccount } from '../assets';

/* ─ MK-XS-F-130 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * normInst
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     (s ?? '').trim().to lower case().replace( ÷ [^a − z0 − 9] ÷ g, '')
 *
 * Called by ... MK-XS-F-016 matchImportAccount
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-016 matchImportAccount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-130
 * Changed ..... not in git yet (—)
 */
const normInst = (s?: string) => (s ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

/** The existing account a fresh import from `institution` should offer to update (or null). */
/* ─ MK-XS-F-016 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * matchImportAccount
 *
 * Answers ..... The existing account a fresh import from `institution` should offer to update (or null).
 *
 * Formula .....
 *     target = norm inst(institution)
 *     nothing   when target is missing
 *     nothing   when count of candidates is missing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *
 * Decides .....
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-016
 * Changed ..... 2026-07-13 (d33eeae)
 */
export function matchImportAccount(accounts: AssetAccount[], institution: string): AssetAccount | null {
  const target = normInst(institution);
  if (!target) return null;
  const candidates = accounts.filter((a) =>
    (normInst(a.institution) === target || normInst(a.label) === target)
    && a.tax_bucket !== 'PROPERTY' && a.tax_bucket !== 'CASH');
  if (!candidates.length) return null;
  // prefer the position-tracked (previously imported/connected) account, then the largest
  return candidates.sort((a, b) =>
    Number(!!b.positions?.length) - Number(!!a.positions?.length) || (b.balance || 0) - (a.balance || 0))[0];
}
