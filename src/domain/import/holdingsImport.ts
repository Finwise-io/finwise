// Investment-file import — parse a brokerage CSV export into holdings (ticker + shares + cost).
// Pure + testable: no file I/O, no store. The screen reads the file text, calls importHoldings(),
// previews the result, then builds Position/Lot rows (with fresh ids) and saves a new account.
//
// DR-5/DR-10: validates at the edge (ticker required, shares > 0, money parsed to Number USD).
// DR-6: ids are assigned by the caller via newEntityId, never derived from the file.

import { type AssetClass } from '../assets';
import { purchaseDateOnRecord } from '../performance';
import { newEntityId } from '../_shared/ids';
import { isoLocalDate } from '../_shared/dates';   // the person's own day, never the UTC one (it read tomorrow after 4 PM Pacific)
import { reconcileAccountTotal } from '../../../Calculation Module code/engines/reconcile';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';

export interface ImportedHolding {
  symbol: string;          // raw identifier from the file (may contain spaces, e.g. an option or CD)
  ticker: string;          // clean tradeable ticker for price lookup, or '' for non-tradeable (CD/option/bond)
  shares: number;          // ≥ 0 (0 for a plain CASH line)
  costPerShare: number;    // USD; 0 when the file doesn't give a cost
  value: number;           // market value (USD) from the file; 0 if absent
  date?: string;           // 'YYYY-MM-DD' purchase date if the file had one
  label?: string;          // security description, if present
  /** THE FILE'S OWN TYPE for this row, exactly as written, when the file has a type column ("Security Type",
   *  "Asset Class"…). It decides the class (his ruling, 2026-10-20: "always the class broker sends"), and the account
   *  keeps it on the saved holding so every reader asks the same order. Absent = the file names no type. */
  brokerType?: string;
  assetClass: AssetClass;  // the one order: the file's own type first, else the symbol and name (MK-ST-F-011)
  // WHAT THE FILE SAYS ONE UNIT IS WORTH (2026-11-04, his Build 55 file): the row's value ÷ (quantity × the shares per unit),
  // so quantity × this mark gives back exactly the value the file states. Absent = the file states no value for the row.
  lastPrice?: number;
  // A BOND OR CD'S OWN FACTS, AS ITS LINE STATES THEM (2026-11-04): "KEY BANK CD … 3.85% 08/24/2026" carries its rate and its
  // maturity in its name; the face is the quantity where the row's own value shows it is priced per $100 of face. Never guessed.
  faceValue?: number;
  couponRate?: number;     // 0.0385 = 3.85% a year
  maturityDate?: string;   // YYYY-MM-DD
  priceQuote?: 'per_100_of_face' | 'unclear';
  multiplier?: number;     // an option: 100 shares a contract (his rule Q06, 2026-08-26)
  classSetBy?: 'user';     // the person changed the class on the review screen: saved as their answer (B7, DEC-2161)
}

export interface ImportResult {
  holdings: ImportedHolding[];
  total: number;           // data rows seen (excludes the header)
  skipped: number;         // rows dropped (summary rows / no value)
  mapped: { ticker?: string; shares?: string; cost?: string; date?: string; name?: string; value?: string };
  // THE ACCOUNT THE FILE IS ABOUT, when it names one (2026-11-04): E*TRADE's "Account Summary" row gives
  // "Individual Brokerage -2203" and its Net Account Value. Absent = the file names no account.
  account?: { name: string; number?: string; statedTotal?: number };
  // THE DAY THE FILE'S FIGURES ARE FROM, when it states one ("Generated at Jun 21 2026 03:37 PM ET"). Absent = none stated.
  asOf?: string;
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
 * Called by ... MK-XS-F-015 importHoldings · MK-XS-F-217 fileAccountOf
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-217 fileAccountOf · MK-XS-F-015 importHoldings
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
 *     purchase date on record(`${m[1]}-${m[2].pad start(2, '0')}-${m[3].pad start(2, '0')}`) (or undefined when missing)   when m
 *     purchase date on record(`${m[3]}-${m[1].pad start(2, '0')}-${m[2].pad start(2, '0')}`) (or undefined when missing)   when m
 *     the answer = undefined
 *
 * Called by ... MK-XS-F-015 importHoldings · MK-XS-F-216 fileDateOf
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-216 fileDateOf · MK-XS-F-015 importHoldings
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
  // A DAY THAT DOES NOT EXIST IS NOT A PURCHASE DATE (2026-10-21; tenet 3): 02/31/2026 was kept as written and read as
  // 3 March. It is left as not on record, by the one reading of a purchase date (purchaseDateOnRecord).
  if (m) return purchaseDateOnRecord(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`) ?? undefined;
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);              // MM/DD/YYYY
  if (m) return purchaseDateOnRecord(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`) ?? undefined;
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
 *     classify holding class({ ticker: symbol, name, broker tag: broker type ?? nothing, has security identity: true }).cls
 *
 * Called by ... MK-CF-F-138 addLot · MK-XS-F-015 importHoldings
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-138 addLot · MK-CF-F-111 applyTransaction
 *               MK-XS-F-015 importHoldings · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-172
 * Changed ..... not in git yet (—)
 */
export function assetClassForSymbol(symbol: string, name = '', brokerType?: string | null): AssetClass {
  return classifyHoldingClass({ ticker: symbol, name, brokerTag: brokerType ?? null, hasSecurityIdentity: true }).cls;
}

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
/** The day a file says its figures are from: a cell that starts "Generated at", "As of" or "Data as of", followed by
 *  "Jun 21 2026" / "June 21, 2026" or 06/21/2026. Null when no cell says so — never the day of the import. */
/* ─ MK-XS-F-216 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fileDateOf
 *
 * Answers ..... The day a file says its figures are from: a cell that starts "Generated at", "As of" or "Data as of", followed by "Jun 21 2026" / "June 21, 2026" or 06/21/2026.
 *
 * Formula .....
 *     t = (c ?? '').trim()
 *     head = match( ÷ ^(?:generated(?: at| on)?|(?:data )?as of|downloaded(?: on)?)\s × :?\s × (.+)$ ÷ i)
 *     m = head[1].match( ÷ ^([A − za − z]{3})[a − z] × \.?\s+(\d{1,2}),?\s+(\d{4}) ÷ )
 *     iso = purchase date on record(`${m[3]}-${MONTHS[m[1].to lower case()]}-${m[2].pad start(2, '0')}`)
 *     iso   when iso
 *     d = to iso date((head[1].match( ÷ ^(\d{1,2}\ ÷ \d{1,2}\ ÷ \d{4}) ÷ ) ?? [])[1] ?? '')
 *     d   when d
 *     the answer = undefined
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-216
 * Changed ..... not in git yet (—)
 */
function fileDateOf(rows: string[][]): string | undefined {
  for (const r of rows) for (const c of r) {
    const t = (c ?? '').trim();
    const head = t.match(/^(?:generated(?: at| on)?|(?:data )?as of|downloaded(?: on)?)\s*:?\s*(.+)$/i);
    if (!head) continue;
    const m = head[1].match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (m && MONTHS[m[1].toLowerCase()]) {
      const iso = purchaseDateOnRecord(`${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`);
      if (iso) return iso;
    }
    const d = toIsoDate((head[1].match(/^(\d{1,2}\/\d{1,2}\/\d{4})/) ?? [])[1] ?? '');
    if (d) return d;
  }
  return undefined;
}

/** The account a file is about: the row under a header that has an "Account" column beside an account value column
 *  ("Net Account Value", "Account Value", "Total Value"). "Individual Brokerage -2203" → name and number. */
/* ─ MK-XS-F-217 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fileAccountOf
 *
 * Answers ..... The account a file is about: the row under a header that has an "Account" column beside an account value column ("Net Account Value", "Account Value", "Total Value").
 *
 * Formula .....
 *     h = for each of rows[i]: each (or '').trim( when missing)
 *     name at = find index((c) => ÷ ^account( name)?$ ÷ test(c))
 *     total at = find index((c) => ÷ ^(net account value|account value|total (account )?value)\b ÷ test(c))
 *     row = rows.slice(i + 1, before).find((r) => (r[name at] ?? '').trim())
 *     undefined   when row is missing
 *     raw = row[name at].trim()
 *     num = raw.match( ÷ ^(. × ?)\s × [-–#x x × •]+\s × (\d{3,})$ ÷ )
 *     total = num or na n(row[total at])   if total at ≥ 0
 *     na n   otherwise
 *     the answer:
 *     name = (num ? num[1] : raw).trim()
 *     ...(num ? { number: num[2] } : {}) = ...(num ? { number: num[2] } : {})
 *     ...(number.is finite(total) ? { stated total: total } : {}) = ...(number.is finite(total) ? { stated total: total } : {})
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-217
 * Changed ..... not in git yet (—)
 */
function fileAccountOf(rows: string[][], before: number): ImportResult['account'] {
  for (let i = 0; i < before; i++) {
    const h = rows[i].map((c) => (c ?? '').trim());
    const nameAt = h.findIndex((c) => /^account( name)?$/i.test(c));
    const totalAt = h.findIndex((c) => /^(net account value|account value|total (account )?value)\b/i.test(c));
    if (nameAt < 0) continue;
    const row = rows.slice(i + 1, before).find((r) => (r[nameAt] ?? '').trim());
    if (!row) return undefined;
    const raw = row[nameAt].trim();
    const num = raw.match(/^(.*?)\s*[-–#xX*•]+\s*(\d{3,})$/);
    const total = totalAt >= 0 ? numOrNaN(row[totalAt]) : NaN;
    return { name: (num ? num[1] : raw).trim(), ...(num ? { number: num[2] } : {}), ...(Number.isFinite(total) ? { statedTotal: total } : {}) };
  }
  return undefined;
}

const OPTION_WORDS = /\b(put|call)s?\b/i;
/** Two amounts that are the same to the cent — under half a cent apart — so a file's total and the total of its rows can be compared without a rounding difference reading as a gap. */
/* ─ MK-XS-F-218 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * sameCents
 *
 * Answers ..... Two amounts that are the same to the cent — under half a cent apart — so a file's total and the total of its rows can be compared without a rounding difference reading as a gap.
 *
 * Formula .....
 *     size of(a − b) < 0.005
 *
 * Called by ... MK-XS-F-015 importHoldings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-015 importHoldings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-218
 * Changed ..... not in git yet (—)
 */
const sameCents = (a: number, b: number) => Math.abs(a - b) < 0.005;

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
 *     last price col = find col(headers, [ ÷ ^last price ÷ i, ÷ last price|current price|^price\s × \$?$ ÷ i])
 *     date col = find col(headers, [ ÷ purchase date|acquired|acquisition|trade date|date ÷ i])
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-012 bond coupon rate
 *               MK-XS-I-013 bond maturity date
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *               MK-XS-I-070 the class a broker sends for a holding — its security type and its cash-equivalent flag
 *
 * Decides .....
 *     · If multiplier is missing it uses 1.
 *     · Uses a built-in skipped of 0.
 *     · Applies a built-in rate of 0.5% to qty.
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
  const lastPriceCol = findCol(headers, [/^last price/i, /last price|current price|^price\s*\$?$/i]);
  const dateCol = findCol(headers, [/purchase date|acquired|acquisition|trade date|date/i]);
  // THE FILE'S OWN TYPE COLUMN, when it has one (Schwab: "Security Type"; others: "Asset Class", "Investment Type") —
  // the broker's class for each row (his ruling, 2026-10-20). A bare "Type" is NOT read: Fidelity's means the account
  // type (Cash / Margin), not the holding's. The type column is never mistaken for the name column below.
  const typeCol = headers.findIndex((h) => /^(security|asset|investment|product|holding)\s*(type|class)$/i.test(h));
  const nameCol = findCol(headers.map((h, i) => (i === typeCol ? '' : h)), [/description|security|name|fund|investment|holding|instrument/i]);   // broadened: brokerages label the name column many ways

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
    const brokerType = typeCol >= 0 ? (r[typeCol] ?? '').trim() : '';
    const assetClass: AssetClass = isCashLine ? 'cash' : assetClassForSymbol(symbol, name, brokerType || null);
    const ticker = assetClass === 'stocks_etf' ? cleanTicker(symbol) : null;   // only equities track by ticker
    // an option is a contract of 100 shares (Q06); a bond or CD whose value is quantity × price ÷ 100 is priced per $100 of
    // face, so its quantity is its face; one whose value is quantity × price is priced as a share is
    const qty = shares > 0 ? shares : 0;
    const multiplier = assetClass === 'alternatives' && OPTION_WORDS.test(`${symbol} ${name}`) ? 100 : undefined;
    const px = lastPriceCol >= 0 ? numOrNaN(r[lastPriceCol]) : NaN;
    const bond = assetClass === 'bonds' && !isCashLine;
    // THE PRICE AS WRITTEN, TO THE CENTS IT SHOWS (2026-11-04, his file re-saved from a spreadsheet: 99.9934 became $99.99): a price
    // rounded to the cent can be off by half a cent a unit, so quantity × price is compared with the value within quantity × $0.005
    // (÷ 100 when priced per $100 of face). Whichever reading the value fits is the one; one that fits neither is unclear.
    const fits = (worth: number, slack: number) => Number.isFinite(px) && Number.isFinite(value) && (sameCents(worth, value) || Math.abs(worth - value) <= slack);
    const quote: ImportedHolding['priceQuote'] | 'per_unit' | undefined = !bond || !(qty > 0) ? undefined
      : fits(qty * px / 100, qty * 0.005 / 100) ? 'per_100_of_face'
      : fits(qty * px, qty * 0.005) ? 'per_unit' : 'unclear';
    const perUnit = (multiplier ?? 1) * (quote === 'per_100_of_face' ? 1 / 100 : 1);
    const lastPrice = !isCashLine && qty > 0 && Number.isFinite(value) && value >= 0 ? value / (qty * perUnit)
      : !isCashLine && Number.isFinite(px) && px >= 0 ? px : undefined;
    const rate = bond ? `${symbol} ${name}`.match(/(\d{1,2}(?:\.\d{1,4})?)\s*%/) : null;
    const maturity = bond ? toIsoDate((`${symbol} ${name}`.match(/(\d{1,2}\/\d{1,2}\/\d{4})(?!.*\d{1,2}\/\d{1,2}\/\d{4})/) ?? [])[1] ?? '') : undefined;
    holdings.push({
      symbol,
      ticker: ticker ?? '',
      shares: shares > 0 ? shares : 0,
      costPerShare: Number.isFinite(costPerShare) && costPerShare >= 0 ? costPerShare : 0,
      value: Number.isFinite(value) && value >= 0 ? value : 0,
      date: dateCol >= 0 ? toIsoDate(r[dateCol]) : undefined,
      label: name || undefined,
      ...(brokerType ? { brokerType } : {}),
      assetClass,
      ...(lastPrice != null ? { lastPrice } : {}),
      ...(quote === 'per_100_of_face' ? { faceValue: qty, priceQuote: quote } : quote === 'unclear' ? { priceQuote: quote } : {}),
      ...(rate ? { couponRate: Number(rate[1]) / 100 } : {}),
      ...(maturity ? { maturityDate: maturity } : {}),
      ...(multiplier ? { multiplier } : {}),
    });
  }
  const account = fileAccountOf(rows, hIdx);
  const asOf = fileDateOf(rows);

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
    ...(account ? { account } : {}),
    ...(asOf ? { asOf } : {}),
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

/** ONE FILE, ONE ACCOUNT (his Build 55 feedback, 2026-11-04: "The file imported is not imported accurately."). An imported
 *  file is one account: its cash plus its holdings, each holding under its own class — the account page he approved
 *  (DEC-6457) and DEC-7589. It used to be split into one account per class (a brokerage, a savings account, a bond and an
 *  option), which dropped the CD's face, rate and maturity and what the put cost. The account takes the file's name and
 *  number, is valued as of the file's own date, and its cash plus holdings is checked against the file's own total: a
 *  difference is kept on the account, named, as a linked account's is (E11). A name typed on the review screen wins.
 *  To reverse: give confirmImport its per-class loop back (git history, 2026-11-04). */
/* ─ MK-XS-F-219 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * importedAccountOf
 *
 * Answers ..... ONE FILE, ONE ACCOUNT (his Build 55 feedback, 2026-11-04: "The file imported is not imported accurately.").
 *
 * Formula .....
 *     now iso = opts.now iso (or the date ).to isostring( when missing)
 *     cash rows = holdings where asset class = 'cash' and !(shares > 0)
 *     held = holdings where !cash rows.includes(each) and shares > 0
 *     elsewhere = Σ over value only rows(r) of (value (or 0 when missing or zero))
 *     cash = Σ over cash rows of (value (or 0 when missing or zero))
 *     cls = asset class
 *     is option = multiplier ≠ nothing
 *     values = for each of held: value (or 0 when missing or zero)
 *     stated = account.stated total
 *     check = reconcile account total([...values, elsewhere], cash, stated)   if stated ≠ nothing and stated > 0
 *     nothing   otherwise
 *     typed = opts.name.trim()
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-011 bond face value
 *               MK-XS-I-012 bond coupon rate
 *
 * Decides .....
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-219
 * Changed ..... 2026-11-05 (922e82bb)
 */
export function importedAccountOf(
  r: ImportResult,
  opts: { institution: string; name: string; nowIso?: string },
): Omit<AssetAccount, 'asset_id'> {
  const nowIso = opts.nowIso ?? new Date().toISOString();
  const cashRows = r.holdings.filter((h) => h.assetClass === 'cash' && !(h.shares > 0));
  const held = r.holdings.filter((h) => !cashRows.includes(h) && h.shares > 0);
  // a row with a value and no quantity cannot be a holding; it is saved on its own (valueOnlyAccountsOf) and still counts
  // toward the file's total below
  const elsewhere = valueOnlyRows(r).reduce((t, h) => t + (h.value || 0), 0);
  const cash = cashRows.reduce((t, h) => t + (h.value || 0), 0);
  const positions = held.map((h) => {
    const cls = h.assetClass;
    const isOption = h.multiplier != null;
    return {
      position_id: newEntityId('pos'),
      ticker: h.ticker || h.symbol.trim().toUpperCase(),
      label: h.label ?? (h.ticker ? undefined : h.symbol),
      // the kinds a linked account's holdings get (ingestSync), so a file and a link read one way; an option keeps 'options'
      kind: isOption ? 'options' : cls === 'bonds' ? 'fixed_income' : cls === 'alternatives' ? 'crypto' : cls === 'cash' ? 'money_market' : 'stocks_etf',
      asset_class: cls === 'bonds' ? 'bond' as const : cls === 'alternatives' ? 'other' as const : cls === 'cash' ? 'cash' as const : 'stock_etf' as const,
      ...(h.classSetBy === 'user' ? { class_source: 'user' as const } : {}),
      ...(h.brokerType ? { broker_type: h.brokerType } : {}),
      ...(isOption ? { multiplier: h.multiplier } : {}),
      ...(h.lastPrice != null ? { last_price: h.lastPrice } : {}),
      ...(h.faceValue != null ? { face_value: h.faceValue } : {}),
      ...(h.couponRate != null ? { coupon_rate: h.couponRate } : {}),
      ...(h.maturityDate ? { maturity_date: h.maturityDate } : {}),
      ...(h.priceQuote ? { price_quote: h.priceQuote } : {}),
      // SAVED EXACTLY AS THE FILE GIVES THEM (DEC-0403); a file with no purchase date keeps it as not on record (DEC-6691)
      lots: [{ lot_id: newEntityId('lot'), shares: h.shares, cost_per_share: h.costPerShare, purchase_date: h.date ?? '' }],
    };
  });
  const values = held.map((h) => h.value || 0);
  const stated = r.account?.statedTotal;
  const check = stated != null && stated > 0 ? reconcileAccountTotal([...values, elsewhere], cash, stated) : null;
  const typed = opts.name.trim();
  return {
    label: typed || r.account?.name || 'Imported holdings',
    ...(r.account?.number && /^\d{4,}$/.test(r.account.number) ? { mask: `••${r.account.number.slice(-4)}` } : {}),
    // an imported file names no tax type, so none is stated — never Taxable for the person (DEC-4036f)
    kind: 'brokerage', tax_bucket: undefined, target_return: 0.08,
    institution: opts.institution.trim(), source: 'imported', last_synced: nowIso,
    value_as_of: r.asOf ?? isoLocalDate(new Date(nowIso)),
    derive_balance: true, cash_balance: cash, positions: positions as any,
    // held exact (DEC-0403): the cash plus what the file says each holding is worth; prices refresh it later
    balance: cash + values.reduce((t, v) => t + v, 0),
    ...(check && !check.ok ? { recon_break: { difference: check.difference.toString(), at: (r.asOf ?? isoLocalDate(new Date(nowIso))) } } : {}),
  } as unknown as Omit<AssetAccount, 'asset_id'>;   // tax_bucket left unstated on purpose (DEC-4036f)
}

/** The rows of an imported file that have a value and no quantity, cash left out — a bond or other investment the file lists by value only. */
/* ─ MK-XS-F-220 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * valueOnlyRows
 *
 * Answers ..... The rows of an imported file that have a value and no quantity, cash left out — a bond or other investment the file lists by value only.
 *
 * Formula .....
 *     holdings where asset class ! = 'cash' and !(shares > 0) and value > 0
 *
 * Called by ... MK-XS-F-219 importedAccountOf · MK-XS-F-221 valueOnlyAccountsOf
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-219 importedAccountOf · MK-XS-F-221 valueOnlyAccountsOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-220
 * Changed ..... not in git yet (—)
 */
const valueOnlyRows = (r: ImportResult) => r.holdings.filter((h) => h.assetClass !== 'cash' && !(h.shares > 0) && h.value > 0);

/** A ROW WITH A VALUE AND NO QUANTITY (a bond or other investment a file lists by value only) cannot be a holding — a holding
 *  is a quantity at a price — so it is saved as its own account under its class, holding that value, as every imported row
 *  was before 2026-11-04. None in his file. */
/* ─ MK-XS-F-221 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * valueOnlyAccountsOf
 *
 * Answers ..... A ROW WITH A VALUE AND NO QUANTITY (a bond or other investment a file lists by value only) cannot be a holding — a holding is a quantity at a price — so it is saved as its own account under its class, holding that value, as every imported row was before 2026-11-04.
 *
 * Formula .....
 *     now iso = opts.now iso (or the date ).to isostring( when missing)
 *
 * Called by ... MK-XS-F-219 importedAccountOf
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-219 importedAccountOf
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-033 the date a hand-typed value was set
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-066 last successful update of a linked or imported account
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-221
 * Changed ..... 2026-11-05 (922e82bb)
 */
export function valueOnlyAccountsOf(
  r: ImportResult,
  opts: { institution: string; nowIso?: string },
): Omit<AssetAccount, 'asset_id'>[] {
  const nowIso = opts.nowIso ?? new Date().toISOString();
  return valueOnlyRows(r).map((h) => ({
    label: h.label || h.symbol,
    kind: h.assetClass === 'bonds' ? 'fixed_income' : h.assetClass === 'alternatives' ? 'other_asset' : h.assetClass === 'real_estate' ? 'home' : 'brokerage',
    tax_bucket: h.assetClass === 'real_estate' || h.assetClass === 'personal_property' ? 'PROPERTY' : undefined,
    asset_class: h.assetClass, balance: h.value, target_return: h.assetClass === 'bonds' ? 0.042 : 0.05,
    institution: opts.institution.trim(), source: 'imported', last_synced: nowIso, value_as_of: r.asOf ?? isoLocalDate(new Date(nowIso)),
  }) as unknown as Omit<AssetAccount, 'asset_id'>);
}
