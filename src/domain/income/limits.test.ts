import { annual401kLimit, annualIraLimit, annualHsaLimit, k401Headroom, rothVsTraditional, rothConversionWindow } from './limits';

describe('contribution limits + tax moves', () => {
  // Every figure below is typed in from the PUBLISHED 2026 source, not from our constants — so this
  // test can disagree with the code, which is its whole point. On 2026-09-01 it would have failed
  // twice: the IRA limits still carried the 2025 figures ($7,000/$1,000 against the published
  // $7,500/$1,100), and the 60–63 super catch-up did not exist in the code at all — in an app built
  // for people aged 55 to 70. A constant checked only against itself is not checked.
  test('limits match the published IRS 2026 figures', () => {
    expect(annual401kLimit(40)).toBe(24_500);
    expect(annual401kLimit(55)).toBe(24_500 + 8_000);
    expect(annualIraLimit(40)).toBe(7_500);
    expect(annualIraLimit(50)).toBe(7_500 + 1_100);
    expect(annualHsaLimit(40, false)).toBe(4_400);
    expect(annualHsaLimit(60, true)).toBe(8_750 + 1_000);   // family + the 55+ catch-up
    // G10 (founder ruling 2026-09-08): enrolled in Medicare → no contribution allowed (IRS Pub 969)
    expect(annualHsaLimit(66, false, true)).toBe(0);
    expect(annualHsaLimit(66, false, false)).toBe(4_400 + 1_000);   // 65+ but not enrolled: the limit stands
    expect(annualHsaLimit(66, false, null)).toBe(4_400 + 1_000);    // not answered: the limit, and the screen asks
  });

  test('SECURE 2.0: ages 60–63 get the super catch-up, and it drops back at 64', () => {
    expect(annual401kLimit(59)).toBe(24_500 + 8_000);
    expect(annual401kLimit(60)).toBe(24_500 + 11_250);
    expect(annual401kLimit(63)).toBe(24_500 + 11_250);
    expect(annual401kLimit(64)).toBe(24_500 + 8_000);       // back to the ordinary catch-up
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
