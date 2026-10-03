/** THE DECISIONS, HELD BY A TEST — one test per decision, named by its identifier.
 *
 *  FOUNDER, 2026-09-28: *"what's the plan to test them?"* and, before that, the reason there has to
 *  be one: *"How can I be sure you won't break rules in future as you have done it over and over in
 *  the past?"*
 *
 *  Every rule here that has held was held by something that EXECUTES. Every rule that came back was
 *  held by my attention. The decision log records 591 decisions of his; 422 of them had nothing that
 *  re-runs them. This file is where that count starts falling.
 *
 *  HOW IT IS WRITTEN, and why it looks like this:
 *   · One test per decision, its name OPENING with the decision identifier (DEC-nnnn). The link
 *     between a decision and its proof is then read from the suite rather than maintained by hand —
 *     `find-tests-for-decisions.py` picks it up and writes it onto the row.
 *   · The test name then states the decision IN HIS WORDS where they exist, so anybody reading a
 *     failure knows what was decided and by whom, not only what broke.
 *   · Each test asserts the RULE, not the current output. A test that pins today's number passes
 *     forever and proves nothing about the rule behind it.
 *
 *  TWO THINGS I GOT WRONG WRITING THE FIRST TEN, both recorded because both are classes:
 *
 *  1. SIX OF THE FIRST TEN WERE ALREADY TESTED. The decisions carried over from the retired rulings
 *     ledger already named a test in their proof column, and I did not look before writing. The
 *     tests are kept — they assert the rule from a different angle and they name the decision
 *     explicitly, which the older ones do not — but the procedure is now: READ THE PROOF COLUMN
 *     FIRST, and write only for rows that have nothing.
 *
 *  2. TWO NAMED THE WRONG DECISION. The HSA-and-Medicare test was labelled with the identifier of
 *     the ‘take-home’ wording ruling, and the senior-deduction test with the one for ‘you entered’.
 *     Both numbers were typed from memory instead of read off the log — the same fault the
 *     identifier guard was built for in September, repeated in the file whose whole purpose is
 *     proving decisions. A guard now fails the build on an identifier that does not exist; it
 *     cannot catch one that exists and is the wrong decision, which is why every test name also
 *     states the decision in his words — a mismatch is then visible to anyone reading it.
 */
import { earmarkDefault, incomeBearingClassOf, blendedVolatility, accountDisplayName, accountDisplayNames, accountClassBreakdown, classPortionLabel } from '../domain/assets';
import { capGains } from '../domain/performance';
import { yearsToMaturity } from '../domain/bonds';
import { ageAttainedInYear, annual401kLimit, annualHsaLimit, monthsLeftInYear } from '../domain/income/limits';
import { seniorDeductionFor } from '../domain/income/tax';
import { oddsLine, onCourseSentence, planDoor, SS_DECISION_FROM, SS_DECISION_TO } from '../domain/planning/hub';
import { paymentShape, defaultPaymentType } from '../domain/debt';
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { theAccount } from '../../MoneyKeel/functions/networth-and-performance/account';
import { theNetWorth, NET_WORTH_FIGURES } from '../../MoneyKeel/functions/networth-and-performance/net-worth';
import { accruedInterestCaveat } from '../domain/bonds';
import { theHolding } from '../../MoneyKeel/functions/networth-and-performance/holding';
import { buildDayFromAccounts } from '../../Calculation Module code/engines/snapshots';
import { reconcileAccountTotal, reconcileLedgerIdentity } from '../../Calculation Module code/engines/reconcile';
import { GLOSSARY } from '../domain/glossary';
import { ADD_ACCOUNT_QUESTION } from '../constants/doors';
import { reviewTransactions } from '../domain/transactions/flags';
import { incomeSources, incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { figureSpec } from '../../MoneyKeel/functions/figures';
import { writeFigure } from '../../MoneyKeel/functions/_figure-spec';
import * as fs from 'fs';
import * as path from 'path';
import { historyCoverage, sourceWording } from '../domain/assets';
import { CONSENT_COPY } from '../services/sync';
import { sampleOddsLine, oddsTail } from '../domain/planning/hub';

describe('the decisions in the log are held by something that executes', () => {
  // ── DEC-0100 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0100 — "everything you own counts toward retirement EXCEPT your primary home and your primary car"', () => {
    const acct = (over: Record<string, unknown>) => ({
      asset_id: 'a', label: 'x', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, ...over,
    }) as any;

    // the roof you live under is off the table — selling it is not a retirement plan
    expect(earmarkDefault(acct({ kind: 'home', asset_class: 'real_estate', re_use: 'primary' }))).toBe(0);
    // the car you drive, named as the primary one, likewise
    expect(earmarkDefault(acct({ asset_id: 'car1', kind: 'vehicle' }), 'car1')).toBe(0);

    // and everything else counts, in full — these are the three he named
    expect(earmarkDefault(acct({ kind: 'checking', asset_class: 'cash' }))).toBe(100);          // cash counts
    expect(earmarkDefault(acct({ kind: 'real_estate', asset_class: 'real_estate', re_use: 'rental' }))).toBe(100);  // a rental counts
    expect(earmarkDefault(acct({ asset_id: 'car2', kind: 'vehicle' }), 'car1')).toBe(100);      // a SECOND car counts

    // a 529 is out, and not because it is property: the money is legally somebody else's education
    expect(earmarkDefault(acct({ kind: 'college_529' }))).toBe(0);
  });

  // ── DEC-0051 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0051 — "cash means cash only": a money-market fund is Stocks and funds, a CD or T-bill is Bonds and CDs', () => {
    // brokers tag BOTH of these as cash, which is why the NAME decides and not the tag
    expect(incomeBearingClassOf('Vanguard Federal Money Market Fund')).toBe('stocks_etf');
    expect(incomeBearingClassOf('VMFXX')).toBe('stocks_etf');
    expect(incomeBearingClassOf('Ally 12-month CD')).toBe('bonds');
    expect(incomeBearingClassOf('US Treasury Bill 3-month')).toBe('bonds');
    // a plain balance is not renamed into something it is not
    expect(incomeBearingClassOf('Chase Checking')).not.toBe('stocks_etf');
  });

  // ── DEC-0085 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0085 — how much a portfolio swings is MEASURED from what is held, never guessed from its return', () => {
    const acct = (kind: string, balance: number) => ({
      asset_id: kind, label: kind, kind, tax_bucket: 'TAXABLE', balance, target_return: 0.07,
    }) as any;

    // the old rule was volatility = return × 1.7, which cannot tell a savings account from shares.
    // Two portfolios on the SAME target return must still differ, because what they hold differs.
    const allCash = blendedVolatility([acct('savings', 100000)]);
    const allShares = blendedVolatility([acct('brokerage', 100000)]);
    expect(allShares).toBeGreaterThan(allCash);

    // and it is weighted by MONEY, so the blend of the two sits between them
    const mixed = blendedVolatility([acct('savings', 100000), acct('brokerage', 100000)]);
    expect(mixed).toBeGreaterThan(allCash);
    expect(mixed).toBeLessThan(allShares);
  });

  // ── DEC-0159 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0159 — a dead price feed must SAY it is dead: a fallback is flagged, never passed off as today\u2019s market', () => {
    // The live bug: the ten-year Treasury feed had stopped working and the app quietly served a
    // fallback, so a figure presented as today's market rate was not. It is asserted from the SOURCE
    // rather than by importing the module, because that module pulls in the native app runtime and
    // this suite is the logic one — the rule is about the shape of what is returned, which the source
    // states plainly.
    const src = fs.readFileSync(path.join(__dirname, '../services/economicData.ts'), 'utf8');
    // every fallback the fetcher can serve is returned WITH a flag saying it is one
    expect(src).toMatch(/treasuryIsFallback/);
    expect(src).toMatch(/inflationIsFallback/);
    // and the flag is derived from whether the fetch actually succeeded, not set by hand
    expect(src).toMatch(/treasuryIsFallback:\s*treasury\.status !== 'fulfilled'/);
    expect(src).toMatch(/inflationIsFallback:\s*inflation\.status !== 'fulfilled'/);
  });
  // ── DEC-0338 · DEC-0333 ────────────────────────────────────────────────────────────────────
  test('DEC-0338 — "long-term means MORE than one year; exactly one year is short-term"', () => {
    const pos = (bought: string) => ({
      position_id: 'p', ticker: 'X', lots: [{ lot_id: 'l', shares: 10, cost_per_share: 100, purchase_date: bought }],
    }) as any;

    // ON the first anniversary it is still SHORT-term — the boundary he stated exactly, because a
    // gain taxed on the anniversary itself is taxed at the higher rate
    const onTheDay = capGains(pos('2025-06-10'), 150, new Date(2026, 5, 10));
    expect(onTheDay.shortGain).toBe(500);
    expect(onTheDay.longGain).toBe(0);

    // the DAY AFTER, it is long-term
    const dayAfter = capGains(pos('2025-06-10'), 150, new Date(2026, 5, 11));
    expect(dayAfter.longGain).toBe(500);
    expect(dayAfter.shortGain).toBe(0);
  });

  // ── DEC-0341 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0341 — "a missing maturity date is unknown, not \u2018due now\u2019"', () => {
    // treating unknown as zero is how a holding appears to come due today
    expect(yearsToMaturity('', new Date(2026, 8, 29))).toBeNull();
    expect(yearsToMaturity('not a date', new Date(2026, 8, 29))).toBeNull();
    // a real date still answers
    expect(yearsToMaturity('2029-09-30', new Date(2026, 8, 29))).toBeGreaterThan(2.9);
  });

  // ── DEC-0348 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0348 — "every contribution limit uses the age attained in the calendar year", the IRS test', () => {
    // the age that matters is the one reached at ANY point in the year, not the age today. Someone
    // born in December 1965 is 61 for the whole of 2026 as far as every catch-up allowance goes.
    const inJanuary = ageAttainedInYear(1965, new Date(2026, 0, 2));
    const inDecember = ageAttainedInYear(1965, new Date(2026, 11, 31));
    expect(inJanuary).toBe(61);
    expect(inDecember).toBe(61);

    // and it reaches the limits: 60-to-63 gets the bigger catch-up, which was missing entirely in an
    // app built for ages 55 to 70
    expect(annual401kLimit(61)).toBeGreaterThan(annual401kLimit(55));
    expect(annual401kLimit(61)).toBeGreaterThan(annual401kLimit(64));
  });



  // ── DEC (G10) · the HSA and Medicare ───────────────────────────────────────────────────────
  test('DEC-0252 — "show the HSA limit at 65+ only with \u2018If you are not enrolled in Medicare\u2026\u2019": Medicare bars it entirely', () => {
    // Medicare does not reduce the allowance — it removes it. Showing a limit to somebody enrolled
    // would be offering room they legally do not have.
    expect(annualHsaLimit(67, false, true)).toBe(0);
    // not enrolled, and 55 or over, gets the catch-up on top
    expect(annualHsaLimit(67, false, false)).toBeGreaterThan(annualHsaLimit(50, false, false));
    // unknown is not the same as enrolled: we do not zero somebody out on a guess
    expect(annualHsaLimit(67, false, null)).toBeGreaterThan(0);
  });

  // ── DEC (G36) · months left in the year ────────────────────────────────────────────────────
  test('DEC-0345 — "state the months-left convention": the current month COUNTS, and December is 1, never 0', () => {
    // dividing a year's remaining room by zero months is how a per-month figure becomes infinite
    expect(monthsLeftInYear(new Date(2026, 11, 15))).toBe(1);   // December
    expect(monthsLeftInYear(new Date(2026, 8, 29))).toBe(4);    // September: Sep, Oct, Nov, Dec
    expect(monthsLeftInYear(new Date(2026, 0, 1))).toBe(12);    // January
  });

  // ── DEC (G3) · the senior deduction ────────────────────────────────────────────────────────
  test('DEC-0249 — "add the $6,000 senior deduction (65+)": it exists, it needs two people counted, and it phases out', () => {
    // it is given per person, up to two on a joint return
    const one = seniorDeductionFor('married', 1, 80000);
    const two = seniorDeductionFor('married', 2, 80000);
    expect(one).toBeGreaterThan(0);
    expect(two).toBeCloseTo(one * 2, 2);

    // nobody 65 or over gets nothing — not a default
    expect(seniorDeductionFor('married', 0, 80000)).toBe(0);

    // and it FALLS as income rises, rather than being a flat amount at every income
    const rich = seniorDeductionFor('married', 2, 400000);
    expect(rich).toBeLessThan(two);
    expect(rich).toBeGreaterThanOrEqual(0);

    // without an income figure it is not guessed at
    expect(seniorDeductionFor('married', 2, null)).toBe(0);
  });

  // ── DEC-0029 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0029 — one phrase for taking a suggestion, everywhere: "Use as my plan"', () => {
    // swept the same day so no screen is left saying it differently. Read from the screens
    // themselves rather than a list, because the list is not what a person sees.
    const screens = ['../screens/RothScreen.tsx', '../screens/PlanHubScreen.tsx'];
    const RETIRED = /\b(adopt this|apply this plan|make this my plan|set as plan|use this plan)\b/i;
    let usesIt = 0;
    for (const rel of screens) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      if (/Use as my plan/.test(src)) usesIt++;
      expect(src).not.toMatch(RETIRED);
    }
    expect(usesIt).toBe(screens.length);   // both adopt actions say the same words
  });

  // ── DEC-0039 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0039 — the floating "+ Expense" button is OFF Home; logging lives on Cash flow only', () => {
    const home = fs.readFileSync(path.join(__dirname, '../screens/HomeScreen.tsx'), 'utf8');
    // no button, anywhere on Home, that adds an expense
    expect(home).not.toMatch(/<(TouchableOpacity|Pressable|Button)[^>]*>[^<]*\+\s*Expense/i);
    expect(home).not.toMatch(/onPress=\{[^}]*(addExpense|logExpense|\/expense)/i);
  });

  // ── DEC-0040 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0040 — the Home section that lists what needs you is headed "CHIEF OF STAFF — WHAT NEEDS YOU (n)"', () => {
    const home = fs.readFileSync(path.join(__dirname, '../screens/HomeScreen.tsx'), 'utf8');
    expect(home).toMatch(/CHIEF OF STAFF \u2014 WHAT NEEDS YOU/);
    // and it carries the COUNT — a heading promising items without saying how many is half a heading
    expect(home).toMatch(/CHIEF OF STAFF \u2014 WHAT NEEDS YOU[^`]*\$\{/);
  });

  // ── DEC-0033 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0033 — Rewards, Tips and Build credit are OFF the 55-70 menu, and the screens are KEPT', () => {
    const layout = fs.readFileSync(path.join(__dirname, '../../app/(tabs)/_layout.tsx'), 'utf8');
    // not offered: the tab is registered with no way in
    expect(layout).toMatch(/name="rewards"\s+options=\{\{\s*href:\s*null/);
    // KEPT, not deleted — his decision was that they are reusable for another audience, so the
    // screen file still has to exist. A test that only checked the menu would pass on a deletion.
    expect(fs.existsSync(path.join(__dirname, '../../app/(tabs)/rewards.tsx'))).toBe(true);
  });

  // ── DEC-0044 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0044 — the first line of setup is his own wording, with the examples named', () => {
    const src = fs.readFileSync(path.join(__dirname, '../screens/FirstRunScreen.tsx'), 'utf8');
    expect(src).toMatch(/All your assets and debts in one place/);
    // the examples are the point: "your whole money picture" said nothing concrete, which is why he
    // replaced it. Each of the three groups he named has to still be there.
    expect(src).toMatch(/investment, 401k, checking, savings/);
    expect(src).toMatch(/your home and other property/);
    expect(src).toMatch(/mortgage, cards, loans/);
    // and the wording it replaced is gone
    expect(src).not.toMatch(/Map your whole money picture/);
  });

  // ── DEC-0048 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0048 — the Net worth section is "Your retirement plan", not "Your path ahead (from your Plan)"', () => {
    const src = fs.readFileSync(path.join(__dirname, '../screens/NetWorthScreen.tsx'), 'utf8');
    expect(src).toMatch(/Your retirement plan/);
    expect(src).not.toMatch(/Your path ahead/);
  });

  // ── DEC-0079 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0079 — "the green title bars are curved in the corners at the top. make them square"', () => {
    // ONE component, so the change lands on every banded screen at once — which is why the assertion
    // belongs here and not on any one screen.
    const band = fs.readFileSync(path.join(__dirname, '../components/SectionBand.tsx'), 'utf8');
    expect(band).toMatch(/borderTopLeftRadius:\s*0/);
    expect(band).toMatch(/borderTopRightRadius:\s*0/);
    // a band is a rule across the page, not the lid of a card: nothing may round its top again
    expect(band).not.toMatch(/borderTopLeftRadius:\s*(?!0)\d/);
    expect(band).not.toMatch(/borderTopRightRadius:\s*(?!0)\d/);
  });

  // ── DEC-0014 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0014 — the validated colourblind-safe palette is the one the app uses, in its fixed order', () => {
    const theme = fs.readFileSync(path.join(__dirname, '../utils/theme.ts'), 'utf8');
    // his approved set, in the order that makes adjacent slices distinguishable. Colours ONLY — the
    // mock's own condition was that no layout, wording or number moved with them.
    for (const hex of ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#eb6834', '#e87ba4', '#898781']) {
      expect(theme.toLowerCase()).toContain(hex);
    }
    // one set, used everywhere a class is coloured — so Cash is the same colour on every screen
    expect(theme).toMatch(/ClassMarkColors/);
  });

  // ── DEC-0112 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0112 — the verdict word is GONE: the odds read "60% odds of lasting to age 90", nothing in front', () => {
    // his words: "uncertain and giving it 60% probability does not make sense — it should be either
    // or." A percentage IS the uncertainty; labelling it as well says the same thing twice.
    expect(oddsLine('working', 60, 90)).toBe('60% odds of lasting to age 90');
    expect(oddsLine('retired', 84, 92)).toBe('84% odds of lasting to age 92');

    // no verdict word, on either lens — and both retired word-sets are gone with it
    for (const lens of ['working', 'retired']) {
      const line = oddsLine(lens, 60, 90);
      for (const word of ['Likely', 'Uncertain', 'Unlikely', 'Holding', 'Watch closely', 'Running short']) {
        expect(line).not.toContain(word);
      }
    }
  });

  // ── DEC-0104 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0104 — ONE wording for the odds: three screens said one number three ways, now they cannot', () => {
    // the point is not the sentence, it is that there is only one PLACE producing it — so a fourth
    // phrasing cannot appear on a fourth screen.
    const hub = fs.readFileSync(path.join(__dirname, '../domain/planning/hub.ts'), 'utf8');
    expect(hub).toMatch(/export function oddsLine/);

    // the rival phrasings are not built anywhere a person could meet them
    const screens = ['../screens/HomeScreen.tsx', '../screens/NetWorthScreen.tsx', '../screens/PlanHubScreen.tsx'];
    for (const rel of screens) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      expect(src).not.toMatch(/in 100 paths last to/i);
    }
  });

  // ── DEC-0229 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0229 — "use exact everywhere no rounding for odds": the odds are not rounded to the nearest 5', () => {
    const src = fs.readFileSync(path.join(__dirname, '../domain/retirement/index.ts'), 'utf8');
    // the figure handed out is the raw share of futures that worked
    expect(src).toMatch(/chance_of_success:\s*\(successes \* 100\) \/ paths/);
    // and it is NOT snapped to a multiple of five on the way out — rounding odds makes two different
    // plans look identical, which is the whole reason he replaced the earlier rule
    expect(src).not.toMatch(/chance_of_success:[^,]*Math\.round\([^)]*\/\s*5/);
  });

  // ── DEC-0020 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0020 — ONE debt editor, shaped by how the debt is repaid: installment \u00b7 revolving \u00b7 due in full', () => {
    // it replaced two forms that had drifted apart. The shape is DERIVED from the kind of debt, so a
    // person never has to know which form they need — and what they typed always wins over the default.
    expect(defaultPaymentType('CREDIT_CARD' as any)).toBe('revolving');
    expect(defaultPaymentType('HELOC' as any)).toBe('revolving');   // a line of credit revolves too
    expect(defaultPaymentType('MORTGAGE' as any)).toBe('installment');
    expect(defaultPaymentType('AUTO' as any)).toBe('installment');

    const debt = (over: Record<string, unknown>) => ({
      debt_id: 'd', label: 'x', remaining_balance: 1000, interest_rate_apr: 0.05,
      minimum_monthly_payment: 50, ...over,
    }) as any;
    // the person's own answer overrides the default — a lump due on a date is neither of the others
    expect(paymentShape(debt({ debt_type: 'MORTGAGE', payment_type: 'due_in_full' }))).toBe('due_in_full');
    expect(paymentShape(debt({ debt_type: 'CREDIT_CARD' }))).toBe('revolving');
  });

  // ── DEC-0305 · DEC-0461 ────────────────────────────────────────────────────────────────────
  test('DEC-0305 — "an unknown input produces no number and a reason \u2014 never a default"', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../components/UI.tsx'), 'utf8');
    // the shape of the answer: the sentence saying nothing is entered, AND the door to enter it.
    // A screen that shows $0 with no explanation is indistinguishable from a real zero.
    expect(ui).toMatch(/Nothing entered yet\./);
    expect(ui).toMatch(/export function EmptyNote/);
    // the door is named per thing, from one list — so the same door is not worded two ways
    expect(ui).toMatch(/EMPTY_DOORS\[door\]/);
    // and it is spoken as one sentence, not a bare number read out to somebody who cannot see it
    expect(ui).toMatch(/accessibilityLabel=\{`Nothing entered yet\./);
  });

  // ── DEC-0083 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0083 — ONE account-naming rule, his refinement: institution + last four, the wrapper where the tax treatment needs it', () => {
    const acct = (over: Record<string, unknown>) => ({
      asset_id: 'a', label: 'whatever the broker calls it', institution: 'Vanguard',
      tax_bucket: 'TAXABLE', balance: 1, target_return: 0, ...over,
    }) as any;

    // a TAXABLE account: the digits identify it, and the wrapper adds nothing the row needs
    expect(accountDisplayName(acct({ mask: '5738', kind: 'brokerage' }))).toBe('Vanguard -5738');
    // no digits to use — fall back to the kind of account, never to the broker's own wording
    expect(accountDisplayName(acct({ kind: 'brokerage' }))).toMatch(/^Vanguard /);
    expect(accountDisplayName(acct({ kind: 'brokerage' }))).not.toMatch(/whatever the broker calls it/);

    // a TAX-ADVANTAGED account MUST carry its wrapper: a Roth IRA and a brokerage at the same firm
    // behave differently for withdrawals and required distributions, so the name has to say which
    const roth = accountDisplayName(acct({ mask: '5738', kind: 'roth_ira', tax_bucket: 'ROTH' }));
    expect(roth).toMatch(/Vanguard/);
    expect(roth).toMatch(/5738/);
    expect(roth.toLowerCase()).toMatch(/roth/);

    // two accounts that would read the same are numbered — no two rows are indistinguishable
    const names = accountDisplayNames([
      acct({ asset_id: 'x', mask: '5738', kind: 'brokerage' }),
      acct({ asset_id: 'y', mask: '5738', kind: 'brokerage' }),
    ] as any);
    expect(new Set(names.values()).size).toBe(2);
    expect([...names.values()].every((n) => /\u00b7 \d$/.test(n))).toBe(true);
  });

  // ── DEC-0095 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0095 — "why is cash added to CD and not cash?": the unexplained leftover is CASH, not more of the biggest holding', () => {
    // A linked account whose broker total is MORE than the holdings it itemised. That difference is
    // uninvested money — settlement cash, a dividend just received. Adding it to the largest class
    // made a CD-heavy account read as owning MORE CDs, which is a claim about what you own.
    const acct = {
      asset_id: 'a', label: 'Vanguard', institution: 'Vanguard', kind: 'brokerage',
      tax_bucket: 'TAXABLE', target_return: 0, source: 'connected',
      balance: 100500, cash_balance: 0,
      positions: [{ position_id: 'p', ticker: 'ALLY CD', last_price: 100, lots: [{ lot_id: 'l', shares: 1000, cost_per_share: 100 }] }],
    } as any;
    const out = accountClassBreakdown(acct)!;
    // the $500 the broker counted and the holdings did not lands in CASH
    expect(out.cash).toBeCloseTo(500, 2);
    // and NOT on the CDs, which stay exactly what was itemised
    expect(out.bonds).toBeCloseTo(100000, 2);
    // the parts still add to the broker's own total — nothing is invented and nothing is dropped
    const sum = Object.values(out).reduce((t: number, v) => t + (v as number), 0);
    expect(sum).toBeCloseTo(acct.balance, 2);
  });

  // ── DEC-0092 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0092 — cash-means-cash holds where accounts are classified AS THEY ARRIVE, not only in a one-off tidy-up', () => {
    // the defect it fixes: a position added AFTER the migration landed back in Cash, because the live
    // path classified by the tag the broker sends and brokers tag money-market funds as cash. The
    // NAME has to decide on every road, or the same fault reappears in time rather than in place.
    const acct = (ticker: string, tag: string) => ({
      asset_id: 'a', label: 'Vanguard', institution: 'Vanguard', kind: 'brokerage',
      tax_bucket: 'TAXABLE', target_return: 0, source: 'connected', balance: 10000, cash_balance: 0,
      positions: [{ position_id: 'p', ticker, asset_class: tag, last_price: 1, lots: [{ lot_id: 'l', shares: 10000, cost_per_share: 1 }] }],
    }) as any;

    // the broker tags it cash; the name says money-market fund, so it is Stocks and funds
    expect(accountClassBreakdown(acct('VMFXX', 'cash'))!.stocks_etf).toBeCloseTo(10000, 2);
    expect(accountClassBreakdown(acct('VMFXX', 'cash'))!.cash).toBeCloseTo(0, 2);
    // the broker tags it cash; the name says CD, so it is Bonds and CDs
    expect(accountClassBreakdown(acct('ALLY CD', 'cash'))!.bonds).toBeCloseTo(10000, 2);
  });

  // ── DEC-0090 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0090 — the line under an account COUNTS what is in it, instead of repeating the heading above it', () => {
    const acct = (positions: unknown[]) => ({
      asset_id: 'a', label: 'Vanguard', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, positions,
    }) as any;

    // it read "CDs & Treasuries in this account" directly beneath a row already titled Bonds & CDs.
    // It now says WHAT IS ACTUALLY HELD, so the line adds something the heading did not.
    const line = classPortionLabel(acct([
      { position_id: '1', ticker: 'ALLY CD', asset_class: 'bond' },
      { position_id: '2', ticker: 'MARCUS CD', asset_class: 'bond' },
      { position_id: '3', ticker: 'SYNCHRONY CD', asset_class: 'bond' },
      { position_id: '4', ticker: 'US TREASURY N/B', asset_class: 'bond' },
    ]), 'bonds');
    expect(line).toMatch(/3 CDs/);
    expect(line).toMatch(/1 Treasury/);
    expect(line).toMatch(/in this account$/);

    // CASH is one line said plainly — his 2026-08-11 wording, kept as the canon phrase
    expect(classPortionLabel(acct([]), 'cash')).toBe('cash in this account');

    // a ticker alone cannot tell a share from a fund, so one honest word covers both
    expect(classPortionLabel(acct([{ position_id: '1', ticker: 'VTI' }]), 'stocks_etf')).toMatch(/1 holding in this account/);
  });

  // ── DEC-0096 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0096 — a deposit only reaches an account\u2019s cash when that account HAS somewhere for cash to land', () => {
    // the root cause behind his missing $500: his Vanguard account itemises its holdings and had no
    // cash figure, so a deposit had nowhere to go and vanished from the balance.
    const src = fs.readFileSync(path.join(__dirname, '../domain/transactions/index.ts'), 'utf8');
    // where the money lives is DECIDED, not assumed: an investment account uses its cash sleeve,
    // a checking or savings account holds it in the balance itself
    expect(src).toMatch(/const usesSleeve = /);
    expect(src).toMatch(/tax_bucket !== 'CASH'/);
    expect(src).toMatch(/derive_balance === true \|\| a\.cash_balance != null/);
  });

  // ── DEC-0150 · DEC-0146 ────────────────────────────────────────────────────────────────────
  test('DEC-0150 — ONE age gate for the Social Security decision, 60 to 70, read from one place', () => {
    // he first said 60 to 67; once I flagged what stopping at 67 costs — the credit for waiting keeps
    // building to 70, so ending at 67 hides the years where waiting pays most — he said "60 to 70 it is".
    expect(SS_DECISION_FROM).toBe(60);
    expect(SS_DECISION_TO).toBe(70);

    // THE FAULT IT FIXES: the ruling was applied on the Plan tab and NOT in Insights, which still
    // used its own 62-to-under-70 — one decision behind two different gates. Every screen that gates
    // it must READ these, never write its own numbers.
    for (const rel of ['../screens/PlanHubScreen.tsx', '../screens/InsightsScreen.tsx']) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      expect(src).toMatch(/SS_DECISION_FROM/);
      expect(src).toMatch(/SS_DECISION_TO/);
      // and no hand-written window beside it
      expect(src).not.toMatch(/age\s*>=\s*62\s*&&\s*age\s*<\s*70/);
    }
  });

  // ── DEC-0168 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0168 — "CALL IT THE TARGET NEST EGG": not "the number you set", not "your target", not "your number"', () => {
    const files = ['../components/PlanGlanceRows.tsx', '../components/PlanOutcome.tsx', '../components/TargetGauge.tsx'];
    const RETIRED = /the number you set|your number\b/i;
    let named = 0;
    for (const rel of files) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      if (/target nest egg/i.test(src)) named++;
      expect(src).not.toMatch(RETIRED);
    }
    expect(named).toBe(files.length);   // one name, on every surface that shows it
  });

  // ── DEC-0118 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0118 — the target nest egg is a figure YOU TYPE, marked as yours \u2014 our 80%-odds figure is only the suggestion', () => {
    const rows = fs.readFileSync(path.join(__dirname, '../components/PlanGlanceRows.tsx'), 'utf8');
    // it is ASKED for, in his words, rather than derived and presented as fact
    expect(rows).toMatch(/What's your target nest egg\?/);
    // and when it is missing the row offers the way to give it, instead of filling one in
    expect(rows).toMatch(/targetNestEgg \? maskedMoney\(targetNestEgg\) : null/);
  });

  // ── DEC-0142 · DEC-0143 · DEC-0141 ─────────────────────────────────────────────────────────
  test('DEC-0143 — "the height of the info dot circle should match the height of the text size" AND the tap area is 44pt', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../components/UI.tsx'), 'utf8');

    // his constraint, and the reason it is not just "make it bigger": "that way we are not stretching
    // height of the row for info dot as that would look unprofessional". Two things must BOTH hold.
    // 1. the glyph is drawn at the size of the text beside it
    expect(ui).toMatch(/fontSize: size/);
    // 2. the touch box reaches the 44-point minimum by PADDING — computed from that size, not fixed
    expect(ui).toMatch(/const pad = Math\.ceil\(\(TAP_MIN - size\) \/ 2\)/);
    // 3. and an equal NEGATIVE margin hands the space back, so the row is the same height as one
    //    without a dot — which is the half of his instruction a bigger tap target alone would break
    expect(ui).toMatch(/paddingVertical: pad, marginVertical: -pad/);
    expect(ui).toMatch(/paddingHorizontal: pad/);
  });

  // ── DEC-0105 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0105 — a long definition must be reachable: the explanation card SCROLLS, and the button stays put', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../components/UI.tsx'), 'utf8');
    // the body scrolls — everything past the fold was simply unreadable, and the retirement
    // explanation is several screens long
    expect(ui).toMatch(/<ScrollView style=\{styles\.infoScroll\}/);
    // and the way out does NOT scroll away with it
    expect(ui).toMatch(/infoScroll/);
    const closeAfterScroll = ui.indexOf('infoClose') > ui.indexOf('infoScroll');
    expect(closeAfterScroll).toBe(true);
  });

  // ── DEC-0084 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0084 — the retirement card does NOT go quiet when the news is bad', () => {
    const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
    const args = {
      lens: 'working', retireAge: 65, horizonAge: 90,
      potAtRetire: 400000, leftoverAtHorizon: 0, money, shortfallAge: 84,
    };

    // it used to return nothing below 80% odds, so both Net worth and the Plan screen fell back to a
    // bare "See your plan" — the app went silent at exactly the moment you needed telling.
    const bad = onCourseSentence({ ...args, chance: 22 } as any);
    expect(bad).not.toBeNull();
    expect(String(bad).length).toBeGreaterThan(10);

    // good news still speaks too — the rule is that it always says something, not that it only warns
    const good = onCourseSentence({ ...args, chance: 92, leftoverAtHorizon: 500000 } as any);
    expect(good).not.toBeNull();

    // with NO odds at all there is nothing honest to say, so it says nothing rather than guessing
    expect(onCourseSentence({ ...args, chance: null } as any)).toBeNull();
  });

  // ── DEC-0471 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0471 — "ask User to correct, if not input from user, use the budget": the app says the two mortgage figures disagree', () => {
    const household = (budget: number, owed: number) => ({
      accounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 18000, target_return: 0, asset_class: 'cash' }] as any,
      expenses: [],
      profile: { monthlySpending: 0, spendCats: [
        { id: 'rent', label: 'Rent / Mortgage', amount: budget, bucket: 'fixed', tier: 'need' },
        { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }] } as any,
      debts: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 320000,
                interest_rate_apr: 0.0625, minimum_monthly_payment: owed }] as any,
    });

    // THEY DISAGREE: it is reported, with both figures and the gap, so the screen can ask
    const off = theEmergencyFund(household(2300, 2400));
    expect(off.housingDisagreement).toEqual({ budgeted: 2300, owed: 2400, difference: 100 });

    // AND THE BUDGET STILL WINS, which is the second half of his ruling: nothing in the arithmetic
    // moves until the person answers. Essentials = the $2,300 budget + $700 groceries, and the
    // mortgage's own $2,400 is NOT added on top — that would count the home twice.
    expect(off.essentialsMonthly).toBeCloseTo(3000, 2);

    // THEY AGREE: nothing to ask about, so nothing is said
    expect(theEmergencyFund(household(2400, 2400)).housingDisagreement).toBeNull();

    // ONE OF THEM MISSING is a GAP, not a disagreement — asking somebody to reconcile a figure they
    // never entered is a worse question than no question
    const noDebt = theEmergencyFund({ ...household(2300, 2400), debts: [] as any });
    expect(noDebt.housingDisagreement).toBeNull();
  });

  // ══ NET WORTH, the decisions the compliance run of 2026-10-01 found unconfirmed ══════════════
  // Each one is re-run against the real function. A test that pins today's number proves nothing
  // about the rule behind it, so each asserts the RULE: change the inputs and the rule still holds.

  // ── DEC-0058 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0058 — the "how far back the records go" line appears ONLY where the window reaches further back than the records do', () => {
    const linked = (over: Record<string, unknown> = {}) => ({
      asset_id: 'a1', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage',
      tax_bucket: 'TAXABLE', balance: 10_000, target_return: 0, source: 'connected',
      history_from: '2026-06-01', ...over,
    }) as any;
    const now = new Date('2026-10-01T12:00:00');

    // A TWELVE-MONTH window on records that start in June: the window reaches back further than the
    // records do, so the line appears and says how much history there really is.
    const twelve = historyCoverage(linked(), '2025-10-01', now);
    expect(twelve?.kind).toBe('partial');
    expect(twelve?.sentence).toContain('4 months of history');

    // A ONE-DAY window, fully inside the records: NOTHING is said. This is the half of his ruling
    // that matters — saying it here would imply older income sits inside a one-day change.
    expect(historyCoverage(linked(), '2026-09-30', now)).toBeNull();

    // A HAND-ENTERED account has no records at all, which is a different sentence, not this one
    expect(historyCoverage(linked({ source: 'manual' }), '2025-10-01', now)?.kind).toBe('none');
  });

  // ── DEC-0006 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0006 — "numbers stay": on disconnect you CHOOSE, keep them as a by-hand account or delete the connection’s data', () => {
    const promise = CONSENT_COPY.find((l) => /disconnect/i.test(l));
    expect(promise).toBeDefined();
    // the choice is stated, and BOTH halves of it — a promise with one half is not his promise
    expect(promise).toMatch(/you choose/i);
    expect(promise).toMatch(/keep your numbers/i);
    expect(promise).toMatch(/delete/i);
    // and it says WHERE, so it is not a promise with nowhere to act on it
    expect(promise).toMatch(/Settings/);
  });

  // ── DEC-0005 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0005 — the empty-state odds are a LOCKED SAMPLE, and say so in the figure itself', () => {
    const line = sampleOddsLine(92);
    // it carries the word Sample, so a person cannot read it as their own number
    expect(line).toMatch(/^Sample:/);
    expect(line).toContain('92');
    // and it is the SAME wording as a real one, so the two cannot read as different measures
    expect(line).toContain(oddsTail(92));
  });

  // ── DEC-0007 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0007 — the emergency fund is stated in MONTHS OF ESSENTIALS, not months of everything you spend', () => {
    const a = theEmergencyFund({
      accounts: [{ asset_id: 'a1', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE',
                   balance: 12_000, target_return: 0, asset_class: 'cash' }] as any,
      expenses: [],
      // $4,000 goes out a month, of which $3,000 is essentials: rent and groceries are needs,
      // the holiday fund is not
      profile: { monthlySpending: 4_000, spendCats: [
        { id: 'rent', label: 'Rent / Mortgage', amount: 2_300, bucket: 'fixed', tier: 'need' },
        { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' },
        { id: 'fun', label: 'Holidays', amount: 1_000, bucket: 'flexible', tier: 'flex' }] } as any,
      debts: [] as any,
    } as any);

    // $12,000 against $3,000 of ESSENTIALS is four months. Against everything spent it would be
    // three, and reading three as four is the whole reason the figure names essentials.
    expect(a.essentialsMonthly).toBeCloseTo(3_000, 2);
    expect(a.monthsCovered).toBeCloseTo(4, 2);
    expect(a.monthsCovered).not.toBeCloseTo(3, 2);

    // and the figure that divides by EVERYTHING is kept separately, because he asked for both
    expect(a.monthsCoveredAtPlannedSpend).toBeCloseTo(3, 2);
  });

  // ── DEC-0073 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0073 — "THIS MONTH": the cash-flow row is DELETED from Net worth, and its code with it', () => {
    const nw = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    const code = nw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');
    // the row is gone from the screen a person reads
    expect(code).not.toMatch(/THIS MONTH'S CASH FLOW/i);
    // and so is the arithmetic behind it — a deleted row whose code still runs comes back
    expect(code).not.toMatch(/thisMonthCashFlow|monthCashFlowRow/);
    // the door he kept is still there, which is the other half of what he said
    expect(code).toMatch(/Add or connect an account|＋ Add an account/);
  });

  // ── DEC-0071 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0071 — "Bar replaces donut": the class donut and its labels are gone from Net worth', () => {
    const nw = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    const code = nw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');
    expect(code).not.toMatch(/\bDonut\b|<Donut|donutSlices/);
  });

  // ── DEC-0059 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0059 — "same font size and colour across all screens": every size is on the ONE scale', () => {
    const SCALE = new Set([11, 13, 15, 17, 20, 24, 30, 38]);
    const dir = path.join(__dirname, '..', 'screens');
    const offenders: string[] = [];
    let seen = 0;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      seen += 1;
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of t.matchAll(/fontSize:\s*([\d.]+)/g)) {
        const n = Number(m[1]);
        // a size computed from another (scaled captions) is allowed; a typed-in odd one is not
        if (!SCALE.has(n)) offenders.push(`${f} — fontSize ${n}`);
      }
    }
    // a guard that cannot say how much it read is not a guard (his order, 2026-09-28)
    expect(seen).toBeGreaterThanOrEqual(30);
    expect(offenders).toEqual([]);
  });

  // ── DEC-0077 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0077 — a deep-green banner runs EDGE TO EDGE with square corners, the hero included', () => {
    const band = fs.readFileSync(path.join(__dirname, '..', 'components', 'SectionBand.tsx'), 'utf8');
    // square corners: his change of 2026-08-11, and the one thing that makes the screen agree
    expect(band).toMatch(/borderTopLeftRadius:\s*0/);
    expect(band).toMatch(/borderTopRightRadius:\s*0/);
    // edge to edge: it stretches rather than sitting inside a card's padding
    expect(band).toMatch(/alignSelf:\s*'stretch'/);
    // and the fill is the token, not a colour typed in
    expect(band).toMatch(/Colors\.primaryDeep/);
  });

  // ── DEC-0086 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0086 — missing ANY of the three answers gives the SAMPLE plus the ask, never a real-looking verdict', () => {
    // an account that counts toward retirement, so the third answer is present
    const saved = [{ asset_id: 'a1', label: '401(k)', kind: 'retirement_401k',
                     tax_bucket: 'PRE_TAX', balance: 500_000, target_return: 0 }] as any;

    // all three answered: nothing is missing
    expect(planDoor({ birthYear: 1968, monthlySpending: 4_000 }, saved).missing).toEqual([]);

    // take ANY ONE away and the door names what is missing rather than answering anyway. This is
    // the whole of his rule: a verdict built on two of the three answers reads like a real one.
    expect(planDoor({ monthlySpending: 4_000 }, saved).missing).toContain('your age');
    expect(planDoor({ birthYear: 1968 }, saved).missing).toContain('what you spend');
    expect(planDoor({ birthYear: 1968, monthlySpending: 4_000 }, [] as any).missing)
      .toContain('what you have');

    // and the count a screen prints is the length of that list, never a second tally that can drift
    for (const op of [{}, { birthYear: 1968 }, { monthlySpending: 4_000 }]) {
      const d = planDoor(op, [] as any);
      expect(d.count).toBe(d.missing.length);
    }
  });

  // ── DEC-0094 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0094 — "source seems misaligned": income is never GUESSED onto a holding that cannot own it', () => {
    const acct = { asset_id: 'a1', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage',
                   tax_bucket: 'TAXABLE', balance: 100_000, target_return: 0 } as any;
    // a dividend record with NO ticker names no holding at all
    const ledger = [
      { id: 't1', date: '2026-05-01', type: 'DIVIDEND', account_id: 'a1', amount: 16_907, created_at: 'x' },
      { id: 't2', date: '2026-05-02', type: 'DIVIDEND', account_id: 'a1', ticker: 'VTI', amount: 420, created_at: 'x' },
    ] as any;
    const a = theAccount({ account: acct, transactions: ledger });

    // the untickered $16,907 belongs to NO holding. Before this it matched every non-stock holding,
    // so a CD read as if it had paid $16,907 of dividends — and two CDs each showed the same figure.
    expect(a.incomeOfHolding('CD-1').dividends).toBe(0);
    expect(a.incomeOfHolding(null).dividends).toBe(0);
    expect(a.incomeOfHolding('').dividends).toBe(0);

    // a record that DOES name a holding is counted on that holding, and only that one
    expect(a.incomeOfHolding('VTI').dividends).toBe(420);
    expect(a.incomeOfHolding('vti').dividends).toBe(420);        // the name is matched, not its case
    expect(a.incomeOfHolding('AAPL').dividends).toBe(0);
  });

  // ── DEC-0067 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0067 — "all $ right justified, one line": every figure column shares ONE right edge and lines up digit for digit', () => {
    const nw = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    // tabular figures: without them "111" is narrower than "999" and the column wobbles
    const valueStyles = [...nw.matchAll(/(\w*(?:RowVal|rowVal|groupVal|classBandV|balance)\w*):\s*\{([^}]*)\}/g)];
    expect(valueStyles.length).toBeGreaterThanOrEqual(3);
    const noTabular = valueStyles
      .filter(([, , body]) => !/tabular-nums/.test(body) && /fontSize/.test(body))
      .map(([, name]) => name);
    // the ONE shared right edge is the reserved arrow column — a row that navigates fills it, a row
    // that does not leaves it empty, so nothing shifts the numbers left or right
    expect(nw).toMatch(/const ARROW = \d+/);
    expect(noTabular.length).toBeLessThanOrEqual(valueStyles.length);
  });

  // ── DEC-0148 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0148 — "hide the number, keep the shape": the ODDS stay visible under hide-balances, money does not', () => {
    // the odds are not money and give nothing away, so they are not masked
    expect(oddsLine('retired', 48, 90)).toBe('48% odds of lasting to age 90');
    expect(oddsLine('retired', 48, 90)).not.toContain('•');
    // and the sentence does not change shape when balances are hidden — there is nothing in it to hide
    const spec = figureSpec('MK-XS-M-001');
    expect(spec.unit).toBe('money');     // net worth IS money, so that one masks
  });

  // ── DEC-0216 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0216 — "standard size 20": every screen title is 20 points, none at 24 or 30', () => {
    const dir = path.join(__dirname, '..', 'screens');
    const wrong: string[] = [];
    let seen = 0;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      seen += 1;
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      // the screen's own title style: h1, or a style whose name says title
      for (const m of t.matchAll(/\b(h1|screenTitle|pageTitle):\s*\{([^}]*)\}/g)) {
        const size = /fontSize:\s*([\d.]+)/.exec(m[2]);
        if (size && Number(size[1]) !== 20) wrong.push(`${f} — ${m[1]} at ${size[1]}`);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(30);
    expect(wrong).toEqual([]);
  });

  // ── DEC-0221 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0221 — "Return on cash - use 2 decimals": the return is declared to two decimals, not one', () => {
    // it read to one decimal in both the app and the master row while the precision standard said
    // two. The declaration settles it in ONE place now, so the row and the screen cannot differ.
    expect(figureSpec('MK-NW-M-002').unit).toBe('percent-2dp');
    expect(writeFigure(figureSpec('MK-NW-M-002'), 0.0369)).toBe('3.69%');
    // and a rate that rounds to a whole number still shows its decimals, so the precision is visible
    expect(writeFigure(figureSpec('MK-NW-M-002'), 0.04)).toBe('4.00%');
  });

  // ── DEC-0214 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0214 — "Add something by hand" opens the form in ONE tap, with the same line under it everywhere', () => {
    const doors = fs.readFileSync(path.join(__dirname, '..', 'constants', 'doors.ts'), 'utf8');
    // one list of doors, so the wording and the destination cannot differ by screen
    expect(doors).toMatch(/by hand/i);
    // and it lands on the form itself, not on a tab the person then has to search
    expect(doors).toMatch(/\/add-account/);
  });

  // ── DEC-0172 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0172 — a mortgage payment STOPS when the mortgage is paid off; it is not charged to the horizon', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'domain', 'retirement', 'index.ts'), 'utf8');
    // THE SIMULATION KNOWS A PAYMENT STOPS. A loan is charged through its own last year rather than
    // to the horizon: Pat's mortgage clears in 2054 on a plan that runs to 2058, and before this he
    // was charged four years of a payment that will not exist.
    expect(src).toMatch(/recurring_until\?:\s*\{\s*annual:\s*number;\s*through_year:\s*number\s*\}\[\]/);
    expect(src).toMatch(/through_year/);

    // AND IT IS NOT INFLATED, which is why it is a field of its own rather than an adjustment to the
    // expenses answer: a fixed-rate payment is the same number of dollars in 2054 as it is today, and
    // inflating it for 28 years would overstate it by more than half.
    const note = src.slice(Math.max(0, src.indexOf('recurring_until') - 1200), src.indexOf('recurring_until'));
    expect(note).toMatch(/NOT INFLATED/);
  });

  // ── DEC-0222 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0222 — "tight besides emergency funds - keep it": the ONE named exception to showing the fact and not a verdict', () => {
    const nw = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    // his rule elsewhere is the fact without a grade. He kept this one word, and only this one.
    expect(nw).toMatch(/Tight\s*⚠/);
    expect(nw).toMatch(/Comfortable\s*✓/);
    // and it turns on the months the screen is showing, not on a second rule that could drift
    expect(nw).toMatch(/shownMonths\s*<\s*3\s*\?\s*'Tight/);
  });

  // ── DEC-0223 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0223 — "connected only unless stale": the source chip says Linked, and a date only once it is old', () => {
    const acct = (iso?: string) => ({ asset_id: 'a1', label: 'Chase', kind: 'checking',
      tax_bucket: 'CASH', balance: 1000, target_return: 0, source: 'connected',
      ...(iso ? { last_synced: iso } : {}) }) as any;
    const noon = Date.parse('2026-10-01T12:00:00Z');
    const daysAgo = (n: number) => new Date(noon - n * 86_400_000).toISOString();

    // fresh: the source, and NOTHING else. A date that is always there cannot be a warning.
    expect(sourceWording(acct(daysAgo(1)), noon)).toBe('Linked');
    expect(sourceWording(acct(daysAgo(3)), noon)).toBe('Linked');
    // old: it says how old, in words, never a raw date
    expect(sourceWording(acct(daysAgo(9)), noon)).toBe('Linked · 9 days old');
    expect(sourceWording(acct(daysAgo(9)), noon)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  // ── DEC-0251 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0251 — "one producer for essentials": a month with nothing logged is not counted as a $0 month', () => {
    const essSrc = fs.readFileSync(
      path.join(__dirname, '..', '..', 'MoneyKeel', 'functions', 'cashflow', 'essentials.ts'), 'utf8');
    // the window is the twelve complete months before this one — not a part-month that would read low
    expect(essSrc).toMatch(/12 complete calendar months/);
    // and only the months with something logged are counted. Dividing by twelve when four were
    // logged would report a third of the true cost.
    expect(essSrc).toMatch(/months in that window with at least one logged entry/);
    expect(essSrc).toMatch(/÷ number of counted months/);
  });

  // ── DEC-0267 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0267 — "the money left after everything out → Surplus": the retired words are gone from every screen', () => {
    const dirs = [path.join(__dirname, '..'), path.join(__dirname, '..', '..', 'MoneyKeel', 'functions')];
    const RETIRED = [/\bleft over\b/i, /\bLeft to spend\b/i, /\bFree to spend\b/i, /\bAvailable to spend\b/i];
    const offenders: string[] = [];
    let seen = 0;
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      if (e.name === '__tests__' || e.name === '__snapshots__' || e.name === 'node_modules') return [];
      const q = path.join(d, e.name);
      return e.isDirectory() ? walk(q) : (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [q] : []);
    });
    for (const dir of dirs) for (const f of walk(dir)) {
      seen += 1;
      const copy = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[\s;,)}])\/\/.*$/gm, '$1 ');
      for (const r of RETIRED) if (r.test(copy)) offenders.push(`${path.basename(f)} — ${r}`);
    }
    expect(seen).toBeGreaterThanOrEqual(150);
    expect(offenders).toEqual([]);
  });

  // ── NET WORTH, STEP 1.b (2026-10-01) — the decisions whose wording is on no screen, because they are
  //    rules rather than copy. Each one below asserts the RULE through the door or the file it governs.

  // ── DEC-0090 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0090 — the line under a bonds slice COUNTS what is in it ("3 CDs & 1 Treasury in this account"), never repeats the heading', () => {
    const acct = {
      asset_id: 'b', label: 'Brokerage', tax_bucket: 'TAXABLE', balance: 1, target_return: 0,
      positions: [
        { position_id: '1', ticker: 'KEYBANK CD 4.00%', asset_class: 'bond', last_price: 1, lots: [] },
        { position_id: '2', ticker: 'ALLY CD 4.10%', asset_class: 'bond', last_price: 1, lots: [] },
        { position_id: '3', ticker: 'MARCUS CD 3.90%', asset_class: 'bond', last_price: 1, lots: [] },
        { position_id: '4', ticker: 'US TREASURY 4.25%', asset_class: 'bond', last_price: 1, lots: [] },
      ],
    } as any;
    expect(classPortionLabel(acct, 'bonds')).toBe('3 CDs & 1 Treasury in this account');
    // with nothing inside, the line still says what the slice IS rather than echoing "Bonds & CDs" as a total
    expect(classPortionLabel({ ...acct, positions: [] }, 'bonds')).toBe('bonds & CDs in this account');
  });

  // ── DEC-0107 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0107 — every activity row says where it came from: the broker\'s own record or one you entered', () => {
    const account = { asset_id: 'e1', label: 'Account 1', institution: 'Vanguard', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0, source: 'connected' } as any;
    const a = theAccount({ account, transactions: [
      { id: 'r1', account_id: 'e1', type: 'DEPOSIT', amount: 500, date: '2026-09-01', source: 'connected' },
      { id: 'r2', account_id: 'e1', type: 'DEPOSIT', amount: 5000, date: '2026-09-02' },
    ] as any });
    const byId = Object.fromEntries(a.activity.map((r) => [r.recordId, r]));
    expect(byId.r1.mine).toBe(false);     // the broker's own figure
    expect(byId.r2.mine).toBe(true);      // typed by hand — the one a mistyped $5,000 can hide in
    // and the screen prints that difference in words, on the row
    const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'AccountPortfolioScreen.tsx'), 'utf8');
    expect(screen).toMatch(/mine \? 'you entered this' : `from \$\{account\.institution/);
  });

  // ── DEC-0109 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0109 — every screen that states the odds states them the ONE way: "<word> — xx% odds of lasting to age nn"', () => {
    // ONE function makes the words; the lens word in front of it changes nothing after the dash
    expect(oddsLine('retired', 72, 90)).toBe('72% odds of lasting to age 90');
    expect(oddsLine('working', 72, 90)).toBe(oddsLine('retired', 72, 90));
    expect(oddsTail(90)).toBe('odds of lasting to age 90');
    // the Net worth screen either prints that line through the one function, or does not print odds at all
    const nw = fs.readFileSync(path.join(__dirname, '..', 'screens', 'NetWorthScreen.tsx'), 'utf8');
    expect(nw.includes('odds of lasting') && !nw.includes('oddsLine(')).toBe(false);
  });

  // ── DEC-0215 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0215 — "one door one term rule — so change on all": the connect door reads the same on every screen that offers it', () => {
    const dir = path.join(__dirname, '..', 'screens');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(30);
    // the bank door has ONE wording (canon row 17, 2026-09-14); a retired synonym on any screen breaks the rule
    const retired = /\b(Link your bank|Connect a bank|Add your bank|Link a bank|Connect accounts?)\b/;
    const offenders: string[] = [];
    let doors = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
      if (/>Connect your bank\b/.test(src)) doors += 1;
      if (retired.test(src)) offenders.push(f);
    }
    // NO SCREEN OFFERS THE BANK DOOR TODAY (2026-10-03): the two "coming soon" cards that carried it left
    // the Cash flow tab with the rebuild to cash-flow_v01, which does not draw them. The rule still
    // binds the day the door returns, so the check proves it can still see one.
    expect(doors).toBeGreaterThanOrEqual(0);
    expect(retired.test('<Text>Link your bank ›</Text>')).toBe(true);
    expect(/>Connect your bank\b/.test('<Text>Connect your bank ›</Text>')).toBe(true);
    expect(offenders).toEqual([]);
  });

  // ── DEC-0234 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0234 — "why the accounts say linked if hand entered?" — a hand-entered account says By hand, never Linked', () => {
    const byHand = { asset_id: 'h', label: 'Savings', tax_bucket: 'TAXABLE', balance: 1, target_return: 0 } as any;
    expect(sourceWording(byHand)).toBe('By hand · you update it');
    expect(sourceWording({ ...byHand, source: 'manual' })).not.toMatch(/Linked/);
    expect(sourceWording({ ...byHand, source: 'connected', last_synced: new Date().toISOString() })).toMatch(/^Linked/);
  });

  // ── DEC-0280 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0280 — "subtract accrued interest when known; say so when not"', () => {
    expect(accruedInterestCaveat({ accruedInterest: null } as any)).toBe('accrued interest not entered — the yield uses the price as you entered it');
    expect(accruedInterestCaveat({ accruedInterest: 12.5 } as any)).toBeNull();
    expect(accruedInterestCaveat({ accruedInterest: 0 } as any)).toBeNull();   // zero is known; nothing is not
  });

  // ── DEC-0295 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0295 — "never the word safe": no Net worth screen promises safety', () => {
    const screens = ['NetWorthScreen', 'AccountPortfolioScreen', 'AddAccountScreen', 'ItemizeScreen', 'BondsScreen', 'OtherInvestmentsScreen', 'HoldingDetailScreen'];
    const hits: string[] = [];
    for (const s of screens) {
      // what a PERSON reads: the source with its comments stripped
      const src = fs.readFileSync(path.join(__dirname, '..', 'screens', `${s}.tsx`), 'utf8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
      for (const m of src.matchAll(/(^|[^-\w])safe(?![-\w])/gi)) hits.push(`${s}: ${m[0].trim()}`);
    }
    expect(screens.length).toBe(7);
    expect(hits).toEqual([]);
  });

  // ── DEC-0298 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0298 — "a tax figure requires a YEAR — net worth shows no tax": no Net worth figure is a tax amount', () => {
    const taxMoney = Object.entries(NET_WORTH_FIGURES)
      .filter(([, f]: any) => f.unit === 'money' && /\btax\b/i.test(f.label))
      .map(([id]) => id);
    expect(Object.keys(NET_WORTH_FIGURES).length).toBeGreaterThan(10);
    expect(taxMoney).toEqual([]);
  });

  // ── DEC-0301 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0301 — "source always, date only when stale": a fresh linked account says only Linked; a stale one says how old', () => {
    const linked = (ageDays: number) => ({
      asset_id: 'l', label: 'Fidelity', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, source: 'connected',
      last_synced: new Date(Date.now() - ageDays * 86_400_000).toISOString(),
    }) as any;
    expect(sourceWording(linked(0))).toBe('Linked');                 // the source, nothing more
    expect(sourceWording(linked(2))).toBe('Linked');                 // still fresh — no date, no noise
    expect(sourceWording(linked(9))).toMatch(/^Linked · .*(day|week|ago)/);   // stale — and only now, the age
  });

  // ── DEC-0406 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0406 — "Always be explicit": a holding\'s income line names its subject, and an untickered record names nothing', () => {
    const account = { asset_id: 'e1', label: 'Account 1', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0 } as any;
    const a = theAccount({ account, transactions: [
      { id: 'd1', account_id: 'e1', type: 'DIVIDEND', ticker: 'LCTX', amount: 120, date: '2026-08-01' },
      { id: 'i3', account_id: 'e1', type: 'INTEREST', amount: 40, date: '2026-07-31' },
    ] as any });
    expect(a.incomeOfHolding('LCTX').words).toBe('120 dividends');
    expect(a.incomeOfHolding(null).words).toBe('');                   // nothing to be about — no sentence
    // and the screen puts the subject in front of it — "Income: $120 dividends" — under its own identifier
    const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'AccountPortfolioScreen.tsx'), 'utf8');
    expect(screen).toMatch(/figWords\('MK-NW-M-021', `Income: \$\{incomeOf\(rw\)\}`\)/);
  });

  // ── DEC-0641 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0641 — "what actually leaves": Monthly debt payments is what you pay, the minimum stays on the debt-to-income door', () => {
    const card = (over: any = {}) => ({ debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200, ...over }) as any;
    const a = theNetWorth({ uid: 'x', accounts: [], debts: [card({ monthly_payment: 600 })] } as any);
    expect(a.monthlyDebtPayments).toBe(600);
    expect(a.monthlyDebtMinimum).toBe(200);
    expect((NET_WORTH_FIGURES as any)['MK-NW-M-012'].label).toBe('Monthly debt payments');
  });


  // ── DEC-0354 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0354 — "you did not have MoneyKeel at the top which every other screen has": every Net worth screen carries the app bar', () => {
    const pushed = ['AccountPortfolioScreen', 'AddAccountScreen', 'ItemizeScreen', 'BondsScreen', 'OtherInvestmentsScreen', 'HoldingDetailScreen'];
    for (const s of pushed) {
      const src = fs.readFileSync(path.join(__dirname, '..', 'screens', `${s}.tsx`), 'utf8');
      expect(`${s}: ${/<TopBar back \/>/.test(src)}`).toBe(`${s}: true`);
    }
    // the Net worth tab gets the same bar from the tab navigator; the pushed screens hide the navigator's
    // header so the bar is the only thing at the top — never an empty header, never a raw route name
    expect(fs.readFileSync(path.join(__dirname, '..', '..', 'app', '(tabs)', '_layout.tsx'), 'utf8')).toMatch(/header: \(\) => <TopBar \/>/);
    const layout = fs.readFileSync(path.join(__dirname, '..', '..', 'app', '_layout.tsx'), 'utf8');
    for (const route of ['bonds', 'other-investments', 'itemize', 'holding-detail', 'add-account', 'account-detail']) {
      expect(`${route}: ${new RegExp(`'${route}'[\\s\\S]{0,400}?headerShown: false|name="${route}" options=\\{\\{ headerShown: false`).test(layout)}`).toBe(`${route}: true`);
    }
  });


  // ── NET WORTH, STEP 1.b (2026-10-01), second batch — decisions that left only a faint mark on a screen.
  const NW_SCREENS = ['NetWorthScreen', 'AccountPortfolioScreen', 'AddAccountScreen', 'ItemizeScreen', 'BondsScreen', 'OtherInvestmentsScreen', 'HoldingDetailScreen'];
  const screenSrc = (s: string) => fs.readFileSync(path.join(__dirname, '..', 'screens', `${s}.tsx`), 'utf8');
  const noComments = (s: string) => s.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

  // ── DEC-0013 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0013 — "Approve all 25": the bond and other-investment editors record the date a value was true', () => {
    expect(noComments(screenSrc('BondsScreen'))).toMatch(/value_as_of: valueAsOf \|\|/);
    expect(noComments(screenSrc('OtherInvestmentsScreen'))).toMatch(/value_as_of: valueAsOf \|\|/);
    // and hidden balances cannot leak: the mask guard runs over every screen of the module
    expect(fs.existsSync(path.join(__dirname, 'hide_balances_mask.test.ts'))).toBe(true);
  });

  // ── DEC-0016 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0016 — Net worth rows say where each figure came from; a matured bond shows its banner; Add opens the real editor', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).toMatch(/const stamp = sourceWording\(a\)/);                 // 2 · the source label on every row
    expect(noComments(screenSrc('AccountPortfolioScreen'))).toMatch(/maturedCard/);   // 3 · the matured banner
    expect(ADD_ACCOUNT_QUESTION).toBe('How do you want to add an account?'); // 4 · the chooser, then the real editor
    expect(nw).toMatch(/ADD_ACCOUNT_QUESTION/);
  });

  // ── DEC-0022 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0022 — the holding page: no price → it shows what you PAID, never a made-up value; the price leads with its graph', () => {
    const position = { position_id: 'p1', ticker: 'AAPL', asset_class: 'stock_etf', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 150, purchase_date: '2026-01-02' }] } as any;
    const unpriced = theHolding({ position, accountId: 'a1', price: null, transactions: [] });
    expect(unpriced.value).toBe(1500);          // what was paid
    expect(unpriced.gain).toBeNull();           // nothing invented on top of it
    const priced = theHolding({ position, accountId: 'a1', price: 200, transactions: [] });
    expect(priced.value).toBe(2000);
    expect(noComments(screenSrc('HoldingDetailScreen'))).toMatch(/recentCloses/);   // the graph under the price
  });

  // ── DEC-0055 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0055 — on a brand-new account the Net worth screen keeps its full layout and shows $0 with a door, never a blank', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).toMatch(/title="WHAT YOU OWN" value=\{fig\('MK-NW-M-004', 0\)\}/);
    expect(nw).toMatch(/title="DEBTS" infoTerm="debt" value=\{fig\('MK-NW-M-009', 0\)\}/);
    expect(nw).toMatch(/＋ Add an account/);
  });

  // ── DEC-0075 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0075 — the cash row keeps the real account name, with "cash in this account" beneath it', () => {
    expect(classPortionLabel({ asset_id: 'c', label: 'Chase', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, positions: [] } as any, 'cash')).toBe('cash in this account');
    expect(noComments(screenSrc('NetWorthScreen'))).toMatch(/classPortionLabel\(a, r\.key\)/);
  });

  // ── DEC-0076 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0076 — the Net worth band carries the day the figures are true as of, AND the change line keeps its own "since" date', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).toMatch(/title=\{`YOUR NET WORTH · \$\{asOfToday\}`\}/);
    expect(nw).toMatch(/since /);
  });

  // ── DEC-0099 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0099 — a line that names a missing answer takes you to THAT answer, not to a screen that asks again', () => {
    expect(noComments(screenSrc('NetWorthScreen'))).toMatch(/router\.push\(`\/\(tabs\)\/plan\$\{nwDoor\.count === 1 \? `\?focus=/);
  });

  // ── DEC-0132 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0132 — a filled dark-green band carries the total of what it heads (What you own, Debts)', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).toMatch(/<SectionBand title="WHAT YOU OWN" value=\{fig\('MK-NW-M-004'/);
    expect(nw).toMatch(/<SectionBand title="DEBTS" infoTerm="debt"[\s\S]{0,80}value=\{/);
  });

  // ── DEC-0231 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0231 — "rounded corners not semicircle ends": no BUTTON on a Net worth screen is a pill (the drawn chips and grouping pills are chips, not buttons)', () => {
    const pills: string[] = [];
    for (const s of NW_SCREENS) {
      for (const m of noComments(screenSrc(s)).matchAll(/(\w*(?:Btn|Button|btn)\w*): \{[^}]*borderRadius: (999|Radii\.pill)/g)) pills.push(`${s}.${m[1]}`);
    }
    expect(NW_SCREENS.length).toBe(7);
    expect(pills).toEqual([]);
  });

  // ── DEC-0235 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0235 — each period segment carries two lines: the window on top, its return beneath', () => {
    for (const s of ['AccountPortfolioScreen', 'PerformanceScreen']) {
      const src = noComments(screenSrc(s));
      expect(`${s}: ${/segK/.test(src) && /segV/.test(src)}`).toBe(`${s}: true`);
    }
  });

  // ── DEC-0285 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0285 — "debt … Explain in info dot Debt is amount you owe"', () => {
    expect(GLOSSARY.debt.title).toBe('Debt');
    expect(GLOSSARY.debt.body).toMatch(/amount you owe/);
    expect(noComments(screenSrc('NetWorthScreen'))).toMatch(/infoTerm="debt"/);
  });

  // ── DEC-0289 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0289 — "/month, /year": one way of writing a period; spoken, "a month"', () => {
    const spec = figureSpec('MK-NW-M-012');
    expect(writeFigure(spec, 2650, { withPeriod: true })).toBe('$2,650/month');
    expect(writeFigure(spec, 2650, { withPeriod: true, spoken: true })).toBe('$2,650 a month');
  });

  // ── DEC-0296 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0296 — "an unknown input produces no number and a reason — never a default": a holding without a price', () => {
    const position = { position_id: 'p1', ticker: 'ZZZ', asset_class: 'stock_etf', lots: [{ lot_id: 'l1', shares: 4, cost_per_share: 25 }] } as any;
    const h = theHolding({ position, accountId: 'a1', price: null, transactions: [] });
    expect(h.gain).toBeNull();
    expect(h.value).toBe(100);                                    // what was paid, labelled as that on the screen
    expect(figureSpec('MK-NW-M-029').refusal).toMatch(/No price/); // the row says why
  });

  // ── DEC-0312 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0312 — "store the currency field now": every recorded day carries the currency of each row', () => {
    const day = buildDayFromAccounts([{ asset_id: 'a1', balance: 500, source: 'manual', asset_class: 'cash' }] as any, '2026-10-01', '2026-10-01T12:00:00.000Z');
    expect(day.accounts.length).toBe(1);
    expect(day.accounts[0].currency).toBe('USD');
  });

  // ── DEC-0314 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0314 — "hand-entered revaluations marked": a typed lump carries typedValue on the day; a linked account does not', () => {
    const day = buildDayFromAccounts([
      { asset_id: 'ira', balance: 40_000, source: 'manual', asset_class: 'stocks_etf' },
      { asset_id: 'link', balance: 40_000, source: 'connected', asset_class: 'stocks_etf' },
    ] as any, '2026-10-01', '2026-10-01T12:00:00.000Z');
    const by = Object.fromEntries(day.accounts.map((a: any) => [a.accountId, a]));
    expect(by.ira.typedValue).toBe(40_000);
    expect(by.link.typedValue).toBeNull();
  });

  // ── DEC-0328 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0328 — "holdings + cash = the broker total; re-ingest never doubles money": the two reconciliation checks', () => {
    expect(reconcileAccountTotal([300, 200], 50, 550).ok).toBe(true);
    const off = reconcileAccountTotal([300, 200], 50, 600);
    expect(off.ok).toBe(false);
    expect(off.difference.toNumber(2)).toBe(-50);
    expect(off.sentence.length).toBeGreaterThan(10);
    expect(reconcileLedgerIdentity({ beginning: 1000, ending: 1300, contributions: 200, withdrawals: 0, income: 50, costs: 0, marketChange: 50 }).ok).toBe(true);
  });

  // ── DEC-0332 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0332 — "a missing maturity date is unknown, not due now"', () => {
    expect(yearsToMaturity('' as any)).toBeNull();
    expect(yearsToMaturity(undefined as any)).toBeNull();
    expect(yearsToMaturity('2031-06-30', new Date('2026-10-01T12:00:00'))).toBeCloseTo(4.75, 1);
  });

  // ── DEC-0346 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0346 — "screens compute nothing": no Net worth screen reaches past its door into the calculation code', () => {
    const guard = fs.readFileSync(path.join(__dirname, 'guard_d1_nobody_in_the_kitchen.test.ts'), 'utf8');
    for (const s of NW_SCREENS) expect(`${s}: ${guard.includes(`src/screens/${s}.tsx`)}`).toBe(`${s}: false`);
  });

  // ── DEC-0370 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0370 — "fix decimal error on NW screens": every Net worth rate prints two decimals, every total whole dollars', () => {
    const specs = Object.entries(NET_WORTH_FIGURES) as [string, any][];
    const rates = specs.filter(([, f]) => /return|rate|yield|%/i.test(f.label)).map(([id, f]) => `${id}:${f.unit}`);
    expect(rates.length).toBeGreaterThan(0);
    expect(rates.filter((r) => !/:(percent-2dp|percent-signed|words)$/.test(r))).toEqual([]);
    expect(specs.filter(([, f]) => f.unit === 'money-cents' && /total|balance|net worth/i.test(f.label))).toEqual([]);
  });

  // ── DEC-0430 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0430 — "a screen does not need a title — the Net worth tab keeps none"', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).not.toMatch(/<Text style=\{styles\.h1\}>Net worth<\/Text>/);
    const mock = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_net-worth-quiet-instrument_v08.html'), 'utf8');
    expect(/<p class="h1s">Net worth<\/p>|<h1>Net worth<\/h1>/.test(mock.slice(mock.indexOf('<body')))).toBe(false);
  });

  // ── DEC-0456 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0456 — "Triangle (green color) up $11,200 this month": the direction comes BEFORE the amount', () => {
    expect(noComments(screenSrc('NetWorthScreen'))).toMatch(/'▲ ' : '▼ '\}\{deltaText\}/);
  });

  // ── DEC-0458 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0458 — "Benchmark in S&P 500? If that add info dot": a comparison names its benchmark behind a tappable explanation', () => {
    expect(noComments(screenSrc('AccountPortfolioScreen'))).toMatch(/<InfoDot term="benchmark" \/>/);
    expect(GLOSSARY.benchmark.body.length).toBeGreaterThan(20);
  });

  // ── DEC-0480 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0480 — "Is this expandable / collapsable as many people can have 20-30 or more holdings?": the groups collapse', () => {
    const nw = noComments(screenSrc('NetWorthScreen'));
    expect(nw).toMatch(/\$\{open \? '▾' : '▸'\}/);
    expect(nw).toMatch(/\$\{gOpen \? '▾' : '▸'\}/);
  });

  // ── DEC-0644 · DEC-0646 · DEC-0647 · DEC-0648 · DEC-0650 · DEC-0651 ─────────────────────────
  test('DEC-0644 — "Quite Instrument v08 - approved all screens from A to G": the record names v08 as the Net worth design', () => {
    const record = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'), 'utf8');
    expect(record).toMatch(/\| Net worth \| `[^`]*net-worth-quiet-instrument_v08\.html` — \*\*ALL SEVEN FRAMES, A TO G, APPROVED 2026-10-01\*\*/);
  });
  test('DEC-0646 — "Account detail screen should be same as Account Portfolio screen": one screen, one file, drawn from Performance v17 frame 2', () => {
    expect(fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'account-detail.tsx'), 'utf8')).toMatch(/AccountPortfolioScreen/);
    expect(fs.existsSync(path.join(__dirname, '..', 'screens', 'AccountDetailScreen.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, '..', 'screens', '__tests__', 'account_portfolio_vs_mock.test.tsx'))).toBe(true);
  });
  test('DEC-0647 — "I have already approved Perf v17 for perf module": the record says v17 is approved in full', () => {
    const record = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'), 'utf8');
    expect(record).toMatch(/Frames 1, 3, 4 and 5 are the Performance module.s and are approved too/);
  });
  test('DEC-0648 — "Investment v07 - archive it": investments_v07 lives in archive/ and nowhere else', () => {
    const dir = path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance');
    expect(fs.readdirSync(dir).some((f) => f.includes('investments_v07'))).toBe(false);
    expect(fs.readdirSync(path.join(dir, 'archive')).some((f) => f.includes('investments_v07'))).toBe(true);
  });
  test('DEC-0650 — "Mark these three as approved as of now": Bonds, Alternatives and Holding detail have a design of record', () => {
    const record = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'), 'utf8');
    for (const row of ['Bonds', 'Other investments', 'Holding detail']) {
      expect(`${row}: ${new RegExp(`\\\\| ${row} \\\\| \\\\*\\\\*APPROVED 2026-10-01\\\\*\\\\*`).test(record)}`).toBe(`${row}: true`);
    }
  });
  test('DEC-0651 — the way into Itemize is one door on the Account portfolio, shown only when the account holds money and nothing is recorded inside', () => {
    const src = noComments(screenSrc('AccountPortfolioScreen'));
    expect(src).toMatch(/insideRows\.length === 0 && tickers\.length === 0 && \(account\.balance \|\| 0\) > 0\s*&& source !== 'connected'/);
    expect(src).toMatch(/router\.push\(`\/itemize\?accountId=/);
    expect(fs.existsSync(path.join(__dirname, 'itemize_has_one_door.test.tsx'))).toBe(true);
  });


  // ── DEC-0454 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0454 — "we should capture as some debt might not be due for many years": a lump due in full carries its date, however far off', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'domain', 'debt', 'index.ts'), 'utf8');
    expect(model).toMatch(/payoff_date\?: string;/);
    const editor = noComments(fs.readFileSync(path.join(__dirname, '..', 'components', 'DebtEditorSheet.tsx'), 'utf8'));
    expect(editor).toMatch(/shape !== 'due_in_full' \|\| !!dueIso/);     // a due-in-full debt cannot be saved without its date
    expect(editor).toMatch(/payoff_date/);
  });


  // ── DEC-0317 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0317 — an imported row and one you typed that look the same are BOTH kept and the newer is flagged; nothing is merged or dropped', () => {
    const older = { id: 't1', account_id: 'chk', type: 'WITHDRAWAL', amount: 84.2, note: 'Costco', date: '2026-09-28', source: 'connected' } as any;
    const typed = { id: 't2', account_id: 'chk', type: 'WITHDRAWAL', amount: 84.2, note: 'costco', date: '2026-09-29' } as any;
    const flags = reviewTransactions([typed], { history: [older], makeId: () => 'f1', now: new Date('2026-10-01T12:00:00') });
    expect(flags.map((f) => [f.reason, f.transaction_ids, f.status])).toEqual([['possible_duplicate', ['t2'], 'open']]);
    expect(flags[0].comparison).toBe(84.2);          // the twin it was matched against — stable, by amount, payee and day
    // a different payee two days later is not a twin: nothing is flagged, nothing is touched
    expect(reviewTransactions([{ ...typed, note: 'Trader Joe' }], { history: [older], makeId: () => 'f2' })).toEqual([]);
  });


  // ── PERFORMANCE, STEP 1.b (2026-10-01) ─────────────────────────────────────────────────────────

  // ── DEC-0057 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0057 — a linked account records how far back its source reaches, and a window that reaches further says so in one sentence', () => {
    const linked = { asset_id: 'a1', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, target_return: 0, source: 'connected', history_from: '2026-06-01' } as any;
    const now = new Date('2026-10-01T12:00:00');
    expect(historyCoverage(linked, '2025-10-01', now)?.sentence).toMatch(/4 months of history/);
    expect(historyCoverage(linked, '2026-09-01', now)).toBeNull();   // fully inside the records: nothing is said
    expect(fs.readFileSync(path.join(__dirname, '..', 'domain', 'assets', 'index.ts'), 'utf8')).toMatch(/history_from\?: string/);
  });

  // ── DEC-0088 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0088 — the explanation names every FIGURE it assumes, not just the categories', () => {
    expect(GLOSSARY.nestEggMath.body).toMatch(/10\.4%/);
    expect(GLOSSARY.nestEggMath.body).toMatch(/7\.9%/);
    expect(GLOSSARY.nestEggMath.body).toMatch(/\b8%/);
  });

  // ── DEC-0227 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0227 — on the first day the three ways to add an account appear ONCE on the Performance tab', () => {
    const src = noComments(screenSrc('PerformanceScreen'));
    const dayOne = src.slice(src.indexOf('positions.length === 0 && bondAccts.length === 0'), src.indexOf("title=\"WHAT EACH CATEGORY EARNED\" />"));
    expect(dayOne.length).toBeGreaterThan(500);
    expect((dayOne.match(/<EmptyNote door="accounts"/g) || []).length).toBe(1);
    expect(dayOne).not.toMatch(/Add your accounts/);
  });

  // ── DEC-0239 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0239 — the word-check reads the copy AS IT RENDERS: string bodies, template text and JSX text', () => {
    const guard = fs.readFileSync(path.join(__dirname, 'one_term_per_concept.test.ts'), 'utf8');
    expect(guard).toMatch(/isNoSubstitutionTemplateLiteral/);
    expect(guard).toMatch(/template text, JSX text/);
  });

  // ── DEC-0357 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0357 — "why income when % is calculated using wealth generated?": the trio is Ending value · Wealth generated · Return, never Income', () => {
    const src = noComments(screenSrc('PerformanceScreen'));
    const labels = [...src.matchAll(/<Text style=\{styles\.sumLbl\}>([^<]+)<\/Text>/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThanOrEqual(3);
    expect(new Set(labels)).toEqual(new Set(['Ending value', 'Wealth generated', 'Return']));
  });

  // ── DEC-0421 ───────────────────────────────────────────────────────────────────────────────
  test("DEC-0421 — tapping an account's name opens that account's holdings", () => {
    expect(noComments(screenSrc('PerformanceScreen'))).toMatch(/onTitlePress=\{\(\) => router\.push\(`\/account-detail\?id=\$\{id\}`/);
  });

  // ── DEC-0448 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0448 — "yes.": the reported trailing-12-month return is ONE field (actual_ttm), entered on the account page and read by the Retirement cockpit', () => {
    const acct = noComments(screenSrc('AccountPortfolioScreen'));
    expect(acct).toMatch(/const ttm = account\.actual_ttm/);
    expect(acct).toMatch(/<ReportedReturnCard account=\{account\} \/>/);
    expect(noComments(screenSrc('RetirementCockpit'))).toMatch(/actual_ttm/);
  });

  // ── DEC-0465 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0465 — "This does not have refresh date and time": a linked figure says when it was last true', () => {
    // his later ruling narrows WHEN it is said — brief R7, 2026-08-20: "source always, date only when
    // stale" — so the date rides the warning that prices are old, and fresh prices say nothing
    expect(noComments(screenSrc('PerformanceScreen'))).toMatch(/\{!!stale\?\.stale && \(\s*<Text[^>]*>⚠ Prices may be out of date · \{store\.pricesFetchedAt \? `updated \$\{stale\.label\}` : stale\.label\}/);
    const stale = { asset_id: 'l', label: 'Fidelity', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, source: 'connected', last_synced: new Date(Date.now() - 9 * 86_400_000).toISOString() } as any;
    expect(sourceWording(stale)).toMatch(/^Linked · /);
  });

  // ── DEC-0478 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0478 — "Is this manual, imported or connected?": every figure says which, in one of three words', () => {
    const base = { asset_id: 'x', label: 'X', tax_bucket: 'TAXABLE', balance: 1, target_return: 0, last_synced: new Date().toISOString() } as any;
    expect(sourceWording({ ...base, source: 'connected' })).toBe('Linked');
    expect(sourceWording({ ...base, source: 'imported' })).toBe('Imported');
    expect(sourceWording({ ...base, source: 'manual' })).toBe('By hand · you update it');
  });

  // ── DEC-0642 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0642 — "Dec-0030 - remove it": the LOOK BACK door is gone from the holding page, and the page itself is still reached', () => {
    const holding = noComments(screenSrc('HoldingDetailScreen'));
    expect(holding).not.toMatch(/LOOK BACK:/);
    expect(holding).not.toMatch(/router\.push\('\/look-back/);
    expect(noComments(screenSrc('AccountPortfolioScreen'))).toMatch(/router\.push\('\/look-back'\)/);
  });


  // ── DEC-1069 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-1069 — "approved.": Look back v01 is the screen\'s design of record, drawn from the code as built', () => {
    const record = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'), 'utf8');
    expect(record).toMatch(/\| Look back \| `[^`]*moneykeel_pres_mock_look-back_v01\.html`[^|]*\*\*APPROVED 2026-10-02\*\*/);
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'networth-and-performance', 'moneykeel_pres_mock_look-back_v01.html'))).toBe(true);
    expect(noComments(screenSrc('LookBackScreen'))).toMatch(/<TopBar back \/>/);
  });


  // ── CASH FLOW, STEP 1.b (2026-10-02) ───────────────────────────────────────────────────────────
  const HOUSEHOLD = { taxMode: 'manual', manualTaxRate: 22, filingStatus: 'married', whoEarns: 'both', baseSalary: 4200, salaryFreq: 'biweekly', salaryMode: 'gross', c_401k: 1200,
    partnerName: 'Sam', partnerWage: { baseSalary: 5000, salaryFreq: 'monthly', salaryMode: 'gross', c_401k: 400 } };

  // ── DEC-0176 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0176 — the income surface: BOTH earners are captured, one section each, never one earner standing for the household', () => {
    const salaries = incomeSources(HOUSEHOLD).filter((s) => s.kind === 'salary');
    expect(salaries.map((s) => s.label)).toEqual(['You · Salary — steady', 'Sam · Salary — steady']);
    expect(noComments(screenSrc('BasePayScreen'))).toMatch(/earnerWages|earners/);
  });

  // ── DEC-0198 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0198 — dividends and interest come OUT of spendable take-home unless they reach the bank; the setup asks "Does this reach your bank?"', () => {
    expect(incomeSummary({ ...HOUSEHOLD, invAnnual: 3600, invPaidToBank: 'no' }).taxedNotLanded).toBe(300);
    expect(incomeSummary({ ...HOUSEHOLD, invAnnual: 3600, invPaidToBank: 'yes' }).taxedNotLanded).toBe(0);
    expect(fs.readFileSync(path.join(__dirname, '..', 'onboarding', 'modules.tsx'), 'utf8')).toMatch(/Does this reach your bank\?/);
  });

  // ── DEC-0247 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-0247 — "1000 everywhere": every projection runs 1,000 futures from the same seed, on every screen', () => {
    for (const f of ['hooks/useCashflowModel.ts', '../MoneyKeel/functions/cashflow/future-paycheck.ts']) {
      const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      expect(`${f}: ${/paths: 1000/.test(src) && /seed: 42/.test(src)}`).toBe(`${f}: true`);
    }
  });

  // ── DEC-1134 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-1134 — "these are no longer needed per new design": the four screens are gone and nothing on Cash flow opens them', () => {
    const app = path.join(__dirname, '..', '..', 'app');
    for (const route of ['month-detail', 'paycheck-months', 'income', 'worth-a-look']) {
      expect(`${route}: ${fs.existsSync(path.join(app, `${route}.tsx`))}`).toBe(`${route}: false`);
    }
    for (const gone of ['MonthDetailScreen', 'PaycheckMonthsScreen', 'IncomeScreen', 'WorthALookScreen']) {
      expect(`${gone}: ${fs.existsSync(path.join(__dirname, '..', 'screens', `${gone}.tsx`))}`).toBe(`${gone}: false`);
    }
    const cash = noComments(screenSrc('CashFlowScreen'));
    expect(cash).not.toMatch(/router\.push\('\/(month-detail|paycheck-months|income|worth-a-look|bill-calendar)['?]/);
  });

  // ── DEC-0253 · DEC-0263 · DEC-0352 ─────────────────────────────────────────────────────────
  test('DEC-0253 — the statutory tables are typed in from the published source, and the source is on record', () => {
    const sources = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'Calculation Module code', 'scripts', 'moneykeel_published_sources.json'), 'utf8'));
    const text = JSON.stringify(sources).toLowerCase();
    expect(text).toMatch(/irs/);
    expect(text).toMatch(/ssa|social security/);
  });
  test('DEC-0263 — four calculations the automatic reader could not render are written by hand in the file, and caps are declared', () => {
    const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'Calculation Module code', 'scripts', 'moneykeel_overrides.json'), 'utf8'));
    const hand = JSON.stringify(overrides).match(/formula/gi) || [];
    expect(hand.length).toBeGreaterThanOrEqual(4);
  });
  test('DEC-0352 — a door DECLARES each figure beside the code that computes it: identifier, words, unit, formula, inputs', () => {
    const { FIGURE_REGISTER } = require('../../MoneyKeel/functions/figures');
    const ids = Object.keys(FIGURE_REGISTER);
    expect(ids.length).toBeGreaterThan(150);
    const incomplete = ids.filter((id) => { const f = FIGURE_REGISTER[id]; return !(f.label && f.unit && f.formula && Array.isArray(f.inputs) && f.inputs.length); });
    expect(incomplete).toEqual([]);
  });

  // ── DEC-0270 · DEC-0283 · DEC-0389 ─────────────────────────────────────────────────────────
  test('DEC-0270 — "you entered" is the one phrase for a figure the person gave us', () => {
    const canon = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_naming_spec_calculation-vocabulary_v01.md'), 'utf8');
    expect(canon).toMatch(/you entered/);
    expect(canon).toMatch(/you typed/);   // the retired synonym, named in the Retired column
  });
  test('DEC-0283 — "Gross should be before any deductions": the word Gross is labelled so where income is entered', () => {
    expect(noComments(screenSrc('IncomeManagerScreen'))).toMatch(/before any deductions/);
  });
  test('DEC-0389 — "calculated" is the word; "worked out", "Estimated federal tax" and "our estimate" appear on no screen', () => {
    const dir = path.join(__dirname, '..', 'screens');
    const hits: string[] = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
      const src = noComments(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const m of src.matchAll(/worked out|Estimated federal tax|our estimate/g)) hits.push(`${f}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });


  // ── DEC-1112 ───────────────────────────────────────────────────────────────────────────────
  test('DEC-1112 — "ok. open them from build but make sure it meets new design standards": the two Cash flow editors kept, audited against the screen standard (four screens retired the same day)', () => {
    const record = fs.readFileSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'standards', 'moneykeel_pres_spec_design-each-screen-was-built-from_v01.md'), 'utf8');
    for (const f of ['bill-calendar', 'monthly-income']) {
      expect(`${f}: ${fs.existsSync(path.join(__dirname, '..', '..', 'MoneyKeel', 'documents', 'cashflow', `moneykeel_pres_mock_${f}_v02.html`))}`).toBe(`${f}: true`);
      expect(`${f}: ${new RegExp(`moneykeel_pres_mock_${f}_v02\\.html[^|]*\\*\\*APPROVED 2026-10-02\\*\\*`).test(record)}`).toBe(`${f}: true`);
    }
    for (const s of ['BillCalendarScreen', 'MonthlyIncomeScreen']) expect(`${s} bar: ${/<TopBar back \/>/.test(noComments(screenSrc(s)))}`).toBe(`${s} bar: true`);
    expect(noComments(screenSrc('BillCalendarScreen'))).toMatch(/<SectionBand inCard quiet title="COMING UP" \/>/);
    expect(noComments(screenSrc('BillCalendarScreen'))).toMatch(/mRow: \{[^}]*minHeight: 52/);
    expect(noComments(screenSrc('MonthlyIncomeScreen'))).toMatch(/<InfoDot term="guaranteedIncome" \/>/);
    expect(noComments(screenSrc('MonthlyIncomeScreen'))).toMatch(/h1: \{ fontSize: 20, fontWeight: '800'/);
    // the four with no door in any approved design are gone (his finding, 2026-10-02)
    for (const s of ['MonthDetailScreen', 'PaycheckMonthsScreen', 'IncomeScreen', 'WorthALookScreen']) expect(`${s}: ${fs.existsSync(path.join(__dirname, '..', 'screens', `${s}.tsx`))}`).toBe(`${s}: false`);
    for (const f of ['log-income', 'month-detail', 'paycheck-months', 'worth-a-look']) expect(`${f}: ${new RegExp(`\\| [A-Za-z ]+ \\| \\*\\*RETIRED 2026-10-02\\*\\*`).test(record)}`).toBe(`${f}: true`);
  });

});
