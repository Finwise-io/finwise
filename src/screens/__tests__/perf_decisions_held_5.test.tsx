/** HIS DECISIONS, HELD ON THE PERFORMANCE TAB ITSELF — part 5 (PF-DECISIONS, 2026-10-21).
 *
 *  Each decision below was "TESTED" in the log only by a function test or a check of the record, never by the
 *  screen a person reads. Each test here renders the Performance tab and fails if the screen breaks the decision.
 *  Every test is named by the decision it holds.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerformanceScreen from '../PerformanceScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const TODAY = isoLocalDate(new Date());
const monthsAgo = (m: number) => { const d = new Date(`${TODAY}T12:00:00`); d.setMonth(d.getMonth() - m); return isoLocalDate(d); };

/** every visible line, in order — what a person reads */
function lines(): string[] {
  const out: string[] = [];
  const text = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : (n.children ?? []).map(text).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = text(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(() => {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete(true);
  useStore.setState({ hideBalances: false } as any);
});

// ── DEC-0248 ─────────────────────────────────────────────────────────────────────────────────────────
// "ok — the math column is the value-weighted average." Where the Performance tab blends the yearly rates of several
// bonds into the Bonds & CDs row, each rate weighs by what that bond is worth — never a plain average of the rates.
test('DEC-0248 — the Bonds & CDs row blends the bonds\' stated rates by what each is worth: $5,000 at 4% and $15,000 at 5% read +4.75%/year, not the plain +4.50%', () => {
  // Performance v17 phone 1's household (a linked brokerage with a year of daily record), plus two CDs held as their own accounts
  const day = (date: string, value: number) => ({
    date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
    holdings: [{ date, accountId: 'van', securityKey: 'VTI', symbol: 'VTI', units: 300, price: value / 300, value, currency: 'USD' }],
    accounts: [{ date, accountId: 'van', cash: 0, statedTotal: value, typedValue: null, currency: 'USD' }],
  });
  const days: any[] = [];
  for (let m = 11; m >= 0; m -= 1) days.push(day(monthsAgo(m), 78_000 + (11 - m) * 1_000));
  days.push(day(TODAY, 99_000));
  useStore.setState({
    assetAccounts: [
      { asset_id: 'van', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 99_000, target_return: 0.05,
        source: 'connected', last_synced: new Date().toISOString(), cash_balance: 0,
        positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 330, lots: [{ lot_id: 'l1', shares: 300, cost_per_share: 260, purchase_date: monthsAgo(11) }] }] },
      { asset_id: 'cd1', label: 'KeyBank CD 4.00%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 5_000, target_return: 0.04, coupon_rate: 0.04, maturity_date: '2027-08-24' },
      { asset_id: 'cd2', label: 'Ally CD 5.00%', kind: 'fixed_income', tax_bucket: 'TAXABLE', balance: 15_000, target_return: 0.05, coupon_rate: 0.05, maturity_date: '2028-03-31' },
    ],
    transactions: [
      { id: 'i1', date: monthsAgo(2), type: 'INTEREST', account_id: 'cd1', ticker: 'KeyBank CD 4.00%', amount: 100, created_at: 'x' },
      { id: 'i2', date: monthsAgo(2), type: 'INTEREST', account_id: 'cd2', ticker: 'Ally CD 5.00%', amount: 300, created_at: 'x' },
    ],
    snapshotDays: days, invDaily: {},
    priceCache: { VTI: { ticker: 'VTI', points: [{ date: monthsAgo(11), close: 260 }, { date: TODAY, close: 330 }] } },
    pricesFetchedAt: new Date().toISOString(),
  } as any);
  render(<PerformanceScreen />);
  const all = lines();
  const at = all.indexOf('Bonds & CDs');
  expect(at).toBeGreaterThan(-1);                                   // the row is there — the guard looked
  const row = all.slice(at, at + 3).join(' | ');
  // (0.04 × 5,000 + 0.05 × 15,000) ÷ 20,000 = 4.75%; the plain average (4% + 5%) ÷ 2 would be 4.50%
  expect(row).toBe('Bonds & CDs | $400 | +4.75%/year');
  screen.unmount();
});

// ── DEC-0478 ─────────────────────────────────────────────────────────────────────────────────────────
// "Is this manual, imported or connected and captured via Plaid?" Every account on the Performance tab says where its
// figures came from, in one of three words: Linked, Imported, or By hand · you update it.
test('DEC-0478 — on the Performance tab (a fresh account, day one) each account says where its figures come from: Linked, Imported, By hand · you update it — and the hand-entered one is never called Linked', () => {
  const pos = (id: string, ticker: string) => ({ position_id: id, ticker, asset_class: 'stock_etf', last_price: 100,
    lots: [{ lot_id: `${id}l`, shares: 10, cost_per_share: 80, purchase_date: monthsAgo(14) }] });
  useStore.setState({
    assetAccounts: [
      { asset_id: 'lnk', label: 'LINKED ONE', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1_000, target_return: 0.05,
        source: 'connected', last_synced: new Date().toISOString(), positions: [pos('a', 'VTI')] },
      { asset_id: 'imp', label: 'IMPORTED ONE', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1_000, target_return: 0.05,
        source: 'imported', last_synced: new Date().toISOString(), positions: [pos('b', 'VOO')] },
      { asset_id: 'hnd', label: 'HAND ONE', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 1_000, target_return: 0.05,
        source: 'manual', positions: [pos('c', 'QQQ')] },
    ],
    transactions: [], snapshotDays: [], invDaily: {},
    priceCache: {}, pricesFetchedAt: new Date().toISOString(),
  } as any);
  render(<PerformanceScreen />);
  const all = lines();
  // each account's block runs from its own bar to the next account's bar
  const block = (label: string) => {
    const from = all.findIndex((l) => l === label);   // the account's own bar, not a sentence that names it
    expect(from).toBeGreaterThan(-1);
    const next = all.findIndex((l, k) => k > from && /^(Fidelity Brokerage|Schwab Brokerage|HAND ONE|WHAT EACH CATEGORY EARNED)$/.test(l));
    return all.slice(from + 1, next < 0 ? from + 8 : next).join(' | ');
  };
  expect(block('Fidelity Brokerage')).toMatch(/\bLinked\b/);
  expect(block('Schwab Brokerage')).toMatch(/\bImported\b/);
  expect(block('HAND ONE')).toMatch(/By hand · you update it/);
  expect(block('HAND ONE')).not.toMatch(/\bLinked\b/);
  screen.unmount();
});
