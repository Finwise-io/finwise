/* THE OUTSIDE CASES, RUN AGAINST THE APP — Performance module re-run, OpenAI package of 2026-10-13, PART 1 of 4.
 * Cards: MK-NW-F-084 categoryEarnings · MK-NW-F-090 windowStartKey · MK-NW-F-091 pricedGainOf · MK-NW-F-092
 * investmentAccountIdsOf · MK-NW-F-103 investmentRecordDates · MK-NW-F-104 closedWith (no cases) · MK-NW-F-105
 * whyNoReturn · MK-NW-F-127 gainOfRow · MK-NW-F-128 heldValueOf · MK-NW-F-129 gainRowName · MK-NW-F-130
 * cannotWorkBackSentence (now notIncludedSentence) · MK-NW-O-007 theLookBack · MK-NW-O-008 thePerformance.
 *
 * THIS FILE'S SHARE (the lead's split of 2026-10-21): part 1's `cases` (60), `formula_checks` (13) and `still_open` (52).
 * Part 1's rules_held, screen_checks and could_not_test are another agent's; parts 2–4 and the tax/acceptance file too.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/
 * MoneyKeel_audit_part_1.json, run brief MoneyKeel_Claude_Code_Brief.md beside it; the cards the reviewer saw are
 * source_packet/moneykeel_audit_module_pf_for-the-outside-judge_v01_cards-part-1-of-4.md. Every expected answer is READ
 * FROM THE PACKAGE (C(...).expected), never retyped; only its plain input names are mapped onto the app's fields. A case
 * the app answers differently is marked, never fixed by changing the answer here. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_01_results.json
 *
 * MEASURED ONLY (2026-10-21): no app code, drawing, record or existing test was changed. Net worth agents were changing
 * code at the same time; a case whose answer depends on their work is marked IN-FLIGHT and is re-run after it lands.
 *
 * Markers: `// APP WRONG:` the reviewer is right by a ruling or standard named on the line (test.failing on the
 * reviewer's answer) · `// REVIEWER WRONG:` a ruling or a code fact makes the app right (test.failing on the reviewer's
 * answer, plus a plain test pinning the app's hand-checked answer) · `// NEEDS A RULING:` no ruling settles it, so the
 * app's current answer is pinned · `// BLOCKED:` it cannot be handed to the function (test.skip) · `// SETTLED BY DEC-…:`
 * the reviewer wrote RULE UNCLEAR and a decision answers it (AGREES when the app follows it) · `// IN-FLIGHT (…):`
 * depends on uncommitted Net worth work.
 *
 * INPUT NAMES MAPPED (the app's fields, never the answers):
 *   A class word on an account → its asset_class, read by the app's own assetClassOf, the function every screen hands
 *   investmentAccountIdsOf ("Stocks / Funds" 'stocks_etf', "Bonds & CDs" 'bonds', "Alternatives" 'alternatives',
 *   "Unclassified" 'mixed', "Cash" 'cash', "Real estate" kind 'home').
 *   A dated account value {date, values} → a recorded day whose account rows carry the value as typedValue (a value is a
 *   value, linked or typed); a missing balance (null) is written exactly as buildDayFromAccounts writes a balance never
 *   entered (cash 0, typedValue null). accounts {A: v} → linked accounts (source 'connected', balance v); a cash sleeve
 *   → cash_balance with the rest in a priced holding, as the sync leaves a linked account (DEC-0095).
 *   A holding row {value, periodTotal, couponRate, shares, last_price, marketValue, kind, multiplier, value_now} → a
 *   GainRow { marketValue, periodReturn, periodTotal, couponRate, position: { last_price, kind, multiplier, value_now,
 *   lots: [{ shares }] } }. Where the reviewer describes purchases and prices, the row is BUILT by the app's own
 *   MK-PF-F-014 buildPerformance from real lots and a price series — the row every screen hands the door.
 *   theLookBack prices [start, end] → a price series with a close on the window's first day and one today; its result's
 *   pct is in percent (×100), so the reviewer's 0.10 is compared with pct ÷ 100.
 *   whyNoReturn refusal words → the engine's codes: end_not_recorded END_NOT_RECORDED, flow_without_value
 *   MOVEMENT_DAY_NOT_RECORDED, start_not_recorded START_NOT_RECORDED; a measured rate → the verdict the engine returns.
 *   cannotWorkBackSentence(names) → MK-NW-F-130 notIncludedSentence(names as { name, value: null }, nothing counted),
 *   the function that carries the ID since DEC-5068 (2026-10-13) renamed it.
 *   gainOfRow, heldValueOf, gainRowName and notIncludedSentence are not exported: each is compiled from its own source
 *   text in performance.ts with the functions it imports handed in under their own names — the app's text, nothing retyped.
 * TOLERANCES: money to 1e-6 dollars (toBeCloseTo …, 6), rates to 1e-12 (toBeCloseTo …, 12) — floating sums only;
 * strings exact; REFUSES = no number (null), never 0. "shown" strings are screen formatting and are not asserted.
 *
 * RE-MEASURED 2026-10-21 after 13:30 PT (the cut-off agent's file, finished): the still-open points #10–#49 name the same
 * figures as part 1's screen checks, which another agent rendered on the real screens
 * (performance_openai_rerun_01_screens_results.json). Where that render or a ruling showed my first mark was wrong, the
 * mark here was changed to match the evidence: #10 (the Plan's $300 is its own row), #17 and #32 (DEC-0095: the gap is
 * cash), #18 (DEC-2748b: no face, no interest figure), #20 (no ruling of his reads an unanswered CD as a bank CD),
 * #29 (Home's change line), #30 and #40 (a new account as the app really records it: no evening before), #31 and #41
 * (tenet 2: the rows add up), #43 (tenet 1: −100.00% is not the arithmetic), #46 and #47 (DEC-3279e, tenet 3).
 * IN-FLIGHT now means one of the four code agents running at 13:30: ZERO (a holding that fell to $0 — gainOfRow,
 * startValues, heldValueOf), SYNC (reversed deposits, income with no amount), GAINS (Holding page gains — undated purchase,
 * tax-advantaged split, $0 price paid), ACCOUNT (account page rows, emergency fund, Job safety, Home, a holding with no
 * class, the CD question). The case list and its in-flight flags are in the results file.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import {
  thePerformance, windowStartKey, investmentAccountIdsOf, investmentRecordDates, whyNoReturn, pricedGainOf,
  categoryEarnings, PERFORMANCE_FIGURES, lastCloseLabel,
} from './performance';
import { theLookBack } from './look-back';
import { theNetWorth } from './net-worth';
import { FIGURE_REGISTER } from '../figures';
import { writeFigure, walkShown } from '../_figure-spec';
import { thisMonth } from '../cashflow/this-month';
import { payrollTaxWithheld } from '../cashflow/base-pay';
import { timeWeightedReturn } from '../../../Calculation Module code/engines/time-weighted-return';
import { buildDayFromAccounts, accountValuesOn } from '../../../Calculation Module code/engines/snapshots';
import { windowBounds } from '../../../Calculation Module code/engines/window-return';
import {
  contractMultiplier, totalShares, windowTotal, worthWithInterest, buildPerformance, costBasis, capGains, marketValue,
  quantityWithUnit, portfolioBenchReturn, periodReturn,
} from '../../../src/domain/performance';
import { saleShortOfPurchasesSentence, realizedFromLedger } from '../../../src/domain/performance/realized';
import { holdingClassOf, assetClassOf, investmentsTotal, cashTotal, investableAssets, accountClassBreakdown } from '../../../src/domain/assets';
import { bondInfo, yearlyInterest } from '../../../src/domain/bonds';
import { theBonds } from './bonds';
import { availableCash } from '../../../src/domain/transactions';
import { dataGaps } from '../../../src/domain/gaps';
import { taxOwedFor } from '../../../src/domain/income/tax';
import { plural } from '../../../src/domain/_shared/plural';
import { dateShown } from '../../../src/domain/_shared/dates';

// ── the functions the app does not export, compiled from their own source text ──────────────────────
const IMPORTED: Record<string, unknown> = { contractMultiplier, totalShares, windowTotal, plural, writeFigure, PERFORMANCE_FIGURES, worthWithInterest, holdingClassOf, costBasis };
const compile = (file: string, parts: { start: RegExp; end: string }[], name: string) => {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const code = parts.map(({ start, end }) => {
    const at = text.search(start);
    if (at < 0) throw new Error(`${start} not found in ${file}`);
    return text.slice(at, text.indexOf(end, at) + end.length);
  }).join('\n');
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function(...Object.keys(IMPORTED), `${js}\nreturn ${name};`)(...Object.values(IMPORTED));
};
const gainOfRow: (r: any, years: number) => number | null = compile('performance.ts',
  [{ start: /function gainOfRow\(/, end: '\n}\n' }, { start: /function heldValueOf\(/, end: '\n}\n' }], 'gainOfRow');
const heldValueOf: (r: any) => number | null = compile('performance.ts', [{ start: /function heldValueOf\(/, end: '\n}\n' }], 'heldValueOf');
const gainRowName: (r: any) => string = compile('performance.ts', [{ start: /function gainRowName\(/, end: '\n}\n' }], 'gainRowName');
const notIncludedSentence: (left: { name: string; value: number | null }[], countedValue: number) => string =
  compile('performance.ts', [{ start: /function notIncludedSentence\(/, end: '\n}\n' }], 'notIncludedSentence');

// ── the package, read as it came ────────────────────────────────────────────────────────────────────
type Mark = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'BLOCKED';
const PKG = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package');
const PART = JSON.parse(fs.readFileSync(path.join(PKG, 'MoneyKeel_audit_part_1.json'), 'utf8'));
const C = (id: string, kind: string, title: string): any => {
  const c = PART.cases.find((x: any) => x.id === id && x.kind === kind && x.title === title);
  if (!c) throw new Error(`no case ${id} · ${kind} · ${title} in the package`);
  return c;
};
const RAN: string[] = [];
const runner = (mark: Mark) => (mark === 'APP WRONG' || mark === 'REVIEWER WRONG' ? test.failing : mark === 'BLOCKED' ? test.skip : test);
const kase = (id: string, kind: string, title: string, mark: Mark, fn: (c: any) => void, fixed?: string) => {
  RAN.push(`${id} · ${kind} · ${title}`);
  runner(mark)(`${kind} · ${title} [${mark}]${fixed ? ` — ${fixed}` : ''}`, () => fn(C(id, kind, title)));
};

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const refuses = (v: unknown) => expect(v == null).toBe(true);
/** a recorded day: every value as the account's own recorded value; null = a balance never entered, as the app writes it */
const day = (date: string, values: Record<string, number | null>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const linked = (id: string, balance: number, over: Record<string, any> = {}) =>
  ({ asset_id: id, label: id, kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'connected', balance, cash_balance: 0, positions: [], target_return: 0.06, ...over });
const series = (ticker: string, points: [string, number][]) => ({ ticker, points: points.map(([date, close]) => ({ date, close })) });
const lot = (shares: number, cost: number | null, date: string) => ({ lot_id: `${date}-${shares}`, shares, cost_per_share: cost, purchase_date: date });
const shown = (id: string) => { const f: any = FIGURE_REGISTER[id]; const raw = f.worked.run(); return typeof raw === 'string' ? raw : writeFigure(f, raw, { withPeriod: !!f.per }); };
const workedRun = (id: string): any => (FIGURE_REGISTER[id] as any).worked.run();

/** THE MORNING PURCHASE (DEC-4439): 10 shares bought Sep 1 at $100 (close $100), 10 more the next morning at $100,
 *  close $110 — the row the app builds for it, and the category table it feeds. */
const morningRows = () => buildPerformance([{ position_id: 'p2', ticker: 'Y', kind: 'stock', asset_class: 'stock_etf',
  lots: [lot(10, 100, '2026-09-01'), lot(10, 100, '2026-09-02')] } as any],
() => series('Y', [['2026-08-31', 100], ['2026-09-01', 100], ['2026-09-02', 110]]) as any, '1M', new Date('2026-09-02T12:00:00'));
/** SHARES ADDED INSIDE THE WINDOW: 10 held before the 1Y window (close $100 the evening before it), 10 more bought at
 *  $110 on Apr 1, close $121 today — the row the app builds (not capped: the first purchase is before the window). */
const toppedUpRow = () => buildPerformance([{ position_id: 'p1', ticker: 'X', kind: 'stock', asset_class: 'stock_etf',
  lots: [lot(10, 90, '2025-01-02'), lot(10, 110, '2026-04-01')] } as any],
() => series('X', [['2025-01-02', 90], ['2025-10-12', 100], ['2026-04-01', 110], ['2026-10-13', 121]]) as any, '1Y', new Date('2026-10-13T12:00:00'))[0];
/** DEC-4644's household: 1,000 shares $100 → $105 paying $1.20 a share, the feed's adjusted start $100 × (1 − 1.20 ÷ 100) */
const ADJUSTED = 105 / (100 * (1 - 1.2 / 100)) - 1;   // 6.2753%, shown 6.28% (precision spec line 139: "105 ÷ 98.80 − 1 = 6.28%")
const wipedOut = { position: { ticker: 'X', last_price: 0, lots: [{ shares: 10 }] }, marketValue: 0, periodReturn: -1, periodTotal: -1 };
/** A TOTAL LOSS as the app builds it: 10 shares held before the 1Y window (close $100 the evening before), worth $0 today */
const wipedOutRow = () => buildPerformance([{ position_id: 'w1', ticker: 'W', kind: 'stock', asset_class: 'stock_etf', lots: [lot(10, 90, '2025-01-02')] } as any],
  () => series('W', [['2025-01-02', 90], ['2025-10-12', 100], ['2026-10-13', 0]]) as any, '1Y', new Date('2026-10-13T12:00:00'))[0];
const handIra = (b: number | null) => ({ asset_id: 'IRA', label: 'IRA', kind: 'ira', asset_class: 'stocks_etf', tax_bucket: 'PRE_TAX', source: 'manual', balance: b, positions: [] });
/** Brokerage $50,000 linked; an IRA added the same day with no balance; $20,000 typed for it the next day */
const blankThenTyped = () => {
  const dA = buildDayFromAccounts([linked('BRK', 50000), handIra(null)] as any, '2026-09-01', 'x');
  const dB = buildDayFromAccounts([linked('BRK', 50000), handIra(20000)] as any, '2026-09-02', 'x');
  const ids = new Set(['BRK', 'IRA']);
  return thePerformance({ windowStart: windowStartKey('SINCE', investmentRecordDates([dA, dB], ids), '2026-09-03'), windowLabel: 'w', today: '2026-09-03',
    transactions: [], snapshotDays: [dA, dB], investmentAccountIds: ids, accounts: [linked('BRK', 50000), handIra(20000)] as any[], wholeRecord: true });
};
/** a hand brokerage worth $1,000, with a $1,000 deposit typed for Sep 5 while today is Sep 2 (balance already $2,000) */
const futureDeposit = () => thePerformance({ windowStart: '2026-09-01', windowLabel: 'w', today: '2026-09-02',
  transactions: [{ type: 'DEPOSIT', account_id: 'H', date: '2026-09-05', amount: 1000 }],
  snapshotDays: [day('2026-08-31', { H: 1000 }), day('2026-09-01', { H: 1000 })], investmentAccountIds: new Set(['H']),
  accounts: [{ asset_id: 'H', label: 'H', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'manual', balance: 2000, positions: [] }] });
const cashSleeveA = () => linked('A', 1330.58, { cash_balance: 130.58, positions: [{ position_id: 'pa', ticker: 'VTI', last_price: 120, lots: [{ shares: 10, cost_per_share: 100 }] }] });
const undated = () => capGains({ lots: [{ shares: 10, cost_per_share: 100, purchase_date: '' }] } as any, 120, new Date('2026-09-28T12:00:00'));
const visaNoPayment = () => theNetWorth({ uid: 'u', accounts: [], debts: [...EX.debts, { debt_id: 'd3', label: 'Visa', debt_type: 'CREDIT_CARD',
  remaining_balance: 3000, interest_rate_apr: 0.24, minimum_monthly_payment: null, payment_type: 'revolving' }] as any });
const EX: any = { ym: '2026-09', takeHomeMonthly: 7200, inflowSources: ['income (take-home)'],   // this-month.ts:447 — the worked month, as written there
  debts: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }],
  plannedExpenses: 3400, expenses: [{ amount: 2300, category: 'Rent / Mortgage', date: '2026-09-01' }, { amount: 512, category: 'Groceries', date: '2026-09-07' },
    { amount: 186, category: 'Eating out', date: '2026-09-12' }, { amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12' }] };
/** the walk of case "Multiaccount cash …", each row rounded alone as the screen writes it, against the ending rounded */
const roundedRows = () => ({ rowsAdd: [3000.48, 500.11, -200.07, 17.29, 3.41, -50.72].map((v) => Math.round(v)).reduce((t, v) => t + v, 0), ending: Math.round(3270.5) });
/** the same walk as the screens print it since 2026-10-21 (walkShown, the one writer: whole dollars that add up) */
const shownRows = () => {
  const w = walkShown({ beginning: 3000.48, contributions: 500.11, withdrawals: 200.07, dividends: 17.29, interest: 3.41, marketChange: -50.72, ending: 3270.5 });
  return { rowsAdd: w.beginning + w.contributions - w.withdrawals + w.dividends + w.interest + w.marketChange, ending: w.ending, w };
};
/** DEC-4439's new account AS THE APP RECORDS IT: the first recorded day is the deposit's day ($10,000 in, worth `evening`
 *  that night) — no row exists for the evening before, because the account did not exist (the screen check's household). */
const newAccount = (evening: number) => {
  const days = [day('2026-09-27', { n1: evening }), day('2026-09-28', { n1: evening })]; const ids = new Set(['n1']);
  return thePerformance({ windowStart: windowStartKey('SINCE', investmentRecordDates(days, ids), '2026-09-28'), windowLabel: 'w', today: '2026-09-28',
    transactions: [{ type: 'DEPOSIT', account_id: 'n1', date: '2026-09-27', amount: 10000 }], snapshotDays: days as any, investmentAccountIds: ids,
    accounts: [linked('n1', evening)] as any[], wholeRecord: true });
};
/** a linked account whose broker total ($50,000) is more than its classed holdings ($40,000) plus the cash it reports ($5,000) */
const brokerGap = () => accountClassBreakdown(linked('F', 50000, { cash_balance: 5000,
  positions: [{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', last_price: 400, lots: [{ shares: 100, cost_per_share: 300 }] }] }) as any)!;
/** a bond with a 4.50% rate and a $24,200 market value, its face never entered */
const facelessBond = () => bondInfo({ asset_id: 'b1', label: 'US Treasury 2031', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', source: 'manual',
  balance: 24200, market_value: 24200, face_value: null, coupon_rate: 0.045, maturity_date: '2031-05-15' } as any);
/** a CD whose "bought from the bank, or through a broker?" was never answered — the page's if-rates-move words */
const unansweredCd = () => theBonds({ accounts: [{ asset_id: 'cd1', label: 'Schwab CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', target_return: 0.042,
  balance: 10000, face_value: 10000, coupon_rate: 0.042, maturity_date: '2028-10-10' }] as any, accountId: 'cd1', today: new Date(2027, 3, 10) } as any).one!.ratesMoveRefusal;
const unclassifiedIncome = () => categoryEarnings({ windowStart: '2026-01-01', rows: [{ position: { ticker: 'ZZZ' }, marketValue: 1000, periodReturn: 0.05, periodTotal: 0.05 }],
  transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'ZZZ', date: '2026-03-01', amount: 40 }] });

// ════════════════════════════════════════════ THE 60 CASES ════════════════════════════════════════════

describe('MK-NW-F-084 categoryEarnings — five cases', () => {
  kase('MK-NW-F-084', 'easy', 'One stock dividend', 'AGREES', (c) => {
    const out = categoryEarnings({ windowStart: '2026-01-01',
      transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'VTI', date: '2026-06-15', amount: c.inputs.dividend }],
      rows: [{ position: { ticker: 'VTI', asset_class: 'stock_etf' }, marketValue: c.inputs.stock_value, periodReturn: c.inputs.stock_total, periodTotal: c.inputs.stock_total }] });
    const s = out.find((b) => b.label === 'Stocks / Funds')!;
    expect(s.earned).toBeCloseTo(c.expected['Stocks / Funds'].earned.exact, 6);
    expect(s.ret!).toBeCloseTo(c.expected['Stocks / Funds'].ret.exact, 12);
  });
  kase('MK-NW-F-084', 'easy', 'Untickered cash interest', 'AGREES', (c) => {
    const out = categoryEarnings({ windowStart: '2026-01-01', rows: [],
      transactions: [{ type: 'INTEREST', account_id: 'BROKERAGE', date: '2026-03-01', amount: c.inputs.interest }] });
    const b = out.find((x) => x.label === 'Cash in this account')!;
    expect(b.earned).toBeCloseTo(c.expected['Cash in this account'].earned.exact, 6);
    expect(b.ret).toBe(c.expected['Cash in this account'].ret);
  });
  // APP WRONG (DEC-4439, 2026-10-11, "approved.": money that arrives on a day counts for that whole day — the day's
  // growth is 2,200 ÷ (1,000 + 1,000) = +10.00%). The app gives +15.24%: the row's return comes from MK-PF-F-040
  // returnSincePurchases, which values the old shares at that day's close BEFORE adding the purchase (1.10 × 2,200 ÷
  // 2,100). The category return copies the row. Same fault as part 4's MK-PF-F-040 (+26.76% vs +15.24%). Earned agrees.
  // FIXED 2026-10-21 (DEC-4439; MK-PF-F-040): the piece before a purchase ends at the previous evening's close, so the row —
  // and the category that copies it — reads 2,200 ÷ (1,000 + 1,000) − 1 = +10.00%. Was APP WRONG.
  kase('MK-NW-F-084', 'complex', 'Large stock addition invalidates synthetic category return', 'AGREES', (c) => {
    const out = categoryEarnings({ windowStart: '2026-09-02', rows: morningRows() as any,
      transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'Y', date: '2026-09-02', amount: c.inputs.dividend_received }] });
    const s = out.find((b) => b.label === 'Stocks / Funds')!;
    expect(s.earned).toBeCloseTo(c.expected.earned.exact, 6);
    expect(s.ret!).toBeCloseTo(c.expected.category_TWR.exact, 12);
  }, 'fixed 2026-10-21 by DEC-4439: a purchase counts from the start of its day');
  test.failing('complex · Large stock addition — the app\'s answer until 2026-10-21, pinned: earned $37.19, return +15.24% — no longer its answer (FIXED 2026-10-21)', () => {
    const out = categoryEarnings({ windowStart: '2026-09-02', rows: morningRows() as any, transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'Y', date: '2026-09-02', amount: 37.19 }] });
    expect(out[0].earned).toBeCloseTo(37.19, 6);
    expect(out[0].ret!).toBeCloseTo(1.1 * (2200 / 2100) - 1, 12);
  });
  // DECIDED 2026-10-21 (NWFIX, the lead's decision under DEC-3523 tenets 1 and 4; was NEEDS A RULING): a figure is never
  // under the wrong class name. The table gains an Alternatives row (the class name Net worth prints), shown where an
  // alternative earned something, so the $83.27 reads under Alternatives with no return (it has no price history). The
  // reviewer's refusal of the whole table is not needed: every row it would refuse is now right — REVIEWER WRONG on that.
  // Before: "Stocks / Funds — earned $83.27, +7.31%".
  const partialAlt = (c: any) => categoryEarnings({ windowStart: '2026-01-01',
    transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'ALTX', date: '2026-06-02', amount: c.inputs.alternative_dividend }],
    rows: [{ position: { ticker: 'VTI', asset_class: 'stock_etf' }, marketValue: c.inputs.stock_value, periodReturn: c.inputs.stock_return, periodTotal: c.inputs.stock_return },
      { position: { ticker: '', label: 'US Treasury 2031', asset_class: 'bond' } as any, marketValue: c.inputs.unpriced_bond_value, periodReturn: null, periodTotal: null },
      { position: { ticker: 'ALTX', asset_class: c.inputs.alternative_class }, marketValue: 5000, periodReturn: null, periodTotal: null }] });
  kase('MK-NW-F-084', 'complex', 'Partial priced coverage and misclassified alternative income', 'REVIEWER WRONG', (c) => {
    expect(c.expected).toBe('REFUSES');
    expect(partialAlt(c)).toEqual([]);
  }, 'decided 2026-10-21 (tenets 1, 4): an Alternatives row, never Stocks / Funds');
  test('complex · Partial priced coverage — the app\'s answer since the decision: Alternatives earned $83.27, no return (before: Stocks / Funds $83.27, +7.31%)', () => {
    const out = partialAlt(C('MK-NW-F-084', 'complex', 'Partial priced coverage and misclassified alternative income'));
    expect(out.map((b) => [b.label, b.earned, b.ret])).toEqual([['Alternatives', 83.27, null]]);
  });
  kase('MK-NW-F-084', 'edge', 'Day one with no income', 'AGREES', (c) => {
    const out = categoryEarnings({ windowStart: null, transactions: c.inputs.transactions, rows: [], dayOne: c.inputs.dayOne });
    expect(out.map((b) => ({ label: b.label, earned: b.earned, ret: b.ret })))
      .toEqual(c.expected.categories.map((b: any) => ({ label: b.label, earned: b.earned.exact, ret: b.ret })));
  });
});

describe('MK-NW-F-090 windowStartKey — five cases', () => {
  kase('MK-NW-F-090', 'easy', 'Since starts after recorded beginning', 'AGREES', (c) => {
    expect(windowStartKey('SINCE', c.inputs.record_dates, c.inputs.today)).toBe(c.expected);
  });
  kase('MK-NW-F-090', 'easy', 'This year', 'AGREES', (c) => { expect(windowStartKey(c.inputs.period, [], c.inputs.today)).toBe(c.expected); });
  kase('MK-NW-F-090', 'complex', 'Short February and unsorted dates', 'AGREES', (c) => {
    expect(windowStartKey(c.inputs.period, c.inputs.record_dates, c.inputs.today)).toBe(c.expected);
  });
  // REVIEWER WRONG (input outside the domain): no record day can be "2026-02-31" or after today. Every recorded day is
  // written from the device's calendar (useStore.ts:1035 captureDailyNw → record, one row per date), the rebuild walks
  // real calendar days, and the in-flight typedValueOnItsDate refuses a date that is not a calendar day or is after
  // today (snapshots.ts). Handed one anyway, the app rolls Feb 31 to Mar 3 and answers "2026-03-04"; pinned below.
  kase('MK-NW-F-090', 'complex', 'Future and impossible record dates', 'REVIEWER WRONG', (c) => {
    expect(windowStartKey(c.inputs.period === 'Since' ? 'SINCE' : c.inputs.period, c.inputs.record_dates, c.inputs.today)).toBe(c.expected);
  });
  test('complex · Future and impossible record dates — the app\'s answer, pinned', () => {
    expect(windowStartKey('SINCE', ['2026-02-31', '2026-11-01', '2026-09-19'], '2026-10-13')).toBe('2026-03-04');
    expect(windowStartKey('SINCE', ['2026-11-01', '2026-09-19'], '2026-10-13')).toBe('2026-09-20');   // real days only: the reviewer's answer
  });
  kase('MK-NW-F-090', 'edge', 'Unsupported 5Y', 'AGREES', (c) => {
    expect(c.expected).toBe('REFUSES');
    refuses(windowStartKey(c.inputs.period, [], c.inputs.today));   // DEC-4640
  });
});

/** MK-NW-F-091 and MK-NW-F-127 carry the same five cases: pricedGainOf adds gainOfRow over the rows. */
const gainCases = (id: 'MK-NW-F-091' | 'MK-NW-F-127', gain: (rows: any[], years: number) => number | null) => {
  kase(id, 'easy', 'Unchanged holding at 10%', 'AGREES', (c) => {
    expect(gain([{ position: { ticker: 'VTI' }, marketValue: c.inputs.value, periodReturn: c.inputs.periodTotal, periodTotal: c.inputs.periodTotal }], 0.75)!)
      .toBeCloseTo(c.expected.exact, 6);
  });
  kase(id, 'easy', 'CD one year at 5%', 'AGREES', (c) => {
    expect(gain([{ name: 'CD', marketValue: c.inputs.value, periodReturn: null, couponRate: c.inputs.couponRate }], c.inputs.years)!).toBeCloseTo(c.expected.exact, 6);
  });
  // APP WRONG (DEC-3656: "today's value less what each holding gained, less the money moved"; DEC-6412 already counts a
  // purchase inside the worked-back days "at what was paid"). The holding gained $320: worth $1,000 + $1,100 paid,
  // now $2,420. The app divides today's 20 shares by the price move: 2,420 × (1 − 1 ÷ 1.21) = $420 — a beginning of
  // $2,000 that never existed. The row is the one buildPerformance builds (first purchase before the window: not capped).
  // FIXED 2026-10-22 (DEC-3656; W-START): the row carries what the 10 shares held when the window began were worth ($1,000)
  // and what was paid for the 10 bought inside it ($1,100), and the gain is $2,420 − $1,000 − $1,100 = $320. Was APP WRONG.
  kase(id, 'complex', 'Holding quantity increased inside window', 'AGREES', (c) => {
    const row = toppedUpRow();
    expect(row.marketValue).toBeCloseTo(c.inputs.end_value, 6);
    expect(row.periodTotal!).toBeCloseTo(c.inputs.periodTotal, 12);
    expect(gain([row], 1)!).toBeCloseTo(c.expected.exact, 6);
  }, 'fixed 2026-10-22 by DEC-3656: the start is the shares held then, and the money paid inside is not a gain');
  // REVIEWER WRONG — the reviewer wrote RULE UNCLEAR because DEC-4644's example "does not add up" (105,000 ÷ 1.0628 =
  // 98,795.63). It does: 6.28% is the DISPLAY of the feed's adjusted return 105 ÷ 98.80 − 1 = 6.2753% (the precision
  // spec writes exactly that, line 139). At full precision the holding gained 105,000 − 98,800 = $6,200 = $5,000 price
  // + $1,200 dividend, and the beginning is $100,000 — the owner's figure. Settled by DEC-4644. The reviewer's claim
  // ("the owner's $100,000 cannot come from the adjusted return") is what this failing test asserts.
  kase(id, 'complex', 'Distribution paid outside holding', 'REVIEWER WRONG', (c) => {
    expect(c.expected).toBe('RULE UNCLEAR');
    const g = gain([{ position: { ticker: 'VTI' }, marketValue: c.inputs.holding_end_value, periodReturn: ADJUSTED, periodTotal: ADJUSTED }], 0.25)!;
    expect(Math.abs(g - (c.inputs.paid_cash_dividend + (c.inputs.raw_end_price - c.inputs.raw_start_price) * c.inputs.shares))).toBeGreaterThan(1e-6);
  });
  // AGREES — IN-FLIGHT (uncommitted Performance change of 2026-10-21: buildPerformance now carries each row's startValue,
  // and gainOfRow reads it for a holding worth $0). Measured at 09:13 on 2026-10-21 against the row the app builds — 10
  // shares, close $100 the evening before the window, $0 today: −$1,000, the reviewer's answer. Before that change the
  // app answered $0 (mv > 0 ? … : 0) and the loss vanished from the worked-back beginning (DEC-3523 tenets 1 and 3).
  // A row handed in with no start value now reads unknown (null), never $0. Re-run after the change is committed.
  kase(id, 'edge', 'Known total loss', 'AGREES', (c) => {
    const row = wipedOutRow();
    expect(row.marketValue).toBe(c.inputs.ending_value);
    expect(row.periodTotal!).toBeCloseTo(c.inputs.periodTotal, 12);
    expect(gain([row], 1)!).toBeCloseTo(c.expected.exact, 6);
  });
};
describe('MK-NW-F-091 pricedGainOf — five cases', () => {
  gainCases('MK-NW-F-091', (rows, years) => pricedGainOf(rows, years));
  test.failing('complex · Holding quantity increased inside window — the app\'s answer until 2026-10-22, pinned: $420 (today\'s 20 shares ÷ the price move) — no longer its answer (FIXED 2026-10-22)', () => {
    expect(pricedGainOf([toppedUpRow()] as any, 1)!).toBeCloseTo(420, 6);
  });
  test('the app\'s answers, pinned: $320 for the topped-up holding (DEC-3656, since 2026-10-22), $6,200 for DEC-4644\'s household, $0 for the total loss', () => {
    expect(pricedGainOf([toppedUpRow()] as any, 1)!).toBeCloseTo(320, 6);
    expect(pricedGainOf([{ position: { ticker: 'VTI' }, marketValue: 105000, periodReturn: ADJUSTED, periodTotal: ADJUSTED }], 0.25)!).toBeCloseTo(6200, 6);
    // read at the displayed 6.28% instead, the gain is the reviewer's $6,204.37 — the gap is the rounding alone
    expect(pricedGainOf([{ position: { ticker: 'VTI' }, marketValue: 105000, periodReturn: 0.0628, periodTotal: 0.0628 }], 0.25)!).toBeCloseTo(105000 - 105000 / 1.0628, 6);
    refuses(pricedGainOf([wipedOut], 1));   // a row with no start value: unknown, never $0 (uncommitted change of 2026-10-21)
  });
});
describe('MK-NW-F-127 gainOfRow — five cases', () => {
  gainCases('MK-NW-F-127', (rows, years) => gainOfRow(rows[0], years));
});

describe('MK-NW-F-092 investmentAccountIdsOf — five cases', () => {
  const CLASS: Record<string, Record<string, any>> = { 'Stocks / Funds': { asset_class: 'stocks_etf' }, 'Bonds & CDs': { asset_class: 'bonds' },
    Alternatives: { asset_class: 'alternatives' }, Unclassified: { asset_class: 'mixed' }, Cash: { asset_class: 'cash' },
    'Real estate': { kind: 'home', asset_class: 'real_estate', tax_bucket: 'PROPERTY' } };
  const ids = (accts: any[]) => [...investmentAccountIdsOf(accts.map((a) => ({ ...('id' in a ? { asset_id: a.id } : {}), balance: a.balance ?? 1, ...CLASS[a.class] })), assetClassOf)];
  kase('MK-NW-F-092', 'easy', 'Stock id only', 'AGREES', (c) => { expect(ids(c.inputs.accounts)).toEqual(c.expected); });
  kase('MK-NW-F-092', 'easy', 'Cash and home excluded', 'AGREES', (c) => { expect(ids(c.inputs.accounts)).toEqual(c.expected); });
  kase('MK-NW-F-092', 'complex', 'Several institutions and numeric id', 'AGREES', (c) => { expect(ids(c.inputs.accounts)).toEqual(c.expected); });
  // SETTLED BY DEC-0338 (2026-09-12, TESTED, his words: "Unclassified counts as investments"): the Unclassified account
  // is measured. The app follows it.
  kase('MK-NW-F-092', 'complex', 'Unclassified might be cash', 'AGREES', (c) => {
    expect(c.expected).toBe('RULE UNCLEAR');
    expect(ids(c.inputs.accounts)).toEqual(['U']);
  });
  // REVIEWER WRONG (input outside the domain): an account always has an id — the type requires it
  // (src/domain/assets/index.ts:46 asset_id: EntityId) and the store issues one on every add (useStore.ts:786
  // newEntityId('ast')). Handed one without, the app writes the id "undefined"; pinned below.
  kase('MK-NW-F-092', 'edge', 'Missing id', 'REVIEWER WRONG', (c) => {
    expect(c.expected).toBe('REFUSES');
    expect(ids(c.inputs.accounts)).toEqual([]);
  });
  test('edge · Missing id — the app\'s answer, pinned', () => { expect(ids([{ class: 'Stocks / Funds', balance: 123.45 }])).toEqual(['undefined']); });
});

describe('MK-NW-F-103 investmentRecordDates — five cases', () => {
  const dates = (c: any) => investmentRecordDates(c.inputs.days.map((d: any) => day(d.date, d.values)), new Set(c.inputs.measured));
  kase('MK-NW-F-103', 'easy', 'One measured day', 'AGREES', (c) => { expect(dates(c)).toEqual(c.expected); });
  kase('MK-NW-F-103', 'easy', 'No measured accounts', 'AGREES', (c) => { expect(dates(c)).toEqual(c.expected); });
  kase('MK-NW-F-103', 'complex', 'Unsorted dates and other accounts', 'AGREES', (c) => { expect(dates(c)).toEqual(c.expected); });
  // REVIEWER WRONG (input outside the domain): the record holds one row per date — `record` drops any row of the same
  // date before adding the new one (Calculation Module code/engines/snapshots.ts:377-380), and every write goes through
  // it (useStore.ts:1035). The confirmed $0 IS kept as a recorded day (agrees). Handed a duplicate, the app lists it twice.
  kase('MK-NW-F-103', 'complex', 'Duplicate dates with confirmed zero', 'REVIEWER WRONG', (c) => { expect(dates(c)).toEqual(c.expected); });
  test('complex · Duplicate dates — the app\'s answer, pinned', () => {
    expect(investmentRecordDates([day('2026-09-17', { A: 0 }), day('2026-09-17', { A: 0 }), day('2026-09-16', { A: 41.19 })], new Set(['A'])))
      .toEqual(['2026-09-16', '2026-09-17', '2026-09-17']);
  });
  // APP WRONG (DEC-3279e, 2026-10-08, TESTED: "A missing balance is never $0"; DEC-3523 tenet 3). A balance never
  // entered is written into the day as cash 0 / typedValue null (buildDayFromAccounts) and read back as $0
  // (accountValuesOn: own = cash + (typedValue ?? 0)), so the day counts as recorded. On screen: "Since" opens there,
  // and when the person types $20,000 the next day the Performance return reads it as earned (+40.00% on a $50,000
  // brokerage — still-open #5). IN-FLIGHT (a value typed with an earlier date going on that date — typedValueOnItsDate
  // moves a back-dated value onto the blank day): re-run after it lands.
  // FIXED 2026-10-21 (NWFIX, DEC-3279e): a row whose balance was never entered is dropped before the day is read
  // (performance.ts withoutBlankRows), so the blank day is not a recorded day and the IRA joins on the day its $20,000
  // is typed, as money put in. Was APP WRONG.
  kase('MK-NW-F-103', 'edge', 'Present row with missing balance', 'AGREES', (c) => {
    const blank = buildDayFromAccounts([{ ...handIra(null), asset_id: 'A' } as any], '2026-09-01', 'x');
    expect(investmentRecordDates([blank], new Set(c.inputs.measured))).toEqual(c.expected);
  }, 'fixed 2026-10-21 by DEC-3279e: a balance never entered is not a recorded day');
  test('edge · Present row with missing balance — the app\'s answer since the fix (DEC-3279e): the day does not count (before: it counted)', () => {
    expect(investmentRecordDates([buildDayFromAccounts([{ ...handIra(null), asset_id: 'A' } as any], '2026-09-01', 'x')], new Set(['A']))).toEqual([]);
  });
});

describe('MK-NW-F-105 whyNoReturn — five cases', () => {
  kase('MK-NW-F-105', 'easy', 'Measured gain has no refusal text', 'AGREES', (c) => {
    expect(whyNoReturn({ rate: c.inputs.rate, measuredFrom: '2026-09-01' } as any)).toBe(c.expected);
  });
  // REVIEWER WRONG (wording): the card says only "Today's value not on record: says so" — it gives no words. The
  // reviewer's sentence is its own; the app's one sentence for this refusal says the same thing. Pinned below.
  kase('MK-NW-F-105', 'easy', 'No ending record', 'REVIEWER WRONG', (c) => {
    expect(whyNoReturn({ rate: null, refused: 'END_NOT_RECORDED', measuredFrom: null } as any)).toBe(c.expected);
  });
  // REVIEWER WRONG (wording and the date's form): the card asks that the sentence "names the day and says a return
  // cannot be measured across it". The app does, writing the day with the one date writer (dateShown, "Sep 17, 2026" —
  // DEC-6412's commit: one date writer for every stored date), not "2026-09-17". Pinned below.
  kase('MK-NW-F-105', 'complex', 'Money moved without valuation', 'REVIEWER WRONG', (c) => {
    expect(whyNoReturn({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: c.inputs.day, measuredFrom: null } as any)).toBe(c.expected);
  });
  test('the two sentences as the app writes them, pinned', () => {
    expect(whyNoReturn({ rate: null, refused: 'END_NOT_RECORDED', measuredFrom: null } as any)).toBe('Today’s value is not in your records yet, so a return cannot be measured.');
    const s = whyNoReturn({ rate: null, refused: 'MOVEMENT_DAY_NOT_RECORDED', day: '2026-09-17', measuredFrom: null } as any);
    expect(s).toContain(dateShown('2026-09-17')); expect(s).toContain('a return cannot be measured across it');
  });
  kase('MK-NW-F-105', 'complex', 'Overwithdrawal versus first-day loss', 'AGREES', (c) => {
    // the verdict the engine gives for a new account: $0 the evening before, $10,000 in, $9,800 that evening (DEC-4439)
    const v = timeWeightedReturn({ days: [day('2026-09-01', { A: c.inputs.previous_evening }), day('2026-09-02', { A: c.inputs.ending })] as any,
      accountIds: new Set(['A']), flows: [{ date: '2026-09-02', accountId: 'A', amount: c.inputs.deposit }], start: '2026-09-01', end: '2026-09-02' });
    expect(v.rate!).toBeCloseTo(c.inputs.measured_rate, 12);
    expect(whyNoReturn(v)).toBe(c.expected);
  });
  kase('MK-NW-F-105', 'edge', 'No beginning record', 'AGREES', (c) => {
    expect(whyNoReturn({ rate: null, refused: 'START_NOT_RECORDED', measuredFrom: null } as any)).toBe(c.expected);
  });
});

describe('MK-NW-F-128 heldValueOf — five cases', () => {
  kase('MK-NW-F-128', 'easy', 'Explicit current value', 'AGREES', (c) => {
    expect(heldValueOf({ marketValue: c.inputs.marketValue, position: { ticker: 'X', last_price: c.inputs.last_price, lots: [{ shares: c.inputs.shares }] } })!).toBeCloseTo(c.expected.exact, 6);
  });
  kase('MK-NW-F-128', 'easy', 'Broker fallback', 'AGREES', (c) => {
    expect(heldValueOf({ marketValue: c.inputs.marketValue, position: { ticker: 'X', last_price: c.inputs.last_price, lots: [{ shares: c.inputs.shares }] } })!).toBeCloseTo(c.expected.exact, 6);
  });
  kase('MK-NW-F-128', 'complex', 'Mini option mark', 'AGREES', (c) => {
    expect(heldValueOf({ marketValue: c.inputs.marketValue, position: { ticker: 'X', kind: 'options', multiplier: c.inputs.multiplier,
      last_price: c.inputs.last_price, lots: [{ shares: c.inputs.shares }] } })!).toBeCloseTo(c.expected.exact, 6);
  });
  // REVIEWER WRONG (input outside the domain): a short position with no broker mark and an old hand-built value cannot
  // occur. Shorts arrive only from a linked broker, which sends a mark (snaptrade.ts:334 "(short)"), and heldValueOf then
  // reads shares × mark — negative, as the reviewer wants. A holding typed by hand must have shares above zero
  // (PerformanceScreen.tsx:682) and only hand-built holdings carry value_now (useStore.ts:83). Pinned below.
  kase('MK-NW-F-128', 'complex', 'Known negative short value wins over old build', 'REVIEWER WRONG', (c) => {
    expect(heldValueOf({ marketValue: c.inputs.marketValue, position: { value_now: c.inputs.value_now, last_price: undefined, lots: [{ shares: c.inputs.shares }] } })!)
      .toBeCloseTo(c.expected.exact, 6);
  });
  test('complex · short — the app\'s answers, pinned: the old build for the impossible input, the broker mark for a real short', () => {
    expect(heldValueOf({ marketValue: -247.81, position: { value_now: 315.42, lots: [{ shares: -2 }] } })).toBe(315.42);
    expect(heldValueOf({ marketValue: -247.81, position: { ticker: 'X', last_price: 123.905, lots: [{ shares: -2 }] } })!).toBeCloseTo(-247.81, 6);
  });
  // APP WRONG (DEC-3523 tenet 4 "one thing, one number" and tenet 1): the row's own value is $0 (its latest close is $0),
  // and heldValueOf replaces it with the broker's older $20 mark × 10 = $200. Where the holding has no window return
  // (a price history of one close), the left-out sentence would print "($200)" beside a row that reads $0. Rare.
  // FIXED 2026-10-21 (tenets 3 and 4): the row's own $0 wins; only a value not on record falls back to the mark.
  kase('MK-NW-F-128', 'edge', 'Zero market value with stale broker mark', 'AGREES', (c) => {
    expect(heldValueOf({ marketValue: c.inputs.marketValue, position: { ticker: 'X', last_price: c.inputs.last_price, lots: [{ shares: c.inputs.shares }] } })).toBe(c.expected.exact);
  }, 'fixed 2026-10-21: a known $0 is a value (tenets 3 and 4)');
  test.failing('edge · Zero market value — the app\'s answer until 2026-10-21, pinned: $200 — no longer its answer (FIXED 2026-10-21)', () => {
    expect(heldValueOf({ marketValue: 0, position: { ticker: 'X', last_price: 20, lots: [{ shares: 10 }] } })).toBe(200);
  });
});

describe('MK-NW-F-129 gainRowName — five cases', () => {
  kase('MK-NW-F-129', 'easy', 'Named holding', 'AGREES', (c) => { expect(gainRowName({ name: c.inputs.name, position: { ticker: c.inputs.ticker } })).toBe(c.expected); });
  kase('MK-NW-F-129', 'easy', 'Ticker only', 'AGREES', (c) => { expect(gainRowName({ position: { ticker: c.inputs.ticker } })).toBe(c.expected); });
  kase('MK-NW-F-129', 'complex', 'CUSIP and security display name', 'AGREES', (c) => { expect(gainRowName({ name: c.inputs.name, position: c.inputs.position })).toBe(c.expected); });
  kase('MK-NW-F-129', 'complex', 'Several missing fields', 'AGREES', (c) => { expect(gainRowName({ name: c.inputs.name, position: c.inputs.position })).toBe(c.expected); });
  kase('MK-NW-F-129', 'edge', 'Nothing named', 'AGREES', (c) => { expect(gainRowName(c.inputs)).toBe(c.expected); });
});

// REVIEWER WRONG, all five (the card sent was stale): "The beginning can't be worked back: … has no price history." was
// DEC-3656's sentence. DEC-5068 (2026-10-13) replaced it — a holding with no price history is left out of Wealth
// generated and Return and named — and DEC-6076 (2026-10-19, "approved.") gave it his words: "<names> has / have no price
// history, so its / their gains are not included." Each name once, commas and "and", has / have and "a holding" all
// agree with the reviewer; only the words around the names moved. The app's sentences are pinned beside each.
describe('MK-NW-F-130 cannotWorkBackSentence (now notIncludedSentence) — five cases', () => {
  const said = (names: string[]) => notIncludedSentence(names.map((name) => ({ name, value: null })), 0);
  const APP: Record<string, string> = {
    'One name': 'Treasury 2031 has no price history, so its gains are not included.',
    'No names': 'A holding has no price history, so its gains are not included.',
    'Duplicates and unround security names': 'Treasury 4.125% 2031 and Gold account 0333 have no price history, so their gains are not included.',
    'Three unique names': 'A, B and C have no price history, so their gains are not included.',
    'Repeated sole name': 'Bond has no price history, so its gains are not included.',
  };
  for (const [kind, title] of [['easy', 'One name'], ['easy', 'No names'], ['complex', 'Duplicates and unround security names'], ['complex', 'Three unique names'], ['edge', 'Repeated sole name']]) {
    kase('MK-NW-F-130', kind, title, 'REVIEWER WRONG', (c) => { expect(said(c.inputs.names)).toBe(c.expected); });
    test(`${kind} · ${title} — the app's sentence (DEC-6076), pinned`, () => { expect(said(C('MK-NW-F-130', kind, title).inputs.names)).toBe(APP[title]); });
  }
});

describe('MK-NW-O-007 theLookBack — five cases', () => {
  const NOW = new Date('2026-09-30T12:00:00');
  const lb = (amount: number, months: number, from: number[], to: number[], now = NOW, opens = '2025-09-30', today = '2026-09-30') =>
    theLookBack({ amount, months, now, fromSeries: series('F', [[opens, from[0]], [today, from[1]]]), toSeries: series('T', [[opens, to[0]], [today, to[1]]]) })!;
  kase('MK-NW-O-007', 'easy', 'Round positive counterfactual', 'AGREES', (c) => {
    const r = lb(c.inputs.amount, c.inputs.months, c.inputs.from_prices, c.inputs.to_prices); const e = c.expected;
    expect(r.stayed.endValue).toBeCloseTo(e.stayed_end.exact, 6); expect(r.stayed.delta).toBeCloseTo(e.stayed_change.exact, 6);
    expect(r.stayed.pct / 100).toBeCloseTo(e.stayed_percent.exact, 12);
    expect(r.moved.endValue).toBeCloseTo(e.moved_end.exact, 6); expect(r.moved.delta).toBeCloseTo(e.moved_change.exact, 6);
    expect(r.moved.pct / 100).toBeCloseTo(e.moved_percent.exact, 12);
    expect(r.difference).toBeCloseTo(e.difference.exact, 6);
  });
  kase('MK-NW-O-007', 'easy', 'Alternative would lose more', 'AGREES', (c) => {
    const r = lb(c.inputs.amount, c.inputs.months, c.inputs.from_prices, c.inputs.to_prices);
    expect(r.stayed.endValue).toBeCloseTo(c.expected.stayed_end.exact, 6);
    expect(r.moved.endValue).toBeCloseTo(c.expected.moved_end.exact, 6);
    expect(r.difference).toBeCloseTo(c.expected.difference.exact, 6);
  });
  kase('MK-NW-O-007', 'complex', 'Realistic BND and VTI', 'AGREES', (c) => {
    const r = lb(c.inputs.amount, c.inputs.months, c.inputs.BND, c.inputs.VTI, new Date(`${c.inputs.today}T12:00:00`), c.inputs.start, c.inputs.today); const e = c.expected;
    expect(r.stayed.endValue).toBeCloseTo(e.stayed_end.exact, 6); expect(r.stayed.delta).toBeCloseTo(e.stayed_change.exact, 6);
    expect(r.moved.endValue).toBeCloseTo(e.moved_end.exact, 6); expect(r.moved.delta).toBeCloseTo(e.moved_change.exact, 6);
    expect(r.difference).toBeCloseTo(e.difference.exact, 6);
  });
  // AGREES: the two hypothetical figures match; the "actual money path" refuses in the app too — the look-back takes an
  // amount the person types and no records, so it never states what actual money did (its result holds only the two
  // legs, their difference and the months). The screen copy is the approved drawing's (DEC-1069).
  kase('MK-NW-O-007', 'complex', 'Lump sum differs from actual cash-flow path', 'AGREES', (c) => {
    const r = lb(c.inputs.amount, c.inputs.months, c.inputs.from_prices, c.inputs.to_prices, NOW, '2026-06-30'); const e = c.expected;
    expect(r.stayed.endValue).toBeCloseTo(e.hypothetical_stayed.exact, 6);
    expect(r.moved.endValue).toBeCloseTo(e.hypothetical_moved.exact, 6);
    expect(r.difference).toBeCloseTo(e.difference.exact, 6);
    expect(e.actual_money_path).toBe('REFUSES');
    expect(Object.keys(r).sort()).toEqual(['difference', 'months', 'moved', 'stayed']);
  });
  kase('MK-NW-O-007', 'edge', 'One fund has no full-window history', 'AGREES', (c) => {
    expect(c.expected).toBe('REFUSES');
    refuses(theLookBack({ amount: c.inputs.amount, months: c.inputs.months, now: new Date(`${c.inputs.today}T12:00:00`),
      fromSeries: series('F', [[c.inputs.from_first, 100], [c.inputs.today, 110]]), toSeries: series('T', [[c.inputs.to_first, 100], [c.inputs.today, 120]]) }));
  });
});

describe('MK-NW-O-008 thePerformance — five cases', () => {
  const run = (o: { windowStart: string | null; today: string; days: any[]; accounts: any[]; transactions?: any[]; holdings?: any[]; whole?: boolean }) =>
    thePerformance({ windowStart: o.windowStart, windowLabel: 'the window', today: o.today, transactions: o.transactions ?? [], snapshotDays: o.days,
      investmentAccountIds: new Set(o.accounts.map((a) => String(a.asset_id))), accounts: o.accounts, holdings: o.holdings, wholeRecord: o.whole });
  const walkOf = (w: any) => [w.beginning, w.contributions, w.withdrawals, w.dividends, w.interest, w.marketChange];
  const v17 = () => {
    const days = [day('2025-10-01', { Vanguard: 80000, 'E*TRADE': 20000 })];
    const transactions = [{ type: 'DEPOSIT', account_id: 'Vanguard', date: '2026-03-02', amount: 15000 },
      { type: 'DIVIDEND', account_id: 'Vanguard', date: '2026-06-30', amount: 1500 }, { type: 'INTEREST', account_id: 'Vanguard', date: '2026-06-30', amount: 200 },
      { type: 'DIVIDEND', account_id: 'E*TRADE', date: '2026-06-30', amount: 300 }, { type: 'INTEREST', account_id: 'E*TRADE', date: '2026-06-30', amount: 200 }];
    const accounts = [linked('Vanguard', 101000), linked('E*TRADE', 22000)];
    const ids = new Set(['Vanguard', 'E*TRADE']);
    const ws = windowStartKey('SINCE', investmentRecordDates(days, ids), '2026-09-30');
    const door = (set: Set<string>) => thePerformance({ windowStart: ws, windowLabel: 'w', today: '2026-09-30', transactions, snapshotDays: days, investmentAccountIds: set, accounts, wholeRecord: true });
    return { all: door(ids), one: (id: string) => door(new Set([id])) };
  };
  const treasury = (c: any) => run({ windowStart: c.inputs.windowStart, today: c.inputs.today, days: c.inputs.snapshots,
    accounts: [{ asset_id: 'T', label: 'Treasury 2031', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', source: 'manual', balance: c.inputs.accounts['Treasury 2031'], positions: [] }],
    holdings: [] });
  kase('MK-NW-O-008', 'easy', 'One account no external flows', 'AGREES', (c) => {
    const i = c.inputs; const e = c.expected;
    const r = run({ windowStart: i.windowStart, today: i.today, accounts: [linked('A', i.accounts.A)],
      days: Object.entries(i.snapshots).filter(([d]) => d < i.today).map(([d, v]: any) => day(d, v)) });
    expect(r.walk!.beginning).toBeCloseTo(e.beginning.exact, 6); expect(r.ending).toBeCloseTo(e.ending.exact, 6);
    expect(r.walk!.wealthGenerated).toBeCloseTo(e.wealth.exact, 6); expect(r.ret!).toBeCloseTo(e.return.exact, 12);
    walkOf(r.walk).forEach((v, k) => expect(v).toBeCloseTo(e.walk[k].exact, 6));
  });
  kase('MK-NW-O-008', 'easy', 'New account deposit earns first-day gain', 'AGREES', (c) => {
    const i = c.inputs; const e = c.expected;
    const r = run({ windowStart: i.windowStart, today: i.today, days: [day('2026-09-01', i.prior_evening)], accounts: [linked('A', i.today_evening.A)],
      transactions: [{ type: 'DEPOSIT', account_id: 'A', date: i.today, amount: i.deposit }] });
    expect(r.walk!.beginning).toBe(e.beginning.exact); expect(r.walk!.contributions).toBe(e.contributions.exact);
    expect(r.walk!.wealthGenerated).toBeCloseTo(e.wealth.exact, 6); expect(r.ending).toBe(e.ending.exact);
    expect(r.ret!).toBeCloseTo(e.return.exact, 12);
  });
  // AGREES — every dollar figure, E*TRADE's +10.00%, and both refusals. The household as drawn has a recorded value on
  // its first day and today only, so the $15,000's day (any day inside the window; 2026-03-02 here) has no recorded
  // value and the Vanguard and all-accounts returns refuse with "Money moved in or out on Mar 2, 2026 and no value was
  // recorded that day …" (DEC-1669: never another method). The deposit is dated: no record can be stored without a
  // date (the sync falls back to the sync time, ingest.ts:389/407).
  kase('MK-NW-O-008', 'complex', 'Approved Performance v17 household exactly', 'AGREES', (c) => {
    const e = c.expected; const r = v17(); const v = r.one('Vanguard'), et = r.one('E*TRADE'); const w = r.all.walk!;
    expect([w.beginning, w.contributions, w.withdrawals, w.dividends, w.interest, w.marketChange, w.wealthGenerated, r.all.ending])
      .toEqual([e.beginning.exact, e.contributions.exact, e.withdrawals.exact, e.dividends.exact, e.interest.exact, e.change_in_value.exact, e.wealth.exact, e.ending.exact]);
    expect(v.walk!.wealthGenerated).toBe(e.account_wealth.Vanguard.exact); expect(et.walk!.wealthGenerated).toBe(e.account_wealth['E*TRADE'].exact);
    expect(et.ret!).toBeCloseTo(e['E*TRADE_return'].exact, 12);
    expect([e.Vanguard_return, e.portfolio_return]).toEqual(['REFUSES', 'REFUSES']);
    refuses(v.ret); refuses(r.all.ret);
  });
  test('complex · Approved Performance v17 household — the refusal, in the app\'s words', () => {
    expect(v17().all.sentence).toBe(`Money moved in or out on ${dateShown('2026-03-02')} and no value was recorded that day, so a return cannot be measured across it. The dollar figures here are still right.`);
  });
  // SETTLED (AGREES): every figure matches to the cent, the return included (−0.91%). The reviewer's open "investment
  // scope" — the $130.58 of cash inside account A is in the return — is his own rule: "12-month return = (change in
  // investment value + dividend + interest)/(cash + investment)" (2026-10-06, quoted as his words in DEC-4644), and
  // Performance v17 draws "Cash in this account" as a category of the Performance tab. Net worth's Investments line
  // (DEC-0457, no cash) is a different, separately named figure.
  kase('MK-NW-O-008', 'complex', 'Multiaccount cash, withdrawal and internal transfer', 'AGREES', (c) => {
    const i = c.inputs; const e = c.expected;
    const A = linked('A', i.ending.A, { cash_balance: i.A_ending_cash,
      positions: [{ position_id: 'pa', ticker: 'VTI', last_price: (i.ending.A - i.A_ending_cash) / 10, lots: [{ shares: 10, cost_per_share: 100 }] }] });
    const r = run({ windowStart: i.windowStart, today: i.today, days: [day('2026-09-01', i.beginning)], accounts: [A, linked('B', i.ending.B)],
      transactions: [{ type: 'DEPOSIT', account_id: 'A', date: i.today, amount: i.deposit_external }, { type: 'WITHDRAWAL', account_id: 'B', date: i.today, amount: i.withdraw_external },
        { type: 'TRANSFER', account_id: 'A', counter_account_id: 'B', date: i.today, amount: i.transfer_A_to_B },
        { type: 'DIVIDEND', account_id: 'A', ticker: 'VTI', date: i.today, amount: i.dividends }, { type: 'INTEREST', account_id: 'A', date: i.today, amount: i.interest }] });
    const w = r.walk!;
    expect(w.beginning).toBeCloseTo(e.beginning.exact, 6); expect(r.ending).toBeCloseTo(e.ending.exact, 6);
    expect(w.contributions).toBeCloseTo(e.contributions.exact, 6); expect(w.withdrawals).toBeCloseTo(e.withdrawals.exact, 6);
    expect(w.wealthGenerated).toBeCloseTo(e.wealth.exact, 6); expect(w.marketChange).toBeCloseTo(e.change_in_value.exact, 6);
    expect(r.ret!).toBeCloseTo(e.TWR.exact, 12);
    expect(e.investment_scope).toMatch(/^RULE UNCLEAR/);
  });
  // REVIEWER WRONG (DEC-5068, 2026-10-13, his words: "Wealth Generated and Return should be calculated and displayed for
  // every asset with history. Below it display …"): with no record and no price history, the walk is shown, the holding
  // adds no gain (its value is taken as unchanged: beginning $10,500, wealth generated $0), there is no return, and the
  // sentence is DEC-6076's: "Treasury 2031 ($10,500) has no price history, so its gains are not included." The ending
  // and the refused return agree with the reviewer; DEC-3656's refusal of the walk was replaced. Pinned below.
  kase('MK-NW-O-008', 'edge', 'No record, no price history and no stated CD rate', 'REVIEWER WRONG', (c) => {
    const r = treasury(c); const e = c.expected;
    expect(r.ending).toBe(e.ending.exact); refuses(r.ret);
    expect(r.walk).toBeNull();
    expect(r.notIncluded || r.sentence).toBe(e.reason);
  });
  test('edge · No record, no price history — the app\'s answer (DEC-5068, DEC-6076), pinned', () => {
    const r = treasury(C('MK-NW-O-008', 'edge', 'No record, no price history and no stated CD rate'));
    expect([r.walk!.beginning, r.walk!.wealthGenerated, r.ending]).toEqual([10500, 0, 10500]);
    refuses(r.ret);
    expect(r.notIncluded).toBe('Treasury 2031 ($10,500) has no price history, so its gains are not included.');
  });
});

describe('coverage — every case of part 1', () => {
  test('60 cases in the package, each run here once', () => {
    expect(PART.cases.length).toBeGreaterThanOrEqual(60);
    expect([...RAN].sort()).toEqual(PART.cases.map((c: any) => `${c.id} · ${c.kind} · ${c.title}`).sort());
  });
});

// ════════════════════════════════════════ THE 13 FORMULA CHECKS ════════════════════════════════════════
// Each card's verdict is judged on its cases above; each test re-runs the point that decides the card, and a point the
// card's "why" makes that no case reaches gets its own test here.
const FORMULA: Record<string, Mark> = {};
const card = (id: string, mark: Mark, title: string, fn: () => void) => { FORMULA[id] = mark; runner(mark)(`${id} · ${title} [${mark}]`, fn); };
describe('formula checks — the reviewer\'s 13 card verdicts', () => {
  // APP WRONG (DEC-4439, case complex 1): the category return of a purchase made that morning is +15.24%, not +10.00%.
  // Its second point, "unknown classification defaults to stocks" (DEC-2160, DEC-3035f: "never Stocks / Funds by
  // default"), was wrong at 13:30 ($40 dividend → "Stocks / Funds earned $40") and was fixed in the working tree by the
  // account page work (ACCOUNT, item 5, uncommitted) while this file ran: it now reads "Unclassified". IN-FLIGHT.
  // FIXED 2026-10-21 (DEC-4439; MK-PF-F-040): both points now hold — +10.00%, and Unclassified. Was APP WRONG.
  card('MK-NW-F-084', 'AGREES', 'a category\'s return over one window, a purchase that morning counted all day (DEC-4439) — fixed 2026-10-21', () => {
    // (a table is drawn only where something was received — ledger-only — so one $1 dividend is handed in, as #1 and #33 do;
    // with none the table is empty and this read failed on the missing row, not on the return)
    expect(categoryEarnings({ windowStart: '2026-09-02', rows: morningRows() as any, transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'Y', date: '2026-09-02', amount: 1 }] })[0].ret!).toBeCloseTo(0.1, 12);
  });
  test('MK-NW-F-084 · an unclassified holding\'s dividend is Unclassified, not Stocks / Funds — fixed in the working tree by the account page work, IN-FLIGHT', () => {
    expect(unclassifiedIncome()).toMatchObject([{ label: 'Unclassified', earned: 40 }]);
  });
  // REVIEWER WRONG: the record's days are the app's own calendar writes (case complex 2); with no record "Since" opens
  // today and nothing is read as a beginning — the walk starts from what is there today, never from a measured day.
  card('MK-NW-F-090', 'REVIEWER WRONG', 'with no record, Since reads a measured beginning', () => {
    const r = thePerformance({ windowStart: windowStartKey('SINCE', [], '2026-09-30'), windowLabel: 'w', today: '2026-09-30', transactions: [], snapshotDays: [],
      investmentAccountIds: new Set(['A']), accounts: [linked('A', 1000)], wholeRecord: true });
    expect(r.measured).not.toBeNull();
  });
  // FIXED 2026-10-22 (DEC-3656; W-START): $2,420 − $1,000 − $1,100 = $320 (it read $420). Was APP WRONG.
  card('MK-NW-F-091', 'AGREES', 'shares added inside the window: what the holding gained — fixed 2026-10-22 (DEC-3656: the start held then, the money paid inside)', () => { expect(pricedGainOf([toppedUpRow()] as any, 1)!).toBeCloseTo(320, 6); });
  // REVIEWER WRONG: DEC-0338 settles Unclassified; an account always has an id (case edge).
  card('MK-NW-F-092', 'REVIEWER WRONG', 'an Unclassified account is left out', () => {
    expect([...investmentAccountIdsOf([{ asset_id: 'U', asset_class: 'mixed', balance: 1 }] as any, assetClassOf)]).toEqual([]);
  });
  card('MK-NW-F-103', 'AGREES', 'a balance never entered is not a recorded day (DEC-3279e) — fixed 2026-10-21', () => {
    expect(investmentRecordDates([buildDayFromAccounts([{ ...handIra(null), asset_id: 'A' } as any], '2026-09-01', 'x')], new Set(['A']))).toEqual([]);
  });
  // BLOCKED: no cases (the reviewer invented none — the brief's own rule). closedWith runs only when a caller hands the
  // door an ending and no accounts; every screen hands its accounts (PerformanceScreen.tsx:163, HomeScreen.tsx:196,
  // AccountPortfolioScreen.tsx:244), so no figure on any screen reaches it today.
  card('MK-NW-F-104', 'BLOCKED', 'how one ending total is split across accounts', () => { /* no case to run */ });
  card('MK-NW-F-105', 'AGREES', 'measured: no sentence; a loss on day one is measured, not refused', () => {
    expect(whyNoReturn({ rate: -0.02, measuredFrom: '2026-09-02' } as any)).toBe('');
  });
  // FIXED 2026-10-22 (DEC-3656; W-START): the one rule reads the start held then and the money paid inside. Was APP WRONG.
  card('MK-NW-F-127', 'AGREES', 'shares added inside the window: what the holding gained — fixed 2026-10-22 (DEC-3656: the start held then, the money paid inside)', () => { expect(gainOfRow(toppedUpRow(), 1)!).toBeCloseTo(320, 6); });
  card('MK-NW-F-128', 'AGREES', 'a known $0 wins over an older mark — fixed 2026-10-21 (tenets 3 and 4)', () => {
    expect(heldValueOf({ marketValue: 0, position: { ticker: 'X', last_price: 20, lots: [{ shares: 10 }] } })).toBe(0);
  });
  card('MK-NW-F-129', 'AGREES', 'own name, else ticker, else "a holding"', () => {
    expect([gainRowName({ name: 'Ally CD' }), gainRowName({ position: { ticker: 'VTI' } }), gainRowName({})]).toEqual(['Ally CD', 'VTI', 'a holding']);
  });
  // REVIEWER WRONG: the reviewer judged RIGHT a card that was stale; the sentence is DEC-6076's (cases above).
  card('MK-NW-F-130', 'REVIEWER WRONG', 'the sentence is DEC-3656\'s', () => {
    expect(notIncludedSentence([{ name: 'Treasury 2031', value: null }], 0)).toBe("The beginning can't be worked back: Treasury 2031 has no price history.");
  });
  card('MK-NW-O-007', 'AGREES', 'a fund with no full-window history gives nothing', () => {
    refuses(theLookBack({ amount: 1000, months: 12, now: new Date('2026-09-30T12:00:00'), fromSeries: series('F', [['2026-01-02', 1], ['2026-09-30', 2]]), toSeries: series('T', [['2025-09-01', 1], ['2026-09-30', 2]]) }));
  });
  // APP WRONG (DEC-3523 tenets 1 and 4) on the reviewer's "no upper ledger date bound": a deposit dated after today (the
  // trade sheet's date has no upper limit) is counted in the walk — Wealth generated $0 — but not by the return, which
  // reads the $1,000 as earned: Return +100.00% beside Wealth generated $0. The reviewer's other points: the new-account
  // walk is fixed (DEC-4439, case easy 2 agrees); a worked-back beginning is said in a sentence (PerformanceScreen.tsx:346);
  // the cash scope is his rule (case complex 2).
  // FIXED 2026-10-21 (NWFIX, lead decision under DEC-3523 tenets 1 and 4): a record dated after today is read on today
  // in thePerformance, and the trade sheet no longer takes a date after today. Was APP WRONG.
  card('MK-NW-O-008', 'AGREES', 'a deposit dated after today: the walk and the return tell one story — fixed 2026-10-21, a record dated after today is read on today (tenets 1 and 4)', () => {
    const r = futureDeposit();
    expect(r.walk!.wealthGenerated).toBe(0);
    expect(r.ret!).toBeCloseTo(0, 12);
  });
  test('MK-NW-O-008 · a deposit dated after today — the app\'s answer since the fix: Contributions $1,000, Wealth generated $0, Return +0.00% (before: +100.00%)', () => {
    const r = futureDeposit();
    expect([r.walk!.contributions, r.walk!.wealthGenerated]).toEqual([1000, 0]);
    expect(r.ret!).toBeCloseTo(0, 12);
  });
  test('13 formula checks in the package, each classified here once', () => {
    expect(PART.formula_checks.length).toBeGreaterThanOrEqual(13);
    expect(Object.keys(FORMULA).sort()).toEqual(PART.formula_checks.map((f: any) => f.id).sort());
  });
});

// ═════════════════════════════════════════ THE 52 STILL-OPEN POINTS ═════════════════════════════════════════
// One test per point, numbered as the package lists them (1 = the first). Where a point repeats a card above, its
// test re-runs that card's deciding behaviour; where it names a figure on a screen, the figure's own worked example is
// run through its real door (FIGURE_REGISTER) and the reviewer's claim checked against it.
const OPEN: Record<number, Mark> = {};
const open = (n: number, mark: Mark, title: string, fn: () => void) => { OPEN[n] = mark; runner(mark)(`#${n} · ${title} [${mark}]`, fn); };
describe('still open — the reviewer\'s 52 open points', () => {
  open(1, 'AGREES', 'MK-NW-F-084 · category return on a common window (DEC-4439) — fixed 2026-10-21 (a purchase counts from the start of its day)', () => {
    expect(categoryEarnings({ windowStart: '2026-09-02', rows: morningRows() as any, transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'Y', date: '2026-09-02', amount: 1 }] })[0].ret!).toBeCloseTo(0.1, 12);
  });
  open(2, 'REVIEWER WRONG', 'MK-NW-F-090 · validate record days', () => { refuses(windowStartKey('SINCE', ['2026-02-31'], '2026-10-13')); });
  open(3, 'AGREES', 'MK-NW-F-091 · no reconstruction when shares changed — fixed 2026-10-22 (DEC-3656: $320, the start held then)', () => { expect(pricedGainOf([toppedUpRow()] as any, 1)!).toBeCloseTo(320, 6); });
  open(4, 'REVIEWER WRONG', 'MK-NW-F-092 · Unclassified needs confirmed membership', () => {
    expect([...investmentAccountIdsOf([{ asset_id: 'U', asset_class: 'mixed', balance: 1 }] as any, assetClassOf)]).toEqual([]);   // DEC-0338 keeps it
  });
  open(5, 'AGREES', 'MK-NW-F-103 · a blank balance read as $0 makes typing it a +40.00% return — fixed 2026-10-21 by DEC-3279e', () => { expect(blankThenTyped().walk!.wealthGenerated).toBe(0); });
  test('#5 · the app\'s answer since the fix (DEC-3279e): the $20,000 is money put in — Wealth generated $0, Return +0.00% (before: $20,000, +40.00%)', () => {
    const r = blankThenTyped();
    expect([r.walk!.beginning, r.walk!.contributions, r.walk!.wealthGenerated, r.ending]).toEqual([50000, 20000, 0, 70000]);
    expect(r.ret!).toBeCloseTo(0, 12);
  });
  open(6, 'BLOCKED', 'MK-NW-F-104 · split of one ending total', () => { /* no case; no screen reaches closedWith */ });
  open(7, 'AGREES', 'MK-NW-F-127 · a recorded start, not today\'s shares ÷ the price move — fixed 2026-10-22 (DEC-3656)', () => { expect(gainOfRow(toppedUpRow(), 1)!).toBeCloseTo(320, 6); });
  test('#7 · a total loss, as the app builds the row: −$1,000 (IN-FLIGHT, uncommitted 2026-10-21)', () => { expect(gainOfRow(wipedOutRow(), 1)!).toBeCloseTo(-1000, 6); });
  open(8, 'AGREES', 'MK-NW-F-128 · a known $0 wins — fixed 2026-10-21 (tenets 3 and 4)', () => { expect(heldValueOf({ marketValue: 0, position: { ticker: 'X', last_price: 20, lots: [{ shares: 10 }] } })).toBe(0); });
  open(9, 'AGREES', 'MK-NW-O-008 · bound dates: a deposit dated after today — fixed 2026-10-21, read on today (tenets 1 and 4)', () => { const r = futureDeposit(); expect(r.ret!).toBeCloseTo(r.walk!.wealthGenerated / 2000, 12); });
  // REVIEWER WRONG (settled on screen — the same item as the screen check MK-CF-M-002 T2): the Plan's $300 is not inside
  // the planned surplus; it is its own row beneath it — "Planned surplus +$1,150 · Emergency fund · from your Plan −$300 ·
  // Surplus after your budget +$850" (CashFlowScreen). Both figures are shown and each says what it holds.
  open(10, 'REVIEWER WRONG', 'MK-CF-M-002 · the Plan\'s $300 a month to the emergency fund', () => { expect(thisMonth(EX).planned.surplus).toBe(850); });
  test('#10 · the app\'s answer, pinned: planned surplus $1,150; the $300 is its own row under it', () => {
    const m = thisMonth(EX);
    expect(m.planned.surplus).toBe(1150);   // 7,200 − 2,400 − 250 − 3,400
    expect(m.planned.lines.map((l: any) => l.label)).toEqual(['Inflow (income (take-home))', 'Mortgage', 'Car loan', 'Expenses']);
    expect(fs.readFileSync(path.join(__dirname, '../../../src/screens/CashFlowScreen.tsx'), 'utf8')).toContain('label="Surplus after your budget"');
  });
  open(11, 'NEEDS A RULING', 'MK-CF-M-051 · the actual inflow is the planned take-home, with nothing recorded as received', () => {
    expect(thisMonth(EX).actual.lines[0]).toMatchObject({ label: 'Actual inflow (income (take-home))', amount: 7200 });
    expect(shown('MK-CF-M-051')).toBe('$7,200/month');
  });
  // REVIEWER WRONG (DEC-0292, his worked example of This month: the Actual column reads "mortgage paid 2,000 · car paid
  // 0" — a debt counts in Actual when paid). The register's own decision line ("counted in full, logged or not") says
  // the opposite and is stale: the master file must be corrected to match the code (objective 2).
  open(12, 'REVIEWER WRONG', 'MK-CF-M-052 · outflow counts every debt due', () => { expect(shown('MK-CF-M-052')).toBe('−$5,648/month'); });
  test('#12 · the app\'s answer, pinned: the mortgage not yet paid is $0 in Actual, outflow −$3,248', () => {
    expect(thisMonth(EX).actual.lines.find((l: any) => l.label === 'Mortgage')).toMatchObject({ amount: 0, note: 'not paid yet' });
    expect(shown('MK-CF-M-052')).toBe('−$3,248/month');
  });
  open(13, 'REVIEWER WRONG', 'MK-CF-M-053 · surplus with every debt due', () => { expect(thisMonth(EX).actual.surplus).toBe(1552); });
  test('#13 · the app\'s answer, pinned: $3,952', () => { expect(thisMonth(EX).actual.surplus).toBe(3952); });
  open(14, 'NEEDS A RULING', 'MK-MN-M-003 · "what has gone in already" is a full year of the monthly amount', () => {
    // 2026 limit at 61: $24,500 + $11,250 (age 60–63) = $35,750; $35,750 − $21,350 = $14,400 = 12 × $1,200, not 9 × $1,200
    expect(workedRun('MK-MN-M-003')).toBe(21350);
    expect(24500 + 11250 - 21350).toBe(12 * 1200);
  });
  // APP WRONG (DEC-0296 "an unknown input produces no number and a reason"; DEC-3523 tenet 3) — IN-FLIGHT (the debt
  // editor and Net worth's one-function refactor are mid-edit). The card's minimum left blank is also SAVED as $0 by
  // the debt editor (DebtEditorSheet.tsx:140 num('') = 0).
  open(15, 'APP WRONG', 'MK-NW-M-012 · a debt whose payment was never entered is not $0', () => { expect(visaNoPayment().monthlyDebtPayments).toBeNull(); });
  test('#15 · the app\'s answer, pinned: $2,650 a month, the Visa adding $0 with nothing said', () => { expect(visaNoPayment().monthlyDebtPayments).toBe(2650); });
  // REVIEWER WRONG (DEC-0251: "The typed plan is the fallback for someone who has logged nothing")
  open(16, 'REVIEWER WRONG', 'MK-NW-M-013 · nothing logged must not use the budget\'s essentials', () => { refuses(workedRun('MK-NW-M-013')); });
  test('#16 · the app\'s answer, pinned: 5.2 months = $18,000 ÷ ($2,400 + $700 + $250 + $120)', () => { expect(workedRun('MK-NW-M-013')).toBeCloseTo(18000 / 3470, 12); });
  // APP WRONG on the leftover (DEC-0095: what the holdings do not explain is cash) — the same item as the screen check
  // MK-NW-M-020 T2. The worked example is right (Stocks / Funds $40,600 + Cash $6,000 = $46,600, DEC-2484e). But a broker
  // total of $50,000 over $40,000 of holdings and $5,000 of cash files the $5,000 gap under Stocks / Funds ($45,000), not
  // Cash ($10,000). RE-MEASURED ~13:55 PT: the account page work (ACCOUNT, item 1, uncommitted) landed while this file ran
  // and files the gap as cash — AGREES now, IN-FLIGHT; re-run after commit.
  open(17, 'AGREES', 'MK-NW-M-020 · the gap between the broker\'s total and its parts is cash — fixed in the working tree by the account page work, IN-FLIGHT', () => { expect(brokerGap().cash).toBe(10000); });
  test('#17 · the app\'s answers: worked example $40,600 + $6,000 = $46,600; the gap now Cash $10,000 + Stocks / Funds $40,000 (before: $5,000 + $45,000)', () => {
    expect(workedRun('MK-NW-M-020')).toBe(40600);
    expect(workedRun('MK-NW-M-018')).toBe(46600);
    expect([brokerGap().cash, brokerGap().stocks_etf]).toEqual([10000, 40000]);
  });
  // APP WRONG on a missing FACE (DEC-2748b: "A bond's face value or rate that was never entered stays blank … and the
  // screens say 'not entered'"; tenet 3). A missing rate already gives no interest figure (agrees). A missing face gives
  // 4.50% × the $24,200 market value = $1,089 a year — a bond pays its rate on its face, so that is a guess. The same item
  // as the screen check MK-NW-M-024 T3, which waited for the bond value rule; that rule is in the tree now.
  // REVIEWER WRONG by his ruling DEC-2748c (2026-10-07, TESTED, "perfect."): "A year's interest from a bond or CD has one
  // rule everywhere: face × rate; with no face, value × rate; with no rate, $0 and said so." It governs MK-NW-F-112
  // yearlyInterest by name; four earlier outside reviews agreed with it. Checked 2026-10-21 (NWFIX): the reviewer's point
  // (DEC-2748b, tenet 3) conflicts with that ruling, so the ruling stands and the conflict goes to the record. Was APP WRONG.
  open(18, 'REVIEWER WRONG', 'MK-NW-M-024 · no face → no yearly interest figure (his ruling DEC-2748c: with no face, value × rate)', () => { expect(yearlyInterest(facelessBond())).toBeNull(); });
  test('#18 · the app\'s answers, pinned (DEC-2748c): the worked bond $1,125/year; no rate → none; no face → $1,089 on the market value', () => {
    expect(shown('MK-NW-M-024')).toBe('$1,125/year — 4.50% of $25,000 face');
    expect(yearlyInterest({ ...facelessBond(), face: 25000, couponRate: null })).toBeNull();
    expect(yearlyInterest(facelessBond())!).toBeCloseTo(1089, 6);
  });
  // REVIEWER WRONG on the number (DEC-3390: accrued interest is added before the yield is worked; 5.688% with it,
  // 5.654% without) — the register's formula line omits it and is stale. IN-FLIGHT (a bond's payment frequency in the
  // accrued estimate): the 5.69% is re-run after it lands.
  open(19, 'REVIEWER WRONG', 'MK-NW-M-026 · the yield without accrued interest', () => { expect(workedRun('MK-NW-M-026')).toBeCloseTo(0.0565421979, 8); });
  test('#19 · the app\'s answer, pinned: 5.688% with accrued interest (DEC-3390)', () => { expect(workedRun('MK-NW-M-026')).toBeCloseTo(0.05688, 5); });
  // APP WRONG (DEC-3837 asks once: "Bought from the bank, or through a broker?"; tenet 5: the app does not guess the
  // person's answer). "A CD whose answer was never given is read as bought from the bank" is the code's own line
  // (bonds.ts), not his words — my first mark quoted it as his. The page tells the person "this one is marked as bought
  // from the bank" when nobody marked it. The same item as the screen check MK-NW-M-028 T3. RE-MEASURED ~14:10 PT: fixed in
  // the working tree by the account page work (ACCOUNT, item 4, uncommitted) while this file ran — AGREES now, IN-FLIGHT.
  open(20, 'AGREES', 'MK-NW-M-028 · an unanswered CD is asked, not marked as a bank CD — fixed in the working tree by the account page work, IN-FLIGHT', () => { expect(unansweredCd()).not.toMatch(/marked as bought from the bank/); });
  test('#20 · the app\'s answers: the worked range; an unanswered CD now "Where this CD was bought is not entered." (before: "this one is marked as bought from the bank")', () => {
    expect(shown('MK-NW-M-028')).toBe('$23,300–$23,800');
    expect(unansweredCd()).toMatch(/^Where this CD was bought is not entered\./);
  });
  // DECIDED 2026-10-21 (NWFIX, the lead's decision under DEC-3523 tenets 1, 2 and 7 over the drawing's live wording): the
  // price is the latest close the app holds, so the band names it LAST CLOSE with its day (lastCloseLabel). Was NEEDS A RULING.
  open(21, 'AGREES', 'MK-NW-M-029 · the price band says LAST CLOSE and its day, never LIVE — decided 2026-10-21 (tenets 1, 2, 7)', () => {
    expect(shown('MK-NW-M-029')).toBe('$290.00');
    const screen = fs.readFileSync(path.join(__dirname, '../../../src/screens/HoldingDetailScreen.tsx'), 'utf8');
    expect(screen).toContain('title={lastCloseLabel(position ? priceOf(position.ticker) : null)}');
    expect(screen).not.toMatch(/· LIVE'/);
    expect(lastCloseLabel(series('VTI', [['2026-09-25', 288], ['2026-09-28', 290]]))).toBe(`LAST CLOSE · ${dateShown('2026-09-28').toUpperCase()}`);
  });
  // AGREES — IN-FLIGHT (what was paid on record, Q20)
  open(22, 'AGREES', 'MK-NW-M-030 · value: × the contract multiplier; unknown shares refuse', () => {
    expect(marketValue({ kind: 'options', lots: [{ shares: 3, cost_per_share: 1.5 }] } as any, 2.1)!).toBeCloseTo(630, 6);
    expect(marketValue({ lots: [{ shares: null, cost_per_share: 10 }] } as any, 2)).toBeNull();
  });
  open(23, 'AGREES', 'MK-NW-M-031 · unknown shares refuse; the holding\'s own unit', () => {
    expect(totalShares({ lots: [{ shares: null }] } as any)).toBeNull();
    expect(quantityWithUnit({ kind: 'options' } as any, 1)).toBe('1 contract');
  });
  open(24, 'AGREES', 'MK-NW-M-032 · price paid is per share, as the price is quoted', () => { expect(shown('MK-NW-M-032')).toBe('$225.71'); });
  open(25, 'AGREES', 'MK-NW-M-033 · total paid: unknown shares refuse; × the multiplier', () => {
    expect(costBasis({ kind: 'options', lots: [{ shares: 2, cost_per_share: 1.5 }] } as any)!).toBeCloseTo(300, 6);
    expect(costBasis({ lots: [{ shares: null, cost_per_share: 1.5 }] } as any)).toBeNull();
  });
  // DECIDED 2026-10-21 (PF-B, the lead's decision under DEC-3523 tenets 1 and 4, the rule MK-NW-O-008 follows): a sale dated
  // after today is read ON today — its shares already left the holding — and counts in this year's figure (realized.ts; part
  // 3, MK-PF-F-028). The trade sheet no longer takes a date after today. To reverse: realizedFromLedger, drop such sales.
  open(26, 'NEEDS A RULING', 'MK-NW-M-035 · the partial sale is said (DEC-4643); a sale dated after today — DECIDED 2026-10-21: read on today', () => {
    expect(saleShortOfPurchasesSentence({ sold: 15, matched: 10, gain: 200 } as any, { kind: 'stock' } as any, (n) => `$${n}`))
      .toBe('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.');
    // a sale recorded for 2027-01-02 on 30 Dec 2026 is this year's (read on today), not next year's
    const sold = realizedFromLedger([{ id: 'b', type: 'BUY', ticker: 'X', account_id: 'A', date: '2026-01-02', shares: 10, price: 50 } as any,
      { id: 's', type: 'SELL', ticker: 'X', account_id: 'A', date: '2027-01-02', shares: 10, price: 70 } as any], { ticker: 'X', accountId: 'A', now: new Date(2026, 11, 30, 12) });
    expect([sold.realizedAllTime, sold.realizedThisYear]).toEqual([200, 200]);
  });
  // APP WRONG (DEC-3523 tenet 3): a purchase with no date is split as short-term today (part 2's MK-PF-F-006). The label
  // "Gain — long-term (held over 1 yr)" claims a holding period, not a tax rate — that part of the point is the reviewer's.
  // IN-FLIGHT (Q20, cost not on record, inside capGains).
  // RE-MEASURED 2026-10-21 ~13:50 PT: the Holding page gains work (GAINS, uncommitted) landed in capGains while this file
  // ran — an undated purchase now goes to neither part. At 09:15 the app answered long $0, short $200 (APP WRONG, tenet 3).
  // AGREES now — IN-FLIGHT (GAINS, items 1 and 2: the tax-advantaged split is still being changed); re-run after commit.
  open(27, 'AGREES', 'MK-NW-M-036 · an undated purchase has no long/short split — fixed in the working tree by the gains work, IN-FLIGHT', () => { const g = undated(); expect([g.longGain, g.shortGain, g.totalGain]).toEqual([null, null, 200]); });
  open(28, 'AGREES', 'MK-NW-M-037 · an undated purchase is not short-term by default — fixed in the working tree by the gains work, IN-FLIGHT', () => { expect(undated().shortGain).toBeNull(); });
  test('#27–28 · the app\'s answer since the gains work: no split, total $200 (before it: long $0, short $200)', () => { const g = undated(); expect([g.longGain, g.shortGain, g.totalGain]).toEqual([null, null, 200]); });
  // NEEDS A RULING — the same item as the screen check MK-PF-M-001 T4. The Performance tab's scope is his rule (cash +
  // investment, quoted in DEC-4644; v17's "Cash in this account"): its ending counts the cash, pinned here. What is open is
  // Home, which pairs two scopes in one card: YOUR INVESTMENTS $35,775 (no cash, DEC-0457) over "▲ up $8,200 (21.35%)
  // this month", measured on the $46,600 with cash.
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 2, keeping DEC-0457 and Q-PF-1 both): the two scopes stay —
  // YOUR INVESTMENTS without cash (DEC-0457), the month's change from Performance's 1M door (Q-PF-1) — and Home prints the
  // change's base beneath it where they differ: "This month's change is on $46,600: your investment accounts with the cash
  // in them." (the screen check MK-PF-M-001 T4 renders it). To reverse: delete that line in HomeScreen.tsx.
  open(29, 'NEEDS A RULING', 'MK-PF-M-001 · one scope for an investment figure and its change line — DECIDED 2026-10-21: the change line names its base (tenet 2)', () => {
    const r = thePerformance({ windowStart: '2026-09-02', windowLabel: 'w', today: '2026-09-02', transactions: [], snapshotDays: [day('2026-09-01', { A: 1300 })],
      investmentAccountIds: new Set(['A']), accounts: [cashSleeveA()] });
    expect(r.ending).toBeCloseTo(1330.58, 6);   // the cash sleeve's $130.58 is in the Performance ending
    expect(investmentsTotal([cashSleeveA()] as any)).toBeCloseTo(1200, 6);   // and out of Net worth's Investments
  });
  // APP WRONG (DEC-4439, his example: a new account opened with $10,000 and worth $10,050 that evening earned +$50,
  // +0.50%) — the same item as the screen check MK-PF-M-002 T1. My first mark handed the door a $0 row for the evening
  // before; the app never writes one (the account did not exist), so as it really records a new account, Since opens the
  // day AFTER the deposit and reads Wealth generated $0, Contributions $0, Return +0.00% ($9,800 that evening: the same,
  // where −$200, −2.00% is right). The reviewer's "sign-reversed flows" half is IN-FLIGHT (SYNC, item 1).
  // FIXED 2026-10-21 (NWFIX, DEC-4439): "Since" reads the whole record from the evening before the first recorded day
  // when money was added that day to an account the record first holds then — $0 that evening. Was APP WRONG.
  open(30, 'AGREES', 'MK-PF-M-002 · a new account\'s $10,000 deposit earning $50 shows $50 — fixed 2026-10-21 by DEC-4439', () => {
    const r = newAccount(10050);
    expect([r.walk!.contributions, r.walk!.wealthGenerated]).toEqual([10000, 50]); expect(r.ret!).toBeCloseTo(0.005, 12);
  });
  test('#30 · the app\'s answers since the fix (DEC-4439): +$50 / +0.50% and −$200 / −2.00%, the $10,000 as money put in (before: $0 / +0.00% for both); with a $0 evening handed in, $50', () => {
    for (const [ev, gain] of [[10050, 50], [9800, -200]]) {
      const r = newAccount(ev);
      expect([r.walk!.beginning, r.walk!.contributions, r.walk!.ending]).toEqual([0, 10000, ev]);
      expect(r.walk!.wealthGenerated).toBeCloseTo(gain, 6); expect(r.ret!).toBeCloseTo(gain / 10000, 12);
      expect(r.beginningAsOf).toBe('2026-09-27');   // the dates said on screen do not change
    }
    const handed = thePerformance({ windowStart: '2026-09-02', windowLabel: 'w', today: '2026-09-02', transactions: [{ type: 'DEPOSIT', account_id: 'A', date: '2026-09-02', amount: 10000 }],
      snapshotDays: [day('2026-09-01', { A: 0 })], investmentAccountIds: new Set(['A']), accounts: [linked('A', 10050)] });
    expect(handed.walk!.wealthGenerated).toBeCloseTo(50, 6);
  });
  // APP WRONG (tenet 2: "the rows under a total add up to it"; the row's own decision "THE LINES ALWAYS SUM TO THE
  // ENDING") — the same item as the screen check MK-PF-M-003 T2, which rendered it ($11,502 of rows under $11,500).
  // FIXED 2026-10-21 (tenet 2; the walk's own decision): every screen prints the walk through walkShown — the beginning and
  // the ending rounded as every figure is, the lines between in whole dollars that make up the difference (each rounded
  // down, the missing dollars to the largest leftovers). Hand-worked below. Rounding each line on its own is kept, failing.
  open(31, 'AGREES', 'MK-PF-M-003 · rows as printed add up to the rounded ending — fixed 2026-10-21 (walkShown, tenet 2)', () => { expect(shownRows().rowsAdd).toBe(shownRows().ending); });
  test('#31 · hand-worked, as printed: $3,000 + $500 − $200 + $18 + $4 − $51 = $3,271; Wealth generated $18 + $4 − $51 = −$29 (= $3,271 − $3,000 − $500 + $200)', () => {
    expect(shownRows().w).toEqual({ beginning: 3000, contributions: 500, withdrawals: 200, dividends: 18, interest: 4, marketChange: -51, wealthGenerated: -29, ending: 3271 });
  });
  test.failing('#31 · each line rounded on its own adds up to the rounded ending — no longer how the screens print it (FIXED 2026-10-21)', () => { expect(roundedRows().rowsAdd).toBe(roundedRows().ending); });
  test('#31 · the arithmetic, pinned: rounded one by one, $3,269 of rows against an ending of $3,271', () => { expect(roundedRows()).toEqual({ rowsAdd: 3269, ending: 3271 }); });
  // APP WRONG on the parts, not the total — the same item as the screen check MK-PF-M-004 T4. The ending is the broker's
  // total (DEC-0019), pinned below; the parts under it must add up to it, the gap filed as cash (DEC-0095), and the row's
  // words ("holdings at today's prices plus its cash") say otherwise. RE-MEASURED ~13:55 PT: the parts now file the gap as
  // cash (ACCOUNT, item 1, uncommitted) — AGREES on the parts, IN-FLIGHT; the row's words are the screen check's to correct.
  open(32, 'AGREES', 'MK-PF-M-004 · the parts under the broker\'s total add up to it, the gap as cash — fixed in the working tree by the account page work, IN-FLIGHT', () => { expect(brokerGap().cash).toBe(10000); });
  test('#32 · the app\'s answer, pinned: the ending is the broker\'s total', () => {
    const A = cashSleeveA();
    expect(accountValuesOn(buildDayFromAccounts([A] as any, '2026-09-02', 'x') as any, () => true).get('A')).toBeCloseTo(A.balance, 6);
  });
  open(33, 'AGREES', 'MK-PF-M-006 · the category return of a purchase that morning (DEC-4439) — fixed 2026-10-21 (MK-PF-F-040)', () => {
    expect(categoryEarnings({ windowStart: '2026-09-02', rows: morningRows() as any, transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'Y', date: '2026-09-02', amount: 1 }] })[0].ret!).toBeCloseTo(0.1, 12);
  });
  // (DEC-2160, DEC-3035f) — was APP WRONG at 13:30; fixed in the working tree by the account page work (ACCOUNT, item 5,
  // uncommitted) while this file ran: the $40 now reads Unclassified. AGREES now, IN-FLIGHT. The Alternatives row is case
  // F-084 complex 2's ruling question.
  open(34, 'AGREES', 'MK-PF-M-007 · an unclassified holding\'s income is not Stocks / Funds — fixed in the working tree by the account page work, IN-FLIGHT', () => { expect(unclassifiedIncome().map((b) => b.label)).not.toContain('Stocks / Funds'); });
  // APP WRONG on the start weights (DEC-6212 / DEC-1669; measured in part 3, MK-PF-F-020 and MK-PF-F-044): a holding's
  // start weight is today's value ÷ (1 + its return) = $2,000 for the topped-up holding that began at $1,000. The 0.85
  // gap AGREES: 3.6851% − 2.8349% = 0.8502 points, shown 0.85 — the app subtracts the unrounded rates.
  // FIXED 2026-10-21 (DEC-1669, DEC-3035b, tenet 4; MK-PF-F-020): the row carries what the holding was worth when the window
  // began from the shares held then — 10 × $100 = $1,000 — and the market is weighed by it (portfolioBenchReturn)
  open(35, 'AGREES', 'MK-PF-M-008 · market +X% weighted by the start held when the window began — fixed 2026-10-21 (startValue from the shares held then)', () => {
    const row = toppedUpRow();
    expect(row.startValue!).toBeCloseTo(1000, 6);
    // beside $1,000 of a holding that did not move against a 4% yardstick: (10% × $1,000 + 4% × $1,000) ÷ $2,000 = 7.00%
    const flat = { ...row, position: { ...row.position, ticker: 'B' }, marketValue: 1000, periodReturn: 0, periodTotal: 0, benchReturn: 0.04, benchTotal: 0.04, startValue: 1000 };
    expect(portfolioBenchReturn([{ ...row, benchReturn: 0.1, benchTotal: 0.1 }, flat] as any)).toBeCloseTo(0.07, 12);
  });
  test('#35 · the app\'s answers, pinned: worked 8.80%; the 0.85 gap from unrounded rates', () => {
    expect(workedRun('MK-PF-M-008')).toBe(0.088);
    expect(Math.round((0.036851 - 0.028349) * 10000) / 100).toBe(0.85);
  });
  test.failing('#35 · the app until 2026-10-21, pinned: start weight $2,000 (today\'s 20 shares ÷ the price move) — no longer its answer (FIXED 2026-10-21)', () => {
    const row = toppedUpRow();
    expect(row.startValue!).toBeCloseTo(2000, 6);
  });
  // REVIEWER WRONG (DEC-1069: the look-back drawing is approved; the amount is one the person types, and the result
  // carries no "actual" figure). DECIDED 2026-10-21 for #36 to #38 alike (the lead's decision under DEC-3523: tenet 6, his
  // approved drawing, outranks tenet 7): the screen check that marked the same three NEEDS A RULING now reads REVIEWER WRONG
  // too; no words are added to the look-back. To reverse: add the line 'Before taxes and trading costs, dividends reinvested.'
  open(36, 'REVIEWER WRONG', 'MK-PF-M-010 · the look-back claims what actual money did', () => {
    const r = theLookBack({ amount: 10000, months: 12, now: new Date('2026-09-30T12:00:00'), fromSeries: series('F', [['2025-09-30', 1], ['2026-09-30', 2]]), toSeries: series('T', [['2025-09-30', 1], ['2026-09-30', 2]]) })!;
    expect(Object.keys(r)).toContain('actual');
  });
  open(37, 'REVIEWER WRONG', 'MK-PF-M-011 · needs "hypothetical, before taxes and costs" words', () => { expect(shown('MK-PF-M-011')).not.toBe('$11,600'); });
  open(38, 'REVIEWER WRONG', 'MK-PF-M-012 · the difference claims a saving', () => { expect(shown('MK-PF-M-012')).not.toBe('$1,350'); });
  // AGREES — the worked-back beginning is said on screen (PerformanceScreen.tsx:346); the register's "READ, NOT
  // BACK-SOLVED" line is stale against DEC-3656 / DEC-5068 / DEC-5291 / DEC-6412 and is to be corrected in the file
  open(39, 'AGREES', 'MK-PF-M-013 · a worked-back beginning is labelled', () => {
    const r = thePerformance({ windowStart: '2025-10-13', windowLabel: 'w', today: '2026-10-13', transactions: [], snapshotDays: [],
      investmentAccountIds: new Set(['A']), accounts: [linked('A', 11000)], holdings: [{ position: { ticker: 'VTI' }, marketValue: 11000, periodReturn: 0.1, periodTotal: 0.1 }] });
    expect(r.workedBack).toBe(true);
    expect(fs.readFileSync(path.join(__dirname, '../../../src/screens/PerformanceScreen.tsx'), 'utf8')).toContain('so the beginning is worked back from today');
  });
  // APP WRONG (DEC-4439) — the account page asks the same door as #30; the same item as the screen check MK-PF-M-014 T1
  open(40, 'AGREES', 'MK-PF-M-014 · the first deposit is money in, the $50 is earned (DEC-4439) — fixed 2026-10-21', () => {
    const r = newAccount(10050);
    expect(r.walk!.contributions).toBe(10000); expect(r.walk!.wealthGenerated).toBeCloseTo(50, 6);
  });
  // APP WRONG (tenet 2) — the account page's walk; the same item as the screen check MK-PF-M-015 T2
  open(41, 'AGREES', 'MK-PF-M-015 · rows as printed against the rounded ending — fixed 2026-10-21 (walkShown on the account page too, tenet 2)', () => { expect(shownRows().rowsAdd).toBe(shownRows().ending); });
  // DECIDED 2026-10-21 (the lead's decision under the precision standard and DEC-3523 tenet 4; was NEEDS A RULING): ONE rule
  // for a yearly rate on every screen — (1 + the return)^(365 ÷ days) − 1, the account's and DEC-6412's — so a holding row over
  // the same window reads the same yearly rate; and a window of a year or less, counted on the calendar, is never made
  // yearly on either (DEC-3768b). To reverse: periodReturnParts (src/domain/performance/index.ts) returns years 2 again.
  open(42, 'AGREES', 'MK-PF-M-016 · one yearly-pace rule for 2Y (days ÷ 365) — decided 2026-10-21: the account and a holding row read the same +9.97% a year', () => {
    const today = '2025-10-13'; const ws = windowStartKey('2Y', [], today)!;
    const r = thePerformance({ windowStart: ws, windowLabel: 'w', today, transactions: [], snapshotDays: [day('2023-10-12', { A: 100000 })],
      investmentAccountIds: new Set(['A']), accounts: [linked('A', 121000)] });
    expect(r.cumulative!).toBeCloseTo(0.21, 12);
    expect(r.perYear!).toBeCloseTo(Math.pow(1.21, 365 / windowBounds(ws, today).days) - 1, 12);
    // a holding row over the same two years and the same +21%: the same yearly rate (it read +10.00%, exponent ½)
    expect(periodReturn(series('X', [['2023-10-12', 100], ['2025-10-10', 121]]) as any, '2Y', new Date('2025-10-13T12:00:00'))!).toBeCloseTo(r.perYear!, 12);
  });
  // APP WRONG (tenet 1) — the same item as the screen check MK-PF-M-017 T1. A value below zero is clamped to $0, so
  // $1,000.17 → −$83.19 reads −100.00%; the arithmetic is −108.32%. Either a refusal ("the account's value went below
  // zero") or −108.32% is true; −100.00% is neither. The fix proposed: refuse. (Part 4 marked the same clamp, MK-ST-F-081,
  // as needing a ruling on which true answer; the current answer is wrong whichever is chosen.)
  const belowZero = () => timeWeightedReturn({ days: [day('2026-09-01', { A: 1000.17 }), day('2026-09-02', { A: -83.19 })] as any, accountIds: new Set(['A']), flows: [], start: '2026-09-01', end: '2026-09-02' });
  // FIXED 2026-10-21 (the lead's decision under tenet 1; decides #43 against part 4's MK-ST-F-081 "needs a ruling"): no
  // return, and the sentence names the day. Was APP WRONG.
  open(43, 'AGREES', 'MK-PF-M-017 · money ending below zero does not read −100.00% — fixed 2026-10-21 (no return, with the reason)', () => {
    expect([belowZero().rate, belowZero().refused, belowZero().day]).toEqual([null, 'VALUE_BELOW_ZERO', '2026-09-02']);
    expect(whyNoReturn(belowZero())).toBe('The value recorded on Sep 2, 2026 is below $0, so a return cannot be measured across that day. The dollar figures here are still right.');
  });
  test.failing('#43 · the app\'s answer until 2026-10-21, pinned: −100.00% — no longer its answer (FIXED 2026-10-21)', () => { expect(belowZero().rate).toBe(-1); });
  // AGREES — the app follows DEC-5291 / DEC-6412 and says when the record begins late; the register's refusal line is
  // stale (file to correct)
  open(44, 'AGREES', 'MK-PF-M-018 · a record that begins late says so', () => {
    const r = thePerformance({ windowStart: '2025-10-13', windowLabel: 'w', today: '2026-10-13', transactions: [], snapshotDays: [day('2026-02-03', { A: 1000 })],
      investmentAccountIds: new Set(['A']), accounts: [linked('A', 1100)] });
    expect(r.walk).toBeNull();
    expect(r.sentence).toBe(`The record begins ${dateShown('2026-02-03')}, so it cannot say what this account was worth on ${dateShown('2025-10-12')}.`);
  });
  open(45, 'AGREES', 'MK-PF-M-019 · a missing amount is not $0, and the screen names where history starts', () => {
    expect(whyNoReturn({ rate: null, refused: 'MOVEMENT_HAS_NO_AMOUNT', day: '2026-09-17', measuredFrom: null } as any)).not.toContain('still right');
    expect(fs.readFileSync(path.join(__dirname, '../../../src/screens/PerformanceScreen.tsx'), 'utf8')).toContain('rebuiltSentence(who, earliest)');
  });
  // APP WRONG (DEC-3279e "A missing balance is never $0"; tenet 3) — the same item as the screen check MK-PF-M-020 T3.
  // availableCash = cash_balance || 0: a brokerage whose cash was never entered reads "Available cash: $0" and a buy is
  // refused as "not enough".
  const neverEnteredCash = () => availableCash({ asset_id: 'B', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'manual', balance: 5000, derive_balance: true, positions: [] } as any);
  // FIXED 2026-10-21 (DEC-3279e, tenet 3): an investment account's cash never entered is unknown — the sheet reads not
  // entered and does not refuse on it. The app's answer until then is kept, failing.
  open(46, 'AGREES', 'MK-PF-M-020 · cash never entered is not $0 — fixed 2026-10-21 (DEC-3279e, tenet 3)', () => { expect(neverEnteredCash()).toBeNull(); });
  test.failing('#46 · the app\'s answer until 2026-10-21, pinned: $0 — no longer its answer (FIXED 2026-10-21)', () => { expect(neverEnteredCash()).toBe(0); });
  // APP WRONG on Home (DEC-3279e) — the same item as the screen check MK-XS-M-001 T3: the function names the missing
  // balance (pinned below) and the Net worth tab says so, but Home prints "Net worth $119,200" with nothing beside it.
  // This test reads Home's source for the gaps reader; the rendered proof is the screen check. RE-MEASURED ~14:10 PT: Home
  // now reads dataGaps (ACCOUNT, item 7, uncommitted) — AGREES on the source, IN-FLIGHT; the screen check confirms the words.
  open(47, 'AGREES', 'MK-XS-M-001 · Home names a missing balance beside Net worth — fixed in the working tree by the account page work, IN-FLIGHT', () => {
    expect(fs.readFileSync(path.join(__dirname, '../../../src/screens/HomeScreen.tsx'), 'utf8')).toMatch(/dataGaps|DataGapsBanner/);
  });
  test('#47 · the function\'s answer, pinned: the missing balance is named', () => {
    expect(dataGaps([{ asset_id: 'X', label: 'Old 401(k)', kind: '401k', asset_class: 'stocks_etf', tax_bucket: 'PRE_TAX', balance: null } as any]).some((g: any) => g.kind === 'no-balance')).toBe(true);
  });
  // AGREES (DEC-2484l: Cash + Investments = together, the sleeve on the Cash line; DEC-0338) — IN-FLIGHT
  open(48, 'AGREES', 'MK-XS-M-003 · Investments leaves a brokerage\'s cash sleeve to the Cash line', () => {
    const A = cashSleeveA();
    expect(investmentsTotal([A] as any) + cashTotal([A] as any)).toBeCloseTo(investableAssets([A] as any), 6);
    expect(investmentsTotal([A] as any)).toBeCloseTo(1200, 6);
  });
  open(49, 'AGREES', 'MK-XS-M-004 · one door: an exact year is never a yearly rate (DEC-3768b)', () => {
    const r = thePerformance({ windowStart: windowStartKey('1Y', [], '2026-10-10'), windowLabel: 'w', today: '2026-10-10', transactions: [], snapshotDays: [day('2025-10-09', { A: 40000 })],
      investmentAccountIds: new Set(['A']), accounts: [linked('A', 44000)] });
    expect(r.perYear).toBeNull(); expect(r.ret!).toBeCloseTo(0.1, 12);
  });
  // APP WRONG (IRS Rev. Proc. 2025-32 §4.01 — the source the table itself cites): head of household 24% ends at $201,750
  // and 32% at $256,200; the table copies the single filer's $201,775 / $256,225 (src/domain/income/tax.ts:148)
  open(50, 'APP WRONG', '2026 head-of-household brackets: tax at $300,000 taxable is $71,961', () => { expect(taxOwedFor(300000 + 24150, 'hoh')).toBeCloseTo(71961, 6); });
  test('#50 · the app\'s answer, pinned: $71,958.25', () => { expect(taxOwedFor(300000 + 24150, 'hoh')).toBeCloseTo(71958.25, 6); });
  // AGREES (G4, founder agreed 2026-09-12): the $200,000 line is what one paycheck withholds, per earner, never deducted
  // from the take-home; a household's own liability is not computed anywhere
  open(51, 'AGREES', 'Additional Medicare: per-earner withholding, kept apart from a household\'s liability', () => {
    expect(payrollTaxWithheld(250000)).toBeCloseTo(184500 * 0.062 + 250000 * 0.0145 + 50000 * 0.009, 6);
  });
  open(52, 'BLOCKED', 'owner rules outside this module cannot be closed from Performance evidence', () => { /* part 1's rules_held is another agent's share */ });
  test('52 still-open points in the package, each tested here once', () => {
    expect(PART.still_open.length).toBeGreaterThanOrEqual(52);
    expect(Object.keys(OPEN).map(Number).sort((a, b) => a - b)).toEqual(PART.still_open.map((_: unknown, i: number) => i + 1));
  });
});
