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
    const positions = mapped
      .filter((m) => !m.cashEquivalent)                          // money-market lives in the sleeve
      .map((m, i) => ({
        position_id: prior?.positions?.find((x: any) => x.ticker === m.ticker)?.position_id ?? newEntityId('pos'),
        ticker: m.ticker,
        name: m.name,                                            // readable security name (CUSIPs aren't)
        kind: m.assetClass === 'bonds' ? 'fixed_income' : m.assetClass === 'alternatives' ? 'crypto' : m.assetClass === 'cash' ? 'money_market' : 'stocks_etf',
        asset_class: m.assetClass === 'bonds' ? 'bond' as const : m.assetClass === 'alternatives' ? 'other' as const : m.assetClass === 'cash' ? 'cash' as const : 'stock_etf' as const,
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
      mask: mask ?? prior?.mask,
      snaptrade_account_id: st.id,
      // the wrapper: keep a USER-confirmed wrapper forever; otherwise take the mapping's guess
      kind: prior?.wrapper_confirmed ? prior.kind : guess.kind,
      tax_bucket: prior?.wrapper_confirmed ? prior.tax_bucket : guess.tax_bucket,
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
          const basis = (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0) * (l.cost_per_share || 0), 0);
          return t + (pos.last_price != null ? sh * pos.last_price : basis);
        }, 0)
          + optionRows.reduce((t, o) => t + (o.value || 0), 0)
          + (netCashSleeve(p.balancesCash, mapped) || 0);
        if (derived > 0) return Math.round(derived * 100) / 100;
        return reported ?? prior?.balance ?? 0;                              // genuinely empty stays honest
      })(),
      cash_balance: netCashSleeve(p.balancesCash, mapped),
      positions: p.positions != null ? positions : prior?.positions,   // provided-but-empty = sold out (stale rows would lie)
      option_holdings: optionRows.length ? optionRows.map((o) => ({ label: o.label, contracts: o.contracts, value: o.value, cost_basis: o.costBasis })) : undefined,
      source: 'connected',
      connection_id: st.brokerage_authorization,
      last_synced: st.sync_status?.holdings?.last_successful_sync ?? nowIso,
      value_as_of: nowIso.slice(0, 10),
      // FOUNDER RULE 2026-08-04 (fifth ingredient check): remember how far back this broker's own
      // activity feed reaches, so year-scale income figures can label their real coverage.
      // Depth only ever deepens — a later shallow page can't shorten it (mergeHistoryFrom).
      history_from: mergeHistoryFrom(prior?.history_from,
        (p.activities ?? []).map((act: any) => act.trade_date ?? act.settlement_date ?? null)),
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
      // LIVE-VERIFIED 2026-07-19 (real E*TRADE): brokers sign units on sells (−100) while our
      // ledger + realized-P/L FIFO expect POSITIVE shares with BUY/SELL carrying direction — raw
      // units would make every connected sale invisible to realized P/L. Shares are stored |units|.
      const units = act.units != null ? Math.abs(act.units) : undefined;
      // On EVERY trade row the broker's signed `amount` is the true cash — normalize price so
      // shares×price equals it exactly. This one rule covers options (per-contract price ×100
      // multiplier), bonds (priced per $100 of face — raw price would overstate gains 100×), and
      // folds real fees into basis/proceeds the way the broker's own records do.
      const isTrade = m.txnType === 'BUY' || m.txnType === 'SELL';
      const price = isTrade && act.amount != null && units
        ? Math.abs(act.amount) / units
        : act.price ?? undefined;
      newTransactions.push({
        id: newEntityId('txn'),
        date: (act.trade_date ?? act.settlement_date ?? nowIso).slice(0, 10),
        type: m.txnType === 'ADJUST' ? 'ADJUSTMENT' : m.txnType,
        account_id: assetId as any,   // absorbed-twin ids are pre-existing entity ids
        ticker: act.symbol?.raw_symbol ?? act.symbol?.symbol ?? undefined,
        shares: units,
        price,
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
