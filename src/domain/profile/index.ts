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

export async function loadProfile(uid: UserId): Promise<Profile | null> {
  return getUserDoc<Profile>(COLLECTION, uid);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setUserDoc(COLLECTION, profile.user_id, profile);
  emit(PROFILE_UPDATED, { user_id: profile.user_id });
}

/** Profile + derived planning values (current age, years to retirement, horizon). */
export async function getProfileReadModel(uid: UserId): Promise<ProfileReadModel | null> {
  const p = await loadProfile(uid);
  return p ? toReadModel(p) : null;
}
