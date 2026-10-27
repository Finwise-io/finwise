# Cash flow — part 12 of 19: Transactions — undo, labels, cash effect, income from holdings, and review flags

11 cards, so 11 formula checks and 55 cases, and one `rules_held` line for each of the 9 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 12"` in your reply.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface ReviewContext {
  /** the account's earlier transactions (any window; the function applies the 90-day cut itself) */
  history: Transaction[];
  /** payees already confirmed as known, per account (the only learning in v1) */
  knownPayees?: Record<string, string[]>;
  /** id generator (injectable for determinism in tests) */
  makeId?: () => string;
  now?: Date;
}

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

export interface TxnFlag {
  flag_id: string;
  transaction_ids: string[];      // one id, or several for a combined odd-pattern card
  account_id: string;
  reason: FlagReason;
  /** The comparison figure the rule used, stored AT FLAG TIME so the explanation never drifts:
   *  unusually_large → the typical (median) money-out; odd_pattern → the day's combined total;
   *  first_time_payee → null (the fact is the comparison). */
  comparison: number | null;
  amount: number;                 // the flagged amount (combined total for odd_pattern)
  payee: string | null;           // note text of the flagged row of activity (normalized for matching)
  date: string;                   // the transaction's date
  status: FlagStatus;
  created_at: string;
  resolved_at?: string;
}

export type TxnType =
  | 'OPENING_POSITION'   // first-time capture of a holding you already own (no cash counterparty)
  | 'OPENING_CASH'       // first-time capture of cash in an account
  | 'BUY'                // account cash ↓, position ↑
  | 'SELL'               // position ↓, account cash ↑
  | 'DEPOSIT'            // external cash in (paycheck, contribution)
  | 'WITHDRAWAL'         // cash out (spend)
  | 'TRANSFER'           // cash between accounts
  | 'TRANSFER_IN_KIND'   // whole position moved between accounts
  | 'DIVIDEND' | 'INTEREST' | 'COUPON'   // income on a holding/account (cash or reinvested)
  | 'FEE'
  | 'ADJUSTMENT';
```

## The cards

```json
[
 {
  "id": "MK-CF-F-114",
  "name": "undoSnapshot",
  "kind": "function",
  "what_it_is_for": "Deep copies of the affected accounts, taken BEFORE applyTransaction.",
  "formula_in_words": "A full copy of each account the record touches, as it stands before the record is applied.",
  "handed": "export function undoSnapshot(accounts: AssetAccount[], t: Transaction): AssetAccount[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-115",
  "name": "restoreUndo",
  "kind": "function",
  "what_it_is_for": "Restore the affected accounts to the transaction's pre-apply copies (pure).",
  "formula_in_words": "Each account the record touched is put back to the copy saved with it; the other accounts are unchanged.",
  "handed": "export function restoreUndo(accounts: AssetAccount[], t: Transaction): AssetAccount[]",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-116",
  "name": "inverseOf",
  "kind": "function",
  "what_it_is_for": "Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.",
  "formula_in_words": "The record that undoes one: a new record noting it is the reversal of the first. When the record states which way its money went (in or out), the undo states the other way — except a transfer between two accounts, which is undone by swapping its two accounts and keeps its own direction (flipping it as well would move the money a second time). A deposit → a withdrawal; a withdrawal or a fee → a deposit; a transfer between two accounts → the same transfer the other way, its two accounts swapped; a transfer out with no receiving account → a deposit; a dividend, interest or coupon paid in cash → a withdrawal; an adjustment → itself. Nothing for a buy, a sale, an opening record, a transfer of a holding or a reinvested payment.",
  "handed": "export function inverseOf(t: Transaction): Transaction | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)"
  ],
  "decisions_that_govern_it": [
   "DEC-6796",
   "DEC-6993"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-117",
  "name": "txnLabel",
  "kind": "function",
  "what_it_is_for": "What do we call this kind of row on screen?",
  "formula_in_words": "The plain name for a kind of record; the kind's own code when it has none.",
  "handed": "export function txnLabel(t: TxnType): string",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-118",
  "name": "cashEffect",
  "kind": "function",
  "what_it_is_for": "Signed cash effect on the primary account (for display).",
  "formula_in_words": "The change in cash from one record, its amount read by the one rule for a stored amount (2026-10-21): the way the record says the money went, else its kind's own way with the sign it was stored with. Deposit: + amount; a deposit the broker sent with a minus (a reversal, stored as gone out): − amount. Sale: + shares × price × the shares in one contract the record carries (1 when it carries none; 1 contract of an option at $3.00 = $300) less the fee the price does not carry (feeNotInPrice, 2026-10-23) — the amount, when that product is zero, with no fee taken off it. Dividend, interest, coupon: + amount; 0 when reinvested. Withdrawal or fee: − amount; + amount when the record says it came in. Buy: − (shares × price × the shares in one contract the record carries + the fee the price does not carry) — 1 contract at $2.50 = −$250. Transfer: − amount; a transfer that names only one account and says it came in (a broker's journal): + amount. A deposit, withdrawal, fee, transfer, dividend, interest or coupon with no amount on record: 0. Anything else: 0.",
  "handed": "export function cashEffect(t: Transaction): number",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ],
  "decisions_that_govern_it": [
   "DEC-7596",
   "DEC-7602"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-119",
  "name": "investmentIncomeAnnual",
  "kind": "function",
  "what_it_is_for": "Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds the Income module.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date a year ago), not reinvested, added — each counted as the money it moved into the account: when the record says which way the money went, its size, minus when it left (a reversed payment takes away what it had added); otherwise its amount with the sign it was stored with; a record whose amount is not on record (missing, blank or not a number) adds nothing.",
  "handed": "export function investmentIncomeAnnual(txns: Transaction[], now: Date = new Date()): number",
  "inputs_it_reads": [
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ],
  "decisions_that_govern_it": [
   "DEC-6796"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-108",
  "name": "isMoneyOut",
  "kind": "function",
  "what_it_is_for": "Money leaves the account: withdrawals, fees, and transfers with no recognized counter-account.",
  "formula_in_words": "For a withdrawal, a fee, or a transfer with no receiving account on record: true, unless the money the record moved into the account is known and above zero — a fee refund, a withdrawal stored as money that came in, or a journal into this account is not money out. The money moved into the account is read as everywhere else: when the record says which way the money went, its size, minus when it left; otherwise its amount with the sign it was stored with (a withdrawal or a fee moves its amount out, a transfer moves its amount out of the account it is written on). A record whose amount is not on record is read by its kind: money out. False for every other kind of record.",
  "handed": "export function isMoneyOut(t: Transaction): boolean",
  "decisions_that_govern_it": [
   "DEC-6796"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-131",
  "name": "normPayee",
  "kind": "function",
  "what_it_is_for": "Tidies a payee's name so two can be compared: trims the spaces and puts it in lower case.",
  "formula_in_words": "The payee note trimmed and lower-cased; empty when there is none.",
  "handed": "const normPayee = (note?: string | null)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-162",
  "name": "daysApart",
  "kind": "function",
  "what_it_is_for": "How many days lie between two dates, whichever comes first.",
  "formula_in_words": "The gap between two dates in days, never negative.",
  "handed": "const daysApart = (a: string, b: string)",
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-109",
  "name": "reviewTransactions",
  "kind": "function",
  "what_it_is_for": "Review new transactions against an account's history.",
  "formula_in_words": "Flags, in this order; a record is flagged once. (1) Possible duplicate — any new money-out above zero that has an earlier one on the same account with the same amount (within half a cent) and the same payee, 2 days apart or less. (2) For money-out from a LINKED account only — unusually large: with 5 or more money-outs on that account within 90 days of it, at least 3 × their middle value AND at least $500; with fewer than 5, at least $1,000. (3) Otherwise first-time payee — a payee not seen on that account in those 90 days and not on the known list, for $250 or more. (4) Odd pattern — 3 or more money-outs from one account on one day (the new unflagged ones plus earlier ones that day) adding to $1,000 or more.",
  "handed": "export function reviewTransactions(newOnes: Transaction[], ctx: ReviewContext): TxnFlag[]",
  "inputs_it_reads": [
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-010 transaction words (the institution's own wording)",
   "MK-XS-I-024 logged expenses"
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0317",
    "date": "2026-08-20",
    "words": "the Plaid overlap — both versions side by side, the person chooses per transaction; stable pair identity; unmatched rows kept and flagged"
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0317"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-110",
  "name": "flagComparisonText",
  "kind": "function",
  "what_it_is_for": "The plain-English comparison sentence for the detail view — fixed, human-reviewed templates.",
  "formula_in_words": "The sentence for a flag. Unusually large, with a typical figure: it names the typical amount in whole dollars and how many times larger this one is, rounded to a whole number; with none: it says anything over $1,000 is looked at twice. First-time payee and possible duplicate each have a fixed sentence. Several in one day: it names how many and their total in whole dollars.",
  "handed": "export function flagComparisonText(f: TxnFlag): string",
  "inputs_it_reads": [
   "MK-XS-I-010 transaction words (the institution's own wording)"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 }
]
```

## Formulas these cards lean on

1 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
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

**Days between two dates** — in this part: MK-CF-F-162

```json
[
 {
  "id": "MK-CF-F-160",
  "name": "daysBetweenDates",
  "what_it_is_for": "The number of whole days from one date to another.",
  "formula_in_words": "The second date − the first, in days, rounded to the nearest whole day."
 }
]
```

**Money paid out by accounts — dividends and interest** — in this part: MK-CF-F-119

```json
[
 {
  "id": "MK-CF-F-183",
  "name": "paidOutByAccount",
  "what_it_is_for": "What each account actually PAID OUT in the last year, by account.",
  "formula_in_words": "Dividends, interest and coupons dated within the last year (on or after the same date last year), not reinvested, and naming an account, added by account — each counted as the money it moved into the account: when the record says which way the money went, its size, minus when it left (a reversed payment takes away what it had added); otherwise its amount with the sign it was stored with; a record whose amount is not on record (missing, blank or not a number) adds nothing. A record that names no account is not counted."
 },
 {
  "id": "MK-CF-F-184",
  "name": "incomeFromAccounts",
  "what_it_is_for": "One line per account that pays something, and the total.",
  "formula_in_words": "For each account, the first that applies. (1) It paid out more than zero over the trailing twelve months (paidOutByAccount): that amount, said as paid out over the trailing twelve months. (2) A bond or CD, by the one rule for its year of interest (yearlyInterestNow): no rate entered → $0, said so (owner A46), marked as assumed; a rate but no year's interest — a bond with a maturity date and no face value — → $0, said to be the face value not entered, marked as assumed; past its maturity date → $0, said to be matured on that date; a face value entered → the rate × the face value; otherwise (a CD bought from the bank typed by its balance, or a bond fund) → the rate × the balance. (3) Cash with a rate above zero: rate × balance. (4) Any other account with a balance above zero is named as not counted; foreign currency is skipped. Yearly income = the rows added."
 }
]
```

**Cash in an account** — in this part: MK-CF-F-118

```json
[
 {
  "id": "MK-CF-F-133",
  "name": "cashOf",
  "what_it_is_for": "The uninvested cash held inside an account, or zero when none is recorded.",
  "formula_in_words": "The account's cash; 0 when none is recorded."
 },
 {
  "id": "MK-CF-F-135",
  "name": "availableCash",
  "what_it_is_for": "The cash an account can spend right now: the uninvested cash inside an investment account, or the whole balance of a bank account.",
  "formula_in_words": "A bank account or a property (held as cash or property, or its class is cash): its balance. Any other — an investment account: its cash. NOTHING (not entered) when that figure was never entered or is not a number (2026-10-21, DEC-3279e: an investment account's cash never entered read $0, and a buy was refused on it)."
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0317",
  "decided": "2026-08-20",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "the Plaid overlap — both versions side by side, the person chooses per transaction; stable pair identity; unmatched rows kept and flagged",
  "the_log_records": "“the Plaid overlap — both versions side by side, the person chooses per transaction; stable pair identity; unmatched rows kept and flagged.” Where an imported transaction and one you entered look like the same thing, BOTH are shown and you choose. Nothing is merged for you, and nothing is silently dropped.",
  "governs": "MK-CF-F-109 reviewTransactions (src/domain/transactions/flags.ts) · src/services/sync/snaptrade.ts (a stable row identity, so a re-sync never doubles money)"
 },
 {
  "id": "DEC-0461",
  "decided": "2026-07-01",
  "type": "RULE",
  "tab": "home",
  "whose": "his",
  "his_words": "How are response formulated? Are we using LLM or theseare pre-crafted responses and app uses one the pre-crafted response just replacing $$$?",
  "the_log_records": "HIS QUESTION: “How are responses formulated? Are we using LLM or are these pre-crafted responses where the app just replaces the figures?” A fair thing to ask of anything that reads like advice.",
  "governs": "src/domain/transactions/flags.ts · MoneyKeel/functions/networth-and-performance/performance.ts"
 },
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
  "id": "DEC-6993",
  "decided": "2026-10-21",
  "type": "RULE",
  "tab": "networth",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-21 under his rulings DEC-3523 (tenet 1, a wrong number ends trust), made without asking him, as his order of 2026-09-30 says. Undoing a $500 transfer swapped the accounts and also flipped the direction, so the two cancelled and the $500 moved a second time. Now a transfer's undo swaps the accounts and keeps the direction; every other kind flips its direction. All 17 kinds, applied then undone, give the starting balances to the cent. One word from him reverses it.",
  "governs": "MK-CF-F-116 inverseOf (src/domain/transactions) · the store's delete"
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
 }
]
```
