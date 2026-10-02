/** MOCK V17, MARKS 16 AND 18 — WHAT A PERSON SEES ON BOTH SCREENS.
 *
 *  His ruling on Q52 ("use option B") drawn as v17 and approved 2026-09-30.
 *    16 — where the window return refuses, the exact rate per year stands in its place, and the note
 *         beneath says WHAT THE FIGURE IS instead of why there is none.
 *    18 — the summary trio prints the PLAIN percent so its three cells fit one row; the yearly rate
 *         with its "/year" lives under the chosen window in the control above.
 *
 *  The household is the mock's own: $100,000 on 1 Oct 2025, $15,000 added 1 Apr 2026, $123,000 today.
 *  The window return refuses on it because the answer swings 6.96–8.00% on timing alone.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'van' }), router: { push: jest.fn() },
}));

const TODAY = new Date();
const key = (d: Date) => d.toISOString().slice(0, 10);
const back = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
const START = back(364), DEPDAY = back(182);

const ACCOUNT = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage',
  tax_bucket: 'TAXABLE', balance: 123000, target_return: 0.07, source: 'connected',
  last_synced: TODAY.toISOString() };
// the daily record, every day from the window's start: $100,000 rising to $123,000
const DAYS = Array.from({ length: 365 }, (_, i) => {
  const d = back(364 - i); const v = 100000 + (23000 * i) / 364;
  return { date: key(d), origin: 'observed', writtenAt: TODAY.toISOString(),
    holdings: [{ date: key(d), accountId: 'van', securityKey: 'X', units: 1, price: v, value: v }],
    accounts: [{ date: key(d), accountId: 'van', cash: 0, statedTotal: v, currency: 'USD' }] };
});
const TXNS = [{ txn_id: 'c', account_id: 'van', type: 'DEPOSIT', amount: 15000, date: key(DEPDAY) }];
const INV_DAILY = Object.fromEntries(DAYS.map((d) => [d.date, 100000]));

function readable(): string[] {
  const out: string[] = [];
  const walk = (n: any) => { if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; }
    if (n.props?.accessibilityLabel) out.push(String(n.props.accessibilityLabel));
    (n.children ?? []).forEach(walk); };
  walk(screen.toJSON()); return out;
}
const renderScreen = (f: string) => { const C = require(`../${f}`).default; render(<C />); };

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], name: 'Pat',
      birthYear: String(TODAY.getFullYear() - 55), baseSalary: '9000', salaryMode: 'gross',
      salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500' },
    assetAccounts: [ACCOUNT], liabilities: [], transactions: TXNS,
    snapshotDays: DAYS, invDaily: INV_DAILY } as any);
});

test('MARK 16 — Performance shows the exact rate where the window return refuses, and says what it is', () => {
  renderScreen('PerformanceScreen');
  const lines = readable();
  // the trio's Return is a real figure, not an em-dash
  const trio = lines.findIndex((l) => l === 'Return');
  expect(trio).toBeGreaterThan(-1);
  expect(lines[trio + 1]).toMatch(/^[+-]?\d+\.\d{2}%$/);
  // MARK 18: the trio prints the PLAIN percent — no "/year" inside that cell
  expect(lines[trio + 1]).not.toMatch(/year/);
  // and the note says what the figure IS, not why there is none
  expect(lines.some((l) => /this is your rate per year, counting when you added money/.test(l))).toBe(true);
  expect(lines.some((l) => /the dollar walk below is the honest answer/.test(l))).toBe(false);
});

test('MARK 18 — the yearly rate rides under the chosen window, spoken as "a year"', () => {
  renderScreen('PerformanceScreen');
  const spoken = readable().find((l) => /^Show Since/.test(l));
  expect(spoken).toBeTruthy();
  expect(spoken!).toMatch(/a year/);
  expect(spoken!).toMatch(/counting when you added money/);
});

test('MARK 16 on the account page — the same figure, the same words', () => {
  renderScreen('AccountPortfolioScreen');
  const lines = readable();
  const trio = lines.findIndex((l) => l === 'Return');
  expect(trio).toBeGreaterThan(-1);
  expect(lines[trio + 1]).toMatch(/^[+-]?\d+\.\d{2}%$/);
  expect(lines.some((l) => /this is your rate per year, counting when you added money/.test(l))).toBe(true);
});
