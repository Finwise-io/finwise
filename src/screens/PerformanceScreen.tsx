// Portfolio Performance — per-holding actual return vs its SAME-period benchmark (ticker-based, lots).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, type LayoutChangeEvent, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Line } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii, ChartPalette } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact } from '../domain/_shared/money';
import { ASSET_KINDS, assetKind, accountAllowsTicker, assetClassOf, ASSET_CLASS_LABEL, investmentsTotal, type AssetAccount } from '../domain/assets';
import { resolveNetWorthRows } from '../domain/snapshot';
import { isBond } from '../domain/bonds';
import { isAlternative } from '../domain/alternatives';
import { valueFreshness } from '../domain/assets';
import { maskedMoney } from '../components/useMoney';
import { searchTickers } from '../constants/tickers';
import {
  buildPerformance, portfolioPeriodReturn, benchmarkTicker, totalShares, costBasis,
  attribution, allocation, portfolioTrend, capGains, capGainsTax, topHoldingConcentration,
  PERIODS, type Period, type Position, type Lot, type TrendPoint,
} from '../domain/performance';
import { txnLabel, cashEffect, availableCash, type Transaction, type TxnType } from '../domain/transactions';
import { userCapGainsRates } from '../domain/income';
import { moneyWeightedReturn, isMoneyWeighted } from '../domain/performance/moneyWeighted';
import { InfoDot } from '../components/UI';
import { priceFreshness, isPlausibleTicker } from '../services/marketData';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const pct = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
// A holding's TYPE = its instrument class (sets the benchmark) — not an account type (401k/IRA/529/brokerage).
const ACCOUNT_TYPE_IDS = ['brokerage', '401k', 'trad_ira', 'roth_ira', 'hsa', 'college_529', 'checking', 'savings', 'home', 'vehicle'];
const KIND_OPTIONS = ASSET_KINDS.filter((k) => k.section === 'Investments' && !ACCOUNT_TYPE_IDS.includes(k.id));

export default function PerformanceScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const simple = (store.displayMode ?? 'simple') === 'simple';   // Simple hides technical detail; Advisor shows it
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const priceCache = store.priceCache ?? {};
  const [period, setPeriod] = useState<Period>('1Y');
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<{ accountId: string; position: Position } | null>(null);
  const [txnOpen, setTxnOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // every position across accounts, tagged with its owning account
  const owned = useMemo(() => accounts.flatMap((a) => (a.positions ?? []).map((p) => ({ accountId: a.asset_id, p }))), [accounts]);
  const positions = owned.map((o) => o.p);
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  const rows = useMemo(() => buildPerformance(positions, priceOf, period), [owned, priceCache, period]);
  const portReturn = portfolioPeriodReturn(rows);
  const benchPort = (() => {
    const usable = rows.filter((r) => r.benchReturn != null && r.marketValue > 0);
    const tot = usable.reduce((t, r) => t + r.marketValue, 0);
    return tot > 0 ? usable.reduce((t, r) => t + (r.benchReturn as number) * r.marketValue, 0) / tot : null;
  })();
  const portBeat = portReturn != null && benchPort != null ? portReturn - benchPort : null;
  const cashTotal = accounts.reduce((t, a) => t + (a.cash_balance || 0), 0);
  // FCC glance pin: the SAME resolved rows + helper Home's hero uses — the two can never disagree
  const investTotalAll = investmentsTotal(resolveNetWorthRows(
    store.user?.uid ?? 'local', store.onboardingProfile, store.nwSeeded ?? false, accounts, store.liabilities ?? [],
  ).accounts);
  const investedValue = rows.reduce((t, r) => t + r.marketValue, 0);
  const totalValue = investedValue + cashTotal;
  const attr = useMemo(() => attribution(rows), [rows]);
  const alloc = useMemo(() => allocation(rows, cashTotal), [rows, cashTotal]);
  const cg = useMemo(() => {
    let lg = 0, sg = 0;
    rows.forEach((r) => { const c = capGains(r.position, r.price); lg += c.longGain; sg += c.shortGain; });
    const rates = userCapGainsRates(store.onboardingProfile ?? null);   // PRD F3#17: bracket-derived
    return { longGain: lg, shortGain: sg, total: lg + sg, tax: capGainsTax(lg, sg, rates.lt, rates.st) };
  }, [rows, store.onboardingProfile]);
  const trend = useMemo(() => portfolioTrend(positions, priceOf, period), [owned, priceCache, period]);
  const trendChange = trend.length > 1 ? { you: trend[trend.length - 1].value / trend[0].value - 1, bench: trend[0].bench > 0 ? trend[trend.length - 1].bench / trend[0].bench - 1 : 0 } : null;
  // FCC glance-then-drill: the period's DOLLAR gain (same rows as the %), winners & laggards,
  // the holding-concentration fact, and the grouped all-investments list (bonds + alts folded in)
  const rowGain = (r: any) => (r.periodReturn != null && r.marketValue > 0 ? r.marketValue * (1 - 1 / (1 + r.periodReturn)) : 0);
  const periodDollar = rows.reduce((t, r) => t + rowGain(r), 0);
  const ranked = rows.filter((r) => r.periodReturn != null && r.marketValue > 0)
    .map((r) => ({ r, gain: rowGain(r) })).sort((a, b) => b.gain - a.gain);
  const laggards = ranked.filter((x) => x.gain < 0).slice(-2);
  const winners = ranked.filter((x) => x.gain >= 0).slice(0, 3);
  const [listMode, setListMode] = useState<'top' | 'all' | 'account'>('top');
  const PERIOD_PHRASE: Record<string, string> = { '1M': 'past month', '3M': 'past 3 months', '6M': 'past 6 months', 'YTD': 'this year', '1Y': 'past year', '3Y': 'past 3 years' };
  const freshLine = (() => {
    const f = priceFreshness(store.pricesFetchedAt, Date.now());
    return store.pricesFetchedAt ? `${f.stale ? 'Prices may be out of date — ' : 'Prices updated '}${f.label}` : null;
  })();
  const leader = ranked[0];
  const laggard = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const shownRanked = listMode === 'top'
    ? [leader, ...(laggard && laggard !== leader && laggard.gain < 0 ? [laggard] : [])].filter(Boolean) as typeof ranked
    : ranked;
  // concentration: one HOLDING at 25%+ of invested money — the SAME shared rule the insights
  // engine uses (one concept, one helper), a quantified fact, never advice
  const concentration = topHoldingConcentration(rows);
  const bondAccts = accounts.filter(isBond);
  const altAccts = accounts.filter(isAlternative);
  const equitiesTotal = rows.reduce((t, r) => t + r.marketValue, 0);
  const bondsTotal = bondAccts.reduce((t, a) => t + (a.balance || 0), 0);
  const altsTotal = altAccts.reduce((t, a) => t + (a.balance || 0), 0);
  const contribMonthly = (store.retirementAssumptions ?? {}).contribMonthly as number | null;
  // PRD F3#16 — the money-weighted personal return over the investment accounts; shown ONLY
  // when the ledger can stand behind it (complete history, ≥30 days) — absence over a guess
  const mwr = useMemo(() => {
    const investAccts = accounts.filter((a) => !['cash', 'real_estate', 'personal_property'].includes(assetClassOf(a)));
    if (investAccts.length === 0) return null;
    // end value = the SAME investments total the header shows (balance-only accounts included)
    const r = moneyWeightedReturn(store.transactions ?? [], investAccts, new Set(investAccts.map((a) => String(a.asset_id))), investTotalAll);
    return isMoneyWeighted(r) ? r : null;
  }, [accounts, store.transactions, investTotalAll]);
  // investment ACCOUNTS without tickers (a balance-only 401(k)/brokerage) still belong on this
  // tab — they're inside investmentsTotal, so hiding them would break the Home=Invest pin
  const untracked = accounts.filter((a) => !isBond(a) && !isAlternative(a)
    && (a.positions?.length ?? 0) === 0
    && !['cash', 'real_estate', 'personal_property'].includes(assetClassOf(a)));
  const untrackedTotal = untracked.reduce((t, a) => t + (a.balance || 0), 0);
  const [showAllClass, setShowAllClass] = useState<Record<string, boolean>>({});
  const allocLabel = (k: string) => (k === 'cash' ? 'Cash' : assetKind(k)?.label ?? 'Other');
  const ALLOC_COLORS = ChartPalette;   // one shared palette — Net worth colors classes identically

  const refresh = async () => { setLoading(true); try { await store.refreshPrices(); } finally { setLoading(false); } };
  useEffect(() => { if (positions.length) refresh(); }, [positions.length]);   // fetch on open / when holdings change

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Invest (FCC glance-then-drill): title + refresh; the grouped list below owns the total */}
      <View style={styles.headRow}>
        <Text style={styles.investTitle}>Invest</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={loading ? 'Refreshing prices' : 'Refresh prices'} onPress={refresh} disabled={loading}>
          <Text style={styles.refresh}>{loading ? 'Updating…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {/* B-18: surface price freshness so stale cached values aren't presented as live. */}
      {positions.length > 0 && (() => {
        const f = priceFreshness(store.pricesFetchedAt, Date.now());
        return <Text style={[styles.freshness, f.stale && { color: Colors.amber }]}>{f.stale ? '⚠ Prices may be out of date' : 'Prices'} · updated {f.label}{f.stale ? ' — tap Refresh' : ''}</Text>;
      })()}

      {positions.length === 0 && bondAccts.length === 0 && altAccts.length === 0 && untracked.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyT}>Track how your investments perform against the market.</Text>
          <Text style={styles.emptyS}>Add a holding with its ticker and what you paid — we'll value it live and compare its return to the right benchmark.</Text>
          <TouchableOpacity style={styles.addBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Add a holding" onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add a holding</Text></TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Import holdings from a file" onPress={() => router.push('/import-holdings')} style={{ marginTop: 14 }}><Text style={styles.addLink}>📄 Import from a file instead</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          {/* PERIOD SELECTOR */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity key={p} style={[styles.periodPill, period === p && styles.periodPillOn]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Show ${p} performance`} onPress={() => setPeriod(p)}>
                <Text style={[styles.periodT, period === p && styles.periodTOn]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PORTFOLIO VALUE hero (founder mock 2026-07-15): the level first, the period gain
              second, then the NAMED honest comparison + the freshness clock — one card, one story */}
          {rows.length > 0 && <View style={styles.card} accessible
            accessibilityLabel={`Portfolio value ${maskedMoney(investTotalAll)}. ${portReturn == null ? 'Not enough price history yet for this period.' : `${periodDollar >= 0 ? 'Up' : 'Down'} ${maskedMoney(Math.abs(Math.round(periodDollar)))}, ${pct(portReturn)}, ${PERIOD_PHRASE[period]}.`}${benchPort != null ? ` Honest comparison — stock market ${pct(benchPort)}.` : ''}${portBeat != null ? ` You're ${portBeat >= 0 ? 'ahead' : 'behind'} by ${Math.abs(portBeat * 100).toFixed(1)} points.` : ''}`}>
            <Text style={styles.glanceKicker}>PORTFOLIO VALUE</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{maskedMoney(investTotalAll)}</Text>
            <Text style={styles.glanceBig}>
              <Text style={{ color: periodDollar >= 0 ? Colors.gainText : Colors.red }}>{periodDollar >= 0 ? '▲ +' : '▼ −'}{maskedMoney(Math.abs(Math.round(periodDollar)))} ({pct(portReturn)})</Text>
              <Text style={styles.glancePct}>  {PERIOD_PHRASE[period]}</Text>
            </Text>
            <View style={styles.honestBlock}>
              <Text style={styles.honestKicker}>HONEST COMPARISON</Text>
              {benchPort != null && <Text style={styles.glanceLine}>vs the stock market:  {pct(benchPort)}</Text>}
              {portBeat != null && <Text style={[styles.glanceLine, { fontWeight: '800' }]}>★ You're {portBeat >= 0 ? 'ahead' : 'behind'} by {Math.abs(portBeat * 100).toFixed(1)} points</Text>}
              {freshLine && <Text style={styles.freshInHero}>🕐 {freshLine}</Text>}
            </View>
            {trend.length > 1 && <TrendChartAuto data={trend} />}
            {trend.length > 1 && (
              <View style={styles.legendRow}>
                <View style={styles.legItem}><View style={[styles.legLine, { backgroundColor: Colors.primary }]} /><Text style={styles.legT}>you</Text></View>
                <View style={styles.legItem}><View style={[styles.legLine, { backgroundColor: Colors.textTertiary }]} /><Text style={styles.legT}>the market (same start)</Text></View>
              </View>
            )}
          </View>}

          {/* PRD F3#16 — YOUR money-weighted return: renders whenever the ledger can stand
              behind it (works for balance-only accounts too), never guessed */}
          {mwr && (
            <View style={styles.card} accessible
              accessibilityLabel={`Your money-weighted return: ${mwr.ratePerYear >= 0 ? 'plus' : 'minus'} ${Math.abs(Math.round(mwr.ratePerYear * 1000) / 10)} percent a year, counting when you added money. From ${mwr.flows} recorded moves — an estimate.`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.glanceLine}>Your money-weighted return: {mwr.ratePerYear >= 0 ? '+' : '−'}{Math.abs(Math.round(mwr.ratePerYear * 1000) / 10)}%/yr — counts when you added money</Text>
                <InfoDot term="moneyWeighted" />
              </View>
            </View>
          )}

          {/* WINNERS & LAGGARDS — the same rows as the glance, so they visibly add up */}
          {ranked.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Winners & laggards ({period})</Text>
              {(listMode === 'account'
                ? [...owned].sort((a, b) => a.accountId.localeCompare(b.accountId))
                    .map((o) => ranked.find((x) => x.r.position.position_id === o.p.position_id))
                    .filter(Boolean) as typeof ranked
                : shownRanked
              ).map(({ r, gain }, idx, arr) => {
                const o = owned.find((x) => x.p.position_id === r.position.position_id)!;
                const acct = accounts.find((a) => a.asset_id === o.accountId);
                const prevAcct = idx > 0 ? owned.find((x) => x.p.position_id === arr[idx - 1].r.position.position_id)?.accountId : null;
                const roleTag = listMode === 'top' ? (gain >= 0 ? '🏆 Leader:' : '⚠ Laggard:') : null;
                return (
                  <View key={r.position.position_id}>
                    {listMode === 'account' && o.accountId !== prevAcct && (
                      <Text style={styles.wlAcctHdr}>{acct?.institution?.trim() || acct?.label || 'Account'}</Text>
                    )}
                    <TouchableOpacity accessibilityRole="button" style={styles.wlRow}
                      onPress={() => router.push(`/holding-detail?account=${o.accountId}&position=${r.position.position_id}` as any)}
                      accessibilityLabel={`${roleTag ? roleTag.replace(':', '').replace(/[🏆⚠] /u, '') + ' ' : ''}${r.position.label || r.position.ticker}, ${gain >= 0 ? 'up' : 'down'} ${maskedMoney(Math.abs(Math.round(gain)))}, ${pct(r.periodReturn)}. Opens its page.`}>
                      {roleTag
                        ? <Text style={[styles.wlArrow, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{roleTag}</Text>
                        : <Text style={[styles.wlArrow, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{gain >= 0 ? '▲ up' : '▼ down'}</Text>}
                      <Text style={styles.wlTicker} numberOfLines={1}>{r.position.ticker}</Text>
                      <Text style={[styles.wlGain, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{gain >= 0 ? '+' : '−'}{maskedMoney(Math.abs(Math.round(gain)))}</Text>
                      <Text style={styles.wlPct}>{pct(r.periodReturn)}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={styles.actionRow}>
                <TouchableOpacity accessibilityRole="button" onPress={() => setListMode(listMode === 'all' ? 'top' : 'all')}
                  accessibilityLabel={listMode === 'all' ? 'Show the leader and laggard only' : `See all ${ranked.length}`}>
                  <Text style={styles.addLink2}>{listMode === 'all' ? 'Show top ‹' : `See all ${ranked.length} ›`}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => setListMode(listMode === 'account' ? 'top' : 'account')}
                  accessibilityLabel={listMode === 'account' ? 'Back to leader and laggard' : 'View by account'}>
                  <Text style={styles.addLink2}>{listMode === 'account' ? 'By gain ‹' : 'By account ›'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* concentration — a quantified fact, shown only when real (25%+ in one holding) */}
          {concentration && (
            <View style={styles.concCard} accessible
              accessibilityLabel={`${concentration.pct} percent of your invested money is in one stock, ${concentration.ticker}.`}>
              <Text style={styles.concTxt}>⚑ {concentration.pct}% of your invested money is in one stock ({concentration.ticker})</Text>
            </View>
          )}

          {/* the two honest what-ifs — forward (estimate) and backward (facts) */}
          <TouchableOpacity accessibilityRole="button" style={styles.entryCard} onPress={() => router.push('/what-if')}
            accessibilityLabel="Look ahead: what saving more could do. An estimate.">
            <Text style={styles.entryTitle}>LOOK AHEAD: what saving more could do <Text style={styles.entryTag}>estimate</Text> ›</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.entryCard} onPress={() => router.push('/look-back')}
            accessibilityLabel="Look back: what a past move would have done. Facts about the past.">
            <Text style={styles.entryTitle}>LOOK BACK: what a past move would have done <Text style={styles.entryTag}>facts</Text> ›</Text>
          </TouchableOpacity>

          {/* the plan is visible HERE too (F11 propagation) */}
          {contribMonthly != null && contribMonthly > 0 && (
            <Text style={styles.planChip}>Saving {maskedMoney(contribMonthly)}/mo toward retirement (from your Plan)</Text>
          )}

          {/* YOUR INVESTMENTS — every class in one place, grouped, collapsible */}
          <Text style={styles.groupHdrTop}>YOUR INVESTMENTS   <Text>{maskedMoney(investTotalAll)}</Text></Text>
          {([['Stocks / ETFs', equitiesTotal, 'eq'], ['Bonds', bondsTotal, 'bond'], ['Alternatives', altsTotal, 'alt'], ['Accounts — add holdings for live tracking', untrackedTotal, 'acct']] as const).map(([label, total, kind]) => {
            if (kind === 'eq' && rows.length === 0) return null;
            if (kind === 'bond' && bondAccts.length === 0) return null;
            if (kind === 'alt' && altAccts.length === 0) return null;
            if (kind === 'acct' && untracked.length === 0) return null;
            const items: any[] = kind === 'eq' ? rows : kind === 'bond' ? bondAccts : kind === 'alt' ? altAccts : untracked;
            const showAll = !!showAllClass[kind];
            const shown = showAll ? items : items.slice(0, 5);
            return (
              <View key={kind} style={styles.card}>
                <Text style={styles.groupHdr}>{label}   {maskedMoney(Math.round(total as number))}</Text>
                {shown.map((it: any, idx: number) => {
                  if (kind === 'eq') {
                    const o = owned.find((x) => x.p.position_id === it.position.position_id)!;
                    return (
                      <TouchableOpacity accessibilityRole="button" key={it.position.position_id} style={[styles.invRow, idx > 0 && styles.invDivider]}
                        onPress={() => router.push(`/holding-detail?account=${o.accountId}&position=${it.position.position_id}` as any)}
                        accessibilityLabel={`${it.position.label || it.position.ticker}, ${maskedMoney(Math.round(it.marketValue))}${it.periodReturn != null ? `, ${it.periodReturn >= 0 ? 'up' : 'down'} ${pct(it.periodReturn)}` : ''}${it.price != null ? (priceFreshness(store.pricesFetchedAt, Date.now()).stale ? ', price may be out of date' : ', live price') : ''}. Opens its page.`}>
                        <Text style={styles.invName} numberOfLines={1}>{it.position.ticker}</Text>
                        {it.price != null && (
                          <View style={[styles.freshChip, priceFreshness(store.pricesFetchedAt, Date.now()).stale && styles.freshChipStale]}>
                            <Text style={[styles.freshChipTxt, priceFreshness(store.pricesFetchedAt, Date.now()).stale && { color: Colors.amber }]}>{priceFreshness(store.pricesFetchedAt, Date.now()).stale ? 'Prices old' : 'Live'}</Text>
                          </View>
                        )}
                        <Text style={styles.invVal}>{maskedMoney(Math.round(it.marketValue))}</Text>
                        {it.periodReturn != null && <Text style={[styles.invRet, { color: it.periodReturn >= 0 ? Colors.gainText : Colors.red }]}>{it.periodReturn >= 0 ? 'up ' : 'down '}{pct(it.periodReturn)}</Text>}
                        <Text style={styles.invChev}>›</Text>
                      </TouchableOpacity>
                    );
                  }
                  const fresh = valueFreshness(it);
                  return (
                    <TouchableOpacity accessibilityRole="button" key={it.asset_id} style={[styles.invRow, idx > 0 && styles.invDivider]}
                      onPress={() => router.push(`/account-detail?id=${it.asset_id}` as any)}
                      accessibilityLabel={`${it.label}, ${maskedMoney(Math.round(it.balance || 0))}${fresh ? `, value as of ${fresh.asOf}${fresh.stale ? `, ${fresh.monthsOld} months old` : ''}` : ''}. Opens its page.`}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.invName} numberOfLines={1}>{it.label}</Text>
                        {fresh && (
                          <View style={[styles.freshChip, fresh.stale && styles.freshChipStale]}>
                            <Text style={[styles.freshChipTxt, fresh.stale && { color: Colors.amber }]}>{fresh.stale ? `⏱ ${fresh.monthsOld} mo old` : `Value as of ${fresh.asOf.slice(0, 7)}`}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.invVal}>{maskedMoney(Math.round(it.balance || 0))}</Text>
                      <Text style={styles.invChev}>›</Text>
                    </TouchableOpacity>
                  );
                })}
                {items.length > 5 && (
                  <TouchableOpacity accessibilityRole="button" onPress={() => setShowAllClass((m) => ({ ...m, [kind]: !showAll }))}
                    accessibilityLabel={showAll ? `Show top 5 ${label}` : `Show all ${items.length} ${label}`}>
                    <Text style={styles.addLink2}>{showAll ? 'Show top 5 ‹' : `Show all ${items.length} ›`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* add / record / import / activity */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.primaryAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Add investment" onPress={() => setAddOpen(true)}>
              <Text style={styles.primaryActionT}>＋ Add investment</Text>
            </TouchableOpacity>
            <View style={styles.actionRow}>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Import holdings from a file" onPress={() => router.push('/import-holdings')}><Text style={styles.addLink2}>📄 Import file</Text></TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Record a transaction" onPress={() => setTxnOpen(true)}><Text style={styles.addLink2}>＋ Record</Text></TouchableOpacity>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="View transaction activity" onPress={() => setHistoryOpen(true)}><Text style={styles.addLink2}>Activity ›</Text></TouchableOpacity>
            </View>
          </View>

          <Text style={styles.foot}>End-of-day prices{store.pricesFetchedAt ? ` · updated ${new Date(store.pricesFetchedAt).toLocaleDateString()}` : ''}. Comparisons are for information only — no trades suggested. The concentration note is a fact for awareness, not advice.</Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <HoldingEditor
        open={addOpen || edit != null}
        accounts={accounts}
        existing={edit}
        onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(accountId, position, isNew) => {
          if (isNew) {
            if (accountId === '__new__') {
              store.addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, positions: [], derive_balance: true });
              // newest account is at index 0
              const newId = (useStore.getState() as any).assetAccounts[0].asset_id;
              store.addPosition(newId, position);
            } else {
              store.addPosition(accountId, position);
            }
          } else {
            store.updatePosition(accountId, position.position_id, position);
          }
          setAddOpen(false); setEdit(null); setTimeout(refresh, 50);
        }}
        onDelete={edit ? () => { store.deletePosition(edit.accountId, edit.position.position_id); setEdit(null); } : undefined}
      />
      <TransactionSheet open={txnOpen} accounts={accounts} onClose={() => setTxnOpen(false)}
        onSave={(t) => { store.recordTransaction(t); setTxnOpen(false); setTimeout(refresh, 50); }} />
      <HistorySheet open={historyOpen} transactions={store.transactions ?? []} accounts={accounts}
        onClose={() => setHistoryOpen(false)} onDelete={(id) => {
          if (!store.deleteTransaction(id)) Alert.alert(
            'Can\u2019t remove this entry',
            'It was recorded before balance-safe deletes existed, so removing it can\u2019t undo its effect on your balances. Record a correcting entry instead (e.g. a matching deposit or withdrawal).');
        }} />
    </ScrollView>
  );
}

// ───────────────────────── Add / edit holding (ticker + lots) ─────────────────────────
export function HoldingEditor({ open, accounts, existing, onClose, onSave, onDelete }: {
  open: boolean; accounts: AssetAccount[]; existing: { accountId: string; position: Position } | null;
  onClose: () => void; onSave: (accountId: string, position: Position, isNew: boolean) => void; onDelete?: () => void;
}) {
  const isNew = existing == null;
  const investAccts = accounts.filter(accountAllowsTicker);   // only security-eligible accounts (excludes cash/property/529)
  const [accountId, setAccountId] = useState<string>('');
  const [ticker, setTicker] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<string>('stocks_etf');
  const [lots, setLots] = useState<Lot[]>([]);
  const [tickerFocus, setTickerFocus] = useState(false);
  // autocomplete: suggest common tickers as they type (hidden once it's an exact symbol match)
  const suggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q || !tickerFocus) return [];
    const hits = searchTickers(q);
    return hits.length === 1 && hits[0].sym === q ? [] : hits;
  }, [ticker, tickerFocus]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setAccountId(existing.accountId); setTicker(existing.position.ticker); setLabel(existing.position.label ?? '');
      setKind(existing.position.kind ?? 'stocks_etf'); setLots(existing.position.lots.length ? existing.position.lots : [blankLot()]);
    } else {
      setAccountId(investAccts[0]?.asset_id ?? '__new__'); setTicker(''); setLabel(''); setKind('stocks_etf'); setLots([blankLot()]);
    }
  }, [open]);

  const setLot = (i: number, patch: Partial<Lot>) => setLots((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  // Raw text buffer for the numeric lot fields so an in-progress decimal ("10.") isn't stripped by the
  // parse-on-keystroke (the reported "cost/share only allows integers" bug). Keyed by `${i}-${field}`.
  const [lotRaw, setLotRaw] = useState<Record<string, string>>({});
  const setLotNum = (i: number, field: 'shares' | 'cost_per_share', t: string) => {
    setLotRaw((m) => ({ ...m, [`${i}-${field}`]: t }));
    setLot(i, { [field]: num(t) } as Partial<Lot>);
  };
  const lotVal = (i: number, field: 'shares' | 'cost_per_share', n: number) =>
    lotRaw[`${i}-${field}`] ?? (n ? String(n) : '');
  // new-investor friendly: only ticker + shares are required; cost/share + date are optional
  // (without cost we just can't show return-since-purchase — value & vs-benchmark still work).
  const valid = ticker.trim().length > 0 && lots.some((l) => l.shares > 0);

  const save = () => {
    const clean = lots.filter((l) => l.shares > 0).map((l) => ({ ...l, lot_id: l.lot_id || `lot_${Math.random().toString(36).slice(2, 8)}` }));
    const position: Position = {
      position_id: existing?.position.position_id ?? `pos_${Math.random().toString(36).slice(2, 8)}`,
      ticker: ticker.trim().toUpperCase(), label: label.trim() || undefined, kind, lots: clean,
    };
    onSave(accountId, position, isNew);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>{isNew ? 'Add a holding' : 'Edit holding'}</Text>

          <Text style={styles.fieldL}>Ticker</Text>
          <TextInput style={styles.input} value={ticker} onChangeText={setTicker} autoCapitalize="characters" autoCorrect={false}
            onFocus={() => setTickerFocus(true)} onBlur={() => setTimeout(() => setTickerFocus(false), 150)}
            placeholder="e.g. AAPL, VTI, SPY" placeholderTextColor={Colors.textTertiary} />
          {suggestions.length > 0 && (
            <View style={styles.acBox}>
              {suggestions.map((sug) => (
                <TouchableOpacity key={sug.sym} style={styles.acRow} accessibilityRole="button" accessibilityLabel={`${sug.sym}, ${sug.name}`} onPress={() => {
                  setTicker(sug.sym); setKind(sug.kind); if (!label.trim()) setLabel(sug.name); setTickerFocus(false);
                }}>
                  <Text style={styles.acSym}>{sug.sym}</Text>
                  <Text style={styles.acName} numberOfLines={1}>{sug.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* B-18: gently flag a ticker that can't be a symbol so the user fixes a typo instead of
              silently getting no live price. */}
          {ticker.trim().length > 0 && !isPlausibleTicker(ticker) && (
            <Text style={styles.tickerWarn}>That doesn't look like a ticker symbol — check for a typo (e.g. AAPL, VTI).</Text>
          )}
          <Text style={styles.fieldL}>Name (optional)</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Apple Inc." placeholderTextColor={Colors.textTertiary} />

          <Text style={styles.fieldL}>Type (sets the benchmark — {benchmarkTicker(kind)})</Text>
          <View style={styles.kindWrap}>
            {KIND_OPTIONS.map((k) => (
              <TouchableOpacity key={k.id} style={[styles.kindChip, kind === k.id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Type: ${k.label}`} onPress={() => setKind(k.id)}>
                <Text style={[styles.kindChipT, kind === k.id && styles.kindChipTOn]}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>Shares you hold</Text>
          <Text style={styles.beginnerHint}>New to this? Just enter shares — cost &amp; date are optional (add them later for return-since-purchase).</Text>
          {lots.map((l, i) => (
            <View key={i} style={styles.lotRow}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={lotVal(i, 'shares', l.shares)} onChangeText={(t) => setLotNum(i, 'shares', t)} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Cost / share (opt)</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={lotVal(i, 'cost_per_share', l.cost_per_share)} onChangeText={(t) => setLotNum(i, 'cost_per_share', t)} placeholder="—" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date (opt)</Text><TextInput style={styles.lotIn} value={l.purchase_date} onChangeText={(t) => setLot(i, { purchase_date: t })} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
              {lots.length > 1 && <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Remove lot ${i + 1}`} onPress={() => setLots((ls) => ls.filter((_, j) => j !== i))}><Text style={styles.lotDel}>✕</Text></TouchableOpacity>}
            </View>
          ))}
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Add another lot" onPress={() => setLots((ls) => [...ls, blankLot()])}><Text style={styles.addLink}>＋ Add another lot</Text></TouchableOpacity>

          {accounts.length > 0 && (
            <>
              <Text style={styles.fieldL}>Account</Text>
              <View style={styles.kindWrap}>
                {investAccts.map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Account: ${a.institution?.trim() || a.label}`} onPress={() => setAccountId(a.asset_id)}>
                    <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{a.institution?.trim() || a.label}</Text>
                  </TouchableOpacity>
                ))}
                {isNew && (
                  <TouchableOpacity style={[styles.kindChip, accountId === '__new__' && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Add a new account" onPress={() => setAccountId('__new__')}>
                    <Text style={[styles.kindChipT, accountId === '__new__' && styles.kindChipTOn]}>＋ New account</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(() => {
                const sel = accounts.find((a) => a.asset_id === accountId);
                // A manual-balance account keeps its entered total; this holding is tracked for
                // performance only (B-60). A position-derived account is built FROM its holdings.
                if (!sel || sel.derive_balance === true) return null;
                return (
                  <Text style={styles.note}>📊 Tracked for performance — this won't change {sel.institution?.trim() || sel.label}'s {moneyCompact(sel.balance, 'M')} total. Edit the account total in Net Worth.</Text>
                );
              })()}
            </>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} accessibilityRole="button" accessibilityLabel={isNew ? 'Add holding' : 'Save holding'} onPress={save}>
            <Text style={styles.saveBtnT}>{isNew ? 'Add holding' : 'Save'}{valid && costBasis({ position_id: '', ticker, lots } as Position) > 0 ? ` · cost ${moneyCompact(costBasis({ position_id: '', ticker, lots } as Position), 'M')}` : ''}</Text>
          </TouchableOpacity>
          {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete holding" onPress={onDelete}><Text style={styles.deleteLink}>Delete holding</Text></TouchableOpacity>}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const blankLot = (): Lot => ({ lot_id: `lot_${Math.random().toString(36).slice(2, 8)}`, shares: 0, cost_per_share: 0, purchase_date: new Date().toISOString().slice(0, 10) });

// ── trend line chart (portfolio vs rebased benchmark) ──
function TrendChartAuto({ data }: { data: TrendPoint[] }) {
  const [w, setW] = useState(0);
  return <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>{w > 0 && <TrendChart data={data} width={w} />}</View>;
}
function TrendChart({ data, width }: { data: TrendPoint[]; width: number }) {
  const H = 120, padTop = 8, padBot = 6;
  const vals = data.flatMap((d) => [d.value, d.bench]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i: number) => (i / (data.length - 1 || 1)) * width;
  const y = (v: number) => padTop + (1 - (v - min) / ((max - min) || 1)) * (H - padTop - padBot);
  const path = (key: 'value' | 'bench') => 'M ' + data.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' L ');
  return (
    <Svg width={width} height={H}>
      <Line x1={0} y1={H - padBot} x2={width} y2={H - padBot} stroke={Colors.border} strokeWidth={1} />
      <Path d={path('bench')} stroke={Colors.textTertiary} strokeWidth={1.5} strokeDasharray="4,3" fill="none" />
      <Path d={path('value')} stroke={Colors.primary} strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

// ───────────────────────── Record a transaction ─────────────────────────
const TXN_TYPES: { k: TxnType; label: string }[] = [
  { k: 'BUY', label: 'Buy' }, { k: 'SELL', label: 'Sell' }, { k: 'DEPOSIT', label: 'Deposit cash' },
  { k: 'WITHDRAWAL', label: 'Withdraw' }, { k: 'TRANSFER', label: 'Transfer' }, { k: 'DIVIDEND', label: 'Dividend' },
];
export function TransactionSheet({ open, accounts, onClose, onSave, prefill }: {
  open: boolean; accounts: AssetAccount[]; onClose: () => void; onSave: (t: Omit<Transaction, 'id' | 'created_at'>) => void;
  prefill?: { accountId?: string; ticker?: string };
}) {
  const eligible = accounts.filter(accountAllowsTicker);
  // Cash actions (deposit/withdraw/transfer) on the Stocks screen apply to your EQUITY accounts + plain
  // cash accounts — never bond or alternative accounts (those aren't traded here).
  const cashAccts = accounts.filter((a) => accountAllowsTicker(a) || assetClassOf(a) === 'cash');
  const [type, setType] = useState<TxnType>('BUY');
  const [accountId, setAccountId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [reinvest, setReinvest] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => { if (open) { setType('BUY'); setAccountId(prefill?.accountId ?? (accounts.filter(accountAllowsTicker)[0]?.asset_id) ?? accounts[0]?.asset_id ?? ''); setCounterId(''); setTicker(prefill?.ticker ?? ''); setShares(''); setPrice(''); setAmount(''); setReinvest(false); setDate(new Date().toISOString().slice(0, 10)); } }, [open]);

  const isTrade = type === 'BUY' || type === 'SELL';
  const isBuy = type === 'BUY';
  const isSell = type === 'SELL';
  const isCash = type === 'DEPOSIT' || type === 'WITHDRAWAL';
  const isTransfer = type === 'TRANSFER';
  const isDiv = type === 'DIVIDEND';
  const acctList = isTrade ? eligible : cashAccts;
  const acct = accounts.find((a) => a.asset_id === accountId);
  const avail = acct ? availableCash(acct) : 0;
  const held = (acct?.positions ?? []).map((p) => p.ticker);          // holdings you can sell / receive dividends from
  useEffect(() => { setTicker(''); }, [accountId, type]);              // don't carry a stale holding across account/type
  // cash guards: can't spend more than the account's available cash
  const cost = num(shares) * num(price);
  const enough = isBuy ? cost <= avail : (type === 'WITHDRAWAL' || isTransfer) ? num(amount) <= avail : true;
  const tickerOk = isBuy ? !!ticker.trim() : (isSell || isDiv) ? held.includes(ticker) : true;
  const ownedShares = isSell ? totalShares((acct?.positions ?? []).find((p) => p.ticker === ticker) ?? { lots: [] } as any) : 0;
  const sellOk = !isSell || num(shares) <= ownedShares;
  const valid = !!accountId && enough && sellOk && (
    isTrade ? (tickerOk && num(shares) > 0 && num(price) > 0) :
    isCash ? num(amount) > 0 :
    isTransfer ? (num(amount) > 0 && !!counterId && counterId !== accountId) :
    isDiv ? (tickerOk && (reinvest ? (num(shares) > 0 && num(price) > 0) : num(amount) > 0)) : false
  );
  const save = () => {
    const base = { date, type, account_id: accountId };
    if (isTrade) onSave({ ...base, ticker: ticker.trim().toUpperCase(), shares: num(shares), price: num(price) });
    else if (isCash) onSave({ ...base, amount: num(amount) });
    else if (isTransfer) onSave({ ...base, counter_account_id: counterId, amount: num(amount) });
    else onSave({ ...base, ticker: ticker.trim().toUpperCase(), reinvested: reinvest, ...(reinvest ? { shares: num(shares), price: num(price) } : { amount: num(amount) }) });
  };
  // B-43: when two accounts share a name, disambiguate the chip with the asset kind (or a last-4 of
  // its id) so the user can tell them apart instead of seeing identical chips.
  const baseName = (a: AssetAccount) => a.institution?.trim() || a.label;
  const acctName = (a: AssetAccount) => {
    const base = baseName(a);
    if (accounts.filter((x) => baseName(x) === base).length <= 1) return base;
    return `${base} · ${assetKind(a.kind)?.label ?? a.asset_id.slice(-4)}`;
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>Record a transaction</Text>
          <View style={[styles.kindWrap, { marginTop: 8 }]}>
            {TXN_TYPES.map((t) => (
              <TouchableOpacity key={t.k} style={[styles.kindChip, type === t.k && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Transaction type: ${t.label}`} onPress={() => setType(t.k)}>
                <Text style={[styles.kindChipT, type === t.k && styles.kindChipTOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>{isTransfer ? 'From account' : 'Account'}</Text>
          <View style={styles.kindWrap}>
            {acctList.map((a) => (
              <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Account: ${acctName(a)}`} onPress={() => setAccountId(a.asset_id)}>
                <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{acctName(a)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isTransfer && (
            <>
              <Text style={styles.fieldL}>To account</Text>
              <View style={styles.kindWrap}>
                {cashAccts.filter((a) => a.asset_id !== accountId).map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, counterId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`To account: ${acctName(a)}`} onPress={() => setCounterId(a.asset_id)}>
                    <Text style={[styles.kindChipT, counterId === a.asset_id && styles.kindChipTOn]}>{acctName(a)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* available-cash note for spend actions */}
          {(isBuy || type === 'WITHDRAWAL' || isTransfer) && acct && (
            <Text style={[styles.note, !enough && { color: Colors.red, fontWeight: '700' }]}>Available cash: {money(avail)}{!enough ? '  ⚠ not enough — deposit or transfer cash in first' : ''}</Text>
          )}

          {isBuy && (<><Text style={styles.fieldL}>Ticker</Text>
            <TextInput style={styles.input} value={ticker} onChangeText={setTicker} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. AAPL" placeholderTextColor={Colors.textTertiary} /></>)}

          {(isSell || isDiv) && (<>
            <Text style={styles.fieldL}>Holding</Text>
            {held.length === 0
              ? <Text style={styles.note}>No holdings in this account to {isSell ? 'sell' : 'record a dividend for'}. {isDiv ? 'A dividend can only come from a stock you hold here.' : ''}</Text>
              : <View style={styles.kindWrap}>{held.map((tk) => (
                  <TouchableOpacity key={tk} style={[styles.kindChip, ticker === tk && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Holding: ${tk}`} onPress={() => setTicker(tk)}>
                    <Text style={[styles.kindChipT, ticker === tk && styles.kindChipTOn]}>{tk}</Text>
                  </TouchableOpacity>))}
                </View>}
            {isSell && ticker !== '' && <Text style={[styles.note, !sellOk && { color: Colors.red, fontWeight: '700' }]}>You own {ownedShares} shares{!sellOk ? "  ⚠ can't sell more than you own" : ''}</Text>}
          </>)}

          {isDiv && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.kindChip, !reinvest && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Dividend paid as cash" onPress={() => setReinvest(false)}><Text style={[styles.kindChipT, !reinvest && styles.kindChipTOn]}>Paid as cash</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.kindChip, reinvest && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Dividend reinvested" onPress={() => setReinvest(true)}><Text style={[styles.kindChipT, reinvest && styles.kindChipTOn]}>Reinvested</Text></TouchableOpacity>
            </View>
          )}

          {(isTrade || (isDiv && reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={shares} onChangeText={setShares} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Price / share</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><TextInput style={styles.lotIn} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
            </View>
          )}
          {(isCash || isTransfer || (isDiv && !reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Amount</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><TextInput style={styles.lotIn} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
            </View>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} accessibilityRole="button" accessibilityLabel={`Record ${txnLabel(type).toLowerCase()}`} onPress={save}><Text style={styles.saveBtnT}>Record {txnLabel(type).toLowerCase()}</Text></TouchableOpacity>
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Activity / history ─────────────────────────
export function HistorySheet({ open, transactions, accounts, onClose, onDelete }: {
  open: boolean; transactions: Transaction[]; accounts: AssetAccount[]; onClose: () => void; onDelete: (id: string) => void;
}) {
  const acctName = (id?: string) => { const a = accounts.find((x) => x.asset_id === id); return a ? (a.institution?.trim() || a.label) : '—'; };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Activity</Text>
        <Text style={styles.sheetS}>Every transaction you've recorded — your full history.</Text>
        <ScrollView style={{ maxHeight: 460 }}>
          {transactions.length === 0 && <Text style={styles.hEmpty}>No transactions yet.</Text>}
          {transactions.map((t) => {
            const eff = cashEffect(t);
            const detail = t.ticker ? `${t.ticker}${t.shares ? ` · ${t.shares} sh` : ''}${t.price ? ` @ ${money(t.price)}` : ''}` : acctName(t.account_id);
            return (
              <View key={t.id} style={styles.hRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hType}>{txnLabel(t.type)} <Text style={styles.hDetail}>{detail}</Text></Text>
                  <Text style={styles.hMeta}>{t.date} · {acctName(t.account_id)}{t.counter_account_id ? ` → ${acctName(t.counter_account_id)}` : ''}{t.reinvested ? ' · reinvested' : ''}</Text>
                </View>
                {eff !== 0 && <Text style={[styles.hAmt, { color: eff >= 0 ? Colors.gainText : Colors.red }]}>{eff >= 0 ? '+' : ''}{money(eff)}</Text>}
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Delete ${txnLabel(t.type).toLowerCase()}${t.ticker ? ` ${t.ticker}` : ''}`} onPress={() => onDelete(t.id)}><Text style={styles.hDel}>✕</Text></TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.applyBtn2} accessibilityRole="button" accessibilityLabel="Done" onPress={onClose}><Text style={styles.saveBtnT}>Done</Text></TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  investTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  heroValue: { fontSize: 34, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  honestBlock: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary, marginTop: 10, paddingTop: 8 },
  honestKicker: { fontSize: 11.5, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  freshInHero: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  glanceKicker: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  glanceBig: { fontSize: 24, fontWeight: '800' },
  glancePct: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  glanceLine: { fontSize: 14, color: Colors.textPrimary, marginTop: 4 },
  wlAcctHdr: { fontSize: 11.5, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginTop: 8, marginBottom: 2 },
  wlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minHeight: 42 },
  wlArrow: { width: 68, fontSize: 12.5, fontWeight: '800' },
  wlTicker: { flex: 1, fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary },
  wlGain: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  wlPct: { width: 62, fontSize: 13, color: Colors.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  concCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  concTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19 },
  entryCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, minHeight: 52, justifyContent: 'center' },
  entryTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.2 },
  entryTag: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  planChip: { fontSize: 12.5, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginTop: Spacing.sm, overflow: 'hidden' },
  groupHdrTop: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 2 },
  groupHdr: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  addInvestBtn: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  addInvestTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  investFoot: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 15, marginTop: Spacing.md },
  freshChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  freshChipStale: { borderColor: Colors.amberMid, backgroundColor: Colors.amberLight },
  freshChipTxt: { fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, minHeight: 44 },
  invDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  invName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: Colors.textPrimary },
  invVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  invRet: { fontSize: 12.5, fontWeight: '700', width: 84, textAlign: 'right' },
  invStamp: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 1 },
  invChev: { fontSize: 17, color: Colors.textTertiary },
  subtitle: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 },
  refresh: { fontSize: 12.5, fontWeight: '700', color: Colors.primary },
  freshness: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, marginBottom: 4 },
  tickerWarn: { fontSize: 11.5, color: Colors.amber, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyT: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptyS: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 },
  addBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },

  periodRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  periodPill: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radii.pill, backgroundColor: Colors.cardBg },
  periodPillOn: { backgroundColor: Colors.primary },
  periodT: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  periodTOn: { color: '#fff' },

  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 12, alignItems: 'center' },
  sumVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  whatIfRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  whatIfBtn: { flex: 1, backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  whatIfTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.primary },
  sumCellL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  sumCellV: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },

  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 12 },
  tHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  col: { width: 70, textAlign: 'right' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hTicker: { fontSize: 14.5, fontWeight: '800', color: Colors.textPrimary },
  hName: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  hSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cellV: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  cellB: { fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary },
  addLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  addLink2: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  primaryAction: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  primaryActionT: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  cgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  cgL: { fontSize: 13, color: Colors.textSecondary },
  cgV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  trendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendChg: { fontSize: 13.5, fontWeight: '800' },
  trendVs: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legLine: { width: 14, height: 3, borderRadius: 2 },
  legT: { fontSize: 11, color: Colors.textSecondary },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  attrName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  attrWt: { width: 44, textAlign: 'right', fontSize: 12, color: Colors.textTertiary },
  attrPts: { width: 70, textAlign: 'right', fontSize: 13.5, fontWeight: '800' },
  tinyFoot: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 8 },
  allocBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bgTertiary, marginBottom: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  allocDot: { width: 10, height: 10, borderRadius: 3 },
  allocName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  allocVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  allocPct: { width: 48, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  foot: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  applyBtn2: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  hEmpty: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 24 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hType: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  hDetail: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  hAmt: { fontSize: 14, fontWeight: '800' },
  hDel: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 4 },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sheetS: { fontSize: 12.5, color: Colors.textSecondary, marginBottom: 8, lineHeight: 17 },
  note: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 8, lineHeight: 15 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  acBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 4, backgroundColor: Colors.cardBg, overflow: 'hidden' },
  acRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  acSym: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, width: 60 },
  acName: { fontSize: 12.5, color: Colors.textSecondary, flex: 1 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 11, fontSize: 15, color: Colors.textPrimary },
  kindWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  kindChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 7 },
  kindChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  kindChipT: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  kindChipTOn: { color: Colors.primaryDark },
  lotRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  lotCell: { flex: 1 },
  lotL: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  beginnerHint: { fontSize: 11, color: Colors.textTertiary, lineHeight: 15, marginBottom: 8 },
  lotIn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary },
  lotDel: { fontSize: 16, color: Colors.red, padding: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
