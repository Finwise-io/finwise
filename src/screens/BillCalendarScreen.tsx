// Bill calendar — month-by-month money in vs bills out, with a running balance so you can see when
// you'll come up short and which bills to prioritize. Built on the cashflow domain (CFPB-style).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { cashflowYear } from '../domain/cashflow';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function BillCalendarScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const cashOnHand = accounts.filter((x: any) => x.tax_bucket === 'CASH').reduce((t: number, x: any) => t + (x.balance || 0), 0);
  const [startStr, setStartStr] = useState(cashOnHand > 0 ? String(Math.round(cashOnHand)) : '');
  const start = num(startStr);

  const cf = useMemo(() => cashflowYear(op, start), [op, start]);
  const critical = (Array.isArray(op.spendCats) ? op.spendCats : []).filter((c: any) => (c.tier ?? 'flex') === 'critical' && num(c.amount) > 0);

  // bar scale across the running balance (can go negative)
  const bals = cf.months.map((m) => m.balance);
  const hi = Math.max(1, ...bals, start), lo = Math.min(0, ...bals);
  const span = hi - lo || 1;
  const zeroPct = ((0 - lo) / span) * 100;

  const short = cf.shortMonths.length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Bill calendar</Text>
      <Text style={styles.sub}>When money lands, when bills are due, and whether you make it through each month.</Text>

      <View style={styles.card}>
        <Text style={styles.fieldL}>Cash on hand now</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary}
          value={startStr} onChangeText={setStartStr} />
        <Text style={styles.tiny}>Your starting balance — we carry it forward month to month.</Text>
      </View>

      {/* verdict */}
      <View style={[styles.verdict, short ? styles.verdictBad : styles.verdictGood]}>
        <Text style={[styles.verdictTitle, short && { color: Colors.red }]}>
          {short ? `⚠ Tight in ${cf.shortMonths.join(', ')}` : '✓ You stay positive all year'}
        </Text>
        <Text style={styles.verdictSub}>
          {short
            ? `Your balance dips to ${money(cf.lowestBalance)} at its lowest. Plan ahead for those months.`
            : `Lowest point in the year is ${money(cf.lowestBalance)}.`}
        </Text>
      </View>

      {/* month-by-month running balance */}
      <View style={styles.card}>
        <View style={styles.rowHead}>
          <Text style={[styles.hCell, { flex: 1 }]}>Month</Text>
          <Text style={[styles.hCell, styles.numCell]}>In</Text>
          <Text style={[styles.hCell, styles.numCell]}>Out</Text>
          <Text style={[styles.hCell, styles.numCell]}>Balance</Text>
        </View>
        {cf.months.map((m) => {
          const neg = m.balance < 0;
          const fillPct = (Math.abs(m.balance) / span) * 100;
          return (
            <View key={m.label} style={styles.mRow}>
              <View style={styles.mTop}>
                <Text style={[styles.mLabel, { flex: 1 }]}>{m.label}</Text>
                <Text style={[styles.mNum, styles.numCell, { color: Colors.primary }]}>{m.inflow > 0 ? '+' + money(m.inflow) : '—'}</Text>
                <Text style={[styles.mNum, styles.numCell]}>{m.outflow > 0 ? '−' + money(m.outflow) : '—'}</Text>
                <Text style={[styles.mNum, styles.numCell, { fontWeight: '800', color: neg ? Colors.red : Colors.textPrimary }]}>{money(m.balance)}</Text>
              </View>
              {/* running-balance bar with a zero line */}
              <View style={styles.track}>
                <View style={[styles.zeroLine, { left: `${zeroPct}%` }]} />
                <View style={[styles.fill, neg
                  ? { right: `${100 - zeroPct}%`, width: `${fillPct}%`, backgroundColor: Colors.red }
                  : { left: `${zeroPct}%`, width: `${fillPct}%`, backgroundColor: Colors.primary }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* prioritize bills when short (CFPB) */}
      {short && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>If you can't pay everything, pay these first</Text>
          <Text style={styles.tiny}>Protect the essentials — housing, food, tuition, utilities — before anything optional.</Text>
          {critical.length > 0
            ? critical.map((c: any) => <Text key={c.id} style={styles.critItem}>• {c.label}</Text>)
            : <Text style={styles.critItem}>• Add your must-pay costs in the spending plan to see them here.</Text>}
          <Text style={[styles.tiny, { marginTop: 8 }]}>Then important bills (phone, insurance, transport), and pause nice-to-haves (dining, travel) in tight months.</Text>
        </View>
      )}

      <Text style={styles.foot}>Money in is shown after estimated tax. Scholarships, grants, loans, and non-monthly bills land in the months you chose. A rough view to plan around — not exact to the day.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  tiny: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  verdict: { borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  verdictGood: { backgroundColor: Colors.primaryLight },
  verdictBad: { backgroundColor: '#FBE9E7' },
  verdictTitle: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  verdictSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  rowHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hCell: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  numCell: { width: 74, textAlign: 'right' },
  mRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  mTop: { flexDirection: 'row', alignItems: 'center' },
  mLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  mNum: { fontSize: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.bgTertiary, marginTop: 6, position: 'relative', overflow: 'hidden' },
  zeroLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: Colors.textTertiary },
  fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
  critItem: { fontSize: 13, color: Colors.textPrimary, marginTop: 4, fontWeight: '600' },
  foot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
});
