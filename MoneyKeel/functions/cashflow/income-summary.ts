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
export const FIGURES = declareFigures({
  'MK-CF-M-037': {
    label: 'Take-home each month', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'What reaches the bank in a usual month, from every source of income added together.',
    formula: 'take-home a usual month = Σ of every source’s take-home in a usual month; a source that lands in one month of the year is not spread across twelve',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income', 'MK-CF-I-008 retirement income'],
    decisions: ['A once-a-year source keeps its own month and is shown separately, never averaged in.'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 on a fresh account, with the door to enter income — never a dash.',
  },
  'MK-CF-M-038': {
    label: 'each source of take-home', unit: 'money', per: 'month', screens: ['/income-summary'],
    answers: 'What each source of income puts into the bank in a usual month, named and listed.',
    formula: 'one line per source: the earner’s take-home, or the source’s monthly amount',
    inputs: ['MK-CF-M-031 household take-home', 'MK-CF-I-006 other income', 'MK-CF-I-007 rental income'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
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
  },
  'MK-CF-M-042': {
    label: 'each taxed source', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'What each source contributes to the year the tax is calculated on.',
    formula: 'one line per taxable source, at its yearly amount',
    inputs: ['MK-CF-M-041 gross a year'],
    ruled: '2026-09-14',
    refusal: 'The list is replaced by the door to enter income when nothing is entered.',
  },
  'MK-CF-M-043': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/income-summary'],
    answers: 'What the next dollar costs in federal income tax, with every source counted, not wages alone.',
    formula: 'the published bracket that the whole year’s gross falls in, for their filing status',
    inputs: ['MK-CF-M-041 gross a year', 'MK-XS-I-024 filing status'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
    note: 'The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.',
  },
  'MK-CF-M-044': {
    label: 'Calculated federal tax', unit: 'money', per: 'year', screens: ['/income-summary'],
    answers: 'The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.',
    formula: 'tax a year = the rate in force × the year’s gross; when it is ours, federal tax on gross less the standard deduction at the published bands',
    inputs: ['MK-CF-M-041 gross a year', 'MK-CF-I-005 tax rate as entered', 'MK-XS-I-024 filing status'],
    decisions: ['When it is ours it assumes the standard deduction and is federal only (MK-CF-D-002).'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until income is entered.',
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
 * Called by ... nothing — it is an entry point, or nothing reaches it
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
