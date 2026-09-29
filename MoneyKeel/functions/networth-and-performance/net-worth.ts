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
  buildAssetsState, cashTotal, investmentsTotal, investableAssets, assetAllocation,
  type AssetClass,
} from '../../../src/domain/assets';
import { buildDebtState, requiredPayment, type Debt } from '../../../src/domain/debt';
import { buildNetWorth } from '../../../src/domain/networth';
import { trendPoints, investableChangePct, type TrendPoint } from '../../../src/domain/history';

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
  monthlyDebtPayments: number;
  /** How it moved: the line, and the return on cash + investments. Null when the record cannot say.
   *  A RATE, held as 0…1 — the form every other percent in the register uses, so one display rule
   *  rounds them all (Q49). The function underneath returns it already multiplied by 100; the door
   *  converts once, here, rather than leaving four screens to remember which form they were handed. */
  trend: TrendPoint[];
  investableChangePct: number | null;
}

/* ─ MK-NW-O-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theNetWorth
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     accounts = input.accounts (or none when missing)
 *     debts = input.debts (or none when missing)
 *     a state = build assets state(input.uid, accounts)
 *     d state = build debt state(input.uid, debts)
 *     nw = build net worth(input.uid, a state.total asset value, d state.total debt balance)
 *     by class = asset allocation(accounts)
 *     investable = investable assets(accounts)
 *     as percent = investable change pct(input.investable daily, investable, input.since)
 *     the answer:
 *     nothing   if as percent = nothing
 *     as percent ÷ 100   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-MN-M-016 · MK-MN-M-022 · MK-NW-M-002 · MK-NW-M-004
 *               MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-009 · MK-NW-M-011
 *               MK-NW-M-017 · MK-XS-M-001 · MK-XS-M-003
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If alternatives is missing it uses 0.
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-003
 * Changed ..... not in git yet (—)
 */
/** ── ORCHESTRATOR ─────────────────────────────────────────────────────────────────────
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-NW-O-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theNetWorth
 *
 * Answers ..... ── ORCHESTRATOR ───────────────────────────────────────────────────────────────────── The one function a screen calls for this question.
 *
 * Formula .....
 *     accounts = input.accounts (or none when missing)
 *     debts = input.debts (or none when missing)
 *     a state = build assets state(input.uid, accounts)
 *     d state = build debt state(input.uid, debts)
 *     nw = build net worth(input.uid, a state.total asset value, d state.total debt balance)
 *     by class = asset allocation(accounts)
 *     investable = investable assets(accounts)
 *     as percent = investable change pct(input.investable daily, investable, input.since)
 *     the answer:
 *     nothing   if as percent = nothing
 *     as percent ÷ 100   otherwise
 *
 * Called by ... MK-NW-F-082 NW
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW
 *
 * Serves ...... MK-MN-M-016 · MK-MN-M-022 · MK-NW-M-002 · MK-NW-M-004
 *               MK-NW-M-005 · MK-NW-M-007 · MK-NW-M-009 · MK-NW-M-011
 *               MK-NW-M-017 · MK-XS-M-001 · MK-XS-M-003
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-003 institution name
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-048 the person’s own asset-class answer
 *
 * Decides .....
 *     · If alternatives is missing it uses 0.
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-NW-O-003
 * Changed ..... not in git yet (—)
 */
export function theNetWorth(input: {
  uid: string;
  accounts: AssetAccount[];
  debts: Debt[];
  /** The recorded history, for the line and the return. */
  monthlyHistory?: Record<string, unknown> | null;
  dailyNetWorth?: Record<string, unknown> | null;
  investableDaily?: Record<string, unknown> | null;
  /** The day a change is measured FROM. With none, the change figures refuse. */
  since?: string | null;
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
    minimumMonthly: requiredPayment(d),
  }));

  return {
    netWorth: nw.net_worth,
    assets: aState.total_asset_value,
    debts: dState.total_debt_balance,
    cash: cashTotal(accounts),
    investments: investmentsTotal(accounts),
    investable,
    byClass,
    alternatives: byClass.alternatives ?? 0,
    debtLines,
    monthlyDebtPayments: debtLines.reduce((t, d) => t + d.minimumMonthly, 0),
    trend: trendPoints(input.monthlyHistory, input.dailyNetWorth),
    // never invented: with no baseline day, there is no change to state
    investableChangePct: (() => {
      const asPercent = investableChangePct(input.investableDaily, investable, input.since);
      return asPercent == null ? null : asPercent / 100;
    })(),
  };
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
  investableDaily: { '2026-01-02': 180000 },
  since: '2026-01-01',
};
const GIVEN =
  '$18,000 checking, $142,000 brokerage, a $24,200 Treasury, a $310,000 rental and $9,000 of gold; '
  + 'against a $228,000 mortgage at $2,400/month and a $14,000 car loan at $250/month. '
  + 'Cash + investments stood at $180,000 on 2 Jan 2026.';
/* ─ MK-NW-F-082 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * NW
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the net worth(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-003 institution name
 *               MK-XS-I-048 the person’s own asset-class answer
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-082
 * Changed ..... not in git yet (—)
 */
const NW = () => theNetWorth(EXAMPLE);

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
  'MK-NW-M-002': {
    label: 'Return on cash + investments', unit: 'percent-2dp', screens: ['/analytics'],
    answers: 'How much your money that is not a house or a car has moved, since the day you are comparing against.',
    formula: 'today’s investable total ÷ the first investable figure recorded on or after that day, minus 1',
    inputs: ['MK-NW-I-001 your accounts', 'MK-NW-I-003 the recorded history'],
    decisions: ['No recorded day on or after the baseline → no figure. A movement from a day nobody recorded is not a movement.'],
    refusal: 'The record does not reach back that far, so it shows nothing rather than a made-up change.',
    ruled: '2026-09-27',
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
  'MK-MN-M-022': {
    label: 'the total value of these investments', unit: 'money', screens: ['/other-investments'],
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
