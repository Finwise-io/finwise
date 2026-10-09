# The cards — "nw module final — part 3 of 4"

26 cards, so 26 formula checks and 130 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 3"` in your reply.

```json
[
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
  "formula_in_words": "Reads a bond's facts off its account: face value (not entered when missing or zero or less), yearly rate (not entered when missing; a typed zero is kept), maturity date, value (the balance), accrued interest (not entered when missing), and whether it is a CD — its kind is a CD, or its name or institution says CD or certificate of deposit.",
  "handed": "export function bondInfo(a: AssetAccount): BondInfo",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-003 institution name",
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
  "formula_in_words": "Exact years to maturity, by anniversaries: the whole years counted back from the maturity date while still on or after today, plus the days from today to the first of those anniversaries ÷ the days in that year. One year to the day is exactly 1. Zero when the date is today or past. By the calendar date, never the time of day. Nothing when there is no valid date.",
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
  "what_it_is_for": "Approximate yield to maturity (standard approximation), decimal.",
  "formula_in_words": "Nothing when there is no maturity date, the bond has matured, or no face value or no rate was entered. A CD: its stated rate (it is not bought at a market price). Otherwise nothing when its value is zero or less; else the yield y at which priceAtYield equals the full price — the value as entered plus accrued interest (as entered, else estimatedAccrued; his ruling of 2026-10-09) — found by halving the interval two hundred times.",
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
  "formula_in_words": "Count = how many bonds. Total value = each value added up. Total face value = each face value added up, a face not entered counting as zero. Interest in a year = yearlyInterest of each, added up, a bond with no rate counting as zero. Average yield is over the bonds that have a value today AND a rate: their yearlyInterest ÷ their value today as entered; nothing when no bond qualifies. Next maturity = the earliest maturity date AFTER today, by the calendar — a bond maturing today has matured and is not next.",
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
  "formula_in_words": "Over the accounts that are bonds or CDs: yearlyInterest of each, added up, one with no rate counting as zero.",
  "handed": "export function couponIncomeAnnual(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-063",
  "name": "interestIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "The interest every bond, CD and rate-paying cash account pays in a year, added up, counting nothing for a holding that states no rate.",
  "formula_in_words": "For a bond or CD: nothing when its maturity date is before today; otherwise yearlyInterest (face × rate; with no face, balance × rate; with no rate, nothing). For a cash account that states a rate: balance × rate. Nothing for anything else. Added up over every account.",
  "handed": "export function interestIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-064",
  "name": "bondRateSensitivity",
  "kind": "function",
  "what_it_is_for": "What happens to this bond if interest rates move?",
  "formula_in_words": "Nothing for a CD, when the yield to maturity is unknown, when the bond cannot be priced (matured or no date), or when the face value or rate was not entered or is zero or less. For rates one percentage point UP and one DOWN: the change = priceAtYield at the yield to maturity plus or minus one point (never below 0.01%) less priceAtYield at the yield to maturity itself. The new price = today's value + that change. It gives a range from 1% under to 1% over the new price, and the change, each rounded in proportion to the bond: to the nearest $1,000 for a bond worth $100,000 or more, the nearest $100 from $10,000, the nearest $10 from $1,000, and so on down.",
  "handed": "export function bondRateSensitivity(b: BondInfo, now: Date = new Date()): RateSensitivity | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-028",
    "words_on_screen": "Rates rise 1% → value roughly $X–$Y",
    "unit": "words",
    "what_it_answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
    "when_it_refuses": "Refused for a CD, for a matured bond, and for anything with no coupon or no maturity — and for a CD it says plainly why nothing happens.",
    "shown_on": [
     "/account-detail"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0071",
    "date": "2026-08-11",
    "words": "put % and labels on donut"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "An estimate, and it wears the estimate label."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "FOUNDER 2026-09-27: a CD gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead. KEEP — the app does not ask whether a CD is a bank one or a brokered one."
   }
  ]
 },
 {
  "id": "MK-NW-F-065",
  "name": "buildNetWorth",
  "kind": "function",
  "what_it_is_for": "Net worth from two totals: everything owned less everything owed.",
  "formula_in_words": "Net worth = total assets − total debt, returned with both totals.",
  "handed": "export function buildNetWorth(uid: UserId, grossAssets: number, grossDebt: number): NetWorthState"
 },
 {
  "id": "MK-NW-F-066",
  "name": "sumWhere",
  "kind": "function",
  "what_it_is_for": "Adds up the balances of the accounts that pass a given test.",
  "formula_in_words": "Over the accounts that pass the given test: the total = the balances that exist, added up (a negative balance counts), and beside it how many have no balance. A missing balance is never counted as zero. Nothing passing the test is a total of 0 with nothing missing.",
  "handed": "export function sumWhere(accounts: AssetAccount[], pred: (a: AssetAccount) => boolean): { total: number; missingCount: number }",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-067",
  "name": "plural",
  "kind": "function",
  "what_it_is_for": "Writes a count with its noun, singular for one and plural otherwise: 1 CD, 3 CDs.",
  "formula_in_words": "The count followed by the noun: the singular for exactly 1, otherwise the plural (the noun with s unless another plural is given).",
  "handed": "const plural = (n: number, one: string, many = `${one}s`)"
 },
 {
  "id": "MK-NW-F-068",
  "name": "prettyDay",
  "kind": "function",
  "what_it_is_for": "Writes a date as month, day and year: Aug 4, 2026.",
  "formula_in_words": "Reads a date written year-month-day as a calendar date — never through a clock or a time zone — and writes the short month name (Jan … Dec, Sep not Sept), the day without a leading zero, a comma and the year. An empty or impossible date gives nothing.",
  "handed": "export function prettyDay(iso: string): string"
 },
 {
  "id": "MK-NW-F-069",
  "name": "priceAtYield",
  "kind": "function",
  "what_it_is_for": "Price the bond's future cash flows at a given annual yield (yearly approximation).",
  "formula_in_words": "Nothing when the bond has matured or has no maturity date. Otherwise t = yearsToMaturity, exact; the yearly coupon (face × rate; zero when either was not entered) falls on each maturity anniversary, at t, t − 1, … down to the last above zero; price = each coupon ÷ (1 + yield) to the power of its time, added up, plus face ÷ (1 + yield) to the power t.",
  "handed": "export function priceAtYield(b: BondInfo, y: number, now: Date): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-070",
  "name": "accruedInterestCaveat",
  "kind": "function",
  "what_it_is_for": "The note shown beside a bond's yield when its accrued interest was not entered, or nothing when it was.",
  "formula_in_words": "When accrued interest was not entered and estimatedAccrued gives an estimate (a bond that pays interest, not a CD, not matured, not on a coupon day): his words — Added estimated $<the estimate, whole dollars> in accrued interest to bond value at <the rate>% coupon for <days> days to calculate YTM. If this is not accurate, enter actual accrued interest. Otherwise nothing.",
  "handed": "export function accruedInterestCaveat(b: BondInfo, now: Date = new Date()): string | null",
  "inputs_it_reads": [
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-071",
  "name": "isCertificateOfDeposit",
  "kind": "function",
  "what_it_is_for": "Whether an account is a certificate of deposit, judged from its name.",
  "formula_in_words": "True when bondInfo says the account is a CD: its kind is a CD, or its name or its institution contains the whole word CD, or the words certificate of deposit, in any capitals.",
  "handed": "export function isCertificateOfDeposit(a: Pick<AssetAccount, 'label'> & { institution?: string; kind?: string }): boolean",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-072",
  "name": "rowOf",
  "kind": "function",
  "what_it_is_for": "One bond's row for the Bonds screen: its face value, yearly interest rate, interest paid in a year, maturity date and years left.",
  "formula_in_words": "One row for one bond: face value and yearly interest rate (each not entered when it was not), interest paid in a year (yearlyInterest: face × rate; with no face, value × rate; with no rate, not entered), maturity date, years left (yearsToMaturity — exact, never below zero), current yield, yield to maturity (approxYTM — solved exactly; nothing when matured), value, whether it is a CD, and the accrued-interest note (accruedInterestCaveat, worked for today). The heading is the institution when it is not blank after trimming, otherwise the account's name.",
  "handed": "export const rowOf = (a: AssetAccount, now: Date): BondRow",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today",
   "MK-XS-I-065 accrued interest on a bond — interest earned since the last coupon"
  ]
 },
 {
  "id": "MK-NW-F-073",
  "name": "itemising",
  "kind": "function",
  "what_it_is_for": "When an account entered as one total is broken into holdings: the total to keep, the value of the holdings listed so far, and the amount still not explained by them.",
  "formula_in_words": "Returns four things. Keep-total-at = the balance the account was entered at. Itemised = the values of the listed holdings that have one, added up. Remainder = the entered balance less that sum. Remainder-final = false when any listed holding has no value (the remainder is then not final, never called unexplained).",
  "handed": "export function itemising(lumpBalance: number, items: ItemHolding[]): Itemising",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer"
  ]
 },
 {
  "id": "MK-NW-F-084",
  "name": "categoryEarnings",
  "kind": "function",
  "what_it_is_for": "What each category of investment paid in dividends and interest over the period, and that category's return.",
  "formula_in_words": "Uses the dividend and interest records dated on or after the period's first day, amounts taken as positive. A record that names a ticker goes to that holding's category: bond → Bonds & CDs; cash → Cash in this account; anything else → Stocks / Funds; a ticker with no holding on record → Stocks / Funds for a dividend, Bonds & CDs for interest. A record that names NO ticker → Stocks / Funds for a dividend, Cash in this account for interest. A category's return = its holdings' period returns averaged, weighted by market value, counting only holdings with a return and a value above zero; nothing when there are none. Bonds & CDs shows a stated YEARLY rate instead — each bond account's rate weighted by its balance — when every bond account with a balance states a rate and no bond is held as a holding. On day one all three categories are returned with no return; any other day only the categories that earned more than zero.",
  "handed": "export function categoryEarnings(input: {\n  /** every record, unfiltered — this takes the window’s own */\n  transactions: any[];\n  /** the window’s first day, or null for \"since the record began\" */\n  windowStart: string | null;\n  /** each holding with its class and its own return, as buildPerformance produces them */\n  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; marketValue?: number }[];\n  /** Every bond or CD held as its own account: what it is worth and the yearly rate it states. */\n  bonds?: { balance?: number; coupon_rate?: number }[];\n  /** DAY ONE: every category is shown at $0 — \"every line fills in as days pass, the structure never\n   *  changes\" (Performance v17, phones 4 and 5). Any other day, a category that received nothing is\n   *  left out. */\n  dayOne?: boolean;\n}): CategoryEarned[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-005 holding price",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-090",
  "name": "windowStartKey",
  "kind": "function",
  "what_it_is_for": "The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others.",
  "formula_in_words": "Since: the day after the earliest recorded day, but never later than today; today when nothing is recorded. This year: 1 January of today's year. 1M, 3M, 6M, 1Y and 2Y: today moved back 1, 3, 6, 12 or 24 months. Any other label: 12 months back.",
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the priced holdings gained over the period in dollars: the true gain for a holding bought inside the period, and the price move's share of today's value for any other.",
  "formula_in_words": "For a holding bought inside the period: its whole gain (value − cost). For any other holding with a period return and a value above zero: value × (1 − 1 ÷ (1 + return)), which is today's value less its value when the period opened. Nothing for the rest. Added up.",
  "handed": "export function pricedGainOf(\n  rows: { cappedSince?: string | null; gain?: number; periodReturn?: number | null; marketValue?: number }[],\n): number"
 },
 {
  "id": "MK-NW-F-092",
  "name": "investmentAccountIdsOf",
  "kind": "function",
  "what_it_is_for": "Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.",
  "formula_in_words": "The ids of the accounts whose class is Stocks / Funds, Bonds & CDs, Alternatives or Unclassified. Cash and property accounts are left out.",
  "handed": "export function investmentAccountIdsOf(\n  accounts: { asset_id?: string | number }[],\n  classOf: (a: any) => string,\n): Set<string>"
 },
 {
  "id": "MK-NW-F-094",
  "name": "ledgerGroups",
  "kind": "function",
  "what_it_is_for": "Groups the accounts for the Net worth list, by asset class or by institution, and gives each group its total.",
  "formula_in_words": "Groups the accounts for the Net worth list, by asset-class label or by institution. By class: an account with a class split (accountClassBreakdown) is a row under EVERY class it has a part in, at that part; any other account is one row, whole, under its one class. Each group's total = its rows added up (his ruling, 2026-10-07: the rows under a heading add up to the heading). By institution (an account with no institution goes under No institution set; names are matched trimmed, capitals ignored, and the group shows the first spelling seen): each account is one row at its balance, a group's total = those balances added up, and the group lists the classes inside it with their totals, from the same split, largest first. Group totals by class equal the class rows; both views add to everything owned.",
  "handed": "export function ledgerGroups(\n  accounts: AssetAccount[],\n  by: 'class' | 'institution',\n  classLabelOf: (a: AssetAccount) => string,\n  classKeyOf: (a: AssetAccount) => string,\n): LedgerGroup[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-028 assumed return"
  ]
 },
 {
  "id": "MK-NW-F-103",
  "name": "investmentRecordDates",
  "kind": "function",
  "what_it_is_for": "THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.",
  "formula_in_words": "The dates of the recorded days that hold a value for at least one of the named accounts, oldest first. Empty when no accounts are named.",
  "handed": "export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[]"
 },
 {
  "id": "MK-NW-F-104",
  "name": "closedWith",
  "kind": "function",
  "what_it_is_for": "The daily record with today added to it, worth what the caller says the measured accounts are worth now.",
  "formula_in_words": "The daily record with today added: one row per account that the latest earlier recorded day holds (of the accounts named), carrying between them the ending value handed in. The record is returned unchanged when there is no earlier day or it holds none of those accounts. It adds no arithmetic: it lets a return be measured to today when the caller gave an ending value and no accounts.",
  "handed": "function closedWith(days: any[], ids: Set<string>, today: string, ending: number): any[]"
 }
]
```
