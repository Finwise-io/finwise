# Cash flow — part 10 of 19: Debts — credit, kinds of debt, and a mortgage against a Treasury

13 cards, so 13 formula checks and 65 cases, and one `rules_held` line for each of the 8 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 10"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface CreditUtil { ratio: number; status: 'good' | 'caution' | 'high'; }

export interface DTI { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; }

export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
  property_id?: EntityId;          // a mortgage or HELOC: the property in Net worth it is on (founder,
                                   // 2026-10-04: "no mortgage without property"). Older rows carry none
                                   // and are matched by mortgagesByProperty.
}

export interface DebtDoc { user_id: UserId; debts: Debt[]; last_updated?: any; }

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;   // Σ MINIMUM payments — the obligation (use for DTI)
  total_actual_payment: number;         // Σ ACTUAL payments (override-aware) — use for cash flow
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

export type DebtType = 'MORTGAGE' | 'HELOC' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'MEDICAL' | 'OTHER';

export interface MortgageComparison {
  /** the loan's own rate, as a percentage for display */
  mortgagePct: number;
  /** today's ten-year Treasury yield, as a percentage for display */
  treasuryPct: number;
  /** mortgage rate minus the yield, in percentage points; positive = paying down wins */
  gapPoints: number;
  /** what that gap is worth in a year at today's balance — the number a person can feel */
  annualDifference: number;
  /** over the life of the loan, how much better (positive) or worse (negative) off paying the
   *  extra leaves them versus putting the same money into Treasuries */
  lifetimeDifference: number;
  /** true when the two rates are close enough that neither choice is clearly better */
  tooCloseToCall: boolean;
  /** which way it points — the copy branches on this, never on the sign of a number */
  direction: 'paying-down-wins' | 'treasuries-win' | 'too-close';
}

export interface MortgageOddsEffect {
  /** the plan exactly as it stands today */
  before: number;
  /** the same plan with the extra payment genuinely modelled */
  after: number;
  /** the calendar year the loan clears without the extra payment */
  payoffYear: number;
  /** …and with it */
  fasterPayoffYear: number;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-031",
  "name": "creditUtilization",
  "kind": "function",
  "what_it_is_for": "How much of a credit limit is in use, as a share, and whether that is good (30% or less), a caution (up to 50%) or high.",
  "formula_in_words": "Share = balance ÷ limit (0 when the limit is zero or less). Good at 30% or under; caution above 30% up to 50%; high above 50% — judged before rounding. The share is then rounded to three decimals.",
  "handed": "export function creditUtilization(balance: number, limit: number): CreditUtil",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-032",
  "name": "creditScoreBand",
  "kind": "function",
  "what_it_is_for": "The word for a credit score: Excellent from 800, Very good from 740, Good from 670, Fair from 580 and Poor below that.",
  "formula_in_words": "800 and above Excellent; 740 and above Very good; 670 and above Good; 580 and above Fair; below 580 Poor. Good, Very good and Excellent count as good.",
  "handed": "export function creditScoreBand(score: number): { label: string; good: boolean }",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-033",
  "name": "debtToIncome",
  "kind": "function",
  "what_it_is_for": "Monthly debt payments as a share of gross monthly income, judged against a guideline of 36% for a homeowner and 20% for anyone else.",
  "formula_in_words": "Share = monthly debt payments ÷ monthly gross income (0 when the income is zero or less). Guideline: 36% for a homeowner, 20% otherwise. Good at or under the guideline; caution up to 1.4 × the guideline (50.4% for a homeowner, 28% otherwise); high above that. The share is rounded to three decimals after it is judged.",
  "handed": "export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-035",
  "name": "debtKind",
  "kind": "function",
  "what_it_is_for": "What do we know about this kind of debt?",
  "formula_in_words": "The label and icon recorded for a kind of debt; nothing for a kind that is not on the list.",
  "handed": "export function debtKind(id?: string)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-036",
  "name": "buildDebtState",
  "kind": "function",
  "what_it_is_for": "What is the whole debt picture?",
  "formula_in_words": "Total = the balances that are known, added (totalDebtBalance) — a debt with no balance is left out, not counted as zero. Minimum in a month = minimumDebtService. Actual payment in a month = actualDebtPayment. Highest-rate debt = the one with the largest yearly rate, the first of equals. High-cost debt = the balances of the debts whose rate is ABOVE 7%, added.",
  "handed": "export function buildDebtState(uid: UserId, debts: Debt[]): DebtState",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-037",
  "name": "inferDebtType",
  "kind": "function",
  "what_it_is_for": "The kind of debt, judged from its name: a home-equity credit line, a mortgage, a car loan, a student loan, a credit card, a medical debt, a personal loan or something else.",
  "formula_in_words": "From the debt's name, capitals ignored, first match wins: heloc or home equity → home-equity line; mortgage or home loan → mortgage; auto, car loan or vehicle → auto; student or tuition → student loan; credit card, visa, mastercard or amex → credit card; medical, hospital or dental → medical; personal → personal; anything else → other.",
  "handed": "export function inferDebtType(label: string | undefined): DebtType",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-038",
  "name": "debtsFromOnboarding",
  "kind": "function",
  "what_it_is_for": "What debts should exist from the setup answers?",
  "formula_in_words": "One debt when the balance entered at sign-up is above zero: its name (Debt when blank), its kind from the name (inferDebtType), the balance, yearly rate = the percent entered ÷ 100, and the minimum payment. None otherwise.",
  "handed": "export function debtsFromOnboarding(uid: UserId, op: Record<string, any> | null): DebtDoc",
  "inputs_it_reads": [
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-041",
  "name": "getDebtState",
  "kind": "function",
  "what_it_is_for": "Reads a person's saved debts and returns their totals, or nothing when none are saved.",
  "formula_in_words": "Loads the stored debts and gives buildDebtState of them; nothing when none are stored.",
  "handed": "export async function getDebtState(uid: UserId)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-042",
  "name": "mortgageOddsEffect",
  "kind": "function",
  "what_it_is_for": "Run the plan twice and report both results.",
  "formula_in_words": "Nothing when the extra is zero or less, or when the mortgage would never clear at either payment (monthsToClear). Payoff year = this year + the whole years in (months − 1) ÷ 12 — worked for the present payment and for payment + extra. Before = the retirement projection's chance of success with the present payment running through its payoff year. After = the chance with payment + extra running through the earlier payoff year, the yearly saving lowered by extra × 12 until then, and raised by (payment + extra) × 12 from the year after.",
  "handed": "export function mortgageOddsEffect(args: {\n  base: RetirementInputs;\n  balance: number;\n  annualRate: number;\n  monthlyPayment: number;\n  extraMonthly: number;\n  nowYear: number;\n}): MortgageOddsEffect | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-125",
  "name": "amortise",
  "kind": "function",
  "what_it_is_for": "Months to clear a balance at a given payment, and the total interest paid getting there.",
  "formula_in_words": "Never clears — infinite months and interest — when the payment does not exceed the first month's interest. Otherwise month by month, for at most 1,200: interest = balance × yearly rate ÷ 12; balance = balance + interest − payment; until the balance is zero or less. Gives the months, and the interest added up.",
  "handed": "function amortise(balance: number, annualRate: number, payment: number): { months: number; interest: number }",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-126",
  "name": "futureValue",
  "kind": "function",
  "what_it_is_for": "Future value of a monthly contribution earning `rate`, contributed at the end of each month.",
  "formula_in_words": "0 when the months or the monthly amount are zero or less. Otherwise monthly amount × ((1 + yearly rate ÷ 12) to the power months − 1) ÷ (yearly rate ÷ 12).",
  "handed": "function futureValue(monthly: number, rate: number, months: number): number",
  "decisions_that_govern_it": [
   "DEC-7795"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-229",
  "name": "balanceGrownTo",
  "kind": "function",
  "what_it_is_for": "WHAT A POT GROWS TO: a starting balance compounding monthly, plus a monthly contribution added at the end of each month (MK-CF-F-126 futureValue, the one formula for the contributions).",
  "formula_in_words": "What a pot grows to: the starting balance × (1 + the yearly rate ÷ 12) to the power of the months, plus what the monthly contribution grows to at that rate over those months, each added at the end of its month (futureValue).",
  "handed": "export function balanceGrownTo(start: number, monthly: number, rate: number, months: number): number",
  "decisions_that_govern_it": [
   "DEC-7795"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-043",
  "name": "compareMortgageToTreasury",
  "kind": "function",
  "what_it_is_for": "Compare paying `extraMonthly` into the mortgage against putting the same money into Treasuries.",
  "formula_in_words": "Nothing unless the balance, the rate and the payment are all above zero. Gap = (mortgage rate − Treasury yield) in percentage points, to two decimals. Too close to call when the gap is under 0.25 points either way; otherwise paying down wins when the gap is positive and Treasuries win when it is negative. Yearly difference = (mortgage rate − Treasury yield) × balance. Lifetime difference — only with an extra above zero and a mortgage that clears both ways — = what (payment + extra) a month grows to at the Treasury yield over the months freed by clearing early, minus what the extra a month grows to at the Treasury yield over all the months the mortgage would otherwise run (futureValue, amortise).",
  "handed": "export function compareMortgageToTreasury(args: {\n  balance: number;\n  annualRate: number;          // decimal, e.g. 0.055\n  monthlyPayment: number;\n  extraMonthly: number;\n  treasuryYield: number;       // decimal, e.g. 0.0463\n}): MortgageComparison | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-005 holding price"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

6 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-023",
  "name": "requiredPayment",
  "what_it_is_for": "The payment reserved/required each month for a debt (planned payment, else the minimum).",
  "formula_in_words": "0 for a debt due in full. Otherwise the larger of the minimum monthly payment and the payment the person says they make."
 },
 {
  "id": "MK-CF-F-024",
  "name": "totalDebtMonthly",
  "what_it_is_for": "Total monthly debt obligation across all debts (override-aware).",
  "formula_in_words": "requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-025",
  "name": "minimumDebtService",
  "what_it_is_for": "The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.",
  "formula_in_words": "Each debt's minimum monthly payment added; a debt due in full counts 0."
 },
 {
  "id": "MK-CF-F-026",
  "name": "actualDebtPayment",
  "what_it_is_for": "Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.",
  "formula_in_words": "The same as totalDebtMonthly: requiredPayment added over the debts."
 },
 {
  "id": "MK-CF-F-027",
  "name": "totalDebtBalance",
  "what_it_is_for": "Σ outstanding debt BALANCE — what you still owe (not a monthly payment).",
  "formula_in_words": "The balances added."
 },
 {
  "id": "MK-CF-F-029",
  "name": "monthsToClear",
  "what_it_is_for": "How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.",
  "formula_in_words": "0 when nothing is owed. No answer when the payment is zero or less, or when it does not exceed the first month's interest (balance × yearly rate ÷ 12) — the debt would never clear. With no interest: balance ÷ payment, rounded up. Otherwise log(payment ÷ (payment − balance × monthly rate)) ÷ log(1 + monthly rate), rounded up to a whole month."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**A loan's payment, and the months to clear it** — in this part: MK-CF-F-125

```json
[
 {
  "id": "MK-CF-F-028",
  "name": "loanPayment",
  "what_it_is_for": "UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a DECIMAL (0.07).",
  "formula_in_words": "Months = years × 12, rounded to a whole number; monthly rate = the yearly percent ÷ 100 ÷ 12. All zero when the amount borrowed or the months are zero or less. Payment = amount × monthly rate ÷ (1 − (1 + monthly rate) to the power −months); with no interest, amount ÷ months. Total paid = payment × months. Total interest = total paid − amount."
 },
 {
  "id": "MK-CF-F-029",
  "name": "monthsToClear",
  "what_it_is_for": "How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.",
  "formula_in_words": "0 when nothing is owed. No answer when the payment is zero or less, or when it does not exceed the first month's interest (balance × yearly rate ÷ 12) — the debt would never clear. With no interest: balance ÷ payment, rounded up. Otherwise log(payment ÷ (payment − balance × monthly rate)) ÷ log(1 + monthly rate), rounded up to a whole month."
 },
 {
  "id": "MK-CF-F-030",
  "name": "paymentToClearBy",
  "what_it_is_for": "Monthly payment that clears `principal` in `months` at decimal APR (amortization).",
  "formula_in_words": "0 when nothing is owed or the months are zero or less. Payment = balance × monthly rate ÷ (1 − (1 + monthly rate) to the power −months), monthly rate = yearly rate ÷ 12; with no interest, balance ÷ months. Rounded UP to the cent."
 },
 {
  "id": "MK-CF-F-034",
  "name": "payoffPlan",
  "what_it_is_for": "Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.",
  "formula_in_words": "Only debts with a balance above zero. A debt due in full is paid in its due month (never earlier than month 1; month 1 when it has no date), with interest = balance × ((1 + yearly rate ÷ 12) to the power of the months until then − 1). The others are walked month by month, for at most 600 months. Each month: every balance grows by balance × yearly rate ÷ 12; the money to pay = the minimums of every debt whose payments have started — including debts already cleared, whose minimums roll on — plus the extra; each debt first gets its minimum (never more than it owes); what is left goes to one debt at a time, highest rate first (avalanche) or smallest balance first (snowball). A debt is cleared when it owes a cent or less. A debt whose first payment date is in the future is not paid until that month, and grows meanwhile. Months = the month the last debt is cleared (or the last lump-sum month, when later); total interest = all the interest charged; it never pays off when anything is still owed at month 600. Order = each debt with the month it is cleared and the interest it cost, earliest first."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0159",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "s mortgage-versus-Treasury comparison, which depends on this number being real. The app fetched the yield from the Treasury Fiscal Data",
  "the_log_records": "A LIVE, SILENT BUG. The ten-year Treasury yield was being fetched from a feed that had stopped working, and the app quietly used a fallback number instead — so a figure presented as today’s market rate was not. Found only because his mortgage-versus-Treasury comparison depends on that number being real.",
  "governs": "src/services/economicData.ts (the ten-year Treasury yield, read from FRED series DGS10; a fallback is flagged, never silent) · src/domain/debt/mortgageVsTreasury.ts (the mortgage-versus-Treasury comparison that depends on it)"
 },
 {
  "id": "DEC-0161",
  "decided": "2026-08-14",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "BELOW THE YIELD (a 2021 loan at 3.1%): identical shape,",
  "the_log_records": "He asked what the text would say EXACTLY. It was written out word for word, in the same sentence shape whichever way the comparison falls — so nobody can tell from the layout which answer they are about to get.",
  "governs": "src/components/MortgageRateCompare.tsx · src/domain/debt/mortgageVsTreasury.ts"
 },
 {
  "id": "DEC-0364",
  "decided": "2026-09-26",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "Q5 — the mortgage odds placeholder → build the second simulation first; until then the row states today’s odds and stops",
  "the_log_records": "“Q5 — the mortgage odds placeholder → build the second simulation first; until then the row states today’s odds and stops.” Rather than showing a placeholder figure, the row says what is true today and says nothing more until the calculation exists.",
  "governs": "src/domain/income/onboarding.ts · src/domain/debt/mortgageOdds.ts"
 },
 {
  "id": "DEC-0496",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "How you plan to capture the information?",
  "the_log_records": "HIS QUESTION: “How you plan to capture the information?” Asked of the Home screen — what is behind each figure it shows.",
  "governs": "src/screens/HomeScreen.tsx · src/domain/debt/index.ts"
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
  "id": "DEC-1925",
  "decided": "2026-10-04",
  "type": "RULE",
  "tab": "networth",
  "whose": "his",
  "his_words": "Properties, mortgages, and debt we should ask user to name. App should map properties included in networth against mortgages. It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.",
  "the_log_records": "Every property, mortgage and debt has a name the person gives it. Each mortgage is matched to a property in Net worth. A property can have no mortgage; a mortgage cannot be without a property. So there are never more mortgages than properties: three properties, three mortgages or fewer.",
  "governs": "src/screens/AddAccountScreen.tsx · src/components/DebtEditorSheet.tsx · src/screens/NetWorthScreen.tsx · src/domain/debt/index.ts · src/domain/assets/index.ts · MK-NW-M-010 · MK-NW-M-047 debt payments you cannot stop"
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
  "id": "DEC-8153",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. One rule for a debt in a month, in two new shared functions, MK-CF-F-235 paysInMonth and MK-CF-F-236 paymentInMonth: from its first payment to its payoff, and a balance due in full once, in its month, at its balance. A $7,200 take-home, a $3,400 budget, the $2,400 mortgage, a $250 car loan whose first payment is Oct 28, a $300 loan paid off in August and a $1,000 tax bill due in full Sep 20: September's planned surplus read +$850, the car loan and the paid-off loan counted and the tax bill left out; it reads +$400 = 7,200 − 3,400 − 2,400 − 1,000, what the Bill calendar's September holds. October's card is unchanged, $1,150. ACTUAL no longer lists the car loan as due the 28th at $0; MONTHLY RECURRING EXPENSES reads $2,400 (it read $2,650); the tax bill is on the BIG-TICKET RADAR at $1,000; Home's due-soon reminder no longer fires for a loan not yet started. MK-CF-M-047, 048 and 049 now say they print on a later month's plan card, from the grid ($7,200 / $6,050 / $1,150), and the retired surplus line and the paycheck card's SURPLUS have their own number, MK-CF-M-078 (it printed under MK-CF-M-049). To reverse: count every debt's payment in this month again, whatever its dates. One word from him reverses it.",
  "governs": "MK-CF-F-235 paysInMonth · MK-CF-F-236 paymentInMonth (src/domain/debt/index.ts) · MK-CF-F-156 plannedMonthFlow · MK-CF-F-005 actualMonthFlow · MK-CF-F-149 recurringDebtPayments · MK-CF-F-153 radar · MK-XS-F-004 buildDatedGrid · MK-CF-M-002 · MK-CF-M-016 · MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-078 · src/screens/HomeScreen.tsx · src/components/PaycheckCard.tsx"
 }
]
```
