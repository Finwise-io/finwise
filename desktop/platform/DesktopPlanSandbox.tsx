// DESKTOP-ONLY inline sandbox (approved shell mock, Plan window right column, 2026-08-03).
// One brain: the SAME simulate() the verdict runs, patched ONLY on dials the user moved, so at
// rest the sandbox % IS the plan % — the two can never disagree. Adoption goes through the SAME
// store.adoptPlan the cockpit uses (preview → confirm; revert stays available on the hub).
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Radii } from '../../src/utils/theme';
import { simulate, RetirementInputs } from '../../src/domain/retirement';
import { lensChanceWord } from '../../src/domain/planning/hub';
import { maskedMoney } from '../../src/components/useMoney';
import { useStore } from '../../src/store/useStore';

export function DesktopPlanSandbox({ lens, inputs, planChance }: {
  lens: 'retired' | string; inputs: RetirementInputs; planChance: number;
}) {
  const store = useStore() as any;
  const retireBase = inputs.retire_age;
  const saveBase = Math.round(inputs.annual_contribution / 12);
  const spendBase = Math.round(inputs.retire_monthly_spend_today);
  const horizonBase = inputs.horizon_age;
  const [tryRetire, setTryRetire] = useState(retireBase);
  const [trySave, setTrySave] = useState(saveBase);
  const [trySpend, setTrySpend] = useState(spendBase);
  const [tryHorizon, setTryHorizon] = useState(horizonBase);

  const patch: Partial<RetirementInputs> = {};
  if (tryRetire !== retireBase) patch.retire_age = tryRetire;
  if (trySave !== saveBase) patch.annual_contribution = Math.max(0, trySave) * 12;
  if (trySpend !== spendBase) patch.retire_monthly_spend_today = trySpend;
  if (tryHorizon !== horizonBase) patch.horizon_age = tryHorizon;
  const dirty = Object.keys(patch).length > 0;

  const tryChance = useMemo(
    () => (dirty ? simulate({ ...inputs, ...patch }).chance_of_success : planChance),
    [inputs, planChance, tryRetire, trySave, trySpend, tryHorizon],   // eslint-disable-line react-hooks/exhaustive-deps
  );
  const delta = tryChance - planChance;

  const moved: string[] = [];
  if (patch.retire_age != null) moved.push(`retiring at ${tryRetire}`);
  if (patch.annual_contribution != null) moved.push(`saving ${maskedMoney(trySave)}/mo`);
  if (patch.retire_monthly_spend_today != null) moved.push(`spending ${maskedMoney(trySpend)}/mo`);
  if (patch.horizon_age != null) moved.push(`planning to ${tryHorizon}`);
  const deltaLine = !dirty
    ? 'move a dial — the odds re-run live'
    : `${moved.join(' + ')} ${delta < 0 ? `costs ${-delta} point${delta === -1 ? '' : 's'}` : delta > 0 ? `adds ${delta} point${delta === 1 ? '' : 's'}` : 'moves the odds by 0 points'} — see it before you decide`;

  const reset = () => { setTryRetire(retireBase); setTrySave(saveBase); setTrySpend(spendBase); setTryHorizon(horizonBase); };

  // F11 #16: adoption previews EXACTLY which numbers change, then writes through the one shared
  // adoptPlan action (which snapshots the old plan so "Back to previous plan" appears on the hub).
  const adopt = () => {
    const changes: string[] = [];
    const a: Record<string, number> = {};
    if (patch.retire_age != null) { changes.push(`Retire at: ${retireBase} → ${tryRetire}`); a.retireAge = tryRetire; }
    if (patch.annual_contribution != null) { changes.push(`Save each month: ${maskedMoney(saveBase)} → ${maskedMoney(trySave)}`); a.contribMonthly = trySave; }
    if (patch.retire_monthly_spend_today != null) { changes.push(`Spend each month: ${maskedMoney(spendBase)} → ${maskedMoney(trySpend)}`); a.spendMonthly = trySpend; }
    if (patch.horizon_age != null) { changes.push(`Plan-to age: ${horizonBase} → ${tryHorizon}`); a.horizonAge = tryHorizon; }
    Alert.alert('Use this as your plan?', `${changes.join('\n')}\n\nYour odds become ${tryChance}%. One tap on the hub switches back.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use as my plan', onPress: () => store.adoptPlan?.(a, 'Plan-page sandbox') },
    ]);
  };

  const dials = lens === 'retired'
    ? [
        { label: 'Spend / month', value: maskedMoney(trySpend), down: () => setTrySpend((v) => Math.max(500, v - 100)), up: () => setTrySpend((v) => v + 100) },
        { label: 'Plan-to age', value: String(tryHorizon), down: () => setTryHorizon((v) => Math.max(inputs.current_age + 1, v - 1)), up: () => setTryHorizon((v) => Math.min(105, v + 1)) },
      ]
    : [
        { label: 'Retire at age', value: String(tryRetire), down: () => setTryRetire((v) => Math.max(Math.max(50, inputs.current_age + 1), v - 1)), up: () => setTryRetire((v) => Math.min(80, v + 1)) },
        { label: 'Save / month', value: maskedMoney(trySave), down: () => setTrySave((v) => Math.max(0, v - 100)), up: () => setTrySave((v) => v + 100) },
        { label: 'Spend / month in retirement', value: maskedMoney(trySpend), down: () => setTrySpend((v) => Math.max(500, v - 100)), up: () => setTrySpend((v) => v + 100) },
      ];

  return (
    <View style={s.card} testID="desktop-plan-sandbox">
      <Text style={s.kicker}>TRY WHAT-IFS — A SANDBOX · NOTHING CHANGES UNTIL YOU TAP “USE AS MY PLAN”</Text>
      {dials.map((d) => (
        <View key={d.label} style={s.dialRow}>
          <Text style={s.dialLabel}>{d.label}</Text>
          <View style={s.dialCtrls}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${d.label} down`} style={s.step} onPress={d.down}><Text style={s.stepTxt}>−</Text></TouchableOpacity>
            <Text style={s.dialValue}>{d.value}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${d.label} up`} style={s.step} onPress={d.up}><Text style={s.stepTxt}>＋</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={s.verdictRow} accessible accessibilityLabel={`Sandbox odds: ${lensChanceWord(lens, tryChance)}, ${tryChance} percent, an estimate. ${deltaLine}`}>
        <Text style={s.word}>{lensChanceWord(lens, tryChance)}</Text>
        <Text style={s.pct}> — {tryChance}% · estimate</Text>
      </View>
      <Text style={s.deltaLine}>{deltaLine}</Text>
      {dirty && (
        <>
          <TouchableOpacity accessibilityRole="button" style={s.adoptBtn} onPress={adopt}
            accessibilityLabel={`Use as my plan — previews exactly what changes before anything is saved`}>
            <Text style={s.adoptTxt}>Use as my plan</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={reset} accessibilityLabel="Back to your plan — clears the what-if dials">
            <Text style={s.resetTxt}>back to your plan</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderStyle: 'dashed', marginTop: 12 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: Colors.textTertiary, marginBottom: 10 },
  dialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  dialLabel: { fontSize: 13, color: Colors.textSecondary, flexShrink: 1, paddingRight: 8 },
  dialCtrls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F2F1EC', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  dialValue: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, minWidth: 76, textAlign: 'center', fontVariant: ['tabular-nums'] },
  verdictRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  word: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pct: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  deltaLine: { fontSize: 13, color: Colors.textTertiary, marginTop: 3 },
  adoptBtn: { backgroundColor: Colors.primary, borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  adoptTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  resetTxt: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: 10, textDecorationLine: 'underline' },
});
