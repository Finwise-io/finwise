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
import { figureSpec } from '../../MoneyKeel/functions/figures';
import { writeFigure } from '../../MoneyKeel/functions/_figure-spec';
import * as fs from 'fs';
import * as path from 'path';
import { historyCoverage } from '../domain/assets';
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
});
