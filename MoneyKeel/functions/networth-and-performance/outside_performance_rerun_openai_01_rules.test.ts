/** OUTSIDE PERFORMANCE RE-RUN (OpenAI, 2026-10-13 package) — PART 1, THE RULES THE REVIEWER JUDGED (`rules_held`, 49)
 *  AND THE TWO THINGS IT COULD NOT TEST (`could_not_test`, 2). MEASURING PHASE: nothing in the app is changed here.
 *
 *  Source: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_1.json
 *  Results: MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_01_screens_results.json
 *  The screen checks of the same part (424) are in src/screens/__tests__/outside_performance_rerun_openai_01_screens.test.tsx.
 *
 *  For each rule: the reviewer's verdict (HELD · NOT HELD · CANNOT TELL), my classification, the existing tests that
 *  prove it (each must exist and name the rule — a guard proves it looked), and, where the reviewer made a claim, a
 *  check against the REAL function the app calls, on the reviewer's own example or the decision's own example.
 *    AGREES          the reviewer held it and it holds; or it could not tell and a test proves it holds
 *    APP WRONG       the app breaks the rule (test.failing, with the rule's answer as the expectation)
 *    REVIEWER WRONG  the reviewer said NOT HELD and the real function holds it
 *    NEEDS A RULING  no ruling settles it
 *    BLOCKED         cannot be handed to a function
 *  IN-FLIGHT marks a rule whose answer depends on Net worth work landing now (re-run after it lands).
 */
import * as fs from 'fs';
import * as path from 'path';
import { timeWeightedReturn } from '../../../Calculation Module code/engines/time-weighted-return';
import { buildPerformance, priceHistoryShortSentence, periodTotalReturn, benchmarkTicker, contractMultiplier, portfolioBenchReturn } from '../../../src/domain/performance';
import { realizedFromLedger, saleShortOfPurchasesSentence } from '../../../src/domain/performance/realized';
import { thePerformance, windowStartKey, categoryEarnings } from './performance';
import { theBonds } from './bonds';
import { theNetWorth } from './net-worth';

const ROOT = path.join(__dirname, '..', '..', '..');
const PACKAGE = path.join(ROOT, 'MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_1.json');
const PART1 = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));

// ── the record shapes the real functions read ─────────────────────────────────────────────────────────────────────
const day = (date: string, id: string, v: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: v, statedTotal: v, typedValue: null, currency: 'USD' }] });
const close = (pts: [string, number][]) => ({ points: pts.map(([date, c]) => ({ date, close: c })) });

type Cls = 'AGREES' | 'APP WRONG' | 'REVIEWER WRONG' | 'NEEDS A RULING' | 'BLOCKED';
// `fixed`: the day and the reason a `wrong` was made right — it then runs as a passing test with that in its name (kept, not deleted)
interface RuleRow { n: number; key: string; cls: Cls; inFlight?: boolean; proof: string[]; why: string; fix?: string; check?: () => void; wrong?: () => void; fixed?: string }

/** THE 49 RULES, in the package's order. `key` is the start of the reviewer's rule text (the guard below matches it). */
export const RULES: RuleRow[] = [
  { n: 1, key: 'owner-1', cls: 'APP WRONG', proof: ['MoneyKeel/functions/networth-and-performance/performance-decisions.test.ts', 'src/screens/__tests__/perf_v17_marks.test.tsx'],
    why: 'Account returns are time-weighted (the engine gives DEC-4439\'s Vanguard day +0.50%). A HOLDING bought in two pieces inside the window is not: the purchase-capped return (MK-PF-F-040, inside buildPerformance) gives +26.76% on the reviewer\'s morning-purchase case where DEC-4439 gives +15.24%.',
    fix: 'src/domain/performance/index.ts returnSincePurchases: link each day as evening value ÷ (previous evening value + that morning\'s purchase cost) − 1 (DEC-4439), not the old shares re-priced first. Moves every holding row bought inside the window (account page BY CATEGORY & HOLDING, Holding page window figure, Performance category return).',
    wrong: () => {
      const pos: any = { position_id: 'p', ticker: 'XX', asset_class: 'stock_etf', lots: [
        { lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2026-09-01' }, { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] };
      const series = close([['2026-08-31', 100], ['2026-09-01', 100], ['2026-09-02', 121]]);
      const row = buildPerformance([pos], () => series as any, '1M' as any, new Date('2026-09-02T12:00:00'))[0];
      expect(row.periodReturn).toBeCloseTo(2420 / (1000 + 1100) - 1, 10);           // +15.24% — before 2026-10-21 it was +26.76%
    },
    fixed: '2026-10-21: a holding bought in pieces counts each purchase from the start of its day, as the account does (DEC-4439, MK-PF-F-040)' },
  { n: 2, key: 'owner-2', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/emergency_fund_rent.test.ts', 'src/screens/__tests__/emergency_fund_rent.test.tsx'],
    why: 'Held: the emergency fund divides cash by (essentials − rent that keeps arriving); proven by the two emergency-fund rent tests.' },
  { n: 3, key: 'owner-3', cls: 'AGREES', proof: ['src/screens/__tests__/housing_rule.test.tsx', 'src/__tests__/decisions_are_held.test.ts'],
    why: 'Held: rendered on Net worth — "Your Rent / Mortgage budget line is not counted here: your home\'s mortgage, Mortgage, is in Debts and is counted from there." (screens file, MK-NW-M-013 T1); Cash flow\'s Planned block deducts each debt from the debt list.' },
  { n: 4, key: 'owner-4', cls: 'AGREES', proof: ['src/screens/__tests__/mortgage_on_a_property.test.tsx', 'MoneyKeel/functions/networth-and-performance/net-worth.test.ts'],
    why: 'Held: mortgagesByProperty matches every mortgage to a property; proven by mortgage_on_a_property.' },
  { n: 5, key: 'owner-5', cls: 'AGREES', proof: ['src/domain/assets/classification.test.ts', 'src/__tests__/nw_function_trace.test.ts'],
    why: 'Held: a property with no rent entered on the Income screen is a second or vacation home; proven by the classification tests.' },
  { n: 6, key: 'owner-6', cls: 'AGREES', proof: ['src/screens/__tests__/kept_editors_match.test.tsx', 'Calculation Module code/probes/bonds-and-freshness.probe.test.ts'],
    why: 'Held: bonds are listed soonest-maturing first; proven by the Bonds drawing match and the bonds probe.' },
  { n: 7, key: 'owner-7', cls: 'APP WRONG', proof: ['src/__tests__/decisions_are_held.test.ts'],
    why: 'A holding with nothing saying what kind it is has no yardstick (benchmarkTicker → null, held), but WHAT EACH CATEGORY EARNED puts it under Stocks / Funds with its return and income — a guess, where his rule is "Refuse the line and ask".',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts categoryEarnings: a row whose holding has no class goes to an "Unclassified" line with "asset type not classified — tap to choose" (DEC-2160 wording), never Stocks / Funds. Moves the Performance tab\'s category table only.',
    check: () => { expect(benchmarkTicker({} as any)).toBeNull(); },                // the yardstick refuses — held
    wrong: () => {
      const cats = categoryEarnings({ windowStart: '2026-01-01', transactions: [{ txn_id: 'd', ticker: 'QQ', type: 'DIVIDEND', amount: 50, date: '2026-05-01' }],
        rows: [{ position: { ticker: 'QQ' }, periodReturn: 0.1, marketValue: 1000 }] } as any);
      expect(cats.find((c: any) => c.key === 'stocks_etf')).toBeUndefined();        // before 2026-10-21: Stocks / Funds, $50, +10.00%
    },
    fixed: '2026-10-21: a holding nothing classes is Unclassified on the Performance tab too, as on Net worth and the account page (DEC-2160)' },
  { n: 8, key: 'owner-8', cls: 'AGREES', proof: ['src/__tests__/networth_decisions_held_logic.test.ts', 'src/screens/__tests__/kept_editors_match.test.tsx'],
    why: 'Held: private equity and hedge funds are not offered; a saved row keeps its kind; proven by the decisions-held tests.' },
  { n: 9, key: 'owner-9', cls: 'AGREES', proof: ['src/__tests__/networth_decisions_held_logic.test.ts'], why: 'Held: the same rule, first made 2026-08-04 (DEC-0045) — private equity and hedge funds are not offered; proven by networth_decisions_held_logic.' },
  { n: 10, key: 'owner-10', cls: 'AGREES', proof: ['src/domain/bonds/income.test.ts', 'src/screens/__tests__/outside_networth_final_openai_bonds.test.tsx'],
    why: 'Held, rendered: a Treasury with no rate reads "Interest payments — not entered · $0/year — coupon rate not entered" and shows no yield (screens file, MK-NW-M-024 T3).' },
  { n: 11, key: 'owner-11', cls: 'AGREES', inFlight: true, proof: ['src/domain/bonds/a46_a47_coupon_and_accrued.test.ts', 'src/domain/bonds/coupons_per_year.test.ts'],
    why: 'Held in words, rendered: "Added estimated $1,119 in accrued interest to bond value at 4.5% coupon for 363 days to calculate YTM. If this is not accurate, enter actual accrued interest". The 363 days assume one coupon a year; a bond\'s payment frequency is being changed now (coupons_per_year.test.ts is new) — re-run after it lands.' },
  { n: 12, key: 'owner-12', cls: 'AGREES', proof: ['src/domain/bonds/dec3837_cd_bought.test.ts', 'src/screens/__tests__/networth_add_cd_asks_where_bought.test.tsx'],
    why: 'Held, rendered: a bank CD reads "Nothing happens to this CD. It is not traded…" and no rates-move figure; a broker CD gets one (DEC-3837 test).' },
  { n: 13, key: 'owner-13', cls: 'AGREES', proof: ['src/__tests__/founder_2026_08_11.test.tsx', 'src/screens/__tests__/import_holdings_journey.test.tsx'],
    why: 'Held: money-market funds read Stocks / Funds and CDs and T-bills Bonds & CDs (DEC-0051/DEC-0092 tests). The comment the reviewer quotes is a code comment, not a figure.' },
  { n: 14, key: 'owner-14', cls: 'AGREES', proof: ['src/screens/__tests__/nw_ledger_no_balance.test.tsx', 'src/screens/__tests__/housing_rule.test.tsx'],
    why: 'Held: under each class heading every account holding money in it is listed with its part; rows add up to the heading.' },
  { n: 15, key: 'owner-15', cls: 'REVIEWER WRONG', proof: ['src/screens/__tests__/outside_networth_02.test.tsx', 'src/screens/__tests__/fcc_agreement.test.tsx'],
    why: 'Held: Home and Net worth show ONE Investments figure and it leaves cash out — rendered, a $46,600 brokerage holding $10,825 of cash reads YOUR INVESTMENTS $35,775 on Home, and the Net worth household reads $175,200 on both. Performance\'s Ending value is a different figure with its own name. Whether Home\'s return line under Investments should measure the cash too is a separate question (MK-PF-M-001 T4, needs a ruling).',
    check: () => {
      const nw = theNetWorth({ accounts: [
        { asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, asset_class: 'cash' },
        { asset_id: 'a2', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142000, asset_class: 'stocks_etf' }] as any,
        debts: [], snapshotDays: [], transactions: [], since: '2026-09-28', today: '2026-09-28', uid: 'x' } as any);
      expect(nw.investments).toBe(142000);
    } },
  { n: 16, key: 'DEC-1624', cls: 'AGREES', proof: ['src/screens/__tests__/kept_editors_match.test.tsx', 'src/screens/__tests__/whatif_lookback.test.tsx'],
    why: 'Held, rendered: Look back\'s "To" choices read SPY, the holdings, AGG, GLD, BTC, AOR (screens file, MK-PF-M-011).' },
  { n: 17, key: 'DEC-3656', cls: 'APP WRONG', proof: ['src/screens/__tests__/dec3656_beginning_worked_back.test.tsx', 'src/screens/__tests__/dec_worked_back_known_holdings.test.tsx'],
    why: 'His two examples hold (a CD at 5%: $10,500 gained $500; a bond with no price history is named and left out — the wording since DEC-5068). The reviewer\'s share-change case does not: 10 shares at $100, 10 more bought for $1,100 with money paid in, 20 at $121 now — the beginning is worked back as $900 (true $1,000) and wealth generated $420 (true $320), because today\'s 20 shares are divided by the price move.',
    fix: 'MoneyKeel/functions/networth-and-performance/performance.ts pricedGainOf (MK-NW-F-091): work a holding\'s start value from the shares held on the window\'s first day (its lots dated before it) × the first close; refuse the worked-back beginning, with the DEC-3656 sentence, when a holding\'s shares changed inside the window and its lots cannot say how. Moves the walk\'s Beginning and Wealth generated on the Performance tab and the account page for windows the daily record does not reach.',
    check: () => {
      const cd = thePerformance({ windowStart: '2025-09-29', windowLabel: 'the past year', today: '2026-09-28', transactions: [], snapshotDays: [], investmentAccountIds: new Set(['c']),
        accounts: [{ asset_id: 'c', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', balance: 10500, coupon_rate: 0.05, face_value: 10000, maturity_date: '2027-09-28' }] as any, holdings: [] } as any);
      expect(cd.walk!.wealthGenerated).toBeCloseTo(500, 6);                           // his example (1) — held
      expect(cd.walk!.beginning).toBeCloseTo(10000, 6);
    },
    // the reviewer's holding as the app builds its row (2026-10-22): a row written by hand carried no start and no price paid,
    // which the app's own rows always carry — 10 shares bought Aug 1, 10 more for $1,100 on Sep 2 (close $100 the evening before
    // the window, $121 now), the $1,100 paid in that day. Hand-worked: $2,420 − ($2,420 − $1,000 − $1,100 = $320) − $1,100 = $1,000
    wrong: () => {
      const XX = { position_id: 'xx', ticker: 'XX', kind: 'stock', asset_class: 'stock_etf',
        lots: [{ lot_id: 'a', shares: 10, cost_per_share: 90, purchase_date: '2026-08-01' }, { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] };
      const rows = buildPerformance([XX] as any, () => ({ points: [{ date: '2026-08-31', close: 100 }, { date: '2026-09-02', close: 121 }] }) as any,
        '1M', new Date('2026-09-02T12:00:00'), undefined, '2026-09-01');
      const p = thePerformance({ windowStart: '2026-09-01', windowLabel: 'x', today: '2026-09-02', snapshotDays: [], investmentAccountIds: new Set(['s']),
        transactions: [{ txn_id: 'c', account_id: 's', type: 'DEPOSIT', amount: 1100, date: '2026-09-02' }],
        accounts: [{ asset_id: 's', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', balance: 2420, positions: [XX] }] as any,
        holdings: rows as any } as any);
      expect(p.walk!.beginning).toBeCloseTo(1000, 6);                                 // until 2026-10-22: $900
      expect(p.walk!.wealthGenerated).toBeCloseTo(320, 6);                            // until 2026-10-22: $420
    },
    fixed: '2026-10-22 (DEC-3656; W-START): the start is what the shares held when the window began were worth, and the money paid for shares bought inside it is not a gain — Beginning $1,000 (was $900), Wealth generated $320 (was $420)' },
  { n: 18, key: 'DEC-3657', cls: 'AGREES', proof: ['src/screens/__tests__/networth_missing_balance_and_class_pick.test.tsx', 'src/screens/__tests__/nw_totals_one_function.test.tsx'],
    why: 'Held, rendered: a brokerage with no balance reads "Stocks / Funds — Value not entered" and "Fidelity Brokerage has no balance" on Net worth.' },
  { n: 19, key: 'DEC-3768b', cls: 'AGREES', proof: ['src/domain/performance/start_date_month_end.test.ts'],
    why: 'Held: 1M from Mar 31 starts Feb 28; 1Y from Feb 29, 2028 starts Feb 28, 2027.',
    check: () => {
      expect(windowStartKey('1M', [], '2026-03-31')).toBe('2026-02-28');
      expect(windowStartKey('1Y', [], '2028-02-29')).toBe('2027-02-28');
    } },
  { n: 20, key: 'DEC-3768c', cls: 'AGREES', proof: ['src/screens/__tests__/onboarding_rent_strict_reader.test.tsx', 'src/domain/_shared/num.test.ts'], why: 'Held: a rent with words in it ("about 2k") is not read and counts as not entered; proven by the strict-reader tests.' },
  { n: 21, key: 'DEC-3769', cls: 'AGREES', proof: ['src/screens/__tests__/emergency_fund_rent.test.tsx', 'MoneyKeel/functions/networth-and-performance/emergency_fund_rent.test.ts'],
    why: 'Held, rendered: "6.8 months, rent not included. Enter rent to include." on Net worth for a rental with no rent entered.' },
  { n: 22, key: 'DEC-3836', cls: 'AGREES', proof: ['src/screens/__tests__/emergency_fund_rent_dec3836.test.tsx'], why: 'Held on Stress test, Job safety, Insights and Home; proven by the DEC-3836 screen test.' },
  { n: 23, key: 'DEC-3837', cls: 'AGREES', proof: ['src/domain/bonds/dec3837_cd_bought.test.ts', 'src/screens/__tests__/add_account_cd_bought.test.tsx'],
    why: 'Held, rendered: the Ally bank CD\'s yield to maturity reads its rate, 5.05%. (A CD whose answer was never given is read as a bank CD and the page says it "is marked as bought from the bank" — that wording is a screen finding: MK-NW-M-028 T3.)' },
  { n: 24, key: 'DEC-4036b', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts', 'src/screens/__tests__/dec_4036_screens.test.tsx'], why: 'Held: a bond or CD with no maturity date keeps counting its interest and its row reads "maturity date not entered" (Treasury $10,000 at 4%: $400 a year); proven by dec_4036_rulings and dec_4036_screens.' },
  { n: 25, key: 'DEC-4036c', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: "CD" is read from an account\'s own name or type, never its institution ("CD Capital" brokerage is not a CD); proven by dec_4036_rulings.' },
  { n: 26, key: 'DEC-4036d', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: a 529 is tax-free for education whatever tax setting is stored; proven by dec_4036_rulings.' },
  { n: 27, key: 'DEC-4036e', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: an HSA is pre-tax going in and tax-free for medical costs whatever bucket it is filed in; proven by dec_4036_rulings.' },
  { n: 28, key: 'DEC-4036f', cls: 'AGREES', proof: ['src/screens/__tests__/dec_4036_screens.test.tsx', 'src/screens/__tests__/dec4059_dates_rent_taxtype.test.tsx'], why: 'Held: an account with no type chosen reads "tax type not stated" with a tap to choose, never taxable; proven by dec_4036_screens.' },
  { n: 29, key: 'DEC-4036g', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: the old sign-up answer "savings or portfolio" is filed Unclassified and asked about; proven by dec_4036_rulings.' },
  { n: 30, key: 'DEC-4036h', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: money in an alternatives part no priced holding explains reads "$1,500 asset type not classified", never Other at 5%; proven by dec_4036_rulings.' },
  { n: 31, key: 'DEC-4036i', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: an overdrawn hand-built account is negative cash (−$100), not Cash $0 and Unclassified −$100; proven by dec_4036_rulings.' },
  { n: 32, key: 'DEC-4036j', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: a vehicle with no value entered gets the line "Car A\'s value not entered — it may be the car you drive"; proven by dec_4036_rulings.' },
  { n: 33, key: 'DEC-4036k', cls: 'AGREES', proof: ['MoneyKeel/functions/networth-and-performance/dec_4036_rulings.test.ts'], why: 'Held: the Plan\'s retirement money names an account it leaves out, "leaves out Linked 401(k) — Value not entered"; proven by dec_4036_rulings.' },
  { n: 34, key: 'DEC-4059b', cls: 'AGREES', proof: ['src/screens/__tests__/dec4059_dates_rent_taxtype.test.tsx'], why: 'Held: every bond or CD date is picked from a date picker, the Net worth editor too; proven by dec4059_dates_rent_taxtype.' },
  { n: 35, key: 'DEC-4059c', cls: 'AGREES', proof: ['src/screens/__tests__/dec4059_dates_rent_taxtype.test.tsx'], why: 'Held: an unreadable history start date reads "History start date cannot be read. Edit date" with a date picker; proven by dec4059_dates_rent_taxtype.' },
  { n: 36, key: 'DEC-4059d', cls: 'AGREES', proof: ['src/screens/__tests__/onboarding_rent_property_dec4327.test.tsx', 'src/screens/__tests__/housing_rule.test.tsx'], why: 'Held: a rent entry cannot be saved until its property is picked, and with no property it says "Add the property in Net worth first"; proven by the rent-property tests.' },
  { n: 37, key: 'DEC-4082', cls: 'AGREES', proof: ['src/domain/assets/plural_words.test.ts'], why: 'Held: one list of counted words and their plurals, a word not on it refused; proven by plural_words.' },
  { n: 38, key: 'DEC-4327', cls: 'AGREES', proof: ['src/screens/__tests__/onboarding_rent_property_dec4327.test.tsx'], why: 'Held: sign-up\'s rent step asks "Which property is it?" when a property exists; proven by onboarding_rent_property_dec4327.' },
  { n: 39, key: 'DEC-4350', cls: 'AGREES', proof: ['src/screens/__tests__/onboarding_add_property_first_dec4350.test.tsx'], why: 'Held: sign-up\'s rent step carries "Add the property first ›" and comes back to ask which property; proven by onboarding_add_property_first_dec4350.' },
  { n: 40, key: 'DEC-4439', cls: 'APP WRONG', proof: ['MoneyKeel/functions/networth-and-performance/performance-decisions.test.ts'],
    why: 'The engine holds his Vanguard day (+0.50%). Two places do not: (1) a holding bought in pieces (see owner-1: +26.76% where his rule gives +15.24%); (2) a household\'s FIRST account, opened with $10,000 and worth $10,050 that evening — his own example — refuses in the engine (no evening before) and the screens show Wealth generated $0 and Return +0.00% (screens file, MK-PF-M-002 T1).',
    fix: 'Calculation Module code/engines/time-weighted-return.ts timeWeightedReturn and MoneyKeel/functions/networth-and-performance/performance.ts thePerformance: when the record\'s first day carries a deposit into an account that has no earlier day, the evening before is $0 (his rule) — the Since window begins the evening before the first day. Moves Since on the Performance tab, the account page and Home for every account opened with a deposit: $0 / +0.00% → +$50 / +0.50% in his example.',
    check: () => {
      const v = timeWeightedReturn({ days: [day('2026-09-01', 'v', 50000), day('2026-09-02', 'v', 60300)] as any, accountIds: new Set(['v']),
        flows: [{ accountId: 'v', date: '2026-09-02', amount: 10000 }] as any, start: '2026-09-01', end: '2026-09-02' });
      expect(v.rate).toBeCloseTo(0.005, 10);                                           // his Vanguard day — held
    },
    // FIXED 2026-10-21, both places: (1) a holding bought in pieces counts each purchase from the start of its day (MK-PF-F-040,
    // +15.24%); (2) the Since window reads a new account's first day as money put in on an evening at $0 — in the door that
    // every screen asks (thePerformance), which hands the engine that evening, so his example reads +0.50% (+$50). The engine
    // handed no evening still refuses (START_NOT_RECORDED): it never invents a day, the door writes the one his rule gives.
    wrong: () => {
      const pos: any = { position_id: 'p', ticker: 'XX', asset_class: 'stock_etf', lots: [
        { lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: '2026-09-01' }, { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: '2026-09-02' }] };
      const row = buildPerformance([pos], () => close([['2026-08-31', 100], ['2026-09-01', 100], ['2026-09-02', 121]]) as any, '1M' as any, new Date('2026-09-02T12:00:00'))[0];
      expect(row.periodReturn).toBeCloseTo(2420 / (1000 + 1100) - 1, 10);             // (1) +15.24%
      const days = [day('2026-09-02', 'n', 10050), day('2026-09-03', 'n', 10050)];
      const first = thePerformance({ windowStart: windowStartKey('SINCE', ['2026-09-02'], '2026-09-03'), windowLabel: 'since Sep 2, 2026', today: '2026-09-03',
        transactions: [{ id: 'd', account_id: 'n', type: 'DEPOSIT', amount: 10000, date: '2026-09-02' }], snapshotDays: days as any,
        investmentAccountIds: new Set(['n']), wholeRecord: true,
        accounts: [{ asset_id: 'n', label: 'New', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'connected', balance: 10050, cash_balance: 10050, positions: [] }] as any });
      expect(first.cumulative!).toBeCloseTo(0.005, 10);                                // (2) his new account: +0.50%
      expect(first.walk!.wealthGenerated).toBeCloseTo(50, 6);
    },
    fixed: '2026-10-21: a holding bought in pieces counts each purchase from the start of its day (MK-PF-F-040), and Since reads a new account\'s first deposit as money put in on an evening at $0 (DEC-4439)' },
  { n: 41, key: 'DEC-4528', cls: 'AGREES', proof: ['src/screens/__tests__/nw_no_accounts_one_door.test.tsx', 'src/screens/__tests__/networth_v08.test.tsx'], why: 'Held: with no debt entered the Debts door reads "Add your debts ›"; proven by the empty-state tests.' },
  { n: 42, key: 'DEC-4529', cls: 'AGREES', proof: ['src/screens/__tests__/networth_figures_match_v08.test.tsx', 'src/screens/__tests__/kept_editors_match.test.tsx'], why: 'Held: wrong figures on approved drawings are named in each drawing\'s READ THIS FIRST box with the arithmetic; proven by the drawing-match tests.' },
  { n: 43, key: 'DEC-4640', cls: 'AGREES', proof: ['src/domain/performance/start_date_month_end.test.ts', 'MoneyKeel/functions/networth-and-performance/outside_performance_claude_01.test.ts'],
    why: 'Held: "5Y" opens nowhere in the one table of window names; the screens offer only Since, 1M, This year, 1Y, 2Y (rendered).',
    check: () => { expect(windowStartKey('5Y', [], '2026-09-28')).toBeNull(); } },
  { n: 44, key: 'DEC-4641', cls: 'REVIEWER WRONG', proof: ['src/screens/__tests__/coverage_line.test.tsx', 'src/screens/__tests__/performance_decisions_2026_10_12.test.tsx'],
    why: 'Held on the path the screens use: prices from May 4, 2026 ($83.17) to Oct 10, 2026 ($91.43) under 1Y give the shortened total 91.43 ÷ 83.17 − 1 as both the row\'s figure and its window total, with "Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year."',
    check: () => {
      const s = close([['2026-05-04', 83.17], ['2026-10-10', 91.43]]);
      expect(priceHistoryShortSentence(s.points as any, '2025-10-10', '1Y', '2026-10-10')).toBe('Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year.');
      const row = buildPerformance([{ position_id: 'q', ticker: 'YY', asset_class: 'stock_etf', lots: [{ lot_id: 'c', shares: 100, cost_per_share: 80, purchase_date: '2025-01-01' }] } as any],
        () => s as any, '1Y' as any, new Date('2026-10-10T12:00:00'))[0];
      expect(row.periodReturn).toBeCloseTo(91.43 / 83.17 - 1, 12);
      expect(row.periodTotal).toBeCloseTo(91.43 / 83.17 - 1, 12);
      expect(periodTotalReturn(s as any, '1Y' as any, new Date('2026-10-10T12:00:00'))).toBeCloseTo(91.43 / 83.17 - 1, 12);
    } },
  { n: 45, key: 'DEC-4643', cls: 'AGREES', proof: ['src/domain/performance/realized.test.ts', 'src/screens/__tests__/holding_cost_not_on_record.test.tsx'],
    why: 'Held, rendered: "Realized from sales +$200 all time" and "$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record."',
    check: () => {
      const txns: any[] = [{ txn_id: 'b', account_id: 'h', ticker: 'XYZ', type: 'BUY', shares: 10, price: 50, amount: 500, date: '2025-01-02' },
        { txn_id: 's', account_id: 'h', ticker: 'XYZ', type: 'SELL', shares: 15, price: 70, amount: 1050, date: '2026-08-01' }];
      const r = realizedFromLedger(txns as any, { ticker: 'XYZ', accountId: 'h', now: new Date('2026-09-28T12:00:00') });
      expect(r.realizedAllTime).toBeCloseTo(200, 6);
      expect(r.shortOfPurchases).toHaveLength(1);                                       // one sale, counted once
      expect(saleShortOfPurchasesSentence(r.shortOfPurchases[0], { kind: 'stocks_etf' } as any, (n) => `$${Math.round(n).toLocaleString('en-US')}`)).toBe('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.');
    } },
  { n: 46, key: 'DEC-4644', cls: 'REVIEWER WRONG', proof: ['MoneyKeel/functions/networth-and-performance/dec6212_bond_interest.test.ts', 'MoneyKeel/functions/networth-and-performance/outside_performance_claude_01.test.ts'],
    why: 'The beginning worked back is the ACCOUNT\'s (shares plus the cash the dividend landed in), not the holding\'s adjusted start. 1,000 shares $100 → $105, $1,200 paid to cash: ending $106,200, adjusted return 105 ÷ 98.80 − 1 → beginning $100,000.00 and wealth generated $6,200 (dividends $1,200 + change $5,000), the dividend taken off once. The reviewer divided the shares alone by 1.0628. The decision\'s printed 6.28% is that return rounded; used as printed it gives $99,995.63 — a $4.37 rounding in the example, not a second subtraction.',
    check: () => {
      const run = (r: number) => thePerformance({ windowStart: '2025-09-29', windowLabel: 'x', today: '2026-09-28', snapshotDays: [], investmentAccountIds: new Set(['k']),
        transactions: [{ txn_id: 'v', account_id: 'k', ticker: 'ZZ', type: 'DIVIDEND', amount: 1200, date: '2026-06-01' }],
        accounts: [{ asset_id: 'k', label: 'K', kind: 'brokerage', asset_class: 'stocks_etf', balance: 106200, cash_balance: 1200, positions: [{}] }] as any,
        holdings: [{ position: { ticker: 'ZZ' }, marketValue: 105000, periodReturn: r }] } as any);
      const exact = run(105 / 98.8 - 1);
      expect(exact.walk!.beginning).toBeCloseTo(100000, 6);
      expect(exact.walk!.dividends).toBe(1200);
      expect(exact.walk!.wealthGenerated).toBeCloseTo(6200, 6);
      expect(run(0.0628).walk!.beginning).toBeCloseTo(99995.63417388, 4);
    } },
  { n: 47, key: 'DEC-4645', cls: 'AGREES', proof: ['src/screens/__tests__/performance_decisions_2026_10_12.test.tsx', 'src/__tests__/guard_d3_screens_agree.test.tsx'],
    why: 'Held: stocks are set beside SPY and bonds beside AGG through the same adjusted closes; Home\'s gap is worked from the unrounded returns (|you − market| at full precision), so "ahead by 0.85%" can stand beside +3.69% and +2.83%. (The start weights are a separate finding: MK-PF-M-008 T1.)',
    check: () => {
      expect(benchmarkTicker({ asset_class: 'stock_etf' } as any)).toBe('SPY');
      expect(benchmarkTicker({ asset_class: 'bond' } as any)).toBe('AGG');
    } },
  { n: 48, key: 'DEC-4646', cls: 'AGREES', proof: ['src/screens/__tests__/performance_decisions_2026_10_12.test.tsx', 'src/services/sync/snaptrade.test.ts', 'src/services/sync/ingest.test.ts'],
    why: 'Held, rendered: 2 mini contracts at $8 read Current value $160 and Total paid $100 (10 shares a contract); an option with no multiplier stored counts 100.',
    check: () => { expect(contractMultiplier({ kind: 'options', multiplier: 10 } as any)).toBe(10); expect(contractMultiplier({ kind: 'options' } as any)).toBe(100); } },
  { n: 49, key: 'DEC-2748b', cls: 'AGREES', inFlight: true, proof: ['src/screens/__tests__/zero_rate_is_entered.test.ts', 'src/screens/__tests__/nw_editors_figures_match.test.tsx'],
    why: 'Held: a typed 0% is a rate (yield on today\'s value 0%), a rate never typed has no yield. bonds.ts is being changed now — re-run after it lands.',
    check: () => {
      const one = (rate: any) => theBonds({ accounts: [{ asset_id: 'b', label: 'Note', kind: 'bond', balance: 10000, face_value: 10000, maturity_date: '2028-09-30', ...(rate === undefined ? {} : { coupon_rate: rate }) }] as any,
        accountId: 'b', today: new Date('2026-09-28T12:00:00') }).one as any;
      expect(one(0).currentYield).toBe(0);
      expect(one(undefined).currentYield).toBeNull();
    } },
];

export const COULD_NOT_TEST = [
  { id: 'MK-NW-F-104', cls: 'BLOCKED' as Cls,
    why: 'Agreed: no contract says how one ending total is split across accounts, so no case can be written. Read in the code: closedWith (performance.ts) puts the whole ending on the first account and $0 on the rest of the day it adds. Nothing on screen was found reading that day per account; if anything did, the split would be wrong.' },
  { id: 'screen register (all 53 supplied figure IDs)', cls: 'AGREES' as Cls,
    why: 'The limit was real: the reviewer saw no screen. This run rendered the real screens for every one of the 53 figures (src/screens/__tests__/outside_performance_rerun_openai_01_screens.test.tsx), so its PASS and FAIL marks are now checked against what a person sees.' },
];

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('the package, read — a guard must prove it looked', () => {
  test('49 rules and 2 could-not-test items, in the package and here, one for one', () => {
    expect(PART1.rules_held).toHaveLength(49);
    expect(RULES).toHaveLength(PART1.rules_held.length);
    RULES.forEach((r, i) => {
      const theirs = PART1.rules_held[i];
      expect(String(theirs.rule).startsWith(r.key) || String(theirs.rule).includes(r.key)).toBe(true);
    });
    expect(PART1.could_not_test).toHaveLength(2);
    expect(COULD_NOT_TEST.map((c) => c.id)).toEqual(PART1.could_not_test.map((c: any) => c.id));
  });
  test('every proving test named here exists on disk', () => {
    let looked = 0;
    for (const r of RULES) {
      expect(r.proof.length).toBeGreaterThanOrEqual(1);
      for (const f of r.proof) { expect(fs.existsSync(path.join(ROOT, f))).toBe(true); looked += 1; }
    }
    expect(looked).toBeGreaterThanOrEqual(70);
  });
  test('every APP WRONG carries a fix; every row a reason', () => {
    for (const r of RULES) { expect(r.why.length).toBeGreaterThan(40); if (r.cls === 'APP WRONG') expect(r.fix?.length ?? 0).toBeGreaterThan(40); }
  });
});

describe('the rules, checked against the real functions', () => {
  for (const r of RULES) {
    const name = `#${r.n} ${r.key} — ${r.cls}${r.inFlight ? ' (IN-FLIGHT)' : ''}`;
    if (r.check) test(`${name} · what holds`, r.check);
    // what the app gets wrong: the rule's answer is the expectation, so the test fails today (test.failing) and
    // goes red the day the fix lands — then it moves to the plain test above
    if (r.wrong) (r.fixed ? test : test.failing)(`${name} · what the app gets wrong${r.fixed ? ` — FIXED ${r.fixed}` : ''}`, r.wrong);
  }
  test('the count checked against a function (a floor)', () => {
    expect(RULES.filter((x) => x.check || x.wrong).length).toBeGreaterThanOrEqual(13);
    for (const r of RULES.filter((x) => x.cls === 'APP WRONG')) expect(typeof r.wrong).toBe('function');
  });
});

afterAll(() => {
  const out = process.env.OUTSIDE_RESULTS_OUT_RULES;
  if (!out) return;
  fs.writeFileSync(out, JSON.stringify({
    rules_held: RULES.map((r) => ({ n: r.n, rule: PART1.rules_held[r.n - 1].rule, cards: PART1.rules_held[r.n - 1].cards, reviewer_verdict: PART1.rules_held[r.n - 1].verdict,
      reviewer_why: PART1.rules_held[r.n - 1].why, classification: r.cls, in_flight: !!r.inFlight, evidence: r.why, proving_tests: r.proof, fix: r.fix ?? null,
      checked_against_function: !!(r.check || r.wrong) })),
    could_not_test: COULD_NOT_TEST.map((c, i) => ({ ...PART1.could_not_test[i], classification: c.cls, evidence: c.why })),
  }, null, 1));
});
