// What if I add more? — the forward what-if (FCC detailed design v1.1, Invest sheet), the promised
// companion to Look back. One dial (+$/mo) against the SAME shared plan inputs the hub uses:
// projected nest egg at retirement and the will-it-last chance, before → after, every figure an
// estimate. Prefillable (?addMonthly=) so the 401(k)-room nudge lands here with its number.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { simulate, projectNestEgg } from '../domain/retirement';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { resolveNetWorthRows } from '../domain/snapshot';
import { maskedMoney } from '../components/useMoney';

const STEP = 100;

export default function WhatIfScreen() {
  const params = useLocalSearchParams<{ addMonthly?: string }>();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const [addMonthly, setAddMonthly] = useState(() => {
    const n = parseInt(String(params.addMonthly ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? Math.round(n / STEP) * STEP : 500;
  });

  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);
  const inputs = useMemo(
    () => willItLastInputs({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, A, store.inflationRate, store.employmentStatus]);

  const result = useMemo(() => {
    if (!inputs || inputs.start_balance <= 0) return null;
    if (inputs.retire_age <= inputs.current_age) return { retired: true } as const;   // already retired — adding more isn't the lever
    const withExtra = { ...inputs, annual_contribution: inputs.annual_contribution + addMonthly * 12 };
    return {
      retired: false as const,
      retireAge: inputs.retire_age,
      before: { egg: projectNestEgg(inputs).will_have, chance: simulate(inputs).chance_of_success },
      after: { egg: projectNestEgg(withExtra).will_have, chance: simulate(withExtra).chance_of_success },
    };
  }, [inputs, addMonthly]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.banner}>Trying it out — this changes nothing; every figure is an estimate.</Text>

      <View style={s.card}>
        <Text style={s.cardHdr}>IF YOU ADD MORE EACH MONTH</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setAddMonthly((n) => Math.max(0, n - STEP))}
            accessibilityLabel="Lower the extra monthly amount by $100">
            <Text style={s.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={s.dial}>+{maskedMoney(addMonthly)}/mo</Text>
          <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setAddMonthly((n) => n + STEP)}
            accessibilityLabel="Raise the extra monthly amount by $100">
            <Text style={s.stepTxt}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {result == null ? (
        <View style={s.card}>
          <Text style={s.note}>Add your accounts and plan basics first — then this screen can show what an extra monthly amount would do. No guessed numbers.</Text>
        </View>
      ) : result.retired ? (
        <View style={s.card}>
          <Text style={s.note}>You're already drawing down, so monthly contributions aren't the lever — the Plan tab's scenarios (spending, claim timing) are where your choices live.</Text>
        </View>
      ) : (
        <View style={s.card} accessible
          accessibilityLabel={`Estimates at age ${result.retireAge}: nest egg ${maskedMoney(result.before.egg)} becomes ${maskedMoney(result.after.egg)}; the chance your money lasts ${result.before.chance} percent becomes ${result.after.chance} percent.`}>
          <Text style={s.cardHdr}>AT {result.retireAge} (ESTIMATES)</Text>
          {/* the payoff leads (audit WI-1): the delta is why the screen exists */}
          <Text style={s.deltaHero}>{result.after.egg - result.before.egg >= 0 ? '+' : '\u2212'}{maskedMoney(Math.abs(result.after.egg - result.before.egg))}<Text style={s.deltaSub}>  more by {result.retireAge} — an estimate</Text></Text>
          <Row label="Projected nest egg" value={`${maskedMoney(result.before.egg)} → ${maskedMoney(result.after.egg)}`} />
          <Row label="Will my money last?" value={`${result.before.chance}% → ${result.after.chance}%`} />
          <Text style={s.note}>Same plan, same market assumptions — only the monthly amount moved. Changing what you put in happens at your employer or brokerage; we just show the math.</Text>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowL}>{label}</Text>
      <Text style={s.rowV}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  banner: { fontSize: 12.5, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginTop: 4 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgSecondary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  dial: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, minWidth: 140, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 10 },
  rowL: { fontSize: 15, color: Colors.textPrimary },
  rowV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  deltaHero: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'], marginBottom: 6 },
  deltaSub: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  note: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
});
