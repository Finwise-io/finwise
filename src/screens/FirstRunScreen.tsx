// First run (FCC detailed design v1.1, Home tab B46 — the onboarding flow map). THE first-run for
// new users: STEP 1 value intro (what MoneyKeel can do + the read-only promise) → STEP 2 intents
// (pick all that apply — they only order suggestions, never change a number) → STEP 3 the stage
// question (sets the lens: hero + tab order) → STEP 4 routed by answers (retired + paycheck →
// the Monthly-income fast path; otherwise Home). Every step skippable; skip = sensible defaults.
// Also the Settings "Your setup" revisit target (same screen, same one stage field, no intro).
import React, { useState } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { resolveLens, type Lens } from '../domain/profile/lens';

const INTENTS = [
  { id: 'grow', label: 'Know how your investments are doing' },
  { id: 'paycheck', label: 'Plan for a secure retirement' },
  { id: 'whole_picture', label: 'See your full money picture' },
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

  // ── STEP 1: identity + value (founder redesign 2026-07-15: state who we are proudly, ──
  // ── checkmarked benefits instead of dry text dots, mark up top, no back control)     ──
  if (step === 'intro') {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/brand/mark.png')} style={s.introMark} accessibilityLabel="MoneyKeel" />
        <Text style={s.introH1} accessibilityRole="header">MoneyKeel: Your finance command center.</Text>
        <View style={s.introCard}>
          {([
            ['Map your whole money picture', 'every account, debt, and dollar in one live view.'],
            ['Stay on top of your cash flow', "every dollar in and out — and what's safe to spend."],
            ['See what needs attention', 'specific priorities with real dollar amounts.'],
            ['Honest odds on the big question', 'how long your money will last, told straight.'],
          ] as const).map(([lead, body]) => (
            <View key={lead} style={s.introRow}>
              <View style={s.introCheck}><Text style={s.introCheckTxt}>✓</Text></View>
              <Text style={s.introLine}><Text style={s.introLead}>{lead}</Text> — {body}</Text>
            </View>
          ))}
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
      <Text style={s.h1}>{isFirstRun ? 'Customize your command center' : 'Your setup'}</Text>

      <Text style={s.q}>What are your primary goals? <Text style={s.qSub}>(pick all that apply)</Text></Text>
      {INTENTS.map((it) => {
        const on = intents.includes(it.id);
        return (
          <TouchableOpacity accessibilityRole="checkbox" key={it.id} style={[s.option, on && s.optionOn]}
            onPress={() => toggleIntent(it.id)}
            accessibilityState={{ checked: on }} accessibilityLabel={it.label}>
            <View style={[s.badge, on && s.badgeOn]}>{on ? <Text style={s.badgeTick}>✓</Text> : null}</View>
            <Text style={s.optionTxt}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={s.q}>Where are you these days?</Text>
      {([['working', 'Still working'], ['retired', 'Retired, or nearly']] as const).map(([v, label]) => (
        <TouchableOpacity accessibilityRole="radio" key={v} style={[s.option, stage === v && s.optionOn]}
          onPress={() => setStage(v)}
          accessibilityState={{ selected: stage === v }} accessibilityLabel={label}>
          <View style={[s.badge, stage === v && s.badgeRingOn]}>{stage === v ? <View style={s.badgeDot} /> : null}</View>
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
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, minHeight: 56 },
  optionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  badge: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  badgeOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  badgeTick: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  badgeRingOn: { borderColor: Colors.primary },
  badgeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  optionTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  consequence: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, marginTop: Spacing.md },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  skipTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  introCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  introMark: { width: 92, height: 92, alignSelf: 'center', marginBottom: Spacing.sm },
  introH1: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', lineHeight: 33, marginBottom: Spacing.md },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  introCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  introCheckTxt: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  introLead: { fontWeight: '800' },
  introLine: { flex: 1, fontSize: 15.5, color: Colors.textPrimary, lineHeight: 23 },
  promise: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 19, marginTop: Spacing.md },
});
