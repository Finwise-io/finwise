import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore, setPhoneDataAside, giveBackSetAside, phoneHoldsPersonData, accountIdsOf } from '../src/store/useStore';
import { setAsideStorage } from '../src/store/secureStorage';
import { setMoneyFormat, setHideBalances } from '../src/domain/_shared/money';
import { patchTextScaling, setGlobalFontScale } from '../src/utils/fontScale';
import * as Fb from '../src/services/firebase';
import { onAuthChange, readUserProfile, loadUserRoot, saveUserData, loadAssetRecordPart, loadAssetRecordMarker, commitAssetRecord, getPhoneId, onSignOutFlush, onDataKeyReady } from '../src/services/firebase';
import { loadCloudRecord, recordOnSignInMerging, saveRecordMerging, recordWorkAllowed, salesAskedAgain, RecordCannotBeRead, RecordNotSettled, startRowTag, mergeNaming, questionsAfterMerge, rowsAfterMerge, type CloudSeen } from '../src/services/sync/assetRecordCloud';
import { SYNC_FIELDS, pickSyncFields, startSync, trackChanges, mergeProfile, settleSync, splitStamps, stableJson, appMayStillSave, UPDATE_TO_KEEP_SAVING, type ProfileSync } from '../src/services/sync/profileMerge';
import type { AssetRow, EventQuestion } from '../MoneyKeel/functions/networth-and-performance/asset-record';
import Constants from 'expo-constants';
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

// Fields synced to Firestore: SYNC_FIELDS and pickSyncFields live in src/services/sync/profileMerge.ts (R17, design v02 of the
// cloud copy of the master record, 2026-11-12), beside the item-by-item merge that uses them.

/** R8 + R11: the profile's sync for this data owner — the phone's, or null where it holds none for this owner yet. */
function syncFor(owner: string): ProfileSync | null {
  const ps: ProfileSync | null | undefined = (useStore.getState() as any).profileSync;
  return ps && ps.owner === owner ? ps : null;
}
/** R8a: this app's version as the cloud's minimum compares it: the version and the build number. */
function appVersion(): string {
  const c: any = Constants?.expoConfig ?? {};
  return [c.version ?? '0', c.ios?.buildNumber].filter((x) => x != null && x !== '').join('.');
}
/** The synced fields of a merged profile that differ from what the phone holds: what must change on the phone. */
function differingFields(profile: Record<string, any>): Record<string, any> {
  const now: any = useStore.getState();
  const patch: Record<string, any> = {};
  for (const k of SYNC_FIELDS) if (profile[k] !== undefined && stableJson(profile[k]) !== stableJson(now[k])) patch[k] = profile[k];
  return patch;
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
  function recordFault(message: string, where = 'cloud copy of the record') {
    const s: any = useStore.getState();
    const faults = s.assetRecordFaults ?? [];
    if (faults.length && faults[faults.length - 1].message === message) return;
    useStore.setState({ assetRecordFaults: [...faults, { at: new Date().toISOString(), where, message }].slice(-50) } as any);
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
      // R2: the phone's rows the cloud lacks are added after the cloud's (a clash of row names, part B, keeps the refusal)
      const start = recordOnSignInMerging({ record: s.assetRecord ?? [], owner: s.assetRecordOwner }, cloud.record, owner, await mergeNaming());
      useStore.setState({ assetRecord: start.record } as any);
      afterMergeNames(start);
      if (start.added.length && start.record.length > cloud.record.length) askSalesAgain(start.record, start.added);
      if (start.fault) recordFault(start.fault);
      recordSeen.current = { marker: cloud.marker, rowsInCloud: start.rowsInCloud };
      recordMayUpload.current = start.mayUpload;
      recordLoadedFor.current = owner;
      // what the phone held before the master record, moved onto it once — only after this person's profile and the cloud's
      // record are both in, so another person's accounts are never moved, and an account another phone moved is never moved twice
      const phoneWasOwnedBy = phoneOwnerBeforeSignIn.current;
      if (phoneWasOwnedBy == null || phoneWasOwnedBy === owner) (useStore.getState() as any).moveOldCopiesToRecordOnce?.();
      else recordFault('This phone held another person\u2019s accounts, so they were not moved onto this person\u2019s record.');
      await syncQuestions(owner);
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
    const recordSeenBefore = recordSeen.current.rowsInCloud;
    let saved = false;
    try {
      // R2 + R7: another phone saved since → read its copy, add this phone's rows after it, try again (at most 3 times)
      const out = await saveRecordMerging(record, recordSeen.current, await getPhoneId(), commitAssetRecord(owner), new Date().toISOString(),
        () => loadCloudRecord(() => loadAssetRecordMarker(owner), (part) => loadAssetRecordPart(owner, part) as any), undefined, await mergeNaming());
      if (recordLoadedFor.current !== owner) return;
      recordSeen.current = out.seen;
      saved = out.status === 'saved';
      if (out.merged) {
        // the merged record: the cloud's rows, then this phone's — plus any row added on this phone while the save ran
        const nowRec: AssetRow[] = (useStore.getState() as any).assetRecord ?? [];
        const sent = new Set(record.map((r: AssetRow) => r.rowId));
        // R3 + R4: a row added meanwhile that names a renamed or dropped row names it as the cloud now does
        const later = rowsAfterMerge(nowRec.filter((r) => !sent.has(r.rowId)), out.renamed);
        useStore.setState({ assetRecord: [...out.record, ...later] } as any);
        afterMergeNames(out);
        askSalesAgain(out.record, record.slice(recordSeenBefore));
      }
      if (out.status === 'clash') { recordMayUpload.current = false; if (out.fault) recordFault(out.fault); }
      if (out.status === 'moved-on' && out.fault) recordFault(out.fault);   // R7: the rows stay; the next change tries again
      if (saved) await syncQuestions(owner);
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

  /** After a merge: R1 a tag found on another phone's rows is replaced; R3 + R4 the questions name renamed and dropped rows as
   *  the record now does; R3 a copy dropped with other figures from the broker is asked about. */
  function afterMergeNames(out: { renamed?: Record<string, string>; asks?: EventQuestion[]; tagTaken?: boolean }) {
    const questions = questionsAfterMerge(out, (useStore.getState() as any).assetRecordQuestions ?? {}, new Date().toISOString());
    if (questions) useStore.setState({ assetRecordQuestions: questions } as any);
  }

  /** R6: after a merge, every sale on an account a merged row names is checked again — a sale naming a purchase the other
   *  phone removed is put to the account holder (MK-NW-F-256, the check a sync runs). */
  function askSalesAgain(record: AssetRow[], rows: AssetRow[]) {
    const questions = salesAskedAgain(record, rows, (useStore.getState() as any).assetRecordQuestions ?? {}, new Date().toISOString());
    if (questions) useStore.setState({ assetRecordQuestions: questions } as any);
  }

  /** R6a: the keys of the open questions this phone last read in the cloud's questions document. */
  const questionsSeen = useRef<{ owner: string; keys: string[] } | null>(null);
  /** R6a: open questions go to the cloud and come back from it, merged by key; answered on either phone, gone from both. */
  async function syncQuestions(owner: string) {
    const fn = (Fb as any).syncAssetRecordQuestions;
    if (typeof fn !== 'function' || !mayStillSave.current) return;
    try {
      const s: any = useStore.getState();
      if (s.assetRecordOwner !== owner) return;
      const seen = questionsSeen.current?.owner === owner ? questionsSeen.current.keys : [];
      const out = await fn(owner, s.assetRecordQuestions ?? {}, seen);
      if (!out || (useStore.getState() as any).assetRecordOwner !== owner) return;
      useStore.setState({ assetRecordQuestions: out.questions } as any);
      questionsSeen.current = { owner, keys: Object.keys(out.questions) };
    } catch { /* offline: the next save tries again */ }
  }

  /** R8a: false once the cloud's minimum app version is above this app's — nothing more is saved, and the fault says
   *  "Update MoneyKeel to keep saving" (the screen that shows it waits for its mock). */
  const mayStillSave = useRef(true);
  const minVersionChecked = useRef(false);
  async function checkMinVersion() {
    if (minVersionChecked.current) return;
    const fn = (Fb as any).loadMinAppVersion;
    if (typeof fn !== 'function') { minVersionChecked.current = true; return; }
    try {
      const min = await fn();
      minVersionChecked.current = true;
      if (!appMayStillSave(appVersion(), min)) { mayStillSave.current = false; recordFault(UPDATE_TO_KEEP_SAVING, 'app version'); }
    } catch { /* tried again at the next change */ }
  }

  /** R8: note the phone's changes to the profile as stamped unsaved changes (only for the data owner the phone's sync is for). */
  function trackProfile(owner: string) {
    const ps = syncFor(owner);
    if (!ps) return;
    const next = trackChanges(ps, pickSyncFields(useStore.getState() as any), new Date().toISOString());
    if (next !== ps) useStore.setState({ profileSync: next } as any);
  }

  /** R8 + R8a: save the profile in a profileRev transaction that merges this phone's unsaved changes with the cloud's copy;
   *  the merged profile comes back onto the phone (an item another phone changed later). */
  async function saveProfileNow(uid: string) {
    if (!mayStillSave.current) return;
    const now: any = useStore.getState();
    const owner = now.householdId ?? uid;
    if (!syncFor(owner)) useStore.setState({ profileSync: startSync(owner, pickSyncFields(now)) } as any);   // R18: starts empty
    trackProfile(owner);
    const ps = syncFor(owner)!;
    const out: any = await saveUserData(owner, pickSyncFields(useStore.getState() as any), { base: ps.base, pending: ps.pending });
    if (!out || out.status !== 'saved' || currentUid.current !== uid) return;
    const patch = differingFields(out.profile);
    const after = syncFor(owner);
    if (!after) return;
    const settled = settleSync(after, out.profile, out.used ?? {}, out.notes ?? []);
    useStore.setState({ ...patch, profileSync: settled } as any);
  }

  /** The phone's profile goes to the cloud only where it is this person's: their profile loaded in this session, or the phone's
   *  data was last loaded for them and nobody signed out since (offline start). Never another person's, never a cleared phone's. */
  function profileIsTheirs(uid: string) {
    const s: any = useStore.getState();
    if (profileUnreadableFor.current === uid) return false;   // never the phone's copy over a cloud profile not yet read
    return profileLoadedFor.current === uid || (!!s.assetRecordOwner && s.assetRecordOwner === (s.householdId ?? uid));
  }

  // R1: this phone's row tag, from the keychain ("this device only"), names every new row `<tag>.<count>`
  useEffect(() => { startRowTag(); }, []);

  const currentUid = useRef<string | null>(null);
  // Hydrate from the cloud ONCE per signed-in user. onAuthChange also fires on token refresh / app
  // resume; re-hydrating then would clobber unsynced local changes (e.g. a fresh "re-run setup"
  // reset, sending the user Home instead of onboarding). Track the uid we've already hydrated.
  const hydratedUid = useRef<string | null>(null);
  /** Whose cloud profile is there but this phone has no key for yet (a password reset, or a sign-in before the key is
   *  unwrapped). Never a new account (DEC-10749, his "go", 2026-11-12): the phone keeps its data, nothing is saved, and the
   *  profile loads once the key comes (the recovery code or the sign-in) or at the next change. */
  const profileUnreadableFor = useRef<string | null>(null);
  /** The last profile load failed offline: the next change tries it again (outside check 3, 2026-11-12: it ran once per
   *  session, so the record never saved until a restart). */
  const profileOffline = useRef(false);
  const profileLoading = useRef<string | null>(null);
  /** The key came while a profile load was on its way: if that load comes back unreadable, it is loaded again at once —
   *  the recovery code changes nothing in the store, so no change would ever try it again (DEC-10813, 2026-11-12). */
  const keyCameDuringLoad = useRef<string | null>(null);

  /** A different person signs in (DEC-10813): before their profile loads, the phone's data is set aside for the person it
   *  is noted as (a uid; the signed-in user saved on the phone, for a phone from before this build), and every per-person
   *  field is cleared. A phone holding nothing is noted as this person's at once. A phone whose owner was never noted
   *  waits for this person's profile: their accounts say whether it is theirs. */
  async function setAsideIfAnothers(uid: string) {
    const s: any = useStore.getState();
    const noted: string | null = s.phoneDataOwner ?? s.user?.uid ?? null;
    if (!phoneHoldsPersonData(s)) { s.notePhoneOwner(uid); return; }
    if (noted === uid) {
      s.notePhoneOwner(uid);
      // R11: a pre-update phone (its data owner never noted) is noted as the signed-in person's at once, so its offline
      // typing is saved, not replaced
      if (!s.assetRecordOwner) useStore.setState({ assetRecordOwner: s.householdId ?? uid } as any);
      return;
    }
    // never noted (a phone from before this build, signed out): set aside unnamed at once, so nobody sees it before their
    // profile loads; it comes back to the person whose cloud accounts share an id with it (outside check 5, L8)
    await setPhoneDataAside(noted);
    (useStore.getState() as any).notePhoneOwner(uid);
  }

  /** Load this person's profile from the cloud. On sign-in (`retry` false) the cloud's copy replaces the phone's. On a retry
   *  after an offline start where the phone's profile was already theirs and saving, the phone's copy stands — it holds what
   *  they typed since, and it is what the cloud was sent. A profile this phone cannot read is never taken as a new account. */
  async function loadProfileFor(uid: string, retry: boolean) {
    if (profileLoading.current === uid || profileLoadedFor.current === uid) return;
    profileLoading.current = uid;
    const keepPhone = retry && profileOffline.current && profileIsTheirs(uid);
    let unreadable = false;
    try {
      const root = await loadUserRoot(uid);
      if (currentUid.current !== uid) return;   // someone else signed in meanwhile
      const s0: any = useStore.getState();
      if ((s0.householdId ?? null) !== (root.householdId ?? null)) s0.setHouseholdId?.(root.householdId);
      const owner = root.householdId ?? uid;
      // R11 + R16: the data owner changed (joining or leaving a household): the phone's data is set aside under the old owner
      // and the new owner's copy loads, never merged. A household moved to this member by the owner's delete is the same data.
      const sOwn: any = useStore.getState();
      const oldOwner: string | null = sOwn.assetRecordOwner ?? null;
      if (oldOwner && oldOwner !== owner && sOwn.phoneDataOwner === uid) {
        if ((root as any).movedFrom && (root as any).movedFrom === oldOwner) {
          // R16 + R11 (DEC-10813): what this member set aside on joining stays aside — the household's data now carries the
          // member's own id, and their pre-joining data must never be given back into it (the server set its cloud copy
          // aside the same way, users/{member}/setAside/own)
          for (const a of await setAsideStorage.list()) if (a.owner === owner) {
            await setAsideStorage.put(`${owner}#before-joining-${oldOwner}`, a.at || new Date().toISOString(), a.data);
            await setAsideStorage.remove(a.key);
          }
          if (currentUid.current !== uid) return;
          const ps = sOwn.profileSync;
          useStore.setState({ assetRecordOwner: owner, ...(ps ? { profileSync: { ...ps, owner } } : {}) } as any);
        } else if (phoneHoldsPersonData(sOwn)) {
          await setPhoneDataAside(oldOwner);
          if (currentUid.current !== uid) return;
          (useStore.getState() as any).notePhoneOwner(uid);
          useStore.setState({ assetRecordOwner: owner, householdId: root.householdId ?? null } as any);
        }
      }
      const cloud = root.householdId ? await readUserProfile(root.householdId) : { appState: root.appState, appStateUnreadable: root.appStateUnreadable };
      if (currentUid.current !== uid) return;
      profileOffline.current = false;
      if (cloud.appStateUnreadable) {
        // there, but not readable yet: the phone keeps everything, and nothing is saved over the cloud's copy
        profileUnreadableFor.current = uid;
        unreadable = true;
        return;
      }
      profileUnreadableFor.current = null;
      // whose the phone's data is (DEC-10813): never noted, and this person's cloud accounts share no id with the phone's —
      // another person's, set aside unnamed; their own cloud profile is then the whole of what loads
      const s1: any = useStore.getState();
      if (s1.phoneDataOwner == null && phoneHoldsPersonData(s1)) {
        const cloudIds = new Set(accountIdsOf(cloud.appState?.assetAccounts));
        const shared = accountIdsOf(s1.assetAccounts).some((id) => cloudIds.has(id));
        if (!shared) await setPhoneDataAside(null);
        if (currentUid.current !== uid) return;
      }
      (useStore.getState() as any).notePhoneOwner(uid);
      // what only the phone held of this person comes back from their set-aside, under the cloud's synced fields
      // — a person brand new in the cloud gets their own back too, by uid (outside check 5, L3)
      let givenBack = 0;
      let unreadableAsides: string[] = [];
      if (!keepPhone) {
        // given back by data owner (R11): a member's own set-aside never comes back into the household's data
        const back = await giveBackSetAside(owner, cloud.appState, SYNC_FIELDS);
        givenBack = back.given; unreadableAsides = back.unreadable;
        if (currentUid.current !== uid) return;
      }
      // the phone's master record, held aside: the profile from the cloud replaces the phone's and drops it
      const before: any = useStore.getState();
      const phone = { assetRecord: before.assetRecord ?? [], assetRecordQuestions: before.assetRecordQuestions ?? {}, assetRecordFaults: before.assetRecordFaults ?? [] };
      const phoneIsTheirs = before.assetRecordOwner === owner;
      phoneOwnerBeforeSignIn.current = before.assetRecordOwner ?? null;
      // a retry that finds nothing in the cloud keeps what was typed in this session, unless the phone's data is another person's
      const phoneIsAnothers = before.assetRecordOwner != null && before.assetRecordOwner !== owner;
      // R8 + R11: each start merges — the cloud's profile, with this phone's unsaved changes for this same data owner on top
      const { profile: cloudProfile, stamps: cloudStamps } = splitStamps(cloud.appState);
      const ps = phoneIsAnothers ? null : syncFor(owner);
      if (!keepPhone) {
        if (cloudProfile && ps && Object.keys(ps.pending).length) {
          const m = mergeProfile(cloudProfile, cloudStamps, ps, new Date().toISOString());
          loadFromCloud(m.profile);
          useStore.setState({ profileSync: { ...ps, base: startSync(owner, cloudProfile).base, pending: Object.fromEntries(m.phoneWon.filter((k) => ps.pending[k]).map((k) => [k, ps.pending[k]])), notes: [...ps.notes, ...m.notes].slice(-50) } } as any);
        } else if (cloudProfile) {
          loadFromCloud(cloudProfile);
          useStore.setState({ profileSync: startSync(owner, cloudProfile) } as any);
        } else if ((!retry || phoneIsAnothers) && givenBack === 0) resetAll();   // brand-new account (nothing in the cloud) → clean slate so a prior account's local data can't leak
      } else if (cloudProfile && ps && Object.keys(ps.pending).length) {
        // back online after an offline start: the cloud's copy, with what was typed here on top (never replaced)
        const m = mergeProfile(cloudProfile, cloudStamps, ps, new Date().toISOString());
        useStore.setState({ ...differingFields(m.profile) } as any);
        useStore.setState({ profileSync: { ...ps, base: startSync(owner, cloudProfile).base, pending: Object.fromEntries(m.phoneWon.filter((k) => ps.pending[k]).map((k) => [k, ps.pending[k]])), notes: [...ps.notes, ...m.notes].slice(-50) } } as any);
      } else if (!ps) {
        // an offline start with no list of unsaved changes: what the phone holds stands, and its differences from the cloud's
        // copy are its unsaved changes (they were typed here)
        useStore.setState({ profileSync: startSync(owner, cloudProfile ?? {}) } as any);
      }
      profileLoadedFor.current = uid;   // this person's profile is in: the record may now load and move
      // THE MASTER RECORD comes back from the cloud too (his "yes", 2026-11-11): the phone's record stays only where it
      // is this same person's — another person's never reaches this cloud (outside check, 2026-11-12)
      useStore.setState((phoneIsTheirs ? { ...phone, assetRecordOwner: owner } : { assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], assetRecordOwner: owner }) as any);
      for (const _ of unreadableAsides) recordFault('Data set aside on this phone for this person cannot be read here, so it was kept and not given back.', 'data set aside on this phone');
      await loadRecordFor(owner);
    } catch (_) {
      // Offline — local AsyncStorage cache is already loaded by Zustand persist; the next change tries again
      if (currentUid.current === uid) profileOffline.current = true;
    } finally {
      if (profileLoading.current === uid) profileLoading.current = null;
      if (keyCameDuringLoad.current === uid) {
        keyCameDuringLoad.current = null;
        if (unreadable && currentUid.current === uid && profileLoadedFor.current !== uid) await loadProfileFor(uid, true);
      }
    }
  }

  // Auth listener + Firestore hydration on login
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser: any) => {
      if (firebaseUser) {
        // the phone's saved data is read in before anything is decided about whose it is
        const ps: any = (useStore as any).persist;
        if (ps?.hasHydrated && !ps.hasHydrated()) await new Promise<void>((done) => { const off = ps.onFinishHydration(() => { off?.(); done(); }); });
        // a different person: the last person's data is set aside before this person's profile loads (DEC-10813)
        if (hydratedUid.current !== firebaseUser.uid) await setAsideIfAnothers(firebaseUser.uid);
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
          await loadProfileFor(firebaseUser.uid, false);
        }
      } else {
        setUser(null);
        currentUid.current = null;
        // nothing of this person's record is saved after sign-out, and the next person's starts from their own cloud
        // and the phone's data belongs to nobody until the next person's profile has loaded
        recordLoadedFor.current = null; recordMayUpload.current = false; recordSeen.current = { marker: null, rowsInCloud: 0 };
        profileLoadedFor.current = null; profileUnreadableFor.current = null; profileOffline.current = false;
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
      syncTimer.current = setTimeout(async () => {
        if (currentUid.current !== uid) return;
        // a profile load that failed (offline) or could not be read yet is tried again here — at a change, never in a loop
        // R11: offline typing is stamped first, so the cloud's copy coming in below never replaces it
        { const s: any = useStore.getState(); if (s.phoneDataOwner === uid && s.assetRecordOwner) trackProfile(s.assetRecordOwner); }
        if (profileLoadedFor.current !== uid) await loadProfileFor(uid, true);
        if (currentUid.current !== uid || !profileIsTheirs(uid)) return;
        await checkMinVersion();
        if (!mayStillSave.current) return;   // R8a: an app below the cloud's minimum version saves nothing
        // Household members write to the shared doc so both partners stay in sync.
        saveProfileNow(uid).catch(() => {
          // offline: the unsaved changes stay on the phone, stamped, and the next change saves them (R11)
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
      if (!mayStillSave.current) return;
      await Promise.all([saveProfileNow(uid).catch(() => {}), saveRecordNow(uid)]);
    });
    // the key to the person's data has come (the recovery code, or a sign-in that unwrapped it): a profile this phone
    // could not read loads now, as a normal sign-in would
    onDataKeyReady(async () => {
      const uid = currentUid.current;
      if (!uid || profileLoadedFor.current === uid) return;
      if (profileLoading.current === uid) { keyCameDuringLoad.current = uid; return; }   // loaded again if that load is unreadable
      await loadProfileFor(uid, true);
    });
    return () => {
      unsub();
      onSignOutFlush(null);
      onDataKeyReady(null);
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
