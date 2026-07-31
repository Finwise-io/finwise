// Home (FCC detailed design v1.1, Home sheet) — the two-second glance, lens-driven:
//   working lens → Grow & Track hero (investments, vs the market, freshness stamp)
//   retired lens → Safe to spend hero (the F5 month-named paycheck)
// then one quiet net-worth line, WHAT NEEDS YOU (top 3 from the ONE insights engine), and the
// will-it-last strip (reads the one selector's number — Home displays, it never re-derives).
// Home only displays numbers; the single capture affordance is the '+ Expense' button (M4).
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii, GaugeRamp } from '../utils/theme';
import { money, round2 } from '../domain/_shared/num';
import { buildSnapshot, resolveNetWorthRows } from '../domain/snapshot';
import { budgetVsActual } from '../domain/budget';
import { PaycheckCard } from '../components/PaycheckCard';
import { Disclaimer } from '../components/Disclaimer';
import { AllocateSavings } from '../components/MoneySheets';
import { incomeMonthlyGrid, salaryAnnual, currentRetirementIncomeMonthly } from '../domain/income';
import { investmentsTotal, buildAssetsState } from '../domain/assets';
import { buildPerformance, portfolioPeriodReturn, portfolioBenchReturn, periodDollarDelta, type Position } from '../domain/performance';
import { priceFreshness } from '../services/marketData';
import { connectionFreshness } from '../services/sync';
import { buildDebtState, requiredPayment } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { resolveLens } from '../domain/profile/lens';
import { selectWillItLast, chanceWord } from '../domain/retirement/willItLast';
import { milestoneCrossed, milestoneFloor, milestoneLabel } from '../domain/milestones';
import { makeMonthlySnapshot, readHistory } from '../domain/history';
import { useInsights } from './InsightsScreen';
import { maskedMoney, maskDollars, spokenDollars, spokenMoney } from '../components/useMoney';
import { InfoDot } from '../components/UI';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { DotJoined } from '../components/SepDot';

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HomeScreen() {
  const router = useRouter();
  const store = useStore() as any;

  // Build-47 walk row 13 (audit Home·NW #12): pull down = refresh prices AND connected accounts.
  const [refreshing, setRefreshing] = React.useState(false);
  const onPull = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const { runSnapTradeSync } = require('../services/sync/snaptradeSync');
      await Promise.allSettled([store.refreshPrices?.(), runSnapTradeSync({ force: true })]);
    } finally { setRefreshing(false); }
  }, []);
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const name = (store.user?.name || op?.name || 'there').split(' ')[0];
  const lens = resolveLens(op, store.lensOverride);
  const topInsights = useInsights(3);
  const expenses = (store.expenses ?? []) as any[];
  const [allocSheet, setAllocSheet] = useState<{ open: boolean; ym?: string; label?: string; available?: number; isPrompt?: boolean }>({ open: false });

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const snap = useMemo(
    // B-49: net worth + nest egg come from the live store rows (so account edits/deletions show),
    // resolved by the one shared rule so Home, the Net worth tab and Plan always agree.
    () => {
      // no data = no answers AND nothing live — mirror resolveNetWorthRows' useLive rule, else a
      // skip-then-import user gets stuck on the doors with real money already in the store
      if (!op && !store.nwSeeded && (store.assetAccounts?.length ?? 0) === 0 && (store.liabilities?.length ?? 0) === 0) return null;
      const { accounts, liabilities } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
      return buildSnapshot(uid, op, { inflationRate: store.inflationRate ?? 2.4, treasuryYield: store.treasuryYield ?? 4.3 }, accounts, liabilities);
    },
    [op, uid, store.inflationRate, store.treasuryYield, store.nwSeeded, store.assetAccounts, store.liabilities],
  );

  const netWorthNow = snap ? Math.round((snap as any).networth?.net_worth ?? 0) : null;
  useEffect(() => {
    if (netWorthNow == null) return;
    if (store.milestoneHighSeen == null) store.setMilestoneHighSeen?.(milestoneFloor(netWorthNow));
  }, [netWorthNow == null, store.milestoneHighSeen == null]);
  const milestone = netWorthNow != null ? milestoneCrossed(netWorthNow, store.milestoneHighSeen) : null;

  const resolvedRows = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);

  // ── month metrics used by the frozen-history effect + the month-end surplus prompt ──
  const bva = useMemo(() => budgetVsActual(expenses, op, now), [expenses, op, ym]);
  const baseNet = useMemo(() => {
    const g = op ? incomeMonthlyGrid(op, 'net') : [];
    return g[now.getMonth()]?.amount ?? 0;
  }, [op, ym]);
  const extraIncome = (store.incomes ?? []).filter((i: any) => String(i?.date ?? '').startsWith(ym))
    .reduce((t: number, i: any) => t + (Number(i.amount) || 0), 0);
  const thisMonthNet = baseNet + extraIncome;
  const debtPaid = expenses.filter((e: any) => e.category === 'Debt payment' && String(e.date).startsWith(ym)).reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);

  // month-end nudge: after a month with savings, ask where it went (once, if not skipped)
  const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorYm = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`;
  const incomesArr = store.incomes ?? [];
  const priorHasActivity = expenses.some((e: any) => String(e?.date ?? '').startsWith(priorYm))
    || incomesArr.some((i: any) => String(i?.date ?? '').startsWith(priorYm));
  useEffect(() => {
    if (!priorHasActivity) return;
    const pSpent = budgetVsActual(expenses, op, priorDate).spent_total;
    const g = op ? incomeMonthlyGrid(op, 'net') : [];
    const pBase = g[priorDate.getMonth()]?.amount ?? 0;
    const pExtra = incomesArr.filter((i: any) => String(i?.date ?? '').startsWith(priorYm)).reduce((t: number, i: any) => t + (Number(i.amount) || 0), 0);
    const saved = pBase + pExtra - pSpent;
    if (saved <= 0) return;
    if ((store.assetAccounts ?? []).length === 0) return;
    const done = store.allocatedByMonth?.[priorYm] ?? 0;
    if (done >= saved || store.allocPromptSkipped?.[priorYm]) return;
    setAllocSheet({ open: true, ym: priorYm, label: MONTHS_LONG[priorDate.getMonth()].slice(0, 3), available: saved - done, isPrompt: true });
  }, []);

  // debt due-soon reminder (current month, from due_day − 1)
  useEffect(() => {
    const paidThisMonth = (d: any) => (store.expenses ?? []).some((e: any) => e.category === 'Debt payment' && e.store === d.label && String(e.date).startsWith(ym));
    const due = (store.liabilities ?? []).filter((d: any) => d.due_day && now.getDate() >= d.due_day - 1 && !paidThisMonth(d));
    if (due.length) Alert.alert('Debt due soon', due.map((d: any) => `${d.label} — ${maskedMoney(requiredPayment(d))} due day ${d.due_day}`).join('\n'), [{ text: 'OK' }]);
  }, []);

  // freeze month-by-month metrics for trailing history (net worth, income, spend, savings, debt)
  useEffect(() => {
    if (!op) return;
    // P0: freeze the SAME rows every screen displays (resolveNetWorthRows), not the raw store arrays.
    const { accounts: a, liabilities: l } = resolvedRows;
    const nwv = buildNetWorth(uid, buildAssetsState(uid, a).total_asset_value, buildDebtState(uid, l).total_debt_balance);
    const monthExp = (store.expenses ?? []).filter((e: any) => String(e.date).startsWith(ym));
    const dPaid = monthExp.filter((e: any) => e.category === 'Debt payment').reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
    const eSpent = bva.spent_total;
    const byCategory: Record<string, number> = {};
    monthExp.filter((e: any) => e.category !== 'Debt payment').forEach((e: any) => { byCategory[e.category] = (byCategory[e.category] ?? 0) + (Number(e.amount) || 0); });
    const assetsSnap = a.map((x: any) => ({ id: x.asset_id, label: x.label, kind: x.kind ?? null, bucket: x.tax_bucket, institution: x.institution ?? null, balance: x.balance }));
    const debtsSnap = l.map((x: any) => ({ id: x.debt_id, label: x.label, type: x.debt_type, balance: x.remaining_balance, apr: x.interest_rate_apr }));
    // PRD F1#15: the typed, versioned writer — the identity net_worth = assets − debt is structural
    store.captureMonthlySnapshot?.(ym, makeMonthlySnapshot({
      month: ym,
      gross_assets: nwv.gross_assets, gross_debt: nwv.gross_debt,
      income_net: Math.round(thisMonthNet), spending: eSpent, debt_paid: dPaid,
      savings: Math.round(thisMonthNet - eSpent - dPaid), allocated: store.allocatedByMonth?.[ym] ?? 0,
      planned_budget: bva.planned_total, savings_rate: thisMonthNet > 0 ? Math.round(((thisMonthNet - eSpent - dPaid) / thisMonthNet) * 100) : 0,
      by_category: byCategory,
      assets: assetsSnap,
      debts: debtsSnap,
      captured_at: new Date().toISOString(),
    }));
    // APPROVED 2026-07-19: one daily net-worth point per open day → the trend graph draws within
    // days of first use (monthly snapshots stay the deep record; this is just a chart point).
    store.captureDailyNw?.(new Date().toISOString().slice(0, 10), nwv.net_worth);
  }, [ym, thisMonthNet, bva, expenses, store.assetAccounts, store.liabilities, store.allocatedByMonth, store.nwSeeded]);

  // ── working-lens hero numbers (canonical helpers named by the design) ──
  const investTotal = investmentsTotal(resolvedRows.accounts);
  const positions: Position[] = useMemo(
    () => (store.assetAccounts ?? []).flatMap((a: any) => a.positions ?? []),
    [store.assetAccounts]);
  const priceCache = store.priceCache ?? {};
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  const perfRows = useMemo(() => buildPerformance(positions, priceOf, '1M'), [positions, priceCache]);
  const youReturn = portfolioPeriodReturn(perfRows);            // 1-month, matches Invest's 1M figure
  const marketReturn = useMemo(() => portfolioBenchReturn(perfRows), [perfRows]);   // the ONE shared formula (walk row 5)
  const freshness = positions.length > 0 ? priceFreshness(store.pricesFetchedAt, Date.now()) : null;

  // ── will-it-last strip: the ONE selector's number (same seeded run as the Plan hub) ──
  const wil = useMemo(
    () => selectWillItLast({ op, accounts: resolvedRows.accounts, assumptions: store.retirementAssumptions ?? {}, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, resolvedRows.accounts, store.retirementAssumptions, store.inflationRate, store.employmentStatus]);
  useEffect(() => { if (wil.chance != null) store.setLastRetireChance?.(wil.chance); }, [wil.chance]);

  // founder finding 2026-07-15: answering the two setup questions creates a PROFILE, not DATA —
  // a user who finished the questions still needs the doors in (connect / import / add by hand).
  // The doors show until real money data exists from ANY source: a live or onboarding-derived
  // account or debt, or a captured income. Never a dashboard of fake zeros.
  const hasMoneyData = resolvedRows.accounts.length > 0 || resolvedRows.liabilities.length > 0
    || salaryAnnual(op) > 0 || currentRetirementIncomeMonthly(op) > 0;
  if (!snap || !hasMoneyData) {
    // Home — first run, nothing connected yet (FCC detailed design v1.1, Home sheet): never fake
    // zeros or demo charts — one promise and the DOORS in: connect (honestly 'coming soon' until
    // the bank link ships), add by hand, import a file; the retired-paycheck fast path leads when
    // that's what they came for. A saved deep-setup draft still resumes (un-pause before routing).
    const draft = store.onboardingDraft;
    const goSetup = () => { store.setOnboardingPaused?.(false); router.replace('/onboarding'); };
    const paycheckFirst = lens === 'retired' && (Array.isArray(op?.intents) ? op.intents.includes('paycheck') : false);
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: Spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sub}>Welcome{name !== 'there' ? `, ${name}` : ''}</Text>
        <Text style={styles.h1}>Let's get your real numbers in.</Text>

        {draft && (
          <TouchableOpacity accessibilityRole="button" style={styles.cta} onPress={goSetup}
            accessibilityLabel="Pick up where you left off — continue setup">
            <Text style={styles.ctaText}>Pick up where you left off →</Text>
          </TouchableOpacity>
        )}

        {/* the retired fast path leads when a retirement paycheck is what they came for */}
        {paycheckFirst && (
          <TouchableOpacity accessibilityRole="button" style={[styles.door, styles.doorPrimary]} onPress={() => router.push('/monthly-income')}
            accessibilityLabel="Get your paycheck — enter your Social Security and pension. Two minutes, no bank login.">
            <Text style={styles.doorTitle}>Get your paycheck ›</Text>
            <Text style={styles.doorSub}>Enter your Social Security and pension — 2 minutes, no bank login.</Text>
          </TouchableOpacity>
        )}

        {/* connect: a real door into the flow — the flow itself says honestly whether live
            bank linking is switched on yet (never a dead button, never a hidden feature) */}
        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/connect' as any)}
          accessibilityLabel="Connect your first account. Takes about 2 minutes. Read-only: we can look, never touch your money.">
          <Text style={styles.doorTitle}>Connect your first account ›</Text>
          <Text style={styles.doorSub}>Takes about 2 minutes. Read-only: we can look, never touch your money.</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/import-holdings')}
          accessibilityLabel="Import a file from your brokerage">
          <Text style={styles.doorTitle}>Import a file from your brokerage ›</Text>
          <Text style={styles.doorSub}>The CSV export — we read your holdings, nothing is uploaded.</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" style={styles.door} onPress={() => router.push('/(tabs)/analytics')}
          accessibilityLabel="Add something by hand — your home, or an account with no login">
          <Text style={styles.doorTitle}>Add something by hand ›</Text>
          <Text style={styles.doorSub}>Add it by hand — your home, savings, or an account with no login.</Text>
        </TouchableOpacity>

        {!draft && (
          <TouchableOpacity accessibilityRole="button" onPress={goSetup}
            accessibilityLabel="Or answer guided setup questions instead">
            <Text style={styles.quietLink}>Or answer guided setup questions ›</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.boxLabel}>WHAT YOU'LL SEE HERE</Text>
        <Text style={styles.promiseLine}>·  Your whole money picture in one place</Text>
        <Text style={styles.promiseLine}>·  What needs your attention — with dollar amounts</Text>
        <Text style={styles.promiseLine}>·  Whether your money will last — as honest odds</Text>
      </ScrollView>
    );
  }

  const netWorth = snap.networth.net_worth;
  // direction vs last frozen month (word + arrow — never color alone)
  const nwHistory = readHistory(store.monthlySnapshots).filter((h) => h.month !== ym);
  const prevNw = nwHistory.length ? nwHistory[nwHistory.length - 1].net_worth : null;
  const nwDir = prevNw != null && netWorth !== prevNw ? (netWorth > prevNw ? 'up' : 'down') : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} />}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sub}>Good {greeting()}</Text>
            <Text style={styles.h1}>{name}</Text>
          </View>
        </View>

        <HiddenBalancesBanner />

        {/* HERO — lens-driven */}
        {lens === 'retired' ? (
          <PaycheckCard />
        ) : (
          <TouchableOpacity accessibilityRole="button" style={styles.heroCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/invest')}
           
            accessibilityLabel={`Your investments: ${spokenMoney(investTotal)}${youReturn != null ? `, ${youReturn >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(youReturn * 1000) / 10)} percent this month` : ''}${freshness ? `, prices updated ${freshness.label}` : ''}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroKicker}>YOUR INVESTMENTS</Text>
              <InfoDot term="investments" />
            </View>
            <Text style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{maskedMoney(investTotal)}</Text>
            {/* Build-43 feedback #3: the approved mock shows change + date under the hero ALWAYS —
                hiding them in the empty state made the built screen look nothing like the mock. */}
            {youReturn != null ? (
              /* approved wireframe: "up $11,200 this month ▲up" — DOLLAR and percent, word+arrow.
                 The dollar delta derives from the SAME measured return as the percent shown, so the
                 two can never disagree (accuracy rule: one source per concept). */
              <Text style={styles.heroLine}>
                <Text style={{ color: youReturn >= 0 ? Colors.gainText : Colors.red, fontWeight: '800' }}>
                  {youReturn >= 0 ? '▲ up' : '▼ down'} {maskedMoney(Math.abs(periodDollarDelta(investTotal, youReturn)))} ({pctTxt(Math.abs(youReturn))})
                </Text>
                <Text> this month</Text>
              </Text>
            ) : (
              <Text style={styles.heroLine}>
                {investTotal > 0 ? 'change shows once your holdings have prices' : 'nothing invested yet — connect or add an account to start'}
              </Text>
            )}
            {youReturn != null && marketReturn != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <DotJoined style={styles.heroVs} parts={[`you ${signedPct(youReturn)}`, `market ${signedPct(marketReturn)}`, `${youReturn >= marketReturn ? 'ahead' : 'behind'} by ${pctTxt(Math.abs(youReturn - marketReturn))}`]} />
                <InfoDot term="benchmark" />
              </View>
            )}
            {/* the DATE line always renders (approved mock; build-43 feedback #3) — freshness when
                prices exist, plain "as of today" for hand-entered balances */}
            {freshness
              ? <Text style={[styles.freshness, freshness.stale && { color: Colors.amber }]}>{freshness.stale ? '⚠ prices may be out of date — ' : 'prices '}updated {freshness.label}</Text>
              : <Text style={styles.freshness}>as of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>}
            {/* Approved 2026-07-31-era mock #4 + founder change (left-justified, in the box): when a
                connection goes 3+ days quiet, the number it feeds says so right here. */}
            {(() => {
              const st = (store.assetAccounts ?? [])
                .filter((a: any) => a.source === 'connected')
                .map((a: any) => ({ a, f: connectionFreshness(a.last_synced) }))
                .filter((x: any) => x.f?.stale)
                .sort((x: any, y: any) => y.f.daysOld - x.f.daysOld)[0];
              if (!st) return null;
              const asOf = st.a.last_synced ? new Date(st.a.last_synced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
              return (
                <DotJoined style={[styles.freshness, { color: Colors.amber }]}
                  parts={[`⏱ ${st.a.institution ?? st.a.label} part as of ${asOf} — ${st.f.daysOld} days old`, 'pull to refresh']} />
              );
            })()}
            <Text style={styles.heroLink}>See your growth ›</Text>
          </TouchableOpacity>
        )}

        {/* BROKEN CONNECTION — SnapTrade serves cached data silently when a link breaks; the
            disabled flag is the only tell, so it gets a first-class fix line (their launch
            checklist requires exactly this detection + notification) */}
        {(() => {
          const broken = (store.snaptradeConnections ?? []).find((c: any) => c.disabled);
          if (!broken) return null;
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.staleLine}
              onPress={() => router.push(`/connect?reconnect=${broken.id}` as any)}
              accessibilityLabel={`The connection to ${broken.brokerage} needs re-linking. Opens the fix.`}>
              <Text style={styles.staleTxt}>⚠ {broken.brokerage} needs re-linking — fix it ›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* STALE CONNECTION — retired lens only: the working hero now carries the in-box stamp */}
        {lens === 'retired' && (() => {
          const stale = (store.assetAccounts ?? [])
            .filter((a: any) => a.source === 'connected')
            .map((a: any) => ({ a, f: connectionFreshness(a.last_synced) }))
            .filter((x: any) => x.f?.stale)
            .sort((x: any, y: any) => y.f.daysOld - x.f.daysOld)[0];
          if (!stale) return null;
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.staleLine} onPress={() => router.push('/(tabs)/analytics')}
              accessibilityLabel={`Balances from ${stale.a.institution ?? stale.a.label} are ${stale.f.daysOld} days old — open Net worth to update them.`}>
              <Text style={styles.staleTxt}>⚠ Balances from {stale.a.institution ?? stale.a.label} are {stale.f.daysOld} days old — tap to update ›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* MILESTONE — one calm line under the hero, once, dismissed on tap (the strategy's
            stated retention moment; design Home STATES). Fact-toned, never repeated. */}
        {milestone != null && (
          <TouchableOpacity accessibilityRole="button" style={styles.milestoneLine}
            onPress={() => store.setMilestoneHighSeen?.(milestone)}
            accessibilityLabel={`Your net worth just crossed ${milestoneLabel(milestone)}. Tap to dismiss.`}>
            <Text style={styles.milestoneTxt}>Your net worth just crossed {milestoneLabel(milestone)}. <Text style={styles.milestoneDismiss}>✕</Text></Text>
          </TouchableOpacity>
        )}

        {/* NET WORTH — one quiet line, taps to its one home */}
        <TouchableOpacity accessibilityRole="button" style={styles.nwLine} activeOpacity={0.7} onPress={() => router.push('/(tabs)/analytics')}
         
          accessibilityLabel={`Net worth ${spokenMoney(netWorth)}${nwDir ? `, ${nwDir} since last month` : ''}. Opens the Net worth tab.`}>
          <Text style={styles.nwLabel}>Net worth</Text>
          <InfoDot term="netWorth" />
          <Text style={styles.nwValue}>{maskedMoney(netWorth)}</Text>
          {nwDir && <Text style={[styles.nwDir, { color: nwDir === 'up' ? Colors.gainText : Colors.red }]}>{nwDir === 'up' ? '▲ up' : '▼ down'}</Text>}
          <Text style={styles.nwArrow}>›</Text>
        </TouchableOpacity>

        {/* WHAT NEEDS YOU — top 3 from the ONE insights engine (same items/order as Insights) */}
        <View style={styles.box}>
          <Text style={styles.boxLabel}>CHIEF OF STAFF — WHAT NEEDS YOU {topInsights.length > 0 ? `(${topInsights.length})` : ''}</Text>
          {topInsights.length === 0 && <Text style={styles.nothingTxt}>Nothing needs you today — nice.</Text>}
          {topInsights.map((ins, i) => (
            <TouchableOpacity accessibilityRole="button" key={ins.id} style={[styles.needRow, i > 0 && styles.divider]} activeOpacity={0.7}
              onPress={() => ins.route && router.push(ins.route as any)}
             
              accessibilityLabel={`${i + 1}. ${spokenDollars(ins.title)}. ${spokenDollars(ins.body)}`}>
              <Text style={[styles.needRank, i === 0 && styles.needRankTop]}>{i + 1}{i === 0 ? '◆' : '·'}</Text>
              <View style={{ flex: 1 }}>
                {/* engine sentences carry dollar figures — mask them, keep the words (the walk test) */}
                <Text style={[styles.needTitle, i === 0 && { fontWeight: '800' }]}>{maskDollars(ins.title)}</Text>
                <Text style={styles.needBody}>{maskDollars(ins.body)}</Text>
              </View>
              <Text style={styles.nwArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* WILL MY MONEY LAST? — Home displays the one selector's number; Plan is its home */}
        <TouchableOpacity accessibilityRole="button" style={styles.box} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
         
          accessibilityLabel={wil.chance != null
            ? `Will my money last: ${chanceWord(wil.chance)}, ${wil.chance} percent odds of lasting to age ${wil.horizonAge}, an estimate. Opens Plan.`
            : `Will my money last: sample gauge, sample 84 percent odds of lasting to age ${wil.horizonAge}, not your number. Three quick answers show your real odds — questions, not a purchase. Opens Plan.`}>
          <Text style={styles.boxLabel}>WILL MY MONEY LAST?</Text>
          {wil.chance != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <Text style={styles.wilTxt}>{chanceWord(wil.chance)} — {wil.chance}% odds of lasting to age {wil.horizonAge} <Text style={styles.wilEst}>— estimate</Text></Text>
              <InfoDot term="estimate" />
            </View>
          ) : (
            // founder 2026-07-15: a living tease of the prediction engine, never a chore — the full
            // gauge visual, LOCKED, with the number visibly blank (a fake 88% would be a trust bug)
            <View style={styles.gaugeRow}>
              <View accessible={false}>
                <Svg width={104} height={60} viewBox="0 0 104 60">
                  {['M 8 56 A 44 44 0 0 1 17.4 29.2', 'M 21.2 24.4 A 44 44 0 0 1 44.6 8.6', 'M 50.6 7.2 A 44 44 0 0 1 74.9 12.9', 'M 80.1 16.4 A 44 44 0 0 1 93.9 39.1', 'M 95.6 44.9 A 44 44 0 0 1 96 56'].map((d, i) => (
                    <Path key={d} d={d} stroke={GaugeRamp[i]} strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.9} />
                  ))}
                </Svg>
                <Text style={styles.gaugeLock}>🔒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.gaugeLine}>
                  <Text style={styles.gaugeBlank}><Text style={styles.gaugeSampleNum}>Sample: 84%</Text> odds of lasting to age {wil.horizonAge}</Text>
                </View>
                <Text style={styles.wilInvite}>3 quick answers unlock your real number</Text>
              </View>
            </View>
          )}
          <Text style={styles.heroLink}>{wil.chance != null ? 'See the full picture ›' : 'See your real odds ›'}</Text>
        </TouchableOpacity>

        {/* THIS MONTH'S CASH FLOW — the dashboard readout (founder 2026-07-15): income vs spending
            at a glance, the SAME two figures the month math above uses (thisMonthNet / bva) */}
        {(() => {
          // the approved mock (2026-07-16): pace carries a WORD (never color alone) + the three
          // money figures at money size — Income / Spent so far / Left in 17pt lining figures
          const over = thisMonthNet <= 0 || bva.spent_total > thisMonthNet;
          const fast = !over && bva.spent_total > 0.7 * thisMonthNet;
          const pace = over ? { word: 'Over', bg: Colors.redLight, fg: Colors.red }
            : fast ? { word: 'Spending fast', bg: Colors.amberLight, fg: Colors.amber }
            : { word: '✓ On pace', bg: Colors.primaryLight, fg: Colors.primaryDark };
          const pctSpent = thisMonthNet > 0 ? Math.min(999, Math.round((bva.spent_total / thisMonthNet) * 100)) : null;
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const left = thisMonthNet - bva.spent_total;
          return (
            <TouchableOpacity accessibilityRole="button" style={styles.box} activeOpacity={0.85} onPress={() => router.push('/(tabs)/cashflow')}
              accessibilityLabel={`This month's cash flow, ${pace.word.replace('✓ ', '')}: income ${spokenMoney(Math.round(thisMonthNet))}, spent so far ${spokenMoney(Math.round(bva.spent_total))}, ${left >= 0 ? `${spokenMoney(Math.round(left))} left, bills may still be coming` : `${spokenMoney(Math.round(-left))} over`}. Opens the Cash flow tab.`}>
              <Text style={styles.boxLabel}>THIS MONTH'S CASH FLOW</Text>
              <View style={styles.paceRow}>
                <Text style={[styles.paceChip, { backgroundColor: pace.bg, color: pace.fg }]}>{pace.word}</Text>
                <Text style={styles.paceNote}>{pctSpent != null ? `${pctSpent}% spent · ` : ''}day {now.getDate()} of {daysInMonth}</Text>
              </View>
              <View style={styles.cfBarTrack}>
                <View style={[styles.cfBarFill, {
                  width: `${Math.min(100, thisMonthNet > 0 ? (bva.spent_total / thisMonthNet) * 100 : (bva.spent_total > 0 ? 100 : 0))}%`,
                  backgroundColor: over ? Colors.red : fast ? Colors.amber : Colors.primary,
                }]} />
              </View>
              <View style={styles.cfRow}>
                <View style={styles.cfCell}><Text style={styles.cfLabel}>Income</Text><Text style={styles.cfNum}>{maskedMoney(Math.round(thisMonthNet))}</Text></View>
                <View style={styles.cfCell}><Text style={styles.cfLabel}>Spent so far</Text><Text style={styles.cfNum}>{maskedMoney(Math.round(bva.spent_total))}</Text></View>
                <View style={styles.cfCell}>
                  <Text style={styles.cfLabel}>{left >= 0 ? 'Left' : 'Over'}</Text>
                  <Text style={[styles.cfNum, { color: left >= 0 ? Colors.primaryDark : Colors.red }]}>{maskedMoney(Math.abs(Math.round(left)))}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })()}

        <Disclaimer />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* founder decision 2026-07-16: no '+ Expense' button on Home — logging lives on Cash flow */}
      <AllocateSavings state={allocSheet} onClose={() => setAllocSheet({ open: false })} />
    </View>
  );
}

function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
const pctTxt = (d: number) => `${(Math.round(d * 1000) / 10).toFixed(1)}%`;
const signedPct = (d: number) => `${d >= 0 ? '+' : '−'}${pctTxt(Math.abs(d))}`;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  // Type sizes on this screen come from the official ladder only (11/13/15/17/20/24/38) —
  // approved mock 2026-07-16; money figures use lining (tabular) digits so columns align.
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  staleLine: { backgroundColor: Colors.amberLight, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, marginBottom: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  staleTxt: { fontSize: 13, fontWeight: '700', color: Colors.amber },
  milestoneLine: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, marginBottom: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  milestoneTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  milestoneDismiss: { color: Colors.textTertiary, fontWeight: '800' },
  hiddenBanner: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 6, paddingHorizontal: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  coin: { fontSize: 44, textAlign: 'center', marginBottom: 10 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, minHeight: 50, justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  door: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, minHeight: 64, justifyContent: 'center' },
  doorPrimary: { borderWidth: 1.5, borderColor: Colors.primary },
  doorTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  doorSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  soonChip: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  quietLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: Spacing.md, minHeight: 44, textAlignVertical: 'center', paddingVertical: 12 },
  promiseLine: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  heroCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  heroKicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7 },
  heroBig: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
  heroLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 4 },
  heroVs: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, fontVariant: ['tabular-nums'] },
  freshness: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  heroLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 10, minHeight: 32, textAlignVertical: 'center' },

  nwLine: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 13, marginBottom: Spacing.sm, gap: 8, minHeight: 48 },
  nwLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  nwValue: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  nwDir: { fontSize: 13, fontWeight: '800' },
  nwArrow: { fontSize: 20, color: Colors.textTertiary },

  box: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  boxLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginBottom: 4 },
  nothingTxt: { fontSize: 15, color: Colors.textSecondary, paddingVertical: 8 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, minHeight: 44 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  needRank: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, width: 26 },
  needRankTop: { color: Colors.primary, fontWeight: '800' },
  needTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  needBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  wilTxt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wilEst: { fontSize: 13, fontWeight: '500', color: Colors.textTertiary },
  wilInvite: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  gaugeLock: { position: 'absolute', alignSelf: 'center', top: 26, fontSize: 20 },
  gaugeBlank: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  gaugeLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gaugeSampleNum: { fontWeight: '800', color: Colors.textTertiary, fontStyle: 'italic' },
  paceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  paceChip: { fontSize: 12, fontWeight: '800', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden' },
  paceNote: { fontSize: 12, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
  cfBarTrack: { height: 12, borderRadius: 6, backgroundColor: Colors.bgTertiary, marginTop: 8, overflow: 'hidden' },
  cfBarFill: { height: 12, borderRadius: 6 },
  cfRow: { flexDirection: 'row', marginTop: 12 },
  cfCell: { flex: 1 },
  cfLabel: { fontSize: 13, color: Colors.textSecondary },
  cfNum: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
});
