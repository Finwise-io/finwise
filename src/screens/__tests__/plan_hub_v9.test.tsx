// Plan hub — mock v9 pins (founder: "all mock up approved", 2026-08-01). One test per approved
// element: lens verdicts with the "if" clause, the spectrum, the ONE dated next decision, the
// paycheck agreement, the dynamic door, question-grammar rows, and the honest locks.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PlanHubScreen from '../PlanHubScreen';
import { useStore } from '../../store/useStore';
import { employedPartner, retiree75 } from '../../testing/personas';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const yr = new Date().getFullYear();
const seedWorking = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 67, contribMonthly: 1200, spendMonthly: 4500 },
  assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 400000 }],
} as any);
const seedRetired = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...retiree75, monthlySpending: '4500' },
  retirementAssumptions: { spendMonthly: 4500, ssClaimAge: 67 },
  assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 900000 }],
} as any);

beforeEach(() => { useStore.getState().resetAll(); });

test('working verdict: the word + percent AND the if-clause that names THEIR plan', () => {
  seedWorking();
  render(<PlanHubScreen />);
  expect(screen.getByText(/WILL MY MONEY LAST\? — to \d+/)).toBeOnTheScreen();
  expect(screen.getByText(/(Likely|Uncertain|Unlikely)/)).toBeOnTheScreen();
  expect(screen.getByText(/…if you retire at 67, keep saving \$1,200\/mo, and spend \$4,500\/mo in retirement \(your planned spending — you set it\)/)).toBeOnTheScreen();
  expect(screen.getByText('What drives this? ›')).toBeOnTheScreen();
});

test('working: the one next-decision card is the dated Social Security window; the list omits the duplicate', () => {
  seedWorking();
  render(<PlanHubScreen />);
  // Ava (born 1991) → window opens the year she turns 62 — dated, not vague
  expect(screen.getByText(new RegExp(`Your Social Security claim window opens [A-Z][a-z]{2} ${1991 + 62}`))).toBeOnTheScreen();
  expect(screen.queryByText('When should I claim Social Security?')).toBeNull();
  // ranked questions, v9 grammar
  expect(screen.getByText('When can I retire?')).toBeOnTheScreen();
  expect(screen.getByText('Can I afford it?')).toBeOnTheScreen();
  expect(screen.getByText('Is a Roth move worth it?')).toBeOnTheScreen();
  expect(screen.getByText(/Try what-ifs — a sandbox/)).toBeOnTheScreen();
});

test('retired verdict: present-tense words, the spending frame, and the withdrawal pace', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getByText(/IS MY MONEY LASTING\? — to \d+/)).toBeOnTheScreen();
  expect(screen.getByText(/(Holding|Watch closely|Running short)/)).toBeOnTheScreen();
  expect(screen.getByText(/Your \$4,500\/mo spending/)).toBeOnTheScreen();
});

test('retired: required withdrawal due-and-untaken IS the next decision, dated Dec 31', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getByText('NEXT DECISION · DUE DEC 31')).toBeOnTheScreen();
  expect(screen.getByText(/Required withdrawal: \$[\d,]+ — not yet taken/)).toBeOnTheScreen();
});

test('retired: the paycheck card carries the SAME engine numbers as Home (guaranteed + safe draw = paycheck)', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getByText(/WHERE YOUR INCOME COMES FROM — YOUR RETIREMENT PAYCHECK/)).toBeOnTheScreen();
  expect(screen.getByText('= Guaranteed')).toBeOnTheScreen();
  expect(screen.getByText('+ Safe draw from savings')).toBeOnTheScreen();
  expect(screen.getByText('Your paycheck')).toBeOnTheScreen();
  expect(screen.getByText(/The same paycheck as Home's card — one engine/)).toBeOnTheScreen();
  // settled Social Security shows as handled, not hidden
  expect(screen.getByText(/claimed at 67 ✓/)).toBeOnTheScreen();
});

test('first day: locked sample gauge + the dynamic door counting ONLY missing answers, crediting accounts', () => {
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1966' },   // age known
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 162000 }],
  } as any);
  render(<PlanHubScreen />);
  expect(screen.getByText(/Sample: Likely — 84 in 100/)).toBeOnTheScreen();
  expect(screen.getByText(/1 answer left/)).toBeOnTheScreen();                       // only spending missing
  expect(screen.getByText('what you spend')).toBeOnTheScreen();
  expect(screen.getByText(/What you have — already in: 1 account, \$162,000 counted/)).toBeOnTheScreen();
  expect(screen.getByText('When can I retire? 🔒')).toBeOnTheScreen();               // mind-order, honestly locked
  expect(screen.getByText(/SAMPLE — YOUR NEXT DECISION LANDS HERE/)).toBeOnTheScreen();
});

test('first day retired: income capture leads; spend-more wears the lock', () => {
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { status: 'retired', incomeSources: ['retirement_income'], birthYear: String(yr - 74) },
  } as any);
  render(<PlanHubScreen />);
  expect(screen.getByText('START WHERE IT PAYS MOST')).toBeOnTheScreen();
  expect(screen.getByText('Your income')).toBeOnTheScreen();
  expect(screen.getByText('Can I spend more? 🔒')).toBeOnTheScreen();
});

test('SAMENESS (pre-48 audit): the hub withdrawal rate comes from the canonical helper on the SAME inputs as the odds', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'PlanHubScreen.tsx'), 'utf8');
  expect(src).toMatch(/withdrawalPlan\(wil\.inputs\.retire_monthly_spend_today/);   // canonical helper, odds' own inputs
  expect(src).not.toMatch(/\* 12\) \/ wil\.inputs\.start_balance/);                 // the inline re-derivation is gone
});

describe('on-course sentence (founder-approved words, 2026-08-04)', () => {
  const { onCourseSentence } = require('../../domain/planning/hub');
  const money = (n: number) => `$${n.toLocaleString('en-US')}`;   // money-mask-ok: test fixture, never rendered — the screen passes maskedMoney
  const base = { retireAge: 65, horizonAge: 92, potAtRetire: 1_412_300, leftoverAtHorizon: 890_400, money };

  test('working lens leads with the pot at retirement day, then survival', () => {
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 84 }))
      .toBe('retire at 65 with ~$1,412,000, lasting past 92 with ~$890,000 to spare');
  });
  test('retired lens: lasting IS the headline (no retirement-day pot exists)', () => {
    expect(onCourseSentence({ ...base, lens: 'retired', chance: 84 }))
      .toBe('on course to last past 92, ~$890,000 to spare');
  });
  test('below 80% the sentence is refused — "lasting past 92" may not be said off-course', () => {
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 79 })).toBeNull();
    expect(onCourseSentence({ ...base, lens: 'retired', chance: null })).toBeNull();
  });
  test('missing numbers refuse the sentence rather than guess', () => {
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 90, potAtRetire: null })).toBeNull();
    expect(onCourseSentence({ ...base, lens: 'retired', chance: 90, leftoverAtHorizon: 0 })).toBeNull();
  });
});
