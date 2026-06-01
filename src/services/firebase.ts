import {
  getAuth,
  initializeAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
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
const db   = getFirestore(firebaseApp);

export async function registerUser(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    name,
    createdAt: serverTimestamp(),
  });
  return cred.user;
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

// Sync fields stored under users/{uid}/appState
export async function saveUserData(uid: string, data: object) {
  await setDoc(doc(db, 'users', uid), { appState: data }, { merge: true });
}

export async function loadUserData(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data()?.appState ?? null;
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
