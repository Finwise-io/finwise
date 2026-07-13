// The retired hero (FCC Phase 2, approved design v1.1): "Safe to spend — <MONTH>", built from the
// F5 paycheck engine. Source-first lines (founder review c4), the safe-draw explainer dot (June's
// "says who?" finding), the bills subtraction visible in bill months, and the guaranteed-missing
// prompt instead of a fake $0. Rendered behind the early-preview flag until the slice ships.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';             // masks under hide-balances (mask-ALL)
import { buildPaycheckYear } from '../domain/paycheck';
import { ageFromProfile } from '../utils/persona';

export function PaycheckCard() {
  const store = useStore() as any;
  const router = useRouter();
  const op = store.onboardingProfile ?? null;
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const A = store.retirementAssumptions ?? {};
  const [whySafe, setWhySafe] = useState(false);

  const year = useMemo(() => {
    const age = ageFromProfile(op) ?? 68;
    const mean = A.expectedReturn ?? 0.055;
    return buildPaycheckYear(op, {
      accounts, liabilities,
      sim: {
        current_age: age,
        horizon_age: A.horizonAge ?? Math.max(age + 5, 92),
        mean_return: mean,
        vol_return: Math.min(0.2, Math.max(0.05, mean * 1.7)),   // same convention as the cockpit
        inflation: A.inflation ?? 0.025,
        seed: 42, paths: 300,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, accounts, liabilities, A.expectedReturn, A.horizonAge, A.inflation]);

  const m = year.thisMonth;
  const monthName = m.label.split(' ')[0].toUpperCase();

  return (
    <View style={styles.card} accessibilityLabel={`Safe to spend in ${m.label}: ${money(m.netSafeToSpend)}`}>
      <Text style={styles.kicker}>SAFE TO SPEND — {monthName}</Text>
      <Text style={styles.hero}>{money(m.netSafeToSpend)} <Text style={styles.unit}>this month</Text></Text>
      <Text style={styles.est}>estimate</Text>

      {year.guaranteedMissing ? (
        <TouchableOpacity accessibilityRole="link" style={styles.promptBtn} onPress={() => router.push('/monthly-income')}>
          <Text style={styles.promptT}>Add your Social Security and pension to see your full paycheck →</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.breakdown}>
          {m.guaranteed.map((g, i) => (
            <Row key={i} label={g.source + (g.day ? ` (day ${g.day})` : '')} value={money(g.amount)} />
          ))}
          <Row label="= Guaranteed" value={money(m.guaranteedTotal)} bold />
          <View style={styles.rowWrap}>
            <Text style={styles.rowLabel}>+ Safe draw from savings</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="What makes the draw safe?"
              onPress={() => setWhySafe(true)} style={styles.infoDot}><Text style={styles.infoDotT}>i</Text></TouchableOpacity>
            <Text style={styles.rowValue}>{money(m.safeDraw)}</Text>
          </View>
          {m.billsTotal > 0 && <Row label={`− Big bills this month (${m.bills.map((b) => b.label).join(', ')})`} value={money(m.billsTotal)} />}
        </View>
      )}

      <Text style={styles.year}>This year {money(year.thisYear)} <Text style={styles.yearNote}>— varies month to month</Text></Text>
      {year.drawRateFlag === 'high' && (
        <Text style={styles.flag}>Heads-up: this draw is on the high side of the usual 4%-a-year guideline.</Text>
      )}

      <Modal visible={whySafe} transparent animationType="fade" onRequestClose={() => setWhySafe(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalT}>What makes {money(m.safeDraw)} “safe”?</Text>
            <Text style={styles.modalB}>
              It’s the largest steady monthly draw that keeps your will-my-money-last odds at Likely (80 or
              better), re-checked whenever your balances move. Spend more each month and the odds fall — you
              can try it in Plan. An estimate, never a promise.
            </Text>
            <TouchableOpacity accessibilityRole="button" style={styles.modalBtn} onPress={() => setWhySafe(false)}>
              <Text style={styles.modalBtnT}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.rowWrap}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6 },
  hero: { fontSize: 34, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  unit: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  est: { fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.xs },
  breakdown: { marginTop: 4, marginBottom: Spacing.xs },
  rowWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  rowValue: { fontSize: 14, color: Colors.textPrimary },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  infoDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  infoDotT: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  promptBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 12, marginVertical: Spacing.xs },
  promptT: { color: Colors.primaryDark, fontWeight: '600', fontSize: 14 },
  year: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 4 },
  yearNote: { fontWeight: '400', color: Colors.textSecondary },
  flag: { fontSize: 12, color: Colors.amber, marginTop: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  modalT: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  modalB: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  modalBtn: { alignSelf: 'flex-end', marginTop: Spacing.sm, padding: 8 },
  modalBtnT: { color: Colors.primary, fontWeight: '700' },
});
