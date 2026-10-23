/* THE OUTSIDE CASES, RUN AGAINST THE APP — Performance module re-run, OpenAI, part 2 of 4: cards MK-PF-F-001, 002,
 * 004 to 014 (one holding's lot arithmetic, the price-window readers, the yardstick and the per-holding rows).
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/
 * MoneyKeel_audit_part_2.json — 65 cases, 13 formula checks, 9 still-open points (rules_held, screen_checks and
 * could_not_test are empty). Its run brief: MoneyKeel_Claude_Code_Brief.md beside it. Every expected answer below is
 * OpenAI's, copied as written; only its plain input names are mapped onto the app's fields. A case the app answers
 * differently is a finding — never fixed by changing the answer here. Results, case by case, with the classification:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_openai_rerun_02_results.json
 *
 * MEASURING ONLY (2026-10-21): no app code was changed for this file. It runs on the working tree, which holds the
 * Net worth agents' uncommitted edits of 2026-10-20/21 — among them a price paid of $0 read as "not on record"
 * (lotCostOnRecord / paidOnRecord) and the class the broker sends deciding a holding's class (his ruling 2026-10-20).
 * Cases whose answer depends on those are marked IN-FLIGHT: re-run them after that work lands.
 *
 * Markers: `// AGREES` the app gives OpenAI's answer · `// APP WRONG:` OpenAI is right by a ruling or standard
 * (test.failing with its answer, plus a test pinning what the app gives today) · `// REVIEWER WRONG:` OpenAI's
 * expectation is wrong by a ruling or code fact (test.failing, its number kept, plus the app's hand-checked answer) ·
 * `// NEEDS A RULING:` no ruling settles it; the app's answer today is pinned · `// SETTLED:` OpenAI wrote RULE
 * UNCLEAR and a later decision settles it · `// IN-FLIGHT:` the answer depends on work another agent is landing.
 *
 * INPUT NAMES MAPPED (OpenAI's names → the app's fields; no expected answer changed):
 *   lots [{shares, cost_per_share | cost, date}] → Position.lots [{shares, cost_per_share, purchase_date}], a missing
 *   figure handed over as OpenAI wrote it (null); "multiplier" → Position.multiplier, and a multiplier of 10 on a case
 *   titled "mini option" also gives kind 'options' — as does the multiplier of 10 in "Unknown date is not short-term
 *   evidence": shares per contract are an option's figure, and since 2026-10-21 the app reads a stated one only for an
 *   option (DEC-0274, DEC-4646; outside re-run part 3, MK-PF-F-031), so the holding OpenAI describes is an option. Kind words: "stock" 'stocks_etf', "bond" 'fixed_income', "crypto"
 *   'crypto', "401(k)" '401k'. "class" → Position.asset_class ('bond', 'stock_etf'); class_source "user" → 'user';
 *   class_source "broker" → the broker's own type kept on the holding (broker_type 'bnd', SnapTrade's code for a bond,
 *   as the sync stores it since 2026-10-20) and no class_source. A wrapper (Roth IRA) is the account's, not the
 *   holding's: benchmarkTicker is never handed it.
 *   today / now → a LOCAL date at noon on that calendar day (the functions read the local calendar day; noon keeps a
 *   date-only price, read as UTC midnight, on the same side of it in every time zone). now with a clock time
 *   ("2026-10-13T15:17:19") → that local time. points [[date, close]] → PriceSeries.points [{date, close}].
 *   buildPerformance: the "stock_prices" / "prices" / "old" + "current" closes are the holding's series; "SPY_prices",
 *   "benchmark_points" and "benchmark_totals" are the yardstick's series (SPY for a stock, AGG for a bond), drawn so the
 *   window's beginning close is 100. "holding" with no kind is handed over with no kind.
 *   "shown" strings are screen formatting and are not asserted; "exact" values are compared to 1e-9 (money, shares) or
 *   1e-12 (rates) — floating-point sums only.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  totalShares, costBasis, marketValue, unrealizedGain, capGains, totalROI, startDateFor, latestClose,
  periodReturn, periodTotalReturn, periodReturnSince, earliestPurchaseDate, benchmarkTicker, buildPerformance,
  priceHistoryShortSentence, paidOnRecord, type Position, type Period, type PriceSeries,
} from '../../../src/domain/performance';
import { holdingClassOf } from '../../../src/domain/assets';
import { windowBounds } from '../../../Calculation Module code/engines/window-return';
import { windowStartKey } from './performance';

const SOURCE = path.join(__dirname, '../../documents/audit/outside-test-cases/returned/MoneyKeel_Performance_Audit_Package/MoneyKeel_audit_part_2.json');

// ── every case is registered as it is declared, so the coverage test at the end can prove none was dropped
const RAN: string[] = [];
const keyOf = (id: string, kind: string, title: string) => `${id} · ${kind} · ${title}`;
// SHOW_ACTUAL=1 runs every marked case as a plain test, so its failure message prints what the app gives — the check
// that each test.failing fails on its own assertion, not on a mistake in the test
const SHOW_ACTUAL = process.env.SHOW_ACTUAL === '1';
// `why`: a case the app was fixed to answer carries the day and the reason after its title in the test's name; the
// registered key stays OpenAI's title, so the coverage test still finds it
function C(id: string, kind: string, title: string, fn: () => void, failing = false, why = '') {
  RAN.push(keyOf(id, kind, title));
  (failing && !SHOW_ACTUAL ? test.failing : test)(`${kind} · ${title}${why ? ` — ${why}` : ''}`, fn);
}

const NOON = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
const AT = (iso: string) => {   // 'YYYY-MM-DDTHH:MM:SS' or 'YYYY-MM-DD' → that local time
  const [d, t = '00:00:00'] = iso.split('T');
  const [y, mo, dd] = d.split('-').map(Number); const [h, mi, se] = t.split(':').map(Number);
  return new Date(y, mo - 1, dd, h, mi, se || 0);
};
const localISO = (d: Date | null) => {
  if (d == null) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const S = (ticker: string, pts: [string, number][]): PriceSeries => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const refuses = (v: unknown) => expect(v == null).toBe(true);
type L = { shares: any; cost?: any; date?: any };
const pos = (lots: L[], o: { kind?: string; multiplier?: number; ticker?: string; asset_class?: any; class_source?: any; broker_type?: string } = {}): Position => ({
  position_id: `p_${o.ticker ?? 'X'}`, ticker: o.ticker ?? 'X',
  ...(o.kind ? { kind: o.kind } : {}), ...(o.multiplier != null ? { multiplier: o.multiplier } : {}),
  ...(o.asset_class ? { asset_class: o.asset_class } : {}), ...(o.class_source ? { class_source: o.class_source } : {}),
  ...(o.broker_type ? { broker_type: o.broker_type } : {}),
  lots: lots.map((l, i) => ({ lot_id: `l${i}`, shares: l.shares, cost_per_share: l.cost as any, purchase_date: l.date as any })),
}) as Position;

// the lot sets OpenAI reuses across MK-PF-F-001, 002, 004 and 005
const ONE = pos([{ shares: 10, cost: 100 }], { multiplier: 1 });
const ZERO_LOT = pos([{ shares: 10, cost: 100 }, { shares: 0, cost: null }], { multiplier: 1 });
const THREE = pos([{ shares: 7.25, cost: 83.17 }, { shares: 3.125, cost: 91.43 }, { shares: 2.5, cost: 87.29 }], { multiplier: 1 });
const MINI = pos([{ shares: 1.25, cost: 2.37 }, { shares: 2.75, cost: 3.19 }], { kind: 'options', multiplier: 10 });
const NO_SHARES = pos([{ shares: null, cost: 100 }], { multiplier: 1 });

describe('MK-PF-F-001 totalShares — five cases', () => {
  C('MK-PF-F-001', 'easy', 'One positive lot', () => { expect(totalShares(ONE)).toBe(10); });                       // AGREES
  C('MK-PF-F-001', 'easy', 'Zero-share lot ignored in cost', () => { expect(totalShares(ZERO_LOT)).toBe(10); });     // AGREES
  C('MK-PF-F-001', 'complex', 'Three unround lots', () => { expect(totalShares(THREE)).toBe(12.875); });             // AGREES
  C('MK-PF-F-001', 'complex', 'Mini option with fractional contracts', () => { expect(totalShares(MINI)).toBe(4); }); // AGREES
  C('MK-PF-F-001', 'edge', 'Missing shares', () => { refuses(totalShares(NO_SHARES)); });                            // AGREES (tenet 3)
});

describe('MK-PF-F-002 costBasis — five cases', () => {
  C('MK-PF-F-002', 'easy', 'One positive lot', () => { expect(costBasis(ONE)).toBe(1000); });
  C('MK-PF-F-002', 'easy', 'Zero-share lot ignored in cost', () => { expect(costBasis(ZERO_LOT)).toBe(1000); });
  C('MK-PF-F-002', 'complex', 'Three unround lots', () => { expect(costBasis(THREE)!).toBeCloseTo(1106.92625, 9); });
  C('MK-PF-F-002', 'complex', 'Mini option with fractional contracts', () => { expect(costBasis(MINI)!).toBeCloseTo(117.35, 9); });
  C('MK-PF-F-002', 'edge', 'Missing shares', () => { refuses(costBasis(NO_SHARES)); });
});

describe('MK-PF-F-004 marketValue — five cases', () => {
  C('MK-PF-F-004', 'easy', 'One positive lot', () => { expect(marketValue(ONE, 120)).toBe(1200); });
  C('MK-PF-F-004', 'easy', 'Zero-share lot ignored in cost', () => { expect(marketValue(ZERO_LOT, 90)).toBe(900); });
  C('MK-PF-F-004', 'complex', 'Three unround lots', () => { expect(marketValue(THREE, 97.31)!).toBeCloseTo(1252.86625, 9); });
  C('MK-PF-F-004', 'complex', 'Mini option with fractional contracts', () => { expect(marketValue(MINI, 4.13)!).toBeCloseTo(165.2, 9); });
  C('MK-PF-F-004', 'edge', 'Missing shares', () => { refuses(marketValue(NO_SHARES, 120)); });
});

describe('MK-PF-F-005 unrealizedGain — five cases', () => {
  C('MK-PF-F-005', 'easy', 'One positive lot', () => { expect(unrealizedGain(ONE, 120)).toBe(200); });
  C('MK-PF-F-005', 'easy', 'Zero-share lot ignored in cost', () => { expect(unrealizedGain(ZERO_LOT, 90)).toBe(-100); });
  C('MK-PF-F-005', 'complex', 'Three unround lots', () => { expect(unrealizedGain(THREE, 97.31)!).toBeCloseTo(145.94, 9); });
  C('MK-PF-F-005', 'complex', 'Mini option with fractional contracts', () => { expect(unrealizedGain(MINI, 4.13)!).toBeCloseTo(47.85, 9); });
  C('MK-PF-F-005', 'edge', 'Missing shares', () => { refuses(unrealizedGain(NO_SHARES, 120)); });
});

describe('MK-PF-F-006 capGains — five cases', () => {
  const split = (c: { longGain: number | null; shortGain: number | null; totalGain: number | null }) => [c.longGain, c.shortGain, c.totalGain];
  // AGREES — held from 2025-10-12 to 2026-10-13 is more than a year (DEC-0324, DEC-0329)
  C('MK-PF-F-006', 'easy', 'More than a year', () => {
    expect(split(capGains(pos([{ date: '2025-10-12', shares: 10, cost: 100 }]), 120, NOON('2026-10-13')))).toEqual([200, 0, 200]);
  });
  // AGREES — exactly one year is short-term (DEC-0329, his words: "exactly one year is short-term")
  C('MK-PF-F-006', 'easy', 'Exactly one anniversary', () => {
    expect(split(capGains(pos([{ date: '2025-10-13', shares: 10, cost: 100 }]), 120, NOON('2026-10-13')))).toEqual([0, 200, 200]);
  });
  // NEEDS A RULING · IN-FLIGHT: is a stored price paid of $0 a real $0 (shares given or granted free) or a blank? The
  // working tree (Net worth agents, 2026-10-20) reads $0 as NOT ON RECORD (lotCostOnRecord: cost > 0), because the holding
  // editor saved a blank as $0 until that day; it leaves the 2.5 shares out and says so (countedShares 10.375 of 12.875).
  // At HEAD (the card OpenAI read) the $0 lot made its whole long-term part and the total unknown. OpenAI reads $0 as
  // known. costBasis (MK-PF-F-002) still counts $0 as a figure, so the two read one lot two ways (tenet 4).
  // SETTLED 2026-10-21 by the lead's decision on master question Q34 (canon row 24, "no price paid on record": a price paid
  // never entered, or entered as $0) — the app's answer below is the rule; OpenAI's known-$0 reading is kept, failing.
  // costBasis is called by no screen (its only readers are tests); it is listed for the lead to align with lotCostOnRecord.
  C('MK-PF-F-006', 'complex', 'Three lots and known zero adjusted basis', () => {
    const c = capGains(pos([{ date: '2024-03-11', shares: 7.25, cost: 83.17 }, { date: '2026-05-19', shares: 3.125, cost: 91.43 }, { date: '2024-01-09', shares: 2.5, cost: 0 }]), 97.31, NOON('2026-10-13'));
    expect(c.longGain!).toBeCloseTo(345.79, 9);
    expect(c.shortGain!).toBeCloseTo(18.375, 9);
    expect(c.totalGain!).toBeCloseTo(364.165, 9);
  }, true);
  test('· app today (IN-FLIGHT): the $0 lot is left out and named — long $102.515 on 7.25 shares, short $18.375, total $120.89 on 10.375 of 12.875', () => {
    const c = capGains(pos([{ date: '2024-03-11', shares: 7.25, cost: 83.17 }, { date: '2026-05-19', shares: 3.125, cost: 91.43 }, { date: '2024-01-09', shares: 2.5, cost: 0 }]), 97.31, NOON('2026-10-13'));
    expect(c.longGain!).toBeCloseTo(102.515, 9);
    expect(c.shortGain!).toBeCloseTo(18.375, 9);
    expect(c.totalGain!).toBeCloseTo(120.89, 9);
    expect([c.countedShares, c.heldShares]).toEqual([10.375, 12.875]);
  });
  // APP WRONG (DEC-3523 tenet 3, unknown is not zero; the same pattern as DEC-4643 and Q20: count what is on record and
  // say what is not). The gain is known; how long the shares were held is not. With the date written as OpenAI wrote it
  // (null) the app reads 1 January 1970 and calls the gain LONG-term; with the '' a linked broker's missing date is
  // stored as (src/services/sync/ingest.ts, ingestSync: `purchase_date: l.purchase_date ?? ''`) it calls it SHORT-term ("the cautious side", a code choice of
  // 2026-08-20, no ruling of his). Either way a split is stated that nothing supports.
  // FIXED 2026-10-21 (the gains job, the lead's decision under tenet 3): a purchase with no purchase date on record
  // (purchaseDateOnRecord) is in neither part; its gain is in the total and in `undated`, and the Holding page gives it a
  // line. OpenAI's answer passes; the app's old answer below is kept as test.failing, never deleted.
  C('MK-PF-F-006', 'complex', 'Unknown date is not short-term evidence', () => {
    const c = capGains(pos([{ date: null, shares: 3.25, cost: 2.37 }], { kind: 'options', multiplier: 10 }), 4.13, NOON('2026-10-13'));
    expect(c.totalGain!).toBeCloseTo(57.2, 9);
    expect(c.longGain).toBeNull();
    expect(c.shortGain).toBeNull();
  }, false, 'FIXED 2026-10-21: a purchase with no date on record is in neither part (tenet 3)');
  test('· the same for a date stored blank (\'\') and a day that does not exist (31 February): neither part, $57.20 in the total and on its own line (FIXED 2026-10-21)', () => {
    for (const date of ['', '2026-02-31', undefined]) {
      const c = capGains(pos([{ date, shares: 3.25, cost: 2.37 }], { kind: 'options', multiplier: 10 }), 4.13, NOON('2026-10-13'));
      expect([c.longGain, c.shortGain]).toEqual([null, null]);
      expect(c.totalGain!).toBeCloseTo(57.2, 9);
      expect(c.undated!.gain!).toBeCloseTo(57.2, 9);
      expect([c.undated!.counted, c.undated!.held]).toEqual([3.25, 3.25]);
    }
  });
  test.failing('· the app until 2026-10-21, pinned: no date (null) read as bought on 1 Jan 1970 → long-term $57.20; a stored blank date (\'\') → short-term $57.20 — no longer its answer (FIXED 2026-10-21)', () => {
    const asNull = capGains(pos([{ date: null, shares: 3.25, cost: 2.37 }], { kind: 'options', multiplier: 10 }), 4.13, NOON('2026-10-13'));
    expect(asNull.longGain!).toBeCloseTo(57.2, 9); expect(asNull.shortGain).toBe(0); expect(asNull.totalGain!).toBeCloseTo(57.2, 9);
    const asBlank = capGains(pos([{ date: '', shares: 3.25, cost: 2.37 }], { kind: 'options', multiplier: 10 }), 4.13, NOON('2026-10-13'));
    expect(asBlank.longGain).toBe(0); expect(asBlank.shortGain!).toBeCloseTo(57.2, 9); expect(asBlank.totalGain!).toBeCloseTo(57.2, 9);
  });
  // AGREES — bought 29 Feb 2024, the anniversary is 28 Feb 2025, so 1 Mar 2025 is long-term (Gemini fix, 2026-10-05)
  C('MK-PF-F-006', 'edge', 'Leap purchase after clamped anniversary', () => {
    expect(split(capGains(pos([{ date: '2024-02-29', shares: 10, cost: 100 }]), 110, NOON('2025-03-01')))).toEqual([100, 0, 100]);
  });
});

describe('MK-PF-F-007 totalROI — five cases', () => {
  C('MK-PF-F-007', 'easy', 'One purchase no payout', () => { expect(totalROI(pos([{ shares: 10, cost: 100, date: '2026-01-05' }]), 110)!).toBeCloseTo(0.1, 12); });   // AGREES
  C('MK-PF-F-007', 'easy', 'Single purchase loss', () => { expect(totalROI(pos([{ shares: 10, cost: 100, date: '2026-01-05' }]), 80)!).toBeCloseTo(-0.2, 12); });     // AGREES
  // REVIEWER WRONG: 0.21 is the time-weighted return; this function is the RETURN ON WHAT WAS PAID, which the precision
  // standard and DEC-1669 keep apart by name: "'Return on cost' on one holding answers a different question (am I ahead
  // on what I paid) and keeps that name; it is never called 'return' alone." The Holding page prints it as
  // "Change since purchase ▲ +$320 (+15.24%)" (HoldingDetailScreen.tsx, the "Change since purchase" row). The holding's window return is
  // returnSincePurchases (MK-PF-F-040), time-weighted. Right answer here: 320 ÷ 2,100 = 0.152380952.
  C('MK-PF-F-007', 'complex', 'Staggered purchases differ from cost ratio', () => {
    expect(totalROI(pos([{ shares: 10, cost: 100, date: '2026-09-01' }, { shares: 10, cost: 110, date: '2026-09-02' }]), 121)!).toBeCloseTo(0.21, 12);
  }, true);
  test('· app today (hand-checked): return on what was paid = (20 × $121 − $2,100) ÷ $2,100 = 0.152380952', () => {
    expect(totalROI(pos([{ shares: 10, cost: 100, date: '2026-09-01' }, { shares: 10, cost: 110, date: '2026-09-02' }]), 121)!).toBeCloseTo(320 / 2100, 12);
  });
  // REVIEWER WRONG: the return on what was paid needs no dates — gain $47.85 on $117.35 paid. Same ruling as above.
  C('MK-PF-F-007', 'complex', 'Mini option arithmetic with missing timing', () => {
    refuses(totalROI(pos([{ shares: 1.25, cost: 2.37, date: null }, { shares: 2.75, cost: 3.19, date: null }], { kind: 'options', multiplier: 10 }), 4.13));
  }, true);
  test('· app today (hand-checked): $47.85 ÷ $117.35 = 0.407754580', () => {
    expect(totalROI(pos([{ shares: 1.25, cost: 2.37, date: null }, { shares: 2.75, cost: 3.19, date: null }], { kind: 'options', multiplier: 10 }), 4.13)!).toBeCloseTo(47.85 / 117.35, 12);
  });
  // AGREES on the answer (no figure). Reason differs: the app reads $0 as not on record (IN-FLIGHT, 2026-10-20); at
  // HEAD it read $0 as a figure and refused because the cost is not above zero. Both refuse.
  C('MK-PF-F-007', 'edge', 'Known zero basis cannot support ratio', () => { refuses(totalROI(pos([{ shares: 10, cost: 0, date: '2026-01-05' }]), 100)); });
});

describe('MK-PF-F-008 startDateFor — five cases', () => {
  C('MK-PF-F-008', 'easy', 'Ordinary month back', () => { expect(localISO(startDateFor('1M', AT('2026-10-13T15:17:19')))).toBe('2026-09-13T15:17:19'); });
  C('MK-PF-F-008', 'easy', 'Across year end', () => { expect(localISO(startDateFor('3M', AT('2026-01-15T09:00:00')))).toBe('2025-10-15T09:00:00'); });
  // AGREES — DEC-3768b: the month's last day when the day does not exist there
  C('MK-PF-F-008', 'complex', 'Three-month clamp', () => { expect(localISO(startDateFor('3M', AT('2026-05-31T16:23:41')))).toBe('2026-02-28T16:23:41'); });
  C('MK-PF-F-008', 'complex', 'Leap-year annual clamp', () => { expect(localISO(startDateFor('1Y', AT('2024-02-29T17:43:29')))).toBe('2023-02-28T17:43:29'); });
  // SETTLED (OpenAI: RULE UNCLEAR): "Since" is not a fixed-length window, so startDateFor refuses it (DEC-4640) and the
  // screen hands its first day over: the day after the record's first day, whose value is the beginning (DEC-0315:
  // beginning = the close of the day before the first day; DEC-6412: "the record's own time-weighted return from its
  // first day to today ... the one Since shows"; v17, approved DEC-0647, draws "Since Jun 3, 2024"). OpenAI's "caller
  // override" reading — 2026-05-05 for a record that begins 2026-05-04 — is the one built.
  C('MK-PF-F-008', 'edge', 'Since has no record start handed to date reader', () => {
    expect(startDateFor('SINCE' as Period, NOON('2026-10-13'))).toBeNull();
    expect(windowStartKey('SINCE', ['2026-05-04', '2026-06-01'], '2026-10-13')).toBe('2026-05-05');
  });
});

describe('MK-PF-F-009 latestClose — five cases', () => {
  C('MK-PF-F-009', 'easy', 'Single close', () => { expect(latestClose(S('X', [['2026-09-01', 100]]))).toBe(100); });
  C('MK-PF-F-009', 'easy', 'No prices', () => { refuses(latestClose(S('X', []))); });
  C('MK-PF-F-009', 'complex', 'Unsorted dates', () => { expect(latestClose(S('X', [['2026-09-18', 83.17], ['2026-09-20', 91.43], ['2026-09-19', 87.29]]))).toBe(91.43); });
  // NEEDS A RULING (OpenAI: RULE UNCLEAR, no decision on two closes for one day). The app takes the one listed LATER
  // (latestClose's `>=`), and the feed lists its points in time order (marketData.ts sorts by date, ties keep the
  // feed's order), so today it is the newer quote: $97.31.
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 1): the close written later is the price — the feed writes
  // its points in time order, so of two closes for one day the later one is the newer quote. To reverse: latestClose, `>`.
  C('MK-PF-F-009', 'complex', 'Conflicting latest date', () => {
    expect(latestClose(S('X', [['2026-09-19', 87.29], ['2026-09-20', 91.43], ['2026-09-20', 97.31]]))).toBe(97.31);
  });
  C('MK-PF-F-009', 'edge', 'Malformed date wins lexical sort', () => { expect(latestClose(S('X', [['2026-09-20', 97.31], ['not-a-date', 999]]))).toBe(97.31); });
});

describe('MK-PF-F-010 periodReturn — five cases', () => {
  C('MK-PF-F-010', 'easy', 'One-year price move', () => {
    expect(periodReturn(S('X', [['2025-10-12', 100], ['2026-10-13', 110]]), '1Y', NOON('2026-10-13'))!).toBeCloseTo(0.1, 12);
  });
  // REVIEWER WRONG by a decision of 2026-10-21 (was AGREES) — the 2Y figure is a yearly rate (DEC-0237) and the window's own
  // total, +21%, sits beside it; but ONE RULE makes the yearly rate on every screen (the precision standard, "(1 + the
  // return)^(365 ÷ days) − 1", MK-PF-M-016): 12 Oct 2024 to 13 Oct 2026 is 731 days, so +9.99% a year, as the account reads
  // it — OpenAI's +10.00% is the exponent ½ the holding rows used, the second answer this decision retires.
  C('MK-PF-F-010', 'easy', 'Two-year total versus yearly pace', () => {
    const s = S('X', [['2024-10-12', 100], ['2026-10-13', 121]]);
    expect(periodReturn(s, '2Y', NOON('2026-10-13'))!).toBeCloseTo(0.1, 12);
    expect(periodTotalReturn(s, '2Y', NOON('2026-10-13'))!).toBeCloseTo(0.21, 12);
  }, true);
  test('· app since 2026-10-21 (one rule, MK-PF-M-016): 1.21^(365 ÷ 731) − 1 = +9.99% a year, the window\'s own total +21.00% beside it', () => {
    const s = S('X', [['2024-10-12', 100], ['2026-10-13', 121]]);
    expect(periodReturn(s, '2Y', NOON('2026-10-13'))!).toBeCloseTo(Math.pow(1.21, 365 / 731) - 1, 12);
    expect(periodTotalReturn(s, '2Y', NOON('2026-10-13'))!).toBeCloseTo(0.21, 12);
  });
  // AGREES — DEC-4641: measured from the first price, with the approved sentence beside it
  C('MK-PF-F-010', 'complex', 'Short history of five months', () => {
    const s = S('X', [['2026-05-04', 83.17], ['2026-10-10', 91.43]]);
    expect(periodReturn(s, '1Y', NOON('2026-10-10'))!).toBeCloseTo(0.09931465672718542, 12);
    expect(priceHistoryShortSentence(s.points, '2025-10-10', '1Y', '2026-10-10')).toBe('Prices for this holding go back 5 months, so the 1-year figure covers 5 months — not a year.');
  });
  // REVIEWER WRONG — DECIDED 2026-10-21 (the lead's decision under DEC-3523 tenet 4; was APP WRONG here and REVIEWER WRONG in
  // part 4, MK-PF-F-038/039): the end is the latest close on record, the very price the holding's value is worked from. A
  // close dated after the person's today is the latest price written under its universal-time day (marketData.ts,
  // `toISOString().slice(0, 10)`: a coin priced on a US evening), never a future price; dropping it would show a return to
  // an older price than the value beside it. The window's START is the person's own day (closeAsOf, 2026-10-21).
  C('MK-PF-F-010', 'complex', 'As-of endpoint excludes future point', () => {
    expect(periodReturn(S('X', [['2025-10-12', 83.17], ['2026-10-13', 91.43], ['2026-10-14', 97.31]]), '1Y', NOON('2026-10-13'))!).toBeCloseTo(0.09931465672718542, 12);
  }, true);
  test('· app today: ends at the 14 Oct close, $97.31 ÷ $83.17 − 1 = +17.00%', () => {
    expect(periodReturn(S('X', [['2025-10-12', 83.17], ['2026-10-13', 91.43], ['2026-10-14', 97.31]]), '1Y', NOON('2026-10-13'))!).toBeCloseTo(97.31 / 83.17 - 1, 12);
  });
  // AGREES — DEC-4640: a window name the app does not have gives no figure
  C('MK-PF-F-010', 'edge', 'Unknown 5Y name', () => { refuses(periodReturn(S('X', [['2025-10-12', 100], ['2026-10-13', 110]]), '5Y' as Period, NOON('2026-10-13'))); });
});

describe('MK-PF-F-011 periodReturnSince — five cases', () => {
  C('MK-PF-F-011', 'easy', 'Explicit dated start', () => {
    expect(periodReturnSince(S('X', [['2026-09-01', 100], ['2026-09-30', 110]]), '2026-09-01', NOON('2026-09-30'))!).toBeCloseTo(0.1, 12);
  });
  // AGREES — DEC-4641 first-price fallback
  C('MK-PF-F-011', 'easy', 'No earlier price uses first available', () => {
    expect(periodReturnSince(S('X', [['2026-05-04', 100], ['2026-09-30', 105]]), '2026-01-01', NOON('2026-09-30'))!).toBeCloseTo(0.05, 12);
  });
  C('MK-PF-F-011', 'complex', 'Unsmooth prices and explicit start', () => {
    expect(periodReturnSince(S('X', [['2026-05-15', 83.17], ['2026-05-18', 87.29], ['2026-09-19', 97.31]]), '2026-05-17', NOON('2026-09-19'))!).toBeCloseTo(0.17001322592280865, 12);
  });
  // REVIEWER WRONG — DECIDED 2026-10-21, as MK-PF-F-010 above: the end is the latest close on record, the price the value uses
  C('MK-PF-F-011', 'complex', 'Future point must not be used', () => {
    expect(periodReturnSince(S('X', [['2026-05-15', 83.17], ['2026-09-19', 97.31], ['2026-09-20', 101.23]]), '2026-05-17', NOON('2026-09-19'))!).toBeCloseTo(0.17001322592280865, 12);
  }, true);
  test('· app today: $101.23 ÷ $83.17 − 1 = +21.71%', () => {
    expect(periodReturnSince(S('X', [['2026-05-15', 83.17], ['2026-09-19', 97.31], ['2026-09-20', 101.23]]), '2026-05-17', NOON('2026-09-19'))!).toBeCloseTo(101.23 / 83.17 - 1, 12);
  });
  // APP WRONG (DEC-3523 tenet 3: a window that has not begun has no move to state; +0.00% reads as "no change"). Reach:
  // the holding editor's purchase date has no latest day (PerformanceScreen.tsx, the lot's DateField has no maximumDate), so a purchase dated after today
  // caps the row there and the market "same dates" reads +0.00% (proof below, MK-PF-F-012).
  // FIXED 2026-10-21 (DEC-3523 tenet 3): a start after the person's today is no figure
  C('MK-PF-F-011', 'edge', 'Start later than now', () => {
    refuses(periodReturnSince(S('X', [['2026-10-12', 100], ['2026-10-13', 110]]), '2026-11-01', NOON('2026-10-13')));
  }, false, 'fixed 2026-10-21: a window that has not begun has no move to state (DEC-3523 tenet 3)');
  test.failing('· app until 2026-10-21: 0 (+0.00%) — the latest close divided by itself — no longer its answer (FIXED 2026-10-21)', () => {
    expect(periodReturnSince(S('X', [['2026-10-12', 100], ['2026-10-13', 110]]), '2026-11-01', NOON('2026-10-13'))).toBe(0);
  });
});

describe('MK-PF-F-012 earliestPurchaseDate — five cases', () => {
  const lotsOf = (xs: { date: any; shares: number }[]) => pos(xs.map((x) => ({ shares: x.shares, cost: 1, date: x.date })));
  C('MK-PF-F-012', 'easy', 'One purchase date', () => { expect(earliestPurchaseDate(lotsOf([{ date: '2026-01-02', shares: 10 }]))).toBe('2026-01-02'); });
  C('MK-PF-F-012', 'easy', 'No dates', () => { refuses(earliestPurchaseDate(lotsOf([{ date: null, shares: 10 }]))); });
  C('MK-PF-F-012', 'complex', 'Unsorted genuine purchases', () => {
    expect(earliestPurchaseDate(lotsOf([{ date: '2026-05-19', shares: 7.25 }, { date: '2024-03-11', shares: 3.125 }, { date: '2025-07-09', shares: 2.5 }]))).toBe('2024-03-11');
  });
  // APP WRONG (DEC-1669: "a period that starts with nothing starts at the first deposit"; tenet 4: every other reader of
  // a holding's purchases — costBasis, capGains, paidOnRecord, returnSincePurchases — passes over a lot of 0 shares).
  // Reach: low — a sale removes an emptied lot (src/domain/transactions/index.ts, removeShares keeps lots above 0) and the editor drops 0-share lots
  // (PerformanceScreen.tsx, the editor saves only lots with shares > 0); an imported value-only line is stored with 0 shares (src/domain/import/holdingsImport.ts, `shares: shares > 0 ? shares : 0`).
  // FIXED 2026-10-21 (DEC-1669, tenet 4): a lot of 0 shares is no purchase, here as in every other reader of a holding's purchases
  C('MK-PF-F-012', 'complex', 'Zero lot precedes actual purchase', () => {
    expect(earliestPurchaseDate(lotsOf([{ date: '2024-03-11', shares: 0 }, { date: '2026-05-19', shares: 7.25 }, { date: '2026-07-09', shares: 3.125 }]))).toBe('2026-05-19');
  }, false, 'fixed 2026-10-21: a lot of 0 shares is no purchase (DEC-1669, tenet 4)');
  test.failing('· app until 2026-10-21: 2024-03-11, the lot of 0 shares — no longer its answer (FIXED 2026-10-21)', () => {
    expect(earliestPurchaseDate(lotsOf([{ date: '2024-03-11', shares: 0 }, { date: '2026-05-19', shares: 7.25 }, { date: '2026-07-09', shares: 3.125 }]))).toBe('2024-03-11');
  });
  // DECIDED 2026-10-21 (the lead's decision under DEC-3523 tenet 3; was NEEDS A RULING): no ruling says when a holding with
  // one undated purchase began, and the undated one may be the first — so the day it began is not on record. The window
  // still counts it as bought inside from its first dated purchase, and its return since purchase refuses (MK-PF-F-040),
  // with the Holding page's reason. Proof of what that does to the row is below. To reverse: earliestPurchaseDate reads
  // the dated purchases only, and purchasePieces puts an undated one on the first day again.
  C('MK-PF-F-012', 'edge', 'One missing date before known dates is possible', () => {
    refuses(earliestPurchaseDate(lotsOf([{ date: null, shares: 10 }, { date: '2026-05-19', shares: 7 }])));
  }, false, 'decided 2026-10-21: the day a holding with an undated purchase began is not on record (DEC-3523 tenet 3)');
  test.failing('· app until 2026-10-21: 2026-05-19, the one dated purchase — no longer its answer (DECIDED 2026-10-21)', () => {
    expect(earliestPurchaseDate(lotsOf([{ date: null, shares: 10 }, { date: '2026-05-19', shares: 7 }]))).toBe('2026-05-19');
  });
});

describe('MK-PF-F-013 benchmarkTicker — five cases', () => {
  C('MK-PF-F-013', 'easy', 'Recognized stock', () => { expect(benchmarkTicker({ kind: 'stocks_etf' })).toBe('SPY'); });
  // AGREES — the person's class decides (DEC-3523 tenet 5; DEC-0309)
  C('MK-PF-F-013', 'easy', 'Confirmed bond class outranks stock kind', () => { expect(benchmarkTicker({ kind: 'stocks_etf', asset_class: 'bond', class_source: 'user' })).toBe('AGG'); });
  C('MK-PF-F-013', 'complex', 'Crypto in a stock-class choice', () => { expect(benchmarkTicker({ kind: 'crypto', asset_class: 'stock_etf', class_source: 'user' })).toBe('SPY'); });
  // SETTLED by his ruling of 2026-10-20, "always the class broker sends" (DEC-2159 re-ruled; IN-FLIGHT, being landed by
  // the Net worth agents) — and so APP WRONG: the class reader now files this holding under Bonds & CDs, but the
  // yardstick still follows the wrapper kind (401(k) → AOR, a 60/40 mix), because benchmarkTicker lets only a class the
  // PERSON set outrank a kind. One holding, two answers to "what is it" (tenet 4). Re-run after the broker-class work lands.
  // FIXED 2026-10-21 (DEC-6614 "always the class broker sends", tenet 4): the yardstick reads the broker's class the way the
  // class reader does — after the person's own class, before the wrapper kind. The app's answer until then is kept, failing.
  C('MK-PF-F-013', 'complex', 'Broker-classified bond in retirement wrapper', () => {
    expect(benchmarkTicker(pos([], { kind: '401k', asset_class: 'bond', broker_type: 'bnd' }))).toBe('AGG');
  }, false, 'fixed 2026-10-21: the yardstick follows the class the broker sends (DEC-6614, tenet 4)');
  test('· one holding, one answer (DEC-6614, 2026-10-21): class reader Bonds & CDs, yardstick AGG; a fund the broker sends as an ETF is Stocks / Funds on both; the person\'s own class still wins', () => {
    const p = pos([], { kind: '401k', asset_class: 'bond', broker_type: 'bnd', ticker: 'BNDX' });
    expect([holdingClassOf(p), benchmarkTicker(p)]).toEqual(['bonds', 'AGG']);
    const etf = pos([], { kind: '401k', broker_type: 'et', ticker: 'VTI' });
    expect([holdingClassOf(etf), benchmarkTicker(etf)]).toEqual(['stocks_etf', 'SPY']);
    const mine = pos([], { kind: 'stocks_etf', asset_class: 'bond', class_source: 'user', broker_type: 'cs', ticker: 'XYZ' });
    expect(benchmarkTicker(mine)).toBe('AGG');
    expect(benchmarkTicker(pos([], { kind: '401k', ticker: 'FUND' }))).toBe('AOR');   // nothing sent by a broker: the kind, as before
  });
  test.failing('· app until 2026-10-21 (IN-FLIGHT): class reader says Bonds & CDs, yardstick says AOR — no longer its answer (FIXED 2026-10-21)', () => {
    const p = pos([], { kind: '401k', asset_class: 'bond', broker_type: 'bnd', ticker: 'BNDX' });
    expect(holdingClassOf(p)).toBe('bonds');
    expect(benchmarkTicker(p)).toBe('AOR');
  });
  // AGREES — DEC-2160: nothing says what it is, no yardstick
  C('MK-PF-F-013', 'edge', 'No classification', () => { refuses(benchmarkTicker({ kind: null as any, asset_class: null as any })); });
});

describe('MK-PF-F-014 buildPerformance — five cases', () => {
  const lookup = (m: Record<string, PriceSeries | null>) => (t: string) => m[t] ?? null;
  // AGREES
  C('MK-PF-F-014', 'easy', 'One stock held before window', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2024-01-02' }], { kind: 'stocks_etf', ticker: 'A' })],
      lookup({ A: S('A', [['2025-10-12', 100], ['2026-10-13', 110]]), SPY: S('SPY', [['2025-10-12', 100], ['2026-10-13', 105]]) }), '1Y', NOON('2026-10-13'));
    expect([r.price, r.marketValue, r.costBasis, r.gain]).toEqual([110, 1100, 1000, 100]);
    expect(r.totalROI!).toBeCloseTo(0.1, 12);
    expect(r.periodReturn!).toBeCloseTo(0.1, 12); expect(r.periodTotal!).toBeCloseTo(0.1, 12);
    expect(r.benchReturn!).toBeCloseTo(0.05, 12); expect(r.benchTotal!).toBeCloseTo(0.05, 12);
    expect(r.beatBy!).toBeCloseTo(0.05, 12);
    expect(r.cappedSince).toBeNull();
  });
  // AGREES — no price: no value, no gain, no return; what was paid is still known (tenet 3)
  C('MK-PF-F-014', 'easy', 'Unknown price leaves monetary facts unknown', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2024-01-02' }], { ticker: 'A' })], lookup({ A: S('A', []) }), '1Y', NOON('2026-10-13'));
    expect([r.price, r.marketValue, r.costBasis, r.gain, r.periodReturn, r.periodTotal]).toEqual([null, null, 1000, null, null, null]);
  });
  // AGREES
  C('MK-PF-F-014', 'complex', 'Two holdings share dates and rows reconcile', () => {
    const rows = buildPerformance([
      pos([{ shares: 7.25, cost: 83.17, date: '2024-03-11' }], { kind: 'stocks_etf', ticker: 'A' }),
      pos([{ shares: 3.125, cost: 91.43, date: '2024-05-19' }], { kind: 'fixed_income', ticker: 'B' }),
    ], lookup({
      A: S('A', [['2025-10-12', 83.17], ['2026-10-13', 97.31]]), B: S('B', [['2025-10-12', 91.43], ['2026-10-13', 87.29]]),
      SPY: S('SPY', [['2025-10-12', 100], ['2026-10-13', 108.31]]), AGG: S('AGG', [['2025-10-12', 100], ['2026-10-13', 102.73]]),
    }), '1Y', NOON('2026-10-13'));
    const [a, b] = rows;
    expect([a.benchTicker, b.benchTicker]).toEqual(['SPY', 'AGG']);
    expect(a.marketValue!).toBeCloseTo(705.4975, 9); expect(a.costBasis!).toBeCloseTo(602.9825, 9); expect(a.gain!).toBeCloseTo(102.515, 9);
    expect(a.periodTotal!).toBeCloseTo(0.17001322592280865, 12); expect(a.benchTotal!).toBeCloseTo(0.0831, 12);
    expect(b.marketValue!).toBeCloseTo(272.78125, 9); expect(b.costBasis!).toBeCloseTo(285.71875, 9); expect(b.gain!).toBeCloseTo(-12.9375, 9);
    expect(b.periodTotal!).toBeCloseTo(-0.04528054249152358, 12); expect(b.benchTotal!).toBeCloseTo(0.0273, 12);
    expect(rows.reduce((t, r) => t + (r.marketValue as number), 0)).toBeCloseTo(978.27875, 9);
  });
  // APP WRONG (DEC-4439, his "approved." of 2026-10-11: money that arrives on a day counts for that whole day — the day's
  // growth is the evening value ÷ (previous evening's value + money added) − 1; DEC-1669: every return is time-weighted).
  // returnSincePurchases (MK-PF-F-040) ends the first piece at the PURCHASE DAY's close ($121), so the old 10 shares are
  // credited with 2 Sep's rise before the new money arrives: 1.21 × 2,420 ÷ 2,310 − 1 = +26.76%. By DEC-4439 the piece
  // ends at the evening before ($100): 2,420 ÷ (1,000 + 1,100) − 1 = +15.24% — what the account's own daily record says
  // for the same money.
  // FIXED 2026-10-21 (DEC-4439): the piece before a purchase ends at the previous evening's close — +15.24%
  C('MK-PF-F-014', 'complex', 'Inside-window morning purchase TWR', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2026-09-01' }, { shares: 10, cost: 110, date: '2026-09-02' }], { kind: 'stocks_etf', ticker: 'X' })],
      lookup({ X: S('X', [['2026-09-01', 100], ['2026-09-02', 121], ['2026-09-03', 121]]), SPY: S('SPY', [['2026-09-01', 100], ['2026-09-03', 110]]) }), '1M', NOON('2026-09-03'));
    expect([r.marketValue, r.costBasis, r.gain, r.cappedSince]).toEqual([2420, 2100, 320, '2026-09-01']);
    expect(r.benchReturn!).toBeCloseTo(0.1, 12);
    expect(r.periodReturn!).toBeCloseTo(0.15238095238095228, 12);
    expect(r.periodTotal!).toBeCloseTo(0.15238095238095228, 12);
    expect(r.beatBy!).toBeCloseTo(0.05238095238095228, 12);
  }, false, 'fixed 2026-10-21: a purchase counts from the start of its day (DEC-4439, tenet 4)');
  test.failing('· app until 2026-10-21: +26.76% your return, +10.00% the market, ahead by 16.76 points — no longer its answer (FIXED 2026-10-21)', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2026-09-01' }, { shares: 10, cost: 110, date: '2026-09-02' }], { kind: 'stocks_etf', ticker: 'X' })],
      lookup({ X: S('X', [['2026-09-01', 100], ['2026-09-02', 121], ['2026-09-03', 121]]), SPY: S('SPY', [['2026-09-01', 100], ['2026-09-03', 110]]) }), '1M', NOON('2026-09-03'));
    expect([r.marketValue, r.costBasis, r.gain, r.cappedSince]).toEqual([2420, 2100, 320, '2026-09-01']);
    expect(r.periodReturn!).toBeCloseTo(1.21 * 2420 / 2310 - 1, 12);
    expect(r.beatBy!).toBeCloseTo(1.21 * 2420 / 2310 - 1 - 0.1, 12);
  });
  // AGREES — DEC-4640: every window figure is unknown; the dollar facts still stand
  C('MK-PF-F-014', 'edge', 'Unknown period refuses every window field', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100 }], { ticker: 'X' })], lookup({ X: S('X', [['2026-10-13', 110]]) }), '5Y' as Period, NOON('2026-10-13'));
    expect([r.marketValue, r.costBasis, r.gain]).toEqual([1100, 1000, 100]);
    expect([r.periodReturn, r.periodTotal, r.benchReturn, r.benchTotal, r.beatBy, r.cappedSince]).toEqual([null, null, null, null, null, null]);
  });
});

/* THE CODE FACTS BEHIND THE FORMULA-CHECK AND STILL-OPEN CLASSIFICATIONS — each measured, not reasoned. */
describe('formula checks — what the code does, measured', () => {
  test('MK-PF-F-002 / F-006 (IN-FLIGHT): one $0 lot read two ways — costBasis counts $0, paidOnRecord leaves the lot out', () => {
    const p = pos([{ shares: 10, cost: 100, date: '2024-01-02' }, { shares: 10, cost: 0, date: '2024-01-02' }]);
    expect(costBasis(p)).toBe(1000);                                            // $1,000 for 20 shares ($0 counted)
    expect(paidOnRecord(p)).toEqual({ paid: 1000, counted: 10, held: 20 });      // $1,000 for 10 of 20 shares
    expect(unrealizedGain(p, 120)).toBe(200);                                    // the gain on 10 shares, not 20 × 120 − 1,000 = $1,400
  });
  // DECIDED 2026-10-21 (the lead's decision under the precision standard and tenet 4; was NEEDS A RULING): one rule, days ÷ 365
  test('MK-PF-F-010 (DECIDED 2026-10-21, one rule): one 2Y move of +21.00%, one yearly rate — holding row and Performance total both +9.99% (731 days ÷ 365)', () => {
    const s = S('X', [['2024-10-12', 100], ['2026-10-13', 121]]);
    const holdingRow = periodReturn(s, '2Y', NOON('2026-10-13'))!;
    const days = windowBounds(windowStartKey('2Y', [], '2026-10-13')!, '2026-10-13').days;   // thePerformance: years = days ÷ 365, perYear
    const orchestrator = Math.pow(1.21, 1 / (days / 365)) - 1;
    expect(days).toBe(731);
    expect(holdingRow).toBeCloseTo(orchestrator, 12);
    expect((holdingRow * 100).toFixed(2)).toBe('9.99');
  });
  test.failing('MK-PF-F-010, until 2026-10-21: the holding row read +10.00% (exponent ½) beside the total\'s +9.99% — no longer its answer', () => {
    expect((periodReturn(S('X', [['2024-10-12', 100], ['2026-10-13', 121]]), '2Y', NOON('2026-10-13'))! * 100).toFixed(2)).toBe('10.00');
  });
  test('MK-PF-F-011 (NEEDS A RULING): a purchase 18 months back under the 2Y chip is shown as the total, never a yearly rate', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2025-04-13' }], { kind: 'stocks_etf', ticker: 'X' })],
      (t) => (t === 'X' ? S('X', [['2024-10-12', 90], ['2025-04-13', 100], ['2026-10-13', 121]]) : S('SPY', [['2024-10-12', 100], ['2026-10-13', 120]])), '2Y', NOON('2026-10-13'));
    expect(r.cappedSince).toBe('2025-04-13');
    expect(r.periodReturn!).toBeCloseTo(0.21, 12);   // 18 months' total; no "a year"
    expect(r.periodTotal!).toBeCloseTo(0.21, 12);
  });
  // FIXED 2026-10-21 for the market (MK-PF-F-011, tenet 3): a window that has not begun has no market figure — no +0.00%.
  // The purchase date itself can no longer be typed after today (the editor's picker stops at today, DEC-6824's day).
  test('MK-PF-F-011 / F-012 (FIXED 2026-10-21, reach): a purchase dated after today caps the row there and the market "same dates" has no figure', () => {
    const [r] = buildPerformance([pos([{ shares: 10, cost: 100, date: '2027-01-05' }], { kind: 'stocks_etf', ticker: 'X' })],
      (t) => (t === 'X' ? S('X', [['2025-10-12', 90], ['2026-10-13', 110]]) : S('SPY', [['2025-10-12', 100], ['2026-10-13', 108]])), '1Y', NOON('2026-10-13'));
    expect(r.cappedSince).toBe('2027-01-05');
    expect(r.benchReturn).toBeNull();               // was 0, +0.00%
    expect(r.beatBy).toBeNull();
    expect(r.periodReturn!).toBeCloseTo(0.1, 12);   // the return on what was paid, under "since purchase"
  });
  // DECIDED 2026-10-21 (tenet 3; MK-PF-F-012 and MK-PF-F-040): the undated purchase is never put on a guessed day — the row
  // is still counted as bought inside the window from 19 May (its dollars stand: value, paid, gain), its return since purchase
  // is not known, and the row says why (undatedPurchase → the Holding page's sentence)
  const undatedRow = () => buildPerformance([pos([{ shares: 10, cost: 80, date: null }, { shares: 7, cost: 83.17, date: '2026-05-19' }], { kind: 'stocks_etf', ticker: 'X' })],
    (t) => (t === 'X' ? S('X', [['2025-10-12', 80], ['2026-05-19', 83.17], ['2026-10-13', 97.31]]) : S('SPY', [['2025-10-12', 100], ['2026-05-19', 104], ['2026-10-13', 110]])), '1Y', NOON('2026-10-13'))[0];
  test('MK-PF-F-012 (DECIDED 2026-10-21): one undated purchase beside a dated one — no return since purchase, the reason carried on the row, the dollars kept', () => {
    // 10 shares with no date (paid $80) and 7 bought 19 May 2026 at $83.17; price $97.31 today; 1Y window
    const r = undatedRow();
    expect(r.cappedSince).toBe('2026-05-19');
    expect([r.periodReturn, r.periodTotal, r.beatBy, r.undatedPurchase]).toEqual([null, null, null, true]);
    expect(r.marketValue!).toBeCloseTo(17 * 97.31, 9); expect(r.costBasis!).toBeCloseTo(800 + 7 * 83.17, 9);
  });
  test.failing('MK-PF-F-012, until 2026-10-21: the undated purchase was put on the dated purchase\'s day at its own price paid (+19.69%) — no longer its answer', () => {
    expect(undatedRow().periodReturn!).toBeCloseTo((17 * 97.31) / (800 + 7 * 83.17) - 1, 12);
  });
  // FIXED 2026-10-21 (DEC-1669, tenet 4): the lot of 0 shares no longer moves the row — with it and without it, one answer
  const zeroLotSeries = (t: string) => (t === 'X' ? S('X', [['2025-10-12', 80], ['2026-05-19', 83.17], ['2026-07-08', 91.43], ['2026-07-09', 91.43], ['2026-10-13', 97.31]]) : S('SPY', [['2025-10-12', 100], ['2026-05-19', 104], ['2026-10-13', 110]]));
  const realLots = [{ shares: 7.25, cost: 83.17, date: '2026-05-19' }, { shares: 3.125, cost: 91.43, date: '2026-07-09' }];
  test('MK-PF-F-012 (FIXED 2026-10-21, the row it moves): a lot of 0 shares dated 2024 no longer keeps a holding bought in May 2026 measured over the whole year', () => {
    const [withZero] = buildPerformance([pos([{ shares: 0, cost: 80, date: '2024-03-11' }, ...realLots], { kind: 'stocks_etf', ticker: 'X' })], zeroLotSeries, '1Y', NOON('2026-10-13'));
    const [without] = buildPerformance([pos(realLots, { kind: 'stocks_etf', ticker: 'X' })], zeroLotSeries, '1Y', NOON('2026-10-13'));
    for (const r of [withZero, without]) {
      expect(r.cappedSince).toBe('2026-05-19');
      // 7.25 bought 19 May at $83.17; the piece ends at the evening before 9 Jul, $91.43 (DEC-4439); 3.125 more at $91.43; $97.31 today
      expect(r.periodReturn!).toBeCloseTo((7.25 * 91.43) / (7.25 * 83.17) * (10.375 * 97.31) / (7.25 * 91.43 + 3.125 * 91.43) - 1, 12);   // +17.00%
    }
  });
  test.failing('MK-PF-F-012, until 2026-10-21: with the lot of 0 shares the row was not capped — +21.64% over a year the money was not there — no longer its answer', () => {
    const [before] = buildPerformance([pos([{ shares: 0, cost: 80, date: '2024-03-11' }, ...realLots], { kind: 'stocks_etf', ticker: 'X' })], zeroLotSeries, '1Y', NOON('2026-10-13'));
    expect(before.cappedSince).toBeNull();
    expect(before.periodReturn!).toBeCloseTo(97.31 / 80 - 1, 12);
  });
  // DECIDED 2026-10-21 (PF-B, the lead's decision under tenet 6): a holding that IS described (a kind or a class) but names
  // no yardstick of its own is set beside the stock market, as the approved Holding page drawing names its comparison
  // ("VS THE STOCK MARKET · SAME DATES", holding-detail v02) — said on screen, so not a hidden default. Only a holding
  // nothing describes has none (DEC-2160). To reverse: benchmarkTicker, return null in place of 'SPY' on its last line.
  test('MK-PF-F-013 (DECIDED 2026-10-21, tenet 6 — the drawing names the stock market): a kind that names no yardstick is set beside the stock market', () => {
    expect(benchmarkTicker({ kind: 'mystery_kind' })).toBe('SPY');
    expect(benchmarkTicker({ asset_class: 'other' })).toBe('SPY');
  });
});

describe('coverage — every item of part 2 is run or classified here', () => {
  const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  test('65 of 65 cases, one test each, none extra', () => {
    expect(src.cases.length).toBe(65);
    const want: string[] = src.cases.map((c: any) => keyOf(c.id, c.kind, c.title));
    expect(RAN.length).toBeGreaterThanOrEqual(65);
    expect(want.filter((w) => !RAN.includes(w))).toEqual([]);
    expect(RAN.filter((r) => !want.includes(r))).toEqual([]);
    expect(new Set(RAN).size).toBe(RAN.length);
  });
  test('13 formula checks and 9 still-open points — every id is one of the 13 cards run above', () => {
    const cards = new Set(src.cases.map((c: any) => c.id));
    expect(src.formula_checks.length).toBe(13);
    expect(src.formula_checks.every((f: any) => cards.has(f.id))).toBe(true);
    expect(src.still_open.length).toBe(9);
    const openIds = src.still_open.map((s: string) => s.slice(0, 11));
    expect(openIds.every((id: string) => cards.has(id))).toBe(true);
    expect(src.formula_checks.filter((f: any) => f.verdict !== 'RIGHT').map((f: any) => f.id).sort()).toEqual([...openIds].sort());
  });
  test('nothing else to run: rules_held, screen_checks and could_not_test are empty; ready_to_close is false', () => {
    expect([src.rules_held.length, src.screen_checks.length, src.could_not_test.length]).toEqual([0, 0, 0]);
    expect(src.ready_to_close).toBe(false);
  });
});
