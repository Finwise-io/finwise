// Insights — surfaces the centralized insight engine's ranked results. useInsights() computes the
// primitive inputs from the store + domain so any screen can render the same insights.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { ageFromProfile } from '../utils/persona';
import { investableValue, blendedReturn, portfolioActualReturn, monthlyContributionsFromOnboarding } from '../domain/assets';
import { totalGrossAnnual, salaryAnnual } from '../domain/income';
import { k401Headroom } from '../domain/income/limits';
import { TOXIC_APR } from '../domain/debt';
import { plannedMonthlySpend } from '../domain/budget';
import { buildInsights } from '../domain/insights';
import { usePlanCompleteness } from './SharpenPlanScreen';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export function useInsights(limit?: number) {
  const store = useStore() as any;
  const plan = usePlanCompleteness();
  return useMemo(() => {
    const op = store.onboardingProfile ?? {};
    const accounts = store.assetAccounts ?? [];
    const liabilities = store.liabilities ?? [];
    const age = ageFromProfile(op) ?? 45;
    const monthlySpending = plannedMonthlySpend(op);   // B-50: one definition, same as budget.monthly_spending
    const cash = accounts.filter((a: any) => a.tax_bucket === 'CASH').reduce((t: number, a: any) => t + (a.balance || 0), 0);
    const investable = investableValue(accounts);
    const investAccts = accounts.filter((a: any) => a.tax_bucket !== 'PROPERTY' && a.tax_bucket !== 'CASH');
    const topAccount = investAccts.length ? Math.max(...investAccts.map((a: any) => a.balance || 0)) : 0;
    const toxic = liabilities.reduce((m: any, d: any) => (d.interest_rate_apr > (m?.interest_rate_apr ?? 0) ? d : m), null);
    const actual = portfolioActualReturn(accounts);
    const gross = totalGrossAnnual(op);
    return buildInsights({
      cashMonths: monthlySpending > 0 ? cash / monthlySpending : null,
      toxicDebt: toxic && toxic.interest_rate_apr > TOXIC_APR ? { label: toxic.label, apr: toxic.interest_rate_apr } : null,
      k401Remaining: k401Headroom(age, num(op.c_401k) * 12).remaining,
      hasEarnedIncome: salaryAnnual(op) > 0,   // 401(k) needs W-2 wages
      retireChance: null,   // computed on the Retirement screen; left out here to avoid a heavy re-sim
      cashDragPct: investable > 0 ? (cash / investable) * 100 : 0,
      topAccountPct: investable > 0 ? (topAccount / investable) * 100 : 0,
      planPct: plan.pct,
      beatBy: actual != null ? actual - blendedReturn(accounts) : null,
      investRate: gross > 0 ? (monthlyContributionsFromOnboarding(op) * 12) / gross : null,   // B-52: % of GROSS invested (≠ budget savings rate)
    }, limit);
  }, [store.onboardingProfile, store.assetAccounts, store.liabilities, plan.pct, limit]);
}

export default function InsightsScreen() {
  const router = useRouter();
  const insights = useInsights();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Insights</Text>
      <Text style={styles.sub}>Personalized, ranked by what matters most right now.</Text>
      {insights.length === 0 ? (
        <View style={styles.card}><Text style={styles.empty}>🎉 Nothing urgent — your plan looks healthy. Keep it up.</Text></View>
      ) : insights.map((i) => (
        <TouchableOpacity key={i.id} style={[styles.card, styles.row]} disabled={!i.route} onPress={() => i.route && router.push(i.route as any)}>
          <Text style={styles.icon}>{i.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{i.title}</Text>
            <Text style={styles.body}>{i.body}</Text>
          </View>
          {i.route && <Text style={styles.arrow}>›</Text>}
        </TouchableOpacity>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  arrow: { fontSize: 22, color: Colors.textTertiary },
  empty: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
