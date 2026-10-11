# The cards — "nw module final — part 2 of 4"

30 cards, so 30 formula checks and 150 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 2"` in your reply.

```json
[
 {
  "id": "MK-NW-F-031",
  "name": "primaryCarIdOf",
  "kind": "function",
  "what_it_is_for": "The vehicle treated as \"the car you drive\" — the most valuable one, so a second car stays a real asset.",
  "formula_in_words": "Among the accounts whose kind is vehicle, and no other: the vehicles whose value is entered are the candidates — a vehicle with no value is not ranked as $0 (DEC-4036j, 2026-10-10); when none has a value, every vehicle is. Of the candidates, the one with the largest balance; a tie goes to the lower id read as text (the one made first). Nothing when there is no vehicle. Valuables and other personal property are never the car.",
  "handed": "export function primaryCarIdOf(accounts: AssetAccount[]): string | undefined",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-032",
  "name": "earmarkedAmount",
  "kind": "function",
  "what_it_is_for": "The retirement-earmarked $ for one account (uses the saved % or the smart default).",
  "formula_in_words": "Balance × the share earmarked for retirement. The share is the one stated on the account, held between 0% and 100%, or the default (earmarkDefault, told which car is driven and which property is lived in, or that there is none) when none is stated.",
  "handed": "export function earmarkedAmount(a: AssetAccount, primaryCarId?: string, primaryHomeId?: string | null): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-050 the share of an account earmarked for retirement"
  ]
 },
 {
  "id": "MK-NW-F-033",
  "name": "retirementEarmarkedValue",
  "kind": "function",
  "what_it_is_for": "Total nest egg = sum of each account's retirement-earmarked portion.",
  "formula_in_words": "Every account's earmarked amount (earmarkedAmount) added up, with the car driven found by primaryCarIdOf and the home lived in by primaryHomeIdOf.",
  "handed": "export function retirementEarmarkedValue(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-034",
  "name": "benchmarkReturn",
  "kind": "function",
  "what_it_is_for": "Benchmark expected annual return for an asset kind — user override if set, else the ASSET_KINDS default.",
  "formula_in_words": "The person's own yearly rate for that kind where they set one — a rate of exactly 0 counts as set. Otherwise the app's typical yearly return for the kind: checking 0.5%, savings 2.4%, high-yield savings 4.2%, money market 4.5%, CD 4.2%, cash management 3.5%, foreign currency 0%, brokerage 8%, stocks and funds 10.4%, fixed income 4.2%, crypto 8%, private equity 13%, hedge funds 6%, gold and commodities 8.2%, options 5%, annuities 4.5%, 529 7%, other 5%, 401(k), IRA, Roth IRA and HSA 7.9%, home 4.5%, vehicle −5%. 6% for a kind that is unknown or missing. A kind is matched exactly as the app writes it; capitals count.",
  "handed": "export function benchmarkReturn(kind: string | undefined, overrides?: Record<string, number>): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-035",
  "name": "blendedVolatility",
  "kind": "function",
  "what_it_is_for": "The volatility of THIS portfolio — each account's own class volatility, weighted the way the money actually is (the same weighting `blendedReturn` uses, so the pair always describes one portfolio).",
  "formula_in_words": "Over exactly the accounts the nest egg counts: each account's volatility — the person's own figure for its kind, else the app's figure for the kind, else 12% — averaged, weighted by its earmarked amount. No answer when nothing is earmarked (the Plan then uses the band its growth rate implies, chosen at its call site). It is a weighted average of the parts, which is the portfolio's own volatility only when the parts move together; a table of how the classes move together is not yet built.",
  "handed": "export function blendedVolatility(accounts: AssetAccount[], overrides?: Record<string, number>): number | null",
  "inputs_it_reads": [
   "MK-XS-I-035 annuity income",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-036",
  "name": "benchmarkInfo",
  "kind": "function",
  "what_it_is_for": "Benchmark return + its source/period for an asset kind.",
  "formula_in_words": "The rate from benchmarkReturn, with where it came from. Edited = the person set a rate for that kind (0 included): then the source reads Your custom estimate, the period is blank and estimate is true (a person's own rate is an assumption). Otherwise the source and period on record for that kind, and estimate = whether that record is marked an assumption rather than a measured index; a kind with no record reads Generic blended estimate, period blank, estimate true.",
  "handed": "export function benchmarkInfo(kind: string | undefined, overrides?: Record<string, number>): { ret: number; source: string; period: string; edited: boolean; estimate: boolean }",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-037",
  "name": "blendedReturn",
  "kind": "function",
  "what_it_is_for": "Blended expected return across the EARMARKED nest egg, weighted by each holding's share.",
  "formula_in_words": "Over exactly the accounts the nest egg counts (every account, each weighted by its earmarked amount — the home lived in, the car driven and a 529 weigh nothing by default, a rental weighs its full value): the benchmark yearly rate of each account's kind (benchmarkReturn), averaged, weighted by its earmarked amount. No answer when the earmarked total is zero — the Plan then chooses its own 6% at its call site, and says so there.",
  "handed": "export function blendedReturn(accounts: AssetAccount[], overrides?: Record<string, number>): number | null",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-038",
  "name": "earmarkedKinds",
  "kind": "function",
  "what_it_is_for": "Distinct investment kinds present in the earmarked nest egg (for the benchmark editor).",
  "formula_in_words": "The distinct kinds among accounts that are not property and have an earmarked amount above zero. An account with no kind counts as other.",
  "handed": "export function earmarkedKinds(accounts: AssetAccount[]): string[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-039",
  "name": "buildAssetsState",
  "kind": "function",
  "what_it_is_for": "How much of everything sits in each account, and what return do they blend to?",
  "formula_in_words": "A balance that is missing (blank, or not a number) is left out. Total = the balances that are there, added up. Each account's share = its balance ÷ total × 100, or 0 when the total is 0 or its balance is missing (an overdrawn account has a negative share; the shares still add to 100). Average target return = each account's target return weighted by its balance; no answer when the total is 0.",
  "handed": "export function buildAssetsState(uid: UserId, accounts: AssetAccount[]): AssetsState",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-028 assumed return"
  ]
 },
 {
  "id": "MK-NW-F-040",
  "name": "assetsFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Build asset accounts from onboarding answers (accumulation: retirement savings + holdings).",
  "formula_in_words": "Makes up to four accounts from the setup answers, skipping an answer left blank or below zero (a typed 0 is kept): traditional retirement savings → a pre-tax 401(k); Roth retirement savings → a Roth IRA; investment holdings → taxable stocks and funds; each of those three gets a target return of 7%. Savings or portfolio → an Unclassified account with no kind, no tax type and a target return of 0, marked to be asked: Is this cash savings or investments? (DEC-4036g, 2026-10-10).",
  "handed": "export function assetsFromOnboarding(uid: UserId, op: Record<string, any> | null): AssetsDoc",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-041",
  "name": "monthlyContributionsFromOnboarding",
  "kind": "function",
  "what_it_is_for": "Total monthly contributions across types + employer match (feeds the retirement projection).",
  "formula_in_words": "No answer when none of the contribution questions was answered (401(k), Roth, investing, employer match). Otherwise, a month's retirement contributions = the 401(k) amount, held at the year's elective limit for the person's age ÷ 12 (2026: $24,500 under 50, $32,500 at 50 to 59 and 64 and over, $35,750 at 60 to 63), + the Roth amount as entered (the question does not say Roth IRA or Roth 401(k), whose limits differ, so it is not held at either), + the investing amount, + the employer's match for a month (the stated share of the 401(k) amount AFTER it is held at the limit — an employer matches only what can go in — or the stated dollars). Money saved toward a property (an older setup question) is not a retirement contribution and is left out. The age is the one attained this year, from the birth year.",
  "handed": "export function monthlyContributionsFromOnboarding(op: Record<string, any> | null): number | null",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year",
   "MK-XS-I-043 their own retirement contribution",
   "MK-XS-I-046 how the employer match is expressed — percent or dollars"
  ]
 },
 {
  "id": "MK-NW-F-044",
  "name": "getAssetsState",
  "kind": "function",
  "what_it_is_for": "Reads a person's saved accounts and returns their totals, or nothing when none are saved.",
  "formula_in_words": "Reads the saved accounts and returns assetsStateFrom of them: nothing when none are saved or the saved list is empty.",
  "handed": "export async function getAssetsState(uid: UserId)"
 },
 {
  "id": "MK-NW-F-045",
  "name": "sourceWording",
  "kind": "function",
  "what_it_is_for": "The words saying where an account's numbers come from, which are Linked, Imported or By hand, with a date added only when the numbers are stale.",
  "formula_in_words": "Linked account: Linked — or Linked · N days old when its last successful update is 4 or more days old, and Linked · not updated yet when no update is on record (no age is invented). Imported account: Imported, by the same test. Anything else: By hand · you update it. The timestamp read is the account's last successful sync.",
  "handed": "export function sourceWording(a: AssetAccount, now: number = Date.now()): string",
  "inputs_it_reads": [
   "MK-XS-I-006 price fetched at",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-046",
  "name": "historyCoverage",
  "kind": "function",
  "what_it_is_for": "Says how far back one account's activity records reach, set against the period being asked about, in a sentence a person can read.",
  "formula_in_words": "Entered by hand: a sentence saying it has no activity records. The history start is the person's own date when they entered one (DEC-4059c, 2026-10-10 — it outranks the date the sync read), otherwise the date the sync recorded. Linked with no history start on record: a sentence saying none has been shared yet. A history start that is not a real calendar date, or is after today: the refusal 'History start date cannot be read.' with no months figure and no start date — the screen offers 'Edit date' (owner rule DEC-4059c, 2026-10-10). History starting on or before the period's first day: nothing to say. Otherwise: months covered = the whole months from the history start to today plus the part month (days ÷ the days in that month), rounded DOWN to one decimal; the sentence is built from the whole months only and names the start date: N years when the whole months are an exact multiple of twelve and there is no part month, N years and a bit when there is, N years M months when twelve or more, N months when one or more, otherwise a few days. Year and month take their plural from the one list of words (plural, the one list of words — his ruling of 2026-10-10): 1 year, 1 month. It never rounds up.",
  "handed": "export function historyCoverage(\n  a: AssetAccount,\n  windowStart: string,\n  now: Date = new Date(),\n): HistoryCoverage | null",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-057 the date an account history begins"
  ]
 },
 {
  "id": "MK-NW-F-047",
  "name": "uberGroupOf",
  "kind": "function",
  "what_it_is_for": "Which of the three Net worth groups an asset class belongs to: Cash, Investments or Personal property.",
  "formula_in_words": "Cash → Cash. Stocks / Funds, Bonds & CDs, Alternatives and Unclassified → Investments. Real estate and Personal property → Personal property.",
  "handed": "export const uberGroupOf = (cls: AssetClass): UberGroup"
 },
 {
  "id": "MK-NW-F-048",
  "name": "uberGroupRows",
  "kind": "function",
  "what_it_is_for": "Group per-class totals into the three uber-groups, keeping class order inside each.",
  "formula_in_words": "Sorts the class rows into the three groups, in the order Cash, Investments, Personal property: Cash ← cash; Investments ← Stocks / Funds, Bonds & CDs, Alternatives, Unclassified; Personal property (the third group, which the screen labels so) ← Real estate, Personal property. A group's total = its classes' totals added up, in the order the rows came; the groups add to What you own. A group with no classes is left out.",
  "handed": "export function uberGroupRows(\n  classRows: { key: AssetClass; label: string; color: string; total: number }[],\n): { group: UberGroup; label: string; icon: string; total: number; classes: typeof classRows }[]"
 },
 {
  "id": "MK-NW-F-049",
  "name": "itemizedTotal",
  "kind": "function",
  "what_it_is_for": "Σ of the itemized holding values.",
  "formula_in_words": "The values of the listed holdings that have one, added up in exact decimals; a holding with no value is left out (itemizeMissingCount counts it), never counted as zero; a negative value counts.",
  "handed": "export const itemizedTotal = (items: ItemHolding[]): number"
 },
 {
  "id": "MK-NW-F-050",
  "name": "itemizeRemainder",
  "kind": "function",
  "what_it_is_for": "The entered total of an account less the value of the holdings listed under it: positive when some is still unexplained, negative when the holdings add up to more.",
  "formula_in_words": "The entered balance less itemizedTotal, in exact decimals (an entered total that equals its holdings leaves exactly 0, never a stray fraction of a cent). Positive: some is still unexplained. Negative: the holdings add up to more than was entered.",
  "handed": "export const itemizeRemainder = (lumpBalance: number, items: ItemHolding[]): number"
 },
 {
  "id": "MK-NW-F-051",
  "name": "itemizedResultTotal",
  "kind": "function",
  "what_it_is_for": "The account total AFTER itemizing.",
  "formula_in_words": "The account's total after itemising: the holdings added up, plus what is still unallocated when that is above zero (it stays as cash) — so it is the entered total until the holdings listed come to more than the entered total, when it is their sum. The screen shows the new total before the person taps Done.",
  "handed": "export const itemizedResultTotal = (lump: Pick<AssetAccount, 'balance'>, items: ItemHolding[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-052",
  "name": "buildItemizedAccounts",
  "kind": "function",
  "what_it_is_for": "Build the new accounts to CREATE when committing an itemization.",
  "formula_in_words": "Refused when any listed holding has no value (the refusal counts them with plural, the one list of words — his ruling of 2026-10-10) — nothing is built, so the account stays as it was. Otherwise one account for each listed holding: named by its label, else its ticker, else Holding; with the original's institution and tax bucket, and what the original carried — its retirement share, its source, and its wrapper kind when the original is a 401(k), IRA, Roth IRA, HSA or 529 (otherwise the kind for the class); balance = its value; class as given; its yearly rate = the benchmark for its class's kind (benchmarkReturn), never 0. A bond also carries its maturity date, its rate only when one was entered, and its face value only when the person entered one — never today's value in its place. What is still unallocated, when above zero, becomes one more account named institution + cash, with the same share, source and wrapper, at the cash-management benchmark rate.",
  "handed": "export function buildItemizedAccounts(lump: AssetAccount, items: ItemHolding[]): Omit<AssetAccount, 'asset_id'>[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer"
  ]
 },
 {
  "id": "MK-NW-F-053",
  "name": "correctClassOf",
  "kind": "function",
  "what_it_is_for": "The class an account SHOULD carry under the current rule.",
  "formula_in_words": "The class an account SHOULD have, or nothing when there is no correction to make. A class the person chose is the class it should carry. Otherwise, in the order assetClassOf reads: Bonds & CDs if it has a maturity date; else the class its name is evidence for — never for a home, real estate, a vehicle or anything in the property bucket, whose name is a place; else Stocks / Funds for a money market account; else Bonds & CDs for a CD.",
  "handed": "export function correctClassOf(a: AssetAccount): AssetClass | null",
  "inputs_it_reads": [
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-NW-F-054",
  "name": "reclassifyAccounts",
  "kind": "function",
  "what_it_is_for": "Corrects the asset class of any account or holding filed under the wrong one, and counts how many it changed.",
  "formula_in_words": "For each account the person has NOT confirmed (an account they confirmed is left exactly as it is): if the person did not choose its class and correctClassOf gives a class different from the one it carries, it takes that class (a cash tax bucket becomes no tax type stated unless the new class is cash — never taxable, DEC-4036f, 2026-10-10). For each holding inside it: a holding the person classed, or one waiting on their answer, is left as it is; otherwise, when its ticker and name are evidence for a class other than cash and its stored tag means another class, it is stored under that class — bond for Bonds & CDs, other for Alternatives (Gold), stock_etf for Stocks / Funds. No evidence leaves it as it is. Returns the accounts and how many changes were made.",
  "handed": "export function reclassifyAccounts(accounts: AssetAccount[]): { accounts: AssetAccount[]; changed: number }",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-NW-F-055",
  "name": "isBond",
  "kind": "function",
  "what_it_is_for": "An AssetAccount is a bond if its ASSET CLASS is bonds (spec §2: \"detected by assetClass, NOT maturity date\").",
  "formula_in_words": "True when the account's class (assetClassOf) is Bonds & CDs.",
  "handed": "export function isBond(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-056",
  "name": "bondInfo",
  "kind": "function",
  "what_it_is_for": "What are this holding's bond facts?",
  "formula_in_words": "Reads a bond's facts off its account: face value (not entered when missing or zero or less), yearly rate (not entered when missing; a typed zero is kept), maturity date, value (the balance), accrued interest (not entered when missing), whether it is a CD — its kind is a CD, or its own name says CD or certificate of deposit; its institution is never read for this (DEC-4036c, 2026-10-10) — and where a CD was bought: through a broker only when the person said so, otherwise from the bank (DEC-3837, 2026-10-10).",
  "handed": "export function bondInfo(a: AssetAccount): BondInfo",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-057",
  "name": "annualCoupon",
  "kind": "function",
  "what_it_is_for": "Annual coupon income = face value × coupon rate (paid as cash).",
  "formula_in_words": "Face value × yearly interest rate. Nothing when either was not entered.",
  "handed": "export function annualCoupon(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-058",
  "name": "yearsToMaturity",
  "kind": "function",
  "what_it_is_for": "How long until this bond pays back?",
  "formula_in_words": "Exact years to maturity, by anniversaries: the whole years counted back from the maturity date while still on or after today, plus the days from today to the first of those anniversaries ÷ the days in that year. One year to the day is exactly 1. Zero when the date is today or past. By the calendar date, never the time of day. Nothing when there is no date or the day does not exist (a day past the end of its month is not rolled into the next month).",
  "handed": "export function yearsToMaturity(maturity: string, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-059",
  "name": "currentYield",
  "kind": "function",
  "what_it_is_for": "Current yield = annual coupon ÷ current price/value.",
  "formula_in_words": "yearlyInterest ÷ the value as entered (the statement's market value, which leaves accrued interest out — his ruling of 2026-10-09). Nothing when no rate was entered, or when the value is zero or less.",
  "handed": "export function currentYield(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-060",
  "name": "approxYTM",
  "kind": "function",
  "what_it_is_for": "Yield to maturity, solved from the price, decimal; a CD bought from the bank yields its rate (DEC-3837, 2026-10-10).",
  "formula_in_words": "Nothing when there is no maturity date or the bond has matured. A CD bought from the bank (pricedLikeBond says no): its stated rate, even when no face value was entered, and nothing when no rate was entered (DEC-3837, 2026-10-10). A bond, or a CD bought through a broker: nothing when no face value or no rate was entered, or when its value is zero or less; else the yield y at which priceAtYield equals the full price — the value as entered plus accrued interest (as entered, else estimatedAccrued; his ruling of 2026-10-09) — found by halving the interval two hundred times.",
  "handed": "export function approxYTM(b: BondInfo, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-061",
  "name": "bondSummary",
  "kind": "function",
  "what_it_is_for": "Adds up every bond and CD held: how many there are, what they are worth, their face value, the interest they pay in a year, their average yield and the next one to mature.",
  "formula_in_words": "Count = how many bonds. Total value = each value added up. Total face value = each face value added up, a face not entered counting as zero (the bonds without one are named apart by theBonds). Interest in a year = yearlyInterestNow of each, added up: a bond past its maturity date counts $0, and a bond with no rate counts as zero. Average yield is over the bonds that have a value today AND a rate AND are not past their maturity date: their yearlyInterest ÷ their value today as entered; nothing when no bond qualifies. Next maturity = the earliest maturity date AFTER today, by the calendar — a bond maturing today has matured and is not next.",
  "handed": "export function bondSummary(bonds: BondInfo[], now: Date = new Date()): BondSummary",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-062",
  "name": "couponIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "Total annual coupon income across the user's INDIVIDUAL bonds (kept for the Bonds screen summary).",
  "formula_in_words": "Over the accounts that are bonds or CDs: yearlyInterestNow of each, added up — $0 for one past its maturity date, and one with no rate counting as zero.",
  "handed": "export function couponIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number"
 }
]
```
