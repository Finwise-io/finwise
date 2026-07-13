// Plan hub (FCC detailed design v1.1, Plan sheet) — the chief-of-staff desk: the ONE home of the
// will-it-last number, the big decisions waiting on you, and your saved what-ifs. Nothing here
// changes the plan by itself — every path ends at an explicit adoption step.
import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { resolveNetWorthRows } from '../domain/snapshot';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { resolveLens } from '../domain/profile/lens';
import { RMD_START_AGE } from '../domain/decumulation';
import { retirementIncomeMonthly } from '../domain/income';
import { ageFromProfile } from '../utils/persona';
import { usePlanCompleteness } from './SharpenPlanScreen';
import { Disclaimer } from '../components/Disclaimer';

export default function PlanHubScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const plan = usePlanCompleteness();
  const lens = resolveLens(op, store.lensOverride);
  const age = ageFromProfile(op) ?? null;

  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true }),
    [op, accounts, A, store.inflationRate, store.employmentStatus],
  );
  // PIN: the hub's number is THE number — cache it so Home's strip and Insights read the same value.
  useEffect(() => { if (wil.chance != null) store.setLastRetireChance?.(wil.chance); }, [wil.chance]);

  const scenarios = (store.retirementScenarios ?? []) as any[];
  const guaranteedMonthly = retirementIncomeMonthly(op);
  const ssChip = A.ssClaimAge != null ? `your plan: claim at ${A.ssClaimAge}` : null;

  const deleteScenario = (s: any) => {
    Alert.alert('Delete this scenario?', s.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.deleteRetirementScenario?.(s.id) },
    ]);
  };

  // F11: revert is always a confirmation showing exactly what switches back
  const planHistory = (store.planHistory ?? []) as any[];
  const confirmRevert = () => {
    const prev = planHistory[0];
    if (!prev) return;
    Alert.alert('Back to your previous plan?', `Restores the plan saved ${prev.date} (${prev.label}). Every number switches back exactly.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch back', onPress: () => store.revertPlan?.() },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Plan</Text>
      <Text style={styles.tagline}>We lay it out. You decide.</Text>

      {/* WILL MY MONEY LAST? — the one true home of the number */}
      {wil.captured && wil.chance != null ? (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/retirement')}
         
          accessibilityLabel={`Will my money last to ${wil.horizonAge}: ${wil.word}, ${wil.chance} percent, an estimate. Opens the full picture.`}>
          <Text style={styles.cardKicker}>WILL MY MONEY LAST? — to {wil.horizonAge}</Text>
          <View style={styles.chanceRow}>
            <Text style={styles.chanceWord}>{wil.word}</Text>
            <Text style={styles.chancePct}> — {wil.chance}%</Text>
          </View>
          {wil.band && <Text style={styles.bandTxt}>range {wil.band.low}–{wil.band.high}% · estimate</Text>}
          {wil.band && (
            <View style={styles.bandTrack} accessibilityLabel={`In the worst futures ${wil.band.low} percent, in the best ${wil.band.high} percent`}>
              <View style={[styles.bandFill, { left: `${wil.band.low}%`, width: `${Math.max(2, wil.band.high - wil.band.low)}%` }]} />
              <View style={[styles.bandMark, { left: `${wil.chance}%` }]} />
            </View>
          )}
          <Text style={styles.cardLink}>What drives this? ›</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/sharpen')}
          accessibilityLabel="Answer three questions to see if your money lasts">
          <Text style={styles.cardKicker}>WILL MY MONEY LAST?</Text>
          <Text style={styles.inviteTxt}>Answer three quick questions — your age, what you spend, what you have — and we'll show your honest odds. No guessed numbers.</Text>
          <Text style={styles.cardLink}>Start with your plan ›</Text>
        </TouchableOpacity>
      )}

      {/* BIG DECISIONS */}
      <Text style={styles.section}>BIG DECISIONS</Text>
      <View style={styles.card}>
        <DecisionRow title="Claim Social Security" sub={ssChip ?? 'when to start the check — laid out in your dollars'} onPress={() => router.push('/ss-timing')} />
        <DecisionRow divider title="Required withdrawals" sub={age != null && age >= RMD_START_AGE ? 'they apply to you now' : `they start at ${RMD_START_AGE}`} onPress={() => router.push('/retirement')} />
        <DecisionRow divider title="Afford it all?" sub="home · college · parents · debt — together" onPress={() => router.push('/(tabs)/goals')} />
        <DecisionRow divider title="Move money into a Roth" sub="pay some tax now, in a low-tax year" onPress={() => router.push('/roth')} />
      </View>

      {/* Your monthly income (retired lens): guaranteed income findable from Plan too */}
      {lens === 'retired' && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/monthly-income')}
          accessibilityLabel="Your monthly income — Social Security and pension">
          <Text style={styles.rowTitle}>Your income</Text>
          <Text style={styles.rowSub}>{guaranteedMonthly > 0 ? `${money(guaranteedMonthly)}/mo guaranteed — Social Security · pension · annuity` : 'Add your Social Security and pension'} ›</Text>
        </TouchableOpacity>
      )}

      {/* SAVED SCENARIOS */}
      {scenarios.length > 0 && (
        <>
          <Text style={styles.section}>SAVED SCENARIOS ({scenarios.length})</Text>
          <View style={styles.card}>
            {scenarios.map((s, i) => (
              <View key={s.id} style={[styles.scRow, i > 0 && styles.divider]}>
                <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} onPress={() => router.push('/retirement')}
                  accessibilityLabel={`Saved scenario ${s.name}, ${s.chance != null ? `${s.chance} percent when saved` : ''}`}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>{s.chance != null ? `${s.chance}% when saved` : 'open to re-run'} · {String(s.createdAt ?? '').slice(0, 10)}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => deleteScenario(s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Delete scenario ${s.name}`}>
                  <Text style={styles.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Back to previous plan (appears only after an adoption) */}
      {planHistory.length > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={confirmRevert}
          accessibilityLabel={`Back to previous plan, saved ${planHistory[0].date}`}>
          <Text style={styles.rowTitle}>Back to previous plan ({planHistory[0].date})</Text>
          <Text style={styles.rowSub}>One tap shows exactly what would switch back — nothing changes without a confirmation.</Text>
        </TouchableOpacity>
      )}

      {/* Sharpen your plan meter */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/sharpen')}
        accessibilityLabel={`Sharpen your plan, ${plan.doneCount} of ${plan.total} done`}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.rowTitle, { flex: 1 }]}>Sharpen your plan</Text>
          <Text style={styles.meterTxt}>{plan.doneCount} of {plan.total} ›</Text>
        </View>
        <View style={styles.meterBar}><View style={[styles.meterFill, { width: `${plan.pct}%` }]} /></View>
      </TouchableOpacity>

      <Disclaimer />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DecisionRow({ title, sub, onPress, divider }: { title: string; sub: string; onPress: () => void; divider?: boolean }) {
  return (
    <TouchableOpacity style={[styles.decRow, divider && styles.divider]} activeOpacity={0.7} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${title} — ${sub}`}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.md },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.xs },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardKicker: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6 },
  chanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  chanceWord: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  chancePct: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  bandTxt: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  bandTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  bandFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Colors.primaryLight },
  bandMark: { position: 'absolute', top: 0, bottom: 0, width: 3, borderRadius: 1.5, backgroundColor: Colors.primary },
  inviteTxt: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 6 },
  cardLink: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 10 },
  decRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.textTertiary, marginLeft: 8 },
  scRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  deleteTxt: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 8 },
  meterTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  meterBar: { height: 6, borderRadius: 3, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
});
