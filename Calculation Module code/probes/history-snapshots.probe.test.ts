// PROBES — the stored history. This is where the founder's F15 actually lives.
//
// Nobody sends us history. No institution supplies what an account was worth last month, so the only
// record of yesterday is the one the app writes itself. Every "change since" figure on every screen
// rests on these three functions, and their gaps are why a −4.2% year could read as +2.0%.
import { trendPoints, readHistory, normalizeSnapshot, makeMonthlySnapshot, pruneDaily, DAILY_KEEP } from '../../src/domain/history';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// SNAPSHOT_READ · SNAPSHOT_NORMALISE
// DERIVATION RULE: net worth IS assets minus debt. The writer computes it structurally so a stored
// snapshot can never carry a third, disagreeing number.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('SNAPSHOT_NORMALISE', () => {
  test('the identity holds by construction — net worth is never stored independently', () => {
    const s = makeMonthlySnapshot({ month: '2026-07', gross_assets: 813_152, gross_debt: 418_000,
      income_net: 0, spending: 0, debt_paid: 0, savings: 0, allocated: 0, planned_budget: 0,
      savings_rate: 0, by_category: {}, assets: [], debts: [], captured_at: '' } as any);
    expect(s.net_worth).toBe(395_152);
  });

  test('an old snapshot with no version is read best-effort rather than thrown away', () => {
    const s = normalizeSnapshot('2026-06', { gross_assets: 100, gross_debt: 40 })!;
    expect(s.net_worth).toBe(60);
    expect(s.month).toBe('2026-06');
  });

  test('a snapshot carrying ONLY a net worth keeps it, and assumes no debt', () => {
    const s = normalizeSnapshot('2026-06', { net_worth: 500 })!;
    expect(s.gross_assets).toBe(500);      // assets fall back to net worth…
    expect(s.gross_debt).toBe(0);          // …and debt to zero, which is a GUESS, not a record
  });

  test('anything without a real month or a real number is DROPPED, never charted', () => {
    expect(normalizeSnapshot('nonsense', { net_worth: 5 })).toBeNull();
    expect(normalizeSnapshot('2026-06', { gross_assets: 'lots' })).toBeNull();
    expect(normalizeSnapshot('2026-06', null)).toBeNull();
  });

  test('the reader sorts by month and silently discards the unusable', () => {
    const h = readHistory({ '2026-08': { net_worth: 3 }, '2026-06': { net_worth: 1 }, bad: { net_worth: 2 } });
    expect(h.map((s) => s.month)).toEqual(['2026-06', '2026-08']);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// TREND_POINTS  —  the chart series behind every "change since" line
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('TREND_POINTS', () => {
  test('monthly and daily points merge into one series, oldest first', () => {
    const p = trendPoints({ '2026-06': { net_worth: 100 } }, { '2026-07-04': 120, '2026-08-17': 150 });
    expect(p.map((x) => x.key)).toEqual(['2026-06', '2026-07-04', '2026-08-17']);
  });

  test('a month sorts BEFORE its own days, which is what makes plain text sorting safe here', () => {
    const p = trendPoints({ '2026-07': { net_worth: 100 } }, { '2026-07-04': 120 });
    expect(p.map((x) => x.key)).toEqual(['2026-07', '2026-07-04']);
  });

  test('a junk daily value is ignored rather than drawn as zero', () => {
    const p = trendPoints(null, { '2026-08-17': 150, 'not-a-date': 99, '2026-08-18': NaN } as any);
    expect(p).toHaveLength(1);
  });

  test('no history at all is an empty series, not a flat line at zero', () => {
    expect(trendPoints(null, null)).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE GAP THAT MATTERS — what this history CANNOT answer
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('WHAT THE HISTORY CANNOT DO', () => {
  test('a daily point is ONE NUMBER — there is no per-account history at all', () => {
    const p = trendPoints(null, { '2026-08-17': 150 });
    expect(Object.keys(p[0])).toEqual(['key', 'nw']);
    // So "what was my Vanguard account worth in April" has no answer anywhere in the app. The
    // monthly snapshot carries an assets[] list, but only at month end and only from the month the
    // app was first opened — which is why a beginning value gets back-solved instead of read.
  });

  test('daily points are pruned to a bounded window — older days are GONE, not archived', () => {
    const many = Object.fromEntries(Array.from({ length: DAILY_KEEP + 50 },
      (_, i) => [`2020-01-${String(i + 1).padStart(2, '0')}`, i]));
    const kept = pruneDaily(many as any);
    expect(Object.keys(kept)).toHaveLength(DAILY_KEEP);
    expect(Object.keys(many).length).toBeGreaterThan(Object.keys(kept).length);
  });

  test('history only ever begins when the app was FIRST OPENED', () => {
    // there is no back-fill: an account connected today has no yesterday, so the first "change
    // since" figure a person sees is measured from the day they installed the app, whatever the
    // market did before that. This is the mechanism behind the founder's +2.0% on a −4.2% year.
    expect(trendPoints(null, {})).toEqual([]);
  });
});
