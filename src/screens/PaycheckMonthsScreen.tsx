// Your paycheck, month by month (FCC Phase 2) — the 12 dated months behind the Safe-to-spend hero.
// Tap a month and its rows visibly sum to the number (the month-detail pin): the checks that land
// that month + the safe draw − the big bills due, plus the regular bills the paycheck exists to pay
// (listed for completeness, never subtracted twice). Pure renderer — every number comes from the
// F5 paycheck engine and the F2 dated grid; this screen computes nothing of its own.
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { useCashflowModel } from '../hooks/useCashflowModel';
import { maskedMoney, spokenMoney } from '../components/useMoney';

export default function PaycheckMonthsScreen() {
  const [openSlot, setOpenSlot] = useState<number>(0);
  // ONE model invocation app-wide (hero = bar = month detail, by construction)
  const { year, grid } = useCashflowModel();

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
      <Text style={styles.h1}>Your paycheck, month by month</Text>
      <Text style={styles.sub}>
        Every month is its own real month — a pension that lands in December shows up in December, a
        property tax in November dents November. This year: {maskedMoney(year.thisYear)} (estimate).
      </Text>

      {year.months.map((m, s) => {
        const open = openSlot === s;
        const dip = m.netSafeToSpend < year.safeDrawMonthly + m.guaranteedTotal - 0.005;   // a bill month
        const regulars = grid.cells[s]?.billItems.filter((b) => b.kind === 'debt' || b.label === 'Everyday spending') ?? [];
        return (
          <View key={m.label} style={styles.monthCard}>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={`${m.label}: safe to spend ${spokenMoney(m.netSafeToSpend)}${dip ? ', lower — big bill this month' : ''}`}
              style={styles.monthRow} onPress={() => setOpenSlot(open ? -1 : s)}>
              <Text style={styles.monthLabel}>{m.label}</Text>
              {dip && <Text style={styles.dipWord}>bill month</Text>}
              <Text style={styles.monthNet}>{maskedMoney(m.netSafeToSpend)}</Text>
            </TouchableOpacity>
            {open && (
              <View style={styles.detail}>
                <Text style={styles.sectionT}>Money in</Text>
                {m.guaranteed.length === 0 && <Text style={styles.line}>No guaranteed income captured yet</Text>}
                {m.guaranteed.map((g, i) => (
                  <Row key={i} label={g.source + (g.day ? ` · day ${g.day}` : '')} value={maskedMoney(g.amount)} />
                ))}
                <Row label="Safe draw from savings" value={maskedMoney(m.safeDraw)} />
                <Row label="= In" value={maskedMoney(m.guaranteedTotal + m.safeDraw)} bold />
                <Text style={styles.sectionT}>Big bills this month</Text>
                {m.bills.length === 0 && <Text style={styles.line}>No big bills this month</Text>}
                {m.bills.map((b, i) => (
                  <Row key={i} label={b.label + (b.day ? ` · day ${b.day}` : '')} value={`−${maskedMoney(b.amount)}`} />
                ))}
                <Row label="= Safe to spend" value={maskedMoney(m.netSafeToSpend)} bold />
                {regulars.length > 0 && (
                  <>
                    <Text style={styles.sectionT}>Regular bills (your safe-to-spend pays these)</Text>
                    {regulars.map((b, i) => (
                      <Row key={i} label={b.label + (b.day ? ` · day ${b.day}` : '')} value={maskedMoney(b.amount)} muted />
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.footer}>Estimates — these move with your live account balances.</Text>
    </ScrollView>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={styles.rowWrap}>
      <Text style={[styles.rowLabel, bold && styles.bold, muted && styles.muted]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, muted && styles.muted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  h1: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  monthCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, marginBottom: 6, overflow: 'hidden' },
  monthRow: { flexDirection: 'row', alignItems: 'center', padding: 14, minHeight: 48 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, width: 72 },
  dipWord: { fontSize: 11, color: Colors.amber, fontWeight: '700', marginRight: 8 },
  monthNet: { flex: 1, textAlign: 'right', fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  detail: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  sectionT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 10, marginBottom: 2, letterSpacing: 0.4 },
  rowWrap: { flexDirection: 'row', paddingVertical: 5 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  rowValue: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  muted: { fontWeight: '400' },   // de-emphasis by weight, never faint gray on money (audit PM-1)
  line: { fontSize: 13, color: Colors.textTertiary, paddingVertical: 2 },
  footer: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
});
