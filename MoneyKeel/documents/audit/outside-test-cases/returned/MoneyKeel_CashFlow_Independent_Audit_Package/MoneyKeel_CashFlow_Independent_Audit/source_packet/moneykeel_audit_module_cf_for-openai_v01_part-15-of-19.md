# Cash flow — part 15 of 19: Base pay — gross, take-home, and the rate of tax in force

14 cards, so 14 formula checks and 70 cases, and one `rules_held` line for each of the 36 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 15"` in your reply.

## Notes for this part

- MK-CF-O-001 carries an approved drawing. One case must be that household exactly as drawn.
- Pay periods in a year are on MK-CF-F-140. Where a case has an hourly worker, say the hours a week.
- The Social Security and Medicare amounts in MK-CF-F-198 are what a paycheck withholds, per employer. Where a household of two earners owes a different amount when it files, say so in `notes` — do not replace the withholding rule with the filing rule.
- This part also checks published amounts. Fill `source_checks` from `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json` for: Social Security and Medicare withheld from a paycheck, 2026 — one entry for each, with the source you checked it against.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface BasePay {
  earners: { name: string; pay: EarnerPay }[];
  grossAnnual: number;            // every wage, added
  landsInBank: number;            // every wage's take-home, added, per month
  bandOnOneWage: number;          // the first earner's wage alone
  bandOnEveryWage: number;        // all of them together — what actually applies
  bandNote: string | null;        // what the difference is worth, in words, or null when there is none
  everyFigureAgrees: boolean;     // no earner's three figures contradict each other
  tax: TaxOnPay;                  // the bracket, the tax in money, and whose rate produced it
  landsEstimated: boolean;        // any earner's take-home is calculated → the total wears ≈
  landsNote: string | null;       // whose figure is entered and whose is calculated, with the dollars
  monthly401k: number;            // every earner's own contribution, added — the card's 401(k)s row
  otherTakenMonthly: number | null;  // MK-CF-M-036 at the household — the SUM of the earners' own
                                  // everythingElseMonthly, never a second subtraction, so the household
                                  // figure and its parts cannot disagree (rule 2). Null when any earner's
                                  // is unknown: it refuses rather than understating. The base-pay card
                                  // used to subtract this on the screen (rule 5).
}

export interface BasePayEntry {
  freq: keyof typeof PAY_PERIODS | string;
  varies: boolean;
  grossTypical: any;                          // per period, as typed
  grossByMonth?: Record<string, any>;         // 'YYYY-MM' → amount, when pay varies
  monthly401k: any;                           // their own contribution, per month
  landsTypical?: any;                         // EACH MONTH, whatever the pay frequency — the screen asks "take-home each month" (approved drawing v07, frames 2b and 2c) — OPTIONAL
  landsByMonth?: Record<string, any>;
  hoursPerWeek?: any;
  /** THE BAND IS NOT BASE PAY'S TO WORK OUT. A tax band is set by everything the household is taxed
   *  on together — both wages, the rent kept, the bonus, the dividends — so it is produced ONCE, by
   *  MK-CF-F-084 taxable annual feeding MK-CF-F-090 effective rate, and handed in here. Base pay
   *  reads it. Absent means single, which is what the whole app assumed before the filing-status
   *  question existed, so leaving it out changes no number. Founder ruling 2026-08-27. */
  filingStatus?: FilingStatus;
  over65?: number;
  /** The HOUSEHOLD rate to estimate with, 0–1 of gross — injected by the orchestrator from the one
   *  rate in force. Build 54 let each estimated earner run the federal schedule alone, so each was
   *  granted the FULL joint deduction and the card's own rows disagreed: gross − tax − 401(k)s did
   *  not equal the lands it printed. One rate, applied per earner, makes the identity exact. */
  estRate?: number;
}

export interface EarnerPay {
  grossMonthly: number;
  grossAnnualised: number;
  monthly401k: number;
  landsInBank: number;
  landsIsEstimated: boolean;
  landsWhy: string;
  everythingElse: number | null;          // a year — the laws pin it to the cent
  everythingElseMonthly: number | null;   // the same figure ÷ 12, HERE — a screen never divides
  verdict: PayVerdict;
  months: [string, number][];
}

export interface HouseholdPayInput {
  /** One entry per person who earns a wage, in the order the screen shows them. */
  earners: { name: string; entry: BasePayEntry }[];
  filingStatus?: FilingStatus;
  over65?: number;
  /** The stored answers, so the tax row can read the rate in force rather than re-deciding it. */
  profile?: Record<string, any> | null;
}

export interface PayVerdict { ok: boolean; warn: boolean; say: string; }

export interface RateInForce {
  rate: number;          // 0–1, of gross
  source: RateSource;
  mine: boolean;         // true when it is the person's own figure, not ours
  label: string;         // what a screen prints beside the number
  covers: string;        // what the rate includes, in words
}

export interface TakeHome { monthly: number; estimated: boolean; why: string; }
```

## The cards

```json
[
 {
  "id": "MK-CF-O-001",
  "name": "basePay",
  "kind": "orchestrator",
  "what_it_is_for": "What does this household's base pay come to: each earner's pay, and the household's gross, tax bracket, tax, 401(k)s and take-home for a month?",
  "formula_in_words": "Runs earnerPay for each earner with the household's filing status (single when none), the number of people 65 or over, and the household's rate in force (rateInForce). Yearly gross = the earners' yearly gross added up. Take-home = their monthly take-homes added up. Tax band = the federal band on ALL the earners' wages together less each earner's own 401(k) for the year (a 401(k) is not taxed), by filing status; the band on the first earner's wage less their own 401(k) is also worked out, and when there are two or more earners, the two bands differ, and every earner typed a take-home, a note says so. When there are two or more earners and every one typed a take-home, a sentence also says the rate in force is their own figures. When nobody typed a take-home the card states its own sum in words: gross in a month − tax − 401(k)s = take-home. Tax in a month = yearly gross × the rate in force ÷ 12. Mode: entered when every earner typed a take-home; calculated when none did; mixed otherwise. When the rate in force is the calculated one, short-by = Social Security and Medicare on each earner's yearly gross (payrollTaxWithheld), added up, ÷ 12; nothing otherwise. Every figure agrees only when every earner's check passes (payFiguresAgree). Monthly 401(k) = added up over the earners. Other taken in a month = each earner's everything-else added up; nothing when any earner's take-home is calculated. The sentence under the take-home, when every earner typed one: what they entered, nothing calculated — or, when the gross was worked back from a take-home entered the old way, that the take-home is what they entered and the gross was worked back from it.",
  "handed": "export function basePay(h: HouseholdPayInput): BasePay",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-030",
    "words_on_screen": "Each person’s pay",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What everyone in the household earns before anything is taken out.",
    "when_it_refuses": "Shows $0 until a wage is entered; the screen offers the door to enter one.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-031",
    "words_on_screen": "Take-home",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.",
    "when_it_refuses": "Shows $0 until a wage is entered.",
    "shown_on": [
     "/base-pay",
     "/cashflow",
     "/income-manager"
    ]
   },
   {
    "id": "MK-CF-M-032",
    "words_on_screen": "Federal tax bracket",
    "unit": "percent",
    "what_it_answers": "What the next dollar earned costs in federal income tax.",
    "when_it_refuses": "The row is not shown until a wage is entered.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-033",
    "words_on_screen": "Calculated federal tax",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The federal income tax we calculate on the household’s wages, when nobody has entered their own figure.",
    "when_it_refuses": "The row appears only when the figure is ours; an entered take-home already has tax inside it.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-034",
    "words_on_screen": "Your 401(k)s",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What everyone in the household puts into their own 401(k) each month.",
    "when_it_refuses": "The row is hidden when nobody contributes.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-035",
    "words_on_screen": "The take-home above is higher than it will really be",
    "unit": "money",
    "per": "month",
    "what_it_answers": "By roughly how much the calculated take-home overstates what will reach the bank, because only federal income tax is taken out of it.",
    "when_it_refuses": "The warning appears only when the take-home is ours and estimated.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-036",
    "words_on_screen": "Everything else taken out",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What a payslip takes out beyond the 401(k) — tax, medical cover and anything else bought through work — read back from the figures the person entered.",
    "when_it_refuses": "The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-045",
    "words_on_screen": "Social Security takes 6.2% of a wage up to",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The wage ceiling above which no more Social Security tax is taken, named in the warning so the 6.2% can be checked.",
    "when_it_refuses": "Never absent — it is a published figure, not a calculation.",
    "shown_on": [
     "/base-pay"
    ]
   },
   {
    "id": "MK-CF-M-046",
    "words_on_screen": "Medicare 1.45% of everything, 0.9% more above",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The wage above which the extra Medicare tax starts, named in the warning so the 0.9% can be checked.",
    "when_it_refuses": "Never absent — it is a published figure, not a calculation.",
    "shown_on": [
     "/base-pay"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0178",
    "date": "2026-08-27",
    "words": "\"yes\" — DEC-0178, confirmed as written: The tax band is produced ONCE, at total income (MK-CF-F-084 taxable annual → MK-CF-F-090 effective rate). The base-pay s"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0188",
    "date": "2026-08-27",
    "words": "Who earns this income? You / Partner / Both"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0205",
    "date": "2026-09-01",
    "words": "\"yes\" — DEC-0205, confirmed as written: New [a test of the app]: the 2026 bracket tables and deductions, the complete IRS Uniform Lifetime"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0208",
    "date": "2026-09-02",
    "words": "worked out"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0326",
    "date": "2026-08-20",
    "words": "married bands are not double the single ones at the top"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0389",
    "date": "",
    "words": "calculated (your standing order, 2026-09-02)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0503",
    "date": "2026-06-30",
    "words": "How is income + spending captured, at what frequency, and what about cash / unconnected cards?"
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-030",
    "words": "A wage entered for a rhythm is annualised by that rhythm, never by a flat twelve."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-031",
    "words": "Federal income tax when it is calculated, plus the state rate when one was entered (the Tax organizer’s \"State income tax %\", applied to taxable income) — no Social Security or Medicare, and no state tax when none was entered (MK-CF-D-001, DEC-0384)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-032",
    "words": "Filing status is assumed to be jointly when two people earn and nobody has said (MK-CF-D-004)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-033",
    "words": "Assumes the standard deduction, never itemised (MK-CF-D-002)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-034",
    "words": "The employer’s match is not counted here — it is not taken out of take-home (MK-CF-D-003)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-035",
    "words": "State tax is not in this figure, because we do not know their state (MK-CF-D-005)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-036",
    "words": "Shown only when the person entered their own take-home, so the difference is theirs and not ours."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-036",
    "words": "The household figure is the sum of the earners’, so a total and its parts cannot disagree (rule 2)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-045",
    "words": "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-046",
    "words": "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
   }
  ],
  "approved_drawing": {
   "drawing": "Income end to end v07, frame 3 (approved 2026-09-02)",
   "household": "Two wages, $138,000 a year together, so $11,500 gross in a month. Calculated federal tax $1,058 in the month. 401(k) contributions $1,200 in the month. No take-home entered by either earner.",
   "drawn": {
    "Take-home, household": 9242
   }
  },
  "decisions_that_govern_it": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0188",
   "DEC-0194",
   "DEC-0195",
   "DEC-0197",
   "DEC-0203",
   "DEC-0205",
   "DEC-0207",
   "DEC-0208",
   "DEC-0209",
   "DEC-0326",
   "DEC-0340",
   "DEC-0352",
   "DEC-0375",
   "DEC-0376",
   "DEC-0380",
   "DEC-0381",
   "DEC-0384",
   "DEC-0389",
   "DEC-0503",
   "DEC-1625",
   "DEC-7608",
   "DEC-7797",
   "DEC-7942"
  ],
  "period": [
   "MK-CF-M-030: a year",
   "MK-CF-M-031: a month",
   "MK-CF-M-032: no period on the figure",
   "MK-CF-M-033: a month",
   "MK-CF-M-034: a month",
   "MK-CF-M-035: a month",
   "MK-CF-M-036: a month",
   "MK-CF-M-045: a year",
   "MK-CF-M-046: a year"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-030: Shows $0 until a wage is entered; the screen offers the door to enter one.",
   "MK-CF-M-031: Shows $0 until a wage is entered.",
   "MK-CF-M-032: The row is not shown until a wage is entered.",
   "MK-CF-M-033: The row appears only when the figure is ours; an entered take-home already has tax inside it.",
   "MK-CF-M-034: The row is hidden when nobody contributes.",
   "MK-CF-M-035: The warning appears only when the take-home is ours and estimated.",
   "MK-CF-M-036: The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.",
   "MK-CF-M-045: Never absent — it is a published figure, not a calculation.",
   "MK-CF-M-046: Never absent — it is a published figure, not a calculation."
  ]
 },
 {
  "id": "MK-CF-F-140",
  "name": "periodsAYear",
  "kind": "function",
  "what_it_is_for": "How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated.",
  "formula_in_words": "Pay periods in a year: hourly 2,080, weekly 52, every two weeks 26, monthly 12, yearly 1. Any other frequency: 12.",
  "handed": "const periodsAYear = (e: BasePayEntry): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-141",
  "name": "perMonth",
  "kind": "function",
  "what_it_is_for": "One period of pay expressed as a month.",
  "formula_in_words": "Hourly: amount × hours a week (40 when none is entered) × 52 ÷ 12. Any other frequency: amount × pay periods in a year ÷ 12.",
  "handed": "function perMonth(amount: any, e: BasePayEntry): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-142",
  "name": "monthsOf",
  "kind": "function",
  "what_it_is_for": "The months the person filled in, in order.",
  "formula_in_words": "The table's rows as (month, amount) pairs, sorted by month; a blank amount counts as 0; empty when there is no table.",
  "handed": "function monthsOf(table: Record<string, any> | undefined): [string, number][]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-128",
  "name": "grossByMonth",
  "kind": "function",
  "what_it_is_for": "GROSS pay for each month the table covers, or twelve identical months when pay is steady.",
  "formula_in_words": "When the pay varies and a month-by-month table has been filled: the table, one row a month, in month order. Otherwise one row, called typical = the typical gross pay turned into a month (perMonth).",
  "handed": "export function grossByMonth(e: BasePayEntry): [string, number][]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-143",
  "name": "annualisedGross",
  "kind": "function",
  "what_it_is_for": "GROSS PAY ANNUALISED — the figure a tax bracket is read from.",
  "formula_in_words": "The average of the monthly gross rows (grossByMonth) × 12. 0 when there are no rows.",
  "handed": "export function annualisedGross(e: BasePayEntry): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-144",
  "name": "takeHomeAsEntered",
  "kind": "function",
  "what_it_is_for": "A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.",
  "formula_in_words": "In this order. (1) The pay varies and a month-by-month take-home table is filled: the average of its months; not calculated. (2) A take-home above zero was typed: that amount exactly as typed — it is asked for as a MONTH, whatever the pay frequency; not calculated. (3) Otherwise it is calculated, and marked so. With a household rate supplied: (yearly gross × (1 − rate) − monthly 401(k) × 12) ÷ 12. With none: (yearly gross − 401(k) for the year − federal income tax on the yearly gross less the 401(k), by the filing status given — single when none) ÷ 12. That federal tax has no state tax in it.",
  "handed": "export function takeHomeAsEntered(e: BasePayEntry): TakeHome",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-145",
  "name": "deductionsFromPay",
  "kind": "function",
  "what_it_is_for": "EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less the take-home.",
  "formula_in_words": "Nothing when the take-home is calculated. Otherwise yearly gross − monthly 401(k) × 12 − monthly take-home × 12: everything else that came out of pay in the year.",
  "handed": "export function deductionsFromPay(e: BasePayEntry): number | null",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-146",
  "name": "payFiguresAgree",
  "kind": "function",
  "what_it_is_for": "Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere.",
  "formula_in_words": "It passes with no check when the take-home is calculated. Otherwise, for each month of gross pay in order: left = gross − monthly 401(k) − the take-home for that month (the month's own figure when a take-home table is filled, otherwise the typed take-home, which is a monthly figure at every pay frequency). When left is below −$5: it FAILS, with a sentence naming the month and how much more the take-home is than there is. Otherwise, when gross is above zero and left ÷ gross is above 60%: it passes WITH A WARNING that gives that share as a whole percent. The first month to fail or warn decides. Exactly $5 short still passes; exactly 60% does not warn.",
  "handed": "export function payFiguresAgree(e: BasePayEntry): PayVerdict",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-171",
  "name": "earnerPay",
  "kind": "function",
  "what_it_is_for": "One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.",
  "formula_in_words": "One earner's pay figures together: gross in a month = yearly gross ÷ 12; yearly gross (annualisedGross); the monthly 401(k); the take-home, whether it is calculated and why (takeHomeAsEntered); everything else taken out, for the year and ÷ 12 for the month — nothing when the take-home is calculated; the verdict (payFiguresAgree); and the monthly gross rows.",
  "handed": "export function earnerPay(e: BasePayEntry): EarnerPay",
  "inputs_it_reads": [
   "MK-XS-I-030 tax filing status and age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-198",
  "name": "payrollTaxWithheld",
  "kind": "function",
  "what_it_is_for": "Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold.",
  "formula_in_words": "On a year's wages (below zero counts as 0): 6.2% of the wages up to $184,500, plus 1.45% of all the wages, plus 0.9% of the wages above $200,000.",
  "handed": "export function payrollTaxWithheld(wageAnnual: number): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-179",
  "name": "entryFromWage",
  "kind": "function",
  "what_it_is_for": "Turns a wage as the profile stores it into the form the pay calculations read: how often it is paid, whether it varies, the gross, the 401(k) and the take-home entered.",
  "formula_in_words": "Turns a stored wage record into the pay entry: frequency (monthly when none); varies = the record says month-by-month, or its month table holds any row; typical gross = the base salary; the month table, only when it varies; the monthly 401(k); the typed take-home; hours a week.",
  "handed": "export function entryFromWage(w: Record<string, any> | null | undefined): BasePayEntry",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-180",
  "name": "enteredLandsAnnual",
  "kind": "function",
  "what_it_is_for": "Every earner’s entered take-home, a year — or null when any of them did not say.",
  "formula_in_words": "Nothing unless EVERY earner typed a take-home above zero. Otherwise each earner's typed take-home — a monthly figure, whatever the pay frequency — × 12, added.",
  "handed": "export function enteredLandsAnnual(op: OnboardingProfile | null): number | null",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-181",
  "name": "rateInForce",
  "kind": "function",
  "what_it_is_for": "THE ONE ANSWER every screen reads.",
  "formula_in_words": "In this order. (1) The person chose to type a rate: that percent ÷ 100, held between 0 and 1. (2) Yearly salary is above zero and every earner typed a take-home: rate = (yearly salary − 401(k) for the year − yearly take-home, never below 0) ÷ yearly salary, held between 0 and 1. Both of these count as the person's own. (3) Otherwise calculated: federal income tax plus state tax on the yearly taxed income (taxableAnnual) LESS the household's 401(k) contributions for the year — they come off before tax — ÷ the yearly taxed income, by filing status, with the standard deduction. 0 when there is no taxed income. Its words for what the calculated rate covers: federal income tax only — or, when a state rate was entered, federal income tax plus that state rate, written as a percent to two decimals — assuming the standard deduction.",
  "handed": "export function rateInForce(op: OnboardingProfile | null): RateInForce",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income",
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [
   "DEC-0196",
   "DEC-7608",
   "DEC-7795",
   "DEC-7797",
   "DEC-7798",
   "DEC-7944",
   "DEC-7945"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

2 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
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
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A wage turned into a month or a year** — in this part: MK-CF-F-140, MK-CF-F-141, MK-CF-F-143

```json
[
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
 },
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source."
 }
]
```

**Gross income for the year** — in this part: MK-CF-F-143

```json
[
 {
  "id": "MK-CF-F-083",
  "name": "totalGrossAnnual",
  "what_it_is_for": "Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).",
  "formula_in_words": "Salary for the year + tips for the year + bonus + signing bonus + stock vesting + net rent + taxed extra in a month × 12 + untaxed extra in a month × 12 + one-off taxed + one-off untaxed + retirement income in a month × 12."
 },
 {
  "id": "MK-CF-F-045",
  "name": "grossAnnualBaseline",
  "what_it_is_for": "Gross annual baseline = jobs (gross) + rentals (gross − expenses), all annualized.",
  "formula_in_words": "annualNet added over every source."
 },
 {
  "id": "MK-CF-F-082",
  "name": "salaryAnnual",
  "what_it_is_for": "Salary income for the year = sum of the per-month gross salary.",
  "formula_in_words": "The twelve months of gross salary (salaryGrossByMonth) added."
 }
]
```

**A rate of tax** — in this part: MK-CF-F-181

```json
[
 {
  "id": "MK-CF-F-048",
  "name": "effectiveTaxRate",
  "what_it_is_for": "The share of gross income that goes to tax: the person's own rate where they gave one, otherwise the calculated federal rate for the way they file.",
  "formula_in_words": "With the person's own rate switched on: that rate, held between 0 and 1. Otherwise federal income tax on the yearly gross ÷ the yearly gross, by filing status (single when none), with no state tax (effectiveRateOnGrossFor)."
 },
 {
  "id": "MK-CF-F-090",
  "name": "effectiveRate",
  "what_it_is_for": "The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate.",
  "formula_in_words": "The rate in force (rateInForce)."
 },
 {
  "id": "MK-CF-F-102",
  "name": "effectiveRateOnGrossFor",
  "what_it_is_for": "What share of my income actually goes in tax?",
  "formula_in_words": "taxOwedFor ÷ gross; 0 when the gross is zero or less."
 }
]
```

**Take-home** — in this part: MK-CF-F-144, MK-CF-F-171, MK-CF-F-180

```json
[
 {
  "id": "MK-CF-F-044",
  "name": "annualNet",
  "what_it_is_for": "Annual NET contribution of a source: jobs use gross; rentals net out operating expenses.",
  "formula_in_words": "The amount each period — for rent, rent less running costs each period — × the periods in a year: weekly 52, every two weeks 26, monthly 12, quarterly 4, yearly 1, one-off 1."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-030",
  "label": "Each person’s pay",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "What everyone in the household earns before anything is taken out.",
  "formula": "gross a year = the sum of every earner’s wage, each annualised from the rhythm they are paid in",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-002 how often it is paid",
   "MK-XS-I-021 spouse wage"
  ],
  "decisions": [
   "A wage entered for a rhythm is annualised by that rhythm, never by a flat twelve."
  ],
  "refusal": "Shows $0 until a wage is entered; the screen offers the door to enter one.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$109,200/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0207",
   "DEC-0352",
   "DEC-0375",
   "DEC-0380",
   "DEC-7942"
  ]
 },
 {
  "id": "MK-CF-M-031",
  "label": "Take-home",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay",
   "/cashflow",
   "/income-manager"
  ],
  "answers": "What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.",
  "formula": "for one earner: what they entered, or their gross less federal tax less their own 401(k). For the household: the sum of the earners’ figures, never a second calculation.",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-003 take-home as entered",
   "MK-CF-I-004 401(k) contribution",
   "MK-CF-I-005 tax rate as entered"
  ],
  "decisions": [
   "Federal income tax when it is calculated, plus the state rate when one was entered (the Tax organizer’s \"State income tax %\", applied to taxable income) — no Social Security or Medicare, and no state tax when none was entered (MK-CF-D-001, DEC-0384)."
  ],
  "refusal": "Shows $0 until a wage is entered.",
  "note": "ONE figure over two sets: one earner, and the household — so a total and its parts cannot disagree (rule 2). It wears ≈ whenever the figure was calculated rather than entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$9,398/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection",
   "BudgetScreen",
   "CashFlowScreen › IncomeTab",
   "IncomeManagerScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0194",
   "DEC-0208",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-0389",
   "DEC-0503",
   "DEC-7608"
  ]
 },
 {
  "id": "MK-CF-M-032",
  "label": "Federal tax bracket",
  "unit": "percent",
  "screens": [
   "/base-pay"
  ],
  "answers": "What the next dollar earned costs in federal income tax.",
  "formula": "the published bracket the household’s wages fall in once each earner’s own 401(k) is out — the 401(k) is not taxed — less the standard deduction, for their filing status",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-XS-I-024 filing status"
  ],
  "decisions": [
   "Filing status is assumed to be jointly when two people earn and nobody has said (MK-CF-D-004)."
  ],
  "refusal": "The row is not shown until a wage is entered.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "22%"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0178",
   "DEC-0184",
   "DEC-0195",
   "DEC-0197",
   "DEC-0207",
   "DEC-0209",
   "DEC-0375",
   "DEC-0380",
   "DEC-7797"
  ]
 },
 {
  "id": "MK-CF-M-033",
  "label": "Calculated federal tax",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "The federal income tax we calculate on the household’s wages, when nobody has entered their own figure.",
  "formula": "tax a month = federal tax on (everything taxable, less the 401(k)s and the standard deduction, at the published bands) ÷ 12 — the same in every month",
  "inputs": [
   "MK-CF-M-030 gross a year",
   "MK-XS-I-024 filing status",
   "MK-XS-I-025 how many are over 65"
  ],
  "decisions": [
   "Assumes the standard deduction, never itemised (MK-CF-D-002)."
  ],
  "refusal": "The row appears only when the figure is ours; an entered take-home already has tax inside it.",
  "worked": {
   "given": "One earner filing single: $5,000/month ($60,000/year), paying $400/month into a 401(k); no tax rate and no take-home told us, so the tax is ours. Taxed: $60,000 − $4,800 − $16,100 = $39,100 → $1,240 + 12% × $26,700 = $4,444/year, 7.41% of the $60,000.",
   "answer": "$370/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0195",
   "DEC-0208",
   "DEC-0375",
   "DEC-0380",
   "DEC-0384",
   "DEC-0389"
  ]
 },
 {
  "id": "MK-CF-M-034",
  "label": "Your 401(k)s",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "What everyone in the household puts into their own 401(k) each month.",
  "formula": "401(k) a month = the sum of every earner’s own contribution, the employer’s match excluded",
  "inputs": [
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "The employer’s match is not counted here — it is not taken out of take-home (MK-CF-D-003)."
  ],
  "refusal": "The row is hidden when nobody contributes.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have typed their tax rate: 22%.",
   "answer": "$1,600/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0375",
   "DEC-0380"
  ]
 },
 {
  "id": "MK-CF-M-035",
  "label": "The take-home above is higher than it will really be",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "By roughly how much the calculated take-home overstates what will reach the bank, because only federal income tax is taken out of it.",
  "formula": "overstated by = Σ over earners of (Social Security 6.2% of the wage up to the wage base + Medicare 1.45% of the whole wage + 0.9% of the wage above the additional-tax threshold) ÷ 12",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-ST-I-030 Social Security wage base",
   "MK-ST-I-031 Medicare additional-tax threshold"
  ],
  "decisions": [
   "State tax is not in this figure, because we do not know their state (MK-CF-D-005)."
  ],
  "refusal": "The warning appears only when the take-home is ours and estimated.",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. They have told us no tax rate and no take-home, so the take-home shown is ours.",
   "answer": "$1,079/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0194",
   "DEC-0208",
   "DEC-0326",
   "DEC-0375",
   "DEC-0384",
   "DEC-0389"
  ]
 },
 {
  "id": "MK-CF-M-036",
  "label": "Everything else taken out",
  "unit": "money",
  "per": "month",
  "screens": [
   "/base-pay"
  ],
  "answers": "What a payslip takes out beyond the 401(k) — tax, medical cover and anything else bought through work — read back from the figures the person entered.",
  "formula": "for one earner: everything else = (their gross a year − their 401(k) a year − their take-home /year) ÷ 12. For the household: the sum of the earners’ figures, never a second subtraction.",
  "inputs": [
   "MK-CF-I-001 wage",
   "MK-CF-I-003 take-home as entered",
   "MK-CF-I-004 401(k) contribution"
  ],
  "decisions": [
   "Shown only when the person entered their own take-home, so the difference is theirs and not ours.",
   "The household figure is the sum of the earners’, so a total and its parts cannot disagree (rule 2)."
  ],
  "refusal": "The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.",
  "note": "ONE figure over two sets: one earner, and the household. Moved off the screen into this door on 2026-09-14 — the base-pay card used to do the subtraction itself (rule 5).",
  "worked": {
   "given": "Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. Each has typed their take-home each month: $5,850 and $3,400.",
   "answer": "$3,250/month"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen",
   "BasePayScreen › EarnerSection"
  ],
  "decisions_that_govern_it": [
   "DEC-0188",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-045",
  "label": "Social Security takes 6.2% of a wage up to",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "The wage ceiling above which no more Social Security tax is taken, named in the warning so the 6.2% can be checked.",
  "formula": "the published wage base for the tax year",
  "inputs": [
   "MK-ST-I-030 Social Security wage base"
  ],
  "decisions": [
   "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
  ],
  "refusal": "Never absent — it is a published figure, not a calculation.",
  "worked": {
   "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
   "answer": "$184,500/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0205",
   "DEC-0375"
  ]
 },
 {
  "id": "MK-CF-M-046",
  "label": "Medicare 1.45% of everything, 0.9% more above",
  "unit": "money",
  "per": "year",
  "screens": [
   "/base-pay"
  ],
  "answers": "The wage above which the extra Medicare tax starts, named in the warning so the 0.9% can be checked.",
  "formula": "the published additional-Medicare-tax threshold for the tax year",
  "inputs": [
   "MK-ST-I-031 Medicare additional-tax threshold"
  ],
  "decisions": [
   "Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4)."
  ],
  "refusal": "Never absent — it is a published figure, not a calculation.",
  "worked": {
   "given": "The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not ours to choose; they are read back so the sentence on screen can be checked against the law.",
   "answer": "$200,000/year"
  },
  "door": "MK-CF-O-001 basePay",
  "ruled": "2026-09-14",
  "printed_in": [
   "BasePayScreen"
  ],
  "decisions_that_govern_it": [
   "DEC-0194",
   "DEC-0205",
   "DEC-0375"
  ]
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0176",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "s against two people",
  "the_log_records": "The whole income surface redesigned. Six decisions:\n1. Base pay becomes a full screen with one expandable section per earner — gross, 401(k), employer match, and what actually lands.\n2. A 14-month dated table when pay varies, rather than one typical figure.\n3. BOTH earners are captured, not one: a household on $84,000 plus $54,000 was being read as $84,000 — one person’s income against two people’s spending.\n4. A filing-status question, which had never been asked, so every couple was taxed as a single filer.\n5. Bonus and company shares follow the same who-earns pattern.\n6. Interest and dividends are worked out from your holdings rather than asked for, and treated as TAXABLE BUT NOT SPENDABLE.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
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
  "id": "DEC-0203",
  "decided": "2026-09-01",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "If someone is not working, how can they contribute to 401K?",
  "the_log_records": "The app asks about a 401(k) only where you could legally have one — that means a wage, or self-employment earnings. His challenge: \"If someone is not working, how can they contribute to 401K?\" They cannot. A pension, Social Security, rent or dividends give nobody the right to contribute, so the question is not asked of someone with no earned income.",
  "governs": "MK-CF-O-001"
 },
 {
  "id": "DEC-0205",
  "decided": "2026-09-01",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "\"yes\" — DEC-0205, confirmed as written: New src/__tests__/statutory_constants.test.ts: the 2026 bracket tables and deductions, the complete IRS Uniform Lifetime",
  "the_log_records": "Every figure set by law is typed in from the published source. The first run against the real figures found three errors: the IRA limits were a year out of date, the bigger catch-up allowance for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, and four of the required-withdrawal divisors were slightly wrong from being interpolated rather than typed.",
  "governs": "IRS_LIMITS in src/domain · MK-CF-M-045 · MK-CF-M-046"
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
  "id": "DEC-0270",
  "decided": "2026-09-03",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "a figure the person gave us → 'you entered'",
  "the_log_records": "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never confused with one the app worked out.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/tax-rate.ts"
 },
 {
  "id": "DEC-0283",
  "decided": "2026-09-10",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.",
  "the_log_records": "“Gross should be before any deductions. For example Income before tax is not same as gross as Income Before Tax = Gross Income - 401K - any other deductions such as medical premium.” So “Gross” is labelled “before any deductions”, and the earlier wording “before tax” is retired — it meant something different and narrower.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md"
 },
 {
  "id": "DEC-0291",
  "decided": "2026-08-27",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "spouse",
  "the_log_records": "“spouse.” The word is spouse, not partner, in everything a person reads.",
  "governs": "src/domain/income/onboarding.ts · MoneyKeel/functions/cashflow/base-pay.ts"
 },
 {
  "id": "DEC-0326",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "married bands are not double the single ones at the top",
  "the_log_records": "“married bands are not double the single ones at the top.” A couple’s tax bands are NOT simply twice a single person’s in the upper brackets — assuming they are overstates take-home for higher earners.",
  "governs": "MK-CF-M-035"
 },
 {
  "id": "DEC-0327",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "state tax applies to taxable income, never gross",
  "the_log_records": "“state tax applies to taxable income, never gross.” Applying a state rate to gross income overstates the tax by the whole deduction.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/domain/income/onboarding.ts"
 },
 {
  "id": "DEC-0340",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "the caveat under the federal-only take-home must name its subject and use the real withholding: 6.2% up to the wage base, 1.45% on all, 0.9% more above $200,000 — \"Let's not assume that reader knows what statement is referring to. Always be explicit.\"",
  "the_log_records": "“the caveat under the federal-only take-home must name its subject and use the real withholding: 6.2% up to the wage base, 1.45% on all, 0.9% more above $200,000 — Let’s not assume that reader knows what statement is referring to. Always be explicit.” So the sentence names what it is about and uses the actual rates, rather than a rounded 7.65%.",
  "governs": "MK-CF-O-001"
 },
 {
  "id": "DEC-0352",
  "decided": "2026-09-14",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "a door DECLARES each figure it hands out beside the code that computes it (identifier, the words on screen, unit, formula in plain English, inputs, decisions, refusal); a screen prints a figure ONLY by its identifier; and the master file's figure rows are PRINTED from those declarations rather than typed, so the file and the code cannot disagree",
  "the_log_records": "“a door DECLARES each figure it hands out beside the code that computes it — identifier, the words on screen, unit, formula in plain English, inputs, decisions.” The master file’s rows are then PRINTED from those declarations, so the file is a printout of the code rather than a description of it that can go stale.",
  "governs": "MK-CF-M-030"
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
  "id": "DEC-0380",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first build-54 device pass — the card contradicted itself ($21,159 − $4,380 − $1,656 ≠ $16,403) because every estimated earner was granted the FULL joint deduction; and a two-earner household was banded as single (32% vs jointly 24%).",
  "the_log_records": "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his first device pass of build 54, where the card contradicted itself because every estimated earner was granted the FULL joint deduction.",
  "governs": "MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033 · MK-CF-M-034 · MK-CF-O-001 · MK-CF-O-001"
 },
 {
  "id": "DEC-0381",
  "decided": "2026-09-02",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "a mixed household's take-home note is a labelled fact per person, never prose: “Your take-home: $5,000 (you entered) · Sam’s take-home: ≈$3,686 (calculated — gross less federal tax and 401(k))”",
  "the_log_records": "A mixed household’s take-home note is a labelled fact per person, never prose: “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated).” The prose version was misread — the entered $5,000 was taken for gross.",
  "governs": "MK-CF-O-001 · MK-CF-O-001"
 },
 {
  "id": "DEC-0384",
  "decided": "2026-08-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "FOUNDER RULING: the tax estimate STAYS FEDERAL. “Payroll tax applies to wages, and our gross also carries rent, dividends and bonuses — applying 7.65% to that total would be wrong, not merely imprecise. State tax cannot be known without asking. So we work out the one thing we can, say so, and let it be corrected.”",
  "the_log_records": "Our tax estimate covers federal income tax only, and says so on the screen. Three decisions:\n1. We do not add payroll tax to it. Payroll tax applies to wages, and our gross figure also holds rent, dividends and bonuses — applying 7.65% to all of that would be wrong, not just rough.\n2. We do not guess state tax, because it cannot be known without asking.\n3. We work out the one thing we can, name the gap in dollars, and let you correct it.",
  "governs": "MK-CF-M-033 · MK-CF-M-035 · MK-CF-O-001"
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
  "id": "DEC-0396",
  "decided": "not dated in the log",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "/month, /year",
  "the_log_records": "“/month, /year.” One way of writing a period, everywhere — and, asked about the rest, “/quarter, /week, /2 weeks”. “a month” and “/mo” are retired.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts · src/screens/IncomeDetailScreen.tsx"
 },
 {
  "id": "DEC-0503",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "How is income + spending captured, at what frequency, and what about cash / unconnected cards?",
  "the_log_records": "HIS QUESTION: “How is income + spending captured, at what frequency, and what about cash / unconnected cards?” The parts no connection reaches still have to be captured somehow.",
  "governs": "MK-CF-M-031"
 },
 {
  "id": "DEC-1625",
  "decided": "2026-10-04",
  "type": "DESIGN",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "#4 - remove second sentence.",
  "the_log_records": "On Your base pay, when the app calculates the tax, the card states its own sum and stops: \"$11,500 gross − $873 tax − $1,200 of 401(k)s = $9,427.\" The second drawn sentence is not shown.",
  "governs": "MoneyKeel/functions/cashflow/base-pay.ts (MK-CF-O-001 basePay) · src/screens/BasePayScreen.tsx · [a test of the app]"
 },
 {
  "id": "DEC-7608",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenet 5) and DEC-0327, made without asking him, as his order of 2026-09-30 says. 5.00% state rate typed on the Tax organizer: the words read \"federal income tax only\"; they now read \"federal income tax, plus the 5.00% state rate you entered\". The Tax organizer's own words say the rate tunes every tax estimate, so the typed rate counts. To reverse: leave the typed state rate out of the calculated rate and say \"federal income tax only\". One word from him reverses it.",
  "governs": "MK-CF-M-031 · MK-CF-F-181 rateInForce"
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
  "id": "DEC-7942",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenets 3 and 5), made without asking him, as his order of 2026-09-30 says. A $5,000 take-home with the person's own 0% rate: the gross box showed 5475.378787878787, worked back from the federal tables, the card read Everything else taken out $475/month · 0%, and its last line said nothing there was calculated. The gross is now worked back with their own rate, $5,000.00, under the line \"≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.\", and the card's last line says the take-home is what was entered and the gross was worked back from it. The typed take-home is unchanged ($5,000 on This month). Typing a gross brings back the drawing's words. The drawing's rule 9: every estimate is prefixed ≈ and says what it cannot see. To reverse: work the gross back from the federal schedule and print the drawn words. One word from him reverses it.",
  "governs": "MK-CF-F-186 convertTakeHomeMode · MK-CF-O-001 basePay · MK-CF-M-030 · src/screens/BasePayScreen.tsx"
 },
 {
  "id": "DEC-7944",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-3523 (tenet 1) and DEC-0283, made without asking him, as his order of 2026-09-30 says. It always compared against single with no one over 65: Sam's household, 67 and already taxed jointly, saw Taxed as single $9,650 and $328/month more while the take-home stayed $6,600. What we were assuming is now the status in force before the answer (the answer on record, or filing jointly when a spouse was entered and nothing was asked), and both sides count who is 65 or older as the take-home does. A couple already taxed jointly who confirm it see no comparison; a single 67-year-old now filing jointly sees $266/month more; jointly to separately reads \"$327/month less take-home than we were showing you.\" To reverse: compare with single, no one over 65, and show only a rise. One word from him reverses it.",
  "governs": "src/screens/FilingStatusScreen.tsx · MK-CF-F-181 rateInForce"
 },
 {
  "id": "DEC-7945",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his ruling DEC-3523 (tenet 2), made without asking him, as his order of 2026-09-30 says. Single to jointly: take-home $6,196 → $6,523 a month, printed; the comparison said $328/month more, the cent-exact $327.50 rounded, so the printed figures did not subtract to it. It now says $327/month more, the difference of the two printed take-homes, as the Performance walk's rows do; both over 65, $481 → $480. The first cut kept the $1 gap, reading the precision ruling (DEC-0264) as rounding once at display; the lead overruled it: a difference shown beside two printed figures is a figure made from those two. To reverse: print the cent-exact difference rounded. One word from him reverses it.",
  "governs": "src/screens/FilingStatusScreen.tsx · MK-CF-F-181 rateInForce"
 }
]
```
