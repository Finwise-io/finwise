// Will-it-last detail (FCC detailed design v1.1, Plan sheet) — open the hood on the ONE number:
// what it means, the honest best-to-worst range, and what drives it. Every driver shows its value
// AND where it came from (you set it / estimated from your data) with a road to change it. The
// headline is the SAME selector run the hub, Home and Cash flow read — never a second computation.
import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { selectWillItLast, chanceWord } from '../domain/retirement/willItLast';
import { resolveNetWorthRows } from '../domain/snapshot';
import { maskedMoney } from '../components/useMoney';

export default function WillItLastScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};

  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true }),
    [op, accounts, A, store.inflationRate, store.employmentStatus]);

  if (!wil.captured || wil.chance == null || !wil.inputs) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.h1}>Answer three questions first</Text>
          <Text style={s.body}>Your age, what you spend, and what you have — then this page can open the hood on your honest odds. No guessed numbers.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => router.push('/sharpen')}
            accessibilityLabel="Start with your plan">
            <Text style={s.primaryTxt}>Start with your plan ›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const inp = wil.inputs;
  // each driver: the value + its source (you set it vs estimated from your data) + where to change it
  const drivers: { label: string; value: string; source: string; route: string }[] = [
    { label: 'Plan to age', value: String(inp.horizon_age), source: A.horizonAge != null ? 'you set it' : 'from your setup answers', route: '/retirement' },
    { label: 'Retire age', value: inp.retire_age <= inp.current_age ? `already retired (${inp.current_age})` : String(inp.retire_age), source: A.retireAge != null ? 'you set it' : 'from your setup answers', route: '/retirement' },
    { label: 'What you have (nest egg)', value: maskedMoney(inp.start_balance), source: 'your live account balances', route: '/(tabs)/analytics' },
    { label: 'Monthly spending in retirement', value: maskedMoney(inp.retire_monthly_spend_today), source: A.spendMonthly != null ? 'you set it' : 'estimated from your data', route: '/retirement' },
    { label: 'Guaranteed income', value: `${maskedMoney(inp.guaranteed_monthly_income)}/mo from age ${inp.guaranteed_start_age ?? inp.retire_age}`, source: A.ssMonthly != null || A.ssClaimAge != null ? 'you set it' : 'from your setup answers', route: '/ss-timing' },
    ...(inp.retire_age > inp.current_age ? [{ label: 'Monthly saving until then', value: `${maskedMoney(inp.annual_contribution / 12)}/mo`, source: A.contribMonthly != null ? 'you set it' : 'estimated from your data', route: '/multi-goal' }] : []),
    { label: 'Yearly growth assumed', value: `${((inp.mean_return ?? 0) * 100).toFixed(1)}%`, source: A.returnBasis === 'actual' ? 'your reported returns' : A.returnBasis === 'scenario' ? 'you set it' : 'the blended benchmark for your mix', route: '/retirement' },
    { label: 'Inflation assumed', value: `${((inp.inflation ?? 0) * 100).toFixed(1)}%`, source: A.inflation != null ? 'you set it' : 'from economic data', route: '/retirement' },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* the headline — the one selector, the one number */}
      <View style={s.card} accessible
        accessibilityLabel={`Will my money last to ${wil.horizonAge}: ${wil.word}, ${wil.chance} percent, an estimate${wil.band ? `. In the worst futures ${wil.band.low} percent, in the best ${wil.band.high} percent` : ''}.`}>
        <Text style={s.kicker}>WILL MY MONEY LAST? — TO {wil.horizonAge}</Text>
        <Text style={s.headline}>{wil.word} — {wil.chance}% <Text style={s.est}>estimate</Text></Text>
        {wil.band && <Text style={s.bandTxt}>range {wil.band.low}–{wil.band.high}% across bad-to-good markets</Text>}
      </View>

      {/* what the number means — plain English, grade-6 target */}
      <View style={s.card}>
        <Text style={s.kicker}>WHAT THIS MEANS</Text>
        <Text style={s.body}>
          We play out hundreds of possible market futures — some kind, some rough — using the numbers below.
          In {wil.chance} of every 100 futures, your money lasts to {wil.horizonAge}. It's an honest estimate
          that moves with your balances — never a promise, never a prediction of any single year.
        </Text>
      </View>

      {/* the drivers — every number sourced, every number changeable */}
      <Text style={s.section}>WHAT DRIVES THIS</Text>
      <View style={s.card}>
        {drivers.map((d, i) => (
          <TouchableOpacity accessibilityRole="button" key={d.label} style={[s.driverRow, i > 0 && s.divider]}
            onPress={() => router.push(d.route as any)}
            accessibilityLabel={`${d.label}: ${d.value}, ${d.source}. Opens where you can change it.`}>
            <View style={{ flex: 1 }}>
              <Text style={s.driverL}>{d.label}</Text>
              <Text style={s.driverSrc}>{d.source}</Text>
            </View>
            <Text style={s.driverV}>{d.value}</Text>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.note}>Change any driver and this number, Home's strip and Cash flow's strip all move together — they are one number.</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headline: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  est: { fontSize: 14, fontWeight: '500', color: Colors.textTertiary },
  bandTxt: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginTop: 4 },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.xs, marginBottom: 6 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, minHeight: 48 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  driverL: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  driverSrc: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  driverV: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  arrow: { fontSize: 18, color: Colors.textTertiary },
  note: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
