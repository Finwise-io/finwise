// F10 engine tests — pins the fixed v1 rules: 3×-typical AND ≥$500 (median of 90 days), $1,000
// cold-start line, first-time payee ≥$250, 3-in-a-day ≥$1,000 combined, and the two hard guarantees:
// hand-typed transactions are NEVER flagged, and the comparison figure is stored at flag time.
import { reviewTransactions, flagComparisonText, isMoneyOut, type TxnFlag } from './flags';
import type { Transaction } from './index';

let n = 0;
const makeId = () => `f${++n}`;
const txn = (over: Partial<Transaction> & { amount: number }): Transaction => ({
  id: `t${++n}` as any, date: '2026-07-10', type: 'WITHDRAWAL', account_id: 'chk' as any,
  created_at: '2026-07-10T00:00:00Z', source: 'connected', ...over,
} as any);

// steady history: 6 recent withdrawals around $300 (median $310)
const HISTORY: Transaction[] = [280, 300, 310, 310, 320, 900].map((amount, i) =>
  txn({ amount, date: `2026-07-0${(i % 7) + 1}`, note: `grocer ${i}` }));

beforeEach(() => { n = 100; });

describe('isMoneyOut', () => {
  test('withdrawals, fees and un-countered transfers are money-out; buys/deposits are not', () => {
    expect(isMoneyOut(txn({ amount: 10, type: 'WITHDRAWAL' }))).toBe(true);
    expect(isMoneyOut(txn({ amount: 10, type: 'FEE' }))).toBe(true);
    expect(isMoneyOut(txn({ amount: 10, type: 'TRANSFER' }))).toBe(true);
    expect(isMoneyOut(txn({ amount: 10, type: 'TRANSFER', counter_account_id: 'sav' as any }))).toBe(false);
    expect(isMoneyOut(txn({ amount: 10, type: 'DEPOSIT' }))).toBe(false);
    expect(isMoneyOut(txn({ amount: 10, type: 'BUY' }))).toBe(false);
  });
});

describe('rule 1 — unusually large', () => {
  test('3× the typical AND ≥$500 trips; the typical is stored on the flag', () => {
    const t = txn({ amount: 2400, note: 'APEX SOLUTIONS' });
    const flags = reviewTransactions([t], { history: HISTORY, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('unusually_large');
    expect(flags[0].comparison).toBe(310);            // the median, frozen at flag time
    expect(flagComparisonText(flags[0])).toMatch(/about \$310. This one is 8 times/);
  });

  test('big multiple but under the $500 floor does NOT trip (typical $100 → $450 is 4.5× but small)', () => {
    const hist = [90, 95, 100, 105, 110].map((a, i) => txn({ amount: a, date: `2026-07-0${i + 1}` }));
    const flags = reviewTransactions([txn({ amount: 450 })], { history: hist, makeId });
    expect(flags.filter((f) => f.reason === 'unusually_large')).toHaveLength(0);
  });

  test('fewer than 5 past withdrawals → the flat $1,000 cold-start line', () => {
    const hist = [300, 320].map((a, i) => txn({ amount: a, date: `2026-07-0${i + 1}` }));
    expect(reviewTransactions([txn({ amount: 999 })], { history: hist, makeId })).toHaveLength(0);
    const flags = reviewTransactions([txn({ amount: 1001, note: 'x' })], { history: hist, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].comparison).toBeNull();           // no learned typical yet
  });

  test('only the last 90 days count as history', () => {
    const old = [3000, 3100, 3200, 3300, 3400].map((a, i) => txn({ amount: a, date: `2026-01-0${i + 1}` }));
    // old big history is outside the window → cold-start line applies
    const flags = reviewTransactions([txn({ amount: 1200 })], { history: old, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('unusually_large');
  });
});

describe('rule 2 — first-time payee', () => {
  test('unseen payee at ≥$250 trips; a repeat payee does not', () => {
    const t = txn({ amount: 400, note: 'APEX SOLUTIONS' });
    const flags = reviewTransactions([t], { history: HISTORY, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('first_time_payee');
    const seen = reviewTransactions([txn({ amount: 400, note: 'grocer 1' })], { history: HISTORY, makeId });
    expect(seen).toHaveLength(0);
  });

  test('under $250 or a confirmed known payee never trips', () => {
    expect(reviewTransactions([txn({ amount: 200, note: 'NEW SHOP' })], { history: HISTORY, makeId })).toHaveLength(0);
    const flags = reviewTransactions([txn({ amount: 400, note: 'APEX SOLUTIONS' })],
      { history: HISTORY, knownPayees: { chk: ['apex solutions'] }, makeId });
    expect(flags).toHaveLength(0);
  });
});

describe('rule 3 — odd pattern', () => {
  test('3 same-day money-outs totaling ≥$1,000 → ONE combined card', () => {
    const day = [txn({ amount: 400, note: 'a' }), txn({ amount: 350, note: 'b' }), txn({ amount: 300, note: 'c' })]
      .map((t) => ({ ...t, note: `grocer 1` }));   // repeat payee + small → rules 1/2 stay quiet
    const flags = reviewTransactions(day, { history: HISTORY, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('odd_pattern');
    expect(flags[0].transaction_ids).toHaveLength(3);
    expect(flags[0].amount).toBe(1050);
    expect(flagComparisonText(flags[0])).toMatch(/3 withdrawals .* \$1,050 together/);
  });

  test('3 same-day but under $1,000 stays quiet', () => {
    const day = [200, 200, 200].map(() => txn({ amount: 200, note: 'grocer 1' }));
    expect(reviewTransactions(day, { history: HISTORY, makeId })).toHaveLength(0);
  });
});

describe('hard guarantees', () => {
  test('hand-typed transactions are NEVER flagged (no source field = manual)', () => {
    const manual = { ...txn({ amount: 250000, note: 'TOTALLY NEW PAYEE' }) } as any;
    delete manual.source;
    expect(reviewTransactions([manual], { history: HISTORY, makeId })).toHaveLength(0);
  });

  test('a transaction gets at most ONE flag (large wins over first-time payee)', () => {
    const t = txn({ amount: 2400, note: 'APEX SOLUTIONS' });
    const flags = reviewTransactions([t], { history: HISTORY, makeId });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('unusually_large');
  });

  test('deposits and buys never trip anything', () => {
    const flags = reviewTransactions(
      [txn({ amount: 50000, type: 'DEPOSIT', note: 'NEW EMPLOYER' }), txn({ amount: 50000, type: 'BUY', note: 'VOO' })],
      { history: [], makeId });
    expect(flags).toHaveLength(0);
  });
});

// Build-47 walk row 19 (audit PRD #9): duplicate detection — and it covers HAND-TYPED entries
// (typing the same expense twice is the classic manual error); size/payee rules stay connected-only.
describe('possible_duplicate (walk row 19)', () => {
  const mk = (over: any) => ({ id: over.id, type: 'WITHDRAWAL', account_id: 'a1', amount: 84.2, date: '2026-07-28', note: 'Acme Market', ...over });
  test('a manual twin within 2 days gets flagged; the flag names the duplicate rule', () => {
    const flags = reviewTransactions([mk({ id: 't2', date: '2026-07-29' }) as any],
      { history: [mk({ id: 't1' }) as any], makeId: () => 'f1' });
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe('possible_duplicate');
    expect(flagComparisonText(flags[0])).toMatch(/same charge twice/);
  });
  test('different amounts or payees never trip it', () => {
    expect(reviewTransactions([mk({ id: 't2', amount: 85.0 }) as any], { history: [mk({ id: 't1' }) as any] })).toHaveLength(0);
    expect(reviewTransactions([mk({ id: 't2', note: 'Other Shop' }) as any], { history: [mk({ id: 't1' }) as any] })).toHaveLength(0);
  });
  test('hand-typed size is still never interrogated (manual large stays unflagged)', () => {
    const flags = reviewTransactions([mk({ id: 't9', amount: 9000, note: 'Tuition' }) as any], { history: [] });
    expect(flags).toHaveLength(0);
  });
});
