// NO BIRTH YEAR, NO MADE-UP AGE ON THE RETIRED CASH FLOW (2026-10-26, CLEANUP-LEFT; tenet 3 of DEC-3523 and his DEC-0296).
//
// DRAW COMES FROM, its "Why this order?" card and the draw-steer sheet worked the required withdrawal and the comparison at age 68
// whenever no birth year was entered (`ageFromProfile(op) ?? 68`, three places). The paycheck card above them already refuses
// ("Your birth year is not entered, so there is no paycheck to work out — we won’t guess one.", FIX-MONTH). Now the three say, in
// the same words, that what turns on age is not calculated; the order of the kinds of account, which does not, still shows.
// Drawing: MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html, READ THIS FIRST row of 2026-10-26.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { RMD_NO_AGE, DRAW_COMPARE_NO_AGE } from '../../domain/decumulation';
import { PAYCHECK_NO_AGE } from '../../hooks/useCashflowModel';
import { builtLines } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June', horizonAge: '92', monthlySpending: '5200',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};
const ACCOUNTS = [
  { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 38000, retirement_pct: 100 },
  { asset_id: 'brk', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 210000,
    positions: [{ position_id: 'p1', ticker: 'VTI', last_price: 300, lots: [{ lot_id: 'l1', shares: 700, cost_per_share: 200, purchase_date: '2020-01-15' }] }] },
  { asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 },
  { asset_id: 'roth', label: 'Roth', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 88000 },
];
const open = (profile: Record<string, any>, accounts: any[] = ACCOUNTS) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingProfile: profile, onboardingComplete: true, assetAccounts: accounts } as any);
  return render(<CashFlowScreen />);
};

test('the words are the paycheck card\'s: "Your birth year is not entered, so there is no … to work out — we won’t guess one."', () => {
  for (const said of [RMD_NO_AGE, DRAW_COMPARE_NO_AGE]) {
    expect(said.startsWith('Your birth year is not entered, so there is no ')).toBe(true);
    expect(said.endsWith(' to work out — we won’t guess one.')).toBe(true);
  }
  expect(PAYCHECK_NO_AGE.replace('paycheck', 'required withdrawal')).toBe(RMD_NO_AGE);
});

test('DRAW COMES FROM, no birth year, pre-tax money held: the order of the kinds shows; the required withdrawal says it is not calculated', () => {
  open(RETIREE);
  const L = builtLines(screen.toJSON());
  expect(L).toContain(PAYCHECK_NO_AGE);                       // the card above, unchanged
  const at = L.indexOf('DRAW COMES FROM');
  expect(at).toBeGreaterThan(0);
  const order = L.find((l, i) => i > at && /^1 /.test(l)) ?? '';
  expect(order).toBe('1 Cash 2 Taxable / brokerage 3 Pre-tax (401k / Traditional IRA) 4 Roth');   // spacing collapsed by the reader
  expect(L.slice(at)).toContain(RMD_NO_AGE);
  expect(L.join(' ')).not.toMatch(/Required withdrawal \(RMD\)/);
});

test('with a birth year the order is worked at the person\'s age, and nothing says it is not: at 76 the required withdrawal is first', () => {
  open({ ...RETIREE, birthYear: String(new Date().getFullYear() - 76) });
  const L = builtLines(screen.toJSON());
  expect(L.some((l) => /^1 Required withdrawal \(RMD\) — first 2 Cash/.test(l))).toBe(true);
  expect(L).not.toContain(RMD_NO_AGE);
});

test('no pre-tax money: there is no required withdrawal to judge, so no line', () => {
  open(RETIREE, ACCOUNTS.filter((a) => a.tax_bucket !== 'PRE_TAX'));
  expect(builtLines(screen.toJSON())).not.toContain(RMD_NO_AGE);
});

test('the steer sheet, no birth year: no required-withdrawal row, the line instead, and the comparison refuses rather than run at 68', () => {
  open(RETIREE);
  fireEvent.press(screen.getByLabelText('Steer it — reorder where the draw comes from'));
  expect(screen.queryByLabelText(/Required withdrawal, first/)).toBeNull();
  expect(screen.getAllByText(RMD_NO_AGE).length).toBeGreaterThanOrEqual(1);
  fireEvent.press(screen.getByLabelText('Move Roth up'));
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  expect(screen.getByText(DRAW_COMPARE_NO_AGE)).toBeOnTheScreen();
  expect(screen.queryByText(/With your order:/)).toBeNull();
});

test.failing('the screen until 2026-10-26, pinned: with no birth year the sheet ran the comparison at 68 (FIXED 2026-10-26)', () => {
  open(RETIREE);
  fireEvent.press(screen.getByLabelText('Steer it — reorder where the draw comes from'));
  fireEvent.press(screen.getByLabelText('Move Roth up'));
  fireEvent.press(screen.getByLabelText('Re-run with my order'));
  expect(screen.getByText(/With your order:/)).toBeOnTheScreen();
});

test('"Why this order?", no birth year: each kind and its reason, and the same line for the required withdrawal', () => {
  open(RETIREE);
  fireEvent.press(screen.getAllByLabelText('Why this order?')[0]);
  const L = builtLines(screen.toJSON());
  const at = L.indexOf('Why this order?');
  expect(at).toBeGreaterThanOrEqual(0);
  expect(L.slice(at).filter((l) => /^\d\. /.test(l)).map((l) => l.replace(/ — .*/, ''))).toEqual(['1. Cash', '2. Taxable / brokerage', '3. Pre-tax (401k / Traditional IRA)', '4. Roth']);
  expect(L.slice(at)).toContain(RMD_NO_AGE);
});
