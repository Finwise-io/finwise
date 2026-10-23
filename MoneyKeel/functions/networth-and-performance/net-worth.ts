// Net worth · What am I worth — in total, by class, by institution, by tax bucket, and how it moved.
//
// THE DOOR for Q-NW-1, ruled by the founder 2026-09-27: "Yes - for home, NW tab, and insights."
//
// This is the question four screens were each answering for themselves. Home built its own net worth
// from its own assets state; the Net worth tab built another; Insights took cash and investable its
// own way; Alternatives took investable a third way. Four assemblies of one question is how two
// screens come to show two numbers for the same money — and on this question, of all of them, a
// person would see it immediately.
//
// WHAT THE DOOR REFUSES: it never invents a baseline. A change figure and a return need a day the
// record actually holds; with none, they are null and the screen says so rather than printing a
// movement from a day that was never recorded.
import { declareFigures } from '../_figure-spec';
import { formatMoney } from '../../../src/domain/_shared/money';
import type { AssetAccount } from '../../../src/domain/assets';
import {
  buildAssetsState, cashTotal, investableAssets, investmentsTotal, assetAllocation, isRealAsset, assetClassOf, accountClassBreakdown, ASSET_CLASS_LABEL,
  type AssetClass,
  propertyUseMap,
  accountInvestments,
} from '../../../src/domain/assets';
import { buildDebtState, requiredPayment, paymentShape, type Debt } from '../../../src/domain/debt';
import { simulate } from '../../../src/domain/retirement';
import { onCourseSentence, shortfallAgeFromBand, oddsLine } from '../../../src/domain/planning/hub';
import { displayOdds } from '../../../src/domain/retirement/willItLast';
import { buildNetWorth } from '../../../src/domain/networth';
import { trendPoints } from '../../../src/domain/history';
import { buildDayFromAccounts, record as recordDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn, movementsOf } from '../../../Calculation Module code/engines/time-weighted-return';
import { isoLocalDate } from '../../../src/domain/_shared/dates';

/** A DEBT WHOSE MONTHLY PAYMENT WAS NEVER ENTERED (2026-10-21, DEC-3523 tenet 3: unknown is not zero): neither a minimum
 *  nor a payment is on record as a number. A typed 0 is entered; a balance due in one lump has no monthly payment to
 *  enter. It is the one test the emergency fund and the Net worth door both name such a debt by.
 *  No identifier yet: the build issues one (its rule waits under awaiting_id in moneykeel_function_rules.json). */
/* ─ MK-NW-F-147 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paymentNotEntered
 *
 * Answers ..... A DEBT WHOSE MONTHLY PAYMENT WAS NEVER ENTERED (2026-10-21, DEC-3523 tenet 3: unknown is not zero): neither a minimum nor a payment is on record as a number.
 *
 * Formula .....
 *     false   when d = nothing (or payment shape(d) = 'due_in_full' when missing or zero)
 *     entered = (v: unknown) => v ≠ nothing and string(v).trim() ! = '' and number.is finite(number(v))
 *     the answer = !entered(minimum monthly payment) and !entered(monthly payment)
 *
 * Called by ... MK-NW-O-003 theNetWorth · MK-NW-O-004 theEmergencyFund
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
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-041 the payment the person chose to make on a debt
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-147
 * Changed ..... not in git yet (—)
 */
export function paymentNotEntered(d: any): boolean {
  if (d == null || paymentShape(d) === 'due_in_full') return false;
  const entered = (v: unknown) => v != null && String(v).trim() !== '' && Number.isFinite(Number(v));
  return !entered(d.minimum_monthly_payment) && !entered(d.monthly_payment);
}

export interface DebtLine { id: string; label: string; balance: number; minimumMonthly: number; }

export interface TheNetWorth {
  /** Assets − debts. The ONE net-worth figure, on every screen that shows one. */
  netWorth: number;
  assets: number;
  debts: number;
  /** The three totals every screen splits by. */
  cash: number;
  investments: number;
  investable: number;
  /** What is owned, by class — the rows under WHAT YOU OWN. */
  byClass: Record<AssetClass, number>;
  /** Alternatives, named on its own because its own screen shows this total and it must agree. */
  alternatives: number;
  /** Each debt, and what it costs a month. */
  debtLines: DebtLine[];
  /** Σ the MINIMUM each debt obliges — the obligation. This is what the Net worth screen prints today. */
  monthlyDebtMinimum: number;
  /** Σ what ACTUALLY leaves the account, counting a payment set above the minimum. */
  monthlyDebtPayments: number;
  /** THE DEBTS WHOSE MONTHLY PAYMENT WAS NEVER ENTERED (2026-10-21, DEC-3523 tenet 3: unknown is not zero) — the same test
   *  the emergency fund names them by (paymentNotEntered). Each adds nothing to the two sums above and is named beside
   *  them, so a sum short of a payment is never presented as the whole. Empty when every debt has one. */
  debtPaymentsNotEntered: { id: string; label: string }[];
  /** HOW MUCH OF EACH ACCOUNT IS INVESTED — the Investments line, account by account, largest first (2026-10-21; accounts
   *  with none are left out). Cash and property are not invested money (DEC-0457), so a checking account and a rental
   *  are not on it. Σ amount = investments. Home's and Insights' one-account card measures a share of this. */
  investmentsByAccount: { id: string; label: string; amount: number }[];
  /** How it moved: the return on cash + investments. Null when the record cannot say.
   *  A RATE, held as 0…1 — the form every other percent in the register uses, so one display rule
   *  rounds them all (Q49). The function underneath returns it already multiplied by 100; the door
   *  converts once, here, rather than leaving four screens to remember which form they were handed.
   *  THE LINE IS NOT HANDED OUT HERE ANY MORE (inputs-and-use audit, 2026-10-11): the door took a monthly
   *  history and a daily one for a trend line, none of its eight callers passed either, and the Net worth
   *  screen draws its change from the record itself (MK-XS-F-005 trendPoints). Both inputs and `trend` went;
   *  the trend-line figure MK-NW-M-003 is retired — the line is no longer on the screen. */
  investableChangePct: number | null;
  /** Which mortgage is on which property, and which are on none (his rule, 2026-10-04, DEC-1925). */
  mortgageCheck: MortgageCheck;
  /** Holdings nothing could class, which the person is asked about (his ruling, 2026-09-30, master
   *  Q11: "Refuse the line and ask") — and the sentence that asks. Empty when there are none. */
  unclassed: { accountId: string; account: string; positionId: string; holding: string }[];
  unclassedSentence: string;
}

/** What am I worth: everything I own, less everything I owe, and how each breaks down?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theNetWorth
 *
 * Answers ..... What am I worth: everything I own, less everything I owe, and how each breaks down?
 *
 * Formula .....
 *     accounts = input.accounts (or none when missing)
 *     debts = input.debts (or none when missing)
 *     a state = build assets state(input.uid, accounts)
 *     d state = build debt state(input.uid, debts)
 *     nw = build net worth(input.uid, a state.total asset value, d state.total debt balance)
 *     by class = asset allocation(accounts)
 *     investable = investable assets(accounts)
 *     the answer = { unclassed, unclassed sentence }
 *     nothing   when input.since is missing
 *     today = input.today (or iso local date(new date()) when missing)
 *     start = `${input.since}-01`   if input.since.length = 7
 *     input.since   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-F-082 NW · MK-NW-F-185 valueChanged
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-185 valueChanged
 *
 * Serves ...... MK-MN-M-016 · MK-NW-M-001 · MK-NW-M-002 · MK-NW-M-004
 *               MK-NW-M-005 · MK-NW-M-006 · MK-NW-M-007 · MK-NW-M-008
 *               MK-NW-M-009 · MK-NW-M-011 · MK-NW-M-015 · MK-NW-M-016
 *               MK-NW-M-017 · MK-NW-M-049 · MK-NW-M-063 · MK-XS-M-001
 *               MK-XS-M-003
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-056 how a holding was classified, and by whom
 * Ruled by .... DEC-0008 · DEC-0010 · DEC-0023 · DEC-0047 · DEC-0048 · DEC-0051
 *               DEC-0052 · DEC-0054 · DEC-0060 · DEC-0061 · DEC-0066 · DEC-0069
 *               DEC-0070 · DEC-0072 · DEC-0074 · DEC-0089 · DEC-0090 · DEC-0091
 *               DEC-0092 · DEC-0095 · DEC-0096 · DEC-0098 · DEC-0149 · DEC-0152
 *               DEC-0158 · DEC-0165 · DEC-0166 · DEC-0175 · DEC-0204 · DEC-0309
 *               DEC-0311 · DEC-0322 · DEC-0343 · DEC-0397 · DEC-0442 · DEC-0446
 *               DEC-0449 · DEC-0451 · DEC-0452 · DEC-0455 · DEC-0501 · DEC-0509
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If minimum monthly payment is missing it uses 0.
 *     · If alternatives is missing it uses 0.
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-003
 * Changed ..... not in git yet (—)
 */
export function theNetWorth(input: {
  uid: string;
  accounts: AssetAccount[];
  debts: Debt[];
  /** The daily record of what each account was worth, and every record of money moving — what the
   *  return on cash + investments is measured from. */
  snapshotDays?: any[] | null;
  transactions?: any[] | null;
  /** The day a change is measured FROM. With none, the change figures refuse. */
  since?: string | null;
  /** Today, as a day. The screen's own day when it gives one. */
  today?: string;
}): TheNetWorth {
  const accounts = input.accounts ?? [];
  const debts = input.debts ?? [];
  const aState = buildAssetsState(input.uid, accounts);
  const dState = buildDebtState(input.uid, debts);
  const nw = buildNetWorth(input.uid, aState.total_asset_value, dState.total_debt_balance);
  const byClass = assetAllocation(accounts);
  const investable = investableAssets(accounts);

  const debtLines: DebtLine[] = (debts ?? []).map((d: any) => ({
    id: String(d.debt_id ?? d.id ?? d.label),
    label: d.label,
    balance: d.remaining_balance || 0,
    // A PAYMENT NEVER ENTERED adds nothing and is named (debtPaymentsNotEntered below) — requiredPayment read a missing
    // minimum as no number at all, so one such debt made the whole sum not a number (2026-10-21, DEC-3523 tenet 3). A
    // minimum not entered beside a payment that was is that payment.
    minimumMonthly: paymentNotEntered(d) ? 0 : (Number(requiredPayment({ ...d, minimum_monthly_payment: d.minimum_monthly_payment ?? 0 })) || 0),
  }));

  return {
    netWorth: nw.net_worth,
    assets: aState.total_asset_value,
    debts: dState.total_debt_balance,
    cash: cashTotal(accounts),
    // THE INVESTMENT CLASSES, NOT THE INVESTMENT ACCOUNTS (outside review, 2026-10-04). Cash above takes a
    // linked account's uninvested cash out of the account; this used to count the same account WHOLE,
    // so that cash was in both lines — the approved drawing's household (Net worth v08, state A) read
    // $355,152 where it draws $354,314, and Cash + Investments + property came to $838 more than
    // What you own. One function for it since 2026-10-05 (MK-NW-F-021 investmentsTotal), read from the
    // same class split the screen's rows are printed from.
    investments: investmentsTotal(accounts),
    investable,
    byClass,
    alternatives: byClass.alternatives ?? 0,
    debtLines,
    // TWO FIGURES, NOT ONE (Net worth pass 3, 2026-09-30). The Net worth screen printed
    // dState.total_monthly_debt_service under the words "Monthly debt payments" while this door
    // answered with requiredPayment, which counts a payment set ABOVE the minimum. On a card with a
    // $200 minimum that the person pays $600 on, the screen said $200 and the door said $600 — two
    // answers to one question, and the screen was not reading the door at all. Both are legitimate
    // figures and the domain says so outright: the minimum is the obligation (used for debt-to-income),
    // the actual is what leaves the account (used for cash flow). So the door hands out both, named,
    // and the screen names which one it prints. WHICH ONE BELONGS UNDER THAT LABEL IS HIS CALL.
    monthlyDebtMinimum: dState.total_monthly_debt_service,
    monthlyDebtPayments: debtLines.reduce((t, d) => t + d.minimumMonthly, 0),
    // unknown is not zero: the debts whose payment was never entered, by the emergency fund's own test (2026-10-21)
    debtPaymentsNotEntered: (debts ?? []).filter(paymentNotEntered).map((d: any) => ({ id: String(d.debt_id ?? d.id ?? d.label), label: String(d.label ?? 'A debt') })),
    // THE INVESTMENTS LINE, ACCOUNT BY ACCOUNT (2026-10-21, DEC-0457): what Home's one-account card divides by Investments,
    // so a rental or a checking account is never "invested money" there (it read "$310,000 (160%)")
    investmentsByAccount: accounts
      .map((a: any) => ({ id: String(a.asset_id), label: String(a.institution?.trim() || a.label || ''), amount: accountInvestments(a) }))
      .filter((x) => x.amount > 0)
      .sort((x, y) => y.amount - x.amount),
    mortgageCheck: mortgagesByProperty(accounts, debts),
    ...(() => {
      const unclassed = accounts.flatMap((a: any) => ((a.positions ?? []) as any[])
        .filter((p) => p.class_asked && p.class_source !== 'user')
        .map((p) => ({ accountId: String(a.asset_id), account: String(a.label ?? ''), positionId: String(p.position_id), holding: String(p.name || p.ticker || 'a holding') })));
      const unclassedSentence = unclassed.length === 0 ? ''
        : unclassed.length === 1
          ? `The app cannot tell what ${unclassed[0].holding} in ${unclassed[0].account} is, so it is in no class yet. Open it and say what it is.`
          : `The app cannot tell what ${unclassed.length} of your holdings are, so they are in no class yet. Open each and say what it is.`;
      return { unclassed, unclassedSentence };
    })(),
    // THE RETURN ON CASH + INVESTMENTS IS TIME-WEIGHTED (owner decision, 2026-10-04, DEC-1669: "All
    // return should be True Weighted Return and not Dietz return."). It was a change in balance:
    // today's total ÷ the first total on record, less 1 — so $60,000 paid in read as $60,000 earned
    // (42.32% where 10.97% is right, the outside review's case). Now the period is split at every day
    // money moved, each piece measured, the pieces multiplied.
    //   · Cash earns only interest: any other change in a cash balance is money moving, counted on
    //     the day the record first shows it — a paycheck arriving is not a return.
    //   · The day compared from must be on record. A comparison from before the record begins gives
    //     no figure, never a figure quietly measured from a later day.
    investableChangePct: (() => {
      if (!input.since) return null;
      const today = input.today ?? isoLocalDate(new Date());
      const start = input.since.length === 7 ? `${input.since}-01` : input.since;
      const measured = accounts.filter((a) => !isRealAsset(a));
      const ids = new Set(measured.map((a) => String(a.asset_id)));
      if (!ids.size) return null;
      const moved = movementsOf(input.transactions ?? [], ids);
      // A HOLDING WITH NO PRICE TODAY STAYS OUT OF THE CHANGE LINE — the promise the fix sheet makes (Net worth
      // v08, state F: "Meanwhile we show what you paid — it stays out of the change line, and we say so"). Today's
      // record values such a holding at what was paid (buildDayFromAccounts, MK-ST-F-028: no last price → the cost),
      // so it is taken out of every day of the window, the start day included: LCTX priced $1,930 on the start day
      // and unpriced today read +0.26% where +0.53% is right, and LCTX first recorded today at its $965 cost read
      // +0.80% (mock-match audit v02, 2026-10-11).
      const todayDay = buildDayFromAccounts(accounts as any, today, `${today}T00:00:00Z`);
      const unpriced = new Set(todayDay.holdings.filter((h) => h.price == null).map((h) => `${h.accountId}|${h.securityKey}`));
      const priced = (d: any) => (unpriced.size ? { ...d, holdings: (d.holdings ?? []).filter((h: any) => !unpriced.has(`${h.accountId}|${h.securityKey}`)) } : d);
      return timeWeightedReturn({
        days: recordDay(((input.snapshotDays ?? []) as any[]).filter((d) => d?.date !== today), todayDay).map(priced),
        accountIds: ids,
        cashIds: new Set(measured.filter((a) => assetClassOf(a) === 'cash').map((a) => String(a.asset_id))),
        flows: moved.flows, interest: moved.interest, sharesMoved: moved.sharesMoved,
        amountMissing: moved.amountMissing,   // a movement with no amount refuses (outside review Claude Performance, 2026-10-11, DEC-3523)
        unnamed: moved.unnamed,               // a record the app could not name refuses, and is named (2026-10-20, Q15)
        incomeMissing: moved.incomeMissing,   // interest, a dividend or a coupon with no amount refuses (2026-10-21, DEC-3523)
        start, end: today,
      }).rate;
    })(),
  };
}

export interface MortgageCheck {
  /** How many properties Net worth holds, and how many mortgages Debts holds. */
  properties: number;
  mortgages: number;
  /** One row for each property: the mortgage on it, or none. */
  byProperty: { propertyId: string; property: string; mortgageId: string | null; mortgage: string | null; payment: number }[];
  /** Mortgages that are on no property. Each one is the person's to fix. */
  unmatched: { id: string; label: string }[];
  /** True when every mortgage is on a property of its own. */
  ok: boolean;
  /** What the screen says when it is not. Empty when it is. */
  sentence: string;
}

/** Which mortgage is on which property, and which mortgages are on none. */
/* ─ MK-NW-F-106 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * mortgagesByProperty
 *
 * Answers ..... Which mortgage is on which property, and which mortgages are on none.
 *
 * Formula .....
 *     properties = accounts (or none when missing) where asset class of(each) = 'real_estate'
 *     mortgages = debts (or none when missing) where string(debt type ?? '').to upper case() = 'MORTGAGE'
 *     on = new map<string, any>()
 *     placed = new set<any>()
 *     place = (d: any, property id: string) => { on.set(property id, d); placed.add(d); }
 *     id = string(property id)   if property id ≠ nothing
 *     ''   otherwise
 *     name = string(label ?? '').trim().to lower case()
 *     free = properties where !on.has(string(asset id))
 *     loose = mortgages as any[] where !placed.has(each) and property id = nothing
 *     unmatched = mortgages as any[] where !placed.has(each)for each of : id = string(debt id)
 *     label = string(label ?? 'Mortgage')
 *     d = on.get(string(asset id))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-020 theBudgetCounted · MK-NW-O-003 theNetWorth
 *
 * Reaches ..... 56 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-F-082 NW
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 38 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-106
 * Changed ..... 2026-10-04 (dd8557a)
 */
export function mortgagesByProperty(accounts: AssetAccount[], debts: Debt[]): MortgageCheck {
  // HIS RULE, 2026-10-04 (DEC-1925): "App should map properties included in networth against
  // mortgages. It is feasible to have property without mortgage but no mortgage without property. So
  // check should be 3 properties in NW - 3 or less mortgage."
  //
  // A mortgage is on the property it NAMES. Mortgages stored before that day name none, so each is
  // placed only where there is one honest answer:
  //   1. the property whose name its own name begins with — "Lake house mortgage" is the Lake
  //      house's (that is the name the app itself gives a mortgage typed with a property);
  //   2. failing that, the one property still without a mortgage, when it is the one mortgage still
  //      without a property.
  // Anything else is not guessed: the mortgage is listed as on no property, for the person to fix.
  // One mortgage to a property: a second one naming the same property is listed the same way.
  const properties = (accounts ?? []).filter((a) => assetClassOf(a) === 'real_estate');
  const mortgages = (debts ?? []).filter((d: any) => String(d?.debt_type ?? '').toUpperCase() === 'MORTGAGE');
  const on = new Map<string, any>();                    // property id → its mortgage
  const placed = new Set<any>();
  const place = (d: any, propertyId: string) => { on.set(propertyId, d); placed.add(d); };
  for (const d of mortgages as any[]) {
    const id = d.property_id != null ? String(d.property_id) : '';
    if (id && properties.some((a) => String(a.asset_id) === id) && !on.has(id)) place(d, id);
  }
  for (const d of mortgages as any[]) {
    if (placed.has(d) || d.property_id != null) continue;
    const name = String(d.label ?? '').trim().toLowerCase();
    const mine = properties.filter((a) => !on.has(String(a.asset_id)) && String(a.label ?? '').trim() !== ''
      && name.startsWith(String(a.label).trim().toLowerCase()));
    if (mine.length === 1) place(d, String(mine[0].asset_id));
  }
  const free = properties.filter((a) => !on.has(String(a.asset_id)));
  const loose = (mortgages as any[]).filter((d) => !placed.has(d) && d.property_id == null);
  if (free.length === 1 && loose.length === 1) place(loose[0], String(free[0].asset_id));

  const unmatched = (mortgages as any[]).filter((d) => !placed.has(d)).map((d) => ({ id: String(d.debt_id), label: String(d.label ?? 'Mortgage') }));
  const sentence = unmatched.length === 0 ? ''
    : unmatched.length === 1
      // the name alone read as a riddle ("Chase is not on a property" — his question, 2026-10-05: "what is
      // chase?"). It is whatever the person called the mortgage, so the sentence says it is a mortgage.
      ? `Your mortgage “${unmatched[0].label}” is not on a property. A mortgage is always on a property — open it and say which one.`
      : `${unmatched.length} mortgages are not on a property. A mortgage is always on a property — open each and say which one.`;
  return {
    properties: properties.length,
    mortgages: mortgages.length,
    byProperty: properties.map((a) => {
      const d = on.get(String(a.asset_id));
      return { propertyId: String(a.asset_id), property: String(a.label ?? ''), mortgageId: d ? String(d.debt_id) : null, mortgage: d ? String(d.label ?? '') : null, payment: d ? requiredPayment(d) : 0 };
    }),
    unmatched,
    ok: unmatched.length === 0,
    sentence,
  };
}

export type PropertyUse = 'home' | 'rental' | 'second';

/** What each property is used for: the home lived in, a rental, or a second or vacation home. */
/* ─ MK-NW-F-107 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * propertyUses
 *
 * Answers ..... What each property is used for: the home lived in, a rental, or a second or vacation home.
 *
 * Formula .....
 *     property use map(accounts, rentals ?? nothing)
 *
 * Called by ... MK-CF-O-020 theBudgetCounted
 *
 * Reaches ..... 56 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-F-082 NW
 *               MK-NW-F-040 assetsFromOnboarding · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-F-039 buildAssetsState · MK-CF-F-001 buildBudgetState
 *               MK-CF-F-036 buildDebtState · MK-PL-F-011 buildGoalsState
 *               MK-NW-F-065 buildNetWorth · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               MK-XS-F-023 getProfileReadModel · MK-ST-F-041 getUserDoc
 *               … and 38 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-107
 * Changed ..... 2026-10-05 (50cafc5)
 */
export function propertyUses(accounts: AssetAccount[], rentals: { income?: any; expenses?: any; property_id?: any }[] | null | undefined): Map<string, PropertyUse> {
  // HIS RULE, 2026-10-04 (DEC-1926): "unless rental income is added on the income screen, assume
  // property is second or vacation home." So nobody is asked what a property is for:
  //   · RENTAL — rent is entered for it on the Income screen (the rent entry names the property).
  //   · HOME — the one property the person marked as the home they live in.
  //   · SECOND — every other property: a second or vacation home.
  // ONE READING (outside review, 2026-10-07): the rule lives in MK-NW-F-117 propertyUseMap, which the
  // home, the use of one property and the money set aside for retirement all read too — they had each
  // read it their own way and disagreed. Handed the rent entries, a property stored as a rental that no
  // entry names is a second home, as his rule says.
  return propertyUseMap(accounts, rentals ?? null);
}

/** THE GROUPED LEDGER — the bands a person reads under WHAT YOU OWN, and what each one holds.
 *
 *  MOVED OFF THE SCREEN, Net worth pass 1 (2026-09-30). NetWorthScreen built these groups itself and
 *  added up each one inline — `items.reduce((t, a) => t + a.balance, 0)` — which is the rule his
 *  CLAUDE.md states outright: *never re-derive a money figure inline on a screen*. The master file's
 *  row for MK-NW-M-006 said so in as many words: *"this section total is computed on the screen
 *  itself"*, written by hand on 2026-09-08. It had no function, so nothing could check it, nothing
 *  could re-run it, and no other screen could ask the same question and get the same answer.
 *
 *  It groups the SAME accounts two ways, because the screen offers both and they must agree: by class
 *  (Cash, Bonds, Stocks / Funds, Alternatives, Real estate, Personal property) and by institution.
 *  Either way the group totals add to the same number, which is now something a test can assert.
 *
 *  An account with no institution recorded is not dropped and not guessed at: it groups under "No
 *  institution set", so the bands still add to what you own.
 */
export interface LedgerGroup {
  /** The heading exactly as the screen prints it — a class label, or the institution's own name. */
  label: string;
  /** What this group holds. */
  total: number;
  /** The accounts inside it, in the order they were given. */
  accountIds: string[];
  /** Each account's amount in THIS group — by class, only its part in that class; by institution, its
   *  balance. The rows always add up to the group's total, so the heading can be checked by eye. An account
   *  with no balance entered is a row of null — not known, never $0 (DEC-3279e, tenet 3) — and adds nothing
   *  to the total, which stays the sum of what is known. */
  rows: { accountId: string; amount: number | null }[];
  /** Under an institution's name, the class mix inside it, biggest first. Empty when grouped by class. */
  mix: { key: string; total: number }[];
}

/** Groups the accounts for the Net worth list, by asset class or by institution, and gives each group its total. */
/* ─ MK-NW-F-094 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ledgerGroups
 *
 * Answers ..... Groups the accounts for the Net worth list, by asset class or by institution, and gives each group its total.
 *
 * Formula .....
 *     out = new map<string, ledger group>()
 *     g = out.get(key) (or label = label
 *     total = 0
 *     account ids = []
 *     rows = []
 *     mix = [] when missing)
 *     split = account class breakdown(a)
 *     bal = (a as any).balance
 *     known = bal   if typeof bal = 'number' and number.is finite(bal)
 *     nothing   otherwise
 *     shown = string((a as any).institution ?? '').trim() (or 'no institution set' when missing or zero)
 *     g = group(shown.to lower case(), shown)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-NW-F-097 LEDGER
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-082 NW · MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-028 assumed return
 *
 * Decides .....
 *     · If total is missing it uses 0.
 *     · If known is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-094
 * Changed ..... 2026-09-30 (d31209e)
 */
export function ledgerGroups(
  accounts: AssetAccount[],
  by: 'class' | 'institution',
  classLabelOf: (a: AssetAccount) => string,
  classKeyOf: (a: AssetAccount) => string,
): LedgerGroup[] {
  // THE SAME SPLIT THE CLASS ROWS USE (outside review, 2026-10-07). An account that holds several
  // classes — a linked account, or one built by hand that records its own cash — gives each class group
  // its part and sits, as a row, under the class most of it is in; by institution, its parts are the
  // mix shown under the institution's name. It used to count every account whole under one class, so
  // the Cash group here read $8,000 while the Cash row above it read $8,838, and Vanguard's mix showed
  // one kind when it held two. Institution names are matched trimmed, capitals ignored — "Fidelity"
  // and "fidelity " were two groups.
  // HIS RULING, 2026-10-07 (overruling the batch 4 rule, DEC-2747b): "build it per mockup 07 where under
  // each class you list each account Vanguard-0008 $45000, Chase - 0333 $34000 … You are showing class
  // total which user cannot even see how you got to it." By class, an account is listed under EVERY
  // class it has a part in, showing that part — so the rows under a heading add up to the heading.
  const out = new Map<string, LedgerGroup>();
  const group = (key: string, label: string) => {
    const g = out.get(key) ?? { label, total: 0, accountIds: [], rows: [], mix: [] };
    out.set(key, g);
    return g;
  };
  for (const a of accounts ?? []) {
    const split = accountClassBreakdown(a);
    // A BALANCE NOT ENTERED IS NOT $0 (DEC-3279e, tenet 3; outside review OpenAI re-run 03, MK-NW-F-094, 2026-10-13):
    // its row carries null — not known — and the group total stays the sum of what is known. It used to be written
    // as a row of $0, so any caller but the Net worth screen (which reads "Value not entered" off the account) got $0.
    const bal = (a as any).balance;
    const known: number | null = typeof bal === 'number' && Number.isFinite(bal) ? bal : null;
    const parts: { key: string; total: number | null }[] = split
      ? (Object.keys(split) as (keyof typeof split)[]).filter((k) => split[k] !== 0).map((k) => ({ key: String(k), total: split[k] }))
      : [{ key: classKeyOf(a), total: known }];
    if (by === 'class') {
      for (const p of parts) {
        const g = group(p.key, split ? ((ASSET_CLASS_LABEL as any)[p.key] ?? classLabelOf(a)) : classLabelOf(a));
        g.total += p.total ?? 0;
        g.accountIds.push(String((a as any).asset_id));
        g.rows.push({ accountId: String((a as any).asset_id), amount: p.total });
      }
    } else {
      const shown = String((a as any).institution ?? '').trim() || 'No institution set';
      const g = group(shown.toLowerCase(), shown);
      g.total += known ?? 0;
      g.accountIds.push(String((a as any).asset_id));
      g.rows.push({ accountId: String((a as any).asset_id), amount: known });
      for (const p of parts) {
        const m = g.mix.find((x) => x.key === p.key) ?? { key: p.key, total: 0 };
        if (!g.mix.includes(m)) g.mix.push(m);
        m.total += p.total ?? 0;
      }
    }
  }
  for (const g of out.values()) g.mix.sort((x, y) => y.total - x.total);
  return [...out.values()];
}

/** THE WORKED EXAMPLE — ONE HOUSEHOLD, EVERY FIGURE ON THIS DOOR (six steps, step 6, 2026-09-28).
 *
 *  Five accounts and two debts on 28 September 2026, with one baseline day on record so the return
 *  figure has something real to measure from. Every figure below runs `theNetWorth` — the real door —
 *  so the example on the master file's row is a printout of what the code gives.
 *
 *  It holds a rental property and a mortgage deliberately: a house is an asset and not investable,
 *  and its mortgage is a debt and not an expense, so the case separates WHAT YOU OWN from what could
 *  be spent or invested. Those two have been confused on screens before.
 */
const EXAMPLE = {
  uid: 'worked-example',
  accounts: [
    { asset_id: 'a1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' },
    { asset_id: 'a2', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142000, target_return: 0.07, asset_class: 'stocks_etf' },
    { asset_id: 'a3', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24200, target_return: 0.045, asset_class: 'bonds' },
    { asset_id: 'a4', label: 'Rental duplex', kind: 'real_estate', tax_bucket: 'TAXABLE', balance: 310000, target_return: 0.03, asset_class: 'real_estate', re_use: 'rental' },
    { asset_id: 'a5', label: 'Gold', institution: 'Vault', kind: 'commodity', tax_bucket: 'TAXABLE', balance: 9000, target_return: 0, asset_class: 'alternatives' },
  ] as any[],
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400 },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
  ] as any[],
  // the one baseline day on record: the same four accounts, worth $180,000 between them
  snapshotDays: [{
    date: '2026-01-02', origin: 'observed', writtenAt: '2026-01-02T00:00:00Z', holdings: [],
    accounts: [
      { date: '2026-01-02', accountId: 'a1', cash: 18000, statedTotal: null, currency: 'USD' },
      { date: '2026-01-02', accountId: 'a2', cash: 0, statedTotal: null, typedValue: 130000, currency: 'USD' },
      { date: '2026-01-02', accountId: 'a3', cash: 0, statedTotal: null, typedValue: 23000, currency: 'USD' },
      { date: '2026-01-02', accountId: 'a5', cash: 0, statedTotal: null, typedValue: 9000, currency: 'USD' },
    ],
  }] as any[],
  transactions: [] as any[],
  since: '2026-01-02',
  today: '2026-09-28',
};
const GIVEN =
  '$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; '
  + 'against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. '
  + 'Cash + investments stood at $180,000 on 2 Jan 2026 ($18,000 checking, $130,000 brokerage, a $23,000 Treasury, $9,000 of gold), '
  + 'and no money has been added or taken out since.';

/** Example only: runs theNetWorth on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-082 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * NW
 *
 * Answers ..... Example only: runs theNetWorth on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the net worth(EXAMPLE)
 *
 * Called by ... MK-NW-F-185 valueChanged
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-082
 * Changed ..... not in git yet (—)
 */
const NW = () => theNetWorth(EXAMPLE);

/** SIX FIGURES THAT WERE HAND-TYPED ON THE MASTER UNTIL TODAY (Net worth pass 1, 2026-09-30).
 *
 *  48 rows stood on the networth tab and 42 were printed from the code. The other six were typed by
 *  hand, so the file and the code could drift with nothing to notice — and one of them, MK-NW-M-006,
 *  said on its own row that it had no function at all. Each now has a fixture below and a declaration
 *  that a test runs.
 */

/** THE GROUPED LEDGER, worked. The same five accounts as above plus a car, so the personal-property
 *  band the master's row names actually appears. Both groupings add to the same total, which is the
 *  point: a person can switch By class / By institution and the bands cannot disagree. */
const LEDGER_ACCOUNTS = [
  ...EXAMPLE.accounts,
  { asset_id: 'a6', label: 'Honda CR-V', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 21000, target_return: 0, asset_class: 'personal_property' },
] as any[];
const LEDGER_GIVEN =
  'The five accounts above plus a $21,000 car: $18,000 checking, $142,000 brokerage, a $24,200 Treasury '
  + 'at Fidelity, a $310,000 rental with no institution recorded, $9,000 of gold in a vault and the car.';

/** Example only: the display name of an asset class, used by the worked example of the Net worth list. */
/* ─ MK-NW-F-095 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * CLASS_LABEL_OF
 *
 * Answers ..... Example only: the display name of an asset class, used by the worked example of the Net worth list.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-097 LEDGER
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-082 NW · MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-095
 * Changed ..... not in git yet (—)
 */
const CLASS_LABEL_OF = (a: any) => ({
  cash: 'Cash', stocks_etf: 'Stocks / Funds', bonds: 'Bonds & CDs', alternatives: 'Alternatives',
  real_estate: 'Real estate', personal_property: 'Personal property', mixed: 'Mixed',
} as Record<string, string>)[String(a.asset_class)] ?? 'Unclassified';

/** Example only: the asset class an account is filed under, used by the worked example of the Net worth list. */
/* ─ MK-NW-F-096 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * CLASS_KEY_OF
 *
 * Answers ..... Example only: the asset class an account is filed under, used by the worked example of the Net worth list.
 *
 * Formula .....
 *     string(asset class)
 *
 * Called by ... MK-NW-F-097 LEDGER
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-082 NW · MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-048 the person’s own asset-class answer
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-096
 * Changed ..... not in git yet (—)
 */
const CLASS_KEY_OF = (a: any) => String(a.asset_class);

/** Example only: groups the worked example's accounts for the Net worth list, by class or by institution. */
/* ─ MK-NW-F-097 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LEDGER
 *
 * Answers ..... Example only: groups the worked example's accounts for the Net worth list, by class or by institution.
 *
 * Formula .....
 *     ledger groups(LEDGER_ACCOUNTS, by, CLASS_LABEL_OF, CLASS_KEY_OF)
 *
 * Called by ... MK-NW-F-082 NW · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-185 valueChanged
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-082 NW
 *               MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-097
 * Changed ..... not in git yet (—)
 */
const LEDGER = (by: 'class' | 'institution') => ledgerGroups(LEDGER_ACCOUNTS, by, CLASS_LABEL_OF, CLASS_KEY_OF);

/** Example only: the total of one named group in the worked example of the Net worth list. */
/* ─ MK-NW-F-098 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * LEDGER_BAND
 *
 * Answers ..... Example only: the total of one named group in the worked example of the Net worth list.
 *
 * Formula .....
 *     LEDGER('class').find((g) => label = label).total (or nothing when missing)
 *
 * Called by ... MK-NW-F-185 valueChanged
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-098
 * Changed ..... not in git yet (—)
 */
const LEDGER_BAND = (label: string) => LEDGER('class').find((g) => g.label === label)?.total ?? null;

/** THE TREND LINE, worked. Four months of recorded net worth and one daily point after them. The
 *  daily point sorts AFTER its own month because "2026-04" sorts before "2026-04-30" as plain text —
 *  which is why the merge can sort on the date text and be right. */
const TREND_GIVEN =
  'Net worth recorded at the end of each month — $240,000 in January, $246,000 in February, $252,000 in '
  + 'March, $258,000 in April — and one daily point of $261,200 on 30 April.';

/** Example only: makes one month's recorded net worth for the worked example of the trend line. */
/* ─ MK-NW-F-099 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * SNAP
 *
 * Answers ..... Example only: makes one month's recorded net worth for the worked example of the trend line.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-NW-F-100 TREND
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-100 TREND · MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-099
 * Changed ..... not in git yet (—)
 */
const SNAP = (month: string, net: number) => ({ month, net_worth: net, gross_assets: net + 242000, gross_debt: 242000 });

/** Example only: runs the record's trend points (the function the Net worth screen calls) on four months of recorded net worth and one day after them. */
// THE SCREEN'S OWN CALL, NOT THE DOOR'S (inputs-and-use audit, 2026-10-11): theNetWorth no longer takes a history —
// none of its callers passed one — so the change line's example runs trendPoints, which the Net worth screen calls.
/* ─ MK-NW-F-100 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * TREND
 *
 * Answers ..... Example only: runs the record's trend points (the function the Net worth screen calls) on four months of recorded net worth and one day after them.
 *
 * Formula .....
 *     trend points(
 *
 * Called by ... MK-NW-F-185 valueChanged
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-185 valueChanged
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-029 inflation rate
 *               MK-XS-I-043 their own retirement contribution
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-100
 * Changed ..... not in git yet (—)
 */
const TREND = () => trendPoints(
  // A MONTH IS A SNAPSHOT, NOT A NUMBER — which is what normalizeSnapshot enforces, and what my first
  // draft of this fixture got wrong: it passed bare numbers, every month was correctly rejected, and
  // the example came back with one point. The code was right and the example was not.
  {
    '2026-01': SNAP('2026-01', 240000), '2026-02': SNAP('2026-02', 246000),
    '2026-03': SNAP('2026-03', 252000), '2026-04': SNAP('2026-04', 258000),
  },
  { '2026-04-30': 261200 },
);

/** THE RETIREMENT LINE ON THE NET WORTH TAB, worked (MK-NW-M-015). The same case the straight-line check used, with
 *  the one thing a simulation also needs: how far a year's return swings. */
const PLAN_GIVEN =
  'A 50-year-old with $184,200 of cash and investments, saving $24,000/year, retiring at 65 and '
  + 'planning to 92, expecting 6% a year with 2.5% inflation, with expenses of $5,500/month in retirement '
  + 'and $2,400/month of guaranteed income from 67. A year\u2019s return swings 12% either way around the 6%, '
  + 'and 1,000 futures are simulated.';
// the same case, as the simulation reads it
const PLAN_INPUTS = {
  current_age: 50, retire_age: 65, horizon_age: 92,
  start_balance: 184200, annual_contribution: 24000,
  retire_monthly_spend_today: 5500, guaranteed_monthly_income: 2400, guaranteed_start_age: 67,
  mean_return: 0.06, inflation: 0.025, vol_return: 0.12,
};

/** Example only: runs the Net worth card's retirement sentence on the worked example and calculates nothing of its own. */
/* ─ MK-NW-F-101 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * PLAN
 *
 * Answers ..... Example only: runs the Net worth card's retirement sentence on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     sim = simulate({ ...PLAN_INPUTS, with band: true } as any)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *
 * Decides .....
 *     · Uses a built-in b a r m i n w of 1.5.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-101
 * Changed ..... not in git yet (—)
 */
const PLAN = (): string | null => {
  // the SAME simulation and the SAME sentence function the Net worth card calls (NetWorthScreen: simulate with its
  // band, then onCourseSentence) — until 2026-10-20 this ran the straight-line projection, which no screen prints
  const sim = simulate({ ...PLAN_INPUTS, with_band: true } as any);
  return onCourseSentence({
    lens: 'working', chance: sim.chance_of_success, retireAge: PLAN_INPUTS.retire_age, horizonAge: PLAN_INPUTS.horizon_age,
    potAtRetire: sim.projected_at_retirement,
    leftoverAtHorizon: sim.band?.length ? sim.band[sim.band.length - 1].p50 : null,
    shortfallAge: shortfallAgeFromBand(sim.band), money: formatMoney,
  });
};


// ── WHAT THE NET WORTH SCREEN CALCULATED ITSELF, MOVED HERE (2026-10-22; DEC-0346, screens compute nothing; guard D1b) ─────────
// The numbers are the screen's own, to the digit: only where they are calculated moved, so a test holds them and the screen
// prints what this door says.

const BAR_MIN_W = 1.5;   // % width floor, so a sliver is still visible as a mark
/** THE COMPOSITION BAR'S SEGMENTS (founder decision 2026-08-11, Q6: "add both. Bar replaces donut."): each row's share of the
 *  whole in whole percents that ALWAYS total 100 — the rounding remainder goes to the largest segment — and its drawn width,
 *  never below a sliver so a small segment still shows. Rows of $0 or less are no part of the whole. */
/* ─ MK-NW-F-180 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * barSegments
 *
 * Answers ..... THE COMPOSITION BAR'S SEGMENTS (founder decision 2026-08-11, Q6: "add both.
 *
 * Formula .....
 *     sum = Σ over rows of (max(0, total))
 *     [] as (T & { exact: number; pct: number; width: number })[]   when sum ≤ 0
 *     raw = for each of rows: ...each = ...each
 *     exact = (math.max(0, total) ÷ sum) × 100
 *     out = for each of raw: ...each = ...each
 *     pct = round(exact)
 *     drift = Σ over 100 − out of (pct)
 *     biggest = out.reduce((a, b) => (exact > exact ? b : a))
 *     the answer:
 *     for each of out: ...each = ...each
 *     width = max(BAR_MIN_W, exact)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Never lets total fall below 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-180
 * Changed ..... not in git yet (—)
 */
export function barSegments<T extends { key: string; label: string; color: string; total: number }>(rows: T[]): (T & { exact: number; pct: number; width: number })[] {
  const sum = rows.reduce((t, r) => t + Math.max(0, r.total), 0);
  if (sum <= 0) return [] as (T & { exact: number; pct: number; width: number })[];
  const raw = rows.map((r) => ({ ...r, exact: (Math.max(0, r.total) / sum) * 100 }));
  const out = raw.map((r) => ({ ...r, pct: Math.round(r.exact) }));
  const drift = 100 - out.reduce((t, r) => t + r.pct, 0);
  if (drift !== 0) {
    const biggest = out.reduce((a, b) => (b.exact > a.exact ? b : a));
    biggest.pct += drift;                      // the largest bucket absorbs the rounding remainder
  }
  return out.map((r) => ({ ...r, width: Math.max(BAR_MIN_W, r.exact) }));
}

/** THE BAR AS DRAWN: each segment's width as a share of the bar, re-normalised after the sliver floor so the bar is full. */
/* ─ MK-NW-F-181 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * barDrawnWidths
 *
 * Answers ..... THE BAR AS DRAWN: each segment's width as a share of the bar, re-normalised after the sliver floor so the bar is full.
 *
 * Formula .....
 *     scale = Σ over 100 ÷ segs of (width)
 *     the answer:
 *     for each of segs: ...each = ...each
 *     drawn = width × scale
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-181
 * Changed ..... not in git yet (—)
 */
export function barDrawnWidths<T extends { width: number }>(segs: T[]): (T & { drawn: number })[] {
  const scale = 100 / segs.reduce((t, s) => t + s.width, 0);
  return segs.map((s) => ({ ...s, drawn: s.width * scale }));
}

/** HOW MANY ACCOUNTS SIT INSIDE THE CLASSES A CLOSED GROUP HOLDS — the same member rule the rows use (an account that holds
 *  several classes counts in each it holds), for the closed group's words: CASH · 2 accounts, PERSONAL PROPERTY · 1 item. */
/* ─ MK-NW-F-182 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * accountsInClass
 *
 * Answers ..... HOW MANY ACCOUNTS SIT INSIDE THE CLASSES A CLOSED GROUP HOLDS — the same member rule the rows use (an account that holds several classes counts in each it holds), for the closed group's words: CASH · 2 accounts, PERSONAL PROPERTY · 1 item.
 *
 * Formula .....
 *     b = account class breakdown(a)
 *     the answer:
 *     !!b[cls]   if b
 *     asset class of(a) = cls   otherwise
 *
 * Called by ... MK-NW-F-183 accountsInClasses
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-183 accountsInClasses
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-182
 * Changed ..... not in git yet (—)
 */
export function accountsInClass(accounts: AssetAccount[], cls: AssetClass): number {
  return (accounts ?? []).filter((a) => {
    const b = accountClassBreakdown(a);
    return b ? !!b[cls] : assetClassOf(a) === cls;
  }).length;
}
/** HOW MANY ACCOUNTS SIT INSIDE SEVERAL CLASSES — each class's count (accountsInClass) added up, so an account holding two of
 *  them counts in both, as the rows show it. */
/* ─ MK-NW-F-183 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountsInClasses
 *
 * Answers ..... HOW MANY ACCOUNTS SIT INSIDE SEVERAL CLASSES — each class's count (accountsInClass) added up, so an account holding two of them counts in both, as the rows show it.
 *
 * Formula .....
 *     Σ over classes (or none when missing) of (accounts in class(accounts, each))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-183
 * Changed ..... not in git yet (—)
 */
export function accountsInClasses(accounts: AssetAccount[], classes: AssetClass[]): number {
  return (classes ?? []).reduce((t, c) => t + accountsInClass(accounts, c), 0);
}

/** IS THE AMOUNT SHOWN FOR AN ACCOUNT ONLY PART OF IT — by class, an account in several classes shows only its part (half a
 *  cent apart counts as the whole). */
/* ─ MK-NW-F-184 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isPartOfAccount
 *
 * Answers ..... IS THE AMOUNT SHOWN FOR AN ACCOUNT ONLY PART OF IT — by class, an account in several classes shows only its part (half a cent apart counts as the whole).
 *
 * Formula .....
 *     size of(part − (account balance or 0)) > 0.005
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If account balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-184
 * Changed ..... not in git yet (—)
 */
export function isPartOfAccount(part: number, accountBalance: number | null | undefined): boolean {
  return Math.abs(part - (accountBalance || 0)) > 0.005;
}

/** DID AN EDIT CHANGE THE VALUE — a new value is dated today; one that did not change keeps its date (2026-10-20). */
/* ─ MK-NW-F-185 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * valueChanged
 *
 * Answers ..... DID AN EDIT CHANGE THE VALUE — a new value is dated today; one that did not change keeps its date (2026-10-20).
 *
 * Formula .....
 *     after ! = before
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-185
 * Changed ..... not in git yet (—)
 */
export function valueChanged(before: number | null | undefined, after: number | null | undefined): boolean {
  return after !== before;
}

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const NET_WORTH_FIGURES = declareFigures({
  'MK-XS-M-001': {
    label: 'Net worth', unit: 'money', screens: ['/home', '/analytics'],
    answers: 'Everything you own, less everything you owe.',
    formula: 'the sum of every account’s value, minus the sum of every debt’s balance',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-002 your debts'],
    refusal: 'Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.',
    note: 'Home and the Net worth tab print THIS figure. They each built their own before 2026-09-27.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$261,200',
      run: () => NW().netWorth,
    },
  },
  'MK-XS-M-003': {
    label: 'YOUR INVESTMENTS', unit: 'money', screens: ['/home', '/analytics'],
    answers: 'What your invested money is worth — stocks, funds, bonds and alternatives.',
    formula: 'the sum of every account whose class is stocks, bonds or alternatives',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Nothing invested yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$175,200',
      run: () => NW().investments,
    },
  },
  'MK-NW-M-001': {
    label: 'Change in net worth +$X', unit: 'money', screens: ['/networth'],
    answers: 'How much your net worth has moved since the day the line starts.',
    formula: 'the last point on the trend line less its first point',
    inputs: ['MK-XS-I-031 the recorded history'],
    decisions: [
      'IT IS READ FROM THE RECORD, never back-solved: the months we actually saved and the daily points after them.',
      'A month and its own days live in one series, sorted by their date text \u2014 "2026-04" sorts before "2026-04-30", which is what makes plain text sorting safe.',
    ],
    refusal: 'A line needs at least two points; with one, the point is shown and no change is stated.',
    worked: { given: TREND_GIVEN, answer: '$21,200',
      run: () => { const t = TREND(); return t.length < 2 ? null : t[t.length - 1].nw - t[0].nw; } },
    note: 'DECLARED 2026-09-30. It was hand-typed on the master until then, so the row and the code could drift with nothing to notice.',
  },
  // MK-NW-M-003 "the trend line" RETIRED 2026-10-14: the line is no longer on the Net worth screen (inputs-and-use
  // audit, 2026-10-11). Kept with its reason in moneykeel_metric_register.json; the number is never reused.
  'MK-NW-M-006': {
    label: '\ud83c\udfe0 PERSONAL PROPERTY', unit: 'money', screens: ['/networth'],
    answers: 'What one band under WHAT YOU OWN holds \u2014 here the vehicles and valuables.',
    formula: 'the balances of every account in that band, added up \u2014 for this band, every account whose '
      + 'class is personal property: vehicles and valuables. Real estate is its own band.',
    inputs: ['MK-NW-I-001 your accounts'],
    grain: 'one figure per band',
    decisions: [
      'REAL ESTATE IS ITS OWN BAND: a house is not a vehicle, and mixing them hides both.',
      'THE SAME ACCOUNTS GROUP TWO WAYS \u2014 by class and by institution \u2014 and both ways add to the same total, so switching the view can never change what you own.',
      'An account with no institution recorded groups under "No institution set" rather than being dropped.',
    ],
    refusal: 'The band shows $0 and, on a fresh account, the one line "Nothing entered yet. Add your accounts \u203a".',
    worked: { given: LEDGER_GIVEN, answer: '$21,000', run: () => LEDGER_BAND('Personal property') },
    note: 'MOVED OFF THE SCREEN 2026-09-30. Its row said so in as many words \u2014 "this section total is computed on the screen itself", written by hand 2026-09-08 \u2014 and it named NO function. NetWorthScreen grouped the accounts and totalled each band with an inline reduce over balances, which is the rule against re-deriving money on a screen. It is MK-NW-F ledgerGroups now, and both groupings are pinned to agree.',
  },
  // ISSUED AND DECLARED 2026-10-01. Under an institution's name the screen lists what is inside it —
  // "💵 $182K · 📈 $2.43MM" — several figures on one line, which is why they are shortened. The
  // line had no tag, and shortening was a formatter the screen kept for itself. The shortened form is
  // part of the contract now, so the tag carries it instead of the screen.
  'MK-NW-M-063': {
    label: 'what is inside this institution', unit: 'money-compact',
    screens: ['/analytics'], grain: 'one class in one institution',
    answers: 'What this one institution holds, broken down by kind, so a roll-up can be read rather '
      + 'than taken on trust.',
    formula: 'the accounts at this institution, added up within each kind',
    inputs: ['MK-XS-I-001 account balance'],
    decisions: [
      'BIGGEST FIRST, so the largest thing inside an institution is the first thing read.',
      'SHORTENED, because several of these share one line. It is the only place the app shortens a '
      + 'figure, and it is shortened only to fit — never to round a figure a person is checking.',
      'THE PARTS ADD TO THE INSTITUTION\u2019S OWN TOTAL above them, which is the point of showing them.',
    ],
    refusal: 'One kind only — the line is left out, because a roll-up of one thing is just the thing.',
    ruled: '2026-10-01',
    // $18,000 of checking, shortened to $18K because it shares its line with the other kinds
    worked: { given: GIVEN, answer: '$18K', run: () => theNetWorth(EXAMPLE).byClass.cash },
  },
  'MK-NW-M-008': {
    label: 'each account and its balance', unit: 'money', screens: ['/networth'],
    answers: 'One line per account inside a band, with what that account holds.',
    formula: 'the account\u2019s own balance, listed under the band it belongs to',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-003 institution name'],
    grain: 'one figure per account',
    decisions: [
      'UNDER AN INSTITUTION\u2019S NAME, the class mix inside it is named too \u2014 a Fidelity holding a fund and a Treasury reads as a roll-up, not a flat lump.',
      'The mix is ordered biggest first, so the largest thing inside an institution is the first thing read.',
    ],
    refusal: '$0, and on a fresh account the one line "Nothing entered yet. Add your accounts \u203a". A real entered zero shows a plain $0 with no line.',
    worked: {
      given: LEDGER_GIVEN,
      answer: '$166,200',
      run: () => LEDGER('institution').find((g) => g.label === 'Fidelity')?.total ?? null,
    },
    note: 'DECLARED 2026-09-30 with MK-NW-M-006 \u2014 the same function answers both, which is why the band and the rows beneath it cannot disagree. The worked example is Fidelity: $142,000 of fund plus a $24,200 Treasury.',
  },
  'MK-NW-M-015': {
    // THE LABEL SAYS WHAT IS PRINTED (2026-10-20): it read "on track for $X by age Y", the straight-line projection's
    // wording, while the card prints the sentence of the 1,000 simulated futures. The Plan tab prints the same sentence.
    label: 'YOUR RETIREMENT PLAN \u2014 retire at <age> with ~$X, lasting past <age> with ~$Y to spare, or running short around age <age>',
    unit: 'words', screens: ['/networth', '/plan'],
    answers: 'What your pot is on course to be worth at the age you said you would retire, and whether it lasts to the age your plan runs to.',
    formula: 'the middle of the 1,000 simulated futures the odds come from: what the pot is worth in the year you retire, and what is left at the age the plan runs to, '
      + 'each rounded to the nearest $1,000 (never under $1,000). Still working: "retire at <age> with ~<pot>, " then "lasting past <plan-to age> with ~<left> to spare" '
      + 'when the middle future still has money then, otherwise "running short around age <the age it first reaches $0>" (or "running short before <plan-to age>"). '
      + 'Already retired: "on course to last past <plan-to age>, ~<left> to spare", or the same running-short ending',
    inputs: ['MK-NW-I-001 your accounts', 'MK-PL-I-001 your plan answers'],
    decisions: [
      'HIS WORDS FOR THE VERDICT (DEC-0049, 2026-08-04): working, \u201cretire at 65 with about [pot], lasting past 92 with about [leftover] to spare\u201d; retired, \u201con course to last past 92, about [leftover] to spare\u201d.',
      'THE NUMBER TRAVELS WITH THE WORDS (DEC-0103, 2026-08-11): the odds are printed in front of the sentence \u2014 \u201c87.2% odds of lasting to age 92 \u00b7 retire at 65 with ~$4,124,000, \u2026\u201d (Net worth v08).',
      'ONCE THE THREE ANSWERS EXIST THE REAL SENTENCE SHOWS (DEC-0102, 2026-08-11); until then the card shows the sample, labelled as one, and names what is missing.',
      'ONE SENTENCE, TWO SCREENS: the Plan tab speaks the same sentence from the same simulation (onCourseSentence), so the two cannot disagree.',
      'Guaranteed income starts at the age it was said to start, not at the retirement age.',
    ],
    refusal: 'No sentence when the odds cannot be calculated or there is no pot at retirement: the card shows the sample odds, labelled as a sample, and names the answers still missing \u2014 or "See your plan \u203a" when none is missing.',
    worked: { given: PLAN_GIVEN, answer: 'retire at 65 with ~$931,000, running short around age 87', run: PLAN },
    note: 'DECLARED 2026-09-30 from the straight-line projection (MK-PL-F-055 projectNestEgg), which the Net worth card had stopped printing '
      + 'when it took his verdict sentence (2026-08-04) \u2014 so the row described a number no screen showed, and the sentence the card does show printed under no identifier. '
      + 'Corrected 2026-10-20 (launch check): the row describes the sentence, and the card prints it under this identifier; '
      + 'its label too, and the Plan tab prints the same sentence under it.',
  },
  // THE ODDS IN FRONT OF THAT SENTENCE (launch check, 2026-10-20). They printed under no identifier, on Net worth and on the
  // Plan tab. MK-XS-M-002 is the number the master issued to this figure (the odds, every screen that shows them); it was a
  // hand-typed row there and is declared here now, beside the sentence it travels with (DEC-0103).
  'MK-XS-M-002': {
    label: 'Will my money last \u2014 the odds: <odds>% odds of lasting to age <plan-to age>', unit: 'words', screens: ['/networth', '/plan', '/home'],
    answers: 'In how many of every 100 simulated futures your money lasts to the age your plan runs to.',
    formula: 'the share of the 1,000 simulated futures in which money is still left at the age the plan runs to, as a percent, '
      + 'with nothing rounded away but the computer\u2019s own noise; written "<odds>% odds of lasting to age <plan-to age>"',
    inputs: ['MK-NW-I-001 your accounts', 'MK-PL-I-001 your plan answers'],
    decisions: [
      'THE NUMBER TRAVELS WITH THE WORDS (DEC-0103, 2026-08-11): the odds are printed in front of the retirement sentence (MK-NW-M-015).',
      'NO ROUNDING FOR ODDS (founder, 2026-09-14): \u201cuse exact everywhere no rounding for odds\u201d \u2014 1,000 futures give tenths.',
      'ONE WORD (the canon, row 2, 2026-09-10): odds \u2014 never chance.',
    ],
    refusal: 'No odds until the three answers are given (age, expenses, what you have): the card shows the sample odds, labelled as a sample, and names the answers still missing.',
    worked: {
      given: PLAN_GIVEN,
      answer: '34.7% odds of lasting to age 92',
      run: () => oddsLine('working', displayOdds(simulate({ ...PLAN_INPUTS, with_band: true } as any).chance_of_success), PLAN_INPUTS.horizon_age),
    },
    note: 'DECLARED 2026-10-20 (launch check). Printed under this identifier on the Net worth card, on the Plan tab (the dial, the '
      + 'line for a retired person, the trying-it-out line) and on Home. Cash flow, Insights and the retirement screens print the '
      + 'same odds and do not carry the identifier yet.',
  },
  'MK-NW-M-016': {
    label: 'Net worth so far (setup)', unit: 'money', screens: ['/networth'],
    answers: 'What you are worth as the setup answers stand, before anything else is entered.',
    formula: 'everything owned less everything owed',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-014 what you owe'],
    decisions: [
      'IT IS COMPUTED EACH TIME AND NEVER STORED as a third number that could disagree with its own two halves (his ruling).',
      'A GENUINE NEGATIVE IS SHOWN, never floored at zero \u2014 someone early in a mortgage really does owe more than they own.',
    ],
    refusal: 'Adds to $0 when there is nothing to add. Zero and "nothing recorded yet" read alike on screen \u2014 worth a decision.',
    worked: { given: GIVEN, answer: '$261,200', run: () => NW().netWorth },
    note: 'DECLARED 2026-09-30. It is the SAME arithmetic as MK-NW-M-017 net worth, read during setup rather than on the finished tab \u2014 and because both now print from this one declaration, the setup figure and the tab figure cannot differ.',
  },
  'MK-NW-M-002': {
    label: 'Return on cash + investments', unit: 'percent-2dp', screens: ['/analytics'],
    answers: 'How much your cash and investments have grown since the day you are comparing against, with money you added or took out left out.',
    formula: 'a time-weighted return over your cash and investment accounts: split the period at every day money moved in or out; '
      + 'each piece = the value just before the next movement ÷ the value just after the last one; multiply the pieces and take 1 off. '
      + 'Cash earns only interest, so any other change in a cash balance is money moving, not a gain',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-003 the recorded history', 'MK-NW-I-004 the activity records'],
    decisions: [
      'EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): "All return should be True Weighted Return and not Dietz return." It was a change in balance, so money paid in read as money earned.',
      'THE DAY COMPARED FROM MUST BE ON RECORD. A comparison from before the record begins gives no figure — never one quietly measured from a later day.',
      'CASH EARNS ONLY INTEREST. A paycheck arriving or a bill being paid is money moving, counted on the day the record first shows it.',
    ],
    refusal: 'No figure: the record does not reach back to the day compared from, or money moved on a day with no recorded value.',
    ruled: '2026-10-04',
    worked: {
      given: GIVEN,
      answer: '7.33%',
      run: () => NW().investableChangePct,
    },
  },
  'MK-NW-M-004': {
    label: 'WHAT YOU OWN', unit: 'money', screens: ['/analytics'],
    answers: 'Everything you own, added up.',
    formula: 'the sum of every account’s value',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$503,200',
      run: () => NW().assets,
    },
  },
  'MK-NW-M-005': {
    label: 'CASH', unit: 'money', screens: ['/analytics', '/insights'],
    answers: 'The money you could spend today.',
    formula: 'the sum of every account whose class is cash',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['A CD and a money-market fund are NOT cash: they are bonds and funds, because they pay interest and dividends that must be measured (founder, 2026-08-04).'],
    refusal: 'No cash account entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$18,000',
      run: () => NW().cash,
    },
  },
  'MK-NW-M-007': {
    label: 'class rows — by class, institution or type', unit: 'money', screens: ['/analytics'], grain: 'one class',
    answers: 'What each kind of thing you own is worth.',
    formula: 'each account’s value booked to its class, added up by class',
    inputs: ['MK-NW-I-001 your accounts'],
    refusal: 'A class with nothing in it keeps its heading and says so.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$142,000',
      run: () => NW().byClass.stocks_etf,
    },
  },
  'MK-NW-M-009': {
    label: 'DEBTS', unit: 'money', screens: ['/analytics'],
    answers: 'Everything you owe.',
    formula: 'the sum of every debt’s remaining balance',
    inputs: ['MK-NW-I-002 your debts'],
    refusal: 'No debts entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$242,000',
      run: () => NW().debts,
    },
  },
  'MK-NW-M-010': {
    label: 'each debt and what is left on it', unit: 'money', screens: ['/analytics'], grain: 'one debt',
    answers: 'One line per debt, and what is still owed on it.',
    formula: 'the remaining balance you entered, lowered by each payment logged',
    inputs: ['MK-NW-I-002 your debts'],
    refusal: 'None entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$228,000',
      run: () => NW().debtLines[0].balance,
    },
  },
  'MK-NW-M-011': {
    label: 'minimum monthly payment on a debt', unit: 'money', per: 'month', screens: ['/analytics'], grain: 'one debt',
    answers: 'What this debt requires of you each month.',
    formula: 'the LARGER of the minimum you entered and any monthly payment you set — a debt due in full has no monthly payment at all',
    inputs: ['MK-NW-I-002 your debts'],
    decisions: ['FOUNDER RULING G19 (2026-09-08): one payment rule, the larger of the stated minimum and the payment set — the same words in both formula columns.'],
    refusal: 'No minimum entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$2,400/month',
      run: () => NW().debtLines[0].minimumMonthly,
    },
  },
  'MK-NW-M-012': {
    label: 'Monthly debt payments', unit: 'money', per: 'month', screens: ['/analytics', '/home'],
    answers: 'What all your debts require of you in a month, together.',
    formula: 'the sum of each debt’s required payment',
    inputs: ['MK-NW-I-002 your debts'],
    refusal: 'No debts entered.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$2,650/month',
      run: () => NW().monthlyDebtPayments,
    },
  },
  'MK-NW-M-017': {
    label: 'Assets $X − Debts $Y = Net worth $Z', unit: 'words', screens: ['/analytics'],
    answers: 'The whole sum in one line, so it can be checked by eye.',
    formula: 'assets, debts, and assets minus debts',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-002 your debts'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: 'Assets $503,200 − Debts $242,000 = Net worth $261,200',
      run: () => `Assets ${formatMoney(NW().assets)} − Debts ${formatMoney(NW().debts)} = Net worth ${formatMoney(NW().netWorth)}`,
    },
  },
  'MK-MN-M-016': {
    label: 'Total invested · Cash total · Investable total', unit: 'money', screens: ['/insights'],
    answers: 'The three totals Insights reasons about — and they are the SAME three the Net worth tab shows.',
    formula: 'investments, cash, and everything that is not a house or a car',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['Insights took these its own way before 2026-09-27; his ruling on Q-NW-1 made all three screens read one answer.'],
    refusal: 'Nothing entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$193,200',
      run: () => NW().investable,
    },
  },
  // RE-FILED FROM THE MENU FAMILY TO NET WORTH, 2026-10-01 (was MK-MN-M-022). See the note on
  // MK-NW-M-050 in alternatives-outlook.ts: both were issued under the menu family for figures that
  // live only on the Alternatives screen, which is a Net worth screen.
  'MK-NW-M-049': {
    // the screen prints the words "Total value" above it (OtherInvestmentsScreen:54 and 62); the old
    // label described the figure instead of quoting it, which the label field is not for
    label: 'Total value', unit: 'money', screens: ['/other-investments'],
    answers: 'What your alternatives are worth — crypto, private equity, commodities and the rest.',
    formula: 'the sum of every account whose class is alternatives',
    inputs: ['MK-NW-I-001 your accounts'],
    decisions: ['It is the Alternatives SLICE of net worth and must equal what the Net worth tab shows for that class — which is why it sits behind this door (founder, 2026-09-27: "ok").'],
    refusal: 'None entered yet.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$9,000',
      run: () => NW().alternatives,
    },
  },
});
