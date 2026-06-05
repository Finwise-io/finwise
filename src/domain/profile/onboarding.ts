// Maps the onboarding answers (already captured by src/onboarding) into a Profile.
// This is how onboarding data flows into the domain modules (blueprint §5).
import type { UserId } from '../_shared/ids';
import { Profile, EmploymentStatus } from './types';

const toInt = (v: any): number | null => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

/** `op` is the consolidated onboardingProfile: { status, name, ...answers }. */
export function profileFromOnboarding(uid: UserId, op: Record<string, any> | null): Profile {
  const a = op ?? {};
  return {
    user_id: uid,
    first_name: (a.name ?? '').trim(),
    employment_status: (a.status as EmploymentStatus) ?? null,
    birth_month: toInt(a.birthMonth),
    birth_year: toInt(a.birthYear),
    target_retirement_age: toInt(a.targetRetirementAge),
    plan_to_age: toInt(a.horizonAge),                 // captured for retired/decumulation; null otherwise
    retire_country: (a.retLocation ?? null) || null,
    has_partner: a.hasPartner === 'yes',
    partner_name: (a.partnerName ?? null) || null,
    dependents_count: toInt(a.dependentsCount) ?? 0,
  };
}
