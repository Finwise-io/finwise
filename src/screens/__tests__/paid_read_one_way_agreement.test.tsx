/** WHAT WAS PAID, READ ONE WAY, EVERYWHERE IT IS READ (2026-10-21) — and a purchase date read one way.
 *
 *  The rule (paidOnRecord / lotCostOnRecord, 2026-10-20; DEC-6627, tenet 4): a purchase's price paid is on record when it is
 *  a cost per share above $0. A stored $0 — what a blank in the holding editor saved, and what a sync wrote for a missing
 *  cost until 2026-10-20 — is NOT a real $0, exactly as a missing one is not. The Holding page has read it that way since
 *  2026-10-20; costBasis (MK-PF-F-002) still read $0 as a figure, and five readers used it or its arithmetic:
 *    · the account balance of a holding with no price (recomputeBalances, the store) — what Net worth and the account page add up;
 *    · the value in brackets on Performance's left-out sentence (leftOutValueOf, MK-NW-F-139);
 *    · the share of a taxable draw that is gain, in the retirement plan (taxableGainShare, MK-PL-F-081);
 *    · the sync's keeping of a cost the person typed (theirCost, MK-XS-F-184), and its sums of what was paid;
 *    · a purchase inside a window on Performance (purchasePieces and gainRowBetween), which began at $0.
 *  A day that does not exist (31 February) is no purchase date (purchaseDateOnRecord) in the two window readers too.
 *
 *  THE RIGHT FIGURES, BY HAND, before any reader is asked:
 *    H1  10 shares at $100 and 10 saved at $0 ........ paid $1,000, on 10 of 20 shares
 *    H2  10 shares at $100 and 10 with none .......... paid $1,000, on 10 of 20 shares
 *    H3  0.5 coins saved at $0, nothing else ......... paid not on record
 *    H4  2 option contracts at $5 and 1 with none .... paid 2 × 100 × $5 = $1,000, on 2 of 3 contracts
 *    At $120 a share, H1's gain is 10 × ($120 − $100) = $200 on $1,200 of value counted: a gain share of 1 ÷ 6 = 16.67%
 *    (costBasis read 20 shares, $2,400, against $1,000: 58.33%).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { useStore } from '../../store/useStore';
import HoldingDetailScreen from '../HoldingDetailScreen';
import { paidOnRecord, totalShares, contractMultiplier, buildPerformance, type Position } from '../../domain/performance';
import { taxableGainShare } from '../../domain/decumulation';
import { ingestSync, stAssetId } from '../../services/sync/ingest';
import { theHolding } from '../../../MoneyKeel/functions/networth-and-performance/holding';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const lot = (id: string, shares: number, cost: number | null, date = '2024-01-02') => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
const H: Record<string, Position> = {
  H1: { position_id: 'h1', ticker: 'AAA', kind: 'stocks_etf', lots: [lot('a', 10, 100), lot('b', 10, 0)] } as any,
  H2: { position_id: 'h2', ticker: 'BBB', kind: 'stocks_etf', lots: [lot('a', 10, 100), lot('b', 10, null)] } as any,
  H3: { position_id: 'h3', ticker: 'CCC', kind: 'crypto', lots: [lot('a', 0.5, 0)] } as any,
  H4: { position_id: 'h4', ticker: 'DDD', kind: 'options', lots: [lot('a', 2, 5), lot('b', 1, null)] } as any,
};
const BY_HAND: Record<string, number | null> = { H1: 1000, H2: 1000, H3: null, H4: 1000 };

// leftOutValueOf and heldValueOf are not exported: compiled from their own source text, handed what they import
const PERF = fs.readFileSync(path.join(__dirname, '../../../MoneyKeel/functions/networth-and-performance/performance.ts'), 'utf8');
const leftOutValueOf = (() => {
  const parts = [/function heldValueOf\([\s\S]*?\n}\n/, /const leftOutValueOf = [^\n]*\n/].map((re) => { const m = PERF.match(re); if (!m) throw new Error(`${re} not found`); return m[0]; });
  const js = ts.transpileModule(parts.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  return new Function('totalShares', 'contractMultiplier', 'paidOnRecord', `${js}\nreturn leftOutValueOf;`)(totalShares, contractMultiplier, paidOnRecord) as (r: any) => number | null;
})();

/** The account balance the store builds for a hand-built account holding `p`, with no price for it. */
function balanceOf(p: Position, prior?: number): number {
  useStore.getState().resetAll();
  const pos = prior == null ? p : { ...p, value_now: prior };
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, cash_balance: 0, derive_balance: true, positions: [pos] }], priceCache: {} } as any);
  useStore.getState().updatePosition('a1', p.position_id, {});
  return (useStore.getState().assetAccounts[0] as any).balance;
}

describe('a stored $0 price paid, read one way by every reader', () => {
  test('the hand figures: paidOnRecord gives them, for all four holdings', () => {
    expect(Object.fromEntries(Object.entries(H).map(([k, p]) => [k, paidOnRecord(p).paid]))).toEqual(BY_HAND);
  });

  test('no price: the Holding page\'s large figure and Total paid, the Performance row, the account balance and the left-out bracket agree', () => {
    const seen = Object.entries(H).map(([k, p]) => {
      const h = theHolding({ position: p, accountId: 'a1', price: null, transactions: [] });
      return [k, h.value, h.totalPaid, buildPerformance([p], () => undefined as any, '1Y', new Date())[0].costBasis, leftOutValueOf({ position: p, marketValue: null }), balanceOf(p)];
    });
    expect(seen).toEqual([
      ['H1', 1000, 1000, 1000, 1000, 1000],
      ['H2', 1000, 1000, 1000, 1000, 1000],   // the balance kept a stale figure here, and the bracket went
      ['H3', null, null, null, null, 0],      // the balance and the bracket read $0 as paid; the balance has nothing earlier to keep
      ['H4', 1000, 1000, 1000, 1000, 1000],
    ]);
    expect(seen).toHaveLength(4);
    // with a value built earlier, a holding whose only purchase was saved at $0 keeps it — it no longer falls to $0
    expect(balanceOf(H.H3, 750)).toBe(750);
  });

  test('on screen: the Holding page reads $1,000 where the account balance adds $1,000', () => {
    const bal = balanceOf(H.H1);
    mockParams = { account: 'a1', position: 'h1' };
    useStore.setState({ onboardingComplete: true, hideBalances: false, pricesFetchedAt: new Date().toISOString() } as any);
    render(<HoldingDetailScreen />);
    expect(bal).toBe(1000);
    expect(screen.getAllByText('$1,000')).toHaveLength(2);    // the large figure, and Total paid
  });

  test('the gain share of a taxable draw is the Holding page\'s gain over the value it counts: 16.67%, not 58.33%', () => {
    const acct = (p: Position) => [{ asset_id: 't', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 2400, positions: [p] }] as any;
    const h = theHolding({ position: H.H1, accountId: 't', price: 120, transactions: [] });
    expect(h.gain).toBe(200);
    expect(taxableGainShare(acct(H.H1), () => 120)).toBeCloseTo(200 / 1200, 12);   // was 1,400 ÷ 2,400 = 58.33%
    expect(taxableGainShare(acct(H.H2), () => 120)).toBeCloseTo(200 / 1200, 12);   // was unknown
    expect(taxableGainShare(acct(H.H3), () => 60000)).toBeNull();                   // no price paid on record at all: unknown, as before
  });

  test('the sync keeps a cost the person typed over the purchases that have one: $100.00 a share, not $50.00', () => {
    const prior = [{ asset_id: stAssetId('acc-y'), label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 2400, source: 'connected',
      positions: [{ position_id: 'p', ticker: 'ABC', cost_source: 'user', lots: [lot('a', 10, 100), lot('b', 10, null)] }] }] as any;
    const r = ingestSync(prior, {}, [{
      account: { id: 'acc-y', brokerage_authorization: 'c', name: 'Brokerage', number: '1234', institution_name: 'Schwab', raw_type: 'Individual', balance: { total: { amount: 2400, currency: 'USD' } } } as any,
      balancesCash: 0,
      positions: [{ symbol: { id: 'u', raw_symbol: 'ABC', description: 'ABC Corp', type: { code: 'cs' } } as any, units: 20, price: 120,
        tax_lots: [{ original_purchase_date: '2023-02-01', quantity: 20, purchased_price: 90 }] } as any],
    }], new Date().toISOString());
    const acct: any = r.accounts.find((a) => a.asset_id === stAssetId('acc-y'));
    expect(acct.positions[0].lots.map((l: any) => l.cost_per_share)).toEqual([100]);   // was 1,000 ÷ 20 = $50
  });

  test('a purchase inside the window saved at $0 is not on record: the window return refuses, as for a missing cost', () => {
    const now = new Date(2026, 9, 1, 12);
    const series = { ticker: 'EEE', points: [{ date: '2025-09-30', close: 100 }, { date: '2026-03-02', close: 110 }, { date: '2026-10-01', close: 120 }] };
    const row = (cost: number | null) => buildPerformance([{ position_id: 'e', ticker: 'EEE', kind: 'stocks_etf',
      lots: [lot('a', 10, 100, '2026-01-05'), lot('b', 10, cost, '2026-03-02')] } as any], () => series as any, '1Y', now)[0];
    expect(row(0).periodReturn).toBe(row(null).periodReturn);   // a $0 began its piece at $0 — the same as no cost on record now
    expect(row(0).periodReturn).toBeNull();
    expect(row(110).periodReturn).not.toBeNull();                 // with the price paid on record it is measured
  });
});

describe('a day that does not exist is no purchase date in the window readers', () => {
  test('31 February is read as no date — the same return as a purchase with its date missing', () => {
    const now = new Date(2026, 9, 1, 12);
    const series = { ticker: 'FFF', points: [{ date: '2025-09-30', close: 100 }, { date: '2026-01-05', close: 100 }, { date: '2026-02-27', close: 104 }, { date: '2026-03-03', close: 112 }, { date: '2026-10-01', close: 120 }] };
    const row = (date: string) => buildPerformance([{ position_id: 'f', ticker: 'FFF', kind: 'stocks_etf',
      lots: [lot('a', 10, 100, '2026-01-05'), lot('b', 10, 104, date)] } as any], () => series as any, '1Y', now)[0];
    expect(row('2026-02-31').periodReturn).toBe(row('').periodReturn);
    expect(row('2026-02-31').periodReturn).not.toBe(row('2026-02-27').periodReturn);   // it was read as a real day
  });

  test('gainRowBetween reads a purchase date through purchaseDateOnRecord, and a cost through lotCostOnRecord', () => {
    const body = PERF.match(/function gainRowBetween\([\s\S]*?\n}\n/)![0];
    expect(body).toMatch(/const boughtOn = \(l: any\): string \| null => purchaseDateOnRecord\(l\?\.purchase_date\)/);
    // (2026-10-22, W-START: the unknown row also says why — a purchase with no price paid on record — so the left-out line gives
    // that reason, canon row 24; the cost is still read through lotCostOnRecord)
    expect(body).toMatch(/if \(inside\.some\(\(l\) => !lotCostOnRecord\(l\)\)\) return \{ \.\.\.unknown, paidInside: null \};/);
    expect(body).not.toMatch(/\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\/\.test\(String\(l\?\.purchase_date/);
  });
});

// ═══ THE LAST TWO OF THE CLASS (2026-10-21) ════════════════════════════════════════════════════════════════════════════
describe('the daily record and the first-in-first-out sale read a cost and a date the one way', () => {
  const { buildDayFromAccounts, lotCostOnRecord: engineRule } = require('../../../Calculation Module code/engines/snapshots');
  const { lotCostOnRecord: appRule } = require('../../domain/performance');
  const { applyTransaction } = require('../../domain/transactions');

  test('one rule for a cost: the app re-exports the engine\'s, so the two cannot drift', () => {
    expect(appRule).toBe(engineRule);
    const costs = [100, 0.01, 0, -5, null, undefined, NaN, Infinity];
    expect(costs.map((c) => engineRule({ cost_per_share: c }))).toEqual([true, true, false, false, false, false, false, false]);
  });

  test('the day written for Net worth\'s history: what was paid when there is no price; never $0 for a worth that is not known', () => {
    const acct = (positions: any[]) => ({ asset_id: 'a1', cash_balance: 50, positions });
    const day = (positions: any[]) => buildDayFromAccounts([acct(positions)], '2026-10-21', '2026-10-21T12:00:00Z');
    // H1 by hand: 10 at $100 and 10 saved at $0, no price → $1,000 (the Holding page's large figure)
    expect(day([{ ticker: 'AAA', lots: [{ shares: 10, cost_per_share: 100 }, { shares: 10, cost_per_share: 0 }] }]).holdings.map((h: any) => h.value)).toEqual([1000]);
    // only purchase saved at $0, a value the balance was built from: $750 — it was written $0
    expect(day([{ ticker: 'CCC', value_now: 750, lots: [{ shares: 0.5, cost_per_share: 0 }] }]).holdings.map((h: any) => h.value)).toEqual([750]);
    // no price, no price paid on record, no value: the account is left off the day, as a day that cannot price it always is
    const unknown = day([{ ticker: 'CCC', lots: [{ shares: 0.5, cost_per_share: 0 }] }]);
    expect([unknown.holdings.length, unknown.accounts.length]).toEqual([0, 0]);   // it was a holding worth $0 beside $50 of cash
    // a priced holding is unchanged
    expect(day([{ ticker: 'AAA', last_price: 120, lots: [{ shares: 10, cost_per_share: 0 }] }]).holdings.map((h: any) => h.value)).toEqual([1200]);
  });

  test('a sale takes the oldest purchase first; 31 February is no date, so it goes last with the undated ones', () => {
    const sell = (dates: string[]) => {
      const accounts = [{ asset_id: 'a1', label: 'B', kind: 'brokerage', balance: 0, cash_balance: 0, derive_balance: true,
        positions: [{ position_id: 'p', ticker: 'AAA', lots: dates.map((d, i) => ({ lot_id: `l${i}`, shares: 10, cost_per_share: 100, purchase_date: d })) }] }];
      const out = applyTransaction(accounts as any, { id: 't', created_at: '2026-10-21T00:00:00Z', type: 'SELL', account_id: 'a1', position_id: 'p', ticker: 'AAA', shares: 10, price: 120, date: '2026-10-21' } as any);
      return out[0].positions[0].lots.filter((l: any) => l.shares > 0).map((l: any) => l.purchase_date);
    };
    expect(sell(['2026-02-31', '2026-06-01'])).toEqual(['2026-02-31']);   // it sold the "31 February" purchase as if the oldest
    expect(sell(['', '2026-06-01'])).toEqual(['']);                       // the same as a purchase with no date
  });
});
