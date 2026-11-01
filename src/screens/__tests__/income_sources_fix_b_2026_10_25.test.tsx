/** THE INCOME SCREENS SAY WHAT IS ENTERED AND WHAT IS NOT — FIX-INCOME-B, 2026-10-25 (the outside review's MK-CF-O-004 and
 *  MK-CF-O-019; the lead's rulings; dated READ THIS FIRST rows on income-end-to-end_v07 of 2026-10-25).
 *
 *  Rendered as a person meets them: the Income manager lists a rental losing money as entered, with its loss; stock that vests
 *  after a job ends has its own row; a rental's mortgage added from Rent is saved with its balance and rate NOT ENTERED, never $0
 *  and 0% (a typed payment is kept as typed); an hourly wage with no hours says so on both income screens. The Income summary
 *  says what the shares that vest are (taxed, not money) and what is counted nowhere yet. Sign-up's Benefits step no longer says
 *  "We won't tax this income." over unemployment pay, and its Bonuses step asks the signing bonus's month.
 *  Every figure is worked by hand beside its assertion.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}), useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const textOf = (n: any): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n?.children ?? []).map(textOf).join(''));
/** Every line a person reads, in order. */
const lines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
const setup = (state: any) => {
  jest.useFakeTimers({ now: new Date('2026-10-24T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  useStore.getState().resetAll(); useStore.setState({ hideBalances: false, onboardingComplete: true, ...state } as any);
};
afterEach(() => jest.useRealTimers());
const Manager = () => { const C = require('../IncomeManagerScreen').default; return <C />; };
const Summary = () => { const C = require('../IncomeSummaryScreen').default; return <C />; };
const HOUSE = { asset_id: 'rh', label: 'Rental house', kind: 'real_estate', tax_bucket: 'PROPERTY', balance: 300000, re_use: 'rental' };

describe('the Income manager', () => {
  test('a rental losing $500/month is entered, with its loss: "One property · −$500/month net", and 2 sources', () => {
    setup({ onboardingProfile: { baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      rentals: [{ type: 'long', income: 1000, expenses: 1500, property_id: 'rh' }] }, assetAccounts: [HOUSE] });
    render(<Manager />);
    const ls = lines();
    expect(ls).toContain('2 SOURCES');   // the bar's words in capitals, the count too (IN3-05, 2026-10-31)
    expect(ls).toContain('Rent');
    expect(ls).toContain('One property · −$500/month net');     // $1,000 − $1,500
    expect(ls).not.toContain('Rent from a property');
  });
  test('stock that vests with no job is its own row — "Bonus and stock · $10,000/year"', () => {
    setup({ onboardingProfile: { equityType: 'rsu', rsuGrants: [{ shares: 25, price: 400, date: '2026-12-15' }] } });   // 25 × $400
    render(<Manager />);
    const ls = lines();
    expect(ls).toContain('1 SOURCE');   // (IN3-05, 2026-10-31)
    expect(ls).toContain('Bonus and stock');
    expect(ls.some((l) => /^\$10,000\/year/.test(l))).toBe(true);
  });
  test('a rental\'s mortgage added from Rent: the payment as typed, its balance and rate not entered — never $0 and 0%', () => {
    setup({ onboardingProfile: { baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
      rentals: [{ type: 'long', income: 2000, expenses: 500, property_id: 'rh', mortgage: '1400' }] }, assetAccounts: [HOUSE], liabilities: [] });
    render(<Manager />);
    fireEvent.press(screen.getByLabelText('Rent: One property · $1,500/month net. Edit'));
    fireEvent.press(screen.getAllByLabelText('Back')[0]);
    const m = ((useStore.getState() as any).liabilities as any[]).find((d) => d.debt_type === 'MORTGAGE');
    expect(m).toMatchObject({ label: 'Rental house mortgage', minimum_monthly_payment: 1400, monthly_payment: 1400 });
    expect(m.remaining_balance).toBeUndefined();   // it was 0
    expect(m.interest_rate_apr).toBeUndefined();   // it was 0
  });
  test('an hourly wage with no hours a week says so on the job\'s line, and the job is still entered', () => {
    setup({ onboardingProfile: { baseSalary: '25', salaryMode: 'gross', salaryFreq: 'hourly', taxMode: 'manual', manualTaxRate: '0' } });
    render(<Manager />);
    const ls = lines();
    expect(ls).toContain('A job');
    expect(ls.some((l) => /hours a week not entered/.test(l))).toBe(true);
  });
});

describe('the Income summary', () => {
  test('stock kept as shares: "Your $30,000 of stock vesting this year is not here" and the $30,000 in what it is taxed on', () => {
    // 75 shares in March 2026 at $400 = $30,000 (and 25 in March 2027, another year's)
    setup({ onboardingProfile: { baseSalary: '6000', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', equityType: 'rsu',
      rsuGrants: [{ shares: 75, price: 400, date: '2026-03-15' }, { shares: 25, price: 400, date: '2027-03-15' }] } });
    render(<Summary />);
    const ls = lines();
    expect(ls.some((l) => /^Your \$30,000 of stock vesting this year is not here — it vests as shares, not money to spend\./.test(l))).toBe(true);
    const at = ls.indexOf('Stock vesting');
    expect(ls[at + 1]).toBe('$30,000');
    expect(ls).toContain('$102,000');   // = Gross /year: $72,000 + $30,000
  });
  test('child support alone shows its amount — $1,000, never $0 and "Nothing entered yet."', () => {
    setup({ onboardingProfile: { supportMonthly: '1000' } });
    render(<Summary />);
    const ls = lines();
    expect(ls).toContain('Child support or alimony');
    expect(ls).not.toContain('Nothing entered yet. Add your income ›');
    expect(ls.filter((l) => l === '$1,000').length).toBeGreaterThanOrEqual(2);   // the row and the band
  });
  test('a one-time gift with no year, and an hourly wage with no hours: each named as not counted', () => {
    setup({ onboardingProfile: { baseSalary: '25', salaryMode: 'gross', salaryFreq: 'hourly', taxMode: 'manual', manualTaxRate: '0',
      otherAmount: '2000', otherFreq: 'onetime', otherLabel: 'Gift', supportMonthly: '300' } });
    render(<Summary />);
    const ls = lines();
    expect(ls).toContain('Your Gift is not counted — year not entered.');
    expect(ls).toContain('Hours a week not entered — your hourly pay is not counted until it is.');
  });
});

describe('sign-up', () => {
  const step = (id: string, answers: Record<string, any>) => {
    const { renderStep } = require('../../onboarding/modules');
    const ctx = { status: 'employed', tracks: [], answers, setAnswer: jest.fn() };
    render(<>{renderStep(id, ctx)}</>);
    return ctx;
  };
  test('Benefits with Unemployment chosen: "Unemployment pay is taxed, so we count it in what you are taxed on."', () => {
    step('income_benefits', { benefitTypes: ['unemployment'], benefitMonthly: '1000' });
    expect(lines().join(' ')).toMatch(/Unemployment pay is taxed, so we count it in what you are taxed on\./);
    expect(lines().join(' ')).not.toMatch(/We won.t tax this income/);
  });
  test('Benefits with SNAP and Unemployment: the unemployment part is asked, and until it is typed all of it is counted', () => {
    step('income_benefits', { benefitTypes: ['snap', 'unemployment'], benefitMonthly: '1300' });
    const t = lines().join(' ');
    expect(t).toMatch(/How much of that is unemployment, per month\?/);
    expect(t).toMatch(/Not entered yet — until it is, all \$1,300\/month is counted as taxed\./);
  });
  test('Benefits without Unemployment keep "We won’t tax this income."', () => {
    step('income_benefits', { benefitTypes: ['snap'], benefitMonthly: '300' });
    expect(lines().join(' ')).toMatch(/We won’t tax this income\./);
  });
  // ON ITS OWN DAY (2026-11-01, FX-CF-B): the chip stores the next time a month comes, so the test reads the clock it was written on —
  // on 2026-10-25 October is this year's; it went red on 2026-11-01, when the next October is 2027's, which is also right (below)
  const onDay = (d: Date, fn: () => void) => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    jest.setSystemTime(d);
    try { fn(); } finally { jest.useRealTimers(); }
  };
  test('Bonuses: a signing bonus asks its month — "Date not entered" until one is picked; October stores 2026-10', () => onDay(new Date(2026, 9, 25, 12), () => {
    const ctx = step('income_bonus', { signingOnetime: '7311.17' });
    expect(lines()).toContain('Which month is it paid?');
    expect(lines()).toContain('Date not entered — it is not counted until you pick its month.');
    fireEvent.press(screen.getByLabelText('Signing bonus paid in Oct 2026'));
    expect(ctx.setAnswer).toHaveBeenCalledWith('signingDate', '2026-10');
  }));
  test('Bonuses, read on 2026-11-01: October has passed, so its chip stores the next October, 2027-10', () => onDay(new Date(2026, 10, 1, 12), () => {
    const ctx = step('income_bonus', { signingOnetime: '7311.17' });
    fireEvent.press(screen.getByLabelText('Signing bonus paid in Oct 2027'));
    expect(ctx.setAnswer).toHaveBeenCalledWith('signingDate', '2027-10');
    fireEvent.press(screen.getByLabelText('Signing bonus paid in Nov 2026'));      // this month is still this year's
    expect(ctx.setAnswer).toHaveBeenCalledWith('signingDate', '2026-11');
  }));
});

// ── follow-up (2026-10-25, the lead): the Income tab prints incomeSources' rows; the one-time step asks month and year ──
describe('one source, one figure: the Income tab, the Income summary and Your income read the same rows', () => {
  // a $7,200 take-home (0% typed), benefits $731.17/month, support $511.43/month, $1,831.19/year of interest and dividends reinvested,
  // and a rental losing $500/month ($1,000 rent, $1,500 of costs)
  const OP = { status: 'employed', incomeSources: ['employment', 'benefits', 'support', 'investment_income', 'rental'], birthYear: '1975',
    baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0', monthlySpending: '3400',
    benefitMonthly: '731.17', supportMonthly: '511.43', invAnnual: '1831.19', rentals: [{ type: 'long', income: 1000, expenses: 1500, property_id: 'rh' }] };
  test('the functions agree row by row: benefits $731.17, support $511.43, interest $1,831.19 a year, rental −$500 a month', () => {
    const { incomeSources, incomeSummary, theIncomeManager } = require('../../../MoneyKeel/functions/cashflow/income-summary');
    const src = incomeSources(OP); const mgr = theIncomeManager(OP).entered; const sum = incomeSummary(OP);
    const by = (k: string) => src.find((x: any) => x.kind === k).amount;
    const mg = (k: string) => mgr.find((x: any) => x.key === k).amount;
    const lands = (l: string) => sum.lands.lines.find((x: any) => x.label === l).amount;
    expect([by('benefits'), mg('benefits'), lands('Benefits')]).toEqual([731.17, 731.17, 731.17]);
    expect([by('support'), mg('support'), lands('Child support or alimony')]).toEqual([511.43, 511.43, 511.43]);
    expect([by('rental'), mg('rental'), lands('Rent')]).toEqual([-500, -500, -500]);
    expect([by('interest'), mg('investment_income'), sum.taxed.lines.find((x: any) => x.label === 'Interest & dividends').amount]).toEqual([1831.19, 1831.19, 1831.19]);
  });
  test('the Income tab prints them, in their own period, under the drawn names — benefits, support and interest had no row', () => {
    setup({ onboardingProfile: OP, assetAccounts: [HOUSE] });
    const C = require('../CashFlowScreen').default;
    render(<C />);
    fireEvent.press(screen.getByLabelText('Income tab'));
    const t = lines().join(' | ');
    expect(t).toMatch(/Rental income \| 1 property \| −\$500 ›/);
    expect(t).toMatch(/Benefits \| every month \| \$731\/month ›/);
    expect(t).toMatch(/Child support or alimony \| not taxed \| \$511\/month ›/);
    expect(t).toMatch(/Interest & dividends \| reinvested \| \$1,831\/year ›/);
  });
  test('and Your income lists the same, with the same figures', () => {
    setup({ onboardingProfile: OP, assetAccounts: [HOUSE] });
    render(<Manager />);
    const t = lines().join(' | ');
    expect(t).toMatch(/Benefits \| ✓ \| \$731\/month/);
    expect(t).toMatch(/Child support or alimony \| ✓ \| \$511\/month/);
    expect(t).toMatch(/Interest & dividends \| ✓ \| \$1,831\/year · reinvested/);
    expect(t).toMatch(/Rent \| ✓ \| One property · −\$500\/month net/);
  });
});

describe('sign-up, Other income, one time: nothing is picked for him, and the month and the year are asked', () => {
  const step = (answers: Record<string, any>) => {
    const { renderStep } = require('../../onboarding/modules');
    const ctx = { status: 'employed', tracks: [], answers: { otherFreq: 'onetime', otherAmount: '2000', ...answers }, setAnswer: jest.fn() };
    render(<>{renderStep('income_other', ctx)}</>);
    return ctx;
  };
  test('no month lit, no year lit, and "Month and year not entered — it is not counted until you pick both."', () => {
    step({});
    for (const m of ['Jan', 'Sep', 'Dec']) expect(screen.getByLabelText(`Lands in ${m}`).props.accessibilityState.selected).toBe(false);
    expect(screen.getByLabelText('Lands in 2026').props.accessibilityState.selected).toBe(false);
    expect(lines()).toContain('Which year?');
    expect(lines()).toContain('Month and year not entered — it is not counted until you pick both.');
  });
  test('a month alone: "Year not entered"; the year is its own tap — the month no longer picks one', () => {
    const ctx = step({ otherMonth: 9 });
    expect(lines()).toContain('Year not entered — it is not counted until you pick it.');
    fireEvent.press(screen.getByLabelText('Lands in Mar'));
    expect(ctx.setAnswer).toHaveBeenCalledWith('otherMonth', 3);
    expect(ctx.setAnswer).not.toHaveBeenCalledWith('otherIncomeYear', expect.anything());
    fireEvent.press(screen.getByLabelText('Lands in 2027'));
    expect(ctx.setAnswer).toHaveBeenCalledWith('otherIncomeYear', 2027);
  });
  test('both given: "Counted once, in Sep 2026."', () => {
    step({ otherMonth: 9, otherIncomeYear: 2026 });
    expect(lines()).toContain('Counted once, in Sep 2026.');
  });
});
