// First run (FCC detailed design v1.1, Home tab B46 — the onboarding flow map). THE first-run for
// new users: STEP 1 value intro (what MoneyKeel can do + the read-only promise) → STEP 2 intents
// (pick all that apply — they only order suggestions, never change a number) → STEP 3 the stage
// question (sets the lens: hero + tab order) → STEP 4 routed by answers (retired + paycheck →
// the Monthly-income fast path; otherwise Home). Every step skippable; skip = sensible defaults.
// Also the Settings "Your setup" revisit target (same screen, same one stage field, no intro).
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { resolveLens, type Lens } from '../domain/profile/lens';

const INTENTS = [
  { id: 'grow', label: 'Grow my investments' },
  { id: 'paycheck', label: 'A retirement paycheck I can trust' },
  { id: 'whole_picture', label: 'See everything in one place' },
] as const;

export default function FirstRunScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const isFirstRun = !store.onboardingComplete;               // Settings revisit skips the intro
  const [step, setStep] = useState<'intro' | 'questions'>(isFirstRun ? 'intro' : 'questions');
  const [intents, setIntents] = useState<string[]>(() => (op.intents as string[]) ?? []);
  const [stage, setStage] = useState<Lens | null>(() => store.lensOverride ?? null);

  const toggleIntent = (id: string) =>
    setIntents((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const finish = (skipped: boolean) => {
    if (!skipped) {
      // intents order suggestions, never numbers; the stage answer also seeds the profile's
      // status for the income modules (only when the deep questionnaire hasn't set one yet)
      const statusSeed = stage && !op.status ? { status: stage === 'retired' ? 'retired' : 'employed' } : {};
      store.setOnboardingProfile?.({ ...op, intents, ...statusSeed });
      if (stage) store.setLensOverride?.(stage);               // the ONE stage field the resolver reads
    }
    // B46: the light flow IS onboarding — the deep questionnaire stays reachable as the
    // set-up-by-hand door on Home. Completing (or skipping) here never traps the user.
    if (isFirstRun) store.setOnboardingComplete?.(true);
    // the retired fast-path: paycheck intent + retired → two typed numbers give a real hero
    // before any connect decision (the Monthly-income door)
    const lens = resolveLens(store.onboardingProfile, !skipped && stage ? stage : store.lensOverride);
    if (!skipped && intents.includes('paycheck') && lens === 'retired') router.replace('/monthly-income');
    else router.replace('/(tabs)/home');
  };

  // ── STEP 1: what MoneyKeel can do (value first, questions second — B46) ──
  if (step === 'intro') {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>What MoneyKeel can do</Text>
        <View style={s.introCard}>
          <Text style={s.introLine}>·  Your whole money picture in one place</Text>
          <Text style={s.introLine}>·  What needs your attention — with dollar amounts</Text>
          <Text style={s.introLine}>·  Whether your money will last — as honest odds</Text>
        </View>
        <Text style={s.promise}>Read-only: we can look, never touch — we can never move your money.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setStep('questions')}
          accessibilityLabel="Continue">
          <Text style={s.primaryTxt}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.skipBtn} onPress={() => finish(true)}
          accessibilityLabel="Skip — just explore">
          <Text style={s.skipTxt}>Skip — just explore</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{isFirstRun ? 'Welcome to MoneyKeel' : 'Your setup'}</Text>

      <Text style={s.q}>What did you come for? <Text style={s.qSub}>(pick all that apply)</Text></Text>
      {INTENTS.map((it) => {
        const on = intents.includes(it.id);
        return (
          <TouchableOpacity accessibilityRole="checkbox" key={it.id} style={[s.option, on && s.optionOn]}
            onPress={() => toggleIntent(it.id)}
            accessibilityState={{ checked: on }} accessibilityLabel={it.label}>
            <Text style={s.optionMark}>{on ? '☑' : '☐'}</Text>
            <Text style={s.optionTxt}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={s.q}>Where are you these days?</Text>
      {([['working', 'Still working'], ['retired', 'Retired, or nearly']] as const).map(([v, label]) => (
        <TouchableOpacity accessibilityRole="radio" key={v} style={[s.option, stage === v && s.optionOn]}
          onPress={() => setStage(v)}
          accessibilityState={{ selected: stage === v }} accessibilityLabel={label}>
          <Text style={s.optionMark}>{stage === v ? '◉' : '○'}</Text>
          <Text style={s.optionTxt}>{label}</Text>
        </TouchableOpacity>
      ))}

      {/* the consequence sentence is read BEFORE the buttons (accessibility spec) */}
      <Text style={s.consequence}>This sets up your Home and your tab order. Change it anytime in Settings.</Text>

      <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => finish(false)}
        accessibilityLabel="Continue">
        <Text style={s.primaryTxt}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.skipBtn} onPress={() => finish(true)}
        accessibilityLabel="Skip — just explore">
        <Text style={s.skipTxt}>Skip — just explore</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  q: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: 8 },
  qSub: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, minHeight: 52 },
  optionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionMark: { fontSize: 17, color: Colors.primaryDark },
  optionTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  consequence: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, marginTop: Spacing.md },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  skipTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  introCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  introLine: { fontSize: 15.5, color: Colors.textPrimary, lineHeight: 26 },
  promise: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, marginTop: Spacing.md },
});
