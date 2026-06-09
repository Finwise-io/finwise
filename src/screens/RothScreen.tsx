// Roth conversion planner — in a low-income year, move pre-tax 401(k)/IRA to Roth to "fill" a low
// tax bracket: pay tax now at a low rate, then grow tax-free and dodge future RMDs.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { rothConversion } from '../domain/planning';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const BRACKETS = [{ r: 0.10, l: '10%' }, { r: 0.12, l: '12%' }, { r: 0.22, l: '22%' }, { r: 0.24, l: '24%' }];

export default function RothScreen() {
  const store = useStore() as any;
  const accounts = store.assetAccounts ?? [];
  const preTaxGuess = Math.round(accounts.filter((x: any) => x.tax_bucket === 'RETIREMENT').reduce((t: number, x: any) => t + (x.balance || 0), 0));

  const [bal, setBal] = useState(preTaxGuess > 0 ? String(preTaxGuess) : '');
  const [income, setIncome] = useState('');
  const [rate, setRate] = useState(0.12);
  const plan = useMemo(() => rothConversion({ preTaxBalance: num(bal), otherIncome: num(income), fillToRate: rate }), [bal, income, rate]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Roth conversion</Text>
      <Text style={styles.sub}>In a low-income year, move pre-tax retirement money to Roth and pay tax now at a low rate — then it grows tax-free and skips future RMDs.</Text>

      <View style={styles.card}>
        <Text style={styles.fieldL}>Pre-tax 401(k) / IRA balance</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} />
        <Text style={styles.fieldL}>Your other taxable income this year</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={income} onChangeText={setIncome} />
        <Text style={styles.fieldL}>Fill up to which bracket?</Text>
        <View style={styles.segRow}>
          {BRACKETS.map((b) => (
            <TouchableOpacity key={b.r} style={[styles.seg, rate === b.r && styles.segOn]} onPress={() => setRate(b.r)}>
              <Text style={[styles.segTxt, rate === b.r && styles.segTxtOn]}>{b.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: plan.roomToConvert > 0 ? Colors.primaryDark : Colors.cardBg }]}>
        <Text style={[styles.heroLabel, plan.roomToConvert <= 0 && { color: Colors.textTertiary }]}>Convert this year</Text>
        <Text style={[styles.heroVal, plan.roomToConvert <= 0 && { color: Colors.textPrimary }]}>{money(plan.roomToConvert)}</Text>
        <Text style={[styles.heroSub, plan.roomToConvert <= 0 && { color: Colors.textSecondary }]}>
          {plan.roomToConvert > 0
            ? `to fill the ${BRACKETS.find((b) => b.r === rate)?.l} bracket (up to ${money(plan.bracketTopGross)} income)`
            : 'Your income already fills this bracket — pick a higher one, or there\'s no room.'}
        </Text>
      </View>

      {plan.roomToConvert > 0 && (
        <View style={styles.card}>
          <View style={styles.bd}><Text style={styles.bdL}>Tax to pay now</Text><Text style={styles.bdV}>{money(plan.taxCost)}</Text></View>
          <View style={styles.bd}><Text style={styles.bdL}>Effective rate on the conversion</Text><Text style={styles.bdV}>{Math.round(plan.effectiveRate * 100)}%</Text></View>
          <Text style={styles.note}>Pay {money(plan.taxCost)} now so {money(plan.roomToConvert)} grows tax-free for life and won't trigger Required Minimum Distributions later. Best done in years your income dips (early retirement, a gap year, between jobs).</Text>
        </View>
      )}

      <Text style={styles.foot}>Federal estimate (single filer, {`${new Date().getFullYear()}`} brackets), ignores state tax and IRMAA/ACA effects. Not tax advice — confirm with a tax pro before converting.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13.5, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  segRow: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.cardBg },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTxtOn: { color: Colors.primaryDark },
  hero: { borderRadius: Radii.lg, padding: Spacing.lg, marginTop: 12, alignItems: 'center' },
  heroLabel: { color: '#BEE7D8', fontSize: 12, fontWeight: '700' },
  heroVal: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#BEE7D8', fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 17 },
  bd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  bdL: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  bdV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  note: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  foot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
