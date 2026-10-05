/** THE RETURN ON BOTH SCREENS, AFTER THE OWNER'S DECISION OF 2026-10-04 (DEC-1669): "All return should
 *  be True Weighted Return and not Dietz return."
 *
 *  Mock v17 drew two marks here. Mark 16 — a money-weighted rate per year standing in where the old
 *  return refused — is GONE with the method it stood in for: a time-weighted return is measured or it
 *  is not shown, and nothing stands in for it. Mark 18 stands: the summary trio prints the PLAIN
 *  percent so its three cells fit one row.
 *
 *  The household is the mock's own: $100,000 on the first day, $15,000 added half-way, $123,000
 *  today. The record shows it worth $104,000 just before the money arrived and $119,000 after, so the
 *  return is 1.04 × (123,000 ÷ 119,000) − 1 = +7.50% — and the $15,000 is not in it.
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
// the daily record, every day: $100,000 rising to $104,000, then +$15,000 paid in, then $119,000 rising to $123,000
const DAYS = Array.from({ length: 365 }, (_, i) => {
  const d = back(364 - i);
  const v = i < 182 ? 100000 + (4000 * i) / 182 : 119000 + (4000 * (i - 182)) / 182;
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

test('Performance shows the time-weighted return, +7.50%, and the money added is not in it', () => {
  renderScreen('PerformanceScreen');
  const lines = readable();
  const trio = lines.findIndex((l) => l === 'Return');
  expect(trio).toBeGreaterThan(-1);
  expect(lines[trio + 1]).toBe('+7.50%');                             // not +23.00%, the balance change
  // MARK 18: the trio prints the PLAIN percent — no "/year" inside that cell
  expect(lines[trio + 1]).not.toMatch(/year/);
  expect(lines).toContain('time-weighted, so money you added never counts as return');
  // nothing stands in, and nothing calls it by the old method's name
  expect(lines.some((l) => /rate per year, counting when you added money|money-weighted/.test(l))).toBe(false);
});

test('the chosen window speaks the same figure, and is not called a yearly rate', () => {
  renderScreen('PerformanceScreen');
  const spoken = readable().find((l) => /^Show Since/.test(l));
  expect(spoken).toBeTruthy();
  expect(spoken!).toMatch(/\+7\.50%$/);
});

test('the account page — the same figure, the same words', () => {
  renderScreen('AccountPortfolioScreen');
  const lines = readable();
  const trio = lines.findIndex((l) => l === 'Return');
  expect(trio).toBeGreaterThan(-1);
  expect(lines[trio + 1]).toBe('+7.50%');
  expect(lines.some((l) => /not a yearly rate · time-weighted/.test(l))).toBe(true);
});

test('money moved on a day the record holds no value for: no percent on either screen, and both say why in the same words', () => {
  // the same household with the day the $15,000 arrived missing from the record
  const depositDay = (useStore.getState() as any).transactions[0].date;
  useStore.setState({ snapshotDays: DAYS.filter((d) => d.date !== depositDay) } as any);
  const why = /Money moved in or out on .+ and no value was recorded that day, so a return cannot be measured across it\. The dollar figures here are still right\./;
  renderScreen('PerformanceScreen');
  let lines = readable();
  expect(lines[lines.findIndex((l) => l === 'Return') + 1]).toBe('—');
  expect(lines.some((l) => why.test(l))).toBe(true);
  screen.unmount();
  renderScreen('AccountPortfolioScreen');
  lines = readable();
  expect(lines[lines.findIndex((l) => l === 'Return') + 1]).toBe('—');
  expect(lines.some((l) => why.test(l))).toBe(true);
});
