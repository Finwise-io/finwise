// FOUNDER-STATE DUMP: render Net worth exactly as the live-review browser has it — a couple of
// hand-typed accounts, NO history yet — and print every visible line. This is the state I failed
// to walk before shipping the date-line change.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
  useSegments: () => [],
}));

test('dump the founder-state hero, top to bottom', () => {
  useStore.getState().resetAll();
  useStore.setState({
    onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    assetAccounts: [
      { asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5000, target_return: 0 },
      { asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 350152, target_return: 0.07 },
    ],
    liabilities: [], transactions: [],
    nwDaily: { [new Date().toISOString().slice(0, 10)]: 355152 },   // today only — no history yet
  } as any);
  const NW = require('../screens/NetWorthScreen').default;
  render(<NW />);
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') { const t = n.trim(); if (t) out.push(t); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.children) n.children.forEach(walk);
  };
  walk(screen.toJSON());
  console.log('FOUNDER-STATE DUMP:\n' + out.slice(0, 30).map((x, i) => `${i}: ${x}`).join('\n'));
  // the defect the founder is looking at: the tracking sentence must never appear twice
  const tracking = out.filter((x) => /tracking starts/.test(x));
  expect(tracking.length).toBeLessThanOrEqual(1);
});
