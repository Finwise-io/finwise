// Insights — the centralized engine's ranked results, GROUPED BY THEME, each with a provenance drill-down
// (which accounts + the math) so a number is never a mystery. useInsights() computes the inputs AND the
// per-insight detail breakdowns from the store + domain.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { ageFromProfile } from '../utils/persona';
import { investableAssets, cashTotal, assetClassOf, blendedReturn, portfolioActualReturn, monthlyContributionsFromOnboarding } from '../domain/assets';
import { totalGrossAnnual, salaryAnnual } from '../domain/income';
import { k401Headroom, IRS_LIMITS } from '../domain/income/limits';
import { TOXIC_APR } from '../domain/debt';
import { plannedMonthlySpend } from '../domain/budget';
import { buildInsights, type Insight, type InsightTheme } from '../domain/insights';
import { maskDollars } from '../components/useMoney';
import { buildPerformance, topHoldingConcentration } from '../domain/performance';
import { taxBucketSplit, rmdAtAge, RMD_START_AGE } from '../domain/decumulation';
import { requiredMonthly } from '../domain/goals';
import { monthlySavings } from '../domain/savings';
import { usePlanCompleteness } from './SharpenPlanScreen';
import { money } from '../domain/_shared/num';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const pct = (d: number) => `${(d * 100).toFixed(1)}%`;
type Detail = { label: string; value: string };

const THEME_META: Record<InsightTheme, { label: string; icon: string }> = {
  protect: { label: 'Protect', icon: '🛡️' },
  grow: { label: 'Grow', icon: '📈' },
  optimize: { label: 'Optimize', icon: '⚙️' },
};

export function useInsights(limit?: number): Insight[] {
  const store = useStore() as any;
  const plan = usePlanCompleteness();
  return useMemo(() => {
    const op = store.onboardingProfile ?? {};
    const accounts = store.assetAccounts ?? [];
    const liabilities = store.liabilities ?? [];
    const age = ageFromProfile(op) ?? 45;
    const monthlySpending = plannedMonthlySpend(op);
    const cash = cashTotal(accounts);
    const investable = investableAssets(accounts);
    const investAccts = accounts.filter((a: any) => a.tax_bucket !== 'PROPERTY' && a.tax_bucket !== 'CASH');
    const topAccount = investAccts.length ? Math.max(...investAccts.map((a: any) => a.balance || 0)) : 0;
    // holding-level concentration: the SAME shared rule Invest main shows (one concept, one helper)
    const allPositions = accounts.flatMap((a: any) => a.positions ?? []);
    const priceOf = (t: string) => (store.priceCache ?? {})[t.trim().toUpperCase()];
    const topHolding = topHoldingConcentration(buildPerformance(allPositions, priceOf, '1Y'));
    const toxic = liabilities.reduce((m: any, d: any) => (d.interest_rate_apr > (m?.interest_rate_apr ?? 0) ? d : m), null);
    const actual = portfolioActualReturn(accounts);
    const bench = blendedReturn(accounts);
    const gross = totalGrossAnnual(op);
    const nm = (a: any) => a.institution?.trim() || a.label;
    const shareOf = (v: number) => (investable > 0 ? `${money(v)} · ${Math.round((v / investable) * 100)}%` : money(v));

    // ── FCC inputs ──
    // F10: the newest open worth-a-look flag leads; a user-flagged one keeps a quiet follow-up.
    const flags = (store.txnFlags ?? []) as any[];
    const openFlags = flags.filter((f) => f.status === 'open');
    const followUps = flags.filter((f) => f.status === 'flagged');
    const lead = openFlags[0] ?? followUps[0] ?? null;
    const accountName = (id: string) => nm(accounts.find((a: any) => String(a.asset_id) === String(id)) ?? { label: 'an account' });
    const worthALook = lead ? {
      amount: lead.amount, account: accountName(lead.account_id),
      more: openFlags.length > 1 ? openFlags.length - 1 : 0,
      followUp: lead.status === 'flagged',
    } : null;
    // Required withdrawal (age 73+, pre-tax balance) — same figure Plan shows (rmdAtAge).
    const preTax = taxBucketSplit(accounts).preTax;
    const rmdDue = age >= RMD_START_AGE && preTax > 0 ? { amount: rmdAtAge(preTax, age) } : null;
    // Social Security claim window: open from 62 to 70, no adopted timing, no SS income captured.
    const A = store.retirementAssumptions ?? {};
    const ssWindow = age >= 62 && age < 70 && A.ssClaimAge == null && num(op.ri_ss) === 0;
    // Goals vs surplus: what every active goal needs per month, minus what the plan frees up.
    const activeGoals = ((store.goals ?? []) as any[]).filter((g) => (g.saved || 0) < (g.target || 0));
    const needed = activeGoals.reduce((t, g) => t + (requiredMonthly(g) ?? 0), 0);
    const freed = Math.max(0, monthlySavings(op, liabilities));
    const goalsGap = activeGoals.length > 0 && needed > 0 ? Math.round(needed - freed) : null;

    // PRD F10#16: a dismissed/snoozed nudge stays hidden until its date, across restarts.
    // worth-a-look is exempt — it has its own explicit resolution flow (never swipe-dismissed).
    const hiddenUntil = (store.dismissedInsights ?? {}) as Record<string, string>;
    const nowIso = new Date().toISOString();
    const notDismissed = (i: { id: string }) => i.id === 'worth-a-look' || !hiddenUntil[i.id] || hiddenUntil[i.id] <= nowIso;
    const built = buildInsights({
      worthALook,
      rmdDue,
      ssWindow,
      goalsGap,
      cashMonths: monthlySpending > 0 ? cash / monthlySpending : null,
      toxicDebt: toxic && toxic.interest_rate_apr > TOXIC_APR ? { label: toxic.label, apr: toxic.interest_rate_apr } : null,
      k401Remaining: k401Headroom(age, num(op.c_401k) * 12).remaining,
      hasEarnedIncome: salaryAnnual(op) > 0,
      retireChance: typeof store.lastRetireChance === 'number' ? store.lastRetireChance : null,   // cached by the Retire cockpit; null until viewed
      cashDragPct: investable > 0 ? (cash / investable) * 100 : 0,
      topAccountPct: investable > 0 ? (topAccount / investable) * 100 : 0,
      topHolding,
      planPct: plan.pct,
      planNext: plan.checks.find((c: any) => !c.done)?.label ?? null,
      beatBy: actual != null ? actual - bench : null,
      investRate: gross > 0 ? (monthlyContributionsFromOnboarding(op) * 12) / gross : null,
    });   // unlimited — the dismissal filter slices to `limit` after

    // provenance: which accounts + the math behind each number (so the user can trace it).
    const detailsById: Record<string, () => Detail[]> = {
      concentration: () => investAccts.slice().sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0)).slice(0, 5)
        .map((a: any) => ({ label: nm(a), value: shareOf(a.balance || 0) }))
        .concat([{ label: 'Total invested', value: money(investable) }]),
      'cash-drag': () => accounts.filter((a: any) => assetClassOf(a) === 'cash').map((a: any) => ({ label: nm(a), value: money(a.balance || 0) }))
        .concat([{ label: 'Cash total', value: money(cash) }, { label: 'Investable total', value: money(investable) },
                 { label: 'Cash share', value: investable > 0 ? `${Math.round((cash / investable) * 100)}%` : '—' }]),
      runway: () => [{ label: 'Cash on hand', value: money(cash) }, { label: 'Monthly spending', value: money(monthlySpending) },
                     { label: 'Months covered', value: monthlySpending > 0 ? (cash / monthlySpending).toFixed(1) : '—' }],
      'k401-room': () => { const h = k401Headroom(age, num(op.c_401k) * 12); return [
        { label: `${IRS_LIMITS.year} 401(k) limit`, value: money(h.limit) }, { label: "You've contributed", value: money(h.used) }, { label: 'Room left', value: money(h.remaining) }]; },
      'behind-bench': () => [{ label: 'Your 12-mo return', value: actual != null ? pct(actual) : '—' }, { label: 'Benchmark', value: pct(bench) },
                             { label: 'Gap', value: actual != null ? pct(actual - bench) : '—' }],
      'invest-rate': () => [{ label: 'Annual contributions', value: money(monthlyContributionsFromOnboarding(op) * 12) }, { label: 'Gross income', value: money(gross) },
                            { label: 'Investing rate', value: gross > 0 ? pct((monthlyContributionsFromOnboarding(op) * 12) / gross) : '—' }],
      'toxic-debt': () => toxic ? [{ label: toxic.label, value: `${pct(toxic.interest_rate_apr)} APR` }, { label: 'Balance', value: money(toxic.remaining_balance || 0) }] : [],
      'retire-offtrack': () => [{ label: 'Chance your plan lasts', value: typeof store.lastRetireChance === 'number' ? `${store.lastRetireChance}%` : '—' }, { label: 'Healthy target', value: '60%+' }],
      'rmd-due': () => [{ label: 'Pre-tax balance', value: money(preTax) }, { label: 'Your age', value: String(age) }, { label: 'Required this year', value: money(rmdDue?.amount ?? 0) }],
      'goals-gap': () => activeGoals.map((g) => ({ label: g.label, value: `${money(requiredMonthly(g) ?? 0)}/mo needed` }))
        .concat([{ label: 'Planned surplus', value: `${money(freed)}/mo` }]),
    };
    return built.filter(notDismissed).slice(0, limit ?? built.length).map((i) => ({ ...i, details: detailsById[i.id]?.() }));
  }, [store.onboardingProfile, store.assetAccounts, store.liabilities, store.lastRetireChance, store.txnFlags, store.goals, store.retirementAssumptions, plan.pct, limit]);
}

export default function InsightsScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const insights = useInsights();
  const [open, setOpen] = useState<Insight | null>(null);
  const order: InsightTheme[] = ['protect', 'grow', 'optimize'];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Insights</Text>
      <Text style={styles.sub}>Personalized and ranked. Tap any card to see exactly where the number comes from.</Text>
      {insights.length === 0 ? (
        <View style={styles.card}><Text style={styles.empty}>🎉 Nothing urgent — your plan looks healthy. Keep it up.</Text></View>
      ) : order.filter((t) => insights.some((i) => i.theme === t)).map((t) => (
        <View key={t}>
          <Text style={styles.groupHdr}>{THEME_META[t].icon}  {THEME_META[t].label.toUpperCase()}</Text>
          {insights.filter((i) => i.theme === t).map((i) => (
            <TouchableOpacity key={i.id} accessibilityRole="button" accessibilityLabel={maskDollars(i.title)} accessibilityHint="Shows where this number comes from" style={[styles.card, styles.row]} onPress={() => setOpen(i)}>
              <Text style={styles.icon}>{i.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{maskDollars(i.title)}</Text>
                <Text style={styles.body}>{maskDollars(i.body)}</Text>
              </View>
              {/* PRD F10#16: dismiss/snooze BY BUTTON (never gesture-only); worth-a-look keeps
                  its own explicit resolution flow instead */}
              {i.id !== 'worth-a-look' && (
                <TouchableOpacity accessibilityRole="button" style={styles.hideBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Hide the ${maskDollars(i.title)} card for a while`}
                  onPress={() => {
                    const until = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
                    Alert.alert('Hide this card?', 'It comes back on its own — or sooner if the numbers change a lot.', [
                      { text: 'Hide for a week', onPress: () => store.dismissInsight?.(i.id, until(7)) },
                      { text: 'Hide for a month', onPress: () => store.dismissInsight?.(i.id, until(30)) },
                      { text: 'Keep showing', style: 'cancel' },
                    ]);
                  }}>
                  <Text style={styles.hideTxt}>✕</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={{ height: 40 }} />

      {/* provenance drill-down */}
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close details" style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(null)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.grip} />
            {open && (<>
              <Text style={styles.sheetTitle}>{open.icon}  {open.title}</Text>
              <Text style={styles.sheetBody}>{open.body}</Text>
              {open.details && open.details.length > 0 && (
                <View style={styles.detailBox}>
                  <Text style={styles.detailHdr}>Where this comes from</Text>
                  {open.details.map((d, k) => (
                    <View key={k} style={styles.detailRow}>
                      <Text style={styles.detailLabel} numberOfLines={1}>{d.label}</Text>
                      <Text style={styles.detailVal}>{maskDollars(d.value)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {open.route && (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Take me there" style={styles.cta} onPress={() => { const r = open.route!; setOpen(null); router.push(r as any); }}>
                  <Text style={styles.ctaTxt}>Take me there →</Text>
                </TouchableOpacity>
              )}
            </>)}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  groupHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginTop: Spacing.lg, marginBottom: 2 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 2, lineHeight: 19 },
  hideBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hideTxt: { fontSize: 14, color: Colors.textTertiary, fontWeight: '700' },
  arrow: { fontSize: 22, color: Colors.textTertiary },
  empty: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  sheetBody: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 6, lineHeight: 19 },
  detailBox: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  detailHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 12 },
  detailLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  detailVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: Spacing.md },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
