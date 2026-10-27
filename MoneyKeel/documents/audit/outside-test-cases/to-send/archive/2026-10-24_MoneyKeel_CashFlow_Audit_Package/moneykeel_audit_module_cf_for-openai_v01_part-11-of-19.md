# Cash flow — part 11 of 19: Recording a transaction — cash, holdings and undo

14 cards, so 14 formula checks and 70 cases, and one `rules_held` line for each of the 9 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 11"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface Transaction {
  id: EntityId;
  date: string;              // 'YYYY-MM-DD' — when it happened (user-set)
  type: TxnType;
  account_id: EntityId;
  counter_account_id?: EntityId;  // for TRANSFER / TRANSFER_IN_KIND
  ticker?: string;
  position_id?: EntityId;
  assetClass?: 'stock_etf' | 'bond' | 'other';
  kind?: string;             // instrument kind (benchmark mapping) for new positions
  shares?: number;
  price?: number;            // per share
  amount?: number;           // cash amount (deposit/withdraw/transfer/dividend-as-cash/fee)
  /** The broker's own fee on a BUY or SELL, in dollars, always zero or above (since 2026-10-21). Absent = the broker sent
   *  none (not on record); 0 = the broker said $0. Read through realizedFromLedger, never directly. */
  fee?: number;
  /** True when the stored price already carries that fee — the broker's cash figure was net of it, so shares × price is
   *  what was really paid or received and the fee must not be counted again. Set at sync beside fee (2026-10-21). */
  fee_in_price?: boolean;
  /** THE SHARES IN ONE CONTRACT OF THE OPTION A BUY OR A SALE TRADED, as the holding stated it when the trade was recorded
   *  (2026-10-23; DEC-0274: an option is contracts × 100 × price unless the broker or the person states otherwise; DEC-4646:
   *  the holding's "Shares per contract"). Absent = 1: a share is a share. Stamped by recordTransaction (tradeMultiplierOf)
   *  and read by the cash the trade moved (applyTransaction, cashEffect), so 1 contract at $2.50 moves $250, never $2.50. */
  multiplier?: number;
  reinvested?: boolean;      // dividend/interest reinvested into the position vs taken as cash
  direction?: 'IN' | 'OUT';  // TRANSFER_IN_KIND from a broker: which way the shares went. The type
                             // alone does not say, and without it a return cannot be measured
                             // across the day (stored since 2026-10-04; older rows carry none).
                             // A broker's one-sided cash TRANSFER (a journal) carries it too, since
                             // 2026-10-20: IN is money that arrived in this account, OUT money that left.
                             // A broker's DEPOSIT or WITHDRAWAL carries it since 2026-10-21, so a −$500
                             // deposit (a reversal) is $500 that left. Read through moneyIntoAccount
                             // in ledger.ts, the one rule for a stored amount.
  /** The institution's own word for an activity the app could not name (since 2026-10-20, Q15). Set only on such a
   *  row (type ADJUSTMENT); read through unnamedActivityOf in ledger.ts, never directly. */
  unclassified_word?: string;
  note?: string;
  source?: 'manual' | 'connected';  // F10: only connected-account rows are ever reviewed for a
                                    // "worth a look" flag — hand-typed entries are NEVER questioned.
                                    // Absent = manual (every row recorded before F1 sync exists).
  created_at: string;        // ISO — when it was entered (audit)
  undo_prev?: AssetAccount[]; // pre-apply copies of the touched accounts — lets a delete reverse
                              // this row's balance effect exactly (P0: ledger and balances must
                              // never drift; rows recorded before this field use inverseOf()).
}
```

## The cards

```json
[
 {
  "id": "MK-CF-F-132",
  "name": "map",
  "kind": "function",
  "what_it_is_for": "Applies one change to the one account named and leaves every other account as it was.",
  "formula_in_words": "The list of accounts with one change applied to the account named, and the rest untouched.",
  "handed": "const map = (accs: AssetAccount[], id: EntityId, fn: (a: AssetAccount) => AssetAccount)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-133",
  "name": "cashOf",
  "kind": "function",
  "what_it_is_for": "The uninvested cash held inside an account, or zero when none is recorded.",
  "formula_in_words": "The account's cash; 0 when none is recorded.",
  "handed": "const cashOf = (a: AssetAccount)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-134",
  "name": "usesSleeve",
  "kind": "function",
  "what_it_is_for": "Where an account's spendable cash lives: investment accounts use the cash_balance SLEEVE; cash accounts (checking/savings) and property hold their money in `balance`.",
  "formula_in_words": "True for an investment account (not a cash or property account) whose balance is worked out from its holdings, or that records a cash figure of its own.",
  "handed": "const usesSleeve = (a: AssetAccount)",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-135",
  "name": "availableCash",
  "kind": "function",
  "what_it_is_for": "The cash an account can spend right now: the uninvested cash inside an investment account, or the whole balance of a bank account.",
  "formula_in_words": "A bank account or a property (held as cash or property, or its class is cash): its balance. Any other — an investment account: its cash. NOTHING (not entered) when that figure was never entered or is not a number (2026-10-21, DEC-3279e: an investment account's cash never entered read $0, and a buy was refused on it).",
  "handed": "const availableCash = (a: AssetAccount): number | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-136",
  "name": "bumpCash",
  "kind": "function",
  "what_it_is_for": "Adds cash to an account, or takes it out, in the right place: the uninvested cash of an investment account, or the balance of a bank account.",
  "formula_in_words": "For an account that keeps its own cash (usesSleeve): the cash changes by the amount, and the balance changes by the same amount when it is a total the person typed — not for an account built from its holdings (its balance is rebuilt from cash and holdings) and not for a linked account (its total is the broker's) (2026-10-23). For an investment account with holdings that does not keep its own cash: both the cash and the balance change by the amount. For any other account: the balance changes by the amount.",
  "handed": "function bumpCash(a: AssetAccount, delta: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)"
  ],
  "decisions_that_govern_it": [
   "DEC-7595"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-137",
  "name": "findPos",
  "kind": "function",
  "what_it_is_for": "Finds the holding a transaction refers to, by the holding's own identifier or by its ticker.",
  "formula_in_words": "The holding in the account with the record's holding id, or else with the record's ticker (the record's ticker read in capitals).",
  "handed": "const findPos = (a: AssetAccount, t: Transaction)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-138",
  "name": "addLot",
  "kind": "function",
  "what_it_is_for": "Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends.",
  "formula_in_words": "Adds a purchase (shares, cost per share, the record's date) to the holding the record names; when the account has no such holding, a new holding with that one purchase, its ticker in capitals, the kind the record names, and — when the record names no kind — the class its ticker gives through the one classifier an imported holding is classed by, stored under that class's tag.",
  "handed": "function addLot(a: AssetAccount, t: Transaction, shares: number, costPerShare: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [
   "DEC-7605"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-139",
  "name": "removeShares",
  "kind": "function",
  "what_it_is_for": "Remove `shares` from a position FIFO (oldest lots first); returns updated account.",
  "formula_in_words": "Takes the shares out of the holding's purchases oldest purchase date first (a purchase with no date on record goes last — purchaseDateOnRecord: missing, written another way, or a day the calendar does not have, such as 31 February), whatever order they are stored in; a purchase left with nothing is dropped; a holding left with no purchases is removed. Unchanged when the account has no such holding.",
  "handed": "function removeShares(a: AssetAccount, t: Transaction, shares: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)"
  ],
  "decisions_that_govern_it": [
   "DEC-2484",
   "DEC-7398"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-111",
  "name": "applyTransaction",
  "kind": "function",
  "what_it_is_for": "Apply one transaction to the accounts (pure).",
  "formula_in_words": "What one record does to the accounts. Adjustment: nothing. Opening position: adds the shares at their price as a purchase. Opening cash: sets the account's cash to the amount. Deposit, withdrawal or fee: the cash changes by the money the record moved into the account — up by the amount for a deposit, down by the amount for a withdrawal or a fee; when the record says which way the money went, its size counts that way (a fee refund raises the cash, a deposit reversal lowers it), otherwise the amount counts with the sign it was stored with; a record whose amount is not on record changes nothing. Buy: the shares added as a purchase at their price, and the money moved inside the account (2026-10-23): what the shares cost, shares × price × the shares in one contract the record carries (an option's 100 unless its holding states otherwise, 2026-10-23; 1 for anything else), and the fee the price does not carry (feeNotInPrice) — for an account that keeps its own cash (usesSleeve) the cash goes down by the cost and the fee; a total the person typed goes down by the fee alone (the cost moved inside it); the total of an account built from its holdings is rebuilt from them, and a linked account's total is the broker's and is left as it is; an account whose cash was never entered keeps it not entered. Sale with shares: sells at most the shares held (when a purchase has no share count, so the shares held are unknown, the sale stands as recorded), earliest purchases reduced first; the money moved the same way: what the shares sold brought in, shares sold × price × the shares in one contract the record carries, less the fee the price does not carry — the cash up by that for an account that keeps its own cash, a typed total down by the fee alone, a derived or linked total as above; a sale with no shares but an amount lowers the balance by the amount, never below 0. Transfer: the account it is written on changes by the money the record moved into it — down by the amount, or up when the record says the money came in — and the receiving account, when there is one, by the same amount the other way; nothing when the amount is not on record. Transfer of a holding: the whole holding moves to the other account. Dividend, interest or coupon: when reinvested with shares and a price, a purchase is added to a holding already there; otherwise the cash changes by the money the record moved into the account — up by the amount, down when the record says the money left (a reversal) or the amount was stored below zero; nothing when the amount is not on record.",
  "handed": "export function applyTransaction(accounts: AssetAccount[], t: Transaction): AssetAccount[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ],
  "decisions_that_govern_it": [
   "DEC-6796",
   "DEC-7596",
   "DEC-7602"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-222",
  "name": "tradeCash",
  "kind": "function",
  "what_it_is_for": "WHAT A BUY OR A SALE DOES TO AN ACCOUNT'S CASH AND ITS TOTAL (2026-10-23, E2E-57 and E2E-58; tenets 1 and 3).",
  "formula_in_words": "What a buy or a sale does to an account's cash and its total, given what the shares cost (below 0) or brought in at the price, and the fee the price does not carry. An account's total counts as typed unless it is built from its holdings or comes from a connection. An account that keeps its cash apart from its holdings (usesSleeve): its cash = its cash (0 when missing) + what the shares cost or brought in − the fee, and a typed total loses only the fee. Any other account: a typed total loses the fee when there is one; otherwise the account is unchanged.",
  "handed": "function tradeCash(a: AssetAccount, gross: number, fee: number): AssetAccount",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ],
  "decisions_that_govern_it": [
   "DEC-7595"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-223",
  "name": "tradeMultiplierOf",
  "kind": "function",
  "what_it_is_for": "THE SHARES PER CONTRACT A BUY OR A SALE TRADES (2026-10-23; DEC-0274, DEC-4646): the holding it trades, found as applyTransaction finds it, read through the one multiplier (contractMultiplier) — 100 for an option unless its \"Shares per contract\" says otherwise, 1 for anything else and for a ticker the account does not hold yet.",
  "formula_in_words": "The shares per contract a buy or a sale trades: 1 for any other kind of record; otherwise the holding it trades, found in its account as a trade finds it (findPos), read through contractMultiplier; 1 when the account or the holding is not found.",
  "handed": "export function tradeMultiplierOf(accounts: AssetAccount[], t: Pick<Transaction, 'type' | 'account_id' | 'ticker' | 'position_id'>): number",
  "inputs_it_reads": [
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ],
  "decisions_that_govern_it": [
   "DEC-7602"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-224",
  "name": "openingRecordsOf",
  "kind": "function",
  "what_it_is_for": "THE PURCHASE RECORDS OF HOLDINGS YOU ALREADY OWN (2026-10-23, F3 of the Performance journey suite): one \"Opening holding\" per purchase — its date, its shares and its price paid where on record (a cost not on record gives the row no price, read as \"no price paid on record\").",
  "formula_in_words": "The purchase records of a holding already owned: one opening-holding record for each purchase handed in (by default the holding's own purchases), each with the purchase's date, the account, the holding's id, ticker and kind, the purchase's shares, and its cost per share as the price when that is on record (no price otherwise), each made the one way every record is made (makeTransaction).",
  "handed": "export function openingRecordsOf(accountId: EntityId, position: Position, lots: Position['lots'] = position.lots ?? []): Transaction[]",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "decisions_that_govern_it": [
   "DEC-7601"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-112",
  "name": "makeTransaction",
  "kind": "function",
  "what_it_is_for": "Build a full transaction (id + created_at) from a partial.",
  "formula_in_words": "The record as given, with its ticker in capitals, a new id and the time it was made.",
  "handed": "export function makeTransaction(p: Omit<Transaction, 'id' | 'created_at'>): Transaction",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-113",
  "name": "affectedAccountIds",
  "kind": "function",
  "what_it_is_for": "The account ids a transaction can touch.",
  "formula_in_words": "The record's account, and the receiving account when there is one.",
  "handed": "export function affectedAccountIds(t: Transaction): EntityId[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

4 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-NW-F-124",
  "name": "maturityParts",
  "what_it_is_for": "A maturity date read as a real calendar day (year, month, day), or nothing when it is missing, written another way, or impossible.",
  "formula_in_words": "A maturity date read as a real calendar day: its year, month and day. This is the one reading of a maturity date (MK-NW-F-124 maturityParts): spaces round the text are ignored; then it must be a year, a two-digit month and a two-digit day joined by dashes, or a year and two-digit month alone, read as that month's first day; the month must be 1 to 12 and the day must exist in that month. Anything else — a one-digit month or day, words such as 'tomorrow', a time or other text after the day, a day that does not exist such as February 30 — is no date, and the answer is nothing. Every function that reads a maturity date asks this one (outside review OpenAI re-run part 4, 2026-10-13), so a text is a date to all of them or to none."
 },
 {
  "id": "MK-PF-F-031",
  "name": "contractMultiplier",
  "what_it_is_for": "How many units one contract stands for: 100 for an option unless the holding states its own figure, and 1 for everything else.",
  "formula_in_words": "For an option, its own shares per contract when it states a real number above zero (a stated figure counts for an option only, and one that is not finite counts as none — 2026-10-21); otherwise one hundredth for a bond the broker quotes per $100 of face value (its quantity is the face amount and its price is per $100 of it — the same reading the daily record uses); otherwise 100 for an option and 1 for everything else."
 },
 {
  "id": "MK-PF-F-052",
  "name": "purchaseDateOnRecord",
  "what_it_is_for": "A PURCHASE DATE ON RECORD: a real calendar day written year-month-day, or nothing (2026-10-21; tenet 3, DEC-3523 — unknown is not zero).",
  "formula_in_words": "A purchase date on record: what is stored, read with spaces at the ends ignored, when it begins with a date written year-month-day and that date is a day the calendar has (MK-NW-F-124 maturityParts, the app's one reader of a written day) — the answer is that date; otherwise nothing: no date stored, a date written another way, or a day that does not exist, such as 31 February. Unknown is not a date: a missing date is never read as 1 January 1970 or as today."
 },
 {
  "id": "MK-PF-F-057",
  "name": "feeNotInPrice",
  "what_it_is_for": "THE FEE ON A BUY OR A SALE THAT ITS PRICE DOES NOT ALREADY CARRY, in dollars (2026-10-21).",
  "formula_in_words": "The fee on a buy or a sale that its price does not already carry, in dollars (2026-10-21): the record's fee when it is a number above zero and the record does not say the fee is inside its price; otherwise 0 — no fee on record, a fee that is not a number or not above zero, or a fee the record says is inside its price."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Cash in an account** — in this part: MK-CF-F-133, MK-CF-F-135

```json
[
 {
  "id": "MK-CF-F-118",
  "name": "cashEffect",
  "what_it_is_for": "Signed cash effect on the primary account (for display).",
  "formula_in_words": "The change in cash from one record, its amount read by the one rule for a stored amount (2026-10-21): the way the record says the money went, else its kind's own way with the sign it was stored with. Deposit: + amount; a deposit the broker sent with a minus (a reversal, stored as gone out): − amount. Sale: + shares × price × the shares in one contract the record carries (1 when it carries none; 1 contract of an option at $3.00 = $300) less the fee the price does not carry (feeNotInPrice, 2026-10-23) — the amount, when that product is zero, with no fee taken off it. Dividend, interest, coupon: + amount; 0 when reinvested. Withdrawal or fee: − amount; + amount when the record says it came in. Buy: − (shares × price × the shares in one contract the record carries + the fee the price does not carry) — 1 contract at $2.50 = −$250. Transfer: − amount; a transfer that names only one account and says it came in (a broker's journal): + amount. A deposit, withdrawal, fee, transfer, dividend, interest or coupon with no amount on record: 0. Anything else: 0."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0484",
  "decided": "2026-07-01",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "If an account is connected but someone adds transaction manually - is that allowed and how will the reconciliation between captured info from Plaid versus manual entry happen?",
  "the_log_records": "HIS QUESTION: “If an account is connected but someone adds a transaction manually — is that allowed, and how will the reconciliation between captured information work?” The question behind the later rule: both versions are shown side by side and the person chooses; nothing is merged for them.",
  "governs": "src/domain/assets/index.ts · src/domain/transactions/index.ts"
 },
 {
  "id": "DEC-2484",
  "decided": "2026-10-07",
  "type": "PROCESS",
  "tab": "networth",
  "whose": "his",
  "his_words": "all the code changes, findings and changes - for batch one and two - I approved.",
  "the_log_records": "His approval of batches 1 and 2 of the outside review of Net worth, as a whole. Each rule it approved is its own row beside this one, so it can be found and read alone.",
  "governs": "MK-NW-O-001 theBonds · MK-NW-O-002 theAccount · MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund · MK-NW-O-005 theAlternativesOutlook · MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance · MK-NW-F-003 valueFreshness · MK-NW-F-004 portfolioActualReturn · MK-NW-F-005 accountAllowsTicker · MK-NW-F-010 wrapperAccount · MK-NW-F-011 assetClassOf · MK-NW-F-012 taxTreatmentOf · MK-NW-F-016 cashTotal · MK-NW-F-017 equitiesTotal · MK-NW-F-018 fixedIncomeTotal · MK-NW-F-019 alternativesTotal · MK-NW-F-020 realEstateTotal · MK-NW-F-021 investmentsTotal · MK-NW-F-025 accountDisplayName · MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown · MK-NW-F-028 classPortionLabel · MK-NW-F-061 bondSummary · MK-NW-F-064 bondRateSensitivity · MK-NW-F-106 mortgagesByProperty · MK-NW-F-107 propertyUses · MK-NW-F-108 taxWordsOf · MK-NW-F-109 holdingClassOf · MK-CF-O-020 theBudgetCounted · MK-CF-F-139 removeShares · MK-PF-F-006 capGains · MK-XS-F-102 ingestSync · Calculation Module code/engines/time-weighted-return.ts · MK-NW-M-002 · MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-008 · MK-NW-M-013 · MK-NW-M-014 · MK-NW-M-036 · MK-NW-M-044 · MK-NW-M-064 · MK-PF-M-001 · MK-PF-M-016"
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
  "id": "DEC-7398",
  "decided": "2026-10-22",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-22 under his rulings DEC-3656 and DEC-3523 (tenet 3), made without asking him, as his order of 2026-09-30 says. Worked back, a holding's start is the shares held when the window began: today's shares, less those bought since, plus those sold since; its gain adds what the sales brought in. 20 held at $100, 10 sold at $110, 10 left at $121: gain $310, beginning $2,000 (before: $210, $2,100). Read off the screens, AAA and BND: Beginning $12,000, Wealth generated $150, Return +1.29% on all three (before: $12,050, $100, +0.91%). Sold out and bought again: $260 from $1,000 (before: $160). If an oldest-first sale may have taken a purchase inside the window that no record sizes, the start is unknown, never guessed. To reverse: stop tradesAfter reading sales. One word from him reverses it.",
  "governs": "tradesAfter and sharesThroughWindow, IDs awaiting (src/domain/performance/index.ts) · MK-NW-F-091 pricedGainOf · MK-NW-F-127 gainOfRow · MK-CF-F-139 (oldest-first sale) · MK-PF-M-013 · MK-PF-M-018"
 },
 {
  "id": "DEC-7595",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenets 1 and 5), made without asking him, as his order of 2026-09-30 says. $40,000 typed, 100 VTI inside it, 10 more bought at $100: the account read $10,000 on every screen; it reads $40,000 before and after, and the window reads Beginning $39,500, Wealth generated $500. A trade's fee leaves the account as money out. The holding editor's own promise is that a trade won't change the total typed. To reverse: put || a.cash_balance != null back in recomputeBalances and send buys and sales through bumpCash. One word from him reverses it.",
  "governs": "MK-XS-F-174 recomputeBalances (no rule entry yet) · MK-CF-F-136 bumpCash · MK-CF-F-222 tradeCash (src/domain/transactions/index.ts) · src/store/useStore.ts"
 },
 {
  "id": "DEC-7596",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-6873 and DEC-6874, made without asking him, as his order of 2026-09-30 says. 10 VTI sold at $98 with a $5 fee: the sale brings in $975, counted once on the account page, the Performance tab, the Holding page and Home (no fee could be recorded). The cash a buy needs counts its fee: 50 VTI at $100.00 is the whole $5,000, so a $5 fee makes $5,005 — refused, and said so. The record keeps fee 5 beside the price (fee in price: no). To reverse: remove the row. One word from him reverses it.",
  "governs": "the trade sheet in src/screens/AccountPortfolioScreen.tsx · MK-CF-F-118 cashEffect · MK-CF-F-111 applyTransaction"
 },
 {
  "id": "DEC-7601",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-3523 (tenets 1 and 3), made without asking him, as his order of 2026-09-30 says. Import 100 VTI (cost $8,000), then sell 10 at $98.00: realized +$180 all time (it read \"not on record\"). A purchase added in the editor, 10 VTI at $90.00 on Jan 5, 2026, then 105 sold at $100.00: +$2,050 (it read +$2,000, and 5 shares with no price paid). Each record carries its date, shares and price where on record; a missing price reads \"no price paid on record\". A re-import into a matched account writes records only for holdings that have none yet, so a purchase is never counted twice. Limits: changing or removing an existing purchase in the editor does not change its record; a re-import keeps the first file's records. To reverse: drop openingRecordsOf from addAsset, updateAsset and updatePosition. One word from him reverses it.",
  "governs": "MK-CF-F-224 openingRecordsOf (src/domain/transactions/index.ts) · addAsset, updateAsset, updatePosition (src/store/useStore.ts) · MK-PF-F-028 realizedFromLedger"
 },
 {
  "id": "DEC-7602",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his rulings DEC-0274 and DEC-4646, made without asking him, as his order of 2026-09-30 says. 1 contract bought at $2.50 costs $250 (cash moved $2.50 and the activity said \"1 share\"); 1 sold at $3.00 brings in $300, realized +$100, matched first in line to the Aug 3 contract bought at $2.00. The cash, the activity amount and the sheet's cash check all count contracts × the holding's shares per contract × price. Records made before 2026-10-23 stay at ×1, as they were applied. Limit: a ticker bought before it is held counts ×1, because the trade sheet does not ask the holding's type. To reverse: drop the stamp in recordTransaction. One word from him reverses it.",
  "governs": "MK-CF-F-223 tradeMultiplierOf (src/domain/transactions/index.ts) · the record's new field multiplier · recordTransaction (src/store/useStore.ts) · MK-CF-F-111 applyTransaction · MK-CF-F-118 cashEffect"
 },
 {
  "id": "DEC-7605",
  "decided": "2026-10-23",
  "type": "RULE",
  "tab": "performance",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-23 under his ruling DEC-3523 (tenet 4), made without asking him, as his order of 2026-09-30 says. 10 VTI bought on the trade sheet: the account page lists it under ▾ STOCKS / FUNDS $1,000 (it listed under Unclassified), and after a $5 dividend the Performance tab's category table reads Stocks / Funds earned $5. The class comes from MK-XS-F-172 assetClassForSymbol, Import's road into classifyHoldingClass, stored under its tag (holdingTagFor). To reverse: drop asset_class in addLot. One word from him reverses it.",
  "governs": "MK-XS-F-172 assetClassForSymbol · MK-CF-F-138 addLot · MK-NW-F-122 holdingTagFor"
 }
]
```
