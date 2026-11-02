/** WHAT DO YOUR DEBTS ASK OF YOU, AND WHEN ARE THEY GONE? — the Debts tab's one door (2026-10-02).
 *
 *  The Budget screen's Debts tab added balances, minimums and interest up on the screen and called
 *  payoffPlan itself. A screen computes nothing (his rule, 2026-09-13), so the three figures it prints
 *  are handed out here, with their inputs and an example that runs.
 */
import { declareFigures } from '../_figure-spec';
import { payoffPlan, minimumDebtService, totalDebtMonthly, requiredPayment, rateNotEntered, debtToIncome, loanPayment, setupLoansSplit, type Debt, type PayoffMethod, type PayoffResult } from '../../../src/domain/debt';
import { totalGrossAnnual } from '../../../src/domain/income';
import { mortgagesByProperty, type MortgageCheck } from '../networth-and-performance/net-worth';   // which property each mortgage is on (DEC-1925)

export interface TheDebts {
  /** Every debt still owed, together. */
  totalBalance: number;
  /** The obligation — what the debts require of you in a month (MK-NW-M-012 is what you actually pay). */
  minimumMonthly: number;
  /** What actually leaves each month, across every debt. */
  paymentsMonthly: number;
  /** Interest accruing in a month at today's balances and rates. NOT A NUMBER when a debt's rate was never entered (2026-10-25,
   *  FIX-MONTH; tenet 3): `interestRefusal` names it. */
  interestMonthly: number;
  /** Why there is no interest figure: the debts whose rate was never entered. Null when there is a figure. */
  interestRefusal: string | null;
  /** EACH DEBT'S INTEREST IN A MONTH, by its id (2026-10-26, PF-TOOLS; MK-CF-M-089): balance × yearly rate ÷ 12, nothing for a
   *  debt whose rate was never entered. The Debts tab's row reads it here — it worked it out on the screen. */
  interestByDebt: Record<string, number | null>;
  /** What the plan puts to debts each month: what is paid on each debt — the payment set, never less than its minimum — plus
   *  anything extra (2026-10-25, FIX-MONTH; DEC-0641 "what actually leaves"; it was the minimums plus the extra). */
  planMonthly: number;
  /** The plan: months to debt-free, interest paid over it, and whether the payments can ever clear it. NULL when a debt's payment
   *  or rate was never entered (2026-10-25, FIX-MONTH; tenet 3, DEC-0296; CFR-3, MK-CF-O-018-C03) — no date and no "never": `refusal`
   *  says which is missing. */
  plan: PayoffResult | null;
  /** Why there is no payoff plan. Null when there is one. */
  refusal: string | null;
  /** PROGRESS (cash-flow_v01, frame 6: "$4,100 paid down since January — 24% of where you started").
   *  What the debts stood at on the first month-end we hold this year, less what they stand at now.
   *  Null — and the line is not drawn — where we hold no earlier figure, or the debts have not fallen:
   *  progress is read from two recorded totals, never estimated from the payments. */
  progress: { paidDown: number; share: number } | null;
  /** WHICH PROPERTY EACH MORTGAGE IS ON (2026-10-25, Cash flow drawing match CF-23; his rule DEC-1925, "no mortgage without
   *  property"): Net worth's one reading (MK-NW-F-106), so the Debts tab names the same property Net worth does, and says the
   *  same sentence about a mortgage on none. Null when no accounts were handed in. */
  mortgages: MortgageCheck | null;
}

/** What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function the Debts tab calls. */
/* ─ MK-CF-O-018 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theDebts
 *
 * Answers ..... What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?
 *
 * Formula .....
 *     active = input.debts (or none when missing) where (remaining balance or 0) > 0
 *     total now = Σ over active of (remaining balance (or 0 when missing or zero))
 *     began = input.start of year debt (or 0 when missing)
 *     paid down = began − total now
 *     plan = payoff plan(input.debts ?? [], input.extra monthly ?? 0, input.method ?? 'avalanche', input.now ?? new date())
 *     rate missing = active where rate not entered(each)for each of : label
 *     payments monthly = Σ over active of (required payment(each) read as a number (or 0 when missing or zero))
 *
 * Called by ... MK-CF-F-211 DEBTS · MK-CF-F-296 LOAD
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-296 LOAD
 *               MK-CF-F-295 debtLoad · MK-CF-F-315 debtsEntered
 *               MK-CF-F-314 setupEntered · MK-CF-F-305 setupLoanDebts
 *               MK-CF-F-302 setupLoanSentences · MK-CF-F-304 setupLoansAll
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-301 setupLoansSplit
 *               MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... MK-CF-M-057 · MK-CF-M-058 · MK-CF-M-059 · MK-CF-M-072
 *               MK-CF-M-073 · MK-CF-M-074 · MK-CF-M-075 · MK-CF-M-089
 *               MK-CF-M-096 · MK-CF-M-102 · MK-CF-M-103 · MK-CF-M-104
 *               MK-CF-M-105 · MK-CF-M-106 · MK-CF-M-107 · MK-CF-M-108
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *
 * Decides .....
 *     · If start of year debt is missing it uses 0.
 *     · If extra monthly is missing it uses 0.
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-018
 * Changed ..... not in git yet (—)
 */
export function theDebts(input: { debts: Debt[]; extraMonthly?: number; method?: PayoffMethod; now?: Date;
  /** what every debt together stood at on the earliest month-end recorded this year, if any */
  startOfYearDebt?: number | null;
  /** the accounts Net worth holds — where a mortgage's property is (CF-23) */
  accounts?: any[] }): TheDebts {
  const active = (input.debts ?? []).filter((d) => (d.remaining_balance || 0) > 0);
  const totalNow = active.reduce((t, d) => t + (d.remaining_balance || 0), 0);
  const began = input.startOfYearDebt ?? 0;
  const paidDown = began - totalNow;
  const plan = payoffPlan(input.debts ?? [], input.extraMonthly ?? 0, input.method ?? 'avalanche', input.now ?? new Date());
  const rateMissing = active.filter((d) => rateNotEntered(d)).map((d) => d.label);
  // what is paid, each debt's payment as requiredPayment gives it (the payment set, or its minimum); a payment never entered adds
  // nothing, and the screen names it as left out (2026-10-25, MK-CF-M-073 — it read NaN for a mortgage whose payment was blank)
  const paymentsMonthly = active.reduce((t, d) => t + (Number(requiredPayment(d)) || 0), 0);
  return {
    progress: began > 0 && paidDown > 0 ? { paidDown, share: paidDown / began } : null,
    totalBalance: active.reduce((t, d) => t + (d.remaining_balance || 0), 0),
    minimumMonthly: minimumDebtService(active),
    paymentsMonthly,
    // A RATE NEVER ENTERED IS NOT 0% (2026-10-25, FIX-MONTH; tenet 3): it was read as 0, so a mortgage whose rate the form never asks
    // cost "~$0/month interest". There is now no interest figure, and the sentence names the debt.
    interestMonthly: rateMissing.length ? NaN : active.reduce((t, d) => t + (d.remaining_balance || 0) * Number(d.interest_rate_apr) / 12, 0),
    interestRefusal: rateMissing.length
      ? `${rateMissing.join(' and ')}${rateMissing.length > 1 ? ' rates are' : '’s rate is'} not entered, so there is no interest figure — we won’t guess one.` : null,
    interestByDebt: Object.fromEntries(active.map((d) => [String(d.debt_id),
      rateNotEntered(d) ? null : (d.remaining_balance || 0) * Number(d.interest_rate_apr) / 12])),
    // THE PLAN PUTS TO DEBTS WHAT IS PAID ON THEM, plus the extra (2026-10-25, FIX-MONTH; DEC-0641): payoffPlan pays each debt its
    // payment set, never less than its minimum — the minimums alone read $450 where $550 is paid
    planMonthly: plan.notEntered.length ? NaN : paymentsMonthly + Math.max(0, input.extraMonthly ?? 0),
    plan: plan.notEntered.length ? null : plan,
    refusal: plan.notEntered.length ? payoffRefusal(plan.notEntered) : null,
    mortgages: input.accounts ? mortgagesByProperty(input.accounts as any, input.debts ?? []) : null,
  };
}

/** What it is for: THE ONE SENTENCE FOR A PAYOFF PLAN THAT CANNOT BE WORKED OUT (2026-10-25, FIX-MONTH; tenet 3, DEC-0296), in This
 *  month's words ("… not entered, so there is no planned surplus — we won’t guess one."): each debt whose payment or rate was never
 *  entered, named. "Car loan’s payment is not entered, so there is no payoff date — we won’t guess one." The Debts tab and the Goals
 *  tab print it, so one plan has one refusal. */
/* ─ MK-CF-F-252 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * payoffRefusal
 *
 * Answers ..... What it is for: THE ONE SENTENCE FOR A PAYOFF PLAN THAT CANNOT BE WORKED OUT (2026-10-25, FIX-MONTH; tenet 3, DEC-0296), in This month's words ("… not entered, so there is no planned surplus — we won’t guess one."): each debt whose payment or rate was never entered, named.
 *
 * Formula .....
 *     both = not entered where what.length > 1for each of : label
 *     pays = not entered where what.length = 1 and what[0] = 'payment'for each of : label
 *     rates = not entered where what.length = 1 and what[0] = 'rate'for each of : label
 *     clause = (names: string[], word: string) => `${names.join(' and ')}${names.length > 1 ? ` ${word}s` : `’s ${word}`}`
 *     parts = [...both.map((l) => `${l}’s payment and rate`), ...(pays.length ? [clause(pays, 'payment')] : []), ...(rates.length ? [clause(rates, 'rate')] : [])]
 *     many = parts.length > 1 (or both.length > 0 (or pays.length > 1 (or rates.length > 1 when missing or zero) when missing or zero) when missing or zero)
 *     the answer = `${parts.join(' and ')} ${many ? 'are' : 'is'} not entered, so there is no payoff date — we won’t guess one.`
 *
 * Called by ... MK-CF-O-018 theDebts
 *
 * Reaches ..... 12 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-296 LOAD
 *               MK-CF-F-295 debtLoad · MK-CF-F-315 debtsEntered
 *               MK-CF-F-314 setupEntered · MK-CF-F-305 setupLoanDebts
 *               MK-CF-F-302 setupLoanSentences · MK-CF-F-304 setupLoansAll
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-301 setupLoansSplit
 *               MK-CF-F-299 setupStudentLoans · MK-CF-O-018 theDebts
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-252
 * Changed ..... not in git yet (—)
 */
export function payoffRefusal(notEntered: { label: string; what: ('payment' | 'rate')[] }[]): string {
  const both = notEntered.filter((x) => x.what.length > 1).map((x) => x.label);
  const pays = notEntered.filter((x) => x.what.length === 1 && x.what[0] === 'payment').map((x) => x.label);
  const rates = notEntered.filter((x) => x.what.length === 1 && x.what[0] === 'rate').map((x) => x.label);
  const clause = (names: string[], word: string) => `${names.join(' and ')}${names.length > 1 ? ` ${word}s` : `’s ${word}`}`;
  const parts = [...both.map((l) => `${l}’s payment and rate`), ...(pays.length ? [clause(pays, 'payment')] : []), ...(rates.length ? [clause(rates, 'rate')] : [])];
  const many = parts.length > 1 || both.length > 0 || pays.length > 1 || rates.length > 1;
  return `${parts.join(' and ')} ${many ? 'are' : 'is'} not entered, so there is no payoff date — we won’t guess one.`;
}

/** What it is for: WHAT THE DEBTS ASK OF THE INCOME — debt-to-income, and the student loans repaid after study (2026-11-01, FX-CF-A; the
 *  lead's ruling: Goals v03 moved both off Goals, to Cash flow, under Debts). The figures are the Goals screen's, from its own functions,
 *  unchanged: debt-to-income is the minimums the debts oblige (MK-CF-F-025 minimumDebtService) ÷ income before tax a month
 *  (totalGrossAnnual ÷ 12), judged against 36% with a mortgage and 20% without (MK-CF-F-033 debtToIncome; DEC-0641: measured on the
 *  obligation, never on what someone chooses to pay). Each student loan with a rate and a term is repaid at MK-CF-F-028 loanPayment.
 *  Worked by hand: frame 6's $110 + $300 = $410 on $60,000/year → 410 ÷ 5,000 = 8.20%, healthy for a renter; $30,000 at 5.50% over
 *  10 years → $325.58 a month, $9,069.46 of interest, 325.58 ÷ 5,000 = 6.51% of today's income. No income entered: no ratio. */
/* ─ MK-CF-F-295 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtLoad
 *
 * Answers ..... What it is for: WHAT THE DEBTS ASK OF THE INCOME — debt-to-income, and the student loans repaid after study (2026-11-01, FX-CF-A; the lead's ruling: Goals v03 moved both off Goals, to Cash flow, under Debts).
 *
 * Formula .....
 *     op = profile (or none when missing)
 *     gross monthly = total gross annual(op) ÷ 12
 *     homeowner = (debts ?? []).some((d) => debt type = 'MORTGAGE')
 *     split = setup loans split(op, [])
 *     not debts = setup loans split(op, debts ?? [])
 *     as debt = not debts.owed.length + not debts.later.length = 0
 *     all = [...split.owed, ...split.later]
 *     borrowed = 0, monthly = 0, interest = 0
 *     starts later = for each of split.owed.length = 0 and split.later.length > 0 ? split.later: starts on!.sort()[0] : nothing
 *     loans = borrowed = borrowed
 *     monthly = monthly
 *     interest = interest
 *     share of income = monthly ÷ gross monthly   if gross monthly > 0
 *     nothing   otherwise
 *     starts later = starts later
 *     as debt = as debt   if borrowed > 0
 *     nothing   otherwise
 *     the answer = { dti, loans }
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-296 LOAD
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *
 * Decides .....
 *     · If apr percent is missing it uses 0.
 *     · If term years is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-295
 * Changed ..... not in git yet (—)
 */
export function debtLoad(profile: any, debts: Debt[]): {
  dti: { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; homeowner: boolean } | null;
  loans: { borrowed: number; monthly: number; interest: number; shareOfIncome: number | null; startsLater: string | null; asDebt: boolean } | null;
} {
  const op = profile ?? {};
  const grossMonthly = totalGrossAnnual(op) / 12;
  const homeowner = (debts ?? []).some((d) => d.debt_type === 'MORTGAGE');
  const dti = (debts ?? []).length > 0 && grossMonthly > 0
    ? { ...debtToIncome(minimumDebtService(debts), grossMonthly, homeowner), homeowner } : null;
  // EVERY SETUP LOAN NO DEBT ENTERED IS, OWED TODAY OR PAID OUT LATER (2026-11-01, the lead's R22b; CF5-02): the outlook showed only
  // for a loan owed today, so a loan paid out from Sep 2027 — the one state "once you're repaying" is written for — had no box
  // EVERY LOAN ENTERED IN SETUP, ONCE (2026-11-02, round 6, CF6-05): one also entered as a debt is counted once, as that debt — but its
  // outlook still shows; the split is read with no debts so a matched loan is not dropped from the box (asDebt: every one is a debt)
  const split = setupLoansSplit(op, []);
  const notDebts = setupLoansSplit(op, debts ?? []);
  const asDebt = notDebts.owed.length + notDebts.later.length === 0;
  const all = [...split.owed, ...split.later];
  let borrowed = 0, monthly = 0, interest = 0;
  for (const l of all) {
    borrowed += l.amount;
    if ((l.aprPct ?? 0) > 0 && (l.termYears ?? 0) > 0) { const p = loanPayment(l.amount, l.aprPct!, l.termYears!); monthly += p.monthly; interest += p.totalInterest; }
  }
  const startsLater = split.owed.length === 0 && split.later.length > 0 ? split.later.map((l) => l.startsOn!).sort()[0] : null;
  const loans = borrowed > 0 ? { borrowed, monthly, interest, shareOfIncome: grossMonthly > 0 ? monthly / grossMonthly : null, startsLater, asDebt } : null;
  return { dti, loans };
}

const EXAMPLE = {
  debts: [
    { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
    { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
  ] as any[],
  extraMonthly: 0, method: 'avalanche' as PayoffMethod, now: new Date('2026-10-01T12:00:00'),
};
const GIVEN = 'A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.';

/** Example only: runs theDebts on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-211 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * DEBTS
 *
 * Answers ..... Example only: runs theDebts on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the debts(EXAMPLE)
 *
 * Called by ... MK-CF-F-296 LOAD · MK-CF-F-304 setupLoansAll
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-314 setupEntered
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-304 setupLoansAll · MK-CF-F-303 setupLoansNotEntered
 *               MK-CF-F-301 setupLoansSplit · MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-211
 * Changed ..... not in git yet (—)
 */
const DEBTS = () => theDebts(EXAMPLE);

const LOAD_GIVEN = 'Debts frame 6 of cash-flow_v01: a $3,200 Visa with a $110 minimum and a $9,800 car loan with a $300 minimum, no mortgage, on $60,000/year of pay; and, for the student loans, $30,000 borrowed at 5.50% over 10 years.';
/** Example only: runs debtLoad on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-296 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LOAD
 *
 * Answers ..... Example only: runs debtLoad on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-296
 * Changed ..... not in git yet (—)
 */
const LOAD = () => debtLoad({ status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0',
  loans: [{ label: 'Student loan', amount: 30000, apr: 5.5, termYears: 10 }] },
  [{ debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 },
   { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 300 }] as any);
export const DEBT_FIGURES = declareFigures({
  'MK-CF-M-057': {
    label: '/month interest', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What your debts cost in interest in a month, at today’s balances and rates.',
    formula: 'Σ balance × yearly rate ÷ 12, over every debt still owed',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate'],
    refusal: 'No debts — $0. A debt whose rate was never entered: no figure, and the line names it (“… rate is not entered, so there is no interest figure — we won’t guess one.”).',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$261/month', run: () => DEBTS().interestMonthly },
  },
  'MK-CF-M-058': {
    label: 'debt-free', unit: 'count', screens: ['/cashflow'],
    period: 'from today until the last debt is paid off',
    answers: 'How many months until the last debt is cleared, paying what is paid on each debt — the payment you set, never less than its minimum — plus anything extra, highest rate first.',
    formula: 'the payoff plan: each month pay each debt its payment (the payment you set, never less than its minimum), put the extra on the costliest debt, roll a cleared debt’s payment onto the next',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate', 'MK-XS-I-016 debt minimum payment'],
    refusal: 'The payments cannot cover the interest — the screen says never, not a number. A debt whose payment or rate was never entered: no date and no “never” — the line names it (“… not entered, so there is no payoff date — we won’t guess one.”).',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '84', run: () => (DEBTS().plan!.neverPaysOff ? null : DEBTS().plan!.months) },
  },
  'MK-CF-M-059': {
    label: 'total interest', unit: 'money', screens: ['/cashflow'],
    period: 'from today until the last debt is paid off',
    answers: 'All the interest paid over the plan until the last debt is gone.',
    formula: 'the interest paid month by month over the payoff plan, added up',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate', 'MK-XS-I-016 debt minimum payment'],
    refusal: 'The payments cannot cover the interest — the screen says never, not a number. A debt whose payment or rate was never entered: no figure — the line names it.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$14,787', run: () => (DEBTS().plan!.neverPaysOff ? null : DEBTS().plan!.totalInterest) },
  },
  // MK-CF-M-071 "/month min" (every minimum added up) RETIRED 2026-10-26 (PF-TOOLS): no screen prints it since the Debts tab's
  // "in payments" became the payments set (his DEC-0641, 2026-10-25, CF-MMFIX-A) — that figure is MK-NW-M-012, the one sum of
  // each debt's required payment, which Net worth and Home print too. The door still hands out minimumMonthly; the number is on
  // the metric register's retired list and is never reused.
  // PER-DEBT INTEREST, ITS OWN NUMBER (2026-10-26, PF-TOOLS; CF-MMFIX-A's "figure IDs wanted"): each debt's row printed its month's
  // interest under MK-CF-M-057, the total of every debt — two figures under one number.
  'MK-CF-M-089': {
    label: '~$X/month interest', unit: 'money', per: 'month', screens: ['/cashflow'], grain: 'one debt',
    answers: 'What one debt costs in interest in a month, at today\u2019s balance and rate — on its own row.',
    formula: 'the debt\u2019s balance × its yearly rate ÷ 12 — the rule of MK-CF-M-057, for one debt (MK-CF-O-018 theDebts hands it by the debt)',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate'],
    refusal: 'A rate never entered: no interest on the row, which reads "rate not entered".',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: 'A credit card owing $9,000 at 24% a year, read today: 9,000 × 24% ÷ 12.', answer: '$180/month', run: () => theDebts(EXAMPLE).interestByDebt.c },
  },
  // WHAT IS STILL OWED WHEN THE PAYOFF WALK STOPS, ITS OWN NUMBER (2026-10-26, PF-TOOLS; CLEANUP-LEFT's finding): the Debts tab
  // printed it under MK-NW-M-009 (Net worth's DEBTS) and Goals with none — one figure, two screens, one number now
  'MK-CF-M-096': {
    label: '$X still owed then', unit: 'money', screens: ['/cashflow'],   // '/goals' dropped 2026-11-01 (lead): it only redirects to Plan · Goals now
    answers: 'What is still owed after a thousand years of payments that do get ahead of the interest — said instead of a payoff date.',
    formula: 'the balance of every debt still owed when the payoff plan stops at its 12,000th month (MK-CF-F-034 payoffPlan, past the horizon)',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate', 'MK-XS-I-041 the payment the person chose to make on a debt'],
    decisions: ['"NEVER" MUST BE PROVEN (2026-10-25, FIX-BILLS): a plan whose payments get ahead of the interest but do not finish is past the horizon, with what is still owed — never "never at this rate".'],
    refusal: 'Shown only when the plan is past the horizon; a plan that clears gives its date instead.',
    ruled: '2026-10-26',   // the lead's decision, made without asking him (decide, apply, report); its decision row is PF-RECORDS'
    worked: { given: 'A $10,000,000 loan at 0% paid at $1/month: 12,000 months pay $12,000.', answer: '$9,988,000',
      run: () => theDebts({ debts: [{ debt_id: 'x', label: 'Loan', debt_type: 'PERSONAL', remaining_balance: 10_000_000, interest_rate_apr: 0, minimum_monthly_payment: 1 }] as any[],
        extraMonthly: 0, method: 'avalanche', now: new Date('2026-10-01T12:00:00') }).plan?.stillOwed ?? null },
  },
  'MK-CF-M-072': {
    label: '/month total', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the payoff plan puts to debts each month: what you pay on each debt — the payment you set, never less than its minimum — plus the extra you set.',
    formula: 'Σ what is paid on each debt still owed (MK-CF-M-073: the payment you chose, its minimum where none is chosen or the one chosen is below it) + the extra a month you set',
    decisions: ['WHAT ACTUALLY LEAVES (his DEC-0641, Q53): a $300 payment set on a $200-minimum card and a $250 car loan put $550/month to the plan, not the $450 of minimums (2026-10-25, FIX-MONTH; CFR-5, MK-CF-M-073).'],
    inputs: ['MK-XS-I-016 debt minimum payment', 'MK-XS-I-041 the payment the person chose to make on a debt'],
    refusal: 'No debts — $0.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$450/month', run: () => DEBTS().planMonthly },
  },
  'MK-CF-M-074': {
    label: 'paid down since <month>', unit: 'money', screens: ['/cashflow'],
    period: 'since the first month-end on record this year, to today',
    answers: 'How much less you owe than at the first month-end we recorded this year.',
    formula: 'what every debt together stood at then − what they stand at now',
    inputs: ['MK-XS-I-014 debt balance'],
    decisions: ['READ FROM TWO RECORDED TOTALS, never estimated from the payments made — interest and new borrowing are inside it.',
      'NOT DRAWN where there is no earlier total to compare with, or the debts have not fallen.'],
    refusal: 'No earlier total on record, or the debts have not fallen — the line is not drawn.',
    ruled: '2026-10-03',
    worked: { given: `${GIVEN} They stood at $27,100 at the end of January.`, answer: '$4,100', run: () => theDebts({ ...EXAMPLE, startOfYearDebt: 27_100 }).progress?.paidDown ?? null },
  },
  'MK-CF-M-075': {
    label: '% of where you started', unit: 'percent', screens: ['/cashflow'],
    period: 'since the first month-end on record this year, to today',
    answers: 'That paid-down amount as a share of what you owed at the start.',
    formula: 'paid down (MK-CF-M-074) ÷ what every debt together stood at then',
    inputs: ['MK-XS-I-014 debt balance'],
    refusal: 'No earlier total on record, or the debts have not fallen — the line is not drawn.',
    ruled: '2026-10-03',
    worked: { given: `${GIVEN} They stood at $27,100 at the end of January.`, answer: '15%', run: () => theDebts({ ...EXAMPLE, startOfYearDebt: 27_100 }).progress?.share ?? null },
  },
  'MK-CF-M-073': {
    label: '/month', unit: 'money', per: 'month', screens: ['/cashflow', '/bill-calendar'], grain: 'one debt',
    answers: 'What you pay on one debt each month — the payment you set, or its minimum where you set none.',
    formula: 'the payment you chose for the debt; its minimum monthly payment where none is chosen',
    inputs: ['MK-XS-I-016 debt minimum payment', 'MK-XS-I-041 the payment the person chose to make on a debt'],
    refusal: 'A debt due in full on a date has no monthly payment — the line says when the whole balance is due.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$200/month', run: () => requiredPayment(EXAMPLE.debts[0]) },
  },
  // ── WHAT THE DEBTS ASK OF THE INCOME (2026-11-01, FX-CF-A): the two Goals sections, now on Debts — the same figures, under their own numbers ──
  'MK-CF-M-102': {
    label: 'debt-to-income', unit: 'percent-2dp', screens: ['/cashflow'],
    answers: 'How much of the income before tax the debts oblige each month — the share lenders read.',
    formula: 'the minimum payments the debts oblige each month (MK-CF-F-025) ÷ income before tax a month; healthy at 36% or less with a mortgage, 20% or less without; above that and up to 1.4 times the guide, getting high; beyond it, high (MK-CF-F-033 debtToIncome)',
    inputs: ['MK-XS-I-016 debt minimum payment', 'MK-XS-I-023 salary and other income'],
    decisions: ['MEASURED ON THE OBLIGATION (DEC-0641: the minimum stays on the door for debt-to-income), never on what someone chooses to pay.'],
    refusal: 'No income entered: "Your income is not entered, so there is no debt-to-income figure — we won’t guess one." No debt: the box is not drawn.',
    ruled: '2026-11-01',   // the lead's decision (moved from Goals, figures unchanged); its decision row is PF-RECORDS'
    worked: { given: LOAD_GIVEN, answer: '8.20%', run: () => LOAD().dti?.ratio ?? null },
  },
  'MK-CF-M-103': {
    // a payment, so written to the cent (Q49) — the sum beside the ratio then works as printed (the lead's R21, 2026-11-01; CF4-01):
    // $386.42 ÷ $5,000 = 7.73%, where "$386" ÷ $5,000 is 7.72%
    label: 'minimum debt payments', unit: 'money-cents', per: 'month', screens: ['/cashflow'],
    answers: 'What the debts oblige each month at their minimums — the top of the debt-to-income division.',
    formula: 'each debt’s minimum monthly payment, added up (MK-CF-F-025 minimumDebtService)',
    inputs: ['MK-XS-I-016 debt minimum payment'],
    refusal: 'No debt: the box is not drawn.',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '$410.00/month', run: () => LOAD().dti?.monthlyDebt ?? null },
  },
  'MK-CF-M-104': {
    label: 'income before tax a month', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'The income debt-to-income divides by: the year’s pay before tax, a twelfth of it.',
    formula: 'the year’s income before tax (totalGrossAnnual) ÷ 12',
    inputs: ['MK-XS-I-023 salary and other income'],
    refusal: 'No income entered: no ratio, and the box says so.',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '$5,000/month', run: () => LOAD().dti?.grossMonthly ?? null },
  },
  'MK-CF-M-105': {
    label: 'student loans borrowed', unit: 'money', screens: ['/cashflow'],
    answers: 'How much is borrowed in student loans, as entered in setup.',
    formula: 'each student loan’s amount, added up',
    inputs: ['the student loans entered in setup (amount, rate, years)'],
    refusal: 'No student loan entered: the box is not drawn.',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '$30,000', run: () => LOAD().loans?.borrowed ?? null },
  },
  'MK-CF-M-106': {
    label: 'student loan repayment', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the student loans will cost each month once they are being repaid.',
    formula: 'each loan with a rate and a term at the level repayment P × r ÷ (1 − (1 + r)^−n), r the rate ÷ 12, n the years × 12 (MK-CF-F-028 loanPayment), added up',
    inputs: ['the student loans entered in setup (amount, rate, years)'],
    refusal: 'A loan with no rate or term: "Add an interest rate and term to each loan (in setup) to see the monthly repayment."',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '$326/month', run: () => LOAD().loans?.monthly ?? null },
  },
  'MK-CF-M-107': {
    label: 'student loan total interest', unit: 'money', screens: ['/cashflow'],
    answers: 'The interest the student loans cost over their terms.',
    formula: 'each loan’s repayment × its months, less what was borrowed (MK-CF-F-028 loanPayment), added up',
    inputs: ['the student loans entered in setup (amount, rate, years)'],
    refusal: 'A loan with no rate or term adds none, and the box says how to add them.',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '$9,069', run: () => LOAD().loans?.interest ?? null },
  },
  'MK-CF-M-108': {
    label: 'the repayment as a share of today’s income', unit: 'percent-2dp', screens: ['/cashflow'],
    answers: 'How much of today’s income before tax the student loan repayment would take.',
    formula: 'the student loan repayment a month (MK-CF-M-106) ÷ income before tax a month (MK-CF-M-104)',
    inputs: ['the student loans entered in setup (amount, rate, years)', 'MK-XS-I-023 salary and other income'],
    refusal: 'No income entered: the line is not printed.',
    ruled: '2026-11-01',
    worked: { given: LOAD_GIVEN, answer: '6.51%', run: () => LOAD().loans?.shareOfIncome ?? null },
  },
} as const);
