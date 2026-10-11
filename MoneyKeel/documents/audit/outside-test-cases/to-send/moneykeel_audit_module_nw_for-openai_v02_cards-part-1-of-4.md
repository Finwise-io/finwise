# The cards — "nw module final — part 1 of 4"

30 cards, so 30 formula checks and 150 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 1"` in your reply.

```json
[
 {
  "id": "MK-NW-F-001",
  "name": "isAlternative",
  "kind": "function",
  "what_it_is_for": "Is this account an \"other investment\" — an alternative held at a manual value (not a bond, not cash/property)?",
  "formula_in_words": "True when the account's class (assetClassOf) is Alternatives.",
  "handed": "export function isAlternative(a: AssetAccount): boolean",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-002",
  "name": "alternativesSummary",
  "kind": "function",
  "what_it_is_for": "Adds up the alternative investments: how many there are, what they are worth together, their blended yearly growth rate and the growth in dollars that rate gives over a year.",
  "formula_in_words": "Over every account that holds alternatives, read from its class split (altPartsOf): count = how many such accounts; total = their alternatives parts added up, every part included — the same dollars as the Alternatives line; the parts no priced holding or option explains (asset type not classified) are added up on their own as the money not classified. Blended rate = each classified part × the yearly rate for its kind (the person's own rate for that kind first, else the benchmark), added up, ÷ the classified parts' total — no figure when that total is 0; growth in a year = the classified parts' total × blended rate, and no figure when it is 0 ($0 would read as a forecast). The rate and the growth leave the not-classified money out (DEC-4036h, 2026-10-10).",
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
  "formula_in_words": "Bonds & CDs when a maturity date is given that reads as a real calendar day — a full date (year-month-day), or a year and month alone, read as that month's first day; cash when none is. An empty or blank date counts as none, and so does a text that is not a real date (words such as 'tomorrow-ish', or a day that does not exist such as February 30) — owner rule DEC-4059b/c, 2026-10-10: dates are picked, never typed. It does not look at whether the date has passed.",
  "handed": "export function maturityClass(maturityDate?: string | null): 'cash' | 'bonds'"
 },
 {
  "id": "MK-NW-F-010",
  "name": "wrapperAccount",
  "kind": "function",
  "what_it_is_for": "The person picked how this account is taxed — what does that make it?",
  "formula_in_words": "401(k) → kind 401(k), pre-tax. Traditional IRA → kind Traditional IRA, pre-tax. Roth IRA → kind Roth IRA, Roth. Roth 401(k) → kind 401(k), Roth. HSA → kind HSA, pre-tax. Taxable → kind brokerage, taxable. Nothing chosen, or a word not on this list → no kind and no tax type: never assumed taxable (DEC-4036f, 2026-10-10).",
  "handed": "export function wrapperAccount(w?: AddWrapper | null): { kind: string | undefined; tax_bucket: TaxBucket | undefined }",
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
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-012",
  "name": "taxTreatmentOf",
  "kind": "function",
  "what_it_is_for": "How an account's money is taxed: as it is earned, when it comes out, or not at all.",
  "formula_in_words": "A 529 is tax-free whatever is stored (what it earns comes out untaxed when used for education; DEC-4036d, 2026-10-10). An HSA is tax-deferred — pre-tax going in — whatever bucket it is filed in (DEC-4036e, 2026-10-10). Otherwise the tax treatment stated on the account. Otherwise by its tax bucket — the one on the account when it is one of cash, pre-tax, Roth, taxable or property, else the bucket its kind carries when that bucket is not taxable — a kind whose catalogue bucket is taxable (crypto, a bond, a CD, a brokerage) says nothing about tax (DEC-4036f, 2026-10-10): no bucket at all → tax type not stated, never assumed taxable (DEC-4036f, 2026-10-10); pre-tax → tax-deferred; Roth → tax-free; anything else → taxable.",
  "handed": "export function taxTreatmentOf(a: AssetAccount): TaxTreatmentAnswer",
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
  "formula_in_words": "An account that is not real estate has no use (no answer). Land stated as land is land. Asked about one property with neither the household nor the rent entries: its stated use, else the home. Given the household or the rent entries: what propertyUseMap says of it — home is the home lived in, rental is a rental (only when a rent entry handed in names it), anything else is a second home.",
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
  "formula_in_words": "The kind word is wrapperWord for the account (401(k), Traditional IRA, Roth IRA, HSA, 529, Brokerage, Checking and so on; none for a kind that names contents, such as crypto, unless confirmed a brokerage). An account is tax-advantaged only when taxTreatmentOf says tax-deferred or tax-free — a tax type not stated is not (DEC-4036f, 2026-10-10). For a tax-advantaged account: where the kind says only Brokerage — or there is no kind and the last four digits are known — the word is Roth when the account is tax-free and 401(k) / IRA when it is tax-deferred; a 401(k) in the Roth bucket or tax-free is Roth 401(k). A tax-advantaged account always shows what it is. With an institution: a tax-advantaged account that has a word reads Institution + word + -last four (without the digits when unknown); otherwise with digits it reads Institution -last four; otherwise Institution + kind word. With none of those: the account's own name (an account named Imported holding with exactly one holding takes that holding's ticker or name), with the institution in front only if the name does not already contain it, and the mask at the end only if it is not already there.",
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
 },
 {
  "id": "MK-NW-F-027",
  "name": "accountClassBreakdown",
  "kind": "function",
  "what_it_is_for": "How much of one account sits in each class, with the parts adding up exactly to the account's balance.",
  "formula_in_words": "LINKED ACCOUNT. Cash = its cash balance. Each holding with a price = shares × last price, filed under its class (holdingClassOf). Each option = its value as synced, under Alternatives (an option is valued when it is synced, at contracts × price per share × 100 — owner, 2026-08-26). If the parts come to less than the balance and one or more holdings have NO price: the whole difference is filed under the unpriced holdings' class when they share one, and under Unclassified when they span classes — never under cash. Otherwise, if the parts do not add up to the balance: a difference no bigger than the larger of $1 or 1% of the balance is added to cash when positive (owner rule, 2026-08-11), or taken off the largest class when negative; a bigger one is put under the account's own class (assetClassOf). ACCOUNT BUILT BY HAND (not a cash or property account): when it records its own cash (or its balance is built from its records) and its balance is below zero, the whole balance is cash — overdrawn is negative cash: balance −$100 with a cash field of $50 is Cash −$100 (DEC-4036i, 2026-10-10). Otherwise its cash = the uninvested cash it records, above zero, never more than the balance, when its balance is built from its records or it records cash. When its balance is built from its holdings, each holding is weighed at today's value — shares × the broker's price, else the value its balance was last built from, else what was paid — and the rest of the balance is shared out among the holdings' classes by those weights, so a T-bill is Bonds & CDs; if every holding is of the account's own class, the rest stays whole under that class. No answer when it records no cash and its holdings are all of its own class. ANY OTHER ACCOUNT — a typed balance, a bank account — gets no answer. The parts always add up to the balance.",
  "handed": "export function accountClassBreakdown(a: AssetAccount): Record<AssetClass, number> | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call"
  ]
 },
 {
  "id": "MK-NW-F-028",
  "name": "classPortionLabel",
  "kind": "function",
  "what_it_is_for": "The words under an account's name saying what it holds of one class — \"3 CDs & 1 Treasury in this account\".",
  "formula_in_words": "The words for one class inside one account, counting the holdings of that class (holdingClassOf — the same test the dollars beside the words were split by). Cash: cash in this account. Bonds: counts the holdings whose name has the whole word CD (or certificate of deposit), those whose name has the whole word Treasury (or Treas, UST, T-bill, T-note, T-bond, government — the broker's wording too), capitals ignored, and the rest as bonds; a count of one is singular, any other count takes its plural from the one list of words (plural, the one list of words — his ruling of 2026-10-10 — Treasuries for more than one), a count of zero is left out, two parts are joined with &, three as A, B & C — for example 3 CDs & 1 Treasury in this account, or 1 CD, 1 Treasury & 2 bonds in this account — or bonds & CDs in this account when none are listed. Stocks: N holdings in this account (1 holding), or stocks & funds in this account when none are listed. Alternatives: N options & N holdings in this account, each part left out when its count is zero (an option is one option position, however many contracts), or alternatives in this account. Any other class: unpriced portion of this account.",
  "handed": "export function classPortionLabel(a: AssetAccount, cls: AssetClass): string",
  "inputs_it_reads": [
   "MK-XS-I-034 option positions — contracts, strike, expiry, put or call"
  ]
 },
 {
  "id": "MK-NW-F-029",
  "name": "assetAllocation",
  "kind": "function",
  "what_it_is_for": "How much money sits in each of the seven classes?",
  "formula_in_words": "The value in each asset class across every account. An account with a class split (accountClassBreakdown) — a linked account, or an account built by hand that records its own uninvested cash — is split by it; any other account counts whole under its one class (assetClassOf). The seven classes add to everything owned, and the Cash class is cashTotal.",
  "handed": "export function assetAllocation(accounts: AssetAccount[]): Record<AssetClass, number>",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-030",
  "name": "earmarkDefault",
  "kind": "function",
  "what_it_is_for": "Default % of an account that's earmarked for retirement (rest funds other goals).",
  "formula_in_words": "The share of an account counted towards retirement by default (owner, 2026-08-11, DEC-0100: all assets minus the home lived in and the car driven): 0% for a 529, for the car driven (primaryCarIdOf), and for the home lived in. Told the household's home (its identifier, from primaryHomeIdOf), only that property is 0%; told the household has no home (null), no property is; told nothing, a property stated as the home lived in, or with no use stated, is 0%. 100% for everything else — a rental, a second home, a second car, valuables included.",
  "handed": "export function earmarkDefault(a: AssetAccount, primaryCarId?: string, primaryHomeId?: string | null): number",
  "inputs_it_reads": [
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 }
]
```
