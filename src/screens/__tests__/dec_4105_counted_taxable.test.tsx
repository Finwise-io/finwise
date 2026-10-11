// AN ACCOUNT WITH NO TAX TYPE IS COUNTED AS TAXABLE FOR THE PLAN, WITH A LINE NAMING IT (DEC-4105, 2026-10-10).
// His words: "An account with no tax type would be counted as taxable for the plan, with a line naming it:
// "Brokerage — tax type not stated; counted as taxable until you choose." … approved".
// Every Plan / retirement screen that shows a figure built from the split (MK-PL-F-001 taxBucketSplit) prints the
// line once, a tap opens that account's own editor, and there is no line when every account has a tax type.
// Surfaces, 10 of 10: Retirement cockpit (where your money sits), Cash flow when retired (draw comes from), the
// draw-steer sheet, the Plan inputs (Plan hub), Roth conversion, Required withdrawals, Will my money last (what
// drives this), What if I save more, Social Security timing, Goals plan.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RetirementCockpit from '../RetirementCockpit';
import CashFlowScreen from '../CashFlowScreen';
import RothScreen from '../RothScreen';
import RequiredWithdrawalsScreen from '../RequiredWithdrawalsScreen';
import WillItLastScreen from '../WillItLastScreen';
import WhatIfScreen from '../WhatIfScreen';
import SsTimingScreen from '../SsTimingScreen';
import MultiGoalScreen from '../MultiGoalScreen';
import { PlanInputs } from '../../components/PlanInputs';
import { useStore } from '../../store/useStore';
import { taxBucketSplit, taxableGainShare } from '../../domain/decumulation';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const LINE = 'Brokerage — tax type not stated; counted as taxable until you choose.';
const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June', birthYear: String(new Date().getFullYear() - 74),
  horizonAge: '92', monthlySpending: '5200', ri_ss: '2600', ri_ss_freq: 'monthly',
};
const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92',
};
// the brokerage has NO tax type stored: the split counts it taxable, and names it
const UNSTATED = { asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', balance: 210000, retirement_pct: 100, target_return: 0.06,
  positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 300, lots: [{ lot_id: 'l1', shares: 700, cost_per_share: 200, purchase_date: '2020-01-15' }] }] };
const STATED = { ...UNSTATED, tax_bucket: 'TAXABLE' };
const OTHERS = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 38000, retirement_pct: 100, target_return: 0 },
  { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000, retirement_pct: 100, target_return: 0.06 },
];

const seed = (op: any, brokerage: any, extra: Record<string, unknown> = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: op, nwSeeded: true, nwSetupChoice: 'self',
    assetAccounts: [...OTHERS, brokerage], liabilities: [], bigCosts: [], goals: [], ...extra } as any);
};
beforeEach(() => mockPush.mockClear());

/** the line is on the screen exactly once, and a tap opens the brokerage's own editor */
const namesItOnce = () => {
  expect(screen.getAllByText(LINE)).toHaveLength(1);
  fireEvent.press(screen.getByText(LINE));
  expect(mockPush).toHaveBeenCalledWith('/add-account?edit=brk');
};
const noLine = () => expect(screen.queryByText(/tax type not stated; counted as taxable/)).toBeNull();

const D = { retireAge: 65, horizonAge: 90, extraMonthly: 0 };
const SURFACES: [string, any, Record<string, unknown>, () => React.ReactElement][] = [
  ['Retirement cockpit — where your money sits', RETIREE, { employmentStatus: 'retired', displayMode: 'advisor' }, () => <RetirementCockpit />],
  ['Cash flow when retired — draw comes from', RETIREE, { employmentStatus: 'retired' }, () => <CashFlowScreen />],
  ['Plan inputs on the Plan hub', WORKER, {}, () => <PlanInputs draft={D} committed={D} onDraft={() => {}} onCommit={() => {}} />],
  ['Roth conversion', WORKER, {}, () => <RothScreen />],
  ['Required withdrawals', RETIREE, { employmentStatus: 'retired' }, () => <RequiredWithdrawalsScreen />],
  ['Will my money last — what drives this', WORKER, {}, () => <WillItLastScreen />],
  ['What if I save more', WORKER, {}, () => <WhatIfScreen />],
  ['Social Security timing', WORKER, {}, () => <SsTimingScreen />],
  ['Goals plan', WORKER, {}, () => <MultiGoalScreen />],
];

describe.each(SURFACES)('DEC-4105 · %s', (_name, op, extra, ui) => {
  test('names the account with no tax type, once, and a tap opens its editor', () => {
    seed(op, UNSTATED, extra);
    render(ui());
    namesItOnce();
  });
  test('says nothing when every account has a tax type', () => {
    seed(op, STATED, extra);
    render(ui());
    noLine();
  });
});

describe('DEC-4105 · the draw-steer sheet', () => {
  const openSheet = () => {
    render(<CashFlowScreen />);
    fireEvent.press(screen.getByLabelText('Steer it — reorder where the draw comes from'));
  };
  test('names the account with no tax type, and a tap closes the sheet and opens its editor', () => {
    seed(RETIREE, UNSTATED, { employmentStatus: 'retired' });
    openSheet();
    expect(screen.getAllByText(LINE)).toHaveLength(2);   // the Cash flow card behind it, and the sheet — once each
    fireEvent.press(screen.getAllByText(LINE)[1]);
    expect(mockPush).toHaveBeenCalledWith('/add-account?edit=brk');
    expect(screen.queryByText('Where the draw comes from')).toBeNull();   // the sheet closed first
  });
  test('says nothing when every account has a tax type', () => {
    seed(RETIREE, STATED, { employmentStatus: 'retired' });
    openSheet();
    noLine();
  });
});

test('DEC-4105 · one rule: the money the split counts taxable is the money the gain share reads (tenet 4)', () => {
  const accounts = [...OTHERS, UNSTATED] as any[];
  const split = taxBucketSplit(accounts);
  expect(split.taxable).toBe(210000);
  expect(split.countedTaxableNotStated).toEqual([{ asset_id: 'brk', name: 'Brokerage' }]);
  // 700 shares at $300 = $210,000 against $140,000 paid: a third is gain — it used to read nothing (no answer) for this money
  expect(taxableGainShare(accounts, () => null)).toBeCloseTo(70000 / 210000, 12);
  expect(taxableGainShare([...OTHERS, STATED] as any[], () => null)).toBeCloseTo(70000 / 210000, 12);
  expect(taxBucketSplit([...OTHERS, STATED] as any[]).countedTaxableNotStated).toEqual([]);
});
