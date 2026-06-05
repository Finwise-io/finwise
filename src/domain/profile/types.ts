import type { UserId } from '../_shared/ids';

export type EmploymentStatus = 'employed' | 'retired' | 'partial' | 'student';

/** Profile domain (spec service 0 — added in review). Owns the planning parameters
 *  every other module reads: who the user is and their retirement horizon. Holds NO
 *  balances, income, or goals — only identity + planning context. */
export interface Profile {
  user_id: UserId;
  first_name: string;
  employment_status: EmploymentStatus | null;
  birth_month: number | null;          // 1–12
  birth_year: number | null;
  target_retirement_age: number | null;
  plan_to_age: number | null;          // longevity horizon (default applied if null)
  retire_country: string | null;       // for cost-of-living scaling
  has_partner: boolean;
  partner_name: string | null;
  dependents_count: number;
  last_updated?: any;                  // Firestore serverTimestamp
}

/** Public read-model: the profile plus derived planning values other modules consume. */
export interface ProfileReadModel extends Profile {
  current_age: number | null;
  years_to_retirement: number | null;  // 0 if already at/over target
  retirement_horizon_years: number | null; // years the money must last (retire → plan_to_age)
}

export const DEFAULT_PLAN_TO_AGE = 90;
