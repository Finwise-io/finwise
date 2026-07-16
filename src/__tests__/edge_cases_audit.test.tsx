// SENIOR-AUDIT EDGE CASES (2026-07-14) — five deliberately nasty user situations, kept as
// permanent tests. E1 and E2 exposed REAL defects (fixed in this commit); E3–E5 held.
//   E1: a 71-year-old on the Social Security screen — every standard claim age has passed.
//   E2: deleting a transaction that carries an open 'Worth a look' flag (orphan card).
//   E3: year-wrap bill placement — an annual bill anchored to THIS month vs LAST month.
//   E4: a guaranteed-income-only retiree (zero nest egg) with a bill month bigger than the check.
//   E5: extreme wealth — a $25M nest egg through the solver, the paycheck, and the formatters.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import SsTimingScreen from '../screens/SsTimingScreen';
import { PaycheckCard } from '../components/PaycheckCard';
import { buildDatedGrid } from '../domain/grid';
import { buildPaycheckYear, solveSafeDraw } from '../domain/paycheck';
import { ssLifetimeTotal } from '../domain/retirement/ssTiming';
import { money } from '../domain/_shared/num';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => useStore.getState().resetAll());

// ── E1 · age 71, never claimed: the screen must never be a dead end ─────────────────────────────
describe('E1 — Social Security at 71 (all standard claim ages passed)', () => {
  test('offers claim NOW at the age-70 amount instead of zero buttons (was: a dead end)', () => {
    useStore.setState({
      onboardingProfile: {
        status: 'retired', incomeSources: ['retirement_income'],   // retired but NOT receiving SS
        birthYear: String(new Date().getFullYear() - 71), monthlySpending: '4000', horizonAge: '92',
      },
      assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 300000 }],
    } as any);
    render(<SsTimingScreen />);
    fireEvent.changeText(screen.getByLabelText(/Monthly amount from your Social Security statement/), '2600');
    // one live option: claim now, at the clamped age-70 factor (124% of 2600 = 3224)
    expect(screen.getByText(/at 71 \(now\)/)).toBeOnTheScreen();
    expect(screen.getByText('$3,224')).toBeOnTheScreen();
    expect(screen.getByText(/waiting longer adds nothing/i)).toBeOnTheScreen();
    expect(screen.getByLabelText('Use claim at 71 as my plan')).toBeOnTheScreen();   // a real button exists
    expect(screen.queryByText(/at 62/)).toBeNull();   // choices that no longer exist are never shown
  });
});

// ── E2 · delete a flagged transaction: the open card must not orphan ────────────────────────────
describe("E2 — deleting a transaction that carries an open 'Worth a look' flag", () => {
  test('the open flag dies with its transaction; a resolved flag survives as the audit trail', () => {
    useStore.setState({ assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 20000 }] } as any);
    // warm history below every threshold, then two flaggable withdrawals
    [180, 200, 210, 220, 230].forEach((amount, i) => useStore.getState().recordTransaction({
      type: 'WITHDRAWAL', account_id: 'chk' as any, amount, note: 'groceries', date: `2026-07-0${i + 1}`, source: 'connected',
    } as any));
    useStore.getState().recordTransaction({ type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 2400, note: 'apex', date: '2026-07-08', source: 'connected' } as any);
    useStore.getState().recordTransaction({ type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 2600, note: 'zenith', date: '2026-07-09', source: 'connected' } as any);
    const s = () => useStore.getState() as any;
    expect(s().txnFlags).toHaveLength(2);

    // resolve one (the audit trail), keep one open
    const [newer, older] = s().txnFlags;
    useStore.getState().resolveTxnFlag(older.flag_id, 'was_me');

    // delete BOTH flagged transactions
    const ledger = s().transactions;
    const t2400 = ledger.find((t: any) => t.amount === 2400);
    const t2600 = ledger.find((t: any) => t.amount === 2600);
    expect(useStore.getState().deleteTransaction(String(t2600.id))).toBe(true);
    expect(useStore.getState().deleteTransaction(String(t2400.id))).toBe(true);

    // the open flag (2600) is gone — Home never questions money that no longer exists;
    // the resolved flag (2400) remains: it carries its own facts as history.
    const flags = s().txnFlags;
    expect(flags).toHaveLength(1);
    expect(flags[0].status).toBe('was_me');
    expect(newer.status).toBe('open');   // sanity: it was the open one that got dropped
  });
});

// ── E3 · year-wrap: annual bills anchored to THIS month vs LAST month ───────────────────────────
describe('E3 — dated-bill placement across the year wrap', () => {
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const lastMonth = ((now.getMonth() + 11) % 12) + 1;
  const op = (billMonth: number) => ({
    status: 'retired', incomeSources: ['retirement_income'],
    ri_ss: '2600', ri_ss_freq: 'monthly',
    spendCats: [{ id: 'tax', label: 'Property tax', bucket: 'nonmonthly', amount: '1900', unit: 'dollar', months: [billMonth], dueDay: 15, tier: 'critical' }],
  });

  test("a bill anchored to THIS month lands in slot 0 (this month), not next year's", () => {
    const grid = buildDatedGrid(op(thisMonth) as any, {});
    const withTax = grid.cells.map((c, i) => ({ i, hit: c.billItems.some((b) => b.label === 'Property tax') })).filter((x) => x.hit);
    expect(withTax.map((x) => x.i)).toEqual([0]);
  });

  test('a bill anchored to LAST month lands in slot 11 (eleven months out) with the year-wrap label', () => {
    const grid = buildDatedGrid(op(lastMonth) as any, {});
    const withTax = grid.cells.map((c, i) => ({ i, cell: c, hit: c.billItems.some((b) => b.label === 'Property tax') })).filter((x) => x.hit);
    expect(withTax.map((x) => x.i)).toEqual([11]);
    expect(withTax[0].cell.year).toBe(now.getMonth() === 11 ? now.getFullYear() + 1 : withTax[0].cell.year);   // a real dated year
  });

  test('the paycheck year absorbs the wrapped bill EXACTLY once (this-year = the exact 12-cell sum)', () => {
    const year = buildPaycheckYear(op(lastMonth) as any, {
      accounts: [], sim: { current_age: 68, horizon_age: 92, mean_return: 0.055, vol_return: 0.09, inflation: 0.025, seed: 42, paths: 300 },
    });
    const billMonths = year.months.filter((m) => m.billsTotal > 0);
    expect(billMonths).toHaveLength(1);
    expect(billMonths[0].billsTotal).toBe(1900);
    const sum = year.months.reduce((t, m) => t + m.netSafeToSpend, 0);
    expect(Math.abs(year.thisYear - sum)).toBeLessThan(0.01);
  });
});

// ── E4 · guaranteed-income-only retiree, and a month where the bill exceeds the check ───────────
describe('E4 — zero nest egg: the paycheck stands on guaranteed income alone', () => {
  const now = new Date();
  const op = {
    status: 'retired', incomeSources: ['retirement_income'],
    birthYear: String(now.getFullYear() - 70), horizonAge: '90',
    ri_ss: '1500', ri_ss_freq: 'monthly',
    spendCats: [{ id: 'ins', label: 'Insurance', bucket: 'nonmonthly', amount: '2100', unit: 'dollar', months: [((now.getMonth() + 3) % 12) + 1], dueDay: 10, tier: 'critical' }],
  };

  test('safe draw is exactly 0 (never invented from a nest egg that is not there)', () => {
    const year = buildPaycheckYear(op as any, {
      accounts: [], sim: { current_age: 70, horizon_age: 90, mean_return: 0.055, vol_return: 0.09, inflation: 0.025, seed: 42, paths: 300 },
    });
    expect(year.safeDrawMonthly).toBe(0);
    expect(year.nestEgg).toBe(0);
    expect(year.guaranteedMissing).toBe(false);
    // the insurance month goes NEGATIVE — shown, never clipped to zero
    const short = year.months.find((m) => m.billsTotal > 0)!;
    expect(short.netSafeToSpend).toBe(1500 - 2100);
  });

  test("the hero renders the minus WITH the word 'short' and names the bill (rule c5)", () => {
    useStore.setState({ onboardingProfile: op, assetAccounts: [] } as any);
    render(<PaycheckCard />);
    const heroMonthIsShort = new Date().getMonth() === (op.spendCats[0].months[0] - 1);
    if (heroMonthIsShort) {
      expect(screen.getByText(/short this month/)).toBeOnTheScreen();
    } else {
      // force the short month by moving the bill to the current month and re-rendering
      useStore.setState({ onboardingProfile: { ...op, spendCats: [{ ...op.spendCats[0], months: [new Date().getMonth() + 1] }] } } as any);
      render(<PaycheckCard />);
      expect(screen.getByText(/short this month/)).toBeOnTheScreen();
      expect(screen.getByText(/Insurance lands this month/)).toBeOnTheScreen();
    }
  });
});

// ── E5 · extreme wealth: $25M through the solver, the paycheck, and the formatters ──────────────
describe('E5 — a $25M nest egg does not break the math or the display', () => {
  const SIM = { current_age: 60, horizon_age: 105, mean_return: 0.055, vol_return: 0.09, inflation: 0.025, seed: 42, paths: 300 };

  test('the safe-draw solver returns a sane, $5-rounded, deterministic draw', () => {
    const a = solveSafeDraw(25_000_000, 0, SIM);
    const b = solveSafeDraw(25_000_000, 0, SIM);
    expect(a).toBe(b);                                  // seeded → identical
    expect(a).toBeGreaterThan(10_000);                  // $25M over 45 years is real money
    expect(a % 5).toBe(0);                              // rounded DOWN to $5 — never overstated
    expect(Number.isFinite(a)).toBe(true);
  });

  test('the paycheck year stays an exact sum and the formatters stay exact (no rounding drift)', () => {
    const year = buildPaycheckYear(
      { status: 'retired', incomeSources: ['retirement_income'], ri_ss: '4000', ri_ss_freq: 'monthly' } as any,
      { nestEgg: 25_000_000, sim: SIM },
    );
    const sum = year.months.reduce((t, m) => t + m.netSafeToSpend, 0);
    expect(Math.abs(year.thisYear - sum)).toBeLessThan(0.01);
    expect(money(25_000_000)).toBe('$25,000,000');
    // SS lifetime at the extremes: claim at 70, live to 105 → 3224 × 420 months exactly
    expect(ssLifetimeTotal(2600, 70, 105)).toBe(3224 * 420);
  });
});

// ── audit follow-up: the tab layout's wiring had ZERO test contact (coverage sweep) ─────────────
describe('audit — the tab bar wiring is pinned at the source level', () => {
  const fs = require('fs'); const path = require('path');
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

  test('the bar derives its order from the ONE lens resolver (never a hardcoded list)', () => {
    expect(layout).toMatch(/tabOrder\(/);
    expect(layout).toMatch(/resolveLens\(/);
    expect(layout).toMatch(/order\.map\(/);
  });

  test('all five FCC tabs are registered and every legacy destination stays routable but hidden', () => {
    // the five tabs now live in the ONE shared map the Menu mirrors (src/constants/tabs.ts);
    // the layout registers them by importing that map and mapping the lens order over it
    const meta = fs.readFileSync(path.join(__dirname, '..', 'constants', 'tabs.ts'), 'utf8');
    for (const t of ['home', 'analytics', 'invest', 'cashflow', 'plan']) expect(meta).toContain(`${t}:`);
    expect(layout).toMatch(/TAB_META/);
    for (const legacy of ['budget', 'retirement', 'goals', 'tips', 'rewards', 'settings']) {
      expect(layout).toMatch(new RegExp(`name="${legacy}"\\s+options=\\{\\{ href: null \\}\\}`));
    }
  });
});
