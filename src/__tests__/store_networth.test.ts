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

  test('re-seed with smaller answers removes stale seeded rows (zeroed answer → row gone)', () => {
    useStore.getState().seedNetWorth(answers('50000', '10000'));
    useStore.getState().seedNetWorth(answers('60000', '0'));
    const labels = useStore.getState().assetAccounts.map((a) => a.label);
    expect(labels).toEqual(['Retirement savings']);          // the Investments row didn't linger
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
    expect(accounts).toHaveLength(1);
    expect(accounts[0].balance).toBe(120000);
  });
});
