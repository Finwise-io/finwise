/** DEC-5068 (owner, 2026-10-13): "Wealth Generated and Return should be calculated and displayed for every asset with
 *  history. Below it display "Wealth Generated and Return does not include treasury gains as no price history
 *  available."" It replaces part (2) of DEC-3656 (2026-10-09), which refused the whole beginning, wealth generated and
 *  walk when any holding had no price history. Part (1) of DEC-3656 — a CD gains by its stated rate — stands.
 *
 *  Only where the daily record does NOT reach back to the window's first day, so the beginning is worked back from
 *  today. Functions: MK-NW-O-008 thePerformance, MK-NW-F-130 notIncludedSentence, knownHoldingsReturn, MK-NW-F-091
 *  pricedGainOf. Figures: MK-PF-M-002 / MK-PF-M-014 wealth generated, MK-PF-M-016 / MK-PF-M-017 return.
 *
 *  THE EXAMPLE, worked by hand. An account of $50,000 = VTI $40,000 (its own return over the past year +10%) +
 *  Treasury 2031 $10,000 typed by hand (no price history), no money moved, no daily record:
 *    VTI gained 40,000 × (1 − 1 ÷ 1.10)       = $3,636.3636…
 *    Treasury 2031 adds no gain (value taken as unchanged)
 *    beginning = 50,000 − 3,636.36 − 0 + 0     = $46,363.6363…
 *    Wealth generated                           = $3,636.36  → shown $3,636
 *    Return = 40,000 ÷ (40,000 ÷ 1.10) − 1      = +10.00%   (VTI only — the Treasury is left out, never 0%)
 *    sentence: "Wealth generated and Return do not include Treasury 2031's gains, as it has no price history."
 */
import { thePerformance, knownHoldingsReturn } from './performance';

const TODAY = '2026-10-13';
const YEAR_AGO = '2025-10-14';   // 2025-10-14 → 2026-10-13, both days counted = 365 days = one year

const VTI = { position: { ticker: 'VTI' }, marketValue: 40000, periodReturn: 0.10 };
const TREASURY = { position: { ticker: '912810TM0', label: 'Treasury 2031', lots: [{ shares: 10000 }], value_now: 10000 }, periodReturn: null };
const MUNI = { position: { ticker: '13063DMT2', label: 'Muni 2029', lots: [{ shares: 5000 }], value_now: 5000 }, periodReturn: null };
const account = (balance: number) => ({ asset_id: 'a', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', asset_class: 'stocks_etf', balance, positions: [{}, {}] });
const ask = (holdings: any[], balance = 50000, over: Record<string, any> = {}) => thePerformance({
  windowStart: YEAR_AGO, windowLabel: 'past year', today: TODAY,
  transactions: [], snapshotDays: [], investmentAccountIds: new Set(['a']),
  accounts: [account(balance)], holdings, ...over,
});

describe('MK-NW-O-008 thePerformance — the beginning worked back, a holding with no price history (DEC-5068, 2026-10-13)', () => {
  test('THE EXAMPLE: $50,000 = VTI $40,000 (+10%) + Treasury 2031 $10,000 → Wealth generated $3,636.36, Return +10.00%, the sentence', () => {
    const f = ask([VTI, TREASURY]);
    expect(f.measured).toBeNull();                                   // the record does not reach back: worked back
    expect(f.walk).not.toBeNull();
    expect(f.walk!.ending).toBe(50000);
    expect(f.walk!.wealthGenerated).toBeCloseTo(40000 * (1 - 1 / 1.1), 9);
    expect(f.walk!.wealthGenerated).toBeCloseTo(3636.3636, 4);
    expect(f.walk!.beginning).toBeCloseTo(46363.6364, 4);
    expect(f.walk!.contributions).toBe(0);
    expect(f.walk!.withdrawals).toBe(0);
    expect(f.ret!).toBeCloseTo(0.10, 12);
    expect(f.cumulative!).toBeCloseTo(0.10, 12);
    expect(f.perYear).toBeNull();                                    // a year or less is never a yearly rate
    expect(f.notIncluded).toBe("Wealth generated and Return do not include Treasury 2031's gains, as it has no price history.");
    expect(f.sentence).toBe('');                                     // nothing refused
    expect(f.covered).toBe(false);                                   // still: the record does not reach back
  });

  test('two holdings with no history: "the gains of … and …, as they have"', () => {
    const f = ask([VTI, TREASURY, MUNI], 55000);
    expect(f.walk!.wealthGenerated).toBeCloseTo(3636.3636, 4);      // only VTI's gain
    expect(f.walk!.beginning).toBeCloseTo(55000 - 3636.3636, 4);
    expect(f.ret!).toBeCloseTo(0.10, 12);
    expect(f.notIncluded).toBe('Wealth generated and Return do not include the gains of Treasury 2031 and Muni 2029, as they have no price history.');
  });

  test('NO holding with a history: Wealth generated $0 and the walk stand, Return stays — (never 0%), the sentence names it', () => {
    const f = ask([TREASURY], 10000);
    expect(f.walk!.beginning).toBe(10000);
    expect(f.walk!.wealthGenerated).toBe(0);
    expect(f.ret).toBeNull();
    expect(f.notIncluded).toBe("Wealth generated and Return do not include Treasury 2031's gains, as it has no price history.");
  });

  test('every holding has a history: the Return is now shown (it was —), and nothing is named', () => {
    const f = ask([VTI], 40000);
    expect(f.walk!.beginning).toBeCloseTo(40000 / 1.1, 9);
    expect(f.ret!).toBeCloseTo(0.10, 12);
    expect(f.notIncluded).toBe('');
  });

  test('a CD stating its rate counts by its rate (DEC-3656 part 1): VTI $40,000 +10% and a CD account is asked on its own', () => {
    // the CD account alone, $10,500 at 5% for one year: gained $500, its return +5.00%
    const cd = thePerformance({
      windowStart: YEAR_AGO, windowLabel: 'past year', today: TODAY, transactions: [], snapshotDays: [],
      investmentAccountIds: new Set(['c']), holdings: [],
      accounts: [{ asset_id: 'c', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', balance: 10500, coupon_rate: 0.05 }],
    });
    expect(cd.walk!.wealthGenerated).toBeCloseTo(500, 9);
    expect(cd.ret!).toBeCloseTo(0.05, 12);
    expect(cd.notIncluded).toBe('');
  });

  test('unchanged · where the record reaches back, Return is the measured time-weighted return of the account (DEC-4439)', () => {
    const day = { date: '2025-10-13', origin: 'observed', writtenAt: '2025-10-13T00:00:00Z', holdings: [],
      accounts: [{ date: '2025-10-13', accountId: 'a', cash: 0, statedTotal: null, typedValue: 40000, currency: 'USD' }] };
    // today's value recorded from the account's balance (a balance-only account, so today reads its $50,000)
    const f = ask([VTI, TREASURY], 50000, { snapshotDays: [day], accounts: [{ ...account(50000), positions: [] }] });
    expect(f.measured).toBe(40000);
    expect(f.walk!.beginning).toBe(40000);
    expect(f.ret!).toBeCloseTo(50000 / 40000 - 1, 12);              // +25.00%, read from the record, not the holdings
    expect(f.notIncluded).toBe('');
  });

  test('unchanged · a record that begins too late still draws no walk (DEC-3035i)', () => {
    const late = { date: '2026-06-01', origin: 'observed', writtenAt: '2026-06-01T00:00:00Z', holdings: [],
      accounts: [{ date: '2026-06-01', accountId: 'a', cash: 0, statedTotal: null, typedValue: 48000, currency: 'USD' }] };
    const f = ask([VTI, TREASURY], 50000, { snapshotDays: [late] });
    expect(f.walk).toBeNull();
    expect(f.ret).toBeNull();
    expect(f.notIncluded).toBe('');
    expect(f.sentence).toMatch(/^The record begins /);
  });
});

describe('knownHoldingsReturn — the return of the holdings with a history (DEC-5068)', () => {
  test('one holding: its own return', () => {
    expect(knownHoldingsReturn([VTI as any], 1)!).toBeCloseTo(0.10, 12);
  });
  test('weighed by what each was worth when the window began: $12,000 at +20% and $10,000 at 0% → +10.00%', () => {
    // starts 10,000 + 10,000 = 20,000; now 22,000 → 22,000 ÷ 20,000 − 1 = 0.10 (today's weights would read +10.91%)
    expect(knownHoldingsReturn([{ marketValue: 12000, periodReturn: 0.2 }, { marketValue: 10000, periodReturn: 0 }], 1)!).toBeCloseTo(0.10, 12);
  });
  test('a holding with no history is left out, never counted at 0%', () => {
    expect(knownHoldingsReturn([VTI as any, TREASURY as any], 1)!).toBeCloseTo(0.10, 12);
  });
  test('none with a history → null', () => {
    expect(knownHoldingsReturn([TREASURY as any], 1)).toBeNull();
    expect(knownHoldingsReturn([], 1)).toBeNull();
  });
  test('a CD stating 5% over one year: +5.00%; a −100% holding has no start and is left out', () => {
    expect(knownHoldingsReturn([{ marketValue: 10500, periodReturn: null, couponRate: 0.05 }], 1)!).toBeCloseTo(0.05, 12);
    expect(knownHoldingsReturn([{ marketValue: 1100, periodReturn: 0.1 }, { marketValue: 5, periodReturn: -1 }], 1)!).toBeCloseTo(0.10, 12);
  });
});
