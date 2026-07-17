// Build credit — a beginner-friendly utilization calculator, score band, and the habits that move
// your score. Aimed at students / young adults building credit for the first time.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { creditUtilization, creditScoreBand, type Debt } from '../domain/debt';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

const HABITS = [
  { icon: '📅', title: 'Pay on time, every time', sub: 'Payment history is the biggest factor. Even one late payment hurts. Autopay the minimum so you never miss.' },
  { icon: '📉', title: 'Keep balances under 30%', sub: 'Using a small slice of your limit signals you’re not stretched. Under 10% is even better.' },
  { icon: '⏳', title: 'Keep old cards open', sub: 'A longer average account age helps. Don’t close your first card once you have more.' },
  { icon: '🔍', title: 'Apply sparingly', sub: 'Each application is a hard inquiry that dips your score a little. Space them out.' },
  { icon: '🆓', title: 'Check your report free', sub: 'You’re entitled to a free report at AnnualCreditReport.com — dispute any errors you find.' },
];

export default function CreditScreen() {
  const store = useStore() as any;
  const cards: Debt[] = (store.liabilities ?? []).filter((d: Debt) => d.debt_type === 'CREDIT_CARD');
  const cardBal = cards.reduce((t, d) => t + (d.remaining_balance || 0), 0);

  const [balStr, setBalStr] = useState(cardBal > 0 ? String(Math.round(cardBal)) : '');
  const [limStr, setLimStr] = useState('');
  const [scoreStr, setScoreStr] = useState('');
  const bal = num(balStr), lim = num(limStr), score = num(scoreStr);

  const util = useMemo(() => creditUtilization(bal, lim), [bal, lim]);
  const band = score > 0 ? creditScoreBand(score) : null;
  const utilColor = util.status === 'good' ? Colors.primary : util.status === 'caution' ? Colors.amber : Colors.red;

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Build credit</Text>
      <Text style={styles.sub}>Good credit means better loan and refinancing rates, cheaper insurance in many states, and faster fraud recovery. Here’s where you stand and how to keep it strong.</Text>

      {/* utilization calculator */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Credit utilization</Text>
        <View style={styles.inRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldL}>Card balance</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={balStr} onChangeText={setBalStr} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldL}>Total credit limit</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={limStr} onChangeText={setLimStr} />
          </View>
        </View>
        {lim > 0 ? (
          <>
            <View style={styles.utilHead}>
              <Text style={[styles.utilPct, { color: utilColor }]}>{Math.round(util.ratio * 100)}%</Text>
              <Text style={styles.utilStatus}>{util.status === 'good' ? 'Healthy — under 30%' : util.status === 'caution' ? 'A bit high — aim under 30%' : 'High — paying this down helps fast'}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, util.ratio * 100)}%`, backgroundColor: utilColor }]} />
              <View style={styles.mark30} />
            </View>
            <Text style={styles.dollarLine}>{money(bal)} of {money(lim)} used — the line marks 30%.</Text>
          </>
        ) : <Text style={styles.tiny}>Enter your total limit to see your utilization.</Text>}
      </View>

      {/* score band */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your credit score (optional)</Text>
        <TextInput style={styles.input} keyboardType="number-pad" placeholder="e.g. 720" placeholderTextColor={Colors.textTertiary} value={scoreStr} onChangeText={setScoreStr} />
        {band
          ? <Text style={[styles.bandTxt, { color: band.good ? Colors.primary : Colors.amber }]}>{score} · {band.label}</Text>
          : <Text style={styles.dollarLine}>Many banks show your score free. Ranges: 800+ excellent · 740+ very good · 670+ good · 580+ fair.</Text>}
      </View>

      {/* habits */}
      <Text style={styles.section}>WHAT MOVES YOUR SCORE</Text>
      {HABITS.map((h) => (
        <View key={h.title} style={styles.habit}>
          <Text style={styles.habitIcon}>{h.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.habitTitle}>{h.title}</Text>
            <Text style={styles.habitSub}>{h.sub}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.foot}>General guidance, not credit advice. Scores vary by model (FICO, VantageScore).</Text>
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  inRow: { flexDirection: 'row', gap: Spacing.sm },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  utilHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 },
  utilPct: { fontSize: 28, fontWeight: '800' },
  utilStatus: { fontSize: 12.5, color: Colors.textSecondary, flex: 1 },
  track: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, marginTop: 8, position: 'relative', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  mark30: { position: 'absolute', left: '30%', top: -2, bottom: -2, width: 2, backgroundColor: Colors.textPrimary },
  tiny: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  dollarLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18, fontVariant: ['tabular-nums'] },
  bandTxt: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 20, marginBottom: 6 },
  habit: { flexDirection: 'row', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 8 },
  habitIcon: { fontSize: 22 },
  habitTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  habitSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  foot: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
