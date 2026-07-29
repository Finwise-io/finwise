// FCC cross-screen AGREEMENT suite (the founder's accuracy P0: one concept → one helper → one
// number, pinned across screens — intra-screen checks are not enough, lesson B-67):
//   1. Home hero investments = Invest header, to the dollar (same helper, same resolved rows).
//   2. Will-it-last: Home strip = Plan hub = Cash flow strip (one selector, one seeded run).
//   3. Mask walk: hideBalances ON → ZERO dollar signs render on Home, Cash flow, Plan (both lenses).
//   4. The retired lens leads with the paycheck on Home AND Cash flow; the working lens never sees it.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import CashFlowScreen from '../CashFlowScreen';
import PlanHubScreen from '../PlanHubScreen';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { money } from '../../domain/_shared/num';
import { investmentsTotal } from '../../domain/assets';
import { resolveNetWorthRows } from '../../domain/snapshot';
import { willItLastInputs, selectWillItLast } from '../../domain/retirement/willItLast';
import { ssBenefitAtClaimAge } from '../../domain/retirement/ssTiming';
import { simulate } from '../../domain/retirement';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 68), horizonAge: '92',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
  monthlySpending: '4500',
  spendCats: [{ id: 'rent', bucket: 'fixed', amount: '1200', unit: 'dollar' }],
};
const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000',
  targetRetirementAge: '67', horizonAge: '92',
};
const ACCOUNTS = [
  { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 },
  { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 120000 },
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 18000 },
];

beforeEach(() => useStore.getState().resetAll());
const seed = (op: any) => useStore.setState({ onboardingProfile: op, assetAccounts: ACCOUNTS, onboardingComplete: true } as any);

// helper: every rendered text node, flattened
const allText = (root: any): string[] => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === 'string') { out.push(node); return; }
    (node.children ?? []).forEach(walk);
  };
  walk(root.toJSON());
  return out;
};

describe('pin 1 — investments: Home hero = Invest header, to the dollar', () => {
  test('rendered equality on the same fixture', () => {
    seed(WORKER);
    const s = useStore.getState() as any;
    const expected = money(investmentsTotal(resolveNetWorthRows('local', s.onboardingProfile, false, s.assetAccounts, []).accounts));
    const home = render(<HomeScreen />);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);   // the hero number
    home.unmount();
    render(<PerformanceScreen />);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);   // the Invest header
  });

  test('both screens use the ONE helper over the ONE row resolver (source pin)', () => {
    const fs = require('fs'); const path = require('path');
    for (const f of ['HomeScreen.tsx', 'PerformanceScreen.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      expect(src).toMatch(/investmentsTotal\(/);
      expect(src).toMatch(/resolveNetWorthRows\(/);
    }
  });
});

describe('pin 2 — will-it-last: one selector, three surfaces, one percent', () => {
  const pctOn = (el: React.ReactElement): string => {
    const r = render(el);
    const texts = allText(r);
    const hit = texts.map((t) => t.match(/^(\d{1,3})%$|— (\d{1,3})%|(\d{1,3})% /)).find(Boolean);
    // gather any NN% token on the screen paired with Likely/Uncertain/Unlikely wording
    const joined = texts.join(' ');
    // JSX interpolation splits 'Likely — 84%' into separate text nodes — allow whitespace runs
    const m = joined.match(/(Likely|Uncertain|Unlikely)\s*—?\s*(\d{1,3})\s*%/);
    r.unmount();
    expect(m).toBeTruthy();
    return m![2];
  };

  test('retiree: Home strip = Plan hub = Cash flow strip', () => {
    seed(RETIREE);
    const home = pctOn(<HomeScreen />);
    const plan = pctOn(<PlanHubScreen />);
    const cash = pctOn(<CashFlowScreen />);
    expect(plan).toBe(home);
    expect(cash).toBe(home);
  });
});

describe('pin 2b — SS adoption feeds the claim-age-adjusted check into the odds (Build-46 walk row 1)', () => {
  // The July-24 audit's top finding: adopting claim-62 stored the raw age-67 statement in
  // ssMonthly and the hub simulated with the FULL check — quietly higher odds than the SS
  // screen's own compare showed for the same choice. One number everywhere, or nothing.
  test('adopt claim-62 with a $2,600 statement → the simulation gets $1,820 (70%), not $2,600', () => {
    seed(WORKER);
    const s = useStore.getState() as any;
    const { accounts } = resolveNetWorthRows('local', s.onboardingProfile, false, s.assetAccounts, []);
    const adopted = { ssEligible: true, ssMonthly: 2600, ssClaimAge: 62, guaranteedMonthly: ssBenefitAtClaimAge(2600, 62) };
    const inputs = willItLastInputs({ op: s.onboardingProfile, accounts, assumptions: adopted })!;
    expect(inputs.guaranteed_monthly_income).toBe(1820);
    expect(inputs.guaranteed_monthly_income).toBe(ssBenefitAtClaimAge(2600, 62));
    expect(inputs.guaranteed_start_age).toBe(62);
  });

  test('claim at 67 still pays the statement exactly (factor 1.0 — non-adopters unchanged)', () => {
    seed(WORKER);
    const s = useStore.getState() as any;
    const { accounts } = resolveNetWorthRows('local', s.onboardingProfile, false, s.assetAccounts, []);
    const inputs = willItLastInputs({ op: s.onboardingProfile, accounts, assumptions: { ssEligible: true, ssMonthly: 2600, ssClaimAge: 67 } })!;
    expect(inputs.guaranteed_monthly_income).toBe(2600);
  });

  test("the SS screen's claim-62 row odds = the hub's post-adoption odds (the screens now agree)", () => {
    seed(WORKER);
    const s = useStore.getState() as any;
    const { accounts } = resolveNetWorthRows('local', s.onboardingProfile, false, s.assetAccounts, []);
    const args = { op: s.onboardingProfile, accounts, assumptions: {} as any };
    const base = willItLastInputs(args)!;
    // exactly how SsTimingScreen builds a compare row for claim age 62
    const ssRowChance = simulate({
      ...base,
      guaranteed_monthly_income: ssBenefitAtClaimAge(2600, 62),
      guaranteed_start_age: 62,
      horizon_age: Math.max(base.retire_age + 1, 92),
    }).chance_of_success;
    const hub = selectWillItLast({ ...args, assumptions: { ssEligible: true, ssMonthly: 2600, ssClaimAge: 62, guaranteedMonthly: ssBenefitAtClaimAge(2600, 62) } });
    expect(hub.chance).toBe(ssRowChance);
  });
});

describe('pin 3 — the mask walk: hideBalances leaves ZERO dollar signs', () => {
  const walkScreens = () => {
    const NetWorthScreen = require('../NetWorthScreen').default;
    for (const [name, El] of [['Home', HomeScreen], ['CashFlow', CashFlowScreen], ['PlanHub', PlanHubScreen], ['NetWorth', NetWorthScreen]] as const) {
      const r = render(React.createElement(El as any));
      const offenders = allText(r).filter((t) => /\$\s?\d/.test(t));
      r.unmount();
      expect({ screen: name, offenders }).toEqual({ screen: name, offenders: [] });
    }
  };

  test('retired lens', () => {
    seed(RETIREE);
    useStore.setState({ hideBalances: true } as any);
    walkScreens();
  });

  test('working lens', () => {
    seed(WORKER);
    useStore.setState({ hideBalances: true } as any);
    walkScreens();
  });
});

describe('pin 4 — the lens contract on the two hero surfaces', () => {
  test('retired: the paycheck leads Home and Cash flow; the hidden-balances banner shows when masked', () => {
    seed(RETIREE);
    const home = render(<HomeScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
    home.unmount();
    render(<CashFlowScreen />);
    expect(screen.getByText(/SAFE TO SPEND — [A-Z]/)).toBeOnTheScreen();
  });

  test('working: the Grow & Track hero leads Home; no paycheck anywhere', () => {
    seed(WORKER);
    const home = render(<HomeScreen />);
    expect(screen.getByText('YOUR INVESTMENTS')).toBeOnTheScreen();
    expect(screen.queryByText(/SAFE TO SPEND —/)).toBeNull();
    home.unmount();
    render(<CashFlowScreen />);
    expect(screen.queryByText(/SAFE TO SPEND —/)).toBeNull();
  });
});
