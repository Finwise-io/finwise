/* PHASE 3, STAGE 1 — A TEST'S OLD-COPY FIXTURE, SEEDED THROUGH THE ONE MASTER RECORD (2026-11-12).
 * Today 210 test files put the old copies (accounts, activity, daily values) straight into the store. Once screens read
 * the read-outs of the record (asset-record-readouts.ts), each of those fixtures has to reach the record the way a phone's
 * data does. seedRecord does it in one call, with the test's own fixture unchanged:
 *   1. the fixture is put in the store as the test puts it today (a phone that has not moved yet);
 *   2. the one-time move (moveOldCopiesToRecordOnce) moves the typed and imported accounts with their lots and activity;
 *   3. a linked account — which the move skips by design — is sent through the real broker update (ingestSnapTradeSync),
 *      built from the account itself, so the record gets the broker's rows exactly as a sync writes them; the old copies
 *      the sync rebuilds are put back as the fixture had them;
 *   4. each recorded day (snapshotDays) becomes VALUE rows on its own date. Test-only: the real move never moves old days.
 * It reports what it did, so a test can assert it looked. */
import { useStore } from '../store/useStore';
import { valueRows, type NewRow } from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import type { AccountSyncPayload } from '../services/sync/ingest';

export interface Seeded { moved: number; linked: number; days: number; rows: number }

/** A linked account's own figures as the broker update it came from: its total, cash, holdings with their tax lots, and its
 *  linked activity. Options held only as display rows (option_holdings) are not sent: their value is in the total. */
export function brokerPayloadOf(a: any, transactions: readonly any[]): AccountSyncPayload {
  const id = String(a.snaptrade_account_id ?? a.asset_id);
  const day = a.value_as_of ?? (a.last_synced ? String(a.last_synced).slice(0, 10) : null);
  return {
    account: {
      id, brokerage_authorization: String(a.connection_id ?? 'seed-connection'), name: a.label ?? null, number: a.mask ?? null,
      institution_name: String(a.institution ?? ''), status: a.status ?? 'open',
      balance: { total: { amount: typeof a.balance === 'number' ? a.balance : null, currency: a.currency ?? 'USD' } },
      sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: day ? `${day}T20:30:00Z` : null } },
    } as any,
    positions: (a.positions ?? []).filter((p: any) => p.kind !== 'options').map((p: any) => {
      const lots = (p.lots ?? []).filter((l: any) => (Number(l.shares) || 0) > 0);
      const units = lots.reduce((t: number, l: any) => t + Number(l.shares), 0);
      const costed = lots.filter((l: any) => l.cost_per_share != null);
      return {
        symbol: { id: `seed-${p.ticker}`, raw_symbol: p.ticker, symbol: p.ticker, description: p.label ?? null, type: { code: p.broker_type ?? (p.asset_class === 'bond' ? 'bnd' : 'cs') } },
        units, price: p.last_price ?? null,
        average_purchase_price: costed.length === lots.length && units > 0 ? costed.reduce((t: number, l: any) => t + Number(l.shares) * Number(l.cost_per_share), 0) / units : null,
        ...(p.cash_equivalent ? { cash_equivalent: true } : {}),
        tax_lots: lots.map((l: any) => ({ original_purchase_date: l.purchase_date || null, quantity: Number(l.shares), purchased_price: l.cost_per_share ?? null })),
      };
    }),
    optionPositions: [],
    // a broker always sends its cash (the sync reads none as $0): the account's own, else what its total holds beyond its holdings
    balancesCash: a.cash_balance ?? (typeof a.balance === 'number'
      ? a.balance - (a.positions ?? []).reduce((t: number, p: any) => t + (p.lots ?? []).reduce((n: number, l: any) => n + (Number(l.shares) || 0), 0) * (p.last_price ?? 0) * (p.kind === 'options' ? (p.multiplier ?? 100) : 1), 0)
      : null),
    activities: transactions.filter((t) => String(t.account_id) === String(a.asset_id) && t.source === 'connected').map((t) => ({
      id: String(t.id), type: t.type, trade_date: t.date, settlement_date: null,
      units: t.shares == null ? null : (t.type === 'SELL' ? -Math.abs(t.shares) : t.shares), price: t.price ?? null,
      amount: t.amount == null ? null : (['BUY', 'WITHDRAWAL', 'FEE'].includes(t.type) || t.direction === 'OUT' ? -Math.abs(t.amount) : t.amount),
      fee: t.fee ?? null, symbol: t.ticker ? { id: `seed-${t.ticker}`, raw_symbol: t.ticker, symbol: t.ticker } : null,
    })) as any,
  };
}

/** One recorded day as the record's VALUE rows: one set per account on the day's own date, given by the account's source. */
export function dayRows(day: any, sourceOf: (accountId: string) => 'linked' | 'file' | 'typed'): NewRow[] {
  return (day.accounts ?? []).flatMap((a: any) => valueRows({
    accountId: String(a.accountId), date: day.date, source: sourceOf(String(a.accountId)), cash: a.cash ?? null, statedTotal: a.statedTotal ?? null, typedValue: a.typedValue ?? null,
    holdings: (day.holdings ?? []).filter((h: any) => h.accountId === a.accountId).map((h: any) => ({ holding: String(h.symbol ?? h.securityKey), shares: h.units ?? null, price: h.price ?? null, value: h.value ?? null })),
  }));
}

/** SEEDS THE STORE from a test's old-copy fixture through the one master record: the move, a broker step, the days. */
export function seedRecord(state: Record<string, unknown>, opts: { days?: boolean } = {}): Seeded {
  useStore.setState({ assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], ...state } as any);
  const before = (useStore.getState() as any).assetRecord.length as number;
  useStore.getState().moveOldCopiesToRecordOnce();
  const s0 = useStore.getState() as any;
  const moved = new Set((s0.assetRecord as any[]).filter((r) => r.kind === 'FACT' && String(r.ref ?? '').startsWith('moved-from-phone:')).map((r) => r.accountId)).size;
  // THE BROKER STEP: each linked account through the real broker update; the old copies it rebuilds are put back
  const linked = (s0.assetAccounts ?? []).filter((a: any) => a.source === 'connected');
  if (linked.length) {
    const keep = { assetAccounts: s0.assetAccounts, transactions: s0.transactions, snaptradeSeenKeys: s0.snaptradeSeenKeys, snaptradeConnections: s0.snaptradeConnections,
      wrapperConfirmQueue: s0.wrapperConfirmQueue };
    // the sync finds an account by its broker id: one the fixture left without it is given its own id for the update only
    useStore.setState({ assetAccounts: s0.assetAccounts.map((a: any) => (a.source === 'connected' && !a.snaptrade_account_id ? { ...a, snaptrade_account_id: String(a.asset_id) } : a)) } as any);
    const payloads = linked.map((a: any) => brokerPayloadOf(a, s0.transactions ?? []));
    const connections = [...new Set(payloads.map((p: AccountSyncPayload) => String(p.account.brokerage_authorization)))].map((id) => ({ id: String(id), brokerage: 'seed', disabled: false }));
    useStore.getState().ingestSnapTradeSync(payloads, connections);
    useStore.setState(keep as any);
  }
  // THE DAYS (test-only): each recorded day as VALUE rows on its own date
  const s1 = useStore.getState() as any;
  const days = opts.days === false ? [] : (s1.snapshotDays ?? []);
  if (days.length) {
    const src = new Map<string, 'linked' | 'file' | 'typed'>((s1.assetAccounts ?? []).map((a: any) => [String(a.asset_id), a.source === 'connected' ? 'linked' : a.source === 'imported' ? 'file' : 'typed']));
    for (const d of days) useStore.getState().saveToAssetRecord(dayRows(d, (id) => src.get(id) ?? 'typed'), d.writtenAt ?? `${d.date}T00:00:00Z`);
  }
  return { moved, linked: linked.length, days: days.length, rows: (useStore.getState() as any).assetRecord.length - before };
}
