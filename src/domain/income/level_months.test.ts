/* LEVEL MONTHS, AND A CARD THAT ADDS UP — the laws (2026-10-04).
 *
 * Found holding the Income summary to its drawing in the state the drawing does not show: the app
 * calculating the tax. Three things were wrong together.
 *   1. A calculated rate was laid on the months by filling the tax bands as the year went on, so a
 *      steady $7,000 salary read $7,000 of take-home in January and $5,460 in December.
 *   2. The calculated rate charged tax on money that had gone into a 401(k) (his audit B05 says it
 *      comes off first), so the base-pay card and the month grid disagreed about one take-home.
 *   3. The summary listed pay and rent only, so with tips, a pension, self-employment or a calculated
 *      rate its total was not the sum of its own rows.
 * These must hold for every household, not for an example.
 */
import { incomeMonthlyGrid, taxableAnnual, householdK401ByMonth, filingStatusOf, over65CountOf } from './onboarding';
import { taxOwedFor } from './tax';
import { rateInForce } from './tax-rate';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';
import { basePay, entryFromWage } from '../../../MoneyKeel/functions/cashflow/base-pay';
import { earnerWages } from './earners';

const WAGE = { baseSalary: '7000', salaryFreq: 'monthly' };
const COUPLE = { hasPartner: 'yes', partnerName: 'Sam', whoEarns: 'both' };
const STEADY: Record<string, any> = {
  'one wage, calculated': WAGE,
  'one wage and a 401(k), calculated': { ...WAGE, c_401k: '800' },
  'a fortnightly wage, calculated': { baseSalary: '2077', salaryFreq: 'biweekly', c_401k: '400' },
  'a wage and rent, calculated': { ...WAGE, rentalIncome: '1800', rentalExpenses: '600' },
  'a wage and reinvested dividends, calculated': { ...WAGE, c_401k: '800', invAnnual: '3000' },
  'a wage and dividends paid to the bank, calculated': { ...WAGE, invAnnual: '3000', invPaidToBank: 'yes' },
  'a wage, tips and support, calculated': { ...WAGE, tipsMonthly: '400', supportMonthly: '300' },
  'retired on Social Security, a pension and a side business, calculated': { ri_ss: '2400', ri_pension: '1000', seAmount: '500', seFreq: 'monthly' },
  'two wages, calculated, filing jointly': { ...WAGE, c_401k: '800', ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } },
  'a typed rate': { ...WAGE, c_401k: '800', rentalIncome: '1800', rentalExpenses: '600', taxMode: 'manual', manualTaxRate: '24' },
  'take-homes entered, rent and reinvested dividends (the approved drawing, frame 16)': { ...WAGE, c_401k: '800', landsTypical: '5000', ...COUPLE,
    partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400', landsTypical: '3300' }, invAnnual: '3000', rentalIncome: '1800', rentalExpenses: '600' },
  'one take-home entered, one calculated': { ...WAGE, landsTypical: '5000', ...COUPLE, partnerWage: { baseSalary: '4500', salaryFreq: 'monthly', c_401k: '400' } },
};
const lands = (op: any) => incomeMonthlyGrid(op, 'available').map((m) => m.amount);
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

const calculatedForAll = (op: any) => !rateInForce(op).mine && !earnerWages(op).some((w: any) => Number(w.landsTypical) > 0);
test('the guard looked: twelve households — nine calculated for everyone, one mixed, two with figures of their own', () => {
  expect(Object.keys(STEADY)).toHaveLength(12);
  expect(Object.values(STEADY).filter(calculatedForAll)).toHaveLength(9);
  expect(Object.values(STEADY).filter((op) => !rateInForce(op).mine)).toHaveLength(10);
});

describe.each(Object.entries(STEADY))('%s', (_name, op) => {
  test('THE LAW: steady income arrives as twelve equal months', () => {
    const m = lands(op);
    for (const x of m) expect(x).toBeCloseTo(m[0], 6);
    expect(m[0]).toBeGreaterThan(0);
  });

  test('THE LAW: the summary’s rows add up to its total, and its total is the month every other screen shows', () => {
    const s = incomeSummary(op);
    expect(s.lands.lines.length).toBeGreaterThan(0);
    expect(sum(s.lands.lines.map((l) => l.amount))).toBeCloseTo(s.lands.usualMonth, 6);
    expect(s.lands.usualMonth).toBeCloseTo(lands(op)[0], 6);
    expect(s.lands.standoutMonth).toBeNull();                        // nothing stands out when nothing is lumpy
  });

  test('THE LAW: the base-pay card and the month grid give each wage the same take-home', () => {
    const wages = earnerWages(op).filter((w: any) => Number(w.baseSalary) > 0);
    if (!wages.length) return;
    const card = basePay({ earners: wages.map((w, i) => ({ name: i ? 'Sam' : 'You', entry: entryFromWage(w) })),
      filingStatus: filingStatusOf(op), over65: over65CountOf(op), profile: op });
    const payRows = incomeSummary(op).lands.lines.filter((l) => /pay$/.test(l.label));
    expect(sum(payRows.map((l) => l.amount))).toBeCloseTo(card.landsInBank, 6);
  });
});

describe('a calculated rate', () => {
  const CALCULATED = Object.entries(STEADY).filter(([, op]) => calculatedForAll(op));
  test.each(CALCULATED)('THE LAW (B05): the year’s tax is the schedule’s tax on what is left after the 401(k) — %s', (_n, op) => {
    const gross = sum(incomeMonthlyGrid(op, 'gross').map((m) => m.amount)) + (op.invAnnual && op.invPaidToBank !== 'yes' ? Number(op.invAnnual) : 0);
    const net = sum(incomeMonthlyGrid(op, 'net').map((m) => m.amount)) + (op.invAnnual && op.invPaidToBank !== 'yes' ? Number(op.invAnnual) : 0);
    const untaxed = (Number(op.supportMonthly) || 0) * 12;
    const k401 = sum(householdK401ByMonth(op));
    expect(gross - untaxed).toBeCloseTo(taxableAnnual(op), 6);
    expect(gross - net).toBeCloseTo(taxOwedFor(taxableAnnual(op) - k401, filingStatusOf(op), 0, over65CountOf(op)), 6);
  });

  test('the worked case: $7,000/month with $800 into a 401(k), single — $628 of tax, $5,572 of take-home', () => {
    const op = STEADY['one wage and a 401(k), calculated'];
    expect(taxOwedFor(84_000 - 9_600)).toBeCloseTo(7_538, 0);        // $74,400 after the 401(k): $1,240 + $4,560 + $1,738
    expect(lands(op)[0]).toBeCloseTo(7_000 - 7_538 / 12 - 800, 6);
    expect(Math.round(lands(op)[0])).toBe(5_572);
  });
});

describe('a lump arrives in its own month, and only there', () => {
  const op: any = { ...WAGE, bonusAnnual: '12000', bonusMonth: 12 };
  test('THE LAW: eleven equal months and December', () => {
    const m = lands(op);
    for (let i = 0; i < 11; i++) expect(m[i]).toBeCloseTo(m[0], 6);
    expect(m[11] - m[0]).toBeCloseTo(12_000 * (1 - rateInForce(op).rate), 6);
  });
  test('the summary names December, with the bonus, and its usual month is the other eleven', () => {
    const s = incomeSummary(op);
    expect(s.lands.usualMonth).toBeCloseTo(lands(op)[0], 6);
    expect(s.lands.standoutMonth).toMatchObject({ label: 'December', note: 'with the bonus' });
    expect(s.lands.standoutMonth!.amount).toBeCloseTo(lands(op)[11], 6);
  });
});
