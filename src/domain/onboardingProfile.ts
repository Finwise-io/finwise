// Typed shape of the consolidated onboarding answers (`onboardingProfile`, read as `op`/`a` across
// the domain). All fields optional — onboarding is progressive. Amount fields are `Money` because
// TextInputs produce strings while tests/seed data use numbers; `toNum()` coerces either way.
// No index signature on purpose: a typo like `op.slaryByMonth` is a compile error. The one dynamic
// access (`a['ri_'+k]`) is cast locally.
export type Money = string | number;
export type RiFreq = 'monthly' | 'quarterly' | 'annual';

export interface ScholarshipEntry { label?: string; amount?: Money; freq?: 'annual' | 'monthly'; months?: number[]; day?: Money; year?: Money }
export interface LoanEntry { label?: string; amount?: Money; months?: number[]; day?: Money; year?: Money; apr?: Money; termYears?: Money }
// property_id: the property in Net worth the rent is for — an entry with none is not counted as rent (DEC-4059d, 2026-10-10)
export interface RentalEntry { type?: 'long' | 'short'; income?: Money; expenses?: Money; property_id?: string; mortgage?: Money }
export interface RsuGrant { shares?: Money; price?: Money; date?: string }
export interface SpendCat { id: string; label?: string; tier?: 'critical' | 'important' | 'flex'; bucket?: 'fixed' | 'nonmonthly' | 'flexible'; unit?: 'dollar' | 'pct'; amount?: Money; months?: number[]; dueDay?: Money; custom?: boolean }
export interface GoalEntry { label?: string; target?: Money; year?: Money }

export interface OnboardingProfile {
  // meta
  status?: string; tracks?: string[]; name?: string;
  // employment / salary
  incomeSources?: string[]; salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly'; baseSalary?: Money;
  hoursPerWeek?: Money; salaryMode?: 'gross' | 'takehome';
  /** Month key ('2026-07') → amount. Was twelve positional slots meaning Jan–Dec, which could not
   *  describe a window crossing a year boundary; an array is still READ, as the current year. */
  salaryByMonth?: Record<string, Money> | Money[];
  salaryMonthMode?: 'same' | 'months';
  tipsMonthly?: Money; whoEarns?: 'you' | 'partner' | 'both';
  /** The spouse’s wage, under the SAME field names as the person's own, so every function that
   *  reads a wage works on either block unchanged. Until 2026-08-27 whoEarns:'both' tagged ONE
   *  salary as belonging to two people and there was nowhere to put the second — finding B32. */
  partnerWage?: import('./income/earners').EarnerWage;
  // bonus / equity
  bonusAnnual?: Money; bonusMonth?: Money; signingOnetime?: Money;
  equityType?: 'rsu' | 'option'; rsuGrants?: RsuGrant[]; rsuShares?: Money; rsuPrice?: Money; optStrike?: Money; optMarket?: Money;
  // 401(k)
  c_401k?: Money; employerMatchValue?: Money; employerMatchMode?: 'pct' | 'dollar';
  // other income
  rentals?: RentalEntry[];
  /** @deprecated the old single rent figure — read only by the one-time move into `rentals` (src/domain/income/old-rent-migration.ts). */
  rentalType?: 'long' | 'short'; rentalIncome?: Money; rentalExpenses?: Money;
  seAmount?: Money; seFreq?: 'annual' | 'monthly'; invAnnual?: Money;
  otherAmount?: Money; otherFreq?: 'monthly' | 'annual' | 'quarterly' | 'onetime';   // quarterly + dated one-time: F2 (approved v1.1)
  otherIncomeYear?: number | string;   // year for dated one-time/annual other income (F2 dated grid)
  otherLabel?: string;
  otherMonth?: Money; otherTaxable?: 'yes' | 'no';   // one-time landing month (1-12); gifts = not taxable
  benefitMonthly?: Money; benefitTypes?: string[]; benefitMonths?: number[]; supportMonthly?: Money;
  scholarships?: ScholarshipEntry[]; scholarshipAmount?: Money; scholarshipFreq?: 'annual' | 'monthly'; loans?: LoanEntry[];
  // retirement income (also accessed dynamically as ri_<key> / ri_<key>_freq)
  ri_ss?: Money; ri_pension?: Money; ri_withdrawals?: Money; ri_rmd?: Money; ri_annuities?: Money; ri_other?: Money;
  ri_ss_freq?: RiFreq; ri_pension_freq?: RiFreq; ri_withdrawals_freq?: RiFreq; ri_rmd_freq?: RiFreq; ri_annuities_freq?: RiFreq; ri_other_freq?: RiFreq;
  // tax
  taxMode?: 'system' | 'manual'; manualTaxRate?: Money;
  /** Do the interest and dividends actually reach the bank? They are taxed either way. Left
   *  unanswered they are treated as REINVESTED, which is what they are in most accounts —
   *  counted as income you are taxed on, never as money you can spend. Mock income-v5, 3c. */
  invPaidToBank?: 'yes' | 'no';
  // expenses
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
  /** How you file, and — on a joint return only — which of you is 65 or older. Being 65+ adds
   *  to the standard deduction ($1,650 each on a joint return); we know the person's birth
   *  year and have never known their spouse’s, so a couple is asked. */
  filingStatus?: import('./income/tax').FilingStatus;
  over65Who?: 'me' | 'both' | 'neither';
  debtName?: string; debtBalance?: Money; debtRate?: Money; debtPayment?: Money; legacyTarget?: Money;
  /** MK-XS-I-061 — the pre-tax balance on 31 December of last year, typed by the person. The law
   *  bases this year's required withdrawal on that balance (Treas. Reg. §1.401(a)(9)-5); when it is
   *  not entered the app uses today's balance and says so (founder ruling 2026-09-08, G8). */
  rmdPriorYearEndPreTax?: Money;
  /** MK-XS-I-062 — whether the person is enrolled in Medicare. Enrolled → no HSA contribution is
   *  allowed (IRS Publication 969); founder ruling 2026-09-08 (G10). */
  medicareEnrolled?: 'yes' | 'no';
}
