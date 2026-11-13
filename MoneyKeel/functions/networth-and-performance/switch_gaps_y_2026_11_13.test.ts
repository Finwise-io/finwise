/** THE SWITCH GAPS OF 2026-11-13, agent Y's four: what the one dated record holds for each, read out the way the screens will
 *  read it once they read the record. Every figure is worked by hand on its line.
 *  (1) and (2) an amount sold of a bond, a CD or an alternative typed as one value was saved as a broker's unknown word,
 *  counted in nothing, so the value stood still; (3) a broker's dividend that left and a fee that came back lost their
 *  direction; (4) a file of 110 handed in after a recorded buy of 10 removed the buy and kept 110 owned. */
import { useStore } from '../../../src/store/useStore';
import { readOuts } from './asset-record-readouts';
import { moneyIntoAccount } from '../../../Calculation Module code/engines/ledger';
import { brokerUpdateToRecord } from './asset-record-from-broker';
import { addRows as addRecordRows } from './asset-record';

const st = () => useStore.getState() as any;
const read = () => readOuts(st(), '2026-11-13');
const acct = (id: string) => read().assetAccounts.find((a) => String(a.asset_id) === id)!;

beforeEach(() => useStore.getState().resetAll());

describe('(1) and (2) an amount sold of an account with no holdings', () => {
  test('a $10,000 CD, $4,000 sold: the record reads 10,000 − 4,000 = $6,000, and the sale is on its activity', () => {
    useStore.getState().addAsset({ label: 'Chase CD', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 10000, face_value: 10000, coupon_rate: 0.04, maturity_date: '2030-01-01' } as any);
    const id = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ type: 'SELL', account_id: id, amount: 4000, date: '2026-11-13', note: 'Bond sale' });
    expect(acct(id).balance).toBeCloseTo(6000, 9);
    const sells = read().transactions.filter((t) => t.type === 'SELL' && String(t.account_id) === id);
    expect(sells.map((t) => t.amount)).toEqual([4000]);
    expect(sells[0].ticker).toBeUndefined();
  });

  test('a Treasury worth $24,650, $1,000.33 sold: 24,650 − 1,000.33 = $23,649.67 at full precision', () => {
    useStore.getState().addAsset({ label: 'US Treasury 2027', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24650, face_value: 25000, coupon_rate: 0.0425, maturity_date: '2027-06-30' } as any);
    const id = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ type: 'SELL', account_id: id, amount: 1000.33, date: '2026-11-13', note: 'Bond sale' });
    expect(acct(id).balance).toBeCloseTo(23649.67, 9);
  });

  test('a matured $10,000 CD paid out to the bank: 10,000 − 10,000 = $0, the payout on its activity', () => {
    useStore.getState().addAsset({ label: 'Chase CD 4.0%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 10000, face_value: 10000, coupon_rate: 0.04, maturity_date: '2026-06-30' } as any);
    const id = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ type: 'SELL', account_id: id, amount: 10000, date: '2026-07-01', note: 'Matured — paid out' });
    expect(acct(id).balance).toBeCloseTo(0, 9);
    expect(read().transactions.filter((t) => t.type === 'SELL').map((t) => t.amount)).toEqual([10000]);
  });
});

describe('(3) a broker\'s money that went the other way', () => {
  test('a −$50 dividend and a $5 fee refunded: the activity reads −$50 and +$5, never $0', () => {
    useStore.getState().addAsset({ label: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 2455 } as any);
    const id = String(st().assetAccounts[0].asset_id);
    const u = brokerUpdateToRecord(st().assetRecord, {
      account: { id: 'acc-1', name: 'Robinhood Individual', institution_name: 'Robinhood', raw_type: 'Individual', balance: { total: { amount: 2455 } } },
      holdings: { positions: [], optionPositions: [], balances: [{ cash: 2455 }] },
      activities: [
        { id: 'd-rev', type: 'DIVIDEND', trade_date: '2026-10-05', amount: -50, symbol: { id: 'u-vti', raw_symbol: 'VTI' } },
        { id: 'f-ref', type: 'FEE', trade_date: '2026-10-06', amount: 5 },
      ],
    } as any, id);
    useStore.setState({ assetRecord: addRecordRows(st().assetRecord, u.events, '2026-11-13T12:00:00.000Z') } as any);
    const t = read().transactions.filter((x) => String(x.account_id) === id);
    const by = (type: string) => t.find((x) => x.type === type)!;
    expect(by('DIVIDEND')).toMatchObject({ amount: 50, direction: 'OUT' });
    expect(by('FEE')).toMatchObject({ amount: 5, direction: 'IN' });
    expect([moneyIntoAccount(by('DIVIDEND')), moneyIntoAccount(by('FEE'))]).toEqual([-50, 5]);
  });
});

describe('(4) a file handed in again after a recorded buy', () => {
  const file = (shares: number, cost: number) => [{ position_id: `p${cost}`, ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: `l${cost}`, shares, cost_per_share: cost, purchase_date: '' }] }];
  test('100 VTI at $80, a buy of 10 at $100, then a file of 110 at $81.82: owned 110 − 10 = 100, the buy stays, 110 held', () => {
    useStore.getState().addAsset({ label: 'Imported', kind: 'brokerage', asset_class: 'stocks_etf', balance: 8000, positions: file(100, 80), derive_balance: true } as any);
    const id = String(st().assetAccounts[0].asset_id);
    st().recordTransaction({ date: '2026-11-11', type: 'BUY', account_id: id, ticker: 'VTI', shares: 10, price: 100 } as any);
    st().updateAsset(id, { positions: file(110, 81.82) } as any);
    const t = read().transactions.filter((x) => String(x.account_id) === id);
    expect(t.filter((x) => x.type === 'OPENING_POSITION').map((x) => [x.shares, x.price])).toEqual([[100, 81.82]]);
    expect(t.filter((x) => x.type === 'BUY').map((x) => x.shares)).toEqual([10]);
    const held = (acct(id).positions ?? []).flatMap((p) => p.lots ?? []).reduce((n, l) => n + Number(l.shares), 0);
    expect(held).toBeCloseTo(110, 9);   // 100 + 10
  });

  test('the same file twice, no trade between: still one record of 100 — never counted twice', () => {
    useStore.getState().addAsset({ label: 'Imported', kind: 'brokerage', asset_class: 'stocks_etf', balance: 8000, positions: file(100, 80), derive_balance: true } as any);
    const id = String(st().assetAccounts[0].asset_id);
    st().updateAsset(id, { positions: file(100, 80) } as any);
    expect(read().transactions.filter((x) => x.type === 'OPENING_POSITION').map((x) => [x.shares, x.price])).toEqual([[100, 80]]);
  });
});
