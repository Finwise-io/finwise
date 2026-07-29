import type { UserId, EntityId } from '../_shared/ids';

export type Frequency = 'ONETIME' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type IncomeType =
  | 'W2_JOB' | 'LONG_TERM_RENTAL' | 'SHORT_TERM_RENTAL'
  | 'SELF_EMPLOYMENT' | 'INVESTMENT' | 'BENEFIT' | 'SUPPORT' | 'SCHOLARSHIP'
  | 'OTHER';
export type WhoEarns = 'you' | 'partner' | 'both';

/** One income stream (spec Table 2). Rentals carry operating_expenses. */
export interface IncomeSource {
  income_source_id: EntityId;
  label?: string;
  income_type: IncomeType;
  gross_amount: number;            // per the frequency period
  frequency: Frequency;
  operating_expenses: number;      // per period (rentals); 0 for jobs
  who_earns?: WhoEarns;
  employer_match_amount?: number;  // employer adds, per period (W2) — gap-fix for the goals waterfall
  landing_month?: number;          // 1-12 — where an ANNUAL/ONETIME item actually lands (the user's
                                   // chosen month); without it the grids disagreed on WHEN (PRD F2 #16)
  landing_months?: { month: number; share: number }[];   // multi-month ANNUAL lands (equity vesting:
                                   // Mar 0.5 + Sep 0.5) — shares sum to 1; wins over landing_month
}

/** Per-user tax handling (spec: tax config flag + manual override). */
export interface TaxProfile {
  use_manual_tax_override: boolean;
  manual_effective_tax_rate: number | null;  // 0–1
}

/** What the module persists: the list of sources + tax handling. */
export interface IncomeDoc {
  user_id: UserId;
  sources: IncomeSource[];
  tax: TaxProfile;
  last_updated?: any;
}

export interface MonthlyCell { month: number; gross: number; net: number; }

/** Public read-model (spec IncomeState). */
export interface IncomeState {
  user_id: UserId;
  total_gross_annual: number;
  total_net_annual: number;
  effective_tax_rate: number;
  net_monthly_income: number;            // total_net_annual / 12 (the smoothed baseline)
  monthly_cash_flow_grid: MonthlyCell[]; // 12 cells
  employer_match_annual: number;         // surfaced for the goals waterfall
}

export const DEFAULT_TAX: TaxProfile = { use_manual_tax_override: false, manual_effective_tax_rate: null };
