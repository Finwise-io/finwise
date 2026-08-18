// The snapshot store — the record that makes a beginning value readable instead of back-solved.
import {
  record, prune, valueOn, unitsOn, onOrBefore, firstDate, covers, reconcile,
  pendingUpload, holdingId, accountId, DAILY_YEARS, type SnapshotDay,
} from '../snapshots';

const day = (date: string, holdings: any[] = [], cash = 0, statedTotal: number | null = null): SnapshotDay => ({
  date, origin: 'observed', writtenAt: `${date}T12:00:00Z`,
  holdings: holdings.map((h) => ({ accountId: 'v1', securityKey: h.k, symbol: h.k,
    units: h.u, price: h.p, value: Math.round(h.u * h.p * 100) / 100, currency: 'USD', date })),
  accounts: [{ date, accountId: 'v1', cash, statedTotal, currency: 'USD' }],
});
const ALL = new Set<string>(['v1']);

describe('WRITING — append-only, and a later belief supersedes an earlier one', () => {
  test('days are kept in date order however they arrive', () => {
    let d: SnapshotDay[] = [];
    d = record(d, day('2026-08-03')); d = record(d, day('2026-08-01')); d = record(d, day('2026-08-02'));
    expect(d.map((x) => x.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  test('writing the same day twice supersedes rather than duplicates', () => {
    let d = record([], day('2026-08-01', [{ k: 'VTI', u: 10, p: 100 }]));
    d = record(d, day('2026-08-01', [{ k: 'VTI', u: 10, p: 105 }]));      // a restated price
    expect(d).toHaveLength(1);
    expect(d[0].holdings[0].price).toBe(105);
  });

  test('every row has a stable identity — which is what makes a later sync a plain upload', () => {
    const a = holdingId({ date: '2026-08-01', accountId: 'v1', securityKey: 'VTI' });
    const b = holdingId({ date: '2026-08-01', accountId: 'v1', securityKey: 'VTI' });
    expect(a).toBe(b);                                    // uploading twice cannot duplicate
    expect(accountId({ date: '2026-08-01', accountId: 'v1' })).toBe('2026-08-01|v1');
  });
});

describe('READING — the beginning value the old code had to back-solve', () => {
  const days = [
    day('2026-06-01', [{ k: 'VTI', u: 100, p: 250 }], 5_000, 30_000),
    day('2026-08-01', [{ k: 'VTI', u: 120, p: 260 }], 4_000, 35_200),
  ];

  test('it READS a past value instead of deriving one', () => {
    expect(valueOn(days, ALL, '2026-06-01')).toBe(30_000);     // 100 × 250 + 5,000
  });

  test('a date between records uses the latest one on or before it', () => {
    expect(valueOn(days, ALL, '2026-07-15')).toBe(30_000);
  });

  test('BEFORE the record begins there is NO answer — and that is the point', () => {
    // the old code back-solved here and produced MINUS $448,028 against a real statement's $378,022.
    expect(valueOn(days, ALL, '2025-01-01')).toBeNull();
    expect(onOrBefore(days, '2025-01-01')).toBeNull();
  });

  test('UNITS ON A PAST DATE — what the trend chart never had', () => {
    // valuing June with August's 120 units would draw 20 shares the person did not own
    expect(unitsOn(days, 'v1', 'VTI', '2026-06-01')).toBe(100);
    expect(unitsOn(days, 'v1', 'VTI', '2026-08-01')).toBe(120);
    expect(unitsOn(days, 'v1', 'VTI', '2025-01-01')).toBeNull();
  });
});

describe('SAYING WHAT IT CANNOT COVER', () => {
  const days = [day('2026-08-01', [{ k: 'VTI', u: 10, p: 100 }])];

  test('it reports the first date it holds, so a figure can name what it is measured FROM', () => {
    expect(firstDate(days)).toBe('2026-08-01');
    expect(firstDate([])).toBeNull();
  });

  test('and it says plainly when a window is outside the record', () => {
    expect(covers(days, '2026-08-01')).toBe(true);
    expect(covers(days, '2026-01-01')).toBe(false);          // "this year" is not answerable
    expect(covers([], '2026-01-01')).toBe(false);
  });
});

describe('THE OUTSIDE CHECK — our figure against the broker\'s own', () => {
  test('agreement is silence; disagreement is a number', () => {
    const ok = day('2026-08-01', [{ k: 'VTI', u: 100, p: 250 }], 5_000, 30_000);
    expect(reconcile(ok, 'v1')).toEqual({ ours: 30_000, theirs: 30_000, difference: 0 });

    const off = day('2026-08-01', [{ k: 'VTI', u: 100, p: 250 }], 5_000, 31_289);
    expect(reconcile(off, 'v1').difference).toBe(-1_289);    // e.g. accrued interest we did not capture
  });

  test('a broker that states no total leaves us with no check, and says so', () => {
    expect(reconcile(day('2026-08-01', [{ k: 'VTI', u: 1, p: 1 }]), 'v1').theirs).toBeNull();
  });
});

describe('RETENTION — the one irreversible act, and the founder\'s decision', () => {
  const build = (): SnapshotDay[] => {
    const out: SnapshotDay[] = [];
    for (const [y, m, dd] of [
      [2022, 3, 31], [2022, 4, 30], [2023, 7, 31],           // old — month-ends
      [2023, 7, 14], [2022, 3, 15],                          // old — mid-month, should go
      [2026, 6, 15], [2026, 8, 1],                           // inside two years
    ] as const) out.push(day(`${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`));
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };

  test('two years of daily rows survive in full', () => {
    expect(DAILY_YEARS).toBe(2);
    const kept = prune(build(), '2026-08-18').map((d) => d.date);
    expect(kept).toContain('2026-06-15');
    expect(kept).toContain('2026-08-01');
  });

  test('older days keep only their month-end — so "since I started" stays answerable forever', () => {
    const kept = prune(build(), '2026-08-18').map((d) => d.date);
    expect(kept).toContain('2022-03-31');
    expect(kept).toContain('2023-07-31');
    expect(kept).not.toContain('2022-03-15');
    expect(kept).not.toContain('2023-07-14');
  });

  test('pruning never empties the record — the earliest month-end always survives', () => {
    const kept = prune(build(), '2030-01-01');
    expect(kept.length).toBeGreaterThan(0);
    expect(firstDate(kept)).toBe('2022-03-31');
  });
});

describe('THE LATER CLOUD SYNC — a plain upload, by construction', () => {
  const days = [day('2026-08-01'), day('2026-08-02'), day('2026-08-03')];

  test('nothing uploaded yet means everything is pending, oldest first', () => {
    expect(pendingUpload(days, null).map((d) => d.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  test('after a sync, only what came later is pending', () => {
    expect(pendingUpload(days, '2026-08-02').map((d) => d.date)).toEqual(['2026-08-03']);
  });

  test('a completed sync leaves nothing pending, and re-running is harmless', () => {
    expect(pendingUpload(days, '2026-08-03')).toEqual([]);
  });
});

describe('ORIGIN — a reconstruction is not a record', () => {
  test('every day says how it came to exist', () => {
    const observed = day('2026-08-01');
    expect(observed.origin).toBe('observed');
    const rebuilt: SnapshotDay = { ...day('2024-01-01'), origin: 'reconstructed' };
    expect(rebuilt.origin).toBe('reconstructed');
    // so a screen can label a rebuilt history honestly rather than presenting it as observed fact
  });
});
