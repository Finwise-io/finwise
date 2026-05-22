import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { onAuthChange, loadUserData, saveUserData } from '../src/services/firebase';
import { Colors } from '../src/utils/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

// Fields synced to Firestore (excludes auth user + ephemeral economic data)
const SYNC_FIELDS = [
  'onboardingComplete', 'selectedGoals', 'budgetFrequency', 'payFrequency',
  'incomeIsFixed', 'budgetCategories', 'expenseTargetType', 'expenseTargetAmount',
  'expenseTargetPercent', 'savingsDistribution', 'retirementPlan',
  'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'debts', 'customCategories',
  'xp', 'streak', 'lastCheckIn', 'monthlyBudgetTarget', 'hourlyRate',
  'jobRiskLevel', 'emergencyMonths',
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
  const { user, setUser, onboardingComplete, loadFromCloud } = useStore() as any;
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

  // Auth-based routing guard
  useEffect(() => {
    if (!isReady) return;
    const inTabs   = segments[0] === '(tabs)';
    const inModals = ['income','expense','savings','invest','jobsafety','onboarding'].includes(segments[0] as string);
    if (!user && (inTabs || inModals)) {
      router.replace('/auth');
    } else if (user && !inTabs && !inModals && segments[0] !== 'auth') {
      if (!onboardingComplete) router.replace('/onboarding');
      else router.replace('/(tabs)/home');
    }
  }, [user, segments, isReady, onboardingComplete]);

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
        </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
