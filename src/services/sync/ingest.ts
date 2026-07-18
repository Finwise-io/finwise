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
import {
  mapAccountType, mapPosition, mapOptionHolding, mapActivityType, activityKey, netCashSleeve,
  type StAccount, type StPosition, type StOptionHolding, type StActivity,
} from './snaptrade';

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
}

export const stAssetId = (snapTradeAccountId: string) => `st-${snapTradeAccountId}`;

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

  for (const p of payloads) {
    const st = p.account;
    const assetId = stAssetId(st.id);
    const prior = accounts.find((a) => a.asset_id === assetId);
    const guess = mapAccountType(st.raw_type, st.account_category);

    // positions (options are display detail on the account, never re-added to totals)
    const mapped = (p.positions ?? []).map(mapPosition).filter((m): m is NonNullable<typeof m> => !!m);
    const optionRows = (p.optionPositions ?? []).map((o) => mapOptionHolding(o)).filter((m): m is NonNullable<typeof m> => !!m);
    const positions = mapped
      .filter((m) => !m.cashEquivalent)                          // money-market lives in the sleeve
      .map((m, i) => ({
        position_id: prior?.positions?.find((x: any) => x.ticker === m.ticker)?.position_id ?? newEntityId('pos'),
        ticker: m.ticker,
        kind: m.assetClass === 'bonds' ? 'fixed_income' : m.assetClass === 'alternatives' ? 'crypto' : 'stocks_etf',
        asset_class: m.assetClass === 'bonds' ? 'bond' as const : m.assetClass === 'alternatives' ? 'other' as const : 'stock_etf' as const,
        lots: m.lots.map((l) => ({
          lot_id: newEntityId('lot'),
          shares: l.shares,
          cost_per_share: l.cost_per_share ?? 0,
          purchase_date: l.purchase_date ?? '',
        })),
        last_price: m.price ?? undefined,                        // broker's daily mark (no live feed needed)
      }));

    const next: AssetAccount = {
      ...(prior ?? {}),
      asset_id: assetId,
      label: st.name || `${st.institution_name} account`,
      institution: st.institution_name,
      mask: st.number ? `••${String(st.number).slice(-4)}` : prior?.mask,
      // the wrapper: keep a USER-confirmed wrapper forever; otherwise take the mapping's guess
      kind: prior?.wrapper_confirmed ? prior.kind : guess.kind,
      tax_bucket: prior?.wrapper_confirmed ? prior.tax_bucket : guess.tax_bucket,
      target_return: prior?.target_return ?? 0.08,   // benchmark default for a brokerage; refined by class later
      // THE AUTHORITY RULE: balance = the broker's own total (includes options + money market)
      balance: st.balance?.total?.amount ?? prior?.balance ?? 0,
      cash_balance: netCashSleeve(p.balancesCash, mapped),
      positions: positions.length ? positions : prior?.positions,
      option_holdings: optionRows.length ? optionRows.map((o) => ({ label: o.label, contracts: o.contracts, value: o.value, cost_basis: o.costBasis })) : undefined,
      source: 'connected',
      connection_id: st.brokerage_authorization,
      last_synced: st.sync_status?.holdings?.last_successful_sync ?? nowIso,
      value_as_of: nowIso.slice(0, 10),
      status: st.status ?? 'open',
    };

    if (!guess.confident && !prior?.wrapper_confirmed) needsWrapperConfirm.push(assetId);

    const idx = accounts.findIndex((a) => a.asset_id === assetId);
    if (idx >= 0) accounts[idx] = next; else accounts.push(next);

    // activities → history-only ledger rows (dedupe survives SnapTrade id churn)
    for (const act of p.activities ?? []) {
      const k = activityKey(st.id, act);
      if (seenKeys[k]) continue;
      seenKeys[k] = true;
      const m = mapActivityType(act);
      if (m.txnType === 'SKIP') continue;
      newTransactions.push({
        id: newEntityId('txn'),
        date: (act.trade_date ?? act.settlement_date ?? nowIso).slice(0, 10),
        type: m.txnType === 'ADJUST' ? 'ADJUSTMENT' : m.txnType,
        account_id: assetId as any,
        ticker: act.symbol?.raw_symbol ?? act.symbol?.symbol ?? undefined,
        shares: act.units ?? undefined,
        price: act.price ?? undefined,
        amount: act.amount != null ? Math.abs(act.amount) : undefined,
        reinvested: m.reinvested,
        note: [m.note, act.description].filter(Boolean).join(' · ') || undefined,
        source: 'connected',
        created_at: nowIso,
      } as Transaction);
    }
  }
  return { accounts, newTransactions, seenKeys, needsWrapperConfirm };
}

/** Mark an account's wrapper as USER-CONFIRMED — future syncs never override it. */
export function confirmWrapper(accounts: AssetAccount[], assetId: string, kind: string, taxBucket: AssetAccount['tax_bucket']): AssetAccount[] {
  return accounts.map((a) => (a.asset_id === assetId ? { ...a, kind, tax_bucket: taxBucket, wrapper_confirmed: true } : a));
}
