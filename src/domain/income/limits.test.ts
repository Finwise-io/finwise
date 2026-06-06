import { annual401kLimit, annualIraLimit, annualHsaLimit, k401Headroom, rothVsTraditional, rothConversionWindow } from './limits';

describe('contribution limits + tax moves', () => {
  test('limits add age catch-ups', () => {
    expect(annual401kLimit(40)).toBe(24500);
    expect(annual401kLimit(55)).toBe(32500);        // +8,000
    expect(annualIraLimit(40)).toBe(7000);
    expect(annualIraLimit(50)).toBe(8000);          // +1,000
    expect(annualHsaLimit(40, false)).toBe(4400);
    expect(annualHsaLimit(60, true)).toBe(9750);    // family + 1,000 (55+)
  });

  test('401k headroom', () => {
    const h = k401Headroom(52, 10000);
    expect(h.limit).toBe(32500);
    expect(h.remaining).toBe(22500);
    expect(h.catchUp).toBe(true);
    expect(k401Headroom(30, 30000).remaining).toBe(0);   // capped, can't be negative
  });

  test('Roth vs Traditional lean', () => {
    expect(rothVsTraditional(0.12, 0.22).lean).toBe('roth');        // low now → Roth
    expect(rothVsTraditional(0.32, 0.24).lean).toBe('traditional'); // high now, lower later → Traditional
    expect(rothVsTraditional(0.22, 0.22).lean).toBe('either');
  });

  test('Roth conversion window (retired, before RMD/SS)', () => {
    expect(rothConversionWindow(66, 65, 70)).toBe(true);   // 66: retired, before SS(70) & RMD(73)
    expect(rothConversionWindow(74, 65, 70)).toBe(false);  // past RMD age
    expect(rothConversionWindow(64, 65, 70)).toBe(false);  // not retired yet
  });
});
