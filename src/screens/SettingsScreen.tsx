import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Card, TipCard } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { logoutUser, submitFeedback, resendVerification, refreshEmailVerified, isEmailVerified } from '../services/firebase';
import { FONT_SCALES } from '../utils/fontScale';
import Constants from 'expo-constants';

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
  const { user, resetAll, setUser, setOnboardingComplete, setOnboardingPaused, setOnboardingDraft, restartOnboarding, budgetFrequency, payFrequency, displayMode, setDisplayMode, fontScale, setFontScale } = useStore() as any;

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [fbType,    setFbType]    = useState('feature');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [verified, setVerified] = useState(isEmailVerified());
  useEffect(() => { if (user) refreshEmailVerified().then(setVerified).catch(() => {}); }, [user]);
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
          <Text style={styles.userName}>{user?.name || 'FinWise User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@finwise.app'}{user && verified ? '  ✓ verified' : ''}</Text>
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
      </Card>

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
                Your feedback goes directly to the FinWise team. We read every submission and use it to prioritize new features.
              </Text>
            </TipCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Financial Disclaimer */}
      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>⚠️  Financial Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          FinWise is for informational and educational purposes only. It does not constitute financial,
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
  actionLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  actionSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
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
