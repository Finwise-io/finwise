// Cash flow · What of the budget is counted — once a mortgage is in Debts, it is counted from Debts.
//
// HIS RULE, 2026-10-04 (DEC-1923): "Once user enters mortgage or any debt - the app deduct it directly
// to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to
// planned expenses."
//
// THE ONE PLACE A DEBT COULD ALSO BE TYPED AS A PLANNED EXPENSE is the budget's "Rent / Mortgage" line.
// A homeowner who typed the mortgage there AND has it in Debts was counted twice in Cash flow's
// planned surplus, and the emergency fund avoided that by leaving the mortgage out of the debts
// instead — so the two disagreed, and a home budgeted but never logged was counted in neither part.
// Now Debts wins everywhere: when the home lived in has a mortgage in Debts, the Rent / Mortgage line
// is not counted, and the screen says so. A renter's line is rent, and is counted as it always was.
import { mortgagesByProperty, propertyUses } from '../networth-and-performance/net-worth';
import type { AssetAccount } from '../../../src/domain/assets';
import type { Debt } from '../../../src/domain/debt';

export interface BudgetCounted {
  /** The profile to hand to every planned-expenses figure: the person's own, with the Rent /
   *  Mortgage line at nothing when the home's mortgage is counted from Debts. */
  profile: any;
  /** Set when that line is not counted: what was budgeted on it, and the mortgage that stands for it. */
  rentLineInDebts: { budgeted: number; mortgage: string } | null;
  /** The sentence a screen shows when the line is not counted. Empty when it is. */
  sentence: string;
  /** The name of the mortgage on the home lived in, when Debts holds one. Null for a renter, and for
   *  a home with no mortgage. */
  homeMortgage: string | null;
}

/** Which of my planned expenses are counted, now that my debts are taken from Debts?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-020 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theBudgetCounted
 *
 * Answers ..... Which of my planned expenses are counted, now that my debts are taken from Debts?
 *
 * Formula .....
 *     profile = input.profile (or none when missing)
 *     cats = profile.spend cats   if array.is array(profile.spend cats)
 *     []   otherwise
 *     budgeted = cats.reduce((t: number, c: any) => (id = 'rent' ? t + (number(amount) or 0) : t), 0)
 *     uses = property uses(input.accounts ?? [], array.is array(profile.rentals) ? profile.rentals : [])
 *     home = the first of [...uses].find(([, use]) => use = 'home')?.
 *     on home = mortgages by property(input.accounts ?? [], input.debts ?? []).by property.find((p) => property id = home)   if home
 *     undefined   otherwise
 *     home mortgage = string(on home.mortgage ?? 'your mortgage')   if on home.mortgage id
 *     nothing   otherwise
 *     typed total = string(profile.monthly expenses ?? '').replace( ÷ [^0 − 9.-] ÷ g, '') read as a number (or 0 when missing or zero)
 *     profile = profile
 *     rent line in debts = nothing
 *     sentence = ''
 *     home mortgage = home mortgage   when home mortgage is missing (or not (budgeted > 0) when missing or zero)
 *
 * Called by ... MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 55 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-F-082 NW
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 37 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-020
 * Changed ..... 2026-10-05 (50cafc5)
 */
export function theBudgetCounted(input: { profile: any; accounts: AssetAccount[]; debts: Debt[] }): BudgetCounted {
  const profile = input.profile ?? {};
  const cats = Array.isArray(profile.spendCats) ? profile.spendCats : [];
  const budgeted = cats.reduce((t: number, c: any) => (c?.id === 'rent' ? t + (Number(c?.amount) || 0) : t), 0);
  // the profile is here, so its rent entries are known — none recorded is an empty list, not 'not told'
  // (OpenAI review, 2026-10-09): a stored 'rental' with no rent entry is a second home, his rule DEC-1926
  const uses = propertyUses(input.accounts ?? [], Array.isArray(profile.rentals) ? profile.rentals : []);
  const home = [...uses].find(([, use]) => use === 'home')?.[0];
  const onHome = home ? mortgagesByProperty(input.accounts ?? [], input.debts ?? []).byProperty.find((p) => p.propertyId === home) : undefined;
  const homeMortgage = onHome?.mortgageId ? String(onHome.mortgage ?? 'your mortgage') : null;
  const typedTotal = Number(String(profile.monthlySpending ?? '').replace(/[^0-9.-]/g, '')) || 0;
  if (!homeMortgage || !(budgeted > 0)) return { profile, rentLineInDebts: null, sentence: '', homeMortgage };
  return {
    homeMortgage,
    // the line goes to nothing — and so does its share of the one typed total, where there is one:
    // that total was typed with the mortgage in it, and would otherwise put it straight back
    profile: { ...profile, spendCats: cats.map((c: any) => (c?.id === 'rent' ? { ...c, amount: 0 } : c)),
      monthlySpending: typedTotal > 0
        ? (typeof profile.monthlySpending === 'number' ? Math.max(0, typedTotal - budgeted) : String(Math.max(0, typedTotal - budgeted)))
        : profile.monthlySpending },
    rentLineInDebts: { budgeted, mortgage: homeMortgage },
    sentence: `Your Rent / Mortgage budget line is not counted here: your home’s mortgage, ${homeMortgage}, is in Debts and is counted from there.`,
  };
}
