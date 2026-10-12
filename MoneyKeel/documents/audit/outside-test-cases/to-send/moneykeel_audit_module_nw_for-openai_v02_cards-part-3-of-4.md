# The cards — "nw module final — part 3 of 4"

30 cards, so 30 formula checks and 150 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 3"` in your reply.

```json
[
 {
  "id": "MK-NW-F-063",
  "name": "interestIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "The interest every bond, CD and rate-paying cash account pays in a year, added up, counting nothing for a holding that states no rate.",
  "formula_in_words": "For a bond or CD: nothing when it is past its maturity date (isPastMaturity, by the calendar; no date or an impossible one is not past); otherwise yearlyInterest (face × rate; with no face, balance × rate; with no rate, nothing). For a cash account that states a rate: balance × rate. Nothing for anything else. Added up over every account.",
  "handed": "export function interestIncomeAnnual(accounts: AssetAccount[], now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-012 bond coupon rate"
  ]
 },
 {
  "id": "MK-NW-F-064",
  "name": "bondRateSensitivity",
  "kind": "function",
  "what_it_is_for": "What happens to this bond if interest rates move?",
  "formula_in_words": "Nothing for a CD bought from the bank (pricedLikeBond says no; a CD bought through a broker is priced like a bond, DEC-3837, 2026-10-10), when the yield to maturity is unknown, when the bond cannot be priced (matured or no date), or when the face value or rate was not entered or is zero or less. For rates one percentage point UP and one DOWN: the change = priceAtYield at the yield to maturity plus or minus one point (never below 0.01%) less priceAtYield at the yield to maturity itself. The new price = today's value + that change. It gives a range from 1% under to 1% over the new price, and the change, each rounded in proportion to the bond: to the nearest $1,000 for a bond worth $100,000 or more, the nearest $100 from $10,000, the nearest $10 from $1,000, and so on down.",
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
    "when_it_refuses": "Refused for a CD bought from the bank, for a matured bond, and for anything with no coupon or no maturity — and for a bank CD it says plainly why nothing happens.",
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
    "words": "FOUNDER 2026-09-27: a CD bought from the bank gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "DEC-3837, 2026-10-10: a CD bought through a broker trades, so it gets the estimate like a bond. A CD whose answer was never given is read as bought from the bank."
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
  "formula_in_words": "The count followed by the noun: the noun for exactly 1, otherwise its plural from the one list of words the app counts in words, PLURAL_WORDS (his ruling, 2026-10-10) — Treasury → Treasuries, property → properties, every other word on it adds s; zero takes the plural. The count is written as the caller gives it (a formatted figure or a number word) when one is given, otherwise the number. A word not on the list is refused (an error) in tests and development, never given a guessed s; a release build writes the word unchanged.",
  "handed": "export function plural(n: number, word: CountedWord, shown: string | number = n): string"
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
  "formula_in_words": "Nothing when the bond has matured or has no maturity date, when no face value above zero was entered, or when 1 + yield is zero or less. Otherwise t = yearsToMaturity, exact; the yearly coupon (face × rate; zero when no rate was entered) falls on each maturity anniversary, at t, t − 1, … down to the last above zero; price = each coupon ÷ (1 + yield) to the power of its time, added up, plus face ÷ (1 + yield) to the power t.",
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
  "formula_in_words": "When accrued interest was not entered and estimatedAccrued gives an estimate (a bond or a CD bought through a broker that pays interest, not a CD bought from the bank, not matured, not on a coupon day): his words — Added estimated $<the estimate, whole dollars> in accrued interest to bond value at <the rate>% coupon for <days> days (1 day for one; the plural from plural, the one list of words — his ruling of 2026-10-10) to calculate YTM. If this is not accurate, enter actual accrued interest. Otherwise nothing.",
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
  "formula_in_words": "True when bondInfo says the account is a CD: its kind is a CD, or its own name contains the whole word CD, or the words certificate of deposit, in any capitals. The institution's name is never read: a brokerage account at CD Capital is not a CD (DEC-4036c, 2026-10-10).",
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
  "formula_in_words": "One row for one bond: face value and yearly interest rate (each not entered when it was not), interest paid in a year (yearlyInterestNow: face × rate; with no face, value × rate; with no rate, not entered; $0 once past its maturity date, so the rows add up to the summary), maturity date, years left (yearsToMaturity — exact, never below zero), current yield, yield to maturity (approxYTM — solved exactly; nothing when matured), value, whether it is a CD, whether it is priced like a bond (pricedLikeBond: a bond, or a CD bought through a broker), and the accrued-interest note (accruedInterestCaveat, worked for today). The heading is the institution when it is not blank after trimming, otherwise the account's name.",
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
  "formula_in_words": "Uses the dividend and interest records dated on or after the period's first day, amounts taken as positive. A record that names a ticker goes to that holding's category: bond → Bonds & CDs; cash → Cash in this account; anything else → Stocks / Funds; a ticker with no holding on record → Stocks / Funds for a dividend, Bonds & CDs for interest. A record that names NO ticker → Stocks / Funds for a dividend; for interest, Bonds & CDs when the record's account is a bond or CD account handed in, else Cash in this account. A category's return, over the holdings with a value above zero and a period return above −100%: each holding's value at the start = its value now ÷ (1 + its return over the whole period, never a yearly rate); return = the values now added up ÷ the values at the start added up − 1. Nothing when no holding qualifies. Bonds & CDs shows a stated YEARLY rate instead — each bond account's rate weighted by its balance — when every bond account with a balance states a rate and no bond is held as a holding. On day one all three categories are returned with no return; any other day only the categories that earned more than zero.",
  "handed": "export function categoryEarnings(input: {\n  /** every record, unfiltered — this takes the window’s own */\n  transactions: any[];\n  /** the window’s first day, or null for \"since the record began\" */\n  windowStart: string | null;\n  /** each holding with its class and its own return, as buildPerformance produces them */\n  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; periodTotal?: number | null; marketValue?: number }[];\n  /** Every bond or CD held as its own account: which account it is, what it is worth and the yearly rate it states. */\n  bonds?: { asset_id?: string | number; balance?: number; coupon_rate?: number }[];\n  /** DAY ONE: every category is shown at $0 — \"every line fills in as days pass, the structure never\n   *  changes\" (Performance v17, phones 4 and 5). Any other day, a category that received nothing is\n   *  left out. */\n  dayOne?: boolean;\n}): CategoryEarned[]",
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
  "formula_in_words": "Since: the day after the earliest recorded day, but never later than today; today when nothing is recorded. This year: 1 January of today's year. 1M, 3M, 6M, 1Y and 2Y: today moved back 1, 3, 6, 12 or 24 months — the same day of that month, or its last day when that month is shorter (one month before 31 March is 28 February). Any other label: 12 months back, the same way.",
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither.",
  "formula_in_words": "Each holding's gain over the period, added up. For a holding bought inside the period: its whole gain (value − cost). For any other holding with a period return: value × (1 − 1 ÷ (1 + return)) when its value is above zero, which is today's value less its value when the period opened; nothing when it holds nothing. For a holding with no period return that states a yearly rate (only a certificate of deposit is given one): value × (1 − 1 ÷ (1 + rate) to the power years), years handed in (none handed in counts as 0, so it gains nothing). Any other holding that holds something (its value, or the broker's last price × its shares, or the value it was entered at, above zero) has a gain that cannot be known: the answer is then NOTHING — not zero — for the whole total. A holding that holds nothing gains nothing. (Owner decision DEC-3656, 2026-10-09.)",
  "handed": "export function pricedGainOf(rows: GainRow[], years = 0): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
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
 },
 {
  "id": "MK-NW-F-105",
  "name": "whyNoReturn",
  "kind": "function",
  "what_it_is_for": "WHY A RETURN CANNOT BE MEASURED, in words a person reads.",
  "formula_in_words": "The sentence shown where a time-weighted return cannot be measured; empty when it was measured. Money moved on a day with no recorded value: names the day and says a return cannot be measured across it. A movement with no date: says so. A deposit or withdrawal with no amount on record: names the day and says a return cannot be measured across it. Shares moved in or out: names the day and says the records do not say what they were worth. Nothing to grow from on a day (the previous evening's value + money added − money taken out is zero or less while that day holds a value): names the day and says which — a value recorded with nothing there the evening before and no money added, or more money taken out than was there the evening before plus the money added that day. Since DEC-4439 (2026-10-11) a value below the money added is a loss, measured, and has no sentence. Nothing invested over the period: says there is no return to state. Today's value not on record: says so. A beginning that cannot be read has no sentence here — the period is shown as not covered instead.",
  "handed": "export function whyNoReturn(v: TimeWeightedVerdict | null): string"
 },
 {
  "id": "MK-NW-F-106",
  "name": "mortgagesByProperty",
  "kind": "function",
  "what_it_is_for": "Which mortgage is on which property, and which mortgages are on none.",
  "formula_in_words": "Properties = the accounts whose class is real estate. Mortgages = the debts whose type is mortgage. Owner rule, 2026-10-04: \"It is feasible to have property without mortgage but no mortgage without property. So check should be 3 properties in NW - 3 or less mortgage.\" A mortgage is on the property it names, when that property exists and has no mortgage placed on it yet. A mortgage that names no property is placed only where there is one answer: first, on the one property without a mortgage whose name its own name begins with; then, when exactly one property is still without a mortgage and exactly one mortgage is still without a property, on that property. Every other mortgage is listed as on no property — including a second mortgage that names a property already taken. It gives: the count of properties and of mortgages; for each property its mortgage (or none) and that mortgage's required monthly payment; the mortgages on no property; whether there are none of those; and the sentence to show when there are.",
  "handed": "export function mortgagesByProperty(accounts: AssetAccount[], debts: Debt[]): MortgageCheck"
 },
 {
  "id": "MK-NW-F-107",
  "name": "propertyUses",
  "kind": "function",
  "what_it_is_for": "What each property is used for: the home lived in, a rental, or a second or vacation home.",
  "formula_in_words": "For each property: what it is used for, as propertyUseMap reads it, handed the rent entries from the Income screen (none handed in when the person has none on record). Owner rule, 2026-10-04: \"unless rental income is added on the income screen, assume property is second or vacation home.\" RENTAL = a rent entry names it — or, only when no rent entries are handed in at all, it is stored as a rental. HOME = the one marked as the home lived in; with none marked and no use stated on any, the one entered first. SECOND = every other property, except that a rent entry naming no property makes the one remaining property a rental when there is exactly one.",
  "handed": "export function propertyUses(accounts: AssetAccount[], rentals: { income?: any; expenses?: any; property_id?: any }[] | null | undefined): Map<string, PropertyUse>",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-NW-F-108",
  "name": "taxWordsOf",
  "kind": "function",
  "what_it_is_for": "How an account is taxed, in the words a person reads on the account's page.",
  "formula_in_words": "The words for how an account is taxed, shown on its page. A 529 always reads tax-free for education; an HSA always reads pre-tax — tax-free for medical costs, whatever treatment is stated. Otherwise by its treatment (taxTreatmentOf): tax type not stated reads tax type not stated (DEC-4036f, 2026-10-10); tax-deferred reads pre-tax — taxed when it comes out; tax-free reads tax-free (Roth) for an account in the Roth bucket and tax-free for any other; taxable reads taxable.",
  "handed": "export function taxWordsOf(a: AssetAccount): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-109",
  "name": "holdingClassOf",
  "kind": "function",
  "what_it_is_for": "What one holding inside an account is, by the one rule the split, the words under it and the account's page all use.",
  "formula_in_words": "The class of one holding inside an account. What was stored: the broker's or importer's tag (bond → Bonds & CDs, other → Alternatives, cash → cash, any other tag → Stocks / Funds), else the class of the kind picked when it was added (not real estate or personal property), else nothing. (1) If the person said what it is, their answer — the stored class, or Unclassified when nothing is stored. (2) If it is marked as asked, Unclassified (owner rule, 2026-09-30: \"Refuse the line and ask\"). (3) The class its ticker and name are evidence for, unless that is cash: a money-market fund is Stocks / Funds, a CD or a T-bill is Bonds & CDs, whatever tag the broker sent (owner rule, 2026-08-04: cash means cash only). (4) Otherwise what was stored; with nothing stored, cash when the name says cash, else Unclassified — never a guessed Stocks / Funds.",
  "handed": "export function holdingClassOf(p: any): AssetClass",
  "inputs_it_reads": [
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ]
 },
 {
  "id": "MK-NW-F-110",
  "name": "primaryHomeIdOf",
  "kind": "function",
  "what_it_is_for": "Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none.",
  "formula_in_words": "The property propertyUseMap reads as the home lived in, handed the rent entries when the caller has them. Nothing (null) when the household has no home — which is not the same as not being asked.",
  "handed": "export function primaryHomeIdOf(accounts: AssetAccount[], rentals?: RentEntry[] | null): string | null"
 },
 {
  "id": "MK-NW-F-111",
  "name": "assetsStateFrom",
  "kind": "function",
  "what_it_is_for": "The saved accounts as a state to show — or nothing, when nothing is saved OR every saved account was deleted (outside review, 2026-10-07: an empty list is not a $0 total with a blended return).",
  "formula_in_words": "buildAssetsState of the saved accounts. Nothing when there is no saved record, or the saved record holds no accounts.",
  "handed": "export function assetsStateFrom(uid: UserId, d: AssetsDoc | null | undefined): AssetsState | null"
 },
 {
  "id": "MK-NW-F-112",
  "name": "yearlyInterest",
  "kind": "function",
  "what_it_is_for": "A year's interest from one bond or CD, by the one rule both income figures use: face × rate; with no face entered, today's value × rate (a CD typed by its balance); with no rate, nothing (owner A46: counted as $0, said so).",
  "formula_in_words": "A year's interest from one bond or CD. Nothing when no rate was entered. Face value × rate when a face value was entered; otherwise today's value × rate.",
  "handed": "export function yearlyInterest(b: BondInfo): number | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-113",
  "name": "altPartsOf",
  "kind": "function",
  "what_it_is_for": "The alternatives inside one account, each with the kind its yearly rate is read from.",
  "formula_in_words": "The alternatives inside one account, each with the kind its yearly rate is read from. An account that is itself an alternative: its alternatives part of the class split (or its whole balance when it has no split), at its own kind. Any other account: each option at its synced value, kind options; each holding classed as an alternative with a price, shares × price, kind crypto when its name says bitcoin, ethereum or crypto, commodities when it says gold, silver, platinum, palladium or commodity, otherwise other; and whatever of the account's alternatives part is left (more than half a cent either way) is a part with no kind, marked asset type not classified — never other, and given no rate (DEC-4036h, 2026-10-10). Nothing when the account holds no alternatives.",
  "handed": "export function altPartsOf(a: AssetAccount): AltPart[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-114",
  "name": "rentAmount",
  "kind": "function",
  "what_it_is_for": "DEC-3768c (2026-10-10): a rent figure with words in it is not read — it counts as not entered, never as the digits inside it (\"about 2k\" was $2 and made the property a rental).",
  "formula_in_words": "A rent figure as a number. Owner rule, 2026-10-10: a rent figure is a number. It is read only when it is a plain number: digits with at most one decimal point, allowing a leading dollar sign, thousands commas and spaces. A figure with letters or any other text in it (a word such as \"about\", a \"k\" for thousands, \"n/a\", a minus sign) is not read and counts as not entered, never as the digits inside it. Not entered, blank or missing gives 0.",
  "handed": "const rentAmount = (v: any)"
 },
 {
  "id": "MK-NW-F-115",
  "name": "liveRent",
  "kind": "function",
  "what_it_is_for": "The rent entries that carry a figure and name their property: rent coming in or costs going out above zero.",
  "formula_in_words": "The rent entries that name their property (a property identifier that is not blank) and whose rent coming in or costs going out is above zero. An entry that names no property is not rent and is left out, whatever its figures (owner rule DEC-4059d, 2026-10-10).",
  "handed": "const liveRent = (rentals: RentEntry[] | null | undefined)",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-NW-F-116",
  "name": "rentedIdsOf",
  "kind": "function",
  "what_it_is_for": "Which properties the rent entries name, by their identifiers.",
  "formula_in_words": "The identifiers of the properties the live rent entries name.",
  "handed": "const rentedIdsOf = (rentals: RentEntry[] | null | undefined)"
 }
]
```
