/** THE INCOME SCREENS' DRAWING CHECK, FIXED (2026-10-25, CF-MMFIX-B) — the items IN-01 to IN-20 of the Cash flow drawing check
 *  of 2026-10-24 that the drawn phones do not reach on their own: an empty profile, the profile as it loads, the sign-up shell,
 *  the rendered colours and edges. The drawn phones themselves are held, figure for figure, by basepay_matches_v07,
 *  income_matches_v07, income_manager_matches_v07 and filing_matches_v07. Each fix carries a dated READ THIS FIRST row on
 *  income-end-to-end_v07 (and filing-status-question_v03). Every figure here is worked by hand beside it.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import FilingStatusScreen from '../FilingStatusScreen';
import OnboardingScreen from '../OnboardingScreen';
import { useStore } from '../../store/useStore';
import { Colors, Spacing } from '../../utils/theme';
import { builtLinesWithBoxes, normPrinted } from '../../testing/mockMatch';
import { buildSteps } from '../../onboarding/steps';
import { wageMatchMonthly } from '../../domain/income';
import { amountInBox, plainAmount } from '../../components/MoneyBox';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';

let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() },
}));

const show = (C: any, op: any, props: any = {}, extra: any = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false, ...extra } as any);
  render(<C {...props} />);
  return builtLinesWithBoxes(screen.toJSON());
};
const run = (lines: string[], from: RegExp, to?: RegExp) => {
  const a = lines.findIndex((l) => from.test(l));
  expect(a).toBeGreaterThanOrEqual(0);
  const b = to ? lines.findIndex((l, i) => i > a && to.test(l)) : lines.length - 1;
  expect(b).toBeGreaterThan(a);
  return normPrinted(lines.slice(a, b + 1));
};
const flat = (node: any) => StyleSheet.flatten(node?.props?.style) ?? {};
/** The View a Text sits in: the test renderer's parent of the host Text. */
const holder = (text: string) => screen.getByText(text).parent?.parent ?? null;

describe('IN-08 · Your base pay with nothing entered — the one line and its door (Q48), never ~$0 or a bracket of nothing', () => {
  test('one earner: "$0/month", "Nothing entered yet. Add your income", and no rows, no warning, no rate question', () => {
    const L = show(BasePayScreen, {});
    expect(run(L, /^Your household$/)).toBe('Your household $0/month Nothing entered yet. Add your income Save');
    expect(L.join(' ')).not.toMatch(/~|Federal tax bracket|10%|Calculated federal tax|roughly \$0|The tax rate you want us to use/);
  });
  test('two earners with nothing entered: no tick beside either, and the door opens the first person’s questions', () => {
    const L = show(BasePayScreen, { hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both' });
    expect(L).not.toContain('✓');                                                      // a tick is a finished section
    fireEvent.press(screen.getByText('Done ⌃'));                                       // close yours …
    expect(screen.queryByText('How often you are paid')).toBeNull();
    fireEvent.press(screen.getByText('Add your income ›'));                             // … and the door opens it again
    expect(screen.getByText('How often you are paid')).toBeOnTheScreen();
  });
  test('one earner entered, one not: the one with nothing is not "~$0 calculated" — the card speaks of yours alone', () => {
    const L = show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both' });
    // by hand: $7,000 − $800 − $5,000 = $1,200 of everything else, 17% of $7,000; the take-home is $5,000, yours, as entered
    expect(L).toContain('This is what you entered — nothing here is calculated.');
    expect(L.join(' ')).not.toMatch(/~\$0|Sam’s take-home/);
    expect(run(L, /^Your household$/, /^= Take-home$/)).toBe(
      'Your household $5,000/month Gross /year both wages $84,000 Federal tax bracket assumed filing jointly — both of you earn 12% '
      + 'Everything else taken out what you entered $1,200/month · 17.14% = Take-home');   // $1,200 ÷ $7,000 = 17.14%, two decimals since 2026-10-26 (MK-CF-M-081)
  });
});

describe('IN-03 · ~ marks the app’s own estimate, on every income screen, and never a figure worked from his own rate', () => {
  const COUPLE = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } };
  test('the calculated rate: Your base pay and the Income summary print one figure in one form, ~$9,427', () => {
    // by hand: $123,600 taxed − $32,200 = $91,400 → 10% × $24,800 + 12% × $66,600 = $10,472 a year, 7.59% of $138,000;
    // You $7,000 × (1 − 7.59%) − $800 = $5,669; Sam $4,500 × (1 − 7.59%) − $400 = $3,759; together $9,427
    const S = show(IncomeSummaryScreen, COUPLE);
    expect(run(S, /^Take-home each month$/, /^= Inflow/)).toBe('Take-home each month ~$9,427 Your pay after tax and 401(k) ~$5,669 Sam’s pay after tax and 401(k) ~$3,759 = Inflow (income (take-home))');
    expect(S[S.indexOf('= Inflow (income (take-home))') + 1]).toBe('~$9,427');
    const B = show(BasePayScreen, COUPLE);
    expect(B[B.indexOf('Your household') + 1]).toBe('~$9,427/month');
  });
  test('his rate typed: the same household reads $7,540 on both, with no ~ — the rows say whose rate it is', () => {
    const S = show(IncomeSummaryScreen, { ...COUPLE, taxMode: 'manual', manualTaxRate: '24' });
    // by hand: $7,000 × 76% − $800 = $4,520; $4,500 × 76% − $400 = $3,020; $7,540
    expect(run(S, /^Take-home each month$/, /^= Inflow/)).toBe('Take-home each month $7,540 Your pay after tax and 401(k) $4,520 Sam’s pay after tax and 401(k) $3,020 = Inflow (income (take-home))');
    expect(S.join(' ')).not.toContain('~');
    // the Cash flow tab reads the same mark from the same rows (its source line: MK-CF-O-004, `estimated`)
    expect(incomeSummary({ ...COUPLE, taxMode: 'manual', manualTaxRate: '24' } as any).lands.lines.map((l) => l.estimated)).toEqual([false, false]);
    expect(incomeSummary(COUPLE as any).lands.lines.map((l) => l.estimated)).toEqual([true, true]);
  });
  test('one take-home typed, one worked from his rate: "Sam’s take-home: $3,020 (calculated at your 24% rate, less 401(k))", no ~', () => {
    const L = show(BasePayScreen, { ...COUPLE, landsTypical: '5000', taxMode: 'manual', manualTaxRate: '24' });
    expect(L.join(' ')).toContain('Your take-home: $5,000 (you entered) Sam’s take-home: $3,020 (calculated at your 24.00% rate, less 401(k))');   // two decimals since 2026-10-26
  });
});

describe('IN-04, IN-05, IN-06 · the boxes', () => {
  test('a match typed with neither choice tapped is the choice the screen shows chosen, % of theirs: 50 beside $800 is $400', () => {
    expect(wageMatchMonthly({ c_401k: '800', employerMatchValue: '50' })).toBe(400);                 // it read $50
    expect(wageMatchMonthly({ c_401k: '800', employerMatchValue: '150', employerMatchMode: 'dollar' })).toBe(150);
    const L = show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', employerMatchValue: '50' });
    expect(screen.getByLabelText('% of theirs').props.accessibilityState.selected).toBe(true);
    expect(L).toContain('50% · $400/month');
  });
  test('a box shows "$7,000" while the profile keeps "7000"; typing a thousands mark or a $ still keeps the plain amount', () => {
    show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly' });
    expect(screen.getByLabelText('Gross pay each month').props.value).toBe('$7,000');
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '$7,2500');               // a digit typed after "$7,250"
    expect((useStore.getState().onboardingProfile as any).baseSalary).toBe('72500');
    expect(screen.getByLabelText('Gross pay each month').props.value).toBe('$72,500');
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '$72,50');                 // a digit taken away
    expect((useStore.getState().onboardingProfile as any).baseSalary).toBe('7250');
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), 'about 7k');               // words are refused whole
    expect((useStore.getState().onboardingProfile as any).baseSalary).toBe('7250');
    expect([amountInBox('1850.'), amountInBox('1850.5'), amountInBox(''), amountInBox('0'), plainAmount('$1,2.3.4')]).toEqual(['$1,850.', '$1,850.5', '', '$0', '12.34']);
  });
  test('a month not typed shows the month the app counts — $2,077 a fortnight is $4,500 — and clearing a typed month gives it back', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    jest.setSystemTime(new Date(2026, 7, 20, 12));
    show(BasePayScreen, { baseSalary: '2077', salaryFreq: 'biweekly', salaryMonthMode: 'months', salaryByMonth: { '2026-09': '6000' } });
    expect(screen.getByLabelText('Oct 26 gross pay').props.placeholder).toBe('$4,500');           // $2,077 × 26 ÷ 12 = $4,500.17
    expect(screen.getByLabelText('Sep 26 gross pay').props.value).toBe('$6,000');
    fireEvent.changeText(screen.getByLabelText('Sep 26 gross pay'), '');
    expect((useStore.getState().onboardingProfile as any).salaryByMonth).toEqual({});              // untyped again, not a typed $0
    expect(screen.getByLabelText('Sep 26 gross pay').props.placeholder).toBe('$4,500');
    // a month TYPED $0 is an answer: kept as typed, shown "$0", and the year counts it $0 (the lead's ruling, CFR-5 F7)
    fireEvent.changeText(screen.getByLabelText('Oct 26 gross pay'), '0');
    expect((useStore.getState().onboardingProfile as any).salaryByMonth).toEqual({ '2026-10': '0' });
    expect(screen.getByLabelText('Oct 26 gross pay').props.value).toBe('$0');
    // by hand: this year = 11 × $4,500.17 + $0 = $49,501.83 → "$49,502" (Gross /year, one earner)
    const L = builtLinesWithBoxes(screen.toJSON());
    expect(L[L.indexOf('Gross /year') + 1]).toBe('$49,502');
    jest.useRealTimers();
  });
});

describe('IN-09 · a take-home typed the old way is converted when the profile loads — on the phone and from the cloud', () => {
  // the founder's household: $5,000 typed as take-home before 2026-08-28, with his own 0%
  const OLD = { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
  const converted = (p: any) => {
    // by hand: 0% → gross = ($60,000 + 0) ÷ (1 − 0) = $60,000 a year, $5,000 a month; the take-home stays $5,000
    expect(p.salaryMode).toBe('gross');
    expect(Number(p.baseSalary)).toBeCloseTo(5000, 9);
    expect(p.landsTypical).toBe('5000');
    expect(p.grossWorkedBack).toBe(true);
  };
  test('the phone’s own copy, as the app opens', () => {
    const merge = (useStore as any).persist.getOptions().merge;
    converted(merge({ onboardingProfile: OLD }, useStore.getState()).onboardingProfile);
  });
  test('the cloud copy', () => {
    useStore.getState().resetAll();
    useStore.getState().loadFromCloud({ onboardingProfile: OLD } as any);
    converted(useStore.getState().onboardingProfile);
  });
  test('and Your base pay then reads the 2026-10-24 row’s words from the first open', () => {
    useStore.getState().resetAll();
    useStore.getState().loadFromCloud({ onboardingProfile: OLD } as any);
    useStore.setState({ onboardingComplete: true, hideBalances: false } as any);
    render(<BasePayScreen />);
    const L = builtLinesWithBoxes(screen.toJSON());
    expect(L).toContain('~ Worked back from the take-home you entered. Type the gross from a payslip to replace it.');
    expect(screen.getByLabelText('Gross pay each month').props.value).toBe('$5,000.00');
    expect(screen.getByLabelText('Your take-home each month').props.value).toBe('$5,000');
    expect(run(L, /^Your household$/)).toBe('Your household $5,000/month Gross /year $60,000 Federal tax bracket what your next dollar costs 12% '
      + 'Everything else taken out what you entered $0/month · 0.00% = Take-home $5,000/month The take-home is what you entered; the gross was worked back from it. Save');
    expect(L.join(' ')).not.toMatch(/Calculated federal tax|We’ll calculate/);
  });
});

describe('IN-12, IN-17 · no untrue or empty words', () => {
  test('Your income, a fresh account: no count of no sources; the one line and its door, and the ten sources', () => {
    mockOpen = undefined;
    const L = show(IncomeManagerScreen, {});
    expect(L.join(' ')).not.toMatch(/You entered about|0 sources/);
    expect(L).toContain('Nothing entered yet. Add your income ›');
    expect(L.filter((l) => /^(A job \(wages or salary\)|Self-employed \/ side gig|Something else)$/.test(l))).toHaveLength(3);
  });
  test('the filing question with nothing entered says so; an answer on record is named as theirs', () => {
    show(FilingStatusScreen, {});
    expect(screen.getByText(/^Set to Single because you have not entered a spouse\. Change it if that is not right\.$/)).toBeOnTheScreen();
    show(FilingStatusScreen, { filingStatus: 'hoh' });
    expect(screen.getByText(/^Set to Head of household because you entered it\.$/)).toBeOnTheScreen();
    show(FilingStatusScreen, { hasPartner: 'no' });
    expect(screen.getByText(/^Set to Single because you entered it is just you\. Change it if that is not right\.$/)).toBeOnTheScreen();
    show(FilingStatusScreen, { hasPartner: 'yes', partnerName: 'Sam', filingStatus: 'married' });
    expect(screen.getByText(/^Set to Married filing jointly because you entered Sam\.$/)).toBeOnTheScreen();
  });
});

describe('IN-07, IN-18 · inside sign-up, as drawn: the title, Continue, no Skip on a pre-answered question, no household card', () => {
  const at = (step: string) => {
    const answers = { incomeSources: ['employment'], baseSalary: '7000', salaryFreq: 'monthly' };
    const stepIndex = buildSteps('employed', ['spend'], answers).indexOf(step as any);
    expect(stepIndex).toBeGreaterThan(0);
    useStore.getState().resetAll();
    useStore.setState({ user: { uid: 't', email: 't@t.com', name: 'T' }, onboardingComplete: false,
      onboardingDraft: { stepIndex, status: 'employed', tracks: ['spend'], name: 'T', answers } } as any);
    render(<OnboardingScreen />);
  };
  test('the filing step: "Continue" and no "Skip for now" — Continue keeps the pre-answer', () => {
    at('filing_status');
    expect(screen.getByText('How do you file your taxes?')).toBeOnTheScreen();
    expect(screen.getByText('Continue')).toBeOnTheScreen();
    expect(screen.queryByText('Continue →')).toBeNull();
    expect(screen.queryByText('Skip for now')).toBeNull();
    expect(screen.getByText('← Back')).toBeOnTheScreen();                                 // the way back stays (decided 2026-10-25)
  });
  test('the base-pay step: titled "Your base pay", and no household card or rate question (sign-up’s Taxes step asks it)', () => {
    at('income_salary');
    expect(screen.getByText('Your base pay')).toBeOnTheScreen();
    expect(screen.queryByText('Your household')).toBeNull();
    expect(screen.queryByText('The tax rate you want us to use')).toBeNull();
    expect(screen.getByText('Continue')).toBeOnTheScreen();
  });
});

describe('IN-13, IN-14, IN-15 · the rendered bands, edges and colours, as drawn', () => {
  test('Your base pay: dark bands for the groups, the light band for the household, every total on the rows’ right edge', () => {
    show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
      partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' } });
    const dark = ['Who earns a wage?', 'Each person’s pay'].map((t) => flat(holder(t)));
    for (const b of dark) expect(b.backgroundColor).toBe(Colors.primaryDeep);
    const light = flat(holder('Your household'));
    expect(light.backgroundColor).toBe(Colors.bandLight);
    // one right edge (DEC-0093): the bar bleeds the group's padding and pads itself by it, so its total ends where the rows end
    for (const b of [...dark, light]) { expect(b.marginHorizontal).toBe(-Spacing.base); expect(b.paddingHorizontal).toBe(Spacing.base); }
    expect(flat(screen.getAllByText('$8,300/month')[0]).marginRight ?? 0).toBe(0);
    // square, edge to edge (DEC-0079): the group under a bar has no rounded corner
    expect(flat(holder('Your household')?.parent).borderRadius ?? 0).toBe(0);
    expect(flat(screen.getAllByText('$8,300/month')[1]).color).toBe(Colors.gainText);   // "= Take-home" green
    expect(flat(screen.getAllByText('Edit ⌄')[0])).toMatchObject({ color: Colors.primary, fontWeight: '800' });
    expect(flat(screen.getByText(/is your own figures/))).toMatchObject({ backgroundColor: Colors.blueLight, borderLeftColor: Colors.blue, color: Colors.textPrimary });
  });
  test('the Income summary and the editors: the drawn bands, "= Inflow" and "= You keep" green, a filled "Add another property"', () => {
    const HOUSE = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }] };
    show(IncomeSummaryScreen, HOUSE);
    expect(flat(holder('Take-home each month')).backgroundColor).toBe(Colors.primaryDeep);
    expect(flat(holder('What it is taxed on')).backgroundColor).toBe(Colors.bandLight);
    // by hand: $5,000 + $1,200 = $6,200
    expect(flat(screen.getAllByText('$6,200').slice(-1)[0]).color).toBe(Colors.gainText);
    mockOpen = 'rental';
    show(IncomeManagerScreen, HOUSE);
    expect(flat(holder('The property')).backgroundColor).toBe(Colors.primaryDeep);
    expect(flat(screen.getByText('$1,200/month')).color).toBe(Colors.gainText);
    expect(flat(screen.getByLabelText('Add another property')).backgroundColor).toBe(Colors.primary);
    mockOpen = undefined;
  });
});

describe('found by the outside measure (CFR-5, 2026-10-25), in these screens — the coordinator’s list', () => {
  const ONE = { status: 'employed', incomeSources: ['employment'], birthYear: '1975', filingStatus: 'single', whoEarns: 'you', baseSalary: '5000', salaryFreq: 'monthly', c_401k: '400' };
  test('F3 · the band is read on everything entered, and "add … later" names only what is not entered yet', () => {
    // by hand: $60,000 of wages + ($2,000 − $0) × 12 = $24,000 of rent kept = $84,000 entered
    const L = show(BasePayScreen, { ...ONE, incomeSources: ['employment', 'rental'], rentals: [{ type: 'long', income: '2000', expenses: '0', property_id: 'p' }] });
    const said = L.join(' ');
    expect(said).toContain('using your tax band read on the $84,000 you have entered so far — add a bonus or a spouse’s wage later and the band is calculated again');
    expect(said).not.toMatch(/add rent/);
    // all three entered (rent, a bonus, a spouse's wage): the clause is left off
    const all = show(BasePayScreen, { ...ONE, filingStatus: 'married', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both', bonusAnnual: '12000',
      partnerWage: { baseSalary: '4000', salaryFreq: 'monthly' }, rentals: [{ type: 'long', income: '2000', expenses: '0', property_id: 'p' }] }).join(' ');
    // by hand: $60,000 + $48,000 + $24,000 + $12,000 = $144,000 entered
    expect(all).toContain('using your tax band read on the $144,000 you have entered. It knows nothing about your state');
    expect(all).not.toMatch(/later and the band/);
  });
  test('F6 · a month with no pay is not reconciled, and a month that is wrong is named in words', () => {
    const year = (v: (i: number) => any) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}`, v(i)]));
    // July to December $10,000.05, January to June typed $0, $501.13 into the 401(k), $3,799.17 taken home: $10,000.05 − $501.13
    // − $3,799.17 = $5,699.75 of everything else in each paid month — the figures hold
    const PART = { ...ONE, baseSalary: '10000.05', salaryMonthMode: 'months', c_401k: '501.13', landsTypical: '3799.17', salaryByMonth: year((i) => (i < 6 ? 0 : 10000.05)) };
    let L = show(BasePayScreen, PART).join(' ');
    expect(L).not.toMatch(/cannot all be right/);
    // one paid month too small: July $4,000 − $501.13 = $3,498.87, less than the $3,799.17 taken home
    L = show(BasePayScreen, { ...PART, salaryByMonth: { ...PART.salaryByMonth, '2026-07': 4000 } }).join(' ');
    expect(L).toContain('These three cannot all be right in July 2026. $4,000 gross, less $501 into your 401(k), leaves $3,499');
    expect(L).not.toMatch(/in 2026-\d\d/);
  });
  test('t8 · a 5.00% state rate entered: "Calculated tax", its line names both, and nothing says it knows nothing about your state', () => {
    // by hand: $60,000 − $4,800 − $16,100 = $39,100 taxed; federal $1,240 + 12% × $26,700 = $4,444 ($370.33 a month); state 5% ×
    // $39,100 = $1,955 ($162.92); together $6,399 a year, $533.25 a month → ≈$533
    const B = show(BasePayScreen, { ...ONE, stateTaxRate: '5' });
    expect(run(B, /^Calculated tax$/, /^~\$533\/month$/)).toBe('Calculated tax federal income tax, plus the 5.00% state rate you entered; assumes you take the standard deduction ~$533/month');
    const said = B.join(' ');
    expect(said).toContain('Only federal income tax and the 5.00% state rate you entered are taken out here.');
    expect(said).toContain('It holds the 5.00% state rate you entered but knows nothing about your insurance');
    expect(said).not.toMatch(/Calculated federal tax|knows nothing about your state|your state may take more/);
    const S = show(IncomeSummaryScreen, { ...ONE, stateTaxRate: '5' });
    expect(run(S, /^Calculated tax$/, /^~\$6,399\/year$/)).toBe('Calculated tax assumes you take the standard deduction ~$6,399/year');
    expect(S).toContain('Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.');
    // with none entered, the federal-only words stand
    expect(show(BasePayScreen, ONE)).toContain('Calculated federal tax');
  });
});

describe('Monthly income (MK-CF-M-024, MK-CF-M-069, test 5) · a Plan estimate of Social Security is not this month’s income', () => {
  const MonthlyIncomeScreen = require('../MonthlyIncomeScreen').default;
  // a worker whose Plan step entered a $2,900 Social Security estimate, claimed later; no answer to "I receive it" on record
  const WORKER_SS = { status: 'employed', incomeSources: ['employment'], birthYear: '1968', baseSalary: '8000', salaryFreq: 'monthly', ri_ss: '2900', ri_ss_freq: 'monthly' };
  const save = (op: any, choose?: string) => {
    show(MonthlyIncomeScreen, op);
    if (choose) fireEvent.press(screen.getByText(choose));
    fireEvent.press(screen.getByLabelText('Save monthly income'));
    return useStore.getState().onboardingProfile as any;
  };
  test('it opens on "Not yet", and the guaranteed income it shows is what arrives now: $0', () => {
    const L = show(MonthlyIncomeScreen, WORKER_SS);
    expect(screen.getAllByRole('radio').slice(0, 2).map((r) => r.props.accessibilityState.selected)).toEqual([false, true]);   // I receive it · Not yet
    expect(L[L.indexOf('Your guaranteed income') + 2]).toBe('$0/month');                       // after the info dot
  });
  test('Save with nothing changed changes nothing', () => {
    expect(save(WORKER_SS)).toEqual(WORKER_SS);
  });
  test('"Not yet" keeps the $2,900 estimate, and does not make it this month’s income', () => {
    const op = save(WORKER_SS, 'I receive it');
    expect(op.incomeSources).toContain('retirement_income');                              // received: now it is income
    const op2 = save(WORKER_SS, 'Not yet');
    expect(op2.ri_ss).toBe('2900');
    expect(op2.incomeSources).not.toContain('retirement_income');
  });
  test('a retiree who receives it opens on "I receive it", as before', () => {
    show(MonthlyIncomeScreen, { status: 'retired', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly' });
    expect(screen.getAllByRole('radio')[0].props.accessibilityState.selected).toBe(true);
  });
});
