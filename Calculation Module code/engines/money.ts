// ENGINE — money that remembers which way it went.
//
// THE DEFECT THIS REPLACES. The app stores `Math.abs(amount)` when a transaction is imported, so the
// minus sign is destroyed the moment the line arrives, and the screen sums absolutes again. A
// payment and its matching reversal therefore both add. That is why the founder's screen showed
// $2,387 of interest against $1,193 actually received: his money-market income arrives as a PAIR —
// the credit, and the reinvestment debit that nets to zero — and both legs were counted.
//
// THE RULE, taken from the FDX standard rather than invented: direction lives in its OWN field.
// FDX carries `debitCreditMemo` precisely "because the transaction amount is an absolute value".
// A provider that signs its numbers and a provider that does not both map onto this cleanly, and no
// screen ever has to remember which way a particular number runs.
//
// TRACK 0 (founder brief 2026-08-20, B8): amounts are EXACT DECIMALS end to end. The size is a Dec,
// sums are exact, and a number leaves this module only at the display edge, rounded once (R6).
import { Dec } from './decimal';

/** Money that has come out of the bank teller's mouth as a direction, not as a sign. */
export interface Money {
  /** Always non-negative, EXACT. The size of the movement. */
  amount: Dec;
  /** IN = money entered the account. OUT = money left it. NONE = a note with no money attached. */
  direction: 'IN' | 'OUT' | 'NONE';
}

/** How a source signs its amounts. Getting this backwards is a sign error on every row, so each
 *  road declares it once, here, rather than being guessed at per call site. */
export type SignConvention =
  | 'NEGATIVE_IS_OUT'   // the ordinary reading: −100 means $100 left. Vanguard files, SnapTrade.
  | 'POSITIVE_IS_OUT'   // FDX/Plaid Core Exchange: a DEBIT is money leaving, exposed POSITIVE.
  | 'ALWAYS_POSITIVE';  // the size only; direction must come from somewhere else.

/** Read a raw amount into a Money, given how that source signs things.
 *  `stated` is an explicit direction where the source provides one (FDX debitCreditMemo, or our
 *  own event table) — it always wins, because a stated fact beats an inferred one. */
/* ─ MK-ST-F-018 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * readMoney
 *
 * Answers ..... Read a raw amount into a Money, given how that source signs things.
 *
 * Formula .....
 *     d = dec.parse(raw)
 *     amount = dec.ZERO
 *     direction = 'NONE'   when d = nothing
 *     amount = dec.ZERO
 *     direction = 'NONE'   when is zero()
 *     negative means out = convention ! = 'POSITIVE_IS_OUT'
 *     the answer:
 *     amount = abs()
 *     direction = stated (or 'NONE' when missing)
 *     out = is neg()   if negative means out
 *     !is neg()   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-018
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function readMoney(
  raw: number | string | null | undefined,
  convention: SignConvention,
  stated?: 'IN' | 'OUT' | 'NONE',
): Money {
  const d = Dec.parse(raw);
  if (d == null) return { amount: Dec.ZERO, direction: 'NONE' };
  if (d.isZero()) return { amount: Dec.ZERO, direction: 'NONE' };
  // AUDIT ITEM 36 — the stated direction does NOT override a contradicting sign any more. A −$500
  // row whose event says IN is a REVERSAL of that event, and flipping its sign is how a credit and
  // its cancellation both added. The sign always keeps its meaning; the stated direction applies
  // only when the source carries no sign of its own.
  const negativeMeansOut = convention !== 'POSITIVE_IS_OUT';
  if (convention === 'ALWAYS_POSITIVE') {
    return { amount: d.abs(), direction: stated ?? 'NONE' };
  }
  const out = negativeMeansOut ? d.isNeg() : !d.isNeg();
  return { amount: d.abs(), direction: out ? 'OUT' : 'IN' };
}

/** The signed value, for arithmetic. IN is positive, OUT is negative, everywhere in the app.
 *  One convention, chosen once, so no screen has to remember which way this number runs. */
/* ─ MK-ST-F-019 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * signed
 *
 * Answers ..... The signed value, for arithmetic.
 *
 * Formula .....
 *     amount.neg()   if direction = 'OUT'
 *     amount   if direction = 'IN'
 *     dec.ZERO   otherwise   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-019
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function signed(m: Money): Dec {
  return m.direction === 'OUT' ? m.amount.neg() : m.direction === 'IN' ? m.amount : Dec.ZERO;
}

/** Add money SIGNED and EXACTLY — a credit and its reversal cancel to true zero, so a
 *  reconciliation can assert equality rather than a tolerance. */
/* ─ MK-ST-F-020 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * sumSigned
 *
 * Answers ..... Add money SIGNED and EXACTLY — a credit and its reversal cancel to true zero, so a reconciliation can assert equality rather than a tolerance.
 *
 * Formula .....
 *     dec.sum(items.map(signed))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-020
 * Changed ..... 2026-08-20 (ae39c4e)
 */
export function sumSigned(items: Money[]): Dec {
  return Dec.sum(items.map(signed));
}

/** Institution files write money as text: "$8,502.00 ", "($0.53)", "--", "1,234.56".
 *  Parentheses mean NEGATIVE — the accounting convention, and a real trap: read as a positive it
 *  flips the sign of every loss in a Fidelity export. */
/** DISPLAY-EDGE ONLY. Old call sites that still need a float get one, rounded once. New code holds
 *  Dec all the way and never calls this in a sum. */
/* ─ MK-ST-F-021 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * toNumber
 *
 * Answers ..... Institution files write money as text: "$8,502.00 ", "($0.53)", "--", "1,234.56".
 *
 * Formula .....
 *     nothing   when raw = nothing
 *     raw   if number.is finite(raw)
 *     nothing   otherwise   when raw is a number
 *     t = string(raw).trim()
 *     nothing   when t is missing (or t = '--' (or t = '-' (or t = 'n ÷ a' (or t = 'N ÷ A' when missing or zero) when missing or zero) when missing or zero) when missing or zero)
 *     parenthesised = ÷ ^\(. × \)$ ÷ .test(t)
 *     nothing   when t is missing (or ! ÷ ^-?\d × \.?\d+$ ÷ .test(t) when missing or zero)
 *     n = parse float(t)
 *     nothing   when !number.is finite(n)
 *     the answer:
 *     -size of(n)   if parenthesised
 *     n   otherwise
 *
 * Called by ... MK-ST-F-012 toLedgerRow · MK-ST-F-064 modifiedDietzOverWindow
 *               MK-XS-F-102 ingestSync
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-ST-F-064 modifiedDietzOverWindow
 *               MK-ST-F-012 toLedgerRow
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-021
 * Changed ..... 2026-08-18 (bfea15e)
 */
export function toNumber(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let t = String(raw).trim();
  if (!t || t === '--' || t === '-' || t === 'n/a' || t === 'N/A') return null;
  const parenthesised = /^\(.*\)$/.test(t);
  if (parenthesised) t = t.slice(1, -1);
  t = t.replace(/[$,\s]/g, '').replace(/%$/, '');
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return parenthesised ? -Math.abs(n) : n;
}

/* ─ MK-ST-F-055 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * round2
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     round2(n) = round(n × 100) ÷ 100
 *
 * Called by ... MK-CF-F-001 buildBudgetState · MK-CF-F-004 spendBuckets
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-009 monthlyEssentials
 *               MK-CF-F-010 emergencyTest · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-012 annualCashflow · MK-CF-F-014 budgetVsActual
 *               MK-CF-F-019 upcomingBills · MK-CF-F-020 cashflowYear
 *               MK-CF-F-025 minimumDebtService · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-027 totalDebtBalance · MK-CF-F-028 loanPayment
 *               MK-CF-F-033 debtToIncome · MK-CF-F-034 payoffPlan
 *               MK-CF-F-036 buildDebtState · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-071 extraIncome · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-106 solveSafeDraw · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-F-111 applyTransaction · MK-CF-F-119 investmentIncomeAnnual
 *               MK-CF-F-136 bumpCash · MK-CF-F-139 removeShares
 *               MK-CF-F-143 annualisedGross · MK-CF-F-144 takeHomeAsEntered
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-149 recurringDebtPayments · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-151 actualSpending · MK-CF-F-153 radar
 *               MK-CF-F-155 cash · MK-CF-F-156 plannedMonthFlow
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-171 earnerPay
 *               MK-CF-F-177 wageGrossByMonth · MK-CF-F-180 enteredLandsAnnual
 *               MK-CF-F-182 asPercent · MK-CF-F-183 paidOutByAccount
 *               MK-CF-F-184 incomeFromAccounts · MK-CF-F-186 convertTakeHomeMode
 *               MK-CF-O-001 basePay · MK-CF-O-002 spending
 *               MK-CF-O-004 incomeSummary · MK-NW-F-002 alternativesSummary
 *               MK-NW-F-015 totalAssets · MK-NW-F-016 cashTotal
 *               MK-NW-F-027 accountClassBreakdown · MK-NW-F-029 assetAllocation
 *               MK-NW-F-032 earmarkedAmount · MK-NW-F-033 retirementEarmarkedValue
 *               MK-NW-F-039 buildAssetsState · MK-NW-F-048 uberGroupRows
 *               MK-NW-F-049 itemizedTotal · MK-NW-F-050 itemizeRemainder
 *               MK-NW-F-051 itemizedResultTotal · MK-NW-F-052 buildItemizedAccounts
 *               MK-NW-F-057 annualCoupon · MK-NW-F-061 bondSummary
 *               MK-NW-F-062 couponIncomeAnnual · MK-NW-F-063 interestIncomeAnnual
 *               MK-NW-F-065 buildNetWorth · MK-NW-F-066 sumWhere
 *               MK-PF-F-002 costBasis · MK-PF-F-003 avgCost
 *               MK-PF-F-004 marketValue · MK-PF-F-005 unrealizedGain
 *               MK-PF-F-006 capGains · MK-PF-F-017 allocation
 *               MK-PF-F-023 lookBack · MK-PL-F-001 taxBucketSplit
 *               MK-PL-F-002 withdrawalPlan · MK-PL-F-007 rmdAtAge
 *               MK-PL-F-009 rmdTakenThisYear · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-011 buildGoalsState · MK-PL-F-012 waterfall
 *               MK-PL-F-020 requiredMonthly · MK-PL-F-026 planDoor
 *               MK-PL-F-031 taxOrganizer · MK-PL-F-032 rothConversionCost
 *               MK-PL-F-033 educationPlan · MK-PL-F-034 lifeInsuranceNeed
 *               MK-PL-F-036 weighGoals · MK-PL-F-048 capitalNeeded
 *               MK-PL-F-049 retirementSpendMonthly · MK-PL-F-050 simulate
 *               MK-PL-F-055 projectNestEgg · MK-ST-F-031 valueOn
 *               MK-ST-F-036 reconcile · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-005 trendPoints · MK-XS-F-007 makeMonthlySnapshot
 *               MK-XS-F-008 normalizeSnapshot · MK-XS-F-011 buildChangeWalk
 *               MK-XS-F-027 takeHomeMonthly · MK-XS-F-028 surplusByMonth
 *               MK-XS-F-029 monthlySavings
 *
 * Reaches ..... 183 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-005 accountAllowsTicker · MK-NW-F-027 accountClassBreakdown
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-151 actualSpending · MK-PF-F-017 allocation
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-019 alternativesTotal
 *               MK-CF-F-012 annualCashflow · MK-NW-F-057 annualCoupon
 *               MK-CF-F-143 annualisedGross · MK-CF-F-111 applyTransaction
 *               MK-NW-F-060 approxYTM · MK-CF-F-182 asPercent
 *               MK-NW-F-029 assetAllocation · MK-NW-F-011 assetClassOf
 *               MK-NW-F-007 assetKind · MK-PF-F-003 avgCost
 *               … and 165 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-055
 * Changed ..... 2026-08-18 (bfea15e)
 */
export const round2 = (n: number): number => Math.round(n * 100) / 100;
