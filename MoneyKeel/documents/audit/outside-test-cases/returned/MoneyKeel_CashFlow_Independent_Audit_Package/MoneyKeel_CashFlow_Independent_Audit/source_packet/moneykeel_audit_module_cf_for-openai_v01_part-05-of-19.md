# Cash flow — part 5 of 19: The income summary, the income manager, and income paid by accounts

15 cards, so 15 formula checks and 75 cases, and one `rules_held` line for each of the 41 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 5"` in your reply.

## Notes for this part

- MK-CF-O-004 carries an approved drawing. One case must be that household exactly as drawn.
- The income summary gives two totals that are not the same thing: what reaches the bank in a usual month, and the whole year the tax is worked on. Keep them apart in every case.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface AccountIncome {
  annual: number;
  lines: AccountIncomeLine[];
  covers: string;       // what is in the figure, in words
  missing: string | null;   // what we know we cannot see
}

export interface IncomeManager {
  /** The sources that have an amount, in the picker's order. */
  entered: ManagedSource[];
  /** The rest — one tap away, never hidden behind the picker they said no to. */
  notEntered: ManagedSource[];
  /** A bonus and stock belong to a job, so they are reached from the job's row: what is entered for
   *  the year and the words after it. Null while there is no job to attach them to. */
  bonusAndStock: { amount: number; tail: string } | null;
}

export interface IncomeSource {
  /** The words the screen prints, exactly. */
  label: string;
  /** The quieter second line — what makes this source what it is. */
  note: string;
  /** The amount, and the period it is stated in. Never converted silently. */
  amount: number;
  per: 'month' | 'year' | 'as entered';
  /** Which kind it is, for the row that opens its editor. */
  kind: 'salary' | 'self-employment' | 'bonus' | 'equity' | 'rental' | 'guaranteed';
}

export interface IncomeSummary {
  /** What reaches the bank, per month — the money that can be spent. */
  lands: { lines: Line[]; usualMonth: number;
    /** The Rent row's own amount — 0 with no rental. Named so another function can ask for the rent
     *  that arrives without finding a row by its label (the emergency fund counts it, 2026-10-04). */
    rentMonthly: number;
    /** The words on the total — his one wording for money arriving: "Inflow (income (take-home) + rent)". */
    totalLabel: string;
    /** The month that stands apart, named in full, with why: "December · with the bonus". */
    standoutMonth: { label: string; note: string; amount: number } | null };
  /** What the year is taxed on — a different number, and said to be one. */
  taxed: {
    lines: Line[];
    grossAnnual: number;
    bracket: number;          // the FEDERAL TAX BRACKET, named
    tax: number;              // the year's tax, at whichever rate is in force
    /** THE RATE IN FORCE (MK-CF-F-181 rateInForce), as a share of the year's taxed income — the one rate sign-up's income
     *  recap and every Cash flow screen use (2026-10-24: sign-up calculated its own, before the 401(k) came off). */
    rate: number;
    /** WHAT THE YEAR IS TAXED ON (MK-CF-M-041, 2026-10-24): the gross (grossAnnual, MK-CF-M-076) less the year's 401(k)s
     *  (k401Annual, MK-CF-M-077) — his DEC-0283: income before tax is gross less the 401(k). The bracket and a calculated
     *  tax are worked on this. */
    taxedOn: number;
    k401Annual: number;
    /** THE LINE UNDER A CALCULATED TAX — what the calculated rate holds (2026-10-24): federal only, or federal plus the state
     *  rate the person entered, which the rate in force adds (DEC-7608). */
    calculatedNote: string;
    whose: string;            // 'your rate, 24%' · 'calculated, 9%'
    estimated: boolean;
    /** How the household files, in the words the filing question uses — "Married filing jointly". */
    filing: string;
    /** The sentence under the tax line when the rate is the person's own (income-end-to-end_v07, frame 16). */
    closing: string;
  };
  /** Money that is taxed but never lands — said on the screen so the gap is never a mystery. */
  taxedNotLanded: number;
  /** How many earners have a wage entered — so a screen can say whose income a figure rests on. */
  wages: number;
  ready: boolean;             // false on a fresh account: the screen keeps its shape and shows no $0
}
```

## The cards

```json
[
 {
  "id": "MK-CF-O-004",
  "name": "incomeSummary",
  "kind": "orchestrator",
  "what_it_is_for": "What is this household's income: what reaches the bank each month, and what the year is taxed on?",
  "formula_in_words": "TAKE-HOME rows — everything that arrives in a usual month; after tax means × (1 − the rate in force, rateInForce): each earner's take-home above zero (from basePay); tips after tax, only when every month has pay; self-employment after tax; rent after running costs — whole when the rate is the person's own, after tax when the app calculates it; interest and dividends paid to the bank, the same way — and when they are reinvested and the rate is calculated, a row of MINUS the tax on them; Social Security and pension after tax; other monthly income after tax, or whole when marked not taxable; benefits paid in all twelve months, support and monthly scholarships, whole. Usual month = the rows added up. Rent arriving in a month = the rent row's own amount, zero with no rental or a rental that loses money; it is handed out by name because the emergency fund counts it. Standout month = the largest of the twelve monthly take-home figures (incomeMonthlyGrid, take-home), shown only when it is more than $1 above the usual month; its note reads with the bonus when a bonus is entered and that is the bonus month (December when no month is set). TAXED rows, each only when above zero: each earner's yearly gross; rent, net, for the year; interest and dividends for the year; the bonus. Yearly taxed total = taxableAnnual. Band = the federal band on that total less the household's 401(k) contributions for the year (they are not taxed — the same income the rate in force is worked on), by filing status. Tax = that total × the rate in force (rateInForce). Taxed but not received = interest and dividends in a month, unless they are paid to the bank. Ready when there is any salary or any taxed income. It also says how many earners have a wage entered, and marks each pay row as calculated or entered. Its closing line names the calculated rate as federal income tax only, or, when a state rate was entered, federal income tax plus that state rate written as a percent to two decimals. The rate in force is handed out beside the tax as a share of the yearly taxed total, so sign-up's income recap and taxes step read the same rate Cash flow does. The line under a calculated tax says what the calculated rate holds: federal only, or, when a state rate was entered, federal income tax plus that state rate written as a percent to two decimals. What it is taxed on = the yearly taxed total less the household's 401(k) contributions for the year, never below 0; the 401(k)s are handed out as the yearly taxed total less that, so the rows add up.",
  "handed": "export function incomeSummary(op: Record<string, any> | null): IncomeSummary",
  "inputs_it_reads": [
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-006",
    "words_on_screen": "YOUR SOURCES — Base salary",
    "unit": "money",
    "what_it_answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
    "when_it_refuses": "No salary entered — the row does not appear; the door to enter it does.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-007",
    "words_on_screen": "YOUR SOURCES — Self-employment",
    "unit": "money",
    "what_it_answers": "Self-employment income, net, in the period it was entered.",
    "when_it_refuses": "None entered — the row does not appear.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-008",
    "words_on_screen": "YOUR SOURCES — Bonus",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The bonus for the year and the month it lands.",
    "when_it_refuses": "None entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-009",
    "words_on_screen": "YOUR SOURCES — Stock vesting (equity)",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What vests in a year, valued at the price entered.",
    "when_it_refuses": "No equity entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-010",
    "words_on_screen": "YOUR SOURCES — Rental property",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What the rental brings in each month after its running costs.",
    "when_it_refuses": "No rental entered — the row does not appear.",
    "shown_on": [
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-011",
    "words_on_screen": "YOUR SOURCES — Social Security · pension",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Guaranteed income being received now — Social Security, pension, annuity and other — in a month.",
    "when_it_refuses": "None being received — the row does not appear.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-024",
    "words_on_screen": "each source of guaranteed income",
    "unit": "money",
    "per": "month",
    "what_it_answers": "One line per guaranteed source — Social Security, a pension, an annuity, other — and what it pays a month.",
    "when_it_refuses": "Nothing entered — the list is replaced by the door to enter it.",
    "shown_on": [
     "/monthly-income"
    ]
   },
   {
    "id": "MK-CF-M-027",
    "words_on_screen": "each income source and its amount",
    "unit": "money",
    "what_it_answers": "Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.",
    "when_it_refuses": "Nothing entered — the list is replaced by the one line \"Nothing entered yet. Add your income ›\" (Q48), which opens Base pay.",
    "shown_on": [
     "/income-manager",
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-037",
    "words_on_screen": "Take-home each month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What reaches the bank in a usual month, from every source of income added together.",
    "when_it_refuses": "Shows $0 on a fresh account, with the door to enter income — never a dash.",
    "shown_on": [
     "/income-summary",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-038",
    "words_on_screen": "each source of take-home",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What each source of income puts into the bank in a usual month, named and listed.",
    "when_it_refuses": "The list is replaced by the door to enter income when nothing is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-039",
    "words_on_screen": "its own month, never spread",
    "unit": "money",
    "what_it_answers": "What the month a once-a-year source lands in brings in, all of it — the usual take-home plus that source after tax — shown in its own month rather than divided by twelve.",
    "when_it_refuses": "The line is hidden when no source behaves this way.",
    "shown_on": [
     "/income-summary",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-040",
    "words_on_screen": "is not here — it is reinvested where it is earned",
    "unit": "money",
    "per": "month",
    "what_it_answers": "Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.",
    "when_it_refuses": "The sentence is hidden when there is none.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-041",
    "words_on_screen": "What it is taxed on",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The whole year of income the tax is calculated on — the gross less the 401(k)s — a different number from the take-home, and said to be one.",
    "when_it_refuses": "Shows $0 on a fresh account, with the door to enter income.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-042",
    "words_on_screen": "each taxed source",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What each source contributes to the year the tax is calculated on.",
    "when_it_refuses": "The list is replaced by the door to enter income when nothing is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-043",
    "words_on_screen": "Federal tax bracket",
    "unit": "percent",
    "what_it_answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
    "when_it_refuses": "The row is not shown until income is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-044",
    "words_on_screen": "Calculated federal tax",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.",
    "when_it_refuses": "The row is not shown until income is entered.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-066",
    "words_on_screen": "Dividends, interest & coupons",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What your holdings and bonds paid out over the last twelve months, from the records.",
    "when_it_refuses": "No record of any — $0, never an estimate.",
    "shown_on": [
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-069",
    "words_on_screen": "Your guaranteed income",
    "unit": "money",
    "per": "month",
    "what_it_answers": "All the guaranteed income being received now, added up for a month.",
    "when_it_refuses": "Nothing entered — $0, with the door to enter it.",
    "shown_on": [
     "/monthly-income"
    ]
   },
   {
    "id": "MK-CF-M-076",
    "words_on_screen": "= Gross /year",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The whole year of income before any deductions — every taxable source, wages at gross.",
    "when_it_refuses": "Not shown on a fresh account — the door to enter income stands in the list.",
    "shown_on": [
     "/income-summary"
    ]
   },
   {
    "id": "MK-CF-M-077",
    "words_on_screen": "Your 401(k)s",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What every earner puts into their own 401(k) over the year — taken off the gross before tax.",
    "when_it_refuses": "A real $0 when no 401(k) is entered; not shown on a fresh account.",
    "shown_on": [
     "/income-summary"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0178",
    "date": "2026-08-27",
    "words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0181",
    "date": "2026-08-27",
    "words": "fix it completely. No two functions doing same thing."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0182",
    "date": "2026-08-27",
    "words": "for orchestrator use O instead of F to make it easy to identify."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0188",
    "date": "2026-08-27",
    "words": "Who earns this income? You / Partner / Both"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0191",
    "date": "2026-08-28",
    "words": "your tax band, on everything you are taxed on"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0208",
    "date": "2026-09-02",
    "words": "worked out"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0389",
    "date": "",
    "words": "calculated (your standing order, 2026-09-02)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0431",
    "date": "",
    "words": "Nothing entered yet."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-006",
    "words": "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-008",
    "words": "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-037",
    "words": "A once-a-year source keeps its own month and is shown separately, never averaged in."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-039",
    "words": "A lump that lands once is never averaged across the year (founder, 2026-08-28)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-041",
    "words": "Income before tax is gross less the 401(k) and any other deduction; gross is before any deductions (DEC-0283, 2026-09-10)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-044",
    "words": "When it is ours it assumes the standard deduction and is federal only, plus a state rate entered (MK-CF-D-002, DEC-7608)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-044",
    "words": "The 401(k) comes off before tax (DEC-0283)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-076",
    "words": "Gross is before any deductions (DEC-0283, 2026-09-10). It was printed as MK-CF-M-041 until 2026-10-24, when that became the income after the 401(k)s."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-077",
    "words": "A 401(k) comes off the gross before tax (DEC-0283, 2026-09-10; founder audit B05)."
   }
  ],
  "approved_drawing": {
   "drawing": "Income end to end v07, frame 16 (approved 2026-09-02)",
   "household": "Earner 1 entered a take-home of $5,000 in a month; gross $84,000 a year. Earner 2 entered $3,300; gross $54,000 a year. Rent $1,800 a month with $600 of running costs. Interest and dividends $3,000 a year, left where they are earned. Bonus $12,000, paid in December.",
   "drawn": {
    "Take-home in a usual month": 9500,
    "What the year is taxed on": 167400
   }
  },
  "decisions_that_govern_it": [
   "DEC-0078",
   "DEC-0108",
   "DEC-0149",
   "DEC-0152",
   "DEC-0165",
   "DEC-0166",
   "DEC-0178",
   "DEC-0179",
   "DEC-0181",
   "DEC-0182",
   "DEC-0184",
   "DEC-0187",
   "DEC-0188",
   "DEC-0189",
   "DEC-0191",
   "DEC-0194",
   "DEC-0195",
   "DEC-0196",
   "DEC-0197",
   "DEC-0207",
   "DEC-0208",
   "DEC-0209",
   "DEC-0375",
   "DEC-0376",
   "DEC-0387",
   "DEC-0389",
   "DEC-0431",
   "DEC-1668",
   "DEC-1859",
   "DEC-1924",
   "DEC-7795",
   "DEC-7796",
   "DEC-7797",
   "DEC-7798",
   "DEC-7887",
   "DEC-7933",
   "DEC-7940"
  ],
  "period": [
   "MK-CF-M-006: no period on the figure — one earner",
   "MK-CF-M-007: no period on the figure",
   "MK-CF-M-008: a year",
   "MK-CF-M-009: a year",
   "MK-CF-M-010: a month",
   "MK-CF-M-011: a month",
   "MK-CF-M-024: a month — one source",
   "MK-CF-M-027: no period on the figure — one source",
   "MK-CF-M-037: a month",
   "MK-CF-M-038: a month",
   "MK-CF-M-039: no period on the figure",
   "MK-CF-M-040: a month",
   "MK-CF-M-041: a year",
   "MK-CF-M-042: a year",
   "MK-CF-M-043: no period on the figure",
   "MK-CF-M-044: a year",
   "MK-CF-M-066: a year",
   "MK-CF-M-069: a month",
   "MK-CF-M-076: a year",
   "MK-CF-M-077: a year"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-006: No salary entered — the row does not appear; the door to enter it does.",
   "MK-CF-M-007: None entered — the row does not appear.",
   "MK-CF-M-008: None entered — the row does not appear.",
   "MK-CF-M-009: No equity entered — the row does not appear.",
   "MK-CF-M-010: No rental entered — the row does not appear.",
   "MK-CF-M-011: None being received — the row does not appear.",
   "MK-CF-M-024: Nothing entered — the list is replaced by the door to enter it.",
   "MK-CF-M-027: Nothing entered — the list is replaced by the one line \"Nothing entered yet. Add your income ›\" (Q48), which opens Base pay.",
   "MK-CF-M-037: Shows $0 on a fresh account, with the door to enter income — never a dash.",
   "MK-CF-M-038: The list is replaced by the door to enter income when nothing is entered.",
   "MK-CF-M-039: The line is hidden when no source behaves this way.",
   "MK-CF-M-040: The sentence is hidden when there is none.",
   "MK-CF-M-041: Shows $0 on a fresh account, with the door to enter income.",
   "MK-CF-M-042: The list is replaced by the door to enter income when nothing is entered.",
   "MK-CF-M-043: The row is not shown until income is entered.",
   "MK-CF-M-044: The row is not shown until income is entered.",
   "MK-CF-M-066: No record of any — $0, never an estimate.",
   "MK-CF-M-069: Nothing entered — $0, with the door to enter it.",
   "MK-CF-M-076: Not shown on a fresh account — the door to enter income stands in the list.",
   "MK-CF-M-077: A real $0 when no 401(k) is entered; not shown on a fresh account."
  ]
 },
 {
  "id": "MK-CF-O-016",
  "name": "incomeSources",
  "kind": "orchestrator",
  "what_it_is_for": "Which sources of income has this household entered, and what does each one bring in?",
  "formula_in_words": "One row for each of these, only when its amount is above zero: every earner with a base salary or a month table (steady or varies; named You or the spouse when there are two); self-employment (monthly or yearly, as entered); the bonus for the year, with its month; stock vesting for the year (rsuAnnual); rental property = net rent for the year ÷ 12, per month; Social Security and pension together, per month (retirementIncomeMonthly).",
  "handed": "export function incomeSources(op: Record<string, any> | null): IncomeSource[]",
  "inputs_it_reads": [
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-059 the month a bonus lands",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-O-019",
  "name": "theIncomeManager",
  "kind": "orchestrator",
  "what_it_is_for": "Which of the ten sources of income has this household entered, what does each one's line say, and which are still one tap away?",
  "formula_in_words": "Takes the ten sources in the picker's order — a job, self-employment, rent, interest and dividends, retirement income, benefits, support, scholarships, student loans, something else — gives each one figure, and splits them into entered (a figure above zero) and not entered. A job: the household's monthly take-home (basePay) over the earners who have a wage, named after those earners, and marked as calculated when any part of it is. Self-employment: the amount as entered, per month or per year. Rent: rent after running costs for the year (rentalNetAnnual) ÷ 12, per month, with how many properties (1 property; the plural from plural, the one list of words — his ruling of 2026-10-10). Interest and dividends: the yearly amount, marked reinvested or paid to the bank. Retirement income: the monthly total (retirementIncomeMonthly). Benefits: the monthly benefit, saying how many months when fewer than 12. Support: the monthly amount. Scholarships: monthly ones × 12 plus yearly ones, per year. Student loans: each loan × the number of months it arrives in (1 when it names none), per year. Something else: the amount as entered — per month, per year or one-time. Bonus and stock, only when there is a job: the yearly bonus + the stock that vests in a year (rsuAnnual), and the month the bonus is paid (December when none is set).",
  "handed": "export function theIncomeManager(op: Record<string, any> | null): IncomeManager",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-030 tax filing status and age",
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-210",
  "name": "annualOfSource",
  "kind": "function",
  "what_it_is_for": "A source's yearly amount: a monthly one × 12, a yearly one as it is, a salary from its pay period.",
  "formula_in_words": "A source stated per month: amount × 12. Per year: as it is. A salary row (stated as entered): the household's yearly salary (salaryAnnual), or the row's own amount when that is zero.",
  "handed": "export function annualOfSource(x: IncomeSource, op?: Record<string, any> | null): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-182",
  "name": "asPercent",
  "kind": "function",
  "what_it_is_for": "A rate as the person would say it: 3.8%, not 0.038.",
  "formula_in_words": "A rate × 100, to two decimals at most, followed by a percent sign.",
  "handed": "const asPercent = (r: number)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "kind": "function",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, and naming an account, added by account — each counted as the money it moved into the account: when the record says which way the money went, its size, minus when it left (a reversed payment takes away what it had added); otherwise its amount with the sign it was stored with; a record whose amount is not on record (missing, blank or not a number) adds nothing. A record that names no account is not counted.",
  "handed": "function paidOutByAccount(txns: any[] | null | undefined, now: Date): Map<string, number>",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-6796"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "kind": "function",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "formula_in_words": "For each account, the first that applies. (1) It paid out more than zero over the trailing twelve months (paidOutByAccount): that amount, said as paid out over the trailing twelve months. (2) A bond or CD, by the one rule for its year of interest (yearlyInterestNow): no rate entered → $0, said so (owner A46), marked as assumed; a rate but no year's interest — a bond with a maturity date and no face value — → $0, said to be the face value not entered, marked as assumed; past its maturity date → $0, said to be matured on that date; a face value entered → the rate × the face value; otherwise (a CD bought from the bank typed by its balance, or a bond fund) → the rate × the balance. (3) Cash with a rate above zero: rate × balance. (4) Any other account with a balance above zero is named as not counted; foreign currency is skipped. Yearly income = the rows added.",
  "handed": "export function incomeFromAccounts(\n  accounts: AssetAccount[] | null | undefined,\n  transactions?: any[] | null,\n  now: Date = new Date(),\n): AccountIncome",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-003 institution name",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [
   "DEC-0279",
   "DEC-7171",
   "DEC-7933"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-127",
  "name": "isRental",
  "kind": "function",
  "what_it_is_for": "Whether an income source is rent from a property, long-term or short-term.",
  "formula_in_words": "True for a long-term rental or a short-term rental.",
  "handed": "const isRental = (t: string)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-044",
  "name": "annualNet",
  "kind": "function",
  "what_it_is_for": "Annual NET contribution of a source: jobs use gross; rentals net out operating expenses.",
  "formula_in_words": "The amount each period — for rent, rent less running costs each period — × the periods in a year: weekly 52, every two weeks 26, monthly 12, quarterly 4, yearly 1, one-off 1.",
  "handed": "export function annualNet(s: IncomeSource): number",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "kind": "function",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source.",
  "handed": "export function grossAnnualBaseline(sources: IncomeSource[]): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-046",
  "name": "employerMatchAnnual",
  "kind": "function",
  "what_it_is_for": "The employer's 401(k) match for a year, added up across every job.",
  "formula_in_words": "Each source's employer match each period × its periods in a year, added.",
  "handed": "export function employerMatchAnnual(sources: IncomeSource[]): number",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-161",
  "name": "monthlyGrossOfSource",
  "kind": "function",
  "what_it_is_for": "The gross amount one income source brings in each of the twelve months, with rent taken after its running costs and lump payments placed in the months they arrive.",
  "formula_in_words": "Twelve calendar months; rent is taken after running costs. Monthly: the amount every month. Weekly: amount × 52 ÷ 12 every month. Every two weeks: amount × 26 ÷ 12 every month. Quarterly: the amount in March, June, September and December. Yearly: the amount in its month (December when none) — or split across its months by their shares. One-off: the amount in its month (January when none).",
  "handed": "function monthlyGrossOfSource(s: IncomeSource): number[]",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-049",
  "name": "buildIncomeState",
  "kind": "function",
  "what_it_is_for": "The income picture for a year: gross, tax rate and take-home, and the gross, tax and take-home of each of the twelve months.",
  "formula_in_words": "Yearly gross = grossAnnualBaseline. Rate = effectiveTaxRate. Yearly after-tax = gross × (1 − rate); monthly after-tax = that ÷ 12. Month grid: each source's gross laid on the calendar (monthlyGrossOfSource), added by month. Tax each month = that month's gross × the rate, when the person's own rate is on; otherwise the federal tax on the year's running total up to and including that month, minus the tax up to the month before — worked AS A SINGLE FILER, with no state tax. After-tax that month = gross − tax. Employer match for the year = employerMatchAnnual.",
  "handed": "export function buildIncomeState(userId: string, sources: IncomeSource[], tax: TaxProfile): IncomeState",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-129",
  "name": "round4",
  "kind": "function",
  "what_it_is_for": "Returns a number unchanged, because rounding is done once, where a figure is shown.",
  "formula_in_words": "The number unchanged.",
  "handed": "const round4 = (n: number)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-052",
  "name": "getIncomeState",
  "kind": "function",
  "what_it_is_for": "The public read-model (spec IncomeState): totals, effective rate, monthly grid.",
  "formula_in_words": "Loads the stored income and gives buildIncomeState of it; nothing when none is stored.",
  "handed": "export async function getIncomeState(uid: UserId): Promise<IncomeState | null>",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

30 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-048",
  "name": "effectiveTaxRate",
  "what_it_is_for": "The share of gross income that goes to tax: the person's own rate where they gave one, otherwise the calculated federal rate for the way they file.",
  "formula_in_words": "With the person's own rate switched on: that rate, held between 0 and 1. Otherwise federal income tax on the yearly gross ÷ the yearly gross, by filing status (single when none), with no state tax (effectiveRateOnGrossFor)."
 },
 {
  "id": "MK-CF-F-060",
  "name": "salaryGrossByMonth",
  "what_it_is_for": "Per-month GROSS base salary, Jan→Dec.",
  "formula_in_words": "Each earner's twelve months of gross pay (wageGrossByMonth), added month by month."
 },
 {
  "id": "MK-CF-F-066",
  "name": "rsuAnnual",
  "what_it_is_for": "Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).",
  "formula_in_words": "With vesting rows: their total value ÷ the number of different years in which rows with a value vest (at least 1). With none: shares × price, as typed."
 },
 {
  "id": "MK-CF-F-068",
  "name": "rentalNetAnnual",
  "what_it_is_for": "Total net rental income per year, across all properties (income − operating expenses).",
  "formula_in_words": "(Monthly rent − monthly running costs) added over the rentals, × 12. A rental that loses money pulls the total down."
 },
 {
  "id": "MK-CF-F-075",
  "name": "retirementIncomeMonthly",
  "what_it_is_for": "Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.",
  "formula_in_words": "Social Security, pension, withdrawals, required distributions, annuities and other, each turned into a month — monthly as it is, quarterly ÷ 3, yearly ÷ 12 — and added."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added."
 },
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-084",
  "name": "taxableAnnual",
  "what_it_is_for": "Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.",
  "formula_in_words": "totalGrossAnnual WITHOUT the untaxed parts: salary + tips + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + one-off taxed + retirement income in a month × 12. The 401(k) is NOT taken off here."
 },
 {
  "id": "MK-CF-F-087",
  "name": "monthlyTaxRates",
  "what_it_is_for": "The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate.",
  "formula_in_words": "Twelve rates, all the same: the rate in force (rateInForce) — the person's own, or the calculated one. A steady income is taxed the same in every month."
 },
 {
  "id": "MK-CF-F-088",
  "name": "taxableByCalendarMonth",
  "what_it_is_for": "The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.",
  "formula_in_words": "For each calendar month: gross salary + tips (only in months with salary) + net rent ÷ 12 + that month's stock vesting + taxed extra in a month + retirement income; + the bonus in its month (December when none); + the signing bonus in January; + one-off taxed other income in its month; − the household's 401(k) that month. Never below 0."
 },
 {
  "id": "MK-CF-F-092",
  "name": "incomeMonthlyGrid",
  "what_it_is_for": "A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness: salary & net rental are steady every month; the annual bonus lands in December; the signing bonus is one-time (January); equity is the level annual vesting spread across the month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).",
  "formula_in_words": "For each calendar month. Earned before 401(k) = that month's taxed income (taxableByCalendarMonth) + that month's 401(k). Untaxed = support + that month's scholarships + benefits in their months + one-off untaxed income in its month. Gross = earned before 401(k) + untaxed − reinvested interest and dividends. Tax = tax on the wages + tax on the rest. The wages, earner by earner (worked in one place, which the Cash flow months read too): an earner who typed a take-home is taxed at their own share — (their yearly gross − their 401(k) for the year − 12 × the typed take-home) ÷ their yearly gross, held between 0 and 1 — so they land exactly what they typed; any other earner's wage × the rate in force (monthlyTaxRates). The rest (earned before 401(k) − the wages) × the rate in force — except that when the rate is the person's own, the month's rent and interest and dividends are left out, because they are not on a payslip. After-tax = gross − tax. Take-home = gross − tax − 401(k)."
 },
 {
  "id": "MK-CF-F-099",
  "name": "deductionFor",
  "what_it_is_for": "The amount of income that is free of tax before the brackets start: the standard deduction for the way the person files, plus the extra amounts for anyone 65 or older.",
  "formula_in_words": "The standard deduction for the filing status + the age-65 addition × the number of people 65 or over (2 at most) + the senior deduction (seniorDeductionFor). The amounts are in the 2026 table above the cards."
 },
 {
  "id": "MK-CF-F-100",
  "name": "taxableIncomeFor",
  "what_it_is_for": "What income is taxed, given how this person files?",
  "formula_in_words": "Gross − the deduction (deductionFor, with the gross itself used as the income for the senior deduction's phase-out); never below 0."
 },
 {
  "id": "MK-CF-F-101",
  "name": "taxOwedFor",
  "what_it_is_for": "Federal tax owed under a filing status, plus an optional user-set FLAT state rate applied to TAXABLE income (E10) — states differ wildly, so one honest user-entered percent beats fifty guessed tables, and it never taxes the deduction.",
  "formula_in_words": "Taxable income (taxableIncomeFor) taxed band by band on the filing status's 2026 table — each slice at its own rate — plus taxable income × the state rate (held between 0 and 15%)."
 },
 {
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less."
 },
 {
  "id": "MK-CF-F-128",
  "name": "grossByMonth",
  "what_it_is_for": "GROSS pay for each month the table covers, or twelve identical months when pay is steady.",
  "formula_in_words": "When the pay varies and a month-by-month table has been filled: the table, one row a month, in month order. Otherwise one row, called typical = the typical gross pay turned into a month (perMonth)."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1)."
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "what_it_is_for": "One period of pay expressed as a month.",
  "formula_in_words": "Hourly: amount × hours a week (40 when none is entered) × 52 ÷ 12. Any other frequency: amount × pay periods in a year ÷ 12."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 },
 {
  "id": "MK-CF-F-144",
  "name": "takeHomeAsEntered",
  "what_it_is_for": "A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.",
  "formula_in_words": "In this order. (1) The pay varies and a month-by-month take-home table is filled: the average of its months; not calculated. (2) A take-home above zero was typed: that amount exactly as typed — it is asked for as a MONTH, whatever the pay frequency; not calculated. (3) Otherwise it is calculated, and marked so. With a household rate supplied: (yearly gross × (1 − rate) − monthly 401(k) × 12) ÷ 12. With none: (yearly gross − 401(k) for the year − federal income tax on the yearly gross less the 401(k), by the filing status given — single when none) ÷ 12. That federal tax has no state tax in it."
 },
 {
  "id": "MK-CF-F-146",
  "name": "payFiguresAgree",
  "what_it_is_for": "Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere.",
  "formula_in_words": "It passes with no check when the take-home is calculated. Otherwise, for each month of gross pay in order: left = gross − monthly 401(k) − the take-home for that month (the month's own figure when a take-home table is filled, otherwise the typed take-home, which is a monthly figure at every pay frequency). When left is below −$5: it FAILS, with a sentence naming the month and how much more the take-home is than there is. Otherwise, when gross is above zero and left ÷ gross is above 60%: it passes WITH A WARNING that gives that share as a whole percent. The first month to fail or warn decides. Exactly $5 short still passes; exactly 60% does not warn."
 },
 {
  "id": "MK-CF-F-171",
  "name": "earnerPay",
  "what_it_is_for": "One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.",
  "formula_in_words": "One earner's pay figures together: gross in a month = yearly gross ÷ 12; yearly gross (annualisedGross); the monthly 401(k); the take-home, whether it is calculated and why (takeHomeAsEntered); everything else taken out, for the year and ÷ 12 for the month — nothing when the take-home is calculated; the verdict (payFiguresAgree); and the monthly gross rows."
 },
 {
  "id": "MK-CF-F-177",
  "name": "wageGrossByMonth",
  "what_it_is_for": "ONE person's wage, month by month, January first.",
  "formula_in_words": "With a month table: this calendar year's twelve months from the table, any month not in it taking the typical monthly figure. With none: the typical monthly figure (enteredMonthlyRaw) in every month."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction."
 },
 {
  "id": "MK-CF-F-187",
  "name": "seniorDeductionFor",
  "what_it_is_for": "How much of the $6,000-per-person senior deduction does this return get?",
  "formula_in_words": "0 outside tax years 2025 to 2028; when filing separately; when nobody is 65 or over; or when the income is not known. Otherwise each person 65 or over (2 at most) gets $6,000 less 6% of the income above $75,000 (single, head of household) or $150,000 (married), never below 0 — the 6% comes off each person's $6,000, not off the two together; the answer is that amount × the number of those people."
 },
 {
  "id": "MK-CF-F-198",
  "name": "payrollTaxWithheld",
  "what_it_is_for": "Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold.",
  "formula_in_words": "On a year's wages (below zero counts as 0): 6.2% of the wages up to $184,500, plus 1.45% of all the wages, plus 0.9% of the wages above $200,000."
 },
 {
  "id": "MK-CF-O-001",
  "name": "basePay",
  "what_it_is_for": "What does this household's base pay come to: each earner's pay, and the household's gross, tax bracket, tax, 401(k)s and take-home for a month?",
  "formula_in_words": "Runs earnerPay for each earner with the household's filing status (single when none), the number of people 65 or over, and the household's rate in force (rateInForce). Yearly gross = the earners' yearly gross added up. Take-home = their monthly take-homes added up. Tax band = the federal band on ALL the earners' wages together less each earner's own 401(k) for the year (a 401(k) is not taxed), by filing status; the band on the first earner's wage less their own 401(k) is also worked out, and when there are two or more earners, the two bands differ, and every earner typed a take-home, a note says so. When there are two or more earners and every one typed a take-home, a sentence also says the rate in force is their own figures. When nobody typed a take-home the card states its own sum in words: gross in a month − tax − 401(k)s = take-home. Tax in a month = yearly gross × the rate in force ÷ 12. Mode: entered when every earner typed a take-home; calculated when none did; mixed otherwise. When the rate in force is the calculated one, short-by = Social Security and Medicare on each earner's yearly gross (payrollTaxWithheld), added up, ÷ 12; nothing otherwise. Every figure agrees only when every earner's check passes (payFiguresAgree). Monthly 401(k) = added up over the earners. Other taken in a month = each earner's everything-else added up; nothing when any earner's take-home is calculated. The sentence under the take-home, when every earner typed one: what they entered, nothing calculated — or, when the gross was worked back from a take-home entered the old way, that the take-home is what they entered and the gross was worked back from it."
 },
 {
  "id": "MK-NW-F-112",
  "name": "yearlyInterest",
  "what_it_is_for": "A year's interest from one bond or CD, by the one rule every interest figure uses: face × rate; with no face entered, a bond or a CD bought through a broker that has a maturity date has none — its coupon is paid on the face, which is not entered — while a CD bought from the bank or a bond fund (no maturity date) pays its rate on its value; with no rate, nothing (owner A46: counted as $0, said so).",
  "formula_in_words": "A year's interest from one bond or CD. Nothing when no rate was entered. Face value × rate when a face value was entered. With no face value entered: nothing for a bond, or a CD bought through a broker (pricedLikeBond), that has a maturity date — its coupon is paid on the face, so the rate on the market value would be a guess (the lead's decision of 2026-10-24 under owner decision DEC-3523, tenet 3); otherwise — a CD bought from the bank, typed by its balance, or a bond fund, which has no maturity date — the value shown × rate: the market value, else what was paid, else the face value, and 0 when no value was entered (owner decision DEC-0281 for the value shown; owner ruling DEC-2748c, 2026-10-07, for face × rate and, with no face, value × rate)."
 },
 {
  "id": "MK-NW-F-126",
  "name": "yearlyInterestNow",
  "what_it_is_for": "A year's interest from one bond or CD as it pays today: its yearly interest, and $0 once it is past its maturity date.",
  "formula_in_words": "A year's interest from one bond or CD as it pays today: $0 once it is past its maturity date; otherwise its yearly interest (yearlyInterest: face × rate; with no face, nothing for a bond with a maturity date, and the value × rate for a CD bought from the bank or a bond fund), and nothing when no rate was entered."
 },
 {
  "id": "MK-NW-F-131",
  "name": "pricedLikeBond",
  "what_it_is_for": "(DEC-3837, 2026-10-10) THE ONE TEST of whether a holding is priced like a bond: every bond is, and a CD only when it was bought through a broker.",
  "formula_in_words": "Yes for every bond that is not a CD. For a CD: yes only when it was bought through a broker; a CD bought from the bank, or one whose answer was never given, is no (DEC-3837, 2026-10-10). This is the one test every bond figure reads to decide whether a CD is priced like a bond."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A wage turned into a month or a year** — in this part: MK-CF-F-045

```json
[
 {
  "id": "MK-CF-F-140",
  "name": "periodsAYear",
  "what_it_is_for": "How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated.",
  "formula_in_words": "Pay periods in a year: hourly 2,080, weekly 52, every two weeks 26, monthly 12, yearly 1. Any other frequency: 12."
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "what_it_is_for": "One period of pay expressed as a month.",
  "formula_in_words": "Hourly: amount × hours a week (40 when none is entered) × 52 ÷ 12. Any other frequency: amount × pay periods in a year ÷ 12."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 },
 {
  "id": "MK-CF-F-059",
  "name": "annualizedEnteredSalary",
  "what_it_is_for": "Annual amount of what the user ENTERED (not grossed up) — for display.",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52. Otherwise base pay × the periods in a year: weekly 52, every two weeks 26, monthly 12, yearly 1 — monthly when no frequency is given."
 },
 {
  "id": "MK-CF-F-130",
  "name": "enteredMonthlyRaw",
  "what_it_is_for": "A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).",
  "formula_in_words": "Hourly: base pay × hours a week (40 when none) × 52 ÷ 12. Otherwise base pay × the periods in a year ÷ 12 (weekly 52, every two weeks 26, monthly 12, yearly 1)."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added."
 }
]
```

**Gross income for the year** — in this part: MK-CF-F-045

```json
[
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added."
 }
]
```

**Rent from a property** — in this part: MK-CF-F-127

```json
[
 {
  "id": "MK-CF-F-067",
  "name": "rentalList",
  "what_it_is_for": "Normalized list of rental properties, read from the `rentals` array.",
  "formula_in_words": "Each rent entry that names its property (a property identifier that is not blank) with rent or running costs above zero: long-term unless marked short-term, its monthly rent and its monthly running costs. An entry that names no property is not counted (owner rule DEC-4059d, 2026-10-10). With no list of rent entries: nothing — the old single typed rent figure names no property, so it is not counted either. Owner rule, 2026-10-10: each rent and running-cost figure is read only when it is a plain number (digits with at most one decimal point, allowing a leading dollar sign, thousands commas and spaces); a figure with letters or other text in it is not entered and counts as 0, never as the digits inside it."
 },
 {
  "id": "MK-CF-F-068",
  "name": "rentalNetAnnual",
  "what_it_is_for": "Total net rental income per year, across all properties (income − operating expenses).",
  "formula_in_words": "(Monthly rent − monthly running costs) added over the rentals, × 12. A rental that loses money pulls the total down."
 },
 {
  "id": "MK-CF-F-219",
  "name": "rentEntryMonthly",
  "what_it_is_for": "What one rent entry comes to a month, as typed — read by the one strict reader (DEC-3768c, 2026-10-10), the reader rentalList counts with: \"about 2k\" is not a number, so it reads as not entered (0), never as $2.",
  "formula_in_words": "What one rent entry comes to a month, as typed: its rent and its running costs, each read only when it is a plain number (digits with at most one decimal point, allowing a leading dollar sign, thousands commas and spaces) — a figure with letters or other text in it is not entered and counts as 0, never as the digits inside it, and a figure not entered counts as 0; and its net = rent − running costs, which can be below zero. No entry: all three 0. The sign-up rent step shows these figures and rentalList counts with the same reading (owner rule DEC-3768c, 2026-10-10)."
 }
]
```

**Take-home** — in this part: MK-CF-F-044

```json
[
 {
  "id": "MK-CF-F-144",
  "name": "takeHomeAsEntered",
  "what_it_is_for": "A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.",
  "formula_in_words": "In this order. (1) The pay varies and a month-by-month take-home table is filled: the average of its months; not calculated. (2) A take-home above zero was typed: that amount exactly as typed — it is asked for as a MONTH, whatever the pay frequency; not calculated. (3) Otherwise it is calculated, and marked so. With a household rate supplied: (yearly gross × (1 − rate) − monthly 401(k) × 12) ÷ 12. With none: (yearly gross − 401(k) for the year − federal income tax on the yearly gross less the 401(k), by the filing status given — single when none) ÷ 12. That federal tax has no state tax in it."
 },
 {
  "id": "MK-CF-F-171",
  "name": "earnerPay",
  "what_it_is_for": "One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.",
  "formula_in_words": "One earner's pay figures together: gross in a month = yearly gross ÷ 12; yearly gross (annualisedGross); the monthly 401(k); the take-home, whether it is calculated and why (takeHomeAsEntered); everything else taken out, for the year and ÷ 12 for the month — nothing when the take-home is calculated; the verdict (payFiguresAgree); and the monthly gross rows."
 },
 {
  "id": "MK-CF-F-180",
  "name": "enteredLandsAnnual",
  "what_it_is_for": "Every earner’s entered take-home, a year — or null when any of them did not say.",
  "formula_in_words": "Nothing unless EVERY earner typed a take-home above zero. Otherwise each earner's typed take-home — a monthly figure, whatever the pay frequency — × 12, added."
 }
]
```

**Money paid out by accounts — dividends and interest** — in this part: MK-CF-F-183, MK-CF-F-184

```json
[
 {
  "id": "MK-CF-F-119",
  "name": "investmentIncomeAnnual",
  "what_it_is_for": "Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds the Income module.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date a year ago), not reinvested, added — each counted as the money it moved into the account: when the record says which way the money went, its size, minus when it left (a reversed payment takes away what it had added); otherwise its amount with the sign it was stored with; a record whose amount is not on record (missing, blank or not a number) adds nothing."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-006",
  "label": "YOUR SOURCES — Base salary",
  "unit": "money",
  "grain": "one earner",
  "screens": [
   "/cashflow"
  ],
  "answers": "Each earner’s base pay, as it was entered, with whether it was entered before tax or as take-home.",
  "formula": "the base salary of each earner, in the period it was entered",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly"
  ],
  "decisions": [
   "NEVER CONVERTED SILENTLY: the amount is shown in the period it was entered, and the period is said beside it."
  ],
  "refusal": "No salary entered — the row does not appear; the door to enter it does.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$4,200"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-007",
  "label": "YOUR SOURCES — Self-employment",
  "unit": "money",
  "screens": [
   "/cashflow"
  ],
  "answers": "Self-employment income, net, in the period it was entered.",
  "formula": "the self-employment amount as entered, monthly or yearly",
  "inputs": [
   "MK-XS-I-023 salary and other income"
  ],
  "refusal": "None entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$24,000"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-008",
  "label": "YOUR SOURCES — Bonus",
  "unit": "money",
  "per": "year",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "The bonus for the year and the month it lands.",
  "formula": "the bonus as entered, a year; shown in the month it lands, never spread",
  "inputs": [
   "MK-CF-I-009 bonus",
   "MK-XS-I-059 the month a bonus lands"
  ],
  "decisions": [
   "A LUMP THAT LANDS ONCE IS NEVER AVERAGED across the year (founder, 2026-08-28)."
  ],
  "refusal": "None entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$12,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "CashFlowScreen › MonthBars",
   "IncomeManagerScreen › BonusAndStock"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-009",
  "label": "YOUR SOURCES — Stock vesting (equity)",
  "unit": "money",
  "per": "year",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What vests in a year, valued at the price entered.",
  "formula": "shares vesting × price per share; with a grant schedule, the total ÷ the years it vests over",
  "inputs": [
   "MK-CF-I-010 equity vesting",
   "MK-XS-I-005 holding price"
  ],
  "refusal": "No equity entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$20,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen › BonusAndStock"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-010",
  "label": "YOUR SOURCES — Rental property",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What the rental brings in each month after its running costs.",
  "formula": "(rent − running costs) for each rental, added up",
  "inputs": [
   "MK-CF-I-007 rental income"
  ],
  "refusal": "No rental entered — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$1,200/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen › Rent"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-011",
  "label": "YOUR SOURCES — Social Security · pension",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "Guaranteed income being received now — Social Security, pension, annuity and other — in a month.",
  "formula": "Social Security + pension + annuity + other, each brought to a monthly amount",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "None being received — the row does not appear.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-024",
  "label": "each source of guaranteed income",
  "unit": "money",
  "per": "month",
  "grain": "one source",
  "screens": [
   "/monthly-income"
  ],
  "answers": "One line per guaranteed source — Social Security, a pension, an annuity, other — and what it pays a month.",
  "formula": "each stream as entered, brought to a monthly amount",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "Nothing entered — the list is replaced by the door to enter it.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › MonthBars"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-027",
  "label": "each income source and its amount",
  "unit": "money",
  "grain": "one source",
  "screens": [
   "/income-manager",
   "/cashflow"
  ],
  "answers": "Every source of income that has been entered, one line each, in the period it is counted in — a month or a year, said beside it.",
  "formula": "each source as it was entered: rent after its running costs, in a month; interest and dividends, a bonus, scholarships and loans, in a year; the rest in a month",
  "inputs": [
   "MK-XS-I-023 salary and other income",
   "MK-CF-I-009 bonus",
   "MK-CF-I-010 equity vesting",
   "MK-CF-I-007 rental income"
  ],
  "refusal": "Nothing entered — the list is replaced by the one line \"Nothing entered yet. Add your income ›\" (Q48), which opens Base pay.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security. The line shown is the rental’s: what it brings in a month after its costs.",
   "answer": "$1,200"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen",
   "IncomeManagerScreen › Rent"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-1859",
   "DEC-1924",
   "DEC-7940"
  ]
 },
 {
  "id": "MK-CF-M-037",
  "label": "Take-home each month",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary",
   "/income-manager"
  ],
  "answers": "What reaches the bank in a usual month, from every source of income added together.",
  "formula": "take-home a usual month = Σ of every source’s take-home in a usual month; a source that lands in one month of the year is not spread across twelve",
  "inputs": [
   "MK-CF-M-031 household take-home",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income",
   "MK-CF-I-008 retirement income"
  ],
  "decisions": [
   "A once-a-year source keeps its own month and is shown separately, never averaged in."
  ],
  "refusal": "Shows $0 on a fresh account, with the door to enter income — never a dash.",
  "note": "FOUND BY THE WORKED EXAMPLE AND FIXED THE SAME DAY, 2026-09-28. This total read $9,798/month while the two take-home lines beneath it (MK-CF-M-038) added to $9,398 — $400 apart, exactly the spouse's monthly 401(k). MK-CF-F-060 salaryGrossByMonth sums EVERY earner's wage (his ruling, 2026-08-27) but the 401(k) taken off that household gross was written as the first earner's alone, so a spouse's was never subtracted — the take-home read too high by their contribution, and the taxable base too. NOT A NEW QUESTION: he ruled this on 2026-09-12 on income-end-to-end v07 — \"one card disagreeing with itself; corrected to the take-home line\" — and the correction reached the mock and not the code. Now MK-CF-F-206 householdK401ByMonth counts every earner in the months that earner is paid, and [a test of the app] holds the ruling. The six personas all passed throughout because none had a spouse with their own wage AND their own 401(k); twoEarnersBoth401k now does.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$9,398/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeManagerScreen › BonusAndStock",
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0078",
   "DEC-0108",
   "DEC-0149",
   "DEC-0152",
   "DEC-0165",
   "DEC-0166",
   "DEC-0181",
   "DEC-0182",
   "DEC-0187",
   "DEC-0188",
   "DEC-0189",
   "DEC-0191",
   "DEC-0194",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0376",
   "DEC-0387",
   "DEC-0431"
  ]
 },
 {
  "id": "MK-CF-M-038",
  "label": "each source of take-home",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary"
  ],
  "answers": "What each source of income puts into the bank in a usual month, named and listed.",
  "formula": "one line per source: the earner’s take-home, or the source’s monthly amount",
  "inputs": [
   "MK-CF-M-031 household take-home",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income"
  ],
  "refusal": "The list is replaced by the door to enter income when nothing is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$5,898/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0376",
   "DEC-0387"
  ]
 },
 {
  "id": "MK-CF-M-039",
  "label": "its own month, never spread",
  "unit": "money",
  "screens": [
   "/income-summary",
   "/income-manager"
  ],
  "answers": "What the month a once-a-year source lands in brings in, all of it — the usual take-home plus that source after tax — shown in its own month rather than divided by twelve.",
  "formula": "the standout month = of the twelve months’ take-home, the largest, when it is more than the usual month by over $1: its amount is that whole month’s take-home (the usual month plus the lump, after tax), its label the month’s name",
  "inputs": [
   "MK-CF-I-009 bonus",
   "MK-CF-I-010 equity vesting"
  ],
  "decisions": [
   "A lump that lands once is never averaged across the year (founder, 2026-08-28)."
  ],
  "refusal": "The line is hidden when no source behaves this way.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$40,316"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeManagerScreen › BonusAndStock",
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-040",
  "label": "is not here — it is reinvested where it is earned",
  "unit": "money",
  "per": "month",
  "screens": [
   "/income-summary"
  ],
  "answers": "Income that is taxed but never reaches the bank, so the two totals on this screen can be told apart.",
  "formula": "taxed but not landed = interest and dividends earned inside accounts, which stay where they are earned",
  "inputs": [
   "MK-CF-I-011 interest and dividends"
  ],
  "refusal": "The sentence is hidden when there is none.",
  "worked": {
   "given": "The two earners above, with $3,600/year of interest and dividends earned inside their accounts and left there.",
   "answer": "$300/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0179",
   "DEC-0182",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-041",
  "label": "What it is taxed on",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The whole year of income the tax is calculated on — the gross less the 401(k)s — a different number from the take-home, and said to be one.",
  "formula": "what it is taxed on = gross a year (MK-CF-M-076) − the year's 401(k)s (MK-CF-M-077), never below $0 — his DEC-0283: income before tax is gross less the 401(k)",
  "inputs": [
   "MK-CF-M-076 gross a year",
   "MK-CF-M-077 401(k)s a year"
  ],
  "decisions": [
   "Income before tax is gross less the 401(k) and any other deduction; gross is before any deductions (DEC-0283, 2026-09-10)."
  ],
  "refusal": "Shows $0 on a fresh account, with the door to enter income.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$150,000/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0387",
   "DEC-7796",
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-042",
  "label": "each taxed source",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "What each source contributes to the year the tax is calculated on.",
  "formula": "one line per taxable source, at its yearly amount",
  "inputs": [
   "MK-CF-M-041 gross a year"
  ],
  "refusal": "The list is replaced by the door to enter income when nothing is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$109,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0387"
  ]
 },
 {
  "id": "MK-CF-M-043",
  "label": "Federal tax bracket",
  "unit": "percent",
  "screens": [
   "/income-summary"
  ],
  "answers": "What the next dollar costs in federal income tax, with every source counted, not wages alone.",
  "formula": "the published bracket that what the year is taxed on falls in once the 401(k)s are out — every source counted, less each earner’s own 401(k), less the standard deduction — for their filing status",
  "inputs": [
   "MK-CF-M-041 gross a year",
   "MK-XS-I-024 filing status"
  ],
  "refusal": "The row is not shown until income is entered.",
  "note": "The same concept as MK-CF-M-032 on the base-pay screen, over a wider base: that one counts wages, this one counts every source. Conflict C-5 on the orchestrator map asks whether they stay two figures.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "22%"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0196",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-7796",
   "DEC-7797"
  ]
 },
 {
  "id": "MK-CF-M-044",
  "label": "Calculated federal tax",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The federal income tax for the year, at whichever rate is in force — theirs if they entered one, ours if not.",
  "formula": "tax a year = a rate typed by the person × the year's gross (MK-CF-M-076); when it is ours, federal tax on what it is taxed on (MK-CF-M-041: the gross less the 401(k)s) less the standard deduction, at the published bands — plus a state rate the person entered",
  "inputs": [
   "MK-CF-M-041 what it is taxed on",
   "MK-CF-M-076 gross a year",
   "MK-CF-I-005 tax rate as entered",
   "MK-XS-I-024 filing status"
  ],
  "decisions": [
   "When it is ours it assumes the standard deduction and is federal only, plus a state rate entered (MK-CF-D-002, DEC-7608).",
   "The 401(k) comes off before tax (DEC-0283)."
  ],
  "refusal": "The row is not shown until income is entered.",
  "worked": {
   "given": "The same two earners filing jointly, $169,200 of wages and $19,200 into their 401(k)s, with no tax rate typed. Taxed on $150,000; less the $32,200 standard deduction, $117,800 → $2,480 + $9,120 + 22% × $17,000 = $15,340.",
   "answer": "$15,340/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-09-14",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0195",
   "DEC-0197",
   "DEC-0208",
   "DEC-0375",
   "DEC-0389",
   "DEC-7798",
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-066",
  "label": "Dividends, interest & coupons",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-manager"
  ],
  "answers": "What your holdings and bonds paid out over the last twelve months, from the records.",
  "formula": "the dividend, interest and coupon records of the last twelve months, added up",
  "inputs": [
   "MK-NW-I-004 the activity records",
   "MK-NW-I-001 your accounts"
  ],
  "refusal": "No record of any — $0, never an estimate.",
  "worked": {
   "given": "One account that recorded a $300 dividend in June and $120 of interest in March.",
   "answer": "$420/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "IncomeManagerScreen › InterestAndDividends"
  ],
  "decisions_that_govern_it": [
   "DEC-7933"
  ]
 },
 {
  "id": "MK-CF-M-069",
  "label": "Your guaranteed income",
  "unit": "money",
  "per": "month",
  "screens": [
   "/monthly-income"
  ],
  "answers": "All the guaranteed income being received now, added up for a month.",
  "formula": "the sum of each source of guaranteed income (MK-CF-M-024)",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "Nothing entered — $0, with the door to enter it.",
  "worked": {
   "given": "The two earners above, plus $24,000/year of self-employment, a $12,000 bonus in March, 50 shares vesting at $400, a rental bringing in $2,000/month against $800 of costs, and $2,100/month of Social Security.",
   "answer": "$2,100/month"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "ruled": "2026-10-02",
  "printed_in": [
   "MonthlyIncomeScreen"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-076",
  "label": "= Gross /year",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "The whole year of income before any deductions — every taxable source, wages at gross.",
  "formula": "gross a year = Σ of every taxable source over the year, wages included at gross, before any deductions",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-CF-I-006 other income",
   "MK-CF-I-007 rental income",
   "MK-CF-I-011 interest and dividends"
  ],
  "decisions": [
   "Gross is before any deductions (DEC-0283, 2026-09-10). It was printed as MK-CF-M-041 until 2026-10-24, when that became the income after the 401(k)s."
  ],
  "refusal": "Not shown on a fresh account — the door to enter income stands in the list.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$169,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7887"
  ]
 },
 {
  "id": "MK-CF-M-077",
  "label": "Your 401(k)s",
  "unit": "money",
  "per": "year",
  "screens": [
   "/income-summary"
  ],
  "answers": "What every earner puts into their own 401(k) over the year — taken off the gross before tax.",
  "formula": "401(k)s a year = each earner's own contribution for the months they are paid, added up (the employer's match excluded) — as many dollars as the gross is above what it is taxed on",
  "inputs": [
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "A 401(k) comes off the gross before tax (DEC-0283, 2026-09-10; founder audit B05)."
  ],
  "refusal": "A real $0 when no 401(k) is entered; not shown on a fresh account.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s, with the tax rate typed at 22%.",
   "answer": "$19,200/year"
  },
  "door": "MK-CF-O-004 incomeSummary",
  "printed_in": [
   "IncomeSummaryScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-7887"
  ]
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0078",
  "decided": "2026-08-11",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "cut the build",
  "the_log_records": "Build 51 was cut only after his explicit “cut the build” against a presented checklist, with the gates satisfied in order: scope complete at 59 of 59 rows, and the mock-match audits FINISHED rather than running alongside.",
  "governs": "MK-CF-M-037 · MK-CF-M-028"
 },
 {
  "id": "DEC-0108",
  "decided": "2026-08-11",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "Update master PRD document. Go to master list of what",
  "the_log_records": "The master list of what is built now records the day’s work rather than being reconstructed later: 18 built items in five groups, written down the day they were built.",
  "governs": "MK-CF-M-037 · MK-NW-M-027 · MK-NW-M-020 · MK-NW-M-034"
 },
 {
  "id": "DEC-0149",
  "decided": "2026-08-14",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "rename the latest folder that way we know what is single source of truth",
  "the_log_records": "Four folders of design deliveries had accumulated outside the app, all named after net worth because that was the first screen drawn, though they now also held the Performance and Plan work. One named home for them, so the newest delivery can be found.",
  "governs": "MK-PF-M-008 · MK-CF-M-037 · MK-NW-M-021 · MK-NW-M-008"
 },
 {
  "id": "DEC-0152",
  "decided": "2026-08-14",
  "type": "DESIGN",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "s own five words,",
  "the_log_records": "“create a folder called August 14th Design, move the latest files there so there is no confusion, and re-check every file carries the decisions we made.” One named home for the live set, and every file in it re-checked against the decisions rather than assumed to carry them.",
  "governs": "MK-CF-M-037 · MK-NW-M-006 · MK-NW-M-029"
 },
 {
  "id": "DEC-0165",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "how to avoid this in the next brief?",
  "the_log_records": "“how to avoid this in the next brief?” The honest answer is that more care would not have helped — all three errors were written while reading carefully, and two survived several reviews. So every number in a brief is now either computed by a test or explicitly labelled as his own figure, and a test fails the build when a brief and the calculation disagree.",
  "governs": "MK-CF-M-037 · MK-NW-M-029 · MK-PF-M-008 · MK-NW-M-006"
 },
 {
  "id": "DEC-0166",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "not sure what you want me to check here.",
  "the_log_records": "“not sure what you want me to check here.” He was right and the framing was mine: I put three options to him as a product decision when it was a technical correction with one right answer. A correction is not a question.",
  "governs": "MK-CF-M-037 · MK-NW-M-006 · MK-NW-M-021 · MK-NW-M-015"
 },
 {
  "id": "DEC-0178",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s",
  "the_log_records": "Your tax band is worked out ONCE, from your total income, and every screen reads that one figure. The base-pay screen does not work out a band of its own — a band is set by everything you are taxed on together, so a screen that sees only your wage would show the wrong one.",
  "governs": "MK-CF-M-032 · MK-CF-M-043"
 },
 {
  "id": "DEC-0179",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0179, confirmed as written: Interest and dividends are WORKED OUT from the accounts (MK-NW-F-063 interest income annual), shown with the working, an",
  "the_log_records": "Interest and dividends are taxed but are not money you can spend, unless you tell us they reach your bank. Two decisions:\n1. In most accounts they are reinvested where they are earned and never arrive, so they are taken out of your spendable take-home.\n2. The tax on them still comes out, because it is real — so simply deleting them would have been wrong in the other direction.",
  "governs": "MK-CF-M-040 · MK-CF-O-004"
 },
 {
  "id": "DEC-0181",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "fix it completely. No two functions doing same thing.",
  "the_log_records": "Fifteen calculations were each written in two or more places; now none is. 560 calculations, 560 distinct names. A second copy of a calculation cannot be fixed by fixing the first — which is how the same defect kept coming back.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0182",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "for orchestrator use O instead of F to make it easy to identify.",
  "the_log_records": "The one function a screen calls for its question gets its own kind of identifier, so it can be told apart at a glance from the ordinary calculations underneath it.",
  "governs": "MK-CF-M-037 · MK-CF-M-040 · MK-XS-M-004"
 },
 {
  "id": "DEC-0184",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "The app carried TWO complete tax engines, both live from the same profile on the same day, and one of them could not read a filing status at all. One is deleted. ZERO numbers moved for a single filer — the two were identical arithmetic there — and it becomes correct for couples the moment the filing-status question lands.",
  "governs": "MK-CF-F-100 taxableIncomeFor · MK-CF-F-101 taxOwedFor · MK-CF-F-102 effectiveRateOnGrossFor · MK-CF-F-103 marginalBracketFor · MK-CF-F-097 grossFromNet (src/domain/income/tax.ts) · MK-CF-M-032 · MK-CF-M-043 · MK-MN-M-028"
 },
 {
  "id": "DEC-0187",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New Year.",
  "governs": "MK-CF-M-037 · MK-CF-M-016 · MK-CF-M-028"
 },
 {
  "id": "DEC-0188",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Who earns this income? You / Partner / Both",
  "the_log_records": "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one person’s income against two people’s spending.",
  "governs": "MK-CF-M-037 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-036"
 },
 {
  "id": "DEC-0189",
  "decided": "2026-08-27",
  "type": "BUILD RECORD",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "",
  "the_log_records": "Every “today” in the app is the person’s OWN calendar day, not the day in universal time. Converting local midnight to universal time moves the date back a day anywhere east of Greenwich — which made every look-back answer “nothing” on a device set to India time.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0191",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "your tax band, on everything you are taxed on",
  "the_log_records": "Your tax band is named as being on EVERYTHING you are taxed on — not just your wage. The band reads every source, so rent and dividends count toward which band you are in.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-0194",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "effective tax rate % from last year",
  "the_log_records": "The tax rate is shown where the money is, and can be corrected there. The rate could previously only be changed on a step inside the guided setup — itself unreachable — so the figure driving every take-home in the app could not be put right where you noticed it was wrong.",
  "governs": "MK-CF-M-035 · MK-CF-M-037 · MK-CF-M-031 · MK-CF-M-046"
 },
 {
  "id": "DEC-0195",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Federal tax bracket",
  "the_log_records": "The base-pay card names the federal tax bracket, shows the estimated tax in MONEY rather than as a percentage, and says it assumes the standard deduction. A payslip has dollars on it, not a rate.",
  "governs": "MK-CF-M-044 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-043"
 },
 {
  "id": "DEC-0196",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ll use 24% everywhere your take-home matters — cash flow, budget, what",
  "the_log_records": "“We’ll use 24% everywhere your take-home matters — cash flow, budget, what’s left over. One-offs like a Roth conversion still use the tax tables.” The screen promises only what a payslip figure can answer: a rate off a payslip is an AVERAGE, and four places need the rate on your NEXT dollar.",
  "governs": "MK-CF-M-043 · MK-CF-F-181"
 },
 {
  "id": "DEC-0197",
  "decided": "2026-08-28",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "the_log_records": "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in your bank, or OUR estimate — and each one says whose it is on the screen.",
  "governs": "MK-CF-M-029 · MK-CF-M-032 · MK-CF-M-043 · MK-CF-M-044"
 },
 {
  "id": "DEC-0198",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "by default = reinvested). The onboarding dividends screen now asks",
  "the_log_records": "Dividends and interest come OUT of your spendable take-home, because in most accounts they are reinvested where they are earned and never reach your bank. The onboarding screen asks “Does this reach your bank?” and says what the answer means.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/income-summary.ts"
 },
 {
  "id": "DEC-0207",
  "decided": "2026-09-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "s first device pass, two accuracy-class: the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403 — every estimated earner was granted the FULL joint deduction), and a two-earner household was banded as single (32% vs jointly 24%) because",
  "the_log_records": "The pay card's own rows must add up: your gross pay, minus tax, minus your 401(k) contributions, equals your take-home — to the dollar, with a 401(k) row shown. It came from his first device pass, where the card contradicted itself because each earner was being given the whole married-couple tax allowance separately.",
  "governs": "MK-CF-M-037 · MK-CF-M-032 · MK-CF-M-043 · MK-CF-M-030"
 },
 {
  "id": "DEC-0208",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "worked out",
  "the_log_records": "Where one person entered their take-home and the other’s is calculated, the note says so per person — “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated)”. The prose version was misread: the entered $5,000 was taken for gross.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0209",
  "decided": "2026-09-02",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "Always use same words to describe same thing in the app. There is no score for creative writing.",
  "the_log_records": "One word per concept across the income screens: “take-home” replaces “lands in your bank” and “takes home”; “calculated” replaces “worked out”, “Estimated federal tax” and “our estimate”. A test enforces it.",
  "governs": "MK-CF-M-037 · MK-CF-M-043 · MK-CF-M-032 · MK-CF-M-031"
 },
 {
  "id": "DEC-0279",
  "decided": "2026-08-26",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "if the coupon rate is not available use 0",
  "the_log_records": "“if the coupon rate is not available use 0.” A bond with no stated rate pays nothing in our figures, rather than being given a guessed rate.",
  "governs": "MK-NW-F-063 · MK-NW-F-063 · MK-CF-F-184"
 },
 {
  "id": "DEC-0375",
  "decided": "2026-09-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?",
  "the_log_records": "“No. Base Pay is one component of total income or income summary and not the same. Have your checked underlying function? Are two functions calculating save thing?” He rejected the grouping and sent me to check the code — where the nesting turned out to be correct, and my proposal was wrong.",
  "governs": "MK-XS-M-006 · MK-CF-M-006 · MK-CF-M-007 · MK-CF-M-008 · MK-CF-M-009 · MK-CF-M-010 · MK-CF-M-027 · MK-CF-M-029 · MK-MN-M-011 · MK-MN-M-012 · MK-MN-M-013 · MK-MN-M-014 · MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-M-035 · MK-CF-M-036 · MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-039 · MK-CF-M-040 · MK-CF-M-041 · MK-CF-M-042 · MK-CF-M-043 · MK-CF-M-044 · MK-CF-M-045 · MK-CF-M-046"
 },
 {
  "id": "DEC-0376",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "one card disagreeing with itself: the household take-home row read ~$10,442/month over a take-home line of ~$9,242; corrected to ~$9,242. A total agrees with the lines printed above it, and it is the LINES that are right.",
  "the_log_records": "A total must equal the lines printed above it, and where they disagree it is the LINES that are right. The income card showed a household take-home of about $10,442 a month over a take-home line of about $9,242 — the total was corrected down to the lines.",
  "governs": "MK-CF-M-037 · MK-CF-M-038 · MK-CF-O-004 · MK-CF-O-001 · MK-CF-M-037 · MK-CF-F-060 · MK-CF-F-206"
 },
 {
  "id": "DEC-0387",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "TWO TOTALS, NEVER ONE on the income recap: what lands each month, and what the year is taxed on — each labelled. And a recap SHOWS, it does not ask: the rate is set on Your base pay and every other screen reads it.",
  "the_log_records": "The income screen shows two totals and labels each: what lands in your bank each month, and what the year is taxed on. They are different numbers about the same wages. Mixing them is how a take-home figure comes to include a bonus nobody has been paid yet.",
  "governs": "MK-CF-M-037 · MK-CF-M-038 · MK-CF-M-041 · MK-CF-M-042 · MK-CF-O-004 · MK-CF-O-004"
 },
 {
  "id": "DEC-0389",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "calculated (your standing order, 2026-09-02)",
  "the_log_records": "“calculated” is the word for a figure the app worked out — his standing order. “worked out”, “Estimated federal tax” and “our estimate” are retired.",
  "governs": "MK-CF-M-031 · MK-CF-M-033 · MK-CF-M-035 · MK-CF-M-044"
 },
 {
  "id": "DEC-0431",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "Nothing entered yet.",
  "the_log_records": "“Nothing entered yet.” The approved wording for a screen with no data: the layout stays, the figure reads $0, this sentence explains it, and the door to enter something sits beneath.",
  "governs": "MK-CF-M-037"
 },
 {
  "id": "DEC-1668",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "add it to the cash as losing job does not mean loosing rental income too.",
  "the_log_records": "The emergency fund counts rent from a property. Rent keeps arriving when pay stops, so each month it is added to the cash: months = cash ÷ (a month of essentials − the rent).",
  "governs": "MK-NW-M-013 EMERGENCY FUND — X.X months · MK-NW-M-046 at your planned spend · MK-NW-M-064 rent from your property, which keeps arriving · MK-MN-M-020 · MK-MN-M-025 · MoneyKeel/functions/networth-and-performance/emergency-fund.ts (MK-NW-O-004 theEmergencyFund) · MoneyKeel/functions/cashflow/income-summary.ts (MK-CF-O-004 incomeSummary, lands.rentMonthly) · src/screens/NetWorthScreen.tsx · src/screens/StressTestScreen.tsx · src/screens/JobSafetyScreen.tsx · src/screens/InsightsScreen.tsx"
 },
 {
  "id": "DEC-1859",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#1 - remove langage to include interest on mortgage in maintenance expenses, as that is not standard practice.",
  "the_log_records": "On the Rent from a property screen, the hint under \"What it costs to run each month\" no longer lists mortgage interest. It reads \"Tax, insurance, repairs, management.\" A mortgage on a rented-out property belongs in Debts.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · [a test of the app]"
 },
 {
  "id": "DEC-1924",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "11 - mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on second property. And automatically add it to debt.",
  "the_log_records": "On Rent from a property, a mortgage is never part of what the property costs to run. The screen asks for the monthly mortgage payment on that property, if there is one, and the app adds that mortgage to Debts by itself.",
  "governs": "src/screens/IncomeManagerScreen.tsx (Rent from a property) · src/onboarding/modules.tsx (Rental property) · MK-CF-M-027 · MK-NW-M-064 rent from your property, which keeps arriving · src/domain/debt/index.ts"
 },
 {
  "id": "DEC-6796",
  "decided": "2026-10-21",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-21 under his rulings DEC-3523 (tenet 1, a wrong number ends trust) and DEC-6623, made without asking him, as his order of 2026-09-30 says. A −$50 dividend reversal and a +$5 fee refund on a $10,000 brokerage: ACTIVITY −$50 and +$5, dividends −$50, Return −0.45% on the account page, Performance and Net worth alike (before: +$50 and −$5, dividends $50, the income +$50). To reverse: restore the three-kind check in ingest.ts. One word from him reverses it.",
  "governs": "MK-XS-F-102 ingestSync (src/services/sync/ingest.ts) · MK-ST-F-012 toLedgerRow · MK-XS-F-116 · MK-CF-F-108 · MK-CF-F-111 · MK-CF-F-116 · MK-CF-F-119 · MK-CF-F-183 · MK-PL-F-009 · MK-PF-F-048 · MK-NW-F-084 · fixStoredMoney, ID awaiting"
 },
 {
  "id": "DEC-7171",
  "decided": "2026-10-21",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-21 on master question Q35, made without asking him, as his order of 2026-09-30 says, following his comment of 2026-08-26 on this figure (Trailing Twelve Months, not just 12 months). Holding detail reads Dividends received (trailing twelve months); it read Dividends received (12 mo). Income's line for an account's interest and dividends reads paid out over the trailing twelve months; it read over the last year. The figures do not change. One word from him reverses it.",
  "governs": "MK-NW-M-034 (where Q35 sits) · MK-NW-O-006 theHolding (MoneyKeel/functions/networth-and-performance/holding.ts) · MK-CF-F-184 incomeFromAccounts (src/domain/income/from-accounts.ts) · src/screens/HoldingDetailScreen.tsx · src/screens/IncomeManagerScreen.tsx"
 },
 {
  "id": "DEC-7795",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenet 4) and DEC-0345, made without asking him, as his order of 2026-09-30 says. Single filer, $60,000 of wages, $4,800 into a 401(k), no rate typed: sign-up worked its own rate, 8.37%, tax $5,020 and take-home $50,180 a year, beside ≈ $4,230 a month on the same card. It now reads MK-CF-F-181 rateInForce through MK-CF-O-004 incomeSummary: 7.41%, $4,444 and $50,756 a year ($4,230 a month), as Cash flow's Income summary, and the Taxes step offers the calculated rate at about 7% (it offered about 8%). The months to clear a debt read MK-CF-F-029 monthsToClear ($10,000 at 18%: $300 a month clears in 47 months; $100 a month never clears) and the growth reads MK-CF-F-229 balanceGrownTo ($300,000 and $1,500 a month at 4.6% for 15 years): the same figures as before, through one formula each. None of these is stored in the profile. To reverse: give sign-up back its own incomeTaxRate, debtPayoff and fv. One word from him reverses it.",
  "governs": "src/onboarding/modules.tsx (incomeTaxRate, debtPayoff, fv) · MK-CF-F-181 rateInForce · MK-CF-O-004 incomeSummary (hands out the rate) · MK-CF-F-029 monthsToClear · MK-CF-F-229 balanceGrownTo (src/domain/debt/mortgageVsTreasury.ts) · MK-CF-F-126 futureValue"
 },
 {
  "id": "DEC-7796",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. $60,000 of wages, $4,800 into a 401(k) and $700 a month of benefits that are not taxed: the line read \"On ~$68,400 gross\" replaced by \"On the ~$60,000 it is taxed on\" — the full line now reads that the estimate comes from the IRS schedule after your 401(k) and the standard deduction. It worked over every source, the untaxed ones too, with its own bracket, 22% ($68,400 − $16,100 = $52,300), and about 8%; it now shows Cash flow's 12% ($60,000 − $16,100 = $43,900) and about 7%, beside Cash flow's What it is taxed on, $60,000. With a state rate entered, the line says the rate includes it. To reverse: give the step its own rate and the total of every source again. One word from him reverses it.",
  "governs": "src/onboarding/modules.tsx (the Taxes step) · MK-CF-O-004 incomeSummary · MK-CF-M-041 · MK-CF-M-043"
 },
 {
  "id": "DEC-7797",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283, DEC-4529 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. His ruling DEC-0283 (2026-09-10): income before tax is gross less the 401(k) and other deductions. The tax was already worked that way while the bracket named the band of the gross. 5 of 5 places now read the income after the 401(k). The Income summary bracket, single, $70,000 of wages and $10,000 into a 401(k): 22% on $53,900 → 12% on $43,900, tax about $5,020 unchanged. Sign-up's Taxes step shows the same 12%. Your base pay, the drawing's own household, $138,000 of wages and $14,400 into 401(k)s, taxed on $91,400: 22% → 12%. The filing-status comparison works its tax after the 401(k), its line naming what was entered less the 401(k). The draw-order sheet's rates are worked after the 401(k). Base pay's 12% is A FIGURE ON HIS APPROVED DRAWING (income-end-to-end v07, phone 2, which draws 22%), applied under tenet 1, which ranks above tenet 6, with the correction line his DEC-4529 asks for on the drawing. For that household the drawn sentence that begins Filing jointly, the band comes from what you earn together no longer prints (both bands are 12%), and the sentence about the 24% stands on its own. What it is taxed on was left as drawn, each gross line, then Gross a year. CORRECTED 2026-10-24: that no longer holds — two rows were added under the gross, Your 401(k)s and What it is taxed on, drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07 under his DEC-0283 (DEC-7887). To reverse: read the bracket off the gross again. One word from him reverses it.",
  "governs": "MK-CF-F-230 taxedAfterPreTax (src/domain/income/tax-rate.ts) · MK-CF-F-181 rateInForce · MK-CF-M-043 (the Income summary bracket) · MK-CF-M-032 (the Base pay bracket) · MK-CF-O-001 · MK-CF-O-004 · the filing-status comparison · the draw-order sheet"
 },
 {
  "id": "DEC-7798",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 1), made without asking him, as his order of 2026-09-30 says. A 5.00% state rate entered on the Tax organizer, no rate typed: the line under Calculated federal tax said federal only, that the rate knew nothing about the state, while the calculated rate held the state rate the person entered. It now reads \"Federal income tax, plus the 5.00% state rate you entered — it knows nothing about Social Security or Medicare.\", the words built for the typed-rate case (DEC-7608). With no state rate entered it reads as built, federal only. The figures do not change. To reverse: take the state rate out of the calculated rate, and the line stands as built. One word from him reverses it.",
  "governs": "MK-CF-M-044 (the line under Calculated federal tax) · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · MK-CF-F-181 rateInForce"
 },
 {
  "id": "DEC-7887",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0283 and DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. A couple with $169,200 of wages and $19,200 into 401(k)s: the card printed only the gross, $169,200, while the bracket and a calculated tax were worked on $150,000. It now prints three rows: Gross a year $169,200, Your 401(k)s −$19,200, What it is taxed on $150,000. The drawing's own household (frame 5a): $167,400 − $14,400 = $153,000, bracket 22%. With no 401(k) the 401(k) row reads $0 and the two totals are the same. Two new figures: MK-CF-M-076, the gross a year, and MK-CF-M-077, the year's 401(k)s; MK-CF-M-041, What it is taxed on, is the gross less the 401(k)s. MK-CF-M-044's worked example is now the calculated case, $15,340, the federal tax on $150,000 less the $32,200 standard deduction ($2,480 + $9,120 + 22% × $17,000); it showed the typed 22% case, $37,224 — the code was right and the words were wrong. Sign-up's Taxes step names about $55,200 it is taxed on, the gross less the 401(k) (it named about $60,000, for $60,000 of wages and $4,800 into a 401(k)). The two rows are drawn by the READ THIS FIRST row of 2026-10-24 on income-end-to-end v07. To reverse: drop the two rows and print the gross as What it is taxed on again. One word from him reverses it.",
  "governs": "MK-CF-M-041 · MK-CF-M-076 · MK-CF-M-077 · MK-CF-M-044 · MK-CF-O-004 incomeSummary (MoneyKeel/functions/cashflow/income-summary.ts) · src/screens/IncomeSummaryScreen.tsx · src/onboarding/modules.tsx (the Taxes step)"
 },
 {
  "id": "DEC-7933",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-2748c and DEC-3523 (tenets 3 and 4), made without asking him, as his order of 2026-09-30 says. A $25,000 Treasury at 4.5%, worth $24,200, face value left blank: the account page read \"4.50%/year · $1,089/year\" and a yield on today's value of 4.50%; it now reads \"4.50%/year · face value not entered\" and gives no yield. A bond pays its coupon on its face: $25,000 × 4.5% = $1,125 a year once the face is entered. On Bonds its card names the missing face value, and the summary says \"Average yield leaves out US Treasury 2031 — face value not entered.\" The income sheet counts it at $0 and says why (it counted $1,089), and a bond past its maturity date counts $0 there too, \"matured Jun 30, 2026 — it pays no more interest\" (it counted $400). Tenet 3 outranks the no-face half of DEC-2748c for a dated bond only: a bank CD typed by its balance keeps its rate on that balance ($10,000 at 5.05% = $505), and so does a bond fund with no maturity date, so the income drawing's 4.2% on $30,000 line stands. The four bonds add to $1,630 on all three screens. To reverse: in src/domain/bonds/index.ts remove the maturity condition (keeps the CD and fund exception), or read every bond with no face at its value again. One word from him reverses it.",
  "governs": "MK-NW-M-024 · MK-NW-M-056 · MK-NW-F-126 yearlyInterestNow · MK-NW-F-112 yearlyInterest · MK-CF-F-184 incomeFromAccounts · src/domain/bonds/index.ts · MK-CF-M-066"
 },
 {
  "id": "DEC-7940",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-0447 and DEC-0196, made without asking him, as his order of 2026-09-30 says. Add your income offered Bonus / one-time as one choice, which opened the yearly bonus editor, so a one-time $2,000 came back the next September and stayed in the next year's taxed income. Bonus and One-time income are now two choices; one-time income keeps its month with its year and lands once. Your sources lists it: Bonus · one-time · lands in September $2,000 (nothing said why THIS MONTH read $7,195). September reads $7,195 on the Income tab, This month and Home; October $5,396; 2027 is back to $5,416. Under his one-rate rule (DEC-0196, ruled as G46) the bonus raises the rate for every month that year, so October falls by $19.88; that is his rule, left as it is. An unpaid one-time bill dated in a passed month stays in Later; only income that has landed leaves it. To reverse: one choice to the bonus editor, and no row for other income. One word from him reverses it.",
  "governs": "MK-CF-F-071 extraIncome · MK-CF-F-124 nextOccurrence · MK-XS-F-004 buildDatedGrid · MK-CF-M-027 · MK-CF-M-047 · the Income tab (src/screens/IncomeManagerScreen.tsx)"
 }
]
```
