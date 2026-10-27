/** CASH FLOW FUNCTIONS NO TEST NAMED — EACH ONE CALLED DIRECTLY, ON NUMBERS WORKED BY HAND (2026-10-26, PF-TOOLS).
 *
 *  The trace table (cf_function_trace.test.ts) gives every Cash flow function the test that exercises it. These nine were
 *  numbered on 2026-10-26 (MK-CF-F-246 to 281) and were reached only inside flows, or not by any test at all; here each is
 *  asked on its own, so its row names a test that calls it. Every expected figure is worked out in the comment beside it.
 */
import { expensesAsCounted, unplacedMortgageSentence } from '../../MoneyKeel/functions/cashflow/budget-counted';
import { rentalsHeld } from '../../MoneyKeel/functions/cashflow/income-tab';
import { startingCashOnRecord } from '../../MoneyKeel/functions/cashflow/whats-coming';
import { rateNotEntered } from '../domain/debt';
import { landsOnceInYear, socialSecurityNotYetMonthly, retirementIncomeTaxedMonthly } from '../domain/income/onboarding';
import { incomeProfileNow } from '../hooks/useIncomeProfile';
import { useStore } from '../store/useStore';

describe('MK-CF-F-246 expensesAsCounted — an expense under a budget line that stood down is that debt\'s payment', () => {
  const counted = { paidOnDebts: [{ category: 'Rent / Mortgage', debtId: 'm1', debt: 'Lake house mortgage' }] };
  test('$2,300 logged as Rent / Mortgage becomes a Debt payment on the mortgage, by its id; a grocery stays a grocery', () => {
    const out = expensesAsCounted([{ category: ' rent / mortgage ', store: 'Landlord', amount: 2300 } as any,
      { category: 'Grocery', store: 'Shop', amount: 50 } as any], counted);
    expect(out[0]).toEqual({ category: 'Debt payment', store: 'Lake house mortgage', debtId: 'm1', amount: 2300 });
    expect(out[1]).toEqual({ category: 'Grocery', store: 'Shop', amount: 50 });
  });
  test('no line stood down: the expenses come back as logged', () => {
    const logged = [{ category: 'Rent / Mortgage', store: 'Landlord', amount: 2300 } as any];
    expect(expensesAsCounted(logged, {})).toEqual(logged);
    expect(expensesAsCounted(null, counted)).toEqual([]);
  });
});

describe('MK-CF-F-247 unplacedMortgageSentence — the sentence for a mortgage on no home beside a Rent / Mortgage line', () => {
  test('names the mortgage and asks for it to be placed on the home', () => {
    expect(unplacedMortgageSentence('Lake house mortgage')).toBe('Your Rent / Mortgage budget line is not counted here: your '
      + 'mortgage, Lake house mortgage, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.');
  });
});

describe('MK-CF-F-249 rentalsHeld — the rentals that name their property, and what they clear a month', () => {
  test('$1,500 rent and $1,000 of costs, plus $900 rent and $1,200 of costs: 2 properties, (500 − 300) × 12 ÷ 12 = $200 a month', () => {
    const op: any = { rentals: [{ property_id: 'p1', income: 1500, expenses: 1000 }, { property_id: 'p2', income: 900, expenses: 1200 }] };
    const r = rentalsHeld(op)!;
    expect(r.count).toBe(2);
    expect(r.monthlyNet).toBeCloseTo(200, 9);
  });
  test('a rental that loses money gives a figure below 0: $1,000 rent, $1,500 of costs → −$500 a month', () => {
    expect(rentalsHeld({ rentals: [{ property_id: 'p1', income: 1000, expenses: 1500 }] } as any)).toEqual({ count: 1, monthlyNet: -500 });
  });
  test('an entry that names no property, or no rentals at all: nothing', () => {
    expect(rentalsHeld({ rentals: [{ property_id: '', income: 1500, expenses: 0 }] } as any)).toBeNull();
    expect(rentalsHeld(null)).toBeNull();
  });
});

describe('MK-CF-F-253 startingCashOnRecord — the Bill calendar starts from a cash balance on record, $0 included', () => {
  test('one checking account holding $0: the calendar starts at $0 (an answer, not a blank)', () => {
    expect(startingCashOnRecord([{ asset_id: 'c', kind: 'checking', asset_class: 'cash', balance: 0 }])).toBe(0);
  });
  test('$2,500 checking and $1,500 savings: $4,000', () => {
    expect(startingCashOnRecord([{ asset_id: 'c', kind: 'checking', asset_class: 'cash', balance: 2500 },
      { asset_id: 's', kind: 'savings', asset_class: 'cash', balance: 1500 }])).toBe(4000);
  });
  test('no account, or a cash account whose balance was never entered: no starting cash', () => {
    expect(startingCashOnRecord([])).toBeNull();
    expect(startingCashOnRecord(null)).toBeNull();
    expect(startingCashOnRecord([{ asset_id: 'c', kind: 'checking', asset_class: 'cash', balance: null }])).toBeNull();
  });
});

describe('MK-CF-F-259 rateNotEntered — a rate never entered is not 0%', () => {
  test('no rate, an empty one, or one that is not a number: not entered', () => {
    expect(rateNotEntered({ interest_rate_apr: undefined } as any)).toBe(true);
    expect(rateNotEntered({ interest_rate_apr: '' } as any)).toBe(true);
    expect(rateNotEntered({ interest_rate_apr: 'about 5' } as any)).toBe(true);
  });
  test('a typed 0 is an entered 0%, and 6.9 is entered; no debt at all is not a debt with a missing rate', () => {
    expect(rateNotEntered({ interest_rate_apr: 0 } as any)).toBe(false);
    expect(rateNotEntered({ interest_rate_apr: 6.9 } as any)).toBe(false);
    expect(rateNotEntered(null)).toBe(false);
  });
});

describe('MK-CF-F-269 landsOnceInYear — what lands once counts in its own year only', () => {
  test('a $7,311.17 signing bonus dated 2026-10-17: $7,311.17 in 2026, $0 in 2027', () => {
    const op: any = { signingOnetime: '7311.17', signingDate: '2026-10-17' };
    expect(landsOnceInYear(op, 'signing', 2026)).toBeCloseTo(7311.17, 9);
    expect(landsOnceInYear(op, 'signing', 2027)).toBe(0);
  });
  test('a one-time $2,000 counts only with both its month and its year: Sep 2026 → $2,000 in 2026; no month → $0', () => {
    expect(landsOnceInYear({ otherFreq: 'onetime', otherAmount: '2000', otherIncomeYear: '2026', otherMonth: 9 } as any, 'other', 2026)).toBe(2000);
    expect(landsOnceInYear({ otherFreq: 'onetime', otherAmount: '2000', otherIncomeYear: '2026' } as any, 'other', 2026)).toBe(0);
  });
});

describe('MK-CF-F-271 socialSecurityNotYetMonthly — Social Security answered "Not yet" is not money arriving', () => {
  test('$2,900 a month answered Not yet: $2,900; $8,700 a quarter answered Not yet: 8,700 ÷ 3 = $2,900', () => {
    expect(socialSecurityNotYetMonthly({ ri_ss: '2900', ri_ss_freq: 'monthly', ri_ss_receiving: 'no' } as any)).toBe(2900);
    expect(socialSecurityNotYetMonthly({ ri_ss: '8700', ri_ss_freq: 'quarterly', ri_ss_receiving: 'no' } as any)).toBe(2900);
  });
  test('received, or not answered: 0', () => {
    expect(socialSecurityNotYetMonthly({ ri_ss: '2900', ri_ss_freq: 'monthly', ri_ss_receiving: 'yes' } as any)).toBe(0);
    expect(socialSecurityNotYetMonthly({ ri_ss: '2900', ri_ss_freq: 'monthly' } as any)).toBe(0);
  });
});

describe('MK-CF-F-276 retirementIncomeTaxedMonthly — retirement income received now, and the part of it that is taxed', () => {
  const base: any = { status: 'retired', incomeSources: ['retirement_income'], filingStatus: 'single', ri_ss: '2000', ri_ss_freq: 'monthly' };
  test('$2,000 of Social Security and a $1,000 pension, single: provisional 12,000 + 24,000 ÷ 2 = 24,000, under the 25,000 base, '
    + 'so no Social Security is taxed → received $3,000, taxed 3,000 − 2,000 = $1,000', () => {
    const r = retirementIncomeTaxedMonthly({ ...base, ri_pension: '1000', ri_pension_freq: 'monthly' }, new Date(2026, 9, 26));
    expect(r.received).toBe(3000);
    expect(r.taxed).toBeCloseTo(1000, 9);
  });
  test('the pension $2,000 instead: provisional 24,000 + 12,000 = 36,000; half of min(11,000, 9,000) = 4,500, + 85% of 2,000 = '
    + '1,700 → $6,200 of Social Security taxed a year → taxed 4,000 − 2,000 + 6,200 ÷ 12 = $2,516.67 a month', () => {
    const r = retirementIncomeTaxedMonthly({ ...base, ri_pension: '2000', ri_pension_freq: 'monthly' }, new Date(2026, 9, 26));
    expect(r.received).toBe(4000);
    expect(r.taxed).toBeCloseTo(2000 + 6200 / 12, 9);
  });
  test('no retirement income received: received 0, taxed 0', () => {
    expect(retirementIncomeTaxedMonthly({ incomeSources: ['salary'] } as any)).toEqual({ received: 0, taxed: 0 });
  });
});

describe('MK-CF-F-281 incomeProfileNow — the profile a figure reads, with the accounts\' interest handed in, outside a component', () => {
  afterEach(() => useStore.setState({ assetAccounts: [], transactions: [] } as any));
  test('$10,000 of savings at 4%, nothing typed for interest: 10,000 × 4% = $400 a year, calculated and marked approximate', () => {
    useStore.setState({ assetAccounts: [{ asset_id: 'sav', label: 'Savings', kind: 'savings', tax_bucket: 'TAXABLE', balance: 10_000,
      coupon_rate: 0.04, asset_class: 'cash' }], transactions: [] } as any);
    const op = incomeProfileNow({ status: 'employed', salary: '5000', salaryFreq: 'monthly' });
    expect(op.invAnnual).toBeCloseTo(400, 9);
    expect(op.invBasis).toBe('calculated');
    expect(op.invApprox).toBe(true);
  });
  test('the figure typed stands: $1,000 typed comes back as typed, unchanged', () => {
    useStore.setState({ assetAccounts: [], transactions: [] } as any);
    const typed = { status: 'employed', invAnnual: '1000' };
    expect(incomeProfileNow(typed)).toBe(typed);
  });
});
