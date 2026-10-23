// SnapTrade sync → store state (design v2 §4). PURE — the store action calls this and sets the
// result; every rule is pinned in ingest.test.ts.
//
// THE ONE RULE THAT GUARDS MONEY: for connected accounts the daily HOLDINGS SYNC is authoritative
// for balances and positions. Activities are appended as LEDGER HISTORY ONLY — they are never
// applied to balances (applying both would double-count every buy and dividend). Manual accounts
// keep the existing applyTransaction path untouched.
import type { AssetAccount } from '../../domain/assets';
import type { Transaction } from '../../domain/transactions';
import { newEntityId } from '../../domain/_shared/ids';
// THE CALCULATION MODULE. Classification and amounts come from the functions, so the app and the
// standalone bench compute identically. The guard in
// "Calculation Module code/engines/__tests__/no-stale-code.test.ts" fails the build if this file
// ever goes back to the old paths.
import { toLedgerRow } from '../../../Calculation Module code/engines/ledger';
import { classifyHoldingClass } from '../../../Calculation Module code/engines/holding-class';
import { reconcileAccountTotal } from '../../../Calculation Module code/engines/reconcile';
import { Dec } from '../../../Calculation Module code/engines/decimal';
import { contractMultiplier, isIndividualBondOrCD, lotCostOnRecord } from '../../domain/performance';
import {
  mapAccountType, mapPosition, mapOptionHolding, activityKey, netCashSleeve,
  type StAccount, type StPosition, type StOptionHolding, type StActivity, mergeHistoryFrom } from './snaptrade';

export interface AccountSyncPayload {
  account: StAccount;
  positions?: StPosition[];
  optionPositions?: StOptionHolding[];
  balancesCash?: number | null;          // Σ per-currency cash from the balances endpoint (USD v1)
  activities?: StActivity[];
}
export interface SyncResult {
  accounts: AssetAccount[];              // full next accounts array (upserted)
  newTransactions: Transaction[];        // history-only rows to APPEND (never applied)
  seenKeys: Record<string, true>;        // updated dedupe registry (persist me)
  needsWrapperConfirm: string[];         // asset_ids whose tax wrapper the UI must ask about
  /** Share transfers the broker reported again that are already stored: which way each one went, so
   *  a row stored before 2026-10-04 (with no direction) can be given it. */
  directionOf: { account_id: string; date: string; ticker?: string; shares?: number; direction: 'IN' | 'OUT' }[];
  /** Money records the broker reported again that are already stored (2026-10-21): the size it sends (null when it sends
   *  no amount) and which way the money went, so a record stored before 2026-10-21 — with no direction, and a real $0
   *  saved as no amount — can be given them (fixStoredMoney). */
  moneyOf?: StoredMoneyFix[];
  /** Buys and sales the broker reported again that are already stored (2026-10-21): the fee it sends for each, so a trade
   *  stored before 2026-10-21 — when the sync dropped the fee — can be given it (fixStoredFees). */
  feeOf?: StoredFeeFix[];
}

/** One buy or sale as the broker reports it again, with its fee: matched to the stored record by account, day, kind, ticker
 *  and shares. */
export interface StoredFeeFix {
  account_id: string; date: string; type: string; ticker?: string; shares?: number; fee: number; fee_in_price: boolean;
}

/** One money record as the broker reports it again: matched to the stored record by account, day, kind, ticker and size. */
export interface StoredMoneyFix {
  account_id: string; date: string; type: string; ticker?: string; size: number | null; direction?: 'IN' | 'OUT';
}

/** The kinds whose money IS their amount — the ones whose direction the sync writes down (2026-10-21). */
const MONEY_KINDS = new Set(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'DIVIDEND', 'INTEREST', 'COUPON', 'FEE']);

/** GIVE A MONEY RECORD STORED BEFORE 2026-10-21 THE DIRECTION THE BROKER REPORTS FOR IT (2026-10-21). Until then the sync
 *  kept only the size of a deposit, withdrawal, dividend, interest, coupon or fee, so a −$50 dividend — a reversal — was
 *  stored as a $50 dividend, and a real $0 was stored as no amount. Each fix is used once, on the first stored broker
 *  record with no direction of the same account, day, kind and ticker whose stored size is the broker's (or which holds
 *  no amount where the broker sends $0). A record that already states a direction, or that the person typed, is left as it is. */
/* ─ MK-XS-F-187 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fixStoredMoney
 *
 * Answers ..... GIVE A MONEY RECORD STORED BEFORE 2026-10-21 THE DIRECTION THE BROKER REPORTS FOR IT (2026-10-21).
 *
 * Formula .....
 *     transactions   when count of !fixes?
 *     used = new set<number>()
 *     t   when source ! = 'connected' (or direction (or !MONEY_KINDS.has(string(type)) when missing or zero) when missing or zero)
 *     stored = nothing   if amount = nothing (or amount = '' when missing or zero)
 *     amount read as a number   otherwise
 *     t   when i < 0
 *     f = fixes[i]
 *     the answer:
 *     ...t = ...t
 *     ...(f.direction ? { direction: f.direction } : {}) = ...(f.direction ? { direction: f.direction } : {})
 *     ...(stored == null && f.size === 0 ? { amount: 0 } : {}) = ...(stored == null && f.size === 0 ? { amount: 0 } : {})
 *
 * Called by ... MK-XS-F-102 ingestSync · MK-XS-F-175 uid
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-008 transaction amount
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-187
 * Changed ..... not in git yet (—)
 */
export function fixStoredMoney<T extends { type?: any; account_id?: any; date?: any; ticker?: any; amount?: any; direction?: any; source?: any }>(
  transactions: T[], fixes: StoredMoneyFix[],
): T[] {
  if (!fixes?.length) return transactions;
  const used = new Set<number>();
  return transactions.map((t) => {
    if (t?.source !== 'connected' || t.direction || !MONEY_KINDS.has(String(t.type))) return t;
    const stored = t.amount == null || t.amount === '' ? null : Number(t.amount);
    const i = fixes.findIndex((f, k) => !used.has(k) && f.account_id === String(t.account_id) && f.type === t.type
      && f.date === String(t.date ?? '').slice(0, 10) && (f.ticker ?? '') === String(t.ticker ?? '')
      && (stored == null ? f.size === 0 : f.size != null && Math.abs(f.size - Math.abs(stored)) < 0.005));
    if (i < 0) return t;
    used.add(i);
    const f = fixes[i];
    return { ...t, ...(f.direction ? { direction: f.direction } : {}), ...(stored == null && f.size === 0 ? { amount: 0 } : {}) };
  });
}

/** GIVE A BUY OR A SALE STORED BEFORE 2026-10-21 THE FEE THE BROKER REPORTS FOR IT (2026-10-21). Until then the sync dropped
 *  a trade's fee. Each fix is used once, on the first stored broker trade of the same account, day, kind, ticker and shares
 *  that holds no fee; a trade that already holds one, or that the person typed, is left as it is. */
/* ─ MK-XS-F-188 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fixStoredFees
 *
 * Answers ..... GIVE A BUY OR A SALE STORED BEFORE 2026-10-21 THE FEE THE BROKER REPORTS FOR IT (2026-10-21).
 *
 * Formula .....
 *     transactions   when count of !fixes?
 *     used = new set<number>()
 *     t   when source ! = 'connected' (or fee ≠ nothing (or type ! = 'BUY' and type ! = 'SELL' when missing or zero) when missing or zero)
 *     t   when i < 0
 *     the answer:
 *     ...t = ...t
 *     fee = fixes[i].fee
 *     fee in price = fixes[i].fee in price
 *
 * Called by ... MK-XS-F-102 ingestSync · MK-XS-F-175 uid
 *               MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-009 transaction date
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-188
 * Changed ..... not in git yet (—)
 */
export function fixStoredFees<T extends { type?: any; account_id?: any; date?: any; ticker?: any; shares?: any; fee?: any; source?: any }>(
  transactions: T[], fixes: StoredFeeFix[],
): T[] {
  if (!fixes?.length) return transactions;
  const used = new Set<number>();
  return transactions.map((t) => {
    if (t?.source !== 'connected' || t.fee != null || (t.type !== 'BUY' && t.type !== 'SELL')) return t;
    const i = fixes.findIndex((f, k) => !used.has(k) && f.account_id === String(t.account_id) && f.type === t.type
      && f.date === String(t.date ?? '').slice(0, 10) && (f.ticker ?? '') === String(t.ticker ?? '')
      && f.shares != null && Math.abs(f.shares - Number(t.shares)) < 1e-9);
    if (i < 0) return t;
    used.add(i);
    return { ...t, fee: fixes[i].fee, fee_in_price: fixes[i].fee_in_price };
  });
}

/** THE BROKER'S FEE ON A BUY OR A SALE, KEPT ON THE RECORD (2026-10-21). The sync dropped it. A fee the broker does not send
 *  is not on record (nothing is stored); a real $0 is stored as 0. The stored price of a trade is the broker's cash ÷ shares
 *  (toLedgerRow), and a broker's cash is usually AFTER the fee — the live E*TRADE sale of 50 GNR at $8.10 came to $402.75,
 *  not $405 — so the fee is then already inside the price, and fee_in_price says so, so it is never taken off twice. Only a
 *  cash figure equal to shares × the broker's price to the cent says the fee was left out of it; anything else (no cash
 *  figure aside) keeps the reading that the cash is what moved. Example: 10 sold at $120 with a $5 fee and $1,195 of cash
 *  → fee 5, in the price ($119.50); the same sale reported as $1,200 of cash → fee 5, not in the price ($120). */
/* ─ MK-XS-F-189 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * tradeFeeOnRecord
 *
 * Answers ..... THE BROKER'S FEE ON A BUY OR A SALE, KEPT ON THE RECORD (2026-10-21).
 *
 * Formula .....
 *     {}   when type ! = 'BUY' and type ! = 'SELL'
 *     fee = dec.parse(act.fee)
 *     {}   when fee = nothing
 *     size = fee.abs()
 *     cash = dec.parse(act.amount)
 *     units = dec.parse(act.units)
 *     price = dec.parse(act.price)
 *     fee = size.to number(2)
 *     fee in price = false   when cash = nothing (or cash.is zero() (or units = nothing (or units.is zero() when missing or zero) when missing or zero) when missing or zero)
 *     gross = units.abs().mul(price ?? dec.ZERO).round(2)
 *     left out = price ≠ nothing and !size.is zero() and cash.abs().round(2).eq(gross)
 *     the answer:
 *     fee = size.to number(2)
 *     fee in price = left out is missing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-PF-F-028 realizedFromLedger · MK-XS-F-102 ingestSync
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-167 COMPARE · MK-NW-F-080 HOLD
 *               MK-XS-F-102 ingestSync · MK-PF-F-028 realizedFromLedger
 *               MK-NW-O-006 theHolding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-189
 * Changed ..... not in git yet (—)
 */
export function tradeFeeOnRecord(
  type: string | undefined, act: { fee?: unknown; amount?: unknown; units?: unknown; price?: unknown },
): { fee?: number; fee_in_price?: boolean } {
  if (type !== 'BUY' && type !== 'SELL') return {};
  const fee = Dec.parse(act.fee);
  if (fee == null) return {};
  const size = fee.abs();
  const cash = Dec.parse(act.amount);
  const units = Dec.parse(act.units);
  const price = Dec.parse(act.price);
  // with no cash figure (or no shares) the stored price is the broker's own price, which never carries the fee
  if (cash == null || cash.isZero() || units == null || units.isZero()) return { fee: size.toNumber(2), fee_in_price: false };
  const gross = units.abs().mul(price ?? Dec.ZERO).round(2);
  const leftOut = price != null && !size.isZero() && cash.abs().round(2).eq(gross);
  return { fee: size.toNumber(2), fee_in_price: !leftOut };
}

/* ─ MK-XS-F-101 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * stAssetId
 *
 * Answers ..... What do we call this connected account internally?
 *
 * Formula .....
 *     the answer = 'st-' + the SnapTrade account identifier
 *
 * Called by ... MK-XS-F-102 ingestSync · MK-XS-F-116 runSnapTradeSync
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync · MK-XS-F-116 runSnapTradeSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-101
 * Changed ..... 2026-07-18 (0dc9061)
 */
export const stAssetId = (snapTradeAccountId: string) => `st-${snapTradeAccountId}`;

/** The cost of one share as the person set it — their purchases' cost averaged over their shares — or nothing when they set none. */
/* ─ MK-XS-F-184 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * theirCost
 *
 * Answers ..... The cost of one share as the person set it — their purchases' cost averaged over their shares — or nothing when they set none.
 *
 * Formula .....
 *     nothing   when prior.cost source ! = 'user'
 *     lots = (prior.lots ?? []) as { shares?: number; cost per share?: number | nothing }[] where (shares or 0) > 0 and lot cost on record(each as any)
 *     shares = Σ over lots of (shares (or 0 when missing or zero))
 *     the answer = Σ over shares > 0 ? lots of ((shares or 0) × (cost per share as number))÷ shares : nothing
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-007 purchase price and date (per lot)
 *
 * Decides .....
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-184
 * Changed ..... not in git yet (—)
 */
function theirCost(prior: any): number | null {
  if (prior?.cost_source !== 'user') return null;
  // OVER THE PURCHASES WHOSE PRICE PAID IS ON RECORD (lotCostOnRecord, 2026-10-21) — the one reading of a cost, as the Holding
  // page's average: 10 shares typed at $100 and 10 left blank (or saved at $0) kept $50.00 a share on every purchase at the
  // next sync; it is $100.00. With none on record, the person set no cost, and the broker's stands.
  const lots = ((prior.lots ?? []) as { shares?: number; cost_per_share?: number | null }[]).filter((l) => (l.shares || 0) > 0 && lotCostOnRecord(l as any));
  const shares = lots.reduce((t, l) => t + (l.shares || 0), 0);
  return shares > 0 ? lots.reduce((t, l) => t + (l.shares || 0) * (l.cost_per_share as number), 0) / shares : null;
}

/** HOW EACH LINKED BOND'S PRICE IS QUOTED (MK-XS-I-068, 2026-10-20). A broker can send a bond the way it sends a share —
 *  40 units at $100 — or the way bonds are quoted — a quantity that is the face amount, $4,000, at a price per $100 of
 *  it, 100.00; read as a share, the second is 100 times too much. SnapTrade's position says neither (it carries a quantity,
 *  a price and a cost only), so the broker's own total of the account decides: holdings at quantity × price, plus the
 *  options and the cash, either equal that total to the cent (as a share) or, with each individual bond or CD at
 *  quantity × price ÷ 100, they do (per $100 of face). Failing both, a face value the person entered that equals the
 *  quantity says per $100 of face. Otherwise the bond is 'unclear': its value is shown as quantity × price and the
 *  missing-information box names it. Each answer is for one holding; a holding that is not an individual bond or CD
 *  has none. Worked to the cent, the precision the broker states its total in, in exact decimals. */
/* ─ MK-XS-F-190 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * bondQuoteBasis
 *
 * Answers ..... HOW EACH LINKED BOND'S PRICE IS QUOTED (MK-XS-I-068, 2026-10-20).
 *
 * Formula .....
 *     d = (n: number) => dec.of(to fixed(8))
 *     per = D(units).mul(D(price))   if price ≠ nothing and number.is finite(price)
 *     D(cost)   if cost ≠ nothing and number.is finite(cost)
 *     nothing   otherwise   otherwise
 *     the answer = per
 *     bonds = for each of holdings: bond and units > 0 and worth(each) ≠ nothing
 *     for each of holdings: nothing   when !bonds.some(boolean)
 *     cents = (x: dec) => round(2)
 *     stated = cents(D(stated total))   if stated total ≠ nothing and number.is finite(stated total) and stated total > 0
 *     nothing   otherwise
 *     base = D(number.is finite(others) ? others : 0)
 *     as shares = dec.sum(holdings.map((h) => worth(h) ?? dec.ZERO)).add(base)
 *     per100 = dec.sum(holdings.map((h, i) => { const w = worth(h) ?? dec.ZERO; return bonds[i] ? div round(D(100)) : w; })).add(base)
 *     nothing   when bonds[i] is missing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-102 ingestSync
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-102 ingestSync
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-011 bond face value
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Decides .....
 *     · Shows 8 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-190
 * Changed ..... not in git yet (—)
 */
export function bondQuoteBasis(
  holdings: { units: number; price: number | null; cost: number | null; bond: boolean; face?: number | null }[],
  others: number,
  statedTotal: number | null,
): ('per_unit' | 'per_100_of_face' | 'unclear' | null)[] {
  const D = (n: number) => Dec.of(n.toFixed(8));
  const worth = (h: (typeof holdings)[number]): Dec | null => {
    const per = h.price != null && Number.isFinite(h.price) ? D(h.units).mul(D(h.price)) : h.cost != null && Number.isFinite(h.cost) ? D(h.cost) : null;
    return per;
  };
  const bonds = holdings.map((h) => h.bond && h.units > 0 && worth(h) != null);
  if (!bonds.some(Boolean)) return holdings.map(() => null);
  const cents = (x: Dec) => x.round(2);
  const stated = statedTotal != null && Number.isFinite(statedTotal) && statedTotal > 0 ? cents(D(statedTotal)) : null;
  const base = D(Number.isFinite(others) ? others : 0);
  const asShares = Dec.sum(holdings.map((h) => worth(h) ?? Dec.ZERO)).add(base);
  const per100 = Dec.sum(holdings.map((h, i) => { const w = worth(h) ?? Dec.ZERO; return bonds[i] ? w.divRound(D(100)) : w; })).add(base);
  const told: 'per_unit' | 'per_100_of_face' | null = stated == null ? null
    : cents(asShares).eq(stated) ? 'per_unit'
    : cents(per100).eq(stated) ? 'per_100_of_face' : null;
  return holdings.map((h, i) => {
    if (!bonds[i]) return null;
    if (told) return told;
    return h.face != null && h.face > 0 && h.face === h.units ? 'per_100_of_face' : 'unclear';
  });
}

/* ─ MK-XS-F-102 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * ingestSync
 *
 * Answers ..... A broker just sent us data — what changes?
 *
 * Formula .....
 *     accounts = [...existing accounts]
 *     seen keys = { ...existing seen keys }
 *     new transactions = []
 *     needs wrapper confirm = []
 *     direction of = []
 *     money of = []
 *     fee of = []
 *     st = account
 *     guess = map account type(st.raw type, st.account category)
 *     tail = string(st.number).slice(-4)   if st.number
 *     ''   otherwise
 *     mask = `••${tail}`   if ÷ ^\d{4}$ ÷ .test(tail)
 *     undefined   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-005 holding price
 *               MK-XS-I-007 purchase price and date (per lot)
 *               MK-XS-I-010 transaction words (the institution's own wording)
 *               MK-XS-I-011 bond face value
 *
 * Decides .....
 *     · If target return is missing it uses 8%.
 *     · If balance is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-102
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function ingestSync(
  existingAccounts: AssetAccount[],
  existingSeenKeys: Record<string, true>,
  payloads: AccountSyncPayload[],
  nowIso: string = new Date().toISOString(),
): SyncResult {
  const accounts = [...existingAccounts];
  const seenKeys: Record<string, true> = { ...existingSeenKeys };
  const newTransactions: Transaction[] = [];
  const needsWrapperConfirm: string[] = [];
  const directionOf: SyncResult['directionOf'] = [];
  const moneyOf: StoredMoneyFix[] = [];
  const feeOf: StoredFeeFix[] = [];

  for (const p of payloads) {
    const st = p.account;
    const guess = mapAccountType(st.raw_type, st.account_category);
    // LIVE-VERIFIED 2026-07-19 (founder catch): some brokers (E*TRADE) won't share the real account
    // number — SnapTrade relays a SCRAMBLED identifier ("…9Cmw"). Its last 4 are gibberish, not the
    // user's digits. A mask exists ONLY when the tail is actually 4 digits; otherwise none (twins
    // are told apart by a stable "· 1 / · 2" ordinal in accountDisplayNames).
    const tail = st.number ? String(st.number).slice(-4) : '';
    const mask = /^\d{4}$/.test(tail) ? `••${tail}` : undefined;
    // AUDIT FIX 2026-07-18 (P0 merge gate, design §2.7): find this account by its SnapTrade id
    // first; failing that, ABSORB a manual/imported twin (same institution + same mask, else same
    // institution + same tax bucket) instead of creating a double-counting sibling. The absorbed
    // row keeps its asset_id (ledger references), earmark and any confirmed wrapper.
    const inst = st.institution_name.trim().toLowerCase();
    const prior =
      accounts.find((a) => (a as any).snaptrade_account_id === st.id) ??
      accounts.find((a) => a.asset_id === stAssetId(st.id)) ??
      accounts.find((a) => a.source !== 'connected' && (a.institution ?? '').trim().toLowerCase() === inst
        && (mask && a.mask ? a.mask === mask : a.tax_bucket === guess.tax_bucket));
    const assetId = prior?.asset_id ?? stAssetId(st.id);

    // positions (options are display detail on the account, never re-added to totals)
    const mapped = (p.positions ?? []).map(mapPosition).filter((m): m is NonNullable<typeof m> => !!m);
    const optionRows = (p.optionPositions ?? []).map((o) => mapOptionHolding(o)).filter((m): m is NonNullable<typeof m> => !!m);
    // A MONEY-MARKET FUND THE BROKER FLAGS AS "cash equivalent" IS A HOLDING, LIKE ANY OTHER. It used to
    // be dropped from this list while MK-XS-F-110 netCashSleeve also took it out of the cash — so it was
    // in neither, the account was marked as not adding up to the broker's total by exactly its value,
    // and a small one was swept into Cash by the rounding rule (found 2026-10-05, on the outside
    // review of MK-NW-F-027). It stays in the list; the cash beside it is still net of it, so it is
    // counted once. Its CLASS is the broker's (his ruling, 2026-10-20: "always the class broker sends"):
    // the flag says cash, so it is Cash — it was Stocks / Funds by DEC-0051 until that ruling.
    const positions = mapped
      .map((m, i) => {
        const priorPos = prior?.positions?.find((x: any) => x.ticker === m.ticker);
        const prevCls = priorPos?.asset_class == null ? null
          : priorPos.asset_class === 'bond' ? 'bonds' as const
          : priorPos.asset_class === 'other' ? 'alternatives' as const
          : priorPos.asset_class === 'cash' ? 'cash' as const : 'stocks_etf' as const;
        // THE ONE CLASSIFIER, full evidence — the person's own answer outranks everything and survives this sync (B7,
        // DEC-2161); then THE CLASS THE BROKER SENDS (his ruling, 2026-10-20: "always the class broker sends"), which
        // re-classes a holding saved under the old name-first order at this sync; only when the broker sends no usable
        // class, the name and the other rules — and a class change those would make between syncs keeps the previous
        // class and FLAGS it rather than moving the money quietly.
        const verdict = classifyHoldingClass({
          name: m.name, ticker: m.ticker, brokerTag: m.brokerTag,
          cashEquivalent: m.cashEquivalent, hasSecurityIdentity: true,
          userAnswer: priorPos?.class_source === 'user' ? prevCls : null,
          previousClass: prevCls,
        });
        const cls = verdict.cls;
        return {
          position_id: priorPos?.position_id ?? newEntityId('pos'),
          ticker: m.ticker,
          name: m.name,                                          // readable security name (CUSIPs aren't)
          kind: cls === 'bonds' ? 'fixed_income' : cls === 'alternatives' ? 'crypto' : cls === 'cash' ? 'money_market' : 'stocks_etf',
          asset_class: cls === 'bonds' ? 'bond' as const : cls === 'alternatives' ? 'other' as const : cls === 'cash' ? 'cash' as const : 'stock_etf' as const,
          class_source: priorPos?.class_source,                  // the person's answer survives
          // the broker's own type and cash-equivalent flag, kept exactly as sent, so every reader asks the one order
          // with the broker's word in it (MK-NW-F-109 holdingClassOf; his ruling, 2026-10-20)
          ...(m.brokerTag ? { broker_type: m.brokerTag } : {}),
          ...(m.cashEquivalent ? { cash_equivalent: true as const } : {}),
          // a kept flag stays until resolved — unless the broker's own class now decides, which nothing holds back
          class_flag: verdict.source === 'broker' ? undefined : (verdict.flagged ?? priorPos?.class_flag),
          cost_source: priorPos?.cost_source,                    // …and so does a cost they set (below)
          // HIS RULING, 2026-09-30 (master Q11: "Refuse the line and ask"). Where NOTHING says what this
          // holding is, the app used to file it under Stocks / Funds and move on. It is now marked as
          // asked: it is counted in no class (it shows as Unclassified) and Net worth asks the person.
          class_asked: priorPos?.class_source !== 'user' && (verdict.source === 'security-default' || verdict.source === 'unlabelled') ? true as const : undefined,
          lots: m.lots.map((l) => ({
            lot_id: newEntityId('lot'),
            shares: l.shares,
            // HIS RULING, 2026-09-30 (master Q12): "cost basis should not be overwritten in future sync as
            // quantity, price and market value can change with time but not cost." The shares are the
            // broker's; the cost of a share is the person's, where they set one.
            // A COST THE BROKER DOES NOT SEND IS NOT ON RECORD — stored as null, never $0 (2026-10-20). As $0 the
            // average price counted it as a real cost while the gains left it out, so one page read it two ways.
            cost_per_share: theirCost(priorPos) ?? l.cost_per_share ?? null,
            purchase_date: l.purchase_date ?? '',
          })),
          last_price: m.price ?? undefined,                      // broker's daily mark (no live feed needed)
          // A BOND'S OWN FACTS SURVIVE THE SYNC (DEC-0281, DEC-6212): SnapTrade sends no face value, coupon rate or maturity
          // date for a bond (its position carries a quantity, a price and a cost only), so these come from the person, in
          // the holding editor — and a sync that rebuilt the holding used to drop them.
          ...(priorPos?.face_value != null ? { face_value: priorPos.face_value } : {}),
          ...(priorPos?.coupon_rate != null ? { coupon_rate: priorPos.coupon_rate } : {}),
          ...(priorPos?.maturity_date ? { maturity_date: priorPos.maturity_date } : {}),
        } as any;
      });
    // HOW EACH BOND'S PRICE IS QUOTED (bondQuoteBasis, 2026-10-20): per $100 of face, or as a share is, told apart by the
    // broker's own total; where nothing can tell, the holding is marked and the missing-information box names it.
    {
      const usd = st.balance?.total?.currency == null || st.balance?.total?.currency === 'USD';
      const quotes = bondQuoteBasis(positions.map((pos: any) => ({
        units: (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0), 0),
        price: pos.last_price ?? null,
        // what was paid, read one way (lotCostOnRecord, 2026-10-21): with no purchase whose price paid is on record it is not known, never $0
        cost: (pos.lots ?? []).some((l: any) => lotCostOnRecord(l)) ? (pos.lots ?? []).reduce((x: number, l: any) => x + (lotCostOnRecord(l) ? (l.shares || 0) * l.cost_per_share : 0), 0) : null,
        bond: isIndividualBondOrCD({ ...pos, label: pos.name } as any),
        face: pos.face_value ?? null,
      })), optionRows.reduce((t, o) => t + (o.value || 0), 0) + (netCashSleeve(p.balancesCash, mapped) || 0),
      usd ? (st.balance?.total?.amount ?? null) : null);
      positions.forEach((pos: any, i: number) => {
        if (quotes[i] === 'per_100_of_face' || quotes[i] === 'unclear') pos.price_quote = quotes[i];
      });
    }

    const next: AssetAccount = {
      ...(prior ?? {}),
      asset_id: assetId,
      label: st.name || `${st.institution_name} account`,
      institution: st.institution_name,
      mask: mask ?? prior?.mask,
      snaptrade_account_id: st.id,
      // the wrapper: keep a USER-confirmed wrapper forever; otherwise take the mapping's guess
      kind: prior?.wrapper_confirmed ? prior.kind : guess.kind,
      tax_bucket: prior?.wrapper_confirmed ? prior.tax_bucket : guess.tax_bucket as AssetAccount['tax_bucket'],   // undefined = not stated (DEC-4036f, 2026-10-10)
      target_return: prior?.target_return ?? 0.08,   // benchmark default for a brokerage; refined by class later
      // THE AUTHORITY RULE: balance = the broker's own total (includes options + money market).
      // B47 finding 3 (Vanguard): some brokers report NO usable total while the positions carry the
      // real value — a $132k account must never read $0. When the reported total is missing or zero
      // but the account demonstrably holds value, derive the balance from holdings (live marks,
      // cost basis when unpriced — the same honest fallback pricing uses) + options + the cash sleeve.
      balance: (() => {
        const usd = st.balance?.total?.currency == null || st.balance?.total?.currency === 'USD';
        if (!usd) return prior?.balance ?? 0;   // non-USD: marks are non-USD too — never derive "dollars"
        const reported = st.balance?.total?.amount ?? null;
        if (reported != null && reported > 0) return reported;               // the broker's word stands
        const derived = positions.reduce((t, pos) => {
          const sh = (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0), 0);
          // what was paid, over the purchases whose price paid is on record (lotCostOnRecord, 2026-10-21) — the one reading of a cost
          const basis = (pos.lots ?? []).reduce((x: number, l: any) => x + (lotCostOnRecord(l) ? (l.shares || 0) * l.cost_per_share : 0), 0);
          // × the one multiplier (MK-PF-F-031): a bond quoted per $100 of face is a hundredth of quantity × price
          return t + (pos.last_price != null ? sh * pos.last_price : basis) * contractMultiplier(pos);
        }, 0)
          + optionRows.reduce((t, o) => t + (o.value || 0), 0)
          + (netCashSleeve(p.balancesCash, mapped) || 0);
        // held exact (DEC-0403): the derived total was rounded to cents here until 2026-10-20
        if (derived > 0) return derived;
        return reported ?? prior?.balance ?? 0;                              // genuinely empty stays honest
      })(),
      // THE CURRENCY THE BROKER STATES, KEPT ON THE RECORD (DEC-0312, 2026-08-20: "non-USD holdings deferred, not
      // dropped — store the currency field now"). Only a three-letter code is kept, exactly as the broker writes it.
      // Nothing is converted and no figure changes: conversion stays deferred by his ruling, and the dollar check
      // above still decides every number. A broker that states none leaves whatever the record already had.
      ...(typeof st.balance?.total?.currency === 'string' && /^[A-Z]{3}$/.test(st.balance.total.currency)
        ? { currency: st.balance.total.currency } : {}),
      cash_balance: netCashSleeve(p.balancesCash, mapped),
      // provided-but-empty = sold out (stale rows would lie) — but a holding the PERSON added to this
      // account is theirs, and stays even when the broker's list does not carry it (the same ruling)
      positions: p.positions != null
        ? [...positions, ...((prior?.positions ?? []) as any[]).filter((x) => x.added_by === 'user' && !positions.some((y) => y.ticker === x.ticker))]
        : prior?.positions,
      // the shares per contract the broker states — 10 for a mini option, else 100 (DEC-4646, 2026-10-12)
      option_holdings: optionRows.length ? optionRows.map((o) => ({ label: o.label, contracts: o.contracts, value: o.value, cost_basis: o.costBasis, multiplier: o.multiplier })) : undefined,
      source: 'connected',
      connection_id: st.brokerage_authorization,
      last_synced: st.sync_status?.holdings?.last_successful_sync ?? nowIso,
      value_as_of: nowIso.slice(0, 10),
      // FOUNDER RULE 2026-08-04 (fifth ingredient check): remember how far back this broker's own
      // activity feed reaches, so year-scale income figures can label their real coverage.
      // Depth only ever deepens — a later shallow page can't shorten it (mergeHistoryFrom).
      history_from: mergeHistoryFrom(prior?.history_from,
        (p.activities ?? []).map((act: any) => act.trade_date ?? act.settlement_date ?? null)),
      // THE PERSON'S HISTORY START DATE IS NEVER OVERWRITTEN BY A SYNC (DEC-4059c, 2026-10-10; tenet 5, the person's
      // word outranks the app): the date they entered from "Edit date" is carried over exactly as they left it.
      ...(prior?.history_start_override ? { history_start_override: prior.history_start_override } : {}),
      // E11 ASSERTION 1 — holdings + options + the cash sleeve vs the broker's own stated total.
      // Exact: a mismatch is a NAMED difference stored on the account, never a tolerance.
      recon_break: (() => {
        const reported = st.balance?.total?.amount ?? null;
        const usd = st.balance?.total?.currency == null || st.balance?.total?.currency === 'USD';
        if (!usd || reported == null || reported <= 0 || p.positions == null) return undefined;
        const values = positions.map((pos) => {
          const sh = (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0), 0);
          // × the one multiplier (MK-PF-F-031): a bond quoted per $100 of face is a hundredth of quantity × price
          return (pos.last_price != null ? sh * pos.last_price
            : (pos.lots ?? []).reduce((x: number, l: any) => x + (lotCostOnRecord(l) ? (l.shares || 0) * l.cost_per_share : 0), 0)) * contractMultiplier(pos);
        });
        const r = reconcileAccountTotal(
          [...values, ...optionRows.map((o) => o.value || 0)],
          netCashSleeve(p.balancesCash, mapped) || 0,
          reported,
        );
        return r.ok ? undefined : { difference: r.difference.toString(), at: nowIso.slice(0, 10) };
      })(),
      status: st.status ?? 'open',
      // a linked account's balance is the broker's own value, never what was paid or a face value (DEC-0281, settleBondValue)
      value_basis: undefined,
    };

    if (!guess.confident && !prior?.wrapper_confirmed) needsWrapperConfirm.push(assetId);

    const idx = accounts.findIndex((a) => a.asset_id === assetId);
    if (idx >= 0) accounts[idx] = next; else accounts.push(next);

    // activities → history-only ledger rows (dedupe survives SnapTrade id churn)
    for (const act of p.activities ?? []) {
      const k = activityKey(st.id, act);
      if (seenKeys[k]) {
        // A SHARE TRANSFER STORED BEFORE 2026-10-04 CARRIES NO DIRECTION, and a return cannot be
        // measured across it. The broker still reports the activity, so the direction is read again
        // here and handed back for the stored row — the row itself is never imported twice.
        const again = toLedgerRow({ word: act.type, amount: act.amount, units: act.units, price: act.price,
          date: act.trade_date ?? act.settlement_date ?? nowIso, ticker: act.symbol?.raw_symbol ?? act.symbol?.symbol,
          description: act.description, isOption: !!act.option_symbol || !!act.option_type }, 'NEGATIVE_IS_OUT');
        if (again.type === 'TRANSFER_IN_KIND' && (again.event === 'SECURITIES_IN' || again.event === 'SECURITIES_OUT')) {
          directionOf.push({ account_id: String(assetId), date: again.date ?? '', ticker: again.ticker, shares: again.shares,
            direction: again.event === 'SECURITIES_IN' ? 'IN' : 'OUT' });
        }
        // A MONEY RECORD STORED BEFORE 2026-10-21 CARRIES NO DIRECTION, and a real $0 on it was stored as no amount: the
        // broker's size and direction are handed back for it (fixStoredMoney) — the record is never imported twice
        if (MONEY_KINDS.has(again.type) && !again.reinvested) {
          moneyOf.push({ account_id: String(assetId), date: again.date ?? '', type: again.type, ticker: again.ticker,
            size: Dec.parse(act.amount) == null ? null : again.amount.toNumber(2),
            ...(again.direction === 'IN' || again.direction === 'OUT' ? { direction: again.direction } : {}) });
        }
        // A BUY OR A SALE STORED BEFORE 2026-10-21 HOLDS NO FEE: the broker's fee is handed back for it (fixStoredFees)
        const againFee = tradeFeeOnRecord(again.type, act);
        if (againFee.fee != null) {
          feeOf.push({ account_id: String(assetId), date: again.date ?? '', type: again.type, ticker: again.ticker,
            shares: again.shares, fee: againFee.fee, fee_in_price: againFee.fee_in_price === true });
        }
        continue;
      }
      seenKeys[k] = true;
      // THE CALCULATION MODULE decides what this row is and which way its money went. The old code
      // guessed an unrecognised word from the sign of the amount, which put $1,064,493 of
      // contributions on an account where nothing came in, and it stored Math.abs(amount), which
      // doubled a reinvestment pair into $2,387 of interest against $1,193 received.
      const row = toLedgerRow({
        word: act.type,
        amount: act.amount,
        units: act.units,
        price: act.price,
        date: act.trade_date ?? act.settlement_date ?? nowIso,
        ticker: act.symbol?.raw_symbol ?? act.symbol?.symbol,
        description: act.description,
        isOption: !!act.option_symbol || !!act.option_type,
      }, 'NEGATIVE_IS_OUT');   // SnapTrade signs a buy negative — declared once, per road.

      // A marker carrying no money and no units explains nothing and is not written down. A row
      // that DOES carry money always is — including a cash-settled option exercise, which the old
      // code dropped along with its proceeds.
      if (row.isEmptyMarker) continue;

      newTransactions.push({
        id: newEntityId('txn'),
        date: row.date ?? nowIso.slice(0, 10),
        type: row.type,
        account_id: assetId as any,   // absorbed-twin ids are pre-existing entity ids
        ticker: row.ticker,
        shares: row.shares,
        price: row.price,
        // THE APP-STORE EDGE. The function holds an exact decimal; the store still holds floats until
        // Track 1 carries Dec into it. Rounded ONCE here (R6) — never summed again as a float in
        // the function layer, where every total now runs exact.
        // A BROKER'S REAL $0 IS SAVED AS 0, AND A MISSING AMOUNT AS NOT ON RECORD (2026-10-21, DEC-3523 tenet 3: unknown is
        // not zero). Both were saved as no amount, so a real $0 deposit refused the return, and interest the broker sent
        // with no amount could not be told from interest of $0. The one reader of a broker's figure decides which it is.
        amount: Dec.parse(act.amount) == null ? undefined : row.amount.toNumber(2),
        // the broker's fee on a buy or a sale, and whether the price above already carries it (tradeFeeOnRecord, 2026-10-21)
        ...tradeFeeOnRecord(row.type, act),
        reinvested: row.reinvested,
        // WHICH WAY THE SHARES WENT. "Transferred in" and "transferred out" both become TRANSFER_IN_KIND,
        // so the type alone cannot say — and a return across that day counted the shares as gained or
        // lost. The row already knows the direction; it is written down here so it is not lost.
        // A CASH JOURNAL IS THE SAME (2026-10-20): "JOURNAL" is a move between the person's own accounts, written as a
        // TRANSFER that names only this account, and the amount is kept unsigned — so $500 journalled IN read as $500
        // leaving. The broker's sign says which way; it is written down here so the return and the walk can read it.
        // A DEPOSIT OR A WITHDRAWAL IS THE SAME (2026-10-21): a broker's −$500 "deposit" is a reversal — $500 that LEFT —
        // and was saved as a plain $500 deposit, so the return, the walk and the activity list read $500 coming in. Its
        // direction is written as the journal's is, and every reader reads it one way (moneyIntoAccount, ledger.ts).
        // EVERY OTHER MONEY RECORD IS THE SAME (2026-10-21, the class): a −$50 dividend is a reversal, $50 that LEFT, and a
        // +$5 fee is a refund, $5 that came IN — each was saved as its size alone and read its kind's way. A dividend,
        // interest, a coupon or a fee now keeps the broker's direction too, read the one way (moneyIntoAccount).
        direction: row.event === 'SECURITIES_IN' ? 'IN' : row.event === 'SECURITIES_OUT' ? 'OUT'
          : MONEY_KINDS.has(row.type) && (row.direction === 'IN' || row.direction === 'OUT')
            ? row.direction : undefined,
        note: [row.note, row.recognised ? undefined : `broker word: ${row.sourceWord}`]
          .filter(Boolean).join(' · ') || undefined,
        // A WORD THE APP DOES NOT KNOW is kept on its own field (2026-10-20, Q15), so the return refuses across its day and
        // the gap banner names it (unnamedActivityOf, ledger.ts) — not only in a note
        ...(row.recognised ? {} : { unclassified_word: row.sourceWord }),
        source: 'connected',
        created_at: nowIso,
      } as Transaction);
    }
  }
  return { accounts, newTransactions, seenKeys, needsWrapperConfirm, directionOf, ...(moneyOf.length ? { moneyOf } : {}), ...(feeOf.length ? { feeOf } : {}) };
}

/** Mark an account's wrapper as USER-CONFIRMED — future syncs never override it. */
/* ─ MK-XS-F-103 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * confirmWrapper
 *
 * Answers ..... Mark an account's wrapper as USER-CONFIRMED — future syncs never override it.
 *
 * Formula .....
 *     for each of accounts: ...each = ...each
 *     kind = kind
 *     tax bucket = tax bucket
 *     wrapper confirmed = true   if asset id = asset id
 *     each   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-103
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function confirmWrapper(accounts: AssetAccount[], assetId: string, kind: string, taxBucket: AssetAccount['tax_bucket']): AssetAccount[] {
  return accounts.map((a) => (a.asset_id === assetId ? { ...a, kind, tax_bucket: taxBucket, wrapper_confirmed: true } : a));
}

