// Typed shape of the consolidated onboarding answers (`onboardingProfile`, read as `op`/`a` across
// the domain). All fields optional — onboarding is progressive. Amount fields are `Money` because
// TextInputs produce strings while tests/seed data use numbers; `toNum()` coerces either way.
// No index signature on purpose: a typo like `op.slaryByMonth` is a compile error. The one dynamic
// access (`a['ri_'+k]`) is cast locally.
export type Money = string | number;
export type RiFreq = 'monthly' | 'quarterly' | 'annual';

export interface ScholarshipEntry { label?: string; amount?: Money; freq?: 'annual' | 'monthly'; months?: number[]; day?: Money; year?: Money }
export interface LoanEntry { label?: string; amount?: Money; months?: number[]; day?: Money; year?: Money; apr?: Money; termYears?: Money }
export interface RentalEntry { type?: 'long' | 'short'; income?: Money; expenses?: Money }
export interface RsuGrant { shares?: Money; price?: Money; date?: string }
export interface SpendCat { id: string; label?: string; tier?: 'critical' | 'important' | 'flex'; bucket?: 'fixed' | 'nonmonthly' | 'flexible'; unit?: 'dollar' | 'pct'; amount?: Money; months?: number[]; dueDay?: Money; custom?: boolean }
export interface GoalEntry { label?: string; target?: Money; year?: Money }

export interface OnboardingProfile {
  // meta
  status?: string; tracks?: string[]; name?: string;
  // employment / salary
  incomeSources?: string[]; salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly'; baseSalary?: Money;
  hoursPerWeek?: Money; salaryMode?: 'gross' | 'takehome'; salaryByMonth?: Money[]; salaryMonthMode?: 'same' | 'months';
  tipsMonthly?: Money; whoEarns?: 'you' | 'partner' | 'both';
  // bonus / equity
  bonusAnnual?: Money; bonusMonth?: Money; signingOnetime?: Money;
  equityType?: 'rsu' | 'option'; rsuGrants?: RsuGrant[]; rsuShares?: Money; rsuPrice?: Money; optStrike?: Money; optMarket?: Money;
  // 401(k)
  c_401k?: Money; employerMatchValue?: Money; employerMatchMode?: 'pct' | 'dollar';
  // other income
  rentals?: RentalEntry[]; rentalType?: 'long' | 'short'; rentalIncome?: Money; rentalExpenses?: Money;
  seAmount?: Money; seFreq?: 'annual' | 'monthly'; invAnnual?: Money;
  otherAmount?: Money; otherFreq?: 'monthly' | 'annual' | 'onetime'; otherLabel?: string;
  otherMonth?: Money; otherTaxable?: 'yes' | 'no';   // one-time landing month (1-12); gifts = not taxable
  benefitMonthly?: Money; benefitTypes?: string[]; benefitMonths?: number[]; supportMonthly?: Money;
  scholarships?: ScholarshipEntry[]; scholarshipAmount?: Money; scholarshipFreq?: 'annual' | 'monthly'; loans?: LoanEntry[];
  // retirement income (also accessed dynamically as ri_<key> / ri_<key>_freq)
  ri_ss?: Money; ri_pension?: Money; ri_withdrawals?: Money; ri_rmd?: Money; ri_annuities?: Money; ri_other?: Money;
  ri_ss_freq?: RiFreq; ri_pension_freq?: RiFreq; ri_withdrawals_freq?: RiFreq; ri_rmd_freq?: RiFreq; ri_annuities_freq?: RiFreq; ri_other_freq?: RiFreq;
  // tax
  taxMode?: 'system' | 'manual'; manualTaxRate?: Money;
  // spending
  monthlySpending?: Money; spendCats?: SpendCat[]; savingsByMonth?: Money[]; savingsMode?: 'auto' | 'custom';
  b_fixed?: Money; b_nonmonthly?: Money; b_flexible?: Money;
  // retirement plan
  birthYear?: Money; birthMonth?: Money; currentRetirementSavings?: Money; currentRetirementSavingsRoth?: Money;
  c_roth?: Money; c_invest?: Money; c_property?: Money; c_touched?: boolean;
  investRaw?: Money; investUnit?: 'dollar' | 'pct';   // what the user typed on the save-plan screen
  targetRetirementAge?: Money; expectedRetirementSpending?: Money; horizonAge?: Money; currentSavingsPortfolio?: Money;
  retLocation?: string; travelBudget?: Money; medicalBudget?: Money; spendingChangeLater?: 'same' | 'less' | 'more';
  // investments
  investObjective?: 'pnl' | 'networth'; trackingLevel?: 'account' | 'asset' | 'holding'; investmentHoldings?: Money;
  // goals / household / debt / legacy
  goals?: GoalEntry[]; monthlySavingsCapacity?: Money;
  hasPartner?: 'yes' | 'no'; partnerName?: string; inviteCode?: string; dependentsCount?: Money;
  debtName?: string; debtBalance?: Money; debtRate?: Money; debtPayment?: Money; legacyTarget?: Money;
}
