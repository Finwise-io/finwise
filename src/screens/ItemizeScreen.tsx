// "Itemize this account" (Mock C) — decompose a lump-sum account into its real holdings while a meter shows
// what's still unallocated. On Done we delete the lump and create the holdings (institution inherited); a
// positive remainder is kept as cash so the account TOTAL never drifts (buildItemizedAccounts).
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DateField } from '../components/DateField';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { currencySymbol } from '../domain/_shared/money';
import type { AssetAccount } from '../domain/assets';
import {
  type ItemHolding, type ItemClass, itemizeRemainder, itemizedTotal, itemizedResultTotal, buildItemizedAccounts,
} from '../domain/assets/itemize';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

const CLS_PICKS: { id: string; label: string; icon: string; cls: ItemClass; kind?: string }[] = [
  { id: 'stocks_etf', label: 'Stock / ETF', icon: '📈', cls: 'stocks_etf' },
  { id: 'bonds', label: 'Bond', icon: '📜', cls: 'bonds' },
  { id: 'options', label: 'Option', icon: '⚖️', cls: 'alternatives', kind: 'options' },
  { id: 'crypto', label: 'Crypto', icon: '🪙', cls: 'alternatives', kind: 'crypto' },
  { id: 'cash', label: 'Cash', icon: '💵', cls: 'cash' },
];

function holdingSub(h: ItemHolding): string {
  if (h.cls === 'stocks_etf') return 'Stock / ETF';
  if (h.cls === 'bonds') return h.maturityDate ? `Bond · matures ${h.maturityDate}` : 'Bond';
  if (h.cls === 'cash') return 'Cash';
  return h.kind === 'options' ? 'Option' : h.kind === 'crypto' ? 'Crypto' : 'Alternative';
}

export default function ItemizeScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const lump = accounts.find((a) => a.asset_id === accountId);

  const [items, setItems] = useState<ItemHolding[]>([]);
  const [pick, setPick] = useState('stocks_etf');
  const [name, setName] = useState('');
  const [val, setVal] = useState('');
  const [coupon, setCoupon] = useState('');
  const [maturity, setMaturity] = useState('');

  if (!lump) {
    return (
      <View style={[styles.root, styles.content]}>
        <Text style={styles.h1}>Account not found</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()}><Text style={styles.link}>← Back</Text></TouchableOpacity>
      </View>
    );
  }

  const inst = (lump.institution || lump.label || 'this account').trim();
  const allocated = itemizedTotal(items);
  const remainder = itemizeRemainder(lump.balance, items);
  const resultTotal = itemizedResultTotal(lump, items);
  const overBy = remainder < 0 ? -remainder : 0;
  const pickDef = CLS_PICKS.find((p) => p.id === pick)!;
  const canAdd = name.trim() !== '' && num(val) > 0;
  const pctFilled = lump.balance > 0 ? Math.max(0, Math.min(1, allocated / lump.balance)) : 0;

  const addHolding = () => {
    if (!canAdd) return;
    const h: ItemHolding = { cls: pickDef.cls, kind: pickDef.kind, label: name.trim(), value: num(val) };
    if (pickDef.cls === 'stocks_etf') h.ticker = name.trim().toUpperCase();
    if (pickDef.cls === 'bonds') { if (num(coupon) > 0) h.couponRate = num(coupon) / 100; if (maturity.trim()) h.maturityDate = maturity.trim(); }
    setItems((xs) => [...xs, h]);
    setName(''); setVal(''); setCoupon(''); setMaturity('');
  };
  const removeAt = (i: number) => setItems((xs) => xs.filter((_, j) => j !== i));

  const done = () => {
    if (items.length === 0) return;
    const created = buildItemizedAccounts(lump, items);   // includes the keep-as-cash remainder sleeve
    store.deleteAsset(lump.asset_id);
    created.forEach((a) => store.addAsset(a));
    router.back();
  };

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Text style={styles.h1}>Itemize {inst}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => router.back()}><Text style={styles.close}>✕</Text></TouchableOpacity>
      </View>
      <Text style={styles.sub}>Add what's actually inside. We keep the total at {money(lump.balance)} — any leftover stays as cash in {inst}.</Text>

      {/* the meter — counts down as you allocate */}
      <View style={styles.meter}>
        <View style={styles.meterRow}>
          <Text style={styles.meterL}>Unallocated</Text>
          <Text style={[styles.meterV, remainder < 0 && { color: Colors.red }]}>{remainder < 0 ? `${money(overBy)} over` : money(remainder)}</Text>
        </View>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${pctFilled * 100}%` }, remainder < 0 && { backgroundColor: Colors.red }]} /></View>
        <Text style={styles.meterSub}>{money(allocated)} of {money(lump.balance)} itemized</Text>
      </View>

      {items.length > 0 && (
        <View style={styles.card}>
          {items.map((h, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.divider]}>
              <Text style={styles.itemIcon}>{CLS_PICKS.find((p) => p.cls === h.cls && (!p.kind || p.kind === h.kind))?.icon ?? '•'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{h.label}</Text>
                <Text style={styles.itemSub}>{holdingSub(h)}</Text>
              </View>
              <Text style={styles.itemVal}>{money(h.value)}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${h.label}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => removeAt(i)}><Text style={styles.remove}>✕</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.formHdr}>ADD A HOLDING</Text>
      <View style={styles.chips}>
        {CLS_PICKS.map((p) => (
          <TouchableOpacity key={p.id} style={[styles.chip, pick === p.id && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: pick === p.id }} accessibilityLabel={p.label} onPress={() => setPick(p.id)}>
            <Text style={styles.chipTxt}>{p.icon}  {p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} placeholder={pickDef.cls === 'stocks_etf' ? 'Ticker or name (e.g. AAPL)' : pickDef.cls === 'bonds' ? 'Bond name (e.g. US Treasury 2032)' : 'Name'} placeholderTextColor={Colors.textTertiary} value={name} onChangeText={setName} />
      {pickDef.cls === 'bonds' && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" placeholder="Coupon % (optional)" placeholderTextColor={Colors.textTertiary} value={coupon} onChangeText={setCoupon} />
          <View style={{ flex: 1 }}><DateField value={maturity} onChange={setMaturity} label="maturity date" /></View>
        </View>
      )}
      <View style={styles.amtRow}><Text style={styles.amtPre}>{currencySymbol()}</Text><TextInput style={styles.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={val} onChangeText={setVal} /></View>
      <TouchableOpacity style={[styles.addBtn, !canAdd && { opacity: 0.4 }]} disabled={!canAdd} accessibilityRole="button" accessibilityLabel="Add this holding" onPress={addHolding}><Text style={styles.addBtnT}>＋ Add holding</Text></TouchableOpacity>

      <View style={styles.footerNote}>
        {remainder > 0 && items.length > 0 && <Text style={styles.note}>{money(remainder)} still unallocated — it'll be kept as cash in {inst}, so your total stays {money(lump.balance)}.</Text>}
        {remainder < 0 && <Text style={[styles.note, { color: Colors.red }]}>These holdings are {money(overBy)} more than the {money(lump.balance)} you entered — the account total will update to {money(resultTotal)}.</Text>}
      </View>
      <TouchableOpacity style={[styles.done, items.length === 0 && { opacity: 0.4 }]} disabled={items.length === 0} accessibilityRole="button" accessibilityLabel="Done — replace the account with these holdings" onPress={done}>
        <Text style={styles.doneT}>Done — replace with {items.length} holding{items.length === 1 ? '' : 's'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  close: { fontSize: 20, fontWeight: '700', color: Colors.textSecondary, paddingLeft: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md, lineHeight: 19 },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: Spacing.md },
  meter: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meterL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  meterV: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  bar: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, overflow: 'hidden', marginTop: 8 },
  barFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  meterSub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  itemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  itemSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, fontWeight: '600' },
  itemVal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  remove: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 4 },
  formHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPre: { fontSize: 24, fontWeight: '800', color: Colors.textSecondary },
  amtIn: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, minWidth: 90, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 2, borderBottomWidth: 2, borderBottomColor: Colors.primary },
  addBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  addBtnT: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  footerNote: { marginTop: Spacing.md },
  note: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  done: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  doneT: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
