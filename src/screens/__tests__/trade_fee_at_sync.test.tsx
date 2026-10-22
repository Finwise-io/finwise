/** THE BROKER'S FEE ON A BUY OR A SALE, FROM THE SYNC TO THE HOLDING PAGE (2026-10-21, MK-NW-M-035 realized gain).
 *
 *  The sync used to drop the broker's fee on a trade. It is now kept on the record (tradeFeeOnRecord), with a word saying
 *  whether the stored price already carries it — the stored price is the broker's cash ÷ shares, and a broker's cash is
 *  usually after the fee. Worked by hand (IRS Publication 550, Form 8949): 10 shares bought at $100, sold at $120 with a $5
 *  fee → gain $1,200 − $5 − $1,000 = $195. A $5 fee to buy as well is part of what was paid → $190.
 *  Both ways a broker can report the cash (after the fee, or before it) must give the same gain — never the fee twice.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { useStore } from '../../store/useStore';
import { ingestSync, tradeFeeOnRecord, type AccountSyncPayload } from '../../services/sync/ingest';
import { realizedFromLedger } from '../../domain/performance/realized';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const TODAY = '2026-10-10';
const NOW = `${TODAY}T12:00:00.000Z`;
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

const VTI_SYMBOL = { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any;
/** A $10,000 brokerage still holding 30 VTI at $250, with one round trip of 10 shares on record. */
const payload = (buy: { amount: number; fee?: number | null }, sell: { amount: number; fee?: number | null }): AccountSyncPayload => ({
  account: { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '99887766', institution_name: 'Robinhood',
    raw_type: 'Individual', balance: { total: { amount: 10_000, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: 2_500,
  positions: [{ symbol: VTI_SYMBOL, units: 30, price: 250, average_purchase_price: 200 }],
  activities: [
    { id: 'b1', type: 'BUY', trade_date: '2025-01-02', units: 10, price: 100, amount: buy.amount, fee: buy.fee, symbol: VTI_SYMBOL },
    { id: 's1', type: 'SELL', trade_date: '2026-03-02', units: -10, price: 120, amount: sell.amount, fee: sell.fee, symbol: VTI_SYMBOL },
  ],
});

function sync(p: AccountSyncPayload) {
  const r = ingestSync([], {}, [p], NOW);
  return { acct: r.accounts[0], txns: r.newTransactions };
}
function openHolding(p: AccountSyncPayload) {
  const { acct, txns } = sync(p);
  mockParams = { account: acct.asset_id, position: acct.positions![0].position_id };
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: [acct], transactions: txns,
    priceCache: { VTI: { ticker: 'VTI', points: [{ date: '2025-01-02', close: 100 }, { date: TODAY, close: 250 }] } }, pricesFetchedAt: NOW } as any);
  render(<HoldingDetailScreen />);
}
/** Every visible line, in order. */
function lines(): string[] {
  const out: string[] = [];
  const flat = (n: any): string => (typeof n === 'string' ? n : (n?.children ?? []).map(flat).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = flat(n).trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const allTime = () => lines().filter((l) => /all time$/.test(l));

describe('the sync keeps the broker\'s fee on a buy or a sale', () => {
  test('a sale with a $5 fee and $1,195 of cash (after the fee): fee 5, inside the price ($119.50)', () => {
    const { txns } = sync(payload({ amount: -1_000, fee: 0 }, { amount: 1_195, fee: 5 }));
    const sale = txns.find((t) => t.type === 'SELL')!;
    const buy = txns.find((t) => t.type === 'BUY')!;
    expect([sale.fee, sale.fee_in_price, sale.price]).toEqual([5, true, 119.5]);
    expect(buy.fee).toBe(0);                                              // the broker said $0: a real 0, kept
    expect(txns.length).toBe(2);
  });
  test('the same sale reported as $1,200 of cash (before the fee): fee 5, not inside the price ($120)', () => {
    const { txns } = sync(payload({ amount: -1_000 }, { amount: 1_200, fee: 5 }));
    const sale = txns.find((t) => t.type === 'SELL')!;
    expect([sale.fee, sale.fee_in_price, sale.price]).toEqual([5, false, 120]);
    expect('fee' in txns.find((t) => t.type === 'BUY')!).toBe(false);    // no fee sent: not on record, never $0
  });
  test('only a buy or a sale carries a fee; a missing fee is not on record, $0 is 0', () => {
    expect(tradeFeeOnRecord('DIVIDEND', { fee: 5, amount: 50 })).toEqual({});
    expect(tradeFeeOnRecord('SELL', { fee: null, amount: 1_195, units: -10, price: 120 })).toEqual({});
    expect(tradeFeeOnRecord('SELL', { fee: undefined, amount: 1_195, units: -10, price: 120 })).toEqual({});
    expect(tradeFeeOnRecord('SELL', { fee: 0, amount: 1_200, units: -10, price: 120 })).toEqual({ fee: 0, fee_in_price: true });
    // a broker that writes the fee as a negative is still a $5 fee
    expect(tradeFeeOnRecord('SELL', { fee: -5, amount: 1_195, units: -10, price: 120 })).toEqual({ fee: 5, fee_in_price: true });
    // no cash figure: the stored price is the broker's own price, before the fee
    expect(tradeFeeOnRecord('SELL', { fee: 5, units: -10, price: 120 })).toEqual({ fee: 5, fee_in_price: false });
  });
});

describe('MK-NW-M-035 realized gain on the Holding page reads the fee the sync stored — once', () => {
  test('cash after the fee: +$195 all time (the price carries it; before today\'s rule the same, never $190)', () => {
    openHolding(payload({ amount: -1_000, fee: 0 }, { amount: 1_195, fee: 5 }));
    expect(allTime()).toEqual(['+$195 all time']);
  });
  test('cash before the fee: +$195 all time (before: +$200, the fee was dropped at sync)', () => {
    openHolding(payload({ amount: -1_000 }, { amount: 1_200, fee: 5 }));
    expect(allTime()).toEqual(['+$195 all time']);
  });
  test('a $5 fee to buy is part of what was paid: +$190 all time, whichever way the broker reports the cash', () => {
    openHolding(payload({ amount: -1_005, fee: 5 }, { amount: 1_195, fee: 5 }));
    expect(allTime()).toEqual(['+$190 all time']);
    openHolding(payload({ amount: -1_000, fee: 5 }, { amount: 1_200, fee: 5 }));
    expect(allTime()).toEqual(['+$190 all time']);
  });
  test('the page and the one function agree, to the cent', () => {
    for (const [buy, sell, want] of [
      [{ amount: -1_000, fee: 0 }, { amount: 1_195, fee: 5 }, 195],
      [{ amount: -1_000 }, { amount: 1_200, fee: 5 }, 195],
      [{ amount: -1_005, fee: 5 }, { amount: 1_195, fee: 5 }, 190],
      [{ amount: -1_000, fee: 5 }, { amount: 1_200, fee: 5 }, 190],
    ] as const) {
      const { txns } = sync(payload(buy, sell));
      expect(realizedFromLedger(txns, { ticker: 'VTI', accountId: 'st-acc-1', now: new Date(`${TODAY}T12:00:00`) }).realizedAllTime).toBeCloseTo(want, 6);
    }
  });
});

describe('a buy or a sale stored before 2026-10-21 (no fee) takes the broker\'s fee at the next sync — never imported twice', () => {
  test('cash before the fee: stored at +$200 (fee dropped), the next sync through the real store gives +$195', () => {
    const p = payload({ amount: -1_000 }, { amount: 1_200, fee: 5 });
    const first = ingestSync([], {}, [p], NOW);
    // as the sync stored them before today: the same records with no fee
    const old = first.newTransactions.map(({ fee, fee_in_price, ...t }) => t);
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, hideBalances: false, assetAccounts: first.accounts, transactions: old,
      snaptradeSeenKeys: first.seenKeys,
      priceCache: { VTI: { ticker: 'VTI', points: [{ date: '2025-01-02', close: 100 }, { date: TODAY, close: 250 }] } }, pricesFetchedAt: NOW } as any);
    const before = realizedFromLedger(useStore.getState().transactions, { ticker: 'VTI', now: new Date(`${TODAY}T12:00:00`) }).realizedAllTime;
    expect(before).toBeCloseTo(200, 6);
    useStore.getState().ingestSnapTradeSync([p], []);
    const after = useStore.getState().transactions;
    expect(after.length).toBe(2);                                          // nothing imported twice
    expect(after.find((t) => t.type === 'SELL')).toMatchObject({ fee: 5, fee_in_price: false, price: 120 });
    expect('fee' in after.find((t) => t.type === 'BUY')!).toBe(false);     // the broker sent none for the buy
    mockParams = { account: first.accounts[0].asset_id, position: first.accounts[0].positions![0].position_id };
    render(<HoldingDetailScreen />);
    expect(allTime()).toEqual(['+$195 all time']);
  });
});
