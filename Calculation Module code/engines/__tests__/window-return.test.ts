// D3 window boundaries and D4 money-weighted return — the thresholds live in ONE module and
// every one is proven here (founder brief 2026-08-20).
import { windowBounds } from '../window-return';

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

// D4 — the Modified Dietz return — was tested here. It was removed on 2026-10-04 (owner decision DEC-1669:
// every return is time-weighted); the return is tested in time-weighted-return.test.ts.
