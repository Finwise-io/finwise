import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Card, TipCard } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { logoutUser } from '../services/firebase';
import Constants from 'expo-constants';

const PRIVACY_URL = 'https://finwise-jj.github.io/finwise/privacy';
const TERMS_URL   = 'https://finwise-jj.github.io/finwise/terms';
const SUPPORT_EMAIL = 'support@finwise.app';

function openURL(url: string) {
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open link', 'Please visit ' + url)
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, resetAll, setUser, setOnboardingComplete, budgetFrequency, payFrequency } = useStore();

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
});
