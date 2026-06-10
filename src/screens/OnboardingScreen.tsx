import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Button, Card, ProgressBar } from '../components/UI';
import { Colors, Spacing, Radii } from '../utils/theme';
import {
  Status, Track, STATUS_OPTIONS, goalOptionsFor, goalGroupsFor, buildSteps, isOptional,
} from '../onboarding/engine';
import { renderStep, stepValid, StepCtx, setOnboardingProgress, onbProgress } from '../onboarding/modules';
import Summary from '../onboarding/Summary';
import Mascot from '../onboarding/Mascot';
import { registerUser, loginUser, lookupInvite, setUserHousehold, loadUserData } from '../services/firebase';
import { saveProfile, profileFromOnboarding } from '../domain/profile';
import { saveIncome, incomeFromOnboarding } from '../domain/income';

// Human section per step — "Income · 3 of 7" reads far less daunting than "Step 9 of 27".
const STEP_SECTION: Record<string, string> = {
  status: 'Profile', goals: 'Profile', account: 'Profile', name: 'Profile',
  income_sources: 'Income', income_salary: 'Income', income_401k: 'Income', employerContribution: 'Income',
  income_bonus: 'Income', income_rsu: 'Income', income_rental: 'Income', income_self: 'Income',
  income_investment: 'Income', income_benefits: 'Income', income_support: 'Income',
  income_scholarship: 'Income', income_loans: 'Income', income_other: 'Income', income_tax: 'Income',
  recap_income: 'Income', birth: 'About you',
  monthlySpending: 'Spending', flexBuckets: 'Spending', savingsRateTarget: 'Spending', recap_spend: 'Spending',
  currentRetirementSavings: 'Retirement', contributionsByType: 'Retirement', targetRetirementAge: 'Retirement',
  expectedRetirementSpending: 'Retirement', currentSavingsPortfolio: 'Retirement',
  retirementIncomeSources: 'Retirement', horizonAge: 'Retirement', retLocation: 'Retirement',
  travelBudget: 'Retirement', medicalBudget: 'Retirement', spendingChangeLater: 'Retirement', recap_retire: 'Retirement',
  investObjective: 'Investments', trackingLevel: 'Investments', investmentHoldings: 'Investments',
  recap_invest: 'Investments', networthIntro: 'Investments',
  goals_detail: 'Goals', monthlySavingsCapacity: 'Goals', recap_goals: 'Goals',
  debts: 'Debt', recap_debt: 'Debt', legacyTarget: 'Legacy',
  hasPartner: 'Household', invitePartner: 'Household', dependentsCount: 'Household',
  summary: 'Wrap-up',
};
function sectionProgress(steps: string[], index: number): string {
  const sec = STEP_SECTION[steps[index]] ?? 'Setup';
  const inSec = steps.map((id, i) => ({ id, i })).filter((x) => (STEP_SECTION[x.id] ?? 'Setup') === sec);
  const pos = inSec.findIndex((x) => x.i === index) + 1;
  return inSec.length > 1 ? `${sec} · ${pos} of ${inSec.length}` : sec;
}

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
  const [answers, setAnswers] = useState<Record<string, any>>(draft?.answers ?? {});
  const setAnswer = (key: string, value: any) => setAnswers(prev => ({ ...prev, [key]: value }));

  // Auto-save progress (synced to the account once signed in).
  useEffect(() => {
    store.setOnboardingDraft?.({ stepIndex, status, tracks, name, answers });
    if (status) store.setEmploymentStatus?.(status);
    if (tracks.length) store.setSelectedGoals?.(tracks);
  }, [stepIndex, status, tracks, name, answers]);

  // Inline account step
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const steps = buildSteps(status, tracks, answers);
  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;
  setOnboardingProgress(progress / 100);   // Centi warms up neutral → happy as you advance
  const isLast = current === 'summary';
  const alreadyAuthed = !!store.user;
  const ctx: StepCtx = { status, tracks, answers, setAnswer };
  const META = new Set(['status', 'goals', 'account', 'name', 'summary']);
  const isOptionalStep = isOptional(current as any);

  function toggleTrack(t: Track) {
    setTracks(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function chooseStatus(s: Status) {
    setStatus(s);
    const valid = new Set(goalOptionsFor(s).map(o => o.value));   // drop goals invalid for this stage
    setTracks(prev => prev.filter(t => valid.has(t)));
  }

  function saveAndExit() {
    store.setOnboardingDraft?.({ stepIndex, status, tracks, name, answers });
    if (store.user) {
      // account exists → pause onboarding and drop them into the app (resume later)
      store.setOnboardingPaused?.(true);
      router.replace('/(tabs)/home');
    } else {
      // no account yet (early steps) → just save the draft locally
      Alert.alert('Progress saved', "We'll pick up right here next time you open the app.");
    }
  }

  function canContinue(): boolean {
    if (current === 'status') return !!status;
    if (current === 'goals') return tracks.length > 0;
    if (current === 'name') return name.trim().length > 0;
    if (META.has(current)) return true;
    if (isOptionalStep) return true;        // optional steps: Continue always enabled (or Skip)
    return stepValid(current as any, ctx);  // required field steps: validate
  }

  function advance() {
    if (isLast) return finish();
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }

  // Redeem a partner-invite code: adopt the inviter's shared household doc, pull its data,
  // and skip the rest of onboarding — the household plan already exists.
  async function joinHousehold(uid: string): Promise<boolean> {
    const inv = await lookupInvite(inviteCode);
    if (!inv) {
      Alert.alert('Invite code not found', 'Double-check the code with your partner — or continue without it and join later.');
      return false;
    }
    await setUserHousehold(uid, inv.householdId);
    store.setHouseholdId?.(inv.householdId);
    const data = await loadUserData(inv.householdId);
    if (data) store.loadFromCloud?.(data);
    store.setOnboardingDraft?.(null);
    store.setOnboardingPaused?.(false);
    store.setOnboardingComplete?.(true);
    Alert.alert("You're in! 🎉", `You're sharing a plan with ${inv.inviterName ?? 'your partner'} — you'll both see the same accounts, plans and goals.`);
    router.replace('/(tabs)/home');
    return true;
  }

  async function handleAccount() {
    if (!email.trim() || pw.length < 6) {
      Alert.alert('Check your details', 'Enter an email and a password (6+ characters).');
      return;
    }
    setAuthBusy(true);
    try {
      const authedUser = authMode === 'signup'
        ? await registerUser(email.trim(), pw, email.trim().split('@')[0])
        : await loginUser(email.trim(), pw);
      // Partner joining via invite code → shared household, skip the rest of setup.
      if (inviteCode.trim() && authedUser?.uid) {
        try {
          if (await joinHousehold(authedUser.uid)) return;
        } catch {
          Alert.alert("Couldn't join the household", 'Check your connection — you can also join later. Continuing your own setup for now.');
        }
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
    const consolidated = { status: status ?? undefined, tracks, name: name.trim(), ...answers };
    store.setOnboardingProfile?.(consolidated);
    // Persist the Profile domain module (blueprint §5: onboarding → modules).
    const uid = store.user?.uid;
    if (uid) {
      saveProfile(profileFromOnboarding(uid, consolidated)).catch(() => {});
      saveIncome(incomeFromOnboarding(uid, consolidated)).catch(() => {});
    }
    // Seed a couple of headline numbers the dashboard already reads.
    const spend = parseFloat(String(answers.monthlySpending ?? '').replace(/[^0-9.]/g, ''));
    if (spend > 0) store.setMonthlyBudgetTarget?.(spend);
    if (name.trim() && store.setUser && store.user) {
      store.setUser({ ...store.user, name: name.trim() });
    }
    store.setOnboardingDraft?.(null);   // clear resume draft on completion
    store.setOnboardingPaused?.(false);
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
      const groups = goalGroupsFor(status);
      return (
        <>
          <Header emoji="🎯" title="What brings you to FinWise?" sub="Pick anything that fits — you can change this later." />
          {groups.map(group => (
            <View key={group.title}>
              <Text style={styles.groupHeader}>{group.title.toUpperCase()}</Text>
              {group.items.map(opt => {
                const on = tracks.includes(opt.value);
                return (
                  <TouchableOpacity key={opt.value}
                    style={[styles.choice, on && styles.choiceOn]}
                    onPress={() => toggleTrack(opt.value)}>
                    <Text style={styles.choiceIcon}>{opt.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.choiceTitle, on && styles.choiceTitleOn]}>{opt.title}</Text>
                      <Text style={styles.choiceSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
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
            <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Partner invite code (optional)</Text>
            <TextInput style={styles.input} value={inviteCode} onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="e.g. K7M2QX — joins your partner's plan" autoCapitalize="characters" autoCorrect={false}
              placeholderTextColor={Colors.textTertiary} maxLength={6} />
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
      return <Summary status={status} tracks={tracks} answers={answers} name={name} />;
    }

    // Field & recap steps are rendered by the data-driven module registry.
    return <>{renderStep(current as any, ctx)}</>;
  }

  const primaryLabel =
    current === 'account' && !alreadyAuthed ? (authMode === 'signup' ? 'Create account' : 'Log in')
      : isLast ? 'Enter your dashboard →' : 'Continue →';

  return (
    <View style={{ flex: 1 }}>
      {/* progress bar — pinned at the top, always visible */}
      <View style={styles.progressBarFixed}>
        <ProgressBar pct={progress} />
        <Text style={styles.progressText}>{sectionProgress(steps as string[], Math.min(stepIndex, steps.length - 1))}</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator>
        {renderBody()}

        {isOptionalStep && (
          <TouchableOpacity onPress={advance} style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
            <Text style={styles.link}>Skip for now</Text>
          </TouchableOpacity>
        )}

        {stepIndex > 0 && !isLast && (
          <TouchableOpacity onPress={saveAndExit} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
            <Text style={styles.link}>Save & come back later</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* pinned footer — Back / Continue always visible, never clipped by tall content */}
      <View style={styles.footer}>
        {stepIndex > 0 && (
          <Button label="← Back" onPress={back} variant="secondary" style={{ width: 104 }} size="md" />
        )}
        <Button label={primaryLabel} onPress={onPrimary} loading={authBusy}
          disabled={current !== 'account' && !canContinue()}
          style={{ flex: 1 }} size="md" />
      </View>
    </View>
  );
}

function Header({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <View style={styles.headWrap}>
      <Mascot accessory={emoji} size={88} progress={onbProgress()} />
      <Text style={styles.heading}>{title}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, minHeight: 0, backgroundColor: Colors.bgSecondary },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl, backgroundColor: Colors.bgSecondary },
  footer: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 28, backgroundColor: Colors.bgSecondary },
  progressBarFixed: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, backgroundColor: Colors.bgSecondary },
  progressText: { marginTop: 6, fontSize: 12, color: Colors.textTertiary, textAlign: 'right' },
  headWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  groupHeader: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
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
});
