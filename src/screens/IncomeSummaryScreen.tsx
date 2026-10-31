// Cash flow → Your income — everything coming in, and what reaches your bank.
//
// Built from the approved mock: income-end-to-end_v07, frames 5a and 5b (phones 16 and 17) — held to it word for word, figure
// for figure, by src/screens/__tests__/income_matches_v07.test.tsx.
//
// TWO TOTALS, NEVER ONE, and each says which it is. Every figure comes from MK-CF-O-004
// incomeSummary — the screen adds nothing up itself.
//
// A RECAP SHOWS, IT DOES NOT ASK (founder, 2026-08-28). The tax rate is set in one place, on Your
// base pay, and this screen reads it and says whose it is.
//
// 2026-10-25 (CF-MMFIX-B; drawing check IN-03, IN-11, IN-13 to IN-15; READ THIS FIRST rows of that day): a figure worked with
// the calculated rate wears ≈, as Your base pay prints it; a fresh account shows its door once; the headings are the drawn bands,
// their totals on the rows' right edge; the sums are green and the notes sit in the drawn boxes.
//
// 2026-10-27 (FX-CF-B, the drawing check IN2-01, IN2-02, IN2-12): a fresh account prints its door once, under the first heading —
// the second keeps the $0 and the sentence (the v07 row of 2026-10-25); row labels are ink, as drawn; every figure is one size,
// the totals bold at the rows' size with the drawn rule above them (DEC-0093: "make all $$ same size and make totals bold").
import { EmptyNote } from '../components/UI';
import TopBar from '../components/TopBar';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { fig, figPer } from '../components/figure';
import { SectionBand } from '../components/SectionBand';


export default function IncomeSummaryScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  // the accounts' interest and dividends count in the tax (2026-10-25, FIX-INCOME-B; the lead's ruling from DEC-0179): handed in
  const sum = useMemo(() => incomeSummary(op, { accounts: store.assetAccounts, transactions: store.transactions }), [op, store.assetAccounts, store.transactions]);
  // an estimate says so (rule 9): ≈ on every figure worked with the calculated rate, never on one of theirs (IN-03)
  const approx = (on?: boolean) => (on ? '≈' : '');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <TopBar back />
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }} automaticallyAdjustKeyboardInsets>
      <Text style={s.h1}>Your income</Text>
      <Text style={s.sub}>Everything coming in, and what reaches your bank</Text>

      <View style={s.group}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="Take-home each month"
          value={`${approx(sum.ready && sum.lands.approx)}${fig('MK-CF-M-037', sum.ready ? sum.lands.usualMonth : 0)}`} />   {/* Q48: $0, never a dash */}
        {!sum.ready ? (
          /* Q48 (MK-MN-M-011/013): the one line and its door — once (IN-11, 2026-10-25: the same door printed twice in a row) */
          <EmptyNote door="income" onPress={() => router.push('/base-pay' as any)} />
        ) : (
          <>
            {sum.lands.lines.map((l) => <Row key={l.label} label={l.label} note={l.note} value={`${approx(l.approx)}${fig('MK-CF-M-038', l.amount)}`} />)}
            <Row label={sum.lands.totalLabel} value={`${approx(sum.lands.approx)}${fig('MK-CF-M-037', sum.lands.usualMonth)}`} strong tone="pos" />
            {sum.lands.standoutMonth && (
              <Row label={sum.lands.standoutMonth.label} note={sum.lands.standoutMonth.note} tone="dim"
                   value={`${approx(sum.lands.standoutMonth.approx)}${fig('MK-CF-M-039', sum.lands.standoutMonth.amount)}`} />
            )}
            {sum.taxedNotLanded > 0 && (
              <Text style={s.info}>
                Your {fig('MK-CF-M-040', sum.taxedNotLanded)}/month of interest and dividends is not here — it is reinvested
                where it is earned and never reaches your bank. It is taxed, so it appears below.
              </Text>
            )}
            {/* shares that vest are not money to spend unless sold when they vest (2026-10-25, the lead's ruling, like DEC-0179) —
                said beside the dividends' sentence, in its words; dated row on income-end-to-end_v07 */}
            {sum.vestHeldAnnual > 0 && (
              <Text style={s.info}>
                Your {fig('MK-CF-M-009', sum.vestHeldAnnual)} of stock vesting this year is not here — it vests as shares, not money
                to spend. It is taxed, so it appears below.
              </Text>
            )}
          </>
        )}
      </View>

      <View style={s.group}>
        <SectionBand inCard light inset={Spacing.base} onRowEdges title="What it is taxed on"
          value={fig('MK-CF-M-041', sum.ready ? sum.taxed.taxedOn : 0)} />   {/* Q48: $0, never a dash · the gross less the 401(k)s (DEC-0283, 2026-10-24) */}
        {!sum.ready ? (
          /* Q48 (MK-MN-M-012): the sentence, and no second door — the one above opens the same place (IN2-12, 2026-10-27; the v07
             row of 2026-10-25 says "once") */
          <Text style={s.empty}>Nothing entered yet.</Text>
        ) : (
          <>
            {/* every source the year is taxed on, signed — they add to "= Gross /year" (2026-10-25, FIX-INCOME-B; DEC-0376) */}
            {sum.taxed.lines.map((l) => <Row key={l.label} label={l.label} note={l.note} value={`${approx(l.approx)}${fig('MK-CF-M-042', l.amount)}`} />)}
            <Row label="= Gross /year" value={fig('MK-CF-M-076', sum.taxed.grossAnnual)} strong />
            {/* WHAT IT IS TAXED ON, SHOWN BEING MADE (2026-10-24, DEC-0283): the 401(k)s come off the gross before tax, and the total
                is the figure the bracket and a calculated tax are worked on */}
            {/* a real $0 has no sign — never "−$0" */}
            <Row label="Your 401(k)s" value={`${sum.taxed.k401Annual > 0 ? '−' : ''}${fig('MK-CF-M-077', sum.taxed.k401Annual)}`} />
            <Row label="= What it is taxed on" value={fig('MK-CF-M-041', sum.taxed.taxedOn)} strong />
            <Row label="Federal tax bracket" note={`${sum.taxed.filing.replace(/^Married /, '').toLowerCase()}, every source counted`}
                 value={fig('MK-CF-M-043', sum.taxed.bracket)} />
            {/* a state rate entered is inside the calculated tax, so it is not "federal" (2026-10-25, the lead's ruling; canon row 25) */}
            <Row label={sum.taxed.estimated ? (sum.taxed.holdsState ? 'Calculated tax' : 'Calculated federal tax') : 'Tax'}
                 note={sum.taxed.estimated
                   ? 'assumes you take the standard deduction'
                   : `${sum.taxed.whose} (edit on Your base pay screen)`}
                 value={`${sum.taxed.estimated ? '≈' : ''}${figPer('MK-CF-M-044', sum.taxed.tax)}`} />
            <Text style={s.info}>
              {/* the calculated rate holds a state rate the person entered, so the line says so (2026-10-24, DEC-7608's class) */}
              {sum.taxed.estimated ? sum.taxed.calculatedNote : sum.taxed.closing}
            </Text>
            {/* what was entered and is counted nowhere yet, and why (2026-10-25, tenet 3): a vest with no date, a one-time payment
                with no year — never counted as $0 or as this year's */}
            {sum.notCounted.map((t) => <Text key={t} style={s.info}>{t}</Text>)}
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

function Row({ label, note, value, strong, tone }: { label: string; note?: string; value: string; strong?: boolean; tone?: 'pos' | 'dim' }) {
  return (
    <View style={[s.row, strong && s.rowTot]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowL, strong && s.rowLStrong, tone === 'dim' && s.dim]}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      {/* "= Inflow" green, the standout month grey — as drawn (phone 16; IN-15) */}
      <Text style={[s.rowV, strong && s.rowVStrong, tone === 'pos' && s.pos, tone === 'dim' && s.dim]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  // a banded group: square and white, as drawn; its band runs to its edges (SectionBand inCard) — DEC-0079
  group: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  // a row's label in ink, as drawn (IN2-01, 2026-10-27); a total row is bold at the rows' size under a rule (the drawn .rrow.tot)
  rowL: { fontSize: 13, color: Colors.textPrimary },
  rowLStrong: { fontWeight: '800', color: Colors.textPrimary },
  rowTot: { borderTopWidth: 1.5, borderTopColor: Colors.textPrimary },
  rowNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowVStrong: { fontWeight: '800' },   // every money figure one size (DEC-0093; IN2-02, 2026-10-27: it was 17 beside 15)
  pos: { color: Colors.gainText },
  dim: { color: Colors.textSecondary },
  // the empty sentence in EmptyNote's own type, without its door (IN2-12)
  empty: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, paddingVertical: 4 },
  // the drawing's information box: ink on the blue tint, a blue rule on its left (IN-15)
  info: { fontSize: 11, color: Colors.textPrimary, lineHeight: 17, marginTop: 10, backgroundColor: Colors.blueLight,
          borderLeftWidth: 3, borderLeftColor: Colors.blue, paddingVertical: 8, paddingHorizontal: 10 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 15, fontWeight: '800', color: Colors.white },
});
