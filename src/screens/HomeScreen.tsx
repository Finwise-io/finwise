// Home = live spending cockpit. Track income & expenses against budget, per month.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { currencySymbol } from '../domain/_shared/money';
import { buildSnapshot } from '../domain/snapshot';
import { budgetVsActual } from '../domain/budget';
import { incomeMonthlyGrid } from '../domain/income';
import { BUDGET_CATEGORIES, categoryBucketFor, budgetCategoryIcon } from '../constants/categories';
import { assetKind, buildAssetsState } from '../domain/assets';
import { totalDebtMonthly, requiredPayment, buildDebtState } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { pickReceipt, ocrReceipt, ocrAvailable } from '../services/receiptScan';

const BUCKET_META: Record<string, { title: string; color: string }> = {
  fixed: { title: 'Fixed', color: Colors.blue },
  nonmonthly: { title: 'Non-monthly', color: Colors.amber },
  flexible: { title: 'Flexible', color: '#7A5AA7' },
};
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function HomeScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const name = (store.user?.name || op?.name || 'there').split(' ')[0];
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
    () => (op ? buildSnapshot(uid, op, { inflationRate: store.inflationRate ?? 2.4, treasuryYield: store.treasuryYield ?? 4.3 }) : null),
    [op, uid, store.inflationRate, store.treasuryYield],
  );
  const liabilities = (store.liabilities ?? []) as any[];
  const debtMonthly = totalDebtMonthly(liabilities);
  const bva = useMemo(() => budgetVsActual(expenses, op, selDate), [expenses, op, monthOffset]);
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
    return (
      <View style={[styles.root, { justifyContent: 'center', padding: Spacing.lg }]}>
        <Text style={styles.coin}>🪙</Text>
        <Text style={[styles.h1, { textAlign: 'center' }]}>Let's build your plan</Text>
        <Text style={[styles.sub, { textAlign: 'center', marginTop: 6 }]}>Finish a quick setup and your dashboard fills in.</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.replace('/onboarding')}>
          <Text style={styles.ctaText}>Start setup →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const planned = bva.planned_total;
  const spent = bva.spent_total;
  const debtPaid = expenses.filter((e: any) => e.category === 'Debt payment' && String(e.date).startsWith(ym)).reduce((t: number, e: any) => t + (Number(e.amount) || 0), 0);
  const debtLeft = Math.max(0, debtMonthly - debtPaid);
  const debtPct = debtMonthly > 0 ? Math.min(1, debtPaid / debtMonthly) : 0;
  const leftOver = thisMonthNet - spent - debtPaid;   // take-home minus all outflows (expenses + debt)
  const allocatedThis = store.allocatedByMonth?.[ym] ?? 0;
  const allocatable = Math.max(0, leftOver - allocatedThis);
  const investedAccts = (store.assetAccounts ?? []).filter((a: any) => a.change_month === ym && (a.change_amount || 0) > 0);
  const investedTotal = investedAccts.reduce((t: number, a: any) => t + (a.change_amount || 0), 0);
  const pct = planned > 0 ? Math.min(1, spent / planned) : 0;
  const over = bva.remaining < 0;
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* month switcher */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setMonthOffset((m) => m - 1)} hitSlop={hit}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity disabled={isCurrentMonth} onPress={() => setMonthOffset((m) => Math.min(0, m + 1))} hitSlop={hit}>
            <Text style={[styles.monthArrow, isCurrentMonth && { opacity: 0.25 }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* HERO — Expense Budget + Debt to be Paid, each tracked */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>EXPENSE BUDGET · {monthShort.toUpperCase()}</Text>
            <Text style={styles.heroOf}>{money(spent)} of {money(planned)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: over ? '#FF8A8A' : '#7FE3C2' }]} />
          </View>
          <Text style={[styles.heroFoot, { color: over ? '#FFC9C9' : '#DDF3EB', marginTop: 6 }]}>
            {planned <= 0 ? 'No budget set' : over ? `${money(-bva.remaining)} over budget` : `${money(bva.remaining)} left to spend`}
          </Text>

          {debtMonthly > 0 && (
            <>
              <View style={styles.heroDivider} />
              <View style={styles.heroTopRow}>
                <Text style={styles.heroLabel}>DEBT TO BE PAID</Text>
                <Text style={styles.heroOf}>{money(debtPaid)} of {money(debtMonthly)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(2, debtPct * 100)}%`, backgroundColor: '#7FE3C2' }]} />
              </View>
              <Text style={[styles.heroFoot, { color: '#DDF3EB', marginTop: 6 }]}>
                {debtLeft > 0 ? `${money(debtLeft)} still due this month` : 'All debt payments made ✓'}
              </Text>
            </>
          )}
        </View>

        {insight && (
          <View style={[styles.insightCard, insight.warn && styles.insightWarn]}>
            <Text style={styles.insightIcon}>{insight.warn ? '⚠️' : '✨'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTxt, insight.warn && { color: Colors.red }]}>{insight.txt}</Text>
              <Text style={[styles.insightSub, insight.warn && { color: Colors.red }]}>{insight.sub}</Text>
            </View>
          </View>
        )}

        {/* income (this month) + saved so far */}
        <View style={styles.row2}>
          <TouchableOpacity style={styles.miniTile} activeOpacity={0.85} onPress={() => setIncomeSheet(true)}>
            <View style={styles.tileHeadRow}>
              <Text style={styles.miniLabel}>Take-home ({monthShort})</Text>
              <View style={styles.plusBadge}><Text style={styles.plusTxt}>＋</Text></View>
            </View>
            <Text style={styles.miniValue}>{money(thisMonthNet)}</Text>
            <Text style={styles.fx}>{extraIncome > 0 ? `incl. +${money(extraIncome)} extra` : 'this month'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniTile} activeOpacity={0.85} onPress={() => setAllocSheet({ open: true, ym, label: monthShort, available: allocatable })}>
            <View style={styles.tileHeadRow}>
              <Text style={styles.miniLabel}>Left over ({monthShort})</Text>
              <View style={styles.plusBadge}><Text style={styles.plusTxt}>＋</Text></View>
            </View>
            <Text style={[styles.miniValue, { color: leftOver >= 0 ? Colors.primary : Colors.red }]}>{money(leftOver)}</Text>
            <Text style={styles.fx}>{allocatedThis > 0 ? `${money(allocatedThis)} invested` : 'take-home − spending & debt'}</Text>
          </TouchableOpacity>
        </View>

        {/* where this month's savings went */}
        {(investedAccts.length > 0 || allocatable > 0) && (
          <>
            <View style={styles.secHeadRow}>
              <Text style={styles.section2}>Saved in {monthShort}</Text>
              <TouchableOpacity onPress={() => setAllocSheet({ open: true, ym, label: monthShort, available: allocatable })}>
                <Text style={styles.secAdd}>{allocatable > 0 ? `+ Assign ${money(allocatable)}` : '+ Add'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {investedAccts.length === 0
                ? <Text style={styles.empty}>{money(allocatable)} left to invest — tap “Assign” to put it to work.</Text>
                : (<>
                  {investedAccts.map((a: any, i: number) => (
                    <View key={a.asset_id} style={[styles.txnRow, i > 0 && styles.divider]}>
                      <Text style={styles.txnIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txnTitle}>{a.label}</Text>
                        <Text style={styles.txnSub}>{assetKind(a.kind)?.label ?? ''}{a.institution ? ` · ${a.institution}` : ''}</Text>
                      </View>
                      <Text style={[styles.txnAmt, { color: Colors.primary }]}>+{money(a.change_amount)}</Text>
                    </View>
                  ))}
                  <View style={[styles.txnRow, styles.divider]}>
                    <Text style={[styles.txnTitle, { flex: 1 }]}>Total invested</Text>
                    <Text style={[styles.txnAmt, { color: Colors.primary }]}>{money(investedTotal)}</Text>
                  </View>
                </>)}
            </View>
          </>
        )}

        {/* prior-month recap (appears once last month has activity) */}
        {prior && (
          <>
            <Text style={styles.section}>Last month ({prior.label})</Text>
            <View style={[styles.card, styles.lastRow]}>
              <View style={styles.lastStat}><Text style={styles.lastLabel}>Income</Text><Text style={styles.lastVal}>{money(prior.income)}</Text></View>
              <View style={styles.lastStat}><Text style={styles.lastLabel}>Spent</Text><Text style={styles.lastVal}>{money(prior.spent)}</Text></View>
              <View style={styles.lastStat}><Text style={styles.lastLabel}>Saved</Text><Text style={[styles.lastVal, { color: prior.saved >= 0 ? Colors.primary : Colors.red }]}>{money(prior.saved)}</Text></View>
            </View>
          </>
        )}

        {/* per-bucket progress */}
        <Text style={styles.section}>By bucket</Text>
        <View style={styles.card}>
          {bva.buckets.map((b, i) => {
            const meta = BUCKET_META[b.key];
            const bp = b.planned > 0 ? Math.min(1, b.spent / b.planned) : 0;
            const bover = b.spent > b.planned && b.planned > 0;
            return (
              <View key={b.key} style={[i > 0 && styles.divider]}>
                <View style={styles.bucketTop}>
                  <View style={styles.dotRow}><View style={[styles.dot, { backgroundColor: meta.color }]} /><Text style={styles.bucketTitle}>{meta.title}</Text></View>
                  <Text style={styles.bucketAmt}>{money(b.spent)} <Text style={styles.bucketPlanned}>/ {money(b.planned)}</Text></Text>
                </View>
                <View style={styles.trackSm}>
                  <View style={[styles.fillSm, { width: `${Math.max(2, bp * 100)}%`, backgroundColor: bover ? Colors.red : meta.color }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* debt payments due this month */}
        {liabilities.length > 0 && (
          <>
            <Text style={styles.section}>Debt payments</Text>
            <View style={styles.card}>
              {liabilities.map((d, i) => {
                const req = requiredPayment(d);
                const paid = paidThisMonth(d, ym);
                const dueSoon = isCurrentMonth && d.due_day && now.getDate() >= d.due_day - 1 && !paid;
                return (
                  <View key={d.debt_id} style={[styles.debtRow, i > 0 && styles.divider]}>
                    <Text style={styles.txnIcon}>💳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnTitle}>{d.label}</Text>
                      <Text style={[styles.debtDue, dueSoon && { color: Colors.red, fontWeight: '800' }]}>
                        {d.due_day ? `Due ${ordinal(d.due_day)}` : 'No due date'}{paid ? ' · paid' : dueSoon ? ' · due now' : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.debtAmt}>{money(req)}</Text>
                      {paid
                        ? <Text style={styles.paidTick}>✓ paid</Text>
                        : <TouchableOpacity style={styles.payBtn} onPress={() => setPaySheet({ open: true, debt: d })}><Text style={styles.payTxt}>Pay</Text></TouchableOpacity>}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* recent transactions */}
        <Text style={styles.section}>Recent activity</Text>
        <View style={styles.card}>
          {feed.length === 0
            ? <Text style={styles.empty}>Nothing yet — tap + to add an expense.</Text>
            : feed.map((it, i) => (
              <View key={it.id ?? i} style={[styles.txnRow, i > 0 && styles.divider]}>
                <Text style={styles.txnIcon}>{it.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{it.label}</Text>
                  <Text style={styles.txnSub}>{it.sub}</Text>
                </View>
                <Text style={[styles.txnAmt, it.kind === 'inc' && { color: Colors.primary }]}>{it.kind === 'inc' ? '+' : '-'}{money(it.amount)}</Text>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(it)} hitSlop={hit}>
                  <Text style={styles.removeTxt}>−</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        <TouchableOpacity onPress={() => router.push('/(tabs)/retirement')}>
          <Text style={styles.moreLink}>Net worth {money(snap.networth.net_worth)} · see all plans →</Text>
        </TouchableOpacity>
        <View style={{ height: 96 }} />
      </ScrollView>

      <View style={styles.fabBar}>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={() => setSheet(true)}>
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
  insightIcon: { fontSize: 15, lineHeight: 20 },
  insightTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  insightSub: { fontSize: 12, color: Colors.primaryDark, opacity: 0.85, marginTop: 2 },
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 6 },
  moreLink: { fontSize: 13, color: Colors.primary, fontWeight: '600', textAlign: 'center', marginTop: Spacing.md },
  fabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.md, paddingBottom: 28, backgroundColor: Colors.bgSecondary },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
