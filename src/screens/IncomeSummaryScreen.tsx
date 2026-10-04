// Cash flow → Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE, and each says which it is. Every figure comes from MK-CF-O-004
// incomeSummary — the screen adds nothing up itself.
//
// A RECAP SHOWS, IT DOES NOT ASK (founder, 2026-08-28). The tax rate is set in one place, on Your
// base pay, and this screen reads it and says whose it is.
import { EmptyNote } from '../components/UI';
import TopBar from '../components/TopBar';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { fig, figPer } from '../components/figure';

export default function IncomeSummaryScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const sum = useMemo(() => incomeSummary(op), [op]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <TopBar back />
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }} automaticallyAdjustKeyboardInsets>
      <Text style={s.h1}>Your income</Text>
      <Text style={s.sub}>Everything coming in, and what reaches your bank</Text>

      <View style={s.bandRow}>
        <Text style={s.band}>Take-home each month</Text>
        <Text style={s.bandNum}>{fig('MK-CF-M-037', sum.ready ? sum.lands.usualMonth : 0)}</Text>   {/* Q48: $0, never a dash */}
      </View>
      <View style={s.card}>
        {!sum.ready ? (
          <>
            <EmptyNote door="income" onPress={() => router.push('/base-pay' as any)} />   {/* Q48 (MK-MN-M-011/013) */}
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/base-pay')}
              accessibilityLabel="Add your income">
              <Text style={s.link}>Add your income ›</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {sum.lands.lines.map((l) => <Row key={l.label} label={l.label} note={l.note} value={fig('MK-CF-M-038', l.amount)} />)}
            <Row label={sum.lands.totalLabel} value={fig('MK-CF-M-037', sum.lands.usualMonth)} strong />
            {sum.lands.standoutMonth && (
              <Row label={sum.lands.standoutMonth.label} note={sum.lands.standoutMonth.note}
                   value={fig('MK-CF-M-039', sum.lands.standoutMonth.amount)} />
            )}
            {sum.taxedNotLanded > 0 && (
              <Text style={s.note}>
                Your {fig('MK-CF-M-040', sum.taxedNotLanded)}/month of interest and dividends is not here — it is reinvested
                where it is earned and never reaches your bank. It is taxed, so it appears below.
              </Text>
            )}
          </>
        )}
      </View>

      <View style={s.bandRow}>
        <Text style={s.band}>What it is taxed on</Text>
        <Text style={s.bandNum}>{fig('MK-CF-M-041', sum.ready ? sum.taxed.grossAnnual : 0)}</Text>   {/* Q48: $0, never a dash */}
      </View>
      <View style={s.card}>
        {!sum.ready ? (
          <EmptyNote door="income" onPress={() => router.push('/base-pay' as any)} />   /* Q48 (MK-MN-M-012) */
        ) : (
          <>
            {sum.taxed.lines.map((l) => <Row key={l.label} label={l.label} value={fig('MK-CF-M-042', l.amount)} />)}
            <Row label="= Gross /year" value={fig('MK-CF-M-041', sum.taxed.grossAnnual)} strong />
            <Row label="Federal tax bracket" note={`${sum.taxed.filing.replace(/^Married /, '').toLowerCase()}, every source counted`}
                 value={fig('MK-CF-M-043', sum.taxed.bracket)} />
            <Row label={sum.taxed.estimated ? 'Calculated federal tax' : 'Tax'}
                 note={sum.taxed.estimated
                   ? 'assumes you take the standard deduction'
                   : `${sum.taxed.whose} (edit on Your base pay screen)`}
                 value={`${sum.taxed.estimated ? '≈' : ''}${figPer('MK-CF-M-044', sum.taxed.tax)}`} />
            <Text style={s.note}>
              {sum.taxed.estimated
                ? 'Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.'
                : sum.taxed.closing}
            </Text>
          </>
        )}
      </View>

      {/* nothing to edit on a fresh account — the door above adds; the drawing's empty frame has no button here */}
      {sum.ready && (
        <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => router.push('/base-pay')}
          accessibilityLabel="Edit your income">
          <Text style={s.ctaT}>Edit your income</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </View>
  );
}

function Row({ label, note, value, strong }: { label: string; note?: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowL, strong && s.rowLStrong]}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <Text style={[s.rowV, strong && s.rowVStrong]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  back: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  band: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: 24 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bandNum: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 24, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  rowL: { fontSize: 13, color: Colors.textSecondary },
  rowLStrong: { fontWeight: '800', color: Colors.textPrimary, fontSize: 15 },
  rowNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowVStrong: { fontSize: 17, fontWeight: '800' },
  note: { fontSize: 11, color: Colors.textSecondary, lineHeight: 17, marginTop: 10 },
  empty: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  link: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark, marginTop: 12 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 15, fontWeight: '800', color: Colors.white },
});
