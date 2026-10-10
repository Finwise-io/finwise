// Net worth · How long would my cash cover my essentials — the emergency fund, a job loss, a sudden hit.
//
// THE DOOR for Q-NW-5, ruled by the founder 2026-09-27: "Yes."
//
// Three screens ask this one question under three names — the emergency fund on Net worth, Job
// safety, and Stress test — and each took its own cash figure and its own essentials figure. The
// same person could read three different runways in one sitting.
//
// THE ONE ESSENTIALS FIGURE (his ruling G21/Q21/Q47, 2026-09-08): the average of what has actually
// been logged, over the months logged, with the label saying how many months it stands on. The typed
// plan is the fallback for someone who has logged nothing — never the other way round.
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import type { AssetAccount } from '../../../src/domain/assets';
import { cashTotal, propertyUseMap } from '../../../src/domain/assets';
import { rentFigure } from '../../../src/domain/_shared/num';
import { emergencyTest, monthlyEssentials, plannedMonthlySpend } from '../../../src/domain/budget';
import { paymentShape, type Debt } from '../../../src/domain/debt';
import { theBudgetCounted } from '../cashflow/budget-counted';
import { essentialsMonthly } from '../cashflow/essentials';
import { incomeSummary } from '../cashflow/income-summary';

export interface EmergencyFund {
  /** The money that could actually be spent this month. */
  cash: number;
  /** What you must keep paying on your debts each month — the minimums. You cannot stop paying a car
   *  loan or a card because your income stopped, so this belongs in BOTH figures below. */
  debtMinimums: number;
  /** The whole month, at the life you plan to live: everything you budget, plus the debt minimums. */
  plannedSpendMonthly: number;
  /** The same, cut back to what you could not stop: essentials plus the debt minimums. */
  monthsCoveredAtPlannedSpend: number | null;
  /** What a month of essentials costs — ONE figure, on all three screens. */
  essentialsMonthly: number;
  /** Where that figure came from, in the words the screen shows ("4 month average"). */
  essentialsBasis: string;
  /** RENT FROM A PROPERTY, a month — the Income summary's own Rent row, so the two screens can never
   *  show two figures for it. It keeps arriving when pay stops (founder, 2026-10-04), so each month
   *  it is added to the cash before the month is paid for. 0 with no rental. */
  rentalIncomeMonthly: number;
  /** DEC-3769 (founder, 2026-10-10): true when a property's rent is NOT KNOWN — a rent entry whose rent
   *  figure is blank or not a plain number (DEC-3768c), or rent entries that could not be read at all while
   *  a property other than the home is held. The months above are then counted without that rent, and the
   *  card says so: "<N> months, rent not included. Enter rent to include." A property with no rent entry
   *  is a second home (DEC-1926), not a missing rent, and a household with no such property is never flagged. */
  rentNotKnown: boolean;
  /** What the cash itself must find each month: essentials less that rent, never below zero. */
  fromCashMonthly: number;
  /** True when the rent alone pays for the month, so the cash is not drawn on and no count of
   *  months exists to state. */
  rentCoversEssentials: boolean;
  /** How many months the cash covers. Null when there is no essentials figure to divide by, and
   *  null when the rent covers the month by itself. */
  monthsCovered: number | null;
  /** What a target of N months costs, and how far off it is. */
  targetFor: (months: number) => { target: number; gap: number } | null;
  /** A sudden hit: what is left, and how long that would then last. */
  afterAShock: (shock: number) => { cashAfter: number; monthsAfter: number | null; coversIt: boolean };
  /** Set when the Rent / Mortgage budget line is NOT counted, because the home's mortgage is in Debts
   *  and is counted from there (his rule, 2026-10-04, DEC-1923). It replaces the old comparison of the
   *  budget line with the mortgage (DEC-0441, "use the budget"): Debts wins now, so there is nothing to
   *  reconcile — only something to say. Null for a renter and for a home with no mortgage. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence the screen shows when that line is not counted. Empty when it is. */
  budgetSentence: string;
}

/** How many months of essential expenses would my cash cover?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theEmergencyFund
 *
 * Answers ..... How many months of essential expenses would my cash cover?
 *
 * Formula .....
 *     cash = input.cash override   if input.cash override ≠ nothing
 *     cash total(input.accounts ?? [])   otherwise
 *     debts = input.debts (or none when missing)
 *     budget = the budget counted({ profile: input.profile, accounts: input.accounts ?? [], debts })
 *     profile = budget.profile
 *     minimum of = (d: any) => (payment shape(d) = 'due_in_full' ? 0 : math.max(0, number(minimum monthly payment) or 0))
 *     debt minimums = debts.reduce((t: number, d: any) => t + minimum of(d), 0)
 *     named = a list with no repeats of for each of debts: string(label)
 *     ess = essentials monthly(counted, monthly essentials(profile))
 *     planned = planned monthly spend(profile) + debt minimums
 *     rent = max(0, income summary(input.profile ?? {}).lands.rent monthly)
 *     from cash = max(0, monthly − rent)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-079 EF
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF
 *
 * Serves ...... MK-NW-M-046 · MK-NW-M-047 · MK-NW-M-048 · MK-NW-M-064
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-025 typical monthly essentials
 *               MK-XS-I-028 assumed return
 * Ruled by .... DEC-0103 · DEC-0158 · DEC-0175 · DEC-0260
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If monthly is missing it uses 0.
 *     · Never lets cash after fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-004
 * Changed ..... not in git yet (—)
 */
export function theEmergencyFund(input: {
  accounts: AssetAccount[];
  expenses: any[];
  profile: any;
  /** The debts, so their minimums are counted. Missing means none entered, not none owed. */
  debts?: Debt[];
  /** Stress test lets a person TRY a cash figure of their own. It is seeded from their real cash and
   *  editable, so the door takes what they typed and answers about that — the arithmetic is the same
   *  question, asked of a number they chose. Absent, the answer is about the cash they actually have. */
  cashOverride?: number;
  /** Job safety lets a person TYPE what a typical month of essentials comes to. Given, it stands in
   *  for the whole month — exactly as it did when that screen multiplied it out for itself. */
  essentialsOverride?: number;
}): EmergencyFund {
  const cash = input.cashOverride != null ? input.cashOverride : cashTotal(input.accounts ?? []);

  // WHAT YOU CANNOT STOP PAYING (founder, 2026-09-28: "What about credit card debt, HELOC, car loan?").
  // He is right and they were in NEITHER figure: a household with a $250 car loan, a $120 card minimum
  // and a $200 HELOC payment had $570/month missing from both, so its emergency fund read longer than
  // it is. You can skip dinner out; you cannot skip a car payment.
  //
  // THE ONE THING THAT WOULD DOUBLE-COUNT: a mortgage can be entered twice — once as the "Rent /
  // Mortgage" expense category and once as a Mortgage debt. Where both exist the category already
  // carries it, so the mortgage's minimum is left out. Every other debt is added.
  const debts = input.debts ?? [];
  // EVERY DEBT IS TAKEN FROM DEBTS — the home's mortgage included (his rule, 2026-10-04, DEC-1923:
  // "Once user enters mortgage or any debt - the app deduct it directly to calculate surplus,
  // emergency fund, and any other place instead of leaving it for user to add it to planned
  // expenses."). Until then the home's mortgage was LEFT OUT here whenever a Rent / Mortgage amount
  // was budgeted, so the budget line stood for it — which counted a home in neither part when the
  // figure came from logged expenses and the mortgage had never been logged. Now Debts stands for
  // every debt, and the budget line stands down (MK-CF-O-020 theBudgetCounted).
  //
  // WHAT A DEBT REQUIRES HERE IS ITS MINIMUM — what cannot be stopped. A payment a person chooses to
  // make above it can be stopped, and a balance due in one lump has no monthly payment.
  const budget = theBudgetCounted({ profile: input.profile, accounts: input.accounts ?? [], debts });
  const profile = budget.profile;
  const minimumOf = (d: any) => (paymentShape(d) === 'due_in_full' ? 0 : Math.max(0, Number(d?.minimum_monthly_payment) || 0));
  const debtMinimums = debts.reduce((t: number, d: any) => t + minimumOf(d), 0);
  // WHAT WAS LOGGED IS NOT COUNTED A SECOND TIME. A payment logged against a debt (an expense in the
  // category "Debt payment", named for the debt) and, where the home's mortgage is in Debts, anything
  // logged under "Rent / Mortgage", are payments on debts already counted above.
  const named = new Set(debts.map((d: any) => String(d.label)));
  const counted = ((input.expenses ?? []) as any[]).filter((e) =>
    !(e?.category === 'Debt payment' && named.has(String(e?.store ?? '')))
    && !(budget.homeMortgage != null && e?.category === 'Rent / Mortgage'));
  // ONE essentials figure, his ruling G21 — the logged average first, the typed plan as the fallback
  const ess = essentialsMonthly(counted, monthlyEssentials(profile));
  const monthly = input.essentialsOverride != null && input.essentialsOverride > 0
    ? input.essentialsOverride : (ess?.monthly ?? 0) + debtMinimums;

  const planned = plannedMonthlySpend(profile) + debtMinimums;

  // RENT FROM A PROPERTY KEEPS ARRIVING (founder, 2026-10-04: "add it to the cash as losing job does
  // not mean loosing rental income too"). It arrives EVERY month, so it is added to the cash every
  // month: after N months the cash is cash + N × rent, and it has paid for N × the month. The two
  // meet at cash ÷ (the month − the rent). Added once instead, a year of rent would count as a
  // single month of it and the fund would read shorter than it is.
  const rent = Math.max(0, incomeSummary(input.profile ?? {}).lands.rentMonthly);
  const fromCash = Math.max(0, monthly - rent);
  const plannedFromCash = Math.max(0, planned - rent);
  const rentCovers = monthly > 0 && rent >= monthly;

  // RENT NOT KNOWN (DEC-3769, 2026-10-10, his words: "How about we say "5 month xx, rent not included. Enter
  // rent to include." instead of just showing nothing."). The months stay counted without that rent; this
  // only says so. Three shapes, each needing a property that is not the home:
  //   · a rent entry whose rent figure is blank or not a plain number ("about 2k", DEC-3768c);
  //   · the old single rent figure typed but not a plain number;
  //   · rent entries stored in a shape that cannot be read at all — or, with none stored, a property kept
  //     as a rental. With none stored and no property kept as a rental, every other property is a second
  //     home (DEC-1926): no rent is missing.
  const p = input.profile ?? {};
  const uses = [...propertyUseMap(input.accounts ?? [], Array.isArray(p.rentals) ? p.rentals : null).values()];
  const otherProperty = uses.some((u) => u !== 'home');
  const legacyTyped = p.rentalIncome != null && String(p.rentalIncome).trim() !== '';
  const rentNotKnown = otherProperty && (Array.isArray(p.rentals)
    ? p.rentals.some((r: any) => rentFigure(r?.income) == null)
    : legacyTyped ? rentFigure(p.rentalIncome) == null
    : p.rentals != null || uses.includes('rental'));

  return {
    cash,
    rentLineInDebts: budget.rentLineInDebts,
    budgetSentence: budget.sentence,
    debtMinimums,
    plannedSpendMonthly: planned,
    monthsCoveredAtPlannedSpend: plannedFromCash > 0 ? cash / plannedFromCash : null,
    essentialsMonthly: monthly,
    essentialsBasis: ess?.label ?? '',
    rentalIncomeMonthly: rent,
    fromCashMonthly: fromCash,
    rentCoversEssentials: rentCovers,
    rentNotKnown,
    // never divided by nothing: with no essentials figure, or with the rent paying for the whole
    // month, there is no count of months to state
    monthsCovered: fromCash > 0 ? cash / fromCash : null,
    // NO ESSENTIALS FIGURE, NO TARGET AND NO MONTHS — a target of $0 reads as "you are covered" (outside
    // review). Where the rent pays for the month the target IS $0, and that is the true answer.
    targetFor: (months: number) => {
      if (!(monthly > 0)) return null;
      const target = fromCash * months;
      return { target, gap: Math.max(0, target - cash) };
    },
    afterAShock: (shock: number) => {
      const t = emergencyTest(input.profile, cash, shock, monthly);
      return { cashAfter: t.cashAfter, monthsAfter: fromCash > 0 ? Math.max(0, t.cashAfter) / fromCash : null, coversIt: t.coversIt };
    },
  };
}

/** THE WORKED EXAMPLE — ONE HOUSEHOLD, EVERY FIGURE ON THIS DOOR (six steps, step 6, 2026-09-28).
 *
 *  A person who is $18,000 in cash, pays rent, has a car loan and a card, and has logged nothing yet.
 *  Each figure's `worked.given` describes this household in words, and each `run` builds it, calls
 *  `theEmergencyFund` — the real door, not a copy of its arithmetic — and writes the answer with the
 *  same writer the screen uses. The master file prints the example; the suite runs it.
 *
 *  It is deliberately the awkward case: a mortgage entered BOTH as a Rent / Mortgage budget and as a
 *  Mortgage debt. That is the one shape that can double-count, and it is the one the code got wrong
 *  on 2026-09-28 (`type === 'mortgage'` against a field named `debt_type` holding 'MORTGAGE').
 *
 *  THE TWO MORTGAGE FIGURES ARE THE SAME NUMBER, and they have to be (founder, 2026-09-28: "when
 *  budget is $2,300 rent / mortgage, why is debt $2,400/month for mortgage?"). He is right and the
 *  first version of this example was incoherent: it budgeted $2,300 for the home while owing $2,400
 *  on it. Nobody's household looks like that, so it was not a case anyone could follow — and it moved
 *  the answer, because the door uses the BUDGET figure and leaves the debt's minimum out to avoid
 *  counting the home twice. Both are $2,400 now.
 *
 *  WHAT THAT EXPOSES, and it is worth knowing when reading the figure: where the two DO disagree, the
 *  door takes the budget line and ignores the mortgage's own minimum. Someone who budgets $2,300 for
 *  a mortgage that costs $2,400 is read $100/month light. Leaving it as-is is the deliberate choice —
 *  adding both would overstate the whole home payment, which is much worse — but the app does not
 *  yet tell them the two disagree. Raised on MK-NW-M-047's row.
 */
const EXAMPLE = {
  accounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE',
               balance: 18000, target_return: 0, asset_class: 'cash' },
             // the home the mortgage is on — a mortgage is always on a property (DEC-1925)
             { asset_id: 'h1', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0 }] as any[],
  expenses: [] as any[],
  profile: {
    monthlySpending: 0,
    spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', amount: 2400, bucket: 'fixed', tier: 'need' },   // the mortgage payment itself — the same $2,400 the debt below carries
      { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' },
      { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible', tier: 'flex' },
    ],
  } as any,
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 320000,
      interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000,
      interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
    { debt_id: 'd3', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3100,
      interest_rate_apr: 0.2199, minimum_monthly_payment: 120 },
  ] as any[],
};
const GIVEN =
  '$18,000 in checking, and a home. A $2,400/month mortgage on it, entered both as the Rent / Mortgage budget line and as a '
  + 'Mortgage debt — the same $2,400. It is counted once, from Debts; the budget line stands down. Plus $700 groceries (an '
  + 'essential) and $400 eating out (not). Also a car loan at $250/month and a Visa at $120/month. Nothing logged yet.';

/** Example only: runs theEmergencyFund on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-079 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * EF
 *
 * Answers ..... Example only: runs theEmergencyFund on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the emergency fund(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-025 typical monthly essentials
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Rounds the answer to 1 decimal place.
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-079
 * Changed ..... not in git yet (—)
 */
const EF = () => theEmergencyFund(EXAMPLE);

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const EMERGENCY_FUND_FIGURES = declareFigures({
  'MK-NW-M-013': {
    label: 'EMERGENCY FUND — X.X months', unit: 'months',
    // DEC-3836 (2026-10-10): also printed in the rent-not-known line on Stress test and on the runway card (Insights, Home)
    screens: ['/analytics', '/jobsafety', '/stress-test', '/insights', '/home'],
    answers: 'How many months your cash would cover, if your income stopped tomorrow.',
    formula: 'your cash ÷ (what a month of essentials costs − the rent from a property that keeps arriving each month)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-001 your logged expenses'],
    decisions: [
      'ONE essentials figure across all three screens (his ruling G21, 2026-09-08): the average of what has been logged, over the months logged.',
      'FOUNDER 2026-10-04: "add it to the cash as losing job does not mean loosing rental income too." Rent arrives every month, '
      + 'so it is added to the cash every month — which is the cash ÷ (the month − the rent).',
    ],
    refusal: 'No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '5.2 months',
      run: () => EF().monthsCovered,
    },
  },
  'MK-NW-M-046': {
    // the screen says "<n> at your planned spend" with the figure in front of it (NetWorthScreen:976)
    label: 'at your planned spend', unit: 'months', screens: ['/analytics'],
    grain: 'the household',
    answers: 'How many months your cash would cover if you carried on living exactly as you plan to.',
    formula: 'your cash ÷ (everything you budget for a month + the debt payments you cannot stop − the rent from a property that keeps arriving)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    decisions: [
      'FOUNDER 2026-09-28: "give both numbers." The figure above it is what you could not stop paying; '
      + 'this one is the life you plan to live. Neither is the whole truth alone, so the screen shows both.',
    ],
    refusal: 'No expense figure yet — it shows nothing rather than dividing by nothing.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '4.7 months',
      run: () => EF().monthsCoveredAtPlannedSpend,
    },
  },
  // /insights ADDED 2026-09-30 (B-117). Insights divided cash by expenses alone and never named the
  // debt at all; now it reads the door and prints these two beside the months, so a person can follow
  // the figure by hand. A figure gains a screen the day a screen starts printing it.
  'MK-NW-M-047': {
    label: 'Both include $X/month of debt payments you cannot stop', unit: 'money', per: 'month',
    screens: ['/analytics', '/insights'],
    answers: 'What your debts require of you each month, which neither runway can leave out.',
    formula: 'the minimum monthly payment of every debt, the home’s mortgage included; a balance due in one lump has none',
    inputs: ['MK-NW-I-002 your debts'],
    decisions: [
      'FOUNDER 2026-09-28: "What about credit card debt, HELOC, car loan?" They were in NEITHER figure. '
      + 'You can skip dinner out; you cannot skip a car payment.',
      'FOUNDER 2026-10-04 (DEC-1923): "Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, '
      + 'emergency fund, and any other place instead of leaving it for user to add it to planned expenses." So the home’s mortgage is '
      + 'counted here from Debts, and the Rent / Mortgage budget line stands down — the home is in the figure once.',
      'IT IS THE MINIMUM: a payment a person chooses to make above it can be stopped.',
    ],
    refusal: 'No debts entered — the line does not appear at all.',
    ruled: '2026-10-04',
    worked: {
      given: GIVEN,
      answer: '$2,770/month',
      run: () => EF().debtMinimums,
    },
  },
  'MK-NW-M-048': {
    // it is printed as the divisor in "<cash> cash ÷ <this>" (NetWorthScreen:976); the sentence
    // around it names it, so the figure itself carries no words of its own
    label: 'cash ÷ planned spend', unit: 'money', per: 'month',
    screens: ['/analytics', '/insights'], grain: 'the household',
    answers: 'What a month costs at the life you plan to live, including what your debts require.',
    formula: 'everything you budget for a month + the debt payments you cannot stop',
    inputs: ['MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No expense figure yet.',
    ruled: '2026-09-28',
    worked: {
      given: GIVEN,
      answer: '$3,870/month',
      run: () => EF().plannedSpendMonthly,
    },
  },
  'MK-NW-M-014': {
    label: 'of essentials covered by your cash — $X cash ÷ $Y/month essentials', unit: 'words',
    screens: ['/analytics'],
    answers: 'The sum written out, so the months figure can be checked by eye.',
    formula: 'your cash, and what a month of essentials costs',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-001 your logged expenses'],
    refusal: 'Nothing logged and no plan set.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$18,000 cash ÷ $3,470/month essentials',
      run: () => `${formatMoney(EF().cash)} cash ÷ ${formatMoney(EF().essentialsMonthly)}/month essentials`,
    },
  },
  'MK-MN-M-020': {
    label: 'N months of essentials is $X ($Y/month)', unit: 'words', screens: ['/jobsafety'],
    answers: 'What the emergency fund you are aiming for actually costs.',
    formula: '(what a month of essentials costs − the rent from a property that keeps arriving) × the number of months you chose',
    inputs: ['MK-CF-I-001 your logged expenses'],
    refusal: 'No essentials figure yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '6 months of essentials is $20,820 ($3,470/month)',
      run: () => `6 months of essentials is ${formatMoney(EF().targetFor(6)!.target)} (${formatMoney(EF().essentialsMonthly)}/month)`,
    },
  },
  'MK-MN-M-021': {
    label: 'Using $X/month from your logged expenses', unit: 'words', screens: ['/jobsafety'],
    answers: 'Where the essentials figure came from, and how many months it stands on.',
    formula: 'the average of the logged months, and the count of them',
    inputs: ['MK-CF-I-001 your logged expenses'],
    decisions: ['The label names the basis so nobody has to guess whether it is one month or a year (his ruling G21).'],
    refusal: 'Nothing logged — it says the plan you entered is being used instead.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'Using $3,470/month — you entered',
      run: () => `Using ${formatMoney(EF().essentialsMonthly)}/month — ${EF().essentialsBasis}`,
    },
  },
  'MK-MN-M-024': {
    label: 'You could cover a $X hit', unit: 'money', screens: ['/stress-test'],
    answers: 'Whether your cash would absorb a sudden cost.',
    formula: 'your cash minus the hit — and whether what is left is above zero',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'No cash entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'You could cover a $5,000 hit',
      run: () => (EF().afterAShock(5000).coversIt ? 'You could cover a $5,000 hit' : 'A $5,000 hit would take you past your cash'),
    },
  },
  'MK-MN-M-025': {
    label: "You'd have $X left — about N months of essentials", unit: 'words', screens: ['/stress-test'],
    answers: 'What would be left after the hit, and how long that would last.',
    formula: '(your cash − the hit) ÷ (what a month of essentials costs − the rent from a property that keeps arriving), never below zero',
    inputs: ['MK-NW-I-001 your accounts', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No essentials figure — the months are not stated rather than guessed.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: "You'd have $13,000 left — about 3.7 months of essentials",
      run: () => `You'd have ${formatMoney(EF().afterAShock(5000).cashAfter)} left — about ${(Math.round((EF().afterAShock(5000).monthsAfter as number) * 10) / 10).toFixed(1)} months of essentials`,
    },
  },
  'MK-NW-M-064': {
    label: 'rent from your property, which keeps arriving', unit: 'money', per: 'month',
    screens: ['/analytics', '/insights', '/stress-test', '/jobsafety'], grain: 'the household',
    answers: 'The rent that would still arrive each month if your pay stopped.',
    formula: 'the Rent row of your Income summary: rent less what the property costs to run, less the calculated tax when the tax rate is calculated',
    inputs: ['MK-CF-I-007 rental income'],
    decisions: [
      'FOUNDER 2026-10-04: "add it to the cash as losing job does not mean loosing rental income too."',
      'It is the same figure as the Income summary\'s Rent row, read from that function, so the two screens cannot show two rents.',
    ],
    refusal: 'No rental entered — the line does not appear at all.',
    ruled: '2026-10-04',
    worked: {
      given: GIVEN + ' And a rental house: $2,000/month of rent, $500/month to run, less $190/year of calculated tax on it, which is $15.83/month.',
      answer: '$1,484/month',
      run: () => theEmergencyFund({ ...EXAMPLE, profile: { ...EXAMPLE.profile, rentals: [{ type: 'long', income: 2000, expenses: 500 }] } }).rentalIncomeMonthly,
    },
  },
  'MK-MN-M-026': {
    label: 'your $X/month of essentials', unit: 'money', per: 'month', screens: ['/stress-test'],
    answers: 'What one month of the things you cannot skip costs.',
    formula: 'the average of the logged months; the typed plan only when nothing has been logged',
    inputs: ['MK-CF-I-001 your logged expenses'],
    refusal: 'Nothing logged and no plan set.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$3,470/month',
      run: () => EF().essentialsMonthly,
    },
  },
});
