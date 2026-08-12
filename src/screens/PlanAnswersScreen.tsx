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
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { planDoor, lensChanceWord, onCourseSentence, shortfallAgeFromBand, SAMPLE_CHANCE, SAMPLE_HORIZON } from '../domain/planning/hub';
import { earmarkedAmount, retirementEarmarkedValue, primaryCarIdOf, accountDisplayNames, type AssetAccount } from '../domain/assets';
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

  const carId = primaryCarIdOf(accounts);
  const names = accountDisplayNames(accounts);
  const door = planDoor(op, accounts);
  const missing = door.missing;
  // FOUNDER RULE 2026-08-11: the screen shows what we ALREADY have and lets it be changed — it never
  // hides an answered question. Missing ones simply come first, and ?focus= puts one at the very top.
  const ALL: typeof missing = ['your age', 'what you spend', 'what you have'];

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
      title: 'WHAT COUNTS TOWARD RETIREMENT',
      body: (
        <View>
          <Text style={s.help}>
            Everything you own counts, except the home you live in and the car you drive — those are not a
            retirement plan. Tap any row to change it.
          </Text>
          {accounts.map((a: AssetAccount) => {
            const counts = earmarkedAmount(a, carId) > 0;
            return (
              <TouchableOpacity key={a.asset_id} style={s.assetRow} accessibilityRole="switch"
                accessibilityState={{ checked: counts }}
                accessibilityLabel={`${names.get(a.asset_id) ?? a.label}, ${spokenMoney(Math.round(a.balance || 0))}. ${counts ? 'Counts toward retirement' : 'Does not count'}. Tap to change.`}
                onPress={() => store.updateAsset?.(a.asset_id, { retirement_pct: counts ? 0 : 100 })}>
                <Text style={[s.tick, !counts && s.tickOff]}>{counts ? '✓' : '—'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.assetName} numberOfLines={1}>{names.get(a.asset_id) ?? a.label}</Text>
                  <Text style={s.assetSub}>{counts ? 'counts toward retirement' : "doesn't count"}</Text>
                </View>
                <Text style={[s.assetVal, !counts && s.assetValOff]}>{maskedMoney(Math.round(a.balance || 0))}</Text>
              </TouchableOpacity>
            );
          })}
          {accounts.length > 0 && (
            <Text style={s.nestLine}>Counting toward retirement: {maskedMoney(Math.round(retirementEarmarkedValue(accounts)))}</Text>
          )}
          <Text style={[s.help, { marginTop: Spacing.sm }]}>Missing something? Add it here:</Text>
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

  // every question, missing ones first, with any ?focus= question at the very top
  const rank = (m: string) => (m === focus ? -2 : (missing as string[]).includes(m) ? -1 : 0);
  const order = [...ALL].sort((a, b) => rank(a) - rank(b));

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{missing.length === 0 ? 'That’s everything' : missing.length === 1 ? 'One answer left' : `${missing.length} answers left`}</Text>
      <Text style={s.sub}>
        {missing.length === 0
          ? 'Everything the odds need is here — change anything and they re-run below.'
          : 'These are the only answers the odds need. Each one saves as you type, and what we already have is filled in.'}
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
            <Text style={s.oddsRest}>{'\n'}a sample, not your number — answer the {missing.length === 1 ? 'question' : 'questions'} above and this becomes yours.</Text>
          </Text>
        )}
      </View>

      {/* founder: save, then straight back to where they came from — with the real numbers in place */}
      <TouchableOpacity accessibilityRole="button" style={s.done} onPress={() => router.back()}
        accessibilityLabel={missing.length === 0 ? 'Save and go back' : 'Back'}>
        <Text style={s.doneTxt}>{missing.length === 0 ? 'Save & go back ›' : 'Back'}</Text>
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
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10, minHeight: 52,
    borderTopWidth: 1, borderTopColor: Colors.border },
  tick: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark, width: 20, textAlign: 'center' },
  tickOff: { color: Colors.textTertiary },
  assetName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  assetSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  assetVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  assetValOff: { color: Colors.textTertiary, fontWeight: '400' },
  nestLine: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark, marginTop: Spacing.sm },
  odds: { fontSize: 15, color: Colors.textPrimary, marginTop: 2, lineHeight: 21 },
  oddsWord: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  oddsRest: { fontSize: 13, color: Colors.textSecondary },
  sampleNum: { fontWeight: '800', color: Colors.textTertiary, fontStyle: 'italic' },
  done: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center',
    justifyContent: 'center', marginTop: Spacing.sm },
  doneTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
