// ENGINE — the two reconciliation assertions (E11; Track 1 step 5, founder brief 2026-08-20).
//
// Both are EXACT. No tolerance, ever: with decimal arithmetic underneath (B8), a difference of one
// cent is a fact about the data, not noise — "a small mismatch can never be told apart from a real
// bug" is how the money-market double-count hid. A failed reconciliation is never an error to hide
// and never a number to force: it is a NAMED difference, kept and shown.
//
//   1 · THE POSITION STATEMENT: what the account holds (holdings at the broker's own marks, plus
//       the uninvested cash sleeve) must equal the broker's own stated total.
//   2 · THE ACTIVITY STATEMENT: beginning + contributions − withdrawals + income − costs
//       + market change = ending. Every term measured, the identity must close to the cent —
//       run against a golden statement, the terms must be the statement's own.
import { Dec } from './decimal';

export interface Reconciliation {
  /** True only when the difference is EXACTLY zero. */
  ok: boolean;
  computed: Dec;
  stated: Dec;
  /** computed − stated, exact. The number a screen shows when ok is false. */
  difference: Dec;
  /** The plain-English line for the person — never jargon, never a code. */
  sentence: string;
}

const verdict = (computed: Dec, stated: Dec, what: string): Reconciliation => {
  const difference = computed.sub(stated);
  return {
    ok: difference.isZero(),
    computed, stated, difference,
    sentence: difference.isZero()
      ? `${what} match to the cent.`
      : `${what} differ by $${difference.abs().round(2).toString()} — we show the difference rather than hide it.`,
  };
};

/** ASSERTION 1 — holdings + cash = the broker's stated total. */
export function reconcileAccountTotal(
  holdingValues: ReadonlyArray<unknown>,
  cashSleeve: unknown,
  statedTotal: unknown,
): Reconciliation {
  const parts = Dec.sum((holdingValues ?? []).map((v) => Dec.parse(v) ?? Dec.ZERO))
    .add(Dec.parse(cashSleeve) ?? Dec.ZERO);
  const stated = Dec.parse(statedTotal) ?? Dec.ZERO;
  return verdict(parts, stated, 'What the account holds and the broker\'s own total');
}

/** ASSERTION 2 — the accounting identity every statement satisfies, exactly. */
export function reconcileLedgerIdentity(a: {
  beginning: unknown; ending: unknown;
  contributions: unknown; withdrawals: unknown;
  income: unknown; costs: unknown;             // costs signed as the ledger holds them (negative)
  marketChange: unknown;
}): Reconciliation {
  const D = (v: unknown) => Dec.parse(v) ?? Dec.ZERO;
  const computed = D(a.beginning)
    .add(D(a.contributions)).sub(D(a.withdrawals))
    .add(D(a.income)).add(D(a.costs))
    .add(D(a.marketChange));
  return verdict(computed, D(a.ending), 'The change walk and the ending value');
}
