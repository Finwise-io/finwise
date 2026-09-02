// Profile module — public API. Owns the `profiles/{uid}` Firestore collection.
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import type { UserId } from '../_shared/ids';
import { Profile, ProfileReadModel } from './types';
import { toReadModel } from './calc';

export * from './types';
export { toReadModel, currentAge, yearsToRetirement, retirementHorizonYears } from './calc';
export { profileFromOnboarding } from './onboarding';

const COLLECTION = 'profiles';

/** Event published whenever the profile changes (consumed by Retirement etc.). */
export const PROFILE_UPDATED = 'ProfileUpdated';

/* ─ MK-XS-F-021 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadProfile
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     get user doc<profile>(COLLECTION, uid)
 *
 * Called by ... MK-XS-F-023 getProfileReadModel
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-023 getProfileReadModel
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-021
 * Changed ..... 2026-06-05 (f742136)
 */
export async function loadProfile(uid: UserId): Promise<Profile | null> {
  return getUserDoc<Profile>(COLLECTION, uid);
}

/* ─ MK-XS-F-022 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveProfile
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
 * Formula also on the master file · functions_from_code · MK-XS-F-022
 * Changed ..... 2026-06-05 (f742136)
 */
export async function saveProfile(profile: Profile): Promise<void> {
  await setUserDoc(COLLECTION, profile.user_id, profile);
  emit(PROFILE_UPDATED, { user_id: profile.user_id });
}

/** Profile + derived planning values (current age, years to retirement, horizon). */
/* ─ MK-XS-F-023 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * getProfileReadModel
 *
 * Answers ..... Profile + derived planning values (current age, years to retirement, horizon).
 *
 * Formula .....
 *     p = await load profile(uid)
 *     the answer:
 *     to read model(p)   if p
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-023
 * Changed ..... 2026-06-05 (f742136)
 */
export async function getProfileReadModel(uid: UserId): Promise<ProfileReadModel | null> {
  const p = await loadProfile(uid);
  return p ? toReadModel(p) : null;
}
