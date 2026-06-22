import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser, registerUser, resetPassword, restoreWithRecoveryCode, lookupInvite, setUserHousehold, joinHouseholdMembership, loadUserData } from '../services/firebase';
import { useStore } from '../store/useStore';
import { Button } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type Mode = 'login' | 'register' | 'forgot';

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

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');     // optional partner-invite (household join) at signup
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Recovery-code flows. The "show new code" popup lives at the root (store.pendingRecoveryCode) so the
  // post-signup navigation can't unmount it; only the restore-after-reset input is local to this screen.
  const [restoreVisible, setRestoreVisible] = useState(false);          // "enter recovery code" after a reset
  const [restorePassword, setRestorePassword] = useState('');           // the new password they just used
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);

  // Real-time email validation feedback
  const emailTouched = email.length > 0;
  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid;

  // Optional partner-invite join (ported from the former onboarding account step, L-4). Returns true
  // when we joined a shared household (and navigated Home); false to fall through to solo onboarding.
  async function joinHousehold(uid: string): Promise<boolean> {
    const code = inviteCode.trim();
    if (!code) return false;
    const inv = await lookupInvite(code);
    if (!inv) {
      Alert.alert('Invite code not found', "Double-check the code with your partner — or continue without it and join later.");
      return false;
    }
    // Claim membership FIRST (carries the code; rules gate the shared-doc read on this member doc
    // existing), then record the pointer on our own doc, then pull the shared plan.
    await joinHouseholdMembership(uid, inv.householdId, code);
    await setUserHousehold(uid, inv.householdId);
    const s: any = useStore.getState();
    s.setHouseholdId?.(inv.householdId);
    const data = await loadUserData(inv.householdId);
    if (data) s.loadFromCloud?.(data);
    s.setOnboardingDraft?.(null);
    s.setOnboardingPaused?.(false);
    s.setOnboardingComplete?.(true);
    Alert.alert("You're in! 🎉", `You're sharing a plan with ${inv.inviterName ?? 'your partner'} — you'll both see the same accounts, plans and goals.`);
    router.replace('/(tabs)/home');
    return true;
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
      Alert.alert('Passwords don\'t match', 'Please make sure both passwords are identical.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        // Firebase rejects a duplicate email with auth/email-already-in-use (handled in catch).
        const { user, recoveryCode } = await registerUser(trimEmail, password, name.trim());
        setUser({
          uid: user.uid,
          email: trimEmail,
          name: name.trim(),
          createdAt: new Date().toISOString(),
        });
        // Show the recovery code at the root (survives the auth-routing navigation that follows).
        setPendingRecoveryCode(recoveryCode);
        // Optional: if they entered a partner invite code, join that shared household. On success it
        // navigates Home; on failure we fall through and the auth listener routes to solo onboarding.
        if (inviteCode.trim()) {
          try {
            await joinHousehold(user.uid);
          } catch {
            Alert.alert("Couldn't join the household", 'Check your connection — you can also join later. Continuing your own setup for now.');
          }
        }

      } else if (mode === 'login') {
        // Firebase verifies the password server-side; a bad email/password throws (handled in catch).
        const res = await loginUser(trimEmail, password);
        setUser({
          uid: res.user.uid,
          email: trimEmail,
          name: res.user.displayName || trimEmail.split('@')[0],
          createdAt: res.user.metadata?.creationTime || '',
        });
        if (res.needsRecovery) {
          // Password was reset and can't open the data — ask for the recovery code to restore it.
          setRestorePassword(password);
          setRestoreVisible(true);
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
          `If an account exists for ${trimEmail}, you'll receive reset instructions by email.\n\nYour data is end-to-end encrypted — after resetting, sign in and enter your recovery code to restore it.`,
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
        Alert.alert('Something went wrong', err?.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
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
      Alert.alert('Couldn\'t restore', err?.message || 'That recovery code didn\'t work.');
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
    login: 'Sign in to your FinWise account',
    register: 'Start your financial wellness journey',
    forgot: 'We\'ll email you a reset link. Your data is end-to-end encrypted — only your password or recovery code can unlock it, not even FinWise can read it. After resetting, sign in and enter your recovery code to restore your data.',
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
            <Text style={styles.restoreTitle}>Restore your data</Text>
            <Text style={styles.restoreBody}>
              Your data is end-to-end encrypted, so your new password can't open it yet. Enter your
              recovery code to unlock it — it'll then re-lock under your new password automatically.
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
            <TouchableOpacity onPress={startFresh} style={{ paddingVertical: 12, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Start fresh instead">
              <Text style={styles.restoreFresh}>I don't have it — start fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={{ fontSize: 36 }}>💰</Text>
          </View>
          <Text style={styles.appName}>FinWise</Text>
          <Text style={styles.tagline}>Your money, made simple</Text>
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
              label="Partner invite code (optional)"
              value={inviteCode}
              onChange={(t) => setInviteCode(t.toUpperCase())}
              placeholder="Have a code from your partner?"
              autoCapitalize="characters"
            />
          )}

          <Button label={btnLabels[mode]} onPress={handleSubmit} loading={loading} style={{ marginTop: Spacing.base }} />

          {mode === 'login' && (
            <TouchableOpacity onPress={() => setMode('forgot')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {mode === 'login' ? (
            <TouchableOpacity onPress={() => setMode('register')}>
              <Text style={styles.footerText}>
                New to FinWise? <Text style={styles.footerLink}>Create account</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setMode('login')}>
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
  autoComplete, autoCapitalize, keyboardType, error,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  autoComplete?: any; autoCapitalize?: any; keyboardType?: any; error?: string;
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
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  appName: { fontSize: Typography.sizes.xxl, fontWeight: '700', color: Colors.textPrimary },
  tagline: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.xl, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.xl },
  cardTitle: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  inputError: { borderColor: Colors.red, borderWidth: 1 },
  errorText: { fontSize: Typography.sizes.xs, color: Colors.red, marginTop: 4 },
  successText: { fontSize: Typography.sizes.xs, color: Colors.primary, marginTop: 4 },
  showPassBtn: { alignSelf: 'flex-end', marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  showPassText: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: '500' },
  strengthWrap: { marginBottom: Spacing.sm },
  strengthLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: 4 },
  strengthBar: { height: 4, backgroundColor: Colors.bgSecondary, borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  strengthFill: { height: 4, borderRadius: 4 },
  strengthText: { fontSize: Typography.sizes.xs, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: Spacing.md },
  linkText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  footer: { alignItems: 'center', marginTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  footerLink: { color: Colors.primary, fontWeight: '600' },
  legal: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16 },
});
