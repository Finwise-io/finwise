/**
 * Net Worth seeding semantics (the B-15 / B-16 fix): seeding replaces ONLY onboarding-origin rows,
 * user-created accounts are sacred, and rows saved before the origin tag existed are deduped by
 * label instead of duplicated or deleted.
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
import type { OnboardingProfile } from '../domain/onboardingProfile';

const answers = (retirement: string, holdings: string, debt = '0'): OnboardingProfile => ({
  currentRetirementSavings: retirement, investmentHoldings: holdings,
  debtName: 'Loan', debtBalance: debt, debtRate: '6', debtPayment: '200',
});

const manualAccount = { label: 'Inherited brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE' as const, balance: 75000, target_return: 0.07 };

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('seedNetWorth: origin-tagged merge', () => {
  test('first seed creates onboarding-tagged accounts and debts', () => {
    useStore.getState().seedNetWorth(answers('50000', '10000', '5000'));
    const { assetAccounts, liabilities, nwSeeded } = useStore.getState();
    expect(assetAccounts).toHaveLength(2);
    expect(assetAccounts.every((a) => a.origin === 'onboarding')).toBe(true);
    expect(liabilities).toHaveLength(1);
    expect(liabilities[0].origin).toBe('onboarding');
    expect(nwSeeded).toBe(true);
  });

  test('re-seed updates seeded balances and leaves a manual account untouched', () => {
    useStore.getState().seedNetWorth(answers('50000', '0'));
    useStore.getState().addAsset(manualAccount);

    useStore.getState().seedNetWorth(answers('100000', '20000'));

    const accounts = useStore.getState().assetAccounts;
    expect(accounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(100000);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(20000);
    const manual = accounts.find((a) => a.label === 'Inherited brokerage')!;
    expect(manual.balance).toBe(75000);
    expect(manual.origin).toBeUndefined();
    expect(accounts).toHaveLength(3);
  });

  // B-21: an explicit $0 answer is a deliberate placeholder, so the Investments row stays at $0
  // (it is not dropped). It only disappears when the field is absent from the answers entirely.
  test('re-seed with an explicit $0 answer keeps the seeded row at $0 (B-21)', () => {
    useStore.getState().seedNetWorth(answers('50000', '10000'));
    useStore.getState().seedNetWorth(answers('60000', '0'));
    const accounts = useStore.getState().assetAccounts;
    expect(accounts.map((a) => a.label)).toEqual(['Retirement savings', 'Investments']);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(0);
  });

  test('a manual edit to a SEEDED row is overwritten on re-seed (onboarding answers win)', () => {
    useStore.getState().seedNetWorth(answers('50000', '0'));
    const seeded = useStore.getState().assetAccounts[0];
    useStore.getState().updateAsset(seeded.asset_id, { balance: 55555 });

    useStore.getState().seedNetWorth(answers('70000', '0'));
    expect(useStore.getState().assetAccounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(70000);
  });

  test('legacy rows (no origin tag) are deduped by label+bucket, not duplicated or deleted', () => {
    // simulate a pre-fix store: seeded rows persisted without the origin tag
    useStore.setState({
      nwSeeded: true,
      assetAccounts: [
        { asset_id: 'legacy-1', label: 'Retirement savings', kind: '401k', tax_bucket: 'PRE_TAX', balance: 50000, target_return: 0.07 },
        { asset_id: 'legacy-2', label: 'My house fund', kind: 'savings', tax_bucket: 'CASH', balance: 9000, target_return: 0.02 },
      ],
      liabilities: [{ debt_id: 'legacy-d', label: 'Loan', debt_type: 'OTHER', remaining_balance: 3000, interest_rate_apr: 0.06, minimum_monthly_payment: 100 }],
    });

    useStore.getState().seedNetWorth(answers('80000', '0', '2500'));

    const accounts = useStore.getState().assetAccounts;
    expect(accounts.filter((a) => a.label === 'Retirement savings')).toHaveLength(1);   // replaced, not duplicated
    expect(accounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(80000);
    expect(accounts.find((a) => a.label === 'My house fund')!.balance).toBe(9000);      // untagged non-match kept
    const debts = useStore.getState().liabilities;
    expect(debts.filter((d) => d.label === 'Loan')).toHaveLength(1);
    expect(debts[0].remaining_balance).toBe(2500);
  });
});

describe('seedGoals: onboarding goals reach the Plan tab (B-29)', () => {
  const withGoals = { goals: [{ label: 'Emergency fund', target: '36000', year: '2027' }, { label: 'House', target: '45000', year: '2029' }] };

  test('first seed brings onboarding goals in, origin-tagged', () => {
    useStore.getState().seedGoals(withGoals);
    const goals = useStore.getState().goals;
    expect(goals.map((g) => g.label).sort()).toEqual(['Emergency fund', 'House']);
    expect(goals.every((g) => g.origin === 'onboarding')).toBe(true);
    expect(goals.find((g) => g.label === 'Emergency fund')!.target).toBe(36000);
    expect(useStore.getState().goalsSeeded).toBe(true);
  });

  test('seeds once — re-calling does not duplicate or resurrect deleted goals', () => {
    useStore.getState().seedGoals(withGoals);
    const firstId = useStore.getState().goals[0].id;
    useStore.getState().deleteGoal(firstId);
    useStore.getState().seedGoals(withGoals);            // second visit
    expect(useStore.getState().goals.map((g) => g.label)).toEqual(['House']);   // deletion sticks
  });

  test('a hand-added goal is preserved; restart clears only seeded goals + re-seeds', () => {
    useStore.getState().seedGoals(withGoals);
    useStore.getState().addGoal({ label: 'New car', icon: '🚗', target: 20000, saved: 0, color: '#000' });

    useStore.getState().restartOnboarding();
    expect(useStore.getState().goals.map((g) => g.label)).toEqual(['New car']);  // manual kept, seeded gone
    expect(useStore.getState().goalsSeeded).toBe(false);

    useStore.getState().seedGoals({ goals: [{ label: 'Trip', target: '5000' }] });
    expect(useStore.getState().goals.map((g) => g.label).sort()).toEqual(['New car', 'Trip']);
  });

  test('no onboarding goals → no goals, but flag set so it does not re-run', () => {
    useStore.getState().seedGoals({});
    expect(useStore.getState().goals).toHaveLength(0);
    expect(useStore.getState().goalsSeeded).toBe(true);
  });
});

describe('restartOnboarding: only seeded rows are cleared', () => {
  test('clears seeded rows, keeps manual ones, resets the seeded gate', () => {
    useStore.getState().seedNetWorth(answers('50000', '10000', '5000'));
    useStore.getState().addAsset(manualAccount);

    useStore.getState().restartOnboarding();

    const st = useStore.getState();
    expect(st.assetAccounts.map((a) => a.label)).toEqual(['Inherited brokerage']);
    expect(st.liabilities).toHaveLength(0);
    expect(st.nwSeeded).toBe(false);
    expect(st.onboardingProfile).toBeNull();
  });

  test('restart with nothing seeded leaves accounts alone', () => {
    useStore.getState().addAsset(manualAccount);
    useStore.getState().restartOnboarding();
    expect(useStore.getState().assetAccounts).toHaveLength(1);
  });

  test('full cycle: seed → restart → new answers → seed reflects only the new answers', () => {
    useStore.getState().seedNetWorth(answers('50000', '10000'));
    useStore.getState().restartOnboarding();
    useStore.getState().seedNetWorth(answers('120000', '0'));
    const accounts = useStore.getState().assetAccounts;
    // B-21: '120000' retirement + explicit '0' holdings → two seeded rows (Investments at $0).
    expect(accounts).toHaveLength(2);
    expect(accounts.find((a) => a.label === 'Retirement savings')!.balance).toBe(120000);
    expect(accounts.find((a) => a.label === 'Investments')!.balance).toBe(0);
  });
});
