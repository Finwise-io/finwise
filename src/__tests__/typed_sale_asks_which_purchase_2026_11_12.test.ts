/* OUTSIDE CHECK 3, 2026-11-12 (DEC-10749) — A SALE TYPED BY HAND THAT MAY HAVE SOLD A PURCHASE WITH NO DATE IS ASKED ABOUT,
 * as a broker sync's sale already is: which purchase it sold decides its gain, so the record never chooses in silence. */
import { useStore } from '../store/useStore';

const st = () => useStore.getState() as any;
beforeEach(() => useStore.setState({ assetAccounts: [], transactions: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any));

test('100 VTI typed with no purchase date, 50 bought Feb 1, then 60 sold Mar 1: the sale is asked once — from the undated 100 or the Feb 1 50', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 20_000, source: 'manual' });
  const id = String(st().assetAccounts[0].asset_id);
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 150 }] });
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 50, price: 200, date: '2026-02-01' });
  st().recordTransaction({ type: 'SELL', account_id: id, ticker: 'VTI', shares: 60, price: 220, date: '2026-03-01' });
  const sales = st().assetRecordQuestions[id]?.sales ?? [];
  expect(sales.map((q: any) => [q.holding, q.shares, q.choices.map((p: any) => [p.date, p.shares])])).toEqual([['VTI', 60, [[null, 100], ['2026-02-01', 50]]]]);
});
