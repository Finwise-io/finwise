// ENGINE — turning one institution row into one ledger row.
//
// This is the bridge the app crosses. The engines above decide WHAT an event is and WHICH WAY the
// money went; this decides what gets written down, and it is where the two old defects were.
//
// It keeps the app's existing row shape so nothing downstream has to change at once, and adds two
// fields that carry the new truth:
//   · `event`     — the canonical event, so a screen never has to re-derive it from a type name
//   · `signed`    — the amount WITH its direction, so no sum has to guess
//
// THE UNCLASSIFIED RULE. A row we cannot name is written down with type 'ADJUSTMENT', which the
// app's own comment already defines as "a visible history row — touches NOTHING". That is exactly
// the behaviour an unknown word needs, and it means an unrecognised broker word can never again
// reach contributions the way it did on the founder's account.
import { classifyEvent, EVENTS, type CanonicalEvent } from './events';
import { readMoney, signed, type SignConvention, type Money } from './money';
import { Dec } from './decimal';

/** The app's existing transaction vocabulary, kept so screens keep working during the migration. */
export type LegacyTxnType =
  | 'OPENING_POSITION' | 'OPENING_CASH' | 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL'
  | 'TRANSFER' | 'TRANSFER_IN_KIND' | 'DIVIDEND' | 'INTEREST' | 'COUPON' | 'FEE' | 'ADJUSTMENT';

/** Canonical event → the app's existing type. ADJUSTMENT is the honest home for anything that must
 *  be visible but must touch no total: unknown words, sweeps, internal journals, expiries. */
const TO_LEGACY: Record<CanonicalEvent, LegacyTxnType> = {
  CASH_IN: 'DEPOSIT',
  CASH_OUT: 'WITHDRAWAL',
  SECURITIES_IN: 'TRANSFER_IN_KIND',
  SECURITIES_OUT: 'TRANSFER_IN_KIND',
  BUY: 'BUY',
  SELL: 'SELL',
  DIVIDEND: 'DIVIDEND',
  CAPITAL_GAIN_DISTRIBUTION: 'DIVIDEND',
  INTEREST: 'INTEREST',
  REINVEST_PURCHASE: 'BUY',          // it IS a purchase; the income was booked on its own row
  RETURN_OF_CAPITAL: 'SELL',         // your own principal coming back, never new money
  SWEEP: 'ADJUSTMENT',               // visible, touches nothing
  INTERNAL_TRANSFER: 'TRANSFER',
  FEE: 'FEE',
  TAX_WITHHELD: 'FEE',
  MARGIN_INTEREST: 'FEE',
  CORPORATE_ACTION: 'ADJUSTMENT',
  OPTION_EXERCISE: 'ADJUSTMENT',
  OPTION_EXPIRY: 'ADJUSTMENT',
  UNKNOWN: 'ADJUSTMENT',             // THE RULE: kept, shown, counted nowhere
};

export interface RawActivity {
  word: string | null | undefined;      // the institution's own word for the event
  amount: number | string | null | undefined;
  units?: number | string | null;
  price?: number | string | null;
  date?: string | null;
  ticker?: string | null;
  description?: string | null;
  /** True when the row is an OPTION trade. Some brokers say so in a separate field rather than in
   *  the word, and the distinction is worth keeping on the row: an option's units are CONTRACTS. */
  isOption?: boolean;
}

/** A short phrase saying what this row is, in words a person reads. Kept because these sentences do
 *  real work on screen — "redeemed at maturity" is how someone understands why money appeared
 *  without them paying anything in. */
const PLAIN_NOTE: Partial<Record<CanonicalEvent, string>> = {
  RETURN_OF_CAPITAL: 'redeemed at maturity',
  SWEEP: 'moved between this account\'s cash and its money-market fund — nothing entered or left',
  INTERNAL_TRANSFER: 'moved between your own accounts',
  REINVEST_PURCHASE: 'dividend reinvested — bought more shares',
  CORPORATE_ACTION: 'a change to the shares themselves, not to your money',
  OPTION_EXPIRY: 'option expired',
  OPTION_EXERCISE: 'option exercised',
  MARGIN_INTEREST: 'interest charged on margin',
  TAX_WITHHELD: 'tax withheld',
};

export interface LedgerRow {
  type: LegacyTxnType;
  /** The canonical event — the field new code should read. */
  event: CanonicalEvent;
  /** Size only, EXACT, matching the app's existing positive-amount convention. */
  amount: Dec;
  /** The amount WITH direction: IN positive, OUT negative — EXACT. Sums use this. */
  signedAmount: Dec;
  direction: Money['direction'];
  shares?: number;
  price?: number;
  date?: string;
  ticker?: string;
  reinvested?: boolean;
  /** The institution's own word, always kept — so an unknown can be shown and chased. */
  sourceWord: string;
  /** True when this row carries no money and no unit change — a marker the caller may drop. */
  isEmptyMarker: boolean;
  recognised: boolean;
  note?: string;
}

/**
 * Read one institution row into one ledger row.
 *
 * A CASH-SETTLED option exercise is the one case where a row we would otherwise treat as a marker
 * carries real money. The founder challenged this directly: "option could expire in the money".
 * So the rule here is: a skipped-type row with a non-zero amount keeps its money and stays visible.
 */
export function toLedgerRow(raw: RawActivity, convention: SignConvention): LedgerRow {
  const c = classifyEvent(raw.word);
  const money = readMoney(raw.amount, convention, c.rule.direction);
  const units = numberOrUndefined(raw.units);
  // Price normalisation must follow the LEDGER type, not the canonical event, because the
  // first-in-first-out matching downstream keys on buys and sells. A maturity payout is a SELL to
  // the ledger even though its canonical name is RETURN_OF_CAPITAL, and without a price it drops
  // out of realised-gain matching entirely — caught by the bond test, which went to zero.
  const legacy = TO_LEGACY[c.event];
  const isTrade = legacy === 'BUY' || legacy === 'SELL';

  // On a trade the broker's own cash figure is the truth; normalise price so shares × price equals
  // it exactly. This one rule covers options priced per contract and bonds priced per $100 of face.
  //
  // PRICE IS NOT MONEY AND MUST NOT BE ROUNDED TO CENTS. Caught by this engine's own test: a
  // Treasury bill bought for $224,454.11 against 227,000 of face works out at $0.9888 per unit of
  // face. Rounded to $0.99 and multiplied back, it comes to $224,730 — $276 of invented gain on one
  // row. Money rounds to the cent because money IS cents; a price is a ratio and keeps its precision.
  const price = isTrade && !money.amount.isZero() && units
    ? money.amount.divRound(Dec.of(String(Math.abs(units)))).toNumber(8)
    : numberOrUndefined(raw.price);

  const optionWord = raw.isOption
    ? (c.event === 'BUY' ? 'option purchase' : c.event === 'SELL' ? 'option sale' : undefined)
    : undefined;

  return {
    type: TO_LEGACY[c.event],
    event: c.event,
    amount: money.amount,
    signedAmount: signed(money),
    direction: money.direction,
    shares: units != null ? Math.abs(units) : undefined,
    price,
    date: raw.date ? String(raw.date).slice(0, 10) : undefined,
    ticker: raw.ticker ? String(raw.ticker).toUpperCase() : undefined,
    reinvested: c.event === 'REINVEST_PURCHASE' ? true : undefined,
    sourceWord: c.word,
    recognised: c.recognised,
    // A zero-amount, zero-unit marker carries nothing. The caller decides whether to keep it; what
    // matters is that a row carrying MONEY is never silently dropped, which was the founder's
    // option challenge — a cash-settled exercise has its proceeds on this very row.
    isEmptyMarker: money.amount.isZero() && !units &&
      (c.event === 'OPTION_EXPIRY' || c.event === 'OPTION_EXERCISE'),
    note: c.recognised
      ? [optionWord ?? PLAIN_NOTE[c.event], raw.description].filter(Boolean).join(' · ') || undefined
      : `We could not classify "${c.word}" — this row is shown but counted in no total.`,
  };
}

/** Which rows a given total may read. The ONLY place a screen should ask. */
// ── PERSONAL FLOWS — the stored ledger summed through ONE table (Track 1 step 3) ───────────────
// Screens used to re-derive these inline with Math.abs on every amount, which is the $2,387 class
// again: a reversal ADDS instead of cancelling. This is the single place the app's stored rows
// (legacy TxnType vocabulary) become walk totals — exact decimals, signs respected, and any type
// not in the table counts in NOTHING (the UNKNOWN rule, applied to the store).
const STORED_TYPE_BUCKET: Record<string, 'contributions' | 'withdrawals' | 'dividends' | 'interest' | 'fees' | 'debtPrincipal' | 'none'> = {
  DEPOSIT: 'contributions',
  WITHDRAWAL: 'withdrawals',
  DIVIDEND: 'dividends',           // reinvested or cash — income earned counts ONCE either way
  INTEREST: 'interest',
  COUPON: 'interest',
  FEE: 'fees',
  DEBT_PAYMENT: 'debtPrincipal',
  // internal moves, baseline captures and markers reach no flow total, by design:
  BUY: 'none', SELL: 'none', TRANSFER: 'none', TRANSFER_IN_KIND: 'none',
  OPENING_POSITION: 'none', OPENING_CASH: 'none', ADJUSTMENT: 'none',
};
export interface StoredFlowRow { type?: string | null; amount?: number | string | null }
export interface PersonalFlowTotals {
  contributions: Dec; withdrawals: Dec; dividends: Dec; interest: Dec; fees: Dec; debtPrincipal: Dec;
}
export function personalFlowTotals(rows: StoredFlowRow[]): PersonalFlowTotals {
  const t: PersonalFlowTotals = {
    contributions: Dec.ZERO, withdrawals: Dec.ZERO, dividends: Dec.ZERO,
    interest: Dec.ZERO, fees: Dec.ZERO, debtPrincipal: Dec.ZERO,
  };
  for (const r of rows ?? []) {
    const bucket = STORED_TYPE_BUCKET[String(r.type ?? '')] ?? 'none';
    if (bucket === 'none') continue;
    const d = Dec.parse(r.amount);
    if (d == null) continue;                      // no amount is NOTHING, never zero-with-meaning
    t[bucket] = t[bucket].add(d);                 // signed: a stored reversal cancels, never adds
  }
  return t;
}

// ── THE IMPORT KEY — one identity per imported row, owned here, shared by every road ───────────
// (Track 1 step 2, founder brief 2026-08-20 §F.) Re-importing an overlapping window can never
// double money: a row's identity is the composite of everything that makes it THAT row — never the
// source's own id. SnapTrade reprocesses history and its ids churn; a downloaded file carries no
// ids at all. The description separates two otherwise-identical same-day fills — the one field
// that differs. Every road (SnapTrade today, the QFX/CSV import door next) maps its own fields
// into this ONE mechanism; no road invents a second identity (rule R8: one mechanism per shape).
export interface ImportIdentity {
  account: string;                       // OUR account id — the same dividend in two accounts is two rows
  date?: string | null;
  word?: string | null;                  // the institution's own word for the event
  amount?: number | string | null;
  units?: number | string | null;
  security?: string | null;              // the road's most stable security identifier
  ref?: string | null;                   // an external reference id, where the road carries one
  description?: string | null;
}
export function importKey(id: ImportIdentity): string {
  return [
    id.account,
    id.date ?? '',
    (id.word ?? '').toUpperCase(),
    id.amount ?? '',
    id.units ?? '',
    id.security ?? '',
    id.ref ?? '',
    id.description ?? '',
  ].join('|');
}

export function rowsFor(
  rows: LedgerRow[],
  total: 'contributions' | 'withdrawals' | 'income' | 'costs',
): LedgerRow[] {
  return rows.filter((r) => EVENTS[r.event].totals.includes(total));
}

/** A total, summed SIGNED and EXACT — a reversal reduces its total instead of inflating it.
 *  (Audit item 36: the absolute-value sum here was the $2,387 class rebuilt; now the sign carries.) */
export function totalOf(rows: LedgerRow[], total: 'contributions' | 'withdrawals' | 'income' | 'costs'): Dec {
  return Dec.sum(rowsFor(rows, total).map((r) => r.signedAmount));
}

/** Everything we could not name, for the honest line on screen: "12 entries we could not classify". */
export function unclassified(rows: LedgerRow[]): LedgerRow[] {
  return rows.filter((r) => !r.recognised);
}

const numberOrUndefined = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : v == null ? NaN : parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const round8 = (n: number) => Math.round(n * 1e8) / 1e8;
