// Cash flow → Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-v5, frames 5a and 5b.
//
// TWO TOTALS, NEVER ONE, and each says which it is. Every figure comes from MK-CF-O-004
// incomeSummary — the screen adds nothing up itself.
//
// A RECAP SHOWS, IT DOES NOT ASK (founder, 2026-08-28). The tax rate is set in one place, on Your
// base pay, and this screen reads it and says whose it is.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { money } from '../domain/_shared/num';

export default function IncomeSummaryScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const sum = useMemo(() => incomeSummary(op), [op]);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }} automaticallyAdjustKeyboardInsets>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Back">
        <Text style={s.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={s.h1}>Your income</Text>
      <Text style={s.sub}>Everything coming in, and what reaches your bank</Text>

      <View style={s.bandRow}>
        <Text style={s.band}>What lands each month</Text>
        <Text style={s.bandNum}>{sum.ready ? money(sum.lands.usualMonth) : '—'}</Text>
      </View>
      <View style={s.card}>
        {!sum.ready ? (
          <>
            <Text style={s.empty}>
              Nothing yet. Tell us where your money comes from and this fills in — it is what every other screen
              measures against.
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/base-pay')}
              accessibilityLabel="Add your income">
              <Text style={s.link}>Add your income ›</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {sum.lands.lines.map((l) => <Row key={l.label} label={l.label} note={l.note} value={money(l.amount)} />)}
            <Row label="= A usual month" value={money(sum.lands.usualMonth)} strong />
            {sum.lands.standoutMonth && (
              <Row label={sum.lands.standoutMonth.label} note="its own month, never spread"
                   value={money(sum.lands.standoutMonth.amount)} />
            )}
            {sum.taxedNotLanded > 0 && (
              <Text style={s.note}>
                Your {money(sum.taxedNotLanded)} a month of interest and dividends is not here — it is reinvested
                where it is earned and never reaches your bank. It is taxed, so it appears below.
              </Text>
            )}
          </>
        )}
      </View>

      <View style={s.bandRow}>
        <Text style={s.band}>What it is taxed on</Text>
        <Text style={s.bandNum}>{sum.ready ? money(sum.taxed.grossAnnual) : '—'}</Text>
      </View>
      <View style={s.card}>
        {!sum.ready ? (
          <Text style={s.empty}>We will work this out once you have told us about a wage.</Text>
        ) : (
          <>
            {sum.taxed.lines.map((l) => <Row key={l.label} label={l.label} value={money(l.amount)} />)}
            <Row label="= Gross a year" value={money(sum.taxed.grossAnnual)} strong />
            <Row label="Federal tax bracket" note="every source counted"
                 value={`${Math.round(sum.taxed.bracket * 100)}%`} />
            <Row label={sum.taxed.estimated ? 'Estimated federal tax' : 'Tax'}
                 note={sum.taxed.estimated
                   ? 'assumes you take the standard deduction'
                   : `${sum.taxed.whose} (edit on Your base pay screen)`}
                 value={`${sum.taxed.estimated ? '≈' : ''}${money(sum.taxed.tax)}/yr`} />
            <Text style={s.note}>
              {sum.taxed.estimated
                ? 'Federal only — it knows nothing about your state, and nothing about Social Security or Medicare.'
                : 'Your own rate, used on every figure built from what lands in your bank.'}
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => router.push('/base-pay')}
        accessibilityLabel="Edit your income">
        <Text style={s.ctaT}>Edit your income</Text>
      </TouchableOpacity>
    </ScrollView>
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
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
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
