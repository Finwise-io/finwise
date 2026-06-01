import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Button, Card, ProgressBar } from '../components/UI';
import { Colors, Spacing, Radii } from '../utils/theme';
import {
  Status, Track, STATUS_OPTIONS, goalOptionsFor, buildSteps,
} from '../onboarding/engine';
import { registerUser, loginUser } from '../services/firebase';

// Steps fully built in this slice; the rest are functional stubs (filled in next pass).
const STUB_TITLES: Record<string, { emoji: string; title: string; sub: string }> = {
  birth:          { emoji: '🎂', title: 'When were you born?', sub: 'Month and year (next pass).' },
  marital:        { emoji: '💍', title: 'Married or have a partner?', sub: '' },
  dependents:     { emoji: '👨‍👩‍👧', title: 'Kids or dependents?', sub: '' },
  income:         { emoji: '💵', title: 'Your income', sub: 'Job / retirement sources — adapts to your status.' },
  other_income:   { emoji: '➕', title: 'Other income', sub: 'Consulting, rental, side gigs.' },
  savings:        { emoji: '🏦', title: 'Savings & investments', sub: '' },
  ret_location:   { emoji: '🌍', title: 'Where will you retire?', sub: '' },
  ret_spend_change:{ emoji: '📉', title: 'Retirement spending', sub: 'Same, less, or more than now?' },
  ret_addons:     { emoji: '✈️', title: 'Travel & medical budget', sub: '' },
  ret_age:        { emoji: '🏖️', title: 'Target retirement age', sub: '' },
  ret_horizon:    { emoji: '🛟', title: 'How long should your money last?', sub: '' },
  spending:       { emoji: '🧾', title: 'Average monthly spending', sub: '' },
  goals_detail:   { emoji: '🎯', title: 'What are you saving for?', sub: '' },
  debt:           { emoji: '🎓', title: 'Student loans', sub: '' },
  partner_invite: { emoji: '👫', title: 'Invite your partner', sub: '' },
};

export default function OnboardingScreen() {
  const router = useRouter();
  const store = useStore() as any;

  // Resume from a saved draft if present; otherwise start fresh (don't inherit
  // stale persisted goals — that leaked retire_acc into retired flows).
  const draft = store.onboardingDraft;
  const [stepIndex, setStepIndex] = useState<number>(draft?.stepIndex ?? 0);
  const [status, setStatus] = useState<Status | null>((draft?.status as Status) ?? null);
  const [tracks, setTracks] = useState<Track[]>((draft?.tracks as Track[]) ?? []);
  const [name, setName] = useState<string>(draft?.name ?? store.user?.name ?? '');

  // Auto-save progress (synced to the account once signed in).
  useEffect(() => {
    store.setOnboardingDraft?.({ stepIndex, status, tracks, name });
    if (status) store.setEmploymentStatus?.(status);
    if (tracks.length) store.setSelectedGoals?.(tracks);
  }, [stepIndex, status, tracks, name]);

  // Inline account step
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const steps = buildSteps(status, tracks);
  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;
  const isLast = current === 'summary';
  const alreadyAuthed = !!store.user;

  function toggleTrack(t: Track) {
    setTracks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function chooseStatus(s: Status) {
    setStatus(s);
    const valid = new Set(goalOptionsFor(s).map(o => o.value));   // drop goals invalid for this stage
    setTracks(prev => prev.filter(t => valid.has(t)));
  }

  function saveAndExit() {
    store.setOnboardingDraft?.({ stepIndex, status, tracks, name });
    Alert.alert('Progress saved', "Your setup is saved to your account. Close anytime — we'll pick up right here.");
  }

  function canContinue(): boolean {
    if (current === 'status') return !!status;
    if (current === 'goals') return tracks.length > 0;
    if (current === 'name') return name.trim().length > 0;
    return true; // stubs always continue
  }

  function advance() {
    if (isLast) return finish();
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }

  async function handleAccount() {
    if (!email.trim() || pw.length < 6) {
      Alert.alert('Check your details', 'Enter an email and a password (6+ characters).');
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        await registerUser(email.trim(), pw, email.trim().split('@')[0]);
      } else {
        await loginUser(email.trim(), pw);
      }
      // onAuthChange in _layout sets the user; we stay in onboarding and advance.
      advance();
    } catch (e: any) {
      Alert.alert('Could not continue', e?.message ?? 'Authentication failed. Try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  function finish() {
    store.setEmploymentStatus?.(status);
    store.setSelectedGoals?.(tracks);
    if (name.trim() && store.setUser && store.user) {
      store.setUser({ ...store.user, name: name.trim() });
    }
    store.setOnboardingDraft?.(null);   // clear resume draft on completion
    store.setOnboardingComplete?.(true);
    router.replace('/(tabs)/home');
  }

  function onPrimary() {
    if (current === 'account' && !alreadyAuthed) return handleAccount();
    advance();
  }

  // ── Step body ──────────────────────────────────────────────────────
  function renderBody() {
    if (current === 'status') {
      return (
        <>
          <Header emoji="👋" title="Which best describes you?" sub="This shapes the rest of your setup." />
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value}
              style={[styles.choice, status === opt.value && styles.choiceOn]}
              onPress={() => chooseStatus(opt.value)}>
              <Text style={styles.choiceIcon}>{opt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.choiceTitle, status === opt.value && styles.choiceTitleOn]}>{opt.title}</Text>
                <Text style={styles.choiceSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.radio, status === opt.value && styles.radioOn]} />
            </TouchableOpacity>
          ))}
        </>
      );
    }

    if (current === 'goals') {
      const opts = goalOptionsFor(status);
      return (
        <>
          <Header emoji="🎯" title="What brings you to FinWise?" sub="Pick all that apply." />
          {opts.map(opt => {
            const on = tracks.includes(opt.value);
            return (
              <TouchableOpacity key={opt.value}
                style={[styles.choice, on && styles.choiceOn]}
                onPress={() => toggleTrack(opt.value)}>
                <Text style={styles.choiceIcon}>{opt.icon}</Text>
                <Text style={[styles.choiceTitle, { flex: 1 }, on && styles.choiceTitleOn]}>{opt.title}</Text>
                <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (current === 'account') {
      if (alreadyAuthed) {
        return <Header emoji="✅" title="You're signed in" sub="Let's keep going." />;
      }
      return (
        <>
          <Header emoji="🔐" title="Create your free account" sub="So we can save your plan as you go. Your data stays private." />
          <Card>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address"
              placeholderTextColor={Colors.textTertiary} />
            <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Password</Text>
            <TextInput style={styles.input} value={pw} onChangeText={setPw}
              placeholder="6+ characters" secureTextEntry placeholderTextColor={Colors.textTertiary} />
          </Card>
          <TouchableOpacity onPress={() => setAuthMode(m => m === 'signup' ? 'login' : 'signup')}
            style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
            <Text style={styles.link}>
              {authMode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    if (current === 'name') {
      return (
        <>
          <Header emoji="🙂" title="What should we call you?" sub="" />
          <Card>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="First name" placeholderTextColor={Colors.textTertiary} autoFocus />
          </Card>
        </>
      );
    }

    if (current === 'summary') {
      return (
        <>
          <Header emoji="🎉" title="You're all set!" sub="Your personalized plan is ready." />
          <Card>
            <SRow label="You are" value={status ?? '—'} />
            <SRow label="Focus" value={tracks.join(', ') || '—'} />
            {!!name.trim() && <SRow label="Name" value={name.trim()} />}
          </Card>
          <Text style={styles.note}>Full Boldin-style summary charts come next. For now, jump in 🚀</Text>
        </>
      );
    }

    // Stub for not-yet-built modules
    const s = STUB_TITLES[current] ?? { emoji: '🛠', title: current, sub: '' };
    let sub = s.sub;
    if (current === 'ret_spend_change') {
      sub = status === 'retired'
        ? 'Do you expect it to change later in retirement?'
        : 'About the same, less, or more than today?';
    }
    return (
      <>
        <Header emoji={s.emoji} title={s.title} sub={sub} />
        <Card><Text style={styles.note}>This step is coming in the next build pass.</Text></Card>
      </>
    );
  }

  const primaryLabel =
    current === 'account' && !alreadyAuthed ? (authMode === 'signup' ? 'Create account' : 'Log in')
      : isLast ? 'Start FinWise 🚀' : 'Continue →';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.progressWrap}>
          <ProgressBar pct={progress} />
          <Text style={styles.progressText}>Step {stepIndex + 1} of {totalSteps}</Text>
        </View>

        {renderBody()}

        <View style={styles.navRow}>
          {stepIndex > 0 && current !== 'account' && (
            <Button label="← Back" onPress={back} variant="secondary" style={{ flex: 1 }} size="md" />
          )}
          <Button label={primaryLabel} onPress={onPrimary} loading={authBusy}
            disabled={current !== 'account' && !canContinue()}
            style={{ flex: 1 }} size="md" />
        </View>

        {stepIndex > 0 && !isLast && (
          <TouchableOpacity onPress={saveAndExit} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
            <Text style={styles.link}>Save & come back later</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Header({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={styles.headWrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.heading}>{title}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

function SRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sRow}>
      <Text style={styles.sLabel}>{label}</Text>
      <Text style={styles.sVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl, flexGrow: 1, backgroundColor: Colors.bgSecondary },
  progressWrap: { marginBottom: Spacing.lg },
  progressText: { marginTop: 6, fontSize: 12, color: Colors.textTertiary, textAlign: 'right' },
  headWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  emoji: { fontSize: 40, marginBottom: 8 },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  choiceIcon: { fontSize: 24, marginRight: Spacing.md },
  choiceTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  choiceTitleOn: { color: Colors.primary },
  choiceSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border },
  radioOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  link: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  note: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  navRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sLabel: { fontSize: 14, color: Colors.textSecondary },
  sVal: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
});
