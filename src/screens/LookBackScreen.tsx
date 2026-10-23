// Look back — what if I'd moved money? (FCC detailed design v1.1, Invest sheet). Real past prices,
// honest wording, explicitly backward-looking: a fact about the past, clearly separated from any
// forward estimate, never a suggestion to trade now. When prices don't reach back far enough, the
// screen says so — it never invents a price.
import TopBar from '../components/TopBar';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
// ONE DOOR (MK-NW-O-007 theLookBack, Q-PF-2) — one screen, one question.
import { theLookBack } from '../../MoneyKeel/functions/networth-and-performance/look-back';
import { type PriceSeries } from '../domain/performance';
import { fig, figSaid } from '../components/figure';   // rule 11: a figure prints with its identifier — the percents too (MK-PF-M-025, 026; audit row 9, 2026-10-21)

const WINDOWS = [{ m: 12, label: '12 months ago' }, { m: 24, label: '2 years ago' }, { m: 36, label: '3 years ago' }] as const;

export default function LookBackScreen() {
  const store = useStore() as any;
  const priceCache: Record<string, PriceSeries> = store.priceCache ?? {};

  // choices = every ticker the user holds, and the yardsticks he named
  const held: string[] = useMemo(() => {
    const t = new Set<string>();
    for (const a of store.assetAccounts ?? []) for (const p of a.positions ?? []) if (p.ticker) t.add(String(p.ticker).toUpperCase());
    return [...t];
  }, [store.assetAccounts]);
  // THE CHOICES — his ruling, 2026-10-04: what you hold, the stock market (SPY) as the drawing draws,
  // and four more yardsticks he named: "Add AGG, GLD, BTS, AOR" — bonds, gold, bitcoin (BTC; there is no
  // BTS) and a balanced fund. The private-equity and hedge-fund yardsticks (PSP, QAI) are not offered.
  const OFFERED = ['AGG', 'GLD', 'BTC', 'AOR'];
  const fromChoices = useMemo(() => [...new Set([...held, ...OFFERED])], [held]);
  const toChoices = useMemo(() => [...new Set(['SPY', ...held, ...OFFERED])], [held]);

  // the equity detail page's "what if I'd sold a year ago?" arrives pre-filled with that holding
  const params = useLocalSearchParams<{ from?: string; amount?: string }>();
  const [amount, setAmount] = useState(() => (params.amount && parseFloat(params.amount) > 0 ? String(Math.round(parseFloat(params.amount))) : '20000'));
  const [from, setFrom] = useState<string>(() => (params.from ? String(params.from).toUpperCase() : held[0] ?? 'AGG'));
  const [to, setTo] = useState<string>('SPY');
  const [months, setMonths] = useState<12 | 24 | 36>(12);

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  // IT FETCHES WHAT IT COMPARES (2026-10-22): on opening, and when the pairing changes, the pairing, SPY and the four
  // yardsticks he asked for (DEC-1624) are fetched by the app's one price refresh (store.maybeRefreshPrices → refreshPrices →
  // fetchPriceSeries: the same source, the same 10-minute freshness rule, the same failure flag). It fetched only what you
  // hold and its yardstick, so with nothing held it could never answer. A ticker still missing is named: while the refresh
  // runs, "getting"; after it, "couldn't refresh", the app's one word for a refresh that brought nothing.
  const [asking, setAsking] = useState(true);
  useEffect(() => {
    let live = true;
    setAsking(true);
    Promise.resolve(store.maybeRefreshPrices?.([from, to, 'SPY', ...OFFERED])).catch(() => {}).finally(() => { if (live) setAsking(false); });
    return () => { live = false; };
  }, [from, to]);   // eslint-disable-line react-hooks/exhaustive-deps
  const missingWords = (): string => {
    const missing = [...new Set([from, to])].filter((t) => !priceCache[t]);
    return asking ? `Getting prices for ${missing.join(' and ')}…`
      : `Couldn't refresh prices for ${missing.join(' or ')}, so there is nothing to compare yet. Look back tries again each time it opens.`;
  };
  const result = useMemo(
    () => theLookBack({ amount: amt, fromSeries: priceCache[from], toSeries: priceCache[to], months }),
    [amt, priceCache, from, to, months]);

  const Picker = ({ value, onPick, exclude, label, choices }: { value: string; onPick: (t: string) => void; exclude: string; label: string; choices: string[] }) => (
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
    <View style={s.root}>
    <TopBar back />
    <ScrollView automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={s.pastOnly}>Facts about the PAST only</Text>
      <Text style={s.h1}>What if I'd moved money {WINDOWS.find((w) => w.m === months)?.label}?</Text>

      <View style={s.card}>
        <Text style={s.pickLabel}>Amount</Text>
        <View style={s.amtRow}>
          <Text style={s.amtPrefix}>{currencySymbol()}</Text>
          <TextInput style={s.amtInput} keyboardType="number-pad" value={amount} onChangeText={setAmount}
            accessibilityLabel="Amount to look back on" />
        </View>
        <Picker label="From" value={from} onPick={setFrom} exclude={to} choices={fromChoices} />
        <Picker label="To" value={to} onPick={setTo} exclude={from} choices={toChoices} />
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
          accessibilityLabel={`What actually happened: left in ${from} it became ${figSaid('MK-PF-M-010', result.stayed.endValue)}, ${figSaid('MK-PF-M-025', result.stayed.pct / 100)}. Moved to ${to} it would be ${figSaid('MK-PF-M-011', result.moved.endValue)}, ${figSaid('MK-PF-M-026', result.moved.pct / 100)}. Difference ${figSaid('MK-PF-M-012', Math.abs(result.difference))} ${result.difference >= 0 ? 'more' : 'less'} if you had moved. Real past prices, not a prediction.`}>
          <SectionBand title="WHAT ACTUALLY HAPPENED" />
          <Text style={s.legLine}>
            Left in {from} it became <Text style={s.strong}>{fig('MK-PF-M-010', result.stayed.endValue)}</Text>
            {'  '}({result.stayed.delta >= 0 ? 'up' : 'down'} {fig('MK-PF-M-010', Math.abs(result.stayed.delta))}, {fig('MK-PF-M-025', result.stayed.pct / 100)})
          </Text>
          <Text style={s.legLine}>
            Moved to {to} it would be <Text style={s.strong}>{fig('MK-PF-M-011', result.moved.endValue)}</Text>
            {'  '}({result.moved.delta >= 0 ? 'up' : 'down'} {fig('MK-PF-M-011', Math.abs(result.moved.delta))}, {fig('MK-PF-M-026', result.moved.pct / 100)})
          </Text>
          <View style={s.diffBox}>
            <Text style={s.diffTxt}>
              Difference: {fig('MK-PF-M-012', Math.abs(result.difference))} {result.difference >= 0 ? 'more' : 'less'} if you had moved.
            </Text>
          </View>
          <Text style={s.note}>Real past prices; not a prediction of what happens next.</Text>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.note}>
            {amt <= 0 ? 'Enter an amount to look back on.'
              : !priceCache[from] || !priceCache[to] ? missingWords()
              : "We don't have prices reaching back that far — open the Performance tab and refresh prices, or pick a shorter window."}
          </Text>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  pastOnly: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 4, marginBottom: Spacing.sm, lineHeight: 26 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 6 },
  amtRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  amtPrefix: { fontSize: 24, fontWeight: '700', color: Colors.textSecondary },
  amtInput: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, minWidth: 100, padding: 0, marginLeft: 4 },
  pickWrap: { marginTop: 10 },
  pickLabel: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primaryDark },
  legLine: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, marginTop: 6 },
  strong: { fontWeight: '800' },
  diffBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: 10, marginTop: 10 },
  diffTxt: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, lineHeight: 26, fontVariant: ['tabular-nums'] },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
});
