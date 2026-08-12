// THE THREE QUESTIONS (founder finding 2026-08-11: "add your age" landed on a hub, then on a
// seven-item checklist — three hops to answer one question, and the last one didn't ask it).
//
// The retirement odds need exactly three answers: your age, what you spend, and what you have. This
// screen asks the ones that are still missing — nothing else — and shows the real odds the moment
// they are all in. `?focus=` opens straight at one of them, so a line that names ONE missing answer
// lands on that answer rather than on a hub.
//
// It deliberately does NOT duplicate "Sharpen your plan": that screen scores how complete the whole
// plan is (income, goals, debts…). This one answers a single question — what do the odds still need?
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { Colors, Spacing, Radii } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { maskedMoney } from '../components/useMoney';
import { planDoor, lensChanceWord, onCourseSentence, shortfallAgeFromBand, SAMPLE_CHANCE, SAMPLE_HORIZON } from '../domain/planning/hub';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { simulate } from '../domain/retirement';
import { resolveLens } from '../domain/profile/lens';
import { DOORS } from '../constants/doors';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const THIS_YEAR = new Date().getFullYear();
const MIN_AGE = 18, MAX_AGE = 110;

export default function PlanAnswersScreen() {
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];

  const door = planDoor(op, accounts);
  const missing = door.missing;

  const currentAge = op.birthYear ? THIS_YEAR - num(op.birthYear) : null;
  const [age, setAge] = useState(currentAge && currentAge > 0 ? String(currentAge) : '');
  const [spend, setSpend] = useState(op.monthlySpending ? String(num(op.monthlySpending)) : '');

  const saveAge = (v: string) => {
    setAge(v);
    const n = num(v);
    // only a believable age is stored — a half-typed "4" must not silently become a birth year
    if (n >= MIN_AGE && n <= MAX_AGE) store.setOnboardingProfile?.({ ...op, birthYear: String(THIS_YEAR - n) });
  };
  const saveSpend = (v: string) => {
    setSpend(v);
    const n = num(v);
    if (n > 0) store.setOnboardingProfile?.({ ...op, monthlySpending: String(n) });
  };

  // the payoff: the moment all three are in, this screen shows the real number rather than sending
  // the person somewhere else to find out whether it worked
  const wil = selectWillItLast({
    op, accounts, assumptions: store.retirementAssumptions ?? {}, bigCosts: store.bigCosts,
    inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true,
  });
  const sim = wil.inputs ? simulate({ ...wil.inputs, with_band: true }) : null;
  const lens = resolveLens(op, store.lensOverride);
  const sentence = useMemo(() => onCourseSentence({
    lens, chance: wil.chance,
    retireAge: Math.round(Number(store.retirementAssumptions?.retireAge ?? op?.targetRetirementAge ?? 67)),
    horizonAge: wil.horizonAge,
    potAtRetire: sim?.projected_at_retirement ?? null,
    leftoverAtHorizon: sim?.band?.length ? sim.band[sim.band.length - 1].p50 : null,
    shortfallAge: shortfallAgeFromBand(sim?.band),
    money: maskedMoney,
  }), [wil.chance, sim, lens]);

  const asks: Record<string, { title: string; body: React.ReactNode }> = {
    'your age': {
      title: 'HOW OLD ARE YOU?',
      body: (
        <View>
          <Text style={s.help}>It sets how many years the money has to last. Nothing else uses it.</Text>
          <TextInput style={s.input} keyboardType="number-pad" value={age} onChangeText={saveAge}
            placeholder="e.g. 58" placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Your age in years" autoFocus={focus === 'your age' || missing[0] === 'your age'} />
        </View>
      ),
    },
    'what you spend': {
      title: 'WHAT DO YOU SPEND IN A TYPICAL MONTH?',
      body: (
        <View>
          <Text style={s.help}>A rough figure is fine — this is what your savings have to cover.</Text>
          <View style={s.moneyRow}>
            <Text style={s.prefix}>{currencySymbol()}</Text>
            <TextInput style={[s.input, { flex: 1, marginTop: 0 }]} keyboardType="decimal-pad" value={spend} onChangeText={saveSpend}
              placeholder="4,500" placeholderTextColor={Colors.textTertiary}
              accessibilityLabel="What you spend in a typical month"
              autoFocus={focus === 'what you spend' || missing[0] === 'what you spend'} />
          </View>
        </View>
      ),
    },
    'what you have': {
      title: 'WHAT HAVE YOU GOT SAVED?',
      body: (
        <View>
          <Text style={s.help}>Any account you already added counts — you never retype what is here.</Text>
          {DOORS.map((d) => (
            <TouchableOpacity key={d.route} style={s.door} accessibilityRole="button" accessibilityLabel={d.title}
              onPress={() => router.push(d.route as any)}>
              <Text style={s.doorIcon}>{d.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.doorTitle}>{d.title}</Text>
                <Text style={s.doorSub}>{d.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
  };

  // asked in the order they are missing, with any ?focus= question first
  const order = [...missing].sort((a, b) => (a === focus ? -1 : b === focus ? 1 : 0));

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{order.length === 0 ? 'That’s everything' : order.length === 1 ? 'One answer left' : `${order.length} answers left`}</Text>
      <Text style={s.sub}>
        {order.length === 0
          ? 'Your odds below are built from your own numbers.'
          : 'These are the only answers the odds need. Each one saves as you type.'}
      </Text>

      {order.map((m) => (
        <View key={m} style={s.card}>
          <SectionBand inCard title={asks[m].title} />
          {asks[m].body}
        </View>
      ))}

      {door.credit && (
        <Text style={s.credit}>
          ✓ What you have — already in: {door.credit.accounts} account{door.credit.accounts === 1 ? '' : 's'}, {maskedMoney(Math.round(door.credit.total))} counted
        </Text>
      )}

      {/* the answer, right here — never "go somewhere else to see if it worked" */}
      <View style={s.card}>
        <SectionBand inCard title="YOUR ODDS" />
        {wil.captured && wil.chance != null ? (
          <Text style={s.odds}>
            <Text style={s.oddsWord}>{lensChanceWord(lens, wil.chance)} — {wil.chance} in 100</Text>
            {sentence ? <Text style={s.oddsRest}>{'\n'}{sentence}</Text> : null}
          </Text>
        ) : (
          <Text style={s.odds}>
            <Text style={s.sampleNum}>Sample: {SAMPLE_CHANCE}%</Text> odds of lasting to age {SAMPLE_HORIZON}
            <Text style={s.oddsRest}>{'\n'}a sample, not your number — answer the {order.length === 1 ? 'question' : 'questions'} above and this becomes yours.</Text>
          </Text>
        )}
      </View>

      <TouchableOpacity accessibilityRole="button" style={s.done} onPress={() => router.back()}
        accessibilityLabel={order.length === 0 ? 'Done' : 'Back'}>
        <Text style={s.doneTxt}>{order.length === 0 ? 'Done ›' : 'Back'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md, lineHeight: 18 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  help: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  input: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, borderBottomWidth: 2,
    borderBottomColor: Colors.primaryDeep, paddingVertical: 8, marginTop: Spacing.sm, minHeight: 48 },
  moneyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: Spacing.sm },
  prefix: { fontSize: 24, fontWeight: '800', color: Colors.textSecondary, paddingBottom: 10 },
  door: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12, minHeight: 60,
    borderTopWidth: 1, borderTopColor: Colors.border },
  doorIcon: { fontSize: 20 },
  doorTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  doorSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  credit: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, marginBottom: Spacing.sm },
  odds: { fontSize: 15, color: Colors.textPrimary, marginTop: 2, lineHeight: 21 },
  oddsWord: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  oddsRest: { fontSize: 13, color: Colors.textSecondary },
  sampleNum: { fontWeight: '800', color: Colors.textTertiary, fontStyle: 'italic' },
  done: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center',
    justifyContent: 'center', marginTop: Spacing.sm },
  doneTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
