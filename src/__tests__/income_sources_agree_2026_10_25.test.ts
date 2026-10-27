/** EVERY INCOME SOURCE OTHER THAN WAGES READS THE SAME ON EVERY SCREEN — the cross-screen agreement tests of FIX-INCOME-B (2026-10-25).
 *
 *  One concept, one function, one number (CLAUDE.md, FINANCE ACCURACY). Each block names the household, works the figure by hand,
 *  and holds the Income summary (MK-CF-O-004), the month grid (MK-CF-F-092 incomeMonthlyGrid — sign-up's recap, Budget, Goals), the
 *  Cash flow months (MK-XS-F-004 buildDatedGrid — This month and Home), the Tax organizer (MK-CF-O-007) and the Income manager
 *  (MK-CF-O-019) to the one function that owns it. The clock is held on 2026-10-24 at noon, the outside review's as-of day.
 */
import { incomeSummary, theIncomeManager, incomeSources } from '../../MoneyKeel/functions/cashflow/income-summary';
import { guaranteedReceivedNow } from '../../MoneyKeel/functions/cashflow/income-tab';
import { theTaxOrganizer } from '../../MoneyKeel/functions/cashflow/tax-organizer';
import {
  incomeMonthlyGrid, taxableAnnual, taxableByCalendarMonth, taxedSourcesAnnual, rsuAnnual, equityVestWeights, equityCashFlow,
  vestsNotEntered, socialSecurityTaxedAnnual, currentRetirementIncomeMonthly, over65CountOf, extraIncome, landsOnce,
} from '../domain/income/onboarding';
import { interestAndDividendsForYear } from '../domain/income/from-accounts';
import { equityByMonth, equityVests } from '../domain/cashflow';
import { buildDatedGrid } from '../domain/grid';

const NOW = new Date(2026, 9, 24, 12, 0, 0);
beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterAll(() => { jest.useRealTimers(); });
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const inflowOf = (op: any, slot = 0) => buildDatedGrid(op, { now: NOW }).cells[slot].inflow;

describe('a vest lands in its own year and month on every reader — one reading of a vest (equityVests, yearMonthOf)', () => {
  // the lead's household: $8,317.43 vesting in March 2026, $1,321.19 in June 2027, $4,211.17 in December 2027
  const VESTS: any = { equityType: 'rsu', taxMode: 'manual', manualTaxRate: 0, rsuGrants: [
    { shares: 1, price: '8317.43', date: '2026-03-15' }, { shares: 1, price: '1321.19', date: '2027-06-15' }, { shares: 1, price: '4211.17', date: '2027-12-15' }] };
  test('the year: 2026 is $8,317.43, 2027 is $1,321.19 + $4,211.17 = $5,532.36 — rsuAnnual, equityCashFlow and equityByMonth agree', () => {
    expect(rsuAnnual(VESTS, 2026)).toBeCloseTo(8317.43, 6);
    expect(rsuAnnual(VESTS, 2027)).toBeCloseTo(5532.36, 6);
    expect(equityCashFlow(VESTS).map((r) => [r.year, +r.amount.toFixed(2)])).toEqual([[2026, 8317.43], [2027, 5532.36]]);
    for (const y of [2026, 2027]) expect(sum(equityByMonth(VESTS, y))).toBeCloseTo(rsuAnnual(VESTS, y) as number, 6);
  });
  test('the months: 2026 holds March only — the tax months, the weights and the Cash flow months read the same months', () => {
    const t = taxableByCalendarMonth(VESTS, NOW);
    expect(t[2]).toBeCloseTo(8317.43, 6);
    expect(sum(t)).toBeCloseTo(8317.43, 6);
    const w = equityVestWeights(VESTS, 2026)!;
    equityByMonth(VESTS, 2026).forEach((v, i) => expect(v).toBeCloseTo(w[i] * 8317.43, 6));
    const w27 = equityVestWeights(VESTS, 2027)!;
    expect(w27[5] * 5532.36).toBeCloseTo(1321.19, 6); expect(w27[11] * 5532.36).toBeCloseTo(4211.17, 6);
  });
  test('sold when they vest: June 2027 lands $1,321.19 in the Cash flow months, as equityByMonth places it; kept: in no month', () => {
    const sold = buildDatedGrid({ ...VESTS, rsuSoldAtVest: 'yes' }, { now: NOW });
    const jun27 = sold.cells.find((c) => c.year === 2027 && c.calendarMonth === 6)!;
    expect(jun27.incomeItems.find((i) => i.source === 'Equity vesting')!.amount).toBeCloseTo(equityByMonth(VESTS, 2027)[5], 6);
    expect(incomeMonthlyGrid({ ...VESTS, rsuSoldAtVest: 'yes' }, 'available', NOW)[2].amount).toBeCloseTo(8317.43, 6);
    const kept = buildDatedGrid(VESTS, { now: NOW });
    expect(kept.cells.flatMap((c) => c.incomeItems).filter((i) => i.source === 'Equity vesting')).toEqual([]);
    expect(incomeMonthlyGrid(VESTS, 'available', NOW)[2].amount).toBe(0);
    // taxed either way: the Income summary's taxed row is the year's vest, and the take-home leaves it out unless sold
    const s = incomeSummary(VESTS);
    expect(s.taxed.lines.find((l) => l.label === 'Stock vesting')!.amount).toBeCloseTo(8317.43, 6);
    expect(s.vestHeldAnnual).toBeCloseTo(8317.43, 6);
    expect(incomeSummary({ ...VESTS, rsuSoldAtVest: 'yes' }).vestHeldAnnual).toBe(0);
  });
  test('a year and no month: in that year\'s total, off the month table, "vest month not entered" — on every reader', () => {
    const op: any = { equityType: 'rsu', rsuGrants: [{ shares: 1, price: '2500', date: '2026' }] };
    expect(rsuAnnual(op, 2026)).toBe(2500);
    expect(sum(taxableByCalendarMonth(op, NOW))).toBe(0);
    expect(equityVests(op)[0].missing).toBe('vest month not entered');
    expect(vestsNotEntered(op)).toEqual({ dateNotEntered: 0, monthNotEntered: 1 });
    expect(buildDatedGrid(op, { now: NOW }).notInAMonth).toEqual([{ label: 'Equity vesting', amount: 2500, year: 2026, reason: 'vest month not entered' }]);
  });
  test('no date: in no year and no month, "vest date not entered" — the summary says so and nothing counts it', () => {
    const op: any = { equityType: 'rsu', rsuGrants: [{ shares: 50, price: 400 }] };
    expect(rsuAnnual(op)).toBeNull();
    expect(equityCashFlow(op)).toEqual([]);
    expect(taxableAnnual(op)).toBe(0);
    expect(buildDatedGrid(op, { now: NOW }).notInAMonth).toEqual([{ label: 'Equity vesting', amount: 20000, year: null, reason: 'vest date not entered' }]);
    expect(incomeSummary(op).notCounted).toContain('A stock grant with no vest date is not counted — vest date not entered.');
    expect(theIncomeManager(op).bonusAndStock).toEqual({ amount: 0, tail: '· vest date not entered' });
  });
});

describe('a rental loss reads the same everywhere — the take-home, the taxed rows, the month grid and the Cash flow months', () => {
  // $7,200 take-home typed as the pay (0% typed), a rental bringing in $1,000 against $1,500 of costs: −$500/month
  const LOSS: any = { baseSalary: '7200', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
    rentals: [{ type: 'long', income: 1000, expenses: 1500, property_id: 'rh' }] };
  test('$7,200 − $500 = $6,700 on the Income summary, the month grid and This month (F4)', () => {
    const s = incomeSummary(LOSS);
    expect(s.lands.lines.map((l) => [l.label, l.amount])).toEqual([['Your pay', 7200], ['Rent', -500]]);
    expect(s.lands.usualMonth).toBe(6700);
    expect(incomeMonthlyGrid(LOSS, 'available', NOW)[9].amount).toBeCloseTo(6700, 6);
    expect(inflowOf(LOSS)).toBeCloseTo(6700, 6);
  });
  test('the taxed rows add up to "= Gross /year": $86,400 − $6,000 = $80,400', () => {
    const s = incomeSummary(LOSS);
    expect(s.taxed.lines.map((l) => [l.label, l.amount])).toEqual([['Your gross', 86400], ['Rent, net', -6000]]);
    expect(sum(s.taxed.lines.map((l) => l.amount))).toBe(s.taxed.grossAnnual);
    expect(s.taxed.grossAnnual).toBe(80400);
  });
  test('the Income manager lists it as entered, with its loss; incomeSources has its row', () => {
    const m = theIncomeManager(LOSS);
    expect(m.entered.map((x) => x.key)).toEqual(['employment', 'rental']);
    expect(m.entered.find((x) => x.key === 'rental')!.amount).toBe(-500);
    expect(incomeSources(LOSS).find((x) => x.kind === 'rental')!.amount).toBe(-500);
  });
});

describe('every taxed source is a row, and the rows add to "= Gross /year" — taxedSourcesAnnual is taxableAnnual', () => {
  test('a $7,000 wage, $1,000 of self-employment, $2,000 of Social Security and $500 of other income, single', () => {
    const op: any = { baseSalary: 7000, salaryFreq: 'monthly', seAmount: 1000, seFreq: 'monthly', ri_ss: 2000, ri_ss_freq: 'monthly', ri_ss_receiving: 'yes',
      otherAmount: 500, otherFreq: 'monthly', taxMode: 'manual', manualTaxRate: 22 };
    // other income $84,000 + $12,000 + $6,000 = $102,000; + half of $24,000 → $114,000, far over $34,000: 85% × $24,000 = $20,400
    const rows = taxedSourcesAnnual(op);
    expect(rows.map((r) => [r.key, r.amount])).toEqual([['wages', 84000], ['self-employment', 12000], ['other', 6000], ['social-security', 20400]]);
    expect(sum(rows.map((r) => r.amount))).toBe(taxableAnnual(op));
    const s = incomeSummary(op);
    expect(sum(s.taxed.lines.map((l) => l.amount))).toBe(s.taxed.grossAnnual);
    expect(s.taxed.grossAnnual).toBe(122400);
  });
});

describe('Social Security is taxed in part — IRS Publication 915, Worksheet 1, read the same on every screen', () => {
  test('the worksheet, by hand: single $36,000 with $48,000 of pension → $30,600; $24,000 alone → $0; jointly $30,000 with $30,000 → $3,500', () => {
    expect(socialSecurityTaxedAnnual(36000, 48000, 'single')).toBe(30600);
    expect(socialSecurityTaxedAnnual(24000, 0, 'single')).toBe(0);
    // jointly: $30,000 + $15,000 = $45,000, $13,000 over $32,000; min($13,000, $12,000) ÷ 2 = $6,000 (under half the benefits);
    // $1,000 over $44,000 → 85% × $1,000 = $850; $6,000 + $850 = $6,850, under 85% × $30,000
    expect(socialSecurityTaxedAnnual(30000, 30000, 'married')).toBeCloseTo(6850, 6);
    expect(socialSecurityTaxedAnnual(24000, 0, 'mfs')).toBeCloseTo(0.85 * 12000, 6);   // filing separately: no base (the lead's decision)
  });
  test('a retiree on $2,400/month of Social Security and nothing else: no tax, and every screen lands the $2,400', () => {
    const op: any = { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', filingStatus: 'single' };
    const s = incomeSummary(op);
    expect(s.taxed.grossAnnual).toBe(0);
    expect(s.taxed.tax).toBe(0);
    expect(s.taxed.lines).toEqual([{ label: 'Social Security, the part that is taxed', amount: 0 }]);
    expect(s.lands.usualMonth).toBe(2400);
    expect(incomeMonthlyGrid(op, 'available', NOW)[9].amount).toBeCloseTo(2400, 6);
    expect(inflowOf(op)).toBeCloseTo(2400, 6);
  });
});

describe('unemployment pay is taxed (IRC §85(a)) — the summary, the months and the tax agree', () => {
  test('$1,000/month of unemployment beside a $4,000 wage, a typed 20%: $800 lands from it, $12,000 taxed', () => {
    const op: any = { baseSalary: 4000, salaryFreq: 'monthly', benefitMonthly: 1000, benefitTypes: ['unemployment'], taxMode: 'manual', manualTaxRate: 20 };
    expect(extraIncome(op).taxableMonthly).toBe(1000);
    expect(taxedSourcesAnnual(op).find((r) => r.key === 'unemployment')!.amount).toBe(12000);
    const s = incomeSummary(op);
    expect(s.lands.lines.find((l) => l.label === 'Unemployment')!.amount).toBeCloseTo(800, 6);
    expect(s.lands.usualMonth).toBeCloseTo(incomeMonthlyGrid(op, 'available', NOW)[9].amount, 6);
    expect(s.lands.usualMonth).toBeCloseTo(inflowOf(op), 6);
  });
});

describe('money that lands once lands in its own year — with no year it waits, and every reader says so', () => {
  const GIFT: any = { baseSalary: 5000, salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: 0, otherAmount: 2000, otherFreq: 'onetime', otherMonth: 9, otherLabel: 'Gift' };
  test('no year: in no year\'s tax, no month of either table, "year not entered" on the summary and the manager', () => {
    expect(landsOnce(GIFT)[0]).toMatchObject({ kind: 'other', year: null, missing: 'year not entered' });
    expect(taxableAnnual(GIFT)).toBe(60000);
    expect(sum(incomeMonthlyGrid(GIFT, 'gross', NOW).map((m) => m.amount))).toBe(60000);
    expect(buildDatedGrid(GIFT, { now: NOW }).cells.flatMap((c) => c.incomeItems).some((i) => i.source === 'Gift')).toBe(false);
    expect(incomeSummary(GIFT).notCounted).toContain('Your Gift is not counted — year not entered.');
    expect(theIncomeManager(GIFT).entered.find((x) => x.key === 'other_income')!.tail).toBe('· year not entered');
  });
  test('a year with no month waits too — both are asked (the lead, 2026-10-25): "month not entered", in no year', () => {
    const yearOnly = { ...GIFT, otherMonth: undefined, otherIncomeYear: 2026 };
    expect(landsOnce(yearOnly)[0]).toMatchObject({ missing: 'month not entered', counts: false });
    expect(taxableAnnual(yearOnly)).toBe(60000);
    expect(incomeSummary(yearOnly).notCounted).toContain('Your Gift is not counted — month not entered.');
    expect(theIncomeManager(yearOnly).entered.find((x) => x.key === 'other_income')!.tail).toBe('· month not entered');
  });
  test('its year on record: September 2026, once — the month grid and the tax read it in 2026 and not in 2027', () => {
    const dated = { ...GIFT, otherIncomeYear: 2026 };
    expect(incomeMonthlyGrid(dated, 'gross', NOW)[8].amount).toBe(7000);
    expect(taxableAnnual(dated)).toBe(62000);
    expect(taxableAnnual(dated, new Date(2027, 2, 1))).toBe(60000);
  });
  test('a signing bonus dated October 17, 2026: October 2026 only — never each January', () => {
    const op: any = { baseSalary: 5000, salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: 0, signingOnetime: '7311.17', signingDate: '2026-10-17' };
    expect(incomeMonthlyGrid(op, 'gross', NOW)[9].amount).toBeCloseTo(12311.17, 6);
    expect(incomeMonthlyGrid(op, 'gross', NOW)[0].amount).toBe(5000);
    expect(inflowOf(op)).toBeCloseTo(12311.17, 6);                     // October 2026 is this month on the Cash flow table
    expect(taxableAnnual(op, new Date(2027, 2, 1))).toBe(60000);
  });
});

describe('the accounts\' interest and dividends count in the tax — the Income summary and the Tax organizer read one figure', () => {
  const SAV: any = { asset_id: 'sav-1', label: 'Savings', kind: 'savings', asset_class: 'cash', tax_bucket: 'CASH', balance: 10000, coupon_rate: 0.04 };
  const op: any = { baseSalary: 5000, salaryFreq: 'monthly', filingStatus: 'single' };
  test('the typed box blank and $700 of records in 2026: $700 taxed on both, reinvested so not in the take-home', () => {
    const tx = [{ account_id: 'sav-1', type: 'INTEREST', amount: 700, date: '2026-03-13' }];
    const fig = interestAndDividendsForYear(op, [SAV], tx, 2026, NOW);
    expect(fig).toMatchObject({ amount: 700, basis: 'records' });
    const s = incomeSummary(op, { accounts: [SAV], transactions: tx });
    expect(s.taxed.lines.find((l) => l.label === 'Interest & dividends')!.amount).toBe(700);
    const org = theTaxOrganizer({ profile: op, accounts: [SAV], debts: [], transactions: tx, year: 2026 });
    expect(org.income.find((l: any) => l.label === 'Interest & dividends')!.amount).toBe(700);
    expect(s.taxed.grossAnnual).toBe(60700);
    expect(s.lands.lines.some((l) => l.label === 'Interest & dividends')).toBe(false);   // not money to spend (DEC-0198)
  });
  test('no records and nothing typed: calculated from the account\'s rate, ≈$400, with its working', () => {
    const s = incomeSummary(op, { accounts: [SAV], transactions: [] });
    const row = s.taxed.lines.find((l) => l.label === 'Interest & dividends')!;
    expect(row).toMatchObject({ amount: 400, approx: true, note: 'calculated from your accounts' });
    const org = theTaxOrganizer({ profile: op, accounts: [SAV], debts: [], transactions: [], year: 2026 });
    expect(org.income.find((l: any) => l.label === 'Interest & dividends')!.amount).toBe(400);
  });
  test('nothing known: no number — no row on the Income summary', () => {
    expect(incomeSummary(op, { accounts: [], transactions: [] }).taxed.lines.map((l) => l.label)).toEqual(['Your gross']);
  });
});

describe('retirement income: each source answers "received now" for itself', () => {
  test('a $1,000 pension received and a $2,900 Social Security estimate answered "Not yet": $1,000 now, on every reader', () => {
    const op: any = { incomeSources: ['retirement_income'], ri_pension: '1000', ri_pension_freq: 'monthly', ri_ss: '2900', ri_ss_freq: 'monthly', ri_ss_receiving: 'no',
      taxMode: 'manual', manualTaxRate: 0 };
    expect(currentRetirementIncomeMonthly(op)).toBe(1000);
    expect(guaranteedReceivedNow(op)).toBe(1000);
    expect(incomeSummary(op).lands.usualMonth).toBe(1000);
    expect(inflowOf(op)).toBeCloseTo(1000, 6);
    expect(theIncomeManager(op).entered.find((x) => x.key === 'retirement_income')!.tail).toBe('· Social Security not received yet');
  });
});

describe('a joint return counts the spouse\'s 65-or-over answer, assumed or answered', () => {
  test('a spouse entered, the filing question never answered, both 65 or over → 2', () => {
    expect(over65CountOf({ hasPartner: 'yes', over65Who: 'both' } as any)).toBe(2);
    expect(over65CountOf({ filingStatus: 'married', over65Who: 'both' } as any)).toBe(2);
    expect(over65CountOf({ filingStatus: 'single', over65Who: 'both', birthYear: 1990 } as any)).toBe(0);   // not joint: the person's own age
  });
});
