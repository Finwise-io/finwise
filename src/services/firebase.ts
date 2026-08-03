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
} from 'firebase/firestore';
import { firebaseApp } from './firebaseConfig';
import {
  cacheDataKey, clearDataKey, getDataKey, encryptForSync, decryptFromSync,
  generateDataKey, generateRecoveryCode, makeEnvelope, unwrapWithPassword, unwrapWithRecovery,
  rewrapPassword, rewrapRecovery, type KeyEnvelope,
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
export async function resendVerification() {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}
/** Re-check verification status from the server (call after the user clicks the email link). */
export async function refreshEmailVerified(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return !!auth.currentUser.emailVerified;
}
export function isEmailVerified(): boolean {
  return !!auth.currentUser?.emailVerified;
}

/** The email of the account currently signed in to Firebase — the authoritative identity that
 *  account-level actions (delete, reauth) operate on. Use this, not a possibly-stale store value. */
/** The signed-in user's Firebase ID token — how server relays (AI proxy, SnapTrade) verify the caller. */
export async function currentIdToken(): Promise<string | null> {
  try { return auth.currentUser ? await auth.currentUser.getIdToken() : null; } catch { return null; }
}

export function currentUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

// Returns the user plus the unlock status:
//  • needsRecovery=true → the password can't open the data (it was reset); prompt for the recovery code.
//  • recoveryCode set    → a legacy account had no envelope; we created one — show the code to save.
export async function loginUser(email: string, password: string, onCodeReady?: (code: string) => void): Promise<{ user: any; needsRecovery: boolean; recoveryCode?: string }> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const snap = await getDoc(doc(db, 'users', uid));
  const env: KeyEnvelope | undefined = snap.exists() ? (snap.data() as any)?.keyEnvelope : undefined;

  if (env) {
    const dek = unwrapWithPassword(env, uid, password);
    if (dek) { await cacheDataKey(dek); return { user: cred.user, needsRecovery: false }; }
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
export async function restoreWithRecoveryCode(recoveryCode: string, newPassword: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('You are not signed in.');
  const snap = await getDoc(doc(db, 'users', u.uid));
  const env: KeyEnvelope | undefined = snap.exists() ? (snap.data() as any)?.keyEnvelope : undefined;
  if (!env) throw new Error('No recovery information was found for this account.');
  const dek = unwrapWithRecovery(env, u.uid, recoveryCode);
  if (!dek) throw new Error('That recovery code is incorrect.');
  await setDoc(doc(db, 'users', u.uid), { keyEnvelope: rewrapPassword(env, dek, u.uid, newPassword) }, { merge: true });
  await cacheDataKey(dek);
}

// Issue a NEW recovery code for the signed-in user (the old one stops working). Requires the data to
// be unlocked (key cached). Returns the new code to show once.
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

export async function logoutUser() {
  await clearDataKey();   // forget the decryption key so the next user can't read this one's data
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}

// Permanently delete the signed-in user's account (App Store Guideline 5.1.1(v)).
// Re-authenticates first (deletion is sensitive and Firebase requires a recent login), then removes
// the Firestore data, then the Auth user — in that order so we never leave an orphaned auth account
// with no data. `password` is required because the app uses email/password auth.
export async function deleteAccount(password: string): Promise<void> {
  const u = auth.currentUser;
  if (!u || !u.email) throw new Error('You are not signed in.');

  // 1) Re-authenticate (throws auth/wrong-password, auth/too-many-requests, etc.).
  const cred = EmailAuthProvider.credential(u.email, password);
  await reauthenticateWithCredential(u, cred);

  // 2) Remove Firestore data while still authenticated. If part of a partner household, drop the
  //    membership doc too (rules let either side delete it). Best-effort so a missing doc never blocks.
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
export async function saveUserData(uid: string, data: object) {
  const clean = JSON.parse(JSON.stringify(data ?? {}));
  const enc = await encryptForSync(clean);
  if (enc == null) return;   // no key yet → skip the cloud write (NEVER store plaintext); local copy is safe
  // Write the ciphertext and remove any legacy plaintext field (migrates old accounts on first save).
  await setDoc(doc(db, 'users', uid), { appStateEnc: enc, appState: deleteField() }, { merge: true });
}

export async function loadUserData(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (d?.appStateEnc != null) return await decryptFromSync(d.appStateEnc);
  return d?.appState ?? null;   // legacy plaintext (pre-encryption accounts)
}

// ── Household / partner invites ─────────────────────────────────────
// Partners share ONE data document: all reads/writes go to users/{householdId} where
// householdId = the inviter's uid. Membership is recorded top-level on the member's own
// user doc (users/{uid}.householdId, OUTSIDE appState) so it survives a fresh install.
// Invites live at invites/{code} and are created client-side; the partner redeems the
// code at sign-up (or later) — no email backend needed, the inviter shares the code.

function makeInviteCode(): string {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L — easy to read aloud
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

/** Create an invite code pointing at this household's shared data doc. */
export async function createInvite(householdId: string, inviterName: string | null): Promise<string> {
  const code = makeInviteCode();
  await setDoc(doc(db, 'invites', code), {
    householdId,
    inviterName: inviterName ?? null,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function lookupInvite(code: string): Promise<{ householdId: string; inviterName: string | null } | null> {
  const snap = await getDoc(doc(db, 'invites', code.trim().toUpperCase()));
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return d?.householdId ? { householdId: d.householdId, inviterName: d.inviterName ?? null } : null;
}

/** Record household membership on the member's own user doc (survives reinstall/new device). */
export async function setUserHousehold(uid: string, householdId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { householdId }, { merge: true });
}

/**
 * Claim membership in {householdId} by writing the member doc the security rules gate access on.
 * Must carry the invite `code`: the rules verify an invite with that code exists and points at
 * {householdId}, so a household can't be joined without a real code. Call this BEFORE reading the
 * shared doc (loadUserData), since that read now requires this member doc to exist.
 */
export async function joinHouseholdMembership(uid: string, householdId: string, code: string): Promise<void> {
  await setDoc(doc(db, 'households', householdId, 'members', uid), {
    code: code.trim().toUpperCase(),
    joinedAt: serverTimestamp(),
  });
}

/** The member's own top-level doc fields (householdId + decrypted appState) in one read. */
export async function loadUserRoot(uid: string): Promise<{ householdId: string | null; appState: Record<string, any> | null }> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { householdId: null, appState: null };
  const d = snap.data() as any;
  const appState = d?.appStateEnc != null ? await decryptFromSync(d.appStateEnc) : (d?.appState ?? null);
  return { householdId: d?.householdId ?? null, appState };
}

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
