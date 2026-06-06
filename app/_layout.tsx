import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { setMoneyFormat } from '../src/domain/_shared/money';
import { patchTextScaling, setGlobalFontScale } from '../src/utils/fontScale';
import { onAuthChange, loadUserData, saveUserData } from '../src/services/firebase';
import { Colors } from '../src/utils/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

patchTextScaling();   // install the global font-scale hook once

// Fields synced to Firestore (excludes auth user + ephemeral economic data)
const SYNC_FIELDS = [
  'onboardingComplete', 'selectedGoals', 'budgetFrequency', 'payFrequency',
  'incomeIsFixed', 'budgetCategories', 'expenseTargetType', 'expenseTargetAmount',
  'expenseTargetPercent', 'savingsDistribution', 'retirementPlan',
  'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'debts', 'customCategories',
  'assetAccounts', 'liabilities', 'nwSeeded', 'nwSetupChoice', 'allocatedByMonth', 'allocPromptSkipped', 'monthlySnapshots', 'retirementAssumptions', 'retirementScenarios', 'benchmarkReturns',
  'currency', 'locale',
  'xp', 'streak', 'lastCheckIn', 'monthlyBudgetTarget', 'hourlyRate',
  'jobRiskLevel', 'emergencyMonths', 'onboardingPaused', 'onboardingProfile',
] as const;

function pickSyncFields(state: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const key of SYNC_FIELDS) out[key] = state[key];
  return out;
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: '600' }}>← Back</Text>
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const { user, setUser, onboardingComplete, onboardingPaused, loadFromCloud, resetAll, currency, locale, fontScale } = useStore() as any;
  setGlobalFontScale(fontScale ?? 1);   // keep the global text scale current
  // Keep the app-wide money formatter in sync with the (persisted / cloud-loaded) region.
  // Done in render so children format with the right currency on the same pass it changes.
  setMoneyFormat(currency, locale);
  const router    = useRouter();
  const segments  = useSegments();
  const [isReady, setIsReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUid = useRef<string | null>(null);

  // Auth listener + Firestore hydration on login
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser: any) => {
      if (firebaseUser) {
        setUser({
          uid:       firebaseUser.uid,
          email:     firebaseUser.email,
          name:      firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          createdAt: firebaseUser.metadata?.creationTime || '',
        });
        currentUid.current = firebaseUser.uid;

        // Hydrate local store from Firestore (best-effort — fail gracefully offline)
        try {
          const cloudData = await loadUserData(firebaseUser.uid);
          if (cloudData) loadFromCloud(cloudData);
          else resetAll();   // brand-new account → clean slate so a prior account's local data can't leak
        } catch (_) {
          // Offline — local AsyncStorage cache is already loaded by Zustand persist
        }
      } else {
        setUser(null);
        currentUid.current = null;
      }
      setIsReady(true);
    });
    return unsub;
  }, []);

  // Auto-sync store changes to Firestore (debounced 2 s)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const uid = currentUid.current;
      if (!uid) return;
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        saveUserData(uid, pickSyncFields(state as Record<string, any>)).catch(() => {
          // Silently ignore offline write failures — next successful sync catches up
        });
      }, 2000);
    });
    return () => {
      unsub();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  // Auth-based routing guard.
  // Onboarding now begins UNAUTHENTICATED (Q1/Q2); the account is created mid-flow,
  // so unauth users are allowed in /onboarding (it's not in the protected-modal set).
  useEffect(() => {
    if (!isReady) return;
    const inTabs       = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAuth       = segments[0] === 'auth';
    const inModals     = ['income','expense','savings','invest','jobsafety','income-detail','income-manager','performance','bonds','other-investments','retirement'].includes(segments[0] as string);
    if (user) {
      if (onboardingComplete) {
        if (!inTabs && !inModals) router.replace('/(tabs)/home');
      } else if (onboardingPaused) {
        // user chose "Save & come back later" → let them use the app; don't force onboarding
        if (inOnboarding) router.replace('/(tabs)/home');
      } else {
        if (!inOnboarding) router.replace('/onboarding');
      }
    } else {
      // Unauthenticated. New users do onboarding Q1/Q2; returning (logged-out) users log in.
      if (onboardingComplete) {
        if (!inAuth) router.replace('/auth');
      } else if (inTabs || inModals) {
        router.replace('/onboarding');
      }
    }
  }, [user, segments, isReady, onboardingComplete, onboardingPaused]);

  const backBtn = (onPress: () => void) => ({ headerLeft: () => <BackButton onPress={onPress} /> });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.bgSecondary },
            headerShadowVisible: false,
            headerTintColor: Colors.primary,
            headerTitleStyle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
            contentStyle: { backgroundColor: Colors.bgSecondary },
            headerLeft: ({ canGoBack }) => canGoBack ? <BackButton onPress={() => router.back()} /> : undefined,
          }}
        >
          <Stack.Screen name="index"      options={{ headerShown: false }} />
          <Stack.Screen name="auth"       options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
          <Stack.Screen name="income"     options={{ title: 'Log income 💵',      presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="expense"    options={{ title: 'Add expense 🧾',     presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="savings"    options={{ title: 'Add savings 🏦',     presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="invest"     options={{ title: 'Log investment 📈',  presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="jobsafety"  options={{ title: 'Job safety check 🛡', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="income-detail" options={{ title: 'Income 💵', headerShown: true, ...backBtn(() => router.back()) }} />
        </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
