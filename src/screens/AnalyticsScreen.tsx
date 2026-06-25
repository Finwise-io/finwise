import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useStore, useMonthlyStats, useCategorySpend } from '../store/useStore';
import { Card, DarkCard, TipCard } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { savingsRateCash } from '../domain/savings';   // B-68: ONE canonical savings rate (savings ÷ take-home), not a bespoke per-screen calc
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

// Pure JS date helpers — no date-fns needed
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}
function subMonth(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - n, 1);
}
function monthLabel(date: Date): string {
  return date.toLocaleString('default', { month: 'short' });
}

export default function AnalyticsScreen() {
  const { incomes, expenses, onboardingProfile, liabilities } = useStore();
  const stats = useMonthlyStats();
  const monthIncome = stats.monthIncome || 0;
  const monthSpend = stats.monthSpend || 0;
  const remaining = stats.remaining || 0;
  const categorySpend = useCategorySpend();
  const [tab, setTab] = useState<'overview' | 'income' | 'expenses' | 'savings'>('overview');

  const now = new Date();

  // Build 6 months of data using plain JS
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonth(now, 5 - i);
    const start = getMonthStart(d);
    const end = getMonthEnd(d);
    const inc = incomes
      .filter(e => {
        if (!e.date) return false;
        const dt = new Date(e.date);
        return !isNaN(dt.getTime()) && dt >= start && dt <= end;
      })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const exp = expenses
      .filter(e => {
        if (!e.date) return false;
        const dt = new Date(e.date);
        return !isNaN(dt.getTime()) && dt >= start && dt <= end;
      })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { label: monthLabel(d), income: inc, expense: exp, savings: Math.max(0, inc - exp) };
  });

  const maxVal = Math.max(...months.map(m => Math.max(m.income || 0, m.expense || 0, m.savings || 0)), 100);
  // B-68: the canonical cash savings rate (monthly savings ÷ take-home, after tax + 401k) — same number
  // as onboarding's "% of take-home", not a bespoke (income−spend)/gross-income calc that mislabeled itself.
  const savingsRate = Math.round(savingsRateCash(onboardingProfile, liabilities ?? []));
  const totalIncome6m = months.reduce((s, m) => s + m.income, 0);
  const totalExpense6m = months.reduce((s, m) => s + m.expense, 0);
  const totalSavings6m = months.reduce((s, m) => s + m.savings, 0);
  const avg6mSavingsRate = totalIncome6m > 0 ? Math.round((totalSavings6m / totalIncome6m) * 100) : 0;

  function barH(val: number): number {
    const v = Number(val) || 0;
    if (!maxVal || maxVal === 0) return 4;
    return Math.max(4, (v / maxVal) * 120);
  }

  const noData = incomes.length === 0 && expenses.length === 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'income', 'expenses', 'savings'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {noData && (
        <TipCard color="amber">
          <Text style={{ fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.amber, marginBottom: 4 }}>No data yet</Text>
          <Text style={{ fontSize: Typography.sizes.sm, color: '#633806', lineHeight: 20 }}>
            Start logging income and expenses to see your analytics here. The charts will fill in as you add data.
          </Text>
        </TipCard>
      )}

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          <DarkCard>
            <Text style={styles.cardLabel}>This month</Text>
            <View style={styles.triRow}>
              <View style={styles.triItem}>
                <Text style={styles.triLabel}>Income</Text>
                <Text style={[styles.triVal, { color: Colors.successGreen }]}>${monthIncome.toFixed(0)}</Text>
              </View>
              <View style={styles.triDiv} />
              <View style={styles.triItem}>
                <Text style={styles.triLabel}>Actual spend</Text>
                <Text style={[styles.triVal, { color: '#FAC775' }]}>${monthSpend.toFixed(0)}</Text>
              </View>
              <View style={styles.triDiv} />
              <View style={styles.triItem}>
                <Text style={styles.triLabel}>{remaining >= 0 ? 'Surplus' : 'Over'}</Text>
                <Text style={[styles.triVal, { color: remaining >= 0 ? Colors.successGreen : '#F09595' }]}>
                  ${Math.abs(remaining).toFixed(0)}
                </Text>
              </View>
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Savings rate (of take-home)</Text>
              <Text style={[styles.rateVal, {
                color: savingsRate >= 20 ? Colors.successGreen : savingsRate >= 10 ? '#FAC775' : '#F09595'
              }]}>{savingsRate}%</Text>
            </View>
            <Text style={styles.rateNote}>Share of your take-home pay you keep. (Investing as a % of gross pay is shown in Insights.)</Text>
          </DarkCard>

          <Card>
            <Text style={styles.secTitle}>6-month overview</Text>
            <View style={styles.legend}>
              {[
                { color: Colors.primary, label: 'Income' },
                { color: Colors.red, label: 'Expenses' },
                { color: Colors.blue, label: 'Savings' },
              ].map(l => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chart}>
              {months.map((m, i) => (
                <View key={i} style={styles.barGroup}>
                  <View style={styles.barsRow}>
                    <View style={[styles.bar, { height: barH(m.income), backgroundColor: Colors.primary }]} />
                    <View style={[styles.bar, { height: barH(m.expense), backgroundColor: Colors.red }]} />
                    <View style={[styles.bar, { height: barH(m.savings), backgroundColor: Colors.blue }]} />
                  </View>
                  <Text style={styles.barLbl}>{m.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.secTitle}>Last 6 months totals</Text>
            {[
              { label: 'Total income', value: `$${totalIncome6m.toLocaleString()}`, color: Colors.primary },
              { label: 'Total expenses', value: `$${totalExpense6m.toLocaleString()}`, color: Colors.red },
              { label: 'Total saved', value: `$${totalSavings6m.toLocaleString()}`, color: Colors.primary },
              { label: 'Avg savings rate (take-home)', value: `${avg6mSavingsRate}%`, color: avg6mSavingsRate >= 20 ? Colors.primary : Colors.amber },
            ].map((row, i) => (
              <View key={i} style={styles.statRow}>
                <Text style={styles.statLabel}>{row.label}</Text>
                <Text style={[styles.statVal, { color: row.color }]}>{row.value}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ── INCOME TAB ───────────────────────────────────────────── */}
      {tab === 'income' && (
        <>
          <Card>
            <Text style={styles.secTitle}>Monthly income</Text>
            <View style={styles.chart}>
              {months.map((m, i) => (
                <View key={i} style={styles.barGroup}>
                  {m.income > 0 && <Text style={styles.barAmt}>${(m.income / 1000).toFixed(1)}k</Text>}
                  <View style={[styles.singleBar, { height: barH(m.income), backgroundColor: Colors.primary }]} />
                  <Text style={styles.barLbl}>{m.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.secTitle}>Income this month</Text>
            {incomes
              .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              })
              .map(e => (
                <View key={e.id} style={styles.txRow}>
                  <Text style={{ fontSize: 20 }}>💵</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.txLabel}>{e.source}</Text>
                    <Text style={styles.txDate}>{new Date(e.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.txAmt, { color: Colors.primary }]}>+${e.amount.toFixed(2)}</Text>
                </View>
              ))}
            {incomes.length === 0 && <Text style={styles.emptyTxt}>No income logged this month</Text>}
          </Card>
        </>
      )}

      {/* ── EXPENSES TAB ─────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <>
          <Card>
            <Text style={styles.secTitle}>Monthly expenses</Text>
            <View style={styles.chart}>
              {months.map((m, i) => (
                <View key={i} style={styles.barGroup}>
                  {m.expense > 0 && <Text style={styles.barAmt}>${(m.expense / 1000).toFixed(1)}k</Text>}
                  <View style={[styles.singleBar, { height: barH(m.expense), backgroundColor: Colors.red }]} />
                  <Text style={styles.barLbl}>{m.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.secTitle}>By category this month</Text>
            {categorySpend.length === 0 && <Text style={styles.emptyTxt}>No expenses logged this month</Text>}
            {categorySpend.map(({ category, total }) => {
              const pct = monthSpend > 0 ? (total / monthSpend) * 100 : 0;
              return (
                <View key={category} style={styles.catRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catHeader}>
                      <Text style={styles.catLabel}>{category}</Text>
                      <Text style={styles.catAmt}>${total.toFixed(0)}</Text>
                    </View>
                    <View style={styles.catTrack}>
                      <View style={[styles.catFill, {
                        width: `${Math.min(pct, 100)}%` as any,
                        backgroundColor: pct > 30 ? Colors.red : pct > 15 ? Colors.amberMid : Colors.primary,
                      }]} />
                    </View>
                  </View>
                  <Text style={styles.catPct}>{Math.round(pct)}%</Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* ── SAVINGS TAB ──────────────────────────────────────────── */}
      {tab === 'savings' && (
        <>
          <Card>
            <Text style={styles.secTitle}>Monthly savings</Text>
            <View style={styles.chart}>
              {months.map((m, i) => (
                <View key={i} style={styles.barGroup}>
                  {m.savings > 0 && <Text style={styles.barAmt}>${(m.savings / 1000).toFixed(1)}k</Text>}
                  <View style={[styles.singleBar, { height: barH(m.savings), backgroundColor: Colors.blue }]} />
                  <Text style={styles.barLbl}>{m.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.secTitle}>Savings rate by month (of take-home)</Text>
            {months.map((m, i) => {
              const rate = m.income > 0 ? Math.round((m.savings / m.income) * 100) : 0;
              return (
                <View key={i} style={styles.rateItemRow}>
                  <Text style={styles.rateItemLbl}>{m.label}</Text>
                  <View style={styles.rateItemTrack}>
                    <View style={[styles.rateItemFill, {
                      width: `${Math.min(Math.max(rate, 0), 100)}%` as any,
                      backgroundColor: rate >= 20 ? Colors.primary : rate >= 10 ? Colors.amberMid : Colors.red,
                    }]} />
                  </View>
                  <Text style={[styles.rateItemPct, {
                    color: rate >= 20 ? Colors.primary : rate >= 10 ? Colors.amber : Colors.red,
                  }]}>{rate}%</Text>
                </View>
              );
            })}
          </Card>

          <TipCard color={savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'amber' : 'red'}>
            <Text style={{ fontSize: Typography.sizes.base, fontWeight: '700', color: savingsRate >= 20 ? Colors.primaryDeep : savingsRate >= 10 ? Colors.amber : Colors.red, marginBottom: 4 }}>
              {savingsRate >= 20 ? '🌟 Excellent!' : savingsRate >= 10 ? '👍 Good progress' : '💡 Room to improve'}
            </Text>
            <Text style={{ fontSize: Typography.sizes.sm, color: savingsRate >= 20 ? Colors.primaryDeep : savingsRate >= 10 ? '#633806' : '#791F1F', lineHeight: 20 }}>
              {savingsRate >= 20
                ? `Saving ${savingsRate}% — above the recommended 20%. Keep it up!`
                : savingsRate >= 10
                ? `Saving ${savingsRate}%. Try to reach 20% for long-term financial security.`
                : `Saving ${savingsRate}%. Even adding $50/month makes a big difference over time.`}
            </Text>
          </TipCard>
        </>
      )}

      <Disclaimer />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: 3, gap: 2 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radii.sm },
  tabOn: { backgroundColor: Colors.cardBg, borderWidth: 0.5, borderColor: Colors.border },
  tabText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  tabTextOn: { color: Colors.primary, fontWeight: '700' },
  cardLabel: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.sm },
  triRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  triItem: { flex: 1, alignItems: 'center' },
  triLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 3 },
  triVal: { fontSize: 22, fontWeight: '700' },
  triDiv: { width: 0.5, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.2)' },
  rateLabel: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.75)' },
  rateVal: { fontSize: Typography.sizes.md, fontWeight: '700' },
  rateNote: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6, lineHeight: 15 },
  secTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  legend: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 150, paddingBottom: 22 },
  barGroup: { flex: 1, alignItems: 'center', gap: 3 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 9, borderRadius: 4, minHeight: 4 },
  singleBar: { width: 28, borderRadius: 6, minHeight: 4 },
  barLbl: { fontSize: 10, color: Colors.textSecondary, position: 'absolute', bottom: 0 },
  barAmt: { fontSize: 9, color: Colors.textSecondary, marginBottom: 3 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  statLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  statVal: { fontSize: Typography.sizes.base, fontWeight: '700' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  txLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  txDate: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  txAmt: { fontSize: Typography.sizes.md, fontWeight: '700' },
  emptyTxt: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: Spacing.sm },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  catLabel: { fontSize: Typography.sizes.sm, fontWeight: '500', color: Colors.textPrimary },
  catAmt: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  catTrack: { height: 6, backgroundColor: Colors.bgSecondary, borderRadius: 6, overflow: 'hidden' },
  catFill: { height: 6, borderRadius: 6 },
  catPct: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, width: 36, textAlign: 'right' },
  rateItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  rateItemLbl: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, width: 32 },
  rateItemTrack: { flex: 1, height: 8, backgroundColor: Colors.bgSecondary, borderRadius: 8, overflow: 'hidden' },
  rateItemFill: { height: 8, borderRadius: 8 },
  rateItemPct: { fontSize: Typography.sizes.sm, fontWeight: '700', width: 36, textAlign: 'right' },
});
