import {
  getAuth,
  initializeAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence ships in firebase/auth's React Native build but is
// missing from the published TS types — access it via a cast.
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: unknown) => unknown)
  | undefined;
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  deleteField,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { sameMarker, UNREADABLE, mergeQuestions, type CloudMarker, type CommitRecord, type PartRead, type QuestionsDoc } from './sync/assetRecordCloud';
import { mergeProfile, splitStamps, withStamps, type ProfileSync, type ProfileStamps, type MergeNote, type PendingChange } from './sync/profileMerge';
import { firebaseApp } from './firebaseConfig';
import {
  cacheDataKey, clearDataKey, getDataKey, encryptForSync, decryptFromSync,
  generateDataKey, generateRecoveryCode, makeEnvelope, unwrapWithPassword, unwrapWithRecovery,
  rewrapPassword, rewrapRecovery, type KeyEnvelope,
  keyIdOf, keyCodeProof, keyCodeCheck, generateKeyCode, wrapWithKeyCode, unwrapWithKeyCode, wrapWithReturnCode, unwrapWithReturnCode,
} from './dataCrypto';

// React Native: getAuth() at module load throws "Component auth has not been
// registered yet" under Hermes/lazy bundling. initializeAuth registers the auth
// component and (with AsyncStorage) persists the session across app restarts.
// Fall back to getAuth if auth was already initialized (e.g. Fast Refresh).
let auth: ReturnType<typeof getAuth>;
try {
  // DESKTOP Phase 1: on web the RN persistence helper doesn't exist — use the browser's own
  // local persistence so sign-in survives a refresh. Native path unchanged.
  const { Platform } = require('react-native');
  auth = initializeAuth(
    firebaseApp,
    Platform.OS === 'web'
      ? { persistence: (FirebaseAuth as any).browserLocalPersistence }
      : getReactNativePersistence
        ? { persistence: getReactNativePersistence(AsyncStorage) as any }
        : undefined,
  );
} catch {
  auth = getAuth(firebaseApp);
}
export const db = getFirestore(firebaseApp);

// Returns the new user AND a one-time recovery code the caller MUST show the user to save.
/* ─ MK-XS-F-060 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * registerUser
 *
 * Answers ..... Returns the new user AND a one-time recovery code the caller MUST show the user to save.
 *
 * Formula .....
 *     cred = await create user with email and password(auth, email, password)
 *     dek = generate data key()
 *     recovery code = generate recovery code()
 *     key envelope = make envelope(dek, cred.user.uid, password, recovery code)
 *     the answer:
 *     user = cred.user
 *     recovery code = recovery code
 *
 * Called by ... MK-XS-F-066 loginUser
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-060
 * Changed ..... 2026-06-22 (b843765)
 */
export async function registerUser(email: string, password: string, name: string, onCodeReady?: (code: string) => void) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Generate the data key + recovery code and surface the code IMMEDIATELY — BEFORE the slow
  // PBKDF2 envelope-wrapping (~100k iters) and the Firestore write. Creating the account fires the
  // auth listener, which routes into onboarding; without this, the recovery code wasn't set until
  // those slow steps finished (a few seconds later), so it appeared AFTER the first question.
  const dek = generateDataKey();
  const recoveryCode = generateRecoveryCode();
  onCodeReady?.(recoveryCode);
  await cacheDataKey(dek);   // cache locally NOW so encryption works immediately, independent of the slow steps below
  await updateProfile(cred.user, { displayName: name });
  try { await sendEmailVerification(cred.user); } catch { /* non-blocking — they can resend later */ }
  // Let the recovery-code modal actually PAINT (with its "Securing…" spinner) before the synchronous
  // PBKDF2 wrapping freezes the JS thread for several seconds — otherwise the spinner never shows.
  await new Promise((r) => setTimeout(r, 0));
  // Store the wrapped envelope (never the secrets themselves).
  const keyEnvelope = makeEnvelope(dek, cred.user.uid, password, recoveryCode);
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    name,
    createdAt: serverTimestamp(),
    keyEnvelope,
  });
  return { user: cred.user, recoveryCode };   // dek already cached above
}

/** Resend the verification email to the signed-in user. */
/* ─ MK-XS-F-061 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * resendVerification
 *
 * Answers ..... Resend the verification email to the signed-in user.
 *
 * Formula .....
 *     sends the verification e-mail again to the signed-in person
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-061
 * Changed ..... 2026-06-06 (4a8a6e0)
 */
export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}
/** Re-check verification status from the server (call after the user clicks the email link). */
/* ─ MK-XS-F-062 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * refreshEmailVerified
 *
 * Answers ..... Re-check verification status from the server (call after the user clicks the email link).
 *
 * Formula .....
 *     false   when auth.current user is missing
 *     !!auth.current user.email verified
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-062
 * Changed ..... 2026-06-20 (ccb2447)
 */
export async function refreshEmailVerified(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return !!auth.currentUser.emailVerified;
}
/* ─ MK-XS-F-063 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isEmailVerified
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     !!auth.current user.email verified
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-063
 * Changed ..... 2026-07-18 (0dc9061)
 */
export function isEmailVerified(): boolean {
  return !!auth.currentUser?.emailVerified;
}

/** The email of the account currently signed in to Firebase — the authoritative identity that
 *  account-level actions (delete, reauth) operate on. Use this, not a possibly-stale store value. */
/** The signed-in user's Firebase ID token — how server relays (AI proxy, SnapTrade) verify the caller. */
/* ─ MK-XS-F-064 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * currentIdToken
 *
 * Answers ..... The email of the account currently signed in to Firebase — the authoritative identity that account-level actions (delete, reauth) operate on.
 *
 * Formula .....
 *     the answer = the signed-in person's identity token, or nothing
 *
 * Called by ... MK-XS-F-147 call
 *
 * Reaches ..... 637 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 619 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-064
 * Changed ..... 2026-07-18 (0dc9061)
 */
export async function currentIdToken(): Promise<string | null> {
  try { return auth.currentUser ? await auth.currentUser.getIdToken() : null; } catch { return null; }
}

/* ─ MK-XS-F-065 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * currentUserEmail
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     auth.current user.email (or nothing when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-065
 * Changed ..... 2026-07-24 (8f03c59)
 */
export function currentUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

// Returns the user plus the unlock status:
//  • needsRecovery=true → the password can't open the data (it was reset); prompt for the recovery code.
//  • recoveryCode set    → a legacy account had no envelope; we created one — show the code to save.
/* ─ MK-XS-F-066 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loginUser
 *
 * Answers ..... Returns the user plus the unlock status: • needsRecovery=true → the password can't open the data (it was reset); prompt for the recovery code.
 *
 * Formula .....
 *     cred = await sign in with email and password(auth, email, password)
 *     uid = cred.user.uid
 *     snap = await get doc(doc(db, 'users', uid))
 *     env = (snap.data() as any).key envelope   if snap.exists()
 *     undefined   otherwise
 *     dek = unwrap with password(env, uid, password)
 *     hh env = (snap.data() as any).household key envelope   if (snap.data() as any).household id
 *     undefined   otherwise
 *     hh key = unwrap with password(hh env, uid, password)   if hh env
 *     nothing   otherwise
 *     the answer:
 *     user = cred.user
 *     needs recovery = true
 *     dek = generate data key()
 *     recovery code = generate recovery code()
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-066
 * Changed ..... 2026-07-24 (8f03c59)
 */
export async function loginUser(email: string, password: string, onCodeReady?: (code: string) => void): Promise<{ user: any; needsRecovery: boolean; recoveryCode?: string }> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const snap = await getDoc(doc(db, 'users', uid));
  const env: KeyEnvelope | undefined = snap.exists() ? (snap.data() as any)?.keyEnvelope : undefined;

  if (env) {
    const dek = unwrapWithPassword(env, uid, password);
    if (dek) {
      // R13: a member reads and writes the household's copy, locked by the household key they re-locked under their own password
      const hhEnv: KeyEnvelope | undefined = (snap.data() as any)?.householdId ? (snap.data() as any)?.householdKeyEnvelope : undefined;
      const hhKey = hhEnv ? unwrapWithPassword(hhEnv, uid, password) : null;
      await cacheDataKey(hhKey ?? dek); await dataKeyIsReady(); return { user: cred.user, needsRecovery: false };
    }
    // Password is valid for Firebase but can't open the data → it was reset. Need the recovery code.
    return { user: cred.user, needsRecovery: true };
  }

  // No envelope yet (account predates encryption) → set one up now and surface the recovery code.
  // Surface it IMMEDIATELY (same pattern as registerUser): the PBKDF2 wrapping below is deliberately
  // slow, and without this the user sat ~30 silent seconds before the code appeared (B45 finding).
  const dek = generateDataKey();
  const recoveryCode = generateRecoveryCode();
  onCodeReady?.(recoveryCode);
  await cacheDataKey(dek);
  // Let the recovery-code sheet PAINT its "Securing…" spinner before the synchronous key-wrapping
  // freezes the JS thread (same paint-yield registerUser needs).
  await new Promise((r) => setTimeout(r, 0));
  await setDoc(doc(db, 'users', uid), { keyEnvelope: makeEnvelope(dek, uid, password, recoveryCode) }, { merge: true });
  return { user: cred.user, needsRecovery: false, recoveryCode };
}

// After a password reset, restore data access with the recovery code, then re-lock the data under the
// NEW password. Throws if the code is wrong. `newPassword` is the password they just signed in with.
/* ─ MK-XS-F-067 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * restoreWithRecoveryCode
 *
 * Answers ..... After a password reset, restore data access with the recovery code, then re-lock the data under the NEW password.
 *
 * Formula .....
 *     u = auth.current user
 *     snap = await get doc(doc(db, 'users', uid))
 *     env = (snap.data() as any).key envelope   if snap.exists()
 *     undefined   otherwise
 *     dek = unwrap with recovery(env, uid, recovery code)
 *     hh env = (snap.data() as any).household key envelope   if (snap.data() as any).household id
 *     undefined   otherwise
 *     hh key = unwrap with recovery(hh env, uid, recovery code)   if hh env
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-067
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function restoreWithRecoveryCode(recoveryCode: string, newPassword: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('You are not signed in.');
  const snap = await getDoc(doc(db, 'users', u.uid));
  const env: KeyEnvelope | undefined = snap.exists() ? (snap.data() as any)?.keyEnvelope : undefined;
  if (!env) throw new Error('No recovery information was found for this account.');
  const dek = unwrapWithRecovery(env, u.uid, recoveryCode);
  if (!dek) throw new Error('That recovery code is incorrect.');
  // R14: a member's recovery code unlocks both keys — their own and the household's
  const hhEnv: KeyEnvelope | undefined = (snap.data() as any)?.householdId ? (snap.data() as any)?.householdKeyEnvelope : undefined;
  const hhKey = hhEnv ? unwrapWithRecovery(hhEnv, u.uid, recoveryCode) : null;
  await setDoc(doc(db, 'users', u.uid), {
    keyEnvelope: rewrapPassword(env, dek, u.uid, newPassword),
    ...(hhEnv && hhKey ? { householdKeyEnvelope: rewrapPassword(hhEnv, hhKey, u.uid, newPassword) } : {}),
  }, { merge: true });
  await cacheDataKey(hhKey ?? dek);
  await dataKeyIsReady();   // the profile this phone could not read loads now, as a normal sign-in would (DEC-10749)
}

// Issue a NEW recovery code for the signed-in user (the old one stops working). Requires the data to
// be unlocked (key cached). Returns the new code to show once.
/* ─ MK-XS-F-068 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * regenerateRecoveryCode
 *
 * Answers ..... Issue a NEW recovery code for the signed-in user (the old one stops working).
 *
 * Formula .....
 *     u = auth.current user
 *     dek = await get data key()
 *     snap = await get doc(doc(db, 'users', uid))
 *     env = snap.exists() and (snap.data() as any).key envelope (or p = ''
 *     r = '' when missing or zero)
 *     recovery code = generate recovery code()
 *     the answer = recovery code
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-068
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function regenerateRecoveryCode(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('You are not signed in.');
  const dek = await getDataKey();
  if (!dek) throw new Error('Unlock the app first, then try again.');
  const snap = await getDoc(doc(db, 'users', u.uid));
  const env: KeyEnvelope = (snap.exists() && (snap.data() as any)?.keyEnvelope) || { p: '', r: '' };
  const recoveryCode = generateRecoveryCode();
  await setDoc(doc(db, 'users', u.uid), { keyEnvelope: rewrapRecovery(env, dek, u.uid, recoveryCode) }, { merge: true });
  return recoveryCode;
}

/* ─ MK-XS-F-069 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * logoutUser
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     clears the data key, then signs out
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-069
 * Changed ..... 2026-06-19 (d42df82)
 */
export async function logoutUser() {
  await clearDataKey();   // forget the decryption key so the next user can't read this one's data
  await signOut(auth);
}

/* ─ MK-XS-F-070 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * resetPassword
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     sends a password-reset e-mail to the address
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-070
 * Changed ..... 2026-06-19 (2b343ff)
 */
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

/* ─ MK-XS-F-071 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * onAuthChange
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     on auth state changed(auth, callback)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-071
 * Changed ..... 2026-06-19 (2b343ff)
 */
export function onAuthChange(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}

// Permanently delete the signed-in user's account (App Store Guideline 5.1.1(v)).
// Re-authenticates first (deletion is sensitive and Firebase requires a recent login), then removes
// the Firestore data, then the Auth user — in that order so we never leave an orphaned auth account
// with no data. `password` is required because the app uses email/password auth.
/* ─ MK-XS-F-072 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * deleteAccount
 *
 * Answers ..... Permanently delete the signed-in user's account (App Store Guideline 5.1.1(v)).
 *
 * Formula .....
 *     u = auth.current user
 *     cred = email auth provider.credential(email, password)
 *     url = delete account url()
 *     token = await get id token()
 *     res = await fetch(url, { method: 'POST', headers: { 'content − Type': 'application ÷ json', authorization: `bearer ${token}` }, body: '{}' })
 *     root = await load user root(uid)
 *
 * Called by ... MK-XS-F-275 loadMinAppVersion
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-275 loadMinAppVersion
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-072
 * Changed ..... 2026-06-19 (2b343ff)
 */
export async function deleteAccount(password: string): Promise<void> {
  const u = auth.currentUser;
  if (!u || !u.email) throw new Error('You are not signed in.');

  // 1) Re-authenticate (throws auth/wrong-password, auth/too-many-requests, etc.).
  const cred = EmailAuthProvider.credential(u.email, password);
  await reauthenticateWithCredential(u, cred);

  // 2) R16 (design v02, 2026-11-12): delete account runs on the server — solo: everything under users/{self}; a member: their
  //    own document and member document; an owner with a member: the household moves to the member first. Where the server
  //    function's address is not set yet (before it is deployed), the phone removes what the rules let it, as before.
  const url = deleteAccountUrl();
  if (url) {
    const token = await u.getIdToken();
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
    if (!res.ok) throw new Error('Your account could not be deleted right now. Please try again.');
    await deleteUser(u);
    await clearDataKey();
    return;
  }
  try {
    const root = await loadUserRoot(u.uid);
    if (root.householdId && root.householdId !== u.uid) {
      await deleteDoc(doc(db, 'households', root.householdId, 'members', u.uid));
    }
  } catch { /* non-blocking */ }
  await deleteDoc(doc(db, 'users', u.uid));

  // 3) Delete the Auth account itself, then forget the local decryption key.
  await deleteUser(u);
  await clearDataKey();
}

// Sync fields stored ENCRYPTED under users/{uid}.appStateEnc (zero-knowledge — see dataCrypto.ts).
// Firestore rejects `undefined` field values (e.g. optional institution / change_amount / due_day on
// assets & debts) and would throw, silently failing the whole sync. Strip undefined first.
/* ─ MK-XS-F-073 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * saveUserData
 *
 * Answers ..... Sync fields stored ENCRYPTED under users/{uid}.appStateEnc (zero-knowledge — see dataCrypto.ts).
 *
 * Formula .....
 *     clean = JSON.parse(JSON.stringify(data ?? {}))
 *     key = await get data key()
 *     status = 'no − key'   when key is missing
 *     my key id = key id of(key)
 *     used = JSON.parse(JSON.stringify(sync.pending ?? {}))
 *     ref = doc(db, 'users', uid)
 *     snap = await tx.get(ref)
 *     d = snap.data()   if snap.exists()
 *     {}   otherwise
 *     rev = profile rev   if profile rev is a number
 *     0   otherwise
 *     cloud stored = nothing
 *     status = 'unreadable' as const   when key id and key id ! = my key id
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-073
 * Changed ..... 2026-06-19 (d42df82)
 */
export async function saveUserData(uid: string, data: object, sync?: Pick<ProfileSync, 'base' | 'pending'>): Promise<ProfileSaveResult> {
  const clean = JSON.parse(JSON.stringify(data ?? {}));
  const key = await getDataKey();
  if (!key) return { status: 'no-key' };   // no key yet → skip the cloud write (NEVER store plaintext); local copy is safe
  const myKeyId = keyIdOf(key);
  const used: Record<string, PendingChange> = JSON.parse(JSON.stringify(sync?.pending ?? {}));
  const ref = doc(db, 'users', uid);
  // R8 + R8a: one transaction reads profileRev and the cloud's profile, merges this phone's unsaved changes item by item, and
  // writes profileRev + 1 (the access rules refuse anything else). R12: a profile locked by another key is never written over.
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const d: any = snap.exists() ? snap.data() : {};
    const rev: number = typeof d?.profileRev === 'number' ? d.profileRev : 0;   // R18: none counts as 0
    let cloudStored: Record<string, any> | null = null;
    if (d?.appStateEnc != null) {
      if (d.keyId && d.keyId !== myKeyId) return { status: 'unreadable' as const };
      cloudStored = await decryptFromSync(d.appStateEnc);
      if (cloudStored == null) return { status: 'unreadable' as const };
    } else if (d?.appState) cloudStored = d.appState;   // legacy plaintext (pre-encryption accounts)
    const now = new Date().toISOString();
    const { profile: cloud, stamps: cloudStamps } = splitStamps(cloudStored);
    let profile: Record<string, any>, stamps: ProfileStamps, notes: MergeNote[] = [];
    if (sync && cloud) ({ profile, stamps, notes } = mergeProfile(cloud, cloudStamps, { base: sync.base, pending: used }, now));
    else {
      // nothing in the cloud yet (or a caller with no list of changes): the phone's profile, stamped with its unsaved changes
      profile = clean; stamps = { ...(cloudStamps ?? {}) };
      for (const [k, p] of Object.entries(used)) if (!p.deleted) stamps[k] = p.at;
    }
    const enc = await encryptForSync(withStamps(profile, stamps));
    if (enc == null) return { status: 'no-key' as const };
    tx.set(ref, { appStateEnc: enc, keyId: myKeyId, profileRev: rev + 1, appState: deleteField() }, { merge: true });
    return { status: 'saved' as const, profile, stamps, notes, used, profileRev: rev + 1 };
  });
}
/** What a profile save did: saved (with the merged profile the phone now keeps), no key on the phone yet, or a cloud profile
 *  this phone cannot open (R12: nothing is written). */
export type ProfileSaveResult =
  | { status: 'saved'; profile: Record<string, any>; stamps: ProfileStamps; notes: MergeNote[]; used: Record<string, PendingChange>; profileRev: number }
  | { status: 'no-key' } | { status: 'unreadable' };

/** R12 + R18: open an encrypted value that may carry a fingerprint. A fingerprint not of this phone's key: unreadable, never
 *  tried. None (written before this change): the key is tried. */
/* ─ MK-XS-F-272 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * openWithId
 *
 * Answers ..... R12 + R18: open an encrypted value that may carry a fingerprint.
 *
 * Formula .....
 *     nothing   when value = nothing
 *     key = await get data key()
 *     nothing   when key is missing (or key id of(key) ! = key id when missing or zero)
 *     the answer = decrypt from sync(value)
 *
 * Called by ... MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-223 loadAssetRecordPart · MK-XS-F-242 readUserProfile
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-275 loadMinAppVersion · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-242 readUserProfile
 *               MK-XS-F-077 setUserHousehold · MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-272
 * Changed ..... not in git yet (—)
 */
async function openWithId(value: unknown, keyId: string | null | undefined): Promise<any | null> {
  if (value == null) return null;
  if (keyId) {
    const key = await getDataKey();
    if (!key || keyIdOf(key) !== keyId) return null;
  }
  return decryptFromSync(value);
}
/** Encrypt with this phone's key, naming the key (R12): null where there is no key yet. */
/* ─ MK-XS-F-273 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sealWithId
 *
 * Answers ..... Encrypt with this phone's key, naming the key (R12): null where there is no key yet.
 *
 * Formula .....
 *     key = await get data key()
 *     nothing   when key is missing
 *     enc = await encrypt for sync(obj)
 *     the answer:
 *     nothing   if enc = nothing
 *     enc = enc
 *     key id = key id of(key)   otherwise
 *
 * Called by ... MK-XS-F-222 saveAssetRecordPart · MK-XS-F-233 commitAssetRecord
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-239 loadCloudRecord
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-222 saveAssetRecordPart
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-273
 * Changed ..... not in git yet (—)
 */
async function sealWithId(obj: unknown): Promise<{ enc: string; keyId: string } | null> {
  const key = await getDataKey();
  if (!key) return null;
  const enc = await encryptForSync(obj);
  return enc == null ? null : { enc, keyId: keyIdOf(key) };
}

/** THE MASTER RECORD IN THE CLOUD (his "yes", 2026-11-11): one encrypted document per part, under
 *  users/{uid}/assetRecord/{part} — readable and writable only by the account holder and a household member (the rules for
 *  users/{uid} and everything under it). The parts and which to write are decided in services/sync/assetRecordCloud. */
/* ─ MK-XS-F-222 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveAssetRecordPart
 *
 * Answers ..... THE MASTER RECORD IN THE CLOUD (his "yes", 2026-11-11): one encrypted document per part, under users/{uid}/assetRecord/{part} — readable and writable only by the account holder and a household member (the rules for users/{uid} and everything under it).
 *
 * Formula .....
 *     sealed = await seal with id({ rows: JSON.parse(JSON.stringify(rows)) })
 *     false   when sealed = nothing
 *     the answer = true
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-222
 * Changed ..... 2026-11-11 (d188fd68)
 */
export async function saveAssetRecordPart(uid: string, part: number, rows: unknown[]): Promise<boolean> {
  const sealed = await sealWithId({ rows: JSON.parse(JSON.stringify(rows)) });
  if (sealed == null) return false;   // no key yet → skip the cloud write (NEVER store plaintext) and say so, so the part is written again later
  await setDoc(doc(db, 'users', uid, 'assetRecord', String(part)), sealed);
  return true;
}

/** One part of the master record from the cloud, or null where there is none. */
/* ─ MK-XS-F-223 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loadAssetRecordPart
 *
 * Answers ..... One part of the master record from the cloud, or null where there is none.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'users', uid, 'assetRecord', string(part)))
 *     nothing   when !snap.exists()
 *     d = snap.data()
 *     plain = await open with id(enc, key id)   if enc ≠ nothing
 *     nothing   otherwise
 *     the answer:
 *     (plain as any).rows   if array.is array((plain as any).rows)
 *     UNREADABLE   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-223
 * Changed ..... 2026-11-11 (d188fd68)
 */
export async function loadAssetRecordPart(uid: string, part: number): Promise<PartRead> {
  const snap = await getDoc(doc(db, 'users', uid, 'assetRecord', String(part)));
  if (!snap.exists()) return null;   // no such part: the record ends before it
  const d = snap.data();
  const plain = d?.enc != null ? await openWithId(d.enc, d.keyId) : null;   // R12: another key's part is unreadable, never tried
  // the part is there but cannot be read (no key on this phone yet, or the text does not open): told apart from "no such part",
  // so it is never taken as the end of the record (outside check 2, 2026-11-12)
  return Array.isArray((plain as any)?.rows) ? (plain as any).rows : UNREADABLE;
}

/** The marker beside the record's parts (users/{uid}/assetRecord/marker): which phone saved last, how many rows, the last row.
 *  Null where no phone has saved one yet. */
/* ─ MK-XS-F-231 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loadAssetRecordMarker
 *
 * Answers ..... The marker beside the record's parts (users/{uid}/assetRecord/marker): which phone saved last, how many rows, the last row.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'users', uid, 'assetRecord', 'marker'))
 *     the answer:
 *     marker from(snap.data())   if snap.exists()
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-231
 * Changed ..... not in git yet (—)
 */
export async function loadAssetRecordMarker(uid: string): Promise<CloudMarker | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'assetRecord', 'marker'));
  return snap.exists() ? markerFrom(snap.data()) : null;
}

/* ─ MK-XS-F-232 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * markerFrom
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     nothing   when d is missing (or writer is not a string (or rows is not a number when missing or zero) when missing or zero)
 *     writer = writer
 *     rows = rows
 *     last row id = last row id (or nothing when missing)
 *     last written at = last written at (or nothing when missing)
 *     at = at
 *
 * Called by ... MK-XS-F-231 loadAssetRecordMarker · MK-XS-F-233 commitAssetRecord
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-231 loadAssetRecordMarker
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-285 mergeQuestions
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-232
 * Changed ..... not in git yet (—)
 */
function markerFrom(d: any): CloudMarker | null {
  if (!d || typeof d.writer !== 'string' || typeof d.rows !== 'number') return null;
  return { writer: d.writer, rows: d.rows, lastRowId: d.lastRowId ?? null, lastWrittenAt: d.lastWrittenAt ?? null, at: d.at };
}

/** SAVE THE RECORD'S PARTS ONLY WHERE THIS PHONE SAVED OR READ THE CLOUD'S COPY LAST (his "go", 2026-11-12). One cloud
 *  transaction reads the marker and, only where it still equals `expected`, writes the parts and the new marker together;
 *  where another phone saved in between, the transaction is retried by the cloud, sees the new marker, and writes nothing.
 *  Every part is encrypted first; where there is no key yet, nothing is written at all. */
/* ─ MK-XS-F-233 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * commitAssetRecord
 *
 * Answers ..... SAVE THE RECORD'S PARTS ONLY WHERE THIS PHONE SAVED OR READ THE CLOUD'S COPY LAST (his "go", 2026-11-12).
 *
 * Formula .....
 *     encs = []
 *     sealed = await seal with id({ rows: JSON.parse(JSON.stringify(rows)) })
 *     status = 'no − key'   when sealed = nothing
 *     marker ref = doc(db, 'users', uid, 'assetRecord', 'marker')
 *     snap = await tx.get(marker ref)
 *     actual = marker from(snap.data())   if snap.exists()
 *     nothing   otherwise
 *     status = 'moved − on' as const
 *     marker = actual   when !same marker(actual, expected)
 *     the answer = status = 'saved' as const
 *
 * Called by ... MK-XS-F-239 loadCloudRecord
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-285 mergeQuestions
 *               MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-233
 * Changed ..... not in git yet (—)
 */
export function commitAssetRecord(uid: string): CommitRecord {
  return async (parts, expected, next) => {
    const encs: { part: number; enc: string; keyId: string }[] = [];
    for (const { part, rows } of parts) {
      const sealed = await sealWithId({ rows: JSON.parse(JSON.stringify(rows)) });
      if (sealed == null) return { status: 'no-key' };   // NEVER store plaintext; the save is tried again later
      encs.push({ part, ...sealed });
    }
    const markerRef = doc(db, 'users', uid, 'assetRecord', 'marker');
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(markerRef);
      const actual = snap.exists() ? markerFrom(snap.data()) : null;
      if (!sameMarker(actual, expected)) return { status: 'moved-on' as const, marker: actual };
      for (const { part, enc, keyId } of encs) tx.set(doc(db, 'users', uid, 'assetRecord', String(part)), { enc, keyId });
      tx.set(markerRef, { ...next });
      return { status: 'saved' as const };
    });
  };
}

/** This phone's own id, made once and kept on the phone: the marker names the phone that saved the record last. */
let phoneIdCache: string | null = null;
/* ─ MK-XS-F-234 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * getPhoneId
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     phone id cache   when phone id cache
 *     key = 'moneykeel − phone − id'
 *     id = await async storage.get item(KEY)
 *     the answer = id
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-234
 * Changed ..... not in git yet (—)
 */
export async function getPhoneId(): Promise<string> {
  if (phoneIdCache) return phoneIdCache;
  const KEY = 'moneykeel-phone-id';
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = `phone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(KEY, id);
  }
  phoneIdCache = id;
  return id;
}

/** What must reach the cloud before a sign-out clears the phone: the app's root registers it (app/_layout.tsx), and the sign-out
 *  waits for it, up to a few seconds, so nothing typed in the last two seconds is lost. */
let signOutFlush: (() => Promise<void>) | null = null;
/* ─ MK-XS-F-235 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * onSignOutFlush
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-235
 * Changed ..... not in git yet (—)
 */
export function onSignOutFlush(fn: (() => Promise<void>) | null) { signOutFlush = fn; }
/* ─ MK-XS-F-236 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * flushBeforeSignOut
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-236
 * Changed ..... not in git yet (—)
 */
export async function flushBeforeSignOut(timeoutMs = 4000): Promise<void> {
  if (!signOutFlush) return;
  await Promise.race([signOutFlush().catch(() => {}), new Promise<void>((r) => setTimeout(r, timeoutMs))]);
}

/* ─ MK-XS-F-074 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loadUserData
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'users', uid))
 *     nothing   when !snap.exists()
 *     d = snap.data()
 *     await open with id(app state enc, key id)   when app state enc ≠ nothing
 *     the answer = app state (or nothing when missing)
 *
 * Called by ... MK-XS-F-077 setUserHousehold
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-077 setUserHousehold
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-074
 * Changed ..... 2026-06-19 (d42df82)
 */
export async function loadUserData(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (d?.appStateEnc != null) return await openWithId(d.appStateEnc, d.keyId);
  return d?.appState ?? null;   // legacy plaintext (pre-encryption accounts)
}

// ── Household / spouse invites ─────────────────────────────────────
// Spouses share ONE data document: all reads/writes go to users/{householdId} where
// householdId = the inviter's uid. Membership is recorded top-level on the member's own
// user doc (users/{uid}.householdId, OUTSIDE appState) so it survives a fresh install.
// Invites live at invites/{code} and are created client-side; the spouse redeems the
// code at sign-up (or later) — no email backend needed, the inviter shares the code.

/* ─ MK-XS-F-142 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * makeInviteCode
 *
 * Answers ..... ── Household / spouse invites ───────────────────────────────────── Spouses share ONE data document: all reads/writes go to users/{householdId} where householdId = the inviter's uid.
 *
 * Formula .....
 *     alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
 *     the answer = array.from({ length: 6 }, () => ALPHABET[math.floor(math.random() × ALPHABET.length)]).join('')
 *
 * Called by ... MK-XS-F-075 createInvite · MK-XS-F-277 createInviteWithKeyCode
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-075 createInvite · MK-XS-F-277 createInviteWithKeyCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-142
 * Changed ..... not in git yet (—)
 */
function makeInviteCode(): string {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L — easy to read aloud
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

/** Create an invite code pointing at this household's shared data doc. */
/* ─ MK-XS-F-075 ───────────────────────────────────────────── 2 · DISPLAYED (presentation only)
 * createInvite
 *
 * Answers ..... Create an invite code pointing at this household's shared data doc.
 *
 * Formula .....
 *     code = make invite code()
 *     the answer = code
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-075
 * Changed ..... 2026-06-10 (d3268ce)
 */
export async function createInvite(householdId: string, inviterName: string | null): Promise<string> {
  const code = makeInviteCode();
  await setDoc(doc(db, 'invites', code), {
    householdId,
    inviterName: inviterName ?? null,
    createdAt: serverTimestamp(),
  });
  return code;
}

/* ─ MK-XS-F-076 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * lookupInvite
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'invites', code.trim().to upper case()))
 *     nothing   when !snap.exists()
 *     d = snap.data() as any
 *     the answer:
 *     household id = household id
 *     inviter name = inviter name (or nothing when missing)   if household id
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-076
 * Changed ..... 2026-06-10 (d3268ce)
 */
export async function lookupInvite(code: string): Promise<{ householdId: string; inviterName: string | null } | null> {
  const snap = await getDoc(doc(db, 'invites', code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return d?.householdId ? { householdId: d.householdId, inviterName: d.inviterName ?? null } : null;
}

/** Record household membership on the member's own user doc (survives reinstall/new device). */
/* ─ MK-XS-F-077 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setUserHousehold
 *
 * Answers ..... Record household membership on the member's own user doc (survives reinstall/new device).
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-077
 * Changed ..... 2026-06-16 (d04adf2)
 */
export async function setUserHousehold(uid: string, householdId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { householdId }, { merge: true });
}

/**
 * Claim membership in {householdId} by writing the member doc the security rules gate access on.
 * Must carry the invite `code`: the rules verify an invite with that code exists and points at
 * {householdId}, so a household can't be joined without a real code. Call this BEFORE reading the
 * shared doc (loadUserData), since that read now requires this member doc to exist.
 */
/* ─ MK-XS-F-078 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * joinHouseholdMembership
 *
 * Answers ..... Claim membership in {householdId} by writing the member doc the security rules gate access on.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-078
 * Changed ..... 2026-06-19 (d42df82)
 */
export async function joinHouseholdMembership(uid: string, householdId: string, code: string): Promise<void> {
  await setDoc(doc(db, 'households', householdId, 'members', uid), {
    code: code.trim().toUpperCase(),
    joinedAt: serverTimestamp(),
  });
}

/** The member's own top-level doc fields (householdId + decrypted appState) in one read. */
/* ─ MK-XS-F-079 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loadUserRoot
 *
 * Answers ..... The member's own top-level doc fields (householdId + decrypted appState) in one read.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'users', uid))
 *     household id = nothing
 *     app state = nothing
 *     app state unreadable = false   when !snap.exists()
 *     d = snap.data() as any
 *     app state = await open with id(app state enc, key id)   if app state enc ≠ nothing
 *     app state (or nothing when missing)   otherwise
 *
 * Called by ... MK-XS-F-072 deleteAccount
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-275 loadMinAppVersion
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-079
 * Changed ..... 2026-06-20 (3ca4a85)
 */
export async function loadUserRoot(uid: string): Promise<{ householdId: string | null; appState: Record<string, any> | null; appStateUnreadable: boolean; movedFrom?: string }> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { householdId: null, appState: null, appStateUnreadable: false };
  const d = snap.data() as any;
  const appState = d?.appStateEnc != null ? await openWithId(d.appStateEnc, d.keyId) : (d?.appState ?? null);
  // a profile in the cloud this phone has no key for yet is never "no profile" (DEC-10749, 2026-11-12)
  return { householdId: d?.householdId ?? null, appState, appStateUnreadable: d?.appStateEnc != null && appState == null,
    ...(d?.movedFrom ? { movedFrom: d.movedFrom as string } : {}) };   // R16: the household moved here from this owner
}

/** A profile document (the household's shared one) read so that "nothing in the cloud" and "there, but this phone has no key
 *  for it yet" never look the same (DEC-10749, his "go", 2026-11-12: an unreadable profile was taken as a new account). */
/* ─ MK-XS-F-242 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * readUserProfile
 *
 * Answers ..... A profile document (the household's shared one) read so that "nothing in the cloud" and "there, but this phone has no key for it yet" never look the same (DEC-10749, his "go", 2026-11-12: an unreadable profile was taken as a new account).
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'users', uid))
 *     app state = nothing
 *     app state unreadable = false   when !snap.exists()
 *     d = snap.data() as any
 *     app state = await open with id(app state enc, key id)   if app state enc ≠ nothing
 *     app state (or nothing when missing)   otherwise
 *     the answer:
 *     app state = app state
 *     app state unreadable = app state enc ≠ nothing and app state = nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-242
 * Changed ..... not in git yet (—)
 */
export async function readUserProfile(uid: string): Promise<{ appState: Record<string, any> | null; appStateUnreadable: boolean }> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { appState: null, appStateUnreadable: false };
  const d = snap.data() as any;
  const appState = d?.appStateEnc != null ? await openWithId(d.appStateEnc, d.keyId) : (d?.appState ?? null);
  return { appState, appStateUnreadable: d?.appStateEnc != null && appState == null };
}

/** Told when this phone gets the key to the person's data (a sign-in that unwraps it, or the recovery code): the app's root
 *  then loads a profile it could not read before. */
let keyReadyListener: (() => Promise<void> | void) | null = null;
/** The app root registers here what to do once the key to read the cloud copy reaches the phone: load the profile it could not read. */
/* ─ MK-XS-F-243 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * onDataKeyReady
 *
 * Answers ..... The app root registers here what to do once the key to read the cloud copy reaches the phone: load the profile it could not read.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-243
 * Changed ..... not in git yet (—)
 */
export function onDataKeyReady(fn: (() => Promise<void> | void) | null) { keyReadyListener = fn; }
/** Tells the app the key to read the cloud copy is now on the phone (a sign-in unwrapped it, or the recovery code was entered), so a profile it could not read loads now. */
/* ─ MK-XS-F-244 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * dataKeyIsReady
 *
 * Answers ..... Tells the app the key to read the cloud copy is now on the phone (a sign-in unwrapped it, or the recovery code was entered), so a profile it could not read loads now.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-XS-F-066 loginUser · MK-XS-F-067 restoreWithRecoveryCode
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-066 loginUser
 *               MK-XS-F-280 restoreOwnerWithReturnCode · MK-XS-F-067 restoreWithRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-244
 * Changed ..... not in git yet (—)
 */
async function dataKeyIsReady() {
  try { await keyReadyListener?.(); } catch { /* the root retries at the next change */ }
}

/* ─ MK-XS-F-080 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * submitFeedback
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-080
 * Changed ..... 2026-06-20 (3ca4a85)
 */
export async function submitFeedback(payload: {
  uid:        string | null;
  email:      string | null;
  name:       string | null;
  type:       string;
  subject:    string;
  message:    string;
  appVersion: string;
  buildNumber?: string;   // iOS build number (helps tie a beta report to an exact TestFlight build)
  platform?:    string;   // e.g. "ios 18.1" — which device/OS the report came from
}) {
  // Stored at feedback/{autoId} — each field is its own column so it reads cleanly in the Firebase
  // console (no nested blob). createdAt is a server timestamp; status defaults to "new" for triage.
  await addDoc(collection(db, 'feedback'), {
    ...payload,
    status: 'new',
    createdAt: serverTimestamp(),
  });
}

// ── THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12) ─────────────────────────────────────────────────────

/** R6a: open questions live in one encrypted document beside the record's parts (users/{owner}/assetRecord/questions). One
 *  transaction reads it, merges this phone's questions by key (`seenInCloud`: the keys this phone last read there, so an
 *  answer on either phone removes the question from both), and writes the merge. Returns the merged questions and the keys
 *  answered on another phone, for this phone to drop; null where the phone has no key or the document is another key's. */
/* ─ MK-XS-F-274 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * syncAssetRecordQuestions
 *
 * Answers ..... R6a: open questions live in one encrypted document beside the record's parts (users/{owner}/assetRecord/questions).
 *
 * Formula .....
 *     key = await get data key()
 *     nothing   when key is missing
 *     ref = doc(db, 'users', owner, 'assetRecord', 'questions')
 *     snap = await tx.get(ref)
 *     d = snap.data()   if snap.exists()
 *     nothing   otherwise
 *     cloud = {}
 *     plain = await open with id(enc, key id)
 *     nothing   when plain = nothing
 *     m = merge questions(cloud, phone, seen in cloud)
 *     sealed = await seal with id({ questions: JSON.parse(JSON.stringify(questions)) })
 *     nothing   when sealed is missing
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-274
 * Changed ..... not in git yet (—)
 */
export async function syncAssetRecordQuestions(owner: string, phone: QuestionsDoc, seenInCloud: readonly string[]):
  Promise<{ questions: QuestionsDoc; answeredElsewhere: string[] } | null> {
  const key = await getDataKey();
  if (!key) return null;
  const ref = doc(db, 'users', owner, 'assetRecord', 'questions');
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const d: any = snap.exists() ? snap.data() : null;
    let cloud: QuestionsDoc = {};
    if (d?.enc != null) {
      const plain = await openWithId(d.enc, d.keyId);
      if (plain == null) return null;   // R12: never written over
      cloud = plain?.questions ?? {};
    }
    const m = mergeQuestions(cloud, phone, seenInCloud);
    const sealed = await sealWithId({ questions: JSON.parse(JSON.stringify(m.questions)) });
    if (!sealed) return null;
    tx.set(ref, sealed);
    return { questions: m.questions, answeredElsewhere: m.answeredElsewhere };
  });
}

/** R8a: the minimum app version that may still save (config/app.minVersion), or null where none is set or it cannot be read. */
/* ─ MK-XS-F-275 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * loadMinAppVersion
 *
 * Answers ..... R8a: the minimum app version that may still save (config/app.minVersion), or null where none is set or it cannot be read.
 *
 * Formula .....
 *     snap = await get doc(doc(db, 'config', 'app'))
 *     v = (snap.data() as any).min version   if snap.exists()
 *     nothing   otherwise
 *     the answer:
 *     v   if v is a string
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-275
 * Changed ..... not in git yet (—)
 */
export async function loadMinAppVersion(): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    const v = snap.exists() ? (snap.data() as any)?.minVersion : null;
    return typeof v === 'string' ? v : null;
  } catch { return null; }
}

/** R16: the server function's address that deletes an account (functions/index.js deleteAccount). */
/* ─ MK-XS-F-276 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deleteAccountUrl
 *
 * Answers ..... R16: the server function's address that deletes an account (functions/index.js deleteAccount).
 *
 * Formula .....
 *     constants = require('expo − constants').default
 *     the answer = (constants.expo config.extra as any).DELETE_ACCOUNT_URL (or process.env.DELETE_ACCOUNT_URL (or nothing when missing or zero) when missing or zero)
 *
 * Called by ... MK-XS-F-072 deleteAccount
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-275 loadMinAppVersion
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-276
 * Changed ..... not in git yet (—)
 */
export function deleteAccountUrl(): string | null {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.extra as any)?.DELETE_ACCOUNT_URL || process.env.DELETE_ACCOUNT_URL || null;
  } catch { return process.env.DELETE_ACCOUNT_URL || null; }
}

/** R13: an invite that shares the household's key. The owner's phone shows the 6-letter invite code AND a one-time 20-letter
 *  key code; the invite holds the key locked by the key code and a check value of it, and the access rules give it 7 days
 *  from the server's creation time. Needs the key on the phone. (The screen that shows the key code waits for its mock.) */
/* ─ MK-XS-F-277 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * createInviteWithKeyCode
 *
 * Answers ..... R13: an invite that shares the household's key.
 *
 * Formula .....
 *     dek = await get data key()
 *     code = make invite code()
 *     key code = generate key code()
 *     the answer = { code, key code }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-277
 * Changed ..... not in git yet (—)
 */
export async function createInviteWithKeyCode(householdId: string, inviterName: string | null): Promise<{ code: string; keyCode: string }> {
  const dek = await getDataKey();
  if (!dek) throw new Error('Unlock the app first, then try again.');
  const code = makeInviteCode();
  const keyCode = generateKeyCode();
  await setDoc(doc(db, 'invites', code), {
    householdId,
    inviterName: inviterName ?? null,
    createdAt: serverTimestamp(),
    wrappedKey: wrapWithKeyCode(dek, keyCode, code),
    keyCodeCheck: keyCodeCheck(keyCode),
  });
  return { code, keyCode };
}

/** R13: join a household with the invite code and the key code. The key code opens the household key; the member document
 *  carries the proof the access rules check; the member re-locks the key under their own password and recovery code, and
 *  deletes the invite. Throws where the invite is gone or the key code is wrong. */
/* ─ MK-XS-F-278 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * joinHouseholdWithKeyCode
 *
 * Answers ..... R13: join a household with the invite code and the key code.
 *
 * Formula .....
 *     code = invite code.trim().to upper case()
 *     snap = await get doc(doc(db, 'invites', code))
 *     inv = snap.data()   if snap.exists()
 *     nothing   otherwise
 *     hh key = unwrap with key code(inv.wrapped key, key code, code)
 *     the answer = inv.household id
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-278
 * Changed ..... not in git yet (—)
 */
export async function joinHouseholdWithKeyCode(uid: string, inviteCode: string, keyCode: string, password: string, recoveryCode: string): Promise<string> {
  const code = inviteCode.trim().toUpperCase();
  const snap = await getDoc(doc(db, 'invites', code));
  const inv: any = snap.exists() ? snap.data() : null;
  if (!inv?.householdId || !inv?.wrappedKey) throw new Error('That invite code was not found. Ask for a new one.');
  if (keyCodeCheck(keyCode) !== inv.keyCodeCheck) throw new Error('That key code does not match the invite.');
  const hhKey = unwrapWithKeyCode(inv.wrappedKey, keyCode, code);
  if (!hhKey) throw new Error('That key code does not match the invite.');
  await setDoc(doc(db, 'households', inv.householdId, 'members', uid), { code, joinedAt: serverTimestamp(), keyCodeProof: keyCodeProof(keyCode) });
  await setDoc(doc(db, 'users', uid), { householdId: inv.householdId, householdKeyEnvelope: makeEnvelope(hhKey, uid, password, recoveryCode) }, { merge: true });
  await cacheDataKey(hhKey);
  try { await deleteDoc(doc(db, 'invites', code)); } catch { /* the 7 days end it anyway */ }
  await dataKeyIsReady();
  return inv.householdId;
}

/** R14: a member gives an owner who lost both codes a one-time return code: the member's phone stores the household key
 *  locked by it beside the household (7 days). Returns the code to pass on. */
/* ─ MK-XS-F-279 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * leaveReturnCode
 *
 * Answers ..... R14: a member gives an owner who lost both codes a one-time return code: the member's phone stores the household key locked by it beside the household (7 days).
 *
 * Formula .....
 *     dek = await get data key()
 *     return code = generate recovery code()
 *     the answer = return code
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-279
 * Changed ..... not in git yet (—)
 */
export async function leaveReturnCode(owner: string): Promise<string> {
  const dek = await getDataKey();
  if (!dek) throw new Error('Unlock the app first, then try again.');
  const returnCode = generateRecoveryCode();
  await setDoc(doc(db, 'households', owner, 'keyReturn', 'current'), {
    enc: wrapWithReturnCode(dek, returnCode, owner),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  return returnCode;
}

/** R14: the owner types the return code: the key comes back, is locked under a new password and a new recovery code (returned
 *  to show once), and the return document is deleted. */
/* ─ MK-XS-F-280 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * restoreOwnerWithReturnCode
 *
 * Answers ..... R14: the owner types the return code: the key comes back, is locked under a new password and a new recovery code (returned to show once), and the return document is deleted.
 *
 * Formula .....
 *     u = auth.current user
 *     snap = await get doc(doc(db, 'households', uid, 'keyReturn', 'current'))
 *     d = snap.data()   if snap.exists()
 *     nothing   otherwise
 *     dek = unwrap with return code(enc, return code, uid)
 *     recovery code = generate recovery code()
 *     the answer = recovery code
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-280
 * Changed ..... not in git yet (—)
 */
export async function restoreOwnerWithReturnCode(returnCode: string, newPassword: string): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('You are not signed in.');
  const snap = await getDoc(doc(db, 'households', u.uid, 'keyReturn', 'current'));
  const d: any = snap.exists() ? snap.data() : null;
  if (!d?.enc || (d.expiresAt && Date.parse(d.expiresAt) < Date.now())) throw new Error('No return code is waiting. Ask your household member for a new one.');
  const dek = unwrapWithReturnCode(d.enc, returnCode, u.uid);
  if (!dek) throw new Error('That return code is incorrect.');
  const recoveryCode = generateRecoveryCode();
  await setDoc(doc(db, 'users', u.uid), { keyEnvelope: makeEnvelope(dek, u.uid, newPassword, recoveryCode) }, { merge: true });
  await cacheDataKey(dek);
  try { await deleteDoc(doc(db, 'households', u.uid, 'keyReturn', 'current')); } catch { /* expires */ }
  await dataKeyIsReady();
  return recoveryCode;
}
