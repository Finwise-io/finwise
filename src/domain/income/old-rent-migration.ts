/**  THE OLD SINGLE RENT FIGURE, MOVED ONCE INTO THE RENT LIST.
 *
 *  Rent used to be one figure on the profile — `rentalIncome`, with `rentalExpenses` and `rentalType`
 *  beside it. Rent is a list now (`rentals`), one entry for each property, and nothing writes the old
 *  figure any more. The app is not launched, but a test profile saved before the change can still carry it.
 *
 *  So the old figure is moved, once, into the list: one entry, exactly as typed, that names NO
 *  property. By DEC-4059d (2026-10-10) an entry with no property is not rent until a property is
 *  picked: it is counted nowhere, the Income screen asks "Which property is it?" in amber, and the
 *  emergency fund says its rent is not included. That is what the old figure already meant — it never
 *  named a property — so the person sees the same thing, now with a way to fix it.
 *
 *  After the move the old fields are gone, so no function reads them again (the inputs-and-use audit,
 *  2026-10-11, Net worth: MK-NW-O-004 theEmergencyFund still read `rentalIncome`).
 *
 *  A profile that already has rent entries keeps them; its old figure is dropped, because the Income
 *  screen has shown only the entries since the list began. A rent list stored in a shape that cannot
 *  be read is left alone — nothing is thrown away that cannot be put somewhere.
 */

/* ─ MK-CF-F-216 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * typed
 *
 * Answers ..... THE OLD SINGLE RENT FIGURE, MOVED ONCE INTO THE RENT LIST.
 *
 * Formula .....
 *     v ≠ nothing and string(v).trim() ! = ''
 *
 * Called by ... MK-CF-F-067 rentalList · MK-CF-F-143 annualisedGross
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-190 essentialsMonthly
 *               MK-CF-F-218 moveOldRentFigure · MK-NW-F-009 maturityClass
 *               MK-NW-F-108 taxWordsOf · MK-NW-F-124 maturityParts
 *               MK-PL-F-044 planTarget
 *
 * Reaches ..... 228 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               … and 210 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-216
 * Changed ..... not in git yet (—)
 */
const typed = (v: unknown) => v != null && String(v).trim() !== '';

/** True when this profile still holds the old single rent figure. */
/* ─ MK-CF-F-217 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * hasOldRentFigure
 *
 * Answers ..... True when this profile still holds the old single rent figure.
 *
 * Formula .....
 *     false   when op is missing
 *     'rentalIncome' in op (or 'rentalExpenses' in op (or 'rentalType' in op when missing or zero) when missing or zero)
 *
 * Called by ... MK-CF-F-218 moveOldRentFigure
 *
 * Reaches ..... 54 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 36 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-217
 * Changed ..... not in git yet (—)
 */
export function hasOldRentFigure(op: Record<string, any> | null | undefined): boolean {
  if (!op) return false;
  return 'rentalIncome' in op || 'rentalExpenses' in op || 'rentalType' in op;
}

/** The profile with its old single rent figure moved into the rent list as an entry with no property. */
/* ─ MK-CF-F-218 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * moveOldRentFigure
 *
 * Answers ..... The profile with its old single rent figure moved into the rent list as an entry with no property.
 *
 * Formula .....
 *     op   when !has old rent figure(op)
 *     list = (op as any).rentals
 *     op   when list ≠ nothing and !array.is array(list)
 *     rest as T   when array.is array(list) and list.length > 0
 *     rest as T   when !typed(rental income) and !typed(rental expenses)
 *     entry = type = 'short'   if rental type = 'short'
 *     'long'   otherwise
 *     income = rental income   if typed(rental income)
 *     ''   otherwise
 *     expenses = rental expenses   if typed(rental expenses)
 *     ''   otherwise
 *     the answer = { ...rest, rentals: [entry] } as unknown as T
 *
 * Called by ... MK-XS-F-175 uid
 *
 * Reaches ..... 53 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 35 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-218
 * Changed ..... not in git yet (—)
 */
export function moveOldRentFigure<T extends Record<string, any>>(op: T): T {
  if (!hasOldRentFigure(op)) return op;
  const { rentalIncome, rentalExpenses, rentalType, ...rest } = op as Record<string, any>;
  const list = (op as any).rentals;
  if (list != null && !Array.isArray(list)) return op;   // a list that cannot be read: leave everything as it is
  if (Array.isArray(list) && list.length > 0) return rest as T;
  if (!typed(rentalIncome) && !typed(rentalExpenses)) return rest as T;
  const entry = { type: rentalType === 'short' ? 'short' : 'long', income: typed(rentalIncome) ? rentalIncome : '', expenses: typed(rentalExpenses) ? rentalExpenses : '' };
  return { ...rest, rentals: [entry] } as unknown as T;
}
