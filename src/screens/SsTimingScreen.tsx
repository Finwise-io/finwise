// Claim Social Security (FCC detailed design v1.1, Plan sheet) — the flagship decision: 62 vs 67 vs 70
// laid out in YOUR dollars. You set how long you expect to live; we never crown a winner. Everything is
// a sandbox until the Use-this-plan sheet; Back discards silently (nothing was at risk).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { currencySymbol } from '../domain/_shared/money';
import { simulate } from '../domain/retirement';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { ssBenefitAtClaimAge, ssLifetimeTotal, claimWindow, FULL_RETIREMENT_AGE } from '../domain/retirement/ssTiming';
import { resolveNetWorthRows } from '../domain/snapshot';
import { ageFromProfile } from '../utils/persona';
import { UseThisPlanSheet, type PlanChange } from '../components/UseThisPlanSheet';
import { maskedMoney } from '../components/useMoney';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const CLAIM_AGES = [62, FULL_RETIREMENT_AGE, 70] as const;

export default function SsTimingScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const age = ageFromProfile(op) ?? null;
  const receiving = num(op.ri_ss) > 0;

  // ── sandbox state: nothing here writes to the plan until adoption ──
  const [statement, setStatement] = useState<string>(() => String(A.ssMonthly ?? '') || '');
  const [liveTo, setLiveTo] = useState<number>(() => A.horizonAge ?? (num(op.horizonAge) || 90));
  const [adoptFor, setAdoptFor] = useState<number | null>(null);   // claim age pending adoption
  const [whyOpen, setWhyOpen] = useState(false);

  const stmt = num(statement);
  const usingExample = stmt <= 0;
  const exampleStmt = 2600;                          // the worked example, clearly labeled
  const effStmt = usingExample ? exampleStmt : stmt;

  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  const baseInputs = useMemo(
    () => willItLastInputs({ op, accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, A, store.inflationRate, store.employmentStatus]);

  // Past 70 the credit stops — every standard age has 'passed', so the honest option is claim NOW
  // at the age-70 amount (the factor clamps at 124%). Never a dead end, never a choice that no
  // longer exists (edge-case audit E1).
  const claimAges: number[] = age != null && age > 70 ? [age] : [...CLAIM_AGES];

  // three seeded runs — the SAME engine and inputs the hub uses, patched per claim age
  const rows = useMemo(() => claimAges.map((claimAge) => {
    const monthly = ssBenefitAtClaimAge(effStmt, claimAge);
    const lifetime = ssLifetimeTotal(effStmt, claimAge, liveTo);
    const passed = age != null && age > claimAge;
    let chance: number | null = null;
    if (baseInputs && !usingExample) {
      chance = simulate({ ...baseInputs, guaranteed_monthly_income: monthly, guaranteed_start_age: claimAge, horizon_age: Math.max(baseInputs.retire_age + 1, liveTo) }).chance_of_success;
    }
    return { claimAge, monthly, lifetime, chance, passed };
  }), [effStmt, liveTo, baseInputs, usingExample, age]);

  const window = claimWindow(num(op.birthYear) || null, num(op.birthMonth) || null);
  const adopted = A.ssClaimAge as number | null;

  const changesFor = (claimAge: number): PlanChange[] => {
    const monthly = ssBenefitAtClaimAge(effStmt, claimAge);
    const out: PlanChange[] = [
      { label: 'Claim age', from: adopted != null ? `age ${adopted}` : 'not set', to: `age ${claimAge}` },
      { label: 'Monthly check (today\'s dollars)', from: A.guaranteedMonthly != null ? maskedMoney(A.guaranteedMonthly) : 'not set', to: maskedMoney(monthly) },
    ];
    if (liveTo !== (A.horizonAge ?? liveTo)) out.push({ label: 'Plan-to age', from: `age ${A.horizonAge}`, to: `age ${liveTo}` });
    return out;
  };
  const patchFor = (claimAge: number) => ({
    ssClaimAge: claimAge,
    ssMonthly: effStmt,
    ssEligible: true,
    guaranteedMonthly: ssBenefitAtClaimAge(effStmt, claimAge),
    ...(liveTo !== A.horizonAge ? { horizonAge: liveTo } : {}),
  });

  if (receiving) {
    // Already receiving benefits: never ask for a statement amount or show claim windows.
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.tagline}>We lay it out. You decide.</Text>
        <View style={styles.card}>
          <Text style={styles.receiveHead}>You receive {maskedMoney(num(op.ri_ss))}/mo ✓</Text>
          <Text style={styles.body}>You're already receiving Social Security, so claim timing is decided. Your check lives on the Monthly income screen — edit it there and every number follows.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={() => router.push('/monthly-income')}
            accessibilityLabel="Edit what you receive on the Monthly income screen">
            <Text style={styles.primaryTxt}>Edit what you receive ›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    // M2 keyboard GATE: the statement input must never hide the compare table or its own Save path.
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.tagline}>We lay it out. You decide.</Text>

      {/* statement amount — the one number everything is computed from */}
      <View style={styles.card}>
        <Text style={styles.label}>Your statement amount at {FULL_RETIREMENT_AGE}</Text>
        <View style={styles.inputRow}>
          <Text style={styles.currency}>{currencySymbol()}</Text>
          <TextInput style={styles.input} keyboardType="number-pad" placeholder={String(exampleStmt)}
            placeholderTextColor={Colors.textTertiary} value={statement} onChangeText={setStatement}
            accessibilityLabel={`Monthly amount from your Social Security statement at age ${FULL_RETIREMENT_AGE}`} />
          <Text style={styles.perMo}>/mo</Text>
        </View>
        <Text style={styles.finder}>It's on your Social Security statement — ssa.gov/myaccount or the mailed copy. No rush; the example numbers stay until you have it.</Text>
      </View>

      {usingExample && <Text style={styles.exampleBanner}>Showing example numbers (a {maskedMoney(exampleStmt)}/mo statement) — type yours above to see your own.</Text>}
      {!usingExample && <Text style={styles.sandboxBanner}>Trying it out — this won't change your plan until you tap Use this plan.</Text>}

      {/* three-way compare */}
      <View style={styles.card}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 1 }]}>Claim</Text>
          <Text style={[styles.th, styles.tRight, { width: 104 }]}>Monthly</Text>
          <Text style={[styles.th, styles.tRight, { width: 110 }]}>Total by {liveTo}</Text>
        </View>
        {rows.map((r) => (
          <View key={r.claimAge} style={styles.tr}
            accessible accessibilityLabel={r.passed
              ? `Claiming at ${r.claimAge} has passed — you can no longer claim at ${r.claimAge}`
              : `Claiming at ${r.claimAge} pays ${maskedMoney(r.monthly)} a month, about ${maskedMoney(r.lifetime)} in total by age ${liveTo}${usingExample ? ', example numbers' : ''}`}>
            <Text style={[styles.td, { flex: 1 }, r.passed && styles.passed]}>at {r.claimAge}{age != null && age > 70 && r.claimAge === age ? ' (now)' : ''}{adopted === r.claimAge ? '  ✓ your plan' : ''}{r.passed ? '  (passed)' : ''}</Text>
            <Text style={[styles.td, styles.tdMonthly, styles.tRight, { width: 104 }, r.passed && styles.passed, usingExample && styles.example]}>{maskedMoney(r.monthly)}</Text>
            <Text style={[styles.td, styles.tRight, { width: 110 }, r.passed && styles.passed, usingExample && styles.example]}>{maskedMoney(r.lifetime)}</Text>
          </View>
        ))}
        <Text style={styles.tableNote}>{age != null && age > 70
          ? 'The waiting credit stops at 70 — claiming now pays the age-70 amount; waiting longer adds nothing.'
          : 'earlier = smaller checks for longer · later = bigger checks for fewer years'}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setWhyOpen(true)} style={styles.whyDot}
          accessibilityLabel="Where these numbers come from">
          <Text style={styles.whyDotTxt}>ⓘ where these numbers come from</Text>
        </TouchableOpacity>
      </View>

      {/* effect on will-it-last: three labeled bars, same engine as the hub */}
      {!usingExample && baseInputs && (
        <View style={styles.card}>
          <Text style={styles.label}>Effect on will-my-money-last</Text>
          {rows.map((r) => r.chance != null && (
            <View key={r.claimAge} style={styles.barRow}
              accessible accessibilityLabel={`Claiming at ${r.claimAge}: ${r.chance} percent chance your money lasts, an estimate`}>
              <Text style={styles.barLabel}>{r.claimAge}: {r.chance}%</Text>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${r.chance}%` }]} /></View>
            </View>
          ))}
          <Text style={styles.tableNote}>estimates, not promises</Text>
        </View>
      )}

      {/* if-you-live-to stepper (your assumption, not our prediction) */}
      <View style={styles.card}>
        <Text style={styles.label}>If you live to… (you set this)</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.stepBtn} onPress={() => setLiveTo(Math.max(70, liveTo - 1))}
            accessibilityLabel="Lower the live-to age by one year">
            <Text style={styles.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={styles.liveTo}>age {liveTo}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.stepBtn} onPress={() => setLiveTo(Math.min(105, liveTo + 1))}
            accessibilityLabel="Raise the live-to age by one year">
            <Text style={styles.stepTxt}>＋</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tableNote}>Your assumption, not our prediction.</Text>
      </View>

      {/* window (logistics only) */}
      {window && <Text style={styles.window}>You can claim any time from {window.opens} (age 62) to age 70 — no deadline.</Text>}

      {/* one adoption button per live option */}
      {rows.filter((r) => !r.passed).map((r) => (
        <TouchableOpacity accessibilityRole="button" key={r.claimAge}
          style={[styles.adoptBtn, usingExample && { opacity: 0.4 }]} disabled={usingExample}
          onPress={() => setAdoptFor(r.claimAge)}
          accessibilityLabel={`Use claim at ${r.claimAge} as my plan`}>
          <Text style={styles.adoptTxt}>{adopted === r.claimAge ? `Your plan: claim at ${r.claimAge} — change it` : `Use claim at ${r.claimAge} as my plan`}</Text>
        </TouchableOpacity>
      ))}
      {age != null && age > 62 && (
        <Text style={styles.couplesNote}>Options below your current age are marked passed — a choice that no longer exists is never shown as live.</Text>
      )}
      <Text style={styles.couplesNote}>These figures reflect one person's benefit. Spousal and survivor benefits can change the best timing for couples — v1 doesn't model them yet.</Text>

      <UseThisPlanSheet
        visible={adoptFor != null}
        onClose={() => setAdoptFor(null)}
        title={`Claim Social Security at ${adoptFor}`}
        changes={adoptFor != null ? changesFor(adoptFor) : []}
        patch={adoptFor != null ? patchFor(adoptFor) : {}}
        adoptionLabel={`before claiming at ${adoptFor}`}
        onAdopted={() => router.back()}
      />

      <Modal visible={whyOpen} transparent animationType="fade" onRequestClose={() => setWhyOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalT}>Where these numbers come from</Text>
            <Text style={styles.body}>
              The standard Social Security Administration rules applied to YOUR statement amount: claiming early
              reduces the check about 6–7% per year (to about 70% at 62); waiting adds 8% per year past full age
              (to about 124% at 70) — the same schedule as ssa.gov. Lifetime totals are that monthly amount times
              the months to the age you set. The {FULL_RETIREMENT_AGE} row always equals your statement amount exactly.
            </Text>
            <TouchableOpacity accessibilityRole="button" style={styles.modalBtn} onPress={() => setWhyOpen(false)}>
              <Text style={styles.modalBtnT}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  tagline: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  label: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  currency: { fontSize: 24, fontWeight: '700', color: Colors.textSecondary },
  input: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, minWidth: 110, padding: 0, marginLeft: 4 },
  perMo: { fontSize: 15, color: Colors.textSecondary },
  finder: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  exampleBanner: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  sandboxBanner: { fontSize: 12.5, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', paddingBottom: 6 },
  th: { fontSize: 11.5, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  tr: { flexDirection: 'row', paddingVertical: 9, borderTopWidth: 1, borderTopColor: Colors.border },
  td: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  tdMonthly: { fontSize: 17, fontWeight: '800' },
  tRight: { textAlign: 'right' },
  passed: { color: Colors.textTertiary },
  example: { color: Colors.textSecondary },
  tableNote: { fontSize: 12, color: Colors.textTertiary, marginTop: 8 },
  whyDot: { marginTop: 2, minHeight: 44, justifyContent: 'center' },
  whyDotTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  barRow: { marginTop: 10 },
  barLabel: { fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: Colors.bgSecondary, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginTop: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgSecondary, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  liveTo: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, minWidth: 90, textAlign: 'center' },
  window: { fontSize: 13, color: Colors.textSecondary, marginVertical: Spacing.sm, lineHeight: 19 },
  adoptBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  adoptTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  couplesNote: { fontSize: 12, color: Colors.textTertiary, lineHeight: 17, marginTop: 8 },
  receiveHead: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  modalT: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  modalBtn: { alignSelf: 'flex-end', marginTop: Spacing.sm, padding: 12, minHeight: 44, justifyContent: 'center' },
  modalBtnT: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
});
