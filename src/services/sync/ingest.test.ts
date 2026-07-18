// Ingest pins (design v2 §4): the broker's total is authoritative, activities are HISTORY ONLY
// (never applied — no double-count), dedupe survives re-sync, the user-confirmed wrapper is
// permanent, options itemize without changing totals, money-market never counts twice.
import { ingestSync, confirmWrapper, stAssetId, type AccountSyncPayload } from './ingest';
import type { StAccount } from './snaptrade';

const NOW = '2026-07-18T12:00:00.000Z';
const acct = (over: Partial<StAccount> = {}): StAccount => ({
  id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual',
  number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: 50000, currency: 'USD' } },
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-07-18T06:00:00Z' } },
  ...over,
});
const payload = (over: Partial<AccountSyncPayload> = {}): AccountSyncPayload => ({
  account: acct(), balancesCash: 1200,
  positions: [
    { symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 },
    { symbol: { id: 'u-spaxx', raw_symbol: 'SPAXX', type: { code: 'oef' } } as any, units: 200, price: 1, cash_equivalent: true },
  ],
  activities: [
    { id: 'a1', type: 'DIVIDEND', trade_date: '2026-07-10', amount: 55, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    { id: 'a2', type: 'BUY', trade_date: '2026-07-01', units: 10, price: 240, amount: -2400, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
  ],
  ...over,
});

test('the broker total IS the balance; the sleeve nets out money-market; positions carry the mark', () => {
  const r = ingestSync([], {}, [payload()], NOW);
  const a = r.accounts.find((x) => x.asset_id === stAssetId('acc-1'))!;
  expect(a.balance).toBe(50000);                    // authority rule — never recomputed from parts
  expect(a.cash_balance).toBe(1000);                // 1200 cash − 200 SPAXX (money-market held as sleeve)
  expect(a.positions).toHaveLength(1);              // SPAXX is NOT a position row (it lives in the sleeve)
  expect(a.positions![0].ticker).toBe('VTI');
  expect(a.positions![0].last_price).toBe(250);
  expect(a.source).toBe('connected');
  expect(a.mask).toBe('••7665');
  expect(a.last_synced).toBe('2026-07-18T06:00:00Z');
});

test('activities are HISTORY ONLY — appended with source connected, never applied to balances', () => {
  const r = ingestSync([], {}, [payload()], NOW);
  expect(r.newTransactions).toHaveLength(2);
  const div = r.newTransactions.find((t) => t.type === 'DIVIDEND')!;
  expect(div.source).toBe('connected');
  expect(div.amount).toBe(55);
  // the account balance stayed the broker's number — no ledger math touched it
  expect(r.accounts[0].balance).toBe(50000);
});

test('re-syncing the same window adds NOTHING (id churn included)', () => {
  const first = ingestSync([], {}, [payload()], NOW);
  const churned = payload({ activities: [
    { id: 'REPROCESSED-9', type: 'DIVIDEND', trade_date: '2026-07-10', amount: 55, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
  ] });
  const second = ingestSync(first.accounts, first.seenKeys, [churned], NOW);
  expect(second.newTransactions).toHaveLength(0);
  expect(second.accounts).toHaveLength(1);          // upsert, not a twin
});

test('an ambiguous raw_type flags wrapper-confirm; a USER-confirmed wrapper survives every later sync', () => {
  const weird = payload({ account: acct({ raw_type: 'Special Custody 7' }) });
  const r1 = ingestSync([], {}, [weird], NOW);
  expect(r1.needsWrapperConfirm).toEqual([stAssetId('acc-1')]);
  const confirmed = confirmWrapper(r1.accounts, stAssetId('acc-1'), 'roth_ira', 'ROTH');
  const r2 = ingestSync(confirmed, r1.seenKeys, [weird], NOW);
  expect(r2.accounts[0].tax_bucket).toBe('ROTH');   // the sync did NOT override the human
  expect(r2.needsWrapperConfirm).toHaveLength(0);   // and stops asking
});

test('options itemize as display rows; the total is untouched (their value is already inside it)', () => {
  const withOpts = payload({ optionPositions: [
    { symbol: { option_symbol: { option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' } } }, units: 2, price: 6.5 },
  ] });
  const r = ingestSync([], {}, [withOpts], NOW);
  const a = r.accounts[0];
  expect(a.option_holdings).toHaveLength(1);
  expect(a.option_holdings![0].label).toBe('AAPL $220 call · exp Jan 16 2027');
  expect(a.option_holdings![0].value).toBe(1300);
  expect(a.balance).toBe(50000);                    // never balance + option value
});

test('SPLIT arrives as a visible ADJUSTMENT row; SKIP types never reach the ledger', () => {
  const r = ingestSync([], {}, [payload({ activities: [
    { id: 's1', type: 'SPLIT', trade_date: '2026-06-10', symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    { id: 'x1', type: 'OPTIONEXPIRATION', trade_date: '2026-06-11' },
  ] })], NOW);
  expect(r.newTransactions).toHaveLength(1);
  expect(r.newTransactions[0].type).toBe('ADJUSTMENT');
});

test('a closed account is kept and marked, never silently dropped', () => {
  const r = ingestSync([], {}, [payload({ account: acct({ status: 'closed' }) })], NOW);
  expect(r.accounts[0].status).toBe('closed');
});
