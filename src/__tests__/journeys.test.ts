/**
 * Journey/handoff tests (launch test plan, P0 area 1): onboarding answers → store → snapshot →
 * the values each screen consumes. Screen-level passes ≠ journey-level truth — issue #15 (Net
 * Worth answers never flowing) is exactly the class of bug these catch.
 */

const _storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem:    jest.fn((k: string) => Promise.resolve(_storage[k] ?? null)),
    setItem:    jest.fn((k: string, v: string) => { _storage[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete _storage[k]; return Promise.resolve(); }),
    clear:      jest.fn(() => { Object.keys(_storage).forEach(k => delete _storage[k]); return Promise.resolve(); }),
    getAllKeys:  jest.fn(() => Promise.resolve(Object.keys(_storage))),
    multiGet:   jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, _storage[k] ?? null]))),
    multiSet:   jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { _storage[k] = v; }); return Promise.resolve(); }),
  },
}));

import { useStore } from '../store/useStore';
import { buildSnapshot, snapshotFromOnboarding } from '../domain/snapshot';
import { buildAssetsState } from '../domain/assets';
import { buildDebtState } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { cashflowYear } from '../domain/cashflow';
import { ALL_PERSONAS, ECON, retiree75, employedPartner, studentAid } from '../testing/personas';
import type { OnboardingProfile } from '../domain/onboardingProfile';

beforeEach(() => {
  useStore.getState().resetAll();
});

/** The real pipeline a user drives: finish onboarding → store the answers → seed Net Worth. */
function completeOnboarding(op: OnboardingProfile) {
  const s = useStore.getState();
  s.setOnboardingProfile(op);
  s.setOnboardingComplete(true);
  s.seedNetWorth(op);
  return useStore.getState();
}

// ───────────────────────── The launch plan's named case: retiree, 75 ─────────────────────────
describe('Journey: retiree 75 with a $250k portfolio', () => {
  test('her portfolio answer becomes a Net Worth account, and every consumer sees the same $250k', () => {
    const st = completeOnboarding(retiree75);
    expect(st.assetAccounts).toHaveLength(1);
    expect(st.assetAccounts[0].label).toBe('Savings / portfolio');
    expect(st.assetAccounts[0].balance).toBe(250000);
    expect(st.liabilities).toHaveLength(0);

    const snap = snapshotFromOnboarding('local', st.onboardingProfile, ECON);
    expect(snap.networth.net_worth).toBeCloseTo(250000, 2);        // NW chip
    expect(snap.assets.total_asset_value).toBeCloseTo(250000, 2);  // cockpit nest-egg basis
    expect(snap.income.total_gross_annual).toBeCloseTo((2200 + 1300) * 12, 0); // SS + pension are her income NOW
    expect(snap.retirement.chance_of_success).toBeGreaterThan(0);
  });
});

// ───────────────────────── Producer → consumer inventory per persona ─────────────────────────
describe('Journey: every onboarding answer reaches its consumer screen', () => {
  test('employed + partner: accounts, debt, goals, and budget all reflect the answers', () => {
    const st = completeOnboarding(employedPartner);

    // Net Worth consumers
    const labels = st.assetAccounts.map((a) => a.label).sort();
    expect(labels).toEqual(['Investments', 'Retirement savings']);
    expect(st.assetAccounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(120000);
    expect(st.assetAccounts.find((a) => a.label === 'Investments')!.balance).toBe(45000);
    expect(st.liabilities).toHaveLength(1);
    expect(st.liabilities[0].label).toBe('Car loan');
    expect(st.liabilities[0].remaining_balance).toBe(14000);

    // Home / Budget / Goals consumers
    const snap = snapshotFromOnboarding('local', st.onboardingProfile, ECON);
    expect(snap.networth.net_worth).toBeCloseTo(120000 + 45000 - 14000, 2);
    expect(snap.budget.monthly_spending).toBeCloseTo(2300 + 900 + 600 + 3600 / 12, 2);
    expect(snap.goals.goals.map((g) => g.label)).toEqual(['House down payment', 'New car']);
    expect(snap.goals.goals[0].target_amount).toBe(60000);
    expect(snap.profile.current_age).toBeGreaterThan(30);          // birthYear flowed to profile
  });

  test.each(ALL_PERSONAS.map(({ name, op }) => [name, op] as const))(
    'persona %s: snapshot consumes the stored answers without dropping the journey',
    (_name, op) => {
      const st = completeOnboarding(op);
      const snap = snapshotFromOnboarding('local', st.onboardingProfile, ECON);
      // the store's seeded wealth and the snapshot's derived wealth must be the same story
      const storeAssets = st.assetAccounts.reduce((t, a) => t + a.balance, 0);
      const storeDebt = st.liabilities.reduce((t, d) => t + d.remaining_balance, 0);
      expect(snap.networth.gross_assets).toBeCloseTo(storeAssets, 2);
      expect(snap.networth.gross_debt).toBeCloseTo(storeDebt, 2);
    },
  );

  test('student: tuition crunch flows from spendCats to the bill calendar', () => {
    completeOnboarding(studentAid);
    const cf = cashflowYear(studentAid, 500, new Date(2026, 5, 1));
    expect(cf.shortMonths.length).toBeGreaterThan(0);              // September tuition tips her short
  });
});

// ───────────────────────── Snapshot uses LIVE accounts (B-49) ─────────────────────────
describe('Journey: editing a Net Worth account flows into the snapshot', () => {
  test('snapshot net worth + nest egg reflect an account edit (not stale onboarding)', () => {
    const st = completeOnboarding(employedPartner);   // seeds Retirement savings $120k + Investments $45k; car loan $14k
    const acctId = useStore.getState().assetAccounts.find((x) => x.label === 'Retirement savings')!.asset_id;

    // op-only snapshot still uses onboarding answers (unchanged fallback)
    const opOnly = snapshotFromOnboarding('local', st.onboardingProfile, ECON);
    expect(opOnly.networth.net_worth).toBeCloseTo(120000 + 45000 - 14000, 2);

    // user edits the account: $120k → $200k. The snapshot built with live accounts must reflect it.
    useStore.getState().updateAsset(acctId, { balance: 200000 });
    const live = useStore.getState();
    const snap = buildSnapshot('local', live.onboardingProfile, ECON, live.assetAccounts, live.liabilities);
    expect(snap.networth.net_worth).toBeCloseTo(200000 + 45000 - 14000, 2);     // reflects the edit
    expect(snap.assets.total_asset_value).toBeCloseTo(200000 + 45000, 2);
    // and it equals the Net Worth screen's own calc (buildNetWorth from the same live accounts)
    expect(snap.networth.net_worth).toBeCloseTo(
      buildNetWorth('local', buildAssetsState('local', live.assetAccounts).total_asset_value, buildDebtState('local', live.liabilities).total_debt_balance).net_worth, 2,
    );
  });

  test('a hand-added account raises snapshot net worth', () => {
    completeOnboarding(employedPartner);
    useStore.getState().addAsset({ label: 'Inheritance', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 75000, target_return: 0.07 });
    const live = useStore.getState();
    const snap = buildSnapshot('local', live.onboardingProfile, ECON, live.assetAccounts, live.liabilities);
    expect(snap.networth.gross_assets).toBeCloseTo(120000 + 45000 + 75000, 2);
  });

  test('a paid-off debt (live liabilities empty) is NOT resurrected from onboarding', () => {
    completeOnboarding(employedPartner);   // has a $14k car loan from onboarding
    const debtId = useStore.getState().liabilities[0].debt_id;
    useStore.getState().deleteLiability(debtId);
    const live = useStore.getState();
    const snap = buildSnapshot('local', live.onboardingProfile, ECON, live.assetAccounts, live.liabilities);
    expect(snap.networth.gross_debt).toBe(0);                                   // debt stays gone
    expect(snap.networth.net_worth).toBeCloseTo(120000 + 45000, 2);
  });

  // The live rows are authoritative: a user who deletes EVERYTHING sees $0, not the onboarding
  // numbers resurrected. (buildSnapshot's required arrays — passing [] means "none", not "fall back".)
  test('deleting ALL accounts and debts yields $0 net worth, not resurrected onboarding', () => {
    completeOnboarding(employedPartner);   // seeds assets + a car loan
    useStore.getState().assetAccounts.slice().forEach((a) => useStore.getState().deleteAsset(a.asset_id));
    useStore.getState().liabilities.slice().forEach((d) => useStore.getState().deleteLiability(d.debt_id));
    const live = useStore.getState();
    expect(live.assetAccounts).toHaveLength(0);
    expect(live.liabilities).toHaveLength(0);
    const snap = buildSnapshot('local', live.onboardingProfile, ECON, live.assetAccounts, live.liabilities);
    expect(snap.networth.net_worth).toBe(0);
    expect(snap.networth.gross_assets).toBe(0);
  });
});

// ───────────────────────── Re-running onboarding (the #15 family) ─────────────────────────
describe('Journey: re-running onboarding updates Net Worth', () => {
  const firstAnswers: OnboardingProfile = { ...employedPartner, currentRetirementSavings: '50000', investmentHoldings: '0' };
  const newAnswers: OnboardingProfile = { ...employedPartner, currentRetirementSavings: '100000', investmentHoldings: '20000' };

  // BUG-LEDGER: B-15 (fixed) — seedNetWorth's one-time guard used to ignore every later seed.
  test('re-seeding with updated answers refreshes the seeded accounts', () => {
    completeOnboarding(firstAnswers);
    expect(useStore.getState().assetAccounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(50000);

    useStore.getState().setOnboardingProfile(newAnswers);
    useStore.getState().seedNetWorth(newAnswers);

    const accounts = useStore.getState().assetAccounts;
    expect(accounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(100000);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(20000);
  });

  // BUG-LEDGER: B-16 (fixed) — restartOnboarding used to wipe hand-added accounts too.
  test('an account the user added by hand survives an onboarding restart', () => {
    completeOnboarding(firstAnswers);
    useStore.getState().addAsset({ label: 'Inherited brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 75000, target_return: 0.07 });

    useStore.getState().restartOnboarding();

    const labels = useStore.getState().assetAccounts.map((a) => a.label);
    expect(labels).toContain('Inherited brokerage');               // user-entered data is sacred
    expect(labels).not.toContain('Retirement savings');            // seeded rows ARE cleared
  });

  test('the one working path today: restart → answer again → seed picks up the new numbers', () => {
    completeOnboarding(firstAnswers);
    useStore.getState().restartOnboarding();                       // resets the nwSeeded gate
    useStore.getState().setOnboardingProfile(newAnswers);
    useStore.getState().seedNetWorth(newAnswers);
    expect(useStore.getState().assetAccounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(100000);
  });

  // BUG-LEDGER: B-21 (fixed) — an explicit $0 answer seeds a $0 placeholder account the user can
  // fund/edit later (assets only). Debt still drops $0 (a $0 placeholder liability is clutter).
  test('explicit $0 asset answers seed $0 placeholder accounts', () => {
    const st = completeOnboarding({ ...employedPartner, currentRetirementSavings: '0', investmentHoldings: '0', debtBalance: '0' });
    expect(st.assetAccounts).toHaveLength(2);
    expect(st.assetAccounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(0);
    expect(st.assetAccounts.find((a) => a.label === 'Investments')!.balance).toBe(0);
    expect(st.liabilities).toHaveLength(0);
  });

  // B-21 guard: a whitespace-only answer is "not answered", not an explicit $0 → seeds no account.
  test('a whitespace-only asset answer seeds no account', () => {
    const st = completeOnboarding({ ...employedPartner, currentRetirementSavings: '   ', investmentHoldings: '45000' });
    expect(st.assetAccounts.map((a) => a.label)).toEqual(['Investments']);
  });

  test('seeding is idempotent for identical answers (no duplicate accounts)', () => {
    completeOnboarding(firstAnswers);
    useStore.getState().seedNetWorth(firstAnswers);
    useStore.getState().seedNetWorth(firstAnswers);
    expect(useStore.getState().assetAccounts.filter((a) => a.label === 'Retirement savings')).toHaveLength(1);
  });
});
