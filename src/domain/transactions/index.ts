// Transaction ledger — the append-only history + a pure engine that applies a transaction to accounts.
// State model = "balance + statement": accounts hold live cash/positions for display, and every change
// also appends an immutable Transaction (here) for audit/history. applyTransaction is pure + tested.
import type { EntityId, UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { round2 } from '../_shared/num';
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
  | 'FEE';

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
  created_at: string;        // ISO — when it was entered (audit)
  undo_prev?: AssetAccount[]; // pre-apply copies of the touched accounts — lets a delete reverse
                              // this row's balance effect exactly (P0: ledger and balances must
                              // never drift; rows recorded before this field use inverseOf()).
}

const map = (accs: AssetAccount[], id: EntityId, fn: (a: AssetAccount) => AssetAccount) =>
  accs.map((a) => (a.asset_id === id ? fn(a) : a));
const cashOf = (a: AssetAccount) => a.cash_balance || 0;
// Where an account's spendable cash lives: investment accounts use the cash_balance SLEEVE; cash
// accounts (checking/savings) and property hold their money in `balance`. Moving cash must hit the
// right field, or a transfer/deposit on a savings account corrupts net worth.
const usesSleeve = (a: AssetAccount) => a.tax_bucket !== 'CASH' && a.tax_bucket !== 'PROPERTY';
const availableCash = (a: AssetAccount) => (usesSleeve(a) ? (a.cash_balance || 0) : (a.balance || 0));
function bumpCash(a: AssetAccount, delta: number): AssetAccount {
  return usesSleeve(a)
    ? { ...a, cash_balance: round2((a.cash_balance || 0) + delta) }
    : { ...a, balance: round2((a.balance || 0) + delta) };
}
const findPos = (a: AssetAccount, t: Transaction) =>
  (a.positions ?? []).find((p) => (t.position_id && p.position_id === t.position_id) || (t.ticker && p.ticker === t.ticker?.toUpperCase()));

/** Add shares to a position (creating it if needed) at a cost basis — used by BUY and reinvested dividends. */
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
function removeShares(a: AssetAccount, t: Transaction, shares: number): AssetAccount {
  const pos = findPos(a, t);
  if (!pos) return a;
  let remaining = shares;
  const lots = pos.lots.map((l) => ({ ...l }));
  for (const l of lots) {
    if (remaining <= 0) break;
    const take = Math.min(l.shares, remaining);
    l.shares = round2(l.shares - take);
    remaining = round2(remaining - take);
  }
  const kept = lots.filter((l) => l.shares > 1e-9);
  const positions = kept.length
    ? (a.positions ?? []).map((p) => p === pos ? { ...p, lots: kept } : p)
    : (a.positions ?? []).filter((p) => p !== pos);
  return { ...a, positions };
}

/** Apply one transaction to the accounts (pure). The ledger append is the caller's job. */
export function applyTransaction(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  switch (t.type) {
    case 'OPENING_POSITION':
      return map(accounts, t.account_id, (a) => addLot(a, t, t.shares || 0, t.price || 0));
    case 'OPENING_CASH':
      return map(accounts, t.account_id, (a) => ({ ...a, cash_balance: round2((t.amount || 0)) }));
    case 'DEPOSIT':
      return map(accounts, t.account_id, (a) => bumpCash(a, (t.amount || 0)));
    case 'WITHDRAWAL':
    case 'FEE':
      return map(accounts, t.account_id, (a) => bumpCash(a, -(t.amount || 0)));
    case 'BUY':
      return map(accounts, t.account_id, (a) => addLot(bumpCash(a, -((t.shares || 0) * (t.price || 0))), t, t.shares || 0, t.price || 0));
    case 'SELL':
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
export function makeTransaction(p: Omit<Transaction, 'id' | 'created_at'>): Transaction {
  return { ...p, ticker: p.ticker?.toUpperCase(), id: newEntityId('txn'), created_at: new Date().toISOString() };
}

// ── Delete-reversal machinery (P0: removing a ledger row must reverse its balance effect) ──────────
// Strategy: recordTransaction stores pre-apply copies of the touched accounts on the row (undo_prev).
// Deleting unwinds newest→target by restoring those copies, drops the row, then replays the rest —
// exact even when a later SELL consumed lots a deleted BUY created. Rows recorded before undo_prev
// existed fall back to a synthetic opposite transaction (cash-delta types only).

/** The account ids a transaction can touch. */
export function affectedAccountIds(t: Transaction): EntityId[] {
  return t.counter_account_id ? [t.account_id, t.counter_account_id] : [t.account_id];
}

/** Deep copies of the affected accounts, taken BEFORE applyTransaction. */
export function undoSnapshot(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  const ids = new Set(affectedAccountIds(t));
  return accounts.filter((a) => ids.has(a.asset_id)).map((a) => JSON.parse(JSON.stringify(a)));
}

/** Restore the affected accounts to the transaction's pre-apply copies (pure). */
export function restoreUndo(accounts: AssetAccount[], t: Transaction): AssetAccount[] {
  const byId = new Map((t.undo_prev ?? []).map((a) => [a.asset_id, a]));
  return accounts.map((a) => (byId.has(a.asset_id) ? JSON.parse(JSON.stringify(byId.get(a.asset_id))) : a));
}

/** Legacy fallback for rows recorded before undo_prev: a synthetic opposite transaction.
 *  Only pure cash-delta types are safely invertible; lot-touching and absolute types (BUY, SELL,
 *  the OPENING types, TRANSFER_IN_KIND, reinvested income) return null — those need the snapshot. */
export function inverseOf(t: Transaction): Transaction | null {
  const base: Transaction = { ...t, id: newEntityId('txn'), note: `reversal of ${t.id}` };
  switch (t.type) {
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
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal', TRANSFER: 'Transfer', TRANSFER_IN_KIND: 'Transfer shares',
  DIVIDEND: 'Dividend', INTEREST: 'Interest', COUPON: 'Coupon', FEE: 'Fee',
};
export function txnLabel(t: TxnType): string { return TYPE_LABEL[t] ?? t; }

/** Signed cash effect on the primary account (for display). */
export function cashEffect(t: Transaction): number {
  switch (t.type) {
    case 'DEPOSIT': case 'SELL': return (t.type === 'SELL' ? (t.shares || 0) * (t.price || 0) : (t.amount || 0));
    case 'DIVIDEND': case 'INTEREST': case 'COUPON': return t.reinvested ? 0 : (t.amount || 0);
    case 'WITHDRAWAL': case 'FEE': return -(t.amount || 0);
    case 'BUY': return -((t.shares || 0) * (t.price || 0));
    case 'TRANSFER': return -(t.amount || 0);
    default: return 0;
  }
}

/** Investment income (cash dividends/interest/coupons, not reinvested) over the trailing window — feeds
 *  the Income module. Reinvested payouts grow the position instead, so they're excluded. */
export function investmentIncomeAnnual(txns: Transaction[], now: Date = new Date()): number {
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1);
  return round2((txns ?? [])
    .filter((t) => (t.type === 'DIVIDEND' || t.type === 'INTEREST' || t.type === 'COUPON') && !t.reinvested && new Date(t.date) >= cutoff)
    .reduce((s, t) => s + (t.amount || 0), 0));
}

export interface TxnDoc { user_id: UserId; transactions: Transaction[]; }
