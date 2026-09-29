// Cash flow · Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE. What LANDS is what you can spend. What you are TAXED ON is a different
// number and is labelled as one. Mixing them is how a take-home figure comes to include a bonus
// nobody has been paid yet — and how interest and dividends came to be counted as spendable when
// they are reinvested where they are earned and never reach the bank.
import { declareFigures } from '../_figure-spec';
import { toNum } from '../../../src/domain/_shared/num';
import { salaryAnnual, taxableAnnual, rentalNetAnnual, extraIncome, filingStatusOf,
         over65CountOf, incomeMonthlyGrid } from '../../../src/domain/income';
import { earnerWages } from '../../../src/domain/income/earners';
import { rateInForce } from '../../../src/domain/income/tax-rate';
import { marginalBracketFor } from '../../../src/domain/income/tax';
import { basePay, entryFromWage } from './base-pay';

export interface Line { label: string; note?: string; amount: number; }

export interface IncomeSummary {
  /** What reaches the bank, per month — the money that can be spent. */
  lands: { lines: Line[]; usualMonth: number; standoutMonth: { label: string; amount: number } | null };
  /** What the year is taxed on — a different number, and said to be one. */
  taxed: {
    lines: Line[];
    grossAnnual: number;
    bracket: number;          // the FEDERAL TAX BRACKET, named
    tax: number;              // the year's tax, at whichever rate is in force
    whose: string;            // 'your rate, 24%' · 'calculated, 9%'
    estimated: boolean;
  };
  /** Money that is taxed but never lands — said on the screen so the gap is never a mystery. */
  taxedNotLanded: number;
  ready: boolean;             // false on a fresh account: the screen keeps its shape and shows no $0
}

/** ── THE FIGURES THIS DOOR HANDS OUT (founder rule 11, 2026-09-14) ───────────────────────────────
 *  Declared beside the code that computes them; the master file's rows for the income screen are
 *  printed from this. TWO TOTALS, NEVER ONE — each figure says which of the two it belongs to.
 */
/** THE WORKED EXAMPLE — ONE HOUSEHOLD (six steps, step 6, 2026-09-28).
 *
 *  The same two earners the base-pay door uses, because it is the same household read one screen
 *  further up: $4,200 every two weeks and $5,000/month, $1,200 and $400 into 401(k)s, filing
 *  jointly, tax rate typed at 22%. Every figure runs `incomeSummary`, the real door.
 *
 *  TWO TOTALS, NEVER ONE — which is what this screen exists to say. $169,200 is what the year is
 *  TAXED on; $9,398/month is what LANDS. They are different numbers about the same wages, and the
 *  screen labels each rather than letting one stand for both.
 *
 *  WHAT THIS EXAMPLE FOUND, 2026-09-28: the two take-home lines add to $9,398, and the total beside
 *  them reads $9,798 — $400 more, which is exactly the spouse's monthly 401(k). The lines come from
 *  the base-pay door; the total comes from `incomeMonthlyGrid`, which reads `c_401k` from the profile
 *  and so only ever sees the FIRST earner's contribution. Two definitions of take-home in one
 *  function. The example below states the total the code gives today, so the row does not pretend
 *  otherwise, and the finding is on the master file rather than in a comment. Not changed here: it
 *  lowers a figure on a screen he reads, and that is his call (rule 10).
 */
const EXAMPLE = {
  taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
  baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
  partnerName: 'Sam',
  partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
};
const GIVEN =
  'Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), '
  + 'paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.';
/* ─ MK-CF-F-201 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * INCOME
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     income summary(EXAMPLE)
 *
 * Called by ... MK-CF-F-024 totalDebtMonthly
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               MK-NW-O-003 theNetWorth · MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-201
 * Changed ..... not in git yet (—)
 */
const INCOME = () => incomeSummary(EXAMPLE);

export const FIGURES = declareFigures({
  'MK-CF-M-037': {
    label: 'Take-home each month', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'What reaches the bank in a usual month, from every source of income added together.',
    formula: 'take-home a usual month = Σ of every source’s take-home in a usual month; a source that lands in one month of the year is not spread across twelve',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-008 retirement income'],
    decisions: ['A once-a-year source keeps its own month and is shown separately, never averaged in.'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income — never a dash.',
    note: 'FOUND BY THE WORKED EXAMPLE AND FIXED THE SAME DAY, 2026-09-28. This total read $9,798/month while the two take-home lines beneath it (MK-CF-M-038) added to $9,398 — $400 apart, exactly the spouse\'s monthly 401(k). MK-CF-F-060 salaryGrossByMonth sums EVERY earner\'s wage (his ruling, 2026-08-27) but the 401(k) taken off that household gross was written as the first earner\'s alone, so a spouse\'s was never subtracted — the take-home read too high by their contribution, and the taxable base too. NOT A NEW QUESTION: he ruled this on 2026-09-12 on income-end-to-end v07 — "one card disagreeing with itself; corrected to the take-home line" — and the correction reached the mock and not the code. Now MK-CF-F-206 householdK401ByMonth counts every earner in the months that earner is paid, and src/__tests__/guard_total_agrees_with_its_lines.test.ts holds the ruling. The six personas all passed throughout because none had a spouse with their own wage AND their own 401(k); twoEarnersBoth401k now does.',
    worked: {
      given: GIVEN,
      answer: '$9,398/month',
      run: () => INCOME().lands.usualMonth,
    },
  },
  'MK-CF-M-038': {
    label: 'each source of take-home', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'What each source of income puts into the bank in a usual month, named and listed.',
    formula: 'one line per source: the earner’s take-home, or the source’s monthly amount',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '$5,898/month',
      run: () => INCOME().lands.lines[0].amount,
    },
  },
  'MK-CF-M-039': {
    label: 'its own month, never spread', unit: 'money', screens: ['/income-summary'],
    answers: 'A source that arrives in one month of the year, shown in that month rather than divided by twelve.',
    formula: 'the standout month = the source whose whole year lands in a single month, with that amount and that month',
    inputs: ['MK-CF-I-009 bonus', 'MK-CF-I-010 equity vesting'],
    decisions: ['A lump that lands once is never averaged across the year (founder, 2026-08-28).'],
    ruled: '2026-09-14',
    refusal: 'The line is hidden when no source behaves this way.',
  },
  'MK-CF-M-040': {
    label: 'is not here — it is reinvested where it is earned', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.',
    formula: 'taxed but not landed = interest and dividends earned inside accounts, which stay where they are earned',
    inputs: ['MK-CF-I-011 interest and dividends'],
    ruled: '2026-09-14',
    refusal: 'The sentence is hidden when there is none.',
  },
  'MK-CF-M-041': {
    label: 'What it is taxed on', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'The whole year of income the tax is calculated on — a different number from the take-home, and said to be one.',
    formula: 'gross a year = Σ of every taxable source over the year, wages included at gross',
    inputs: ['MK-CF-M-030 gross a year', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-011 interest and dividends'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income.',
    worked: {
      given: GIVEN,
      answer: '$169,200/year',
      run: () => INCOME().taxed.grossAnnual,
    },
  },
  'MK-CF-M-042': {
    label: 'each taxed source', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'What each source contributes to the year the tax is calculated on.',
    formula: 'one line per taxable source, at its yearly amount',
    inputs: ['MK-CF-M-041 gross a year'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
    worked: {
      given: GIVEN,
      answer: '$109,200/year',
      run: () => INCOME().taxed.lines[0].amount,
    },
  },
  'MK-CF-M-043': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/income-summary'],
    answers: 'What the next dollar costs in federal income tax, with every source counted, not wages alone.',
    formula: 'the published bracket that the whole year’s gross falls in, for their filing status',
    inputs: ['MK-CF-M-041 gross a year', 'MK-XS-I-024 filing status'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    note: 'The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.',
    worked: {
      given: GIVEN,
      answer: '22%',
      run: () => INCOME().taxed.bracket,
    },
  },
  'MK-CF-M-044': {
    label: 'Calculated federal tax', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.',
    formula: 'tax a year = the rate in force × the year’s gross; when it is ours, federal tax on gross less the standard deduction at the published bands',
    inputs: ['MK-CF-M-041 gross a year', 'MK-CF-I-005 tax rate as entered', 'MK-XS-I-024 filing status'],
    decisions: ['When it is ours it assumes the standard deduction and is federal only (MK-CF-D-002).'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    worked: {
      given: GIVEN,
      answer: '$37,224/year',
      run: () => INCOME().taxed.tax,
    },
  },
} as const);

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT IS THIS HOUSEHOLD'S INCOME? The income screen calls THIS and nothing else.
 *
 *  It does no arithmetic beyond adding up what the functions below give it, so the two totals cannot
 *  be built from different sources than the rows above them.
 */
/* ─ MK-CF-O-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeSummary
 *
 * Answers ..... ── ORCHESTRATOR ──────────────────────────────────────────────────────────────────────────── WHAT IS THIS HOUSEHOLD'S INCOME?
 *
 * Formula .....
 *     a = op (or none when missing)
 *     wages = earner wages(op as any)
 *     rent = rental net annual(op as any) ÷ 12
 *     grid = income monthly grid(op as any, 'available')
 *     months = for each of grid: amount
 *     usual = months.slice().sort((x, y) => x − y)[math.floor(months.length ÷ 2)]   if count of months
 *     0   otherwise
 *     biggest = months.reduce((best, v, i) => (v > months[best] ? i : best), 0)
 *     taxed lines = []
 *     rent annual = rental net annual(op as any)
 *     inv = inv annual read as a number (0 when it is not one)
 *     bonus = bonus annual read as a number (0 when it is not one)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-201 INCOME
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-201 INCOME · MK-NW-F-082 NW
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-NW-O-003 theNetWorth
 *               MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-027
 *               MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040
 *               MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044
 *               MK-MN-M-011 · MK-MN-M-012 · MK-MN-M-013
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-004
 * Changed ..... not in git yet (—)
 */
export function incomeSummary(op: Record<string, any> | null): IncomeSummary {
  const a: any = op ?? {};
  const wages = earnerWages(op as any);
  const pay = basePay({
    earners: wages.map((w, i) => ({ name: i === 0 ? 'Your pay' : `${a.partnerName || 'Spouse'}’s pay`, entry: entryFromWage(w) })),
    filingStatus: filingStatusOf(op as any), over65: over65CountOf(op as any), profile: op,
  });

  // ── the take-home ──────────────────────────────────────────────────────────────────────────────
  const landsLines: Line[] = pay.earners
    .filter((e) => e.pay.landsInBank > 0)
    .map((e) => ({ label: e.name, note: 'after tax and 401(k)', amount: (e.pay.landsInBank) }));
  const rent = (rentalNetAnnual(op as any) / 12);
  if (rent > 0) landsLines.push({ label: 'Rent', note: 'after running costs', amount: rent });

  const grid = incomeMonthlyGrid(op as any, 'available');
  const months = grid.map((g) => g.amount);
  const usual = months.length ? (months.slice().sort((x, y) => x - y)[Math.floor(months.length / 2)]) : 0;
  const biggest = months.reduce((best, v, i) => (v > months[best] ? i : best), 0);
  const standout = months.length && (months[biggest]) > usual + 1
    ? { label: grid[biggest].label, amount: (months[biggest]) } : null;

  // ── what it is taxed on ─────────────────────────────────────────────────────────────────────
  const taxedLines: Line[] = [];
  pay.earners.forEach((e) => {
    if (e.pay.grossAnnualised > 0) {
      taxedLines.push({ label: e.name.replace('’s pay', '’s gross').replace('Your pay', 'Your gross'),
                        amount: (e.pay.grossAnnualised) });
    }
  });
  const rentAnnual = (rentalNetAnnual(op as any));
  if (rentAnnual > 0) taxedLines.push({ label: 'Rent, net', amount: rentAnnual });
  const inv = (toNum(a.invAnnual));
  if (inv > 0) taxedLines.push({ label: 'Interest & dividends', amount: inv });
  const bonus = (toNum(a.bonusAnnual));
  if (bonus > 0) taxedLines.push({ label: 'Bonus', amount: bonus });

  const grossAnnual = (taxableAnnual(op as any));
  const inf = rateInForce(op as any);

  return {
    lands: { lines: landsLines, usualMonth: usual, standoutMonth: standout },
    taxed: {
      lines: taxedLines,
      grossAnnual,
      bracket: marginalBracketFor(grossAnnual, filingStatusOf(op as any), over65CountOf(op as any)),
      tax: (grossAnnual * inf.rate),
      whose: inf.label,
      estimated: inf.source === 'estimated',
    },
    // Taxed, and never landed. The screen says this rather than leaving a gap between two totals
    // that a person would otherwise have to work out for themselves.
    taxedNotLanded: (extraIncome(op as any).reinvestedMonthly),
    ready: salaryAnnual(op as any) > 0 || grossAnnual > 0,
  };
}
