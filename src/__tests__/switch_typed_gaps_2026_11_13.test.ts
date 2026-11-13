/* THE SWITCH ON — THE TYPED-ENTRY AND ONE-TIME-MOVE GAPS IT FOUND (2026-11-13), each on a worked example, with the screens
 * reading the record (SCREENS_READ_THE_RECORD on for this file only). */
process.env.MK_SCREENS_READ_THE_RECORD = '1';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useStore, SCREENS_READ_THE_RECORD } = require('../store/useStore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildDayFromAccounts, record: recordDay, valueOn } = require('../../Calculation Module code/engines/snapshots');

const S = () => useStore.getState() as any;
const acct = (id: string) => S().assetAccounts.find((a: any) => a.asset_id === id);
const days = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};
afterEach(() => jest.useRealTimers());

test('the switch is on in this file (the guard looked)', () => {
  expect(SCREENS_READ_THE_RECORD).toBe(true);
});

test('gap 1 · a brokerage typed at $5,000 with $1,000 cash, then a $250 deposit: cash $1,000 + $250 = $1,250, total $5,000 + $250 = $5,250', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'BRK', label: 'Brokerage', kind: 'brokerage', source: 'manual', tax_bucket: 'TAXABLE', balance: 5_000, cash_balance: 1_000, value_as_of: '2026-11-01' }] } as any);
  S().recordTransaction({ date: '2026-11-12', type: 'DEPOSIT', account_id: 'BRK', amount: 250 });
  expect(S().assetRecord.length).toBeGreaterThanOrEqual(3);   // the move's value, its cash, the deposit
  expect(acct('BRK').cash_balance).toBe(1_250);
  expect(acct('BRK').balance).toBe(5_250);
  expect(acct('BRK').cash_not_entered).toBeUndefined();
});

test('gap 1 · a reinvested dividend on 10 VTI: 0.5 bought at $310 → 10.5 shares, cash unchanged ($155 in, $155 out)', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'BRK', label: 'Brokerage', kind: 'brokerage', source: 'manual', tax_bucket: 'TAXABLE', balance: 3_000, cash_balance: 0, value_as_of: '2026-11-01',
    positions: [{ position_id: 'p1', ticker: 'VTI', lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2025-01-01' }] }] }] } as any);
  S().recordTransaction({ date: '2026-11-12', type: 'DIVIDEND', account_id: 'BRK', ticker: 'VTI', reinvested: true, shares: 0.5, price: 310 });
  const shares = acct('BRK').positions.find((p: any) => p.ticker === 'VTI').lots.reduce((t: number, l: any) => t + l.shares, 0);
  expect(shares).toBe(10.5);
  expect(acct('BRK').cash_balance ?? 0).toBe(0);
  expect(S().transactions.filter((t: any) => t.type === 'BUY')).toEqual([]);   // the dividend is the activity, not a second BUY
});

describe('gap 2 · a value typed with an earlier date lands on that date in the daily values', () => {
  const TODAY = '2026-10-20';
  const t1 = { asset_id: 't1', label: 'US Treasury 2030', kind: 'fixed_income', source: 'manual', tax_bucket: 'TAXABLE', balance: 24_650, value_as_of: '2026-09-01', face_value: 25_000, coupon_rate: 0.04, maturity_date: '2030-05-15' };
  const ira = { asset_id: 'ira', label: 'Vanguard IRA', kind: 'trad_ira', source: 'manual', tax_bucket: 'PRE_TAX', balance: 100_000, value_as_of: '2026-09-01' };
  const RECORDED = days('2026-09-01', '2026-10-19');
  const v = (id: string, d: string) => valueOn(S().snapshotDays, new Set([id]), d);

  test('$24,900 typed on Oct 20 "as of Sep 30": Sep 29 keeps $24,650; Sep 30 to Oct 19 read $24,900; all 49 days kept', () => {
    jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T15:00:00`));
    useStore.getState().resetAll();
    useStore.setState({ assetAccounts: [t1, ira], snapshotDays: RECORDED.reduce((d: any[], date) => recordDay(d, buildDayFromAccounts([t1, ira], date, `${date}T20:00:00Z`)), []) } as any);
    S().updateAsset('t1', { balance: 24_900, value_as_of: '2026-09-30' });
    expect(S().snapshotDays.map((d: any) => d.date)).toEqual(RECORDED);
    expect(v('t1', '2026-09-29')).toBe(24_650);
    expect(v('t1', '2026-09-30')).toBe(24_900);
    expect(v('t1', '2026-10-19')).toBe(24_900);
    expect(acct('t1')).toMatchObject({ balance: 24_900, value_as_of: '2026-09-30' });
  });

  test('a $5,000 sale on Oct 5, then $19,800 typed with Sep 1 left in the box: Oct 4 keeps $24,650, Oct 5 reads $19,800', () => {
    jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T15:00:00`));
    useStore.getState().resetAll();
    const sold = { ...t1, balance: 19_650 };
    useStore.setState({ assetAccounts: [sold, ira], transactions: [{ id: 'sale', account_id: 't1', type: 'SELL', amount: 5_000, date: '2026-10-05' }],
      snapshotDays: RECORDED.reduce((d: any[], date) => recordDay(d, buildDayFromAccounts([date < '2026-10-05' ? t1 : sold, ira], date, `${date}T20:00:00Z`)), []) } as any);
    S().updateAsset('t1', { balance: 19_800, value_as_of: '2026-09-01' });
    expect(v('t1', '2026-09-01')).toBe(24_650);
    expect(v('t1', '2026-10-04')).toBe(24_650);
    expect(v('t1', '2026-10-05')).toBe(19_800);
    expect(v('t1', '2026-10-19')).toBe(19_800);
  });
});

test('gap 3 · 100 VTI at $80 entered before first entries were logged, with 3 activity records: the activity list still holds 3', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'A1', label: 'A Brokerage', kind: 'brokerage', source: 'manual', tax_bucket: 'TAXABLE', balance: 30_000, value_as_of: '2026-11-01',
      positions: [{ position_id: 'p1', ticker: 'VTI', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] }],
    transactions: [41, 42, 43].map((n, i) => ({ id: `tA${i + 1}`, date: `2026-11-0${i + 2}`, type: 'DEPOSIT', account_id: 'A1', amount: n })) } as any);
  S().updateAsset('A1', { label: 'A Brokerage (renamed)' });   // any save: the switch moves the account and reads it out
  expect(S().assetRecord.length).toBeGreaterThan(0);
  expect(S().transactions.map((t: any) => t.id).sort()).toEqual(['tA1', 'tA2', 'tA3']);
  expect(acct('A1').positions[0].lots.reduce((t: number, l: any) => t + l.shares, 0)).toBe(100);   // the lot is still held
});

test('gap 4 · the account holder is never asked about his own entries: typed $28,000, a typed BUY of 100 VTI at $250, the lot edited to $245', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [{ asset_id: 'F1', label: 'Fidelity', kind: 'brokerage', source: 'manual', tax_bucket: 'TAXABLE', balance: 28_000, cash_balance: 28_000, value_as_of: '2026-11-01' }] } as any);
  S().recordTransaction({ date: '2026-11-05', type: 'BUY', account_id: 'F1', ticker: 'VTI', shares: 100, price: 250 });
  const p = acct('F1').positions.find((x: any) => x.ticker === 'VTI');
  S().updatePosition('F1', p.position_id, { lots: p.lots.map((l: any) => ({ ...l, cost_per_share: 245 })) });
  expect(S().assetRecord.filter((r: any) => r.accountId === 'F1').length).toBeGreaterThanOrEqual(3);   // the guard looked
  const asked = Object.entries(S().assetRecordQuestions ?? {}).filter(([k]) => k.split('#')[0] === 'F1');
  expect(asked).toEqual([]);
  expect(acct('F1').positions.find((x: any) => x.ticker === 'VTI').lots.reduce((t: number, l: any) => t + l.shares, 0)).toBe(100);
  // the price paid corrected to $245 is the purchase on record: $28,000 less 100 × $245 = $3,500 (the old copies kept the
  // cash at $3,000, from the $250 first typed — the lot edit did not reach the cash)
  expect(acct('F1').cash_balance).toBe(28_000 - 100 * 245);
});
