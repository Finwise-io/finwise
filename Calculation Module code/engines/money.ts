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
/* ─ MK-ST-F-018 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * readMoney
 *
 * Answers ..... Read a raw amount into a Money, given how that source signs things.
 *
 * Formula .....
 *     d = dec.parse(raw)
 *     amount = dec.ZERO
 *     direction = 'NONE'   when d = nothing
 *     amount = dec.ZERO
 *     direction = 'NONE'   when is zero()
 *     negative means out = convention ! = 'POSITIVE_IS_OUT'
 *     the answer:
 *     amount = abs()
 *     direction = stated (or 'NONE' when missing)
 *     out = is neg()   if negative means out
 *     !is neg()   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-018
 * Changed ..... 2026-08-20 (ae39c4e)
 */
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
/* ─ MK-ST-F-019 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * signed
 *
 * Answers ..... The signed value, for arithmetic.
 *
 * Formula .....
 *     amount.neg()   if direction = 'OUT'
 *     amount   if direction = 'IN'
 *     dec.ZERO   otherwise   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow · MK-ST-F-020 sumSigned
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-ST-F-020 sumSigned
 *               MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-019
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function signed(m: Money): Dec {
  return m.direction === 'OUT' ? m.amount.neg() : m.direction === 'IN' ? m.amount : Dec.ZERO;
}

/** Add money SIGNED and EXACTLY — a credit and its reversal cancel to true zero, so a
 *  reconciliation can assert equality rather than a tolerance. */
/* ─ MK-ST-F-020 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * sumSigned
 *
 * Answers ..... Add money SIGNED and EXACTLY — a credit and its reversal cancel to true zero, so a reconciliation can assert equality rather than a tolerance.
 *
 * Formula .....
 *     dec.sum(items.map(signed))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-020
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function sumSigned(items: Money[]): Dec {
  return Dec.sum(items.map(signed));
}

/** Institution files write money as text: "$8,502.00 ", "($0.53)", "--", "1,234.56".
 *  Parentheses mean NEGATIVE — the accounting convention, and a real trap: read as a positive it
 *  flips the sign of every loss in a Fidelity export. */
/** DISPLAY-EDGE ONLY. Old call sites that still need a float get one, rounded once. New code holds
 *  Dec all the way and never calls this in a sum. */
/* ─ MK-ST-F-021 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * toNumber
 *
 * Answers ..... Institution files write money as text: "$8,502.00 ", "($0.53)", "--", "1,234.56".
 *
 * Formula .....
 *     nothing   when raw = nothing
 *     raw   if number.is finite(raw)
 *     nothing   otherwise   when raw is a number
 *     t = string(raw).trim()
 *     nothing   when t is missing (or t = '--' (or t = '-' (or t = 'n ÷ a' (or t = 'N ÷ A' when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     parenthesised = ÷ ^\(. × \)$ ÷ .test(t)
 *     nothing   when t is missing (or ! ÷ ^-?\d × \.?\d+$ ÷ .test(t) when missing or zero)
 *     n = parse float(t)
 *     nothing   when !number.is finite(n)
 *     the answer:
 *     -size of(n)   if parenthesised
 *     n   otherwise
 *
 * Called by ... MK-NW-O-002 theAccount · MK-NW-O-008 thePerformance
 *               MK-ST-F-012 toLedgerRow · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-XS-F-102 ingestSync
 *               MK-NW-O-002 theAccount · MK-NW-O-008 thePerformance
 *               MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-021
 * Changed ..... 2026-08-18 (bfea15e)
 */
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

/** Rounds a money figure to the cent — two decimals. */
/* ─ MK-ST-F-055 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * round2
 *
 * Answers ..... Rounds a money figure to the cent — two decimals.
 *
 * Formula .....
 *     round2(n) = round(n × 100) ÷ 100
 *
 * Called by ... MK-ST-F-044 setMoneyFormat · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to two decimals (cents).
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-055
 * Changed ..... 2026-08-18 (bfea15e)
 */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
