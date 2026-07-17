// Look back — what if I'd moved money? (FCC detailed design v1.1, Invest sheet). Real past prices,
// honest wording, explicitly backward-looking: a fact about the past, clearly separated from any
// forward estimate, never a suggestion to trade now. When prices don't reach back far enough, the
// screen says so — it never invents a price.
import React, { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { lookBack } from '../domain/performance/lookBack';
import { BENCHMARK_TICKER, type PriceSeries } from '../domain/performance';
import { maskedMoney } from '../components/useMoney';

const WINDOWS = [{ m: 12, label: '12 months ago' }, { m: 24, label: '2 years ago' }, { m: 36, label: '3 years ago' }] as const;

export default function LookBackScreen() {
  const store = useStore() as any;
  const priceCache: Record<string, PriceSeries> = store.priceCache ?? {};

  // choices = every ticker the user holds + the standard yardsticks (one benchmark family app-wide)
  const held: string[] = useMemo(() => {
    const t = new Set<string>();
    for (const a of store.assetAccounts ?? []) for (const p of a.positions ?? []) if (p.ticker) t.add(String(p.ticker).toUpperCase());
    return [...t];
  }, [store.assetAccounts]);
  const yardsticks = useMemo(() => [...new Set(Object.values(BENCHMARK_TICKER))], []);
  const choices = useMemo(() => [...new Set([...held, ...yardsticks])], [held, yardsticks]);

  // the equity detail page's "what if I'd sold a year ago?" arrives pre-filled with that holding
  const params = useLocalSearchParams<{ from?: string; amount?: string }>();
  const [amount, setAmount] = useState(() => (params.amount && parseFloat(params.amount) > 0 ? String(Math.round(parseFloat(params.amount))) : '20000'));
  const [from, setFrom] = useState<string>(() => (params.from ? String(params.from).toUpperCase() : held[0] ?? yardsticks.find((t) => t !== 'SPY') ?? 'BND'));
  const [to, setTo] = useState<string>('SPY');
  const [months, setMonths] = useState<12 | 24 | 36>(12);

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const result = useMemo(
    () => lookBack(amt, priceCache[from], priceCache[to], months),
    [amt, priceCache, from, to, months]);

  const Picker = ({ value, onPick, exclude, label }: { value: string; onPick: (t: string) => void; exclude: string; label: string }) => (
    <View style={s.pickWrap}>
      <Text style={s.pickLabel}>{label}</Text>
      <View style={s.chips}>
        {choices.filter((t) => t !== exclude).map((t) => (
          <TouchableOpacity accessibilityRole="button" key={t} style={[s.chip, value === t && s.chipOn]} onPress={() => onPick(t)}
            accessibilityState={{ selected: value === t }} accessibilityLabel={`${label} ${t}`}>
            <Text style={[s.chipTxt, value === t && s.chipTxtOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={s.pastOnly}>Facts about the PAST only</Text>
      <Text style={s.h1}>What if I'd moved money {WINDOWS.find((w) => w.m === months)?.label}?</Text>

      <View style={s.card}>
        <Text style={s.pickLabel}>Amount</Text>
        <View style={s.amtRow}>
          <Text style={s.amtPrefix}>{currencySymbol()}</Text>
          <TextInput style={s.amtInput} keyboardType="number-pad" value={amount} onChangeText={setAmount}
            accessibilityLabel="Amount to look back on" />
        </View>
        <Picker label="From" value={from} onPick={setFrom} exclude={to} />
        <Picker label="To" value={to} onPick={setTo} exclude={from} />
        <View style={s.pickWrap}>
          <Text style={s.pickLabel}>When</Text>
          <View style={s.chips}>
            {WINDOWS.map((w) => (
              <TouchableOpacity accessibilityRole="button" key={w.m} style={[s.chip, months === w.m && s.chipOn]} onPress={() => setMonths(w.m)}
                accessibilityState={{ selected: months === w.m }} accessibilityLabel={w.label}>
                <Text style={[s.chipTxt, months === w.m && s.chipTxtOn]}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {result ? (
        <View style={s.card} accessible
          accessibilityLabel={`What actually happened: left in ${from} it became ${maskedMoney(result.stayed.endValue)}, ${result.stayed.pct} percent. Moved to ${to} it would be ${maskedMoney(result.moved.endValue)}, ${result.moved.pct} percent. Difference ${maskedMoney(Math.abs(result.difference))} ${result.difference >= 0 ? 'more' : 'less'} if you had moved. Real past prices, not a prediction.`}>
          <Text style={s.cardHdr}>WHAT ACTUALLY HAPPENED</Text>
          <Text style={s.legLine}>
            Left in {from} it became <Text style={s.strong}>{maskedMoney(result.stayed.endValue)}</Text>
            {'  '}({result.stayed.delta >= 0 ? 'up' : 'down'} {maskedMoney(Math.abs(result.stayed.delta))}, {result.stayed.pct >= 0 ? '+' : ''}{result.stayed.pct}%)
          </Text>
          <Text style={s.legLine}>
            Moved to {to} it would be <Text style={s.strong}>{maskedMoney(result.moved.endValue)}</Text>
            {'  '}({result.moved.delta >= 0 ? 'up' : 'down'} {maskedMoney(Math.abs(result.moved.delta))}, {result.moved.pct >= 0 ? '+' : ''}{result.moved.pct}%)
          </Text>
          <View style={s.diffBox}>
            <Text style={s.diffTxt}>
              Difference: {maskedMoney(Math.abs(result.difference))} {result.difference >= 0 ? 'more' : 'less'} if you had moved.
            </Text>
          </View>
          <Text style={s.note}>Real past prices; not a prediction of what happens next.</Text>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.note}>
            {amt <= 0 ? 'Enter an amount to look back on.'
              : `We don't have ${!priceCache[from] || !priceCache[to] ? 'prices for that pairing yet' : 'prices reaching back that far'} — open the Invest tab and refresh prices, or pick a shorter window. We never invent a price.`}
          </Text>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  pastOnly: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  h1: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginTop: 4, marginBottom: Spacing.sm, lineHeight: 26 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  amtRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  amtPrefix: { fontSize: 22, fontWeight: '700', color: Colors.textSecondary },
  amtInput: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, minWidth: 100, padding: 0, marginLeft: 4 },
  pickWrap: { marginTop: 10 },
  pickLabel: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primaryDark },
  legLine: { fontSize: 14.5, color: Colors.textPrimary, lineHeight: 22, marginTop: 6 },
  strong: { fontWeight: '800' },
  diffBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: 10, marginTop: 10 },
  diffTxt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, lineHeight: 26, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
});
