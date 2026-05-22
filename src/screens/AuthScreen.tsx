import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, resetPassword } from '../services/firebase';
import { useStore } from '../store/useStore';
import { Button } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type Mode = 'login' | 'register' | 'forgot';

// ── Email validation ───────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

// ── Local account store (simulates duplicate checking) ─────────────
const ACCOUNTS_KEY = 'finwise_accounts';

async function getStoredAccounts(): Promise<Record<string, { name: string; password: string }>> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAccount(email: string, name: string, password: string) {
  const accounts = await getStoredAccounts();
  accounts[email.toLowerCase()] = { name, password };
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function checkDuplicate(email: string): Promise<boolean> {
  const accounts = await getStoredAccounts();
  return !!accounts[email.toLowerCase()];
}

async function checkLogin(email: string, password: string): Promise<string | null> {
  const accounts = await getStoredAccounts();
  const account = accounts[email.toLowerCase()];
  if (!account) return null; // not found
  if (account.password !== password) return 'wrong_password';
  return account.name;
}

export default function AuthScreen() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Real-time email validation feedback
  const emailTouched = email.length > 0;
  const emailValid = isValidEmail(email);
  const showEmailError = emailTouched && !emailValid;

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
        // Check for duplicate account
        const isDuplicate = await checkDuplicate(trimEmail);
        if (isDuplicate) {
          setLoading(false);
          Alert.alert(
            'Account already exists',
            `An account with ${trimEmail} already exists.\n\nWould you like to sign in instead?`,
            [
              { text: 'Sign in', onPress: () => setMode('login') },
              { text: 'Try different email', style: 'cancel' },
            ]
          );
          return;
        }

        // Save account locally
        await saveAccount(trimEmail, name.trim(), password);

        const user = await registerUser(trimEmail, password, name.trim());
        setUser({
          uid: user.uid,
          email: trimEmail,
          name: name.trim(),
          createdAt: new Date().toISOString(),
        });

        Alert.alert(
          'Account created! 🎉',
          `Welcome to FinWise, ${name.trim().split(' ')[0]}! Let's set up your financial plan.`,
          [{ text: 'Get started!', onPress: () => router.replace('/onboarding') }]
        );

      } else if (mode === 'login') {
        // Check stored accounts first
        const result = await checkLogin(trimEmail, password);

        if (result === null) {
          setLoading(false);
          Alert.alert(
            'Account not found',
            `No account found for ${trimEmail}.\n\nWould you like to create one?`,
            [
              { text: 'Create account', onPress: () => setMode('register') },
              { text: 'Try again', style: 'cancel' },
            ]
          );
          return;
        }

        if (result === 'wrong_password') {
          setLoading(false);
          Alert.alert('Wrong password', 'The password is incorrect. Please try again.', [
            { text: 'Forgot password?', onPress: () => setMode('forgot') },
            { text: 'Try again', style: 'cancel' },
          ]);
          return;
        }

        // Login successful
        const user = await loginUser(trimEmail, password);
        setUser({
          uid: user.uid,
          email: trimEmail,
          name: result, // stored name
          createdAt: '',
        });
        router.replace('/(tabs)/home');

      } else if (mode === 'forgot') {
        const accounts = await getStoredAccounts();
        if (!accounts[trimEmail]) {
          setLoading(false);
          Alert.alert('Email not found', `No account found for ${trimEmail}.`);
          return;
        }
        await resetPassword(trimEmail);
        Alert.alert('Password reset sent!', `Check your email at ${trimEmail} for reset instructions.`);
        setMode('login');
      }
    } catch (err: any) {
      const msg = err.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: 'Welcome back 👋',
    register: 'Create your account',
    forgot: 'Reset password',
  };
  const subs: Record<Mode, string> = {
    login: 'Sign in to your FinWise account',
    register: 'Start your financial wellness journey',
    forgot: 'We\'ll send you a password reset link',
  };
  const btnLabels: Record<Mode, string> = {
    login: 'Sign in',
    register: 'Create account',
    forgot: 'Send reset link',
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
