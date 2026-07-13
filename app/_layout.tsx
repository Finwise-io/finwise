import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { setMoneyFormat, setHideBalances } from '../src/domain/_shared/money';
import { patchTextScaling, setGlobalFontScale } from '../src/utils/fontScale';
import { onAuthChange, loadUserData, loadUserRoot, saveUserData } from '../src/services/firebase';
import { Colors } from '../src/utils/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { RecoveryCodeModal } from '../src/components/RecoveryCodeModal';
import { AppLockGate } from '../src/components/AppLockGate';
import { nextRoute } from '../src/navigation/routeGuard';
import { initCrashReporting, setUserScope } from '../src/services/crashReporter';

patchTextScaling();      // install the global font-scale hook once
initCrashReporting();    // F-6: install global error handler + Sentry (when configured) once

// Fields synced to Firestore (excludes auth user + ephemeral economic data)
const SYNC_FIELDS = [
  'onboardingComplete', 'selectedGoals', 'budgetFrequency', 'payFrequency',
  'budgetCategories', 'expenseTargetType', 'expenseTargetAmount',
  'expenseTargetPercent', 'savingsDistribution', 'retirementPlan',
  'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'customCategories',
  'assetAccounts', 'liabilities', 'nwSeeded', 'nwSetupChoice', 'allocatedByMonth', 'allocPromptSkipped', 'monthlySnapshots', 'retirementAssumptions', 'retirementScenarios', 'benchmarkReturns', 'estatePlan',
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
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel="Back"
      accessibilityHint="Returns to the previous screen"
    >
      <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: '600' }}>← Back</Text>
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const { user, setUser, onboardingComplete, onboardingPaused, loadFromCloud, resetAll, fontScale, displayMode, hideBalances, pendingRecoveryCode, setPendingRecoveryCode, securingAccount } = useStore() as any;
  setGlobalFontScale(fontScale ?? 1);   // keep the global text scale current
  // B-23: the app is USD-only until per-country tax/retirement engines exist. Force USD here so a
  // stale non-USD `currency` synced from an old cloud profile can never desync the formatter.
  setMoneyFormat('USD', 'en-US');
  // Hide-balances: sync the display-mask flag so EVERY money() across the app masks. The remount key
  // below includes hideBalances, so toggling re-runs all formatters live.
  setHideBalances(!!hideBalances);
  const router    = useRouter();
  const segments  = useSegments();
  const [isReady, setIsReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUid = useRef<string | null>(null);
  // Hydrate from the cloud ONCE per signed-in user. onAuthChange also fires on token refresh / app
  // resume; re-hydrating then would clobber unsynced local changes (e.g. a fresh "re-run setup"
  // reset, sending the user Home instead of onboarding). Track the uid we've already hydrated.
  const hydratedUid = useRef<string | null>(null);

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
        setUserScope(firebaseUser.uid);   // F-6: tag crash reports with the uid (no other PII)

        // Hydrate local store from Firestore ONCE per user (best-effort — fail gracefully offline).
        // Skip on token-refresh/resume re-fires so we don't overwrite unsynced local changes.
        // Household members read the SHARED doc (users/{householdId}); membership is
        // recorded top-level on their own doc so it survives a fresh install.
        if (hydratedUid.current !== firebaseUser.uid) {
          hydratedUid.current = firebaseUser.uid;
          try {
            const root = await loadUserRoot(firebaseUser.uid);
            useStore.getState().setHouseholdId?.(root.householdId);
            const cloudData = root.householdId ? await loadUserData(root.householdId) : root.appState;
            if (cloudData) loadFromCloud(cloudData);
            else resetAll();   // brand-new account → clean slate so a prior account's local data can't leak
          } catch (_) {
            // Offline — local AsyncStorage cache is already loaded by Zustand persist
          }
        }
      } else {
        setUser(null);
        currentUid.current = null;
        hydratedUid.current = null;   // allow a re-hydrate if a different user signs in next
        setUserScope(null);   // F-6: clear the crash-report user scope on logout
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
        // Household members write to the shared doc so both partners stay in sync.
        saveUserData((state as any).householdId ?? uid, pickSyncFields(state as Record<string, any>)).catch(() => {
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
  // L-4: account creation lives ONLY on AuthScreen. Every unauthenticated user is sent there
  // first (signup or login); onboarding is questions-only and always runs AFTER auth.
  useEffect(() => {
    if (!isReady) return;
    const dest = nextRoute({
      user: !!user,
      onboardingComplete: !!onboardingComplete,
      onboardingPaused: !!onboardingPaused,
      segment: (segments[0] as string) ?? '',
    });
    if (dest) router.replace(dest as any);
  }, [user, segments, isReady, onboardingComplete, onboardingPaused]);

  const backBtn = (onPress: () => void) => ({ headerLeft: () => <BackButton onPress={onPress} /> });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <AppLockGate>
        <StatusBar style="dark" />
        {/* One-time "save your recovery code" — rendered at the root so it survives the post-signup
            navigation that was unmounting it when shown from the auth/onboarding screen. */}
        <RecoveryCodeModal
          visible={!!pendingRecoveryCode}
          code={pendingRecoveryCode ?? ''}
          securing={securingAccount}
          onDone={() => setPendingRecoveryCode?.(null)}
        />
        <Stack
          key={`fs-${fontScale ?? 1}-${displayMode ?? 'simple'}-${hideBalances ? 'h' : 's'}`}   /* remount the tree when text size / display mode / hide-balances changes so it applies everywhere live */
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
          {/* FCC: cash flow is now a bottom TAB (app/(tabs)/cashflow.tsx) — no root stack route. */}
          <Stack.Screen name="contribution-room" options={{ title: 'Contribution room 💼', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="worth-a-look" options={{ title: 'Worth a look', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="idle-cash" options={{ title: 'Your idle cash', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="ss-timing" options={{ title: 'Claim Social Security', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="import-holdings" options={{ title: 'Import holdings 📄', headerShown: true, presentation: 'modal', ...backBtn(() => router.back()) }} />
        </Stack>
        </AppLockGate>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
