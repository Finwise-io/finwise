// FOUNDER RULE 2026-08-04 — the FIFTH ingredient check: brokers back-fill different depths of
// activity history, so a "past year" income figure can silently understate. Every year-scale
// figure must label itself with the depth its sources actually shared.
import { historyCoverage, type AssetAccount } from './index';
import { mergeHistoryFrom } from '../../services/sync/snaptrade';

const a = (over: Partial<AssetAccount>): AssetAccount => ({
  asset_id: 'x' as any, label: 'Brokerage', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0,
  source: 'connected', ...over,
});
const NOW = new Date('2026-08-04');

describe('historyCoverage — does the shared history cover the window a figure claims?', () => {
  test('covered window says NOTHING (no nagging when the data is complete)', () => {
    expect(historyCoverage(a({ history_from: '2025-01-02', institution: 'Vanguard' }), '2025-08-04', NOW)).toBeNull();
    expect(historyCoverage(a({ history_from: '2025-08-04' }), '2025-08-04', NOW)).toBeNull();   // exactly reaches
  });

  test('a shallow feed names the institution, the span, and the start date', () => {
    const c = historyCoverage(a({ history_from: '2026-05-04', institution: 'E*TRADE' }), '2025-08-04', NOW)!;
    expect(c.kind).toBe('partial');
    expect(c.from).toBe('2026-05-04');
    expect(c.sentence).toBe("E*TRADE shared 3 months of history (from May 4, 2026) — figures before that aren't counted.");
  });

  test('a connected account that has shared nothing says so — never a false $0', () => {
    const c = historyCoverage(a({ institution: 'Fidelity' }), '2025-08-04', NOW)!;
    expect(c.kind).toBe('none');
    expect(c.sentence).toMatch(/hasn't shared any activity records yet/);
  });

  test('a hand-entered account has no feed at all and says that instead', () => {
    const c = historyCoverage(a({ source: 'manual', label: 'Ally Savings' }), '2025-08-04', NOW)!;
    expect(c.kind).toBe('none');
    expect(c.sentence).toBe('Ally Savings has no activity records — dividends and interest here are only what you enter.');
  });
});

describe('mergeHistoryFrom — depth only ever deepens', () => {
  test('first sync records the earliest activity date it saw', () => {
    expect(mergeHistoryFrom(undefined, ['2026-05-04', '2026-07-01', null])).toBe('2026-05-04');
  });
  test('a LATER shallower page can never shorten the recorded depth', () => {
    expect(mergeHistoryFrom('2025-01-02', ['2026-07-01'])).toBe('2025-01-02');
  });
  test('a deeper page extends it', () => {
    expect(mergeHistoryFrom('2026-05-04', ['2024-11-30', '2026-06-01'])).toBe('2024-11-30');
  });
  test('no dates leaves the record untouched', () => {
    expect(mergeHistoryFrom('2025-01-02', [])).toBe('2025-01-02');
    expect(mergeHistoryFrom(undefined, [null, undefined, 'garbage'])).toBeUndefined();
  });
});

// The whole chain, end to end: sync records the depth → the income screen names it.
describe('the fifth check, wired end to end', () => {
  test('ingest records history_from from the activity rows it received', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'services', 'sync', 'ingest.ts'), 'utf8');
    expect(src).toMatch(/history_from: mergeHistoryFrom\(prior\?\.history_from/);
    expect(src).toMatch(/act\.trade_date \?\? act\.settlement_date/);   // the row's own date, never "today"
  });
  test('the income screen labels its 12-month figure with each source\'s real coverage', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'screens', 'IncomeManagerScreen.tsx'), 'utf8');
    expect(src).toMatch(/historyCoverage\(a, yearStart\)/);
    expect(src).toMatch(/coverageNotes\.map/);
  });
});
