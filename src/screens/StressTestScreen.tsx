// Emergency "what if" — stress-test a sudden expense (medical, car, job loss) against your cash:
// can you absorb it, how long would you last, and how big should your emergency fund be?
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { emergencyTest, monthlyEssentials } from '../domain/budget';
import { cashTotal } from '../domain/assets';   // canonical cash, single source
import { Disclaimer } from '../components/Disclaimer';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const PRESETS = [
  { label: '🩺 Medical bill', amount: 3000 },
  { label: '🚗 Car repair', amount: 1500 },
  { label: '🦷 Dental', amount: 1200 },
  { label: '💻 New laptop', amount: 1500 },
];

export default function StressTestScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const cashGuess = cashTotal(accounts);

  const [cashStr, setCashStr] = useState(cashGuess > 0 ? String(Math.round(cashGuess)) : '');
  const [shockStr, setShockStr] = useState('3000');
  const cash = num(cashStr), shock = num(shockStr);
  const r = useMemo(() => emergencyTest(op, cash, shock), [op, cash, shock]);
  const ess = monthlyEssentials(op);

  const tone = (months: number) => (months >= 6 ? Colors.primary : months >= 3 ? Colors.amber : Colors.red);

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>What if…?</Text>
      <Text style={styles.sub}>Test a surprise expense against your cash — see if you can absorb it and how long you'd last.</Text>

      <View style={styles.card}>
        <Text style={styles.fieldL}>Cash you could tap today</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={cashStr} onChangeText={setCashStr} />
        <Text style={styles.fieldL}>The surprise expense</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={shockStr} onChangeText={setShockStr} />
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.label} style={[styles.preset, shock === p.amount && styles.presetOn]} onPress={() => setShockStr(String(p.amount))}>
              <Text style={[styles.presetTxt, shock === p.amount && styles.presetTxtOn]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* the hit */}
      <View style={[styles.verdict, { backgroundColor: r.coversIt ? Colors.primaryLight : Colors.redLight }]}>
        <Text style={[styles.vTitle, { color: r.coversIt ? Colors.primaryDark : Colors.red }]}>
          {r.coversIt ? `✓ You could cover a ${money(shock)} hit` : `⚠ A ${money(shock)} hit would put you ${money(Math.abs(r.cashAfter))} in the red`}
        </Text>
        <Text style={styles.vSub}>
          {r.coversIt
            ? `You'd have ${money(r.cashAfter)} left — about ${r.runwayAfter.toFixed(1)} months of essentials (${money(ess)}/mo).`
            : `You'd need ${money(Math.abs(r.cashAfter))} more to absorb it without borrowing.`}
        </Text>
      </View>

      {/* job loss */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>If you lost your income</Text>
        {ess > 0 ? (
          <>
            <View style={styles.bigRow}>
              <Text style={[styles.big, { color: tone(r.jobLossRunway) }]}>{r.jobLossRunway.toFixed(1)}</Text>
              <Text style={styles.bigUnit}>months your cash would last</Text>
            </View>
            <Text style={styles.note}>Covering your {money(ess)}/mo of must-pay bills with no paycheck coming in. 3–6 months of essentials is the range most planners use.</Text>
          </>
        ) : (
          <Text style={styles.note}>Add your monthly must-pay bills (rent, food, utilities) in your spending plan to see how long your cash would last.</Text>
        )}
      </View>

      {/* emergency fund target */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your emergency fund</Text>
        {r.gapToFund > 0 ? (
          <Text style={styles.fundTxt}>3 months of essentials is <Text style={styles.bold}>{money(r.recommendedFund)}</Text>. You're <Text style={[styles.bold, { color: Colors.amber }]}>{money(r.gapToFund)}</Text> short of it today — a goal can track it, if you want one.</Text>
        ) : (
          <Text style={styles.fundTxt}>✓ You already have at least 3 months of essentials set aside. A strong cushion — some stretch toward 6 months — your call.</Text>
        )}
      </View>

      {/* P0 (design audit ST-1): the definition every number depends on — body size, never fine print */}
      <Text style={styles.essDef}>“Essentials” are your recurring must-pay bills (Critical + Important), not one-off or nice-to-have spending. A planning estimate.</Text>
      <Disclaimer />
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  preset: { paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
  presetOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  presetTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  presetTxtOn: { color: Colors.primaryDark },
  verdict: { borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  vTitle: { fontSize: 15, fontWeight: '800' },
  vSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  big: { fontSize: 32, fontWeight: '800' },
  bigUnit: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  fundTxt: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  bold: { fontWeight: '800' },
  foot: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 15, marginTop: 14 },
  essDef: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 14 },
});
