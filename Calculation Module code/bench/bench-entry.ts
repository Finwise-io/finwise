// THE BENCH — every calculator as a card you type numbers into, computing LIVE through the REAL
// engine code. This file imports the actual engines the app runs — never a copy, because a copy
// is how you get two answers to one question, which is the disease this module exists to cure.
//
// Each card: plain-English title · the engine name as the master file lists it · typed fields ·
// a compute() that calls the real function and returns labelled result rows.
import { Dec } from '../engines/decimal';
import { readMoney, type SignConvention } from '../engines/money';
import { classifyEvent, EVENTS, type CanonicalEvent } from '../engines/events';
import { toLedgerRow, totalOf, unclassified, personalFlowTotals, importKey, type LedgerRow } from '../engines/ledger';
import { classifyHoldingClass, type HoldingClass } from '../engines/holding-class';
import { reconcileAccountTotal, reconcileLedgerIdentity } from '../engines/reconcile';
import { rmdStartAge, rmdDivisor } from '../engines/rmd';
import { windowBounds, moneyWeightedReturn, type ExternalFlow } from '../engines/window-return';
import { fullRetirementAge, fraLabel, ssClaimFactorFor, ssBenefitAt, ssLifetimeTotal } from '../../src/domain/retirement/ssTiming';
import { taxOwedFor, taxableIncomeFor, deductionFor, effectiveRateOnGrossFor, marginalBracketFor, ltcgRateFor, TAX_YEAR, type FilingStatus } from '../../src/domain/income/tax';
import { capGains, type Position } from '../../src/domain/performance';
import { simulate, projectNestEgg, type RetirementInputs } from '../../src/domain/retirement';

// ── shapes ─────────────────────────────────────────────────────────────────────────────────────
export interface Field {
  key: string; label: string;
  type: 'number' | 'text' | 'select' | 'checkbox' | 'textarea';
  options?: { value: string; label: string }[];
  default: string | number | boolean;
  hint?: string;
  wide?: boolean;
}
export interface ResultRow { label: string; value: string; note?: string; bad?: boolean; good?: boolean }
export interface FileDrop {
  label: string; hint: string;
  /** Parse the file's text into a values patch for the card, plus a note about what was read.
   *  `redirect` names ANOTHER card when the file turns out to belong there — a holdings file
   *  dropped on the ledger loads the classify card instead of dead-ending. */
  apply(text: string, filename: string): { values: Record<string, any>; note: string; redirect?: string };
}

/** Either kind of file, whichever box it lands on: try this card's reader first, then the other. */
function routeFile(
  text: string, filename: string,
  mine: (t: string, f: string) => { values: Record<string, any>; note: string },
  other: (t: string, f: string) => { values: Record<string, any>; note: string },
  otherCard: string, otherKind: string, otherCardName: string,
): { values: Record<string, any>; note: string; redirect?: string } {
  const first = mine(text, filename);
  if (first.values.rows) return first;
  const second = other(text, filename);
  if (second.values.rows) {
    return { ...second, redirect: otherCard,
      note: `${filename} is a ${otherKind} file — loaded into the “${otherCardName}” card (the page scrolled there). ${second.note}` };
  }
  return { values: {}, note: `${filename} matched neither reader. ${first.note} ${second.note}` };
}
export interface Card {
  id: string; title: string; engine: string; what: string;
  fields: Field[];
  compute(v: Record<string, any>): ResultRow[];
  preset?: { label: string; values: Record<string, any> };
  fileDrop?: FileDrop;
}

// ── reading ANY institution CSV — quote-aware, BOM-stripped, columns found by NAME ─────────────
// No two institutions agree on column names, so the reader hunts for the meaning: the word column
// (Transaction Type · Action · Type), the description, and the amount (Net Amount · Amount ·
// Principal Amount). A file whose columns cannot be found says so, honestly, instead of guessing.
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.replace(/^\uFEFF/, '').trim());
}
const findCol = (headers: string[], names: string[]): number => {
  const h = headers.map((x) => x.toLowerCase().replace(/[^a-z ]/g, '').trim());
  for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; }
  for (const n of names) { const i = h.findIndex((x) => x.includes(n)); if (i >= 0) return i; }
  return -1;
};

/** An ACTIVITY file (any institution) → "word | description | amount" lines for the ledger card. */
export function parseActivityFile(text: string, filename = 'the file'): { values: Record<string, any>; note: string } {
  const lines = text.split(/\r?\n/).map(splitCsvLine);
  for (let h = 0; h < Math.min(lines.length, 30); h++) {
    const word = findCol(lines[h], ['transaction type', 'action', 'activity type', 'type']);
    const amt = findCol(lines[h], ['net amount', 'amount', 'principal amount']);
    if (word < 0 || amt < 0 || lines[h].length < 3) continue;
    const desc = findCol(lines[h], ['transaction description', 'description', 'memo']);
    const rows: string[] = [];
    for (let r = h + 1; r < lines.length; r++) {
      const c = lines[r];
      if (c.length <= Math.max(word, amt)) continue;
      const w = c[word]; const a = c[amt];
      if (!w || !a || Dec.parse(a) == null) continue;
      rows.push(`${w} | ${desc >= 0 ? (c[desc] ?? '') : ''} | ${a}`);
    }
    if (rows.length) {
      return { values: { rows: rows.join('\n') },
        note: `${rows.length} activity row(s) read from ${filename} — word column “${lines[h][word]}”, amount column “${lines[h][amt]}”. Edit any line freely.` };
    }
  }
  return { values: {}, note: `Could not find activity columns in ${filename}. The reader looks for a word column (Transaction Type · Action · Type) and an amount column (Net Amount · Amount · Principal Amount) in the first 30 lines — nothing matched with money in it.` };
}

/** A HOLDINGS file (any institution) → "symbol | name | value" lines for the classifier card. */
export function parseHoldingsFile(text: string, filename = 'the file'): { values: Record<string, any>; note: string } {
  const lines = text.split(/\r?\n/).map(splitCsvLine);
  for (let h = 0; h < Math.min(lines.length, 30); h++) {
    const val = findCol(lines[h], ['total value', 'current value', 'market value', 'value']);
    const sym = findCol(lines[h], ['symbol', 'ticker']);
    const name = findCol(lines[h], ['investment name', 'security name', 'description', 'name']);
    if (val < 0 || (sym < 0 && name < 0)) continue;
    const rows: string[] = [];
    for (let r = h + 1; r < lines.length; r++) {
      const c = lines[r];
      if (c.length <= val) continue;
      const v = c[val];
      if (!v || Dec.parse(v) == null) continue;
      if ((sym >= 0 && c[sym]) || (name >= 0 && c[name])) {
        rows.push(`${sym >= 0 ? c[sym] ?? '' : ''} | ${name >= 0 ? c[name] ?? '' : ''} | ${v}`);
      }
    }
    if (rows.length) {
      return { values: { rows: rows.join('\n') },
        note: `${rows.length} holding(s) read from ${filename} — name “${name >= 0 ? lines[h][name] : '—'}”, symbol “${sym >= 0 ? lines[h][sym] : '—'}”, value “${lines[h][val]}”. Edit any line freely.` };
    }
  }
  return { values: {}, note: `Could not find holdings columns in ${filename}. The reader looks for a value column (Total Value · Current Value · Market Value) plus a symbol or name column in the first 30 lines.` };
}

const money = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 });
const dec = (d: Dec) => (d.isNeg() ? '−$' : '$') + d.abs().round(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pctTxt = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const num = (v: any) => { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : 0; };

// parse "a, b, c" money lists and "word | amount" / "word | description | amount" line grids
const list = (v: any): string[] => String(v ?? '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const rows3 = (v: any): { a: string; b: string; c: string }[] =>
  String(v ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split('|').map((s) => s.trim());
    return p.length >= 3 ? { a: p[0], b: p[1], c: p[2] } : { a: p[0], b: '', c: p[1] ?? '' };
  });

// ── the Vanguard preset (loaded at build time from the real file when present) ─────────────────
declare const __VANGUARD_LEDGER__: string;   // injected by build-bench.mjs; '' when absent
const VG: string = typeof __VANGUARD_LEDGER__ !== 'undefined' ? __VANGUARD_LEDGER__ : '';

// ── the cards ──────────────────────────────────────────────────────────────────────────────────
export const CARDS: Card[] = [

  {
    id: 'ledger', title: 'The ledger — words become money, money becomes totals',
    engine: 'TRANSLATE_BROKER_WORD · LEDGER_TOTALS · PERSONAL_FLOWS',
    what: 'Paste activity rows (the institution’s word, an optional description, and the signed amount). Every row is classified by its WORDS — an unrecognised word counts in NOTHING, never guessed from the sign. Then the four totals, exactly.',
    fields: [
      { key: 'rows', label: 'Activity rows — one per line: word | description | amount', type: 'textarea', wide: true,
        default: 'Dividend | Dividend Received | 139.49\nReinvestment | Dividend Reinvestment | -139.49\nSweep out | Sweep Out Of Settlement Fund | 224454.11\nBuy | Buy | -224454.11\nSomething new | | 5000',
        hint: 'Negative = money left the account (the usual broker convention).' },
    ],
    preset: VG ? { label: 'Load the real Vanguard file (31 rows)', values: { rows: VG } } : undefined,
    fileDrop: {
      label: 'Drop ANY downloaded file here (CSV) — or click to choose',
      hint: 'Activity or holdings, any institution — the reader finds the columns by name and routes a holdings file to the classify card automatically. Nothing leaves this machine.',
      apply: (t, f) => routeFile(t, f, parseActivityFile, parseHoldingsFile, 'classifyfile', 'holdings', 'A whole holdings file, classified'),
    },
    compute(v) {
      const parsed = rows3(v.rows);
      const rows: LedgerRow[] = parsed.map((r) => toLedgerRow({ word: r.a, description: r.b, amount: r.c }, 'NEGATIVE_IS_OUT'));
      const out: ResultRow[] = [];
      const unk = unclassified(rows);
      out.push({ label: 'Money in (contributions)', value: dec(totalOf(rows, 'contributions')) });
      out.push({ label: 'Money out (withdrawals)', value: dec(totalOf(rows, 'withdrawals')) });
      out.push({ label: 'Income (dividends + interest)', value: dec(totalOf(rows, 'income')) });
      out.push({ label: 'Costs (fees, taxes withheld)', value: dec(totalOf(rows, 'costs')) });
      out.push({ label: 'Rows understood', value: `${rows.length - unk.length} of ${rows.length}`,
        note: unk.length ? `Not understood, counted in NOTHING: ${unk.map((u) => `“${u.sourceWord}” (${dec(u.amount)})`).join(' · ')}` : 'every word recognised', bad: unk.length > 0, good: unk.length === 0 });
      for (const r of rows.slice(0, 40)) {
        out.push({ label: `“${r.sourceWord}”`, value: `${r.event}`, note: EVENTS[r.event as CanonicalEvent]?.why ?? (EVENTS[r.event as CanonicalEvent]?.totals.length ? `counts in: ${EVENTS[r.event as CanonicalEvent].totals.join(', ')}` : 'counts in nothing') });
      }
      return out;
    },
  },

  {
    id: 'identity', title: 'The account identity — the check every statement satisfies',
    engine: 'RECONCILE_LEDGER_IDENTITY',
    what: 'ending = beginning + money in − money out + income − costs + market change. Type the six terms; the verdict is exact — a one-cent difference is a fact, never rounded away.',
    fields: [
      { key: 'beginning', label: 'Beginning value', type: 'number', default: 378022 },
      { key: 'ending', label: 'Ending value', type: 'number', default: 362088.59 },
      { key: 'contrib', label: 'Money in', type: 'number', default: 0 },
      { key: 'withdraw', label: 'Money out', type: 'number', default: 0 },
      { key: 'income', label: 'Income', type: 'number', default: 5454.66 },
      { key: 'costs', label: 'Costs (negative)', type: 'number', default: -460 },
      { key: 'market', label: 'Market change', type: 'number', default: -20928.07 },
    ],
    compute(v) {
      const r = reconcileLedgerIdentity({ beginning: v.beginning, ending: v.ending, contributions: v.contrib,
        withdrawals: v.withdraw, income: v.income, costs: v.costs, marketChange: v.market });
      return [
        { label: 'The identity', value: r.ok ? 'CLOSES to the cent' : `off by ${dec(r.difference)}`, good: r.ok, bad: !r.ok },
        { label: 'Left side (computed)', value: dec(r.computed) },
        { label: 'Right side (stated ending)', value: dec(r.stated) },
        { label: 'In words', value: r.sentence },
      ];
    },
  },

  {
    id: 'recon', title: 'Holdings + cash = the broker’s stated total',
    engine: 'RECONCILE_ACCOUNT_TOTAL',
    what: 'The one outside check an account ever gets. List the holding values, the uninvested cash, and what the broker says the account totals — exact, no tolerance.',
    fields: [
      { key: 'holdings', label: 'Holding values (comma-separated)', type: 'textarea', wide: true,
        default: '225019.43, 4410, 72000, 58250, 604.24, 966.98' },
      { key: 'cash', label: 'Uninvested cash (the settlement fund)', type: 'number', default: 837.94 },
      { key: 'stated', label: 'The broker’s stated total', type: 'number', default: 362088.59 },
    ],
    compute(v) {
      const r = reconcileAccountTotal(list(v.holdings), v.cash, v.stated);
      return [
        { label: 'Verdict', value: r.ok ? 'MATCHES to the cent' : `differs by ${dec(r.difference)}`, good: r.ok, bad: !r.ok },
        { label: 'Our parts sum to', value: dec(r.computed) },
        { label: 'The broker says', value: dec(r.stated) },
        { label: 'In words', value: r.sentence },
      ];
    },
  },

  {
    id: 'money', title: 'One amount, read honestly',
    engine: 'READ_MONEY',
    what: 'Institutions write money as "$8,502.00 ", "(0.53)" for negative, "--" for nothing. The reader keeps size and direction apart — and "nothing" is never zero.',
    fields: [
      { key: 'raw', label: 'The amount, exactly as the institution wrote it', type: 'text', default: '($1,234.56)' },
      { key: 'conv', label: 'Sign convention', type: 'select', default: 'NEGATIVE_IS_OUT',
        options: [ { value: 'NEGATIVE_IS_OUT', label: 'Negative means money left (usual)' },
                   { value: 'POSITIVE_IS_OUT', label: 'Positive means money left (FDX debits)' },
                   { value: 'ALWAYS_POSITIVE', label: 'No signs — direction stated separately' } ] },
    ],
    compute(v) {
      const m = readMoney(v.raw, v.conv as SignConvention);
      return [
        { label: 'Size', value: m.direction === 'NONE' && m.amount.isZero() ? '(nothing — not zero)' : dec(m.amount) },
        { label: 'Direction', value: m.direction === 'IN' ? 'IN — money arrived' : m.direction === 'OUT' ? 'OUT — money left' : 'NONE' },
      ];
    },
  },

  {
    id: 'decimal', title: 'Exact arithmetic — the reason totals close',
    engine: 'DEC (the decimal type under every money figure)',
    what: 'Ordinary computer math says 0.1 + 0.2 = 0.30000000000000004, and that dust is how a real mismatch hides inside a tolerance. This adds YOUR numbers exactly.',
    fields: [
      { key: 'nums', label: 'Numbers to sum (comma-separated)', type: 'textarea', wide: true,
        default: '139.49, 9.46, 9.75, 10.14, 525.76, 294.41, 204.31' },
    ],
    compute(v) {
      const ds = list(v.nums).map((s) => Dec.parse(s)).filter((d): d is Dec => d != null);
      const floatSum = list(v.nums).map(Number).filter(Number.isFinite).reduce((t, n) => t + n, 0);
      return [
        { label: 'Exact sum', value: dec(Dec.sum(ds)), good: true },
        { label: 'Ordinary float sum', value: String(floatSum), note: 'what the app used to accumulate' },
        { label: 'For the record', value: '0.1 + 0.2 = ' + Dec.of('0.1').add(Dec.of('0.2')).toString() + ' exactly here; 0.30000000000000004 in float' },
      ];
    },
  },

  {
    id: 'class', title: 'What is this holding? Name first, tag last',
    engine: 'CLASSIFY_HOLDING (B7 — one classifier, every road)',
    what: 'The institution’s own words outrank the broker’s type tag. Your own answer outranks everything. A class change between syncs keeps the previous class and flags it — money never moves quietly.',
    fields: [
      { key: 'name', label: 'The security’s name, as the institution wrote it', type: 'text', wide: true, default: 'VANGUARD FEDERAL MONEY MARKET INVESTOR CL' },
      { key: 'ticker', label: 'Ticker', type: 'text', default: 'VMFXX' },
      { key: 'tag', label: 'Broker type tag', type: 'select', default: '',
        options: [ { value: '', label: '(none sent)' }, { value: 'cs', label: 'cs — common stock' }, { value: 'et', label: 'et — ETF' }, { value: 'oef', label: 'oef — mutual fund' }, { value: 'bnd', label: 'bnd — bond' }, { value: 'cd', label: 'cd — CD' }, { value: 'crypto', label: 'crypto' } ] },
      { key: 'cashEq', label: 'Broker flags it cash-equivalent', type: 'checkbox', default: true },
      { key: 'maturity', label: 'Maturity date (if any)', type: 'text', default: '' },
      { key: 'prev', label: 'Class after the LAST sync', type: 'select', default: '',
        options: [ { value: '', label: '(first sync)' }, { value: 'cash', label: 'Cash' }, { value: 'stocks_etf', label: 'Stocks / Funds' }, { value: 'bonds', label: 'Bonds & CDs' }, { value: 'alternatives', label: 'Alternatives' } ] },
      { key: 'user', label: 'The person’s own answer', type: 'select', default: '',
        options: [ { value: '', label: '(none given)' }, { value: 'cash', label: 'Cash' }, { value: 'stocks_etf', label: 'Stocks / Funds' }, { value: 'bonds', label: 'Bonds & CDs' }, { value: 'alternatives', label: 'Alternatives' } ] },
    ],
    compute(v) {
      const r = classifyHoldingClass({ name: v.name, ticker: v.ticker, brokerTag: v.tag || null,
        cashEquivalent: !!v.cashEq, maturityDate: v.maturity || null, hasSecurityIdentity: !!(v.ticker || v.name),
        previousClass: (v.prev || null) as HoldingClass | null, userAnswer: (v.user || null) as HoldingClass | null });
      const words: Record<string, string> = { cash: 'Cash', stocks_etf: 'Stocks / Funds', bonds: 'Bonds & CDs', alternatives: 'Alternatives' };
      const out: ResultRow[] = [
        { label: 'Class', value: words[r.cls] },
        { label: 'Decided by', value: r.source, note: r.why },
      ];
      if (r.flagged) out.push({ label: 'FLAGGED', value: `kept ${words[r.flagged.was]}, evidence says ${words[r.flagged.evidenceSays]}`, note: 'money never moves class quietly — this asks for your confirmation', bad: true });
      return out;
    },
  },

  {
    id: 'return', title: 'The return on your money, or an honest refusal',
    engine: 'MONEY_WEIGHTED_RETURN (D3 window rules · D4 thresholds)',
    what: 'Modified Dietz: each flow weighted by how long it was at work. Both boundary days inside the window; the beginning is the close of the day before. When timing would drive the answer, the rate REFUSES and says why — the dollar walk is the honest figure then.',
    fields: [
      { key: 'beginning', label: 'Beginning value (close of the day before the start)', type: 'number', default: 100000 },
      { key: 'ending', label: 'Ending value', type: 'number', default: 104500 },
      { key: 'start', label: 'Window start (YYYY-MM-DD)', type: 'text', default: '2026-07-01' },
      { key: 'end', label: 'Window end', type: 'text', default: '2026-07-31' },
      { key: 'flows', label: 'External flows — one per line: date | amount (+ in, − out; date blank if unknown)', type: 'textarea', wide: true, default: '2026-07-10 | 500' },
    ],
    compute(v) {
      const flows: ExternalFlow[] = String(v.flows ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const p = l.split('|').map((s) => s.trim());
        const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(p[0]);
        return { date: hasDate ? p[0] : null, amount: Dec.parse(hasDate ? p[1] : p[0]) ?? Dec.ZERO };
      });
      const w = windowBounds(v.start, v.end);
      const r = moneyWeightedReturn({ beginning: Dec.parse(v.beginning) ?? Dec.ZERO, ending: Dec.parse(v.ending) ?? Dec.ZERO, flows, start: v.start, end: v.end });
      const out: ResultRow[] = [
        { label: 'Window', value: `${w.days} days, beginning measured at the close of ${w.beginningAsOf}` },
        r.rate == null
          ? { label: 'Return', value: 'REFUSED — ' + (r.refused ?? ''), note: r.sentence, bad: true }
          : { label: 'Return', value: pctTxt(r.rate, 2), note: r.sentence, good: true },
      ];
      if (r.band) out.push({ label: 'Timing sensitivity', value: `${pctTxt(r.band.allAtStart, 2)} if every flow were at the start · ${pctTxt(r.band.allAtEnd, 2)} if at the end`, note: `band width ${pctTxt(r.band.width, 2)} — refused when it exceeds 20% of the figure or 1 point, whichever is tighter` });
      return out;
    },
  },

  {
    id: 'capgains', title: 'Long-term or short-term — the day-precise line',
    engine: 'HOLDING_CAP_GAINS (E7: fixed 2026-08-20)',
    what: 'Long-term begins the day AFTER the one-year anniversary; the anniversary itself is still short. The old rule counted calendar months and read 335 days as long-term — always the lower tax.',
    fields: [
      { key: 'lots', label: 'Lots — one per line: shares | cost per share | purchase date', type: 'textarea', wide: true,
        default: '100 | 100 | 2025-01-31\n50 | 120 | 2024-06-01' },
      { key: 'price', label: 'Today’s price', type: 'number', default: 150 },
      { key: 'asof', label: 'As of (YYYY-MM-DD)', type: 'text', default: '2026-01-01' },
    ],
    compute(v) {
      const lots = String(v.lots ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => {
        const p = l.split('|').map((s) => s.trim());
        return { lot_id: `l${i}`, shares: num(p[0]), cost_per_share: num(p[1]), purchase_date: p[2] ?? '' };
      });
      const pos = { position_id: 'bench', ticker: 'BENCH', lots } as unknown as Position;
      const g = capGains(pos, num(v.price), new Date(`${v.asof}T12:00:00`));
      return [
        { label: 'Long-term gain (held more than one year)', value: money(g.longGain) },
        { label: 'Short-term gain', value: money(g.shortGain) },
        { label: 'Total unrealised gain', value: money(g.totalGain) },
        { label: 'The rule', value: 'a lot with no cost is SKIPPED (never free shares); an unreadable date stays SHORT — the cautious side' },
      ];
    },
  },

  {
    id: 'tax', title: `Federal + state tax (${TAX_YEAR} tables)`,
    engine: 'TAX_OWED · TAX_DEDUCTION (E8 age · E9 real tables · E10 state on taxable)',
    what: 'Explicit statute tables per filing status — the married top threshold is $768,700, never “double the single”. The over-65 addition counts per person. The state rate applies to TAXABLE income, so the deduction is never taxed.',
    fields: [
      { key: 'gross', label: 'Gross income for the year', type: 'number', default: 100000 },
      { key: 'status', label: 'Filing status', type: 'select', default: 'single',
        options: [ { value: 'single', label: 'Single' }, { value: 'married', label: 'Married filing jointly' }, { value: 'hoh', label: 'Head of household' } ] },
      { key: 'state', label: 'State rate (%)', type: 'number', default: 5 },
      { key: 'over65', label: 'People 65 or older on the return (0–2)', type: 'number', default: 0 },
    ],
    compute(v) {
      const st = v.status as FilingStatus; const sr = num(v.state) / 100; const o65 = Math.min(2, Math.max(0, Math.round(num(v.over65))));
      const ded = deductionFor(st, o65); const ti = taxableIncomeFor(num(v.gross), st, o65);
      const total = taxOwedFor(num(v.gross), st, sr, o65); const fed = taxOwedFor(num(v.gross), st, 0, o65);
      return [
        { label: 'Standard deduction', value: money(ded), note: o65 ? `includes the over-65 addition for ${o65}` : undefined },
        { label: 'Taxable income', value: money(ti) },
        { label: 'Federal tax', value: money(fed) },
        { label: 'State tax', value: money(total - fed), note: 'on taxable income — the deduction is never taxed' },
        { label: 'Total, and the effective rate', value: `${money(total)} · ${pctTxt(effectiveRateOnGrossFor(num(v.gross), st, sr, o65))} of gross` },
        { label: 'Marginal bracket', value: pctTxt(marginalBracketFor(num(v.gross), st, o65), 0), note: `long-term capital-gains rate at this income: ${pctTxt(ltcgRateFor(num(v.gross), st, o65), 0)} federal` },
      ];
    },
  },

  {
    id: 'ss', title: 'Social Security — your own full retirement age',
    engine: 'SS_FULL_RETIREMENT_AGE · SS_CLAIM_FACTOR · SS_BENEFIT_AT_AGE (B2)',
    what: 'The statement amount is the check at YOUR full retirement age (66–67 by birth year), and every claim age pays a month-precise fraction of it.',
    fields: [
      { key: 'birth', label: 'Birth year', type: 'number', default: 1957 },
      { key: 'stmt', label: 'Statement amount (monthly, at your full retirement age)', type: 'number', default: 2600 },
      { key: 'claim', label: 'Claim age', type: 'number', default: 67 },
      { key: 'liveTo', label: 'Live-to age (for the lifetime total)', type: 'number', default: 90 },
    ],
    compute(v) {
      const by = num(v.birth) || null;
      const out: ResultRow[] = [
        { label: 'Your full retirement age', value: fraLabel(by), note: `factor at claim age ${num(v.claim)}: ${(ssClaimFactorFor(num(v.claim), by) * 100).toFixed(1)}% of the statement amount` },
        { label: `Monthly check claiming at ${num(v.claim)}`, value: money(ssBenefitAt(num(v.stmt), num(v.claim), by)) + '/mo' },
        { label: `Collected by ${num(v.liveTo)}`, value: money(ssLifetimeTotal(num(v.stmt), num(v.claim), num(v.liveTo), by)) },
      ];
      for (const age of [62, 67, 70]) {
        out.push({ label: `…claiming at ${age}`, value: `${money(ssBenefitAt(num(v.stmt), age, by))}/mo · ${money(ssLifetimeTotal(num(v.stmt), age, num(v.liveTo), by))} by ${num(v.liveTo)}` });
      }
      return out;
    },
  },

  {
    id: 'rmd', title: 'Required withdrawals — one dated table',
    engine: 'RMD_START_AGE · RMD_DIVISOR (B4: birth-year rule, SECURE 2.0)',
    what: 'The start age follows the birth year: 73 born 1951–1959, 75 born 1960 or later. Roth money is exempt by construction. Divisors are the IRS Uniform Lifetime table.',
    fields: [
      { key: 'birth', label: 'Birth year', type: 'number', default: 1956 },
      { key: 'age', label: 'Age to check', type: 'number', default: 75 },
      { key: 'pretax', label: 'Pre-tax balance (401(k), traditional IRA)', type: 'number', default: 600000 },
    ],
    compute(v) {
      const by = num(v.birth); const age = num(v.age);
      const start = rmdStartAge(by); const d = rmdDivisor(age, by);
      return [
        { label: 'Your required withdrawals start at', value: String(start) },
        d > 0
          ? { label: `At age ${age}`, value: `${money(Math.round(num(v.pretax) / d))} required this year`, note: `pre-tax balance ÷ ${d} (the IRS life-expectancy divisor at ${age})` }
          : { label: `At age ${age}`, value: 'nothing required yet', good: true },
        { label: 'Roth money', value: 'exempt — a Roth IRA has no lifetime requirement, and Roth 401(k)s are exempt from 2024' },
      ];
    },
  },

  {
    id: 'plan', title: 'Will the money last? The odds, live',
    engine: 'WILL_IT_LAST (B1 streams · B5 outside money only · B6 calibration)',
    what: '1,000 simulated futures. Social Security rises with inflation from its claim age; the pension stays flat (B1 — inflating a flat pension for 30 years roughly doubles it, the old engine’s largest error). The displayed odds round to the nearest 5.',
    fields: [
      { key: 'age', label: 'Age today', type: 'number', default: 60 },
      { key: 'retire', label: 'Retire at', type: 'number', default: 67 },
      { key: 'horizon', label: 'Plan to age', type: 'number', default: 92 },
      { key: 'balance', label: 'Retirement savings today', type: 'number', default: 600000 },
      { key: 'contrib', label: 'Saving per year until retirement', type: 'number', default: 24000 },
      { key: 'spend', label: 'Retirement spending (monthly, today’s dollars)', type: 'number', default: 6000 },
      { key: 'ssMonthly', label: 'Social Security (monthly, today’s dollars)', type: 'number', default: 2600 },
      { key: 'ssClaim', label: 'Claimed from age', type: 'number', default: 67 },
      { key: 'pension', label: 'Pension (monthly, FLAT — does not rise)', type: 'number', default: 0 },
      { key: 'inflation', label: 'Inflation (%)', type: 'number', default: 2.5 },
      { key: 'ret', label: 'Expected return (%)', type: 'number', default: 6 },
      { key: 'vol', label: 'Volatility (%)', type: 'number', default: 10 },
    ],
    compute(v) {
      const inp: RetirementInputs = {
        current_age: num(v.age), retire_age: Math.max(num(v.age) + (num(v.retire) > num(v.age) ? 0 : 1), num(v.retire)),
        horizon_age: Math.max(num(v.horizon), num(v.retire) + 1),
        start_balance: num(v.balance), annual_contribution: num(v.contrib),
        retire_monthly_spend_today: num(v.spend),
        guaranteed_monthly_income: num(v.ssMonthly) + num(v.pension),
        guaranteed_start_age: num(v.ssClaim),
        guaranteed_streams: [
          ...(num(v.ssMonthly) > 0 ? [{ kind: 'ss' as const, monthly: num(v.ssMonthly), inflates: true, start_age: num(v.ssClaim) }] : []),
          ...(num(v.pension) > 0 ? [{ kind: 'pension' as const, monthly: num(v.pension), inflates: false }] : []),
        ],
        inflation: num(v.inflation) / 100, mean_return: num(v.ret) / 100, vol_return: num(v.vol) / 100,
        paths: 1000, seed: 42, now_year: new Date().getFullYear(),
      };
      const s = simulate(inp);
      const p = projectNestEgg(inp);
      const shown = Math.min(100, Math.max(0, Math.round(s.chance_of_success / 5) * 5));
      const guarded = shown === 100 && s.chance_of_success < 99.5 ? 95 : shown === 0 && s.chance_of_success > 0.5 ? 5 : shown;
      const exact = s.chance_of_success;
      const lasted = Math.round(exact * 10);          // of 1,000 futures
      const oddsNote =
        exact === 100 ? `the money lasted in every one of the 1,000 simulated futures — this 100 is literal, not rounding`
        : exact === 0 ? `the money ran out before age ${inp.horizon_age} in every one of the 1,000 simulated futures — this 0 is literal, not rounding; spending is bigger than the pot and its income can carry`
        : guarded !== shown ? `it lasted in ${lasted.toLocaleString()} of 1,000 futures (${exact}%). Shown as ${guarded} rather than ${shown}, because ${shown === 100 ? '100 would claim every future worked' : '0 would claim every future failed'} — and ${shown === 100 ? (1000 - lasted).toLocaleString() + ' of them didn’t work' : lasted.toLocaleString() + ' of them did work'}`
        : `it lasted in ${lasted.toLocaleString()} of 1,000 futures (${exact}%). Shown to the nearest 5: a different random 1,000 futures could land a couple of points higher or lower, so the exact digit is luck, not knowledge`;
      return [
        { label: 'The odds it lasts', value: `${guarded}%`, note: oddsNote, good: guarded >= 80, bad: guarded < 60 },
        { label: 'Projected at retirement', value: money(s.projected_at_retirement) },
        { label: 'Deterministic check (no market swings)', value: `will have ${money(p.will_have)} · will need ${money(p.will_need)}` },
        ...(s.gap > 0 ? [{ label: 'To close the gap', value: `about ${money(s.suggested_extra_monthly)}/mo more`, note: 'the 4%-rule framing on net spending' }] : []),
        { label: 'What is NOT in the guaranteed income', value: 'your own withdrawals and required minimum distributions — the simulation computes those; typing them in would let the pot fund itself (B5)' },
      ];
    },
  },

  {
    id: 'classifyfile', title: 'A whole holdings file, classified line by line',
    engine: 'CLASSIFY_HOLDING (B7) · RECONCILE_ACCOUNT_TOTAL',
    what: 'Drop any holdings download — or type made-up lines — and watch every line land in its class by the ONE classifier: the institution’s words first, never a guess. Then the class totals, exactly, and the check against a stated total if you give one.',
    fields: [
      { key: 'rows', label: 'Holdings — one per line: symbol | name | value', type: 'textarea', wide: true,
        default: 'VMFXX | VANGUARD FEDERAL MONEY MARKET INVESTOR CL | 837.94\n912797VW4 | U S TREASURY BILL 0 11/10/26 07/14/26 | 225019.43\nSNDL | SNDL INC | 4410\nGLD | SPDR GOLD SHARES | 12000\nZZZZ | SOMETHING I MADE UP | 5000' },
      { key: 'stated', label: 'The broker’s stated total (optional — leave 0 to skip the check)', type: 'number', default: 0 },
    ],
    fileDrop: {
      label: 'Drop ANY downloaded file here (CSV) — or click to choose',
      hint: 'Holdings or activity, any institution — an activity file routes to the ledger card automatically. Edit the parsed lines freely afterward.',
      apply: (t, f) => routeFile(t, f, parseHoldingsFile, parseActivityFile, 'ledger', 'activity', 'The ledger'),
    },
    compute(v) {
      const parsed = rows3(v.rows);
      const words: Record<string, string> = { cash: 'Cash', stocks_etf: 'Stocks / Funds', bonds: 'Bonds & CDs', alternatives: 'Alternatives' };
      const totals: Record<string, Dec> = { cash: Dec.ZERO, stocks_etf: Dec.ZERO, bonds: Dec.ZERO, alternatives: Dec.ZERO };
      const out: ResultRow[] = [];
      const lines: ResultRow[] = [];
      for (const r of parsed) {
        const verdict = classifyHoldingClass({ ticker: r.a, name: r.b, hasSecurityIdentity: !!(r.a || r.b) });
        const val = Dec.parse(r.c) ?? Dec.ZERO;
        totals[verdict.cls] = totals[verdict.cls].add(val);
        lines.push({ label: `${r.a || '—'} · ${r.b || '(no name)'}`, value: `${words[verdict.cls]} · ${dec(val)}`, note: `${verdict.source}: ${verdict.why}` });
      }
      const sum = Dec.sum(Object.values(totals));
      for (const k of ['cash', 'stocks_etf', 'bonds', 'alternatives']) {
        if (!totals[k].isZero()) out.push({ label: words[k], value: dec(totals[k]) });
      }
      out.push({ label: 'Everything summed, exactly', value: dec(sum) });
      const stated = Dec.parse(v.stated);
      if (stated != null && !stated.isZero()) {
        const rr = reconcileAccountTotal(parsed.map((r) => r.c), 0, v.stated);
        out.push({ label: 'Against the stated total', value: rr.ok ? 'MATCHES to the cent' : `differs by ${dec(rr.difference)}`, good: rr.ok, bad: !rr.ok, note: rr.sentence });
      }
      return [...out, ...lines.slice(0, 60)];
    },
  },

  {
    id: 'importkey', title: 'Why importing twice never doubles money',
    engine: 'IMPORT_KEY (Track 1 step 2)',
    what: 'A row’s identity is everything that makes it THAT row — never the source’s own id, which changes when brokers reprocess history. Same fields → same identity → the second import is ignored.',
    fields: [
      { key: 'date', label: 'Date', type: 'text', default: '2026-07-31' },
      { key: 'word', label: 'The institution’s word', type: 'text', default: 'Dividend' },
      { key: 'amount', label: 'Amount', type: 'number', default: 139.49 },
      { key: 'desc', label: 'Description', type: 'text', default: 'Dividend Received' },
      { key: 'desc2', label: 'A second row’s description (everything else the same)', type: 'text', default: 'Dividend Received' },
    ],
    compute(v) {
      const k1 = importKey({ account: 'acct', date: v.date, word: v.word, amount: v.amount, description: v.desc });
      const k2 = importKey({ account: 'acct', date: v.date, word: v.word, amount: v.amount, description: v.desc2 });
      const same = k1 === k2;
      return [
        { label: 'Row 1 identity', value: k1 },
        { label: 'Row 2 identity', value: k2 },
        { label: 'Verdict', value: same ? 'SAME row — the second import is ignored, money cannot double' : 'DIFFERENT rows — both land (two real fills can share a day and an amount; the description separates them)', good: same },
      ];
    },
  },
];

// browser attach — the renderer in the HTML shell reads window.BENCH
declare const window: any;
if (typeof window !== 'undefined') window.BENCH = { CARDS };
