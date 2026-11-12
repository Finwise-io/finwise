/* PHASE 2, STEP 7 — THE COMPARISON CHECK (approved plan, 2026-11-11). For every account on the phone, the old copies'
 * answer beside the master record's answer: the shares of each holding, what was paid, the purchase dates, the account's
 * value and the day of that value. A test aid only: it reads both, saves nothing, and every difference it returns must
 * be explained by a test (one of the faults the rulings fix) or fixed.
 *
 * It proves it looked: `looked` counts the accounts and holdings compared, so a check that compared nothing cannot pass
 * as clean. */
import { openPurchases, rowsInForce, sharesOnRecord, valuesNow, oneHoldingSpelling, type AssetRow } from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import { contractMultiplier } from '../domain/performance';

export type Difference = {
  accountId: string;
  label: string;
  holding: string | null;
  what: 'shares' | 'paid' | 'purchase dates' | 'value' | 'value date' | 'holding only in the old copies' | 'holding only in the list';
  old: string | number | null;
  list: string | number | null;
};

const EPS = 1e-6;
const same = (x: number | null, y: number | null) => (x == null || y == null ? x == null && y == null : Math.abs(x - y) <= 0.005);

export function compareRecordToOldCopies(record: readonly AssetRow[], accounts: readonly any[]): { differences: Difference[]; looked: { accounts: number; holdings: number } } {
  const differences: Difference[] = [];
  let holdingsSeen = 0;
  const live = rowsInForce(record);
  for (const a of accounts) {
    const id = String(a.asset_id), label = String(a.label ?? id);
    const push = (holding: string | null, what: Difference['what'], old: any, list: any) => differences.push({ accountId: id, label, holding, what, old, list });
    const oldHoldings = new Map<string, any>();
    for (const p of a.positions ?? []) { const h = oneHoldingSpelling(p.ticker); if (h != null) oldHoldings.set(h, p); }
    const listHoldings = new Set(live.filter((r) => r.holding != null && (r.accountId === id || r.toAccountId === id) && r.kind !== 'VALUE' && r.kind !== 'FACT')
      .map((r) => r.holding as string).filter((h) => sharesOnRecord(record, id, h) > EPS));
    for (const h of new Set([...oldHoldings.keys(), ...listHoldings])) {
      holdingsSeen++;
      const p = oldHoldings.get(h);
      const per = p?.kind === 'options' ? contractMultiplier(p) : 1;
      // a bond quoted per $100 of face: its cost per share is per $100, so each dollar of face cost a hundredth of it
      const costPer = p && p.kind !== 'options' ? contractMultiplier(p) : 1;
      const oldLots = (p?.lots ?? []).filter((l: any) => (Number(l.shares) || 0) > 0);
      const oldShares = oldLots.reduce((t: number, l: any) => t + Number(l.shares) * per, 0);
      const listShares = sharesOnRecord(record, id, h);
      if (!p) { push(h, 'holding only in the list', null, listShares); continue; }
      if (!listHoldings.has(h)) { if (oldShares > EPS) push(h, 'holding only in the old copies', oldShares, null); continue; }
      if (Math.abs(oldShares - listShares) > EPS) push(h, 'shares', oldShares, listShares);
      const open = openPurchases(record, id, h);
      const oldPaid = oldLots.some((l: any) => l.cost_per_share == null) ? null : oldLots.reduce((t: number, l: any) => t + Number(l.shares) * Number(l.cost_per_share) * per * costPer, 0);
      const listPaid = open.some((o) => o.price == null) ? null : open.reduce((t, o) => t + o.shares * (o.price as number), 0);
      if (!same(oldPaid, listPaid)) push(h, 'paid', oldPaid, listPaid);
      // one day written two ways is one day: a time after it, or a blank written as empty text, is the same answer
      const oldDates = oldLots.map((l: any) => (l.purchase_date ? String(l.purchase_date).slice(0, 10) : '(none)')).sort().join(', ');
      const listDates = open.map((o) => o.date ?? '(none)').sort().join(', ');
      if (oldDates !== listDates) push(h, 'purchase dates', oldDates, listDates);
    }
    const now = valuesNow(record, id);
    const oldValue = typeof a.balance === 'number' ? a.balance : null;
    if (!same(oldValue, now?.total ?? null)) push(null, 'value', oldValue, now?.total ?? null);
    const oldDay = a.value_as_of ?? null;
    if ((oldDay ?? null) !== (now?.date ?? null)) push(null, 'value date', oldDay, now?.date ?? null);
  }
  return { differences, looked: { accounts: accounts.length, holdings: holdingsSeen } };
}
