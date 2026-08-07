// What if I add more? — the forward what-if (FCC detailed design v1.1, Invest sheet), the promised
// companion to Look back. One dial (+$/mo) against the SAME shared plan inputs the hub uses:
// projected nest egg at retirement and the will-it-last chance, before → after, every figure an
// estimate. Prefillable (?addMonthly=) so the 401(k)-room nudge lands here with its number.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { simulate, projectNestEgg } from '../domain/retirement';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { resolveNetWorthRows } from '../domain/snapshot';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { PlanSlider } from '../components/PlanSlider';
import { InfoDot, TRYING_IT_OUT } from '../components/UI';

const STEP = 100;

export default function WhatIfScreen() {
  const params = useLocalSearchParams<{ addMonthly?: string }>();
  const store = useStore() as any;
  const router = useRouter();
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const [addMonthly, setAddMonthly] = useState(() => {
    const n = parseInt(String(params.addMonthly ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? Math.round(n / STEP) * STEP : 500;
  });

  // APPROVED lookahead-v3 FINAL (2026-07-19): the two plan basics live ON this screen as sliders
  // and SAVE to the one plan — age → onboardingProfile.birthYear, retire-at → the Plan hub's own
  // retirementAssumptions.retireAge. No duplicate fields (detailed design v1.2).
  const thisYear = new Date().getFullYear();
  const [age, setAge] = useState<number>(() => {
    const a = op.birthYear ? thisYear - Number(op.birthYear) : NaN;
    return Number.isFinite(a) && a >= 18 && a <= 95 ? a : 45;
  });
  const [sliding, setSliding] = useState(false);   // a finger is on a slider → the ScrollView stands down
  const [retireAt, setRetireAt] = useState<number>(() => {
    const r = Number(A.retireAge ?? op.targetRetirementAge);
    return Number.isFinite(r) && r > 0 ? Math.max(r, age + 1) : Math.max(67, age + 1);
  });
  const saveAge = (v: number) => {
    store.setOnboardingProfile?.({ ...op, birthYear: String(thisYear - v) });
    if (retireAt <= v) { setRetireAt(v + 1); store.setRetirementAssumptions?.({ retireAge: v + 1 }); }
  };
  const saveRetireAt = (v: number) => store.setRetirementAssumptions?.({ retireAge: Math.max(v, age + 1) });

  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);
  // the sliders' values drive the math LIVE (the same values they save)
  const inputs = useMemo(
    () => willItLastInputs({
      op: { ...op, birthYear: String(thisYear - age) },
      accounts,
      assumptions: { ...A, retireAge: Math.max(retireAt, age + 1) },
      inflationRate: store.inflationRate, employmentStatus: store.employmentStatus,
    }),
    [op, accounts, A, age, retireAt, store.inflationRate, store.employmentStatus]);

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

  // v3 FINAL: the sliders supply age and retire-at, so the "plan basics" empty state is GONE.
  // Remaining gates: no accounts (nothing to grow) and no retirement earmarks.
  const hasAccounts = (accounts ?? []).some((a: any) => (a.balance || 0) > 0);
  const missing = result != null ? null
    : !hasAccounts ? 'accounts' as const
    : 'earmarks' as const;                // accounts exist but none are earmarked for retirement

  return (
    // B46 finding: the ScrollView must stand down while a finger drags a slider — its native pan
    // recognizer was cancelling the drag no matter what the slider requested (device-only).
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} scrollEnabled={!sliding}>
      <Text style={s.h1}>What if I save more?</Text>
      <Text style={s.banner}>{TRYING_IT_OUT}</Text>

      {/* the dial only renders when it can actually compute something (a dead control confuses) */}
      {result != null && !result.retired && (
        <View style={s.card}>
          <Text style={s.cardHdr}>IF YOU SAVE MORE EACH MONTH</Text>
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
      )}

      {/* ABOUT YOU — the two plan basics, asked where they're needed, saved to the ONE plan */}
      {hasAccounts && (
        <View style={s.card}>
          <Text style={s.cardHdr}>ABOUT YOU — SAVED TO YOUR PLAN</Text>
          <PlanSlider label="Your age" value={age} min={25} max={80}
            onChange={setAge} onSettle={saveAge} onDraggingChange={setSliding} />
          <PlanSlider label="Retire at" value={Math.max(retireAt, age + 1)} min={Math.max(50, age + 1)} max={75}
            onChange={setRetireAt} onSettle={saveRetireAt} onDraggingChange={setSliding} />
          <Text style={s.savedNote}>✓ Saved — Home, Plan and this screen all use these same answers.</Text>
        </View>
      )}

      {missing === 'accounts' ? (
        <View style={s.card}>
          <Text style={s.note}>Connect or add your accounts first — then this screen can show what an extra monthly amount would do. No guessed numbers.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.emptyLink} onPress={() => router.push('/connect')}
            accessibilityLabel="Connect or add an account"><Text style={s.emptyLinkT}>Connect or add an account ›</Text></TouchableOpacity>
        </View>
      ) : missing === 'earmarks' ? (
        <View style={s.card}>
          <Text style={s.note}>Your accounts are in, but none of them is earmarked for retirement yet — open an account and set how much of it counts toward retirement.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.emptyLink} onPress={() => router.push('/(tabs)/analytics')}
            accessibilityLabel="Open Net worth to pick an account"><Text style={s.emptyLinkT}>Open your accounts ›</Text></TouchableOpacity>
        </View>
      ) : result?.retired ? (
        <View style={s.card}>
          <Text style={s.note}>You're already drawing down, so monthly contributions aren't the lever — the Plan tab's scenarios (spending, claim timing) are where your choices live.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.emptyLink} onPress={() => router.push('/(tabs)/plan')}
            accessibilityLabel="Open the Plan tab"><Text style={s.emptyLinkT}>Open the Plan tab ›</Text></TouchableOpacity>
        </View>
      ) : result != null && !result.retired ? (
        <View style={s.card} accessible
          accessibilityLabel={`Estimates at age ${result.retireAge}: nest egg ${spokenMoney(result.before.egg)} becomes ${spokenMoney(result.after.egg)}; the chance your money lasts ${result.before.chance} percent becomes ${result.after.chance} percent.`}>
          <Text style={s.cardHdr}>AT {result.retireAge} (ESTIMATES)</Text>
          {/* the payoff leads (audit WI-1): the delta is why the screen exists */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.deltaHero}>{result.after.egg - result.before.egg >= 0 ? '+' : '\u2212'}{maskedMoney(Math.abs(result.after.egg - result.before.egg))}</Text>
            <InfoDot term="nestEggMath" />
            <Text style={s.deltaSub}>more by {result.retireAge} — an estimate</Text>
          </View>
          <View style={s.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.rowL}>Projected nest egg</Text>
              <InfoDot term="nestEggMath" />
            </View>
            <Text style={s.rowV}>{`${maskedMoney(result.before.egg)} → ${maskedMoney(result.after.egg)}`}</Text>
          </View>
          <Row label="Will my money last?" value={`${result.before.chance}% → ${result.after.chance}%`} />
          <Text style={s.note}>Same plan, same market assumptions — only the monthly amount moved. Changing what you put in happens at your employer or brokerage; we just show the math.</Text>
        </View>
      ) : null}
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
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  savedNote: { fontSize: 11, fontWeight: '600', color: Colors.primaryDark, marginTop: 10 },
  emptyLink: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  emptyLinkT: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  banner: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginTop: 4 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgSecondary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  dial: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, minWidth: 140, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 10 },
  rowL: { fontSize: 15, color: Colors.textPrimary },
  rowV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  deltaHero: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'], marginBottom: 6 },
  deltaSub: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
});
