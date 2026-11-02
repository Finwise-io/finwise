/** THE INCOME SCREENS AND SIGN-UP, ROUND 3 (2026-10-31, FX-CF-B) — the Cash flow drawing check of 2026-10-31, items SU3-01, SU3-03 to
 *  SU3-06, REC3-03 and IN3-01 to IN3-06, held on the rendered screen. Each figure is worked by hand beside it. Drawing:
 *  income-end-to-end_v07, rows of 2026-10-31 (written before the code). The old answers are kept at the bottom as test.failing.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import BasePayScreen from '../BasePayScreen';
import IncomeSummaryScreen from '../IncomeSummaryScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';
import FilingStatusScreen from '../FilingStatusScreen';
import { renderStep } from '../../onboarding/modules';
import { useStore } from '../../store/useStore';
import { Colors } from '../../utils/theme';
import { builtLines } from '../../testing/mockMatch';
import { incomeFromAccounts } from '../../domain/income/from-accounts';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';

let mockOpen: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({ open: mockOpen }), router: { push: jest.fn(), back: jest.fn() },
}));

const show = (C: any, op: any, props: any = {}) => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingProfile: op, onboardingComplete: true, hideBalances: false } as any);
  render(<C {...props} />);
  return builtLines(screen.toJSON());
};
const step = (id: string, answers: any, tracks: string[] = ['spend']) => {
  useStore.getState().resetAll();
  render(<>{renderStep(id as any, { status: 'employed', tracks, answers, setAnswer: jest.fn() } as any)}</>);
  return builtLines(screen.toJSON());
};
const styleOf = (text: string | RegExp, i = 0) => StyleSheet.flatten(screen.getAllByText(text)[i].props.style) ?? {};

/** Pat (v07 row of 2026-10-26): $5,000 a month, $400 into a 401(k), the calculated rate */
const PAT = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: '1975', baseSalary: '5000', salaryMode: 'gross',
  salaryFreq: 'monthly', c_401k: '400' };
/** the household of the v07 row of 2026-10-27: $2,000 a month typed, a $1,200 bill given December, take-home $4,000 */
const BILL = { incomeSources: ['employment'], baseSalary: '5000', salaryFreq: 'monthly', landsTypical: '4000', monthlySpending: '2000',
  spendCats: [{ id: 'c1', label: 'Car insurance', tier: 'important', bucket: 'nonmonthly', unit: 'dollar', amount: '1200', custom: true, months: [12] }] };

describe('SU3-01 · REC3-03 · the recap’s tax line says what its rate is of', () => {
  test('Pat: "Tax (~7.41% of your gross)" beside $4,444 — $4,444 ÷ $60,000 = 7.41%; on the $55,200 taxed it would be 8.05%', () => {
    const t = incomeSummary(PAT as any).taxed;
    expect(t.grossAnnual).toBe(60_000);
    expect(t.taxedOn).toBe(55_200);                                                  // 60,000 − 12 × 400
    expect(Math.round(t.tax)).toBe(4_444);
    expect((t.tax / t.grossAnnual * 100).toFixed(2)).toBe('7.41');                   // the rate is a share of the gross
    expect((t.tax / t.taxedOn * 100).toFixed(2)).toBe('8.05');                       // what "on taxable income" would have been
    const L = step('recap_income', PAT, []);
    expect(L).toContain('Tax (~7.41% of your gross)');
    expect(L.join(' ')).not.toMatch(/on taxable income/);
  });
});

describe('SU3-03 · How much can you save? — a tip names only what was entered (R15)', () => {
  test('no bonus and no stock: no month is named — "About $1,900/month on average." (11 × $2,000 + $800 = $22,800 ÷ 12)', () => {
    const L = step('savingsRateTarget', BILL);
    expect(L).toContain('Saving about $22,800 this year');
    expect(L).toContain('About $1,900/month on average.');
    expect(L.join(' ')).not.toMatch(/equity|bonus months|Set more aside/);
  });
  test('a $12,000 bonus paid in December: "Set more aside in Dec — your bonus month."', () => {
    const L = step('savingsRateTarget', { ...BILL, bonusAnnual: '12000', bonusMonth: 12 });
    expect(L).toContain('Set more aside in Dec — your bonus month.');
  });
});

describe('IN3-02 · phone 7 — while the three figures cannot all be right, no total and no household card', () => {
  const YOU_BAD = { baseSalary: '5500', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' };   // 5,500 − 800 = 4,700 < 5,000
  test('two earners: the band carries no total, the screen ends at Save; the warning says by how much', () => {
    const L = show(BasePayScreen, { ...YOU_BAD, hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
      partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' } });
    const band = L.indexOf('Each person’s pay');
    expect(band).toBeGreaterThanOrEqual(0);
    expect(L[band + 1]).not.toMatch(/\/year$/);                                      // it read "$120,000/year"
    expect(L).not.toContain('Your household');                                      // it read "$500/month · 5.00%" and a 10% band
    expect(L.join(' ')).toMatch(/These three cannot all be right/);
    expect(L[L.length - 1]).toBe('Save');
  });
  test('the same household with figures that agree: the band total and the card are back', () => {
    const L = show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam',
      whoEarns: 'both', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' } });
    expect(L[L.indexOf('Each person’s pay') + 1]).toBe('$138,000/year');             // 84,000 + 54,000
    expect(L).toContain('Your household');
  });
});

describe('IN3-01 · IN3-04 · percents to two decimals, worked once (Q49)', () => {
  test('phone 5: "17.14% of your gross" — $1,200 ÷ $7,000, worked by Base pay’s own function', () => {
    const L = show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' });
    expect(L.join(' ')).toMatch(/17\.14% of your gross\. Tax, medical cover/);
  });
  test('phone 11: "3.80% on $18,400" and "4.20% on $30,000"; the figures stay $699.20 and $1,260', () => {
    const r = incomeFromAccounts([
      { asset_id: 'c', label: 'Chase savings', tax_bucket: 'CASH', kind: 'savings', balance: 18_400, coupon_rate: 0.038 },
      { asset_id: 't', label: 'Treasury bonds', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 30_000, coupon_rate: 0.042 },
    ] as any, []);
    expect(r.lines.map((l) => l.why)).toEqual(['3.80% on $18,400', '4.20% on $30,000']);
    expect(r.lines.map((l) => l.annual)).toEqual([0.038 * 18_400, 0.042 * 30_000]);   // 699.2 and 1,260, unchanged
  });
  test('sign-up’s retirement expenses: "80.00% of what you spend today" — $1,600 of $2,000', () => {
    expect(step('expectedRetirementSpending', { monthlySpending: '2000', expectedRetirementSpending: '1600' }, ['retire_acc']))
      .toContain('80.00% of what you spend today');
  });
});

describe('SU3-04 · sign-up’s box titles on the dark bar', () => {
  const isDarkBarTitle = (t: string) => {
    const st = styleOf(t);
    return st.color === Colors.white && st.textTransform === 'uppercase' && st.fontSize === 11;
  };
  test('Surplus by month, Monthly cash flow, Each month, Vesting, From your accounts — each the white capitals of a bar', () => {
    step('savingsRateTarget', BILL);
    expect(isDarkBarTitle('Surplus by month')).toBe(true);
    screen.unmount();
    step('recap_income', PAT, []);
    expect(isDarkBarTitle('Monthly cash flow')).toBe(true);
    expect(isDarkBarTitle('Where it comes from')).toBe(true);
    screen.unmount();
    step('recap_spend', BILL);
    expect(isDarkBarTitle('Each month: tax · expenses · savings')).toBe(true);
    screen.unmount();
    useStore.setState({ assetAccounts: [{ asset_id: 'c', label: 'Chase savings', tax_bucket: 'CASH', kind: 'savings', balance: 18_400, coupon_rate: 0.038 }] } as any);
    render(<>{renderStep('income_investment' as any, { status: 'employed', tracks: [], answers: {}, setAnswer: jest.fn() } as any)}</>);
    expect(isDarkBarTitle('From your accounts')).toBe(true);
  });
});

describe('SU3-05 · SU3-06 · a box nobody filled opens empty (R16)', () => {
  test('Benefits, Unemployment beside SNAP, $1,300: the unemployment box opens empty, and the line says all of it is counted as taxed', () => {
    useStore.getState().resetAll();
    render(<>{renderStep('income_benefits' as any, { status: 'employed', tracks: [], answers: { benefitTypes: ['snap', 'unemployment'], benefitMonthly: '1300' }, setAnswer: jest.fn() } as any)}</>);
    const box = screen.getByLabelText('How much of that is unemployment, per month?');
    expect(box.props.placeholder ?? '').toBe('');
    expect(box.props.value).toBe('');
    expect(screen.getByText('Not entered yet — until it is, all $1,300/month is counted as taxed.')).toBeOnTheScreen();
  });
  test('Your budget: an empty category box opens empty; a typed one reads "1,200" beside its "$" switch — the $ once', () => {
    useStore.getState().resetAll();
    render(<>{renderStep('flexBuckets' as any, { status: 'employed', tracks: ['spend'], answers: BILL, setAnswer: jest.fn() } as any)}</>);
    const inputs = screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput' && n.props.keyboardType === 'decimal-pad');
    expect(inputs.length).toBeGreaterThanOrEqual(10);                                 // the guard proves it looked: every category's box
    const placeholders = inputs.map((n: any) => n.props.placeholder ?? '');
    expect(placeholders.filter((p: string) => /\$|^0$/.test(p))).toEqual([]);        // no "$0", no "0"
    expect(inputs.some((n: any) => n.props.value === '1,200')).toBe(true);            // the car insurance, $1,200 a year
  });
});

describe('IN3-03 · IN3-05 · IN3-06 · appearance as drawn', () => {
  const HOUSE = { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000', hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both',
    filingStatus: 'married', taxMode: 'manual', manualTaxRate: '24', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' },
    rentals: [{ type: 'long', income: '1800', expenses: '600', property_id: 'house' }], invAnnual: '3000', bonusAnnual: '12000', bonusMonth: 12,
    incomeSources: ['employment', 'rental', 'investment_income'] };
  test('phone 16: a label the size of its figure, 15 and 15', () => {
    show(IncomeSummaryScreen, HOUSE);
    expect(styleOf('Your pay').fontSize).toBe(15);
    expect(styleOf('$5,000').fontSize).toBe(15);
  });
  test('phone 12: the bar reads "3 SOURCES", in its capitals', () => {
    mockOpen = undefined;
    const L = show(IncomeManagerScreen, HOUSE);
    expect(L).toContain('3 SOURCES');
    expect(L).not.toContain('3 sources');
  });
  test('phones 11, 14 and 15: bold inside a sentence is 700', () => {
    mockOpen = 'dividends';
    show(IncomeManagerScreen, HOUSE);
    expect(styleOf('Interest and dividends are counted as income you are taxed on, not money you can spend.').fontWeight).toBe('700');
    screen.unmount();
    show(FilingStatusScreen, { hasPartner: 'yes', partnerName: 'Sam' }, { frame: 'onboarding' });
    expect(styleOf('Married filing jointly', 1).fontWeight).toBe('700');               // [0] is the choice; [1] the sentence's bold
  });
});

// ── THE OLD ANSWERS, KEPT (2026-10-31) ──────────────────────────────────────────────────────────────────────────────────────────
test.failing('SU3-01, as it read: "Tax (~7.41% on taxable income)"', () => {
  expect(step('recap_income', PAT, [])).toContain('Tax (~7.41% on taxable income)');
});
test.failing('SU3-03, as it read: "Set more aside in Jan & Feb — your equity & bonus months." with neither entered', () => {
  expect(step('savingsRateTarget', BILL)).toContain('Set more aside in Jan & Feb — your equity & bonus months.');
});
test.failing('IN3-01, as it read: "17% of your gross"', () => {
  expect(show(BasePayScreen, { baseSalary: '7000', salaryFreq: 'monthly', c_401k: '800', landsTypical: '5000' }).join(' ')).toMatch(/ 17% of your gross/);
});
test.failing('IN3-04, as it read: "3.8% on $18,400"', () => {
  const r = incomeFromAccounts([{ asset_id: 'c', label: 'Chase savings', tax_bucket: 'CASH', kind: 'savings', balance: 18_400, coupon_rate: 0.038 }] as any, []);
  expect(r.lines[0].why).toBe('3.8% on $18,400');
});

// THE OLD ANSWER, KEPT (2026-11-01, R25 — one 'about' mark): the Income summary wrote a calculated figure with '≈'; it writes '~' now,
// as outside_cashflow_openai_screens MK-CF-M-044 T8 and MK-CF-M-047 T6 read it
test.failing('R25, as it read: the Income summary’s calculated take-home with "≈"', () => {
  expect(show(IncomeSummaryScreen, PAT).some((l) => /^≈\$/.test(l))).toBe(true);
});
test('R25, as it reads: the same figure with "~"', () => {
  expect(show(IncomeSummaryScreen, PAT).some((l) => /^~\$/.test(l))).toBe(true);
});
