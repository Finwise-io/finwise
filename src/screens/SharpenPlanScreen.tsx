// "Sharpen your plan" — a checklist of what's still missing, each routing to its edit surface.
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

export default function SharpenPlanScreen() {
  const router = useRouter();
  const { checks, doneCount, total, pct } = usePlanCompleteness();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Sharpen your plan</Text>
      <Text style={styles.sub}>The more we know, the sharper your numbers. Finish what you skipped.</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scorePct}>{pct}%</Text>
        <Text style={styles.scoreLab}>{doneCount} of {total} complete</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
      </View>

      {checks.map((c) => (
        <TouchableOpacity key={c.key} style={styles.row} disabled={c.done} onPress={() => router.push(c.route as any)}>
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
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  scoreCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 14, alignItems: 'center' },
  scorePct: { fontSize: 40, fontWeight: '800', color: Colors.primary },
  scoreLab: { fontSize: 12.5, color: Colors.textTertiary, marginTop: 2 },
  bar: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, alignSelf: 'stretch', marginTop: 12, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowLabelDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  rowDetail: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 2, lineHeight: 15 },
  add: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  allDone: { fontSize: 14, color: Colors.primaryDark, fontWeight: '700', textAlign: 'center', marginTop: 16 },
});
