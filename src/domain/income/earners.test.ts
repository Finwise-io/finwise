/**
 * THE LAWS OF A TWO-EARNER HOUSEHOLD — finding B32.
 *
 * The app asked "Who earns this income? You / Spouse / Both", stored the answer, and kept ONE
 * salary. Choosing "Both" tagged that single wage as belonging to two people; there was nowhere to
 * put the second. So a household on $84,000 and $54,000 was read as $84,000 — and the tax band,
 * which is set by everything the household is taxed on together, came off the smaller number.
 *
 * These pin the arithmetic, not any one example: what matters is that a wage is counted once, that
 * adding a second wage never makes the household poorer, and that nothing changes for the people who
 * only ever had one.
 */
import { earnerWages, hasTwoEarners, sumOverEarners } from './earners';
import { salaryAnnual, salaryGrossByMonth, employerMatchMonthly } from './onboarding';

const ME: any = { baseSalary: '7000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '800',
                  employerMatchValue: '50', employerMatchMode: 'pct' };
const SAM: any = { baseSalary: '4500', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '400',
                   employerMatchValue: '150', employerMatchMode: 'dollar' };

test('one earner is unchanged — the whole point of the shape', () => {
  expect(earnerWages(ME)).toHaveLength(1);
  expect(hasTwoEarners(ME)).toBe(false);
  expect(salaryAnnual(ME)).toBeCloseTo(84_000, 2);
});

test('THE LAW: a second wage is added, never substituted', () => {
  const both = { ...ME, whoEarns: 'both', partnerWage: SAM };
  expect(hasTwoEarners(both as any)).toBe(true);
  expect(salaryAnnual(both as any)).toBeCloseTo(84_000 + 54_000, 2);
});

test('THE LAW: adding an earner never lowers the household total', () => {
  for (const partnerPay of [0, 1, 2500, 4500, 20_000]) {
    const both: any = { ...ME, whoEarns: 'both',
                        partnerWage: { ...SAM, baseSalary: String(partnerPay) } };
    expect(salaryAnnual(both)).toBeGreaterThanOrEqual(salaryAnnual(ME));
  }
});

test('THE LAW: the household month table is the earners added month by month', () => {
  const both: any = { ...ME, whoEarns: 'both', partnerWage: SAM };
  const mine = salaryGrossByMonth(ME);
  const total = salaryGrossByMonth(both);
  total.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(mine[i]));
  expect(total.reduce((t, x) => t + x, 0)).toBeCloseTo(84_000 + 54_000, 2);
});

test('THE LAW: every earner keeps their OWN match rule', () => {
  const both: any = { ...ME, whoEarns: 'both', partnerWage: SAM };
  // mine is 50% of my $800; Sam's is a flat $150 — two different rules, one household figure
  expect(employerMatchMonthly(ME)).toBeCloseTo(400, 2);
  expect(employerMatchMonthly(both)).toBeCloseTo(400 + 150, 2);
});

test('an empty spouse block is not a second earner', () => {
  const both: any = { ...ME, whoEarns: 'both', partnerWage: {} };
  expect(hasTwoEarners(both)).toBe(false);
  expect(salaryAnnual(both)).toBeCloseTo(84_000, 2);
});

test("whoEarns 'spouse' still counts the one wage on record, once", () => {
  // how the app has always stored it: one salary, tagged as the spouse’s
  const theirs: any = { ...ME, whoEarns: 'partner' };
  expect(earnerWages(theirs)).toHaveLength(1);
  expect(salaryAnnual(theirs)).toBeCloseTo(84_000, 2);
});

test('sumOverEarners adds across whoever is there', () => {
  const both: any = { ...ME, whoEarns: 'both', partnerWage: SAM };
  expect(sumOverEarners(both, (w) => Number(w.c_401k))).toBeCloseTo(1200, 2);
});
