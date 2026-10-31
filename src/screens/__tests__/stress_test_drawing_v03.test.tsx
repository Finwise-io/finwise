/** THE STRESS TEST, HELD TO ITS DRAWING WORD FOR WORD, IN ORDER, BOTH WAYS — MoneyKeel/documents/other/
 *  moneykeel_pres_mock_stresstest-mock_v03.html, phones A to D (2026-10-27, FX-CF-C).
 *
 *  His words, 2026-10-27 (DEC-8839): "ContributionRoom, Stress Test screens - both are not standard app design as the standard
 *  design says box titles in dark green bar, and sub-titles in light green bar. (2) Stress Test - Phone A - light green box says 4.3
 *  months of essentials and emergency fund says 5.2 months of essentials which I am assuming is without accounting for $3K spend.
 *  If yes, it should say so." He read it right: 4.3 = ($18,000 − $3,000) ÷ $3,470, after the expense; 5.2 = $18,000 ÷ $3,470,
 *  before it; the fund's "at least 3 months" is counted before it too. Each box now says which.
 *
 *  REC2-02 (Cash flow drawing match, round 2): the v02 test checked only that each rendered line was somewhere on the drawn phone,
 *  so a drawn line the screen dropped still passed. Here the drawn lines and the rendered lines are one list, in one order.
 *  And the months agree with Net worth's for the same household (tenet 4): one door, MK-NW-O-004 theEmergencyFund, one figure.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { phoneBlocks, drawnLines, drawnBands, renderedLines, renderedBands, levelSharedFooter } from '../../testing/drawnLines';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [], useFocusEffect: () => {},
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const ROOT = path.join(__dirname, '..', '..', '..');
const MOCK = 'MoneyKeel/documents/other/moneykeel_pres_mock_stresstest-mock_v03.html';
const checking = (balance: number) => ({ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance, asset_class: 'cash' });
const seed = (extra: any) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', birthYear: '1971' }, assetAccounts: [], liabilities: [], expenses: [], incomes: [], ...extra } as any);
};
const ESS = { status: 'employed', birthYear: '1971', monthlySpending: '3470' };
const PHONES_STATES: [string, any][] = [
  ['A · with essentials: $18,000, the $3,000 medical bill, $3,470/month typed', { assetAccounts: [checking(18000)], onboardingProfile: ESS }],
  ['B · no essentials entered: $6,000', { assetAccounts: [checking(6000)] }],
  ['C · the first day: nothing entered', {}],
  ['D · short of the fund: $8,000', { assetAccounts: [checking(8000)], onboardingProfile: ESS }],
];
const PHONES = phoneBlocks(MOCK);
const openStress = (extra: any) => {
  seed(extra);
  const C = require('../StressTestScreen').default;
  return render(<C />);
};

test('the drawing holds four phones, and its READ THIS FIRST is dated 2026-10-27, names his words (DEC-8839) and answers his question', () => {
  expect(PHONES).toHaveLength(PHONES_STATES.length);
  const html = fs.readFileSync(path.join(ROOT, MOCK), 'utf8');
  expect(html).toMatch(/READ THIS FIRST — 2026-10-27/);
  expect(html).toMatch(/DEC-8839/);
  expect(html).toContain('which I am assuming is without accounting for $3K spend. If yes, it should say so.');
  expect(html).toContain('4.3 = ($18,000 − $3,000) ÷ $3,470, after the expense. 5.2 = $18,000 ÷ $3,470, before it');
  // his order of 2026-10-27, "I do not want to reviews screens in blind": the block opens with what he approved before for this
  // screen, his feedback word for word, and what is new for him to look at, item by item — in that order
  const a = html.indexOf('1 · What he approved before for this screen'), b = html.indexOf('2 · His feedback, word for word'), c = html.indexOf('3 · What is new to look at, item by item');
  expect([a > 0, b > a, c > b]).toEqual([true, true, true]);
  expect(html.slice(a, b)).toMatch(/^1 · What he approved before for this screen<\/h2>\s*Nothing\. No approval of/);
  expect((html.slice(c, html.indexOf('The detail, change by change')).match(/<li>/g) ?? []).length).toBeGreaterThanOrEqual(5);
});

describe.each(PHONES_STATES.map(([name, extra], i) => [name, extra, i] as const))('%s', (name, extra, i) => {
  test('every line, word for word and in order, both ways: nothing drawn is missing, nothing rendered is extra', () => {
    openStress(extra);
    const drawn = drawnLines(PHONES[i]);
    const built = levelSharedFooter(renderedLines(screen.toJSON()));
    expect(drawn.length).toBeGreaterThanOrEqual(17);   // a guard proves it looked: top bar to footer
    expect(drawn[0]).toBe('‹ Back');
    expect(drawn[drawn.length - 1]).toMatch(/^Estimates for guidance only/);
    expect(built).toEqual(drawn);
  });
  test('the bars: four box titles on the dark-green bar, two sub-titles on the light-green bar, as drawn', () => {
    openStress(extra);
    const want = drawnBands(PHONES[i]);
    const got = renderedBands(screen.toJSON(), Colors.primaryDeep, Colors.bandLight);
    expect(want.dark).toEqual(['Your cash and the expense', 'After the $3,000 expense', 'If you lost your income', 'Your emergency fund']);
    expect(want.light).toEqual(['Cash you could tap today', 'The surprise expense']);
    expect(got.filter((b) => b.kind === 'dark').map((b) => b.title)).toEqual(want.dark);
    expect(got.filter((b) => b.kind === 'light').map((b) => b.title)).toEqual(want.light);
    for (const b of got) {
      expect(b.titleStyle).toMatchObject({ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: b.kind === 'dark' ? Colors.white : Colors.primaryDeep });
      expect(b.style).toMatchObject({ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginHorizontal: -16 });
    }
    // the tinted verdict box is gone: nothing on the screen is filled with the light verdict green or the light red any more
    const tinted = screen.UNSAFE_root.findAll((n: any) => typeof n.type === 'string' && n.type === 'View'
      && [Colors.redLight].includes(Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean)).backgroundColor));
    expect(tinted).toEqual([]);
  });
});

describe('his question, answered on the screen: which box counts the cash before the expense, and which after (DEC-8839, R2)', () => {
  test('phone A by hand: after, ($18,000 − $3,000) ÷ $3,470 = 4.32 → 4.3; before, $18,000 ÷ $3,470 = 5.19 → 5.2; the fund 3 × $3,470 = $10,410 ≤ $18,000', () => {
    openStress(PHONES_STATES[0][1]);
    const l = renderedLines(screen.toJSON());
    const at = (s: string) => { const k = l.indexOf(s); expect(k).toBeGreaterThan(-1); return k; };
    // the after-box: its bar names the expense, and the 4.3 sits under it
    expect(at('After the $3,000 expense')).toBeLessThan(at('You’d have $15,000 left — about 4.3 months of essentials ($3,470/month — you entered).'));
    // the two boxes that count the cash before it each say so, in one plain line, under their own bar
    const job = at('If you lost your income'), fund = at('Your emergency fund');
    expect(at('5.2 months')).toBeGreaterThan(job);
    expect(at('$18,000 ÷ $3,470/month — your cash today, before the $3,000 expense.')).toBeGreaterThan(job);
    expect(at('$18,000 ÷ $3,470/month — your cash today, before the $3,000 expense.')).toBeLessThan(fund);
    expect(at('Measured against $18,000 — your cash today, before the $3,000 expense.')).toBeGreaterThan(fund);
    expect((18000 - 3000) / 3470).toBeCloseTo(4.3228, 4);
    expect(18000 / 3470).toBeCloseTo(5.1873, 4);
    expect(3 * 3470).toBe(10_410);
  });
  test('the expense changes, the lines follow it: a $1,500 car repair reads "before the $1,500 expense" and "After the $1,500 expense"', () => {
    openStress(PHONES_STATES[0][1]);
    fireEvent.press(screen.getByText('🚗 Car repair'));
    expect(screen.getByText('After the $1,500 expense')).toBeOnTheScreen();
    expect(screen.getByText('$18,000 ÷ $3,470/month — your cash today, before the $1,500 expense.')).toBeOnTheScreen();
    expect(screen.getByText('Measured against $18,000 — your cash today, before the $1,500 expense.')).toBeOnTheScreen();
    expect(screen.getByText('You’d have $16,500 left — about 4.8 months of essentials ($3,470/month — you entered).')).toBeOnTheScreen();   // 16,500 ÷ 3,470 = 4.755
  });
  test('rent from a property: the before line shows the rent coming off, as Net worth does — $21,000 ÷ ($3,000/month − $1,000/month rent)', () => {
    const now = new Date();
    const ago = (k: number) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
    openStress({
      assetAccounts: [checking(21000)],
      expenses: [1, 2, 3, 4, 5, 6, 7].map((k) => ({ id: `e${k}`, amount: 3000, category: 'Groceries', store: 'x', date: ago(k), createdAt: ago(k) })),
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '6000', salaryFreq: 'monthly', salaryMode: 'gross',
        taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4200', rentals: [{ type: 'long', income: '1500', expenses: '500', property_id: 'house' }] },
    });
    expect(screen.getByText('10.5 months')).toBeOnTheScreen();   // 21,000 ÷ (3,000 − 1,000)
    expect(screen.getByText('$21,000 ÷ ($3,000/month − $1,000/month rent from your property) — your cash today, before the $3,000 expense.')).toBeOnTheScreen();
  });
  test('no line says "before the expense" where nothing was counted (phones B and C)', () => {
    for (const s of [PHONES_STATES[1][1], PHONES_STATES[2][1]]) {
      const r = openStress(s);
      expect(screen.queryByText(/before the \$3,000 expense/)).toBeNull();
      r.unmount();
    }
  });
  test.failing('the screen until 2026-10-27, pinned: "5.2" in amber with no word, and nothing saying it is before the expense (FIXED 2026-10-27, DEC-8839)', () => {
    openStress(PHONES_STATES[0][1]);
    expect(screen.getByText('5.2')).toBeOnTheScreen();
  });
  test.failing('the screen until 2026-10-27, pinned: the first day judged a $0 nobody entered — "⚠ A $3,000 hit would put you $3,000 in the red" (FIXED 2026-10-27)', () => {
    openStress(PHONES_STATES[2][1]);
    expect(screen.getByText('⚠ A $3,000 hit would put you $3,000 in the red')).toBeOnTheScreen();
  });
  test('a $0 typed in the box is an answer: the verdict is given', () => {
    openStress(PHONES_STATES[2][1]);
    fireEvent.changeText(screen.getByLabelText('Cash you could tap today'), '0');
    expect(screen.getByText('⚠ A $3,000 hit would put you $3,000 in the red')).toBeOnTheScreen();
    expect(screen.getByText('You’d need $3,000 more to absorb it without borrowing.')).toBeOnTheScreen();
  });
});

// ONE FIGURE ON BOTH SCREENS (tenet 4; R2: months of essentials from ONE door, MK-NW-O-004 theEmergencyFund). The Stress test and Net
// worth are opened on the SAME household and must print the same months, the same word and the same essentials figure — read off
// both rendered screens, and both equal to the door and to the hand-worked number. The essentials word ("you entered") is whatever
// the door says, so a change to it reaches both screens or this fails.
describe('agreement: the Stress test and Net worth print one emergency fund for one household', () => {
  const HOUSEHOLDS: [string, any, string, string][] = [
    ['phone A: $18,000 ÷ $3,470 = 5.19 → 5.2 months, Comfortable', { assetAccounts: [checking(18000)], onboardingProfile: ESS }, '5.2 months', 'Comfortable ✓'],
    ['phone D: $8,000 ÷ $3,470 = 2.31 → 2.3 months, Tight', { assetAccounts: [checking(8000)], onboardingProfile: ESS }, '2.3 months', 'Tight ⚠'],
    ['with a $250 car loan: $18,000 ÷ ($3,470 + $250) = 4.84 → 4.8 months', {
      assetAccounts: [checking(18000)], onboardingProfile: ESS,
      liabilities: [{ debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, minimum_monthly_payment: 250, monthly_payment: 250, interest_rate: 6 }],
    }, '4.8 months', 'Comfortable ✓'],
  ];
  test.each(HOUSEHOLDS)('%s', (_n, household, months, word) => {
    seed(household);
    const st = useStore.getState() as any;
    const door = theEmergencyFund({ accounts: st.assetAccounts, expenses: st.expenses, profile: st.onboardingProfile, debts: st.liabilities });
    expect(`${(Math.round((door.monthsCovered as number) * 10) / 10).toFixed(1)} months`).toBe(months);

    const NetWorthScreen = require('../NetWorthScreen').default;
    const nw = render(<NetWorthScreen />);
    const nwLines = renderedLines(screen.toJSON());
    nw.unmount();
    seed(household);
    const StressTestScreen = require('../StressTestScreen').default;
    render(<StressTestScreen />);
    const stLines = renderedLines(screen.toJSON());

    // the months and the word, on both screens
    expect(nwLines).toContain(months);
    expect(stLines).toContain(months);
    expect(nwLines).toContain(word);
    expect(stLines).toContain(word);
    // the essentials figure and its word: Net worth "… ÷ $X/month essentials — <word>", the Stress test "Covering your $X/month of essentials (<word>)"
    const ess = `$${Math.round(door.essentialsMonthly).toLocaleString('en-US')}/month`;   // money-mask-ok: test expectation, never rendered
    expect(nwLines.some((l) => l.includes(`${ess} essentials — ${door.essentialsBasis}`))).toBe(true);
    expect(stLines.some((l) => l.startsWith(`Covering your ${ess} of essentials (${door.essentialsBasis})`))).toBe(true);
    // the cash both divide: Net worth "$18,000 cash ÷ …", the Stress test "$18,000 ÷ … — your cash today, before the $3,000 expense."
    const cash = `$${Math.round(door.cash).toLocaleString('en-US')}`;   // money-mask-ok: test expectation, never rendered
    expect(nwLines.some((l) => l.includes(`${cash} cash ÷ ${ess} essentials`))).toBe(true);
    expect(stLines).toContain(`${cash} ÷ ${ess} — your cash today, before the $3,000 expense.`);
  });
});
