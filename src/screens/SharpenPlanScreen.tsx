// "Sharpen your plan" — the fast doors in (connect / import / add by hand — the SAME three doors
// Home offers, same honest wording) + a checklist of what's still missing, each routing to its
// edit surface. Redesigned 2026-07-16 (founder UX review: the old screen predated the doors).
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { totalGrossAnnual, retirementIncomeMonthly } from '../domain/income';
import { planCompleteness } from '../domain/completeness';
import { plannedMonthlySpend } from '../domain/budget';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export function usePlanCompleteness() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const A = store.retirementAssumptions ?? {};
  return useMemo(() => planCompleteness({
    incomeAnnual: totalGrossAnnual(op),
    accountCount: accounts.length,
    hasInvestments: accounts.some((a: any) => a.tax_bucket !== 'CASH' && a.tax_bucket !== 'PROPERTY'),
    goalCount: (store.goals ?? []).length,
    // "retirement set" is done for an already-retired user, or anyone with guaranteed retirement
    // income captured at onboarding (SS / pension / annuities) — not only when the SS editor was opened.
    ssAnswered: A.ssEligible != null || store.employmentStatus === 'retired' || retirementIncomeMonthly(op) > 0,
    // P0 dedup: use the canonical planned spend (MAX of stated estimate + categories), not the raw field.
    monthlySpending: plannedMonthlySpend(op) || num(store.monthlyBudgetTarget),
    hasDebtsOrSkipped: (store.liabilities ?? []).length > 0,
  }), [op, accounts, A, store.goals, store.monthlyBudgetTarget, store.liabilities, store.employmentStatus]);
}

// The same three doors Home offers — one wording, everywhere (one concept → one phrase).
const DOORS = [
  { icon: '🔗', title: 'Connect your bank ›', sub: 'Read-only: we can look, never touch your money.', route: '/connect' },
  { icon: '📄', title: 'Import a file from your brokerage ›', sub: 'The CSV export — we read your holdings, nothing is uploaded.', route: '/import-holdings' },
  { icon: '✍️', title: 'Add something by hand ›', sub: 'Your home, savings, or an account with no login.', route: '/add-account' },
];

export default function SharpenPlanScreen() {
  const router = useRouter();
  const { checks, doneCount, total, pct } = usePlanCompleteness();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.backBtn}>
        <Text style={styles.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>Sharpen your plan</Text>
      <Text style={styles.sub}>The more we know, the sharper your numbers. Finish what you skipped.</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scorePct}>{pct}%</Text>
        <Text style={styles.scoreLab}>{doneCount} of {total} complete</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
      </View>

      {/* the fast doors — bring accounts in without typing everything */}
      <Text style={styles.kicker}>THE FAST WAYS IN</Text>
      {DOORS.map((d) => (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${d.title} ${d.sub}`}
          key={d.route} style={styles.door} onPress={() => router.push(d.route as any)}>
          <Text style={styles.doorIcon}>{d.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.doorTitle}>{d.title}</Text>
            <Text style={styles.doorSub}>{d.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.kicker}>FINISH WHAT YOU SKIPPED</Text>
      {checks.map((c) => (
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: c.done }}
          accessibilityLabel={`${c.label}${c.done ? ', done' : `, not done. ${c.detail}`}`}
          key={c.key} style={styles.row} disabled={c.done} onPress={() => router.push(c.route as any)}>
          <View style={[styles.check, c.done && styles.checkOn]}><Text style={styles.checkMark}>{c.done ? '✓' : ''}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, c.done && styles.rowLabelDone]}>{c.label}</Text>
            <Text style={styles.rowDetail}>{c.detail}</Text>
          </View>
          {!c.done && <Text style={styles.add}>Add ›</Text>}
        </TouchableOpacity>
      ))}

      {pct === 100 && <Text style={styles.allDone}>🎉 Your plan is complete — everything's wired up.</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  backBtn: { alignSelf: 'flex-start', marginTop: 4, minHeight: 44, justifyContent: 'center' },
  back: { color: Colors.primary, fontSize: 17, fontWeight: '700' },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginTop: 18, marginBottom: 2 },
  scoreCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 14, alignItems: 'center' },
  scorePct: { fontSize: 38, fontWeight: '800', color: Colors.primary },
  scoreLab: { fontSize: 15, color: Colors.textSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
  bar: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, alignSelf: 'stretch', marginTop: 12, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  door: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  doorIcon: { fontSize: 24 },
  doorTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  doorSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 8 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowLabelDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  rowDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  add: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  allDone: { fontSize: 15, color: Colors.primaryDark, fontWeight: '700', textAlign: 'center', marginTop: 16 },
});
