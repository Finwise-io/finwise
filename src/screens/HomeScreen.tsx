// Home = live spending cockpit. Track income & expenses against budget, per month.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { personaOf, ageFromProfile } from '../utils/persona';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money, round2 } from '../domain/_shared/num';
import { currencySymbol, moneyCompact } from '../domain/_shared/money';
import { buildSnapshot, resolveNetWorthRows } from '../domain/snapshot';
import { budgetVsActual, plannedMonthlySpend } from '../domain/budget';
import { Disclaimer } from '../components/Disclaimer';
import { incomeMonthlyGrid } from '../domain/income';
import { BUDGET_CATEGORIES, categoryBucketFor, budgetCategoryIcon } from '../constants/categories';
import { assetKind, buildAssetsState } from '../domain/assets';
import { totalDebtMonthly, requiredPayment, buildDebtState } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { taxBucketSplit, rmdAtAge, RMD_START_AGE } from '../domain/decumulation';
import { pickReceipt, ocrReceipt, ocrAvailable } from '../services/receiptScan';
import { usePlanCompleteness } from './SharpenPlanScreen';
import { useInsights } from './InsightsScreen';

const BUCKET_META: Record<string, { title: string; color: string }> = {
  fixed: { title: 'Fixed', color: Colors.blue },
  nonmonthly: { title: 'Non-monthly', color: Colors.amber },
  flexible: { title: 'Flexible', color: '#7A5AA7' },
};
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function HomeScreen() {
  const router = useRouter();
  const sharpen = usePlanCompleteness();
  const topInsights = useInsights(2);
  const store = useStore() as any;
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const name = (store.user?.name || op?.name || 'there').split(' ')[0];
  // persona-adaptive focus shortcuts
  const persona = personaOf({ age: ageFromProfile(op), employmentStatus: store.employmentStatus, targetRetireAge: parseInt(String(op?.targetRetirementAge ?? '65'), 10) || 65 });
  const FOCUS = {
    building: { title: 'Your focus — goals & growth', actions: [{ icon: '🎯', label: 'Goals & debt', route: '/goals' }, { icon: '📈', label: 'Grow investments', route: '/performance' }, { icon: '📅', label: 'Bill calendar', route: '/bill-calendar' }] },
    preretiree: { title: 'Your focus — get retirement-ready', actions: [{ icon: '🏖️', label: 'Retirement outlook', route: '/retirement' }, { icon: '📈', label: 'Portfolio', route: '/performance' }, { icon: '📅', label: 'Bill calendar', route: '/bill-calendar' }] },
    retired: { title: 'Your focus — make it last', actions: [{ icon: '🏖️', label: 'Retirement Plan', route: '/retirement' }, { icon: '📈', label: 'Portfolio', route: '/performance' }, { icon: '📅', label: 'Bill calendar', route: '/bill-calendar' }] },
  }[persona];
  const expenses = (store.expenses ?? []) as any[];
  const customCats = useMemo(() => (Array.isArray(op?.spendCats) ? op.spendCats : []).filter((c: any) => c?.custom && c?.label), [op]);
  const [sheet, setSheet] = useState(false);
  const [incomeSheet, setIncomeSheet] = useState(false);
  const [allocSheet, setAllocSheet] = useState<{ open: boolean; ym?: string; label?: string; available?: number; isPrompt?: boolean }>({ open: false });
  const [paySheet, setPaySheet] = useState<{ open: boolean; debt?: any }>({ open: false });
  const [monthOffset, setMonthOffset] = useState(0);   // 0 = current month, -1 = last month, …

  const now = new Date();
  const selDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const isCurrentMonth = monthOffset === 0;
  const monthLabel = `${MONTHS_LONG[selDate.getMonth()]} ${selDate.getFullYear()}`;
  const monthShort = MONTHS_LONG[selDate.getMonth()].slice(0, 3);

  const snap = useMemo(
    // B-49: net worth + nest egg come from the live store rows (so account edits/deletions show),
    // resolved by the one shared rule so Home, TopBar, and the Net Worth screen always agree.
    () => {
      if (!op && !store.nwSeeded) return null;
      const { accounts, liabilities } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
      return buildSnapshot(uid, op, { inflationRate: store.inflationRate ?? 2.4, treasuryYield: store.treasuryYield ?? 4.3 }, accounts, liabilities);
    },
    [op, uid, store.inflationRate, store.treasuryYield, store.nwSeeded, store.assetAccounts, store.liabilities],
  );
  const liabilities = (store.liabilities ?? []) as any[];
  const debtMonthly = totalDebtMonthly(liabilities);
  const bva = useMemo(() => budgetVsActual(expenses, op, selDate), [expenses, op, monthOffset]);
  // net-worth-over-time from frozen monthly snapshots
  const nwSeries = useMemo(() => {
    const snaps = (store.monthlySnapshots ?? {}) as Record<string, any>;
    return Object.values(snaps).filter((s) => s && s.net_worth != null && s.month).map((s) => ({ month: s.month as string, nw: s.net_worth as number }))
      .sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-12);
  }, [store.monthlySnapshots]);
  const baseNet = useMemo(() => {
    const g = op ? incomeMonthlyGrid(op, 'net') : [];
    return g[selDate.getMonth()]?.amount ?? 0;
  }, [op, monthOffset]);
  const ym = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
  const extraIncome = (store.incomes ?? []).filter((i: any) => String(i?.date ?? '').startsWith(ym))
    .reduce((t: number, i: any) => t + (Number(i.amount) || 0), 0);
  const thisMonthNet = baseNet + extraIncome;

  // prior-month summary — only once there's activity logged in the previous month
  const priorDate = new Date(selDate.getFullYear(), selDate.getMonth() - 1, 1);
  const priorYm = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`;
  const incomesArr = store.incomes ?? [];
  const priorHasActivity = expenses.some((e: any) => String(e?.date ?? '').startsWith(priorYm))
    || incomesArr.some((i: any) => String(i?.date ?? '').startsWith(priorYm));
  const prior = priorHasActivity ? (() => {
    const pSpent = budgetVsActual(expenses, op, priorDate).spent_total;
    const g = op ? incomeMonthlyGrid(op, 'net') : [];
    const pBase = g[priorDate.getMonth()]?.amount ?? 0;
    const pExtra = incomesArr.filter((i: any) => String(i?.date ?? '').startsWith(priorYm)).reduce((t: number, i: any) => t + (Number(i.amount) || 0), 0);
    const pIncome = pBase + pExtra;
    return { label: MONTHS_LONG[priorDate.getMonth()].slice(0, 3), income: pIncome, spent: pSpent, saved: pIncome - pSpent };
  })() : null;

  // month-end nudge: after a month with savings, ask where it went (once, if not skipped)
  useEffect(() => {
    if (!prior || prior.saved <= 0) return;
    if ((store.assetAccounts ?? []).length === 0) return;
    const done = store.allocatedByMonth?.[priorYm] ?? 0;
    if (done >= prior.saved || store.allocPromptSkipped?.[priorYm]) return;
    setAllocSheet({ open: true, ym: priorYm, label: prior.label, available: prior.saved - done, isPrompt: true });
  }, []);

  // debt due-soon reminder (current month, from due_day − 1)
  const paidThisMonth = (d: any, monthYm: string) => (store.expenses ?? []).some((e: any) => e.category === 'Debt payment' && e.store === d.label && String(e.date).startsWith(monthYm));
  useEffect(() => {
    const t = new Date(); const tym = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
    const due = (store.liabilities ?? []).filter((d: any) => d.due_day && t.getDate() >= d.due_day - 1 && !paidThisMonth(d, tym));
    if (due.length) Alert.alert('Debt due soon', due.map((d: any) => `${d.label} — ${money(requiredPayment(d))} due ${ordinal(d.due_day)}`).join('\n'), [{ text: 'OK' }]);
  }, []);

  // freeze month-by-month metrics for trailing history (net worth, income, spend, savings, debt)
  useEffect(() => {
    if (!op) return;
    const a = store.assetAccounts ?? [], l = store.liabilities ?? [];
    const nwv = buildNetWorth(uid, buildAssetsState(uid, a).total_asset_value, buildDebtState(uid, l).total_debt_balance);
    const monthExp = (store.expenses ?? []).filter((e: any) => String(e.date).startsWith(ym));
    const dPaid = monthExp.filter((e: any) => e.category === 'Debt payment').reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
    const eSpent = bva.spent_total;
    // granular: spend by category, and per-account / per-debt balances (frozen for the month)
    const byCategory: Record<string, number> = {};
    monthExp.filter((e: any) => e.category !== 'Debt payment').forEach((e: any) => { byCategory[e.category] = (byCategory[e.category] ?? 0) + (Number(e.amount) || 0); });
    const assetsSnap = a.map((x: any) => ({ id: x.asset_id, label: x.label, kind: x.kind ?? null, bucket: x.tax_bucket, institution: x.institution ?? null, balance: x.balance }));
    const debtsSnap = l.map((x: any) => ({ id: x.debt_id, label: x.label, type: x.debt_type, balance: x.remaining_balance, apr: x.interest_rate_apr }));
    store.captureMonthlySnapshot?.(ym, {
      month: ym,
      net_worth: nwv.net_worth, gross_assets: nwv.gross_assets, gross_debt: nwv.gross_debt,
      income_net: Math.round(thisMonthNet), spending: eSpent, debt_paid: dPaid,
      savings: Math.round(thisMonthNet - eSpent - dPaid), allocated: store.allocatedByMonth?.[ym] ?? 0,
      planned_budget: bva.planned_total, savings_rate: thisMonthNet > 0 ? Math.round(((thisMonthNet - eSpent - dPaid) / thisMonthNet) * 100) : 0,
      by_category: byCategory,          // e.g. { "Gas / Transport": 180, "Dining out": 240 }
      assets: assetsSnap,               // per-account balances (Stocks/ETFs, 529, …) — for portfolio trends
      debts: debtsSnap,                 // per-debt balances
      captured_at: new Date().toISOString(),
    });
  }, [ym, thisMonthNet, bva, expenses, store.assetAccounts, store.liabilities, store.allocatedByMonth]);


  if (!snap) {
    // Resume-aware: a saved draft means they're mid-setup — say so, and UN-PAUSE before routing
    // (the auth guard bounces paused users out of /onboarding, which looked like a dead loop).
    const draft = store.onboardingDraft;
    const goSetup = () => { store.setOnboardingPaused?.(false); router.replace('/onboarding'); };
    return (
      <View style={[styles.root, { justifyContent: 'center', padding: Spacing.lg }]}>
        <Text style={styles.coin}>🪙</Text>
        <Text style={[styles.h1, { textAlign: 'center' }]}>{draft ? 'Pick up where you left off' : "Let's build your plan"}</Text>
        <Text style={[styles.sub, { textAlign: 'center', marginTop: 6 }]}>
          {draft ? 'Your progress is saved — a few more steps and your dashboard fills in.'
                 : 'Finish a quick setup and your dashboard fills in.'}
        </Text>
        <TouchableOpacity style={styles.cta} onPress={goSetup}>
          <Text style={styles.ctaText}>{draft ? 'Continue setup →' : 'Start setup →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const planned = bva.planned_total;
  const spent = bva.spent_total;
  // Planned monthly spend — ONE definition shared with Budget/runway (P0 dedup): the canonical
  // plannedMonthlySpend = MAX(stated estimate, sum of category limits). We surface both components.
  const estSpend = Number(op?.monthlySpending) || 0;          // (a→input) the stated "typical month" estimate
  const catSpend = planned;                                   // sum of itemized category limits (= bva.planned_total)
  const plannedSpend = plannedMonthlySpend(op);               // canonical planned spend (matches the Money tab)
  // RMD: once you reach RMD age, the IRS requires a yearly withdrawal from pre-tax accounts.
  const homeAge = ageFromProfile(op) ?? 0;
  const rmdAccounts = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []).accounts,
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);
  const preTaxBal = taxBucketSplit(rmdAccounts).preTax;
  const rmdAnnual = (homeAge >= RMD_START_AGE && preTaxBal > 0) ? rmdAtAge(preTaxBal, homeAge) : 0;
  const debtPaid = expenses.filter((e: any) => e.category === 'Debt payment' && String(e.date).startsWith(ym)).reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
  const debtLeft = Math.max(0, debtMonthly - debtPaid);
  const debtPct = debtMonthly > 0 ? Math.min(1, debtPaid / debtMonthly) : 0;
  const leftOver = thisMonthNet - spent - debtPaid;   // take-home minus all outflows (expenses + debt)
  const allocatedThis = store.allocatedByMonth?.[ym] ?? 0;
  const allocatable = Math.max(0, leftOver - allocatedThis);
  const investedAccts = (store.assetAccounts ?? []).filter((a: any) => a.change_month === ym && (a.change_amount || 0) > 0);
  const investedTotal = investedAccts.reduce((t: number, a: any) => t + (a.change_amount || 0), 0);
  const pct = planned > 0 ? Math.min(1, spent / planned) : 0;
  const over = bva.remaining < 0;                          // over the EXPENSE budget (drives the attention heads-up)
  // Home cash-flow combines spending + debt PAID into total out; the bar is actual-vs-plan, where the
  // plan = expense budget + required monthly debt (both sides include debt → consistent). Detail in Money.
  const cfOut = round2(spent + debtPaid);                  // Income − cfOut = leftOver (exact identity)
  const hasDebt = debtMonthly > 0 || debtPaid > 0;
  const planAll = round2(plannedSpend + debtMonthly);   // plan = canonical planned spend (+ required debt)
  const pctAll = planAll > 0 ? Math.min(1, cfOut / planAll) : 0;
  const overAll = cfOut > planAll && planAll > 0;
  const feed = [
    ...expenses.map((e: any) => ({ kind: 'exp' as const, id: e.id, label: e.store || e.category, sub: `${e.category} · ${shortDate(e.date)}`, amount: Number(e.amount) || 0, date: e.date, icon: budgetCategoryIcon(e.category, customCats) })),
    ...(store.incomes ?? []).map((i: any) => ({ kind: 'inc' as const, id: i.id, label: i.source || 'Income', sub: `Income · ${shortDate(i.date)}`, amount: Number(i.amount) || 0, date: i.date, icon: '💰' })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 7);

  // budget-pace insight (hardcoded for now — to be served by the Insight service later)
  const dim = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 0).getDate();
  const dayOfMonth = isCurrentMonth ? Math.min(now.getDate(), dim) : dim;
  const frac = dayOfMonth / dim;
  // only the flexible (daily-ish) bucket extrapolates; fixed & non-monthly are paid once, not daily
  const fSpent = bva.buckets.find((b) => b.key === 'fixed')?.spent ?? 0;
  const nSpent = bva.buckets.find((b) => b.key === 'nonmonthly')?.spent ?? 0;
  const xSpent = bva.buckets.find((b) => b.key === 'flexible')?.spent ?? 0;
  const projected = fSpent + nSpent + (frac > 0 ? xSpent / frac : xSpent);
  const daysLeft = Math.max(0, dim - dayOfMonth);
  const dailyFlex = dayOfMonth > 0 ? xSpent / dayOfMonth : 0;
  const projOver = projected - planned;
  let insight: { txt: string; sub: string; warn?: boolean } | null = null;
  if (planned > 0) {
    if (isCurrentMonth) {
      const pace = `${money(dailyFlex)}/day on flexible · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
      if (spent === 0) insight = { txt: `Fresh start for ${monthShort}`, sub: `Budget ${money(planned)} — log expenses to track.` };
      else if (projOver > planned * 0.02) insight = { txt: `Trending ${money(projOver)} over budget`, sub: pace, warn: true };
      else insight = { txt: `On track — ${money(Math.max(0, -projOver))} to spare`, sub: pace };
    } else {
      const diff = planned - spent;
      insight = diff >= 0
        ? { txt: `Came in ${money(diff)} under budget`, sub: `Spent ${money(spent)} of ${money(planned)}.` }
        : { txt: `Went ${money(-diff)} over budget`, sub: `Spent ${money(spent)} of ${money(planned)}.`, warn: true };
    }
  } else {
    insight = { txt: 'Set a spending budget', sub: 'Add spending categories in Setup to track against a budget.' };
  }


  const removeItem = (it: any) => {
    Alert.alert('Remove this?', `${it.label} · ${money(it.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => (it.kind === 'inc' ? store.deleteIncome?.(it.id) : store.deleteExpense?.(it.id)) },
    ]);
  };

  // ── Home glance values (redesign): verdict + 5 headline bullets + the 4 boxes ──
  const netWorth = snap.networth.net_worth;
  // Chart + delta share ONE 6-month window so the "+$X · N mo" and the bars always agree, and the
  // per-bar value labels stay legible (>=10px) instead of shrinking to fit 12 columns.
  const nwWindow = nwSeries.slice(-6);
  const nwVals = nwWindow.map((p) => p.nw);
  const nwChange = nwVals.length >= 2 ? nwVals[nwVals.length - 1] - nwVals[0] : 0;
  // concentration: largest single non-property account as a share of investable assets
  const conc = (() => {
    const accts = rmdAccounts.filter((a: any) => a.tax_bucket !== 'PROPERTY');
    const tot = accts.reduce((t: number, a: any) => t + (a.balance || 0), 0);
    if (tot <= 0 || accts.length < 2) return null;
    const top = accts.reduce((m: any, a: any) => ((a.balance || 0) > (m.balance || 0) ? a : m), accts[0]);
    const p = Math.round(((top.balance || 0) / tot) * 100);
    return p >= 50 ? { pct: p, label: (top.institution?.trim() || top.label) as string } : null;
  })();
  const dueSoon = isCurrentMonth ? liabilities.filter((d: any) => d.due_day && now.getDate() >= d.due_day - 3 && !paidThisMonth(d, ym)) : [];
  const attention: { icon: string; text: string; debt?: any }[] = [];
  if (over) attention.push({ icon: '⚠️', text: `Spending is ${money(-bva.remaining)} over budget this month` });
  dueSoon.forEach((d: any) => attention.push({ icon: '💳', text: `${d.label} due ${ordinal(d.due_day)} · ${money(requiredPayment(d))}`, debt: d }));
  if (rmdAnnual > 0) attention.push({ icon: '📌', text: `Required withdrawal (RMD) ~${money(rmdAnnual)} by Dec 31` });
  const scrollRef = React.useRef<ScrollView>(null);
  const yPos = React.useRef<Record<string, number>>({});
  const onSecLayout = (k: string) => (e: any) => { yPos.current[k] = e.nativeEvent.layout.y; };
  const jumpTo = (k: string) => scrollRef.current?.scrollTo({ y: Math.max(0, (yPos.current[k] ?? 0) - 8), animated: true });
  // briefing bullets — each tagged good/warn so the leading icon is consistent (✓ vs ⚠️), matching
  // the verdict. "What to do next" is the Focus box itself, so it isn't repeated as a bullet here.
  const bullets: { txt: string; k: string; warn: boolean }[] = [
    { txt: `${money(leftOver)} left over after spending & debt`, k: 'cash', warn: leftOver < 0 },
    { txt: nwChange !== 0 ? `Net worth ${money(netWorth)} — ${nwChange >= 0 ? 'up' : 'down'} ${money(Math.abs(nwChange))}` : `Net worth ${money(netWorth)}`, k: 'nw', warn: false },
    ...(conc ? [{ txt: `${conc.pct}% of investments sit in one account`, k: 'nw', warn: true }] : []),
    ...(attention.length ? [{ txt: attention[0].text, k: 'attention', warn: true }] : []),
  ];
  const concerns = (leftOver < 0 ? 1 : 0) + (conc ? 1 : 0) + attention.length;
  const verdict = concerns === 0 ? "✅ You're on track this month"
    : concerns === 1 ? '⚠️ One thing needs a look'
    : '⚠️ A couple of things need a look';
  // The glance card is the status-tinted hero (the one accent): green when clear, amber for
  // heads-ups, red when you're spending more than you make.
  const heroBg = leftOver < 0 ? Colors.redLight : concerns === 0 ? Colors.primaryLight : Colors.amberLight;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sub}>Good {greeting()}</Text>
            <Text style={styles.h1}>{name}</Text>
            {(store.streak ?? 0) > 0 && (
              <View style={styles.chipsRow}>
                <View style={styles.streakChip}><Text style={styles.streakTxt}>🔥 {store.streak}-day streak</Text></View>
              </View>
            )}
          </View>
        </View>

        {/* sharpen-your-plan nudge (only when incomplete) */}
        {sharpen.pct < 100 && (
          <TouchableOpacity style={styles.sharpenCard} activeOpacity={0.85} onPress={() => router.push('/sharpen')}
            accessibilityRole="button"
            accessibilityLabel={`Sharpen your plan, ${sharpen.pct} percent complete`}
            accessibilityHint="Opens the steps left to finish your plan">
            <View style={{ flex: 1 }}>
              <Text style={styles.sharpenTitle}>Sharpen your plan · {sharpen.pct}%</Text>
              <Text style={styles.sharpenSub}>{sharpen.total - sharpen.doneCount} step{sharpen.total - sharpen.doneCount > 1 ? 's' : ''} left to complete your plan</Text>
              <View style={styles.sharpenBar}><View style={[styles.sharpenFill, { width: `${sharpen.pct}%` }]} /></View>
            </View>
            <Text style={styles.focusArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* TODAY AT A GLANCE — status-tinted hero: verdict + tappable headline bullets */}
        <View style={[styles.glance, { backgroundColor: heroBg }]}>
          <Text style={styles.glanceVerdict}>{verdict}</Text>
          {bullets.map((b, i) => (
            <TouchableOpacity key={i} style={styles.glanceRow} activeOpacity={0.7} onPress={() => jumpTo(b.k)}
              accessibilityRole="button"
              accessibilityLabel={`${b.warn ? 'Needs attention' : 'On track'}: ${b.txt}`}
              accessibilityHint="Opens the related section">
              <Text style={[styles.glanceDot, !b.warn && styles.glanceDotGood]}>{b.warn ? '⚠️' : '✓'}</Text>
              <Text style={styles.glanceTxt} numberOfLines={1}>{b.txt}</Text>
              <Text style={styles.glanceArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CASH FLOW — this month: in / spent / left + budget bar (detail lives in Money) */}
        <View style={styles.box} onLayout={onSecLayout('cash')}>
          <Text style={styles.boxLabel}>💵 CASH FLOW · {monthShort.toUpperCase()}</Text>
          {/* Exact identity: Income − (Spent + debt paid) = Left over. Bar fill is ACTUAL out
              (spent + debtPaid); the plan (budget + required debt) is stated as text. Detail in Money. */}
          <View style={styles.cfRow}>
            <TouchableOpacity style={styles.cfCell} activeOpacity={0.8} onPress={() => setIncomeSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`Income this month ${money(thisMonthNet)}`}
              accessibilityHint="Add income">
              <Text style={styles.cfV} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{money(thisMonthNet)}</Text>
              <View style={styles.cfLabelRow}><Text style={styles.cfL}>Income</Text><View style={styles.cfAdd}><Text style={styles.cfAddTxt}>＋</Text></View></View>
            </TouchableOpacity>
            <Text style={styles.cfOp}>−</Text>
            <View style={styles.cfCell}>
              <Text style={styles.cfV} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{money(cfOut)}</Text>
              <Text style={styles.cfL} numberOfLines={1}>{hasDebt ? 'Actual + debt' : 'Actual spend'}</Text>
            </View>
            <Text style={styles.cfOp}>=</Text>
            <TouchableOpacity style={styles.cfCell} activeOpacity={0.8} onPress={() => setAllocSheet({ open: true, ym, label: monthShort, available: allocatable })}
              accessibilityRole="button"
              accessibilityLabel={`Surplus this month ${money(leftOver)}`}
              accessibilityHint="Allocate this month's surplus">
              <Text style={[styles.cfV, { color: leftOver >= 0 ? Colors.primary : Colors.red }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{money(leftOver)}</Text>
              <View style={styles.cfLabelRow}><Text style={styles.cfL}>Surplus</Text><View style={styles.cfAdd}><Text style={styles.cfAddTxt}>＋</Text></View></View>
            </TouchableOpacity>
          </View>
          {plannedSpend > 0 ? (
            <>
              <View style={styles.trackSm}><View style={[styles.fillSm, { width: `${Math.max(2, pctAll * 100)}%`, backgroundColor: overAll ? Colors.red : Colors.primary }]} /></View>
              <Text style={styles.cfFoot}>{overAll ? `${money(cfOut - planAll)} over your ${money(planAll)} ${hasDebt ? 'monthly plan (spending + debt)' : 'monthly budget'}` : `${money(planAll - cfOut)} left of your ${money(planAll)} ${hasDebt ? 'monthly plan (spending + debt)' : 'monthly budget'}`}</Text>
              <Text style={styles.cfSub}>
                Planned spend {money(plannedSpend)}/mo
                {estSpend > 0 && catSpend > 0 ? ` — your estimate ${money(estSpend)} · categories ${money(catSpend)}` : estSpend > 0 ? ' — your estimate' : ' — from your categories'}
              </Text>
            </>
          ) : (
            <Text style={styles.cfFoot}>Set a monthly budget in Money</Text>
          )}
          {/* #15: full cash-flow detail — breakdown + month-by-month projection + planned-vs-actual */}
          <View style={styles.cfLinks}>
            <TouchableOpacity onPress={() => router.push('/cashflow')} accessibilityRole="button" accessibilityLabel="See cash flow detail"><Text style={styles.seeAll}>Cash-flow detail →</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/budget')}><Text style={styles.seeAll}>See all in Money →</Text></TouchableOpacity>
          </View>
        </View>

        {/* NET WORTH — glance + trend + concentration insight (caption below the chart, not overlaid) */}
        <View style={styles.box} onLayout={onSecLayout('nw')}>
          <Text style={styles.boxLabel}>💎 NET WORTH</Text>
          <View style={styles.nwHeadRow}>
            <Text style={styles.nwBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{money(netWorth)}</Text>
            {nwChange !== 0 && <Text style={[styles.nwDelta, { color: nwChange >= 0 ? Colors.primary : Colors.red }]}>{nwChange >= 0 ? '+' : ''}{money(nwChange)} · {nwWindow.length} mo</Text>}
          </View>
          {nwWindow.length >= 2 && (() => {
            const lo = Math.min(...nwVals), hi = Math.max(...nwVals), span = hi - lo || 1;
            return (
              <View style={styles.nwChart}>
                {nwWindow.map((p) => (
                  <View key={p.month} style={styles.nwCol}>
                    <Text style={styles.nwBarVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{moneyCompact(p.nw, 'M')}</Text>
                    <View style={[styles.nwBar, { height: Math.round(12 + ((p.nw - lo) / span) * 68) }]} />
                    <Text style={styles.nwBarLbl}>{p.month.slice(5)}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
          {conc && <Text style={styles.nwInsight}>💡 {conc.pct}% of your investments sit in {conc.label} — tap to diversify</Text>}
          <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}><Text style={styles.seeAll}>See net worth →</Text></TouchableOpacity>
        </View>

        {/* NEEDS ATTENTION — renders only when something is genuinely due/at-risk */}
        {attention.length > 0 && (
          <View style={styles.box} onLayout={onSecLayout('attention')}>
            <Text style={styles.boxLabel}>⚠️ NEEDS ATTENTION</Text>
            {attention.map((a, i) => (
              <View key={i} style={[styles.attnRow, i > 0 && styles.divider]}>
                <Text style={styles.attnIcon}>{a.icon}</Text>
                <Text style={styles.attnTxt}>{a.text}</Text>
                {a.debt && <TouchableOpacity style={styles.payBtn} onPress={() => setPaySheet({ open: true, debt: a.debt })}><Text style={styles.payTxt}>Pay</Text></TouchableOpacity>}
              </View>
            ))}
          </View>
        )}

        {/* YOUR FOCUS — adaptive launchpad (white card; the tinted hero above is the accent now).
            Tax organizer + Insights folded in as rows so nothing floats on its own. */}
        <View style={styles.focusCard} onLayout={onSecLayout('focus')}>
          <Text style={styles.focusTitle}>{FOCUS.title}</Text>
          {FOCUS.actions.map((a, i) => (
            <TouchableOpacity key={a.route} style={[styles.focusBtn, i > 0 && styles.focusDiv]} activeOpacity={0.7} onPress={() => router.push(a.route as any)}>
              <Text style={styles.focusIcon}>{a.icon}</Text>
              <Text style={styles.focusLabel} numberOfLines={1}>{a.label}</Text>
              <Text style={styles.focusArrow}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.focusBtn, styles.focusDiv]} activeOpacity={0.7} onPress={() => router.push('/tax-organizer')}>
            <Text style={styles.focusIcon}>🧾</Text>
            <Text style={styles.focusLabel} numberOfLines={1}>Tax organizer</Text>
            <Text style={styles.focusArrow}>›</Text>
          </TouchableOpacity>
          {topInsights.length > 0 && (
            <TouchableOpacity style={[styles.focusBtn, styles.focusDiv]} activeOpacity={0.7} onPress={() => router.push('/insights')}>
              <Text style={styles.focusIcon}>💡</Text>
              <Text style={styles.focusLabel} numberOfLines={1}>Insights for you{topInsights[0]?.title ? ` · ${topInsights[0].title}` : ''}</Text>
              <Text style={styles.focusArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <Disclaimer />
        <View style={{ height: 96 }} />
      </ScrollView>

      <View style={styles.fabBar}>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={() => setSheet(true)}
          accessibilityRole="button" accessibilityLabel="Add expense" accessibilityHint="Opens the quick add-expense form">
          <Text style={styles.addBtnTxt}>＋  Add expense</Text>
        </TouchableOpacity>
      </View>

      <QuickAddExpense visible={sheet} onClose={() => setSheet(false)} customCats={customCats}
        isCurrentMonth={isCurrentMonth} baseDate={selDate} monthLabel={monthLabel} />

      <IncomeSheet visible={incomeSheet} onClose={() => setIncomeSheet(false)} op={op}
        isCurrentMonth={isCurrentMonth} baseDate={selDate} monthLabel={monthLabel} />

      <AllocateSavings state={allocSheet} onClose={() => setAllocSheet({ open: false })} />
      <DebtPaySheet state={paySheet} onClose={() => setPaySheet({ open: false })} />
    </View>
  );
}

// ── log a debt payment (amount + date) ────────────────────────────────────────
function DebtPaySheet({ state, onClose }: { state: { open: boolean; debt?: any }; onClose: () => void }) {
  const store = useStore() as any;
  const d = state.debt;
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  useEffect(() => { if (state.open && d) { setAmount(String(requiredPayment(d))); setDay('today'); } }, [state.open]);
  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

  const save = () => {
    if (!d || amt <= 0) return;
    const dt = new Date(); if (day === 'yesterday') dt.setDate(dt.getDate() - 1);
    store.addExpense?.({ amount: amt, category: 'Debt payment', store: d.label, date: iso(dt), notes: '' });
    store.updateLiability?.(d.debt_id, { remaining_balance: Math.max(0, d.remaining_balance - amt) });
    onClose();
  };

  return (
    <Modal visible={state.open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={sh.card} onStartShouldSetResponder={() => true}>
          <View style={sh.handle} />
          <Text style={sh.title}>Pay {d?.label}</Text>
          <Text style={sh.bucketHint}>{money(d?.remaining_balance ?? 0)} balance · {d?.due_day ? `due ${ordinal(d.due_day)}` : 'no due date'}</Text>
          <View style={sh.amtRow}>
            <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={amount} onChangeText={setAmount} autoFocus />
          </View>
          <View style={sh.dayRow}>
            {(['today', 'yesterday'] as const).map((dd) => (
              <TouchableOpacity key={dd} style={[sh.dayChip, day === dd && sh.chipOn]} onPress={() => setDay(dd)}>
                <Text style={[sh.chipTxt, { textTransform: 'capitalize' }]}>{dd}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[sh.save, amt <= 0 && { opacity: 0.4 }]} disabled={amt <= 0} onPress={save}>
            <Text style={sh.saveTxt}>Log payment of {money(amt)}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── allocate this month's savings to accounts/instruments ─────────────────────
function AllocateSavings({ state, onClose }: { state: { open: boolean; ym?: string; label?: string; available?: number; isPrompt?: boolean }; onClose: () => void }) {
  const store = useStore() as any;
  const accounts = (store.assetAccounts ?? []) as any[];
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, 'dollar' | 'pct'>>({});
  useEffect(() => { if (state.open) { setAmounts({}); setUnits({}); } }, [state.open]);

  const available = state.available ?? 0;
  const parse = (v: string) => parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  const dollarOf = (id: string) => (units[id] === 'pct' ? (parse(amounts[id]) / 100) * available : parse(amounts[id]));
  const total = accounts.reduce((t, a) => t + dollarOf(a.asset_id), 0);
  const over = total > available + 0.5;

  const save = () => {
    const items = accounts.map((a) => ({ assetId: a.asset_id, amount: Math.round(dollarOf(a.asset_id) * 100) / 100 })).filter((i) => i.amount > 0);
    if (items.length && state.ym) store.allocateSavings?.(state.ym, items);
    onClose();
  };
  const skip = () => { if (state.ym) store.skipAllocPrompt?.(state.ym); onClose(); };

  return (
    <Modal visible={state.open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <Text style={sh.title}>Where did {state.label} savings go?</Text>
            <Text style={[sh.allocHead, over && { color: Colors.red }]}>{money(Math.max(0, available - total))} of {money(available)} left to assign</Text>
            {accounts.length === 0
              ? <Text style={sh.dateNote}>Add accounts in Net Worth first, then come back to assign your savings.</Text>
              : accounts.map((a) => {
                const unit = units[a.asset_id] ?? 'dollar';
                const d = dollarOf(a.asset_id);
                return (
                  <View key={a.asset_id} style={sh.allocRow}>
                    <Text style={sh.allocIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={sh.allocName}>{a.label}</Text>
                      <Text style={sh.allocSub}>{assetKind(a.kind)?.label ?? a.tax_bucket}{unit === 'pct' && parse(amounts[a.asset_id]) > 0 ? ` · = ${money(d)}` : (a.institution ? ` · ${a.institution}` : '')}</Text>
                    </View>
                    <TextInput style={sh.allocInput} keyboardType="decimal-pad" placeholder={unit === 'pct' ? '0%' : `${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
                      value={amounts[a.asset_id] || ''} onChangeText={(t) => setAmounts((m) => ({ ...m, [a.asset_id]: t }))} />
                    <TouchableOpacity style={sh.unitToggle} onPress={() => setUnits((u) => ({ ...u, [a.asset_id]: unit === 'pct' ? 'dollar' : 'pct' }))}>
                      <Text style={sh.unitToggleTxt}>{unit === 'pct' ? '%' : currencySymbol()}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            {accounts.length > 0 && (
              <TouchableOpacity style={[sh.save, (total <= 0 || over) && { opacity: 0.4 }]} disabled={total <= 0 || over} onPress={save}>
                <Text style={sh.saveTxt}>{over ? 'Over available' : `Assign ${money(total)}`}</Text>
              </TouchableOpacity>
            )}
            {state.isPrompt && <TouchableOpacity onPress={skip}><Text style={sh.remove}>Skip for now</Text></TouchableOpacity>}
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── income bottom sheet — add a one-off inflow OR edit base pay ────────────────
const FREQS = [{ v: 'hourly', l: 'Hourly' }, { v: 'weekly', l: 'Weekly' }, { v: 'biweekly', l: 'Bi-weekly' }, { v: 'monthly', l: 'Monthly' }];
const INCOME_SOURCES = ['Gift', 'Bonus', 'Stock sale', 'Refund', 'Side gig', 'Other'];
function IncomeSheet({ visible, onClose, op, isCurrentMonth, baseDate, monthLabel }: {
  visible: boolean; onClose: () => void; op: any; isCurrentMonth: boolean; baseDate: Date; monthLabel: string;
}) {
  const store = useStore() as any;
  const router = useRouter();
  const [tab, setTab] = useState<'add' | 'base'>('add');
  // add one-off income
  const [amount, setAmount] = useState('');
  const [src, setSrc] = useState('');
  const [otherSrc, setOtherSrc] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  // edit base pay
  const [baseAmt, setBaseAmt] = useState('');
  const [mode, setMode] = useState<'gross' | 'takehome'>('gross');
  const [freq, setFreq] = useState('monthly');

  React.useEffect(() => {
    if (!visible) return;
    setTab('add'); setAmount(''); setSrc(''); setOtherSrc(''); setDay('today');
    setBaseAmt(String(op?.baseSalary ?? ''));
    setMode(op?.salaryMode === 'takehome' ? 'takehome' : 'gross');
    setFreq(op?.salaryFreq ?? 'monthly');
  }, [visible]);

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const finalSrc = src === 'Other' ? otherSrc.trim() : src;
  const addReady = amt > 0 && !!finalSrc;
  const bAmt = parseFloat(String(baseAmt).replace(/[^0-9.]/g, '')) || 0;

  const saveAdd = () => {
    if (!addReady) return;
    let date: string;
    if (isCurrentMonth) { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); date = iso(d); }
    else date = iso(baseDate);
    store.addIncome?.({ type: 'oneoff', amount: amt, source: finalSrc, date, notes: '' });
    onClose();
  };
  const saveBase = () => {
    store.setOnboardingProfile?.({ ...(op ?? {}), baseSalary: String(bAmt), salaryMode: mode, salaryFreq: freq });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <View style={sh.tabRow}>
              <TouchableOpacity style={[sh.tab, tab === 'add' && sh.tabOn]} onPress={() => setTab('add')}><Text style={[sh.tabTxt, tab === 'add' && sh.tabTxtOn]}>Add income</Text></TouchableOpacity>
              <TouchableOpacity style={[sh.tab, tab === 'base' && sh.tabOn]} onPress={() => setTab('base')}><Text style={[sh.tabTxt, tab === 'base' && sh.tabTxtOn]}>Edit base pay</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { onClose(); router.push('/income-manager'); }}>
              <Text style={sh.manageLink}>See & edit all your income sources ›</Text>
            </TouchableOpacity>

            {tab === 'add' ? (
              <>
                <Text style={sh.bucketHint}>A one-off for {isCurrentMonth ? 'this month' : monthLabel} — gift, stock sale, refund…</Text>
                <View style={sh.amtRow}>
                  <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
                  <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={amount} onChangeText={setAmount} autoFocus />
                </View>
                <View style={sh.chips}>
                  {INCOME_SOURCES.map((sname) => (
                    <TouchableOpacity key={sname} style={[sh.chip, src === sname && sh.chipOn]} onPress={() => setSrc(sname)}>
                      <Text style={sh.chipTxt}>{sname}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {src === 'Other' && (
                  <TextInput style={sh.input} placeholder="Specify source" placeholderTextColor={Colors.textTertiary} value={otherSrc} onChangeText={setOtherSrc} autoFocus />
                )}
                {isCurrentMonth ? (
                  <View style={sh.dayRow}>
                    {(['today', 'yesterday'] as const).map((d) => (
                      <TouchableOpacity key={d} style={[sh.dayChip, day === d && sh.chipOn]} onPress={() => setDay(d)}>
                        <Text style={[sh.chipTxt, { textTransform: 'capitalize' }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : <Text style={sh.dateNote}>Adding to {monthLabel}</Text>}
                <TouchableOpacity style={[sh.save, !addReady && { opacity: 0.4 }]} disabled={!addReady} onPress={saveAdd}>
                  <Text style={sh.saveTxt}>Add {amt > 0 ? money(amt) : 'income'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={sh.bucketHint}>Your recurring base pay. Bonus, equity & rental live in Setup.</Text>
                <View style={sh.toggleRow}>
                  {(['gross', 'takehome'] as const).map((m) => (
                    <TouchableOpacity key={m} style={[sh.seg, mode === m && sh.chipOn]} onPress={() => setMode(m)}>
                      <Text style={sh.chipTxt}>{m === 'gross' ? 'Gross' : 'Take-home'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={sh.amtRow}>
                  <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
                  <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={baseAmt} onChangeText={setBaseAmt} />
                </View>
                <View style={sh.freqRow}>
                  {FREQS.map((f) => (
                    <TouchableOpacity key={f.v} style={[sh.freqChip, freq === f.v && sh.chipOn]} onPress={() => setFreq(f.v)}>
                      <Text style={sh.freqTxt}>{f.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[sh.save, bAmt <= 0 && { opacity: 0.4 }]} disabled={bAmt <= 0} onPress={saveBase}>
                  <Text style={sh.saveTxt}>Save base pay</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── quick-add bottom sheet ────────────────────────────────────────────────────
function QuickAddExpense({ visible, onClose, customCats, isCurrentMonth, baseDate, monthLabel }: {
  visible: boolean; onClose: () => void; customCats: any[]; isCurrentMonth: boolean; baseDate: Date; monthLabel: string;
}) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState('');           // selected category label, or '__other__'
  const [otherName, setOtherName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const chips = [...BUDGET_CATEGORIES.map((c) => ({ label: c.label, icon: c.icon })),
    ...customCats.map((c) => ({ label: c.label, icon: c.icon || '📦' })),
    { label: '__other__', icon: '📦' }];

  const isOther = cat === '__other__';
  const finalCat = isOther ? otherName.trim() : cat;
  const amt = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const ready = amt > 0 && !!finalCat;
  const bucket = finalCat ? BUCKET_META[categoryBucketFor(finalCat, customCats)].title : '';

  const reset = () => { setAmount(''); setCat(''); setOtherName(''); setMerchant(''); setDay('today'); setReceiptUri(null); };
  const save = () => {
    if (!ready) return;
    let date: string;
    if (isCurrentMonth) { const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1); date = iso(d); }
    else date = iso(baseDate);   // logging into a past month → use that month
    store.addExpense?.({ amount: amt, category: finalCat, store: merchant.trim(), date, notes: '', receiptUri: receiptUri ?? undefined });
    reset(); onClose();
  };

  const doScan = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickReceipt(source);
      if (!uri) return;
      setReceiptUri(uri);
      setScanning(true);
      const { amount: a, merchant: m } = await ocrReceipt(uri);
      if (a) setAmount(String(a));
      if (m) setMerchant(m);
      setScanning(false);
      if (!ocrAvailable()) Alert.alert('Receipt attached', 'Enter the amount — automatic scanning turns on after the next app rebuild.');
    } catch {
      setScanning(false);
      Alert.alert('Scanner needs a rebuild', 'Run “npx expo run:ios” once to enable the camera & receipt scanner.');
    }
  };
  const onScan = () => Alert.alert('Scan a receipt', undefined, [
    { text: 'Take photo', onPress: () => doScan('camera') },
    { text: 'Choose from library', onPress: () => doScan('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <ScrollView style={{ maxHeight: '88%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
          <View style={sh.card}>
            <View style={sh.handle} />
            <Text style={sh.title}>Add expense</Text>

            <TouchableOpacity style={sh.scanBtn} onPress={onScan} disabled={scanning}>
              <Text style={sh.scanTxt}>{scanning ? 'Scanning…' : receiptUri ? '📎 Receipt attached · rescan' : '📷 Scan a receipt'}</Text>
            </TouchableOpacity>

            <View style={sh.amtRow}>
              <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
              <TextInput style={sh.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
                value={amount} onChangeText={setAmount} autoFocus />
            </View>
            <Text style={sh.bucketHint}>{finalCat ? `${finalCat} → ${bucket} budget` : 'Pick a category'}</Text>

            <View style={sh.chips}>
              {chips.map((c) => {
                const on = cat === c.label;
                return (
                  <TouchableOpacity key={c.label} style={[sh.chip, on && sh.chipOn]} onPress={() => setCat(c.label)}>
                    <Text style={sh.chipTxt}>{c.icon} {c.label === '__other__' ? 'Other' : c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isOther && (
              <TextInput style={sh.input} placeholder="Specify category (e.g. Pet care)" placeholderTextColor={Colors.textTertiary}
                value={otherName} onChangeText={setOtherName} autoFocus />
            )}

            <TextInput style={sh.input} placeholder="Where? (optional)" placeholderTextColor={Colors.textTertiary}
              value={merchant} onChangeText={setMerchant} />

            {/* date */}
            {isCurrentMonth ? (
              <View style={sh.dayRow}>
                {(['today', 'yesterday'] as const).map((d) => (
                  <TouchableOpacity key={d} style={[sh.dayChip, day === d && sh.chipOn]} onPress={() => setDay(d)}>
                    <Text style={[sh.chipTxt, { textTransform: 'capitalize' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={sh.dateNote}>Adding to {monthLabel}</Text>
            )}

            <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}>
              <Text style={sh.saveTxt}>Add {amt > 0 ? money(amt) : 'expense'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const hit = { top: 10, bottom: 10, left: 10, right: 10 };
function greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }
function shortDate(d: string) { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function ordinal(n: number) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },

  // ── Home redesign (glance) ──
  glance: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  glanceVerdict: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  glanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  glanceDot: { fontSize: 13, width: 20, textAlign: 'center' },
  glanceDotGood: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  glanceTxt: { flex: 1, fontSize: 13.5, color: Colors.textSecondary, fontWeight: '600' },
  glanceArrow: { fontSize: 18, color: Colors.textTertiary, fontWeight: '400' },
  box: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  boxLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 8 },
  cfRow: { flexDirection: 'row', alignItems: 'center' },
  cfCell: { flex: 1, alignItems: 'center' },
  cfV: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cfL: { fontSize: 11, color: Colors.textTertiary },
  cfLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  cfAdd: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  cfAddTxt: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 12 },
  cfOp: { fontSize: 16, fontWeight: '700', color: Colors.textTertiary, paddingHorizontal: 2 },
  cfFoot: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 6 },
  cfSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, lineHeight: 16 },
  seeAll: { fontSize: 12.5, color: Colors.primary, fontWeight: '700', marginTop: 10 },
  cfLinks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nwHeadRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  nwBig: { fontSize: 23, fontWeight: '800', color: Colors.textPrimary, flexShrink: 1 },
  nwDelta: { fontSize: 12.5, fontWeight: '700' },
  nwInsight: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, lineHeight: 16 },
  // net-worth trend chart — every bar carries its value label (above) + month (below)
  nwChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, gap: 3 },
  nwCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  nwBarVal: { fontSize: 10.5, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  nwBar: { width: '58%', maxWidth: 30, minHeight: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: Colors.primary },
  nwBarLbl: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  attnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  attnIcon: { fontSize: 16 },
  attnTxt: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  taxChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 13, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.primary },
  taxChipTxt: { flex: 1, fontSize: 14, fontWeight: '800', color: Colors.primaryDark },
  coin: { fontSize: 44, textAlign: 'center', marginBottom: 10 },
  coinBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7CE5B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D99A26' },
  h1: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.sm },
  monthArrow: { fontSize: 26, fontWeight: '800', color: Colors.primary, paddingHorizontal: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 130, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  streakChip: { backgroundColor: Colors.amberLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  streakTxt: { fontSize: 11, fontWeight: '700', color: Colors.amber },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hero: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, padding: Spacing.lg },
  heroLabel: { color: '#BEE7D8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 12 },
  fill: { height: 10, borderRadius: 5 },
  heroFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroFoot: { color: '#BEE7D8', fontSize: 13, fontWeight: '600' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  heroOf: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14, marginBottom: 12 },
  row2: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  miniTile: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  miniLabel: { fontSize: 12, color: Colors.textSecondary },
  tileHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plusBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  plusTxt: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  miniValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  fx: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  lastRow: { flexDirection: 'row' },
  lastStat: { flex: 1, alignItems: 'center' },
  lastLabel: { fontSize: 12, color: Colors.textSecondary },
  lastVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.sm },
  section2: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  secHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  secAdd: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 },
  bucketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bucketTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  bucketAmt: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  bucketPlanned: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary },
  trackSm: { height: 7, borderRadius: 4, backgroundColor: Colors.bgTertiary, overflow: 'hidden', marginTop: 6 },
  fillSm: { height: 7, borderRadius: 4 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 2 },
  txnIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  txnTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  txnSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1, fontWeight: '500' },
  txnAmt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  payBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  payTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  paidTick: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  debtDue: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 1 },
  debtAmt: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  removeBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  removeTxt: { fontSize: 18, fontWeight: '800', color: Colors.textSecondary, marginTop: -2 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  insightWarn: { backgroundColor: '#FBE9E7' },
  insightTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  insightSub: { fontSize: 12, color: Colors.primaryDark, opacity: 0.85, marginTop: 2 },
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 6 },
  moreLink: { fontSize: 13, color: Colors.primary, fontWeight: '600', textAlign: 'center', marginTop: Spacing.md },
  fabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.md, paddingBottom: 28, backgroundColor: Colors.bgSecondary },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  focusCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 4, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  focusTitle: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.sm, marginBottom: 2 },
  focusBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingVertical: 11 } as any,
  focusDiv: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  focusIcon: { fontSize: 18 },
  focusLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  focusArrow: { fontSize: 20, color: Colors.textTertiary, fontWeight: '400' },
  sharpenCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  sharpenTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  sharpenSub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 2 },
  sharpenBar: { height: 6, borderRadius: 3, backgroundColor: Colors.bgTertiary, marginTop: 8, overflow: 'hidden' },
  sharpenFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  nwotCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  nwotHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nwotTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  nwotChange: { fontSize: 12.5, fontWeight: '800' },
  nwotBars: { flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 3 },
  nwotBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  nwotBar: { width: '70%', maxWidth: 26, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 4 },
  nwotBarLbl: { fontSize: 8, color: Colors.textTertiary, marginTop: 3 },
  insightsBlock: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  insightsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  insightsTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  insightsAll: { fontSize: 12.5, fontWeight: '700', color: Colors.primary },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  insightIcon: { fontSize: 18 },
  insightTitle: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  insightBody: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 1, lineHeight: 15 },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radii.sm, alignItems: 'center' },
  tabOn: { backgroundColor: Colors.cardBg },
  tabTxt: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTxtOn: { color: Colors.primary, fontWeight: '700' },
  scanBtn: { marginTop: Spacing.md, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  scanTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPrefix: { fontSize: 30, fontWeight: '800', color: Colors.textSecondary },
  amtInput: { fontSize: 44, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  bucketHint: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: Spacing.sm },
  manageLink: { fontSize: 12.5, fontWeight: '700', color: Colors.primary, textAlign: 'center', marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md, justifyContent: 'center' },
  seg: { flex: 1, paddingVertical: 9, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md, justifyContent: 'center' },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  freqTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dateNote: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  remove: { color: Colors.textSecondary, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
  allocHead: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 2, marginBottom: Spacing.sm },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  allocIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  allocName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  allocSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  allocInput: { width: 72, backgroundColor: Colors.cardBg, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 8, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right' },
  unitToggle: { width: 34, height: 34, borderRadius: Radii.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  unitToggleTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
