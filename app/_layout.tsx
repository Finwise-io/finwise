import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { setMoneyFormat, setHideBalances } from '../src/domain/_shared/money';
import { patchTextScaling, setGlobalFontScale } from '../src/utils/fontScale';
import { onAuthChange, loadUserData, loadUserRoot, saveUserData, loadAssetRecordPart, loadAssetRecordMarker, commitAssetRecord, getPhoneId, onSignOutFlush } from '../src/services/firebase';
import { loadCloudRecord, recordOnSignIn, saveRecordGuarded, recordWorkAllowed, RecordCannotBeRead, RecordNotSettled, type CloudSeen } from '../src/services/sync/assetRecordCloud';
import { Colors } from '../src/utils/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { RecoveryCodeModal } from '../src/components/RecoveryCodeModal';
import { AppLockGate } from '../src/components/AppLockGate';
import { nextRoute } from '../src/navigation/routeGuard';
import { initCrashReporting, setUserScope } from '../src/services/crashReporter';
import { snaptradeConfigured } from '../src/services/sync/snaptradeClient';
import { runSnapTradeSync } from '../src/services/sync/snaptradeSync';

patchTextScaling();      // install the global font-scale hook once
initCrashReporting();    // F-6: install global error handler + Sentry (when configured) once

// Fields synced to Firestore (excludes auth user + ephemeral economic data)
const SYNC_FIELDS = [
  'onboardingComplete', 'selectedGoals', 'budgetFrequency', 'payFrequency',
  'budgetCategories', 'expenseTargetType', 'expenseTargetAmount',
  'expenseTargetPercent', 'savingsDistribution', 'retirementPlan',
  'incomes', 'expenses', 'savings', 'investments', 'goals', 'badges',
  'recurringIncomes', 'recurringExpenses', 'customCategories',
  'assetAccounts', 'liabilities', 'nwSeeded', 'snaptradeConnections', 'wrapperConfirmQueue', 'nwSetupChoice', 'allocatedByMonth', 'allocPromptSkipped', 'monthlySnapshots', 'nwDaily', 'retirementAssumptions', 'retirementScenarios', 'bigCosts', 'benchmarkReturns', 'estatePlan',
  'currency', 'locale',
  'xp', 'streak', 'lastCheckIn', 'monthlyBudgetTarget', 'hourlyRate',
  'jobRiskLevel', 'emergencyMonths', 'onboardingPaused', 'onboardingProfile',
  // the cash on hand typed on the Bill calendar, with its day (DEC-8371): kept on the phone, and now in the cloud copy too, so a
  // reinstall or a second phone reads what the person entered (workplan row 363, 2026-10-27, FX-CF-A)
  'billCalendarStart',
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
      {/* on the type scale: 16 sat between 15 and 17 and goes up (DEC-0059, ties round up) — FX-SHARED 2026-10-27 */}
      <Text style={{ fontSize: 17, color: Colors.primary, fontWeight: '600' }}>← Back</Text>
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const { user, setUser, onboardingComplete, onboardingPaused, loadFromCloud, resetAll, fontScale, displayMode, hideBalances, pendingRecoveryCode, setPendingRecoveryCode, securingAccount } = useStore() as any;
  setGlobalFontScale(fontScale ?? 1);   // keep the global text scale current
  // B-23: the app is USD-only until per-country tax/retirement functions exist. Force USD here so a
  // stale non-USD `currency` synced from an old cloud profile can never desync the formatter.
  setMoneyFormat('USD', 'en-US');
  // Hide-balances: sync the display-mask flag so EVERY money() across the app masks. The remount key
  // below includes hideBalances, so toggling re-runs all formatters live.
  setHideBalances(!!hideBalances);
  const router    = useRouter();
  const segments  = useSegments();
  const [isReady, setIsReady] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** What this phone last read or wrote of the cloud's record: its marker and the rows that marker names. A save goes ahead
   *  only where the cloud's marker still equals it (his "go", 2026-11-12: two phones at once lost rows 391–400). */
  const recordSeen = useRef<CloudSeen>({ marker: null, rowsInCloud: 0 });
  /** Whose cloud record has finished loading AND been read whole (the household's id or the person's own): no record save
   *  before it (outside check, 2026-11-12: a load over 2 s let the save fire with 0 rows counted and write from part 0). */
  const recordLoadedFor = useRef<string | null>(null);
  /** False where the phone's record and the cloud's part ways, or another phone saved since: nothing is uploaded. */
  const recordMayUpload = useRef(false);
  const recordLoading = useRef<string | null>(null);
  const recordSaving = useRef(false);
  /** Whose profile (accounts and the rest) has loaded from the cloud in this session. The record is not loaded, moved onto, or
   *  saved before it (outside check 2, 2026-11-12: B's profile load failed, and A's accounts went into B's record). */
  const profileLoadedFor = useRef<string | null>(null);
  /** Whose the phone's data was before this sign-in (the phone keeps its data on sign-out: activity and daily values live
   *  only here). Another person's accounts are never moved onto this person's record. */
  const phoneOwnerBeforeSignIn = useRef<string | null>(null);

  /** A fault on the record, said once (a retried load does not repeat the same words). */
  function recordFault(message: string) {
    const s: any = useStore.getState();
    const faults = s.assetRecordFaults ?? [];
    if (faults.length && faults[faults.length - 1].message === message) return;
    useStore.setState({ assetRecordFaults: [...faults, { at: new Date().toISOString(), where: 'cloud copy of the record', message }].slice(-50) } as any);
  }

  /** Bring the cloud's master record in for this owner, keeping the phone's only where it is this owner's own. */
  async function loadRecordFor(owner: string) {
    if (!recordWorkAllowed(currentUid.current, profileLoadedFor.current)) return;   // this person's profile first
    if (recordLoading.current === owner) return;
    recordLoading.current = owner;
    try {
      const s0: any = useStore.getState();
      if (s0.assetRecordOwner !== owner) {
        // the phone's record is another person's (or its owner was never noted): drop it before anything else is added
        useStore.setState({ assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], assetRecordOwner: owner } as any);
      }
      // the marker, every part, and the marker again: a part this phone cannot read, or a load that caught another phone
      // mid-save, fails here — and with it every save, until a later load reads the record whole
      const cloud = await loadCloudRecord(() => loadAssetRecordMarker(owner), (part) => loadAssetRecordPart(owner, part) as any);
      const s: any = useStore.getState();
      if (s.assetRecordOwner !== owner || !recordWorkAllowed(currentUid.current, profileLoadedFor.current)) return;   // someone else signed in meanwhile
      const start = recordOnSignIn({ record: s.assetRecord ?? [], owner: s.assetRecordOwner }, cloud.record, owner);
      useStore.setState({ assetRecord: start.record } as any);
      if (start.fault) recordFault(start.fault);
      recordSeen.current = { marker: cloud.marker, rowsInCloud: start.rowsInCloud };
      recordMayUpload.current = start.mayUpload;
      recordLoadedFor.current = owner;
      // what the phone held before the master record, moved onto it once — only after this person's profile and the cloud's
      // record are both in, so another person's accounts are never moved, and an account another phone moved is never moved twice
      const phoneWasOwnedBy = phoneOwnerBeforeSignIn.current;
      if (phoneWasOwnedBy == null || phoneWasOwnedBy === owner) (useStore.getState() as any).moveOldCopiesToRecordOnce?.();
      else recordFault('This phone held another person\u2019s accounts, so they were not moved onto this person\u2019s record.');
    } catch (e) {
      // a part that cannot be read, or a record caught mid-save: said once; the next change tries the load again.
      // Offline: the phone's record stands and nothing is saved.
      if (e instanceof RecordCannotBeRead || e instanceof RecordNotSettled) recordFault(e.message);
    } finally {
      if (recordLoading.current === owner) recordLoading.current = null;
    }
  }

  /** Save what the cloud's record lacks — only where the record has loaded whole for this owner, is this owner's, and this phone
   *  saved or read the cloud's copy last. Another phone's save in between: nothing is written, both copies stay, a fault says so. */
  async function saveRecordNow(uid: string) {
    if (recordSaving.current || currentUid.current !== uid || !recordWorkAllowed(uid, profileLoadedFor.current)) return;
    const now: any = useStore.getState();
    const owner = now.householdId ?? uid;
    if (recordLoadedFor.current !== owner) { await loadRecordFor(owner); return; }
    if (!recordMayUpload.current || now.assetRecordOwner !== owner) return;
    const record = now.assetRecord ?? [];
    if (record.length <= recordSeen.current.rowsInCloud) return;
    recordSaving.current = true;
    let saved = false;
    try {
      const out = await saveRecordGuarded(record, recordSeen.current, await getPhoneId(), commitAssetRecord(owner), new Date().toISOString());
      if (recordLoadedFor.current !== owner) return;
      recordSeen.current = out.seen;
      saved = out.status === 'saved';
      if (out.status === 'moved-on') { recordMayUpload.current = false; if (out.fault) recordFault(out.fault); }
    } catch (_) {
      // offline: the next save writes what the cloud lacks
    } finally {
      recordSaving.current = false;
    }
    // rows added while a save that WORKED ran go up now; after a failed one (offline, no key yet) the next change tries
    // again — never at once, which looped without end while the phone was offline (found 2026-11-12)
    const after: any = useStore.getState();
    if (saved && recordMayUpload.current && (after.assetRecord ?? []).length > recordSeen.current.rowsInCloud) saveRecordNow(uid);
  }

  /** The phone's profile goes to the cloud only where it is this person's: their profile loaded in this session, or the phone's
   *  data was last loaded for them and nobody signed out since (offline start). Never another person's, never a cleared phone's. */
  function profileIsTheirs(uid: string) {
    const s: any = useStore.getState();
    return profileLoadedFor.current === uid || (!!s.assetRecordOwner && s.assetRecordOwner === (s.householdId ?? uid));
  }

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
            const owner = root.householdId ?? firebaseUser.uid;
            // the phone's master record, held aside: the profile from the cloud replaces the phone's and drops it
            const before: any = useStore.getState();
            const phone = { assetRecord: before.assetRecord ?? [], assetRecordQuestions: before.assetRecordQuestions ?? {}, assetRecordFaults: before.assetRecordFaults ?? [] };
            const phoneIsTheirs = before.assetRecordOwner === owner;
            phoneOwnerBeforeSignIn.current = before.assetRecordOwner ?? null;
            const cloudData = root.householdId ? await loadUserData(root.householdId) : root.appState;
            if (cloudData) loadFromCloud(cloudData);
            else resetAll();   // brand-new account → clean slate so a prior account's local data can't leak
            profileLoadedFor.current = firebaseUser.uid;   // this person's profile is in: the record may now load and move
            // THE MASTER RECORD comes back from the cloud too (his "yes", 2026-11-11): the phone's record stays only where it
            // is this same person's — another person's never reaches this cloud (outside check, 2026-11-12)
            useStore.setState((phoneIsTheirs ? { ...phone, assetRecordOwner: owner } : { assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], assetRecordOwner: owner }) as any);
            await loadRecordFor(owner);
          } catch (_) {
            // Offline — local AsyncStorage cache is already loaded by Zustand persist
          }
        }
      } else {
        setUser(null);
        currentUid.current = null;
        // nothing of this person's record is saved after sign-out, and the next person's starts from their own cloud
        // and the phone's data belongs to nobody until the next person's profile has loaded
        recordLoadedFor.current = null; recordMayUpload.current = false; recordSeen.current = { marker: null, rowsInCloud: 0 };
        profileLoadedFor.current = null;
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
        if (currentUid.current !== uid || !profileIsTheirs(uid)) return;
        // Household members write to the shared doc so both partners stay in sync.
        saveUserData((state as any).householdId ?? uid, pickSyncFields(state as Record<string, any>)).catch(() => {
          // Silently ignore offline write failures — next successful sync catches up
        });
        // the master record: only the parts that changed are written (it only ever grows), and only under the rules above
        saveRecordNow(uid);
      }, 2000);
    });
    // a sign-out first sends what is waiting (the profile and the record), then the phone is cleared (SettingsScreen)
    onSignOutFlush(async () => {
      const uid = currentUid.current;
      if (!uid || !profileIsTheirs(uid)) return;
      if (syncTimer.current) { clearTimeout(syncTimer.current); syncTimer.current = null; }
      const s: any = useStore.getState();
      await Promise.all([saveUserData(s.householdId ?? uid, pickSyncFields(s)).catch(() => {}), saveRecordNow(uid)]);
    });
    return () => {
      unsub();
      onSignOutFlush(null);
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  // SnapTrade daily sync on app-open (design v2 §3): the Daily plan refreshes their side once a
  // day, so one debounced pull per open is the whole schedule. Failures are silent here — the
  // freshness labels and broken-connection line tell the user the truth either way.
  useEffect(() => {
    if (!isReady || !user || !snaptradeConfigured()) return;   // hydration first — never race it
    runSnapTradeSync().catch(() => {});
  }, [isReady, user]);

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

  // Loading state (founder question 2026-07-31: "grey bars — is that right?" — no): our numbers
  // live on the device, so hydration is a sub-second blink. The honest treatment is to HOLD the
  // screen for that blink — no skeleton bars, no $0 flash, and no flash of the first-run doors
  // for a user whose data simply hasn't decrypted yet.
  if (!isReady) return <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }} />;

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
          <Stack.Screen name="expense"    options={{ title: 'Add expense 🧾',     presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="savings"    options={{ title: 'Add savings 🏦',     presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="invest"     options={{ title: 'Log investment 📈',  presentation: 'modal', ...backBtn(() => router.back()) }} />
          <Stack.Screen name="jobsafety"  options={{ title: '', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="income-detail" options={{ title: 'Income 💵', headerShown: true, ...backBtn(() => router.back()) }} />
          {/* FCC: cash flow is now a bottom TAB (app/(tabs)/cashflow.tsx) — no root stack route. */}
          {/* DEC-0354, DEC-8839 (2026-10-27, FX-CF-C): Contribution room and the Stress test draw the MoneyKeel bar with ‹ Back
              themselves (drawings contribution-room v02, stresstest v03) — no navigator header above it, and the title once */}
          <Stack.Screen name="contribution-room" options={{ headerShown: false }} />
          <Stack.Screen name="stress-test" options={{ headerShown: false }} />
          <Stack.Screen name="big-costs" options={{ title: 'What big costs are coming?', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="ss-timing" options={{ title: 'When should I claim Social Security?', headerShown: true, ...backBtn(() => router.back()) }} />
          {/* the account page carries the app's own MoneyKeel top bar with "‹ Back" (approved
              performance mock v14), so the navigator's header would be a second bar above it */}
          <Stack.Screen name="account-detail" options={{ headerShown: false }} />
          {/* DEC-0354 (founder, 2026-09-14: "you did not have 'MoneyKeel' at the top which every other screen
              has"): the Net worth module's pushed screens draw the app's own bar with ‹ Back, as account-detail
              does — never the navigator's empty header, and never a raw route name ("holding-detail") as a title. */}
          {['bonds', 'other-investments', 'itemize', 'holding-detail', 'add-account',
            'bill-calendar', 'income-manager', 'monthly-income', 'base-pay', 'income-summary',
            // filing question: own bar, no header (IN2-13)
            'filing-status'].map((name) => (
            <Stack.Screen key={name} name={name} options={{ headerShown: false }} />
          ))}
          <Stack.Screen name="multi-goal" options={{ title: 'Afford it all?', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="first-run" options={{ title: 'Your setup', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="look-back" options={{ headerShown: false }} />   {/* DEC-0354: the screen draws the MoneyKeel bar itself */}
          <Stack.Screen name="what-if" options={{ title: 'What if I add more?', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="will-it-last" options={{ title: 'Will my money last?', headerShown: true, ...backBtn(() => router.back()) }} />
          <Stack.Screen name="import-holdings" options={{ title: 'Import holdings 📄', headerShown: true, presentation: 'modal', ...backBtn(() => router.back()) }} />
          {/* Founder UX review 2026-07-16: every pushed page needs a visible way back. These screens
              carry their own in-content headline, so the header is just the ← Back on the same
              background — never a duplicated or raw route-name title. */}
          {['credit', 'estate', 'education', 'insights',
            'insurance', 'performance',
            'required-withdrawals', 'retirement', 'roth', 'tax-organizer'].map((name) => (
            <Stack.Screen key={name} name={name} options={{ title: '', headerShown: true, ...backBtn(() => router.back()) }} />
          ))}
        </Stack>
        </AppLockGate>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
