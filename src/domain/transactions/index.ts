// Transaction ledger — the append-only history + a pure function that applies a transaction to accounts.
// State model = "balance + statement": accounts hold live cash/positions for display, and every change
// also appends an immutable Transaction (here) for audit/history. applyTransaction is pure + tested.
import type { EntityId, UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import type { AssetAccount } from '../assets';
import { totalShares, type Position } from '../performance';

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
  reinvested?: boolean;      // dividend/interest reinvested into the position vs taken as cash
  note?: string;
  source?: 'manual' | 'connected';  // F10: only connected-account rows are ever reviewed for a
                                    // "worth a look" flag — hand-typed entries are NEVER questioned.
                                    // Absent = manual (every row recorded before F1 sync exists).
  created_at: string;        // ISO — when it was entered (audit)
  undo_prev?: AssetAccount[]; // pre-apply copies of the touched accounts — lets a delete reverse
                              // this row's balance effect exactly (P0: ledger and balances must
                              // never drift; rows recorded before this field use inverseOf()).
}

/* ─ MK-CF-F-132 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * map
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     asset account) =>
 *
 * Called by ... MK-CF-F-008 spendByMonth · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-014 budgetVsActual · MK-CF-F-019 upcomingBills
 *               MK-CF-F-020 cashflowYear · MK-CF-F-034 payoffPlan
 *               MK-CF-F-049 buildIncomeState · MK-CF-F-064 equityCashFlow
 *               MK-CF-F-065 equityVestWeights · MK-CF-F-066 rsuAnnual
 *               MK-CF-F-067 rentalList · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-087 monthlyTaxRates · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-098 progressiveMonthlyTax
 *               MK-CF-F-107 buildPaycheckYear · MK-CF-F-109 reviewTransactions
 *               MK-CF-F-111 applyTransaction · MK-CF-F-114 undoSnapshot
 *               MK-CF-F-115 restoreUndo · MK-CF-F-138 addLot
 *               MK-CF-F-139 removeShares · MK-CF-F-142 monthsOf
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-149 recurringDebtPayments
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-168 salaryWindow
 *               MK-CF-F-176 sumMonthsOverEarners · MK-CF-F-177 wageGrossByMonth
 *               MK-CF-F-206 householdK401ByMonth · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary · MK-HM-F-001 buildInsights
 *               MK-NW-F-026 accountDisplayNames · MK-NW-F-039 buildAssetsState
 *               MK-NW-F-046 historyCoverage · MK-NW-F-048 uberGroupRows
 *               MK-NW-F-052 buildItemizedAccounts · MK-NW-F-054 reclassifyAccounts
 *               MK-NW-F-061 bondSummary · MK-NW-F-068 prettyDay
 *               MK-NW-F-092 investmentAccountIdsOf · MK-NW-F-102 rateWhereItRefuses
 *               MK-NW-O-001 theBonds · MK-NW-O-002 theAccount
 *               MK-NW-O-003 theNetWorth · MK-NW-O-005 theAlternativesOutlook
 *               MK-NW-O-006 theHolding · MK-NW-O-008 thePerformance
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-014 buildPerformance
 *               MK-PF-F-016 attribution · MK-PF-F-017 allocation
 *               MK-PF-F-018 portfolioTrend · MK-PL-F-004 withdrawalOrder
 *               MK-PL-F-009 rmdTakenThisYear · MK-PL-F-011 buildGoalsState
 *               MK-PL-F-013 goalsFromOnboarding · MK-PL-F-016 availableToSaveSummary
 *               MK-PL-F-018 monthsUntil · MK-PL-F-031 taxOrganizer
 *               MK-PL-F-037 trimHints · MK-PL-F-046 leverDeltas
 *               MK-PL-F-050 simulate · MK-PL-F-055 projectNestEgg
 *               MK-PL-F-067 willItLastInputs · MK-ST-F-002 monthWords
 *               MK-ST-F-003 dayWords · MK-ST-F-010 nameEvidence
 *               MK-ST-F-016 totalOf · MK-ST-F-020 sumSigned
 *               MK-ST-F-022 reconcileAccountTotal · MK-ST-F-029 prune
 *               MK-ST-F-061 isMonthEnd · MK-ST-F-064 modifiedDietzOverWindow
 *               MK-ST-F-073 rebuildDays · MK-ST-F-078 dateShown
 *               MK-XS-F-004 buildDatedGrid · MK-XS-F-005 trendPoints
 *               MK-XS-F-009 readHistory · MK-XS-F-015 importHoldings
 *               MK-XS-F-028 surplusByMonth · MK-XS-F-031 buildSnapshot
 *               MK-XS-F-058 parseReceipt · MK-XS-F-083 fetchPriceSeries
 *               MK-XS-F-094 parseReceiptText · MK-XS-F-102 ingestSync
 *               MK-XS-F-103 confirmWrapper · MK-XS-F-105 mapPosition
 *               MK-XS-F-111 mergeHistoryFrom · MK-XS-F-116 runSnapTradeSync
 *               MK-XS-F-129 findHeaderRow · MK-XS-F-146 prettyExpiry
 *               MK-XS-F-174 recomputeBalances · MK-XS-F-175 uid
 *               MK-XS-F-177 useCategorySpend · MK-XS-F-181 merge
 *
 * Reaches ..... 290 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               … and 272 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-132
 * Changed ..... not in git yet (—)
 */
const map = (accs: AssetAccount[], id: EntityId, fn: (a: AssetAccount) => AssetAccount) =>
  accs.map((a) => (a.asset_id === id ? fn(a) : a));
/* ─ MK-CF-F-133 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cashOf
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     cash balance (or 0 when missing or zero)
 *
 * Called by ... MK-ST-F-073 rebuildDays
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-135 availableCash · MK-CF-F-136 bumpCash
 *
 * Reaches ..... 61 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-082 NW
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-135 availableCash · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-136 bumpCash
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               … and 43 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-135 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * availableCash
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     cash balance (or 0 when missing or zero)   if uses sleeve(a)
 *     balance (or 0 when missing or zero)   otherwise
 *
 * Called by ... MK-NW-F-088 BENCH
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · If cash balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-135
 * Changed ..... not in git yet (—)
 */
const availableCash = (a: AssetAccount) => (usesSleeve(a) ? (a.cash_balance || 0) : (a.balance || 0));
/* ─ MK-CF-F-136 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * bumpCash
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ...a = ...a
 *     cash balance = (cash balance or 0) + delta   when uses sleeve(a)
 *     itemised = (positions.length ?? 0) > 0 and tax bucket ! = 'CASH' and tax bucket ! = 'PROPERTY'
 *     the answer:
 *     ...a = ...a
 *     balance = (balance or 0) + delta
 *
 * Called by ... MK-CF-F-111 applyTransaction
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-111 applyTransaction
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
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
  if (usesSleeve(a)) return { ...a, cash_balance: ((a.cash_balance || 0) + delta) };
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
    };
  }
  return { ...a, balance: ((a.balance || 0) + delta) };
}
/* ─ MK-CF-F-137 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * findPos
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = the first holding in the account whose position id matches, or whose ticker matches (case-insensitive)
 *
 * Called by ... MK-CF-F-111 applyTransaction · MK-CF-F-138 addLot
 *               MK-CF-F-139 removeShares
 *
 * Reaches ..... 60 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-138 addLot
 *               MK-CF-F-111 applyTransaction · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               … and 42 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-137
 * Changed ..... not in git yet (—)
 */
const findPos = (a: AssetAccount, t: Transaction) =>
  (a.positions ?? []).find((p) => (t.position_id && p.position_id === t.position_id) || (t.ticker && p.ticker === t.ticker?.toUpperCase()));

/** Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends. */
/* ─ MK-CF-F-138 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 *     pos = position id = new entity id('pos')
 *     ticker = (ticker ?? '').to upper case()
 *     kind = kind
 *     lots = [lot]
 *
 * Called by ... MK-CF-F-111 applyTransaction
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-111 applyTransaction
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
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
  const pos: Position = { position_id: newEntityId('pos'), ticker: (t.ticker ?? '').toUpperCase(), kind: t.kind, lots: [lot] };
  return { ...a, positions: [...(a.positions ?? []), pos] };
}

/** Remove `shares` from a position FIFO (oldest lots first); returns updated account. */
/* ─ MK-CF-F-139 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * removeShares
 *
 * Answers ..... Remove `shares` from a position FIFO (oldest lots first); returns updated account.
 *
 * Formula .....
 *     pos = find pos(a, t)
 *     a   when pos is missing
 *     remaining = shares
 *     lots = for each of pos.lots: { ...each }
 *     take = min(shares, remaining)
 *     kept = lots where shares > 1e − 9
 *     the answer = { ...a, positions }
 *
 * Called by ... MK-CF-F-111 applyTransaction
 *
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-111 applyTransaction
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               … and 40 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-139
 * Changed ..... not in git yet (—)
 */
function removeShares(a: AssetAccount, t: Transaction, shares: number): AssetAccount {
  const pos = findPos(a, t);
  if (!pos) return a;
  let remaining = shares;
  const lots = pos.lots.map((l) => ({ ...l }));
  for (const l of lots) {
    if (remaining <= 0) break;
    const take = Math.min(l.shares, remaining);
    l.shares = (l.shares - take);
    remaining = (remaining - take);
  }
  const kept = lots.filter((l) => l.shares > 1e-9);
  const positions = kept.length
    ? (a.positions ?? []).map((p) => p === pos ? { ...p, lots: kept } : p)
    : (a.positions ?? []).filter((p) => p !== pos);
  return { ...a, positions };
}

/** Apply one transaction to the accounts (pure). The ledger append is the caller's job. */
/* ─ MK-CF-F-111 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * applyTransaction
 *
 * Answers ..... Apply one transaction to the accounts (pure).
 *
 * Formula .....
 *     the answer = accounts
 *     amt = amount (or 0 when missing or zero)
 *     out = map(accounts, account id, (a) => bump cash(a, -amt))
 *     src = accounts.find((a) => asset id = account id)
 *     pos = src and find pos(src, t)
 *     accounts   when src is missing (or pos is missing (or counter account id is missing when missing or zero) when missing or zero)
 *     out = map(accounts, account id, (a) => ({ ...a, positions: (positions ?? []).filter((p) => p ! = pos) }))
 *     map(accounts, account id, (a) => (find pos(a, t) ? add lot(a, t, shares!, price!) : a))   when reinvested and shares and price
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *
 * Decides .....
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
      return map(accounts, t.account_id, (a) => ({ ...a, cash_balance: ((t.amount || 0)) }));
    case 'DEPOSIT':
      return map(accounts, t.account_id, (a) => bumpCash(a, (t.amount || 0)));
    case 'WITHDRAWAL':
    case 'FEE':
      return map(accounts, t.account_id, (a) => bumpCash(a, -(t.amount || 0)));
    case 'BUY':
      return map(accounts, t.account_id, (a) => addLot(bumpCash(a, -((t.shares || 0) * (t.price || 0))), t, t.shares || 0, t.price || 0));
    case 'SELL':
      // Walk row 4 (audit Home·NW #20): a VALUE sale — no shares, just an amount — is how bonds and
      // alternatives sell. The ledger is the one writer: the account's value drops by the sale
      // amount (clamped at zero), and the row IS the audit trail the balance-patch never left.
      if (!((t.shares || 0) > 0) && (t.amount || 0) > 0)
        return map(accounts, t.account_id, (a) => ({ ...a, balance: (Math.max(0, (a.balance || 0) - (t.amount || 0))) }));
      // can't sell more than you own — clamp so cash isn't over-credited
      return map(accounts, t.account_id, (a) => {
        const pos = findPos(a, t);
        const sell = Math.min(t.shares || 0, pos ? totalShares(pos) : 0);
        return removeShares(bumpCash(a, sell * (t.price || 0)), t, sell);
      });
    case 'TRANSFER': {
      const amt = t.amount || 0;
      let out = map(accounts, t.account_id, (a) => bumpCash(a, -amt));
      if (t.counter_account_id) out = map(out, t.counter_account_id, (a) => bumpCash(a, amt));
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
      return map(accounts, t.account_id, (a) => bumpCash(a, (t.amount || 0)));
    default:
      return accounts;
  }
}

export { availableCash };

/** Build a full transaction (id + created_at) from a partial. */
/* ─ MK-CF-F-112 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-113 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Reaches ..... 58 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 40 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-114 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * undoSnapshot
 *
 * Answers ..... Deep copies of the affected accounts, taken BEFORE applyTransaction.
 *
 * Formula .....
 *     ids = a list with no repeats of affected account ids(t)
 *     the answer = accounts where ids.has(asset id)for each of : JSON.parse(JSON.stringify(each))
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-115 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-116 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * inverseOf
 *
 * Answers ..... Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.
 *
 * Formula .....
 *     base = ...t = ...t
 *     id = new entity id('txn')
 *     note = `reversal of ${id}`
 *     the answer:
 *     nothing   if reinvested
 *     ...base = ...base
 *     type = 'WITHDRAWAL'   otherwise
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-116
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function inverseOf(t: Transaction): Transaction | null {
  const base: Transaction = { ...t, id: newEntityId('txn'), note: `reversal of ${t.id}` };
  switch (t.type) {
    case 'ADJUSTMENT': return { ...base };   // no-op reverses to no-op
    case 'DEPOSIT': return { ...base, type: 'WITHDRAWAL' };
    case 'WITHDRAWAL':
    case 'FEE': return { ...base, type: 'DEPOSIT' };
    case 'TRANSFER':
      return t.counter_account_id
        ? { ...base, account_id: t.counter_account_id, counter_account_id: t.account_id }
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
 * Called by ... MK-NW-O-002 theAccount
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-O-002 theAccount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-008 transaction amount
 *
 * Decides .....
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If price is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-118
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function cashEffect(t: Transaction): number {
  switch (t.type) {
    case 'DEPOSIT': case 'SELL': return (t.type === 'SELL' ? ((t.shares || 0) * (t.price || 0) || (t.amount || 0)) : (t.amount || 0));
    case 'DIVIDEND': case 'INTEREST': case 'COUPON': return t.reinvested ? 0 : (t.amount || 0);
    case 'WITHDRAWAL': case 'FEE': return -(t.amount || 0);
    case 'BUY': return -((t.shares || 0) * (t.price || 0));
    case 'TRANSFER': return -(t.amount || 0);
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
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · If amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-119
 * Changed ..... 2026-06-05 (258e19f)
 */
export function investmentIncomeAnnual(txns: Transaction[], now: Date = new Date()): number {
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1);
  return ((txns ?? [])
    .filter((t) => (t.type === 'DIVIDEND' || t.type === 'INTEREST' || t.type === 'COUPON') && !t.reinvested && new Date(t.date) >= cutoff)
    .reduce((s, t) => s + (t.amount || 0), 0));
}

export interface TxnDoc { user_id: UserId; transactions: Transaction[]; }
