import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useRouter } from 'expo-router';
import { useStore, useMonthlyStats } from '../store/useStore';
import { Card, Button, ProgressBar, TipCard } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { money } from '../domain/_shared/num';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type RiskLevel = 'low' | 'medium' | 'high';
type FundType = 'separate' | 'retirement';

const RISK_OPTIONS: { level: RiskLevel; icon: string; label: string; sub: string }[] = [
  { level: 'low',    icon: '😊', label: 'Very stable',    sub: 'My job feels secure for the next year' },
  { level: 'medium', icon: '😐', label: 'Some uncertainty', sub: 'There\'s a chance things could change' },
  { level: 'high',   icon: '😟', label: 'Worried',         sub: 'I could lose income in the next 12 months' },
];

export default function JobSafetyScreen() {
  const router = useRouter();
  const { jobRiskLevel, emergencyMonths, setJobRisk, setEmergencyMonths, savings, investments, incomes } = useStore();
  const { monthSpend, periodSpend } = useMonthlyStats() as any;

  const [selected, setSelected] = useState<RiskLevel | null>(jobRiskLevel);
  const [months, setMonths] = useState(emergencyMonths);
  const [fundType, setFundType] = useState<FundType>('separate');
  const [customExpenses, setCustomExpenses] = useState('');

  // ── Better expense baseline ────────────────────────────────────────
  // Use last 3 months average if available, fall back to this month, then default
  const totalSavings = savings.reduce((s: number, e: any) => s + e.amount, 0);
  const totalInvestments = investments.reduce((s: number, e: any) => s + e.amount, 0);

  // Use custom if entered, else use monthly spend if > 0, else ask them to enter
  const rawExpenses = parseFloat(customExpenses) || monthSpend || 0;
  const baseExpenses = rawExpenses > 0 ? rawExpenses : 2500; // sensible default

  const availableFunds = fundType === 'separate' ? totalSavings : totalSavings + totalInvestments;
  const target = baseExpenses * months;
  const gap = Math.max(0, target - availableFunds);
  const monthlyContribution = 300;
  const monthsToGoal = gap > 0 ? Math.ceil(gap / monthlyContribution) : 0;
  const pct = target > 0 ? Math.min((availableFunds / target) * 100, 100) : 0;
  const isMet = pct >= 100;

  function handleSave() {
    if (!selected) {
      Alert.alert('Select an option', 'Let us know about your income stability.');
      return;
    }
    setJobRisk(selected);
    setEmergencyMonths(months);
    Alert.alert(
      'Plan saved! 🛡',
      selected === 'low'
        ? 'Great! Keep building your emergency fund as a safety net.'
        : `We\'ve saved your ${months}-month emergency fund goal. Small steps every month add up fast!`,
      [{ text: 'Got it', onPress: () => router.back() }]
    );
  }

  const adviceMap: Record<RiskLevel, { title: string; text: string; color: 'green' | 'amber' | 'red' }> = {
    low: {
      title: '😊 You\'re in great shape!',
      text: 'Even with a stable job, having 3 months of expenses saved is smart. Unexpected things happen to anyone.',
      color: 'green',
    },
    medium: {
      title: '😐 Good thinking to plan ahead',
      text: 'A 3-6 month emergency fund gives you breathing room if things change. Start saving a little each month now.',
      color: 'amber',
    },
    high: {
      title: '😟 Let\'s build your safety net now',
      text: 'Don\'t wait. Even saving $50-100 per week adds up fast. We\'ll help you find money to save from your expenses.',
      color: 'red',
    },
  };

  return (
    <KeyboardAwareScreen style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Risk level */}
      <Card>
        <Text style={styles.question}>How stable is your income in the next 12 months?</Text>
        <Text style={styles.questionSub}>Be honest — this stays private and helps us give better advice.</Text>
        <View style={styles.options}>
          {RISK_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.level}
              style={[styles.optionBtn, selected === opt.level && styles.optionBtnOn]}
              onPress={() => setSelected(opt.level)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={[styles.optionLabel, selected === opt.level && styles.optionLabelOn]}>{opt.label}</Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.radio, selected === opt.level && styles.radioOn]}>
                {selected === opt.level && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Advice */}
      {selected && (
        <TipCard color={adviceMap[selected].color}>
          <Text style={{ fontSize: Typography.sizes.md, fontWeight: '700', color: selected === 'high' ? Colors.red : selected === 'medium' ? Colors.amber : Colors.primaryDeep, marginBottom: 4 }}>
            {adviceMap[selected].title}
          </Text>
          <Text style={{ fontSize: Typography.sizes.base, color: selected === 'high' ? '#791F1F' : selected === 'medium' ? '#633806' : Colors.primaryDeep, lineHeight: 22 }}>
            {adviceMap[selected].text}
          </Text>
        </TipCard>
      )}

      {/* Emergency fund calculator */}
      {selected && (
        <Card>
          <Text style={styles.calcTitle}>Emergency fund calculator</Text>

          {/* Monthly expenses */}
          <Text style={styles.label}>Monthly expenses ($)</Text>
          <Text style={styles.hint}>
            {monthSpend > 0
              ? `We detected ${money(monthSpend)}/month from your logs. Edit if your typical month differs.`
              : 'Enter your typical monthly expenses (rent, food, bills, etc.)'}
          </Text>
          <TextInput
            style={styles.input}
            value={customExpenses}
            onChangeText={setCustomExpenses}
            placeholder={monthSpend > 0 ? monthSpend.toFixed(0) : '3000'}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textTertiary}
          />
          {rawExpenses === 0 && monthSpend === 0 && (
            <TipCard color="amber">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.amber }}>
                💡 Tip: Add some expenses first for a more accurate calculation, or enter your monthly expenses above.
              </Text>
            </TipCard>
          )}

          {/* Months target */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Months of runway to save</Text>
          <View style={styles.monthBtns}>
            {[1, 2, 3, 4, 6, 9, 12].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.monthBtn, months === m && styles.monthBtnOn]}
                onPress={() => setMonths(m)}
              >
                <Text style={[styles.monthBtnText, months === m && styles.monthBtnTextOn]}>{m}mo</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fund type — KEY NEW FEATURE */}
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Which savings count toward this goal?</Text>
          <Text style={styles.hint}>Retirement savings (401k, IRA) may not be accessible in an emergency without penalties.</Text>

          <TouchableOpacity
            style={[styles.fundTypeBtn, fundType === 'separate' && styles.fundTypeBtnOn]}
            onPress={() => setFundType('separate')}
          >
            <Text style={{ fontSize: 22 }}>🏦</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[styles.fundTypeLabel, fundType === 'separate' && styles.fundTypeLabelOn]}>
                Liquid savings only
              </Text>
              <Text style={styles.fundTypeSub}>
                Bank savings account, cash — accessible anytime. Current: {money(totalSavings)}
              </Text>
            </View>
            <View style={[styles.radio, fundType === 'separate' && styles.radioOn]}>
              {fundType === 'separate' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fundTypeBtn, fundType === 'retirement' && styles.fundTypeBtnOn]}
            onPress={() => setFundType('retirement')}
          >
            <Text style={{ fontSize: 22 }}>📊</Text>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[styles.fundTypeLabel, fundType === 'retirement' && styles.fundTypeLabelOn]}>
                Include retirement savings
              </Text>
              <Text style={styles.fundTypeSub}>
                401k, IRA, investments — note: early withdrawal has penalties. Total: {money(totalSavings + totalInvestments)}
              </Text>
            </View>
            <View style={[styles.radio, fundType === 'retirement' && styles.radioOn]}>
              {fundType === 'retirement' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {fundType === 'retirement' && (
            <TipCard color="amber">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.amber, lineHeight: 20 }}>
                ⚠️ Withdrawing from a 401k or IRA before age 59½ typically incurs a 10% penalty plus income tax. We recommend building a separate liquid emergency fund.
              </Text>
            </TipCard>
          )}

          {/* Results */}
          <View style={[styles.calcResult, { marginTop: Spacing.md }]}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Monthly expenses</Text>
              <Text style={styles.calcValue}>{money(baseExpenses)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Target ({months} months)</Text>
              <Text style={styles.calcValue}>{money(target)}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Available funds</Text>
              <Text style={[styles.calcValue, { color: Colors.primary }]}>{money(availableFunds)}</Text>
            </View>
            <View style={[styles.calcRow, { borderTopWidth: 0.5, borderTopColor: Colors.border, marginTop: 4, paddingTop: 4 }]}>
              <Text style={[styles.calcLabel, { fontWeight: '700' }]}>
                {isMet ? 'Goal met! 🎉' : 'Still needed'}
              </Text>
              <Text style={[styles.calcValue, { fontWeight: '700', color: isMet ? Colors.primary : Colors.red }]}>
                {isMet ? '✓ Covered' : money(gap)}
              </Text>
            </View>
          </View>

          <ProgressBar pct={pct} color={isMet ? Colors.primary : pct >= 50 ? Colors.amberMid : Colors.red} />
          <Text style={styles.pctText}>{Math.round(pct)}% funded</Text>

          {!isMet && (
            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.base, color: Colors.primaryDeep, lineHeight: 22 }}>
                At $300/month saved, you'd reach your {months}-month goal in{' '}
                <Text style={{ fontWeight: '700' }}>{monthsToGoal} months</Text>.{' '}
                Want us to find savings in your expenses?
              </Text>
              <TouchableOpacity style={styles.findSavingsBtn} onPress={() => router.back()}>
                <Text style={styles.findSavingsText}>← Go back to tips</Text>
              </TouchableOpacity>
            </TipCard>
          )}
        </Card>
      )}

      {selected && <Button label="Save my plan 🛡" onPress={handleSave} />}

      <Disclaimer />
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  question: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  questionSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  options: { gap: Spacing.sm },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.bgSecondary },
  optionBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  optionLabel: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  optionLabelOn: { color: Colors.primaryDeep },
  optionSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  calcTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  label: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  hint: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginBottom: 8, marginTop: -4, lineHeight: 16 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  monthBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  monthBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  monthBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  monthBtnText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '500' },
  monthBtnTextOn: { color: Colors.primaryDeep, fontWeight: '700' },
  fundTypeBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.bgSecondary, marginBottom: Spacing.sm },
  fundTypeBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  fundTypeLabel: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  fundTypeLabelOn: { color: Colors.primaryDeep },
  fundTypeSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, lineHeight: 16 },
  calcResult: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, gap: 6, marginBottom: Spacing.sm },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  calcValue: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  pctText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.sm },
  findSavingsBtn: { marginTop: Spacing.sm, paddingVertical: 9, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center' },
  findSavingsText: { fontSize: Typography.sizes.base, color: '#fff', fontWeight: '500' },
});
