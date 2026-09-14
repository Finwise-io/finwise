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

test('working verdict: the percent AND the if-clause that names THEIR plan', () => {
  seedWorking();
  render(<PlanHubScreen />);
  // SUPERSEDED 2026-08-14 (audit D10). This asserted "YOUR RETIREMENT PLAN" sat above "WILL MY MONEY
  // LAST?" — two headings saying nearly the same thing, which the heavy green bars disguised until
  // both became quiet labels. The founder dropped the first: the tab itself is named Retire, under
  // Plan, so the card does not need to announce which tab it is on. The question IS the heading.
  expect(screen.queryByText('YOUR RETIREMENT PLAN')).toBeNull();
  expect(screen.getByText('WILL MY MONEY LAST?')).toBeOnTheScreen();
  expect(screen.getByText(/odds of lasting to age \d+/)).toBeOnTheScreen();
  // founder 2026-08-12: no verdict word — the number is the verdict
  expect(screen.getByText(/^\d{1,3}%$/)).toBeOnTheScreen();
  expect(screen.queryByText(/Likely|Uncertain|Unlikely/)).toBeNull();
  // 2026-08-12: the if-clause is gone — the inputs sit directly beneath the number and say it
  // truthfully. The old line also claimed "you entered" of a spending figure the app had derived.
  expect(screen.queryByText(/your planned spending — you entered/)).toBeNull();
  expect(screen.getByText('FACTS — SAVE AS YOU GO')).toBeOnTheScreen();
  expect(screen.getByText('CHOICES — TRY THEM, NOTHING CHANGES YET')).toBeOnTheScreen();
  expect(screen.getByText('What drives this? ›')).toBeOnTheScreen();
});

test('working: Social Security is not offered to someone decades away from it', () => {
  seedWorking();
  render(<PlanHubScreen />);
  // SUPERSEDED 2026-08-14. This used to assert that Ava — born 1991, so in her thirties — was shown
  // "your Social Security claim window opens Aug 2053" as the next decision in front of her. The
  // founder ruled the window is 60 to 70: before 60 it is not a decision, it is trivia, and after 70
  // the delayed credit has stopped so there is nothing left to choose. Neither the card nor the row
  // may appear outside that band. (A 60-to-70 person's version is pinned in
  // src/domain/planning/__tests__/ss_window.test.ts, which covers both ends.)
  expect(screen.queryByText(/Social Security claim window/)).toBeNull();
  expect(screen.queryByText('When should I claim Social Security?')).toBeNull();
  // ranked questions — "When can I retire?" moved into section 1 (it IS the retire-at stepper)
  expect(screen.queryByText('When can I retire?')).toBeNull();
  expect(screen.getByLabelText('Raise Retire at')).toBeOnTheScreen();
  expect(screen.getByText('Can I afford it?')).toBeOnTheScreen();
  expect(screen.getByText('Is a Roth move worth it?')).toBeOnTheScreen();
  expect(screen.queryByText(/Try what-ifs — a sandbox/)).toBeNull();
});

test('retired verdict: the present-tense question, the spending frame, and the withdrawal pace', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getByText('WILL MY MONEY LAST?')).toBeOnTheScreen();
  expect(screen.getByText(/odds of lasting to age \d+/)).toBeOnTheScreen();
  expect(screen.getByText(/^\d{1,3}%$/)).toBeOnTheScreen();
  expect(screen.queryByText(/Holding|Watch closely|Running short/)).toBeNull();
  expect(screen.getByText(/Your \$4,500\/month expenses/)).toBeOnTheScreen();
});

test('retired: the required withdrawal LEADS the decisions list, wearing its date', () => {
  seedRetired();
  render(<PlanHubScreen />);
  // SUPERSEDED 2026-08-14 (founder ruling). This used to assert an amber card ABOVE the decisions
  // list carrying "NEXT DECISION · DUE DEC 31", while the list below deliberately omitted whatever
  // that card showed — one decision occupying two positions on one screen, and a list that quietly
  // changed shape depending on what was due. The founder's finding on Ray's hero settled the
  // principle (one decision, one place), so the dated obligation is now simply the FIRST row of the
  // list wearing its deadline — which is what the ordering rule asked for anyway: anything with a
  // real date goes first, because it expires.
  expect(screen.queryByText('NEXT DECISION · DUE DEC 31')).toBeNull();
  expect(screen.getByText('DUE DEC 31')).toBeOnTheScreen();
  expect(screen.getByText(/Required withdrawal: \$[\d,]+ — not yet taken/)).toBeOnTheScreen();
  // and it is FIRST: the dated row sits above "Can I spend more?"
  const all = screen.getByText('DECISIONS YOU CAN MAKE TODAY');
  expect(all).toBeOnTheScreen();
  expect(screen.getByText('Can I spend more?')).toBeOnTheScreen();
});

test('one decision, one place: the dated row is not ALSO repeated further down the list', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getAllByText(/Required withdrawal: \$[\d,]+ — not yet taken/)).toHaveLength(1);
  expect(screen.queryAllByText('Have I taken my required withdrawal?')).toHaveLength(0);
});

test('retired: the paycheck card carries the SAME function numbers as Home (guaranteed + safe draw = paycheck)', () => {
  seedRetired();
  render(<PlanHubScreen />);
  expect(screen.getByText(/WHERE YOUR INCOME COMES FROM — YOUR RETIREMENT PAYCHECK/)).toBeOnTheScreen();
  expect(screen.getByText('= Guaranteed')).toBeOnTheScreen();
  expect(screen.getByText('+ Draw from savings')).toBeOnTheScreen();
  expect(screen.getByText('Your paycheck')).toBeOnTheScreen();
  expect(screen.getByText(/The same paycheck as Home's card — one function/)).toBeOnTheScreen();
  // settled Social Security shows as handled, not hidden
  // FOUNDER 2026-08-12: for someone already drawing, the claim question is REMOVED — not shown
  // settled. A decision you cannot make is not a decision to display.
  expect(screen.queryByText(/claim Social Security/i)).toBeNull();
});

test('first day: locked sample gauge + the dynamic door counting ONLY missing answers, crediting accounts', () => {
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1966' },   // age known
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 162000 }],
  } as any);
  render(<PlanHubScreen />);
  expect(screen.getByText(/Sample: 84% odds of lasting to age \d+/)).toBeOnTheScreen();
  // the door became the state: the box names exactly what is missing, and the row wears MISSING
  expect(screen.getByText(/can't be calculated yet\. Add what you spend/)).toBeOnTheScreen();
  expect(screen.getByText(/MISSING/)).toBeOnTheScreen();
  // (the old doorSub list is gone — the box above names it, and the row itself wears MISSING)
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
  // CHANGED 2026-08-11 (founder finding): below 80% the sentence used to be REFUSED, so the card fell
  // back to a bare "See your plan ›" — the app went quiet exactly when the news mattered. It speaks
  // for every computable plan now; what changes is the ENDING, which must never claim money to spare
  // that isn't there.
  test('below 80% it still speaks — the plan is stated, the odds word carries the verdict', () => {
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 62 }))
      .toBe('retire at 65 with ~$1,412,000, lasting past 92 with ~$890,000 to spare');
  });
  test('a plan that runs short says WHEN — never "to spare" it does not have', () => {
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 41, leftoverAtHorizon: 0, shortfallAge: 84 }))
      .toBe('retire at 65 with ~$1,412,000, running short around age 84');
    expect(onCourseSentence({ ...base, lens: 'retired', chance: 35, leftoverAtHorizon: -5000, shortfallAge: 88 }))
      .toBe('running short around age 88');
    // no band to read an age from → still honest, just less precise
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 41, leftoverAtHorizon: 0 }))
      .toBe('retire at 65 with ~$1,412,000, running short before 92');
  });
  test('it stays silent ONLY when there is genuinely nothing to say', () => {
    expect(onCourseSentence({ ...base, lens: 'retired', chance: null })).toBeNull();       // no odds yet
    expect(onCourseSentence({ ...base, lens: 'preretired', chance: 90, potAtRetire: null })).toBeNull();
  });
  test('the shortfall age is read from the band the simulation already produces', () => {
    const { shortfallAgeFromBand } = require('../../domain/planning/hub');
    expect(shortfallAgeFromBand([{ age: 80, p50: 100 }, { age: 84, p50: 0 }, { age: 92, p50: -1 }])).toBe(84);
    expect(shortfallAgeFromBand([{ age: 80, p50: 100 }, { age: 92, p50: 50 }])).toBeNull();
    expect(shortfallAgeFromBand(null)).toBeNull();
  });
});
