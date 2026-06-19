import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore, useMonthlyStats, useCategorySpend } from '../store/useStore';
import { analyzeExpenses } from '../services/economicData';
import { Card, TipCard, Button, ProgressBar, Badge, AmountText } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type Tip = { title: string; detail: string; savingsMin: number; savingsMax: number; accepted?: boolean };


// Local fallback tips when AI is unavailable
function generateLocalTips(expenses: any[]): any[] {
  const tips = [];
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  if ((byCategory['Dining'] || 0) > 200) {
    tips.push({ title: 'Cook more at home', detail: 'Your dining spending is high. Cooking 3 more meals per week at home could save $80-120/month.', savingsMin: 80, savingsMax: 120 });
  }
  if ((byCategory['Subscriptions'] || 0) > 30) {
    tips.push({ title: 'Review subscriptions', detail: 'Check for streaming or app subscriptions you rarely use. Cancelling one could save $10-20/month.', savingsMin: 10, savingsMax: 20 });
  }
  if ((byCategory['Shopping'] || 0) > 150) {
    tips.push({ title: 'Wait before buying', detail: 'Try a 24-hour rule before non-essential purchases. This alone can cut impulse spending by 20-30%.', savingsMin: 30, savingsMax: 80 });
  }
  if ((byCategory['Gas'] || 0) > 100) {
    tips.push({ title: 'Combine errands', detail: 'Plan errands in one trip to save on gas. Could save $20-40/month.', savingsMin: 20, savingsMax: 40 });
  }
  if (tips.length === 0) {
    tips.push({ title: 'Build your emergency fund', detail: 'Try to save 3-6 months of expenses as a safety net. Even $50/month adds up.', savingsMin: 50, savingsMax: 100 });
    tips.push({ title: 'Pay yourself first', detail: 'Set up an automatic transfer to savings on payday before spending anything.', savingsMin: 100, savingsMax: 200 });
  }
  return tips;
}

export default function TipsScreen() {
  const router = useRouter();
  const { expenses, inflationRate, earnBadge } = useStore();
  const stats = useMonthlyStats();
  const monthIncome = stats.monthIncome || 0;
  const monthSpend = stats.monthSpend || 0;
  const remaining = stats.remaining || 0;
  const categorySpend = useCategorySpend();

  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [summary, setSummary] = useState('');
  const [totalSavingsMin, setTotalSavingsMin] = useState(0);
  const [totalSavingsMax, setTotalSavingsMax] = useState(0);
  const [tipStates, setTipStates] = useState<Record<number, 'accepted' | 'skipped' | null>>({});

  async function runAnalysis() {
    if (expenses.length === 0) {
      Alert.alert('No expenses yet', 'Add some expenses first, then come back for personalized tips!');
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeExpenses(
        expenses.slice(0, 50).map((e) => ({ category: e.category, store: e.store, amount: e.amount })),
        monthIncome || 4500,
        inflationRate
      );
      setSummary(result.summary);
      setTips(result.tips);
      setTotalSavingsMin(result.totalSavingsMin);
      setTotalSavingsMax(result.totalSavingsMax);
      earnBadge('expense_analyzer');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
        Alert.alert('No internet', 'Please check your connection and try again.');
      } else {
        // AI proxy not configured / unavailable (or any other error) → show on-device tips instead.
        setSummary('Here are some general tips based on your spending patterns.');
        setTips(generateLocalTips(expenses));
        setTotalSavingsMin(50);
        setTotalSavingsMax(200);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleTip(idx: number, action: 'accepted' | 'skipped') {
    setTipStates((prev) => ({ ...prev, [idx]: action }));
  }

  const overBudget = monthSpend > monthIncome && monthIncome > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Budget summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>This month at a glance</Text>
        {/* B-46: explain the $0 — this section reflects what you've LOGGED, not your declared income/plan. */}
        <Text style={styles.summarySub}>From what you've logged this month — not your full income or budget.</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <AmountText amount={monthIncome} color={Colors.primary} size="lg" />
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Spent so far</Text>
            <AmountText amount={monthSpend} color={overBudget ? Colors.red : Colors.textPrimary} size="lg" />
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: remaining >= 0 ? Colors.primary : Colors.red }]}>
              {remaining >= 0 ? 'Available' : 'Overspent by'}
            </Text>
            <AmountText amount={Math.abs(remaining)} color={remaining >= 0 ? Colors.primary : Colors.red} size="lg" />
          </View>
        </View>
        {overBudget && (
          <View style={{ backgroundColor: Colors.redLight, borderRadius: 8, padding: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: Colors.red, textAlign: 'center' }}>
              You have spent ${(monthSpend - monthIncome).toFixed(0)} more than your income this month
            </Text>
          </View>
        )}
      </Card>

      {/* Category breakdown */}
      {categorySpend.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Spending by category</Text>
          {categorySpend.map(({ category, total }) => {
            const pct = monthIncome > 0 ? (total / monthIncome) * 100 : 0;
            return (
              <View key={category} style={styles.catRow}>
                <Text style={styles.catLabel}>{category}</Text>
                <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                  <ProgressBar pct={pct} color={pct > 30 ? Colors.red : pct > 15 ? Colors.amberMid : Colors.primary} height={6} />
                </View>
                <Text style={styles.catAmt}>${total.toFixed(0)}</Text>
              </View>
            );
          })}
        </Card>
      )}

      {/* AI Analysis trigger */}
      {tips.length === 0 ? (
        <Card style={styles.aiCard}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: Spacing.sm }}>🤖</Text>
          <Text style={styles.aiTitle}>Get AI-powered tips</Text>
          <Text style={styles.aiSub}>
            Our AI analyzes your spending and finds specific ways to save — like spotting duplicate subscriptions or cheaper alternatives.
          </Text>
          <Button
            label={loading ? 'Analyzing...' : 'Analyze my expenses →'}
            onPress={runAnalysis}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />
        </Card>
      ) : (
        <>
          {/* Summary */}
          <TipCard color="green">
            <Text style={styles.aiSummaryText}>{summary}</Text>
          </TipCard>

          {/* Total savings */}
          <Card style={styles.savingsCard}>
            <Text style={styles.sectionTitle}>Potential monthly savings</Text>
            <Text style={styles.savingsRange}>
              ${totalSavingsMin}–${totalSavingsMax}
            </Text>
            <Text style={styles.savingsNote}>per month if you apply all tips below</Text>
            <Text style={styles.savingsAnnual}>
              = ${(totalSavingsMin * 12).toLocaleString()}–${(totalSavingsMax * 12).toLocaleString()} per year
            </Text>
          </Card>

          {/* Tips */}
          {tips.map((tip, idx) => {
            const state = tipStates[idx];
            return (
              <Card key={idx} style={state === 'accepted' ? styles.tipAccepted : state === 'skipped' ? styles.tipSkipped : {}}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Badge
                    label={`Save $${tip.savingsMin}–$${tip.savingsMax}/mo`}
                    color={state === 'accepted' ? 'green' : 'blue'}
                  />
                </View>
                <Text style={styles.tipDetail}>{tip.detail}</Text>
                {!state && (
                  <View style={styles.tipActions}>
                    <TouchableOpacity
                      style={[styles.tipBtn, styles.tipBtnAccept]}
                      onPress={() => handleTip(idx, 'accepted')}
                    >
                      <Text style={styles.tipBtnAcceptText}>I'll try this ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tipBtn, styles.tipBtnSkip]}
                      onPress={() => handleTip(idx, 'skipped')}
                    >
                      <Text style={styles.tipBtnSkipText}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {state === 'accepted' && (
                  <Text style={styles.tipAcceptedNote}>✅ Great choice! We'll track this for you.</Text>
                )}
                {state === 'skipped' && (
                  <Text style={styles.tipSkippedNote}>Skipped — no worries, you can revisit anytime.</Text>
                )}
              </Card>
            );
          })}

          <Button label="Re-analyze expenses" onPress={runAnalysis} variant="secondary" loading={loading} />
        </>
      )}

      {/* Job safety nudge */}
      <TouchableOpacity onPress={() => router.push('/jobsafety')}>
        <TipCard color="amber">
          <Text style={styles.nudgeTitle}>🛡 Plan for income gaps</Text>
          <Text style={styles.nudgeText}>
            Worried about job security? Answer 2 questions and we'll build you a safety plan.
          </Text>
        </TipCard>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  summaryCard: { padding: Spacing.md },
  summaryTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  summarySub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2, marginBottom: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: 3 },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary, marginBottom: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  catLabel: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, width: 90 },
  catAmt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textPrimary, width: 44, textAlign: 'right' },
  aiCard: { alignItems: 'center', padding: Spacing.xl },
  aiTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  aiSub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  aiSummaryText: { fontSize: Typography.sizes.base, color: Colors.primaryDeep, lineHeight: 22 },
  savingsCard: { alignItems: 'center', padding: Spacing.xl },
  savingsRange: { fontSize: 40, fontWeight: Typography.weights.bold, color: Colors.primary, marginVertical: Spacing.xs },
  savingsNote: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  savingsAnnual: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.primaryDark, marginTop: 4 },
  tipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  tipTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  tipDetail: { fontSize: Typography.sizes.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.sm },
  tipActions: { flexDirection: 'row', gap: Spacing.sm },
  tipBtn: { flex: 1, paddingVertical: 10, borderRadius: Radii.md, alignItems: 'center' },
  tipBtnAccept: { backgroundColor: Colors.primary },
  tipBtnAcceptText: { fontSize: Typography.sizes.base, color: '#fff', fontWeight: Typography.weights.medium },
  tipBtnSkip: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  tipBtnSkipText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  tipAccepted: { borderColor: Colors.primaryMid, borderWidth: 1 },
  tipSkipped: { opacity: 0.55 },
  tipAcceptedNote: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  tipSkippedNote: { fontSize: Typography.sizes.sm, color: Colors.textTertiary },
  nudgeTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.amber, marginBottom: 3 },
  nudgeText: { fontSize: Typography.sizes.sm, color: '#633806', lineHeight: 20 },
});
