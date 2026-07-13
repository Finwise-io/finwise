import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Card, TipCard } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { logoutUser, submitFeedback, resendVerification, refreshEmailVerified, isEmailVerified, deleteAccount, regenerateRecoveryCode, currentUserEmail } from '../services/firebase';
import { isLockAvailable, authenticate } from '../services/appLock';
import { RecoveryCodeModal } from '../components/RecoveryCodeModal';
import { FONT_SCALES } from '../utils/fontScale';
import Constants from 'expo-constants';
import { sendTestReport } from '../services/crashReporter';

const PRIVACY_URL = 'https://finwise-io.github.io/finwise/privacy';
const TERMS_URL   = 'https://finwise-io.github.io/finwise/terms';
const SUPPORT_EMAIL = 'support@finwise.app';

function openURL(url: string) {
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open link', 'Please visit ' + url)
  );
}

const FEEDBACK_TYPES = [
  { value: 'feature',  label: '✨ Feature request' },
  { value: 'bug',      label: '🐛 Bug report' },
  { value: 'ux',       label: '🎨 Design / UX' },
  { value: 'general',  label: '💬 General feedback' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, resetAll, setUser, setOnboardingComplete, setOnboardingPaused, setOnboardingDraft, restartOnboarding, budgetFrequency, payFrequency, displayMode, setDisplayMode, fontScale, setFontScale, appLockEnabled, setAppLockEnabled, hideBalances, toggleHideBalances } = useStore() as any;

  // F-2: app lock — confirm the device can authenticate before enabling, so the user can't lock
  // themselves out, and require a successful auth to turn it on.
  const [lockAvailable, setLockAvailable] = useState(false);
  useEffect(() => { isLockAvailable().then(setLockAvailable); }, []);
  async function handleToggleAppLock(next: boolean) {
    if (next) {
      if (!(await isLockAvailable())) {
        Alert.alert('Set up a passcode first', 'Add Face ID, Touch ID, or a device passcode in your phone settings, then enable app lock.');
        return;
      }
      const ok = await authenticate('Confirm to enable app lock');
      if (!ok) return;                 // failed/cancelled → leave it off
      setAppLockEnabled(true);
    } else {
      const ok = await authenticate('Confirm to disable app lock');
      if (!ok) return;                 // require auth to turn the lock OFF too
      setAppLockEnabled(false);
    }
  }

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [fbType,    setFbType]    = useState('feature');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [verified, setVerified] = useState(isEmailVerified());
  useEffect(() => { if (user) refreshEmailVerified().then(setVerified).catch(() => {}); }, [user]);
  // Deep-link from the menu's "Send feedback" → open the feedback form straight away.
  const params = useLocalSearchParams();
  useEffect(() => { if (params?.openFeedback) setFeedbackVisible(true); }, [params?.openFeedback]);
  const handleResendVerify = async () => {
    try { await resendVerification(); Alert.alert('Verification sent', `Check ${user?.email ?? 'your inbox'} for the link.`); }
    catch { Alert.alert('Could not send', 'Please try again in a moment.'); }
  };
  const handleCheckVerified = async () => {
    const v = await refreshEmailVerified().catch(() => false);
    setVerified(v);
    Alert.alert(v ? 'Email verified ✓' : 'Not verified yet', v ? 'Thanks — you\'re all set.' : 'Click the link in the email, then try again.');
  };

  function handleLogout() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out? Your data is saved on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            setUser(null);
            router.replace('/auth');
          },
        },
      ]
    );
  }

  // ── Recovery code (re-issue) ───────────────────────────────────────
  const [rcCode, setRcCode] = useState<string | null>(null);
  const [rcBusy, setRcBusy] = useState(false);
  function handleRegenRecovery() {
    Alert.alert(
      'New recovery code',
      'This creates a new recovery code and turns off your old one. You\'ll need to save the new one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setRcBusy(true);
            try { setRcCode(await regenerateRecoveryCode()); }
            catch (e: any) { Alert.alert('Couldn\'t generate a code', e?.message || 'Please try again.'); }
            finally { setRcBusy(false); }
          },
        },
      ]
    );
  }

  // ── Delete account (App Store Guideline 5.1.1(v)) ──────────────────
  const [delVisible, setDelVisible] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delShowPass, setDelShowPass] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  // Authoritative signed-in identity (NOT the possibly-stale store user) — what delete actually acts on.
  const acctEmail = currentUserEmail() ?? user?.email ?? null;

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      `This permanently deletes ${acctEmail ?? 'your account'} and all its MoneyKeel data from our servers. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => { setDelPassword(''); setDelShowPass(false); setDelVisible(true); } },
      ]
    );
  }

  async function submitDeleteAccount() {
    if (!delPassword) { Alert.alert('Password required', 'Enter your password to confirm.'); return; }
    setDelBusy(true);
    try {
      await deleteAccount(delPassword);
      // Wipe local data so nothing lingers on the device, then return to auth.
      resetAll();
      setUser(null);
      setDelVisible(false);
      Alert.alert('Account deleted', 'Your account and data have been removed.');
      router.replace('/auth');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        Alert.alert('Incorrect password', 'That password is incorrect. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Too many attempts', 'Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        Alert.alert('No internet', 'Please check your connection and try again.');
      } else {
        Alert.alert('Could not delete account', err?.message || 'Please try again.');
      }
    } finally {
      setDelBusy(false);
    }
  }

  function handleReset() {
    Alert.alert(
      '⚠️ Reset all data',
      'This will delete ALL your income, expenses, savings, and goals. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            resetAll();
            setOnboardingComplete(false);
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  function handleSendDiagnostic() {
    const on = sendTestReport();   // B-L2: ships a test event when Sentry is configured
    Alert.alert(
      on ? 'Diagnostic sent' : 'Noted',
      on
        ? "Thanks — a diagnostic report was sent. It's anonymous and contains no financial data."
        : 'Diagnostics will be sent once crash reporting is enabled in this build.',
    );
  }

  async function handleSendFeedback() {
    if (!fbMessage.trim()) {
      Alert.alert('Missing message', 'Please write your feedback before sending.');
      return;
    }
    setFbSending(true);
    try {
      await submitFeedback({
        uid:        user?.uid ?? null,
        email:      user?.email ?? null,
        name:       user?.name ?? null,
        type:       fbType,
        subject:    fbSubject.trim() || FEEDBACK_TYPES.find(t => t.value === fbType)?.label || fbType,
        message:    fbMessage.trim(),
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
        buildNumber: String(Constants.expoConfig?.ios?.buildNumber ?? ''),
        platform:   `${Platform.OS} ${Platform.Version}`,
      });
      setFeedbackVisible(false);
      setFbSubject(''); setFbMessage(''); setFbType('feature');
      Alert.alert('Thanks! 🙏', 'Your feedback was sent. We read everything.');
    } catch {
      Alert.alert('Could not send', 'Check your connection and try again.');
    } finally {
      setFbSending(false);
    }
  }

  function handleRerunOnboarding() {
    Alert.alert(
      'Re-run setup',
      'This clears your setup answers and the figures setup created, then restarts the wizard. ' +
      'Your login, preferences, and anything you added yourself (logged transactions, accounts you ' +
      'added in Net Worth) are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () => {
            restartOnboarding();          // clean overwrite — clears profile + onboarding-seeded data
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Profile */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{user?.name || 'MoneyKeel User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@moneykeel.ai'}{user && verified ? '  ✓ verified' : ''}</Text>
        </View>
      </Card>

      {user && !verified && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyTxt}>⚠ Verify your email so you can recover your account. We sent a link to {user?.email}.</Text>
          <View style={styles.verifyRow}>
            <TouchableOpacity onPress={handleResendVerify}><Text style={styles.verifyAction}>Resend</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleCheckVerified}><Text style={styles.verifyAction}>I've verified ›</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Current settings */}
      <Card>
        <Text style={styles.sectionTitle}>Current settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Budget frequency</Text>
          <Text style={styles.settingValue}>{budgetFrequency.charAt(0).toUpperCase() + budgetFrequency.slice(1)}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Pay frequency</Text>
          <Text style={styles.settingValue}>{payFrequency.charAt(0).toUpperCase() + payFrequency.slice(1)}</Text>
        </View>
        <TouchableOpacity style={styles.linkBtn} onPress={handleRerunOnboarding}>
          <Text style={styles.linkText}>Change settings →</Text>
        </TouchableOpacity>
      </Card>

      {/* Display mode */}
      <Card>
        <Text style={styles.sectionTitle}>Display mode</Text>
        <View style={styles.modeRow}>
          {(['simple', 'advisor'] as const).map((m) => (
            <TouchableOpacity key={m} style={[styles.modeBtn, (displayMode ?? 'simple') === m && styles.modeBtnOn]} onPress={() => setDisplayMode(m)}>
              <Text style={[styles.modeT, (displayMode ?? 'simple') === m && styles.modeTOn]}>{m === 'simple' ? 'Simple' : 'Advisor'}</Text>
              <Text style={styles.modeSub}>{m === 'simple' ? 'plain language, less detail' : 'full depth & metrics'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.modeNote}>Simple hides technical detail (benchmarks, Monte-Carlo jargon, caveats). Advisor shows everything.</Text>
      </Card>

      {/* Text size (accessibility) */}
      <Card>
        <Text style={styles.sectionTitle}>Text size</Text>
        <View style={styles.modeRow}>
          {FONT_SCALES.map((f) => (
            <TouchableOpacity key={f.value} style={[styles.modeBtn, (fontScale ?? 1) === f.value && styles.modeBtnOn]} onPress={() => setFontScale(f.value)}>
              <Text style={[styles.modeT, (fontScale ?? 1) === f.value && styles.modeTOn, { fontSize: 13 * f.value }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.modeNote}>Make text bigger across the whole app for easier reading.</Text>
      </Card>

      {/* App lock (F-2) */}
      <Card>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.lockRow}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Text style={styles.actionLabel}>App lock</Text>
            <Text style={styles.actionSub}>
              {lockAvailable
                ? 'Require Face ID, Touch ID, or your passcode to open MoneyKeel.'
                : 'Add a passcode or biometrics in your phone settings to use this.'}
            </Text>
          </View>
          <Switch
            value={!!appLockEnabled}
            onValueChange={handleToggleAppLock}
            disabled={!lockAvailable && !appLockEnabled}
            trackColor={{ true: Colors.primary }}
            accessibilityLabel="App lock"
            accessibilityHint="Requires Face ID, Touch ID, or your passcode to open the app"
          />
        </View>

        <View style={styles.lockRow}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Text style={styles.actionLabel}>Hide balances</Text>
            <Text style={styles.actionSub}>Mask every money amount as •••• so you can open the app in public. Also on the eye icon up top.</Text>
          </View>
          <Switch
            value={!!hideBalances}
            onValueChange={() => toggleHideBalances?.()}
            trackColor={{ true: Colors.primary }}
            accessibilityLabel="Hide balances"
            accessibilityHint="Masks every money amount in the app"
          />
        </View>

        <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleRegenRecovery} disabled={rcBusy}
          accessibilityRole="button" accessibilityLabel="Recovery code" accessibilityHint="Generates a new recovery code to restore data if you forget your password">
          <Text style={{ fontSize: 22 }}>🔑</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Recovery code</Text>
            <Text style={styles.actionSub}>Restores your data if you forget your password. Generate a new one anytime.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* B-L1: the privacy promise, stated plainly where users look for it — emphasized (larger font),
            because for a finance app this claim matters most. */}
        <Text style={styles.privacyClaim}>
          🔒 Your financial data is encrypted on your device and in the cloud — even we can't read it — and it's never sent to AI or LLM providers.
        </Text>
      </Card>

      <RecoveryCodeModal visible={!!rcCode} code={rcCode ?? ''} onDone={() => setRcCode(null)} />

      {/* Actions */}
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.actionRow} onPress={handleRerunOnboarding}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Re-run setup wizard</Text>
            <Text style={styles.actionSub}>Update your goals and budget settings</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/jobsafety')}>
          <Text style={{ fontSize: 22 }}>🛡</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Job safety check</Text>
            <Text style={styles.actionSub}>Plan for income gaps</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/retirement')}>
          <Text style={{ fontSize: 22 }}>🏖</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Retirement planner</Text>
            <Text style={styles.actionSub}>Update your retirement plan</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
          <Text style={{ fontSize: 22 }}>🚪</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={[styles.actionLabel, { color: Colors.red }]}>Sign out</Text>
            <Text style={styles.actionSub}>Log out of {user?.email ?? 'your account'}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={confirmDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityHint="Permanently deletes your account and all data"
        >
          <Text style={{ fontSize: 22 }}>🗑️</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={[styles.actionLabel, { color: Colors.red }]}>Delete account</Text>
            <Text style={styles.actionSub}>Permanently remove your account and all data</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Delete-account confirmation (password re-auth) */}
      <Modal visible={delVisible} transparent animationType="fade" onRequestClose={() => setDelVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.delBackdrop}>
          <View style={styles.delCard}>
            <Text style={styles.delTitle}>Confirm account deletion</Text>
            <Text style={styles.delBody}>
              Deleting <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{acctEmail ?? 'your account'}</Text>.
              Enter <Text style={{ fontWeight: '800' }}>this account's</Text> password to permanently delete it and all its MoneyKeel data. This can't be undone.
            </Text>
            <View style={styles.delInputRow}>
              <TextInput
                style={styles.delInputField}
                value={delPassword}
                onChangeText={setDelPassword}
                placeholder={`Password for ${acctEmail ?? 'this account'}`}
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry={!delShowPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setDelShowPass((v) => !v)}
                style={styles.delShow}
                accessibilityRole="button"
                accessibilityLabel={delShowPass ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.delShowTxt}>{delShowPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.delRow}>
              <TouchableOpacity style={[styles.delBtn, styles.delCancel]} onPress={() => setDelVisible(false)} disabled={delBusy} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={styles.delCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.delBtn, styles.delConfirm, delBusy && { opacity: 0.6 }]} onPress={submitDeleteAccount} disabled={delBusy} accessibilityRole="button" accessibilityLabel="Delete my account">
                {delBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.delConfirmTxt}>Delete account</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Feedback */}
      <TouchableOpacity onPress={() => setFeedbackVisible(true)} activeOpacity={0.8}>
        <Card style={styles.feedbackCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={styles.feedbackIcon}>
              <Text style={{ fontSize: 24 }}>💡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackTitle}>Share feedback</Text>
              <Text style={styles.feedbackSub}>Feature requests, bug reports, ideas — we read everything</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Legal & Support */}
      <Card>
        <Text style={styles.sectionTitle}>Legal & Support</Text>

        <TouchableOpacity style={styles.actionRow} onPress={() => openURL(PRIVACY_URL)}>
          <Text style={{ fontSize: 22 }}>🔒</Text>
          <Text style={[styles.actionLabel, { flex: 1, marginLeft: Spacing.sm }]}>Privacy Policy</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => openURL(TERMS_URL)}>
          <Text style={{ fontSize: 22 }}>📄</Text>
          <Text style={[styles.actionLabel, { flex: 1, marginLeft: Spacing.sm }]}>Terms of Service</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={{ fontSize: 22 }}>✉️</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Contact Support</Text>
            <Text style={styles.actionSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={handleSendDiagnostic}
          accessibilityRole="button" accessibilityLabel="Send a diagnostic report"
          accessibilityHint="Sends an anonymous diagnostic event to help us fix problems">
          <Text style={{ fontSize: 22 }}>🩺</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Send a diagnostic report</Text>
            <Text style={styles.actionSub}>Anonymous — helps us fix problems. No financial data.</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
          <Text style={{ fontSize: 22 }}>ℹ️</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={styles.actionLabel}>Version</Text>
            <Text style={styles.actionSub}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
        </View>
      </Card>

      {/* Feedback modal */}
      <Modal visible={feedbackVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send feedback</Text>
            <TouchableOpacity onPress={handleSendFeedback} disabled={fbSending}>
              {fbSending
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.modalSave}>Send</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.base, gap: Spacing.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

            <Text style={styles.inputLabel}>What kind of feedback?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FEEDBACK_TYPES.map(t => (
                <TouchableOpacity key={t.value}
                  style={[styles.typeBtn, fbType === t.value && styles.typeBtnOn]}
                  onPress={() => setFbType(t.value)}>
                  <Text style={[styles.typeBtnText, fbType === t.value && styles.typeBtnTextOn]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Subject (optional)</Text>
            <TextInput
              style={styles.input}
              value={fbSubject}
              onChangeText={setFbSubject}
              placeholder="e.g. Add dark mode, Chart is broken on iPhone 15"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Your feedback</Text>
            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: 'top' }]}
              value={fbMessage}
              onChangeText={setFbMessage}
              placeholder="Describe your idea, what went wrong, or what you'd like to see..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              autoFocus
            />

            <TipCard color="green">
              <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
                Your feedback goes directly to the MoneyKeel team. We read every submission and use it to prioritize new features.
              </Text>
            </TipCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Financial Disclaimer */}
      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>⚠️  Financial Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          MoneyKeel is for informational and educational purposes only. It does not constitute financial,
          investment, tax, or legal advice. Always consult a qualified financial professional before
          making financial decisions.
        </Text>
      </Card>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      {/* Danger zone */}
      <Card style={styles.dangerCard}>
        <Text style={[styles.sectionTitle, { color: Colors.red }]}>Danger zone</Text>
        <TipCard color="red">
          <Text style={{ fontSize: Typography.sizes.sm, color: Colors.red }}>
            Resetting will permanently delete all your data. This cannot be undone.
          </Text>
        </TipCard>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
          <Text style={styles.dangerBtnText}>Reset all data</Text>
        </TouchableOpacity>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  userName: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  userEmail: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  verifyBanner: { backgroundColor: Colors.amberLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  verifyTxt: { fontSize: 12.5, color: Colors.textPrimary, lineHeight: 17 },
  verifyRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  verifyAction: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 10, alignItems: 'center' },
  modeBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  modeT: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
  modeTOn: { color: Colors.primaryDark },
  modeSub: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  modeNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 10, lineHeight: 15 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  settingLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  settingValue: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  linkBtn: { marginTop: Spacing.sm },
  linkText: { fontSize: Typography.sizes.base, color: Colors.primary, fontWeight: '500' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  lockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  delBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  delCard: { width: '100%', maxWidth: 380, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg },
  delTitle: { fontSize: Typography.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  delBody: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.base },
  delInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.base },
  delInputField: { flex: 1, paddingVertical: 12, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  delShow: { paddingVertical: 10, paddingLeft: 12, minHeight: 44, justifyContent: 'center' },
  delShowTxt: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.sm },
  delRow: { flexDirection: 'row', gap: Spacing.sm },
  delBtn: { flex: 1, minHeight: 44, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  delCancel: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.borderStrong },
  delCancelTxt: { color: Colors.textPrimary, fontWeight: '700', fontSize: Typography.sizes.md },
  delConfirm: { backgroundColor: Colors.red },
  delConfirmTxt: { color: '#fff', fontWeight: '700', fontSize: Typography.sizes.md },
  actionLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  actionSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  privacyClaim: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.sm, lineHeight: 21 },   // B-L1: larger than the rest — the claim that matters most
  arrow: { fontSize: 20, color: Colors.textTertiary },
  logoutBtn: { backgroundColor: Colors.redLight, borderRadius: Radii.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.redMid },
  logoutText: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.red },
  dangerCard: { borderColor: Colors.redMid, borderWidth: 0.5 },
  dangerBtn: { backgroundColor: Colors.red, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  dangerBtnText: { fontSize: Typography.sizes.base, fontWeight: '600', color: '#fff' },
  disclaimerCard: { borderColor: Colors.amberMid, borderWidth: 0.5, backgroundColor: Colors.amberLight },
  disclaimerTitle: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.amber, marginBottom: Spacing.xs },
  disclaimerText: { fontSize: Typography.sizes.xs, color: Colors.amber, lineHeight: 18 },
  feedbackCard: { borderColor: Colors.primaryMid, borderWidth: 0.5, backgroundColor: Colors.primaryLight },
  feedbackIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  feedbackTitle: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.primaryDeep },
  feedbackSub: { fontSize: Typography.sizes.xs, color: Colors.primaryDark, marginTop: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  modalTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  modalCancel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  modalSave: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.primary },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  typeBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  typeBtnText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  typeBtnTextOn: { color: Colors.primaryDeep, fontWeight: '600' },
});
