// D3 window boundaries and D4 money-weighted return — the thresholds live in ONE module and
// every one is proven here (founder brief 2026-08-20).
import { windowBounds, moneyWeightedReturn, DATELESS_FLOW_LIMIT, BAND_ABSOLUTE } from '../window-return';
import { Dec } from '../decimal';

describe('D3 — both boundary days inside, and windows tile', () => {
  test('a July window is 31 days and its beginning is the close of 30 June', () => {
    const w = windowBounds('2026-07-01', '2026-07-31');
    expect(w.days).toBe(31);
    expect(w.beginningAsOf).toBe('2026-06-30');
  });
  test('consecutive windows tile cleanly — July begins where June ends', () => {
    const june = windowBounds('2026-06-01', '2026-06-30');
    const july = windowBounds('2026-07-01', '2026-07-31');
    expect(july.beginningAsOf).toBe(june.end);
  });
});

describe('D4 — the money-weighted return', () => {
  const D = Dec.of;

  test('no flows: the plain return, and Vanguard\'s own −4.2% reproduces', () => {
    const v = moneyWeightedReturn({
      beginning: D('378022'), ending: D('362088.59'), flows: [],
      start: '2026-01-01', end: '2026-08-16',
    });
    expect(v.method).toBe('dietz');
    expect(Math.round(v.rate! * 1000) / 1000).toBe(-0.042);
  });

  test('a start-day flow carries full weight; a last-day flow essentially none', () => {
    const base = { beginning: D('100000'), ending: D('112000'), start: '2026-07-01', end: '2026-07-31' };
    const early = moneyWeightedReturn({ ...base, flows: [{ date: '2026-07-01', amount: D('10000') }] });
    const late = moneyWeightedReturn({ ...base, flows: [{ date: '2026-07-31', amount: D('10000') }] });
    // same $2,000 gain; the early flow was at work all month → smaller rate
    expect(early.rate!).toBeLessThan(late.rate!);
    // early denominator = 100k + 10k×(31/31) = 110k exactly
    expect(Math.abs(early.rate! - 2000 / 110000)).toBeLessThan(1e-9);
  });

  test('REFUSED unconditionally when the denominator is at or below zero', () => {
    const v = moneyWeightedReturn({
      beginning: D('0'), ending: D('500'), flows: [],
      start: '2026-07-01', end: '2026-07-31',
    });
    expect(v.rate).toBeNull();
    expect(v.refused).toBe('NON_POSITIVE_DENOMINATOR');
  });

  test('the timing-sensitivity band refuses a rate that timing drives — the walk is the answer', () => {
    // a flow nearly the size of the account: where it lands in the month swings the figure
    const v = moneyWeightedReturn({
      beginning: D('50000'), ending: D('141000'), flows: [{ date: '2026-07-15', amount: D('90000') }],
      start: '2026-07-01', end: '2026-07-31',
    });
    expect(v.rate).toBeNull();
    expect(v.refused).toBe('TIMING_SENSITIVE');
    expect(v.band!.width).toBeGreaterThan(BAND_ABSOLUTE);
    expect(v.sentence).toContain('dollar walk');
  });

  test('a small flow passes the band and returns Dietz', () => {
    const v = moneyWeightedReturn({
      beginning: D('100000'), ending: D('104500'), flows: [{ date: '2026-07-10', amount: D('500') }],
      start: '2026-07-01', end: '2026-07-31',
    });
    expect(v.method).toBe('dietz');
    expect(v.rate).not.toBeNull();
    expect(v.band!.width).toBeLessThan(0.001);
  });

  test('dateless flows: absorbed at mid-window only while under 1% of beginning', () => {
    const small = moneyWeightedReturn({
      beginning: D('100000'), ending: D('101500'), flows: [{ amount: D('900') }],
      start: '2026-07-01', end: '2026-07-31',
    });
    expect(small.method).toBe('dateless-fallback');
    expect(small.rate).not.toBeNull();

    const large = moneyWeightedReturn({
      beginning: D('100000'), ending: D('112000'), flows: [{ amount: D('10000') }],
      start: '2026-07-01', end: '2026-07-31',
    });
    expect(large.rate).toBeNull();
    expect(large.refused).toBe('DATELESS_FLOWS_TOO_LARGE');
    expect(DATELESS_FLOW_LIMIT).toBe(0.01);   // the named threshold, pinned
  });
});
