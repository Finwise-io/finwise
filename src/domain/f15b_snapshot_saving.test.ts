// F15 follow-up (founder, 2026-08-14): "It does not look like it is saving. Last time I connected
// Vanguard was about a week back — if it had that value saved it would have shown a difference when
// I reconnected yesterday. It did not."
import { useStore } from '../store/useStore';

beforeEach(() => { useStore.getState().resetAll(); });

test('THE MONTHLY RECORD IS OVERWRITTEN ON EVERY OPEN — so it is never a start-of-month value', () => {
  const s = useStore.getState() as any;
  // a week ago, Vanguard was worth 300,000
  s.captureMonthlySnapshot('2026-08', { net_worth: 900_000, assets: [{ label: 'Vanguard', balance: 300_000 }] } as any);
  expect((useStore.getState() as any).monthlySnapshots['2026-08'].net_worth).toBe(900_000);
  // today it is worth 310,000, and opening the app writes the SAME month key again
  s.captureMonthlySnapshot('2026-08', { net_worth: 910_000, assets: [{ label: 'Vanguard', balance: 310_000 }] } as any);
  const kept = (useStore.getState() as any).monthlySnapshots['2026-08'];
  // the earlier value is GONE — there is no record that Vanguard was ever 300,000
  expect(kept.net_worth).toBe(910_000);
  expect(kept.assets[0].balance).toBe(310_000);
  expect(Object.keys((useStore.getState() as any).monthlySnapshots)).toEqual(['2026-08']);
});

test('the daily point behaves the same way WITHIN a day, which is correct — but only one per day', () => {
  const s = useStore.getState() as any;
  s.captureDailyNw('2026-08-14', 900_000, 300_000);
  s.captureDailyNw('2026-08-14', 910_000, 310_000);
  expect((useStore.getState() as any).nwDaily['2026-08-14']).toBe(910_000);   // last write of the day wins
});

test('NOTHING stores what an individual account was worth on a past DAY', () => {
  const s = useStore.getState() as any;
  s.captureDailyNw('2026-08-07', 900_000, 300_000);
  s.captureDailyNw('2026-08-14', 910_000, 310_000);
  const daily = (useStore.getState() as any).nwDaily;
  // two days of TOTALS exist…
  expect(Object.keys(daily)).toEqual(['2026-08-07', '2026-08-14']);
  // …and they are plain numbers. There is no per-account history at day resolution, so
  // "what did Vanguard do since last week" cannot be answered from stored data at all.
  expect(typeof daily['2026-08-07']).toBe('number');
});
