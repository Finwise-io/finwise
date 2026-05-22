import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Card, TipCard } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { logoutUser, submitFeedback } from '../services/firebase';
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
  const { user, resetAll, setUser, setOnboardingComplete, budgetFrequency, payFrequency } = useStore();

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [fbType,    setFbType]    = useState('feature');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);

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
      'This will take you back through the setup wizard. Your existing data will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            setOnboardingComplete(false);
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
          <Text style={styles.userEmail}>{user?.email || 'user@finwise.app'}</Text>
        </View>
      </Card>

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
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
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
