// Estate & legacy checklist — the documents and designations that make sure your wishes are
// followed and your family isn't left untangling things. Progress is saved.
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';

const ITEMS: { id: string; title: string; sub: string; who?: string }[] = [
  { id: 'will', title: 'Write a will', sub: 'Says who gets what and (if you have kids) who raises them. Without one, the state decides.' },
  { id: 'beneficiaries', title: 'Set account beneficiaries', sub: 'On 401(k)/IRA, life insurance, and bank accounts. These override your will, so keep them current.' },
  { id: 'poa', title: 'Power of attorney', sub: 'Lets someone you trust handle money/legal matters if you can\'t.' },
  { id: 'healthcare', title: 'Healthcare directive', sub: 'A living will + medical proxy so your care wishes are known.' },
  { id: 'guardian', title: 'Name a guardian for kids', sub: 'If you have minor children, name who would care for them.' },
  { id: 'docs', title: 'Organize key documents', sub: 'Insurance, deeds, accounts, passwords — somewhere a trusted person can find them.' },
  { id: 'beneficiary_review', title: 'Review after big life events', sub: 'Marriage, divorce, a new child, a death — revisit your will and beneficiaries.' },
];

export default function EstateScreen() {
  const store = useStore() as any;
  const plan: Record<string, boolean> = store.estatePlan ?? {};
  const done = ITEMS.filter((i) => plan[i.id]).length;
  const pct = Math.round((done / ITEMS.length) * 100);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Estate & legacy</Text>
      <Text style={styles.sub}>A short checklist so your wishes are followed and your family isn't left guessing. Tap each as you handle it.</Text>

      <View style={styles.progressCard}>
        <Text style={styles.pct}>{pct}%</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.pctLabel}>{done} of {ITEMS.length} in place</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${pct}%` }]} /></View>
        </View>
      </View>

      {ITEMS.map((item) => {
        const on = !!plan[item.id];
        return (
          <TouchableOpacity key={item.id} style={styles.item} activeOpacity={0.8} onPress={() => store.toggleEstateItem?.(item.id)}>
            <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={styles.checkMark}>✓</Text> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, on && styles.itemTitleOn]}>{item.title}</Text>
              <Text style={styles.itemSub}>{item.sub}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.foot}>General guidance, not legal advice. Many of these can be done online or with an estate attorney for complex situations.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  pct: { fontSize: 30, fontWeight: '800', color: Colors.primary },
  pctLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.bgTertiary, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 8, alignItems: 'flex-start' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 15, fontWeight: '900' },
  itemTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  itemTitleOn: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  itemSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 19 },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
