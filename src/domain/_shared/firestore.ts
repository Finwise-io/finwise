// Generic per-user-document Firestore helpers. Each module owns a top-level
// collection keyed by uid (single-doc domains like profile) or by entity id
// (multi-row domains like assets/debts). Keeps module repos tiny + consistent.
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { UserId } from './ids';

/** Read a single-document-per-user collection (e.g. profiles/{uid}). */
export async function getUserDoc<T>(collectionName: string, uid: UserId): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, uid));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Write/merge a single-document-per-user collection, stamping last_updated. */
export async function setUserDoc<T extends object>(collectionName: string, uid: UserId, data: T): Promise<void> {
  await setDoc(doc(db, collectionName, uid), { ...data, last_updated: serverTimestamp() }, { merge: true });
}
