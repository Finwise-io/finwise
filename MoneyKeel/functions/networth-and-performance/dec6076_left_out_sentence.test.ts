/** DEC-6076 (owner, 2026-10-19, "approved."), after his note on the account-page drawing's state D: "State D - for
 *  summary box - we need to explain that 10% return is on 40K and not 50K." The left-out sentence of DEC-5068 now says
 *  what the Return is on. MK-NW-F-130 notIncludedSentence, MK-NW-O-008 thePerformance; amounts under MK-PF-M-021
 *  (the value the return is on) and MK-PF-M-022 (the value left out).
 *
 *  THE $50,000 EXAMPLE, by hand: VTI $40,000 with a year of prices (+10%), Treasury 2031 $10,000 typed by hand with no
 *  price history. Return = 40,000 ÷ (40,000 ÷ 1.10) − 1 = +10.00%, on the $40,000; the $10,000 is left out.
 *  Several: add Muni 2029 $5,000, also no history → left out $10,000 + $5,000 = $15,000; the return still on $40,000. */
import { thePerformance } from './performance';

const VTI = { position: { ticker: 'VTI' }, marketValue: 40000, periodReturn: 0.10 };
const T31 = { position: { ticker: '912810TM0', label: 'Treasury 2031', lots: [{ shares: 10000 }], value_now: 10000 }, periodReturn: null };
const MUNI = { position: { ticker: '13063DMT2', label: 'Muni 2029', lots: [{ shares: 5000 }], value_now: 5000 }, periodReturn: null };
const ask = (holdings: any[], balance: number) => thePerformance({
  windowStart: '2025-10-01', windowLabel: 'the past year', today: '2026-09-30',
  transactions: [], snapshotDays: [], investmentAccountIds: new Set(['f']),
  accounts: [{ asset_id: 'f', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', asset_class: 'stocks_etf', balance, positions: [{}, {}] }] as any[],
  holdings,
});

test('one left out: the $50,000 account — Return is on the $40,000; Treasury 2031 ($10,000) is left out', () => {
  const f = ask([VTI, T31], 50000);
  expect(f.ret!).toBeCloseTo(0.10, 12);
  expect(f.walk!.ending).toBe(50000);
  expect(f.notIncluded).toBe('Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.');
});

test('several left out: their values added, "have" and "their"', () => {
  const f = ask([VTI, T31, MUNI], 55000);
  expect(f.ret!).toBeCloseTo(0.10, 12);
  expect(f.notIncluded).toBe('Return is on the $40,000 with a price history. Treasury 2031 and Muni 2029 ($15,000) have no price history, so their gains are not included.');
});

test('nothing counted: no return to explain, so only the left-out sentence', () => {
  const f = ask([T31], 10000);
  expect(f.ret).toBeNull();
  expect(f.notIncluded).toBe('Treasury 2031 ($10,000) has no price history, so its gains are not included.');
});
