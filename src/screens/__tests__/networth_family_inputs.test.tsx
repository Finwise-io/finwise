/** THE NET WORTH FAMILY'S INPUTS ARE BUILT ONCE (owner, DEC-0345, 2026-09-13) — and no number moved when they were.
 *
 *  His ruling: "inputs assembled once per family — one function builds the person's state for a family and every
 *  orchestrator in that family reads it; no orchestrator and no screen assembles its own." Until 2026-10-20 seven
 *  screens each picked their own accounts, debts, expenses and answers out of the store and handed them to the two
 *  Net worth doors (MK-NW-O-003 theNetWorth, MK-NW-O-004 theEmergencyFund). One function builds them now —
 *  MK-NW-F-145 netWorthInputs, in src/hooks/useNetWorthInputs.ts — and every one of those screens reads it.
 *
 *  THE PROOF THAT NOTHING CHANGED. Every screen below was rendered on the household below on 2026-10-20, BEFORE the
 *  change, and every Net worth figure it printed was written down with its identifier, in order, together with every
 *  number on the screen (what is printed and what a screen reader says). That record is
 *  networth_family_inputs.before.json, beside this file. The test renders the same screens on the same household,
 *  on the same day, and must read the same figures and the same numbers, character for character.
 *
 *  The household has every kind of account the doors treat differently: a linked brokerage with cash inside it, a
 *  linked bond account, a typed checking account, a typed savings account, a CD whose value was never entered
 *  ("Value not entered", DEC-3657), a crypto holding, the home, a rental with its rent, a car — a mortgage on each
 *  property, a card and a car loan, and two months of logged expenses.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// the day the record was made: every date on these screens is read from the clock, so the clock is held there
const TODAY = '2026-10-20';
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'] });
});
afterAll(() => jest.useRealTimers());

export const HOUSEHOLD = () => ({
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: {
    ...employedPartner, birthYear: '1971', monthlySpending: '5200', incomeSources: ['employment', 'rental'],
    rentals: [{ type: 'long', income: '2400', expenses: '600', property_id: 'rent' }],
  },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1500, spendMonthly: 5200, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 12400, target_return: 0, value_as_of: TODAY },
    { asset_id: 'sav', label: 'Ally Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 18250.55, target_return: 0.04, value_as_of: TODAY },
    // never valued: left out of every total, named "Value not entered" (DEC-3657, DEC-3279e)
    { asset_id: 'cd', label: 'Ally CD', institution: 'Ally', kind: 'cd', asset_class: 'bonds', balance: undefined, target_return: 0.045 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 214838,
      target_return: 0.07, source: 'connected', last_synced: `${TODAY}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, price: 250, shares: 856,
        lots: [{ lot_id: 'l1', shares: 856, cost_per_share: 180, purchase_date: '2022-03-01' }] }] },
    { asset_id: 'k401', label: 'Fidelity 401(k)', institution: 'Fidelity', kind: '401k', tax_bucket: 'PRE_TAX', balance: 186000, target_return: 0.07, value_as_of: TODAY },
    { asset_id: 'etr', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE', asset_class: 'bonds',
      balance: 24200, target_return: 0.042, source: 'connected', last_synced: `${TODAY}T09:00:00Z`, maturity_date: '2029-08-24', coupon_rate: 0.04 },
    { asset_id: 'btc', label: 'Coinbase Bitcoin', institution: 'Coinbase', kind: 'crypto', tax_bucket: 'TAXABLE', asset_class: 'alternatives', balance: 9000, target_return: 0.05, value_as_of: TODAY },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 640000, target_return: 0, value_as_of: TODAY, re_use: 'primary' },
    { asset_id: 'rent', label: 'Lake rental', kind: 'home', tax_bucket: 'PROPERTY', balance: 310000, target_return: 0, value_as_of: TODAY, re_use: 'rental' },
    { asset_id: 'car', label: 'Car', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 21000, target_return: 0, value_as_of: TODAY },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 402000, interest_rate_apr: 0.055, minimum_monthly_payment: 2600, property_id: 'hme' },
    { debt_id: 'mtg2', label: 'Lake rental mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.061, minimum_monthly_payment: 1500, property_id: 'rent' },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
    { debt_id: 'auto', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.055, minimum_monthly_payment: 420 },
  ],
  expenses: [
    { id: 'e1', date: '2026-09-04', amount: 1800, category: 'Groceries', store: 'Market' },
    { id: 'e2', date: '2026-09-18', amount: 950, category: 'Utilities', store: 'Power' },
    { id: 'e3', date: '2026-10-03', amount: 1700, category: 'Groceries', store: 'Market' },
    { id: 'e4', date: '2026-10-11', amount: 1020, category: 'Utilities', store: 'Power' },
  ],
  transactions: [
    { id: 'd', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 410, date: '2026-10-15' },
  ],
  nwDaily: { '2026-10-12': 655000, [TODAY]: 666688.55 },
});

/** The identifiers that are Net worth figures: every one its two doors declare, and Alternatives' share. */
const FAMILY = (id: string) => /^MK-NW-M-\d{3}$/.test(id) || id === 'MK-XS-M-001' || id === 'MK-XS-M-003';

/** Every number a person can read or hear on the rendered screen, in order — what a screen reader says included. */
function numbers(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { out.push(...(n.match(/[−-]?\$?\d[\d,]*(?:\.\d+)?%?/g) ?? [])); return; }
    if (n.props?.accessibilityLabel) out.push(...(String(n.props.accessibilityLabel).match(/[−-]?\$?\d[\d,]*(?:\.\d+)?%?/g) ?? []));
    (n.children ?? []).forEach(walk);
  };
  const tree = screen.toJSON();
  (Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return out;
}

type Reading = { figures: [string, string][]; numbers: string[] };
const read = (): Reading => ({
  figures: figuresPrinted().filter((p) => FAMILY(p.id)).map((p) => [p.id, p.text] as [string, string]),
  numbers: numbers(),
});

/** Each screen of the family, as the person opens it. */
export const SCREENS: { name: string; open: () => void }[] = [
  { name: 'Net worth · by category', open: () => { const C = require('../NetWorthScreen').default; render(<C />); } },
  { name: 'Net worth · by institution', open: () => { const C = require('../NetWorthScreen').default; render(<C />); fireEvent.press(screen.getByText('By institution')); } },
  { name: 'Home', open: () => { const C = require('../HomeScreen').default; render(<C />); } },
  { name: 'Insights', open: () => { const C = require('../InsightsScreen').default; render(<C />); } },
  { name: 'Stress test', open: () => { const C = require('../StressTestScreen').default; render(<C />); } },
  { name: 'Job safety', open: () => { const C = require('../JobSafetyScreen').default; render(<C />); } },
  { name: 'Alternatives', open: () => { const C = require('../OtherInvestmentsScreen').default; render(<C />); } },
  { name: 'Income · rent', open: () => { mockParams = { open: 'rental' }; const C = require('../IncomeManagerScreen').default; render(<C />); } },
];

const BEFORE = path.join(__dirname, 'networth_family_inputs.before.json');

/** NUMBERS MOVED ON PURPOSE SINCE THE RECORD WAS MADE — each by a fix with its reason, at the place it sits on the screen. The
 *  record itself is never re-recorded; every other number must still read as it did. Each entry names what it was, so a
 *  record that no longer holds that number at that place fails rather than passing quietly. */
const MOVED_ON_PURPOSE: Record<string, { at: number; was: string; now: string; why: string }[]> = {
  // 2026-10-22 (W-A11Y): the figure did not move — the punctuation after it did. Home's hero card's spoken label said
  // "Your investments: $433,200, prices updated …", and this file's number reader takes a trailing comma with the digits; the
  // label now says each printed line as its own sentence ("Your investments: $433,200. …"), so the same figure reads clean
  Home: [
    { at: 0, was: '$433,200,', now: '$433,200', why: 'the spoken label ends the total with a full stop, not a comma' },
  ],
  // 2026-10-21, DEC-0457 (re-run part 1, F1): the one-account card is the largest account's part of Net worth's Investments
  // line — Vanguard without its $838 of cash — out of that line ($433,200), not out of everything but property
  Insights: [
    { at: 1, was: '$214,838', now: '$214,000', why: 'the account\'s invested part, its cash left out' },
    { at: 2, was: '46%', now: '49%', why: '$214,000 of the $433,200 Investments line' },
  ],
  // 2026-10-21, MK-NW-M-013 (re-run part 1, T4): Job safety's savings are the emergency fund's cash on Net worth
  // ($12,400 + $18,250.55 + Vanguard's $838 = $31,488.55), not an old savings log nobody fills — so the gap is $2,231
  'Job safety': [
    { at: 0, was: '$33,720', now: '$2,231', why: 'still needed: $33,720 − $31,489' },
    { at: 5, was: '$0', now: '$31,489', why: 'your savings cover — the cash Net worth counts' },
    { at: 17, was: '113', now: '8', why: 'months to close $2,231 at the $300 example pace' },
  ],
};

describe('DEC-0345 — every Net worth figure reads the same as before the inputs were built once', () => {
  const recorded: Record<string, Reading> = {};
  for (const s of SCREENS) {
    test(s.name, () => {
      useStore.getState().resetAll();
      useStore.setState(HOUSEHOLD() as any);
      mockParams = {};
      resetFiguresPrinted();
      s.open();
      const now = read();
      recorded[s.name] = now;
      if (process.env.NW_FAMILY_RECORD) return;
      const before = JSON.parse(fs.readFileSync(BEFORE, 'utf8')).screens[s.name] as Reading;
      // the guard looked: a screen that rendered nothing would match an empty record
      expect(before.numbers.length).toBeGreaterThanOrEqual(3);
      expect(now.figures).toEqual(before.figures);
      const expected = [...before.numbers];
      for (const m of MOVED_ON_PURPOSE[s.name] ?? []) { expect(expected[m.at]).toBe(m.was); expected[m.at] = m.now; }
      expect(now.numbers).toEqual(expected);
    });
  }
  afterAll(() => {
    if (!process.env.NW_FAMILY_RECORD) return;
    fs.writeFileSync(process.env.NW_FAMILY_RECORD, JSON.stringify({
      _about: 'Recorded 2026-10-20 from the code BEFORE DEC-0345 was applied (each screen still built its own inputs). '
        + 'Every Net worth figure each screen printed, with its identifier, in order; and every number on the screen. '
        + 'Read by networth_family_inputs.test.tsx. Never re-recorded to make the test pass: a difference is a number that changed.',
      day: TODAY, screens: recorded,
    }, null, 1));
  });
});
