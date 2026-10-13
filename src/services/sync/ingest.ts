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
 *     lots = (prior.lots ?? []) as { shares?: number; cost per share?: number }[]
 *     shares = Σ over lots of (shares (or 0 when missing or zero))
 *     the answer = Σ over shares > 0 ? lots of ((shares or 0) × (cost per share or 0))÷ shares : nothing
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
 *     · If cost per share is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-184
 * Changed ..... not in git yet (—)
 */
function theirCost(prior: any): number | null {
  if (prior?.cost_source !== 'user') return null;
  const lots = (prior.lots ?? []) as { shares?: number; cost_per_share?: number }[];
  const shares = lots.reduce((t, l) => t + (l.shares || 0), 0);
  return shares > 0 ? lots.reduce((t, l) => t + (l.shares || 0) * (l.cost_per_share || 0), 0) / shares : null;
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
 *     st = account
 *     guess = map account type(st.raw type, st.account category)
 *     tail = string(st.number).slice(-4)   if st.number
 *     ''   otherwise
 *     mask = `••${tail}`   if ÷ ^\d{4}$ ÷ .test(tail)
 *     undefined   otherwise
 *     inst = st.institution name.trim().to lower case()
 *     asset id = prior.asset id (or st asset id(st.id) when missing)
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
 *               MK-XS-I-028 assumed return
 *
 * Decides .....
 *     · If cost per share is missing it uses 0.
 *     · If target return is missing it uses 8%.
 *     · If balance is missing it uses 0.
 *     · If shares is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If cost per share is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If value is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to two decimals (cents).
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
    // A MONEY-MARKET FUND THE BROKER FLAGS AS "cash equivalent" IS A HOLDING, LIKE ANY OTHER (owner,
    // DEC-0051: cash means cash only; a money-market fund is Stocks / Funds). It used to be dropped
    // from this list while MK-XS-F-110 netCashSleeve also took it out of the cash — so it was in
    // neither, the account was marked as not adding up to the broker's total by exactly its value,
    // and a small one was swept into Cash by the rounding rule (found 2026-10-05, on the outside
    // review of MK-NW-F-027). It stays in the list; the cash beside it is still net of it.
    const positions = mapped
      .map((m, i) => {
        const priorPos = prior?.positions?.find((x: any) => x.ticker === m.ticker);
        const prevCls = priorPos?.asset_class == null ? null
          : priorPos.asset_class === 'bond' ? 'bonds' as const
          : priorPos.asset_class === 'other' ? 'alternatives' as const
          : priorPos.asset_class === 'cash' ? 'cash' as const : 'stocks_etf' as const;
        // B7: the ONE classifier, full evidence — the person's own answer outranks everything and
        // survives this sync; otherwise a class change between syncs keeps the previous class and
        // FLAGS it rather than moving the money quietly.
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
          class_flag: verdict.flagged ?? priorPos?.class_flag,   // a kept flag stays until resolved
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
            cost_per_share: theirCost(priorPos) ?? l.cost_per_share ?? 0,
            purchase_date: l.purchase_date ?? '',
          })),
          last_price: m.price ?? undefined,                      // broker's daily mark (no live feed needed)
        };
      });

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
          const basis = (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0) * (l.cost_per_share || 0), 0);
          return t + (pos.last_price != null ? sh * pos.last_price : basis);
        }, 0)
          + optionRows.reduce((t, o) => t + (o.value || 0), 0)
          + (netCashSleeve(p.balancesCash, mapped) || 0);
        if (derived > 0) return Math.round(derived * 100) / 100;
        return reported ?? prior?.balance ?? 0;                              // genuinely empty stays honest
      })(),
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
          return pos.last_price != null ? sh * pos.last_price
            : (pos.lots ?? []).reduce((x: number, l: any) => x + (l.shares || 0) * (l.cost_per_share || 0), 0);
        });
        const r = reconcileAccountTotal(
          [...values, ...optionRows.map((o) => o.value || 0)],
          netCashSleeve(p.balancesCash, mapped) || 0,
          reported,
        );
        return r.ok ? undefined : { difference: r.difference.toString(), at: nowIso.slice(0, 10) };
      })(),
      status: st.status ?? 'open',
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
        amount: row.amount.isZero() ? undefined : row.amount.toNumber(2),
        reinvested: row.reinvested,
        // WHICH WAY THE SHARES WENT. "Transferred in" and "transferred out" both become TRANSFER_IN_KIND,
        // so the type alone cannot say — and a return across that day counted the shares as gained or
        // lost. The row already knows the direction; it is written down here so it is not lost.
        direction: row.event === 'SECURITIES_IN' ? 'IN' : row.event === 'SECURITIES_OUT' ? 'OUT' : undefined,
        note: [row.note, row.recognised ? undefined : `broker word: ${row.sourceWord}`]
          .filter(Boolean).join(' · ') || undefined,
        source: 'connected',
        created_at: nowIso,
      } as Transaction);
    }
  }
  return { accounts, newTransactions, seenKeys, needsWrapperConfirm, directionOf };
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

