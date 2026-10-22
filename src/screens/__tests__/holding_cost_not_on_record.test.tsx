/** A PURCHASE WITH NO PRICE PAID ON RECORD (2026-10-20).
 *
 *  1. A linked broker that sends a purchase with no cost: it is stored as NOT ON RECORD (null), never $0. Before, the
 *     sync stored $0, the average price counted it as a real $0 (10 shares at $100 and 10 with no cost read $50.00) and
 *     the gains below left it out — two readings of one purchase on one page. One rule now decides both
 *     (lotCostOnRecord), and the page says the average leaves the purchase out.
 *  2. Q20, by his rule for sales (DEC-4643, 2026-10-12: "$200 gain on 10 of 15 shares sold; what you paid for the other
 *     5 is not on record"): the gain if sold today counts the purchases with a price paid and says what is left out.
 *     Before, one purchase with no price paid refused the whole gain. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { useStore } from '../../store/useStore';
import { ingestSync, stAssetId } from '../../services/sync/ingest';
import { theHolding } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import { capGains } from '../../domain/performance';
import { gainOnPartSentence, saleShortOfPurchasesSentence } from '../../domain/performance/realized';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const now = new Date();
const monthsAgo = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
const series = (ticker: string, close: number) => ({ ticker, points: [{ date: monthsAgo(14), close: close * 0.8 }, { date: monthsAgo(6), close: close * 0.9 }, { date: iso(now), close }] });

function open(account: any, price: number) {
  mockParams = { account: account.asset_id, position: account.positions[0].position_id };
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false, onboardingComplete: true, assetAccounts: [account], transactions: [],
    priceCache: { [account.positions[0].ticker]: series(account.positions[0].ticker, price), SPY: series('SPY', 500) },
    pricesFetchedAt: new Date().toISOString(),
  } as any);
  render(<HoldingDetailScreen />);
}

test('a linked purchase with no cost is stored as not on record, and the average price is $100.00 — not $50.00', () => {
  const r = ingestSync([], {}, [{
    account: { id: 'acc-l', brokerage_authorization: 'c', name: 'Brokerage', number: '1234', institution_name: 'Schwab', raw_type: 'Individual', balance: { total: { amount: 2400, currency: 'USD' } } } as any,
    balancesCash: 0,
    positions: [{ symbol: { id: 'u', raw_symbol: 'ABC', description: 'ABC Corp', type: { code: 'cs' } } as any, units: 20, price: 120,
      tax_lots: [{ original_purchase_date: '2023-02-01', quantity: 10, purchased_price: 100 }, { original_purchase_date: '2023-03-01', quantity: 10, purchased_price: null }] } as any],
  }], new Date().toISOString());
  const acct: any = r.accounts.find((a) => a.asset_id === stAssetId('acc-l'));
  expect(acct.positions[0].lots.map((l: any) => l.cost_per_share)).toEqual([100, null]);   // was [100, 0]

  const h = theHolding({ position: acct.positions[0], accountId: acct.asset_id, price: 120, transactions: [] });
  expect(h.avgPaidPerShare).toBe(100);                  // was 1,000 ÷ 20 = 50
  expect(h.avgLeavesOut).toBe(10);
  expect(h.purchases.map((p) => p.costPerShare)).toEqual([100, null]);

  open(acct, 120);
  expect(screen.getByText('$100.00')).toBeOnTheScreen();                                         // Price paid (average)
  expect(screen.queryByText('$50.00')).toBeNull();
  expect(screen.getByText('The average above and the total paid leave out 10 shares with no price paid on record.')).toBeOnTheScreen();
  expect(screen.getByText(/10 sh @ no purchase price recorded/)).toBeOnTheScreen();
  // the gain says the second purchase's cost is unknown: 10 × ($120 − $100) = $200 on the 10 that have one
  expect(screen.getByText('$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record.')).toBeOnTheScreen();
});

test('Q20 by DEC-4643 — 10 shares at $50 and 10 with no price paid, today $70: "$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record"', () => {
  const position = { position_id: 'p1', ticker: 'XYZ', label: 'XYZ Inc.', kind: 'stocks_etf', lots: [
    { lot_id: 'a', shares: 10, cost_per_share: 50, purchase_date: '2023-01-10' },
    { lot_id: 'b', shares: 10, cost_per_share: null, purchase_date: '2023-06-10' }] };
  const cg = capGains(position as any, 70, now);
  expect(cg).toEqual({ longGain: 200, shortGain: 0, totalGain: 200, countedShares: 10, heldShares: 20 });   // longGain was null

  open({ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true, positions: [position] }, 70);
  expect(screen.getByText('+$200')).toBeOnTheScreen();                                          // Gain — long-term (held over 1 yr)
  expect(screen.getByText('$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record.')).toBeOnTheScreen();
  expect(screen.queryByText(/Not stated — a purchase has no price paid/)).toBeNull();
});

test('one sentence writer: the sale line of DEC-4643 reads exactly as before, and nothing counted says so', () => {
  const holding = { kind: 'stocks_etf' } as any;
  const m = (n: number) => `$${n}`;
  expect(saleShortOfPurchasesSentence({ date: '2026-01-01', sold: 15, matched: 10, gain: 200 } as any, holding, m))
    .toBe('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.');
  expect(saleShortOfPurchasesSentence({ date: '2026-01-01', sold: 5, matched: 0, gain: null } as any, holding, m))
    .toBe('5 shares sold; what you paid for them is not on record, so no gain is counted.');
  expect(gainOnPartSentence({ gain: null, counted: 0, of: 20 }, holding, m))
    .toBe('20 shares; what you paid for them is not on record, so no gain is counted.');
  expect(gainOnPartSentence({ gain: -30, counted: 1, of: 2 }, { kind: 'crypto' } as any, m))
    .toBe('$30 loss on 1 of 2 coins; what you paid for the other 1 is not on record.');
});
