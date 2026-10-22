/** A PRICE PAID LEFT BLANK, AND EVERY FIGURE ON THE HOLDING PAGE COUNTING THE SAME PURCHASES (2026-10-20).
 *
 *  The holding editor saved a blank price paid as $0. The average price paid and the gains if sold today already left such
 *  a purchase out (lotCostOnRecord), but what was paid in total, the gain at the top and the Performance row counted it as
 *  a real $0 cost. 10 shares at $100 and 10 with the price paid left blank, today $120:
 *    before — average $100.00, long-term gain +$200 on 10 of 20 … but Total paid $1,000 for all 20 and a gain of +$1,400.
 *    now    — average $100.00, Total paid $1,000, gain +$200 (+20.00%), long-term gain +$200, Performance's row the same;
 *             the page names the 10 shares left out.
 *  Driven through the real editor (the one the holding page opens) and the real page; the figures are read off the screen
 *  and off the functions the screen asks (theHolding, buildPerformance), and all must agree. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { useStore } from '../../store/useStore';
import { theHolding } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import { buildPerformance, capGains, paidOnRecord } from '../../domain/performance';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const now = new Date();
const monthsAgo = (m: number) => iso(new Date(now.getFullYear(), now.getMonth() - m, 1));
const SERIES = { ticker: 'XYZ', points: [{ date: monthsAgo(30), close: 90 }, { date: monthsAgo(6), close: 110 }, { date: iso(now), close: 120 }] };
const FIRST = { lot_id: 'a', shares: 10, cost_per_share: 100, purchase_date: monthsAgo(24) };

function seed(lots: any[]) {
  mockParams = { account: 'brk', position: 'p1' };
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false, onboardingComplete: true, transactions: [],
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, derive_balance: true,
      positions: [{ position_id: 'p1', ticker: 'XYZ', label: 'XYZ Inc.', kind: 'stocks_etf', lots }] }],
    priceCache: { XYZ: SERIES, SPY: { ...SERIES, ticker: 'SPY' } }, pricesFetchedAt: new Date().toISOString(),
  } as any);
}
const position = () => (useStore.getState() as any).assetAccounts[0].positions[0];

test('the editor saves a price paid left blank as not on record — never $0', () => {
  seed([FIRST]);
  render(<HoldingDetailScreen />);
  fireEvent.press(screen.getByLabelText('Edit this holding'));
  fireEvent.press(screen.getByLabelText('Add another lot'));
  const shares = screen.getAllByPlaceholderText('0');
  expect(shares).toHaveLength(2);                          // the two purchases' share boxes — the second is the new one
  fireEvent.changeText(shares[1], '10');                   // its price paid is left blank
  fireEvent.press(screen.getByLabelText('Save holding'));
  const lots = position().lots;
  expect(lots.map((l: any) => [l.shares, l.cost_per_share])).toEqual([[10, 100], [10, null]]);   // was [[10, 100], [10, 0]]
});

test('a price paid typed and then cleared is not on record too', () => {
  seed([FIRST]);
  render(<HoldingDetailScreen />);
  fireEvent.press(screen.getByLabelText('Edit this holding'));
  fireEvent.press(screen.getByLabelText('Add another lot'));
  fireEvent.changeText(screen.getAllByPlaceholderText('0')[1], '10');
  const cost = screen.getAllByPlaceholderText('—')[1];
  fireEvent.changeText(cost, '95');
  fireEvent.changeText(cost, '');
  fireEvent.press(screen.getByLabelText('Save holding'));
  expect(position().lots[1].cost_per_share).toBeNull();
});

// THE AGREEMENT — one story on the page, from every function that tells part of it. Held for a purchase stored with no cost
// (what the editor saves now, and what a linked broker's purchase with none is stored as) and for the $0 the editor saved
// before today (still in people's records): both are left out the same way.
test.each([['saved now, not on record', null], ['saved before today, as $0', 0]] as const)(
  '10 at $100 and 10 with no price paid (%s), today $120: the average, Total paid, the gain and Performance all count the same 10',
  (_label, blank) => {
    const lots = [FIRST, { lot_id: 'b', shares: 10, cost_per_share: blank, purchase_date: monthsAgo(20) }];
    seed(lots);
    const p = position();
    // the functions
    const h = theHolding({ position: p, accountId: 'brk', price: 120, transactions: [] });
    const row = buildPerformance([p], (t: string) => (t === 'XYZ' || t === 'SPY' ? { ...SERIES, ticker: t } : undefined) as any, '1Y', now)[0];
    const cg = capGains(p, 120, now);
    expect(paidOnRecord(p)).toEqual({ paid: 1000, counted: 10, held: 20 });
    expect(h.avgPaidPerShare).toBe(100);
    expect(h.avgLeavesOut).toBe(10);
    expect(h.totalPaid).toBe(1000);                            // was 1,000 for all 20 (with $0), or not stated (with none)
    expect(h.gain).toBe(200);                                  // 10 × ($120 − $100); was $2,400 − $1,000 = $1,400
    expect(h.returnOnCost).toBeCloseTo(0.2, 12);
    expect([row.costBasis, row.gain, row.totalROI]).toEqual([h.totalPaid, h.gain, h.returnOnCost]);   // Performance's row
    expect([cg.totalGain, cg.countedShares, cg.heldShares]).toEqual([h.gain, 10, 20]);               // the gains if sold today
    // the page
    render(<HoldingDetailScreen />);
    expect(screen.getByText('$100.00')).toBeOnTheScreen();                                       // Price paid (average)
    expect(screen.getByText('$1,000')).toBeOnTheScreen();                                        // Total paid
    expect(screen.getByText('▲ +$200 (+20.00%)')).toBeOnTheScreen();                              // the gain at the top
    expect(screen.getByText('+$200')).toBeOnTheScreen();                                         // Gain — long-term
    expect(screen.queryByText(/1,400/)).toBeNull();
    expect(screen.getByText('$200 gain on 10 of 20 shares; what you paid for the other 10 is not on record.')).toBeOnTheScreen();
    expect(screen.getByText('The average above and the total paid leave out 10 shares with no price paid on record.')).toBeOnTheScreen();
  });

test('with every price paid on record nothing changes: the gain is the value less what was paid', () => {
  const lots = [FIRST, { lot_id: 'b', shares: 10, cost_per_share: 110, purchase_date: monthsAgo(20) }];
  seed(lots);
  const h = theHolding({ position: position(), accountId: 'brk', price: 120, transactions: [] });
  expect([h.totalPaid, h.gain, h.avgLeavesOut]).toEqual([2100, 2400 - 2100, 0]);
  render(<HoldingDetailScreen />);
  expect(screen.queryByText(/leave out/)).toBeNull();
});
