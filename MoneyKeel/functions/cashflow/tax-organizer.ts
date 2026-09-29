// Cash flow · What will my taxes look like — each taxable line, the deduction, the tax.
//
// THE DOOR for Q-CF-5. One screen, no decision for the founder — but it shares the tax function
// with Q-CF-1 (rule 2: ONE tax function), which is why it belongs behind a door rather than left to
// assemble itself beside a second copy of the same arithmetic.
//
// WHAT IT COUNTS AS INCOME IS WHAT THE RECORDS SHOW, not an estimate: the interest and dividends
// this person's accounts actually paid. An estimate on a tax page would be read as a figure to file.
import { declareFigures } from '../_figure-spec';
import { taxOrganizer, type TaxOrganizer } from '../../../src/domain/planning';
import { incomeFromAccounts } from '../../../src/domain/income/from-accounts';

/* ─ MK-CF-O-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theTaxOrganizer
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     year = input.year (or the date ).get full year( when missing)
 *     actual passive = round(income from accounts(input.accounts ?? [], input.transactions ?? []).annual)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-007
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theTaxOrganizer
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     year = input.year (or the date ).get full year( when missing)
 *     actual passive = round(income from accounts(input.accounts ?? [], input.transactions ?? []).annual)
 *
 * Called by ... MK-CF-F-202 TAX
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-202 TAX
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-007
 * Changed ..... not in git yet (—)
 */
export function theTaxOrganizer(input: {
  profile: any;
  accounts: any[];
  debts: any[];
  transactions: any[];
  year?: number;
}): TaxOrganizer {
  const year = input.year ?? new Date().getFullYear();
  // READ, not estimated: what the accounts actually paid
  const actualPassive = Math.round(incomeFromAccounts(input.accounts ?? [], input.transactions ?? []).annual);
  return taxOrganizer(input.profile, {
    accounts: input.accounts ?? [], liabilities: input.debts ?? [], actualPassive, year,
  });
}

/** THE WORKED EXAMPLE (six steps, step 6, 2026-09-28).
 *
 *  The same two earners as the income and base-pay doors, filing jointly for 2026. Both figures run
 *  `theTaxOrganizer`, the real door.
 *
 *  THE FOUR LINES A RETURN SHOWS, and they subtract in order: $169,200 of wages − $19,200 of 401(k)
 *  contributions − the $32,200 standard deduction = $117,800 actually taxed. Anyone can do that
 *  subtraction on paper and land where the screen lands.
 *
 *  Worth noting beside the Income screen's finding: the $19,200 here is BOTH earners' contributions,
 *  ($1,200 + $400) × 12. This door counts the household; `incomeMonthlyGrid` counts only the first
 *  earner. Two doors reading the same fact, one of them right.
 */
const EXAMPLE = {
  profile: {
    taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both',
    baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
    partnerName: 'Sam',
    partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 },
  },
  accounts: [] as any[], debts: [] as any[], transactions: [] as any[], year: 2026,
};
const GIVEN =
  'Filing jointly for 2026 on $169,200 of wages, with $19,200 paid into 401(k)s between the two of '
  + 'them and the $32,200 standard deduction.';
/* ─ MK-CF-F-202 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * TAX
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the tax organizer(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-202
 * Changed ..... not in git yet (—)
 */
const TAX = () => theTaxOrganizer(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const TAX_ORGANIZER_FIGURES = declareFigures({
  'MK-MN-M-027': {
    label: 'each taxable line and its amount', unit: 'money', screens: ['/tax-organizer'], grain: 'one line',
    answers: 'One line per kind of income the year is taxed on, and what it came to.',
    formula: 'wages, self-employment, rent, interest and dividends, and benefits — each from what you entered or what your accounts recorded',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-004 the activity records'],
    decisions: ['Interest and dividends come from the RECORDS where they exist, not from an estimate — an estimate on a tax page reads as a figure to file.'],
    refusal: 'A line with nothing behind it does not appear at all.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$169,200',
      run: () => TAX().income[0].amount,
    },
  },
  'MK-MN-M-028': {
    label: 'Gross income · 401(k) contribution · Standard deduction · Taxable income · Non-taxable',
    unit: 'money', screens: ['/tax-organizer'],
    answers: 'The walk from what you earned to what you are taxed on, in the order the form takes it.',
    formula: 'gross, less the 401(k), less the standard deduction for your filing status = taxable income',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-XS-I-030 tax filing status and age'],
    decisions: ['ONE tax function across the app (rule 2) — the same one that sets the band on your pay.'],
    refusal: 'No income entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$117,800',
      run: () => TAX().steps.taxableIncome,
    },
  },
});
