// Generic per-user-document Firestore helpers. Each module owns a top-level
// collection keyed by uid (single-doc domains like profile) or by entity id
// (multi-row domains like assets/debts). Keeps module repos tiny + consistent.
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { UserId } from './ids';

/** Read a single-document-per-user collection (e.g. profiles/{uid}). */
/* ─ MK-ST-F-041 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * getUserDoc
 *
 * Answers ..... Read a single-document-per-user collection (e.g.
 *
 * Formula .....
 *     snap = await get doc(doc(db, collection name, uid))
 *     the answer:
 *     snap.data() as T   if snap.exists()
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-041
 * Changed ..... 2026-06-05 (f742136)
 */
export async function getUserDoc<T>(collectionName: string, uid: UserId): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, uid));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Write/merge a single-document-per-user collection, stamping last_updated. */
/* ─ MK-ST-F-042 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * setUserDoc
 *
 * Answers ..... Write/merge a single-document-per-user collection, stamping last_updated.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-CF-F-016 saveBudget · MK-CF-F-040 saveDebt
 *               MK-CF-F-051 saveIncome · MK-PL-F-015 saveGoals
 *               MK-XS-F-022 saveProfile
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-016 saveBudget · MK-CF-F-040 saveDebt
 *               MK-PL-F-015 saveGoals · MK-CF-F-051 saveIncome
 *               MK-XS-F-022 saveProfile
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-042
 * Changed ..... 2026-06-05 (f742136)
 */
export async function setUserDoc<T extends object>(collectionName: string, uid: UserId, data: T): Promise<void> {
  await setDoc(doc(db, collectionName, uid), { ...data, last_updated: serverTimestamp() }, { merge: true });
}
