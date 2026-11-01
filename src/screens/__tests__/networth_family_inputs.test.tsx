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
/** FIGURES MOVED ON PURPOSE — the same rule for a figure printed with its identifier: the identifier, what it read and what it
 *  reads. Every place the record holds that figure at that value moves; a record that holds it nowhere fails. */
const FIGURES_MOVED_ON_PURPOSE: Record<string, { id: string; was: string; now: string; why: string }[]> = {
  // 2026-10-24 (CF-FIX): the emergency fund's two figures above, worked by hand in MOVED_ON_PURPOSE
  ...Object.fromEntries(['Net worth · by category', 'Net worth · by institution'].map((s) => [s, [
    { id: 'MK-NW-M-046', was: '5.5 months', now: '5.2 months', why: 'months at the planned spend' },
    { id: 'MK-NW-M-048', was: '$7,570/month', now: '$7,870/month', why: 'the planned spend, the April premium counted once in the year' },
  ]])),
};
/** A FIGURE NOW PRINTED WITH ITS IDENTIFIER WHERE THE RECORD HAS IT BARE — the value did not move; it is now written by its one
 *  writer, so it joins the figures read, after the ones the record holds. */
const FIGURES_NOW_DECLARED: Record<string, { id: string; now: string; why: string; after?: string }[]> = {   // after: it is printed right after that figure
  // 2026-10-27 (FX-CF-C; drawing stresstest v03, row 3): the months print as Net worth prints them, MK-NW-M-013 — "5.6 months" where
  // the record has a bare "5.6". $31,489 ÷ ($7,420 − $1,800 rent) = 5.60: the same number, the same place.
  'Stress test': [{ id: 'MK-NW-M-013', now: '5.6 months', why: 'the months, written by the figure\'s one writer, as on Net worth' }],
  // 2026-10-31 (FX-NW, NW3-06; Alternatives v02 row of that date): the share of investable assets under the total is worked once,
  // by the Alternatives door, as MK-NW-M-074, to two decimals (Q49). The screen worked it itself to one decimal: "1.9" then "%".
  // By hand: investable = every account not a property — $12,400 + $18,250.55 cash + $214,838 Vanguard + $186,000 401(k) +
  // $24,200 E*TRADE + $9,000 Bitcoin = $464,688.55 (the CD has no value, the homes and the car are property); $9,000 ÷ $464,688.55
  // = 1.9368% → 1.94%. The same investable as before (theNetWorth's), so the number moved only by its second decimal.
  Alternatives: [{ id: 'MK-NW-M-074', now: '1.94%', why: 'the share of investable assets, now declared and to two decimals', after: 'MK-NW-M-049' }],
};
const MOVED_ON_PURPOSE: Record<string, { at: number; was: string; now: string | string[] | null; why: string }[]> = {   // now: null — a number no longer on the screen; a list — a number now read in more than one place
  // 2026-10-31 (FX-NW, NW3-06): '1 holding · 1.9% of your investable assets' reads '1.94%' — $9,000 ÷ $464,688.55, worked by hand
  // under FIGURES_NOW_DECLARED above; one string now, so the reader takes the % with it
  Alternatives: [{ at: 2, was: '1.9', now: '1.94%', why: 'the share of investable assets, to two decimals' }],
  // 2026-10-22 (W-A11Y): the figure did not move — the punctuation after it did. Home's hero card's spoken label said
  // "Your investments: $433,200, prices updated …", and this file's number reader takes a trailing comma with the digits; the
  // label now says each printed line as its own sentence ("Your investments: $433,200. …"), so the same figure reads clean
  Home: [
    { at: 0, was: '$433,200,', now: '$433,200', why: 'the spoken label ends the total with a full stop, not a comma' },
    // 2026-10-23 (CF-FIX; outside re-run of Performance, gap list item 38, DEC-0345): Home's cash-flow box prints the Cash flow
    // tab's own month (theMonth on the inputs the tab builds). For this household the tab's Actual inflow is $8,640 — the rent's
    // $1,800 after running costs taxed at the calculated rate, as the tab's month grid and the income summary have it — where
    // Home added its own $9,000; out stays $2,720, so left is $5,920 and the share spent 31%. No Net worth figure moves.
    // 2026-10-24 (Cash flow journey suite E2E-71, MK-XS-F-004 buildDatedGrid): the tab's month now lands the take-home Your base
    // pay and the Income summary print — after the tax AND the 401(k), and a rate the person typed is a rate on their pay, not on
    // their rent (approved drawing income-end-to-end_v07, frame 16). By hand: $9,000 gross × (1 − their 20%) − $800 into the
    // 401(k) = $6,400, plus the rent $2,400 − $600 = $1,800 untaxed = $8,200 (the Income summary's TAKE-HOME EACH MONTH). It
    // read $8,640: $7,200 of pay with the 401(k) still in it, and the rent at 80%. Out stays $2,720: left $5,480, 33% spent.
    { at: 23, was: '$9,000,', now: '$8,200,', why: 'the box\'s spoken income: the Cash flow tab\'s Actual inflow, the take-home after tax and the 401(k)' },
    { at: 25, was: '$6,280', now: '$5,480', why: 'the spoken left: $8,200 − $2,720, the tab\'s actual surplus' },
    { at: 26, was: '30%', now: '33%', why: '$2,720 of $8,200 spent' },
    { at: 29, was: '$9,000', now: '$8,200', why: 'Income, the Cash flow tab\'s Actual inflow' },
    { at: 31, was: '$6,280', now: '$5,480', why: 'Left, the Cash flow tab\'s = Actual surplus so far' },
    // the "where did last month's surplus go?" sheet no longer opens on this day: September has no frozen record, so the Cash
    // flow tab shows September as $0 in and $2,750 out (pastMonthFlow, the one producer both read) — no surplus to assign.
    // Home offered $6,250 ($9,000 − $2,750, calculated on the screen). The sheet's lines leave with it.
    { at: 32, was: '$6,250', now: null, why: 'the sheet\'s amount left to assign — not offered' },
    { at: 33, was: '$6,250', now: null, why: 'the sheet\'s amount available — not offered' },
    { at: 34, was: '401', now: null, why: 'the sheet\'s account line, Fidelity 401(k) — not drawn' },
    { at: 35, was: '401', now: null, why: 'the same line\'s kind, 401(k) — not drawn' },
    { at: 36, was: '$0', now: null, why: 'the sheet\'s button, Assign $0 — not drawn' },
  ],
  // 2026-10-24 (CF-FIX; DEC-0002, DEC-0447, B-24): a bill with its own month is on top of the typed monthly total, in that
  // month. This household types $5,200/month; with the home's mortgage in Debts the $2,300 Rent / Mortgage line is not counted
  // (DEC-1923), so $2,900 goes out every month, and April adds employedPartner's $3,600 Insurance premium. The emergency fund's
  // planned spend is the Cash flow tab's year ÷ 12: (2,900 × 12 + 3,600) ÷ 12 = $3,200, plus $4,670 of debt minimums = $7,870.
  // It read $7,570: the $5,200 taken to hold $300/month of the April premium. Months: $31,489 ÷ ($7,870 − $1,800) = 5.2 (was 5.5).
  'Net worth · by category': [
    { at: 100, was: '5.5', now: '5.2', why: 'months at the planned spend: $31,489 ÷ ($7,870 − $1,800 rent) = 5.2' },
    { at: 102, was: '$7,570', now: '$7,870', why: 'the planned spend: (2,900 × 12 + the April premium 3,600) ÷ 12 = 3,200, + $4,670 of debt minimums' },
  ],
  'Net worth · by institution': [
    { at: 108, was: '5.5', now: '5.2', why: 'months at the planned spend: $31,489 ÷ ($7,870 − $1,800 rent) = 5.2' },
    { at: 110, was: '$7,570', now: '$7,870', why: 'the planned spend: (2,900 × 12 + the April premium 3,600) ÷ 12 = 3,200, + $4,670 of debt minimums' },
  ],
  // 2026-10-21, DEC-0457 (re-run part 1, F1): the one-account card is the largest account's part of Net worth's Investments
  // line — Vanguard without its $838 of cash — out of that line ($433,200), not out of everything but property
  Insights: [
    { at: 1, was: '$214,838', now: '$214,000', why: 'the account\'s invested part, its cash left out' },
    // the share to two decimals, printed once from a share kept whole (2026-10-27, FX-PF; Q49): 214,000 ÷ 433,200 = 49.40% — it printed 49%
    { at: 2, was: '46%', now: '49.40%', why: '$214,000 of the $433,200 Investments line, to two decimals (Q49)' },
  ],
  // 2026-10-21, MK-NW-M-013 (re-run part 1, T4): Job safety's savings are the emergency fund's cash on Net worth
  // ($12,400 + $18,250.55 + Vanguard's $838 = $31,488.55), not an old savings log nobody fills — so the gap is $2,231
  // 2026-10-25 (FIX-INCOME-B; the rent editor drawn with the app's one band): the property's band is a SectionBand, which says
  // its value to a screen reader in words ("$1,800 a month net") beside the printed "$1,800/month net". The figure did not move
  // and is printed once — $2,400 rent − $600 to run it = $1,800 — the same number is now also what a screen reader says, as on
  // every band of the app. Checked 2026-10-26 (CLEANUP-TESTS): no figure counts the rent twice; "= You keep" $1,800 and
  // $21,600/year (1,800 × 12) are unchanged.
  'Income · rent': [
    { at: 0, was: '$1,800', now: ['$1,800', '$1,800'], why: 'the band\'s value, said ("$1,800 a month net") and printed ("$1,800/month net")' },
  ],
  // 2026-10-27 (FX-CF-C; his words, DEC-8839: "which I am assuming is without accounting for $3K spend. If yes, it should say so";
  // drawing stresstest v03, rows 1 and 2). No figure moved. Three lines now say which cash each box counts: the expense's own box is
  // titled "After the $3,000 expense"; under the months, "$31,489 ÷ ($7,420/month − $1,800/month rent from your property) — your cash
  // today, before the $3,000 expense." ($31,488.55 ÷ $5,620 = 5.60); under the fund, "Measured against $31,489 — your cash today,
  // before the $3,000 expense." The numbers they print are the screen's own, read again where they are said.
  'Stress test': [
    { at: 0, was: '$3,000', now: ['$3,000', '$3,000'], why: 'the bar "After the $3,000 expense", then the verdict "You could cover a $3,000 hit"' },
    { at: 6, was: '5.6', now: ['5.6', '$31,489', '$7,420', '$1,800', '$3,000'], why: 'the months, then the line saying they count the cash before the expense' },
    { at: 13, was: '6', now: ['6', '$31,489', '$3,000'], why: 'the fund, then the line saying it is measured against the cash before the expense' },
  ],
  'Job safety': [
    { at: 0, was: '$33,720', now: '$2,231', why: 'still needed: $33,720 − $31,489' },
    { at: 5, was: '$0', now: '$31,489', why: 'your savings cover — the cash Net worth counts' },
    { at: 17, was: '113', now: '8', why: 'months to close $2,231 at the $300 example pace' },
  ],
};

// THE OLD ANSWER, KEPT (2026-10-31, NW3-06): the Alternatives share read one decimal, worked on the screen — "1.9" then "%"
test.failing('the old answer: Alternatives reads its share of investable assets as 1.9%', () => {
  useStore.getState().resetAll();
  useStore.setState(HOUSEHOLD() as any);
  mockParams = {};
  SCREENS.find((x) => x.name === 'Alternatives')!.open();
  expect(screen.getByText(/of your investable assets/)).toBeOnTheScreen();   // the line is there: the failure below is its figure
  expect(numbers()[2]).toBe('1.9');
});

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
      const wantFigures = before.figures.map((f) => [...f] as [string, string]);
      for (const m of FIGURES_MOVED_ON_PURPOSE[s.name] ?? []) {
        const at = wantFigures.filter(([id, text]) => id === m.id && text === m.was);
        expect([m.id, m.was, at.length > 0]).toEqual([m.id, m.was, true]);
        for (const f of at) f[1] = m.now;
      }
      for (const m of FIGURES_NOW_DECLARED[s.name] ?? []) {
        const i = m.after ? wantFigures.findIndex(([id]) => id === m.after) : -1;
        if (m.after) expect([m.id, m.after, i >= 0]).toEqual([m.id, m.after, true]);   // the figure it follows is in the record
        if (i >= 0) wantFigures.splice(i + 1, 0, [m.id, m.now]); else wantFigures.push([m.id, m.now]);
      }
      expect(now.figures).toEqual(wantFigures);
      const expected = [...before.numbers];
      const shown: (string | string[] | null)[] = [...expected];
      for (const m of MOVED_ON_PURPOSE[s.name] ?? []) { expect(shown[m.at]).toBe(m.was); shown[m.at] = m.now; }
      expect(now.numbers).toEqual(shown.flat().filter((x): x is string => x !== null));
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

/** ONE PLANNED SPEND (2026-10-24, CF-FIX): the emergency fund's planned spend, less the debt minimums, is the Cash flow tab's
 *  twelve planned months added up and divided by 12 — one producer (MK-CF-F-002 over MK-CF-F-008), the figure moved above. */
test('the emergency fund reads the planned spend the Cash flow tab plans: $2,900 every month, April + $3,600, ÷ 12 = $3,200', () => {
  const h = HOUSEHOLD() as any;
  const { theBudgetCounted } = require('../../../MoneyKeel/functions/cashflow/budget-counted');
  const { theEmergencyFund } = require('../../../MoneyKeel/functions/networth-and-performance/emergency-fund');
  const { spendByMonth } = require('../../domain/budget');
  const counted = theBudgetCounted({ profile: h.onboardingProfile, accounts: h.assetAccounts, debts: h.liabilities }).profile;
  const months = spendByMonth(counted);
  expect(months).toEqual([2_900, 2_900, 2_900, 2_900 + 3_600, ...Array(8).fill(2_900)]);
  const fund = theEmergencyFund({ profile: h.onboardingProfile, accounts: h.assetAccounts, debts: h.liabilities, expenses: h.expenses ?? [] });
  const minimums = 2_600 + 1_500 + 150 + 420;
  expect(fund.plannedSpendMonthly - minimums).toBe(months.reduce((t: number, m: number) => t + m, 0) / 12);
  expect(fund.plannedSpendMonthly).toBe((2_900 * 12 + 3_600) / 12 + 4_670);   // 3,200 + 4,670 = 7,870
});
