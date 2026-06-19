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
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseApp } from './firebaseConfig';

// React Native: getAuth() at module load throws "Component auth has not been
// registered yet" under Hermes/lazy bundling. initializeAuth registers the auth
// component and (with AsyncStorage) persists the session across app restarts.
// Fall back to getAuth if auth was already initialized (e.g. Fast Refresh).
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(
    firebaseApp,
    getReactNativePersistence
      ? { persistence: getReactNativePersistence(AsyncStorage) as any }
      : undefined,
  );
} catch {
  auth = getAuth(firebaseApp);
}
export const db = getFirestore(firebaseApp);

export async function registerUser(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  try { await sendEmailVerification(cred.user); } catch { /* non-blocking — they can resend later */ }
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    name,
    createdAt: serverTimestamp(),
  });
  return cred.user;
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

export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
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

  // 3) Delete the Auth account itself.
  await deleteUser(u);
}

// Sync fields stored under users/{uid}/appState.
// Firestore rejects `undefined` field values (e.g. optional institution / change_amount / due_day on
// assets & debts) and would throw, silently failing the whole sync. Strip undefined first.
export async function saveUserData(uid: string, data: object) {
  const clean = JSON.parse(JSON.stringify(data ?? {}));
  await setDoc(doc(db, 'users', uid), { appState: clean }, { merge: true });
}

export async function loadUserData(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data()?.appState ?? null;
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

/** The member's own top-level doc fields (householdId + appState) in one read. */
export async function loadUserRoot(uid: string): Promise<{ householdId: string | null; appState: Record<string, any> | null }> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { householdId: null, appState: null };
  const d = snap.data() as any;
  return { householdId: d?.householdId ?? null, appState: d?.appState ?? null };
}

export async function submitFeedback(payload: {
  uid:       string | null;
  email:     string | null;
  name:      string | null;
  type:      string;
  subject:   string;
  message:   string;
  appVersion:string;
}) {
  await addDoc(collection(db, 'feedback'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
