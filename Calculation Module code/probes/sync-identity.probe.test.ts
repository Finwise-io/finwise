// PROBE — account identity, and the mechanism behind the $1.4m.
//
// The founder's Vanguard account shows $1,462,462 of contributions against a statement that says
// nothing moved. Four explanations were ruled out by running the code: the activity mapping is
// correct, option trades stay internal, the dedupe set persists across syncs, and nothing in the
// connect flow writes opening rows.
//
// The one left is identity, and this probe shows it is not a theory. Our account id IS the broker's
// account id with a prefix. The dedupe key begins with our account id. So if the broker's id ever
// changes — a reconnect, a re-linked login, a migrated account — every key changes with it, nothing
// matches the seen set, and the ENTIRE history re-imports as brand-new money arriving.
import { stAssetId } from '../../src/services/sync/ingest';
import { activityKey, dedupeActivities, mapAccountType, mergeHistoryFrom } from '../../src/services/sync/snaptrade';

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ACCOUNT_IDENTITY  —  ours is theirs
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('ACCOUNT_IDENTITY', () => {
  test('our account id is the broker\'s account id with a prefix — nothing more', () => {
    expect(stAssetId('abc-123')).toBe('st-abc-123');
    expect(stAssetId('abc-124')).toBe('st-abc-124');       // a different broker id is a different account to us
  });

  test('THE MECHANISM: a changed broker id changes every activity key', () => {
    const activity = { id: null, date: '2025-03-14', type: 'CONTRIBUTION', amount: 5_000, units: null, price: null } as any;
    const before = activityKey(stAssetId('abc-123'), activity);
    const after  = activityKey(stAssetId('abc-124'), activity);
    expect(before).not.toBe(after);                        // the SAME event, two different keys
  });

  test('…and a changed key means the whole history re-imports as new money', () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      id: null, date: `2025-0${(i % 9) + 1}-1${i % 9}`, type: 'CONTRIBUTION',
      amount: 1_000 + i, units: null, price: null,
    })) as any[];

    // CORRECTED BY THE PROBE: it takes a Set and MUTATES it, returning the fresh rows directly.
    const seen = new Set<string>();

    // first connection: everything is new, and the keys are remembered in `seen`
    expect(dedupeActivities(stAssetId('abc-123'), history, seen)).toHaveLength(40);

    // syncing again under the SAME id correctly finds nothing new — the dedupe works
    expect(dedupeActivities(stAssetId('abc-123'), history, seen)).toHaveLength(0);

    // but under a NEW broker id, the same 40 events all look new again
    expect(dedupeActivities(stAssetId('abc-124'), history, seen)).toHaveLength(40);   // ← counted twice

    // and the total those 40 would add, to show the shape of the number this produces
    const doubled = history.reduce((t, a) => t + a.amount, 0);
    expect(doubled).toBeGreaterThan(0);
  });

  test('the broker\'s OWN activity id does not save us, because ours is prefixed to it', () => {
    const withId = { id: 'broker-txn-999', date: '2025-03-14', type: 'CONTRIBUTION', amount: 5_000 } as any;
    expect(activityKey(stAssetId('abc-123'), withId)).not.toBe(activityKey(stAssetId('abc-124'), withId));
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// WRAPPER_GUESS  —  and the one case where the app refuses to be confident
// DERIVATION RULE: a wrong wrapper is wrong TAX MATH, so an unrecognised type is never guessed
// silently — it comes back not-confident and the connect flow asks.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('WRAPPER_GUESS', () => {
  test('the common shapes are recognised confidently', () => {
    expect(mapAccountType('Roth IRA')).toEqual({ kind: 'roth_ira', tax_bucket: 'ROTH', confident: true });
    expect(mapAccountType('Roth 401(k)')).toEqual({ kind: '401k', tax_bucket: 'ROTH', confident: true });
    expect(mapAccountType('403(b)')).toEqual({ kind: '401k', tax_bucket: 'PRE_TAX', confident: true });
    expect(mapAccountType('Rollover IRA').tax_bucket).toBe('PRE_TAX');
    expect(mapAccountType('Individual Brokerage').tax_bucket).toBe('TAXABLE');
    expect(mapAccountType('HSA').kind).toBe('hsa');
  });

  test('a bare "IRA" is read as traditional — the commoner case, and it is a GUESS', () => {
    expect(mapAccountType('IRA')).toEqual({ kind: 'trad_ira', tax_bucket: 'PRE_TAX', confident: true });
    // marked confident, though a Roth held under a plain "IRA" label would be taxed wrongly
  });

  test('a "savings" account through this broker is a BROKERAGE wearing the wrong label', () => {
    // founder-verified 2026-08-04: SnapTrade is brokerage-only, and E*TRADE labels one this way.
    // Labels lose to reality — and it stays NOT confident so the question can still correct it.
    expect(mapAccountType('savings')).toEqual({ kind: 'brokerage', tax_bucket: 'TAXABLE', confident: false });
  });

  test('anything unrecognised is NOT confident, so the app asks instead of guessing at tax', () => {
    expect(mapAccountType('Some New Product').confident).toBe(false);
    expect(mapAccountType(null).confident).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HISTORY_DEPTH  —  how far back this source has ever gone
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HISTORY_DEPTH', () => {
  test('it keeps the EARLIEST date ever seen, so depth only ever grows', () => {
    expect(mergeHistoryFrom(undefined, ['2025-06-01', '2025-03-14'])).toBe('2025-03-14');
    expect(mergeHistoryFrom('2025-03-14', ['2024-11-02'])).toBe('2024-11-02');
    expect(mergeHistoryFrom('2024-11-02', ['2025-06-01'])).toBe('2024-11-02');   // a shallower sync never shortens it
  });

  test('junk dates are ignored and an empty sync leaves it untouched', () => {
    expect(mergeHistoryFrom('2025-03-14', ['nonsense', null, undefined])).toBe('2025-03-14');
    expect(mergeHistoryFrom(undefined, [])).toBeUndefined();
  });
});
