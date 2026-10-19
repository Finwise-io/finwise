// The app must SAY how far back it can see — on every screen that offers a window.
// Founder 2026-08-18: "Is the reasoning displayed to the user? Or is this a gate for a human
// developer?" It was a developer gate. These pin the user-facing half so it cannot quietly go away.
import * as fs from 'fs';
import * as path from 'path';

// PERFORMANCE LEFT THIS LIST ON 2026-10-03, and not because it stopped saying how far back it sees.
// Its approved drawing (v17) goes further: a window the record cannot cover is greyed to an em-dash and
// cannot be picked, so there is never a shorter period answered under a longer label to apologise for.
// That rule is pinned in its own block below.
// NET WORTH LEFT IT THE SAME DAY. Its approved drawing (v08) carries the dated line and nothing after
// it: "since Aug 3, 2026" IS the statement of how far back the figure reaches. The sentence that used
// to follow corrected "1 January" — a claim the screen stopped making on 2026-08-18, when the label
// began naming its own date.
const SCREENS = ['HoldingDetailScreen.tsx'];
const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
// 2026-09-28: these two rules moved behind MK-NW-O-008 thePerformance (Q-PF-1). The pins are
// unchanged in purpose — the beginning comes from the record, and a refused rate says why — they
// just read the door now instead of the screen, which is where the rules actually live.
const door = () => fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'MoneyKeel', 'functions', 'networth-and-performance', 'performance.ts'), 'utf8');

describe('COVERAGE IS STATED ON EVERY SCREEN THAT OFFERS A WINDOW', () => {
  // THE SENTENCE MOVED INTO ONE FUNCTION ON 2026-10-12 (his approval, DEC-4641): MK-PF-F priceHistoryShortSentence
  // asks the coverage engine, and every screen that prints a holding's window figure asks IT — the Holding page and,
  // since that day, each holding row of the Account page. So the engine pin reads the function, and the screens are
  // pinned to call it and to print only a sentence that is there.
  test('the one sentence function computes coverage from the engine', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'domain', 'performance', 'index.ts'), 'utf8');
    const fn = src.slice(src.indexOf('export function priceHistoryShortSentence'), src.indexOf('export const WINDOW_MONTHS'));
    expect(src).toContain('engines/coverage');            // the ONE function, not a local rewrite
    expect(fn).toMatch(/coverageFor\(/);
    expect(fn).toMatch(/if \(coverage\.covers \|\| !coverage\.from\) return '';/);   // silent when the prices cover the window
  });
  for (const f of [...SCREENS, 'AccountPortfolioScreen.tsx']) {
    test(`${f} asks the one sentence function and renders the sentence only when there is one`, () => {
      const src = read(f);
      expect(src).toMatch(/priceHistoryShortSentence\(/);
      expect(src).not.toMatch(/Prices for this holding go back/);   // the words live in the function only
      expect(src).toMatch(f === 'HoldingDetailScreen.tsx' ? /shortBy !== ''/ : /!!shortHistoryOf\(/);
    });
  }

  test('Net worth names the day its change is measured from, with the year — and says it once', () => {
    const src = read('NetWorthScreen.tsx');
    expect(src).toMatch(/\{sinceDate != null && <Text style=\{styles\.glanceSince\}>since \{sinceDate\}<\/Text>\}/);
    expect(src).toMatch(/year: 'numeric'/);
    expect(src).not.toMatch(/coverage\.sentence/);
  });

  test('no screen writes its own version of the sentence', () => {
    for (const f of [...SCREENS, 'NetWorthScreen.tsx', 'PerformanceScreen.tsx']) {
      const src = read(f);
      expect(src).not.toMatch(/when your records begin/);  // the words live in the function only
    }
  });
});

describe('PERFORMANCE: A WINDOW THE RECORD CANNOT COVER SHOWS NOTHING AND CANNOT BE PICKED (v17)', () => {
  const { thePerformance } = require('../../../MoneyKeel/functions/networth-and-performance/performance');
  const day = (date: string, value: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: [{ date, accountId: 'a1', cash: 0, statedTotal: value, typedValue: value, currency: 'USD' }] });
  const ask = (windowStart: string) => thePerformance({
    windowStart, windowLabel: 'x', today: '2026-09-30', ending: 120_000,
    pricedGain: 9_000,                                   // prices moved — the old rule took that as grounds for a percent
    transactions: [], snapshotDays: [day('2026-06-01', 100_000)], investmentAccountIds: new Set(['a1']),
  });
  test('the door answers no percent for it — even when prices moved', () => {
    const past = ask('2025-09-30');                      // a year back, on a record four months long
    expect(past.covered).toBe(false);
    expect([past.ret, past.cumulative, past.perYear]).toEqual([null, null, null]);
    const inside = ask('2026-07-01');                    // a window the record does reach
    expect(inside.covered).toBe(true);
    expect(inside.ret).not.toBeNull();
  });
  test('the screen greys it and takes it out of reach', () => {
    // the control lives in src/components/WindowSelector.tsx since 2026-10-19 (DEC-6079), shared with the account page
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'components', 'WindowSelector.tsx'), 'utf8');
    // a window the record EXISTS for but cannot reach is greyed (DEC-3035i); one with no record at all is worked back and
    // shows its figures (DEC-5068, 2026-10-13)
    expect(src).toMatch(/const uncovered = figures\[w\.key\]\?\.covered === false && !figures\[w\.key\]\?\.workedBack && !on;/);
    expect(src).toMatch(/disabled=\{uncovered\}/);
    expect(src).not.toMatch(/coverage\.sentence/);       // no shorter period under a longer label
  });
  test('with no investment accounts there is nothing to read — an empty list never means "every account"', () => {
    const none = thePerformance({ windowStart: '2026-07-01', windowLabel: 'x', today: '2026-09-30', ending: 0, pricedGain: 0,
      transactions: [], snapshotDays: [day('2026-06-01', 852_000)], investmentAccountIds: new Set() });
    expect(none.measured).toBeNull();                    // it read the $852,000 home before this
    expect(none.walk.beginning).toBe(0);
  });
});

// ── Track 1 step 7: the beginning value is READ from the daily record, never back-solved,
// wherever the record covers the window — pinned as source, and proven through the function. ──
describe('BEGINNING VALUES COME FROM THE RECORD', () => {
  test('the beginning is READ from the record — for the portfolio walk AND each account walk', () => {
    // 2026-09-28: both walks are the same door now (MK-NW-O-008 thePerformance, Q-PF-1), so the rule
    // is pinned once, where it lives, instead of twice in a screen that could drift apart from itself.
    const src = door();
    expect(src).toContain("engines/snapshots");
    expect(src).toMatch(/snapshotCovers\(days, bounds\.beginningAsOf\)/);
    expect(src).toMatch(/beginningAsOf/);   // D3: the close of the day BEFORE the start
    // and the screen asks it twice — once for everything, once per account
    expect((read('PerformanceScreen.tsx').match(/thePerformance\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test('a covered window resolves the beginning from the record (function truth)', () => {
    const { buildDayFromAccounts, record, valueOn, covers } = require('../../../Calculation Module code/engines/snapshots');
    const day = buildDayFromAccounts([
      { asset_id: 'vg', source: 'connected', balance: 378022, cash_balance: 837.94,
        positions: [{ ticker: 'VTI', last_price: 250, lots: [{ shares: 1508.73624, cost_per_share: 200 }] }] },
    ], '2026-06-30', '2026-06-30T23:59:00Z');
    const days = record([], day);
    expect(covers(days, '2026-06-30')).toBe(true);          // a July window's beginning is covered
    expect(valueOn(days, new Set(['vg']), '2026-06-30')).toBeCloseTo(1508.73624 * 250 + 837.94, 2);
    expect(covers(days, '2026-06-29')).toBe(false);          // and June's is honestly not
  });

  test('the return is time-weighted, a refusal speaks its own sentence, and nothing stands in for it (owner, 2026-10-04)', () => {
    const src = door();
    // the one method: the time-weighted engine, and neither of the two it replaced
    expect(src).toContain("engines/time-weighted-return");
    expect(src).not.toMatch(/modifiedDietzOverWindow\(|moneyWeightedReturn\(/);
    // only a REAL refusal speaks: having no record yet is an em-dash, not a sentence
    // …and a record that begins too late says so, naming its first day (second-round review, 2026-10-07);
    // with no record at all, still nothing
    expect(src).toMatch(/sentence: covered \? whyNoReturn\(verdict\) : cannotReach/);
    expect(src).toMatch(/measured == null && theirDays\.length > 0/);
    // mock v17's mark 16 — a money-weighted rate per year standing in — is gone from the door and the screen
    const screen = read('PerformanceScreen.tsx');
    expect(src).not.toMatch(/refusedRate|RATE_STANDS_IN_WORDS/);
    expect(screen).not.toMatch(/refusedRate|RATE_STANDS_IN_WORDS|money-weighted, so money you added/);
    expect(screen).toMatch(/now\.sentence \? \(/);                      // the screen prints the reason
  });
});
