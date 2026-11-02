/** THE INCOME SCREENS AND SIGN-UP, FIXED TO THEIR DRAWING (2026-10-27, FX-CF-B) — the Cash flow drawing check of 2026-10-27,
 *  items IN2-01 to IN2-13 and workplan row #322, held on the rendered screen where a word-for-word match cannot see them: which
 *  choice is chosen, the colour, size and weight of a line, the bar at the top, and the figures of a budget with a dated bill.
 *  The drawn phones themselves stay held by basepay_matches_v07, income_matches_v07, income_manager_matches_v07 and
 *  filing_matches_v07. Each figure is worked by hand beside it. Drawing: income-end-to-end_v07 (rows of 2026-10-27).
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import FilingStatusScreen, { over65Shown } from '../FilingStatusScreen';
import { renderStep, MONTHLY_SPENDING_LINE } from '../../onboarding/modules';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { builtLines } from '../../testing/mockMatch';
import { plannedMonthlySpend, spendByMonth, annualCashflow } from '../../domain/budget';

let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() },
}));

const ROOT = path.join(__dirname, '..', '..', '..');
const show = (C: any, op: any, props: any = {}, extra: any = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, ...extra } as any);
  render(<C {...props} />);
  return builtLines(screen.toJSON());
};
const styleOf = (text: string | RegExp, i = 0) => StyleSheet.flatten(screen.getAllByText(text)[i].props.style) ?? {};
/** The style of the row a Text sits in: the nearest host View above it laid out as a row. */
const rowStyle = (node: any): Record<string, any> => {
  for (let n = node?.parent; n; n = n.parent) {
    const st = typeof n.type === 'string' ? StyleSheet.flatten(n.props?.style) : null;
    if (st?.flexDirection === 'row') return st;
  }
  return {};
};
const rowOf = (text: string) => rowStyle(screen.getByText(text));
const AGE = (n: number) => String(new Date().getFullYear() - n);
const chosen = (label: string) => screen.getByLabelText(label).props.accessibilityState?.selected;

describe('IN2-10 · phone 14 — "Just me" is chosen for a 67-year-old, as drawn', () => {
  const COUPLE_67 = { hasPartner: 'yes', partnerName: 'Sam', birthYear: AGE(67) };
  test('the screen: Just me chosen, with its line; Both of us and Neither not', () => {
    show(FilingStatusScreen, COUPLE_67, { frame: 'onboarding' });
    expect(chosen('Just me')).toBe(true);
    expect(chosen('Both of us')).toBe(false);
    expect(chosen('Neither')).toBe(false);
    expect(screen.getByText('You are 67, so we have you already.')).toBeOnTheScreen();
  });
  test('sign-up asks it the same way: the step shows Just me chosen before anything is tapped', () => {
    useStore.getState().resetAll();
    const ctx: any = { status: 'employed', tracks: ['partner'], answers: { ...COUPLE_67 }, setAnswer: jest.fn() };
    render(<>{renderStep('filing_status' as any, ctx)}</>);
    expect(chosen('Married filing jointly')).toBe(true);
    expect(chosen('Just me')).toBe(true);
    expect(ctx.setAnswer).not.toHaveBeenCalled();                                     // shown, not written, until Continue or a tap
  });
  test('the answer on record wins; under 65 nothing is chosen — the spouse’s age was never asked', () => {
    expect(over65Shown({ ...COUPLE_67, over65Who: 'both' })).toBe('both');
    expect(over65Shown({ ...COUPLE_67, over65Who: 'neither' })).toBe('neither');
    expect(over65Shown({ hasPartner: 'yes', birthYear: AGE(50) })).toBeNull();
    expect(over65Shown({ hasPartner: 'yes' })).toBeNull();                             // no birth year: not known, not chosen
    show(FilingStatusScreen, { hasPartner: 'yes', partnerName: 'Sam', birthYear: AGE(50) }, { frame: 'onboarding' });
    expect([chosen('Just me'), chosen('Both of us'), chosen('Neither')]).toEqual([false, false, false]);
  });
  test('Save keeps the pre-chosen answer, and moves no figure: the count was already one (over65CountOf, by birth year)', () => {
    show(FilingStatusScreen, { ...COUPLE_67, filingStatus: 'married', baseSalary: '7000', salaryFreq: 'monthly' });
    fireEvent.press(screen.getByLabelText('Save'));
    expect((useStore.getState().onboardingProfile as any).over65Who).toBe('me');
    expect(screen.queryByText('That changes your take-home')).toBeNull();              // nothing moved, so phone 15 is not shown
  });
});

describe('IN2-11 · phones 13 to 15 — the drawn rows with a dot, chosen in green; phone 15’s figures are grey lines', () => {
  test('phone 13: four rows, Single chosen — its label green, the others ink', () => {
    show(FilingStatusScreen, { hasPartner: 'no' }, { frame: 'onboarding' });
    expect(chosen('Single')).toBe(true);
    expect(styleOf('Single').color).toBe(Colors.primaryDark);
    for (const l of ['Married filing jointly', 'Married filing separately', 'Head of household']) {
      expect(chosen(l)).toBe(false);
      expect(styleOf(l).color).toBe(Colors.textPrimary);
    }
  });
  test('phone 15: each figure a small grey line under its row, the status chosen, the box’s figure bold at its own size', () => {
    show(FilingStatusScreen, { hasPartner: 'no', baseSalary: '7000', salaryFreq: 'monthly' }, { frame: 'onboarding' });
    fireEvent.press(screen.getByLabelText('Married filing jointly'));
    fireEvent.press(screen.getByLabelText('Continue'));
    // by hand: single $84,000 − $16,100 = $67,900 → $9,650; jointly $84,000 − $32,200 = $51,800 → $5,720; both over 65
    // $84,000 − $32,200 − $3,300 − $12,000 = $36,500 → $3,884 (G3)
    for (const line of ['$9,650/year — what we were assuming', '$5,720/year', '$3,884/year']) {
      expect(styleOf(line)).toMatchObject({ fontSize: 11, color: Colors.textTertiary });
    }
    expect(screen.getByLabelText('Married filing jointly, $5,720/year, chosen')).toBeOnTheScreen();
    expect(screen.getByLabelText('Taxed as single, $9,650/year — what we were assuming')).toBeOnTheScreen();
    // "$327/month more" bold inside its sentence, at the box's 13 points in ink — it stood alone at 24 points, off the scale
    const fig = styleOf('$327/month more');
    expect(fig).toMatchObject({ fontWeight: '700', color: Colors.textPrimary });   // bold inside a sentence at 700, as drawn (IN3-06, 2026-10-31)
    expect(fig.fontSize ?? 13).toBe(13);
    expect(screen.getByText(/take-home than we were showing you — \$480 if you are both over 65\./)).toBeOnTheScreen();
  });
});

describe('IN2-13 · the filing question opened as a screen carries the MoneyKeel bar, and the navigator draws none above it', () => {
  test('one ‹ Back, the bar’s, and the wordmark', () => {
    show(FilingStatusScreen, { hasPartner: 'no' });
    expect(screen.getAllByLabelText('Back')).toHaveLength(1);
    expect(screen.getByLabelText('MoneyKeel')).toBeOnTheScreen();
    expect(screen.getAllByText('‹ Back')).toHaveLength(1);
  });
  test('app/_layout.tsx declares /filing-status with no header (DEC-0354), beside the other income screens', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const list = layout.match(/\[([^\]]*'income-summary'[^\]]*)\]\.map\(\(name\) => \(\s*<Stack\.Screen key=\{name\} name=\{name\} options=\{\{ headerShown: false \}\}/);
    expect(list).not.toBeNull();
    const names = list![1].match(/'[a-z-]+'/g)!.map((x) => x.slice(1, -1));
    expect(names).toEqual(expect.arrayContaining(['base-pay', 'income-summary', 'income-manager', 'filing-status']));
    expect(names.length).toBeGreaterThanOrEqual(11);                                   // the guard proves it read the list
    expect(fs.readFileSync(path.join(ROOT, 'src', 'screens', 'FilingStatusScreen.tsx'), 'utf8')).toMatch(/<TopBar back \/>/);
  });
});

describe('IN2-01 to IN2-05 · Your base pay as drawn: ink labels, one size for every figure, the drawn total row, the two greys', () => {
  const HOUSE = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam',
    whoEarns: 'both', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' } };
  test('phone 2: row labels ink; "= Take-home" green at the rows’ 15 points, bold, under the drawn rule', () => {
    show(BasePayScreen, HOUSE);
    for (const l of ['Gross /year', 'Federal tax bracket']) expect(styleOf(l).color).toBe(Colors.textPrimary);
    expect(styleOf('$138,000').fontSize).toBe(15);
    // by hand: $5,000 + $3,300 = $8,300
    const total = styleOf('$8,300/month', 1);                                          // [0] is the band's total
    expect(total).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.gainText });
    expect(rowOf('= Take-home')).toMatchObject({ borderTopWidth: 1.5, borderTopColor: Colors.textPrimary });
  });
  test('phone 5: "Everything else taken out" is a total row — bold, ink, under the rule; a hint the darker grey, a closed line the lighter', () => {
    show(BasePayScreen, HOUSE);
    // by hand: $7,000 − $800 − $5,000 = $1,200 a month
    const label = screen.getAllByText('Everything else taken out');
    const open = label[0];                                                              // the open section's, above the household card
    expect(StyleSheet.flatten(open.props.style)).toMatchObject({ fontWeight: '800', color: Colors.textPrimary });
    expect(rowStyle(open)).toMatchObject({ borderTopWidth: 1.5 });
    expect(styleOf('$1,200/month')).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.textPrimary });
    expect(styleOf('Before anything comes out.').color).toBe(Colors.textSecondary);                     // #6B6B66, as drawn
    expect(styleOf(/^Monthly · the same each month · take-home \$3,300$/).color).toBe(Colors.textTertiary);   // Sam’s, closed: #76766F
  });
  test('phone 6: the month names in the pay table are regular', () => {
    show(BasePayScreen, { ...HOUSE, partnerWage: { ...HOUSE.partnerWage, salaryFreq: 'biweekly', baseSalary: '2077', salaryMonthMode: 'months' } });
    fireEvent.press(screen.getAllByText('Edit ⌄')[0]);                                // open Sam's section
    const month = screen.getAllByText(/^[A-Z][a-z]{2} \d{2}$/);
    expect(month.length).toBe(14);                                                      // fourteen months, last month to twelve ahead
    for (const m of month) expect(StyleSheet.flatten(m.props.style).fontWeight).toBe('400');
  });
});

describe('IN2-01, 02, 03, 05, 06 · Bonus, Rent, Interest and the Income summary as drawn', () => {
  const HOUSE = {
    baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    filingStatus: 'married', taxMode: 'manual', manualTaxRate: '24',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
    rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }], invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12,
    incomeSources: ['employment', 'rental', 'investment_income'],
  };
  const open = (o: string) => { mockOpen = o; return show(IncomeManagerScreen, HOUSE); };
  test('phone 9: December a plain row — its name regular ink, its figure green at 15', () => {
    open('bonus');
    expect(styleOf('December')).toMatchObject({ color: Colors.textPrimary });
    expect(styleOf('December').fontWeight).toBeUndefined();                            // regular, as drawn
    // by hand: $9,500 + $12,000 × (1 − 24%) = $18,620
    expect(styleOf('$18,620')).toMatchObject({ fontSize: 15, color: Colors.gainText });
    expect(styleOf('Before tax. A typical year if it varies.').color).toBe(Colors.textSecondary);
  });
  test('phone 10: "= You keep" bold green at the rows’ size under the rule', () => {
    open('rental');
    // by hand: $1,800 − $600 = $1,200
    expect(styleOf('$1,200/month')).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.gainText });
    expect(rowOf('= You keep')).toMatchObject({ borderTopWidth: 1.5 });
  });
  test('phone 11: the first sentence bold, in one box with the second', () => {
    open('dividends');
    const first = screen.getByText('Interest and dividends are counted as income you are taxed on, not money you can spend.');
    expect(StyleSheet.flatten(first.props.style).fontWeight).toBe('700');   // as drawn (IN3-06, 2026-10-31)
    expect(first.parent?.parent).toBeTruthy();
    expect(screen.getByText(/not money you can spend\. They are normally reinvested where they are earned/)).toBeOnTheScreen();
  });
  test('phone 12: a closed line the lighter grey', () => {
    open('');
    expect(styleOf(/^You and Sam · take-home/).color).toBe(Colors.textTertiary);
  });
  test('phone 16: labels ink, December dim; every total at the rows’ 15 points, bold, under the rule', () => {
    show(IncomeSummaryScreen, HOUSE);
    for (const l of ['Your pay', 'Sam’s pay', 'Your gross', 'Federal tax bracket']) expect(styleOf(l).color).toBe(Colors.textPrimary);
    expect(styleOf('December').color).toBe(Colors.textSecondary);
    // by hand: $5,000 + $3,300 + $1,200 = $9,500; $84,000 + $54,000 + $14,400 + $3,000 + $12,000 = $167,400; less $14,400 = $153,000
    expect(styleOf('$9,500', 1)).toMatchObject({ fontSize: 15, fontWeight: '800', color: Colors.gainText });
    expect(styleOf('$167,400')).toMatchObject({ fontSize: 15, fontWeight: '800' });
    expect(rowOf('= Gross /year')).toMatchObject({ borderTopWidth: 1.5 });
  });
});

describe('IN2-12 · Income summary with nothing entered — the door once', () => {
  test('"Add your income ›" once, under the first heading; the second keeps $0 and the sentence', () => {
    const L = show(IncomeSummaryScreen, {});
    expect(L.filter((l) => /Add your income/.test(l))).toHaveLength(1);
    expect(L.slice(L.indexOf('Your income')).join(' ')).toBe('Your income Everything coming in, and what reaches your bank Take-home each month $0 '
      + 'Nothing entered yet. Add your income › What it is taxed on $0 Nothing entered yet.');
  });
});

describe('#322 · sign-up’s average monthly expenses — a yearly bill given its month is counted once', () => {
  // the worked example of the v07 row of 2026-10-27: $2,000 a month typed, a $1,200 car insurance bill given December, take-home $4,000
  const ANSWERS: any = { incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', landsTypical: '4000', monthlySpending: '2000',
    spendCats: [{ id: 'c1', label: 'Car insurance', tier: 'important', bucket: 'nonmonthly', unit: 'dollar', amount: '1200', custom: true, months: [12] }] };
  const budget = (answers: any) => {
    useStore.getState().resetAll();
    render(<>{renderStep('flexBuckets' as any, { status: 'employed', tracks: ['spend'], answers, setAnswer: jest.fn() } as any)}</>);
    return builtLines(screen.toJSON());
  };
  test('the question says what the figure holds — a yearly bill as a twelfth, unless it is given its month', () => {
    useStore.getState().resetAll();
    render(<>{renderStep('monthlySpending' as any, { status: 'employed', tracks: ['spend'], answers: {}, setAnswer: jest.fn() } as any)}</>);
    expect(screen.getByText('What are your average monthly expenses?')).toBeOnTheScreen();
    expect(screen.getByText(MONTHLY_SPENDING_LINE)).toBeOnTheScreen();
    expect(MONTHLY_SPENDING_LINE).toBe('Roughly what leaves your account each month, a yearly bill counted as a twelfth ($1,200/year is $100/month). '
      + 'A bill you give its own month in your budget is counted in that month instead — leave it out of this figure.');
  });
  test('the months: eleven at $2,000 and December $3,200; the year $25,200, $2,100 a month', () => {
    const m = spendByMonth(ANSWERS);
    expect(m.slice(0, 11)).toEqual(Array(11).fill(2000));
    expect(m[11]).toBe(3200);
    expect(m.reduce((t, x) => t + x, 0)).toBe(25_200);                                 // 11 × 2,000 + 3,200
    expect(plannedMonthlySpend(ANSWERS)).toBe(2100);                                   // 25,200 ÷ 12
  });
  test('Your budget reads the recap’s $2,100: Uncategorized $2,000, the bill $100 on top, Surplus $1,900', () => {
    const L = budget(ANSWERS);
    const at = (label: string) => L[L.indexOf(label) + 1];
    expect(at('Take-home')).toBe('$4,000');
    expect(at('Itemized')).toBe('$100');                                                // $1,200 ÷ 12
    expect(at('Uncategorized (from your estimate)')).toBe('$2,000');                   // was $1,900 — the bill taken out of the $2,000
    expect(at('Surplus')).toBe('$1,900');                                               // $4,000 − $2,100; was $2,000
    expect(L).toContain('$1,900/month left to save.');
    expect(L).toContain('Counted in Dec — leave it out of the monthly expenses you entered earlier.');
    // ONE FIGURE: the budget step, MK-CF-F-002 and the recap's year agree — the recap prints the year, $25,200
    expect(annualCashflow(ANSWERS).spendYr).toBe(25_200);
    expect(4000 - plannedMonthlySpend(ANSWERS)).toBe(1900);
  });
  test('a yearly bill given no month stays a twelfth inside the figure typed, as before: Uncategorized $1,900, Surplus $2,000', () => {
    const undated = { ...ANSWERS, spendCats: [{ ...ANSWERS.spendCats[0], months: [] }] };
    const L = budget(undated);
    const at = (label: string) => L[L.indexOf(label) + 1];
    expect(at('Uncategorized (from your estimate)')).toBe('$1,900');                   // $2,000 − $100
    expect(at('Surplus')).toBe('$2,000');                                               // $4,000 − $2,000
    expect(plannedMonthlySpend(undated)).toBe(2000);
    expect(L.join(' ')).not.toMatch(/Counted in/);
  });
});

// THE OLD ANSWER, KEPT (2026-10-27): the budget step took a dated bill out of the figure typed
test.failing('#322, as it read before 2026-10-27 — Uncategorized $1,900 and Surplus $2,000 beside a recap of $2,100', () => {
  useStore.getState().resetAll();
  const answers: any = { incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', landsTypical: '4000', monthlySpending: '2000',
    spendCats: [{ id: 'c1', label: 'Car insurance', tier: 'important', bucket: 'nonmonthly', unit: 'dollar', amount: '1200', custom: true, months: [12] }] };
  render(<>{renderStep('flexBuckets' as any, { status: 'employed', tracks: ['spend'], answers, setAnswer: jest.fn() } as any)}</>);
  const L = builtLines(screen.toJSON());
  expect(L[L.indexOf('Uncategorized (from your estimate)') + 1]).toBe('$1,900');
});

describe('Q49 in sign-up · every share printed as a percent reads to two decimals (the v07 row of 2026-10-27)', () => {
  // the worked example: $2,000 a month typed, a $1,200 bill given December, take-home $4,000 typed on $5,000 a month gross
  const A: any = { incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', landsTypical: '4000', monthlySpending: '2000',
    spendCats: [{ id: 'c1', label: 'Car insurance', tier: 'important', bucket: 'nonmonthly', unit: 'dollar', amount: '1200', custom: true, months: [12] }] };
  const step = (id: string, answers: any, tracks = ['spend']) => {
    useStore.getState().resetAll();
    render(<>{renderStep(id as any, { status: 'employed', tracks, answers, setAnswer: jest.fn() } as any)}</>);
    return builtLines(screen.toJSON());
  };
  test('the expenses step, the budget, the savings step, the full recap and the retirement place', () => {
    expect(step('monthlySpending', A)).toEqual(expect.arrayContaining(['That’s 50.00% of your monthly income', 'You keep 50.00% to save & invest — healthy.']));   // 2,000 ÷ 4,000
    screen.unmount();
    expect(step('flexBuckets', A)).toContain('52.50% of your take-home is spoken for');                                 // 2,100 ÷ 4,000
    screen.unmount();
    expect(step('savingsRateTarget', A)).toContain('~$1,900/month average · 47.50% of take-home');                      // 1,900 ÷ 4,000
    screen.unmount();
    // by hand: $60,000 gross, $12,000 tax (20.00%), $25,200 of expenses (42.00%), $22,800 surplus (38.00%)
    const R = step('recap_spend', A);
    expect(R).toEqual(expect.arrayContaining(['38.00%', 'Tax · ~20.00% of gross', 'Expenses · 42.00% of gross', '~20.00% goes to tax.', '−$25,200']));
    screen.unmount();
    expect(step('retLocation', { retLocation: 'Canada' }, ['retire_acc'])).toContain('Canada: about 15.00% cheaper than the US average');   // 1 − 0.85
    screen.unmount();
    // the bracket is a published rate and stays whole
    expect(step('income_tax', { ...A, taxMode: 'system' }).join(' ')).toMatch(/ · (10|12|22)% bracket/);
  });
});
