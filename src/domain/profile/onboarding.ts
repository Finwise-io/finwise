// Maps the onboarding answers (already captured by src/onboarding) into a Profile.
// This is how onboarding data flows into the domain modules (blueprint §5).
import type { UserId } from '../_shared/ids';
import { Profile, EmploymentStatus } from './types';

/* ─ MK-XS-F-131 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * toInt
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     n = parse int(string(v ?? '').replace( ÷ [^0 − 9] ÷ g, ''), 10)
 *     the answer:
 *     n   if number.is finite(n)
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-026 profileFromOnboarding
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-026 profileFromOnboarding
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-131
 * Changed ..... not in git yet (—)
 */
const toInt = (v: any): number | null => {
  const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

/** `op` is the consolidated onboardingProfile: { status, name, ...answers }. */
/* ─ MK-XS-F-026 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * profileFromOnboarding
 *
 * Answers ..... `op` is the consolidated onboardingProfile: { status, name, ...answers }.
 *
 * Formula .....
 *     a = op (or none when missing)
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-018 retirement age
 *               MK-XS-I-045 where they will live in retirement
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-026
 * Changed ..... 2026-06-05 (f742136)
 */
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
