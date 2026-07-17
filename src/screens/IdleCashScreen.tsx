// Idle cash — nudge detail (FCC detailed design v1.1, Home sheet). The designed landing for Home's
// idle-cash card (previously a dead-end onto the Invest tab): the fact, which accounts it sits in,
// and the plain comparison math — estimates, named example rates, no instruction to act.
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { cashTotal, assetClassOf, type AssetAccount } from '../domain/assets';
import { resolveNetWorthRows } from '../domain/snapshot';
import { maskedMoney } from '../components/useMoney';

// Example rates for the comparison — named constants with an as-of date, never a product pitch.
export const EXAMPLE_RATES = { asOf: '2026-07', highYieldSavings: 0.041, moneyMarket: 0.044 };

export default function IdleCashScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  // PIN: the same cashTotal as the Home card and the Net worth Cash row — one helper.
  const cashAccounts = accounts.filter((a: AssetAccount) => assetClassOf(a) === 'cash');
  const total = cashTotal(accounts);
  const hys = Math.round(total * EXAMPLE_RATES.highYieldSavings);
  const mm = Math.round(total * EXAMPLE_RATES.moneyMarket);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.fact}>{maskedMoney(total)} of your cash is earning about $0.</Text>

      <Text style={styles.section}>WHERE IT SITS</Text>
      <View style={styles.card}>
        {cashAccounts.length === 0 && <Text style={styles.rowSub}>No cash accounts recorded yet.</Text>}
        {cashAccounts.map((a: any, i: number) => (
          <View key={a.asset_id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{a.institution?.trim() ? `${a.institution.trim()} ${a.label}` : a.label}</Text>
              <Text style={styles.rowSub}>{a.apy != null ? `earning about ${(Number(a.apy) * 100).toFixed(1)}%` : 'rate not set'}</Text>
            </View>
            <Text style={styles.rowVal}>{maskedMoney(a.balance || 0)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>FOR COMPARISON (ESTIMATES)</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { flex: 1 }]}>In high-yield savings (about {(EXAMPLE_RATES.highYieldSavings * 100).toFixed(1)}%)</Text>
          <Text style={styles.rowVal}>≈ {maskedMoney(hys)}/yr</Text>
        </View>
        <View style={[styles.row, styles.divider]}>
          <Text style={[styles.rowTitle, { flex: 1 }]}>In a money-market fund (about {(EXAMPLE_RATES.moneyMarket * 100).toFixed(1)}%)</Text>
          <Text style={styles.rowVal}>≈ {maskedMoney(mm)}/yr</Text>
        </View>
        <Text style={styles.note}>Rates are examples as of {EXAMPLE_RATES.asOf} — banks differ. We never move your money; you decide.</Text>
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.linkBtn} onPress={() => router.push('/(tabs)/analytics')}
        accessibilityLabel="See my cash accounts on the Net worth tab">
        <Text style={styles.linkTxt}>See my cash accounts ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  fact: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, lineHeight: 28 },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 },
  rowVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginLeft: 8 },
  note: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18, marginTop: 10 },
  linkBtn: { marginTop: Spacing.lg, minHeight: 44, justifyContent: 'center' },
  linkTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
