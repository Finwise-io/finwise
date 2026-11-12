/* PHASE 2, STEP 7 — the comparison check's own tool, checked on two accounts worked by hand: one where the list and the
 * old copies agree, and one difference it must see. */
import { compareRecordToOldCopies } from '../testing/compareRecordToOldCopies';
import { moveOldCopies } from '../../MoneyKeel/functions/networth-and-performance/asset-record-move';

const AT = '2026-11-11T10:00:00.000Z';

test('100 VTI at $80 typed, value $9,000 as of Nov 1: moved onto the list, nothing differs; 2 accounts and 1 holding looked at', () => {
  const van = { asset_id: 'van', label: 'Brokerage', kind: 'brokerage', balance: 0, cash_balance: 0, source: 'manual', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] } as any;
  const sav = { asset_id: 'sav', label: 'Savings', kind: 'savings', balance: 9_000, source: 'manual', value_as_of: '2026-11-01' } as any;
  const out = moveOldCopies([], [van, sav], [], AT);
  const c = compareRecordToOldCopies(out.record, [van, sav]);
  expect(c.looked).toEqual({ accounts: 2, holdings: 1 });
  expect(c.differences).toEqual([]);
});

test('the list holding 90 shares where the old copies hold 100 is seen', () => {
  const van = { asset_id: 'van', label: 'Brokerage', balance: 0, source: 'manual', positions: [{ ticker: 'VTI', kind: 'stocks_etf', lots: [{ shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] } as any;
  const rec = moveOldCopies([], [{ ...van, positions: [{ ...van.positions[0], lots: [{ lot_id: 'x', shares: 90, cost_per_share: 80, purchase_date: '2025-03-03' }] }] }], [], AT).record;
  expect(compareRecordToOldCopies(rec, [van]).differences.map((d) => [d.what, d.old, d.list])).toEqual(expect.arrayContaining([['shares', 100, 90], ['paid', 8000, 7200]]));
});
