# Cash flow — part 2 of 19: Earners, and a salary that varies month to month

14 cards, so 14 formula checks and 70 cases, and one `rules_held` line for each of the 1 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 2"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface EarnerWage {
  baseSalary?: Money;
  salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly';
  salaryMode?: 'gross' | 'takehome';
  hoursPerWeek?: Money;
  salaryByMonth?: Record<string, Money> | Money[];
  salaryMonthMode?: 'same' | 'months';
  c_401k?: Money;
  employerMatchValue?: Money;
  employerMatchMode?: 'pct' | 'dollar';
  /** The take-home they enter, per period. Used as typed — never grossed up. */
  landsTypical?: Money;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-172",
  "name": "hasWage",
  "kind": "function",
  "what_it_is_for": "Whether a person has a wage on record: a base salary above zero, or a month-by-month pay table.",
  "formula_in_words": "True when a wage record has a base salary above zero, or a month table with any row.",
  "handed": "const hasWage = (w: any): boolean",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-173",
  "name": "earnerWages",
  "kind": "function",
  "what_it_is_for": "The wages this household actually has, in the order the screen shows them.",
  "formula_in_words": "Who earns = both: the person's own wage record, plus the spouse's when it has a wage. Who earns = the spouse, and the spouse's record has a wage: the spouse's only. Otherwise the person's own only.",
  "handed": "export function earnerWages(op: OnboardingProfile | null): EarnerWage[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-174",
  "name": "hasTwoEarners",
  "kind": "function",
  "what_it_is_for": "Does this household have a second wage on record?",
  "formula_in_words": "True when earnerWages gives more than one.",
  "handed": "export function hasTwoEarners(op: OnboardingProfile | null): boolean",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-175",
  "name": "sumOverEarners",
  "kind": "function",
  "what_it_is_for": "Adds up one figure across every earner in the household.",
  "formula_in_words": "The chosen figure worked for each earner and added; a missing figure counts 0.",
  "handed": "export function sumOverEarners(op: OnboardingProfile | null, of: (w: EarnerWage) => number): number",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-176",
  "name": "sumMonthsOverEarners",
  "kind": "function",
  "what_it_is_for": "Add up twelve numbers per earner, month by month.",
  "formula_in_words": "The chosen twelve-month row worked for each earner and added month by month.",
  "handed": "export function sumMonthsOverEarners(\n  op: OnboardingProfile | null, of: (w: EarnerWage) => number[],\n): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-188",
  "name": "householdPreTaxContributionsAnnual",
  "kind": "function",
  "what_it_is_for": "The household's pre-tax 401(k) contributions for the year — every earner's, added up.",
  "formula_in_words": "Each earner's monthly 401(k) added, × 12.",
  "handed": "export function householdPreTaxContributionsAnnual(op: OnboardingProfile | null): number",
  "inputs_it_reads": [
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [
   "DEC-0252"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-163",
  "name": "monthKey",
  "kind": "function",
  "what_it_is_for": "'YYYY-MM' for a date, read from the local clock — never toISOString, which is UTC.",
  "formula_in_words": "A date written as year-month, for example 2026-08.",
  "handed": "export function monthKey(d: Date): string",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-164",
  "name": "monthWindow",
  "kind": "function",
  "what_it_is_for": "`count` month keys starting `back` months before `from` — the shape the base-pay table needs.",
  "formula_in_words": "A run of year-months: it starts that many months back from the given date and holds that many months.",
  "handed": "export function monthWindow(from: Date, back: number, count: number): string[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-165",
  "name": "salaryMonths",
  "kind": "function",
  "what_it_is_for": "THE canonical table: month key → amount, whatever shape it was stored in.",
  "formula_in_words": "The stored month table as year-month → amount. A table kept as twelve plain figures is read as January to December of this year. Rows whose key is not a year-month are dropped. Empty when there is none.",
  "handed": "export function salaryMonths(op: OnboardingProfile | null, now: Date = new Date()): Record<string, number>",
  "inputs_it_reads": [
   "MK-XS-I-023 salary and other income"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-166",
  "name": "hasMonthlySalaryTable",
  "kind": "function",
  "what_it_is_for": "Did they tell us their pay varies month to month?",
  "formula_in_words": "True when salaryMonths holds any row.",
  "handed": "export function hasMonthlySalaryTable(op: OnboardingProfile | null): boolean",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-167",
  "name": "salaryCalendarYear",
  "kind": "function",
  "what_it_is_for": "One calendar year as twelve numbers, January first — the shape every existing caller expects.",
  "formula_in_words": "January to December of the year asked for: the table's figure where it has that month, otherwise the fallback.",
  "handed": "export function salaryCalendarYear(\n  op: OnboardingProfile | null, year: number, fallback = 0, now: Date = new Date(),\n): number[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-168",
  "name": "salaryWindow",
  "kind": "function",
  "what_it_is_for": "The table as the base-pay screen shows it: [month key, amount] for a window of months.",
  "formula_in_words": "For each year-month asked for: the table's figure where it has it, otherwise the fallback.",
  "handed": "export function salaryWindow(\n  op: OnboardingProfile | null, keys: string[], fallback = 0, now: Date = new Date(),\n): [string, number][]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-169",
  "name": "withSalaryMonth",
  "kind": "function",
  "what_it_is_for": "Write one month without disturbing the others.",
  "formula_in_words": "The table with that one month set to the amount (a blank counts 0); every other month unchanged.",
  "handed": "export function withSalaryMonth(\n  op: OnboardingProfile | null, key: string, amount: any, now: Date = new Date(),\n): Record<string, number>",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-170",
  "name": "salaryYearFromCells",
  "kind": "function",
  "what_it_is_for": "A whole calendar year written at once — what today's twelve-cell grids save.",
  "formula_in_words": "The first twelve figures, as January to December of the year given.",
  "handed": "export function salaryYearFromCells(cells: any[], year: number): Record<string, number>",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A date written as a year-month** — in this part: MK-CF-F-163

```json
[
 {
  "id": "MK-CF-F-191",
  "name": "ym",
  "what_it_is_for": "Writes a date as its year and month: 2026-08.",
  "formula_in_words": "A date written as year-month, for example 2026-08."
 }
]
```

**The household's 401(k) contributions** — in this part: MK-CF-F-188

```json
[
 {
  "id": "MK-CF-F-206",
  "name": "householdK401ByMonth",
  "what_it_is_for": "THE HOUSEHOLD'S 401(k) CONTRIBUTIONS, MONTH BY MONTH — every earner's, in the months that earner is actually paid.",
  "formula_in_words": "For each earner: their monthly 401(k) in every month they have gross pay, and 0 in months they do not. Added over the earners, month by month."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0252",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "the tax organizer shows gross income, 401(k) contribution, standard deduction and taxable income",
  "the_log_records": "“the tax organizer shows gross income, 401(k) contribution, standard deduction and taxable income.” The four lines a tax return shows, in order, so the subtraction can be followed by hand.",
  "governs": "MK-MN-M-027 · MK-MN-M-028 · MK-PL-F-082 · MK-CF-F-188"
 }
]
```
