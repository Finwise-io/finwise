// Month detail (FCC detailed design v1.1, Cash flow sheet) — tap any bar and see exactly why that
// month looks the way it does. A PURE RENDERER over one F2/F5 cell: every number comes from the one
// model hook; this component computes NOTHING of its own (the one-concept-one-helper rule).
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { budgetVsActual } from '../domain/budget';
import { useCashflowModel } from '../hooks/useCashflowModel';
import { maskedMoney, spokenMoney } from '../components/useMoney';

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = (d?: number) => (d ? ` · ${ord(d)}` : '');
const ord = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export default function MonthDetailScreen() {
  const params = useLocalSearchParams<{ slot?: string }>();
  const store = useStore() as any;
  const [slot, setSlot] = useState(() => Math.min(11, Math.max(0, parseInt(String(params.slot ?? '0'), 10) || 0)));
  const { lens, year, grid } = useCashflowModel();

  const cell = grid.cells[slot];
  const pm = year.months[slot];
  const title = cell ? `${MONTHS_LONG[cell.calendarMonth - 1]} ${cell.year}` : '';
  const isCurrent = slot === 0;
  const bva = useMemo(() => (isCurrent ? budgetVsActual(store.expenses ?? [], store.onboardingProfile, new Date()) : null), [isCurrent, store.expenses, store.onboardingProfile]);

  if (!cell) return null;

  const retired = lens === 'retired';
  const headline = retired ? pm.netSafeToSpend : cell.net;
  const biggestBill = retired ? pm.bills[0] : cell.billItems.filter((b: any) => b.label !== 'Everyday spending')[0];
  const reason = retired
    ? (pm.billsTotal > 0 ? `lower than usual — ${biggestBill?.label ?? 'a big bill'} lands this month` : null)
    : (cell.net < -0.005 ? `short month — ${biggestBill?.label ?? 'spending'} exceeds what comes in` : null);

  // regular bills: the everyday envelope + debts (listed for completeness, never subtracted twice)
  const regulars = cell.billItems.filter((b: any) => b.kind === 'debt' || b.label === 'Everyday spending');
  const bigBills = retired ? pm.bills : cell.billItems.filter((b: any) => b.kind === 'bill' && b.label !== 'Everyday spending');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* previous / next month within the 12-month window */}
      <View style={styles.navRow}>
        <TouchableOpacity accessibilityRole="button" disabled={slot === 0} onPress={() => setSlot(slot - 1)}
          accessibilityLabel="Previous month">
          <Text style={[styles.navTxt, slot === 0 && styles.navOff]}>‹ {slot > 0 ? grid.cells[slot - 1].label : 'window edge'}</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <TouchableOpacity accessibilityRole="button" disabled={slot === 11} onPress={() => setSlot(slot + 1)}
          accessibilityLabel="Next month">
          <Text style={[styles.navTxt, slot === 11 && styles.navOff]}>{slot < 11 ? grid.cells[slot + 1].label : 'window edge'} ›</Text>
        </TouchableOpacity>
      </View>

      {/* headline + reason (the same cell the bar and — for the current month — the hero show) */}
      <View style={styles.card}
        accessible accessibilityLabel={`${retired ? 'Safe to spend' : 'Left over'} in ${title}: ${spokenMoney(headline)}${reason ? `. ${reason}` : ''}${isCurrent ? '. As of today.' : ''}`}>
        <Text style={styles.cardHdr}>{retired ? 'SAFE TO SPEND' : 'LEFT OVER'}{isCurrent ? ' · AS OF TODAY' : ''}</Text>
        <Text style={[styles.headline, headline < 0 && { color: Colors.red }]}>{headline < 0 ? `− ${maskedMoney(Math.abs(headline))} short` : maskedMoney(headline)}</Text>
        {reason && <Text style={styles.reason}>⚑ {reason}</Text>}
      </View>

      {/* money in, with real dates — rows visibly sum */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>MONEY IN</Text>
        {retired ? (
          <>
            {pm.guaranteed.map((g: any, i: number) => <Row key={i} label={`${g.source}${day(g.day)}`} value={maskedMoney(g.amount)} />)}
            {pm.safeDraw > 0 && <Row label="Safe draw from savings" value={maskedMoney(pm.safeDraw)} />}
            <View style={styles.dividerLine} />
            <Row label="= In" value={maskedMoney(pm.guaranteedTotal + pm.safeDraw)} strong />
          </>
        ) : (
          <>
            {cell.incomeItems.length === 0 && <Text style={styles.empty}>No income mapped for this month.</Text>}
            {cell.incomeItems.map((i: any, k: number) => <Row key={k} label={`${i.source}${day(i.day)}${i.approx ? ' (about)' : ''}`} value={maskedMoney(i.amount)} />)}
            {cell.incomeItems.length > 0 && <View style={styles.dividerLine} />}
            {cell.incomeItems.length > 0 && <Row label="= In" value={maskedMoney(cell.inflow)} strong />}
          </>
        )}
      </View>

      {/* big dated bills — absence is information, the section never silently disappears */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>BIG BILLS THIS MONTH</Text>
        {bigBills.length === 0 && <Text style={styles.empty}>No big bills this month.</Text>}
        {bigBills.map((b: any, i: number) => <Row key={i} label={`${b.label}${day(b.day)}`} value={`−${maskedMoney(b.amount)}`} />)}
        {retired && (
          <>
            <View style={styles.dividerLine} />
            <Row label="= Safe to spend" value={maskedMoney(pm.netSafeToSpend)} strong />
          </>
        )}
      </View>

      {/* regular bills the envelope pays for (never subtracted twice) */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>REGULAR BILLS</Text>
        <Text style={styles.cardHdrSub}>{retired ? 'These come out of your safe-to-spend.' : 'Including everyday spending.'}</Text>
        {regulars.length === 0 && <Text style={styles.empty}>No regular bills recorded.</Text>}
        {regulars.map((b: any, i: number) => <Row key={i} label={`${b.label}${day(b.day)}`} value={maskedMoney(b.amount)} />)}
        {isCurrent && bva && (
          <Text style={styles.soFar}>So far this month: {maskedMoney(Math.round(bva.spent_total))} spent of {maskedMoney(Math.round(bva.planned_total))} planned.</Text>
        )}
      </View>

      <Text style={styles.footer}>Estimates — these move with your live account balances.</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.rowL, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowV, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  navTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary, paddingVertical: 12, minWidth: 64, minHeight: 44, textAlignVertical: 'center' },
  navOff: { color: Colors.textTertiary },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  cardHdrSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 1, marginBottom: 2 },
  headline: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  reason: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 19 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  rowV: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '800' },
  dividerLine: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  empty: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 4 },
  soFar: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 8 },
  footer: { fontSize: 12.5, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
