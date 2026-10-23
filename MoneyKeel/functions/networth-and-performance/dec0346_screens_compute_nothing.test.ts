/** DEC-0346 — SCREENS COMPUTE NOTHING (2026-10-22, W-HOLDING; the decisions check found it breached on four sites).
 *
 *  What the Performance tab and the account page calculated on screen now lives in the functions they read, with the numbers
 *  the screens printed. Each case is the screen's own worked example or the drawing's, so a figure that moves fails here.
 *  The screens' own suites (perf_matches_v17, account_page_drawing_states, pfb_cross_screen_agreement) hold the printed lines,
 *  and guard D1b (src/__tests__/guard_d1_nobody_in_the_kitchen.test.ts) holds that no screen starts working figures out again. */
import * as fs from 'fs';
import { categoriesEarnedTotal, walkDirectionWords } from './performance';
import { isWholeAccountPart, incomeSumParts, classValueOf, restOfAccountBeside, listedShares } from './account';

describe('the Performance tab', () => {
  test('All categories is the categories added up: $1,500 of dividends and $700 of interest → $2,200', () => {
    expect(categoriesEarnedTotal([{ earned: 1500 }, { earned: 700 }])).toBe(2200);
    expect(categoriesEarnedTotal([])).toBe(0);
  });
  test('the spoken graph\'s words for which way the value went: up to, down to, level at', () => {
    expect([walkDirectionWords(30000, 32000), walkDirectionWords(32000, 30000), walkDirectionWords(30000, 30000)]).toEqual(['up to', 'down to', 'level at']);
  });
});

describe('the account page', () => {
  test('a part is the whole account when it is worth the balance and nothing else here was worth anything when the window began', () => {
    // Beta $1,200 beside Alpha, which was $1,000 when the window began and is $0 today: Beta is not the whole account
    expect(isWholeAccountPart(1200, 1200, [1000])).toBe(false);
    // one holding worth the balance, nothing else worth anything then (a known $0 is $0, an unknown start is not a start)
    expect(isWholeAccountPart(1200, 1200, [0, null])).toBe(true);
    // to the dollar, as the page compared: $1,200.40 is the balance of $1,200
    expect(isWholeAccountPart(1200.4, 1200, [])).toBe(true);
    expect(isWholeAccountPart(1100, 1200, [])).toBe(false);
  });
  test('the income sum: each row\'s dividends + interest, then what no holding carries — 1,500 ＋ 100 ＋ 85 ＋ 15 = $1,700 (the drawing\'s row 12)', () => {
    expect(incomeSumParts([{ dividends: 1500 }, { interest: 100 }, { interest: 85 }, { dividends: 0, interest: 0 }], 1700)).toEqual([1500, 100, 85, 15]);
    // exact in decimals: 0.1 + 0.2 is 0.3, and a rest that is really nothing reads nothing
    expect(incomeSumParts([{ dividends: 0.1, interest: 0.2 }], 0.3)).toEqual([0.3]);
    expect(incomeSumParts([{ dividends: 10 }], null)).toEqual([]);
  });
  test('a class\'s value is its rows added up; the rest of the account is the balance less that class', () => {
    expect(classValueOf([{ value: 40000 }, { value: 2420 }, { value: null }])).toBe(42420);
    // a holding in it whose share count is not on record: the class's value is not stated either (the lead's ruling, 2026-10-22)
    expect(classValueOf([{ value: 40000 }, { value: 0, countNotStated: true }])).toBeNull();
    expect(restOfAccountBeside(46600, 40600)).toBe(6000);
  });
  test('the shares a holding holds: 100 + 40 = 140; a purchase with no share count makes it unknown (the lead\'s ruling, 2026-10-22)', () => {
    expect(listedShares({ lots: [{ shares: 100 }, { shares: 40 }] })).toBe(140);
    expect(listedShares({ lots: [{ shares: 10 }, { shares: null }] })).toBeNull();
    expect(listedShares({ lots: [] })).toBe(0);
  });
  test.failing('the shares a holding holds, until 2026-10-22: a purchase with no count added as 0, 10 — no longer its answer (the lead\'s ruling)', () => {
    expect(listedShares({ lots: [{ shares: 10 }, { shares: null }] })).toBe(10);
  });
  test('the two screens call these, and calculate none of it themselves (read from the disk)', () => {
    const acct = fs.readFileSync('src/screens/AccountPortfolioScreen.tsx', 'utf8');
    for (const fn of ['isWholeAccountPart(', 'incomeSumParts(', 'classValueOf(', 'restOfAccountBeside(', 'listedShares(']) expect(acct).toContain(fn);
    expect(acct).not.toMatch(/\.reduce\(|Dec\./);
    const perf = fs.readFileSync('src/screens/PerformanceScreen.tsx', 'utf8');
    expect(perf).toContain('categoriesEarnedTotal(shown)');
    expect(perf).toContain('walkDirectionWords(walk.beginning, walk.ending)');
    expect(perf).not.toMatch(/shown\.reduce\(/);
  });
});

/* ═══ THE NET WORTH SCREENS (2026-10-22): NetWorthScreen 7 places, ItemizeScreen 1, BondsScreen 1 — moved into their doors ═══ */
import { barSegments, barDrawnWidths, accountsInClasses, isPartOfAccount, valueChanged } from './net-worth';
import { itemisedShare } from './account';
import { balanceWithBondTakenOut } from './bonds';

describe('the Net worth screen', () => {
  const row = (key: string, total: number) => ({ key, label: key, color: '#000', total });
  test('the composition bar: whole percents that total 100, the remainder to the largest; widths re-normalised to a full bar', () => {
    const segs = barSegments([row('a', 3), row('b', 1), row('c', 1), row('d', 1), row('e', 1), row('f', 1)]);
    expect(segs.map((x) => x.pct)).toEqual([35, 13, 13, 13, 13, 13]);   // 37.5 → 38 and five 12.5 → 13 make 103; the largest gives back 3
    expect(segs.reduce((t, x) => t + x.pct, 0)).toBe(100);
    const drawn = barDrawnWidths(barSegments([row('big', 999), row('tiny', 1)]));
    expect(drawn.reduce((t, x) => t + x.drawn, 0)).toBeCloseTo(100, 10);   // the sliver floor (1.5%) re-normalised: the bar is full
    expect(drawn[1].width).toBe(1.5);
    expect(barSegments([row('a', 0)])).toEqual([]);
  });
  test('accounts inside a group\'s classes, by the rows\' member rule; a part of an account; a value that changed', () => {
    const accts = [{ asset_id: 'c', kind: 'checking', balance: 100 }, { asset_id: 's', kind: 'savings', balance: 200 }] as any;
    expect(accountsInClasses(accts, ['cash'])).toBe(2);
    expect(isPartOfAccount(500, 1000)).toBe(true);
    expect(isPartOfAccount(1000.004, 1000)).toBe(false);   // half a cent apart is the whole account
    expect([valueChanged(1000, 1200), valueChanged(1000, 1000)]).toEqual([true, false]);
  });
});
describe('Itemize and Bonds', () => {
  test('how much of the total the listed holdings fill: $30,000 of $50,000 → 0.6; over-listed reads full; no total, empty', () => {
    expect([itemisedShare(30000, 50000), itemisedShare(60000, 50000), itemisedShare(100, 0)]).toEqual([0.6, 1, 0]);
  });
  test('a bond added as part of an account takes its worth out: $50,000 − $10,000 = $40,000, never below $0', () => {
    expect([balanceWithBondTakenOut(50000, 10000), balanceWithBondTakenOut(5000, 10000), balanceWithBondTakenOut(null, 10)]).toEqual([40000, 0, 0]);
  });
  test('the three screens call their doors and calculate none of it themselves (read from the disk)', () => {
    const nw = fs.readFileSync('src/screens/NetWorthScreen.tsx', 'utf8');
    for (const fn of ['barSegments(rows)', 'barDrawnWidths(', 'accountsInClasses(', 'isPartOfAccount(', 'valueChanged(']) expect(nw).toContain(fn);
    expect(nw).not.toMatch(/\.reduce\(/);
    expect(fs.readFileSync('src/screens/ItemizeScreen.tsx', 'utf8')).toContain('itemisedShare(allocated, lump.balance)');
    expect(fs.readFileSync('src/screens/BondsScreen.tsx', 'utf8')).toContain('balanceWithBondTakenOut(dup.balance, worth)');
  });
});
