# The cards — "nw module final — part 1 of 4"

26 cards, so 26 formula checks and 130 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 1"` in your reply.

```json
[
 {
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "kind": "function",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's class (assetClassOf) is Alternatives.",
  "handed": "export function isAlternative(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-002",
  "name": "alternativesSummary",
  "kind": "function",
  "what_it_is_for": "Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.",
  "formula_in_words": "Over every account that holds alternatives, read from its class split (altPartsOf): count = how many such accounts; total = their alternatives parts added up — the same dollars as the Alternatives line; blended rate = each part × the yearly rate for its kind (the person's own rate for that kind first, else the benchmark), added up, ÷ total — no figure when the total is 0; growth in a year = total × blended rate, and no figure when nothing is held or the total is 0 ($0 would read as a forecast).",
  "handed": "export function alternativesSummary(accounts: AssetAccount[], overrides?: Record<string, number>): AltSummary",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-003",
  "name": "valueFreshness",
  "kind": "function",
  "what_it_is_for": "How many whole months old is a value typed by hand, and is that old enough to ask about it?",
  "formula_in_words": "No answer for an account whose balance is built from its holdings, or one with no value date. Otherwise months old = the whole months that have fully passed since the value date: (years apart × 12 + calendar months apart), less 1 when today's day of the month is before the day the value was set — unless today is the last day of its month, which completes the month for a value set on a day that month does not have (a value set on the last day of January is one month old on the last day of February). A value dated by its month alone counts from the 1st, and its date is given as the 1st of that month. Never below zero. Stale when 6 or more.",
  "handed": "export function valueFreshness(a: AssetAccount, now: Date = new Date()): { asOf: string; monthsOld: number; stale: boolean } | null",
  "inputs_it_reads": [
   "MK-XS-I-033 the date a hand-typed value was set"
  ]
 },
 {
  "id": "MK-NW-F-004",
  "name": "portfolioActualReturn",
  "kind": "function",
  "what_it_is_for": "What the money set aside for retirement returned over the last twelve months, from the returns the person reported.",
  "formula_in_words": "What the money set aside for retirement returned over the last twelve months — not the return of everything invested. Over accounts that are not property, that have a return for the last twelve months reported by the person (a reported 0 counts; one not reported is left out, never read as 0; a reported loss of everything or more is left out), and that have some amount set aside for retirement: each account's start = the amount set aside today ÷ (1 + its return). The answer = the amounts set aside today added up ÷ the starts added up − 1 — what the money set aside grew by, each account weighed by what was set aside when the twelve months began. No answer when either total is zero or less.",
  "handed": "export function portfolioActualReturn(accounts: AssetAccount[]): number | null",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-051 what an account actually returned over the last twelve months"
  ]
 },
 {
  "id": "MK-NW-F-005",
  "name": "accountAllowsTicker",
  "kind": "function",
  "what_it_is_for": "Can a share or fund bought by its ticker be recorded in this account?",
  "formula_in_words": "False for property, for cash accounts, for a 529, and for checking and savings. Otherwise true when the account already lists holdings. Otherwise false for an account classed as Bonds & CDs or Alternatives (it is itself one bond, CD or alternative holding typed by hand), and true for everything else.",
  "handed": "export function accountAllowsTicker(a: AssetAccount): boolean",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-006",
  "name": "isCashKind",
  "kind": "function",
  "what_it_is_for": "Does this account type sit under the Cash heading on screen?",
  "formula_in_words": "True when the kind is a cash kind: checking, savings, high-yield savings, cash management or foreign currency. A money-market fund (Stocks / Funds) and a CD (Bonds & CDs) are not cash kinds — his rule DEC-0051.",
  "handed": "export const isCashKind = (kind?: string)",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-007",
  "name": "assetKind",
  "kind": "function",
  "what_it_is_for": "What do we know about this kind of account?",
  "formula_in_words": "Looks a kind up by its id in the app's list of account kinds and returns its entry (name, section, tax bucket, typical yearly return), or nothing when the id is not in the list. The id is matched exactly — capitals and spaces count — because only the app writes these ids; no id, or one typed another way, finds nothing.",
  "handed": "export function assetKind(id?: string)"
 },
 {
  "id": "MK-NW-F-008",
  "name": "incomeBearingClassOf",
  "kind": "function",
  "what_it_is_for": "FOUNDER RULE 2026-08-04 (supersedes the money-market=cash rule and the 12-month CD split): CASH means cash only — a sweep/settlement balance.",
  "formula_in_words": "From the account's name, capitals ignored, whole words only (put is not Putnam; cd is not ABCD), first match wins. Money market (also mmkt, mmf, or the ticker of a money-market fund) → Stocks / Funds — read before the sweep words, so a money-market settlement fund is the fund (the owner's rule of 2026-08-04). Then the words sweep or settlement → cash. The ticker of a Treasury-bill fund → Bonds & CDs. An option — an option code, a dated option, or the words put or call → Alternatives. Crypto — a coin's ticker, or the words bitcoin, ethereum or crypto → Alternatives. A commodity fund's ticker, or the words gold, silver, platinum, palladium or commodity unless the name is a company's → Alternatives. The words currency or forex, or the tickers FXE or FXY → Alternatives. The words CD, certificate of deposit, T-bill, Treasury bill, bond, note, treasury, muni, debenture or coupon — or a percent followed by the word due or a year → Bonds & CDs. Otherwise nothing: the name gives no evidence.",
  "handed": "export function incomeBearingClassOf(label?: string): AssetClass | null"
 },
 {
  "id": "MK-NW-F-009",
  "name": "maturityClass",
  "kind": "function",
  "what_it_is_for": "FOUNDER RULE 2026-08-04 (supersedes build-34 #8's 12-month split): ANY maturity-dated instrument is a BOND — it pays interest, so it must sit in the measured bucket regardless of how soon it matures.",
  "formula_in_words": "Bonds & CDs when a maturity date is given; cash when none is. An empty or blank date counts as none. It does not look at whether the date has passed.",
  "handed": "export function maturityClass(maturityDate?: string | null): 'cash' | 'bonds'"
 },
 {
  "id": "MK-NW-F-010",
  "name": "wrapperAccount",
  "kind": "function",
  "what_it_is_for": "The person picked how this account is taxed — what does that make it?",
  "formula_in_words": "401(k) → kind 401(k), pre-tax. Traditional IRA → kind Traditional IRA, pre-tax. Roth IRA → kind Roth IRA, Roth. Roth 401(k) → kind 401(k), Roth. HSA → kind HSA, pre-tax. Anything else, or nothing chosen → kind brokerage, taxable.",
  "handed": "export function wrapperAccount(w?: AddWrapper | null): { kind: string; tax_bucket: TaxBucket }",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-011",
  "name": "assetClassOf",
  "kind": "function",
  "what_it_is_for": "What an account is: cash, bonds and CDs, stocks and funds, an alternative, real estate, personal property, or not yet known.",
  "formula_in_words": "The first of these that applies. (1) The class stated on the account. (2) Bonds & CDs if it has a maturity date (owner rule, 2026-08-04: any maturity-dated instrument is a bond) — whatever its name says. (3) The class its name is evidence for — except for a home, real estate, a vehicle or anything in the property bucket, whose name is a place and is not read. (4) The class of its kind: checking, savings, high-yield savings, cash management and foreign currency are cash; money market and stocks are Stocks / Funds; CD and fixed income are Bonds & CDs; private equity, hedge funds, commodities, crypto, annuities, options and other are Alternatives; home and real estate are Real estate; vehicle is Personal property. (5) Stocks / Funds if it lists holdings. (6) Cash if it is a cash account. (7) If it is property: Real estate when no kind is recorded or its use (lived in, rented, second home, land) is recorded; Personal property for any other kind. (8) Otherwise Unclassified.",
  "handed": "export function assetClassOf(a: AssetAccount): AssetClass",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-012",
  "name": "taxTreatmentOf",
  "kind": "function",
  "what_it_is_for": "How an account's money is taxed: as it is earned, when it comes out, or not at all.",
  "formula_in_words": "The tax treatment stated on the account. Otherwise tax-free for a 529 (what it earns comes out untaxed when used for education). Otherwise tax-deferred for a pre-tax account — an HSA included: it goes in untaxed, and how it comes out depends on its use, which taxWordsOf says in words — tax-free for a Roth account, and taxable for anything else.",
  "handed": "export function taxTreatmentOf(a: AssetAccount): TaxTreatment",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-013",
  "name": "realEstateUseOf",
  "kind": "function",
  "what_it_is_for": "Real-estate use (primary/rental/secondary/land); only meaningful when assetClassOf === 'real_estate'.",
  "formula_in_words": "An account that is not real estate has no use (no answer). Land stated as land is land. Asked about one property alone: rental when a rent entry handed in names it, else its stated use, else the home. Asked within the household: what propertyUseMap says of it — home is the home lived in, rental is a rental, anything else is a second home.",
  "handed": "export function realEstateUseOf(a: AssetAccount, accounts?: AssetAccount[], rentals?: RentEntry[] | null): RealEstateUse | null",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses"
  ]
 },
 {
  "id": "MK-NW-F-014",
  "name": "isRealAsset",
  "kind": "function",
  "what_it_is_for": "Whether an account is a physical asset, meaning real estate or personal property.",
  "formula_in_words": "True when the account's class (assetClassOf) is Real estate or Personal property.",
  "handed": "export function isRealAsset(a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-F-015",
  "name": "totalAssets",
  "kind": "function",
  "what_it_is_for": "Everything owned, added up: the balance of every account.",
  "formula_in_words": "Every account's balance added up; a missing balance counts as zero.",
  "handed": "export function totalAssets(accounts: AssetAccount[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-016",
  "name": "cashTotal",
  "kind": "function",
  "what_it_is_for": "All the cash a person has: every bank account, plus the uninvested cash sitting inside investment accounts.",
  "formula_in_words": "For an account that has a class split (accountClassBreakdown): the cash part of it — a linked account's uninvested cash, or the uninvested cash an account built by hand records for itself. For any other account: its whole balance when its class is cash, otherwise nothing. Added up over every account.",
  "handed": "export function cashTotal(accounts: AssetAccount[]): number",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-014",
    "words_on_screen": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
    "unit": "words",
    "what_it_answers": "The sum written out, so the months figure can be checked by eye.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/analytics"
    ]
   }
  ]
 },
 {
  "id": "MK-NW-F-017",
  "name": "equitiesTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Stocks / Funds, wherever it sits — an account that holds several classes gives only its Stocks / Funds part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Stocks / Funds line of the class split (assetAllocation): everything classed as Stocks / Funds, wherever it sits. An account holding several classes gives only its Stocks / Funds part.",
  "handed": "export function equitiesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-018",
  "name": "fixedIncomeTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Bonds & CDs, wherever it sits — an account that holds several classes gives only its Bonds & CDs part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Bonds & CDs line of the class split (assetAllocation): everything classed as Bonds & CDs, wherever it sits. An account holding several classes gives only its Bonds & CDs part.",
  "handed": "export function fixedIncomeTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-019",
  "name": "alternativesTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Alternatives, wherever it sits — an account that holds several classes gives only its Alternatives part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Alternatives line of the class split (assetAllocation): everything classed as Alternatives, wherever it sits. An account holding several classes gives only its Alternatives part.",
  "handed": "export function alternativesTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-020",
  "name": "realEstateTotal",
  "kind": "function",
  "what_it_is_for": "Everything classed as Real estate, wherever it sits — an account that holds several classes gives only its Real estate part (MK-NW-F-029 assetAllocation).",
  "formula_in_words": "The Real estate line of the class split (assetAllocation): everything classed as Real estate.",
  "handed": "export function realEstateTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-021",
  "name": "investmentsTotal",
  "kind": "function",
  "what_it_is_for": "The total value of everything invested: stocks and funds, bonds and CDs, alternatives and what is not yet classed, in whatever kind of account they sit, with cash and property left out.",
  "formula_in_words": "The Investments line on Net worth: the Stocks / Funds, Bonds & CDs, Alternatives and Unclassified lines of the class split (assetAllocation), added up. Cash sitting uninvested inside an investment account is on the Cash line (cashTotal), not here; a CD inside a cash account is here. Always: cashTotal + investmentsTotal = investableAssets.",
  "handed": "export function investmentsTotal(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-022",
  "name": "investableAssets",
  "kind": "function",
  "what_it_is_for": "Everything owned except real estate and personal property: cash, investments and retirement balances.",
  "formula_in_words": "The balances of every account that is not a real asset (isRealAsset), added up by sumWhere — an account with no balance is left out, not counted as zero.",
  "handed": "export function investableAssets(accounts: AssetAccount[]): number"
 },
 {
  "id": "MK-NW-F-023",
  "name": "wrapperWord",
  "kind": "function",
  "what_it_is_for": "The plain word for the kind of account something sits in, such as 401(k) or IRA, or nothing when that kind has no such word.",
  "formula_in_words": "The word for a kind: checking → Checking; savings → Savings; high-yield savings; money market; CD; cash management; foreign currency → Foreign currency; brokerage, stocks, fixed income, commodities and options → Brokerage; annuities → Annuity; 401(k); Traditional IRA; Roth IRA; HSA; 529; Home; Vehicle. Crypto, private equity, hedge funds and other name what is held, not an account: nothing, unless the person confirmed the account is a brokerage. Nothing for an unknown kind or none.",
  "handed": "export const wrapperWord = (kind?: string, a?: { wrapper_confirmed?: boolean }): string",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-024",
  "name": "accountLastFour",
  "kind": "function",
  "what_it_is_for": "The last four digits of an account, or null when we genuinely don't have them.",
  "formula_in_words": "From the account's mask, or failing that its account number: drop everything but digits; if four or more digits remain, the last four; otherwise nothing.",
  "handed": "export function accountLastFour(a: { mask?: string; account_number?: string }): string | null"
 },
 {
  "id": "MK-NW-F-025",
  "name": "accountDisplayName",
  "kind": "function",
  "what_it_is_for": "The one name an account is shown by, built from its institution, the kind of account and its last four digits where they are known.",
  "formula_in_words": "The kind word is wrapperWord for the account (401(k), Traditional IRA, Roth IRA, HSA, 529, Brokerage, Checking and so on; none for a kind that names contents, such as crypto, unless confirmed a brokerage). For a tax-advantaged account: where the kind says only Brokerage — or there is no kind and the last four digits are known — the word is Roth when the account is tax-free and 401(k) / IRA when it is tax-deferred; a 401(k) in the Roth bucket or tax-free is Roth 401(k). A tax-advantaged account always shows what it is. With an institution: a tax-advantaged account that has a word reads Institution + word + -last four (without the digits when unknown); otherwise with digits it reads Institution -last four; otherwise Institution + kind word. With none of those: the account's own name (an account named Imported holding with exactly one holding takes that holding's ticker or name), with the institution in front only if the name does not already contain it, and the mask at the end only if it is not already there.",
  "handed": "export function accountDisplayName(a: Pick<AssetAccount, 'label' | 'institution' | 'mask'> & { positions?: unknown[]; kind?: string; tax_bucket?: TaxBucket; tax_treatment?: TaxTreatment }): string",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-026",
  "name": "accountDisplayNames",
  "kind": "function",
  "what_it_is_for": "The name each account in a list is shown by, with no two alike.",
  "formula_in_words": "Each account gets its display name (accountDisplayName). Where two or more accounts end up with the same name, each gets · 1, · 2 and so on added, in the order of their account ids read as text (an id is made by the app from the moment the account was created, so that is the order they were made). A numbered name that is already another account's name is skipped, so no two accounts are ever shown by the same name.",
  "handed": "export function accountDisplayNames(accounts: (Pick<AssetAccount, 'asset_id' | 'label' | 'institution' | 'mask'> & { positions?: unknown[] })[]): Map<string, string>",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name"
  ]
 }
]
```
