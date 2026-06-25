// Life-insurance needs calculator — how much coverage protects your family, prefilled from your
// income and debts. DIME-style: income replacement + debts + future goals + final expenses − assets.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { lifeInsuranceNeed } from '../domain/planning';
import { totalGrossAnnual } from '../domain/income';
import { investableAssets } from '../domain/assets';
import { totalDebtBalance } from '../domain/debt';   // canonical total debt, single source

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function InsuranceScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const incomeGuess = Math.round(totalGrossAnnual(op));
  const debtGuess = Math.round(totalDebtBalance(store.liabilities ?? []));
  // B-36: prefill savings/assets from the user's investable accounts so a wealthy household isn't
  // shown a multimillion-dollar "gap" just because the field defaulted to $0.
  const savingsGuess = Math.round(investableAssets(store.assetAccounts ?? []));

  const [income, setIncome] = useState(incomeGuess > 0 ? String(incomeGuess) : '');
  const [years, setYears] = useState('10');
  const [debts, setDebts] = useState(debtGuess > 0 ? String(debtGuess) : '');
  const [goals, setGoals] = useState('');
  const [final, setFinal] = useState('15000');
  const [savings, setSavings] = useState(savingsGuess > 0 ? String(savingsGuess) : '');
  const [existing, setExisting] = useState('');

  const need = useMemo(() => lifeInsuranceNeed({
    annualIncome: num(income), yearsToReplace: num(years), debts: num(debts), futureGoals: num(goals),
    finalExpenses: num(final), liquidSavings: num(savings), existingCoverage: num(existing),
  }), [income, years, debts, goals, final, savings, existing]);

  const field = (label: string, v: string, set: (t: string) => void, suffix = '$') => (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldL}>{label}</Text>
      <View style={styles.inputRow}>
        {suffix === '$' ? <Text style={styles.pre}>$</Text> : null}
        <TextInput style={styles.input} keyboardType="decimal-pad" value={v} onChangeText={set} placeholder="0" placeholderTextColor={Colors.textTertiary} />
        {suffix !== '$' ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Life insurance check</Text>
      <Text style={styles.sub}>If something happened to you, how much would keep your family secure? Prefilled from your income and debts.</Text>

      <View style={styles.card}>
        <View style={styles.row}>{field('Your annual income', income, setIncome)}{field('Years to replace', years, setYears, 'yrs')}</View>
        <View style={styles.row}>{field('Debts to clear', debts, setDebts)}{field('Future goals (college…)', goals, setGoals)}</View>
        <View style={styles.row}>{field('Final expenses', final, setFinal)}{field('Savings/assets', savings, setSavings)}</View>
        <View style={styles.row}>{field('Coverage you already have', existing, setExisting)}<View style={{ flex: 1 }} /></View>
      </View>

      <View style={[styles.hero, { backgroundColor: need.gap > 0 ? Colors.primaryDark : Colors.primary }]}>
        <Text style={styles.heroLabel}>{need.gap > 0 ? 'Additional coverage to consider' : 'You appear well covered'}</Text>
        <Text style={styles.heroVal}>{money(need.gap)}</Text>
        <Text style={styles.heroSub}>{need.gap > 0 ? 'on top of what you already have' : 'your assets + coverage meet the estimated need'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.bd}><Text style={styles.bdL}>Income replacement ({num(years)} yrs)</Text><Text style={styles.bdV}>{money(need.incomeReplacement)}</Text></View>
        <View style={styles.bd}><Text style={styles.bdL}>+ Debts, goals & final expenses</Text><Text style={styles.bdV}>{money(need.totalNeed - need.incomeReplacement)}</Text></View>
        <View style={styles.bd}><Text style={styles.bdL}>Total need</Text><Text style={[styles.bdV, styles.bold]}>{money(need.totalNeed)}</Text></View>
        <View style={styles.bd}><Text style={styles.bdL}>− Savings & existing coverage</Text><Text style={styles.bdV}>−{money(need.covered)}</Text></View>
        <View style={[styles.bd, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 }]}><Text style={[styles.bdL, styles.bold]}>Gap</Text><Text style={[styles.bdV, styles.bold, { color: need.gap > 0 ? Colors.red : Colors.primary }]}>{money(need.gap)}</Text></View>
      </View>

      <Text style={styles.foot}>A rule-of-thumb estimate (DIME method), not a recommendation. Term life is usually the cheapest way to cover a gap like this.</Text>
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 4 },
  fieldL: { fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4, marginTop: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  pre: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700' },
  input: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, fontSize: 15, color: Colors.textPrimary },
  suffix: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700' },
  hero: { borderRadius: Radii.lg, padding: Spacing.lg, marginTop: 12, alignItems: 'center' },
  heroLabel: { color: '#BEE7D8', fontSize: 12, fontWeight: '700' },
  heroVal: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#BEE7D8', fontSize: 12, marginTop: 4, textAlign: 'center' },
  bd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  bdL: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  bdV: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  bold: { fontWeight: '800' },
  foot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
