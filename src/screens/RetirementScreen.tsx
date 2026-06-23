import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Card, DarkCard, ProgressBar, TipCard, Button } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { InputModal } from '../components/InputModal';

const CONTRIB_SOURCES = ['401(k)', 'Roth 401(k)', 'IRA', 'Roth IRA', 'Brokerage', 'Other'];

export default function RetirementScreen() {
  const { investments, savings, addInvestment, retirementPlan, setRetirementPlan, inflationRate } = useStore() as any;

  const plan = retirementPlan;

  const [currentAge,    setCurrentAge]    = useState(plan?.currentAge    ? String(plan.currentAge)    : '');
  const [retireAge,     setRetireAge]     = useState(plan?.retireAge     ? String(plan.retireAge)     : '65');
  const [monthlyIncome, setMonthlyIncome] = useState(plan?.monthlyIncome ? String(plan.monthlyIncome) : '');
  const [monthlyContrib,setMonthlyContrib]= useState(plan?.monthlyContribution ? String(plan.monthlyContribution) : '');
  const [employerMatch, setEmployerMatch] = useState(plan?.employerMonthlyMatch ? String(plan.employerMonthlyMatch) : '');
  const [expectedReturn,setExpectedReturn]= useState(plan?.expectedReturn ? String(plan.expectedReturn) : '7');
  const [nestEggYears,  setNestEggYears]  = useState(plan?.nestEggYears  ? String(plan.nestEggYears)  : '20');
  const [modalVisible,  setModalVisible]  = useState(false);
  const [contribSource, setContribSource] = useState('401(k)');

  const totalSavings = savings.reduce((s: number, e: any) => s + e.amount, 0);
  const totalInvested = investments.reduce((s: number, e: any) => s + e.amount, 0);
  const currentNestEgg = totalSavings + totalInvested;

  const yearsToRetire  = Math.max(0, parseInt(retireAge || '65') - parseInt(currentAge || '0'));
  const monthsToRetire = yearsToRetire * 12;
  const annualIncome   = (parseFloat(monthlyIncome) || 0) * 12;
  const retirementTarget = annualIncome * parseInt(nestEggYears || '20');

  const r      = (parseFloat(expectedReturn) || 7) / 100 / 12;
  const contrib = parseFloat(monthlyContrib) || 0;
  const match   = parseFloat(employerMatch) || 0;
  const effectiveMonthly = contrib + match;

  // Nominal future value
  const futureValue = monthsToRetire > 0 && r > 0
    ? currentNestEgg * Math.pow(1 + r, monthsToRetire) +
      effectiveMonthly * ((Math.pow(1 + r, monthsToRetire) - 1) / r)
    : currentNestEgg;

  // Real (inflation-adjusted) future value
  const inflRate = (inflationRate || 3.2) / 100;
  const realFutureValue = yearsToRetire > 0
    ? futureValue / Math.pow(1 + inflRate, yearsToRetire)
    : futureValue;

  const monthlyNeeded = monthsToRetire > 0 && retirementTarget > futureValue
    ? Math.max(0, (retirementTarget - currentNestEgg * Math.pow(1 + r, monthsToRetire)) /
        ((Math.pow(1 + r, monthsToRetire) - 1) / r) - match)
    : 0;

  const onTrack    = futureValue >= retirementTarget;
  const pct        = retirementTarget > 0 ? Math.min((currentNestEgg / retirementTarget) * 100, 100) : 0;
  const projectedPct = retirementTarget > 0 ? Math.min((futureValue / retirementTarget) * 100, 100) : 0;

  // Auto-save to store whenever any input changes
  const savePlan = useCallback(() => {
    const age = parseInt(currentAge);
    const rAge = parseInt(retireAge || '65');
    if (!age || age < 1 || age > 100) return;
    setRetirementPlan({
      currentAge: age,
      retireAge: rAge,
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      currentSavings: currentNestEgg,
      monthlyContribution: parseFloat(monthlyContrib) || 0,
      employerMonthlyMatch: parseFloat(employerMatch) || 0,
      expectedReturn: parseFloat(expectedReturn) || 7,
      nestEggYears: parseInt(nestEggYears) || 20,
      targetYear: new Date().getFullYear() + yearsToRetire,
    });
  }, [currentAge, retireAge, monthlyIncome, monthlyContrib, employerMatch, expectedReturn, nestEggYears, currentNestEgg]);

  useEffect(() => { savePlan(); }, [savePlan]);

  function handleAddContrib(value: string) {
    const amt = parseFloat(value || '0');
    if (amt > 0) {
      addInvestment({ amount: amt, type: contribSource + ' contribution', date: new Date().toISOString() });
    }
    setModalVisible(false);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Log contribution modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Log a contribution</Text>
            <Text style={styles.modalSub}>Which account is this going into?</Text>
            <View style={styles.sourceRow}>
              {CONTRIB_SOURCES.map(src => (
                <TouchableOpacity key={src}
                  style={[styles.sourceBtn, contribSource === src && styles.sourceBtnOn]}
                  onPress={() => setContribSource(src)}>
                  <Text style={[styles.sourceBtnText, contribSource === src && styles.sourceBtnTextOn]}>{src}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Amount ($)</Text>
            <ContribInput onConfirm={handleAddContrib} onCancel={() => setModalVisible(false)} />
          </View>
        </View>
      )}

      {/* Status card */}
      <DarkCard>
        <Text style={styles.cardLabel}>Retirement nest egg</Text>
        <Text style={styles.bigAmt}>${currentNestEgg.toLocaleString()}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <View style={styles.pctRow}>
          <Text style={styles.pctText}>{Math.round(pct)}% of target</Text>
          <Text style={styles.pctGoal}>Goal: ${retirementTarget.toLocaleString()}</Text>
        </View>
        {yearsToRetire > 0 && (
          <View style={styles.yearsRow}>
            <Text style={styles.yearsText}>⏱ {yearsToRetire} years until retirement</Text>
          </View>
        )}
      </DarkCard>

      {/* On track indicator */}
      {monthlyIncome && currentAge && (
        <View style={[styles.trackCard, onTrack ? styles.trackOk : styles.trackBehind]}>
          <Text style={styles.trackIcon}>{onTrack ? '✅' : '⚠️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trackTitle, { color: onTrack ? Colors.primaryDeep : Colors.red }]}>
              {onTrack ? 'You\'re on track!' : 'You\'re behind — let\'s fix that'}
            </Text>
            <Text style={[styles.trackSub, { color: onTrack ? Colors.primaryDark : '#791F1F' }]}>
              {onTrack
                ? `Projected: $${Math.round(futureValue).toLocaleString()} at retirement`
                : `Need ~$${Math.round(monthlyNeeded).toLocaleString()}/mo more to reach goal`}
            </Text>
          </View>
        </View>
      )}

      {/* Setup */}
      <Card>
        <Text style={styles.sectionTitle}>Your retirement details</Text>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Current age</Text>
            <TextInput style={styles.input} value={currentAge} onChangeText={setCurrentAge}
              placeholder="35" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Retire at age</Text>
            <TextInput style={styles.input} value={retireAge} onChangeText={setRetireAge}
              placeholder="65" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
          </View>
        </View>

        <Text style={styles.inputLabel}>Monthly income ($)</Text>
        <TextInput style={styles.input} value={monthlyIncome} onChangeText={setMonthlyIncome}
          placeholder="5000" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />

        <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Your monthly contribution ($)</Text>
        <Text style={styles.inputHint}>Amount you add to retirement accounts each month</Text>
        <View style={styles.quickRow}>
          {['100', '250', '500', '750', '1000'].map(amt => (
            <TouchableOpacity key={amt}
              style={[styles.quickBtn, monthlyContrib === amt && styles.quickBtnOn]}
              onPress={() => setMonthlyContrib(amt)}>
              <Text style={[styles.quickText, monthlyContrib === amt && styles.quickTextOn]}>${amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} value={monthlyContrib} onChangeText={setMonthlyContrib}
          placeholder="500" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />

        <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Employer monthly match ($)</Text>
        <Text style={styles.inputHint}>How much does your employer add to your retirement each month?</Text>
        <TextInput style={styles.input} value={employerMatch} onChangeText={setEmployerMatch}
          placeholder="0" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
        {match > 0 && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>
              💼 Effective total: ${(contrib + match).toFixed(0)}/mo  (you ${contrib.toFixed(0)} + employer ${match.toFixed(0)})
            </Text>
          </View>
        )}

        {monthlyIncome ? (
          <TipCard color="green">
            <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 18 }}>
              💡 Advisors recommend 10–15% of income for retirement.
              At your income that's ${((parseFloat(monthlyIncome) || 0) * 0.12).toFixed(0)}/month.
            </Text>
          </TipCard>
        ) : null}

        <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Expected annual return (%)</Text>
        <View style={styles.returnRow}>
          {['4', '5', '6', '7', '8', '10'].map(rv => (
            <TouchableOpacity key={rv} style={[styles.returnBtn, expectedReturn === rv && styles.returnBtnOn]}
              onPress={() => setExpectedReturn(rv)}>
              <Text style={[styles.returnText, expectedReturn === rv && styles.returnTextOn]}>{rv}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Nest egg size</Text>
        <Text style={styles.inputHint}>How many years of income do you want saved?</Text>
        <View style={styles.nestRow}>
          {['10', '15', '20', '25', '30'].map(y => (
            <TouchableOpacity key={y} style={[styles.nestBtn, nestEggYears === y && styles.nestBtnOn]}
              onPress={() => setNestEggYears(y)}>
              <Text style={[styles.nestText, nestEggYears === y && styles.nestTextOn]}>{y}yr</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* High allocation warning */}
      {monthlyIncome && monthlyContrib && (() => {
        const income = parseFloat(monthlyIncome) || 0;
        const c = parseFloat(monthlyContrib) || 0;
        return income > 0 && c > income * 0.5 ? (
          <TipCard color="red">
            <Text style={{ fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.red, marginBottom: 4 }}>⚠️ High retirement allocation</Text>
            <Text style={{ fontSize: Typography.sizes.sm, color: '#791F1F', lineHeight: 20 }}>
              Your contribution (${c.toFixed(0)}/mo) is over 50% of income (${income.toFixed(0)}/mo).
              Make sure this leaves enough for living expenses.
            </Text>
          </TipCard>
        ) : null;
      })()}

      {/* Projections */}
      {monthlyIncome && currentAge && (
        <Card>
          <Text style={styles.sectionTitle}>Projections</Text>

          <View style={styles.projGrid}>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Retirement target</Text>
              <Text style={styles.projValue}>${retirementTarget.toLocaleString()}</Text>
            </View>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Projected (nominal)</Text>
              <Text style={[styles.projValue, { color: onTrack ? Colors.primary : Colors.red }]}>
                ${Math.round(futureValue).toLocaleString()}
              </Text>
            </View>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>In today's dollars</Text>
              <Text style={[styles.projValue, { color: Colors.amber }]}>
                ${Math.round(realFutureValue).toLocaleString()}
              </Text>
            </View>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>Monthly shortfall</Text>
              <Text style={[styles.projValue, { color: onTrack ? Colors.primary : Colors.red }]}>
                {onTrack ? '—' : `$${Math.round(monthlyNeeded).toLocaleString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.inflationNote}>
            <Text style={styles.inflationNoteText}>
              📊 "In today's dollars" adjusts for {(inflationRate || 3.2).toFixed(1)}% annual inflation over {yearsToRetire} years.
              Your nominal ${Math.round(futureValue).toLocaleString()} will have the purchasing power of ${Math.round(realFutureValue).toLocaleString()} today.
            </Text>
          </View>

          <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Projected progress at retirement</Text>
          <ProgressBar pct={projectedPct} color={onTrack ? Colors.primary : Colors.red} />
          <Text style={{ fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 4 }}>
            {Math.round(projectedPct)}% of target reached
          </Text>
        </Card>
      )}

      {/* Tips */}
      <TipCard color={onTrack ? 'green' : 'amber'}>
        <Text style={{ fontSize: Typography.sizes.base, fontWeight: '700', color: onTrack ? Colors.primaryDeep : Colors.amber, marginBottom: 4 }}>
          {onTrack ? '💡 Keep it up!' : '💡 Tips to get on track'}
        </Text>
        <Text style={{ fontSize: Typography.sizes.sm, color: onTrack ? Colors.primaryDeep : '#633806', lineHeight: 20 }}>
          {onTrack
            ? `At $${effectiveMonthly.toFixed(0)}/month at ${expectedReturn}% return, you'll have $${Math.round(futureValue).toLocaleString()} by retirement. Stay consistent!`
            : `Try increasing your monthly contribution by $${Math.max(50, Math.round((monthlyNeeded) / 50) * 50).toLocaleString()}. Even small increases compound significantly over time.`}
        </Text>
      </TipCard>

      <Button label="+ Log a contribution" onPress={() => setModalVisible(true)} />

      {/* Investment breakdown */}
      {investments.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Recent contributions</Text>
          {investments.slice(0, 5).map((inv: any) => (
            <View key={inv.id} style={styles.invRow}>
              <Text style={{ fontSize: 20 }}>📈</Text>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.invLabel}>{inv.type}</Text>
                <Text style={styles.invDate}>{new Date(inv.date).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.invAmt}>+${inv.amount.toFixed(2)}</Text>
            </View>
          ))}
        </Card>
      )}

      <Disclaimer />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ContribInput({ onConfirm, onCancel }: { onConfirm: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState('');
  return (
    <View>
      <TextInput
        style={{ backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: 18, color: Colors.textPrimary, marginBottom: 16 }}
        value={val} onChangeText={setVal} keyboardType="decimal-pad"
        placeholder="500.00" placeholderTextColor={Colors.textTertiary} autoFocus
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center' }} onPress={onCancel}>
          <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: Radii.md, backgroundColor: Colors.primary, alignItems: 'center' }} onPress={() => onConfirm(val)}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999, justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: Colors.cardBg, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, textAlign: 'center' },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sourceBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  sourceBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  sourceBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  sourceBtnTextOn: { color: Colors.primaryDeep },
  cardLabel: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  bigAmt: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: Spacing.sm },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: Colors.successGreen, borderRadius: 8 },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  pctText: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  pctGoal: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  yearsRow: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.2)' },
  yearsText: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  trackCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 0.5 },
  trackOk: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  trackBehind: { backgroundColor: Colors.redLight, borderColor: Colors.redMid },
  trackIcon: { fontSize: 28 },
  trackTitle: { fontSize: Typography.sizes.base, fontWeight: '700' },
  trackSub: { fontSize: Typography.sizes.sm, marginTop: 2 },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6, marginTop: Spacing.sm },
  inputHint: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginBottom: 6, marginTop: -4 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: 8 },
  quickBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  quickBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  quickText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  quickTextOn: { color: Colors.primaryDeep },
  matchBadge: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginTop: 6 },
  matchText: { fontSize: Typography.sizes.sm, color: Colors.primaryDeep, fontWeight: '500' },
  returnRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  returnBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  returnBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  returnText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '600' },
  returnTextOn: { color: Colors.primaryDeep, fontWeight: '700' },
  nestRow: { flexDirection: 'row', gap: Spacing.sm },
  nestBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  nestBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  nestText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  nestTextOn: { color: Colors.primaryDeep, fontWeight: '700' },
  projGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  projItem: { width: '47%', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.sm },
  projLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: 3 },
  projValue: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary },
  inflationNote: { backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: Spacing.sm, marginTop: Spacing.sm },
  inflationNoteText: { fontSize: Typography.sizes.xs, color: Colors.amber, lineHeight: 18 },
  invRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  invLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  invDate: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  invAmt: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.primary },
});
