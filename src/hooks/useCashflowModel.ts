// The ONE place the F5 paycheck engine and F2 dated grid are invoked with live store state.
// Every paycheck surface (Home hero card, Cash flow main, month rows, month detail) reads THIS,
// so "hero = bar = month-detail total" is true by construction — one cell, four surfaces.
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { buildPaycheckYear, type PaycheckYear } from '../domain/paycheck';
import { buildDatedGrid, type DatedGrid } from '../domain/grid';
import { resolveLens, type Lens } from '../domain/profile/lens';
import { ageFromProfile } from '../utils/persona';

export interface CashflowModel {
  lens: Lens;
  year: PaycheckYear;    // F5: the retiree paycheck (12 dated cells + hero + this-year)
  grid: DatedGrid;       // F2: the dated in/out grid (working bars; regular bills for both lenses)
}

/** Same sim convention as the Retirement cockpit: assumptions adopted from Plan, seeded, deterministic. */
export function useCashflowModel(): CashflowModel {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const A = store.retirementAssumptions ?? {};
  const lens = resolveLens(op, store.lensOverride);

  return useMemo(() => {
    const age = ageFromProfile(op) ?? 68;
    const mean = A.expectedReturn ?? 0.055;
    const year = buildPaycheckYear(op, {
      accounts, liabilities,
      sim: {
        current_age: age,
        horizon_age: A.horizonAge ?? Math.max(age + 5, 92),
        mean_return: mean,
        vol_return: Math.min(0.2, Math.max(0.05, mean * 1.7)),   // cockpit convention
        inflation: A.inflation ?? 0.025,
        seed: 42, paths: 300,
      },
    });
    const grid = buildDatedGrid(op, { liabilities });
    return { lens, year, grid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, accounts, liabilities, A.expectedReturn, A.horizonAge, A.inflation, lens]);
}
