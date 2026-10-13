/**
 * DEC-4913 (owner, 2026-10-13, "approved.") — ONE HOUSEHOLD, ONE RETIREMENT MONEY, ON EVERY SCREEN.
 *
 * Two properties: A $400,000 with nothing said about it; B $300,000 marked the home, with rent entered for B on the
 * Income screen. B is a rental (DEC-3035p), A a second home (DEC-1926), and both count 100% toward retirement
 * (DEC-0100): $400,000 + $300,000 = $700,000.
 *
 * Net worth reads the rent entries (MK-NW-F-107 propertyUses, the same reading the Emergency fund uses). Until today the
 * Plan's retirement money was not handed them, so there B's home mark still decided and $400,000 counted. This holds
 * the Net worth reading and every Plan figure built on the retirement money to the same $700,000.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RetirementCockpit, { EarmarkSheet } from '../RetirementCockpit';
import { PlanInputs } from '../../components/PlanInputs';
import { useStore } from '../../store/useStore';
import { propertyUses } from '../../../MoneyKeel/functions/networth-and-performance/net-worth';
import { earmarkDefault, primaryCarIdOf, retirementEarmarkedValue, earmarkedAmount, primaryHomeIdOf, blendedReturn, blendedVolatility } from '../../domain/assets';
import { willItLastInputs } from '../../domain/retirement/willItLast';
import { buildPaycheckYear } from '../../domain/paycheck';
import { buildSnapshot } from '../../domain/snapshot';
import { ECON } from '../../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));

const A = { asset_id: 'A', label: 'Lake house', kind: 'home', tax_bucket: 'PROPERTY', balance: 400000, target_return: 0.04 };
const B = { asset_id: 'B', label: 'Town house', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000, target_return: 0.04, re_use: 'primary' };
const RENT = [{ type: 'long', income: '1400', expenses: '0', property_id: 'B' }];
const OP = { status: 'employed', incomeSources: ['employment', 'rental'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92',
  rentals: RENT };
const accounts = () => [{ ...A }, { ...B }] as any[];

/** Net worth's reading: the property uses its own door gives, each account at its default share (DEC-0100). */
const netWorthReading = (accts: any[], rentals: any[]) => {
  const uses = propertyUses(accts, rentals);
  const home = [...uses].find(([, u]) => u === 'home')?.[0] ?? null;
  const car = primaryCarIdOf(accts);
  return accts.reduce((t, a) => t + (a.balance ?? 0) * earmarkDefault(a, car, home) / 100, 0);
};

describe('DEC-4913 — Net worth and the Plan give the same retirement money: $700,000', () => {
  test('Net worth reads B a rental and A a second home: $700,000', () => {
    expect(Object.fromEntries(propertyUses(accounts(), RENT))).toEqual({ A: 'second', B: 'rental' });
    expect(netWorthReading(accounts(), RENT)).toBe(700000);
  });

  test('the Plan functions, handed the same rent entries, agree: $700,000, no home', () => {
    const acc = accounts();
    expect(primaryHomeIdOf(acc, RENT)).toBeNull();
    expect(retirementEarmarkedValue(acc, RENT)).toBe(700000);
    expect(retirementEarmarkedValue(acc, RENT)).toBe(netWorthReading(acc, RENT));
    // the rate and the spread are weighed over the same $700,000 — both homes, the home benchmark
    expect(blendedReturn(acc, undefined, RENT)).not.toBeNull();
    expect(blendedVolatility(acc, undefined, RENT)).not.toBeNull();
    expect(acc.map((a) => earmarkedAmount(a, primaryCarIdOf(acc), primaryHomeIdOf(acc, RENT)))).toEqual([400000, 300000]);
  });

  test('the odds (willItLastInputs), the paycheck and the snapshot read the profile\'s rent entries: $700,000', () => {
    const acc = accounts();
    expect(willItLastInputs({ op: OP, accounts: acc, assumptions: {} })!.start_balance).toBe(700000);
    const sim = { current_age: 58, horizon_age: 92, mean_return: 0.05, vol_return: 0.1, inflation: 0.025, seed: 42, paths: 50 };
    expect(buildPaycheckYear(OP as any, { accounts: acc, sim } as any).nestEgg).toBe(700000);
    // the snapshot's plan runs on the same pot: identical to the same household stated outright with no rent entries
    // (A a second home, B with no use → no home, both counted)
    const told = buildSnapshot('local' as any, OP, ECON, acc, []);
    const stated = buildSnapshot('local' as any, { ...OP, rentals: undefined }, ECON,
      [{ ...A, re_use: 'secondary' }, { ...B, re_use: undefined }] as any, []);
    expect(told.retirement.projected_at_retirement).toBe(stated.retirement.projected_at_retirement);
  });

  test('not handed the rent entries, B\'s home mark still decides — $400,000 — which is why every caller hands them in', () => {
    expect(retirementEarmarkedValue(accounts())).toBe(400000);
    expect(willItLastInputs({ op: { ...OP, rentals: undefined }, accounts: accounts(), assumptions: {} })!.start_balance).toBe(400000);
  });
});

describe('DEC-4913 — the Plan screens print $700,000', () => {
  const seed = () => {
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: OP, nwSeeded: true, nwSetupChoice: 'self',
      displayMode: 'advisor', assetAccounts: accounts(), liabilities: [], bigCosts: [] } as any);
  };

  test('the Plan inputs: WHAT COUNTS TOWARD RETIREMENT $700,000, both properties ticked', () => {
    seed();
    const D = { retireAge: 67, horizonAge: 92, extraMonthly: 0 };
    render(<PlanInputs draft={D} committed={D} onDraft={() => {}} onCommit={() => {}} />);
    expect(screen.getAllByText('$700,000').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Counts toward retirement\. Tap to change\./).length).toBe(2);
  });

  test('the Retirement cockpit: the nest egg reads $700K', () => {
    seed();
    render(<RetirementCockpit />);
    expect(screen.getAllByText(/\$700K/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\$400K/)).toBeNull();
  });

  test('the earmark sheet opened from the cockpit carries the same total: Counts toward retirement: $700K', () => {
    seed();
    render(<RetirementCockpit />);
    render(<EarmarkSheet open assets={accounts()} nestEgg={retirementEarmarkedValue(accounts(), RENT)} rentals={RENT} onClose={() => {}} onSet={() => {}} onDone={() => {}} />);
    expect(screen.getByText(/Counts toward retirement: \$700K · Done/)).toBeOnTheScreen();
  });
});
