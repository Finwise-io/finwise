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
   *  a home with no mortgage. A mortgage in Debts on no property yet, beside a Rent / Mortgage line, is taken as the home's
   *  (2026-10-25, the lead's ruling on DEC-1923 / DEC-2440) until the person places it. */
  homeMortgage: string | null;
  /** THE BUDGET LINES THAT ARE A DEBT IN DEBTS (2026-10-25, FIX-MONTH; DEC-1923 "any debt"): the budget's own "Debt payment" line
   *  and a line named as a debt is, not counted — each with what was budgeted on it and the debt that stands for it. */
  debtLinesInDebts: { label: string; budgeted: number; debt: string }[];
  /** WHAT IS LOGGED UNDER A LINE THAT STOOD DOWN IS A PAYMENT ON ITS DEBT (2026-10-25, FIX-MONTH; the lead's ruling: the mortgage
   *  counted once, planned AND actual): each stood-down line's category, and the debt it is paid on. expensesAsCounted reads it. */
  paidOnDebts: { category: string; debtId: string | null; debt: string }[];
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
 *     debts = input.debts (or none when missing)
 *     budgeted = cats.reduce((t: number, c: any) => (id = 'rent' ? t + (number(amount) or 0) : t), 0)
 *     uses = property uses(input.accounts ?? [], array.is array(profile.rentals) ? profile.rentals : [])
 *     home = the first of [...uses].find(([, use]) => use = 'home')?.
 *     placed = mortgages by property(input.accounts ?? [], debts)
 *     on home = placed.by property.find((p) => property id = home)   if home
 *     undefined   otherwise
 *     placed home = string(on home.mortgage ?? 'your mortgage')   if on home.mortgage id
 *     nothing   otherwise
 *     placed home id = string(on home.mortgage id)   if on home.mortgage id
 *     nothing   otherwise
 *     unplaced = the first of placed.unmatched   if !placed home and budgeted > 0
 *     undefined   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-237 LATER
 *               MK-CF-O-010 theMonth · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 438 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-241 M
 *               … and 420 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-078 the debt a logged debt payment was paid on
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-020
 * Changed ..... 2026-10-05 (50cafc5)
 */
export function theBudgetCounted(input: { profile: any; accounts: AssetAccount[]; debts: Debt[] }): BudgetCounted {
  const profile = input.profile ?? {};
  const cats = Array.isArray(profile.spendCats) ? profile.spendCats : [];
  const debts = input.debts ?? [];
  const budgeted = cats.reduce((t: number, c: any) => (c?.id === 'rent' ? t + (Number(c?.amount) || 0) : t), 0);
  // the profile is here, so its rent entries are known — none recorded is an empty list, not 'not told'
  // (OpenAI review, 2026-10-09): a stored 'rental' with no rent entry is a second home, his rule DEC-1926
  const uses = propertyUses(input.accounts ?? [], Array.isArray(profile.rentals) ? profile.rentals : []);
  const home = [...uses].find(([, use]) => use === 'home')?.[0];
  const placed = mortgagesByProperty(input.accounts ?? [], debts);
  const onHome = home ? placed.byProperty.find((p) => p.propertyId === home) : undefined;
  const placedHome = onHome?.mortgageId ? String(onHome.mortgage ?? 'your mortgage') : null;
  const placedHomeId = onHome?.mortgageId ? String(onHome.mortgageId) : null;
  // A MORTGAGE ON NO PROPERTY YET, BESIDE A RENT / MORTGAGE LINE, IS COUNTED ONCE (2026-10-25, the lead's ruling on CFR-5's open
  // question; his DEC-1923 and DEC-2440): it was counted twice — September planned −$2,400 of mortgage and −$2,300 of "Rent /
  // Mortgage", +$1,150 where +$3,450 is the month. The line is taken as that mortgage and stands down, and the sentence asks the
  // person to place the mortgage on their home. Placed on a property that is not the home, the line is rent again.
  // WHERE A MORTGAGE SITS IS NET WORTH'S ONE READING (MK-NW-F-106): since 2026-10-27 (FX-NW) a mortgage is on a property only
  // where the person put it, so a lone mortgage is no longer placed on the one free property by guess (the lead's R3 on CF2-13:
  // that guess brought the Rent / Mortgage line back beside it, +$650 where +$2,950 is the month). This reads placement from there only.
  const unplaced = !placedHome && budgeted > 0 ? placed.unmatched[0] : undefined;
  const homeMortgage = placedHome ?? (unplaced ? unplaced.label : null);
  const rentDown = !!homeMortgage && budgeted > 0;
  // A BUDGET LINE THAT IS A DEBT IN DEBTS IS NOT COUNTED (2026-10-25, FIX-MONTH; DEC-1923 "mortgage or any debt — the app deduct
  // it directly … instead of leaving it for user to add it to planned expenses"; CFR-2, MK-CF-O-020-C05): a $250 car loan in Debts
  // and a $250 "Car loan" budget line planned $500 of outflow. The budget's own "Debt payment" line (id debt) stands down while
  // Debts holds any debt; any other line stands down when it is named as a debt in Debts is ("Car loan", or "Car loan payment").
  const key = (v: unknown) => String(v ?? '').trim().toLowerCase();
  const debtOf = (c: any) => debts.find((x) => key(x.label) !== '' && (key(c?.label) === key(x.label) || key(c?.label) === `${key(x.label)} payment`));
  const debtFor = (c: any): string | null => {
    if (!(Number(c?.amount) > 0) || c?.id === 'rent') return null;
    if (c?.id === 'debt') return debts.length ? 'your debts' : null;
    const d = debtOf(c);
    return d ? String(d.label) : null;
  };
  const debtLinesInDebts = cats.map((c: any) => ({ c, debt: debtFor(c) })).filter((x: any) => x.debt)
    .map((x: any) => ({ label: String(x.c.label ?? 'Debt payment'), budgeted: Number(x.c.amount) || 0, debt: x.debt as string }));
  if (!rentDown && debtLinesInDebts.length === 0) return { profile, rentLineInDebts: null, sentence: '', homeMortgage, debtLinesInDebts, paidOnDebts: [] };
  // what is logged under each line that stood down is a payment on its debt — the budget's own "Debt payment" category already is one
  const rentCat = cats.find((c: any) => c?.id === 'rent');
  const paidOnDebts = [
    ...(rentDown ? [{ category: String(rentCat?.label ?? 'Rent / Mortgage'), debtId: placedHomeId ?? (unplaced ? unplaced.id : null), debt: homeMortgage! }] : []),
    ...cats.filter((c: any) => c?.id !== 'debt' && debtFor(c)).map((c: any) => ({ category: String(c.label), debtId: String(debtOf(c)!.debt_id), debt: String(debtOf(c)!.label) })),
  ];
  const downIds = new Set(cats.filter((c: any) => (rentDown && c?.id === 'rent') || debtFor(c)).map((c: any) => c));
  const stoodDown = (rentDown ? budgeted : 0) + debtLinesInDebts.reduce((t: number, x: any) => t + x.budgeted, 0);
  const typedTotal = Number(String(profile.monthlySpending ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const sentences = [
    ...(rentDown ? [unplaced
      ? unplacedMortgageSentence(homeMortgage!)
      : `Your Rent / Mortgage budget line is not counted here: your home’s mortgage, ${homeMortgage}, is in Debts and is counted from there.`] : []),
    ...debtLinesInDebts.map((x: any) => (x.debt === 'your debts'
      ? `Your ${x.label} budget line is not counted here: your debts are in Debts and are counted from there.`
      : `Your ${x.label} budget line is not counted here: ${x.debt} is in Debts and is counted from there.`)),
  ];
  return {
    homeMortgage,
    // each line goes to nothing — and so does its share of the one typed total, where there is one:
    // that total was typed with the debt in it, and would otherwise put it straight back
    profile: { ...profile, spendCats: cats.map((c: any) => (downIds.has(c) ? { ...c, amount: 0 } : c)),
      monthlySpending: typedTotal > 0
        ? (typeof profile.monthlySpending === 'number' ? Math.max(0, typedTotal - stoodDown) : String(Math.max(0, typedTotal - stoodDown)))
        : profile.monthlySpending,
      // carried on the counted profile, so the month's readers (thisMonthInputs) apply them without another argument: what was
      // logged under a line that stood down, and that a budget WAS entered even when every line of it is a debt (budgetEntered)
      paidOnDebts, budgetEnteredAsTyped: true },
    rentLineInDebts: rentDown ? { budgeted, mortgage: homeMortgage! } : null,
    sentence: sentences.join(' '),
    debtLinesInDebts,
    paidOnDebts,
  };
}

/** What it is for: THE EXPENSES LOGGED THIS MONTH, AS THE BUDGET COUNTS THEM (2026-10-25, FIX-MONTH; the lead's ruling: a debt
 *  counted from Debts is counted once on the plan AND on what has happened, DEC-1923 / DEC-2440). An expense logged under a budget
 *  line that stood down for a debt — "Rent / Mortgage" beside the home's mortgage, or "Car loan" beside the car loan — is that debt's
 *  payment: it is read as a debt payment on that debt (by its id), so This month shows the mortgage paid, the budget editor does not
 *  count it as spent against a plan that no longer holds it, and Home's box reads the same. Nothing changes when no line stood down.
 *  Worked by hand (the worked September): $2,300 logged as "Rent / Mortgage", a $2,400 mortgage in Debts on no property → the
 *  $2,300 is the mortgage's payment; spent against the $1,100 plan is $512 + $186 = $698, $402 left (it read $2,998, $1,898 over). */
/* ─ MK-CF-F-246 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * expensesAsCounted
 *
 * Answers ..... What it is for: THE EXPENSES LOGGED THIS MONTH, AS THE BUDGET COUNTS THEM (2026-10-25, FIX-MONTH; the lead's ruling: a debt counted from Debts is counted once on the plan AND on what has happened, DEC-1923 / DEC-2440).
 *
 * Formula .....
 *     on = counted.paid on debts   if array.is array(counted.paid on debts)
 *     []   otherwise
 *     (expenses ?? []) as T[]   when count of on is missing
 *     by cat = a lookup of for each of on: [category.trim().to lower case(), each]
 *     x = by cat.get(string(category ?? '').trim().to lower case())
 *     the answer:
 *     { ...e, category: 'debt payment', store: debt, ...(debt id ? { debt id: debt id } : {}) } as T   if x
 *     e   otherwise
 *
 * Called by ... MK-CF-F-157 debtPaymentsByDebt · MK-CF-O-010 theMonth
 *
 * Reaches ..... 438 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-241 M
 *               … and 420 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-078 the debt a logged debt payment was paid on
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-246
 * Changed ..... not in git yet (—)
 */
export function expensesAsCounted<T extends { category?: string; store?: string }>(expenses: T[] | null | undefined, counted: any): T[] {
  const on: { category: string; debtId: string | null; debt: string }[] = Array.isArray(counted?.paidOnDebts) ? counted.paidOnDebts : [];
  if (!on.length) return (expenses ?? []) as T[];
  const byCat = new Map(on.map((x) => [x.category.trim().toLowerCase(), x]));
  return (expenses ?? []).map((e) => {
    const x = byCat.get(String(e?.category ?? '').trim().toLowerCase());
    return x ? ({ ...e, category: 'Debt payment', store: x.debt, ...(x.debtId ? { debtId: x.debtId } : {}) } as T) : e;
  });
}

/** What it is for: THE SENTENCE FOR A MORTGAGE IN DEBTS THAT IS ON NO HOME YET, beside a Rent / Mortgage budget line (2026-10-25,
 *  the lead's ruling on DEC-1923 / DEC-2440): the mortgage is counted once, from the debt's payment, and the person is told to
 *  place it on their home so the two are known to be one. Written by CF-MMFIX-A (the words); theBudgetCounted returns it as its
 *  `sentence` when it stands the line down for such a mortgage (FIX-MONTH, the figures). Every screen that shows the budget
 *  already prints that sentence. */
/* ─ MK-CF-F-247 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unplacedMortgageSentence
 *
 * Answers ..... What it is for: THE SENTENCE FOR A MORTGAGE IN DEBTS THAT IS ON NO HOME YET, beside a Rent / Mortgage budget line (2026-10-25, the lead's ruling on DEC-1923 / DEC-2440): the mortgage is counted once, from the debt's payment, and the person is told to place it on their home so the two are known to be one.
 *
 * Formula .....
 *     `your rent ÷ mortgage budget line is not counted here: your mortgage, ${mortgage}, is in debts and is counted from there. place it on your home in net worth, so we know they are the same.`
 *
 * Called by ... MK-CF-O-020 theBudgetCounted
 *
 * Reaches ..... 438 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-241 M
 *               … and 420 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-247
 * Changed ..... not in git yet (—)
 */
export function unplacedMortgageSentence(mortgage: string): string {
  return `Your Rent / Mortgage budget line is not counted here: your mortgage, ${mortgage}, is in Debts and is counted from there. Place it on your home in Net worth, so we know they are the same.`;
}
