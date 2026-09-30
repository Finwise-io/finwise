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
import { projectNestEgg } from '../../../src/domain/retirement';
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
  /** Σ the MINIMUM each debt obliges — the obligation. This is what the Net worth screen prints today. */
  monthlyDebtMinimum: number;
  /** Σ what ACTUALLY leaves the account, counting a payment set above the minimum. */
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
    trend: trendPoints(input.monthlyHistory, input.dailyNetWorth),
    // never invented: with no baseline day, there is no change to state
    investableChangePct: (() => {
      const asPercent = investableChangePct(input.investableDaily, investable, input.since);
      return asPercent == null ? null : asPercent / 100;
    })(),
  };
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
  /** Under an institution's name, the class mix inside it, biggest first. Empty when grouped by class. */
  mix: { key: string; total: number }[];
}

export function ledgerGroups(
  accounts: AssetAccount[],
  by: 'class' | 'institution',
  classLabelOf: (a: AssetAccount) => string,
  classKeyOf: (a: AssetAccount) => string,
): LedgerGroup[] {
  const out = new Map<string, LedgerGroup>();
  for (const a of accounts ?? []) {
    const label = by === 'class' ? classLabelOf(a) : (String((a as any).institution ?? '').trim() || 'No institution set');
    const g = out.get(label) ?? { label, total: 0, accountIds: [], mix: [] };
    g.total += (a as any).balance || 0;
    g.accountIds.push(String((a as any).asset_id));
    if (by === 'institution') {
      const k = classKeyOf(a);
      const m = g.mix.find((x) => x.key === k) ?? { key: k, total: 0 };
      if (!g.mix.includes(m)) g.mix.push(m);
      m.total += (a as any).balance || 0;
    }
    out.set(label, g);
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
const CLASS_LABEL_OF = (a: any) => ({
  cash: 'Cash', stocks_etf: 'Stocks / Funds', bonds: 'Bonds & CDs', alternatives: 'Alternatives',
  real_estate: 'Real estate', personal_property: 'Personal property', mixed: 'Mixed',
} as Record<string, string>)[String(a.asset_class)] ?? 'Unclassified';
const CLASS_KEY_OF = (a: any) => String(a.asset_class);
const LEDGER = (by: 'class' | 'institution') => ledgerGroups(LEDGER_ACCOUNTS, by, CLASS_LABEL_OF, CLASS_KEY_OF);
const LEDGER_BAND = (label: string) => LEDGER('class').find((g) => g.label === label)?.total ?? null;

/** THE TREND LINE, worked. Four months of recorded net worth and one daily point after them. The
 *  daily point sorts AFTER its own month because "2026-04" sorts before "2026-04-30" as plain text —
 *  which is why the merge can sort on the date text and be right. */
const TREND_GIVEN =
  'Net worth recorded at the end of each month — $240,000 in January, $246,000 in February, $252,000 in '
  + 'March, $258,000 in April — and one daily point of $261,200 on 30 April.';
const SNAP = (month: string, net: number) => ({ month, net_worth: net, gross_assets: net + 242000, gross_debt: 242000 });
const TREND = () => theNetWorth({
  ...EXAMPLE,
  // A MONTH IS A SNAPSHOT, NOT A NUMBER — which is what normalizeSnapshot enforces, and what my first
  // draft of this fixture got wrong: it passed bare numbers, every month was correctly rejected, and
  // the example came back with one point. The code was right and the example was not.
  monthlyHistory: {
    '2026-01': SNAP('2026-01', 240000), '2026-02': SNAP('2026-02', 246000),
    '2026-03': SNAP('2026-03', 252000), '2026-04': SNAP('2026-04', 258000),
  },
  dailyNetWorth: { '2026-04-30': 261200 },
}).trend;

/** THE STRAIGHT-LINE RETIREMENT CHECK, worked. No random runs here — it is the plain arithmetic beside
 *  the 1,000-run odds: today's pot grown at the expected return, plus each year's saving grown for the
 *  years it has left. */
const PLAN_GIVEN =
  'A 50-year-old with $184,200 of cash and investments, saving $24,000/year, retiring at 65 and '
  + 'planning to 92, expecting 6% a year with 2.5% inflation, with expenses of $5,500/month in retirement '
  + 'and $2,400/month of guaranteed income from 67.';
const PLAN = () => projectNestEgg({
  current_age: 50, retire_age: 65, horizon_age: 92,
  start_balance: 184200, annual_contribution: 24000,
  retire_monthly_spend_today: 5500, guaranteed_monthly_income: 2400, guaranteed_start_age: 67,
  mean_return: 0.06, inflation: 0.025,
} as any);


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
  'MK-NW-M-003': {
    label: 'the trend line', unit: 'count', screens: ['/networth'],
    answers: 'How many points the line is drawn from \u2014 the months on record plus the days after them.',
    formula: 'every recorded month, plus every daily point, merged and sorted by date text',
    inputs: ['MK-XS-I-031 the recorded history'],
    decisions: [
      'A DAY THAT IS NOT A REAL DATE IS DROPPED, and a month whose figures do not add up is dropped \u2014 never drawn as a guess.',
      'The line is drawn only from days we hold a record for; today\u2019s balances are never priced at past dates.',
    ],
    refusal: 'With one point the point is shown and the line is not drawn.',
    worked: { given: TREND_GIVEN, answer: '5', run: () => TREND().length },
    note: 'DECLARED 2026-09-30, and it is a COUNT, not money \u2014 the master row inherited dollars from the function it shares with MK-NW-M-001.',
  },
  'MK-NW-M-006': {
    label: '\ud83c\udfe0 PERSONAL PROPERTY', unit: 'money', screens: ['/networth'],
    answers: 'What one band under WHAT YOU OWN holds \u2014 here the vehicles and valuables.',
    formula: 'the balances of every account in that band, added up',
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
    label: 'YOUR RETIREMENT PLAN \u2014 on track for $X by age Y', unit: 'money', screens: ['/networth'],
    answers: 'What your pot is on course to be worth at the age you said you would retire.',
    formula: 'today\u2019s cash and investments grown at your expected return for the years until you retire, plus each year\u2019s saving grown for the years it has left',
    inputs: ['MK-NW-I-001 your accounts', 'MK-PL-I-001 your plan answers'],
    decisions: [
      'NO RANDOM RUNS ANYWHERE IN THIS ONE \u2014 it is the straight-line check that sits beside the 1,000-run odds, and the two answer different questions.',
      'The recommended pot is 25\u00d7 the yearly expenses NOT covered by guaranteed income, counted from the start of the retirement year \u2014 which is why it differs from an outside calculator (his ruling).',
      'Guaranteed income starts at the age it was said to start, not at the retirement age.',
    ],
    refusal: 'No figure when there is nothing to grow, or when retirement is not ahead of the person.',
    worked: { given: PLAN_GIVEN, answer: '$1,000,069', run: () => PLAN().will_have },
    note: 'DECLARED 2026-09-30. Its function lives in the plan family (MK-PL-F-055 projectNestEgg) and the figure is read on the Net worth tab, which is why the row is here and the function is there.',
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
