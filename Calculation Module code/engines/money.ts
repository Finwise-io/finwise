// ENGINE — money that remembers which way it went.
//
// THE DEFECT THIS REPLACES. The app stores `Math.abs(amount)` when a transaction is imported, so the
// minus sign is destroyed the moment the line arrives, and the screen sums absolutes again. A
// payment and its matching reversal therefore both add. That is why the founder's screen showed
// $2,387 of interest against $1,193 actually received: his money-market income arrives as a PAIR —
// the credit, and the reinvestment debit that nets to zero — and both legs were counted.
//
// THE RULE, taken from the FDX standard rather than invented: direction lives in its OWN field.
// FDX carries `debitCreditMemo` precisely "because the transaction amount is an absolute value".
// A provider that signs its numbers and a provider that does not both map onto this cleanly, and no
// screen ever has to remember which way a particular number runs.
//
// TRACK 0 (founder brief 2026-08-20, B8): amounts are EXACT DECIMALS end to end. The size is a Dec,
// sums are exact, and a number leaves this module only at the display edge, rounded once (R6).
import { Dec } from './decimal';

/** Money that has come out of the bank teller's mouth as a direction, not as a sign. */
export interface Money {
  /** Always non-negative, EXACT. The size of the movement. */
  amount: Dec;
  /** IN = money entered the account. OUT = money left it. NONE = a note with no money attached. */
  direction: 'IN' | 'OUT' | 'NONE';
}

/** How a source signs its amounts. Getting this backwards is a sign error on every row, so each
 *  road declares it once, here, rather than being guessed at per call site. */
export type SignConvention =
  | 'NEGATIVE_IS_OUT'   // the ordinary reading: −100 means $100 left. Vanguard files, SnapTrade.
  | 'POSITIVE_IS_OUT'   // FDX/Plaid Core Exchange: a DEBIT is money leaving, exposed POSITIVE.
  | 'ALWAYS_POSITIVE';  // the size only; direction must come from somewhere else.

/** Read a raw amount into a Money, given how that source signs things.
 *  `stated` is an explicit direction where the source provides one (FDX debitCreditMemo, or our
 *  own event table) — it always wins, because a stated fact beats an inferred one. */
export function readMoney(
  raw: number | string | null | undefined,
  convention: SignConvention,
  stated?: 'IN' | 'OUT' | 'NONE',
): Money {
  const d = Dec.parse(raw);
  if (d == null) return { amount: Dec.ZERO, direction: 'NONE' };
  if (d.isZero()) return { amount: Dec.ZERO, direction: 'NONE' };
  // AUDIT ITEM 36 — the stated direction does NOT override a contradicting sign any more. A −$500
  // row whose event says IN is a REVERSAL of that event, and flipping its sign is how a credit and
  // its cancellation both added. The sign always keeps its meaning; the stated direction applies
  // only when the source carries no sign of its own.
  const negativeMeansOut = convention !== 'POSITIVE_IS_OUT';
  if (convention === 'ALWAYS_POSITIVE') {
    return { amount: d.abs(), direction: stated ?? 'NONE' };
  }
  const out = negativeMeansOut ? d.isNeg() : !d.isNeg();
  return { amount: d.abs(), direction: out ? 'OUT' : 'IN' };
}

/** The signed value, for arithmetic. IN is positive, OUT is negative, everywhere in the app.
 *  One convention, chosen once, so no screen has to remember which way this number runs. */
export function signed(m: Money): Dec {
  return m.direction === 'OUT' ? m.amount.neg() : m.direction === 'IN' ? m.amount : Dec.ZERO;
}

/** Add money SIGNED and EXACTLY — a credit and its reversal cancel to true zero, so a
 *  reconciliation can assert equality rather than a tolerance. */
export function sumSigned(items: Money[]): Dec {
  return Dec.sum(items.map(signed));
}

/** Institution files write money as text: "$8,502.00 ", "($0.53)", "--", "1,234.56".
 *  Parentheses mean NEGATIVE — the accounting convention, and a real trap: read as a positive it
 *  flips the sign of every loss in a Fidelity export. */
/** DISPLAY-EDGE ONLY. Old call sites that still need a float get one, rounded once. New code holds
 *  Dec all the way and never calls this in a sum. */
export function toNumber(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let t = String(raw).trim();
  if (!t || t === '--' || t === '-' || t === 'n/a' || t === 'N/A') return null;
  const parenthesised = /^\(.*\)$/.test(t);
  if (parenthesised) t = t.slice(1, -1);
  t = t.replace(/[$,\s]/g, '').replace(/%$/, '');
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return parenthesised ? -Math.abs(n) : n;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;
