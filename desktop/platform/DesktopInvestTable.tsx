// DESKTOP-ONLY investments table (approved shell mock, Home window right column, 2026-08-03):
// the class rows under the investments glance — a real table, nothing behind a swipe.
// One brain: rows = assetAllocation() over EXACTLY the accounts investmentsTotal() counts, so the
// rows sum to the phone hero's total by construction (pinned). Colors/labels/order are the app's
// validated class constants — never a desktop fork.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radii, ClassMarkColors } from '../../src/utils/theme';
import { assetAllocation, assetClassOf, investmentsTotal, ASSET_CLASS_LABEL, AssetAccount, AssetClass } from '../../src/domain/assets';
import { maskedMoney, spokenMoney } from '../../src/components/useMoney';

const INVEST_CLASSES: AssetClass[] = ['stocks_etf', 'bonds', 'alternatives', 'mixed'];
// liquidity order, same as the Net worth screen's class list (pre-48 audit A7)
const ROW_ORDER: AssetClass[] = ['cash', 'bonds', 'stocks_etf', 'alternatives', 'mixed'];

export function investTableRows(accounts: AssetAccount[]) {
  const invested = (accounts ?? []).filter((a) => INVEST_CLASSES.includes(assetClassOf(a)));
  const alloc = assetAllocation(invested);
  return ROW_ORDER
    .map((key) => ({ key, label: ASSET_CLASS_LABEL[key], color: (ClassMarkColors as any)[key] as string, total: alloc[key] ?? 0 }))
    .filter((r) => r.total > 0);
}

export function DesktopInvestTable({ accounts, showHeader }: { accounts: AssetAccount[]; showHeader?: boolean }) {
  const rows = investTableRows(accounts);
  const total = investmentsTotal(accounts ?? []);
  if (rows.length === 0) return null;
  return (
    <View style={s.card} testID="desktop-invest-table">
      {showHeader && (
        <View style={s.headRow}>
          <Text style={s.kicker}>YOUR INVESTMENTS</Text>
          <Text style={s.headTotal}>{maskedMoney(total)}</Text>
        </View>
      )}
      {rows.map((r, i) => (
        <TouchableOpacity key={r.key} accessibilityRole="button" style={[s.row, i > 0 && s.divider]}
          onPress={() => router.push('/(tabs)/invest' as any)}
          accessibilityLabel={`${r.label}, ${spokenMoney(r.total)}. Opens Performance.`}>
          <View style={[s.dot, { backgroundColor: r.color }]} />
          <Text style={s.rowLabel} numberOfLines={1}>{r.label}</Text>
          <Text style={s.rowVal}>{maskedMoney(r.total)}</Text>
          <Text style={s.chev}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/invest' as any)}
        accessibilityLabel="See your growth — opens Performance">
        <Text style={s.link}>See your growth ›</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', marginTop: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: Colors.textTertiary },
  headTotal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, minHeight: 44 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary, minWidth: 0 },
  rowVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', minWidth: 92, fontVariant: ['tabular-nums'] },
  chev: { width: 12, textAlign: 'right', color: Colors.textTertiary, fontSize: 13 },
  link: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 8 },
});
