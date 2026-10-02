// Your paycheck, month by month (FCC Phase 2) — the 12 dated months behind the Left-to-spend hero.
// Tap a month and its rows visibly sum to the number (the month-detail pin): the checks that land
// that month + the draw from savings − the big bills due, plus the regular bills the paycheck exists to pay
// (listed for completeness, never subtracted twice). Pure renderer — every number comes from the
// F5 paycheck function and the F2 dated grid; this screen computes nothing of its own.
import { inflowLabel } from '../../MoneyKeel/functions/cashflow/this-month';
import { fig, figSaid, figWords } from '../components/figure';   // rule 11: a figure prints with its identifier
import TopBar from '../components/TopBar';
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { useCashflowModel } from '../hooks/useCashflowModel';
import { maskedMoney, spokenMoney } from '../components/useMoney';

export default function PaycheckMonthsScreen() {
  const [openSlot, setOpenSlot] = useState<number>(0);
  // ONE model invocation app-wide (hero = bar = month detail, by construction)
  const { year, grid } = useCashflowModel();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <TopBar back />
    <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
      <Text style={styles.h1}>Your paycheck, month by month</Text>
      <Text style={styles.sub}>
        Every month is its own real month — a pension that lands in December shows up in December, a
        property tax in November dents November. This year: {fig('MK-CF-M-064', year.thisYear)} (calculated).
      </Text>

      {year.months.map((m, s) => {
        const open = openSlot === s;
        const dip = m.netSafeToSpend < year.safeDrawMonthly + m.guaranteedTotal - 0.005;   // a bill month
        const regulars = grid.cells[s]?.billItems.filter((b) => b.kind === 'debt' || b.label === 'Everyday expenses') ?? [];
        return (
          <View key={m.label} style={styles.monthCard}>
            <TouchableOpacity accessibilityRole="button"
              accessibilityLabel={`${m.label}: surplus ${figSaid('MK-CF-M-049', m.netSafeToSpend)}${dip ? ', lower — big bill this month' : ''}`}
              style={styles.monthRow} onPress={() => setOpenSlot(open ? -1 : s)}>
              <Text style={styles.monthLabel}>{m.label}</Text>
              {dip && <Text style={styles.dipWord}>bill month</Text>}
              <Text style={styles.monthNet}>{fig('MK-CF-M-049', m.netSafeToSpend)}</Text>
            </TouchableOpacity>
            {open && (
              <View style={styles.detail}>
                <SectionBand inCard inset={14} title={inflowLabel('Inflow', m.guaranteed.map((g) => g.source))} />
                {m.guaranteed.length === 0 && <Text style={styles.line}>No guaranteed income entered yet</Text>}
                {m.guaranteed.map((g, i) => (
                  <Row key={i} label={g.source + (g.day ? ` · day ${g.day}` : '')} value={fig('MK-CF-M-024', g.amount)} />
                ))}
                <Row label="Draw from savings" value={fig('MK-CF-M-055', m.safeDraw)} />
                <Row label="= Inflow" value={fig('MK-CF-M-047', m.guaranteedTotal + m.safeDraw)} bold />
                <SectionBand inCard inset={14} title="Big bills this month" />
                {m.bills.length === 0 && <Text style={styles.line}>No big bills this month</Text>}
                {m.bills.map((b, i) => (
                  <Row key={i} label={b.label + (b.day ? ` · day ${b.day}` : '')} value={`−${fig('MK-CF-M-016', b.amount)}`} />
                ))}
                <Row label="= Surplus" value={fig('MK-CF-M-049', m.netSafeToSpend)} bold />
                {regulars.length > 0 && (
                  <>
                    <SectionBand inCard inset={14} title="Regular bills (this is what it pays for)" />
                    {regulars.map((b, i) => (
                      <Row key={i} label={b.label + (b.day ? ` · day ${b.day}` : '')} value={fig('MK-CF-M-050', b.amount)} muted />
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
    </View>
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
  h1: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
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
  muted: { fontWeight: '400' },   // de-emphasis by weight, never faint gray on a money figure (audit PM-1)
  line: { fontSize: 13, color: Colors.textTertiary, paddingVertical: 2 },
  footer: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
});
