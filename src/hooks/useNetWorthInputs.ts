// THE NET WORTH FAMILY'S INPUTS, BUILT ONCE (owner, DEC-0345, 2026-09-13): "inputs assembled once per family — one
// function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and
// no screen assembles its own."
//
// The family's two doors are MK-NW-O-003 theNetWorth and MK-NW-O-004 theEmergencyFund. Until 2026-10-20 seven screens
// — Net worth, Home, Insights, Stress test, Job safety, Alternatives and the rent page of Income — each picked the
// accounts, debts, expenses and plan answers out of the store for themselves and handed them to those doors. Each did it
// a little differently (one fell back to an empty plan, one to nothing, one named the person 'local'), which is how two
// screens come to ask one question about two different households. They read this now, the way every paycheck surface
// reads src/hooks/useCashflowModel.ts. Held by src/__tests__/guard_one_door_networth_inputs.test.ts; the proof that no
// number moved when the screens changed over is src/screens/__tests__/networth_family_inputs.test.tsx.
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { resolveNetWorthRows } from '../domain/snapshot';
import type { AssetAccount } from '../domain/assets';
import type { Debt } from '../domain/debt';
import { latestCloseLookup } from '../domain/performance';

/** What every Net worth question is asked about. Each door takes the fields it needs: theNetWorth reads uid, accounts and
 *  debts (and transactions and snapshotDays when it is asked for a change); theEmergencyFund reads accounts, debts,
 *  expenses and profile. Handed to a door whole: `theNetWorth(inputs)`, `theEmergencyFund(inputs)`. */
export interface NetWorthInputs {
  uid: string;
  /** The accounts the person entered or linked. */
  accounts: AssetAccount[];
  /** The debts the person entered. */
  debts: Debt[];
  /** Every expense they logged. */
  expenses: any[];
  /** Their answers — the plan, the budget, the rent. An empty answer set when there are none. */
  profile: any;
  /** Every record of money moving, and the daily record of what each account was worth. */
  transactions: any[];
  snapshotDays: any[];
  /** THE ROWS HOME COUNTS: the accounts and debts above once Net worth is set up, and before that the estimate from the
   *  sign-up answers — the one rule for that, MK-XS-F-033 resolveNetWorthRows (B-49). Home has shown that estimate since
   *  2026-06-13; the Net worth tab shows its first-day screen instead, so it reads the rows above. */
  withEstimate: { accounts: AssetAccount[]; debts: Debt[] };
  /** A HOLDING'S PRICE TODAY, BY ITS TICKER (2026-10-21): the latest close in the price history the app holds, nothing when
   *  it holds none — the one lookup Performance and the account page use (latestCloseLookup). The amber box is handed it, so
   *  a hand-added holding with no price is named on Net worth as it is there. It prices nothing on this screen. */
  latestCloseOf: (ticker: string) => number | null;
}

/** The facts every Net worth question is asked about — the person's accounts, debts, logged expenses, answers, money movements and daily record — built once from the store, for every screen and door in the family. */
/* ─ MK-NW-F-145 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * netWorthInputs
 *
 * Answers ..... The facts every Net worth question is asked about — the person's accounts, debts, logged expenses, answers, money movements and daily record — built once from the store, for every screen and door in the family.
 *
 * Formula .....
 *     uid = string(user id)   (or 'local' when missing)
 *     accounts = asset accounts (or none when missing)
 *     debts = liabilities (or none when missing)
 *     expenses = expenses (or none when missing)
 *     profile = onboarding profile (or no answers when missing)
 *     transactions = transactions (or none when missing)
 *     snapshot days = snapshot days (or none when missing)
 *     with estimate = resolve net worth rows(uid, onboarding profile, nw seeded, accounts, debts)
 *     latest close of = latest close lookup(price cache)
 *
 * Called by ... useNetWorthInputs — the hook every Net worth screen reads
 *
 * Serves ...... every figure of MK-NW-O-003 theNetWorth and MK-NW-O-004 theEmergencyFund, through their inputs
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-024 logged expenses
 * Ruled by .... DEC-0345
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-NW-F-145 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there)
 * Changed ..... not in git yet (—)
 */
export function netWorthInputs(s: any): NetWorthInputs {
  const uid = String(s?.user?.uid ?? 'local');
  const accounts: AssetAccount[] = s?.assetAccounts ?? [];
  const debts: Debt[] = s?.liabilities ?? [];
  const rows = resolveNetWorthRows(uid, s?.onboardingProfile ?? null, s?.nwSeeded ?? false, accounts, debts);
  return {
    uid, accounts, debts,
    expenses: s?.expenses ?? [],
    profile: s?.onboardingProfile ?? {},
    transactions: s?.transactions ?? [],
    snapshotDays: s?.snapshotDays ?? [],
    withEstimate: { accounts: rows.accounts, debts: rows.liabilities },
    latestCloseOf: latestCloseLookup(s?.priceCache),
  };
}

/** The same, read live from the store: rebuilt only when one of the facts it is made from changes. */
export function useNetWorthInputs(): NetWorthInputs {
  const s = useStore() as any;
  return useMemo(() => netWorthInputs(s),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.user?.uid, s.assetAccounts, s.liabilities, s.expenses, s.onboardingProfile, s.transactions, s.snapshotDays, s.nwSeeded, s.priceCache]);
}
