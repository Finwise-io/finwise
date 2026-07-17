// Afford it all? — the multi-goal trade-off composer (FCC detailed design v1.1, Plan sheet; F4).
// Toggle several goals on together, set each one's monthly amount, and see two verdicts at once:
// does this month's money cover it (against the CANONICAL capacity — the Cash flow number), and
// what it does to retirement (age + will-it-last, from the ONE shared selector). Everything is a
// sandbox until the Use-this-plan sheet; adopted commitments then appear on Cash flow by name.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { weighGoals, trimHints, retireAgeWithContribution, type GoalDial } from '../domain/planning/multiGoal';
import { willItLastInputs, selectWillItLast, chanceWord } from '../domain/retirement/willItLast';
import { monthlySavings } from '../domain/savings';
import { requiredMonthly } from '../domain/goals';
import { resolveNetWorthRows } from '../domain/snapshot';
import { UseThisPlanSheet, type PlanChange } from '../components/UseThisPlanSheet';
import { maskedMoney } from '../components/useMoney';

const STEP = 100;

export default function MultiGoalScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const liabilities = store.liabilities ?? [];

  // dials start from the REAL goals (each at its required monthly pace) — off until toggled
  const [dials, setDials] = useState<GoalDial[]>(() =>
    ((store.goals ?? []) as any[]).filter((g) => (g.saved || 0) < (g.target || 0)).map((g) => ({
      id: String(g.id), label: g.label, on: false,
      monthlyAmount: Math.max(STEP, Math.round((requiredMonthly(g) ?? STEP) / STEP) * STEP),
      target: g.target, saved: g.saved,
    })));
  const [retirementMonthly, setRetirementMonthly] = useState<number>(() => Math.max(0, Math.round((A.contribMonthly ?? 500) / STEP) * STEP));
  const [extraDebt, setExtraDebt] = useState(0);
  const [whereOpen, setWhereOpen] = useState(false);
  const [adoptOpen, setAdoptOpen] = useState(false);

  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);
  const baseInputs = useMemo(
    () => willItLastInputs({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, A, store.inflationRate, store.employmentStatus]);
  // 'before' = the adopted plan — read from the same selector as the hub, never retyped
  const before = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, A, store.inflationRate, store.employmentStatus]);

  // 'before' retire age: the adopted plan's own contribution level through the same walk
  const beforeRetireAge = useMemo(
    () => baseInputs ? retireAgeWithContribution(baseInputs, (baseInputs.annual_contribution ?? 0) / 12) : null,
    [baseInputs]);

  // PIN: capacity = the canonical after-debt surplus the Cash flow tab speaks (one helper)
  const capacity = Math.max(0, Math.round(monthlySavings(op, liabilities)));
  const hasDebt = liabilities.some((d: any) => d.remaining_balance > 0);

  const weighed = useMemo(
    () => weighGoals({ dials, retirementMonthly, extraDebtMonthly: extraDebt, capacityMonthly: capacity, baseInputs, liabilities }),
    [dials, retirementMonthly, extraDebt, capacity, baseInputs, liabilities]);
  const hints = useMemo(
    () => trimHints({ dials, retirementMonthly, extraDebtMonthly: extraDebt, capacityMonthly: capacity, baseInputs, liabilities }),
    [dials, retirementMonthly, extraDebt, capacity, baseInputs, liabilities]);

  const setDial = (id: string, patch: Partial<GoalDial>) => setDials((ds) => ds.map((d) => d.id === id ? { ...d, ...patch } : d));
  const bump = (n: number, delta: number) => Math.max(0, n + delta);

  const onDials = dials.filter((d) => d.on);
  const commitments = [
    ...onDials.map((d) => ({ goalId: d.id, label: d.label, monthlyAmount: d.monthlyAmount })),
    ...(extraDebt > 0 ? [{ goalId: 'extra-debt', label: 'Extra on debt', monthlyAmount: extraDebt }] : []),
  ];
  const changes: PlanChange[] = [
    { label: 'Retirement saving', from: `${maskedMoney(A.contribMonthly ?? 0)}/mo`, to: `${maskedMoney(retirementMonthly)}/mo` },
    ...commitments.map((c) => ({ label: c.label, from: 'not in your plan', to: `${maskedMoney(c.monthlyAmount)}/mo` })),
  ];

  const saveScenario = () => {
    store.saveRetirementScenario?.(
      `Goals plan (${commitments.length} goal${commitments.length === 1 ? '' : 's'})`,
      { contribMonthly: retirementMonthly, commitments },
      weighed.retireAge ?? A.retireAge ?? 0, weighed.chance ?? 0,
    );
    router.back();
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.banner}>Trying it out — nothing changes until you tap Use this plan.</Text>

      {/* goal dials */}
      <Text style={s.section}>TRY THESE TOGETHER</Text>
      <View style={s.card}>
        {dials.length === 0 && (
          <View>
            <Text style={s.empty}>No goals yet — add one on the Goals screen and come back to weigh it against the rest.</Text>
            <TouchableOpacity accessibilityRole="button" style={s.emptyLink} onPress={() => router.push('/(tabs)/goals')}
              accessibilityLabel="Add a goal — opens the Goals screen"><Text style={s.emptyLinkT}>Add a goal ›</Text></TouchableOpacity>
          </View>
        )}
        {dials.map((d, i) => (
          <View key={d.id} style={[s.dialRow, i > 0 && s.divider]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch value={d.on} onValueChange={(v) => setDial(d.id, { on: v })} trackColor={{ true: Colors.primary }}
                accessibilityLabel={`${d.label} at ${maskedMoney(d.monthlyAmount)} a month`} />
              <Text style={s.dialLabel}>{d.label}</Text>
              <Text style={s.dialAmt}>{maskedMoney(d.monthlyAmount)}/mo</Text>
            </View>
            {d.on && (
              <View style={s.stepRow}>
                <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setDial(d.id, { monthlyAmount: bump(d.monthlyAmount, -STEP) })}
                  accessibilityLabel={`Lower ${d.label} by $100 a month`}><Text style={s.stepTxt}>−</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setDial(d.id, { monthlyAmount: bump(d.monthlyAmount, STEP) })}
                  accessibilityLabel={`Raise ${d.label} by $100 a month`}><Text style={s.stepTxt}>＋</Text></TouchableOpacity>
                {weighed.goalEnds[d.id] && <Text style={s.endDate}>done {weighed.goalEnds[d.id]}</Text>}
              </View>
            )}
          </View>
        ))}

        {/* extra on debt — its payoff month and interest saved come from the ONE payoffPlan path */}
        {hasDebt && (
          <View style={[s.dialRow, dials.length > 0 && s.divider]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch value={extraDebt > 0} onValueChange={(v) => setExtraDebt(v ? 300 : 0)} trackColor={{ true: Colors.primary }}
                accessibilityLabel={`Extra on debt at ${maskedMoney(extraDebt)} a month`} />
              <Text style={s.dialLabel}>Extra on debt</Text>
              <Text style={s.dialAmt}>{maskedMoney(extraDebt)}/mo</Text>
            </View>
            {extraDebt > 0 && (
              <View style={s.stepRow}>
                <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setExtraDebt(bump(extraDebt, -STEP))}
                  accessibilityLabel="Lower extra debt payment by $100 a month"><Text style={s.stepTxt}>−</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setExtraDebt(bump(extraDebt, STEP))}
                  accessibilityLabel="Raise extra debt payment by $100 a month"><Text style={s.stepTxt}>＋</Text></TouchableOpacity>
                {weighed.debtPayoff && <Text style={s.endDate}>paid off {weighed.debtPayoff.month} · saves {maskedMoney(weighed.debtPayoff.interestSaved)} interest</Text>}
              </View>
            )}
          </View>
        )}

        {/* the retirement dial — the money that stays pointed at the long run */}
        <View style={[s.dialRow, s.divider]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.dialLabel, { marginLeft: 0, fontWeight: '800' }]}>Keep retirement saving</Text>
            <Text style={s.dialAmt}>{maskedMoney(retirementMonthly)}/mo</Text>
          </View>
          <View style={s.stepRow}>
            <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setRetirementMonthly(bump(retirementMonthly, -STEP))}
              accessibilityLabel="Lower retirement saving by $100 a month"><Text style={s.stepTxt}>−</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.stepBtn} onPress={() => setRetirementMonthly(bump(retirementMonthly, STEP))}
              accessibilityLabel="Raise retirement saving by $100 a month"><Text style={s.stepTxt}>＋</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      {/* verdict — against the canonical capacity (your regular bills are already counted) */}
      <View style={s.card} accessible
        accessibilityLabel={`Can you do it all? ${weighed.covered ? `Covered, with ${maskedMoney(weighed.spare)} a month to spare` : `Short ${maskedMoney(Math.abs(weighed.spare))} a month`}`}>
        <Text style={s.cardHdr}>CAN YOU DO IT ALL?</Text>
        <Text style={s.hint}>Your regular bills, including the mortgage, are already counted.</Text>
        <Text style={[s.verdict, { color: weighed.covered ? Colors.primary : Colors.red }]}>
          {weighed.covered ? `Covered — ${maskedMoney(weighed.spare)}/mo to spare` : `Short ${maskedMoney(Math.abs(weighed.spare))}/mo`}
        </Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setWhereOpen(!whereOpen)} accessibilityLabel="Where the money goes">
          <Text style={s.link}>where the money goes {whereOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {whereOpen && (
          <View style={{ marginTop: 6 }}>
            <Row label="Free to put to work each month" value={maskedMoney(capacity)} />
            {onDials.map((d) => <Row key={d.id} label={d.label} value={`−${maskedMoney(d.monthlyAmount)}`} />)}
            {extraDebt > 0 && <Row label="Extra on debt" value={`−${maskedMoney(extraDebt)}`} />}
            <Row label="Retirement saving" value={`−${maskedMoney(retirementMonthly)}`} />
            <View style={s.rowDivider} />
            <Row label={weighed.covered ? 'Left over' : 'Short'} value={maskedMoney(Math.abs(weighed.spare))} strong />
          </View>
        )}
      </View>

      {/* effect on retirement — before = the hub's numbers, from the same selector */}
      {before.chance != null && weighed.chance != null && (
        <View style={s.card} accessible
          accessibilityLabel={`Effect on retirement: will-it-last ${before.chance} percent to ${weighed.chance} percent. Estimate, not a promise.`}>
          <Text style={s.cardHdr}>EFFECT ON RETIREMENT</Text>
          {beforeRetireAge != null && weighed.retireAge != null && (
            <Row label="Earliest retire age" value={`${beforeRetireAge} → ${weighed.retireAge}`} />
          )}
          <Row label="Will my money last?" value={`${before.chance}% → ${weighed.chance}%`} />
          <Text style={s.hint}>{chanceWord(before.chance)} → {chanceWord(weighed.chance)} · estimate, not a promise</Text>
        </View>
      )}

      {/* trim hints — each one IS a pre-run of the dials, never separate math */}
      {hints.length > 0 && weighed.chance != null && (
        <View style={s.card}>
          <Text style={s.cardHdr}>WHAT IF YOU TRIM ONE?</Text>
          {hints.map((h) => (
            <TouchableOpacity accessibilityRole="button" key={h.dialId} style={s.hintRow}
              onPress={() => {
                const freed = (dials.find((d) => d.id === h.dialId)?.monthlyAmount ?? 0) - h.trimmedAmount;
                setDial(h.dialId, { monthlyAmount: h.trimmedAmount });
                setRetirementMonthly((r) => r + Math.max(0, freed));
              }}
              accessibilityLabel={`${h.label} at ${maskedMoney(h.trimmedAmount)} instead: ${h.chance != null ? `chance ${h.chance} percent` : ''}. Tap to apply. Your call.`}>
              <Text style={s.hintTxt}>
                {h.label} at {maskedMoney(h.trimmedAmount)} instead:{h.retireAge != null ? ` retire ${h.retireAge},` : ''} chance {h.chance ?? '—'}%. <Text style={s.hintCta}>Apply ›</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={saveScenario}
        accessibilityLabel="Save this combination as a scenario without changing your plan">
        <Text style={s.secondaryTxt}>Save scenario</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, commitments.length === 0 && { opacity: 0.4 }]}
        disabled={commitments.length === 0} onPress={() => setAdoptOpen(true)}
        accessibilityLabel="Use this plan — see exactly what changes first">
        <Text style={s.primaryTxt}>Use this plan</Text>
      </TouchableOpacity>

      <UseThisPlanSheet
        visible={adoptOpen}
        onClose={() => setAdoptOpen(false)}
        title="Your goals, together"
        changes={changes}
        patch={{ contribMonthly: retirementMonthly, commitments }}
        adoptionLabel="before the goals plan"
        onAdopted={() => router.back()}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowL, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[s.rowV, strong && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  emptyLink: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  emptyLinkT: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  banner: { fontSize: 12.5, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  empty: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19 },
  dialRow: { paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  dialLabel: { flex: 1, fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, marginLeft: 10 },
  dialAmt: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 46 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgSecondary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  endDate: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  verdict: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  hint: { fontSize: 12, color: Colors.textTertiary, marginTop: 4, lineHeight: 17 },
  link: { fontSize: 13.5, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowL: { fontSize: 13.5, color: Colors.textPrimary, flex: 1 },
  rowV: { fontSize: 13.5, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  hintRow: { paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  hintTxt: { fontSize: 13.5, color: Colors.textPrimary, lineHeight: 19 },
  hintCta: { color: Colors.primary, fontWeight: '800' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryTxt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
