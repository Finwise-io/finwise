// Transaction ledger — the append-only history + a pure function that applies a transaction to accounts.
// State model = "balance + statement": accounts hold live cash/positions for display, and every change
// also appends an immutable Transaction (here) for audit/history. applyTransaction is pure + tested.
import type { EntityId, UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { assetClassOf, holdingTagFor, holdingClassOf, type AssetAccount } from '../assets';
import { assetClassForSymbol } from '../import/holdingsImport';   // the one road a ticker takes to its class (MK-XS-F-172, 2026-10-23)
import { totalShares, purchaseDateOnRecord, contractMultiplier, type Position } from '../performance';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { feeNotInPrice } from '../performance/realized';   // the one reading of a trade's fee its price does not carry (2026-10-23)

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
  | 'ADJUSTMENT';   // broker split/adjustment (SnapTrade v2): a visible history row — touches NOTHING

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
  /** THE PURCHASE AN OPENING RECORD IS OF (2026-10-27, FX-PF, workplan #293): the lot's own identifier, written by openingRecordsOf,
   *  so an edit or a removal of that purchase in the holding editor changes or removes its record. Absent on records written
   *  before 2026-10-27: those are matched to their purchase by its date, shares and price paid (purchaseRecordsFollowEdit). */
  lot_id?: EntityId;
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

/** Applies one change to the one account named and leaves every other account as it was. */
/* ─ MK-CF-F-132 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * map
 *
 * Answers ..... Applies one change to the one account named and leaves every other account as it was.
 *
 * Formula .....
 *     asset account) =>
 *
 * Called by ... MK-CF-F-008 spendByMonth · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-014 budgetVsActual · MK-CF-F-019 upcomingBills
 *               MK-CF-F-034 payoffPlan · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-064 equityCashFlow · MK-CF-F-065 equityVestWeights
 *               MK-CF-F-067 rentalList · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-F-109 reviewTransactions
 *               MK-CF-F-111 applyTransaction · MK-CF-F-114 undoSnapshot
 *               MK-CF-F-115 restoreUndo · MK-CF-F-138 addLot
 *               MK-CF-F-139 removeShares · MK-CF-F-142 monthsOf
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-149 recurringDebtPayments
 *               MK-CF-F-156 plannedMonthFlow · MK-CF-F-168 salaryWindow
 *               MK-CF-F-176 sumMonthsOverEarners · MK-CF-F-177 wageGrossByMonth
 *               MK-CF-F-206 householdK401ByMonth · MK-CF-F-224 openingRecordsOf
 *               MK-CF-F-231 addedAfterRecord · MK-CF-F-232 balanceByDay
 *               MK-CF-F-233 earnerWageShares · MK-CF-F-234 wagesLandingByMonth
 *               MK-CF-F-246 expensesAsCounted · MK-CF-F-251 debtPaymentsMatched
 *               MK-CF-F-252 payoffRefusal · MK-CF-F-255 spendByMonthByCategory
 *               MK-CF-F-256 budgetEditorBuckets · MK-CF-F-264 interestAndDividendsForYear
 *               MK-CF-F-286 monthBeforeAnyRecord · MK-CF-F-289 purchaseRecordsFollowEdit
 *               MK-CF-F-290 purchaseRecordsAfterHoldingRemoved · MK-CF-F-291 purchaseRecordsFollowReimport
 *               MK-CF-F-292 optionTradesOnTheWayIn · MK-CF-F-295 debtLoad
 *               MK-CF-F-300 loanStartsOn · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-305 setupLoanDebts · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary · MK-CF-O-008 whatsComing
 *               MK-CF-O-010 theMonth · MK-CF-O-018 theDebts
 *               MK-CF-O-019 theIncomeManager · MK-CF-O-020 theBudgetCounted
 *               MK-HM-F-001 buildInsights · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-026 accountDisplayNames · MK-NW-F-027 accountClassBreakdown
 *               MK-NW-F-039 buildAssetsState · MK-NW-F-046 historyCoverage
 *               MK-NW-F-048 uberGroupRows · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-054 reclassifyAccounts · MK-NW-F-061 bondSummary
 *               MK-NW-F-068 prettyDay · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-090 windowStartKey · MK-NW-F-092 investmentAccountIdsOf
 *               MK-NW-F-094 ledgerGroups · MK-NW-F-103 investmentRecordDates
 *               MK-NW-F-104 closedWith · MK-NW-F-106 mortgagesByProperty
 *               MK-NW-F-116 rentedIdsOf · MK-NW-F-130 notIncludedSentence
 *               MK-NW-F-134 carValueNotEnteredNotes · MK-NW-F-135 earmarkLeavesOut
 *               MK-NW-F-138 knownHoldingsReturn · MK-NW-F-142 classReturnOf
 *               MK-NW-F-149 withoutBlankRows · MK-NW-F-166 series
 *               MK-NW-F-170 incomeSumParts · MK-NW-F-180 barSegments
 *               MK-NW-F-181 barDrawnWidths · MK-NW-F-188 howReturnCalculated
 *               MK-NW-O-001 theBonds · MK-NW-O-002 theAccount
 *               MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund
 *               MK-NW-O-005 theAlternativesOutlook · MK-NW-O-006 theHolding
 *               MK-NW-O-008 thePerformance · MK-PF-F-006 capGains
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-014 buildPerformance
 *               MK-PF-F-020 portfolioBenchReturn · MK-PF-F-045 priceHistoryShortSentence
 *               MK-PF-F-065 firstDatedPurchase · MK-PF-F-067 purchaseDays
 *               MK-PF-F-071 returnSplitAtPurchases · MK-PF-F-074 marketSplitAtPurchases
 *               MK-PF-F-075 soldOutPositions · MK-PF-F-076 firstEvent
 *               MK-PL-F-004 withdrawalOrder · MK-PL-F-009 rmdTakenThisYear
 *               MK-PL-F-011 buildGoalsState · MK-PL-F-013 goalsFromOnboarding
 *               MK-PL-F-016 availableToSaveSummary · MK-PL-F-018 monthsUntil
 *               MK-PL-F-031 taxOrganizer · MK-PL-F-037 trimHints
 *               MK-PL-F-046 leverDeltas · MK-PL-F-050 simulate
 *               MK-PL-F-055 projectNestEgg · MK-PL-F-067 willItLastInputs
 *               MK-PL-F-094 planGoalRows · MK-PL-F-096 accountsAfterRothConversion
 *               MK-PL-F-098 goalsCapacity · MK-ST-F-002 monthWords
 *               MK-ST-F-003 dayWords · MK-ST-F-010 nameEvidence
 *               MK-ST-F-016 totalOf · MK-ST-F-020 sumSigned
 *               MK-ST-F-022 reconcileAccountTotal · MK-ST-F-029 prune
 *               MK-ST-F-061 isMonthEnd · MK-ST-F-073 rebuildDays
 *               MK-ST-F-078 dateShown · MK-ST-F-084 fillBetweenObservations
 *               MK-ST-F-093 typedValueOnItsDate · MK-ST-F-097 localMoment
 *               MK-XS-F-002 dataGaps · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-005 trendPoints · MK-XS-F-009 readHistory
 *               MK-XS-F-015 importHoldings · MK-XS-F-028 surplusByMonth
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-058 parseReceipt
 *               MK-XS-F-083 fetchPriceSeries · MK-XS-F-094 parseReceiptText
 *               MK-XS-F-102 ingestSync · MK-XS-F-103 confirmWrapper
 *               MK-XS-F-105 mapPosition · MK-XS-F-111 mergeHistoryFrom
 *               MK-XS-F-116 runSnapTradeSync · MK-XS-F-129 findHeaderRow
 *               MK-XS-F-146 prettyExpiry · MK-XS-F-174 recomputeBalances
 *               MK-XS-F-177 useCategorySpend · MK-XS-F-181 merge
 *               MK-XS-F-187 fixStoredMoney · MK-XS-F-188 fixStoredFees
 *               MK-XS-F-190 bondQuoteBasis · MK-XS-F-193 walkShown
 *               MK-XS-F-194 partsShown · MK-XS-F-195 monthShown
 *               MK-XS-F-197 chainShown · MK-XS-F-199 profileOnTheWayIn
 *               MK-XS-F-204 centsShown · MK-XS-F-217 fileAccountOf
 *               MK-XS-F-219 importedAccountOf · MK-XS-F-221 valueOnlyAccountsOf
 *
 * Reaches ..... 545 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 527 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-132
 * Changed ..... not in git yet (—)
 */
const map = (accs: AssetAccount[], id: EntityId, fn: (a: AssetAccount) => AssetAccount) =>
  accs.map((a) => (a.asset_id === id ? fn(a) : a));

/** The uninvested cash held inside an account, or zero when none is recorded. */
/* ─ MK-CF-F-133 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cashOf
 *
 * Answers ..... The uninvested cash held inside an account, or zero when none is recorded.
 *
 * Formula .....
 *     cash balance (or 0 when missing or zero)
 *
 * Called by ... MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-ST-F-073 rebuildDays
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If cash balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-133
 * Changed ..... not in git yet (—)
 */
const cashOf = (a: AssetAccount) => a.cash_balance || 0;
// Where an account's spendable cash lives: investment accounts use the cash_balance SLEEVE; cash
// accounts (checking/savings) and property hold their money in `balance`. Moving cash must hit the
// right field, or a transfer/deposit on a savings account corrupts net worth.
// The sleeve exists ONLY on ledger-managed accounts (derive_balance, or a sleeve already present) —
// the SAME rule recomputeBalances uses. Bumping a phantom sleeve on a manual-balance IRA made
// recompute REPLACE the entered $310k with the sleeve's −$5k (P1, caught by the RMD screen's test).
/* ─ MK-CF-F-134 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * usesSleeve
 *
 * Answers ..... Where an account's spendable cash lives: investment accounts use the cash_balance SLEEVE; cash accounts (checking/savings) and property hold their money in `balance`.
 *
 * Formula .....
 *     tax bucket ! = 'CASH' and tax bucket ! = 'PROPERTY'
 *
 * Called by ... MK-CF-F-136 bumpCash · MK-CF-F-222 tradeCash
 *               MK-CF-F-292 optionTradesOnTheWayIn
 *
 * Reaches ..... 489 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 471 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-134
 * Changed ..... not in git yet (—)
 */
const usesSleeve = (a: AssetAccount) => a.tax_bucket !== 'CASH' && a.tax_bucket !== 'PROPERTY'
  && (a.derive_balance === true || a.cash_balance != null);

/** The cash an account can spend right now: the uninvested cash inside an investment account, or the whole balance of a bank account. */
// CASH THAT WAS NEVER ENTERED IS NOT $0 (2026-10-21; DEC-3279e, DEC-3523 tenet 3; outside re-run OpenAI part 1,
// MK-PF-M-020): an investment account whose cash was never entered read "Available cash: $0" and a buy was refused as
// not enough — and one with no cash figure at all offered its whole value as cash. A bank account (or a property) holds
// its money in its balance; an investment account's cash is its cash figure, and with none on record it is unknown
// (null), which the sheet shows as not entered and does not refuse on.
// A RUNNING FIGURE THE APP OPENED IS NOT CASH ENTERED (2026-10-25; tenet 3, the lead's ruling on the outside review's open
// question, CFR-3): an account built from imported holdings, its cash never entered, read "Available cash: not entered" until a
// $1,000 buy, then "−$1,000 ⚠ not enough" — and the next buy was refused on a figure the person never gave. The app keeps that
// running figure (cash_not_entered marks it) so the total stays right, and reads it here as not entered. A linked account's
// cash is the broker's own figure, written at every sync, so the mark is not read there. To reverse: drop the cash_not_entered line.
/* ─ MK-CF-F-135 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * availableCash
 *
 * Answers ..... The cash an account can spend right now: the uninvested cash inside an investment account, or the whole balance of a bank account.
 *
 * Formula .....
 *     known = (v: number | nothing | undefined) => (v ≠ nothing and number.is finite(v) ? v : nothing)
 *     known(balance)   when tax bucket = 'CASH' (or tax bucket = 'PROPERTY' (or asset class of(a) = 'cash' when missing or zero) when missing or zero)
 *     nothing   when cash not entered = true and source ! = 'connected'
 *     the answer = known(cash balance)
 *
 * Called by ... MK-CF-F-136 bumpCash · MK-NW-F-088 BENCH
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-077 that an account's cash was never entered — the cash figure is activity since the import or since it was added
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-135
 * Changed ..... not in git yet (—)
 */
const availableCash = (a: AssetAccount): number | null => {
  const known = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : null);
  if (a.tax_bucket === 'CASH' || a.tax_bucket === 'PROPERTY' || assetClassOf(a) === 'cash') return known(a.balance);
  if (a.cash_not_entered === true && a.source !== 'connected') return null;
  return known(a.cash_balance);
};

/** Adds cash to an account, or takes it out, in the right place: the uninvested cash of an investment account, or the balance of a bank account. */
/* ─ MK-CF-F-136 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * bumpCash
 *
 * Answers ..... Adds cash to an account, or takes it out, in the right place: the uninvested cash of an investment account, or the balance of a bank account.
 *
 * Formula .....
 *     cash = ...a = ...a
 *     cash balance = (cash balance or 0) + delta
 *     ...(a.cash balance == null ? { cash not entered: true as const } : {}) = ...(a.cash balance == null ? { cash not entered: true as const } : {})
 *     the answer:
 *     cash   if derive balance = true (or source = 'connected' when missing or zero)
 *     ...cash = ...cash
 *     balance = (balance or 0) + delta   otherwise
 *     itemised = (positions.length ?? 0) > 0 and tax bucket ! = 'CASH' and tax bucket ! = 'PROPERTY'
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-077 that an account's cash was never entered — the cash figure is activity since the import or since it was added
 *
 * Decides .....
 *     · If length is missing it uses 0.
 *     · If cash balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-136
 * Changed ..... not in git yet (—)
 */
function bumpCash(a: AssetAccount, delta: number): AssetAccount {
  // A TOTAL THE PERSON TYPED MOVES BY THE MONEY, ITS CASH WITH IT (2026-10-23, E2E-57; tenet 1). Only an account built from its
  // holdings (derive_balance) has its balance rebuilt from cash and holdings; a typed total with a cash figure of its own is
  // never rebuilt (recomputeBalances), so the money that comes in or goes out moves the total here. A linked account's total is
  // the broker's, and stays as it was.
  // A CASH FIGURE OPENED HERE, FROM NOTHING ON RECORD, IS MARKED NOT ENTERED (2026-10-25, cash_not_entered; tenet 3): the
  // figure keeps the total right, but it started from nothing, so it is not the cash the account holds (availableCash)
  if (usesSleeve(a)) {
    const cash = { ...a, cash_balance: ((a.cash_balance || 0) + delta), ...(a.cash_balance == null ? { cash_not_entered: true as const } : {}) };
    return a.derive_balance === true || a.source === 'connected' ? cash : { ...cash, balance: ((a.balance || 0) + delta) };
  }
  // FOUNDER FINDING 2026-08-11 ("$500 is what I added manually as a deposit — it never asked if it
  // was cash or something else"): an account that ITEMISES its holdings but whose broker never sent
  // a cash figure had no sleeve, so a deposit only inflated the total. The holdings could then no
  // longer explain the total, and the unexplained difference was inferred elsewhere — which is how
  // $500 of deposited money ended up counted as more CDs.
  //
  // Money arriving in an investment account IS settlement cash — that is what happens at the broker,
  // and it is why we never need to ask: it sits as cash until a purchase moves it into a holding.
  // So open the sleeve and put it there, and raise the stated total by the same amount.
  const itemised = (a.positions?.length ?? 0) > 0 && a.tax_bucket !== 'CASH' && a.tax_bucket !== 'PROPERTY';
  if (itemised) {
    return {
      ...a,
      cash_balance: ((a.cash_balance || 0) + delta),
      balance: ((a.balance || 0) + delta),
      cash_not_entered: true as const,   // opened from nothing on record (2026-10-25): the deposit landed as cash; the cash held is not known
    };
  }
  return { ...a, balance: ((a.balance || 0) + delta) };
}

// WHAT A BUY OR A SALE DOES TO AN ACCOUNT'S CASH AND ITS TOTAL (2026-10-23, E2E-57 and E2E-58; tenets 1 and 3). A trade moves money
//  between the cash and a holding INSIDE the account, so it never changes a total the person typed; only its fee leaves the
//  account. `gross` is what the shares cost (−) or brought in (+) at the price; `fee` is the fee the price does not carry.
//    · an account that keeps its own cash: the cash moves by gross − fee; a typed total moves by −fee; one built from its
//      holdings is rebuilt from them (recomputeBalances); a linked account's total stays the broker's;
//    · an account whose cash was never entered: the cash stays not entered — it is not opened at minus the cost (that made
//      the account look built from its holdings and rebuilt a $40,000 typed total to the $10,000 of holdings listed in it);
//      a typed total moves by −fee, a linked one not at all.
//  Before: a buy went through bumpCash, which opened a cash figure of −$1,000 on a typed $40,000 account, and the next rebuild
//  read cash plus holdings — $10,000. Example: 10 VTI bought at $100 with a $5 fee in a $40,000 typed account holding 100 VTI
//  and no cash entered: the total reads $39,995 and 110 VTI.
/** Moves the money of a buy or a sale between an account's cash and the holding it bought or sold, inside the account, and takes the trade's own fee out of it. */
/* ─ MK-CF-F-222 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * tradeCash
 *
 * Answers ..... WHAT A BUY OR A SALE DOES TO AN ACCOUNT'S CASH AND ITS TOTAL (2026-10-23, E2E-57 and E2E-58; tenets 1 and 3).
 *
 * Formula .....
 *     typed = derive balance ! = true and source ! = 'connected'
 *     out = ...a = ...a
 *     cash balance = (cash balance or 0) + gross − fee
 *     ...(a.cash balance == null ? { cash not entered: true as const } : {}) = ...(a.cash balance == null ? { cash not entered: true as const } : {})
 *     the answer:
 *     ...out = ...out
 *     balance = (balance or 0) − fee   if typed
 *     out   otherwise
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-XS-F-174 recomputeBalances
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-077 that an account's cash was never entered — the cash figure is activity since the import or since it was added
 *
 * Decides .....
 *     · If cash balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-222
 * Changed ..... not in git yet (—)
 */
function tradeCash(a: AssetAccount, gross: number, fee: number): AssetAccount {
  const typed = a.derive_balance !== true && a.source !== 'connected';
  if (usesSleeve(a)) {
    // an account built from its holdings whose cash was never entered: the figure opened here keeps the total right and is
    // marked not entered (2026-10-25, cash_not_entered; tenet 3) — "−$1,000" was read as the cash it holds and refused a buy
    const out = { ...a, cash_balance: ((a.cash_balance || 0) + gross - fee), ...(a.cash_balance == null ? { cash_not_entered: true as const } : {}) };
    return typed ? { ...out, balance: ((a.balance || 0) - fee) } : out;
  }
  return typed && fee > 0 ? { ...a, balance: ((a.balance || 0) - fee) } : a;
}

// THE SHARES PER CONTRACT A BUY OR A SALE TRADES (2026-10-23; DEC-0274, DEC-4646): the holding it trades, found as applyTransaction
// finds it, read through the one multiplier (contractMultiplier) — 100 for an option unless its "Shares per contract" says
// otherwise, 1 for anything else. recordTransaction stamps it on the record.
// A TICKER THE ACCOUNT DOES NOT HOLD YET IS READ FROM THE RECORD (2026-10-25; outside review MK-CF-F-223-C05, DEC-7602's limit):
// the trade sheet now asks its type and, for an option, its shares per contract, and the record carries both (kind,
// multiplier); the same one multiplier reads them. A first buy of 1 option contract at $2.50 moved $2.50 — it moves $250.
// A record that names no type counts 1. To reverse: return 1 when the account does not hold the ticker.
/** Says how many shares one unit of a buy or a sale stands for: an option contract's shares, else 1. */
/* ─ MK-CF-F-223 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * tradeMultiplierOf
 *
 * Answers ..... THE SHARES PER CONTRACT A BUY OR A SALE TRADES (2026-10-23; DEC-0274, DEC-4646): the holding it trades, found as applyTransaction finds it, read through the one multiplier (contractMultiplier) — 100 for an option unless its "Shares per contract" says otherwise, 1 for anything else.
 *
 * Formula .....
 *     1   when type ! = 'BUY' and type ! = 'SELL'
 *     a = accounts.find((x) => asset id = account id)
 *     pos = find pos(a, t as transaction)   if a
 *     undefined   otherwise
 *     the answer = contract multiplier(pos ?? { kind: kind, multiplier: multiplier })
 *
 * Called by ... MK-CF-F-292 optionTradesOnTheWayIn · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-223
 * Changed ..... not in git yet (—)
 */
export function tradeMultiplierOf(accounts: AssetAccount[], t: Pick<Transaction, 'type' | 'account_id' | 'ticker' | 'position_id' | 'kind' | 'multiplier'>): number {
  if (t.type !== 'BUY' && t.type !== 'SELL') return 1;
  const a = accounts.find((x) => x.asset_id === t.account_id);
  const pos = a ? findPos(a, t as Transaction) : undefined;
  return contractMultiplier(pos ?? { kind: t.kind, multiplier: t.multiplier });
}

// THE PURCHASE RECORDS OF HOLDINGS YOU ALREADY OWN (2026-10-23, F3 of the Performance journey suite): one "Opening holding" per
// purchase — its date, its shares and its price paid where on record (a cost not on record gives the row no price, read as
// "no price paid on record"). addPosition wrote these; Import holdings and a purchase added in the holding editor wrote none,
// so a sale recorded later read "Realized from sales: not on record" beside purchases listed with their price.
/** Writes the record of each purchase of a holding you already own, as the activity list and the realized gain read them. */
/* ─ MK-CF-F-224 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * openingRecordsOf
 *
 * Answers ..... THE PURCHASE RECORDS OF HOLDINGS YOU ALREADY OWN (2026-10-23, F3 of the Performance journey suite): one "Opening holding" per purchase — its date, its shares and its price paid where on record (a cost not on record gives the row no price, read as "no price paid on record").
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-288 openingRecordsHeld · MK-CF-F-289 purchaseRecordsFollowEdit
 *               MK-CF-F-291 purchaseRecordsFollowReimport · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-288 openingRecordsHeld · MK-XS-F-199 profileOnTheWayIn
 *               MK-CF-F-290 purchaseRecordsAfterHoldingRemoved · MK-CF-F-289 purchaseRecordsFollowEdit
 *               MK-CF-F-291 purchaseRecordsFollowReimport
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-224
 * Changed ..... not in git yet (—)
 */
export function openingRecordsOf(accountId: EntityId, position: Position, lots: Position['lots'] = position.lots ?? []): Transaction[] {
  return lots.map((l) => makeTransaction({ date: l.purchase_date, type: 'OPENING_POSITION', account_id: accountId, position_id: position.position_id,
    ticker: position.ticker, kind: position.kind, shares: l.shares, price: l.cost_per_share ?? undefined, ...(l.lot_id != null ? { lot_id: l.lot_id } : {}) }));
}

/** Whether an opening record was written for this purchase: by its lot's identifier, or — a record written before 2026-10-27,
 *  which carries none — by the purchase's own date, shares and price paid, as openingRecordsOf wrote them. */
/* ─ MK-CF-F-287 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isRecordOfLot
 *
 * Answers ..... Whether an opening record was written for this purchase: by its lot's identifier, or — a record written before 2026-10-27, which carries none — by the purchase's own date, shares and price paid, as openingRecordsOf wrote them.
 *
 * Formula .....
 *     (lot id ≠ nothing ? lot id = lot id
 *
 * Called by ... MK-CF-F-289 purchaseRecordsFollowEdit
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-289 purchaseRecordsFollowEdit
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-287
 * Changed ..... not in git yet (—)
 */
const isRecordOfLot = (t: Transaction, l: Position['lots'][number]): boolean => (t.lot_id != null ? t.lot_id === l.lot_id
  : String(t.date ?? '') === String(l.purchase_date ?? '') && (t.shares ?? null) === (l.shares ?? null) && (t.price ?? null) === (l.cost_per_share ?? null));

/** A HOLDING'S OWN OPENING RECORDS IN ONE ACCOUNT — the ones written for purchases you already owned (addPosition, Add an account,
 *  Import holdings, the holding editor), never a broker's (a linked account's records are its sync's). */
/* ─ MK-CF-F-288 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * openingRecordsHeld
 *
 * Answers ..... A HOLDING'S OWN OPENING RECORDS IN ONE ACCOUNT — the ones written for purchases you already owned (addPosition, Add an account, Import holdings, the holding editor), never a broker's (a linked account's records are its sync's).
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-289 purchaseRecordsFollowEdit · MK-CF-F-290 purchaseRecordsAfterHoldingRemoved
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-290 purchaseRecordsAfterHoldingRemoved
 *               MK-CF-F-289 purchaseRecordsFollowEdit
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-288
 * Changed ..... not in git yet (—)
 */
const openingRecordsHeld = (transactions: Transaction[], accountId: EntityId, p: Pick<Position, 'position_id' | 'ticker'>) =>
  (transactions ?? []).filter((t) => t.type === 'OPENING_POSITION' && t.source !== 'connected' && String(t.account_id) === String(accountId)
    && (t.position_id != null ? String(t.position_id) === String(p.position_id) : String(t.ticker ?? '').toUpperCase() === String(p.ticker ?? '').toUpperCase()));

/** THE PURCHASE RECORDS FOLLOW THE HOLDING EDITOR (2026-10-27, FX-PF, workplan #293; DEC-7601's own limit; tenet 4: one purchase,
 *  one figure). A purchase added writes its record (openingRecordsOf, as before); one CHANGED rewrites its record's date, shares and
 *  price paid; one REMOVED removes its record. 10 VTI at $90.00 added Jan 5, 2026, its price changed to $95.00 in the editor: its
 *  record reads $95.00 and a later sale's gain is read from $95.00 — it read $90.00. A record written before 2026-10-27 is found by
 *  the purchase's old date, shares and price, and is given the purchase's identifier as it is rewritten. Records of trades (a
 *  buy or a sale) are never touched: they moved cash, and are changed on their own sheet. To reverse: drop the changed and
 *  removed steps. */
/* ─ MK-CF-F-289 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * purchaseRecordsFollowEdit
 *
 * Answers ..... THE PURCHASE RECORDS FOLLOW THE HOLDING EDITOR (2026-10-27, FX-PF, workplan #293; DEC-7601's own limit; tenet 4: one purchase, one figure).
 *
 * Formula .....
 *     mine = opening records held(transactions, account id, before)
 *     claimed = new map<string, transaction>()
 *     r = mine.find((t) => !claimed.has(id) and is record of lot(t, l))
 *     the answer = r
 *     after lots = a lookup of for each of after.lots (or none when missing): [string(lot id), each]
 *     rewrite = new map<string, transaction | nothing>()
 *     r = record of(l)
 *     now = after lots.get(string(lot id))
 *     had = a list with no repeats of for each of before.lots (or none when missing): string(lot id)
 *     added = after.lots (or none when missing) where !had.has(string(lot id))
 *     kept = (transactions ?? []).flat map((t) => (rewrite.has(id) ? (rewrite.get(id) ? [rewrite.get(id)!] : []) : [t]))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-289
 * Changed ..... not in git yet (—)
 */
export function purchaseRecordsFollowEdit(transactions: Transaction[], accountId: EntityId, before: Position, after: Position): Transaction[] {
  const mine = openingRecordsHeld(transactions, accountId, before);
  const claimed = new Map<string, Transaction>();   // record id → the purchase it is of, one record to one purchase
  const recordOf = (l: Position['lots'][number]) => {
    const r = mine.find((t) => !claimed.has(t.id) && isRecordOfLot(t, l));
    if (r) claimed.set(r.id, r);
    return r;
  };
  const afterLots = new Map((after.lots ?? []).map((l) => [String(l.lot_id), l]));
  const rewrite = new Map<string, Transaction | null>();   // record id → its new form, or null to remove it
  for (const l of before.lots ?? []) {
    const r = recordOf(l);
    if (!r) continue;
    const now = afterLots.get(String(l.lot_id));
    if (!now) { rewrite.set(r.id, null); continue; }
    const same = (r.lot_id != null) && String(r.date ?? '') === String(now.purchase_date ?? '') && (r.shares ?? null) === (now.shares ?? null)
      && (r.price ?? null) === (now.cost_per_share ?? null);
    if (!same) rewrite.set(r.id, { ...r, date: now.purchase_date, shares: now.shares, price: now.cost_per_share ?? undefined, lot_id: now.lot_id,
      position_id: after.position_id, ticker: after.ticker?.toUpperCase(), kind: after.kind });
  }
  const had = new Set((before.lots ?? []).map((l) => String(l.lot_id)));
  const added = (after.lots ?? []).filter((l) => !had.has(String(l.lot_id)));
  const kept = (transactions ?? []).flatMap((t) => (rewrite.has(t.id) ? (rewrite.get(t.id) ? [rewrite.get(t.id)!] : []) : [t]));
  return [...openingRecordsOf(accountId, after, added), ...kept];
}

/** A HOLDING REMOVED TAKES ITS OPENING RECORDS WITH IT (2026-10-27, FX-PF, workplan #293): Delete holding removes every purchase
 *  you already owned, so their records go; records of trades stay. To reverse: return transactions unchanged. */
/* ─ MK-CF-F-290 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * purchaseRecordsAfterHoldingRemoved
 *
 * Answers ..... A HOLDING REMOVED TAKES ITS OPENING RECORDS WITH IT (2026-10-27, FX-PF, workplan #293): Delete holding removes every purchase you already owned, so their records go; records of trades stay.
 *
 * Formula .....
 *     tk = string(removed.ticker ?? '').to upper case()
 *     ticker shared = (still held ?? []).some((p) => string(ticker ?? '').to upper case() = tk)
 *     the answer = transactions (or none when missing) where !gone.has(id)
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-290
 * Changed ..... not in git yet (—)
 */
export function purchaseRecordsAfterHoldingRemoved(transactions: Transaction[], accountId: EntityId, removed: Position, stillHeld: Position[]): Transaction[] {
  // a record naming only a ticker is the removed holding's only where no other holding in the account has that ticker
  const tk = String(removed.ticker ?? '').toUpperCase();
  const tickerShared = (stillHeld ?? []).some((p) => String(p.ticker ?? '').toUpperCase() === tk);
  const gone = new Set(openingRecordsHeld(transactions, accountId, removed)
    .filter((t) => t.position_id != null || !tickerShared).map((t) => t.id));
  return (transactions ?? []).filter((t) => !gone.has(t.id));
}

/** A SECOND FILE FOR A HOLDING IS READ AGAINST THE RECORDS THE FIRST WROTE (2026-10-27, FX-PF, workplan #294; DEC-7601's own limit).
 *  Import holdings into an account it matched replaces the account's holdings with the file's. A holding the account already has
 *  opening records of has them rewritten from the new file — the shares the file holds less those the account's own recorded
 *  trades explain (buys less sales, which are kept), at the file's price paid — so a purchase is still never counted twice, and
 *  the new file's price paid is the one a sale reads. Import 100 VTI at $80.00 ($8,000), then a file of 100 VTI at $90.00: the
 *  record reads 100 at $90.00 ($9,000); it kept $8,000. A holding with no record gets its records, as before. To reverse:
 *  keep a holding's records when it has any. */
/* ─ MK-CF-F-291 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * purchaseRecordsFollowReimport
 *
 * Answers ..... A SECOND FILE FOR A HOLDING IS READ AGAINST THE RECORDS THE FIRST WROTE (2026-10-27, FX-PF, workplan #294; DEC-7601's own limit).
 *
 * Formula .....
 *     out = transactions (or none when missing)
 *     added = []
 *     tk = string(ticker ?? '').trim().to upper case()
 *     of ticker = (t: transaction) => string(account id) = string(account id) and string(ticker ?? '').trim().to upper case() = tk
 *     openings = out where of ticker(each) and type = 'OPENING_POSITION' and source ! = 'connected'
 *     traded = out where of ticker(each) and (type = 'BUY' or type = 'SELL')
 *     net = Σ over traded of ((type = 'BUY' ? 1 : -1) × (number(shares) or 0))
 *     file shares = total shares(p)
 *     gone = a list with no repeats of for each of openings: id
 *     owned = file shares − net
 *     lot = the first of lots (or none when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-291
 * Changed ..... not in git yet (—)
 */
export function purchaseRecordsFollowReimport(transactions: Transaction[], accountId: EntityId, positions: Position[]): Transaction[] {
  let out = transactions ?? [];
  const added: Transaction[] = [];
  for (const p of positions ?? []) {
    const tk = String(p.ticker ?? '').trim().toUpperCase();
    const ofTicker = (t: Transaction) => String(t.account_id) === String(accountId) && String(t.ticker ?? '').trim().toUpperCase() === tk;
    const openings = out.filter((t) => ofTicker(t) && t.type === 'OPENING_POSITION' && t.source !== 'connected');
    const traded = out.filter((t) => ofTicker(t) && (t.type === 'BUY' || t.type === 'SELL'));
    if (!openings.length && !traded.length) { added.push(...openingRecordsOf(accountId, p)); continue; }
    if (!openings.length) continue;   // only trades explain it: nothing of it was owned before (as before)
    const net = traded.reduce((n, t) => n + (t.type === 'BUY' ? 1 : -1) * (Number(t.shares) || 0), 0);
    const fileShares = totalShares(p);
    const gone = new Set(openings.map((t) => t.id));
    out = out.filter((t) => !gone.has(t.id));
    if (fileShares == null) { added.push(...openingRecordsOf(accountId, p)); continue; }   // a count not on record: the file's purchases as they are
    const owned = fileShares - net;
    if (owned > 1e-9) {
      const lot = (p.lots ?? [])[0];
      added.push(...openingRecordsOf(accountId, p, [{ ...(lot ?? { lot_id: newEntityId('lot') }), shares: owned }]));
    }
  }
  return [...added, ...out];
}

/** AN OPTION BOUGHT OR SOLD BEFORE 2026-10-23 CARRIES ITS SHARES PER CONTRACT (2026-10-27, FX-PF, NW2-18; DEC-0274, DEC-4646; a rule
 *  change re-classifies existing data). Those records carry no multiplier, so the cash they moved and the activity line read one
 *  share a contract: "Buy SPX · 1 contract @ $2.50" beside −$2 and $2.50 out of the cash, where $250 moved. Once, on the way into
 *  the store: each such record typed by hand on an account built by hand, whose holding is an option, takes the holding's shares
 *  per contract (100 unless the person said otherwise), and the account's cash takes the difference it should have moved —
 *  1 × $2.50 × (100 − 1) = $247.50 more out. A record that has its multiplier is left as it is, so this changes nothing twice.
 *  A linked account's cash is the broker's and is never moved here. To reverse: drop the call in the store's merge. */
/* ─ MK-CF-F-292 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * optionTradesOnTheWayIn
 *
 * Answers ..... AN OPTION BOUGHT OR SOLD BEFORE 2026-10-23 CARRIES ITS SHARES PER CONTRACT (2026-10-27, FX-PF, NW2-18; DEC-0274, DEC-4646; a rule change re-classifies existing data).
 *
 * Formula .....
 *     accts = accounts (or none when missing)
 *     changed = 0
 *     t   when type ! = 'BUY' and type ! = 'SELL' (or multiplier ≠ nothing (or source = 'connected' when missing or zero) when missing or zero)
 *     a = accts.find((x) => asset id = account id)
 *     t   when a is missing (or source = 'connected' when missing or zero)
 *     m = trade multiplier of(accts, t)
 *     t   when not (m > 1) or !((shares ?? 0) > 0) or !((price ?? 0) > 0)
 *     more = (shares as number) × (price as number) × (m − 1)
 *     the answer:
 *     ...t = ...t
 *     multiplier = m
 *
 * Called by ... MK-XS-F-175 uid · MK-XS-F-205 recordsOnTheWayIn
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If shares is missing it uses 0.
 *     · If price is missing it uses 0.
 *     · If cash balance is missing it uses 0.
 *     · Uses a built-in changed of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-292
 * Changed ..... not in git yet (—)
 */
export function optionTradesOnTheWayIn(transactions: Transaction[], accounts: AssetAccount[]): { transactions: Transaction[]; accounts: AssetAccount[]; changed: number } {
  let accts = accounts ?? [];
  let changed = 0;
  const txns = (transactions ?? []).map((t) => {
    if ((t.type !== 'BUY' && t.type !== 'SELL') || t.multiplier != null || t.source === 'connected') return t;
    const a = accts.find((x) => x.asset_id === t.account_id);
    if (!a || a.source === 'connected') return t;
    const m = tradeMultiplierOf(accts, t);
    if (!(m > 1) || !((t.shares ?? 0) > 0) || !((t.price ?? 0) > 0)) return t;
    // the cash it moved is put right where a trade moves the account's cash (tradeCash: an account with a cash figure of its own)
    const more = (t.shares as number) * (t.price as number) * (m - 1);
    if (usesSleeve(a)) accts = accts.map((x) => (x.asset_id === a.asset_id ? { ...x, cash_balance: (x.cash_balance ?? 0) + (t.type === 'BUY' ? -more : more) } : x));
    changed += 1;
    return { ...t, multiplier: m };
  });
  return changed ? { transactions: txns, accounts: accts, changed } : { transactions: transactions ?? [], accounts: accounts ?? [], changed: 0 };
}

/** Finds the holding a transaction refers to, by the holding's own identifier or by its ticker. */
/* ─ MK-CF-F-137 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * findPos
 *
 * Answers ..... Finds the holding a transaction refers to, by the holding's own identifier or by its ticker.
 *
 * Formula .....
 *     the answer = the first holding in the account whose position id matches, or whose ticker matches (case-insensitive)
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-CF-F-138 addLot
 *               MK-CF-F-139 removeShares · MK-CF-F-223 tradeMultiplierOf
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-137
 * Changed ..... not in git yet (—)
 */
const findPos = (a: AssetAccount, t: Transaction) =>
  (a.positions ?? []).find((p) => (t.position_id && p.position_id === t.position_id) || (t.ticker && p.ticker === t.ticker?.toUpperCase()));

/** Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends. */
/* ─ MK-CF-F-138 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * addLot
 *
 * Answers ..... Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends.
 *
 * Formula .....
 *     lot = lot id = new entity id('lot')
 *     shares = shares
 *     cost per share = cost per share
 *     purchase date = date
 *     existing = find pos(a, t)
 *     the answer:
 *     ...a = ...a
 *     positions = for each of positions (or none when missing): ...each = ...each
 *     lots = [...lots, lot]   if each = existing
 *     each   otherwise
 *     ticker = (ticker ?? '').to upper case()
 *     asked = !kind and holding class of({ ticker }) = 'mixed'
 *     tag = nothing   if kind (or asked when missing or zero)
 *     holding tag for(asset class for symbol(ticker))   otherwise
 *
 * Called by ... MK-CF-F-111 applyTransaction
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-111 applyTransaction · MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-082 the purchase an opening record is of — so editing or removing that purchase changes or removes its record
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-138
 * Changed ..... not in git yet (—)
 */
function addLot(a: AssetAccount, t: Transaction, shares: number, costPerShare: number): AssetAccount {
  const lot = { lot_id: newEntityId('lot'), shares, cost_per_share: costPerShare, purchase_date: t.date };
  const existing = findPos(a, t);
  if (existing) {
    return { ...a, positions: (a.positions ?? []).map((p) => p === existing ? { ...p, lots: [...p.lots, lot] } : p) };
  }
  // A HOLDING A TRADE OPENS IS CLASSED THE WAY AN IMPORTED ONE IS (2026-10-23, found by the viewing flows): its ticker goes through
  // the one classifier (assetClassForSymbol → classifyHoldingClass, as Import holdings asks it) and the class is stored under its
  // tag (holdingTagFor). A kind the record names wins. To reverse: drop asset_class here.
  // NEVER BY THE CLASSIFIER'S LAST-RESORT DEFAULT (2026-10-25; outside review MK-CF-F-138-C05, his DEC-2160 "Refuse the line and
  // ask"): 10 UNKNOWN123 bought were filed under Stocks / Funds because nothing said otherwise — and VTI reached Stocks / Funds
  // the same way. The trade sheet now asks the type of a ticker the account does not hold (the record's kind: 10 VTI chosen as
  // Stocks / Funds list under Stocks / Funds, read by the one classifier as the class it was given). A record that names no
  // type keeps the class only where the ticker itself is evidence — where every screen would read the holding as Unclassified
  // (holdingClassOf), it is in no class and marked asked, and Net worth asks what it is, as for a synced holding (ingest.ts).
  // An option keeps the shares per contract its record states (DEC-4646), so a first buy stays 100 a contract afterwards.
  // To reverse the asking: store holdingTagFor(assetClassForSymbol(ticker)) whatever the evidence.
  const ticker = (t.ticker ?? '').toUpperCase();
  const asked = !t.kind && holdingClassOf({ ticker }) === 'mixed';
  const tag = t.kind || asked ? null : holdingTagFor(assetClassForSymbol(ticker));
  const pos: Position = { position_id: newEntityId('pos'), ticker, kind: t.kind, ...(tag ? { asset_class: tag } : {}), ...(asked ? { class_asked: true as const } : {}),
    ...(t.kind === 'options' && t.multiplier != null ? { multiplier: t.multiplier } : {}), lots: [lot] } as Position;
  return { ...a, positions: [...(a.positions ?? []), pos] };
}

/** Remove `shares` from a position FIFO (oldest lots first); returns updated account. */
/* ─ MK-CF-F-139 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * removeShares
 *
 * Answers ..... Remove `shares` from a position FIFO (oldest lots first); returns updated account.
 *
 * Formula .....
 *     pos = find pos(a, t)
 *     a   when pos is missing
 *     remaining = shares
 *     lots = for each of pos.lots: { ...each }
 *     oldest first = [...lots].sort((x, y) => (purchase date on record(purchase date) ?? '9999').locale compare(purchase date on record(purchase date) ?? '9999'))
 *     known = (v: unknown): v is number => typeof v = 'number' and number.is finite(v)
 *     take = min(shares, remaining)
 *     kept = lots where !known(shares) (or shares > 1e − 9 when missing or zero)
 *     the answer = { ...a, positions }
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-PF-F-080 recordedBuysExplain
 *
 * Reaches ..... 36 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-111 applyTransaction
 *               MK-NW-F-144 beforeTheRecordSentence · MK-PF-F-014 buildPerformance
 *               MK-NW-F-084 categoryEarnings · MK-NW-F-142 classReturnOf
 *               MK-PF-F-068 dayAfterDay · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-079 eventDays · MK-PF-F-065 firstDatedPurchase
 *               … and 18 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-139
 * Changed ..... not in git yet (—)
 */
function removeShares(a: AssetAccount, t: Transaction, shares: number): AssetAccount {
  const pos = findPos(a, t);
  if (!pos) return a;
  let remaining = shares;
  const lots = pos.lots.map((l) => ({ ...l }));
  // FIRST IN, FIRST OUT — by the day each purchase was made, not by the order it happens to be stored
  // in (outside review, 2026-10-04: the formula never said which shares a sale takes). A sale took
  // from whichever purchase was listed first, so a holding whose purchases were entered out of date
  // order kept the wrong ones — and the long-term / short-term split of what was left moved with it.
  // A purchase with no date goes last: its age is not known, so it is not assumed to be the oldest.
  // (2026-10-21) a date is read the one way (purchaseDateOnRecord): a day that does not exist (31 February) is no date, so it goes last too
  const oldestFirst = [...lots].sort((x, y) => (purchaseDateOnRecord(x.purchase_date) ?? '9999').localeCompare(purchaseDateOnRecord(y.purchase_date) ?? '9999'));
  // A PURCHASE WHOSE SHARE COUNT IS NOT ON RECORD IS NEVER ERASED BY A SALE (2026-10-25; outside review MK-CF-F-139-C05, DEC-3523
  // tenets 3 and 5): its count was read as 0 (Math.min of nothing), the empty purchase dropped and the holding disappeared — a sale
  // of 4 against one purchase of unknown size erased it. The sale takes shares oldest first only from purchases whose count is on
  // record and stops at the first one that has none: that purchase and every later one are kept as they were, and the shares the
  // sale could not be matched to stay unresolved — the holding's Quantity keeps saying its count is not stated. The trade sheet
  // refuses such a sale and says why; this is the edit sheet's and a delete's replay. To reverse: drop the `known` stop.
  const known = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  for (const l of oldestFirst) {
    if (remaining <= 0) break;
    if (!known(l.shares)) break;
    const take = Math.min(l.shares, remaining);
    l.shares = (l.shares - take);
    remaining = (remaining - take);
  }
  const kept = lots.filter((l) => !known(l.shares) || l.shares > 1e-9);
  const positions = kept.length
    ? (a.positions ?? []).map((p) => p === pos ? { ...p, lots: kept } : p)
    : (a.positions ?? []).filter((p) => p !== pos);
  return { ...a, positions };
}

/** Apply one transaction to the accounts (pure). The ledger append is the caller's job. */
/* ─ MK-CF-F-111 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * applyTransaction
 *
 * Answers ..... Apply one transaction to the accounts (pure).
 *
 * Formula .....
 *     the answer = accounts
 *     moved = money into account(t) (or 0 when missing)
 *     out = map(accounts, account id, (a) => bump cash(a, moved))
 *     src = accounts.find((a) => asset id = account id)
 *     pos = src and find pos(src, t)
 *     accounts   when src is missing (or pos is missing (or counter account id is missing when missing or zero) when missing or zero)
 *     out = map(accounts, account id, (a) => ({ ...a, positions: (positions ?? []).filter((p) => p ! = pos) }))
 *     map(accounts, account id, (a) => (find pos(a, t) ? add lot(a, t, shares!, price!) : a))   when reinvested and shares and price
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *               MK-XS-I-077 that an account's cash was never entered — the cash figure is activity since the import or since it was added
 *
 * Decides .....
 *     · If multiplier is missing it uses 1.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If price is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-111
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function applyTransaction(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  switch (t.type) {
    case 'ADJUSTMENT':
      return accounts;   // splits/broker adjustments: history row only — balances come from the sync
    case 'OPENING_POSITION':
      return map(accounts, t.account_id, (a) => addLot(a, t, t.shares || 0, t.price || 0));
    case 'OPENING_CASH':
      // a cash figure entered: the account's cash is known from here on (2026-10-25, cash_not_entered cleared)
      return map(accounts, t.account_id, ({ cash_not_entered: _opened, ...a }) => ({ ...a, cash_balance: ((t.amount || 0)) }));
    // DEPOSIT, WITHDRAWAL, FEE: the one rule for a stored amount (moneyIntoAccount, ledger.ts, 2026-10-21) — a fee refund
    // (a fee that came IN) raises the cash, a deposit reversal lowers it
    case 'DEPOSIT':
    case 'WITHDRAWAL':
    case 'FEE':
      return map(accounts, t.account_id, (a) => bumpCash(a, moneyIntoAccount(t) ?? 0));
    // a buy or a sale moves money inside the account, and its own fee out of it (tradeCash, 2026-10-23): a typed total keeps
    // its figure, and a fee typed beside the price (feeNotInPrice) is paid once
    case 'BUY':
      return map(accounts, t.account_id, (a) => addLot(tradeCash(a, -((t.shares || 0) * (t.price || 0) * (t.multiplier ?? 1)), feeNotInPrice(t)), t, t.shares || 0, t.price || 0));
    case 'SELL':
      // Walk row 4 (audit Home·NW #20): a VALUE sale — no shares, just an amount — is how bonds and
      // alternatives sell. The ledger is the one writer: the account's value drops by the sale
      // amount (clamped at zero), and the row IS the audit trail the balance-patch never left.
      if (!((t.shares || 0) > 0) && (t.amount || 0) > 0)
        return map(accounts, t.account_id, (a) => ({ ...a, balance: (Math.max(0, (a.balance || 0) - (t.amount || 0))) }));
      // can't sell more than you own — clamp so cash isn't over-credited
      return map(accounts, t.account_id, (a) => {
        const pos = findPos(a, t);
        // a holding whose share count is not on record cannot clamp the sale: it stands as recorded (outside review Claude Performance, 2026-10-11),
        // and its shares come only out of purchases whose count is on record — the purchase of unknown size is kept (removeShares, 2026-10-25)
        const held = pos ? totalShares(pos) : 0;
        const sell = held == null ? (t.shares || 0) : Math.min(t.shares || 0, held);
        return removeShares(tradeCash(a, sell * (t.price || 0) * (t.multiplier ?? 1), feeNotInPrice(t)), t, sell);
      });
    case 'TRANSFER': {
      const moved = moneyIntoAccount(t) ?? 0;   // the one rule (2026-10-21): leaves the first account unless it says IN
      let out = map(accounts, t.account_id, (a) => bumpCash(a, moved));
      if (t.counter_account_id) out = map(out, t.counter_account_id, (a) => bumpCash(a, -moved));
      return out;
    }
    case 'TRANSFER_IN_KIND': {
      const src = accounts.find((a) => a.asset_id === t.account_id);
      const pos = src && findPos(src, t);
      if (!src || !pos || !t.counter_account_id) return accounts;
      let out = map(accounts, t.account_id, (a) => ({ ...a, positions: (a.positions ?? []).filter((p) => p !== pos) }));
      out = map(out, t.counter_account_id, (a) => ({ ...a, positions: [...(a.positions ?? []), pos] }));
      return out;
    }
    case 'DIVIDEND':
    case 'INTEREST':
    case 'COUPON':
      // reinvested → add to the EXISTING holding only (never create a phantom position for an un-held ticker)
      if (t.reinvested && t.shares && t.price) return map(accounts, t.account_id, (a) => (findPos(a, t) ? addLot(a, t, t.shares!, t.price!) : a));
      // the one rule (2026-10-21): a −$50 dividend — a reversal — lowers the cash by $50
      return map(accounts, t.account_id, (a) => bumpCash(a, moneyIntoAccount(t) ?? 0));
    default:
      return accounts;
  }
}

export { availableCash };

/** Build a full transaction (id + created_at) from a partial. */
/* ─ MK-CF-F-112 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * makeTransaction
 *
 * Answers ..... Build a full transaction (id + created_at) from a partial.
 *
 * Formula .....
 *     ...p = ...p
 *     ticker = ticker.to upper case()
 *     id = new entity id('txn')
 *     created at = the date ).to isostring(
 *
 * Called by ... MK-CF-F-224 openingRecordsOf · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-288 openingRecordsHeld · MK-CF-F-224 openingRecordsOf
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-290 purchaseRecordsAfterHoldingRemoved
 *               MK-CF-F-289 purchaseRecordsFollowEdit · MK-CF-F-291 purchaseRecordsFollowReimport
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-112
 * Changed ..... 2026-07-12 (db079fe)
 */
export function makeTransaction(p: Omit<Transaction, 'id' | 'created_at'>): Transaction {
  return { ...p, ticker: p.ticker?.toUpperCase(), id: newEntityId('txn'), created_at: new Date().toISOString() };
}

// ── Delete-reversal machinery (P0: removing a ledger row must reverse its balance effect) ──────────
// Strategy: recordTransaction stores pre-apply copies of the touched accounts on the row (undo_prev).
// Deleting unwinds newest→target by restoring those copies, drops the row, then replays the rest —
// exact even when a later SELL consumed lots a deleted BUY created. Rows recorded before undo_prev
// existed fall back to a synthetic opposite transaction (cash-delta types only).

/** The account ids a transaction can touch. */
/* ─ MK-CF-F-113 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * affectedAccountIds
 *
 * Answers ..... The account ids a transaction can touch.
 *
 * Formula .....
 *     [account id, counter account id]   if counter account id
 *     [account id]   otherwise
 *
 * Called by ... MK-CF-F-114 undoSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-114 undoSnapshot
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-113
 * Changed ..... 2026-07-12 (db079fe)
 */
export function affectedAccountIds(t: Transaction): EntityId[] {
  return t.counter_account_id ? [t.account_id, t.counter_account_id] : [t.account_id];
}

/** Deep copies of the affected accounts, taken BEFORE applyTransaction. */
/* ─ MK-CF-F-114 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * undoSnapshot
 *
 * Answers ..... Deep copies of the affected accounts, taken BEFORE applyTransaction.
 *
 * Formula .....
 *     ids = a list with no repeats of affected account ids(t)
 *     the answer = accounts where ids.has(asset id)for each of : JSON.parse(JSON.stringify(each))
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-114
 * Changed ..... 2026-07-12 (db079fe)
 */
export function undoSnapshot(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  const ids = new Set(affectedAccountIds(t));
  return accounts.filter((a) => ids.has(a.asset_id)).map((a) => JSON.parse(JSON.stringify(a)));
}

/** Restore the affected accounts to the transaction's pre-apply copies (pure). */
/* ─ MK-CF-F-115 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * restoreUndo
 *
 * Answers ..... Restore the affected accounts to the transaction's pre-apply copies (pure).
 *
 * Formula .....
 *     by id = a lookup of for each of undo prev (or none when missing): [asset id, each]
 *     the answer:
 *     for each of accounts: JSON.parse(JSON.stringify(by id.get(asset id)))   if by id.has(asset id)
 *     each   otherwise
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-115
 * Changed ..... 2026-07-12 (db079fe)
 */
export function restoreUndo(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  const byId = new Map((t.undo_prev ?? []).map((a) => [a.asset_id, a]));
  return accounts.map((a) => (byId.has(a.asset_id) ? JSON.parse(JSON.stringify(byId.get(a.asset_id))) : a));
}

/** Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.
 *  Only pure cash-delta types are safely invertible; lot-touching and absolute types (BUY, SELL,
 *  the OPENING types, TRANSFER_IN_KIND, reinvested income) return null — those need the snapshot. */
/* ─ MK-CF-F-116 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * inverseOf
 *
 * Answers ..... Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.
 *
 * Formula .....
 *     flipped = 'OUT' as const   if direction = 'IN'
 *     'IN' as const   if direction = 'OUT'
 *     undefined   otherwise   otherwise
 *     base = ...t = ...t
 *     id = new entity id('txn')
 *     note = `reversal of ${id}`
 *     ...(flipped ? { direction: flipped } : {}) = ...(flipped ? { direction: flipped } : {})
 *     the answer:
 *     nothing   if reinvested
 *     ...base = ...base
 *     type = 'WITHDRAWAL'   otherwise
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-116
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function inverseOf(t: Transaction): Transaction | null {
  // a record that states which way its money went is undone the other way (2026-10-21): a fee refund (IN) is undone by
  // money leaving, read by the one rule for a stored amount (moneyIntoAccount, ledger.ts)
  const flipped = t.direction === 'IN' ? 'OUT' as const : t.direction === 'OUT' ? 'IN' as const : undefined;
  const base: Transaction = { ...t, id: newEntityId('txn'), note: `reversal of ${t.id}`, ...(flipped ? { direction: flipped } : {}) };
  switch (t.type) {
    case 'ADJUSTMENT': return { ...base };   // no-op reverses to no-op
    case 'DEPOSIT': return { ...base, type: 'WITHDRAWAL' };
    case 'WITHDRAWAL':
    case 'FEE': return { ...base, type: 'DEPOSIT' };
    case 'TRANSFER':
      // a transfer between two accounts is undone by swapping them, so it keeps its own direction: flipping it as well
      // cancelled the swap, and the undo moved the money a second time (found by the RULES agent, 2026-10-21)
      return t.counter_account_id
        ? { ...base, account_id: t.counter_account_id, counter_account_id: t.account_id, direction: t.direction }
        : { ...base, type: 'DEPOSIT' };   // outbound-only transfer → give the cash back
    case 'DIVIDEND':
    case 'INTEREST':
    case 'COUPON':
      return t.reinvested ? null : { ...base, type: 'WITHDRAWAL' };
    default:
      return null;
  }
}

const TYPE_LABEL: Record<TxnType, string> = {
  OPENING_POSITION: 'Opening holding', OPENING_CASH: 'Opening cash', BUY: 'Buy', SELL: 'Sell',
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal', TRANSFER: 'Transfer', TRANSFER_IN_KIND: 'Transfer shares', ADJUSTMENT: 'Broker adjustment',
  DIVIDEND: 'Dividend', INTEREST: 'Interest', COUPON: 'Coupon', FEE: 'Fee',
};
/* ─ MK-CF-F-117 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * txnLabel
 *
 * Answers ..... What do we call this kind of row on screen?
 *
 * Formula .....
 *     the answer = TYPE_LABEL[t], or t itself when the type has no label
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-117
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function txnLabel(t: TxnType): string { return TYPE_LABEL[t] ?? t; }

/** Signed cash effect on the primary account (for display). */
/* ─ MK-CF-F-118 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * cashEffect
 *
 * Answers ..... Signed cash effect on the primary account (for display).
 *
 * Formula .....
 *     DEPOSIT → +amount
 *     SELL → +shares × price, or +amount when no shares
 *     DIVIDEND / INTEREST / COUPON → 0 when reinvested, else +amount
 *     WITHDRAWAL / FEE / TRANSFER → −amount
 *     BUY → −(shares × price)
 *     anything else → 0
 *
 * Called by ... MK-NW-O-002 theAccount · MK-PF-F-072 tradesAfter
 *               MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 43 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-144 beforeTheRecordSentence · MK-PF-F-014 buildPerformance
 *               MK-CF-F-118 cashEffect · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-079 eventDays
 *               … and 25 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *               MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise
 *
 * Decides .....
 *     · If multiplier is missing it uses 1.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If price is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-118
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function cashEffect(t: Transaction): number {
  switch (t.type) {
    // THE ONE RULE FOR A STORED AMOUNT (moneyIntoAccount, 2026-10-21): the direction the record states, else its kind's
    // own way — a broker's −$500 deposit, a reversal, is −$500 here, and a journal into this account is plus. No amount
    // on record is no effect here; the activity list shows a dash for it (theAccount, noAmount).
    case 'DEPOSIT': case 'WITHDRAWAL': case 'FEE': case 'TRANSFER': return moneyIntoAccount(t) ?? 0;
    // A TRADE'S OWN FEE, ONCE (2026-10-23, E2E-58; DEC-6873, DEC-7452): a fee its price does not carry (feeNotInPrice) comes off
    // what a sale brought in and is added to what a buy cost — 10 sold at $120 with a $5 fee read +$1,200 here while the walk
    // counted $1,195. A sale with no price keeps the amount on record, the reading tradesAfter takes its fee off.
    case 'SELL': { const gross = (t.shares || 0) * (t.price || 0) * (t.multiplier ?? 1); return gross ? gross - feeNotInPrice(t) : (t.amount || 0); }
    case 'DIVIDEND': case 'INTEREST': case 'COUPON': return t.reinvested ? 0 : (moneyIntoAccount(t) ?? 0);
    // an option's contracts count by the shares in each (the record's multiplier, 2026-10-23): 1 contract at $2.50 is $250
    case 'BUY': return -((t.shares || 0) * (t.price || 0) * (t.multiplier ?? 1) + feeNotInPrice(t));
    default: return 0;
  }
}

/** Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds
 *  the Income module. Reinvested payouts grow the position instead, so they're excluded. */
/* ─ MK-CF-F-119 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * investmentIncomeAnnual
 *
 * Answers ..... Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds the Income module.
 *
 * Formula .....
 *     cutoff = the date now); cutoff.set full year(cutoff.get full year() − 1
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-119
 * Changed ..... 2026-06-05 (258e19f)
 */
export function investmentIncomeAnnual(txns: Transaction[], now: Date = new Date()): number {
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1);
  return ((txns ?? [])
    .filter((t) => (t.type === 'DIVIDEND' || t.type === 'INTEREST' || t.type === 'COUPON') && !t.reinvested && new Date(t.date) >= cutoff)
    // the one rule for a stored amount (moneyIntoAccount, 2026-10-21): a −$50 dividend — a reversal — cancels, never adds
    .reduce((s, t) => s + (moneyIntoAccount(t) ?? 0), 0));
}

export interface TxnDoc { user_id: UserId; transactions: Transaction[]; }
