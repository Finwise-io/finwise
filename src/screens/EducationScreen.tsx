// 529 / education savings planner — what college will cost, whether you're on track, and the
// monthly contribution to close the gap. Can save the gap as a goal.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { educationPlan } from '../domain/planning';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function EducationScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const [cost, setCost] = useState('30000');
  const [yearsUntil, setYearsUntil] = useState('10');
  const [yearsSchool, setYearsSchool] = useState('4');
  const [saved, setSaved] = useState('');
  const [ret, setRet] = useState('6');
  const [infl, setInfl] = useState('5');

  const plan = useMemo(() => educationPlan({
    currentAnnualCost: num(cost), yearsUntilStart: num(yearsUntil), yearsOfSchool: num(yearsSchool),
    currentSavings: num(saved), returnRate: num(ret) / 100, costInflation: num(infl) / 100,
  }), [cost, yearsUntil, yearsSchool, saved, ret, infl]);

  const valid = num(cost) > 0 && num(yearsSchool) > 0;
  const tone = plan.onTrackPct >= 100 ? Colors.primary : plan.onTrackPct >= 50 ? Colors.amber : Colors.red;

  const saveGoal = () => {
    store.addGoal?.({ label: 'College fund', icon: '🎓', target: Math.round(plan.futureTotalCost), saved: num(saved), duration: String(num(yearsUntil) * 12), color: Colors.primary });
    Alert.alert('Goal added', 'Your college fund is now in Goals — track it alongside everything else.');
    router.back();
  };

  const field = (label: string, v: string, set: (t: string) => void, suffix?: string) => (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldL}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={v} onChangeText={set} placeholderTextColor={Colors.textTertiary} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>College planner</Text>
      <Text style={styles.sub}>What it'll cost, whether you're on track, and how much to set aside each month.</Text>

      <View style={styles.card}>
        <View style={styles.row}>{field('Cost per year (today)', cost, setCost, '$')}{field('Years until college', yearsUntil, setYearsUntil)}</View>
        <View style={styles.row}>{field('Years of school', yearsSchool, setYearsSchool)}{field('Saved so far', saved, setSaved, '$')}</View>
        <View style={styles.row}>{field('Return %', ret, setRet, '%')}{field('Cost inflation %', infl, setInfl, '%')}</View>
      </View>

      {valid && (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Projected total cost</Text>
            <Text style={styles.heroVal}>{money(plan.futureTotalCost)}</Text>
            <Text style={styles.heroSub}>for {num(yearsSchool)} years, starting in {num(yearsUntil)} years</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.trackHead}>
              <Text style={[styles.trackPct, { color: tone }]}>{plan.onTrackPct}%</Text>
              <Text style={styles.trackTxt}>{plan.onTrackPct >= 100 ? 'fully funded — nice.' : 'of the goal already on track from what you\'ve saved'}</Text>
            </View>
            {plan.gap > 0 && (
              <View style={styles.gapCard}>
                <Text style={styles.gapHero}>{money(plan.monthlyNeeded)}/mo</Text>
                <Text style={styles.gapTxt}>set aside monthly closes the {money(plan.gap)} gap by the time school starts.</Text>
              </View>
            )}
          </View>

          {plan.gap > 0 && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveGoal}>
              <Text style={styles.saveBtnT}>＋ Save as a goal</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <Text style={styles.foot}>A 529 plan grows tax-free for qualified education costs in the US. Estimates only — actual costs and returns vary.</Text>
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
  fieldL: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary },
  suffix: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700' },
  hero: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, padding: Spacing.lg, marginTop: 12, alignItems: 'center' },
  heroLabel: { color: Colors.onDeepTint, fontSize: 13, fontWeight: '700' },
  heroVal: { color: Colors.white, fontSize: 38, fontWeight: '800', marginTop: 4 },
  heroSub: { color: Colors.onDeepTint, fontSize: 13, marginTop: 4 },
  trackHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackPct: { fontSize: 30, fontWeight: '800' },
  trackTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  gapCard: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: 10 },
  gapHero: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  gapTxt: { fontSize: 13, color: Colors.textPrimary, marginTop: 2, lineHeight: 20 },
  bold: { fontWeight: '800' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
