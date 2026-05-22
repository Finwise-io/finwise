import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore, useMonthlyStats, useLevel } from '../store/useStore';
import { fetchEconomicData } from '../services/economicData';
import { Card, DarkCard, Badge, ProgressBar, TipCard, AmountText, IconCircle } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { format } from 'date-fns';
import { getCategoryIcon } from '../constants/categories';

export default function HomeScreen() {
  const router = useRouter();
  const { user, incomes, expenses, goals, savings, investments, streak, badges, inflationRate, treasuryYield, setEconomicData, earnBadge, checkStreak, budgetFrequency, expenseTargetPercent, applyRecurringIncomes } = useStore() as any;
  const stats = useMonthlyStats();
  const monthIncome = stats.monthIncome || 0;
  const monthSpend = stats.monthSpend || 0;
  const remaining = stats.remaining || 0;
  const pctSpent = stats.pctSpent || 0;
  const level = useLevel();
  const [refreshing, setRefreshing] = useState(false);

  const totalSavings = (savings as any[]).reduce((s: number, e: any) => s + e.amount, 0);
  const totalInvestments = (investments as any[]).reduce((s: number, e: any) => s + e.amount, 0);
  const netWorth = totalSavings + totalInvestments;

  useEffect(() => {
    checkStreak();
    loadEconomicData();
    applyRecurringIncomes();
  }, []);

  async function loadEconomicData() {
    try {
      const data = await fetchEconomicData();
      setEconomicData(data.inflationRate, data.treasuryYield);
    } catch {
      // use cached values
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadEconomicData();
    setRefreshing(false);
  }

  const now = new Date();
  const monthName = format(now, 'MMMM yyyy');
  const freqLabel = budgetFrequency === 'weekly' ? 'This week' : budgetFrequency === 'daily' ? 'Today' : monthName;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysIn = now.getDate();

  const overBudget = monthSpend > monthIncome && monthIncome > 0;
  const recentEntries = [...incomes.map(i => ({ ...i, kind: 'income' as const })), ...expenses.map(e => ({ ...e, kind: 'expense' as const }))]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const inflationDollarLoss = monthIncome * (inflationRate / 100) / 12;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getGreeting()} 👋</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'there'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.xpBadge} onPress={() => router.push('/(tabs)/rewards')}>
            <Text style={styles.xpText}>⭐ {level.xp.toLocaleString()} XP</Text>
          </TouchableOpacity>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Budget Card */}
      <DarkCard style={styles.budgetCard}>
        <Text style={styles.budgetMonth}>{freqLabel} · {daysIn} of {daysInMonth} days</Text>
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>Total spent this month</Text>
            <AmountText amount={monthSpend} color={overBudget ? '#FAC775' : '#5DCAA5'} size="xl" />
          </View>
          <View style={styles.budgetDivider} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.budgetLabel, { textAlign: 'right' }]}>Income this month</Text>
            <AmountText amount={monthIncome} color="#5DCAA5" size="xl" />
          </View>
        </View>
        <View style={{ marginTop: Spacing.md }}>
          {/* Progress bar with target marker */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${Math.min(pctSpent, 100)}%`,
              backgroundColor: overBudget ? '#FAC775' : Colors.successGreen,
            }]} />
            {/* 80/20 target marker */}
            {monthIncome > 0 && (
              <View style={[styles.targetMarker, { left: `${expenseTargetPercent}%` as any }]} />
            )}
          </View>
          <View style={styles.budgetFooter}>
            <Text style={styles.budgetFooterText}>{Math.round(pctSpent)}% of income spent</Text>
            <Text style={[styles.budgetFooterText, { color: overBudget ? '#FAC775' : Colors.successGreen, fontWeight: '600' }]}>
              {remaining >= 0 ? `$${remaining.toFixed(0)} left` : `$${Math.abs(remaining).toFixed(0)} over`}
            </Text>
          </View>
          {monthIncome > 0 && (
            <Text style={styles.targetHint}>
              Target: spend ≤{expenseTargetPercent}% (${(monthIncome * expenseTargetPercent / 100).toFixed(0)}) · save {100 - expenseTargetPercent}%
            </Text>
          )}
        </View>
      </DarkCard>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/income')} activeOpacity={0.85}>
          <View style={[styles.qaIcon, { backgroundColor: Colors.primaryLight }]}>
            <Text style={{ fontSize: 22 }}>💵</Text>
          </View>
          <Text style={styles.qaLabel}>Income</Text>
          <Text style={styles.qaSubLabel}>{monthIncome > 0 ? 'Edit / add' : 'Log now'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/expense')} activeOpacity={0.85}>
          <View style={[styles.qaIcon, { backgroundColor: Colors.amberLight }]}>
            <Text style={{ fontSize: 22 }}>🧾</Text>
          </View>
          <Text style={styles.qaLabel}>Expenses</Text>
          <Text style={styles.qaSubLabel}>{monthSpend > 0 ? 'Edit / add' : 'Log now'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/savings')} activeOpacity={0.85}>
          <View style={[styles.qaIcon, { backgroundColor: Colors.blueLight }]}>
            <Text style={{ fontSize: 22 }}>🏦</Text>
          </View>
          <Text style={styles.qaLabel}>Savings</Text>
          <Text style={styles.qaSubLabel}>Add / track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/invest')} activeOpacity={0.85}>
          <View style={[styles.qaIcon, { backgroundColor: '#EAF3DE' }]}>
            <Text style={{ fontSize: 22 }}>📈</Text>
          </View>
          <Text style={styles.qaLabel}>Invest</Text>
          <Text style={styles.qaSubLabel}>Add / track</Text>
        </TouchableOpacity>
      </View>

      {/* Net worth card */}
      {(totalSavings > 0 || totalInvestments > 0) && (
        <Card style={styles.netWorthCard}>
          <View style={styles.netWorthRow}>
            <View style={styles.netWorthItem}>
              <Text style={styles.netWorthLabel}>💰 Savings</Text>
              <Text style={[styles.netWorthValue, { color: Colors.primary }]}>${totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.netWorthDivider} />
            <View style={styles.netWorthItem}>
              <Text style={styles.netWorthLabel}>📈 Investments</Text>
              <Text style={[styles.netWorthValue, { color: Colors.primary }]}>${totalInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.netWorthDivider} />
            <View style={styles.netWorthItem}>
              <Text style={styles.netWorthLabel}>🏦 Net worth</Text>
              <Text style={[styles.netWorthValue, { color: Colors.primary, fontWeight: Typography.weights.bold }]}>${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Over-budget alert */}
      {overBudget && (
        <TouchableOpacity onPress={() => router.push('/(tabs)/tips')}>
          <View style={styles.alertCard}>
            <View style={styles.alertRow}>
              <Text style={styles.alertTitle}>⚠️ Spending Alert</Text>
              <Badge label="Over budget" color="red" />
            </View>
            <Text style={styles.alertText}>
              You've spent more than your income this month. Tap to see ways to cut back.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Inflation banner */}
      <TouchableOpacity onPress={() => Alert.alert('What this means', `With inflation at ${inflationRate}%, your $${monthIncome.toFixed(0)} monthly income has about $${inflationDollarLoss.toFixed(0)} less buying power than last year.\n\nTreasury yield at ${treasuryYield}% means safe savings accounts or T-Bills can help you keep up.`)}>
        <TipCard color="amber">
          <Text style={styles.inflationTitle}>📊 Live economic data</Text>
          <Text style={styles.inflationText}>
            Inflation {inflationRate}% · 10-yr Treasury {treasuryYield}% — tap to learn what this means for you
          </Text>
        </TipCard>
      </TouchableOpacity>

      {/* Recent activity */}
      <Card>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's activity</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/budget')}>
            <Text style={styles.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>
        {recentEntries.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>No entries yet — tap + to get started!</Text>
          </View>
        ) : (
          recentEntries.map((entry) => {
            const isIncome = entry.kind === 'income';
            return (
              <View key={entry.id} style={styles.activityRow}>
                <IconCircle
                  icon={isIncome ? '💵' : getCategoryIcon((entry as any).category)}
                  bg={isIncome ? Colors.primaryLight : Colors.amberLight}
                  size={38}
                />
                <View style={styles.activityMid}>
                  <Text style={styles.activityLabel}>
                    {isIncome ? (entry as any).source : (entry as any).store || (entry as any).category}
                  </Text>
                  <Text style={styles.activitySub}>
                    {format(new Date(entry.createdAt), 'h:mm a')} · {isIncome ? 'Income' : (entry as any).category}
                  </Text>
                </View>
                <Text style={[styles.activityAmt, { color: isIncome ? Colors.primary : Colors.red }]}>
                  {isIncome ? '+' : '-'}${(entry as any).amount.toFixed(2)}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      {/* Goals preview */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/rewards')}>
          <Text style={styles.sectionLink}>Manage →</Text>
        </TouchableOpacity>
      </View>
      {goals.slice(0, 2).map((goal) => (
        <Card key={goal.id} style={{ marginBottom: Spacing.sm }}>
          <View style={styles.goalRow}>
            <Text style={{ fontSize: 22 }}>{goal.icon}</Text>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <View style={styles.goalTitleRow}>
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={styles.goalAmt}>${goal.saved.toLocaleString()} / ${goal.target.toLocaleString()}</Text>
              </View>
              <ProgressBar pct={(goal.saved / goal.target) * 100} color={goal.color} height={7} />
              <Text style={styles.goalPct}>{Math.round((goal.saved / goal.target) * 100)}% complete</Text>
            </View>
          </View>
        </Card>
      ))}

      {/* Job safety nudge */}
      <TouchableOpacity onPress={() => router.push('/jobsafety')}>
        <TipCard color="amber">
          <Text style={styles.inflationTitle}>🛡 Job safety check</Text>
          <Text style={styles.inflationText}>
            At risk of losing income in the next 12 months? Plan ahead now — it only takes 2 minutes.
          </Text>
        </TipCard>
      </TouchableOpacity>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  greeting: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  userName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  xpBadge: { backgroundColor: Colors.primaryDark, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.pill },
  xpText: { fontSize: Typography.sizes.sm, color: '#fff', fontWeight: Typography.weights.medium },
  streakBadge: { backgroundColor: Colors.amberLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill },
  streakText: { fontSize: Typography.sizes.sm, color: Colors.amber, fontWeight: Typography.weights.medium },
  budgetCard: { marginVertical: Spacing.xs },
  budgetMonth: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.65)', marginBottom: Spacing.sm },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 3 },
  budgetDivider: { width: 0.5, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 7, overflow: 'visible', position: 'relative' },
  progressFill: { height: 7, borderRadius: 7 },
  targetMarker: { position: 'absolute', top: -3, width: 2, height: 13, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 1 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  budgetFooterText: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  targetHint: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.xs },
  qaBtn: { alignItems: 'center', flex: 1 },
  qaIcon: { width: 52, height: 52, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  qaLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textAlign: 'center' },
  qaSubLabel: { fontSize: 9, color: Colors.textTertiary, textAlign: 'center', marginTop: 1 },
  alertCard: { backgroundColor: Colors.redLight, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.redMid, padding: Spacing.md },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  alertTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.red },
  alertText: { fontSize: Typography.sizes.sm, color: '#791F1F', lineHeight: 19 },
  inflationTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.amber, marginBottom: 3 },
  inflationText: { fontSize: Typography.sizes.sm, color: '#633806', lineHeight: 19 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  sectionLink: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  emptyActivity: { paddingVertical: Spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: Spacing.sm },
  activityMid: { flex: 1 },
  activityLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  activitySub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  activityAmt: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  netWorthCard: { marginVertical: 0 },
  netWorthRow: { flexDirection: 'row', alignItems: 'center' },
  netWorthItem: { flex: 1, alignItems: 'center' },
  netWorthLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: 3 },
  netWorthValue: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  netWorthDivider: { width: 0.5, height: 36, backgroundColor: Colors.border },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  goalAmt: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  goalPct: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 3 },
});
