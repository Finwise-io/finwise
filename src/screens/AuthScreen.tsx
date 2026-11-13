import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Modal, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser, registerUser, resetPassword, restoreWithRecoveryCode, loadUserData, checkInviteCodes, joinHouseholdWithKeyCode, deleteAccount, loadHouseholdPeople, restoreOwnerWithReturnCode, firstNameOf, type InviteCheck } from '../services/firebase';
import { dayWithYear } from '../components/householdWords';
import { useStore } from '../store/useStore';
import { Button } from '../components/UI';
import { Colors, Typography, Spacing, Radii, Tap } from '../utils/theme';

type Mode = 'login' | 'register' | 'forgot';

/** A refusal at sign-up names where it sits: under the invite code (it ran out, or was not found) or under the key code (invite-and-join
 *  v01, states D and E). */
type JoinRefusal = { under: 'invite' | 'key'; text: string };

/** R13 (invite-and-join v01, 2026-11-12): what a refused invite says, in the drawing's words. `who` is the inviter's first name. */
export function joinRefusalFor(check: InviteCheck, inviteCode: string): JoinRefusal | null {
  const code = inviteCode.trim().toUpperCase();
  const who = ('inviterName' in check && check.inviterName) || null;
  const ask = who ?? 'your spouse';
  const whose = who ? `${who}’s` : 'your spouse’s';
  switch (check.status) {
    case 'ok': return null;
    case 'not-found': return { under: 'invite', text: `Invite code ${code} was not found. Double-check the code with your spouse.` };
    case 'expired': return { under: 'invite', text: `Invite code ${code} ran out on ${dayWithYear(check.expiresAt)}. Ask ${ask} to create the two codes again.` };
    case 'no-key-code': return { under: 'key', text: `Enter the key code too. It is on ${whose} phone, beside the invite code.` };
    case 'wrong-key-code': return { under: 'key', text: `This key code does not match invite code ${code}. Ask ${ask} for the key code shown beside it.` };
  }
}

/** A sign-up refused at the invite is undone (no account is half-made, state D): the account made to read the invite is deleted, and the
 *  sign-in listener then shows this screen again. What was typed and the refusal are carried across that, in memory only. */
let carriedSignUp: { name: string; email: string; password: string; confirm: string; inviteCode: string; keyCode: string; refusal: JoinRefusal } | null = null;

// ── Email validation ───────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

// F-3 (QA-2026-06-18): the former local `accounts` map stored CLEARTEXT passwords in unencrypted
// AsyncStorage, redundant with Firebase Auth. Removed. Duplicate-detection, credential checks, and
// password resets are all handled by Firebase, which never exposes a password to the client.

export default function AuthScreen() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const setPendingRecoveryCode = useStore((s: any) => s.setPendingRecoveryCode);
  const setSecuringAccount = useStore((s: any) => s.setSecuringAccount);

  const [carried] = useState(() => { const c = carriedSignUp; carriedSignUp = null; return c; });
  const [mode, setMode] = useState<Mode>(carried ? 'register' : 'login');
  const [name, setName] = useState(carried?.name ?? '');
  const [email, setEmail] = useState(carried?.email ?? '');
  const [password, setPassword] = useState(carried?.password ?? '');
  const [confirm, setConfirm] = useState(carried?.confirm ?? '');
  const [inviteCode, setInviteCode] = useState(carried?.inviteCode ?? '');     // optional spouse-invite (household join) at signup
  const [keyCode, setKeyCode] = useState(carried?.keyCode ?? '');              // R13: the 20-letter key code beside it
  const [joinRefusal, setJoinRefusal] = useState<JoinRefusal | null>(carried?.refusal ?? null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Recovery-code flows. The "show new code" popup lives at the root (store.pendingRecoveryCode) so the
  // post-signup navigation can't unmount it; only the restore-after-reset input is local to this screen.
  const [restoreVisible, setRestoreVisible] = useState(false);          // "enter recovery code" after a reset
  const [restorePassword, setRestorePassword] = useState('');           // the new password they just used
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  // R14 (return code v01, phone 2): the owner whose household has a member may come back in with that member's return code
  const [returnFrom, setReturnFrom] = useState<{ name: string } | null>(null);   // the member, when there is one
  const [restoreByReturn, setRestoreByReturn] = useState(false);
  const [returnRefused, setReturnRefused] = useState(false);

  // Real-time email validation feedback
  const emailTouched = email.length > 0;
  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid;

  // R13 (invite-and-join v01, states C to E): the invite code AND the key code are checked before anything is joined; a refusal
  // undoes the account (nothing is half-made) and is said under the code it is about. Reading the invite needs a signed-in
  // person, so the account is made first and deleted again when the codes do not pass.
  async function signUpIntoHousehold(trimEmail: string): Promise<void> {
    const code = inviteCode.trim().toUpperCase();
    const { user, recoveryCode } = await registerUser(trimEmail, password, name.trim(), () => { /* shown once the join passes */ });
    const check = await checkInviteCodes(code, keyCode);
    const refusal = joinRefusalFor(check, code);
    if (refusal || check.status !== 'ok') {
      carriedSignUp = { name, email, password, confirm, inviteCode: code, keyCode, refusal: refusal! };
      setJoinRefusal(refusal);
      try { await deleteAccount(password); } catch { /* the account stays signed out either way */ }
      if (mounted.current) carriedSignUp = null;   // still on screen: this screen says the refusal itself
      return;
    }
    setUser({ uid: user.uid, email: trimEmail, name: name.trim(), createdAt: new Date().toISOString() });
    try {
      const householdId = await joinHouseholdWithKeyCode(user.uid, code, keyCode, password, recoveryCode, name.trim());
      const s: any = useStore.getState();
      s.setHouseholdId?.(householdId);
      const data = await loadUserData(householdId);
      if (data) s.loadFromCloud?.(data);
      s.setOnboardingDraft?.(null);
      s.setOnboardingPaused?.(false);
      s.setOnboardingComplete?.(true);
      setPendingRecoveryCode(recoveryCode);   // Sam's recovery code, as today, once the join has passed
      Alert.alert("You’re in! 🎉", `You’re sharing a plan with ${check.inviterName ?? 'your spouse'} — you’ll both see the same accounts, plans and goals.`);
      router.replace('/(tabs)/home');
    } catch {
      setPendingRecoveryCode(recoveryCode);
      Alert.alert("Couldn’t join the household", 'Check your connection — you can also join later. Continuing your own setup for now.');
    }
  }

  async function handleSubmit() {
    const trimEmail = email.trim().toLowerCase();

    // ── Validate email ──────────────────────────────────────────
    if (!trimEmail) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.\n\nExamples:\n• you@gmail.com\n• name@company.com');
      return;
    }

    // ── Validate password ───────────────────────────────────────
    if (mode !== 'forgot' && !password) {
      Alert.alert('Password required', 'Please enter your password.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      Alert.alert('Password too short', 'Your password must be at least 8 characters long.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      Alert.alert('Passwords don’t match', 'Please make sure both passwords are identical.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setLoading(true);
    setJoinRefusal(null);

    try {
      if (mode === 'register' && inviteCode.trim()) {
        await signUpIntoHousehold(trimEmail);
      } else if (mode === 'register') {
        // Firebase rejects a duplicate email with auth/email-already-in-use (handled in catch).
        // Surface the recovery code the instant the account exists (via onCodeReady) — BEFORE the
        // slow key-wrapping/Firestore write — so it shows before the auth listener routes to onboarding.
        // Surface the code AND flag "securing" so the recovery modal shows an honest "Securing…" state
        // (disabled checkbox + spinner) while the multi-second PBKDF2 key-wrapping runs — not a dead button.
        const onCode = (code: string) => { setPendingRecoveryCode(code); setSecuringAccount(true); };
        const { user } = await registerUser(trimEmail, password, name.trim(), onCode);
        setSecuringAccount(false);   // envelope persisted → unlock the "I've saved it" checkbox
        setUser({
          uid: user.uid,
          email: trimEmail,
          name: name.trim(),
          createdAt: new Date().toISOString(),
        });

      } else if (mode === 'login') {
        // Firebase verifies the password server-side; a bad email/password throws (handled in catch).
        // B45 founder finding: when a sign-in has to BUILD the account's encryption envelope (an
        // account with no envelope yet), the slow key-wrapping ran with no feedback — ~30 silent
        // seconds on the welcome screen, then the code popped up. Same honest treatment as signup
        // now: surface the code + "Securing…" state BEFORE the slow work, via onCode.
        const onLoginCode = (code: string) => { setPendingRecoveryCode(code); setSecuringAccount(true); };
        const res = await loginUser(trimEmail, password, onLoginCode);
        setSecuringAccount(false);
        setUser({
          uid: res.user.uid,
          email: trimEmail,
          name: res.user.displayName || trimEmail.split('@')[0],
          createdAt: res.user.metadata?.creationTime || '',
        });
        if (res.needsRecovery) {
          // Password was reset and can't open the data — ask for the recovery code to restore it.
          setRestorePassword(password);
          setRestoreByReturn(false); setReturnRefused(false); setReturnFrom(null);
          setRestoreVisible(true);
          // the door to a member's return code shows only when the household has a member, named (return code v01, state C)
          loadHouseholdPeople(res.user.uid, null).then((p) => {
            if (p.role === 'owner') setReturnFrom({ name: firstNameOf(p.memberName) ?? 'a member of your household' });
          }).catch(() => { /* offline: the recovery code is still asked for */ });
        } else if (res.recoveryCode) {
          // Legacy account just got an envelope — show its new recovery code (root), then proceed.
          setPendingRecoveryCode(res.recoveryCode);
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(tabs)/home');
        }

      } else if (mode === 'forgot') {
        await resetPassword(trimEmail);
        // Don't reveal whether the email is registered (prevents account enumeration).
        Alert.alert(
          'Password reset sent',
          `If an account exists for ${trimEmail}, you’ll receive reset instructions by email.\n\nYour data is end-to-end encrypted — after resetting, sign in and enter your recovery code to restore it.`,
        );
        setMode('login');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account already exists',
          `An account with ${trimEmail} already exists.`,
          [
            { text: 'Sign in', onPress: () => setMode('login') },
            { text: 'Try a different email', style: 'cancel' },
          ]
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        // One generic message for both wrong-password and unknown-email — avoids account enumeration.
        Alert.alert('Sign-in failed', 'That email or password is incorrect.', [
          { text: 'Forgot password?', onPress: () => setMode('forgot') },
          { text: 'Try again', style: 'cancel' },
        ]);
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Too many attempts', 'Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        Alert.alert('No internet', 'Please check your connection and try again.');
      } else {
        // Never surface a raw Firebase/network exception string to the user.
        Alert.alert('Something went wrong', "We couldn’t complete that just now. Please try again.");
      }
    } finally {
      setLoading(false);
      setSecuringAccount(false);   // never leave the recovery modal stuck in "Securing…" if signup errored
    }
  }

  // Restore data after a password reset, using the recovery code.
  async function submitRestore() {
    if (!restoreCode.trim()) { Alert.alert('Recovery code needed', 'Enter your recovery code, or start fresh.'); return; }
    setRestoreBusy(true);
    try {
      await restoreWithRecoveryCode(restoreCode.trim(), restorePassword);
      setRestoreVisible(false);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Couldn’t restore', err?.message || 'That recovery code didn’t work.');
    } finally {
      setRestoreBusy(false);
    }
  }
  // R14: the member's return code opens the household's data; it re-locks under the new password, and a new recovery code follows
  async function submitReturn() {
    if (!restoreCode.trim() || !returnFrom) return;
    setRestoreBusy(true); setReturnRefused(false);
    try {
      const newCode = await restoreOwnerWithReturnCode(restoreCode.trim(), restorePassword);
      setRestoreVisible(false);
      useStore.setState({ pendingRecoveryReturnedBy: returnFrom.name } as any);
      setPendingRecoveryCode(newCode);
      router.replace('/(tabs)/home');
    } catch {
      setReturnRefused(true);   // nothing is saved (R12, DEC-10749)
    } finally {
      setRestoreBusy(false);
    }
  }
  function startFresh() {
    // They don't have the recovery code → continue with a clean slate (old data stays locked).
    setRestoreVisible(false);
    router.replace('/(tabs)/home');
  }

  const titles: Record<Mode, string> = {
    login: 'Welcome back 👋',
    register: 'Create your account',
    forgot: 'Reset password',
  };
  const subs: Record<Mode, string> = {
    login: 'Sign in to your MoneyKeel account',
    register: 'Start your financial wellness journey',
    forgot: 'We’ll email you a reset link. Your data is end-to-end encrypted — only your password or recovery code can unlock it, not even MoneyKeel can read it. After resetting, sign in and enter your recovery code to restore your data.',
  };
  const btnLabels: Record<Mode, string> = {
    login: 'Sign in',
    register: 'Create account',
    forgot: 'Send reset link',
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Restore data with the recovery code (after a password reset) */}
      <Modal visible={restoreVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.restoreBackdrop}>
          <View style={styles.restoreCard}>
            {restoreByReturn && returnFrom ? (<>
              <Text style={styles.restoreTitle}>Use {returnFrom.name}’s return code</Text>
              <Text style={styles.restoreBody}>
                {returnFrom.name} makes the return code on {returnFrom.name}’s phone, in Settings › Household. Enter it here: it unlocks the household’s data, which then re-locks under the new password you just set.
              </Text>
              <TextInput
                style={styles.restoreInput}
                value={restoreCode}
                onChangeText={(t) => { setRestoreCode(t); setReturnRefused(false); }}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Return code"
              />
              {returnRefused && (
                <Text style={[styles.errorText, { marginTop: 0, marginBottom: Spacing.base }]}>This return code does not open the household’s data. Check it with {returnFrom.name}, or ask {returnFrom.name} to make a new one.</Text>
              )}
              <Button label={restoreBusy ? 'Restoring…' : 'Restore my data'} onPress={submitReturn} disabled={restoreBusy} />
              <TouchableOpacity hitSlop={Tap.slop} onPress={() => { setRestoreByReturn(false); setRestoreCode(''); setReturnRefused(false); }} style={{ paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
                <Text style={styles.restoreDoor}>‹ Use the recovery code instead</Text>
              </TouchableOpacity>
            </>) : (<>
            <Text style={styles.restoreTitle}>Restore your data</Text>
            <Text style={styles.restoreBody}>
              Your data is end-to-end encrypted, so your new password can’t open it yet. Enter your
              recovery code to unlock it — it’ll then re-lock under your new password automatically.
            </Text>
            <TextInput
              style={styles.restoreInput}
              value={restoreCode}
              onChangeText={setRestoreCode}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Recovery code"
            />
            <Button label={restoreBusy ? 'Restoring…' : 'Restore my data'} onPress={submitRestore} disabled={restoreBusy} />
            {returnFrom && (
              <TouchableOpacity hitSlop={Tap.slop} onPress={() => { setRestoreByReturn(true); setRestoreCode(''); }} style={{ paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
                <Text style={styles.restoreDoor}>I have a return code from {returnFrom.name} ›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity hitSlop={Tap.slop} onPress={startFresh} style={{ paddingVertical: 12, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Start fresh instead">
              <Text style={styles.restoreFresh}>I don’t have it — start fresh</Text>
            </TouchableOpacity>
            </>)}
          </View>
        </View>
      </Modal>

      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoWrap}>
          {/* the founder's mark (2026-10-30, "change the logo to attached"; drawing brand-wordmark v02) — the
              same brand asset first-run uses, never the old emoji circle or the K it replaced */}
          <Image source={require('../../assets/brand/mark.png')} style={styles.logoMark} resizeMode="contain" accessible={false} />
          {/* B45 founder finding: the name was TYPED (black here, green in the top bar) and neither
              matched the designed logo. No screen types the name anymore — this is the logo art
              itself, the founder's lettering cut from his full logo file (2026-10-30). */}
          <Image source={require('../../assets/brand/wordmark.png')} style={styles.wordmark} resizeMode="contain" accessibilityLabel="MoneyKeel" />
          <Text style={styles.tagline}>Your finance command center</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{titles[mode]}</Text>
          <Text style={styles.cardSub}>{subs[mode]}</Text>

          {mode === 'register' && (
            <Field label="Your name" value={name} onChange={setName} placeholder="Alex Johnson" autoComplete="name" autoCapitalize="words" />
          )}

          {/* Email with live validation */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={[styles.input, showEmailError && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {showEmailError && (
              <Text style={styles.errorText}>Please enter a valid email (e.g. you@gmail.com)</Text>
            )}
            {emailTouched && emailValid && (
              <Text style={styles.successText}>✓ Valid email</Text>
            )}
          </View>

          {mode !== 'forgot' && (
            <>
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                secureTextEntry={!showPass}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <TouchableOpacity style={styles.showPassBtn} onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showPassText}>{showPass ? 'Hide' : 'Show'} password</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'register' && (
            <Field
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat your password"
              secureTextEntry={!showPass}
              autoComplete="new-password"
              error={confirm.length > 0 && confirm !== password ? 'Passwords do not match' : undefined}
            />
          )}

          {mode === 'register' && (
            <View style={styles.strengthWrap}>
              <Text style={styles.strengthLabel}>Password strength</Text>
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, {
                  width: `${Math.min(password.length / 12 * 100, 100)}%` as any,
                  backgroundColor: password.length < 8 ? Colors.red : password.length < 10 ? Colors.amberMid : Colors.primary,
                }]} />
              </View>
              <Text style={[styles.strengthText, { color: password.length < 8 ? Colors.red : password.length < 10 ? Colors.amber : Colors.primary }]}>
                {password.length === 0 ? '' : password.length < 8 ? 'Too short' : password.length < 10 ? 'OK' : 'Strong'}
              </Text>
            </View>
          )}

          {mode === 'register' && (
            <Field
              label="Spouse invite code (optional)"
              value={inviteCode}
              onChange={(t) => { setInviteCode(t.toUpperCase()); setJoinRefusal(null); }}
              placeholder="Have a code from your spouse?"
              autoCapitalize="characters"
              note={joinRefusal?.under === 'invite' ? joinRefusal.text : undefined}
              noteIsRefusal
            />
          )}

          {/* R13 (invite-and-join v01, mark 7): the key code, shown once the invite code holds anything */}
          {mode === 'register' && inviteCode.trim().length > 0 && (
            <Field
              label="Spouse key code"
              value={keyCode}
              onChange={(t) => { setKeyCode(t.toUpperCase()); setJoinRefusal(null); }}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              note={joinRefusal ? (joinRefusal.under === 'key' ? joinRefusal.text : undefined) : 'The invite code and the key code are both on your spouse’s phone. They last 7 days.'}
              noteIsRefusal={joinRefusal?.under === 'key'}
            />
          )}

          <Button label={btnLabels[mode]} onPress={handleSubmit} loading={loading} style={{ marginTop: Spacing.base }} />

          {mode === 'login' && (
            <TouchableOpacity hitSlop={Tap.slop} onPress={() => setMode('forgot')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'login' ? (
            <TouchableOpacity onPress={() => setMode('register')} style={{ paddingVertical: 12, minHeight: 44, justifyContent: 'center' }}>
              <Text style={styles.footerText}>
                New to MoneyKeel? <Text style={styles.footerLink}>Create account</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setMode('login')} style={{ paddingVertical: 12, minHeight: 44, justifyContent: 'center' }}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.legal}>
          Your data is stored privately on your device. We never sell your information.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder, secureTextEntry,
  autoComplete, autoCapitalize, keyboardType, error, note, noteIsRefusal,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  autoComplete?: any; autoCapitalize?: any; keyboardType?: any; error?: string;
  note?: string; noteIsRefusal?: boolean;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : {}]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize || 'none'}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!!note && <Text style={noteIsRefusal ? styles.errorText : styles.hintText}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  restoreBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, zIndex: 10 },
  restoreCard: { width: '100%', maxWidth: 400, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg },
  restoreTitle: { fontSize: Typography.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  restoreBody: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.base },
  restoreInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: Typography.sizes.md, color: Colors.textPrimary, marginBottom: Spacing.base, fontFamily: 'monospace' },
  restoreFresh: { color: Colors.textTertiary, fontWeight: '600', fontSize: Typography.sizes.sm },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  // brand-wordmark v02 (2026-10-30): the lettering keeps its 150 width at the art's 4.9 : 1; the mark keeps the size it
  // has beside the lettering in the founder's full logo (0.6 of its width) at the mark's 2.04 : 1 — it was a square 84
  logoMark: { width: 89, height: 43.7, marginBottom: Spacing.sm },
  wordmark: { width: 150, height: 30.6, marginTop: 2 },
  tagline: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.xl, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.xl },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  inputError: { borderColor: Colors.red, borderWidth: 1 },
  errorText: { fontSize: Typography.sizes.sm, color: Colors.red, marginTop: 4 },
  hintText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  restoreDoor: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.sm },
  successText: { fontSize: Typography.sizes.sm, color: Colors.primary, marginTop: 4 },
  showPassBtn: { alignSelf: 'flex-end', paddingVertical: 12, marginBottom: Spacing.xs, minHeight: 44, justifyContent: 'center' },
  showPassText: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: '500' },
  strengthWrap: { marginBottom: Spacing.sm },
  strengthLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: 4 },
  strengthBar: { height: 4, backgroundColor: Colors.bgSecondary, borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  strengthFill: { height: 4, borderRadius: 4 },
  strengthText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: Typography.sizes.base, color: Colors.primary, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  footerLink: { color: Colors.primary, fontWeight: '600' },
  legal: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16 },
});
