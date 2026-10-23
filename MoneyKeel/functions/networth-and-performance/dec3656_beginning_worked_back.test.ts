/** DEC-3656 (founder, 2026-10-09: "MK-NW-F-091 - recommend #1 and 2 approved").
 *
 *  Where the daily record does not reach the window's first day, the beginning is worked back from today:
 *  today's value less what each holding gained (MK-NW-F-091 pricedGainOf) less the money moved
 *  (MK-NW-O-008 thePerformance). A holding with no price history used to add $0 gain, so the beginning
 *  read too high.
 *   (1) a CD with a stated rate gains by its rate: value now × (1 − 1 ÷ (1 + rate)^years), years = the
 *       window's days ÷ 365;
 *   (2) a holding with no price history and no rate: its gain cannot be known — no beginning, no wealth
 *       generated, no walk, and a sentence that names it.
 *       SETTLED 2026-10-13 by DEC-5068, which replaces (2): "Wealth Generated and Return should be calculated and
 *       displayed for every asset with history. Below it display …". The walk is drawn from the gains that are
 *       known, the holding with no history adds $0, and notIncluded names it: "Wealth generated and Return do not
 *       include <name>'s gains, as it has no price history." The cases below that pinned the refusal now pin that.
 *  Unchanged: day one, a window the record reaches, holdings with a price history.
 */
import { thePerformance, pricedGainOf } from './performance';

const TODAY = '2026-10-09';
const YEAR_AGO = '2025-10-10';   // 2025-10-10 → 2026-10-09 inclusive = 365 days = exactly one year

const base = (over: Record<string, any> = {}) => ({
  windowStart: YEAR_AGO, windowLabel: 'past year', today: TODAY,
  transactions: [] as any[], snapshotDays: [] as any[],
  investmentAccountIds: new Set(['a']),
  wholeRecord: false,
  ...over,
});
const cdAcct = { asset_id: 'a', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', balance: 10500, coupon_rate: 0.05 };
const bondAcct = { asset_id: 'a', label: 'Treasury 2031', institution: 'Fidelity', kind: 'fixed_income', asset_class: 'bonds', balance: 8000, coupon_rate: 0.04 };

describe('MK-NW-F-091 pricedGainOf — the one rule (DEC-3656, 2026-10-09)', () => {
  test('a CD stating 5% gains by its rate: $10,500 over one year → $500', () => {
    // 10,500 × (1 − 1 ÷ 1.05) = 10,500 × 0.047619… = 500
    expect(pricedGainOf([{ marketValue: 10500, couponRate: 0.05, periodReturn: null }], 1)).toBeCloseTo(500, 9);
  });
  test('the CD over half a year: $10,500 × (1 − 1 ÷ 1.05^0.5) = $253.05', () => {
    expect(pricedGainOf([{ marketValue: 10500, couponRate: 0.05 }], 0.5)).toBeCloseTo(10500 * (1 - 1 / Math.sqrt(1.05)), 9);
    expect(pricedGainOf([{ marketValue: 10500, couponRate: 0.05 }], 0.5)).toBeCloseTo(253.05, 2);
  });
  test('a holding bought inside the window still counts value − cost, rate or not', () => {
    expect(pricedGainOf([{ cappedSince: '2026-03-01', gain: 10500 - 10200, marketValue: 10500, couponRate: 0.05 }], 1)).toBe(300);
  });
  test('a held holding with no price history and no rate → unknown (null), never $0', () => {
    expect(pricedGainOf([{ marketValue: 1000, periodReturn: null }], 1)).toBeNull();
    // a broker's mark with no price series: 800 × $50 is held, so unknown
    expect(pricedGainOf([{ marketValue: 0, periodReturn: null, position: { ticker: 'LCTX', last_price: 50, lots: [{ shares: 800 }] } }], 1)).toBeNull();
  });
  test('a holding worth nothing gained nothing: $0, not unknown', () => {
    expect(pricedGainOf([{ marketValue: 0, periodReturn: null, position: { ticker: 'X', lots: [] } }], 1)).toBe(0);
  });
  test('holdings with a price history are unchanged: $1,100 at +10% → $100', () => {
    expect(pricedGainOf([{ marketValue: 1100, periodReturn: 0.1 }], 1)).toBeCloseTo(100, 10);
  });
});

describe('MK-NW-O-008 thePerformance — the beginning worked back (DEC-3656, 2026-10-09)', () => {
  test('(1) a CD account with no positions: $10,500 at 5% for one year → beginning $10,000, wealth generated $500', () => {
    const f = thePerformance({ ...base(), accounts: [cdAcct] });
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBeCloseTo(10000, 6);
    expect(f.walk!.ending).toBe(10500);
    expect(f.walk!.wealthGenerated).toBeCloseTo(500, 6);
    expect(f.notIncluded).toBe('');
  });

  test('(2) a hand-typed bond account (no positions, no price history, not a CD): SETTLED 2026-10-13 by DEC-5068 — the walk stands at $0 gained, and the sentence names it', () => {
    const f = thePerformance({ ...base(), accounts: [bondAcct] });
    // was: no walk, "The beginning can't be worked back: Fidelity Brokerage has no price history."
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBe(8000);          // its value taken as unchanged over the window
    expect(f.walk!.wealthGenerated).toBe(0);
    // named by the app's one display name for an account (accountDisplayNames): "Fidelity Brokerage"
    expect(f.notIncluded).toBe('Fidelity Brokerage ($8,000) has no price history, so its gains are not included.');
    expect(f.sentence).toBe('');
    expect(f.ret).toBeNull();                      // no holding with a history: no return
  });

  test('(2) several holdings: names joined with ", " and " and ", and "they have" — SETTLED 2026-10-13 by DEC-5068', () => {
    const f = thePerformance({
      ...base(), accounts: [{ asset_id: 'a', label: 'Brokerage', balance: 3000, positions: [{}, {}, {}] }],
      holdings: [
        // no price history: the row has no value of its own (none, as a holding with no price is handed over — a written $0 is a known
        // $0 since 2026-10-21, MK-NW-F-128), so the broker's mark values it
        { position: { ticker: 'AAA', last_price: 10, lots: [{ shares: 100 }] }, marketValue: undefined, periodReturn: null },
        { position: { ticker: 'BBB', last_price: 10, lots: [{ shares: 100 }] }, marketValue: undefined, periodReturn: null },
        { position: { ticker: 'CCC', last_price: 10, lots: [{ shares: 100 }] }, marketValue: undefined, periodReturn: null },
      ],
    });
    expect(f.walk!.beginning).toBe(3000);
    expect(f.notIncluded).toBe('AAA, BBB and CCC ($3,000) have no price history, so their gains are not included.');
    expect(f.ret).toBeNull();                      // none of the three has a history: no return, never 0%
  });

  test('(2) a CD held as a POSITION carries no rate → unknown, named — SETTLED 2026-10-13 by DEC-5068', () => {
    const f = thePerformance({
      ...base(), accounts: [{ asset_id: 'a', label: 'Brokerage', balance: 5704, positions: [{}] }],
      holdings: [{ position: { ticker: 'KEYBANK CD 4.00%', last_price: 1, lots: [{ shares: 5704 }] }, marketValue: undefined, periodReturn: null }],   // no value of its own (2026-10-21)
    });
    expect(f.walk!.beginning).toBe(5704);
    expect(f.notIncluded).toBe('KEYBANK CD 4.00% ($5,704) has no price history, so its gains are not included.');
  });

  test('every other account keeps its full page: a priced account beside the bond still works back', () => {
    // asked one account at a time (the per-account walk): the priced one is untouched
    const priced = { asset_id: 'b', label: 'Index fund', balance: 1100, positions: [{}] };
    const f = thePerformance({
      ...base({ investmentAccountIds: new Set(['b']) }), accounts: [bondAcct, priced],
      holdings: [{ position: { ticker: 'VTI' }, marketValue: 1100, periodReturn: 0.1 }],
    });
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBeCloseTo(1000, 6);   // 1,100 − 100
    expect(f.ret).toBeCloseTo(0.1, 12);               // its own +10% (DEC-5068: the return of the holdings with a history)
    expect(f.notIncluded).toBe('');
  });

  test('unchanged · day one with no window (the account page passes none): the walk stands, nothing refused, no rate applied', () => {
    const f = thePerformance({ ...base({ windowStart: null, windowLabel: 'since today' }), accounts: [bondAcct] });
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBe(8000);
    expect(f.notIncluded).toBe('');
    const cd = thePerformance({ ...base({ windowStart: null, windowLabel: 'since today' }), accounts: [cdAcct] });
    expect(cd.walk!.beginning).toBe(10500);
  });

  test('unchanged · a window that opens today: gain 0, nothing refused', () => {
    const f = thePerformance({ ...base({ windowStart: TODAY }), accounts: [bondAcct] });
    expect(f.walk).not.toBeNull();
    expect(f.walk!.beginning).toBe(8000);
    expect(f.notIncluded).toBe('');
  });

  test('unchanged · a window the record reaches: the beginning is READ, no rule (1) or (2)', () => {
    const day = { date: '2025-10-09', origin: 'observed', writtenAt: '2025-10-09T00:00:00Z', holdings: [],
      accounts: [{ date: '2025-10-09', accountId: 'a', cash: 0, statedTotal: null, typedValue: 7900, currency: 'USD' }] };
    const f = thePerformance({ ...base({ snapshotDays: [day] }), accounts: [bondAcct] });
    expect(f.measured).toBe(7900);
    expect(f.walk!.beginning).toBe(7900);
    expect(f.notIncluded).toBe('');
  });
});
