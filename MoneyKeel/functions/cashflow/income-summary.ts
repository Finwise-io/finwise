// Cash flow · Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE. What LANDS is what you can spend. What you are TAXED ON is a different
// number and is labelled as one. Mixing them is how a take-home figure comes to include a bonus
// nobody has been paid yet — and how interest and dividends came to be counted as spendable when
// they are reinvested where they are earned and never reach the bank.
import { toNum, round2 } from '../../../src/domain/_shared/num';
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
 *     rent = round(rental net annual(op as any) ÷ 12, 2 dp)
 *     grid = income monthly grid(op as any, 'available')
 *     months = for each of grid: amount
 *     usual = round(months.slice().sort((x, y) => x − y)[math.floor(months.length ÷ 2)], 2 dp)   if count of months
 *     0   otherwise
 *     biggest = months.reduce((best, v, i) => (v > months[best] ? i : best), 0)
 *     taxed lines = []
 *     rent annual = round(rental net annual(op as any), 2 dp)
 *     inv = round(inv annual read as a number (0 when it is not one), 2 dp)
 *     bonus = round(bonus annual read as a number (0 when it is not one), 2 dp)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-004
 * Changed ..... not in git yet (—)
 */
export function incomeSummary(op: Record<string, any> | null): IncomeSummary {
  const a: any = op ?? {};
  const wages = earnerWages(op as any);
  const pay = basePay({
    earners: wages.map((w, i) => ({ name: i === 0 ? 'Your pay' : `${a.partnerName || 'Partner'}’s pay`, entry: entryFromWage(w) })),
    filingStatus: filingStatusOf(op as any), over65: over65CountOf(op as any), profile: op,
  });

  // ── the take-home ──────────────────────────────────────────────────────────────────────────────
  const landsLines: Line[] = pay.earners
    .filter((e) => e.pay.landsInBank > 0)
    .map((e) => ({ label: e.name, note: 'after tax and 401(k)', amount: round2(e.pay.landsInBank) }));
  const rent = round2(rentalNetAnnual(op as any) / 12);
  if (rent > 0) landsLines.push({ label: 'Rent', note: 'after running costs', amount: rent });

  const grid = incomeMonthlyGrid(op as any, 'available');
  const months = grid.map((g) => g.amount);
  const usual = months.length ? round2(months.slice().sort((x, y) => x - y)[Math.floor(months.length / 2)]) : 0;
  const biggest = months.reduce((best, v, i) => (v > months[best] ? i : best), 0);
  const standout = months.length && round2(months[biggest]) > usual + 1
    ? { label: grid[biggest].label, amount: round2(months[biggest]) } : null;

  // ── what it is taxed on ─────────────────────────────────────────────────────────────────────
  const taxedLines: Line[] = [];
  pay.earners.forEach((e) => {
    if (e.pay.grossAnnualised > 0) {
      taxedLines.push({ label: e.name.replace('’s pay', '’s gross').replace('Your pay', 'Your gross'),
                        amount: round2(e.pay.grossAnnualised) });
    }
  });
  const rentAnnual = round2(rentalNetAnnual(op as any));
  if (rentAnnual > 0) taxedLines.push({ label: 'Rent, net', amount: rentAnnual });
  const inv = round2(toNum(a.invAnnual));
  if (inv > 0) taxedLines.push({ label: 'Interest & dividends', amount: inv });
  const bonus = round2(toNum(a.bonusAnnual));
  if (bonus > 0) taxedLines.push({ label: 'Bonus', amount: bonus });

  const grossAnnual = round2(taxableAnnual(op as any));
  const inf = rateInForce(op as any);

  return {
    lands: { lines: landsLines, usualMonth: usual, standoutMonth: standout },
    taxed: {
      lines: taxedLines,
      grossAnnual,
      bracket: marginalBracketFor(grossAnnual, filingStatusOf(op as any), over65CountOf(op as any)),
      tax: round2(grossAnnual * inf.rate),
      whose: inf.label,
      estimated: inf.source === 'estimated',
    },
    // Taxed, and never landed. The screen says this rather than leaving a gap between two totals
    // that a person would otherwise have to work out for themselves.
    taxedNotLanded: round2(extraIncome(op as any).reinvestedMonthly),
    ready: salaryAnnual(op as any) > 0 || grossAnnual > 0,
  };
}
