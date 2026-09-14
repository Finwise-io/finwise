/**  THE TAKE-HOME MODE, CONVERTED ONCE AND RETIRED.
 *
 *  `salaryMode: 'takehome'` let someone enter their pay as the amount that reaches the bank. The app
 *  then INVERTED the tax schedule to find a gross that would produce it — a guess laid on top of an
 *  estimate, and the only reason grossFromNet exists.
 *
 *  The approved base-pay screen asks differently: gross AND the take-home, as two figures that must
 *  reconcile. So the mode has nothing left to do — but a profile saved before today may still carry
 *  it, and reading that number as gross would overstate someone's income by their whole tax bill.
 *
 *  So it is converted, once, by the only honest reading of what they told us: the number they typed
 *  IS their take-home. Their gross is worked back through the same schedule that used to do
 *  it silently — and from then on both figures are on record and the screen can check them.
 *
 *  This is the last caller of grossFromNet. When no stored profile carries the mode, both go.
 */
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';
import { grossFromNet } from './tax';
import { filingStatusOf, over65CountOf } from './onboarding';

const PERIODS: Record<string, number> = { hourly: 12, weekly: 52, biweekly: 26, monthly: 12 };

/** True when this profile still holds a pre-2026-08-28 take-home entry. */
/* ─ MK-CF-F-185 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * needsTakeHomeConversion
 *
 * Answers ..... True when this profile still holds a pre-2026-08-28 take-home entry.
 *
 * Formula .....
 *     (op as any).salary mode = 'takehome' and to num((op as any).base salary) > 0
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-186 convertTakeHomeMode
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-185
 * Changed ..... not in git yet (—)
 */
export function needsTakeHomeConversion(op: OnboardingProfile | null): boolean {
  return (op as any)?.salaryMode === 'takehome' && toNum((op as any)?.baseSalary) > 0;
}

/** Convert it. What they typed becomes what LANDS; the gross is worked back once and stored. */
/* ─ MK-CF-F-186 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * convertTakeHomeMode
 *
 * Answers ..... Convert it. What they typed becomes what LANDS; the gross is worked back once and stored.
 *
 * Formula .....
 *     op   when !needs take home conversion(op as any)
 *     periods = PERIODS[string(op.salary freq ?? 'monthly')] (or 12 when missing)
 *     net per period = op.base salary read as a number (0 when it is not one)
 *     net annual = net per period × periods
 *     gross annual = gross from net(net annual, filing status of(op as any), over65 count of(op as any))
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-NW-F-044 getAssetsState · MK-CF-F-041 getDebtState
 *               MK-CF-F-052 getIncomeState · MK-XS-F-023 getProfileReadModel
 *               MK-ST-F-041 getUserDoc · MK-PL-F-013 goalsFromOnboarding
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-186
 * Changed ..... not in git yet (—)
 */
export function convertTakeHomeMode<T extends Record<string, any>>(op: T): T {
  if (!needsTakeHomeConversion(op as any)) return op;
  const periods = PERIODS[String(op.salaryFreq ?? 'monthly')] ?? 12;
  const netPerPeriod = toNum(op.baseSalary);
  const netAnnual = netPerPeriod * periods;
  const grossAnnual = grossFromNet(netAnnual, filingStatusOf(op as any), over65CountOf(op as any));
  return {
    ...op,
    baseSalary: String((grossAnnual / periods)),   // gross, as every other screen assumes
    landsTypical: String(netPerPeriod),                  // what they actually told us
    salaryMode: 'gross',
  };
}
